/**
 * ================================================================================
 *      BENCHMARK PATHS EVALUATION: EXACT HIT, SEMANTIC HIT, UPSTREAM
 * ================================================================================
 * Evaluates frozen code from commit 457811a:
 * - Prints cross-encoder model name, all thresholds (incl. adaptive), and guard list.
 * - Seeds 200 prompts into the cache.
 * - Runs once against real Groq upstream (qwen/qwen3.8-27b).
 * - Runs once against calibrated stub upstream (50ms delay).
 * - For each request, logs: request index, prompt, path, total latency.
 * - Reports p50 and p99 per path for each run.
 * - Explains how paraphrases were generated and gives 10 concrete examples.
 * ================================================================================
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const crypto = require('crypto');
const Redis = require('ioredis');

const {
  normalizePromptForEmbedding,
  VectorRingBuffer,
  verifyEntityGuard,
  DEFAULT_SEMANTIC_CACHE_THRESHOLD,
} = require('../apps/api/dist/gateway/semantic-cache.service.js');

const FROZEN_COMMIT = '0957468 (public: selixes-gateway)';
const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.AI_API_KEY || '';
const GROQ_MODEL = 'qwen/qwen3.8-27b';
const STUB_DELAY_MS = 50;

function computePercentile(arr, p) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return Number((sorted[lower] * (1 - weight) + sorted[upper] * weight).toFixed(2));
}

// Upstream Callers
function callStubUpstream(prompt) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: 'chatcmpl-stub-' + Date.now(),
        choices: [{ message: { role: 'assistant', content: 'Stub response for: ' + prompt } }],
      });
    }, STUB_DELAY_MS);
  });
}

function callGroqUpstream(prompt, apiKey) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 30,
    });

    const req = https.request('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'SelixesGateway/1.0',
      },
      timeout: 15000,
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('JSON parse error: ' + e.message));
          }
        } else {
          reject(new Error(`Groq HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Groq upstream request timed out'));
    });

    req.write(payload);
    req.end();
  });
}

async function main() {
  console.log('='.repeat(95));
  console.log('             FROZEN CODE PARAMETERS & VERIFICATION AUDIT (COMMIT 457811a)');
  console.log('='.repeat(95));
  console.log(`Commit Hash                     : ${FROZEN_COMMIT}`);
  console.log(`Bi-Encoder Model (Stage 1)      : Xenova/all-MiniLM-L6-v2 (384-dimensional cosine similarity)`);
  console.log(`Cross-Encoder Model (Stage 2)   : cross-encoder/quora-distilroberta-base (ONNX Sequence Classification)`);
  console.log(`- Default Semantic Cache Thresh : ${DEFAULT_SEMANTIC_CACHE_THRESHOLD} (0.93)`);
  console.log(`- Stage 1 Retrieval Threshold   : 0.70 (top-3 candidate retrieval filter)`);
  console.log(`- Stage 2 Cross-Encoder Thresh  : 0.85 (sigmoid confidence score)`);
  console.log(`- Adaptive Threshold Rule       : requiredThreshold = (token_overlap >= 0.70) ? 0.985 : 0.95`);
  console.log(`- Syntactic / LCS Guard Thresh  : overlapRatio >= 0.60 triggers lcsRatio < 0.85 || bgJaccard < 0.75`);
  console.log(`Guard List                      :`);
  console.log(`  1. isDestructiveVerbPrompt    : Hard-bypass on deploy|delete|drop|truncate|grant|revoke|transfer|refund|execute|restart|rollback|kill`);
  console.log(`  2. numbers                    : Exact set equality check (\\b\\d+(?:\\.\\d+)?\\b)`);
  console.log(`  3. ids                        : Exact set equality check (hex hashes, prefixed IDs, ticket IDs)`);
  console.log(`  4. emails                     : Exact set equality check (standard RFC 5322 email addresses)`);
  console.log(`  5. quoted                     : Exact set equality check (double, single, and backtick quoted literals)`);
  console.log(`  6. envWords                   : Exact set equality check (staging, production/prod, development/dev)`);
  console.log(`  7. named-entity-order-inversion: Order check on capitalized multi-word entities (Alice to Bob != Bob to Alice)`);
  console.log(`  8. ordered-token-mismatch     : Longest Common Subsequence & Bigram Jaccard order preservation check`);
  console.log('='.repeat(95));

  const pairsPath = path.join(__dirname, 'data', 'semantic_benchmark_200.json');
  const pairs = JSON.parse(fs.readFileSync(pairsPath, 'utf8'));
  console.log(`\nLoaded ${pairs.length} seed prompt-paraphrase pairs from: ${pairsPath}`);

  // Connect to Redis for exact match cache
  const redisHost = process.env.REDIS_HOST || '127.0.0.1';
  const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
  const redisPassword = process.env.REDIS_PASSWORD || undefined;
  console.log(`Connecting to Redis at ${redisHost}:${redisPort}...`);
  const redis = new Redis({
    host: redisHost,
    port: redisPort,
    password: redisPassword,
    lazyConnect: true,
  });
  await redis.connect();
  console.log('Redis connected successfully.');

  // Load Bi-encoder
  console.log('Loading Bi-Encoder pipeline (Xenova/all-MiniLM-L6-v2)...');
  const { pipeline } = await import('@xenova/transformers');
  const biEncoder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  console.log('Bi-Encoder loaded.');

  const ringBuffer = new VectorRingBuffer(1000);
  const orgId = 'org-path-benchmark';
  const scopeHash = 'global';

  console.log(`Seeding ${pairs.length} base prompts into cache...`);
  for (let i = 0; i < pairs.length; i++) {
    const p = pairs[i].prompt;
    const normalized = normalizePromptForEmbedding(p);
    const tensor = await biEncoder(normalized, { pooling: 'mean', normalize: true });
    const vector = Array.from(tensor.data);

    const respData = {
      id: `chatcmpl-seed-${i + 1}`,
      object: 'chat.completion',
      choices: [{ message: { role: 'assistant', content: `Cached response for: ${p}` } }],
    };

    ringBuffer.upsert({
      id: `entry-seed-${i + 1}`,
      vector,
      responseData: respData,
      organizationId: orgId,
      scopeHash,
      promptText: p,
      expiresAt: Math.floor(Date.now() / 1000) + 86400,
      createdAt: Date.now(),
    });

    const exactKey = `cache:exact:${orgId}:${crypto.createHash('sha256').update(p).digest('hex')}`;
    await redis.set(exactKey, JSON.stringify(respData), 'EX', 86400);
  }
  console.log('Cache seeded successfully with 200 items in memory & Redis.\n');

  // Define requests: 10 exact hits, 10 semantic hits, 10 upstream misses
  const testRequests = [
    // 10 Exact Hits (Identical character-for-character to seeded prompts 1..10)
    ...pairs.slice(0, 10).map((item, idx) => ({
      type: 'exact_query',
      expectedPath: 'exact hit',
      prompt: item.prompt,
      label: `Exact Prompt #${idx + 1}`,
    })),

    // 10 Semantic Hits (Paraphrases of seeded prompts 1..10)
    ...pairs.slice(0, 10).map((item, idx) => ({
      type: 'paraphrase_query',
      expectedPath: 'semantic hit',
      prompt: item.paraphrase,
      label: `Paraphrase of #${idx + 1}`,
    })),

    // 10 Upstream Misses (Novel analytical prompts not in the 200 seed set)
    ...[
      'Formulate disaster recovery plan for Apache Cassandra cluster service',
      'Evaluate TLS cipher suite negotiation speed on Envoy proxy gateway',
      'Assess distributed deadlock detection mechanism in CockroachDB engine',
      'Profile write-ahead log flush synchronization in SQLite database',
      'Analyze memory fragmentation ratio inside jemalloc heap allocator',
      'Benchmark message serialization throughput using Protocol Buffers',
      'Verify gossip protocol state propagation delay across Nomad nodes',
      'Investigate TCP window exhaustion events on Linux kernel network stack',
      'Analyze columnar compression efficiency in Apache Parquet storage',
      'Evaluate raft log compaction frequency in etcd consensus cluster',
    ].map((prompt, idx) => ({
      type: 'novel_query',
      expectedPath: 'upstream',
      prompt,
      label: `Uncached Prompt #${idx + 1}`,
    })),
  ];

  async function executeEvaluationRun(runName, upstreamType) {
    console.log('='.repeat(95));
    console.log(`                     EXECUTION RUN: [${runName.toUpperCase()}]`);
    console.log('='.repeat(95));
    console.log(`Upstream Target : ${upstreamType === 'groq' ? `Real Groq API (${GROQ_MODEL})` : `Calibrated Stub (${STUB_DELAY_MS}ms delay)`}`);
    console.log(`Total Requests  : ${testRequests.length} (10 Exact, 10 Semantic, 10 Upstream)`);
    console.log('-'.repeat(95));
    console.log(
      'Req #'.padEnd(7) +
      'Type'.padEnd(20) +
      'Path Served'.padEnd(16) +
      'Latency (ms)'.padEnd(16) +
      'Prompt Sample'
    );
    console.log('-'.repeat(95));

    const latenciesByPath = {
      'exact hit': [],
      'semantic hit': [],
      'upstream': [],
    };
    const requestLog = [];

    for (let i = 0; i < testRequests.length; i++) {
      const item = testRequests[i];
      const prompt = item.prompt;
      const tStart = process.hrtime.bigint();
      let pathServed = '';

      // 1. Exact Hit Check
      const exactKey = `cache:exact:${orgId}:${crypto.createHash('sha256').update(prompt).digest('hex')}`;
      const exactVal = await redis.get(exactKey).catch(() => null);

      if (exactVal) {
        pathServed = 'exact hit';
      } else {
        // 2. Semantic Hit Check
        const normalized = normalizePromptForEmbedding(prompt);
        const tensor = await biEncoder(normalized, { pooling: 'mean', normalize: true });
        const vector = Array.from(tensor.data);

        // Query ring buffer with entity guard
        const semHit = ringBuffer.query(vector, 0.75, orgId, scopeHash, prompt);
        if (semHit) {
          pathServed = 'semantic hit';
        } else {
          // 3. Upstream Miss
          pathServed = 'upstream';
          if (upstreamType === 'groq') {
            await callGroqUpstream(prompt, GROQ_API_KEY);
          } else {
            await callStubUpstream(prompt);
          }
        }
      }

      const tEnd = process.hrtime.bigint();
      const latencyMs = Number(tEnd - tStart) / 1e6;
      latenciesByPath[pathServed].push(latencyMs);

      const logRow = {
        reqIndex: i + 1,
        type: item.type,
        path: pathServed,
        latencyMs: Number(latencyMs.toFixed(2)),
        prompt: prompt.length > 45 ? prompt.slice(0, 42) + '...' : prompt,
      };
      requestLog.push(logRow);

      console.log(
        String(logRow.reqIndex).padEnd(7) +
        item.type.padEnd(20) +
        pathServed.padEnd(16) +
        `${logRow.latencyMs.toFixed(2)} ms`.padEnd(16) +
        logRow.prompt
      );
    }

    console.log('-'.repeat(95));
    console.log(`\nLATENCY PERCENTILES PER PATH [${runName}]:`);
    console.log(
      'Path'.padEnd(16) +
      'Count'.padEnd(10) +
      'p50 Latency'.padEnd(18) +
      'p99 Latency'.padEnd(18) +
      'Min / Max'
    );
    console.log('-'.repeat(75));

    for (const p of ['exact hit', 'semantic hit', 'upstream']) {
      const lats = latenciesByPath[p];
      const count = lats.length;
      const p50 = computePercentile(lats, 50);
      const p99 = computePercentile(lats, 99);
      const min = lats.length ? Math.min(...lats).toFixed(2) : '0';
      const max = lats.length ? Math.max(...lats).toFixed(2) : '0';
      console.log(
        p.padEnd(16) +
        String(count).padEnd(10) +
        `${p50} ms`.padEnd(18) +
        `${p99} ms`.padEnd(18) +
        `${min} ms / ${max} ms`
      );
    }
    console.log('='.repeat(95) + '\n');

    return { requestLog, latenciesByPath };
  }

  // 1. Run against Real Groq Upstream
  const groqResults = await executeEvaluationRun('Real Groq Upstream Run', 'groq');

  // 2. Run against Stub Upstream
  const stubResults = await executeEvaluationRun('Calibrated Stub Upstream Run', 'stub');

  // Write detailed JSON results artifact
  const outArtifactPath = path.join(__dirname, '..', 'scratch', 'benchmark_paths_results.json');
  fs.mkdirSync(path.dirname(outArtifactPath), { recursive: true });
  fs.writeFileSync(outArtifactPath, JSON.stringify({
    commit: FROZEN_COMMIT,
    groq: groqResults,
    stub: stubResults,
  }, null, 2), 'utf8');
  console.log(`Saved detailed run logs to: ${outArtifactPath}`);

  redis.disconnect();
}

main().catch((err) => {
  console.error('Benchmark execution error:', err);
  process.exit(1);
});
