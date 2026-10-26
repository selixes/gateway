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

describe('Claim 1: Loop Guard ("Cognitive Intercept")', () => {
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

  describe('Realistic Looping Agent Sequence', () => {
    it('halts on Turn 3 when cognitive intercept is disabled (hard-halt mode)', async () => {
      const sessionId = 'session-loop-hard-halt';
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

      // Turn 1: 1st tool call & failure
      const messagesTurn1 = [
        { role: 'user', content: 'Clean up test database' },
        { role: 'assistant', content: null, tool_calls: [failingTool] },
        { role: 'tool', name: 'db_query', content: failingToolError },
      ];
      const res1 = await service.handleChatCompletion({ model: 'gpt-4o', messages: messagesTurn1 }, headers, apiKey);
      expect(res1).toBeDefined();

      // Turn 2: 2nd consecutive failure
      const messagesTurn2 = [
        ...messagesTurn1,
        { role: 'assistant', content: null, tool_calls: [failingTool] },
        { role: 'tool', name: 'db_query', content: failingToolError },
      ];
      const res2 = await service.handleChatCompletion({ model: 'gpt-4o', messages: messagesTurn2 }, headers, apiKey);
      expect(res2).toBeDefined();

      // Turn 3: 3rd consecutive failure -> Instability detected -> hard halt
      const messagesTurn3 = [
        ...messagesTurn2,
        { role: 'assistant', content: null, tool_calls: [failingTool] },
        { role: 'tool', name: 'db_query', content: failingToolError },
      ];

      try {
        await service.handleChatCompletion({ model: 'gpt-4o', messages: messagesTurn3 }, headers, apiKey);
        fail('Expected request to halt on Turn 3 with HttpException');
      } catch (err: any) {
        expect(err).toBeInstanceOf(HttpException);
        const status = err.getStatus ? err.getStatus() : err.statusCode;
        const response = err.getResponse ? err.getResponse() : err;
        // Current baseline before Part 2 fix: returns 429
        expect([429, 422]).toContain(status);
        expect(response.terminationReason || response.error?.code).toBeTruthy();
      }
    });

    it('injects steering prompt on Turn 3 in default cognitive intercept mode', async () => {
      const sessionId = 'session-loop-steering';
      const headers = {
        'x-selixes-session-id': sessionId,
        'x-selixes-cognitive-intercept': 'true',
        'x-selixes-cognitive-intercept-threshold': '3',
      };

      const failingTool = {
        id: 'call_1',
        type: 'function',
        function: { name: 'api_fetch', arguments: '{"endpoint":"/users"}' },
      };
      const failingToolError = 'HTTP 500: Internal Server Error from remote endpoint';

      const messagesTurn3 = [
        { role: 'user', content: 'Fetch users' },
        { role: 'assistant', content: null, tool_calls: [failingTool] },
        { role: 'tool', name: 'api_fetch', content: failingToolError },
        { role: 'assistant', content: null, tool_calls: [failingTool] },
        { role: 'tool', name: 'api_fetch', content: failingToolError },
        { role: 'assistant', content: null, tool_calls: [failingTool] },
        { role: 'tool', name: 'api_fetch', content: failingToolError },
      ];

      const reqBody = { model: 'gpt-4o', messages: messagesTurn3 };
      const res3 = await service.handleChatCompletion(reqBody, headers, apiKey);
      expect(res3).toBeDefined();

      // Verify that [SELIXES COGNITIVE INTERCEPT] was appended to reqBody.messages
      const lastMsg = reqBody.messages[reqBody.messages.length - 1];
      expect(lastMsg.role).toBe('system');
      expect(lastMsg.content).toContain('[SELIXES COGNITIVE INTERCEPT]');
      expect(lastMsg.content).toContain('Repetitive Action Loop Detected');
    });
  });

  describe('False-Positive Control Sequences (Legitimate Sequences Must NEVER Halt)', () => {
    const headers = {
      'x-selixes-session-id': 'session-fp-check',
      'x-selixes-cognitive-intercept': 'false', // in hard-halt mode, none of these should trip!
      'x-selixes-cognitive-intercept-threshold': '3',
    };

    it('Sequence 1: Pagination with changing offset/cursor (3 pages)', async () => {
      const messages = [
        { role: 'user', content: 'List all accounts' },
        { role: 'assistant', content: null, tool_calls: [{ id: '1', function: { name: 'list_accounts', arguments: '{"page":1,"offset":0}' } }] },
        { role: 'tool', name: 'list_accounts', content: '{"items":[{"id":1},{"id":2}],"has_more":true}' },
        { role: 'assistant', content: null, tool_calls: [{ id: '2', function: { name: 'list_accounts', arguments: '{"page":2,"offset":50}' } }] },
        { role: 'tool', name: 'list_accounts', content: '{"items":[{"id":3},{"id":4}],"has_more":true}' },
        { role: 'assistant', content: null, tool_calls: [{ id: '3', function: { name: 'list_accounts', arguments: '{"page":3,"offset":100}' } }] },
        { role: 'tool', name: 'list_accounts', content: '{"items":[{"id":5}],"has_more":false}' },
      ];

      const res = await service.handleChatCompletion({ model: 'gpt-4o', messages }, headers, apiKey);
      expect(res).toBeDefined();
      expect(res.choices).toBeDefined();
    });

    it('Sequence 2a: Polling with state/attempt progression (poll: 1 -> 2 -> 3) does not halt', async () => {
      const messages = [
        { role: 'user', content: 'Check deployment status' },
        { role: 'assistant', content: null, tool_calls: [{ id: '1', function: { name: 'check_job', arguments: '{"job_id":"job_987","attempt":1}' } }] },
        { role: 'tool', name: 'check_job', content: '{"status":"PENDING","progress":10}' },
        { role: 'assistant', content: null, tool_calls: [{ id: '2', function: { name: 'check_job', arguments: '{"job_id":"job_987","attempt":2}' } }] },
        { role: 'tool', name: 'check_job', content: '{"status":"RUNNING","progress":65}' },
        { role: 'assistant', content: null, tool_calls: [{ id: '3', function: { name: 'check_job', arguments: '{"job_id":"job_987","attempt":3}' } }] },
        { role: 'tool', name: 'check_job', content: '{"status":"COMPLETED","progress":100}' },
      ];

      const res = await service.handleChatCompletion({ model: 'gpt-4o', messages }, headers, apiKey);
      expect(res).toBeDefined();
    });

    it('Sequence 2b: Progressing polling (PENDING -> RUNNING -> DONE) with identical arguments must NOT halt', async () => {
      const messages = [
        { role: 'user', content: 'Check deployment status' },
        { role: 'assistant', content: null, tool_calls: [{ id: '1', function: { name: 'check_job', arguments: '{"job_id":"job_987"}' } }] },
        { role: 'tool', name: 'check_job', content: '{"status":"PENDING","progress":10}' },
        { role: 'assistant', content: null, tool_calls: [{ id: '2', function: { name: 'check_job', arguments: '{"job_id":"job_987"}' } }] },
        { role: 'tool', name: 'check_job', content: '{"status":"RUNNING","progress":65}' },
        { role: 'assistant', content: null, tool_calls: [{ id: '3', function: { name: 'check_job', arguments: '{"job_id":"job_987"}' } }] },
        { role: 'tool', name: 'check_job', content: '{"status":"COMPLETED","progress":100}' },
      ];

      // Because repetition signature includes tool result, progressing results (PENDING -> RUNNING -> COMPLETED)
      // are recognized as distinct state transitions and do NOT halt.
      const res = await service.handleChatCompletion({ model: 'gpt-4o', messages }, headers, apiKey);
      expect(res).toBeDefined();
      expect(res.choices).toBeDefined();
    });

    it('Sequence 3: Parameter retry / Query refinement with differing queries', async () => {
      const messages = [
        { role: 'user', content: 'Find knowledge base entry' },
        { role: 'assistant', content: null, tool_calls: [{ id: '1', function: { name: 'search_kb', arguments: '{"query":"database migration error"}' } }] },
        { role: 'tool', name: 'search_kb', content: 'Not found: no exact matches' },
        { role: 'assistant', content: null, tool_calls: [{ id: '2', function: { name: 'search_kb', arguments: '{"query":"postgres schema migration syntax"}' } }] },
        { role: 'tool', name: 'search_kb', content: 'Not found: no exact matches' },
        { role: 'assistant', content: null, tool_calls: [{ id: '3', function: { name: 'search_kb', arguments: '{"query":"prisma db push failure"}' } }] },
        { role: 'tool', name: 'search_kb', content: 'Found guide: Prisma migration troubleshooting' },
      ];

      const res = await service.handleChatCompletion({ model: 'gpt-4o', messages }, headers, apiKey);
      expect(res).toBeDefined();
    });

    it('Sequence 4: Diverse multi-tool chain (read_file, grep_search, run_command)', async () => {
      const messages = [
        { role: 'user', content: 'Inspect and test repository' },
        { role: 'assistant', content: null, tool_calls: [{ id: '1', function: { name: 'read_file', arguments: '{"path":"/app/config.json"}' } }] },
        { role: 'tool', name: 'read_file', content: '{"port": 3000}' },
        { role: 'assistant', content: null, tool_calls: [{ id: '2', function: { name: 'grep_search', arguments: '{"term":"PORT"}' } }] },
        { role: 'tool', name: 'grep_search', content: 'main.ts: const port = process.env.PORT || 3000;' },
        { role: 'assistant', content: null, tool_calls: [{ id: '3', function: { name: 'run_command', arguments: '{"cmd":"npm test"}' } }] },
        { role: 'tool', name: 'run_command', content: 'PASS: 10 tests passed' },
      ];

      const res = await service.handleChatCompletion({ model: 'gpt-4o', messages }, headers, apiKey);
      expect(res).toBeDefined();
    });

    it('Sequence 5: Distinct transient errors with differing parameters and error signatures do not halt', async () => {
      const messages = [
        { role: 'user', content: 'Sync external integrations' },
        { role: 'assistant', content: null, tool_calls: [{ id: '1', function: { name: 'sync_crm', arguments: '{"target":"salesforce","retry":1}' } }] },
        { role: 'tool', name: 'sync_crm', content: 'Error: HTTP 401 Unauthorized token expired' },
        { role: 'assistant', content: null, tool_calls: [{ id: '2', function: { name: 'sync_crm', arguments: '{"target":"salesforce","retry":2}' } }] },
        { role: 'tool', name: 'sync_crm', content: 'Error: HTTP 503 Service Unavailable upstream gateway' },
        { role: 'assistant', content: null, tool_calls: [{ id: '3', function: { name: 'sync_crm', arguments: '{"target":"salesforce","retry":3}' } }] },
        { role: 'tool', name: 'sync_crm', content: 'Error: HTTP 429 Too Many Requests wait 60 seconds' },
      ];

      // Error signatures are normalized and compared, but differ across attempts, so toolFailures does not accumulate to threshold
      const res = await service.handleChatCompletion({ model: 'gpt-4o', messages }, headers, apiKey);
      expect(res).toBeDefined();
    });
  });

  describe('Real Detection Time Measurement (In-Process µs)', () => {
    it('measures detection latency across 1,000 iterations in microseconds', () => {
      const sampleMessages = [
        { role: 'user', content: 'Debug database loop' },
        { role: 'assistant', content: null, tool_calls: [{ id: '1', function: { name: 'execute_sql', arguments: '{"sql":"SELECT * FROM table"}' } }] },
        { role: 'tool', name: 'execute_sql', content: 'Error: Relation table does not exist' },
        { role: 'assistant', content: null, tool_calls: [{ id: '2', function: { name: 'execute_sql', arguments: '{"sql":"SELECT * FROM table"}' } }] },
        { role: 'tool', name: 'execute_sql', content: 'Error: Relation table does not exist' },
        { role: 'assistant', content: null, tool_calls: [{ id: '3', function: { name: 'execute_sql', arguments: '{"sql":"SELECT * FROM table"}' } }] },
        { role: 'tool', name: 'execute_sql', content: 'Error: Relation table does not exist' },
      ];

      const iterations = 1000;
      const durationsUs: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = process.hrtime.bigint();
        // Invoke detectTrajectoryInstability via private method access
        (service as any).detectTrajectoryInstability(sampleMessages, 3);
        const end = process.hrtime.bigint();
        durationsUs.push(Number(end - start) / 1000); // ns to µs
      }

      durationsUs.sort((a, b) => a - b);
      const minUs = durationsUs[0];
      const medianUs = durationsUs[Math.floor(iterations / 2)];
      const p95Us = durationsUs[Math.floor(iterations * 0.95)];
      const p99Us = durationsUs[Math.floor(iterations * 0.99)];
      const maxUs = durationsUs[iterations - 1];

      console.log(`[Cognitive Intercept Benchmark] 1,000 iterations: min=${minUs.toFixed(2)}µs, median=${medianUs.toFixed(2)}µs, p95=${p95Us.toFixed(2)}µs, p99=${p99Us.toFixed(2)}µs, max=${maxUs.toFixed(2)}µs`);

      expect(medianUs).toBeLessThan(30); // Under 30 microseconds median
      expect(p95Us).toBeLessThan(50); // Under 50 microseconds p95
    });
  });
});
