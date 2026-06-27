import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { createHash } from 'crypto';
import { RedisService } from '../redis/redis.service';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_TTL_SECONDS = 3600; // 1 hour

function getHeader(headers: Record<string, any>, currentName: string, legacyName: string): any {
  return headers[currentName] ?? headers[legacyName];
}

function buildCacheKey(body: Record<string, any>): string {
  // Always sort keys alphabetically to prevent key-order hash collisions
  const canonical = JSON.stringify({
    max_tokens:  body.max_tokens  ?? null,
    messages:    body.messages    ?? [],
    model:       body.model       ?? '',
    temperature: body.temperature ?? null,
    top_p:       body.top_p       ?? null,
    // Intentionally excluded: stream, user, requestId — these must not fragment the cache
  });
  const hash = createHash('sha256').update(canonical).digest('hex');
  return `cache:prompt:${hash}`;
}

@Injectable()
export class PromptCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PromptCacheInterceptor.name);

  constructor(private readonly redis: RedisService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const req  = context.switchToHttp().getRequest();
    const res  = context.switchToHttp().getResponse();
    const body = req.body ?? {};

    // Skip cache entirely if Redis is unavailable
    if (!this.redis.isAvailable()) {
      res.setHeader('X-Cache', 'UNAVAILABLE');
      return next.handle();
    }

    const cacheMode = (getHeader(req.headers, 'x-selixes-cache', 'x-apishield-cache') ?? '').toLowerCase();
    const cacheKey  = buildCacheKey(body);
    const ttl       = parseInt(getHeader(req.headers, 'x-selixes-cache-ttl', 'x-apishield-cache-ttl') ?? String(DEFAULT_TTL_SECONDS));

    // ── bypass: skip read AND write ────────────────────────────────
    if (cacheMode === 'bypass') {
      res.setHeader('X-Cache', 'BYPASS');
      return next.handle();
    }

    // ── refresh: skip read, but write the new result ───────────────
    if (cacheMode === 'refresh') {
      res.setHeader('X-Cache', 'REFRESH');
      if (body.stream) {
        return next.handle();
      }
      return next.handle().pipe(
        tap(async (data) => {
          if (data) {
            await this.redis.set(cacheKey, JSON.stringify(data), 'EX', ttl)
              .catch(err => this.logger.warn(`Cache refresh write failed: ${err.message}`));
          }
        }),
      );
    }

    // ── normal: attempt cache read ─────────────────────────────────
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        if (body.stream) {
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
          res.setHeader('X-Request-Id', `cache-hit-${uuidv4()}`);
          res.setHeader('X-Provider-Chain', 'cache:200');
          res.setHeader('X-Provider', 'cache');

          const parsed = JSON.parse(cached);
          const text = parsed.choices?.[0]?.message?.content ?? '';
          const model = parsed.model ?? 'gpt-4o';
          const id = parsed.id ?? `chatcmpl-${uuidv4()}`;
          const created = parsed.created ?? Math.floor(Date.now() / 1000);

          // Send start event
          res.write(`data: ${JSON.stringify({
            id,
            object: 'chat.completion.chunk',
            created,
            model,
            choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }]
          })}\n\n`);

          // Send text as chunked tokens
          const chunks = text.split(/(?<=\s)/); // split preserving spaces
          for (const chunk of chunks) {
            if (chunk) {
              await new Promise(resolve => setTimeout(resolve, 5)); // 5ms delay
              res.write(`data: ${JSON.stringify({
                id,
                object: 'chat.completion.chunk',
                created,
                model,
                choices: [{ index: 0, delta: { content: chunk }, finish_reason: null }]
              })}\n\n`);
            }
          }

          // Send end event
          res.write(`data: ${JSON.stringify({
            id,
            object: 'chat.completion.chunk',
            created,
            model,
            choices: [{ index: 0, delta: {}, finish_reason: 'stop' }]
          })}\n\n`);

          res.write('data: [DONE]\n\n');
          res.end();
          return of(null);
        }
        const parsedBody = JSON.parse(cached);
        return of(parsedBody);
      }
    } catch (err) {
      this.logger.warn(`Cache read failed: ${err.message}`);
      res.setHeader('X-Cache', 'UNAVAILABLE');
      return next.handle();
    }

    // Cache miss — forward to router, then write result
    res.setHeader('X-Cache', 'MISS');
    if (body.stream) {
      return next.handle();
    }
    return next.handle().pipe(
      tap(async (data) => {
        if (data) {
          await this.redis.set(cacheKey, JSON.stringify(data), 'EX', ttl)
            .catch(err => this.logger.warn(`Cache write failed: ${err.message}`));
        }
      }),
    );
  }
}
