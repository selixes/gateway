import { Injectable, Logger, HttpException, Optional } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import * as http from 'http';
import CircuitBreaker from 'opossum';
import { UsageAccumulatorService, PRICING } from './usage-accumulator.service';
import { AsyncAuditService } from './async-audit.service';
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
import { SemanticCacheService, isDestructiveVerbPrompt } from './semantic-cache.service';
import { AlertsService } from '../alerts/alerts.service';
import { TimeTravelRollbackService } from './time-travel-rollback.service';

export interface GatewayOverrides {
  timeoutMs:       number;           // from x-selixes-timeout, default 10_000
  failoverPolicy:  string[];         // from x-selixes-failover-policy, default ['openai','anthropic']
  continuity:      boolean;          // from x-selixes-continuity, default true
  simulateOutage?: 'openai' | 'both' | 'absolute_blackout'; // TEST_MODE only
  cacheEnabled:    boolean;
  cacheTtl:        number;
  semanticCache:   boolean;
  semanticThreshold: number;
}

const VALID_PROVIDERS = new Set(['openai', 'anthropic', 'gemini', 'ollama', 'vllm', 'local']);
const DEFAULT_CHAIN = process.env.DEFAULT_PROVIDER_CHAIN
  ? process.env.DEFAULT_PROVIDER_CHAIN.split(',').map((s) => s.trim().toLowerCase())
  : ['openai', 'anthropic'];
const DEFAULT_TIMEOUT = 10000;

function getHeader(headers: Record<string, any>, currentName: string, legacyName: string): any {
  return headers[currentName] ?? headers[legacyName];
}

function parseOverrides(headers: Record<string, any>): GatewayOverrides {
  const isTestMode = process.env.NODE_ENV === 'test' || process.env.GATEWAY_TEST_MODE === 'true';

  // Parse x-selixes-timeout, accepting legacy x-apishield-timeout during migration.
  const rawTimeout = parseInt(getHeader(headers, 'x-selixes-timeout', 'x-apishield-timeout') ?? '');
  const timeoutMs = Number.isFinite(rawTimeout) && rawTimeout > 0
    ? rawTimeout : DEFAULT_TIMEOUT;

  // Parse x-selixes-failover-policy, accepting legacy x-apishield-failover-policy.
  let failoverPolicy = DEFAULT_CHAIN;
  const rawPolicy = getHeader(headers, 'x-selixes-failover-policy', 'x-apishield-failover-policy') ?? '';
  if (rawPolicy) {
    const parts = rawPolicy.split('->').map((s: string) => s.trim().toLowerCase());
    if (parts.length > 0 && parts.every((p: string) => VALID_PROVIDERS.has(p))) {
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

  // Parse cache headers
  const cacheEnabled = getHeader(headers, 'x-selixes-cache-enabled', 'x-apishield-cache-enabled') === 'true';
  const rawTtl = parseInt(getHeader(headers, 'x-selixes-cache-ttl', 'x-apishield-cache-ttl') ?? '3600', 10);
  const cacheTtl = Number.isFinite(rawTtl) && rawTtl > 0 ? rawTtl : 3600;

  // Parse semantic cache headers
  const rawSemanticHeader = getHeader(headers, 'x-selixes-semantic-cache', 'x-apishield-semantic-cache');
  let semanticCache: boolean;
  if (rawSemanticHeader !== undefined) {
    semanticCache = rawSemanticHeader === 'true';
  } else {
    // Default false unless explicitly enabled in environment
    semanticCache = process.env.SEMANTIC_CACHE_DEFAULT_ENABLED === 'true' || process.env.SEMANTIC_CACHE_ENABLED === 'true';
  }
  const rawThreshold = parseFloat(getHeader(headers, 'x-selixes-semantic-threshold', 'x-apishield-semantic-threshold') ?? (process.env.SEMANTIC_CACHE_THRESHOLD || '0.95'));
  const semanticThreshold = Number.isFinite(rawThreshold) && rawThreshold >= 0 && rawThreshold <= 1 ? rawThreshold : 0.95;

  return { timeoutMs, failoverPolicy, continuity, simulateOutage, cacheEnabled, cacheTtl, semanticCache, semanticThreshold };
}

export function shouldBypassSemanticCache(body: Record<string, any>, promptText: string): { bypass: boolean; reason?: string } {
  if (body?.tools && Array.isArray(body.tools) && body.tools.length > 0) {
    return { bypass: true, reason: 'request contains tools' };
  }
  if (body?.functions && Array.isArray(body.functions) && body.functions.length > 0) {
    return { bypass: true, reason: 'request contains functions' };
  }
  if (body?.tool_choice !== undefined && body?.tool_choice !== null && body?.tool_choice !== 'none') {
    return { bypass: true, reason: 'request specifies tool_choice' };
  }
  if (Array.isArray(body?.messages) && body.messages.some((m: any) => m?.role === 'tool' || m?.role === 'function')) {
    return { bypass: true, reason: 'request messages contain tool/function role' };
  }
  if (isDestructiveVerbPrompt(promptText)) {
    return { bypass: true, reason: 'prompt matches destructive or privileged verbs' };
  }
  return { bypass: false };
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

export function isProviderConfigured(provider: string): boolean {
  if (provider === 'openai') return !!process.env.OPENAI_API_KEY;
  if (provider === 'anthropic') return !!process.env.ANTHROPIC_API_KEY;
  if (provider === 'gemini') return !!process.env.GEMINI_API_KEY;
  if (provider === 'ollama' || provider === 'vllm' || provider === 'local') {
    return !!(process.env.OLLAMA_URL || process.env.LOCAL_OPENAI_URL || process.env.VLLM_URL);
  }
  return false;
}

export function isMockAllowed(): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  return process.env.SELIXES_ALLOW_MOCK !== 'false';
}

@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);
  private openaiBreaker: CircuitBreaker;
  private anthropicBreaker: CircuitBreaker;
  private geminiBreaker: CircuitBreaker;

  private auditService: AsyncAuditService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly accumulator: UsageAccumulatorService,
    private readonly redis: RedisService,
    private readonly providerHealth: ProviderHealthService,
    private readonly prometheus: PrometheusService,
    private readonly replay: ReplayService,
    private readonly eventBus: GatewayEventBus,
    private readonly semanticCache: SemanticCacheService,
    private readonly alertsService: AlertsService,
    private readonly rollbackEngine: TimeTravelRollbackService,
    @Optional() injectedAuditService?: AsyncAuditService,
  ) {
    this.auditService = injectedAuditService || new AsyncAuditService(this.prisma);
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434/api/chat';
    if (!isPrivateUrl(ollamaUrl)) {
      this.logger.warn(
        `⚠️ WARNING: OLLAMA_URL is configured to a potentially public/external address: "${ollamaUrl}". For data sovereignty, Ollama should only be hosted internally.`,
      );
    }

    const allProviders = ['openai', 'anthropic', 'gemini', 'ollama'];
    const configured = allProviders.filter((p) => isProviderConfigured(p));
    const unconfigured = allProviders.filter((p) => !isProviderConfigured(p));
    this.logger.warn(
      `[Provider Configuration] Configured: [${configured.join(', ') || 'none'}], Unconfigured: [${unconfigured.join(', ')}]`,
    );

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

  private async checkAndFireMilestone(orgId: string, milestoneName: string, title: string, message: string, details?: Record<string, any>) {
    if (!orgId || orgId === 'dev-sandbox') return;
    try {
      const redisKey = `org:milestones:${orgId}`;
      const hasFired = await this.redis.hget(redisKey, milestoneName);
      if (!hasFired) {
        await this.redis.hset(redisKey, milestoneName, '1');
        await this.alertsService.sendFounderAlert(title, message, details);
      }
    } catch (err) {
      this.logger.warn(`Failed to fire milestone ${milestoneName} for org ${orgId}: ${err.message}`);
    }
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
      status: 'ACTIVE',
    };

    const requestId: string = apiKey.requestId ?? uuidv4();
    const providerChain: string[] = [];
    const overrides = parseOverrides(headers);
    const startTime = Date.now();

    // ── Semantic Caching: Read-Through ───────────────────────────────────────
    let semanticVector: number[] | null = null;
    let semanticScopeHash: string | null = null;
    let semanticBypassed = false;
    let cleanPromptForCache = '';

    if (overrides.semanticCache && this.semanticCache?.isAvailable() && apiKey?.organizationId) {
      try {
        const rawPrompt = (body.messages ?? []).map((m: any) => m.content).join('\n');
        const bypassCheck = shouldBypassSemanticCache(body, rawPrompt);
        if (bypassCheck.bypass) {
          semanticBypassed = true;
          this.logger.log(`[Semantic Cache Bypass] ${bypassCheck.reason}. Bypassing semantic cache.`);
        } else if (rawPrompt) {
          const hasPII = typeof this.semanticCache.hasPII === 'function' ? this.semanticCache.hasPII(rawPrompt) : false;
          if (hasPII && process.env.SEMANTIC_CACHE_SKIP_ON_PII !== 'false') {
            semanticBypassed = true;
            this.logger.warn(`[Semantic Cache] PII detected in prompt for organization ${apiKey.organizationId}. Bypassing semantic cache for privacy.`);
          } else {
            cleanPromptForCache = typeof this.semanticCache.scrubPII === 'function' ? this.semanticCache.scrubPII(rawPrompt) : rawPrompt;
            semanticScopeHash = typeof this.semanticCache.computeScopeHash === 'function' ? this.semanticCache.computeScopeHash(body) : 'scope-default';
            semanticVector = await this.semanticCache.generateEmbedding(cleanPromptForCache);
            const cachedResponse = await this.semanticCache.query(
              semanticVector,
              overrides.semanticThreshold,
              apiKey.organizationId,
              semanticScopeHash,
              cleanPromptForCache,
            );
            
            if (cachedResponse) {
              const backend = typeof this.semanticCache.getBackend === 'function' ? this.semanticCache.getBackend() : 'vector';
              this.logger.log(`[Semantic Cache Hit] Serving response from ${backend} cache in ${Date.now() - startTime}ms (scope: ${semanticScopeHash})`);
            
            this.eventBus.publish({
              type: 'request.completed',
              requestId,
              correlationId: requestId,
              apiKeyId: apiKey.id,
              organizationId: apiKey.organizationId,
              provider: 'semantic-cache',
              model: cachedResponse.model,
              latencyMs: Date.now() - startTime,
              ttftMs: Date.now() - startTime,
              tokens: { prompt: cachedResponse.usage?.prompt_tokens || 0, completion: cachedResponse.usage?.completion_tokens || 0, total: cachedResponse.usage?.total_tokens || 0 },
              status: 'success',
              isStream: false,
              region: process.env.GATEWAY_REGION || 'us-east-1',
            });

            // Event 5 - First Cache Hit
            this.checkAndFireMilestone(
              apiKey.organizationId, 
              'first_cache', 
              '⚡ First Cache Hit', 
              'Organization successfully served a request from the Semantic Cache.',
              { 'Org ID': apiKey.organizationId, 'Model': cachedResponse.model }
            );

            return {
              ...cachedResponse,
              _meta: { requestId, providerChain: ['semantic-cache:200'] },
            };
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`Semantic Cache read-through failed: ${err.message}`);
    }
  }

    // ── Caching: Read-Through ────────────────────────────────────────────────
    let cacheKey = '';
    if (overrides.cacheEnabled && this.redis.isAvailable()) {
      const canonical = JSON.stringify({
        max_tokens:  body.max_tokens  ?? null,
        messages:    body.messages    ?? [],
        model:       body.model       ?? '',
        temperature: body.temperature ?? null,
        top_p:       body.top_p       ?? null,
      });
      const hash = createHash('sha256').update(canonical).digest('hex');
      cacheKey = `cache:prompt:${hash}`;
      
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        try {
          const parsedCache = JSON.parse(cached);
          this.logger.log(`[Cache Hit] Serving response from Redis cache in ${Date.now() - startTime}ms`);
          
          this.eventBus.publish({
            type: 'request.completed',
            requestId,
            correlationId: requestId,
            apiKeyId: apiKey.id,
            organizationId: apiKey.organizationId,
            provider: 'redis-cache',
            model: parsedCache.model,
            latencyMs: Date.now() - startTime,
            ttftMs: Date.now() - startTime,
            tokens: { prompt: parsedCache.usage?.prompt_tokens || 0, completion: parsedCache.usage?.completion_tokens || 0, total: parsedCache.usage?.total_tokens || 0 },
            status: 'success',
            isStream: false,
            region: process.env.GATEWAY_REGION || 'us-east-1',
          });

          // Event 5 - First Cache Hit
          this.checkAndFireMilestone(
            apiKey.organizationId, 
            'first_cache', 
            '⚡ First Cache Hit', 
            'Organization successfully served a request from the Redis Cache.',
            { 'Org ID': apiKey.organizationId, 'Model': parsedCache.model }
          );

          return {
            ...parsedCache,
            _meta: { requestId, providerChain: ['redis-cache:200'] },
          };
        } catch (e: any) {
          this.logger.warn(`Failed to parse cache payload for key ${cacheKey}`);
        }
      }
    }

    const sessionId = getHeader(headers, 'x-selixes-session-id', 'x-apishield-session-id')?.toString() || null;
    if (sessionId && !/^[a-zA-Z0-9_-]{1,128}$/.test(sessionId)) {
      throw new HttpException('Invalid session ID format.', 400);
    }
    let terminationReason: string | null = null;
    let sessionStepIndex = 1;

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
      sessionStepIndex = currentCalls + 1;
      const currentConcur = parseInt(metrics.active_connections || '0', 10);
      const startedAt = parseInt(metrics.started_at || Date.now().toString(), 10);
      const consecutiveFailures = parseInt(metrics.consecutive_failures || '0', 10);

      // Save started_at if new session
      if (!metrics.started_at) {
        await this.redis.hset(redisKey, 'started_at', startedAt.toString()).catch(() => {});
        await this.redis.expire(redisKey, 86400).catch(() => {}); // 24hr TTL
      }

      const cognitiveInterceptEnabled = getHeader(headers, 'x-selixes-cognitive-intercept', 'x-apishield-cognitive-intercept') !== 'false';
      const cognitiveInterceptThreshold = parseInt(getHeader(headers, 'x-selixes-cognitive-intercept-threshold', 'x-apishield-cognitive-intercept-threshold') || '3', 10);

      // Security: Strip any spoofed intercept messages injected by the client
      if (body.messages) {
        const originalLength = body.messages.length;
        body.messages = body.messages.filter((msg: any) => 
          !(msg.role === 'system' && typeof msg.content === 'string' && msg.content.includes('[SELIXES COGNITIVE INTERCEPT]'))
        );
        if (body.messages.length < originalLength) {
          this.logger.warn(`[Cognitive Intercept] Spoofing Guard: Stripped ${originalLength - body.messages.length} fake intercept message(s) from payload.`);
        }
      }

      // Check loop instability from message history
      const instability = this.detectTrajectoryInstability(body.messages, cognitiveInterceptThreshold);
      const effectiveMaxCalls = maxCalls !== null ? maxCalls : 100;

      if (instability.detected) {
        if (cognitiveInterceptEnabled) {
          this.logger.warn(`[Cognitive Intercept] Session ${sessionId}: Injecting steering prompt. Reason: ${instability.reason}`);
          if (!body.messages) body.messages = [];
          body.messages.push({
            role: 'system',
            content: `[SELIXES COGNITIVE INTERCEPT] ${instability.reason} You must break out of this loop. Do not repeat the same action. Formulate a final response or try a completely different approach.`
          });
          terminationReason = null; // Clear termination reason so request proceeds
        } else {
          terminationReason = 'TRAJECTORY_INSTABILITY';
          this.logger.warn(`[Agent Loop Breaker] Session ${sessionId} tripped: ${instability.reason}`);
        }
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
        const orgId = apiKey.organizationId || 'default';
        let workflow = await this.prisma.workflow.findFirst({
          where: { name: 'Selixes Resilient Gateway', organizationId: orgId },
        });
        if (!workflow) {
          workflow = await this.prisma.workflow.findFirst({
            where: { organizationId: orgId },
          });
        }
        if (!workflow) {
          workflow = await this.prisma.workflow.create({
            data: {
              id: `wf-selixes-gateway-${orgId.substring(0, 8)}`,
              name: 'Selixes Resilient Gateway',
              organizationId: orgId,
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

        // Event 6 - First Budget Protection Trigger
        if (terminationReason === 'MAX_COST_EXCEEDED' || terminationReason === 'MAX_CALLS_EXCEEDED') {
          this.checkAndFireMilestone(
            apiKey.organizationId, 
            'first_budget', 
            '🛡️ First Budget Protection Trigger', 
            'Organization successfully hit a budget circuit breaker intercept.',
            { 'Org ID': apiKey.organizationId, 'Reason': terminationReason }
          );
        }

        throw new HttpException({
          error: {
            type: 'agent_loop_halted',
            code: 'AGENT_LOOP_HALTED',
            message: `Runaway Agent Intercepted: Session budget exceeded (${terminationReason}).`,
            details: {
              turns: currentCalls,
              repeated_tool: instability?.repeatedTool || null,
              session_id: sessionId,
            },
          },
        }, 422);
      }

      // Increment active connections
      await this.redis.hincrby(redisKey, 'active_connections', 1).catch(() => {});
    }

    try {
      // ── Step 1: Create a database WorkflowRun tracking this gateway run ─────
      const orgId = apiKey.organizationId || 'default';
      let workflow = await this.prisma.workflow.findFirst({
        where: { name: 'Selixes Resilient Gateway', organizationId: orgId },
      });
      if (!workflow) {
        workflow = await this.prisma.workflow.findFirst({
          where: { organizationId: orgId },
        });
      }
      if (!workflow) {
        workflow = await this.prisma.workflow.create({
          data: {
            id: `wf-selixes-gateway-${orgId.substring(0, 8)}`,
            name: 'Selixes Resilient Gateway',
            organizationId: orgId,
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
      let isMockResponse = false;
      let lastError: any = null;

      const isProd = process.env.NODE_ENV === 'production';
      const allowMock = isMockAllowed();

      // In production or when mocks are disallowed, filter chain to configured providers only
      let candidatePolicy = overrides.failoverPolicy;
      if (isProd || !allowMock) {
        candidatePolicy = overrides.failoverPolicy.filter((p) => isProviderConfigured(p));
      }

      // Model-aware provider prioritization: if caller requested a Claude or Gemini model, prioritize matching provider
      if (body.model?.toLowerCase().includes('claude') && candidatePolicy.includes('anthropic')) {
        candidatePolicy = ['anthropic', ...candidatePolicy.filter((p) => p !== 'anthropic')];
      } else if (body.model?.toLowerCase().includes('gemini') && candidatePolicy.includes('gemini')) {
        candidatePolicy = ['gemini', ...candidatePolicy.filter((p) => p !== 'gemini')];
      }

      const ollamaConfigured = isProviderConfigured('ollama');
      const allowOllama = overrides.continuity && (isProd ? ollamaConfigured : (allowMock || ollamaConfigured));

      if (candidatePolicy.length === 0 && !allowOllama) {
        const msg = isProd
          ? 'No upstream LLM providers are configured in production. Configure at least one provider key (OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY) or OLLAMA_URL.'
          : 'No upstream LLM providers are configured and SELIXES_ALLOW_MOCK is false. Configure at least one provider key or enable mocks.';
        const errPayload = {
          statusCode: 503,
          error: 'all_providers_unavailable',
          message: msg,
          providerChain,
          requestId,
        };
        const exc = new HttpException(errPayload, 503);
        Object.assign(exc, errPayload);
        throw exc;
      }

      // ── Tier 1 & 2: Configurable Provider Chain ──────────────────────────
      for (const provider of candidatePolicy) {
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
          if (result.isMock) {
            isMockResponse = true;
            this.logger.warn(
              `[Mock Provider] Serving mock response for provider "${provider}" (model: ${finalModel}) because no API key is configured and SELIXES_ALLOW_MOCK is true.`,
            );
          }

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
      if (!completionResponse && allowOllama && overrides.simulateOutage !== 'absolute_blackout') {
        this.prisma.executionEvent.create({
          data: {
            runId: run.id,
            type: EventType.RETRY_TRIGGERED,
            message: 'All cloud providers failed. Activating local degraded Continuity Mode fallback (Llama-3).',
          },
        }).catch((e) => this.logger.warn(`Failed to log continuity retry event: ${e.message}`));

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
        if (isMockResponse) {
          completionResponse.x_selixes_mock = true;
        }

        // Delegate run update + trace creation to AsyncAuditService (non-blocking in async mode)
        const finalizePromise = this.finalizeResponse(
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
        if (!this.auditService.isAsyncMode()) {
          await finalizePromise;
        } else {
          finalizePromise.catch((err) => this.logger.error(`finalizeResponse error: ${err.message}`));
        }

        // Record provider success for health scoring
        this.providerHealth.recordSuccess(finalProvider).catch(() => {});

        // Capture session checkpoint for Time-Travel Rollback
        if (sessionId) {
          this.rollbackEngine.captureCheckpoint(
            sessionId,
            sessionStepIndex,
            body.messages || [],
            finalModel,
            completionResponse.usage?.total_tokens || 0,
          );
        }

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

        if (overrides.cacheEnabled && cacheKey) {
          this.redis.set(cacheKey, JSON.stringify(completionResponse), 'EX', overrides.cacheTtl).catch(() => {});
        }

        if (!semanticBypassed && overrides.semanticCache && semanticVector && semanticScopeHash && this.semanticCache && apiKey?.organizationId) {
          const hasResponsePII = typeof this.semanticCache.hasPII === 'function' ? this.semanticCache.hasPII(completionResponse) : false;
          if (hasResponsePII && process.env.SEMANTIC_CACHE_SKIP_ON_PII !== 'false') {
            this.logger.warn(`[Semantic Cache] PII detected in completion response for organization ${apiKey.organizationId}. Skipping semantic cache storage.`);
          } else {
            const cleanResponse = typeof this.semanticCache.scrubPII === 'function' ? this.semanticCache.scrubPII(completionResponse) : completionResponse;
            this.semanticCache.upsert(
              requestId,
              semanticVector,
              cleanResponse,
              apiKey.organizationId,
              semanticScopeHash,
              overrides.cacheTtl,
              cleanPromptForCache,
            ).catch(() => {});
          }
        }

        return {
          ...completionResponse,
          _meta: {
            requestId,
            providerChain,
            isMock: isMockResponse,
          },
        };
      } else {
        await this.auditService.record({
          runId: run.id,
          runStatus: RunStatus.FAILED,
          completedAt: new Date(),
          duration,
          errorMessage: lastError?.message ?? 'All providers failed',
        });

        if (sessionId) {
          const redisKey = `session:metrics:${sessionId}`;
          await this.redis.hincrby(redisKey, 'consecutive_failures', 1).catch(() => {});
        }

        const isSingleConfiguredProvider = isProd && candidatePolicy.length === 1;
        const errStatus = isSingleConfiguredProvider && ((lastError as any)?.statusCode || (lastError as any)?.response?.status)
          ? ((lastError as any)?.statusCode || (lastError as any)?.response?.status)
          : 503;
        const errMsg = (lastError as any)?.message || 'All LLM routes and local fallback continuity nodes are completely unreachable.';
        const errCode = isSingleConfiguredProvider ? 'upstream_error' : 'all_providers_unavailable';
        const errPayload = {
          statusCode: errStatus,
          error: (lastError as any)?.error || errCode,
          message: errMsg,
          data: (lastError as any)?.data,
          providerChain,
          requestId,
        };
        const exc = new HttpException(errPayload, errStatus);
        Object.assign(exc, errPayload);
        throw exc;
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
    if (provider === 'ollama' || provider === 'vllm' || provider === 'local') {
      return this.callOllama(body, signal);
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
    const openAiBaseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');

    if (!openAiApiKey) {
      if (!isMockAllowed()) {
        throw new HttpException({
          statusCode: 503,
          error: 'provider_unconfigured',
          message: 'OPENAI_API_KEY is not configured and mocks are disabled in this environment.',
        }, 503);
      }

      this.logger.warn('[Mock Provider] Using mock OpenAI provider (OPENAI_API_KEY missing).');
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
        isMock: true,
        data: {
          id: `chatcmpl-${uuidv4()}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: body.model || 'gpt-4o',
          x_selixes_mock: true,
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
      try {
        const response = await axios.post(`${openAiBaseUrl}/chat/completions`, body, {
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
          isMock: false,
        };
      } catch (err: any) {
        throw {
          statusCode: err.response?.status || 502,
          message: err.response?.data?.error?.message || err.message,
          data: err.response?.data,
          code: err.code || 'UPSTREAM_ERROR',
        };
      }
    }
  }

  private async callAnthropicInternal(
    body: Record<string, any>,
    timeoutMs: number,
    signal?: AbortSignal,
  ): Promise<any> {
    const promptTokens = 120 + Math.floor(Math.random() * 40);
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    const anthropicModel = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
    let anthropicBase = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/+$/, '');
    const anthropicUrl = anthropicBase.endsWith('/v1') ? `${anthropicBase}/messages` : `${anthropicBase}/v1/messages`;

    if (!anthropicApiKey) {
      if (!isMockAllowed()) {
        throw new HttpException({
          statusCode: 503,
          error: 'provider_unconfigured',
          message: 'ANTHROPIC_API_KEY is not configured and mocks are disabled in this environment.',
        }, 503);
      }

      this.logger.warn('[Mock Provider] Using mock Anthropic provider (ANTHROPIC_API_KEY missing).');
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
        model: anthropicModel,
        isMock: true,
        data: {
          id: `chatcmpl-${uuidv4()}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: anthropicModel,
          x_selixes_mock: true,
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
      const { systemPrompt, anthropicMessages, anthropicTools } = this.translateOpenAIToAnthropic(body);

      const requestPayload: any = {
        model: anthropicModel,
        messages: anthropicMessages,
        max_tokens: body.max_tokens || 1000,
        temperature: body.temperature,
        top_p: body.top_p,
      };

      if (systemPrompt) {
        requestPayload.system = systemPrompt;
      }
      if (anthropicTools && anthropicTools.length > 0) {
        requestPayload.tools = anthropicTools;
      }

      try {
        const response = await axios.post(anthropicUrl, requestPayload, {
          headers: {
            'x-api-key': anthropicApiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          timeout: timeoutMs,
          signal,
        });

        const translated = this.translateAnthropicResponseToOpenAI(response.data, promptTokens, response.status);
        return {
          ...translated,
          isMock: false,
        };
      } catch (err: any) {
        throw {
          statusCode: err.response?.status || 502,
          message: err.response?.data?.error?.message || err.message,
          data: err.response?.data,
          code: err.code || 'UPSTREAM_ERROR',
        };
      }
    }
  }

  public translateOpenAIToAnthropic(body: Record<string, any>): {
    systemPrompt?: string;
    anthropicMessages: any[];
    anthropicTools?: any[];
  } {
    let systemPrompt: string | undefined = undefined;
    const rawMessages: { role: 'user' | 'assistant'; content: any[] }[] = [];
    const knownToolUseIds = new Set<string>();

    for (const msg of body.messages || []) {
      if (msg.role === 'system') {
        const text = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        if (text && text.trim().length > 0) {
          systemPrompt = systemPrompt ? `${systemPrompt}\n\n${text}` : text;
        }
        continue;
      }

      if (msg.role === 'tool') {
        const toolUseId = msg.tool_call_id || `toolu_${uuidv4().replace(/-/g, '').slice(0, 24)}`;
        const textContent = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content ?? '');
        const safeText = textContent && textContent.trim().length > 0 ? textContent : ' ';
        
        // Ensure Anthropic strict requirement: tool_result MUST match a preceding tool_use in the assistant turn
        if (!knownToolUseIds.has(toolUseId)) {
          let lastAssistantMsg: any = null;
          for (let i = rawMessages.length - 1; i >= 0; i--) {
            if (rawMessages[i].role === 'assistant') {
              lastAssistantMsg = rawMessages[i];
              break;
            }
          }
          if (lastAssistantMsg) {
            lastAssistantMsg.content.push({
              type: 'tool_use',
              id: toolUseId,
              name: 'synthesized_tool',
              input: {},
            });
            knownToolUseIds.add(toolUseId);
          } else {
            rawMessages.push({
              role: 'assistant',
              content: [{
                type: 'tool_use',
                id: toolUseId,
                name: 'synthesized_tool',
                input: {},
              }],
            });
            knownToolUseIds.add(toolUseId);
          }
        }

        rawMessages.push({
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: toolUseId,
            content: safeText,
          }],
        });
        continue;
      }

      if (msg.role === 'assistant') {
        const blocks: any[] = [];
        if (msg.content) {
          const text = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
          if (text && text.trim().length > 0) {
            blocks.push({ type: 'text', text });
          }
        }
        if (Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
          for (const tc of msg.tool_calls) {
            let parsedInput = {};
            try {
              parsedInput = typeof tc.function?.arguments === 'string'
                ? JSON.parse(tc.function.arguments)
                : (tc.function?.arguments || {});
            } catch {
              parsedInput = { raw: tc.function?.arguments };
            }
            const toolId = tc.id || `toolu_${uuidv4().replace(/-/g, '').slice(0, 24)}`;
            knownToolUseIds.add(toolId);
            blocks.push({
              type: 'tool_use',
              id: toolId,
              name: tc.function?.name || 'unknown_tool',
              input: parsedInput,
            });
          }
        }
        if (blocks.length > 0) {
          rawMessages.push({ role: 'assistant', content: blocks });
        }
        continue;
      }

      // Default user message handling
      const blocks: any[] = [];
      if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part && part.type === 'text' && part.text && part.text.trim().length > 0) {
            blocks.push({ type: 'text', text: part.text });
          } else if (typeof part === 'string' && part.trim().length > 0) {
            blocks.push({ type: 'text', text: part });
          }
        }
      } else if (msg.content) {
        const text = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        if (text && text.trim().length > 0) {
          blocks.push({ type: 'text', text });
        }
      }
      if (blocks.length > 0) {
        rawMessages.push({ role: 'user', content: blocks });
      }
    }

    // Merge consecutive turns with the same role (Anthropic requires strict alternation)
    const anthropicMessages: any[] = [];
    for (const msg of rawMessages) {
      if (anthropicMessages.length === 0) {
        anthropicMessages.push({ role: msg.role, content: [...msg.content] });
      } else {
        const prev = anthropicMessages[anthropicMessages.length - 1];
        if (prev.role === msg.role) {
          prev.content.push(...msg.content);
        } else {
          anthropicMessages.push({ role: msg.role, content: [...msg.content] });
        }
      }
    }

    // Ensure conversation starts with user turn and has non-empty content
    if (anthropicMessages.length === 0) {
      anthropicMessages.push({ role: 'user', content: [{ type: 'text', text: 'Proceed' }] });
    } else if (anthropicMessages[0].role !== 'user') {
      anthropicMessages.unshift({ role: 'user', content: [{ type: 'text', text: 'Proceed' }] });
    }

    // Map tools schema if present
    let anthropicTools: any[] | undefined = undefined;
    if (Array.isArray(body.tools) && body.tools.length > 0) {
      anthropicTools = body.tools.map((t: any) => ({
        name: t.function?.name || t.name,
        description: t.function?.description || t.description || '',
        input_schema: t.function?.parameters || t.input_schema || { type: 'object', properties: {} },
      }));
    }

    return { systemPrompt, anthropicMessages, anthropicTools };
  }

  public translateAnthropicResponseToOpenAI(
    anthropicData: any,
    promptTokens: number,
    statusCode: number = 200,
  ): any {
    const outputTokens = anthropicData.usage?.output_tokens || 85;
    let textContent = '';
    const toolCalls: any[] = [];

    if (Array.isArray(anthropicData.content)) {
      for (const block of anthropicData.content) {
        if (block.type === 'text') {
          textContent += block.text;
        } else if (block.type === 'tool_use') {
          toolCalls.push({
            id: block.id,
            type: 'function',
            function: {
              name: block.name,
              arguments: JSON.stringify(block.input ?? {}),
            },
          });
        }
      }
    }

    const message: any = {
      role: 'assistant',
      content: textContent || null,
    };
    if (toolCalls.length > 0) {
      message.tool_calls = toolCalls;
    }

    const hasToolCalls = toolCalls.length > 0;
    const finishReason = hasToolCalls
      ? 'tool_calls'
      : (anthropicData.stop_reason === 'tool_use' ? 'tool_calls' : 'stop');

    const anthropicModel = anthropicData.model || process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
    return {
      statusCode,
      model: anthropicModel,
      data: {
        id: `chatcmpl-${anthropicData.id || uuidv4()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: anthropicModel,
        choices: [{
          index: 0,
          message,
          finish_reason: finishReason,
        }],
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: outputTokens,
          total_tokens: promptTokens + outputTokens,
        },
      },
    };
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
    const geminiBaseUrl = (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/v1').replace(/\/+$/, '');
    const geminiUrl = `${geminiBaseUrl}/chat/completions`;

    if (!geminiApiKey) {
      if (!isMockAllowed()) {
        throw new HttpException({
          statusCode: 503,
          error: 'provider_unconfigured',
          message: 'GEMINI_API_KEY is not configured and mocks are disabled in this environment.',
        }, 503);
      }

      this.logger.warn('[Mock Provider] Using mock Gemini provider (GEMINI_API_KEY missing).');
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
        isMock: true,
        data: {
          id: `chatcmpl-${uuidv4()}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: targetModel,
          x_selixes_mock: true,
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
      try {
        const response = await axios.post(geminiUrl, {
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
          isMock: false,
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
      } catch (err: any) {
        throw {
          statusCode: err.response?.status || 502,
          message: err.response?.data?.error?.message || err.message,
          data: err.response?.data,
          code: err.code || 'UPSTREAM_ERROR',
        };
      }
    }
  }

  private static readonly ollamaHttpAgent = new http.Agent({
    keepAlive: true,
    maxSockets: 500,
    maxFreeSockets: 100,
    keepAliveMsecs: 60000,
  });

  private async callOllama(body: Record<string, any>, signal?: AbortSignal): Promise<any> {
    const rawUrl = process.env.LOCAL_OPENAI_URL || process.env.OLLAMA_URL || process.env.VLLM_URL || 'http://localhost:11434/v1';
    const model = body.model || process.env.OLLAMA_MODEL || 'qwen2.5-coder:1.5b';
    const isConfigured = !!(process.env.LOCAL_OPENAI_URL || process.env.OLLAMA_URL || process.env.VLLM_URL);

    if (process.env.NODE_ENV === 'production' && !isConfigured) {
      throw new HttpException({
        statusCode: 503,
        error: 'provider_unconfigured',
        message: 'Local OpenAI-compatible upstream / OLLAMA_URL is not configured in production.',
      }, 503);
    }

    const isOpenAiCompatible = !rawUrl.includes('/api/chat');
    const endpoint = isOpenAiCompatible
      ? (rawUrl.endsWith('/chat/completions')
          ? rawUrl
          : `${rawUrl.replace(/\/+$/, '')}${rawUrl.endsWith('/v1') ? '' : '/v1'}/chat/completions`)
      : rawUrl;

    try {
      const axiosConfig: any = {
        timeout: 15000,
        httpAgent: GatewayService.ollamaHttpAgent,
      };
      if (signal && typeof (signal as any).addEventListener === 'function') {
        axiosConfig.signal = signal;
      }

      if (isOpenAiCompatible) {
        const response = await axios.post(
          endpoint,
          {
            model,
            messages: body.messages,
            stream: false,
            temperature: body.temperature ?? 0.7,
          },
          axiosConfig,
        );

        return {
          statusCode: response.status,
          model,
          isMock: false,
          data: response.data,
        };
      } else {
        const response = await axios.post(
          rawUrl,
          {
            model,
            messages: body.messages,
            stream: false,
          },
          axiosConfig,
        );

        const promptTokens = 120 + Math.floor(Math.random() * 40);
        return {
          statusCode: response.status,
          model,
          isMock: false,
          data: {
            id: `chatcmpl-${uuidv4()}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model,
            choices: [{
              index: 0,
              message: {
                role: 'assistant',
                content: response.data.message?.content || 'Edge continuity node response (Ollama)',
              },
              finish_reason: 'stop',
            }],
            usage: {
              prompt_tokens: promptTokens,
              completion_tokens: 30,
              total_tokens: promptTokens + 30,
            },
          },
        };
      }
    } catch (err: any) {
      if (!isMockAllowed() || isConfigured) {
        throw {
          statusCode: err.response?.status || 502,
          code: 'OLLAMA_FAILED',
          message: `Local upstream (${rawUrl}) connection failed: ${err.message}`,
        };
      }

      // Fallback pre-packaged graceful continuity mock (dev only when unconfigured)
      this.logger.warn('[Mock Provider] Using mock degraded Ollama continuity response.');
      const mockText = 'Continuity Mode [Degraded]: Selixes Continuity active. Local failover model is guarding your execution.';
      await this.sleep(100, signal);

      return {
        statusCode: 200,
        model: `${model}-continuity-degraded`,
        isMock: true,
        data: {
          id: `chatcmpl-mock-local-${uuidv4()}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: 'llama3-continuity-degraded',
          x_selixes_mock: true,
          choices: [{
            index: 0,
            message: { role: 'assistant', content: mockText },
            finish_reason: 'stop',
          }],
          usage: {
            prompt_tokens: 120,
            completion_tokens: 45,
            total_tokens: 165,
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
    runStatus: RunStatus = RunStatus.SUCCESS,
    errorMessage?: string,
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

    await this.auditService.record({
      runId,
      runStatus,
      duration: latencyMs,
      completedAt: new Date(),
      errorMessage,
      trace: {
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
    });

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

    if (apiKey.organizationId && apiKey.organizationId !== 'dev-sandbox') {
      // Event 2 - First Gateway Request (First Successful Integration)
      // Only trigger if using a real external provider
      if (provider !== 'selixes' && provider !== 'fallback-memory') {
        let ttfr = 'Unknown';
        if (apiKey.orgCreatedAt) {
          const ms = Date.now() - new Date(apiKey.orgCreatedAt).getTime();
          const mins = Math.floor(ms / 60000);
          const secs = Math.floor((ms % 60000) / 1000);
          ttfr = `${mins}m ${secs}s`;
        }

        this.checkAndFireMilestone(
          apiKey.organizationId, 
          'first_request', 
          '🎉 First Successful Integration', 
          'Organization successfully proxied their first API request through Selixes.', 
          { 
            'Organization': apiKey.orgName || apiKey.organizationId,
            'Email': apiKey.orgEmail || 'Unknown',
            'Provider': provider, 
            'Model': model,
            'Time to first request': ttfr,
            'Source': 'Direct'
          }
        );
        
        // Also add them to the Founder Follow-up Queue
        this.prisma.followUp.create({
          data: {
            organizationId: apiKey.organizationId,
            reason: 'First Successful Integration',
            timeToFirstReq: ttfr
          }
        }).catch(err => this.logger.error(`Failed to create FollowUp: ${err.message}`));
      }
      
      // Event 3 - 10 Successful Requests & 100 Requests
      try {
        const statsKey = `org:stats:${apiKey.organizationId}`;
        const count = await this.redis.hincrby(statsKey, 'success_count', 1);
        if (count === 10) {
          this.checkAndFireMilestone(
            apiKey.organizationId, 
            'ten_requests', 
            '🔥 Activation: 10 Successful Requests', 
            'Organization has reached 10 successful proxy requests!', 
            { 
              'Organization': apiKey.orgName || apiKey.organizationId,
              'Email': apiKey.orgEmail || 'Unknown'
            }
          );
        } else if (count === 100) {
          this.checkAndFireMilestone(
            apiKey.organizationId, 
            '100_requests', 
            '📈 Scale: 100 Successful Requests', 
            'Organization has hit their 100th proxy request.', 
            { 
              'Organization': apiKey.orgName || apiKey.organizationId,
              'Email': apiKey.orgEmail || 'Unknown'
            }
          );
        }

        // Returning User / Retention tracking
        const todayStr = new Date().toISOString().split('T')[0];
        const lastActiveDay = await this.redis.hget(statsKey, 'last_active_day');
        
        if (lastActiveDay && lastActiveDay !== todayStr) {
          // It's a returning day!
          this.checkAndFireMilestone(
            apiKey.organizationId,
            'first_returning_day',
            '👋 First 24-hour Returning User',
            'Organization has returned on a different day to make more requests!',
            { 'Organization': apiKey.orgName || apiKey.organizationId }
          );

          const activeDays = await this.redis.hincrby(statsKey, 'active_days_count', 1);
          if (activeDays === 7) {
            this.checkAndFireMilestone(
              apiKey.organizationId,
              'first_week_continuous',
              '🏆 First Week of Continuous Usage',
              'Organization has used the platform for 7 different days!',
              { 'Organization': apiKey.orgName || apiKey.organizationId }
            );
          }
        }
        
        if (lastActiveDay !== todayStr) {
          await this.redis.hset(statsKey, 'last_active_day', todayStr);
          if (!lastActiveDay) {
            await this.redis.hset(statsKey, 'active_days_count', '1');
          }
        }

      } catch(e){}

      // Event 4 - First Failover
      if (providerChain.length > 1) {
        this.checkAndFireMilestone(
          apiKey.organizationId, 
          'first_failover', 
          '🔄 First Failover Triggered', 
          'Organization experienced a seamless failover to a standby provider!', 
          { 
            'Organization': apiKey.orgName || apiKey.organizationId, 
            'Email': apiKey.orgEmail || 'Unknown',
            'Provider Chain': providerChain.join(' -> ') 
          }
        );
      }
    }
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
      status: 'ACTIVE',
    };

    const requestId: string = apiKey.requestId ?? uuidv4();
    const providerChain: string[] = [];
    const overrides = parseOverrides(headers);
    const startTime = Date.now();

    // ── Semantic Caching: Read-Through (Streaming) ───────────────────────────
    let semanticVector: number[] | null = null;
    let semanticScopeHash: string | null = null;
    let semanticBypassed = false;
    let cleanPromptForCache = '';

    if (overrides.semanticCache && this.semanticCache?.isAvailable() && apiKey?.organizationId) {
      try {
        const rawPrompt = (body.messages ?? []).map((m: any) => m.content).join('\n');
        const bypassCheck = shouldBypassSemanticCache(body, rawPrompt);
        if (bypassCheck.bypass) {
          semanticBypassed = true;
          this.logger.log(`[Semantic Cache Bypass] ${bypassCheck.reason}. Bypassing streaming semantic cache.`);
        } else if (rawPrompt) {
          const hasPII = typeof this.semanticCache.hasPII === 'function' ? this.semanticCache.hasPII(rawPrompt) : false;
          if (hasPII && process.env.SEMANTIC_CACHE_SKIP_ON_PII !== 'false') {
            semanticBypassed = true;
            this.logger.warn(`[Semantic Cache] PII detected in streaming prompt for organization ${apiKey.organizationId}. Bypassing semantic cache for privacy.`);
          } else {
            cleanPromptForCache = typeof this.semanticCache.scrubPII === 'function' ? this.semanticCache.scrubPII(rawPrompt) : rawPrompt;
            semanticScopeHash = typeof this.semanticCache.computeScopeHash === 'function' ? this.semanticCache.computeScopeHash(body) : 'scope-default';
            semanticVector = await this.semanticCache.generateEmbedding(cleanPromptForCache);
            const cachedResponse = await this.semanticCache.query(
              semanticVector,
              overrides.semanticThreshold,
              apiKey.organizationId,
              semanticScopeHash,
              cleanPromptForCache,
            );
            
            if (cachedResponse) {
              const backend = typeof this.semanticCache.getBackend === 'function' ? this.semanticCache.getBackend() : 'vector';
              this.logger.log(`[Semantic Cache Hit] Serving streaming response from ${backend} cache in ${Date.now() - startTime}ms (scope: ${semanticScopeHash})`);
            
            this.eventBus.publish({
              type: 'request.completed',
              requestId,
              correlationId: requestId,
              apiKeyId: apiKey.id,
              organizationId: apiKey.organizationId,
              provider: 'semantic-cache',
              model: cachedResponse.model,
              latencyMs: Date.now() - startTime,
              ttftMs: Date.now() - startTime,
              tokens: { prompt: cachedResponse.usage?.prompt_tokens || 0, completion: cachedResponse.usage?.completion_tokens || 0, total: cachedResponse.usage?.total_tokens || 0 },
              status: 'success',
              isStream: true,
              region: process.env.GATEWAY_REGION || 'us-east-1',
            });

            // Event 5 - First Cache Hit
            this.checkAndFireMilestone(
              apiKey.organizationId, 
              'first_cache', 
              '⚡ First Cache Hit', 
              'Organization successfully served a streaming request from the Semantic Cache.',
              { 'Org ID': apiKey.organizationId, 'Model': cachedResponse.model }
            );

            async function* mockSemanticStream(): AsyncGenerator<StreamChunk> {
              yield { type: 'start', model: cachedResponse.model, provider: 'semantic-cache', latency: { ttftMs: Date.now() - startTime } };
              const content = cachedResponse.choices?.[0]?.message?.content || '';
              
              // Chunk the content to simulate streaming
              const chunkSize = 20;
              for (let i = 0; i < content.length; i += chunkSize) {
                yield { type: 'token', content: content.slice(i, i + chunkSize) };
              }
              yield { type: 'end', finishReason: 'stop' };
            }

            return {
              stream: mockSemanticStream(),
              requestId,
              providerChain: ['semantic-cache:200'],
              getFinalProvider: () => 'semantic-cache',
              getFinalModel: () => cachedResponse.model,
              getIsDegraded: () => false,
              getDuration: () => Date.now() - startTime,
              finalize: async () => {},
              abort: async () => {},
            };
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`Semantic Cache read-through failed for streaming: ${err.message}`);
    }
  }

    // ── Caching: Read-Through (Streaming) ────────────────────────────────────
    if (overrides.cacheEnabled && this.redis.isAvailable()) {
      const canonical = JSON.stringify({
        max_tokens:  body.max_tokens  ?? null,
        messages:    body.messages    ?? [],
        model:       body.model       ?? '',
        temperature: body.temperature ?? null,
        top_p:       body.top_p       ?? null,
      });
      const hash = createHash('sha256').update(canonical).digest('hex');
      const cacheKey = `cache:prompt:${hash}`;
      
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        try {
          const parsedCache = JSON.parse(cached);
          this.logger.log(`[Cache Hit] Serving streaming response from Redis cache in ${Date.now() - startTime}ms`);
          
          this.eventBus.publish({
            type: 'request.completed',
            requestId,
            correlationId: requestId,
            apiKeyId: apiKey.id,
            organizationId: apiKey.organizationId,
            provider: 'redis-cache',
            model: parsedCache.model,
            latencyMs: Date.now() - startTime,
            ttftMs: Date.now() - startTime,
            tokens: { prompt: parsedCache.usage?.prompt_tokens || 0, completion: parsedCache.usage?.completion_tokens || 0, total: parsedCache.usage?.total_tokens || 0 },
            status: 'success',
            isStream: true,
            region: process.env.GATEWAY_REGION || 'us-east-1',
          });

          // Event 5 - First Cache Hit
          this.checkAndFireMilestone(
            apiKey.organizationId, 
            'first_cache', 
            '⚡ First Cache Hit', 
            'Organization successfully served a streaming request from the Redis Cache.',
            { 'Org ID': apiKey.organizationId, 'Model': parsedCache.model }
          );

          async function* mockCacheStream(): AsyncGenerator<StreamChunk> {
            yield { type: 'start', model: parsedCache.model, provider: 'redis-cache', latency: { ttftMs: Date.now() - startTime } };
            const content = parsedCache.choices?.[0]?.message?.content || '';
            
            // Chunk the content to simulate streaming
            const chunkSize = 20;
            for (let i = 0; i < content.length; i += chunkSize) {
              yield { type: 'token', content: content.slice(i, i + chunkSize) };
            }
            yield { type: 'end', finishReason: 'stop' };
          }

          return {
            stream: mockCacheStream(),
            requestId,
            providerChain: ['redis-cache:200'],
            getFinalProvider: () => 'redis-cache',
            getFinalModel: () => parsedCache.model,
            getIsDegraded: () => false,
            getDuration: () => Date.now() - startTime,
            finalize: async () => {},
            abort: async () => {},
          };
        } catch (e: any) {
          this.logger.warn(`Failed to parse cache payload for key ${cacheKey}`);
        }
      }
    }

    const sessionId = getHeader(headers, 'x-selixes-session-id', 'x-apishield-session-id')?.toString() || null;
    if (sessionId && !/^[a-zA-Z0-9_-]{1,128}$/.test(sessionId)) {
      throw new HttpException('Invalid session ID format.', 400);
    }
    let terminationReason: string | null = null;
    let sessionStepIndex = 1;

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
      sessionStepIndex = currentCalls + 1;
      const currentConcur = parseInt(metrics.active_connections || '0', 10);
      const startedAt = parseInt(metrics.started_at || Date.now().toString(), 10);
      const consecutiveFailures = parseInt(metrics.consecutive_failures || '0', 10);

      // Save started_at if new session
      if (!metrics.started_at) {
        await this.redis.hset(redisKey, 'started_at', startedAt.toString()).catch(() => {});
        await this.redis.expire(redisKey, 86400).catch(() => {}); // 24hr TTL
      }

      const cognitiveInterceptEnabled = getHeader(headers, 'x-selixes-cognitive-intercept', 'x-apishield-cognitive-intercept') !== 'false';
      const cognitiveInterceptThreshold = parseInt(getHeader(headers, 'x-selixes-cognitive-intercept-threshold', 'x-apishield-cognitive-intercept-threshold') || '3', 10);

      // Security: Strip any spoofed intercept messages injected by the client
      if (body.messages) {
        const originalLength = body.messages.length;
        body.messages = body.messages.filter((msg: any) => 
          !(msg.role === 'system' && typeof msg.content === 'string' && msg.content.includes('[SELIXES COGNITIVE INTERCEPT]'))
        );
        if (body.messages.length < originalLength) {
          this.logger.warn(`[Cognitive Intercept] Spoofing Guard: Stripped ${originalLength - body.messages.length} fake intercept message(s) from payload.`);
        }
      }

      // Check loop instability from message history
      const instability = this.detectTrajectoryInstability(body.messages, cognitiveInterceptThreshold);
      const effectiveMaxCalls = maxCalls !== null ? maxCalls : 100;

      if (instability.detected) {
        if (cognitiveInterceptEnabled) {
          this.logger.warn(`[Cognitive Intercept] Session ${sessionId} (Stream): Injecting steering prompt. Reason: ${instability.reason}`);
          if (!body.messages) body.messages = [];
          body.messages.push({
            role: 'system',
            content: `[SELIXES COGNITIVE INTERCEPT] ${instability.reason} You must break out of this loop. Do not repeat the same action. Formulate a final response or try a completely different approach.`
          });
          terminationReason = null; // Clear termination reason so request proceeds
        } else {
          terminationReason = 'TRAJECTORY_INSTABILITY';
          this.logger.warn(`[Agent Loop Breaker] Session ${sessionId} tripped (Stream): ${instability.reason}`);
        }
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
        const orgId = apiKey.organizationId || 'default';
        let workflow = await this.prisma.workflow.findFirst({
          where: { name: 'Selixes Resilient Gateway', organizationId: orgId },
        });
        if (!workflow) {
          workflow = await this.prisma.workflow.findFirst({
            where: { organizationId: orgId },
          });
        }
        if (!workflow) {
          workflow = await this.prisma.workflow.create({
            data: {
              id: `wf-selixes-gateway-${orgId.substring(0, 8)}`,
              name: 'Selixes Resilient Gateway',
              organizationId: orgId,
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

        // Event 6 - First Budget Protection Trigger
        if (terminationReason === 'MAX_COST_EXCEEDED' || terminationReason === 'MAX_CALLS_EXCEEDED') {
          this.checkAndFireMilestone(
            apiKey.organizationId, 
            'first_budget', 
            '🛡️ First Budget Protection Trigger', 
            'Organization successfully hit a budget circuit breaker intercept (Streaming).',
            { 'Org ID': apiKey.organizationId, 'Reason': terminationReason }
          );
        }

        throw new HttpException({
          error: {
            type: 'agent_loop_halted',
            code: 'AGENT_LOOP_HALTED',
            message: `Runaway Agent Intercepted: Session budget exceeded (${terminationReason}).`,
            details: {
              turns: currentCalls,
              repeated_tool: instability?.repeatedTool || null,
              session_id: sessionId,
            },
          },
        }, 422);
      }

      // Increment active connections
      await this.redis.hincrby(redisKey, 'active_connections', 1).catch(() => {});
    }

    // ── Step 1: Create a database WorkflowRun tracking this gateway run ─────
    const orgId = apiKey.organizationId || 'default';
    let workflow = await this.prisma.workflow.findFirst({
      where: { name: 'Selixes Resilient Gateway', organizationId: orgId },
    });
    if (!workflow) {
      workflow = await this.prisma.workflow.findFirst({
        where: { organizationId: orgId },
      });
    }
    if (!workflow) {
      workflow = await this.prisma.workflow.create({
        data: {
          id: `wf-selixes-gateway-${orgId.substring(0, 8)}`,
          name: 'Selixes Resilient Gateway',
          organizationId: orgId,
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
    let isMockStream = false;
    let lastError: any = null;

    const isProd = process.env.NODE_ENV === 'production';
    const allowMock = isMockAllowed();

    let candidatePolicy = overrides.failoverPolicy;
    if (isProd || !allowMock) {
      candidatePolicy = overrides.failoverPolicy.filter((p) => isProviderConfigured(p));
    }

    // Model-aware provider prioritization: if caller requested a Claude or Gemini model, prioritize matching provider
    if (body.model?.toLowerCase().includes('claude') && candidatePolicy.includes('anthropic')) {
      candidatePolicy = ['anthropic', ...candidatePolicy.filter((p) => p !== 'anthropic')];
    } else if (body.model?.toLowerCase().includes('gemini') && candidatePolicy.includes('gemini')) {
      candidatePolicy = ['gemini', ...candidatePolicy.filter((p) => p !== 'gemini')];
    }

    const ollamaConfigured = isProviderConfigured('ollama');
    const allowOllama = overrides.continuity && (isProd ? ollamaConfigured : (allowMock || ollamaConfigured));

    if (candidatePolicy.length === 0 && !allowOllama) {
      const msg = isProd
        ? 'No upstream LLM providers are configured in production. Configure at least one provider key (OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY) or OLLAMA_URL.'
        : 'No upstream LLM providers are configured and SELIXES_ALLOW_MOCK is false.';
      throw new HttpException({
        statusCode: 503,
        error: 'all_providers_unavailable',
        message: msg,
        providerChain,
        requestId,
      }, 503);
    }

    // ── Pre-TTFT Provider Chain Loop ──────────────────────────────────────
    for (const provider of candidatePolicy) {
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
        } else if (provider === 'ollama' || provider === 'vllm' || provider === 'local') {
          providerGen = streamOllama(body, overrides.timeoutMs, signal);
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
        isMockStream = !isProviderConfigured(provider);
        if (isMockStream) {
          this.logger.warn(
            `[Mock Provider] Serving mock stream for provider "${provider}" because no API key is configured and SELIXES_ALLOW_MOCK is true.`,
          );
        }
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
        // Capture session checkpoint for Time-Travel Rollback
        if (sessionId) {
          this.rollbackEngine.captureCheckpoint(
            sessionId,
            sessionStepIndex,
            body.messages || [],
            finalModel,
            0,
          );
        }

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
    if (!activeGenerator && allowOllama && overrides.simulateOutage !== 'absolute_blackout') {
      this.prisma.executionEvent.create({
        data: {
          runId: run.id,
          type: EventType.RETRY_TRIGGERED,
          message: 'All cloud providers failed. Activating local degraded Continuity Mode streaming fallback (Llama-3).',
        },
      }).catch((e) => this.logger.warn(`Failed to log streaming continuity retry event: ${e.message}`));

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
      await this.auditService.record({
        runId: run.id,
        runStatus: RunStatus.FAILED,
        completedAt: new Date(),
        duration,
        errorMessage: lastError?.message ?? 'All streaming providers failed',
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
    if (overrides.cacheEnabled && this.redis.isAvailable()) {
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
          await this.redis.set(cacheKey, JSON.stringify(cacheData), 'EX', overrides.cacheTtl)
            .catch((e: any) => this.logger.warn(`Stream write-behind cache capture failed: ${e.message}`));
        }),
      );
    }

    if (!semanticBypassed && overrides.semanticCache && semanticVector && semanticScopeHash && this.semanticCache && apiKey?.organizationId) {
      stages.push(
        createCacheCaptureStage(async (fullResponseText) => {
          fullStreamedText = fullResponseText;
          const hasResponsePII = typeof this.semanticCache.hasPII === 'function' ? this.semanticCache.hasPII(fullResponseText) : false;
          if (hasResponsePII && process.env.SEMANTIC_CACHE_SKIP_ON_PII !== 'false') {
            this.logger.warn(`[Semantic Cache] PII detected in streamed response for organization ${apiKey.organizationId}. Skipping semantic cache storage.`);
            return;
          }
          const cleanText = typeof this.semanticCache.scrubPII === 'function' ? this.semanticCache.scrubPII(fullResponseText) : fullResponseText;
          const cacheData = {
            id: `chatcmpl-${requestId}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: finalModel,
            choices: [{
              index: 0,
              message: { role: 'assistant', content: cleanText },
              finish_reason: 'stop',
            }],
            usage: {
              prompt_tokens: 120, // estimated base
              completion_tokens: completionTokens,
              total_tokens: 120 + completionTokens,
            },
          };
          await this.semanticCache.upsert(
            requestId,
            semanticVector,
            cacheData,
            apiKey.organizationId,
            semanticScopeHash,
            overrides.cacheTtl,
            cleanPromptForCache,
          ).catch((e: any) => this.logger.warn(`Stream semantic write-behind cache capture failed: ${e.message}`));
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
      isMock: isMockStream,
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

        const finalizePromise = this.finalizeResponse(
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
        if (!this.auditService.isAsyncMode()) {
          await finalizePromise;
        } else {
          finalizePromise.catch((err) => this.logger.error(`finalizeResponse error: ${err.message}`));
        }

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

  private detectTrajectoryInstability(messages: any[], threshold: number = 3): { detected: boolean; reason: string | null; repeatedTool?: string } {
    if (!messages || !Array.isArray(messages) || messages.length === 0) return { detected: false, reason: null };

    const toolFailures = new Map<string, { count: number; lastError: string }>();
    
    let consecutiveIdenticalActions = 0;
    let lastActionSignature = '';

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (!msg) continue;

      // 1. Detect repetitive assistant actions with identical calls AND identical results
      if (msg.role === 'assistant' && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
        // Collect signatures of each tool call paired with its corresponding tool result
        const toolCallsWithResults = msg.tool_calls.map((t: any) => {
          let toolResult = '';
          // 1a. Find matching tool result by tool_call_id
          if (t.id) {
            for (let j = i + 1; j < messages.length; j++) {
              const m = messages[j];
              if (m.role === 'tool' && m.tool_call_id === t.id) {
                toolResult = typeof m.content === 'string' ? m.content : JSON.stringify(m.content ?? '');
                break;
              }
              if (m.role === 'assistant') break;
            }
          }
          // 1b. Fallback: match subsequent tool message by name or order
          if (!toolResult) {
            for (let j = i + 1; j < messages.length; j++) {
              const m = messages[j];
              if (m.role === 'tool' && (!m.name || m.name === t.function?.name)) {
                toolResult = typeof m.content === 'string' ? m.content : JSON.stringify(m.content ?? '');
                break;
              }
              if (m.role === 'assistant') break;
            }
          }

          return {
            name: t.function?.name,
            args: t.function?.arguments,
            res: toolResult,
          };
        });

        const signature = JSON.stringify(toolCallsWithResults);
        if (signature === lastActionSignature && signature !== '[]') {
          consecutiveIdenticalActions++;
        } else {
          consecutiveIdenticalActions = 1;
          lastActionSignature = signature;
        }
        
        // If they repeat the EXACT same tool call with the same result threshold times, trip the interceptor
        if (consecutiveIdenticalActions >= threshold) {
          const firstToolName = msg.tool_calls[0]?.function?.name || 'unknown';
          return {
            detected: true,
            reason: `Repetitive Action Loop Detected: You have called the exact same tool with the exact same arguments and received the same result ${threshold} times in a row.`,
            repeatedTool: firstToolName,
          };
        }
      } else if (msg.role !== 'tool' && msg.role !== 'assistant') {
        // Reset repetitive action counter if human or system interrupts
        consecutiveIdenticalActions = 0;
        lastActionSignature = '';
      }

      // 2. Detect repeated tool failures
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

          // Halt loop strictly if the same tool fails consecutively threshold times with the same error signature
          if (record.count >= threshold) {
            return {
              detected: true,
              reason: `Instability Loop Detected: Tool '${toolName}' failed consecutively with the same error: "${normalizedError}".`,
              repeatedTool: toolName,
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
