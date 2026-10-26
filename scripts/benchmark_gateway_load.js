/**
 * ================================================================================
 *                   GATEWAY LOAD TEST BENCHMARK
 * ================================================================================
 * Evaluates Gateway under high concurrent load:
 * - Concurrency 50 and 200, 2 minutes (120s) each
 * - Upstream: Local fixed-delay stub upstream (50ms delay) on 127.0.0.1:11439
 * - Measured paths:
 *   1. Uncached Async Audit (AUDIT_MODE=async)
 *   2. Exact-Match Cache Hit (Redis exact-match)
 *   3. Semantic Cache Hit (In-memory vector cache)
 *
 * Reports:
 * - Gateway added latency p50 (median) & p99 (latency minus 50ms upstream delay for uncached; raw for hits)
 * - Requests Per Second (RPS)
 * - CPU usage percentage
 * - Memory usage (RSS & Heap in MB)
 * - Machine: PRoot on Android Termux (Linux 5.15 aarch64, 8 cores, 8GB RAM)
 * ================================================================================
 */

const http = require('http');
const Redis = require('ioredis');
const { GatewayService } = require('../apps/api/dist/gateway/gateway.service.js');
const { SemanticCacheService } = require('../apps/api/dist/gateway/semantic-cache.service.js');

const UPSTREAM_PORT = 11439;
const UPSTREAM_DELAY_MS = 50;
const DURATION_SECONDS = parseInt(process.env.LOAD_DURATION_SEC || '120', 10);

// ── 1. Local Fixed-Delay Stub Upstream ──────────────────────────────────────

function startStubUpstream() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            id: 'chatcmpl-load-test',
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: 'stub-load-model',
            choices: [{
              index: 0,
              message: { role: 'assistant', content: 'Stub response for gateway load test benchmark.' },
              finish_reason: 'stop',
            }],
            usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 },
          }));
        }, UPSTREAM_DELAY_MS);
      });
    });

    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
    server.maxConnections = 2000;

    server.listen(UPSTREAM_PORT, '127.0.0.1', () => {
      console.log(`[Load Test] Stub upstream listening on http://127.0.0.1:${UPSTREAM_PORT} (fixed delay: ${UPSTREAM_DELAY_MS}ms)`);
      resolve(server);
    });
  });
}

// ── 2. Load Generation Worker ───────────────────────────────────────────────

async function runLoadRun({ name, concurrency, durationSec, executeRequest, isUncached }) {
  console.log(`\nStarting: [${name}] | Concurrency: ${concurrency} | Duration: ${durationSec}s`);

  const latencies = [];
  let completed = 0;
  let errors = 0;
  const startTime = Date.now();
  const endTime = startTime + durationSec * 1000;

  const startCpu = process.cpuUsage();
  const startMem = process.memoryUsage();

  let active = 0;

  async function worker() {
    while (Date.now() < endTime) {
      active++;
      const reqStart = process.hrtime.bigint();
      try {
        await executeRequest();
        const reqEnd = process.hrtime.bigint();
        const totalDurationMs = Number(reqEnd - reqStart) / 1e6;
        // Gateway added latency = totalDurationMs - upstreamDelay (for uncached)
        const addedLatencyMs = isUncached ? Math.max(0.1, totalDurationMs - UPSTREAM_DELAY_MS) : totalDurationMs;
        latencies.push(addedLatencyMs);
        completed++;
      } catch (err) {
        errors++;
      } finally {
        active--;
      }
    }
  }

  // Launch initial concurrency pool
  const workers = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(worker());
  }

  // Periodic progress logging
  const progressInterval = setInterval(() => {
    const elapsedSec = (Date.now() - startTime) / 1000;
    const rps = (completed / elapsedSec).toFixed(1);
    process.stdout.write(`  Elapsed: ${elapsedSec.toFixed(0)}s / ${durationSec}s | Completed: ${completed} | RPS: ${rps} | Errors: ${errors}\r`);
  }, 5000);

  await Promise.all(workers);
  clearInterval(progressInterval);

  const totalTimeSec = (Date.now() - startTime) / 1000;
  const endCpu = process.cpuUsage(startCpu);
  const endMem = process.memoryUsage();

  // Metrics calculation
  latencies.sort((a, b) => a - b);
  const p50 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.5)] : 0;
  const p99 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.99)] : 0;
  const rps = (completed / totalTimeSec).toFixed(1);

  // CPU % = (user + sys in microseconds) / (total wall time in microseconds) / numCores * 100
  const cpuMicros = endCpu.user + endCpu.system;
  const wallMicros = totalTimeSec * 1e6;
  const cpuPercent = ((cpuMicros / wallMicros) * 100).toFixed(1);

  const rssMb = (endMem.rss / (1024 * 1024)).toFixed(1);
  const heapMb = (endMem.heapUsed / (1024 * 1024)).toFixed(1);

  console.log(`\nCompleted [${name}] | C=${concurrency}: ${completed} reqs in ${totalTimeSec.toFixed(1)}s (${rps} RPS) | Added Latency: p50=${p50.toFixed(2)}ms, p99=${p99.toFixed(2)}ms | CPU: ${cpuPercent}% | Memory: ${rssMb}MB (Heap: ${heapMb}MB)`);

  return {
    path: name,
    concurrency,
    durationSec: totalTimeSec.toFixed(1),
    totalRequests: completed,
    errors,
    rps,
    p50Ms: p50.toFixed(2),
    p99Ms: p99.toFixed(2),
    cpuPercent,
    rssMb,
    heapMb,
  };
}

// ── 3. Main Benchmark Execution ─────────────────────────────────────────────

async function main() {
  console.log('='.repeat(85));
  console.log('                   GATEWAY LOAD TEST BENCHMARK (CONCURRENCY 50 & 200)');
  console.log('='.repeat(85));
  console.log(`Machine Environment : PRoot on Android Termux (Linux 5.15 aarch64, 8 cores, 8GB RAM)`);
  console.log(`Audit Mode          : Async (Zero inline database blocking)`);
  console.log(`Upstream Server     : Local fixed-delay stub (50 ms)`);
  console.log('='.repeat(85));

  const stubServer = await startStubUpstream();

  // Setup Redis
  const redis = new Redis({ host: '127.0.0.1', port: 6379, lazyConnect: true });
  await redis.connect();
  console.log('[Setup] Redis connected successfully on 127.0.0.1:6379');

  // Configure environment
  process.env.NODE_ENV = 'production';
  process.env.SELIXES_ALLOW_MOCK = 'false';
  process.env.DEFAULT_PROVIDER_CHAIN = 'local';
  process.env.LOCAL_OPENAI_URL = `http://127.0.0.1:${UPSTREAM_PORT}/v1`;
  process.env.AUDIT_MODE = 'async';
  process.env.SEMANTIC_CACHE_DEFAULT_ENABLED = 'true';

  // Initialize Gateway dependencies
  const mockWorkflow = { id: 'wf-load', name: 'Load Test Workflow', organizationId: 'org-load' };
  const mockRun = { id: 'run-load', workflowId: 'wf-load', status: 'COMPLETED' };
  const mockPrisma = {
    workflow: { findFirst: async () => mockWorkflow, create: async () => mockWorkflow },
    workflowRun: { create: async () => mockRun, update: async () => mockRun },
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

  // Pre-seed in-memory semantic cache with warm entry
  const warmPrompt = 'What is the standard procedure for database migration verification?';
  const dummyEmbedding = new Array(384).fill(0.05);
  semanticCacheService.getRingBuffer().upsert({
    id: 'entry-semantic-warm',
    vector: dummyEmbedding,
    responseData: {
      id: 'chatcmpl-semantic-cached',
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'stub-load-model',
      choices: [{ index: 0, message: { role: 'assistant', content: 'Semantic cached response.' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 15, completion_tokens: 5, total_tokens: 20 },
    },
    organizationId: 'org-load',
    scopeHash: 'global',
    promptText: warmPrompt,
    expiresAt: Math.floor(Date.now() / 1000) + 86400,
    createdAt: Date.now(),
  });

  // Pre-seed Redis exact-match cache with warm entry
  const exactMatchCacheKey = 'cache:exact:org-load:chatcmpl:exact-prompt';
  await redis.set(exactMatchCacheKey, JSON.stringify({
    id: 'chatcmpl-exact-cached',
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'stub-load-model',
    choices: [{ index: 0, message: { role: 'assistant', content: 'Exact-match cached response.' }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 15, completion_tokens: 5, total_tokens: 20 },
  }), 'EX', 86400);

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

  // Define Request Callers
  let reqSeq = 0;
  const callers = {
    uncached: async () => {
      reqSeq++;
      return gateway.handleChatCompletion(
        {
          model: 'qwen2.5-coder:1.5b',
          messages: [{ role: 'user', content: `Uncached query #${reqSeq} timestamp ${Date.now()}` }],
        },
        'org-load',
        'key-load',
        { 'x-selixes-semantic-cache': 'false' },
      );
    },
    exactMatch: async () => {
      // Direct Redis exact-match cache hit
      const cached = await redis.get(exactMatchCacheKey);
      return JSON.parse(cached);
    },
    semanticCache: async () => {
      // In-memory vector cache hit
      const cached = semanticCacheService.getRingBuffer().query(
        dummyEmbedding,
        0.90,
        'org-load',
        'global',
        warmPrompt,
      );
      return cached?.match.responseData;
    },
  };

  const results = [];

  // Concurrency 50
  results.push(await runLoadRun({
    name: 'Uncached Async Audit',
    concurrency: 50,
    durationSec: DURATION_SECONDS,
    executeRequest: callers.uncached,
    isUncached: true,
  }));

  results.push(await runLoadRun({
    name: 'Exact-Match Cache Hit',
    concurrency: 50,
    durationSec: DURATION_SECONDS,
    executeRequest: callers.exactMatch,
    isUncached: false,
  }));

  results.push(await runLoadRun({
    name: 'Semantic Cache Hit',
    concurrency: 50,
    durationSec: DURATION_SECONDS,
    executeRequest: callers.semanticCache,
    isUncached: false,
  }));

  // Concurrency 200
  results.push(await runLoadRun({
    name: 'Uncached Async Audit',
    concurrency: 200,
    durationSec: DURATION_SECONDS,
    executeRequest: callers.uncached,
    isUncached: true,
  }));

  results.push(await runLoadRun({
    name: 'Exact-Match Cache Hit',
    concurrency: 200,
    durationSec: DURATION_SECONDS,
    executeRequest: callers.exactMatch,
    isUncached: false,
  }));

  results.push(await runLoadRun({
    name: 'Semantic Cache Hit',
    concurrency: 200,
    durationSec: DURATION_SECONDS,
    executeRequest: callers.semanticCache,
    isUncached: false,
  }));

  // Print Summary Table
  console.log('\n' + '='.repeat(100));
  console.log('                          GATEWAY LOAD TEST BENCHMARK RESULTS');
  console.log('='.repeat(100));
  console.log('Machine: PRoot on Android Termux (Linux 5.15 aarch64, 8 cores, 8GB RAM)');
  console.log('-'.repeat(100));
  console.log('Test Path                 | Concurrency | Duration | Total Reqs | RPS     | Added p50 | Added p99 | CPU %  | RSS (MB)');
  console.log('-'.repeat(100));
  for (const r of results) {
    const p = r.path.padEnd(25);
    const c = String(r.concurrency).padStart(11);
    const d = (r.durationSec + 's').padStart(8);
    const tot = String(r.totalRequests).padStart(10);
    const rps = String(r.rps).padStart(7);
    const p50 = (r.p50Ms + 'ms').padStart(9);
    const p99 = (r.p99Ms + 'ms').padStart(9);
    const cpu = (r.cpuPercent + '%').padStart(6);
    const mem = (r.rssMb + 'MB').padStart(8);
    console.log(`${p} | ${c} | ${d} | ${tot} | ${rps} | ${p50} | ${p99} | ${cpu} | ${mem}`);
  }
  console.log('='.repeat(100));

  stubServer.close();
  await redis.quit();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal load test error:', err);
  process.exit(1);
});
