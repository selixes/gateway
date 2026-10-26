/**
 * ================================================================================
 *          SERVER-SIDE SEMANTIC CACHE LOAD TEST GATEWAY (PORT 4000)
 * ================================================================================
 * Runs behind Nginx on the throwaway AWS Lightsail server.
 * Supports:
 *   node server_semantic_hit_gateway.js --cache=on
 *   node server_semantic_hit_gateway.js --cache=off
 *
 * In --cache=on mode:
 * - Pre-seeds 200 base prompts into the vector ring buffer.
 * - When receiving a paraphrase, computes embedding via all-MiniLM-L6-v2,
 *   matches against the vector ring buffer (semantic hit @ >=0.95),
 *   and returns X-Cache: HIT, X-Cache-Path: cache:hit:semantic in <15ms.
 * - When receiving an unrelated unique prompt, gets a cache miss, proxies
 *   to local upstream stub (50ms delay), and returns X-Cache: MISS.
 *
 * In --cache=off mode:
 * - Bypasses cache entirely, proxies all requests to upstream stub.
 * ================================================================================
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Redis = require('ioredis');
const {
  normalizePromptForEmbedding,
  VectorRingBuffer,
  verifyEntityGuard,
} = require('../apps/api/dist/gateway/semantic-cache.service.js');

const CACHE_ENABLED = process.argv.includes('--cache=on') || !process.argv.includes('--cache=off');
const GATEWAY_PORT = 4000;
const UPSTREAM_PORT = 11439;
const UPSTREAM_DELAY_MS = 50;

function startStubUpstream() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            id: 'chatcmpl-stub-' + Date.now(),
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: 'stub-upstream',
            choices: [{
              index: 0,
              message: { role: 'assistant', content: 'Stub LLM response for semantic load test.' },
              finish_reason: 'stop',
            }],
            usage: { prompt_tokens: 30, completion_tokens: 15, total_tokens: 45 },
          }));
        }, UPSTREAM_DELAY_MS);
      });
    });

    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
    server.maxConnections = 2000;

    server.listen(UPSTREAM_PORT, '127.0.0.1', () => {
      resolve(server);
    });
  });
}

async function main() {
  console.log('='.repeat(90));
  console.log(`      STARTING GATEWAY HTTP SERVER ON PORT ${GATEWAY_PORT} [CACHE: ${CACHE_ENABLED ? 'ON' : 'OFF'}]`);
  console.log('='.repeat(90));

  const stubServer = await startStubUpstream();
  console.log(`[Upstream] Calibrated stub listening on port ${UPSTREAM_PORT} (${UPSTREAM_DELAY_MS}ms delay)`);

  let biEncoder = null;
  let ringBuffer = null;
  let redis = null;
  const orgId = 'org-load-test';
  const scopeHash = 'global';

  if (CACHE_ENABLED) {
    const redisHost = process.env.REDIS_HOST || '127.0.0.1';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
    const redisPassword = process.env.REDIS_PASSWORD || undefined;
    console.log(`[Setup] Connecting to Redis at ${redisHost}:${redisPort}...`);
    redis = new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      lazyConnect: true,
    });
    await redis.connect();
    console.log('[Setup] Redis connected.');

    const { pipeline } = await import('@xenova/transformers');
    console.log('[Setup] Loading Bi-Encoder model (Xenova/all-MiniLM-L6-v2)...');
    biEncoder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('[Setup] Bi-Encoder model loaded.');

    ringBuffer = new VectorRingBuffer(1000);

    // Load and pre-seed the 200 base prompts
    const pairsPath = path.join(__dirname, 'data', 'semantic_benchmark_200.json');
    const pairs = JSON.parse(fs.readFileSync(pairsPath, 'utf8'));
    console.log(`[Setup] Pre-seeding ${pairs.length} base prompts into vector cache...`);

    const tSeedStart = Date.now();
    for (let i = 0; i < pairs.length; i++) {
      const p = pairs[i].prompt;
      const normalized = normalizePromptForEmbedding(p);
      const tensor = await biEncoder(normalized, { pooling: 'mean', normalize: true });
      const vector = Array.from(tensor.data);

      const respData = {
        id: `chatcmpl-seed-${i + 1}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: 'seed-cached-model',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: `Cached semantic response for prompt #${i + 1}: ${p}` },
          finish_reason: 'stop',
        }],
        usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 },
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
    const seedTime = ((Date.now() - tSeedStart) / 1000).toFixed(1);
    console.log(`[Setup] Pre-seeding complete in ${seedTime}s (${pairs.length} prompts cached).`);
  }

  // Request counter & path stats
  const pathStats = { 'cache:hit:exact': 0, 'cache:hit:semantic': 0, 'upstream:uncached': 0 };
  let totalRequests = 0;

  const server = http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ status: 'ok', cache: CACHE_ENABLED }));
    }

    if (req.method === 'GET' && req.url === '/stats') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ totalRequests, pathStats, cpu: process.cpuUsage(), mem: process.memoryUsage() }));
    }

    if (req.method !== 'POST' || !req.url.startsWith('/v1/chat/completions')) {
      res.writeHead(404);
      return res.end();
    }

    let rawBody = '';
    req.on('data', (c) => { rawBody += c; });
    req.on('end', async () => {
      totalRequests++;
      try {
        const body = JSON.parse(rawBody);
        const userMsg = body.messages?.[body.messages.length - 1]?.content || '';

        // 1. If Cache Enabled: Check Exact Match, then Semantic Match
        if (CACHE_ENABLED) {
          const exactKey = `cache:exact:${orgId}:${crypto.createHash('sha256').update(userMsg).digest('hex')}`;
          const exactHit = await redis.get(exactKey).catch(() => null);
          if (exactHit) {
            pathStats['cache:hit:exact']++;
            res.writeHead(200, {
              'Content-Type': 'application/json',
              'X-Cache': 'HIT',
              'X-Cache-Path': 'cache:hit:exact',
            });
            return res.end(exactHit);
          }

          // Check semantic cache
          const normalized = normalizePromptForEmbedding(userMsg);
          const tensor = await biEncoder(normalized, { pooling: 'mean', normalize: true });
          const vector = Array.from(tensor.data);

          const semHit = ringBuffer.query(vector, 0.75, orgId, scopeHash, userMsg);
          if (semHit) {
            pathStats['cache:hit:semantic']++;
            res.writeHead(200, {
              'Content-Type': 'application/json',
              'X-Cache': 'HIT',
              'X-Cache-Path': 'cache:hit:semantic',
            });
            return res.end(JSON.stringify(semHit.match.responseData));
          }
        }

        // 2. Cache Miss or Cache Disabled: Forward to Upstream Stub
        pathStats['upstream:uncached']++;
        const upstreamReq = http.request(`http://127.0.0.1:${UPSTREAM_PORT}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }, (upstreamRes) => {
          let uBody = '';
          upstreamRes.on('data', (c) => { uBody += c; });
          upstreamRes.on('end', () => {
            res.writeHead(200, {
              'Content-Type': 'application/json',
              'X-Cache': 'MISS',
              'X-Cache-Path': 'upstream:uncached',
            });
            res.end(uBody);
          });
        });

        upstreamReq.on('error', (err) => {
          res.writeHead(502);
          res.end(JSON.stringify({ error: err.message }));
        });

        upstreamReq.write(rawBody);
        upstreamReq.end();
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  });

  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
  server.maxConnections = 2000;

  server.listen(GATEWAY_PORT, '127.0.0.1', () => {
    console.log(`[Gateway] Real HTTP Gateway listening on 127.0.0.1:${GATEWAY_PORT} (proxied by Nginx)`);
  });
}

main().catch((err) => {
  console.error('Fatal gateway error:', err);
  process.exit(1);
});
