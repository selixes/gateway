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
  } as any;
}

function createMockRedis() {
  return {
    isAvailable: () => true,
    isFallbackActive: () => false,
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
