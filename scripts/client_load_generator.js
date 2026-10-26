/**
 * ================================================================================
 *          CLIENT-SIDE LOAD GENERATOR (RUNS ON SEPARATE CLIENT MACHINE)
 * ================================================================================
 * Sends real HTTPS/HTTP2 requests across the public internet to:
 *   https://98.86.17.221/v1/chat/completions (Host: selixes.com)
 *
 * Workload:
 * - 50% Paraphrases of the 200 seeded prompts (tests semantic cache hit).
 * - 50% Unrelated unique prompts (tests cache miss / upstream pass-through control).
 *
 * Concurrency: 10, 25, 50.
 * Reports: RPS, p50 / p99 added latency, paths served.
 * ================================================================================
 */

const https = require('https');
const path = require('path');
const fs = require('fs');

const TARGET_HOST = '98.86.17.221';
const DOMAIN_HEADER = 'selixes.com';
const UPSTREAM_DELAY_MS = 50;

const pairsPath = path.join(__dirname, 'data', 'semantic_benchmark_200.json');
const pairs = JSON.parse(fs.readFileSync(pairsPath, 'utf8'));

const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 200,
  maxFreeSockets: 50,
  keepAliveMsecs: 60000,
  rejectUnauthorized: false, // Self-signed or Let's Encrypt with IP target
});

function sendRequest(prompt) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: 'qwen2.5:0.5b',
      messages: [{ role: 'user', content: prompt }],
    });

    const t0 = process.hrtime.bigint();
    const req = https.request({
      hostname: TARGET_HOST,
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      agent,
      headers: {
        'Host': DOMAIN_HEADER,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        const t1 = process.hrtime.bigint();
        const roundtripMs = Number(t1 - t0) / 1e6;
        const cacheHeader = res.headers['x-cache'] || 'MISS';
        const cachePath = res.headers['x-cache-path'] || (cacheHeader === 'HIT' ? 'cache:hit' : 'upstream:uncached');

        // Added latency = for cached, raw roundtrip; for uncached, subtract upstream 50ms delay
        const addedLatencyMs = cacheHeader === 'HIT' ? roundtripMs : Math.max(0.1, roundtripMs - UPSTREAM_DELAY_MS);

        resolve({
          statusCode: res.statusCode,
          roundtripMs,
          addedLatencyMs,
          cacheHeader,
          cachePath,
        });
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runBenchmarkRun({ modeName, concurrency, durationSec }) {
  console.log(`\nStarting Run: [${modeName}] | Concurrency: ${concurrency} | Duration: ${durationSec}s`);

  const latencies = [];
  const paths = { 'cache:hit:semantic': 0, 'cache:hit:exact': 0, 'upstream:uncached': 0 };
  let completed = 0;
  let errors = 0;

  const startTime = Date.now();
  const endTime = startTime + durationSec * 1000;

  async function worker(workerId) {
    let reqIdx = 0;
    while (Date.now() < endTime) {
      reqIdx++;
      // 50% Paraphrase, 50% Unrelated Control
      const isParaphrase = (reqIdx % 2 === 0);
      let prompt;
      if (isParaphrase) {
        const pairIdx = (workerId * 50 + reqIdx) % pairs.length;
        prompt = pairs[pairIdx].paraphrase;
      } else {
        prompt = `Unrelated control inquiry ${workerId}-${reqIdx}-${Date.now()}-${Math.random()}: check storage metrics`;
      }

      try {
        const res = await sendRequest(prompt);
        if (res.statusCode === 200) {
          completed++;
          latencies.push(res.addedLatencyMs);
          paths[res.cachePath] = (paths[res.cachePath] || 0) + 1;
        } else {
          errors++;
        }
      } catch (err) {
        errors++;
      }
    }
  }

  const workers = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(worker(i));
  }

  const progressInterval = setInterval(() => {
    const elapsedSec = (Date.now() - startTime) / 1000;
    const rps = (completed / elapsedSec).toFixed(1);
    process.stdout.write(`  Elapsed: ${elapsedSec.toFixed(0)}s / ${durationSec}s | Completed: ${completed} reqs | RPS: ${rps} | Errors: ${errors}\r`);
  }, 2000);

  await Promise.all(workers);
  clearInterval(progressInterval);

  const totalTimeSec = (Date.now() - startTime) / 1000;
  latencies.sort((a, b) => a - b);

  const p50 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.5)] : 0;
  const p99 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.99)] : 0;
  const rps = (completed / totalTimeSec).toFixed(1);

  console.log(`\nCompleted [${modeName}] (C=${concurrency}): ${completed} reqs in ${totalTimeSec.toFixed(1)}s (${rps} RPS)`);
  console.log(`  Added Latency : p50 = ${p50.toFixed(2)} ms, p99 = ${p99.toFixed(2)} ms`);
  console.log(`  Paths Served  : semantic_hit=${paths['cache:hit:semantic'] || 0}, exact_hit=${paths['cache:hit:exact'] || 0}, uncached=${paths['upstream:uncached'] || 0}`);

  return {
    modeName,
    concurrency,
    durationSec: totalTimeSec.toFixed(1),
    totalRequests: completed,
    errors,
    rps,
    p50: p50.toFixed(2),
    p99: p99.toFixed(2),
    paths,
  };
}

module.exports = { runBenchmarkRun, sendRequest };

if (require.main === module) {
  // Test 1 connection probe
  sendRequest('Health probe').then(r => console.log('Probe response:', r)).catch(console.error);
}
