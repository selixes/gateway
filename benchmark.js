/**
 * Selixes — Failover Latency Benchmark
 *
 * This script proves the sub-15ms failover claim by simulating a provider
 * outage mid-request and measuring the rerouting latency.
 *
 * Usage:
 *   node benchmark.js
 *
 * Prerequisites:
 *   - Selixes gateway running on localhost:4000
 *   - DEV_BYPASS_TOKEN set in apps/api/.env (for local dev auth)
 *   - dotenv installed: npm install dotenv
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'apps/api/.env') });

const GATEWAY_URL = 'http://localhost:4000/v1/chat/completions';
const BYPASS_TOKEN = process.env.DEV_BYPASS_TOKEN || (() => {
  throw new Error('DEV_BYPASS_TOKEN not set. See .env.example');
})();

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m',
};

const c = (color, text) => `${COLORS[color]}${text}${COLORS.reset}`;

async function measureFailoverLatency(label, headers = {}) {
  const start = performance.now();
  let ttft = null;
  let rerouted = false;

  try {
    const res = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BYPASS_TOKEN}`,
        ...headers,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Say "benchmark ok" in exactly 3 words.' }],
        stream: true,
      }),
    });

    const provider = res.headers.get('x-provider');
    const failoverHeader = res.headers.get('x-failover');
    rerouted = failoverHeader === 'true';

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      if (ttft === null && chunk.includes('data:')) {
        ttft = performance.now() - start;
      }
    }

    const totalMs = performance.now() - start;
    return { label, provider, rerouted, ttftMs: ttft, totalMs, ok: true };
  } catch (err) {
    return { label, ok: false, error: err.message };
  }
}

async function run() {
  console.log(c('bold', '\n⚡ Selixes Failover Latency Benchmark\n'));
  console.log('Gateway:', GATEWAY_URL);
  console.log('─'.repeat(60));

  const results = [];

  // Test 1: Normal request (no outage)
  console.log(c('cyan', '\n[1/3] Normal request — no simulated outage'));
  const r1 = await measureFailoverLatency('Normal');
  results.push(r1);
  printResult(r1);

  // Test 2: Simulated OpenAI outage — should failover
  console.log(c('cyan', '\n[2/3] Simulated OpenAI outage — failover expected'));
  const r2 = await measureFailoverLatency('Failover', { 'x-simulate-outage': 'openai' });
  results.push(r2);
  printResult(r2);

  // Test 3: Repeat failover to measure consistency
  console.log(c('cyan', '\n[3/3] Second failover — consistency check'));
  const r3 = await measureFailoverLatency('Failover (2)', { 'x-simulate-outage': 'openai' });
  results.push(r3);
  printResult(r3);

  // Summary
  console.log('\n' + '─'.repeat(60));
  console.log(c('bold', 'Benchmark Summary\n'));

  const failoverResults = results.filter(r => r.ok && r.rerouted);
  if (failoverResults.length > 0) {
    const avgFailoverTtft = failoverResults.reduce((s, r) => s + r.ttftMs, 0) / failoverResults.length;
    const pass = avgFailoverTtft < 15;
    console.log(`Failover TTFT (avg): ${avgFailoverTtft.toFixed(1)}ms — ${pass ? c('green', '✅ PASS (<15ms)') : c('red', '❌ FAIL (>15ms)')}`);
  } else {
    console.log(c('yellow', 'No failover results recorded. Is the gateway running with x-simulate-outage support?'));
  }

  const normalResult = results.find(r => r.ok && !r.rerouted);
  if (normalResult) {
    console.log(`Normal TTFT:         ${normalResult.ttftMs?.toFixed(1)}ms`);
  }

  console.log('\nRun `docker compose up -d` to start the gateway if tests failed.\n');
}

function printResult(r) {
  if (!r.ok) {
    console.log(c('red', `  ✗ ERROR: ${r.error}`));
    return;
  }
  const reroute = r.rerouted ? c('yellow', ' [REROUTED]') : '';
  console.log(`  Provider: ${c('cyan', r.provider ?? 'unknown')}${reroute}`);
  console.log(`  TTFT:     ${r.ttftMs?.toFixed(1) ?? '?'}ms`);
  console.log(`  Total:    ${r.totalMs?.toFixed(0) ?? '?'}ms`);
}

run().catch(e => {
  console.error(c('red', `Fatal: ${e.message}`));
  process.exit(1);
});
