import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { createHash } from 'crypto';
import { RedisService } from '../redis/redis.service';

const IDEMPOTENCY_TTL_SECONDS = 300; // 5 minutes

export interface IdempotencyRecord {
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  response?: any;
  startedAt: number;
  completedAt?: number;
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(private readonly redis: RedisService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const req  = context.switchToHttp().getRequest();
    const res  = context.switchToHttp().getResponse();
    const body = req.body ?? {};

    const idempotencyKey = req.headers['idempotency-key'];
    const apiKey = req.resolvedApiKey;

    // Skip idempotency entirely if header or API key is missing, or Redis is down
    if (!idempotencyKey || !apiKey || !this.redis.isAvailable()) {
      return next.handle();
    }

    // Compute cryptographic SHA-256 fingerprint
    const canonicalPayload = JSON.stringify({
      max_tokens:  body.max_tokens  ?? null,
      messages:    body.messages    ?? [],
      model:       body.model       ?? '',
      temperature: body.temperature ?? null,
      top_p:       body.top_p       ?? null,
    });
    
    const fingerprint = createHash('sha256')
      .update(`${apiKey.id}:${req.method}:${req.url}:${canonicalPayload}:${idempotencyKey}`)
      .digest('hex');

    const cacheKey = `idempotency:fingerprint:${fingerprint}`;
    req.idempotencyCacheKey = cacheKey;

    try {
      let recordStr = await this.redis.get(cacheKey);
      
      if (recordStr) {
        let record: IdempotencyRecord = JSON.parse(recordStr);

        // ── Case A: Request is already COMPLETED ───────────────────────
        if (record.status === 'COMPLETED') {
          res.setHeader('X-Idempotency-Cache', 'HIT');
          
          if (body.stream) {
            // Play back the stream immediately
            this.streamCachedResponse(res, record.response);
            return of(null);
          }
          return of(record.response);
        }

        // ── Case B: Request is currently RUNNING (Lock Polling) ────────
        if (record.status === 'RUNNING') {
          res.setHeader('X-Idempotency-Cache', 'POLL_HIT');
          this.logger.log(`Duplicate execution concurrent lock hit for key: ${idempotencyKey}. Initializing polling resolver...`);

          const startedPoll = Date.now();
          const MAX_POLL_MS = 15000; // 15 seconds max wait

          while (Date.now() - startedPoll < MAX_POLL_MS) {
            await new Promise((resolve) => setTimeout(resolve, 200)); // poll every 200ms
            
            recordStr = await this.redis.get(cacheKey);
            if (!recordStr) {
              break; // original failed or aborted
            }
            
            record = JSON.parse(recordStr);
            if (record.status === 'COMPLETED') {
              if (body.stream) {
                this.streamCachedResponse(res, record.response);
                return of(null);
              }
              return of(record.response);
            }
            if (record.status === 'FAILED') {
              break; // original failed, fall through to re-execute
            }
          }
          
          this.logger.warn(`Idempotency polling resolver timed out or original failed. Falling back to clean execution for key: ${idempotencyKey}`);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Idempotency verification failed: ${err.message}. Bypassing safely to gateway.`);
    }

    // ── Case C: Request is a MISS ────────────────────────────────────
    res.setHeader('X-Idempotency-Cache', 'MISS');
    const startedAt = Date.now();
    const initialRecord: IdempotencyRecord = {
      status: 'RUNNING',
      startedAt,
    };

    // Lock the fingerprint in Redis
    await this.redis.set(cacheKey, JSON.stringify(initialRecord), 'EX', IDEMPOTENCY_TTL_SECONDS)
      .catch((e) => this.logger.error(`Idempotency lock write failed: ${e.message}`));

    // If it's a stream, let the controller handle writing the COMPLETED/FAILED updates on socket closes.
    if (body.stream) {
      return next.handle();
    }

    // Standard completions hook intercept updates
    return next.handle().pipe(
      tap(async (data) => {
        if (data) {
          const completedRecord: IdempotencyRecord = {
            status: 'COMPLETED',
            response: data,
            startedAt,
            completedAt: Date.now(),
          };
          await this.redis.set(cacheKey, JSON.stringify(completedRecord), 'EX', IDEMPOTENCY_TTL_SECONDS)
            .catch((e) => this.logger.error(`Idempotency completed write failed: ${e.message}`));
        }
      }),
      catchError((err) => {
        // Delete the key immediately upon failure so clients can retry
        this.redis.del(cacheKey).catch(() => {});
        return throwError(() => err);
      }),
    );
  }

  private streamCachedResponse(res: any, responseData: any) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const text = responseData.choices?.[0]?.message?.content ?? '';
    const model = responseData.model ?? 'gpt-4o';
    const id = responseData.id ?? `chatcmpl-${Math.random().toString(36).substring(7)}`;
    const created = responseData.created ?? Math.floor(Date.now() / 1000);

    // Write start chunk
    res.write(`data: ${JSON.stringify({
      id,
      object: 'chat.completion.chunk',
      created,
      model,
      choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }]
    })}\n\n`);

    // Write text chunks
    const chunks = text.split(/(?<=\s)/);
    for (const chunk of chunks) {
      if (chunk) {
        res.write(`data: ${JSON.stringify({
          id,
          object: 'chat.completion.chunk',
          created,
          model,
          choices: [{ index: 0, delta: { content: chunk }, finish_reason: null }]
        })}\n\n`);
      }
    }

    // Write end chunks
    res.write(`data: ${JSON.stringify({
      id,
      object: 'chat.completion.chunk',
      created,
      model,
      choices: [{ index: 0, delta: {}, finish_reason: 'stop' }]
    })}\n\n`);

    res.write('data: [DONE]\n\n');
    res.end();
  }
}
