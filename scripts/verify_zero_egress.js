/**
 * ================================================================================
 *            ZERO-EGRESS END-TO-END VERIFICATION & NETWORK AUDIT
 * ================================================================================
 * Validates:
 * 1. Gateway execution with local model (qwen2.5-coder:1.5b) & Redis in zero-egress.
 * 2. 20 real chat requests (10 streaming, 10 non-streaming).
 * 3. 1 Semantic cache hit request.
 * 4. 1 Loop guard halt request (identical tool repetition -> 422).
 * 5. Full socket & DNS interceptor tracking every single connection attempt.
 *    GATE: Zero outbound connections leave the isolated/loopback network.
 * ================================================================================
 */

const net = require('net');
const dns = require('dns');
const http = require('http');
const https = require('https');
const axios = require('axios');
const Redis = require('ioredis');

// ── Global Network Socket & DNS Interceptor ─────────────────────────────────

const connectionLog = [];
let externalConnectionsCount = 0;

function isInternal(host) {
  if (!host) return true;
  const h = String(host).toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '0.0.0.0') return true;
  if (/^(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(h)) return true;
  if (h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.lan')) return true;
  return false;
}

// 1. Intercept net.Socket.prototype.connect
const origNetConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  let host = '127.0.0.1';
  let port = 0;

  if (typeof args[0] === 'object' && args[0] !== null) {
    host = args[0].host || args[0].hostname || '127.0.0.1';
    port = args[0].port || 0;
  } else if (typeof args[0] === 'number') {
    port = args[0];
    if (typeof args[1] === 'string') {
      host = args[1];
    }
  }

  const internal = isInternal(host);
  if (!internal) {
    externalConnectionsCount++;
  }

  connectionLog.push({
    timestamp: new Date().toISOString(),
    type: 'TCP_CONNECT',
    host,
    port,
    internal,
    status: internal ? 'PERMITTED_INTERNAL' : 'EGRESS_VIOLATION',
  });

  return origNetConnect.apply(this, args);
};

// 2. Intercept dns.lookup
const origDnsLookup = dns.lookup;
dns.lookup = function (hostname, options, callback) {
  const cb = typeof options === 'function' ? options : callback;
  const internal = isInternal(hostname);
  if (!internal) {
    externalConnectionsCount++;
  }

  connectionLog.push({
    timestamp: new Date().toISOString(),
    type: 'DNS_LOOKUP',
    host: hostname,
    port: 53,
    internal,
    status: internal ? 'PERMITTED_INTERNAL' : 'EGRESS_VIOLATION',
  });

  return origDnsLookup.call(this, hostname, options, callback);
};

// ── Gateway Environment Setup ───────────────────────────────────────────────

process.env.NODE_ENV = 'production';
process.env.SELIXES_ALLOW_MOCK = 'false';
process.env.DEFAULT_PROVIDER_CHAIN = 'ollama';
process.env.LOCAL_OPENAI_URL = 'http://127.0.0.1:11434/v1';
process.env.OLLAMA_URL = 'http://127.0.0.1:11434/v1';
process.env.OLLAMA_MODEL = 'qwen2.5-coder:1.5b';
process.env.REDIS_HOST = '127.0.0.1';
process.env.REDIS_PORT = '6379';
process.env.SEMANTIC_CACHE_DEFAULT_ENABLED = 'false';

const { GatewayService } = require('../apps/api/dist/gateway/gateway.service.js');
const { SemanticCacheService } = require('../apps/api/dist/gateway/semantic-cache.service.js');

async function runZeroEgressVerification() {
  console.log('='.repeat(80));
  console.log('       SELIXES ZERO-EGRESS END-TO-END VERIFICATION & NETWORK AUDIT');
  console.log('='.repeat(80));
  console.log(`Local Model Server  : http://127.0.0.1:11434/v1`);
  console.log(`Model Under Test    : qwen2.5-coder:1.5b`);
  console.log(`Cache Storage       : Redis @ 127.0.0.1:6379`);
  console.log(`Network Policy      : Hard Internal (Zero-Egress)`);
  console.log('='.repeat(80));

  // Initialize Redis
  const redis = new Redis({ host: '127.0.0.1', port: 6379, lazyConnect: true });
  await redis.connect();
  console.log('[Setup] Redis connected successfully on 127.0.0.1:6379');

  // Verify Local Model is responding
  const modelCheck = await axios.get('http://127.0.0.1:11434/v1/models');
  console.log('[Setup] Model server verified. Active model:', modelCheck.data.data[0]?.id);

  // Initialize Mock Services for Gateway Instantiation
  const mockWorkflow = { id: 'wf-1', name: 'Selixes Resilient Gateway', organizationId: 'org-test' };
  const mockRun = { id: 'run-1', workflowId: 'wf-1', status: 'PENDING' };
  const mockPrisma = {
    workflow: {
      findFirst: async () => mockWorkflow,
      create: async () => mockWorkflow,
    },
    workflowRun: {
      create: async () => mockRun,
      update: async () => mockRun,
    },
    executionRun: { create: async () => mockRun, update: async () => mockRun },
    executionEvent: { create: async () => ({ id: 'evt-01' }) },
    aITrace: { create: async () => ({}) },
    followUp: { create: async () => ({}) },
    deadLetterQueue: { create: async () => ({}) },
  };

  const mockRedisService = {
    getClient: () => redis,
    get: (...args) => redis.get(...args),
    set: (...args) => redis.set(...args),
    del: (...args) => redis.del(...args),
    hget: (...args) => redis.hget(...args),
    hset: (...args) => redis.hset(...args),
    hgetall: (...args) => redis.hgetall(...args),
    hincrby: (...args) => redis.hincrby(...args),
    expire: (...args) => redis.expire(...args),
    isAvailable: () => true,
    isFallbackActive: () => false,
  };

  const mockAccumulator = { record: async () => {} };
  const mockProviderHealth = { recordSuccess: async () => {}, recordFailure: async () => {} };
  const mockAuditService = { logAsync: async () => {}, record: async () => {}, isAsyncMode: () => true };
  const mockPrometheus = { inc: () => {}, observe: () => {}, incrementFallbackMetric: () => {} };
  const mockReplay = { record: async () => {}, encrypt: (v) => v };
  const mockEventBus = { emit: () => {}, publish: () => {} };
  const mockAlerts = { trigger: async () => {}, sendFounderAlert: async () => {} };
  const mockRollback = { captureCheckpoint: () => {}, rollbackToStep: async () => {} };

  const semanticCacheService = new SemanticCacheService(mockRedisService);

  const gateway = new GatewayService(
    mockPrisma,
    mockAccumulator,
    mockRedisService,
    mockProviderHealth,
    mockPrometheus,
    mockReplay,
    mockEventBus,
    semanticCacheService,
    mockAlerts,
    mockRollback,
    mockAuditService,
  );

  console.log('\n[Phase 1] Executing 20 Real Chat Requests to Local Model...');
  let successfulRequests = 0;

  const mockApiKey = { id: 'key-test', organizationId: 'org-test' };

  // 10 Non-Streaming Chat Requests
  for (let i = 1; i <= 10; i++) {
    const t0 = Date.now();
    const result = await gateway.handleChatCompletion(
      {
        model: 'qwen2.5-coder:1.5b',
        messages: [{ role: 'user', content: `Return exactly the number ${i}` }],
        temperature: 0.1,
      },
      { 'x-selixes-failover-policy': 'ollama' },
      mockApiKey,
    );
    const duration = Date.now() - t0;
    const content = result.choices?.[0]?.message?.content?.trim();
    console.log(`  Req #${i} [Non-Stream]: 200 OK (${duration}ms) -> "${content.slice(0, 30)}"`);
    successfulRequests++;
  }

  // 10 Streaming Chat Requests
  for (let i = 11; i <= 20; i++) {
    const t0 = Date.now();
    const handle = await gateway.handleChatCompletionStream(
      {
        model: 'qwen2.5-coder:1.5b',
        messages: [{ role: 'user', content: `Echo token test ${i}` }],
        temperature: 0.1,
      },
      { 'x-selixes-failover-policy': 'ollama' },
      mockApiKey,
    );

    let tokenCount = 0;
    let text = '';
    for await (const chunk of handle.stream) {
      if (chunk.type === 'token') {
        tokenCount++;
        text += chunk.content;
      }
    }
    await handle.finalize();
    const duration = Date.now() - t0;
    console.log(`  Req #${i} [Stream]    : 200 OK (${duration}ms, ${tokenCount} tokens) -> "${text.trim().slice(0, 30)}"`);
    successfulRequests++;
  }

  // Phase 2: Semantic Cache Hit
  console.log('\n[Phase 2] Executing Semantic Cache Hit Request...');
  const cacheKeyPrompt = 'Check database migration status for PostgreSQL';
  const similarPrompt = 'check   database migration status for postgresql';

  const vec1 = await semanticCacheService.generateEmbedding(cacheKeyPrompt);
  const cacheData = {
    id: 'cached-cmpl-001',
    object: 'chat.completion',
    choices: [{ message: { role: 'assistant', content: 'Database migration is currently up to date (V14).' } }],
  };

  // Seed cache entry
  await semanticCacheService.upsert(
    'cache-001',
    vec1,
    cacheData,
    'org-test',
    'scope-default',
    3600,
    cacheKeyPrompt,
  );

  // Query with paraphrase / normalized technical abbreviation
  const vec2 = await semanticCacheService.generateEmbedding(similarPrompt);
  const cachedResult = await semanticCacheService.query(
    vec2,
    0.93,
    'org-test',
    'scope-default',
    similarPrompt,
  );
  const cacheHitSuccess = cachedResult !== null;
  console.log(`  Semantic Cache Lookup: ${cacheHitSuccess ? 'HIT (MATCHED)' : 'MISS'}`);
  if (cacheHitSuccess) {
    console.log(`  Cached Content: "${cachedResult.choices[0].message.content}"`);
  }

  // Phase 3: Loop Guard Halt (trips on 3 identical calls with identical result)
  console.log('\n[Phase 3] Executing Loop Guard Halt Request...');
  const failingTool = {
    id: 'call_1',
    type: 'function',
    function: { name: 'db_query', arguments: '{"table":"users","action":"delete"}' },
  };
  const failingToolError = 'Database error: Connection timeout while acquiring pool connection';

  const loopingMessages = [
    { role: 'user', content: 'Clean up database' },
    { role: 'assistant', content: null, tool_calls: [failingTool] },
    { role: 'tool', tool_call_id: 'call_1', name: 'db_query', content: failingToolError },
    { role: 'assistant', content: null, tool_calls: [failingTool] },
    { role: 'tool', tool_call_id: 'call_1', name: 'db_query', content: failingToolError },
    { role: 'assistant', content: null, tool_calls: [failingTool] },
    { role: 'tool', tool_call_id: 'call_1', name: 'db_query', content: failingToolError },
  ];

  let loopHalted = false;
  const loopSessionId = `zero-egress-loop-${Date.now()}`;

  try {
    await gateway.handleChatCompletion(
      { model: 'qwen2.5-coder:1.5b', messages: loopingMessages },
      {
        'x-selixes-session-id': loopSessionId,
        'x-selixes-cognitive-intercept': 'false',
        'x-selixes-failover-policy': 'ollama',
      },
      { id: 'key-test', organizationId: 'org-test' },
    );
    console.log('  Loop Guard did not halt (Unexpected 200)');
  } catch (err) {
    const status = err.getStatus ? err.getStatus() : err.status || err.statusCode;
    const body = err.getResponse ? err.getResponse() : err.response?.data;
    if (status === 422 && body?.error?.code === 'AGENT_LOOP_HALTED') {
      loopHalted = true;
      console.log(`  Trip detected! Loop guard halted execution with 422 AGENT_LOOP_HALTED.`);
      console.log(`  Reason: ${body.error.message} (tool: ${body.error.details.repeated_tool})`);
    } else {
      console.log(`  Encountered error but not 422:`, status, body);
    }
  }

  // Phase 4: Network Audit Summary
  console.log('\n' + '='.repeat(80));
  console.log('                 NETWORK AUDIT & CONNECTION CAPTURE TABLE');
  console.log('='.repeat(80));

  const uniqueDestinations = {};
  for (const log of connectionLog) {
    const key = `${log.type} ${log.host}:${log.port}`;
    if (!uniqueDestinations[key]) {
      uniqueDestinations[key] = { ...log, count: 0 };
    }
    uniqueDestinations[key].count++;
  }

  console.log('Type         Destination Host      Port   Internal?  Status              Packets/Conns');
  console.log('-'.repeat(80));
  for (const dest of Object.values(uniqueDestinations)) {
    const typeStr = dest.type.padEnd(12);
    const hostStr = String(dest.host).padEnd(22);
    const portStr = String(dest.port).padEnd(6);
    const intStr = (dest.internal ? 'YES' : 'NO').padEnd(10);
    const statStr = dest.status.padEnd(20);
    console.log(`${typeStr} ${hostStr} ${portStr} ${intStr} ${statStr} ${dest.count}`);
  }
  console.log('-'.repeat(80));
  console.log(`Total Connection Operations Captured: ${connectionLog.length}`);
  console.log(`External / Outbound Egress Attempts : ${externalConnectionsCount}`);

  console.log('\n' + '='.repeat(80));
  console.log('                           GATE VERIFICATION RESULT');
  console.log('='.repeat(80));
  const passGate = successfulRequests === 20 && cacheHitSuccess && loopHalted && externalConnectionsCount === 0;

  console.log(`1. 20 Real Local Chat Requests : ${successfulRequests === 20 ? 'PASS (20/20)' : 'FAIL'}`);
  console.log(`2. Semantic Cache Hit          : ${cacheHitSuccess ? 'PASS' : 'FAIL'}`);
  console.log(`3. Loop Guard Halt (Trip)      : ${loopHalted ? 'PASS' : 'FAIL'}`);
  console.log(`4. Zero External Outbound Conn : ${externalConnectionsCount === 0 ? 'PASS (0 egress conns)' : 'FAIL'}`);
  console.log(`GATE OVERALL                   : [${passGate ? 'PASS' : 'FAIL'}]`);
  console.log('='.repeat(80));

  await redis.quit();
  process.exit(passGate ? 0 : 1);
}

runZeroEgressVerification().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
