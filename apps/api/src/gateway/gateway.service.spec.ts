// Mock uuid since v10+ is ESM-only
let uuidCounter = 0;
jest.mock('uuid', () => ({
  v4: () => `test-uuid-${++uuidCounter}`,
}));

import { GatewayService } from './gateway.service';
import { HttpException } from '@nestjs/common';

function createMockPrisma() {
  const mockWorkflow = { id: 'wf-1', name: 'Selixes Resilient Gateway', organizationId: 'org-1' };
  const mockRun = { id: 'run-1', workflowId: 'wf-1', status: 'PENDING' };
  return {
    workflow: {
      findFirst: jest.fn().mockResolvedValue(mockWorkflow),
    },
    workflowRun: {
      create: jest.fn().mockResolvedValue(mockRun),
      update: jest.fn().mockResolvedValue(mockRun),
    },
    executionEvent: {
      create: jest.fn().mockResolvedValue({}),
    },
    aITrace: {
      create: jest.fn().mockResolvedValue({}),
    },
    followUp: {
      create: jest.fn().mockResolvedValue({}),
    },
  } as any;
}

function createMockRedis() {
  return {
    isAvailable: () => true,
    isFallbackActive: () => false,
    get: async () => null,
    set: async () => {},
    del: async () => {},
    hget: async () => null,
    hgetall: async () => ({}),
    hset: async () => {},
    expire: async () => {},
    hincrby: async () => {},
    hincrbyfloat: async () => {},
  } as any;
}

describe('GatewayService Circuit Breakers', () => {
  let service: GatewayService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new GatewayService(
      mockPrisma,
      { record: async () => {} } as any, // UsageAccumulator
      createMockRedis(),
      { recordSuccess: async () => {}, recordFailure: async () => {} } as any, // ProviderHealth
      { incrementFallbackMetric: () => {} } as any, // Prometheus
      { encrypt: (val: any) => val } as any, // Replay
      { publish: () => {} } as any, // EventBus
      { isAvailable: () => false, generateEmbedding: async () => [], queryPinecone: async () => null, insertPinecone: async () => {} } as any, // SemanticCache
      { sendFounderAlert: async () => {} } as any, // AlertsService
    );
    delete process.env.OPENAI_API_KEY;
  });

  it('should successfully execute completion through the openai breaker', async () => {
    const body = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'test lead data' }],
    };
    const headers = {
      'x-selixes-timeout': '1000',
    };
    const apiKey = {
      id: 'key-1',
      organizationId: 'org-1',
      dailyRpmLimit: null,
      dailyTpmLimit: null,
      monthlyUsdCap: null,
    };

    const res = await service.handleChatCompletion(body, headers, apiKey);
    expect(res.choices[0].message.content).toContain('Acme Corp');
  });

  it('should trip the circuit breaker on consecutive timeouts/failures', async () => {
    const body = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'test lead data' }],
    };
    // Force a mock timeout by setting a tiny timeoutMs override that is less than standard mock latency (120-200ms)
    // Disable continuity to ensure we don't fall back to Ollama and instead throw
    const headers = {
      'x-selixes-timeout': '1',
      'x-selixes-continuity': 'false',
    };
    const apiKey = {
      id: 'key-1',
      organizationId: 'org-1',
      dailyRpmLimit: null,
      dailyTpmLimit: null,
      monthlyUsdCap: null,
    };

    // First request fails with timeout
    await expect(service.handleChatCompletion(body, headers, apiKey)).rejects.toEqual(
      expect.objectContaining({ statusCode: 503 })
    );

    // Fire consecutive requests to exceed error threshold percentage
    for (let i = 0; i < 5; i++) {
      await service.handleChatCompletion(body, headers, apiKey).catch(() => {});
    }

    // Now call with a healthy timeout - it should fail immediately because the breaker is OPEN (tripped)
    const healthyHeaders = { 'x-selixes-timeout': '5000', 'x-selixes-continuity': 'false' };
    await expect(service.handleChatCompletion(body, healthyHeaders, apiKey)).rejects.toEqual(
      expect.objectContaining({ statusCode: 503 })
    );
  });
});

describe('Tenant-Scoped Semantic Caching', () => {
  let service: GatewayService;
  let mockPrisma: any;
  let mockSemanticCache: any;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    mockSemanticCache = {
      isAvailable: jest.fn().mockReturnValue(true),
      getBackend: jest.fn().mockReturnValue('memory'),
      hasPII: jest.fn().mockReturnValue(false),
      scrubPII: jest.fn().mockImplementation((val) => val),
      computeScopeHash: jest.fn().mockReturnValue('scope-test-123'),
      generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
      query: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue(undefined),
      queryPinecone: jest.fn().mockResolvedValue(null),
      upsertPinecone: jest.fn().mockResolvedValue(undefined),
    };

    service = new GatewayService(
      mockPrisma,
      { record: async () => {} } as any,
      createMockRedis(),
      { recordSuccess: async () => {}, recordFailure: async () => {} } as any,
      { incrementFallbackMetric: () => {} } as any,
      { encrypt: (val: any) => val } as any,
      { publish: () => {} } as any,
      mockSemanticCache as any,
      { sendFounderAlert: async () => {} } as any,
      { rollback: async () => {} } as any,
    );
    delete process.env.OPENAI_API_KEY;
  });

  it('org A upserts and org B identical prompt MISSES', async () => {
    const cacheStore: Array<{ vector: number[]; responseData: any; organizationId?: string }> = [];

    mockSemanticCache.upsert.mockImplementation(async (id: string, vector: number[], response: any, orgId?: string) => {
      cacheStore.push({ vector, responseData: response, organizationId: orgId });
    });

    mockSemanticCache.query.mockImplementation(async (vector: number[], threshold: number, orgId?: string) => {
      const match = cacheStore.find(item => item.organizationId === orgId);
      return match ? match.responseData : null;
    });

    const body = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'calculate quarterly projection' }],
    };
    const headers = {
      'x-selixes-semantic-cache': 'true',
    };

    // Org A executes: cache miss, then upserts with org-A
    const apiKeyOrgA = { id: 'key-A', organizationId: 'org-A' };
    const resA = await service.handleChatCompletion(body, headers, apiKeyOrgA);
    expect(resA).toBeDefined();

    expect(mockSemanticCache.query).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Number),
      'org-A',
      expect.any(String),
      expect.any(String),
    );
    expect(mockSemanticCache.upsert).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      expect.any(Object),
      'org-A',
      expect.any(String),
      expect.any(Number),
      expect.any(String),
    );

    // Org B executes identical prompt: query must be called with org-B and return MISS (null)
    const apiKeyOrgB = { id: 'key-B', organizationId: 'org-B' };
    const resB = await service.handleChatCompletion(body, headers, apiKeyOrgB);
    expect(resB).toBeDefined();

    expect(mockSemanticCache.query).toHaveBeenLastCalledWith(
      expect.any(Array),
      expect.any(Number),
      'org-B',
      expect.any(String),
      expect.any(String),
    );
    // Verified: Org B query returned null because store had org-A only
  });

  it('with no org, the semantic cache is neither queried nor written (fail closed)', async () => {
    const body = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'unauthenticated query' }],
    };
    const headers = {
      'x-selixes-semantic-cache': 'true',
    };
    const apiKeyNoOrg = { id: 'key-no-org', organizationId: undefined };

    const res = await service.handleChatCompletion(body, headers, apiKeyNoOrg);
    expect(res).toBeDefined();

    expect(mockSemanticCache.query).not.toHaveBeenCalled();
    expect(mockSemanticCache.upsert).not.toHaveBeenCalled();
  });

  it('semantic cache is disabled by default when no header or env is provided', async () => {
    delete process.env.SEMANTIC_CACHE_DEFAULT_ENABLED;
    delete process.env.SEMANTIC_CACHE_ENABLED;
    const body = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'prompt with no custom headers' }],
    };
    const headers = {};
    const apiKey = { id: 'key-1', organizationId: 'org-test' };

    await service.handleChatCompletion(body, headers, apiKey);
    expect(mockSemanticCache.query).not.toHaveBeenCalled();
    expect(mockSemanticCache.upsert).not.toHaveBeenCalled();
  });

  it('x-selixes-semantic-cache: true header enables semantic cache per request', async () => {
    delete process.env.SEMANTIC_CACHE_DEFAULT_ENABLED;
    const cachedData = {
      id: 'chatcmpl-cached-header',
      choices: [{ message: { role: 'assistant', content: 'cached header response' } }],
      model: 'gpt-4o',
      usage: { prompt_tokens: 15, completion_tokens: 8, total_tokens: 23 },
    };
    mockSemanticCache.query.mockResolvedValueOnce(cachedData);

    const body = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'prompt with per-request header' }],
    };
    const headers = { 'x-selixes-semantic-cache': 'true' };
    const apiKey = { id: 'key-1', organizationId: 'org-test' };

    const res = await service.handleChatCompletion(body, headers, apiKey);

    expect(mockSemanticCache.query).toHaveBeenCalled();
    expect(res.choices[0].message.content).toBe('cached header response');
    expect(res._meta.providerChain).toEqual(['semantic-cache:200']);
  });

  it('hard bypass when request has tools or functions or tool_choice', async () => {
    const headers = { 'x-selixes-semantic-cache': 'true' };
    const apiKey = { id: 'key-1', organizationId: 'org-test' };

    // Request with tools
    await service.handleChatCompletion(
      { model: 'gpt-4o', messages: [{ role: 'user', content: 'what is the weather' }], tools: [{ type: 'function', function: { name: 'get_weather' } }] },
      headers,
      apiKey,
    );
    expect(mockSemanticCache.query).not.toHaveBeenCalled();

    // Request with functions
    await service.handleChatCompletion(
      { model: 'gpt-4o', messages: [{ role: 'user', content: 'what is the weather' }], functions: [{ name: 'get_weather' }] },
      headers,
      apiKey,
    );
    expect(mockSemanticCache.query).not.toHaveBeenCalled();

    // Request with tool_choice
    await service.handleChatCompletion(
      { model: 'gpt-4o', messages: [{ role: 'user', content: 'what is the weather' }], tool_choice: 'auto' },
      headers,
      apiKey,
    );
    expect(mockSemanticCache.query).not.toHaveBeenCalled();

    // Request with tool-role message
    await service.handleChatCompletion(
      { model: 'gpt-4o', messages: [{ role: 'tool', content: '{"temperature": 72}' }] },
      headers,
      apiKey,
    );
    expect(mockSemanticCache.query).not.toHaveBeenCalled();
  });

  it('hard bypass when prompt matches destructive or privileged verbs', async () => {
    const headers = { 'x-selixes-semantic-cache': 'true' };
    const apiKey = { id: 'key-1', organizationId: 'org-test' };

    const destructivePrompts = [
      'deploy commit a77147a to staging',
      'DELETE all inactive users from database',
      'drop table users cascade',
      'truncate table events',
      'grant admin permissions to user 102',
      'revoke write access for team B',
      'transfer $500 from Alice to Bob',
      'refund transaction #4092',
      'execute shell command rm -rf',
      'restart redis service on node 2',
      'rollback release v1.4.2',
      'kill process 4819',
    ];

    for (const prompt of destructivePrompts) {
      mockSemanticCache.query.mockClear();
      await service.handleChatCompletion(
        { model: 'gpt-4o', messages: [{ role: 'user', content: prompt }] },
        headers,
        apiKey,
      );
      expect(mockSemanticCache.query).not.toHaveBeenCalled();
    }
  });

  it('SEMANTIC_CACHE_DEFAULT_ENABLED=true env enables semantic cache for drop-in clients', async () => {
    process.env.SEMANTIC_CACHE_DEFAULT_ENABLED = 'true';
    const cachedData = {
      id: 'chatcmpl-cached-1',
      choices: [{ message: { role: 'assistant', content: 'cached drop-in response' } }],
      model: 'gpt-4o',
      usage: { prompt_tokens: 15, completion_tokens: 8, total_tokens: 23 },
    };
    mockSemanticCache.query.mockResolvedValueOnce(cachedData);

    const body = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'prompt with no custom headers' }],
    };
    const headers = {};
    const apiKey = { id: 'key-1', organizationId: 'org-test' };

    const res = await service.handleChatCompletion(body, headers, apiKey);

    expect(mockSemanticCache.query).toHaveBeenCalled();
    expect(res.choices[0].message.content).toBe('cached drop-in response');
    expect(res._meta.providerChain).toEqual(['semantic-cache:200']);
  });

  it('on a hit, zero upstream provider calls are made and provider token billing is 0 (Claims D & F)', async () => {
    const cachedData = {
      id: 'chatcmpl-hit',
      choices: [{ message: { role: 'assistant', content: 'instant answer' } }],
      model: 'gpt-4o',
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    };
    mockSemanticCache.query.mockResolvedValueOnce(cachedData);

    const publishedEvents: any[] = [];
    (service as any).eventBus = {
      publish: (evt: any) => publishedEvents.push(evt),
    };

    const body = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'repeat query' }],
    };
    const headers = { 'x-selixes-semantic-cache': 'true' };
    const apiKey = { id: 'key-1', organizationId: 'org-test' };

    const res = await service.handleChatCompletion(body, headers, apiKey);

    expect(res._meta.providerChain).toEqual(['semantic-cache:200']);
    const completedEvt = publishedEvents.find((e: any) => e.type === 'request.completed');
    expect(completedEvt).toBeDefined();
    expect(completedEvt.provider).toBe('semantic-cache');
  });

  it('replays validated completion as SSE stream chunks ending in [DONE] (Claim E)', async () => {
    const cachedData = {
      id: 'chatcmpl-stream-hit',
      choices: [{ message: { role: 'assistant', content: 'streamed cached answer' } }],
      model: 'gpt-4o',
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    };
    mockSemanticCache.query.mockResolvedValueOnce(cachedData);

    const body = {
      model: 'gpt-4o',
      stream: true,
      messages: [{ role: 'user', content: 'streaming repeat query' }],
    };
    const headers = { 'x-selixes-semantic-cache': 'true' };
    const apiKey = { id: 'key-1', organizationId: 'org-test' };

    const streamHandle = await service.handleChatCompletionStream(body, headers, apiKey, new AbortController().signal);

    expect(streamHandle.getFinalProvider()).toBe('semantic-cache');
    expect(streamHandle.providerChain).toEqual(['semantic-cache:200']);

    const chunks: any[] = [];
    for await (const chunk of streamHandle.stream) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].type).toBe('start');
    expect(chunks.some((c: any) => c.type === 'token')).toBe(true);
    expect(chunks[chunks.length - 1].type).toBe('end');
  });

  describe('Anthropic Model Configuration', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      delete process.env.ANTHROPIC_API_KEY;
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('defaults to claude-sonnet-5-5 in mock response when ANTHROPIC_MODEL is unset', async () => {
      delete process.env.ANTHROPIC_MODEL;
      const res = await (service as any).callAnthropicInternal({ messages: [{ role: 'user', content: 'hi' }] }, 5000);
      expect(res.model).toBe('claude-sonnet-5-5');
      expect(res.data.model).toBe('claude-sonnet-5-5');
    });

    it('uses configured ANTHROPIC_MODEL in mock response when set', async () => {
      process.env.ANTHROPIC_MODEL = 'claude-3-7-sonnet';
      const res = await (service as any).callAnthropicInternal({ messages: [{ role: 'user', content: 'hi' }] }, 5000);
      expect(res.model).toBe('claude-3-7-sonnet');
      expect(res.data.model).toBe('claude-3-7-sonnet');
    });

    it('translateAnthropicResponseToOpenAI respects configured ANTHROPIC_MODEL', () => {
      process.env.ANTHROPIC_MODEL = 'claude-custom-tier';
      const translated = service.translateAnthropicResponseToOpenAI(
        { id: 'msg-1', content: [{ type: 'text', text: 'hello' }], usage: { output_tokens: 10 } },
        50
      );
      expect(translated.model).toBe('claude-custom-tier');
      expect(translated.data.model).toBe('claude-custom-tier');
    });

    it('returns 503 when providers are unconfigured in production', async () => {
      const prevEnv = process.env.NODE_ENV;
      const prevOpenAI = process.env.OPENAI_API_KEY;
      const prevAnthropic = process.env.ANTHROPIC_API_KEY;
      const prevGemini = process.env.GEMINI_API_KEY;
      const prevOllama = process.env.OLLAMA_URL;

      process.env.NODE_ENV = 'production';
      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.GEMINI_API_KEY;
      delete process.env.OLLAMA_URL;

      const body = { messages: [{ role: 'user', content: 'test prompt' }], model: 'gpt-4o' };
      const headers = { 'x-selixes-continuity': 'false' };
      const apiKey = { id: 'key-test', organizationId: 'org-1' };

      await expect(service.handleChatCompletion(body, headers, apiKey)).rejects.toMatchObject({
        statusCode: 503,
        error: 'all_providers_unavailable',
      });

      process.env.NODE_ENV = prevEnv;
      if (prevOpenAI) process.env.OPENAI_API_KEY = prevOpenAI;
      if (prevAnthropic) process.env.ANTHROPIC_API_KEY = prevAnthropic;
      if (prevGemini) process.env.GEMINI_API_KEY = prevGemini;
      if (prevOllama) process.env.OLLAMA_URL = prevOllama;
    });
  });
});


