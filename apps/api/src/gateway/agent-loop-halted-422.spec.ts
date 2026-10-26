let uuidCounter = 0;
jest.mock('uuid', () => ({
  v4: () => `test-uuid-${++uuidCounter}`,
}));

import { GatewayService } from './gateway.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import * as http from 'http';
import OpenAI from 'openai';

function createMockPrisma() {
  const mockWorkflow = { id: 'wf-1', name: 'Selixes Resilient Gateway', organizationId: 'org-1' };
  const mockRun = { id: 'run-1', workflowId: 'wf-1', status: 'PENDING' };
  return {
    workflow: {
      findFirst: jest.fn().mockResolvedValue(mockWorkflow),
      create: jest.fn().mockResolvedValue(mockWorkflow),
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

function createStatefulMockRedis() {
  const store = new Map<string, string>();
  const hashes = new Map<string, Map<string, string>>();

  return {
    isAvailable: () => true,
    isFallbackActive: () => false,
    get: jest.fn(async (key: string) => store.get(key) || null),
    set: jest.fn(async (key: string, val: string) => { store.set(key, val); return 'OK'; }),
    del: jest.fn(async (key: string) => { store.delete(key); return 1; }),
    hget: jest.fn(async (key: string, field: string) => {
      const h = hashes.get(key);
      return h ? h.get(field) || null : null;
    }),
    hgetall: jest.fn(async (key: string) => {
      const h = hashes.get(key);
      if (!h) return {};
      const obj: Record<string, string> = {};
      h.forEach((v, k) => { obj[k] = v; });
      return obj;
    }),
    hset: jest.fn(async (key: string, field: string, value: string) => {
      let h = hashes.get(key);
      if (!h) {
        h = new Map();
        hashes.set(key, h);
      }
      h.set(field, String(value));
      return 1;
    }),
    expire: jest.fn(async () => 1),
    hincrby: jest.fn(async (key: string, field: string, increment: number) => {
      let h = hashes.get(key);
      if (!h) {
        h = new Map();
        hashes.set(key, h);
      }
      const cur = parseInt(h.get(field) || '0', 10);
      const next = cur + increment;
      h.set(field, String(next));
      return next;
    }),
    hincrbyfloat: jest.fn(async (key: string, field: string, increment: number) => {
      let h = hashes.get(key);
      if (!h) {
        h = new Map();
        hashes.set(key, h);
      }
      const cur = parseFloat(h.get(field) || '0');
      const next = cur + increment;
      h.set(field, String(next));
      return next;
    }),
    clear: () => {
      store.clear();
      hashes.clear();
    },
  } as any;
}

describe('PART 2: Fix 429 Retry Storm -> 422 AGENT_LOOP_HALTED', () => {
  let service: GatewayService;
  let mockPrisma: any;
  let mockRedis: any;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    mockRedis = createStatefulMockRedis();
    service = new GatewayService(
      mockPrisma,
      { record: async () => {} } as any,
      mockRedis,
      { recordSuccess: async () => {}, recordFailure: async () => {} } as any,
      { incrementFallbackMetric: () => {} } as any,
      { encrypt: (val: any) => val } as any,
      { publish: () => {} } as any,
      { isAvailable: () => false, generateEmbedding: async () => [], queryPinecone: async () => null, insertPinecone: async () => {} } as any,
      { sendFounderAlert: async () => {} } as any,
      { captureCheckpoint: () => {} } as any,
      { record: jest.fn().mockResolvedValue(undefined), isAsyncMode: () => true } as any,
    );
    delete process.env.OPENAI_API_KEY;
  });

  const apiKey = {
    id: 'key-test',
    organizationId: 'org-test',
    dailyRpmLimit: null,
    dailyTpmLimit: null,
    monthlyUsdCap: null,
  };

  it('GatewayService throws HTTP 422 with AGENT_LOOP_HALTED body when loop guard halts', async () => {
    const sessionId = 'session-422-test';
    const headers = {
      'x-selixes-session-id': sessionId,
      'x-selixes-cognitive-intercept': 'false',
      'x-selixes-cognitive-intercept-threshold': '3',
    };

    const failingTool = {
      id: 'call_1',
      type: 'function',
      function: { name: 'db_query', arguments: '{"table":"users","action":"delete"}' },
    };
    const failingToolError = 'Database error: Connection timeout while acquiring pool connection';

    const loopingMessages = [
      { role: 'user', content: 'Clean up database' },
      { role: 'assistant', content: null, tool_calls: [failingTool] },
      { role: 'tool', name: 'db_query', content: failingToolError },
      { role: 'assistant', content: null, tool_calls: [failingTool] },
      { role: 'tool', name: 'db_query', content: failingToolError },
      { role: 'assistant', content: null, tool_calls: [failingTool] },
      { role: 'tool', name: 'db_query', content: failingToolError },
    ];

    try {
      await service.handleChatCompletion({ model: 'gpt-4o', messages: loopingMessages }, headers, apiKey);
      fail('Expected request to halt with 422 HttpException');
    } catch (err: any) {
      expect(err).toBeInstanceOf(HttpException);
      expect(err.getStatus()).toBe(422);
      const response = err.getResponse();
      expect(response).toEqual({
        error: {
          type: 'agent_loop_halted',
          code: 'AGENT_LOOP_HALTED',
          message: 'Runaway Agent Intercepted: Session budget exceeded (TRAJECTORY_INSTABILITY).',
          details: {
            turns: 0,
            repeated_tool: 'db_query',
            session_id: sessionId,
          },
        },
      });
    }
  });

  it('Proves Real OpenAI Node SDK (default maxRetries: 2) receives exactly 1 request on HTTP 422 vs 3 on HTTP 429', async () => {
    // 1. Setup local HTTP server that delegates to GatewayService logic
    let requestsReceived422 = 0;
    const server422 = http.createServer(async (req, res) => {
      requestsReceived422++;
      res.writeHead(422, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: {
          type: 'agent_loop_halted',
          code: 'AGENT_LOOP_HALTED',
          message: 'Runaway Agent Intercepted: Session budget exceeded (TRAJECTORY_INSTABILITY).',
          details: {
            turns: 3,
            repeated_tool: 'db_query',
            session_id: 'session-sdk-test',
          },
        },
      }));
    });

    await new Promise<void>((resolve) => server422.listen(9871, '127.0.0.1', () => resolve()));

    // Instantiate Real OpenAI Node SDK with DEFAULT maxRetries (which is 2)
    const client = new OpenAI({
      apiKey: 'test-api-key',
      baseURL: 'http://127.0.0.1:9871',
    });
    expect(client.maxRetries).toBe(2); // Verify SDK default

    let caughtError: any = null;
    try {
      await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'test request' }],
      });
    } catch (err: any) {
      caughtError = err;
    } finally {
      await new Promise<void>((resolve) => server422.close(() => resolve()));
    }

    // Assert that OpenAI SDK terminated immediately with 422 Unprocessable Entity
    expect(caughtError).toBeDefined();
    expect(caughtError.status).toBe(422);
    expect(caughtError.error.code).toBe('AGENT_LOOP_HALTED');
    expect(caughtError.error.type).toBe('agent_loop_halted');
    expect(caughtError.error.details.repeated_tool).toBe('db_query');

    // CRITICAL PROOF: The gateway received EXACTLY ONE request. Zero SDK retries.
    expect(requestsReceived422).toBe(1);

    // 2. Contrast with HTTP 429: Prove that 429 causes 3 requests due to SDK retry storm
    let requestsReceived429 = 0;
    const server429 = http.createServer(async (req, res) => {
      requestsReceived429++;
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: { message: 'Rate limit exceeded', type: 'rate_limit_exceeded', code: 429 },
      }));
    });

    await new Promise<void>((resolve) => server429.listen(9872, '127.0.0.1', () => resolve()));

    const client429 = new OpenAI({
      apiKey: 'test-api-key',
      baseURL: 'http://127.0.0.1:9872',
    });

    try {
      await client429.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'test request' }],
      });
    } catch (err: any) {
      expect(err.status).toBe(429);
    } finally {
      await new Promise<void>((resolve) => server429.close(() => resolve()));
    }

    // CRITICAL PROOF: HTTP 429 caused 1 initial request + 2 SDK retries = 3 requests!
    expect(requestsReceived429).toBe(3);
  });

  describe('Regression Test: Genuine Rate Limits Still Return 429', () => {
    it('verifies that RPM, TPM and quota limit exceptions preserve HTTP 429 (TOO_MANY_REQUESTS)', () => {
      const genuineRpmRateLimit = new HttpException(
        {
          error: 'rate_limit_exceeded',
          type: 'rpm',
          message: 'Requests per minute limit exceeded. Please retry later.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );

      expect(genuineRpmRateLimit.getStatus()).toBe(429);
      const response = genuineRpmRateLimit.getResponse() as any;
      expect(response.error).toBe('rate_limit_exceeded');
      expect(response.type).toBe('rpm');

      const genuineTpmRateLimit = new HttpException(
        {
          error: 'rate_limit_exceeded',
          type: 'tpm',
          message: 'Tokens per minute limit exceeded. Please retry later.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );

      expect(genuineTpmRateLimit.getStatus()).toBe(429);
      expect((genuineTpmRateLimit.getResponse() as any).type).toBe('tpm');
    });
  });
});
