import { Controller, Post, Get, Param, Body, Headers, Req, Res, UseGuards, UseInterceptors } from '@nestjs/common';
import { GatewayService } from './gateway.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { QuotaGuard } from './quota.guard';
import { PromptCacheInterceptor } from './prompt-cache.interceptor';
import { ResponseHeadersInterceptor } from './response-headers.interceptor';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { CreateCompletionDto } from './dto/create-completion.dto';
import { PrometheusService } from './observability/prometheus.service';
import { ReplayService } from './observability/replay.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Controller('v1')
export class GatewayController {
  constructor(
    private readonly gatewayService: GatewayService,
    private readonly prometheus: PrometheusService,
    private readonly replayService: ReplayService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Post('chat/completions')
  @UseGuards(ClerkAuthGuard, QuotaGuard)
  @UseInterceptors(IdempotencyInterceptor, PromptCacheInterceptor, ResponseHeadersInterceptor)
  async chatCompletions(
    @Body() body: CreateCompletionDto,
    @Headers() headers: any,
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    if (body.stream) {
      const abortController = new AbortController();
      const handle = await this.gatewayService.handleChatCompletionStream(
        body,
        headers,
        req.resolvedApiKey,
        abortController.signal,
        req.idempotencyCacheKey,
      );

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Request-Id', handle.requestId);
      res.setHeader('X-Provider-Chain', handle.providerChain.join(','));
      res.setHeader('X-Provider', handle.getFinalProvider());
      
      const runtimeMode = this.redis.isFallbackActive() ? 'fallback-memory' : 'redis';
      res.setHeader('X-SELIXES-RUNTIME-MODE', runtimeMode);
      res.setHeader('X-APISHIELD-RUNTIME-MODE', runtimeMode);

      const id = `chatcmpl-${handle.requestId}`;
      const created = Math.floor(Date.now() / 1000);

      let completed = false;
      let clientAborted = false;
      res.on('close', () => {
        if (!completed) {
          clientAborted = true;
          abortController.abort();
          handle.abort().catch(() => {});
        }
      });

      const startStreamTime = Date.now();
      const MAX_STREAM_DURATION_MS = 60000; // 60s cap

      try {
        for await (const chunk of handle.stream) {
          if (clientAborted) {
            break;
          }

          // Check if maximum stream duration is exceeded
          if (Date.now() - startStreamTime > MAX_STREAM_DURATION_MS) {
            res.write(`data: ${JSON.stringify({
              error: {
                message: `Stream generation timed out after exceeding the maximum duration of ${MAX_STREAM_DURATION_MS}ms`,
                type: 'timeout_error',
                code: 408
              }
            })}\n\n`);
            res.end();
            clientAborted = true;
            completed = true;
            abortController.abort();
            handle.abort().catch(() => {});
            break;
          }

          if (chunk.type === 'start') {
            res.write(`data: ${JSON.stringify({
              id,
              object: 'chat.completion.chunk',
              created,
              model: handle.getFinalModel(),
              choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }]
            })}\n\n`);
          } else if (chunk.type === 'token') {
            const canWrite = res.write(`data: ${JSON.stringify({
              id,
              object: 'chat.completion.chunk',
              created,
              model: handle.getFinalModel(),
              choices: [{ index: 0, delta: { content: chunk.content }, finish_reason: null }]
            })}\n\n`);

            if (!canWrite) {
              await new Promise<void>((resolve) => res.once('drain', resolve));
            }
          } else if (chunk.type === 'end') {
            res.write(`data: ${JSON.stringify({
              id,
              object: 'chat.completion.chunk',
              created,
              model: handle.getFinalModel(),
              choices: [{ index: 0, delta: {}, finish_reason: 'stop' }]
            })}\n\n`);
          }
        }

        if (!clientAborted) {
          res.write('data: [DONE]\n\n');
          res.end();
          completed = true;
          await handle.finalize();
        }
      } catch (err: any) {
        if (!clientAborted) {
          completed = true;
          res.write(`data: ${JSON.stringify({
            error: {
              message: err.message || 'Stream processing failed mid-stream',
              type: 'stream_error',
              code: err.statusCode || 500
            }
          })}\n\n`);
          res.end();
          handle.abort().catch(() => {});
        }
      }
      return;
    }

    const abortController = new AbortController();
    let completed = false;

    res.on('close', () => {
      if (!completed) {
        abortController.abort();
      }
    });

    try {
      const result = await this.gatewayService.handleChatCompletion(
        body,
        headers,
        req.resolvedApiKey,
        abortController.signal,
      );
      completed = true;
      return result;
    } catch (err) {
      completed = true;
      throw err;
    }
  }

  @Get('metrics')
  @UseGuards(ClerkAuthGuard)
  async getMetrics(@Req() req: any, @Res() res: any) {
    const exposition = this.prometheus.getMetricsExposition();
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(exposition);
  }

  @Get('replay/:traceId')
  @UseGuards(ClerkAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  async getReplay(@Param('traceId') traceId: string, @Req() req: any, @Res() res: any) {
    try {
      const trace = await this.prisma.aITrace.findUnique({
        where: { id: traceId },
        include: {
          run: {
            include: {
              workflow: true,
            },
          },
        },
      });

      if (!trace) {
        return res.status(404).json({ error: 'Trace not found', traceId });
      }

      const requestingOrgId = req.resolvedApiKey?.organizationId ?? req.orgId ?? req['orgId'];
      if (!requestingOrgId || trace.run.workflow.organizationId !== requestingOrgId) {
        return res.status(403).json({ error: 'Forbidden: Access to this trace is denied' });
      }

      // Attempt to decrypt the encrypted envelope snapshots
      let decryptedPrompt: any = trace.promptSnapshot;
      let decryptedResponse: any = trace.responseSnapshot;

      try {
        if (trace.promptSnapshot && (trace.promptSnapshot as any).keyVersion) {
          decryptedPrompt = this.replayService.decrypt(trace.promptSnapshot as any);
        }
      } catch {
        decryptedPrompt = { _encrypted: true, _error: 'Decryption failed or legacy unencrypted snapshot' };
      }

      try {
        if (trace.responseSnapshot && (trace.responseSnapshot as any).keyVersion) {
          decryptedResponse = this.replayService.decrypt(trace.responseSnapshot as any);
        }
      } catch {
        decryptedResponse = { _encrypted: true, _error: 'Decryption failed or legacy unencrypted snapshot' };
      }

      return res.json({
        traceId: trace.id,
        provider: trace.provider,
        model: trace.model,
        latencyMs: trace.latency,
        promptTokens: trace.promptTokens,
        completionTokens: trace.completionTokens,
        status: trace.status,
        createdAt: trace.createdAt,
        prompt: decryptedPrompt,
        response: decryptedResponse,
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Replay retrieval failed', message: err.message });
    }
  }
}
