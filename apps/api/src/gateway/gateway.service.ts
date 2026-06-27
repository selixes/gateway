import { Injectable, Logger, HttpException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import CircuitBreaker from 'opossum';
import { UsageAccumulatorService, PRICING } from './usage-accumulator.service';
import { PrismaService } from '../prisma/prisma.service';
import { RunStatus, EventType } from '@prisma/client';
import { createHash } from 'crypto';
import { RedisService } from '../redis/redis.service';
import { StreamChunk } from './streaming/stream.types';
import { streamOpenAI } from './streaming/providers/openai.stream';
import { streamAnthropic } from './streaming/providers/anthropic.stream';
import { streamOllama } from './streaming/providers/ollama.stream';
import { streamGemini } from './streaming/providers/gemini.stream';
import {
  composePipeline,
  createPiiMaskStage,
  createTokenMeteringStage,
  createCacheCaptureStage,
  createAnalyticsStage,
} from './streaming/stream.pipeline';
import { ProviderHealthService } from './observability/provider-health.service';
import { PrometheusService } from './observability/prometheus.service';
import { ReplayService } from './observability/replay.service';
import { GatewayEventBus } from './observability/gateway-event-bus.service';

export interface GatewayOverrides {
  timeoutMs:       number;           // from x-selixes-timeout, default 10_000
  failoverPolicy:  string[];         // from x-selixes-failover-policy, default ['openai','anthropic']
  continuity:      boolean;          // from x-selixes-continuity, default true
  simulateOutage?: 'openai' | 'both' | 'absolute_blackout'; // TEST_MODE only
}

const VALID_PROVIDERS = new Set(['openai', 'anthropic', 'gemini', 'ollama']);
const DEFAULT_CHAIN   = ['openai', 'anthropic'];
const DEFAULT_TIMEOUT = 10000;

function getHeader(headers: Record<string, any>, currentName: string, legacyName: string): any {
  return headers[currentName] ?? headers[legacyName];
}

function parseOverrides(headers: Record<string, any>): GatewayOverrides {
  // Parse x-selixes-timeout, accepting legacy x-apishield-timeout during migration.
  const rawTimeout = parseInt(getHeader(headers, 'x-selixes-timeout', 'x-apishield-timeout') ?? '');
  const timeoutMs = Number.isFinite(rawTimeout) && rawTimeout > 0
    ? rawTimeout : DEFAULT_TIMEOUT;

  // Parse x-selixes-failover-policy, accepting legacy x-apishield-failover-policy.
  let failoverPolicy = DEFAULT_CHAIN;
  const rawPolicy = getHeader(headers, 'x-selixes-failover-policy', 'x-apishield-failover-policy') ?? '';
  if (rawPolicy.includes('->')) {
    const parts = rawPolicy.split('->').map((s: string) => s.trim().toLowerCase());
    if (parts.every((p: string) => VALID_PROVIDERS.has(p))) {
      failoverPolicy = parts;
    }
  }

  // Parse x-selixes-continuity, accepting legacy x-apishield-continuity.
  const rawContinuity = getHeader(headers, 'x-selixes-continuity', 'x-apishield-continuity') ?? 'true';
  const continuity = rawContinuity.toLowerCase() !== 'false';

  // x-simulate-outage — only in test mode
  const simulateOutage = process.env.GATEWAY_TEST_MODE === 'true'
    ? (headers['x-simulate-outage'] as GatewayOverrides['simulateOutage'])
    : undefined;

  return { timeoutMs, failoverPolicy, continuity, simulateOutage };
}

function isPrivateUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    const host = url.hostname;
    if (!host.includes('.')) return true;
    if (host === '127.0.0.1' || host === '[::1]' || host === 'localhost') return true;
    if (/^(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(host)) return true;
    if (host.endsWith('.local') || host.endsWith('.lan') || host.endsWith('.internal')) return true;
    return false;
  } catch {
    return false;
  }
}

@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);
  private openaiBreaker: CircuitBreaker;
  private anthropicBreaker: CircuitBreaker;
  private geminiBreaker: CircuitBreaker;

  constructor(
    private readonly prisma: PrismaService,
    private readonly accumulator: UsageAccumulatorService,
    private readonly redis: RedisService,
    private readonly providerHealth: ProviderHealthService,
    private readonly prometheus: PrometheusService,
    private readonly replay: ReplayService,
    private readonly eventBus: GatewayEventBus,
  ) {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434/api/chat';
    if (!isPrivateUrl(ollamaUrl)) {
      this.logger.warn(
        `⚠️ WARNING: OLLAMA_URL is configured to a potentially public/external address: "${ollamaUrl}". For data sovereignty, Ollama should only be hosted internally.`,
      );
    }

    this.openaiBreaker = new CircuitBreaker(
      (body: any, timeoutMs: number, signal?: AbortSignal) => this.callOpenAiInternal(body, timeoutMs, signal),
      { errorThresholdPercentage: 50, resetTimeout: 10000 }
    );
    this.anthropicBreaker = new CircuitBreaker(
      (body: any, timeoutMs: number, signal?: AbortSignal) => this.callAnthropicInternal(body, timeoutMs, signal),
      { errorThresholdPercentage: 50, resetTimeout: 10000 }
    );
    this.geminiBreaker = new CircuitBreaker(
      (body: any, timeoutMs: number, signal?: AbortSignal) => this.callGeminiInternal(body, timeoutMs, signal),
      { errorThresholdPercentage: 50, resetTimeout: 10000 }
    );
  }

  async handleChatCompletion(
    body: Record<string, any>,
    headers: Record<string, any>,
    resolvedApiKey?: any,
    signal?: AbortSignal,
  ) {
    // Ensure resolvedApiKey exists (fallback for development/direct calls)
    const apiKey = resolvedApiKey ?? {
      id: 'dev',
      organizationId: 'dev-sandbox',
      status: 'ACTIVE',
    };

    const requestId: string = apiKey.requestId ?? uuidv4();
    const providerChain: string[] = [];
    const overrides = parseOverrides(headers);
    const startTime = Date.now();

    const sessionId = getHeader(headers, 'x-selixes-session-id', 'x-apishield-session-id')?.toString() || null;
    if (sessionId && !/^[a-zA-Z0-9_-]{1,128}$/.test(sessionId)) {
      throw new HttpException('Invalid session ID format.', 400);
    }
    let terminationReason: string | null = null;

    // ── Agent Runtime Protection Reasoning Budget Gate ──────────────────────
    if (sessionId) {
      if (this.redis.isFallbackActive()) {
        this.prometheus.incrementFallbackMetric();
      }

      const budgetCostRaw = getHeader(headers, 'x-selixes-max-session-cost', 'x-apishield-max-session-cost');
      const budgetCallsRaw = getHeader(headers, 'x-selixes-max-calls', 'x-apishield-max-calls');
      const budgetConcurRaw = getHeader(headers, 'x-selixes-max-concurrent-calls', 'x-apishield-max-concurrent-calls');
      const budgetDurationRaw = getHeader(headers, 'x-selixes-max-session-duration-ms', 'x-apishield-max-session-duration-ms');

      let maxCost = budgetCostRaw ? parseFloat(budgetCostRaw.toString()) : null;
      if (maxCost !== null && (!Number.isFinite(maxCost) || maxCost <= 0)) {
        maxCost = null;
      }
      let maxCalls = budgetCallsRaw ? parseInt(budgetCallsRaw.toString(), 10) : null;
      if (maxCalls !== null && (isNaN(maxCalls) || maxCalls <= 0)) {
        maxCalls = null;
      }
      let maxConcur = budgetConcurRaw ? parseInt(budgetConcurRaw.toString(), 10) : null;
      if (maxConcur !== null && (isNaN(maxConcur) || maxConcur <= 0)) {
        maxConcur = null;
      }
      let maxDuration = budgetDurationRaw ? parseInt(budgetDurationRaw.toString(), 10) : null;
      if (maxDuration !== null && (isNaN(maxDuration) || maxDuration <= 0)) {
        maxDuration = null;
      }

      const redisKey = `session:metrics:${sessionId}`;
      const metrics = (await this.redis.hgetall(redisKey).catch(() => ({}))) as Record<string, string>;
      
      const currentCost = parseFloat(metrics.total_cost_usd || '0');
      const currentCalls = parseInt(metrics.total_calls || '0', 10);
      const currentConcur = parseInt(metrics.active_connections || '0', 10);
      const startedAt = parseInt(metrics.started_at || Date.now().toString(), 10);
      const consecutiveFailures = parseInt(metrics.consecutive_failures || '0', 10);

      // Save started_at if new session
      if (!metrics.started_at) {
        await this.redis.hset(redisKey, 'started_at', startedAt.toString()).catch(() => {});
        await this.redis.expire(redisKey, 86400).catch(() => {}); // 24hr TTL
      }

      // Check loop instability from message history
      const instability = this.detectTrajectoryInstability(body.messages);
      const effectiveMaxCalls = maxCalls !== null ? maxCalls : 100;

      if (instability.detected) {
        terminationReason = 'TRAJECTORY_INSTABILITY';
        this.logger.warn(`[Agent Loop Breaker] Session ${sessionId} tripped: ${instability.reason}`);
      } else if (consecutiveFailures >= 3) {
        terminationReason = 'TRAJECTORY_INSTABILITY';
        this.logger.warn(`[Agent Loop Breaker] Session ${sessionId} tripped: 3 consecutive server-side failures detected.`);
      } else if (maxCost !== null && currentCost >= maxCost) {
        terminationReason = 'MAX_COST_EXCEEDED';
      } else if (currentCalls >= effectiveMaxCalls) {
        terminationReason = 'MAX_CALLS_EXCEEDED';
      } else if (maxConcur !== null && currentConcur >= maxConcur) {
        terminationReason = 'CONCURRENCY_EXCEEDED';
      } else if (maxDuration !== null && (Date.now() - startedAt) >= maxDuration) {
        terminationReason = 'MAX_DURATION_EXCEEDED';
      }

      if (terminationReason) {
        let workflow = await this.prisma.workflow.findFirst({
          where: { name: 'Selixes Resilient Gateway', organizationId: apiKey.organizationId },
        });
        if (!workflow) {
          workflow = await this.prisma.workflow.findFirst({
            where: { organizationId: apiKey.organizationId },
          });
        }
        if (!workflow) {
          workflow = await this.prisma.workflow.create({
            data: {
              id: `wf-selixes-gateway-${apiKey.organizationId.substring(0, 8)}`,
              name: 'Selixes Resilient Gateway',
              organizationId: apiKey.organizationId,
              provider: 'SELIXES',
              status: 'ACTIVE',
            },
          });
        }
        
        await this.prisma.workflowRun.create({
          data: {
            workflowId: workflow.id,
            status: RunStatus.FAILED,
            triggerType: 'API_GATEWAY',
            sessionId,
            terminationReason,
            errorMessage: `Runaway Agent Terminated: ${terminationReason}`,
            duration: 0,
          },
        });

        throw new HttpException({
          statusCode: 429,
          error: 'runaway_agent_protection',
          message: `Runaway Agent Intercepted: Session budget exceeded (${terminationReason}).`,
          sessionId,
          terminationReason,
          requestId,
        }, 429);
      }

      // Increment active connections
      await this.redis.hincrby(redisKey, 'active_connections', 1).catch(() => {});
    }

    try {
      // ── Step 1: Create a database WorkflowRun tracking this gateway run ─────
      let workflow = await this.prisma.workflow.findFirst({
        where: { name: 'Selixes Resilient Gateway', organizationId: apiKey.organizationId },
      });
      if (!workflow) {
        workflow = await this.prisma.workflow.findFirst({
          where: { organizationId: apiKey.organizationId },
        });
      }
      if (!workflow) {
        workflow = await this.prisma.workflow.create({
          data: {
            id: `wf-selixes-gateway-${apiKey.organizationId.substring(0, 8)}`,
            name: 'Selixes Resilient Gateway',
            organizationId: apiKey.organizationId,
            provider: 'SELIXES',
            status: 'ACTIVE',
          },
        });
      }

      const run = await this.prisma.workflowRun.create({
        data: {
          workflowId: workflow.id,
          status: RunStatus.RUNNING,
          triggerType: 'API_GATEWAY',
          sessionId,
        },
      });

      await this.prisma.executionEvent.create({
        data: {
          runId: run.id,
          type: EventType.RUN_STARTED,
          message: 'API Gateway request transit started',
          metadata: { requestId, clientIp: headers['x-forwarded-for'] || '127.0.0.1' },
        },
      });

      let completionResponse: any = null;
      let finalProvider = 'unknown';
      let finalModel = body.model || 'gpt-4o';
      let isDegraded = false;
      let lastError: Error | null = null;

      // ── Tier 1 & 2: Configurable Provider Chain ──────────────────────────
      for (const provider of overrides.failoverPolicy) {
        // Test-mode simulated outage injections
        if (overrides.simulateOutage === 'openai' && provider === 'openai') {
          providerChain.push('openai:simulated-504');
          lastError = new Error('Simulated OpenAI Outage (504)');
          
          await this.logFailureEvent(run.id, 'openai', lastError.message);
          continue;
        }
        if (overrides.simulateOutage === 'both' && (provider === 'openai' || provider === 'anthropic')) {
          providerChain.push(`${provider}:simulated-429`);
          lastError = new Error(`Simulated ${provider} Outage (429)`);
          
          await this.logFailureEvent(run.id, provider, lastError.message);
          continue;
        }

        await this.prisma.executionEvent.create({
          data: {
            runId: run.id,
            type: EventType.AI_CALLED,
            message: `Dispatching completion payload to ${provider} (${body.model || 'default'})`,
          },
        });

        try {
          if (signal?.aborted) {
            throw new HttpException({ message: 'Request aborted' }, 499);
          }
          const result = await this.callProvider(provider, body, overrides.timeoutMs, signal);
          providerChain.push(`${provider}:${result.statusCode ?? 200}`);
          completionResponse = result.data;
          finalProvider = provider;
          finalModel = result.model;

          await this.prisma.executionEvent.create({
            data: {
              runId: run.id,
              type: EventType.NODE_EXECUTED,
              message: `Primary/Standby provider ${provider} resolved successfully`,
              metadata: { provider, model: finalModel },
            },
          });
          break;
        } catch (err: any) {
          const code = err.statusCode ?? err.code ?? 'error';
          providerChain.push(`${provider}:${code}`);
          lastError = err;
          this.logger.warn(`Provider ${provider} failed: ${err.message}`);

          await this.logFailureEvent(run.id, provider, err.message);
          
          // Trigger standby retry event log
          await this.prisma.executionEvent.create({
            data: {
              runId: run.id,
              type: EventType.RETRY_TRIGGERED,
              message: `Attempt with ${provider} failed. Instantly initiating failover to next standby.`,
            },
          });
        }
      }

      // ── Tier 3: Edge Fallback (Ollama — Continuity Mode) ──────────────────
      if (!completionResponse && overrides.continuity && overrides.simulateOutage !== 'absolute_blackout') {
        await this.prisma.executionEvent.create({
          data: {
            runId: run.id,
            type: EventType.RETRY_TRIGGERED,
            message: 'All cloud providers failed. Activating local degraded Continuity Mode fallback (Llama-3).',
          },
        });

        try {
          if (signal?.aborted) {
            throw new HttpException({ message: 'Request aborted' }, 499);
          }
          const result = await this.callOllama(body, signal);
          providerChain.push('ollama:200');
          completionResponse = result.data;
          finalProvider = 'ollama';
          finalModel = result.model;
          isDegraded = true;

          await this.prisma.executionEvent.create({
            data: {
              runId: run.id,
              type: EventType.NODE_EXECUTED,
              message: `Continuity completion succeeded locally.`,
              metadata: { provider: 'ollama-local', durationMs: Date.now() - startTime },
            },
          });
        } catch (err: any) {
          providerChain.push(`ollama:${err.code ?? 'error'}`);
          this.logger.error(`Ollama edge fallback failed: ${err.message}`);
          
          await this.logFailureEvent(run.id, 'ollama', err.message);
        }
      }

      // ── Step 4: Handle completion resolution or total blackout ─────────────
      const duration = Date.now() - startTime;
      if (completionResponse) {
        await this.prisma.workflowRun.update({
          where: { id: run.id },
          data: {
            status: RunStatus.SUCCESS,
            completedAt: new Date(),
            duration,
          },
        });

        // Trigger asynchronous, non-blocking post-response accumulator write
        await this.finalizeResponse(
          run.id,
          requestId,
          apiKey,
          completionResponse,
          finalProvider,
          finalModel,
          providerChain,
          isDegraded,
          duration,
          sessionId,
        );

        // Record provider success for health scoring
        this.providerHealth.recordSuccess(finalProvider).catch(() => {});

        // Publish observability event asynchronously (never blocks response)
        const usage = completionResponse.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
        this.eventBus.publish({
          type: 'request.completed',
          requestId,
          correlationId: requestId,
          apiKeyId: apiKey.id,
          organizationId: apiKey.organizationId,
          provider: finalProvider,
          model: finalModel,
          latencyMs: duration,
          ttftMs: duration,
          tokens: { prompt: usage.prompt_tokens, completion: usage.completion_tokens, total: usage.total_tokens ?? (usage.prompt_tokens + usage.completion_tokens) },
          status: 'success',
          isStream: false,
          region: process.env.GATEWAY_REGION || 'us-east-1',
        });

        return {
          ...completionResponse,
          _meta: { requestId, providerChain },
        };
      } else {
        // Complete blackout
        await this.prisma.workflowRun.update({
          where: { id: run.id },
          data: {
            status: RunStatus.FAILED,
            completedAt: new Date(),
            duration,
            errorMessage: lastError?.message ?? 'All providers failed',
          },
        });

        if (sessionId) {
          const redisKey = `session:metrics:${sessionId}`;
          await this.redis.hincrby(redisKey, 'consecutive_failures', 1).catch(() => {});
        }
        throw {
          statusCode: 503,
          error: 'all_providers_unavailable',
          message: 'All LLM routes and local fallback continuity nodes are completely unreachable.',
          providerChain,
          requestId,
        };
      }
    } finally {
      if (sessionId) {
        const redisKey = `session:metrics:${sessionId}`;
        await this.redis.hincrby(redisKey, 'active_connections', -1).catch(() => {});
        // Decrement below 0 safety check
        const metrics = (await this.redis.hgetall(redisKey).catch(() => ({}))) as Record<string, string>;
        if (parseInt(metrics.active_connections || '0', 10) < 0) {
          await this.redis.hset(redisKey, 'active_connections', '0').catch(() => {});
        }
      }
    }
  }

  private async logFailureEvent(runId: string, provider: string, errMsg: string) {
    await this.prisma.executionEvent.create({
      data: {
        runId,
        type: EventType.FAILURE_OCCURRED,
        message: `${provider} failure intercepted: ${errMsg}`,
      },
    }).catch(() => {});
  }

  private async callProvider(
    provider: string,
    body: Record<string, any>,
    timeoutMs: number,
    signal?: AbortSignal,
  ): Promise<any> {
    if (provider === 'openai') {
      return this.openaiBreaker.fire(body, timeoutMs, signal);
    }
    if (provider === 'anthropic') {
      return this.anthropicBreaker.fire(body, timeoutMs, signal);
    }
    if (provider === 'gemini') {
      return this.geminiBreaker.fire(body, timeoutMs, signal);
    }
    throw new Error(`Upstream provider ${provider} not supported`);
  }

  private async callOpenAiInternal(
    body: Record<string, any>,
    timeoutMs: number,
    signal?: AbortSignal,
  ): Promise<any> {
    const promptTokens = 120 + Math.floor(Math.random() * 40);
    const openAiApiKey = process.env.OPENAI_API_KEY;
    if (!openAiApiKey) {
      // Dev Sandbox Mock completion
      const mockText = 'Acme Corp is a high-value lead for Selixes. With $15M ARR and 250 employees, they are in the sweet spot for our B2B team.';
      const latency = 120 + Math.floor(Math.random() * 80);
      
      if (latency > timeoutMs) {
        await this.sleep(timeoutMs, signal);
        throw {
          statusCode: 504,
          code: 'TIMEOUT',
          message: `Mock OpenAI provider timed out after ${timeoutMs}ms`,
        };
      }
      
      await this.sleep(latency, signal);

      return {
        statusCode: 200,
        model: body.model || 'gpt-4o',
        data: {
          id: `chatcmpl-${uuidv4()}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: body.model || 'gpt-4o',
          choices: [{
            index: 0,
            message: { role: 'assistant', content: mockText },
            finish_reason: 'stop',
          }],
          usage: {
            prompt_tokens: promptTokens,
            completion_tokens: 30,
            total_tokens: promptTokens + 30,
          },
        },
      };
    } else {
      // Live OpenAI query using axios with strict abort timeout
      const response = await axios.post('https://api.openai.com/v1/chat/completions', body, {
        headers: {
          'Authorization': `Bearer ${openAiApiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: timeoutMs,
        signal,
      });
      return {
        statusCode: response.status,
        model: response.data.model || body.model,
        data: response.data,
      };
    }
  }

  private async callAnthropicInternal(
    body: Record<string, any>,
    timeoutMs: number,
    signal?: AbortSignal,
  ): Promise<any> {
    const promptTokens = 120 + Math.floor(Math.random() * 40);
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      // Dev Sandbox Mock completion
      const mockText = 'Lead Qualification [Anthropic standby]: Acme Corp ($15M ARR, 250 employees) fits the optimal B2B startup profile.';
      const latency = 180 + Math.floor(Math.random() * 100);
      
      if (latency > timeoutMs) {
        await this.sleep(timeoutMs, signal);
        throw {
          statusCode: 504,
          code: 'TIMEOUT',
          message: `Mock Anthropic provider timed out after ${timeoutMs}ms`,
        };
      }
      
      await this.sleep(latency, signal);

      return {
        statusCode: 200,
        model: 'claude-3-5-sonnet',
        data: {
          id: `chatcmpl-${uuidv4()}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: 'claude-3-5-sonnet',
          choices: [{
            index: 0,
            message: { role: 'assistant', content: mockText },
            finish_reason: 'stop',
          }],
          usage: {
            prompt_tokens: promptTokens,
            completion_tokens: 35,
            total_tokens: promptTokens + 35,
          },
        },
      };
    } else {
      // Live Anthropic API Call
      const response = await axios.post('https://api.anthropic.com/v1/messages', {
        model: 'claude-3-5-sonnet-20241022',
        messages: body.messages.map((m: any) => ({ role: m.role, content: m.content })),
        max_tokens: body.max_tokens || 1000,
        temperature: body.temperature,
        top_p: body.top_p,
      }, {
        headers: {
          'x-api-key': anthropicApiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        timeout: timeoutMs,
        signal,
      });

      const outputTokens = response.data.usage?.output_tokens || 85;
      return {
        statusCode: response.status,
        model: 'claude-3-5-sonnet',
        data: {
          id: `chatcmpl-${response.data.id}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: 'claude-3-5-sonnet',
          choices: [{
            index: 0,
            message: { role: 'assistant', content: response.data.content[0].text },
            finish_reason: 'stop',
          }],
          usage: {
            prompt_tokens: promptTokens,
            completion_tokens: outputTokens,
            total_tokens: promptTokens + outputTokens,
          },
        },
      };
    }
  }

  private async callGeminiInternal(
    body: Record<string, any>,
    timeoutMs: number,
    signal?: AbortSignal,
  ): Promise<any> {
    const promptTokens = 120 + Math.floor(Math.random() * 40);
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const targetModel = body.model === 'gemini-3.5-flash' || body.model === 'gemini-3.1-pro' 
      ? body.model 
      : 'gemini-3.5-flash';

    if (!geminiApiKey) {
      // Dev Sandbox Mock Gemini Completion
      const mockText = `Lead Qualification [Gemini 3.5 Flash cost-arbitrage]: Acme Corp ($15M ARR, 250 employees) fits the optimal B2B startup profile perfectly.`;
      const latency = 100 + Math.floor(Math.random() * 50);
      
      if (latency > timeoutMs) {
        await this.sleep(timeoutMs, signal);
        throw {
          statusCode: 504,
          code: 'TIMEOUT',
          message: `Mock Gemini provider timed out after ${timeoutMs}ms`,
        };
      }
      
      await this.sleep(latency, signal);

      return {
        statusCode: 200,
        model: targetModel,
        data: {
          id: `chatcmpl-${uuidv4()}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: targetModel,
          choices: [{
            index: 0,
            message: { role: 'assistant', content: mockText },
            finish_reason: 'stop',
          }],
          usage: {
            prompt_tokens: promptTokens,
            completion_tokens: 30,
            total_tokens: promptTokens + 30,
          },
        },
      };
    } else {
      // Live Gemini Call using Google's OpenAI-compatible completions endpoint
      const response = await axios.post('https://generativelanguage.googleapis.com/v1beta/openai/v1/chat/completions', {
        ...body,
        model: targetModel,
      }, {
        headers: {
          'Authorization': `Bearer ${geminiApiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: timeoutMs,
        signal,
      });

      const outputTokens = response.data.usage?.completion_tokens || 35;
      return {
        statusCode: response.status,
        model: targetModel,
        data: {
          id: `chatcmpl-${response.data.id}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: targetModel,
          choices: response.data.choices,
          usage: {
            prompt_tokens: response.data.usage?.prompt_tokens || promptTokens,
            completion_tokens: outputTokens,
            total_tokens: (response.data.usage?.prompt_tokens || promptTokens) + outputTokens,
          },
        },
      };
    }
  }

  private async callOllama(body: Record<string, any>, signal?: AbortSignal): Promise<any> {
    const promptTokens = 120 + Math.floor(Math.random() * 40);
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434/api/chat';

    try {
      const response = await axios.post(ollamaUrl, {
        model: 'llama3',
        messages: body.messages,
        stream: false,
      }, { timeout: 3000, signal });

      return {
        statusCode: 200,
        model: 'llama3-continuity',
        data: {
          id: `chatcmpl-local-${uuidv4()}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: 'llama3-continuity',
          choices: [{
            index: 0,
            message: response.data.message,
            finish_reason: 'stop',
          }],
          usage: {
            prompt_tokens: promptTokens,
            completion_tokens: 80,
            total_tokens: promptTokens + 80,
          },
        },
      };
    } catch {
      // Fallback pre-packaged graceful continuity mock
      const mockText = 'Continuity Mode [Degraded]: Selixes Continuity active. Local failover model Llama-3 is guarding your execution. The cloud providers are currently unreachable.';
      await this.sleep(100, signal);

      return {
        statusCode: 200,
        model: 'llama3-continuity-degraded',
        data: {
          id: `chatcmpl-mock-local-${uuidv4()}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: 'llama3-continuity-degraded',
          choices: [{
            index: 0,
            message: { role: 'assistant', content: mockText },
            finish_reason: 'stop',
          }],
          usage: {
            prompt_tokens: promptTokens,
            completion_tokens: 45,
            total_tokens: promptTokens + 45,
          },
        },
      };
    }
  }

  private async finalizeResponse(
    runId: string,
    requestId: string,
    apiKey: any,
    result: any,
    provider: string,
    model: string,
    providerChain: string[],
    isDegraded: boolean,
    latencyMs: number,
    sessionId?: string | null,
  ): Promise<void> {
    const usage = result.usage ?? { prompt_tokens: 0, completion_tokens: 0 };
    const prices = PRICING[model] ?? { prompt: 0.005, completion: 0.015 };
    const costUsd = (usage.prompt_tokens / 1000) * prices.prompt
                  + (usage.completion_tokens / 1000) * prices.completion;

    if (sessionId) {
      const redisKey = `session:metrics:${sessionId}`;
      await this.redis.hset(redisKey, 'consecutive_failures', '0').catch(() => {});
    }

    // Encrypt prompt and response snapshots via Replay Vault before DB persistence
    let encryptedPrompt: any = {};
    let encryptedResponse: any = result;
    try {
      encryptedPrompt = this.replay.encrypt({ requestId, provider, model });
      encryptedResponse = this.replay.encrypt(result);
    } catch (e: any) {
      this.logger.warn(`Replay encryption skipped: ${e.message}`);
    }

    await this.prisma.aITrace.create({
      data: {
        run: { connect: { id: runId } },
        provider,
        model,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        latency: latencyMs,
        estimatedCost: apiKey.estimatedCost ?? 0,
        actualCost: costUsd,
        requestId,
        status: 'success',
        httpStatus: 200,
        promptSnapshot: encryptedPrompt,
        responseSnapshot: encryptedResponse,
      },
    }).catch((e) => this.logger.error(`AITrace creation failed: ${e.message}`));

    // Trigger UsageAccumulator non-blocking write
    this.accumulator.record({
      requestId,
      apiKeyId: apiKey.id,
      organizationId: apiKey.organizationId,
      model,
      provider,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      providerChain: providerChain.join(','),
      isDegraded,
      latencyMs,
      quotaBypass: apiKey.quotaBypass ?? false,
      sessionId: sessionId || undefined,
      estimatedCost: apiKey.estimatedCost,
    }).catch(err => this.logger.error(`UsageAccumulator write failed: ${err.message}`));
  }

  async handleChatCompletionStream(
    body: Record<string, any>,
    headers: Record<string, any>,
    resolvedApiKey?: any,
    signal?: AbortSignal,
    idempotencyCacheKey?: string,
  ) {
    let fullStreamedText = '';
    let decremented = false;
    const apiKey = resolvedApiKey ?? {
      id: 'dev',
      organizationId: 'dev-sandbox',
      status: 'ACTIVE',
    };

    const requestId: string = apiKey.requestId ?? uuidv4();
    const providerChain: string[] = [];
    const overrides = parseOverrides(headers);
    const startTime = Date.now();

    const sessionId = getHeader(headers, 'x-selixes-session-id', 'x-apishield-session-id')?.toString() || null;
    if (sessionId && !/^[a-zA-Z0-9_-]{1,128}$/.test(sessionId)) {
      throw new HttpException('Invalid session ID format.', 400);
    }
    let terminationReason: string | null = null;

    // ── Agent Runtime Protection Reasoning Budget Gate (Streaming) ─────────
    if (sessionId) {
      if (this.redis.isFallbackActive()) {
        this.prometheus.incrementFallbackMetric();
      }

      const budgetCostRaw = getHeader(headers, 'x-selixes-max-session-cost', 'x-apishield-max-session-cost');
      const budgetCallsRaw = getHeader(headers, 'x-selixes-max-calls', 'x-apishield-max-calls');
      const budgetConcurRaw = getHeader(headers, 'x-selixes-max-concurrent-calls', 'x-apishield-max-concurrent-calls');
      const budgetDurationRaw = getHeader(headers, 'x-selixes-max-session-duration-ms', 'x-apishield-max-session-duration-ms');

      let maxCost = budgetCostRaw ? parseFloat(budgetCostRaw.toString()) : null;
      if (maxCost !== null && (!Number.isFinite(maxCost) || maxCost <= 0)) {
        maxCost = null;
      }
      let maxCalls = budgetCallsRaw ? parseInt(budgetCallsRaw.toString(), 10) : null;
      if (maxCalls !== null && (isNaN(maxCalls) || maxCalls <= 0)) {
        maxCalls = null;
      }
      let maxConcur = budgetConcurRaw ? parseInt(budgetConcurRaw.toString(), 10) : null;
      if (maxConcur !== null && (isNaN(maxConcur) || maxConcur <= 0)) {
        maxConcur = null;
      }
      let maxDuration = budgetDurationRaw ? parseInt(budgetDurationRaw.toString(), 10) : null;
      if (maxDuration !== null && (isNaN(maxDuration) || maxDuration <= 0)) {
        maxDuration = null;
      }

      const redisKey = `session:metrics:${sessionId}`;
      const metrics = (await this.redis.hgetall(redisKey).catch(() => ({}))) as Record<string, string>;
      
      const currentCost = parseFloat(metrics.total_cost_usd || '0');
      const currentCalls = parseInt(metrics.total_calls || '0', 10);
      const currentConcur = parseInt(metrics.active_connections || '0', 10);
      const startedAt = parseInt(metrics.started_at || Date.now().toString(), 10);
      const consecutiveFailures = parseInt(metrics.consecutive_failures || '0', 10);

      // Save started_at if new session
      if (!metrics.started_at) {
        await this.redis.hset(redisKey, 'started_at', startedAt.toString()).catch(() => {});
        await this.redis.expire(redisKey, 86400).catch(() => {}); // 24hr TTL
      }

      // Check loop instability from message history
      const instability = this.detectTrajectoryInstability(body.messages);
      const effectiveMaxCalls = maxCalls !== null ? maxCalls : 100;

      if (instability.detected) {
        terminationReason = 'TRAJECTORY_INSTABILITY';
        this.logger.warn(`[Agent Loop Breaker] Session ${sessionId} tripped (Stream): ${instability.reason}`);
      } else if (consecutiveFailures >= 3) {
        terminationReason = 'TRAJECTORY_INSTABILITY';
        this.logger.warn(`[Agent Loop Breaker] Session ${sessionId} tripped: 3 consecutive server-side failures detected.`);
      } else if (maxCost !== null && currentCost >= maxCost) {
        terminationReason = 'MAX_COST_EXCEEDED';
      } else if (currentCalls >= effectiveMaxCalls) {
        terminationReason = 'MAX_CALLS_EXCEEDED';
      } else if (maxConcur !== null && currentConcur >= maxConcur) {
        terminationReason = 'CONCURRENCY_EXCEEDED';
      } else if (maxDuration !== null && (Date.now() - startedAt) >= maxDuration) {
        terminationReason = 'MAX_DURATION_EXCEEDED';
      }

      if (terminationReason) {
        let workflow = await this.prisma.workflow.findFirst({
          where: { name: 'Selixes Resilient Gateway', organizationId: apiKey.organizationId },
        });
        if (!workflow) {
          workflow = await this.prisma.workflow.findFirst({
            where: { organizationId: apiKey.organizationId },
          });
        }
        if (!workflow) {
          workflow = await this.prisma.workflow.create({
            data: {
              id: `wf-selixes-gateway-${apiKey.organizationId.substring(0, 8)}`,
              name: 'Selixes Resilient Gateway',
              organizationId: apiKey.organizationId,
              provider: 'SELIXES',
              status: 'ACTIVE',
            },
          });
        }
        
        await this.prisma.workflowRun.create({
          data: {
            workflowId: workflow.id,
            status: RunStatus.FAILED,
            triggerType: 'API_GATEWAY',
            sessionId,
            terminationReason,
            errorMessage: `Runaway Agent Terminated (Streaming): ${terminationReason}`,
            duration: 0,
          },
        });

        throw new HttpException({
          statusCode: 429,
          error: 'runaway_agent_protection',
          message: `Runaway Agent Intercepted: Session budget exceeded (${terminationReason}).`,
          sessionId,
          terminationReason,
          requestId,
        }, 429);
      }

      // Increment active connections
      await this.redis.hincrby(redisKey, 'active_connections', 1).catch(() => {});
    }

    // ── Step 1: Create a database WorkflowRun tracking this gateway run ─────
    let workflow = await this.prisma.workflow.findFirst({
      where: { name: 'Selixes Resilient Gateway', organizationId: apiKey.organizationId },
    });
    if (!workflow) {
      workflow = await this.prisma.workflow.findFirst({
        where: { organizationId: apiKey.organizationId },
      });
    }
    if (!workflow) {
      workflow = await this.prisma.workflow.create({
        data: {
          id: `wf-selixes-gateway-${apiKey.organizationId.substring(0, 8)}`,
          name: 'Selixes Resilient Gateway',
          organizationId: apiKey.organizationId,
          provider: 'SELIXES',
          status: 'ACTIVE',
        },
      });
    }

    const run = await this.prisma.workflowRun.create({
      data: {
        workflowId: workflow.id,
        status: RunStatus.RUNNING,
        triggerType: 'API_GATEWAY',
        sessionId,
      },
    });

    await this.prisma.executionEvent.create({
      data: {
        runId: run.id,
        type: EventType.RUN_STARTED,
        message: 'API Gateway request transit started (Streaming)',
        metadata: { requestId, clientIp: headers['x-forwarded-for'] || '127.0.0.1' },
      },
    });

    let activeGenerator: AsyncGenerator<StreamChunk> | null = null;
    let finalProvider = 'unknown';
    let finalModel = body.model || 'gpt-4o';
    let isDegraded = false;
    let lastError: any = null;

    // ── Pre-TTFT Provider Chain Loop ──────────────────────────────────────
    for (const provider of overrides.failoverPolicy) {
      // Test-mode simulated outage injections
      if (overrides.simulateOutage === 'openai' && provider === 'openai') {
        providerChain.push('openai:simulated-504');
        lastError = new Error('Simulated OpenAI Outage (504)');
        await this.logFailureEvent(run.id, 'openai', lastError.message);
        continue;
      }
      if (overrides.simulateOutage === 'both' && (provider === 'openai' || provider === 'anthropic')) {
        providerChain.push(`${provider}:simulated-429`);
        lastError = new Error(`Simulated ${provider} Outage (429)`);
        await this.logFailureEvent(run.id, provider, lastError.message);
        continue;
      }

      await this.prisma.executionEvent.create({
        data: {
          runId: run.id,
          type: EventType.AI_CALLED,
          message: `Dispatching completion stream payload to ${provider} (${body.model || 'default'})`,
        },
      });

      try {
        let providerGen: AsyncGenerator<StreamChunk>;
        const simOutage = overrides.simulateOutage === 'absolute_blackout' ? undefined : overrides.simulateOutage;
        if (provider === 'openai') {
          providerGen = streamOpenAI(body, overrides.timeoutMs, simOutage, signal);
        } else if (provider === 'anthropic') {
          providerGen = streamAnthropic(body, overrides.timeoutMs, simOutage, signal);
        } else if (provider === 'gemini') {
          providerGen = streamGemini(body, overrides.timeoutMs, simOutage as any, signal);
        } else {
          throw new Error(`Upstream provider ${provider} not supported for streaming`);
        }

        // Test if the provider generator starts successfully (Pre-TTFT evaluation)
        const firstResult = await providerGen.next();

        // Wrap back the pre-fetched first chunk along with the rest of the stream
        async function* prependChunk(
          first: IteratorResult<StreamChunk>,
          generator: AsyncGenerator<StreamChunk>,
        ): AsyncGenerator<StreamChunk> {
          if (!first.done) {
            yield first.value;
          }
          for await (const chunk of generator) {
            yield chunk;
          }
        }

        activeGenerator = prependChunk(firstResult, providerGen);

        const code = 200;
        providerChain.push(`${provider}:${code}`);
        finalProvider = provider;
        if (!firstResult.done && firstResult.value.model) {
          finalModel = firstResult.value.model;
        }

        await this.prisma.executionEvent.create({
          data: {
            runId: run.id,
            type: EventType.NODE_EXECUTED,
            message: `Primary/Standby provider ${provider} stream initialized successfully`,
            metadata: { provider, model: finalModel },
          },
        });
        break;
      } catch (err: any) {
        const code = err.statusCode ?? err.code ?? 'error';
        providerChain.push(`${provider}:${code}`);
        lastError = err;
        this.logger.warn(`Provider stream ${provider} failed pre-TTFT: ${err.message}`);
        await this.logFailureEvent(run.id, provider, err.message);

        await this.prisma.executionEvent.create({
          data: {
            runId: run.id,
            type: EventType.RETRY_TRIGGERED,
            message: `Stream attempt with ${provider} failed pre-TTFT. Instantly initiating failover to next standby.`,
          },
        });
      }
    }

    // ── Tier 3: Continuity Fallback (Ollama) ─────────────────────────────
    if (!activeGenerator && overrides.continuity && overrides.simulateOutage !== 'absolute_blackout') {
      await this.prisma.executionEvent.create({
        data: {
          runId: run.id,
          type: EventType.RETRY_TRIGGERED,
          message: 'All cloud providers failed. Activating local degraded Continuity Mode streaming fallback (Llama-3).',
        },
      });

      try {
        const providerGen = streamOllama(body, 3000, signal);
        const firstResult = await providerGen.next();

        async function* prependChunk(
          first: IteratorResult<StreamChunk>,
          generator: AsyncGenerator<StreamChunk>,
        ): AsyncGenerator<StreamChunk> {
          if (!first.done) {
            yield first.value;
          }
          for await (const chunk of generator) {
            yield chunk;
          }
        }

        activeGenerator = prependChunk(firstResult, providerGen);
        providerChain.push('ollama:200');
        finalProvider = 'ollama';
        if (!firstResult.done && firstResult.value.model) {
          finalModel = firstResult.value.model;
        }
        isDegraded = true;

        await this.prisma.executionEvent.create({
          data: {
            runId: run.id,
            type: EventType.NODE_EXECUTED,
            message: `Continuity streaming completion succeeded locally.`,
            metadata: { provider: 'ollama-local', durationMs: Date.now() - startTime },
          },
        });
      } catch (err: any) {
        providerChain.push(`ollama:${err.code ?? 'error'}`);
        this.logger.error(`Ollama edge fallback stream failed: ${err.message}`);
        await this.logFailureEvent(run.id, 'ollama', err.message);
      }
    }

    // ── Complete Blackout ────────────────────────────────────────────────
    if (!activeGenerator) {
      const duration = Date.now() - startTime;
      await this.prisma.workflowRun.update({
        where: { id: run.id },
        data: {
          status: RunStatus.FAILED,
          completedAt: new Date(),
          duration,
          errorMessage: lastError?.message ?? 'All streaming providers failed',
        },
      });

      if (sessionId && this.redis.isAvailable()) {
        const redisKey = `session:metrics:${sessionId}`;
        await this.redis.hincrby(redisKey, 'consecutive_failures', 1).catch(() => {});
      }
      throw {
        statusCode: 503,
        error: 'all_providers_unavailable',
        message: 'All LLM routes and local fallback continuity nodes are completely unreachable for streaming.',
        providerChain,
        requestId,
      };
    }

    // ── Composed Streaming Pipeline ──────────────────────────────────────
    let completionTokens = 0;
    const stages = [
      createPiiMaskStage(),
      createTokenMeteringStage((tokens) => {
        completionTokens = tokens;
      }),
    ];

    // Write-behind cache: capture stream and write to Redis only on success
    const cacheMode = (getHeader(headers, 'x-selixes-cache', 'x-apishield-cache') ?? '').toLowerCase();
    if (this.redis.isAvailable() && cacheMode !== 'bypass') {
      const ttl = parseInt(getHeader(headers, 'x-selixes-cache-ttl', 'x-apishield-cache-ttl') ?? '3600');
      // Compute prompt canonical key
      const canonical = JSON.stringify({
        max_tokens:  body.max_tokens  ?? null,
        messages:    body.messages    ?? [],
        model:       body.model       ?? '',
        temperature: body.temperature ?? null,
        top_p:       body.top_p       ?? null,
      });
      const hash = createHash('sha256').update(canonical).digest('hex');
      const cacheKey = `cache:prompt:${hash}`;

      stages.push(
        createCacheCaptureStage(async (fullResponseText) => {
          fullStreamedText = fullResponseText;
          const cacheData = {
            id: `chatcmpl-${requestId}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: finalModel,
            choices: [{
              index: 0,
              message: { role: 'assistant', content: fullResponseText },
              finish_reason: 'stop',
            }],
            usage: {
              prompt_tokens: 120, // estimated base
              completion_tokens: completionTokens,
              total_tokens: 120 + completionTokens,
            },
          };
          await this.redis.set(cacheKey, JSON.stringify(cacheData), 'EX', ttl)
            .catch(e => this.logger.warn(`Stream write-behind cache capture failed: ${e.message}`));
        }),
      );
    }

    // Telemetry & Latency stage
    stages.push(
      createAnalyticsStage(startTime, () => {}),
    );

    const composedStream = composePipeline(activeGenerator, stages);

    // Return the execution handle to the controller
    return {
      stream: composedStream,
      requestId,
      providerChain,
      getFinalProvider: () => finalProvider,
      getFinalModel: () => finalModel,
      getIsDegraded: () => isDegraded,
      getDuration: () => Date.now() - startTime,
      finalize: async () => {
        let shouldDecrement = false;
        if (!decremented) {
          decremented = true;
          shouldDecrement = true;
        }
        if (shouldDecrement && sessionId && this.redis.isAvailable()) {
          const redisKey = `session:metrics:${sessionId}`;
          await this.redis.hincrby(redisKey, 'active_connections', -1).catch(() => {});
          const metrics = (await this.redis.hgetall(redisKey).catch(() => ({}))) as Record<string, string>;
          if (parseInt(metrics.active_connections || '0', 10) < 0) {
            await this.redis.hset(redisKey, 'active_connections', '0').catch(() => {});
          }
        }

        const finalDuration = Date.now() - startTime;

        await this.prisma.workflowRun.update({
          where: { id: run.id },
          data: {
            status: RunStatus.SUCCESS,
            completedAt: new Date(),
            duration: finalDuration,
          },
        });

        const mockResponseObject = {
          id: `chatcmpl-${requestId}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: finalModel,
          choices: [{
            index: 0,
            message: { role: 'assistant', content: fullStreamedText || '[Streamed response]' },
            finish_reason: 'stop',
          }],
          usage: {
            prompt_tokens: 120,
            completion_tokens: completionTokens,
            total_tokens: 120 + completionTokens,
          },
        };

        await this.finalizeResponse(
          run.id,
          requestId,
          apiKey,
          mockResponseObject,
          finalProvider,
          finalModel,
          providerChain,
          isDegraded,
          finalDuration,
          sessionId,
        );

        if (idempotencyCacheKey) {
          const completedRecord = {
            status: 'COMPLETED',
            response: mockResponseObject,
            startedAt: startTime,
            completedAt: Date.now(),
          };
          await this.redis.set(idempotencyCacheKey, JSON.stringify(completedRecord), 'EX', 300)
            .catch(e => this.logger.error(`Stream idempotency completed write failed: ${e.message}`));
        }
      },
      abort: async () => {
        let shouldDecrement = false;
        if (!decremented) {
          decremented = true;
          shouldDecrement = true;
        }
        if (shouldDecrement && sessionId) {
          const redisKey = `session:metrics:${sessionId}`;
          await this.redis.hincrby(redisKey, 'active_connections', -1).catch(() => {});
          const metrics = (await this.redis.hgetall(redisKey).catch(() => ({}))) as Record<string, string>;
          if (parseInt(metrics.active_connections || '0', 10) < 0) {
            await this.redis.hset(redisKey, 'active_connections', '0').catch(() => {});
          }
        }
        if (idempotencyCacheKey) {
          await this.redis.del(idempotencyCacheKey).catch(() => {});
        }
      },
    };
  }

  private sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (signal?.aborted) {
        return reject(new Error('Aborted'));
      }
      const timer = setTimeout(() => {
        if (signal) signal.removeEventListener('abort', onAbort);
        resolve();
      }, ms);

      function onAbort() {
        clearTimeout(timer);
        reject(new Error('Aborted'));
      }

      if (signal) {
        signal.addEventListener('abort', onAbort);
      }
    });
  }

  private detectTrajectoryInstability(messages: any[]): { detected: boolean; reason: string | null } {
    if (!messages || !Array.isArray(messages)) return { detected: false, reason: null };

    const toolFailures = new Map<string, { count: number; lastError: string }>();

    for (const msg of messages) {
      if (msg.role === 'tool') {
        const toolName = msg.name || 'unknown';
        const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content ?? '');
        
        // Classify if this tool response is an error
        const lowerContent = content.toLowerCase();
        const isError = lowerContent.includes('error') || 
                        lowerContent.includes('fail') || 
                        lowerContent.includes('timeout') || 
                        lowerContent.includes('exception') ||
                        lowerContent.includes('invalid') ||
                        lowerContent.includes('not found') ||
                        lowerContent.includes('refused');

        if (isError) {
          // Normalize error string by removing digits, UUIDs, and trimming to avoid slight variance noise
          const normalizedError = content
            .replace(/\d+/g, '')
            .replace(/[a-f0-9-]{36}/gi, '')
            .substring(0, 100)
            .trim();

          const record = toolFailures.get(toolName) ?? { count: 0, lastError: '' };
          if (record.lastError === normalizedError) {
            record.count++;
          } else {
            record.count = 1;
            record.lastError = normalizedError;
          }
          toolFailures.set(toolName, record);

          // Halt loop strictly if the same tool fails consecutively 3 times with the same error signature
          if (record.count >= 3) {
            return {
              detected: true,
              reason: `Instability Loop Detected: Tool '${toolName}' failed consecutively with the same error: "${normalizedError}"`,
            };
          }
        } else {
          // Successful execution resets the consecutive failure counters
          toolFailures.delete(toolName);
        }
      }
    }

    return { detected: false, reason: null };
  }
}
