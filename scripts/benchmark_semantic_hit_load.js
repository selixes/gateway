/**
 * ================================================================================
 *    SEMANTIC-HIT LOAD BENCHMARK (SEPARATE MACHINE CLIENT TO LIGHTSAIL SERVER)
 * ================================================================================
 * Evaluates real HTTP load from separate client machine:
 * - 50% paraphrases of the 200 seeded prompts
 * - 50% unrelated unique prompts (control)
 * Across Concurrency = 10, 25, 50.
 *
 * Compares:
 * 1. Semantic Cache ON
 * 2. Semantic Cache OFF (Baseline)
 * ================================================================================
 */

const { runBenchmarkRun } = require('./client_load_generator.js');

async function main() {
  console.log('='.repeat(95));
  console.log('    ITEM 2: SEMANTIC-HIT LOAD TEST OVER REAL HTTP (SEPARATE CLIENT MACHINE)');
  console.log('='.repeat(95));
  console.log('Target Server : AWS Lightsail (98.86.17.221:443 via Nginx -> Port 4000)');
  console.log('Client Machine: Separate Client Machine (ARM64 Termux client over public WAN)');
  console.log('Workload      : 50% Paraphrases of 200 Seeded Prompts + 50% Unrelated Control Prompts');
  console.log('='.repeat(95));

  const mode = process.argv.includes('--baseline') ? 'Semantic Cache OFF (Baseline)' : 'Semantic Cache ON';
  console.log(`\nExecuting test mode: [${mode}]`);

  const results = [];

  // Run C=10 for 15s
  const r10 = await runBenchmarkRun({
    modeName: `${mode} [C=10]`,
    concurrency: 10,
    durationSec: 15,
  });
  results.push(r10);

  // Run C=25 for 15s
  const r25 = await runBenchmarkRun({
    modeName: `${mode} [C=25]`,
    concurrency: 25,
    durationSec: 15,
  });
  results.push(r25);

  // Run C=50 for 15s
  const r50 = await runBenchmarkRun({
    modeName: `${mode} [C=50]`,
    concurrency: 50,
    durationSec: 15,
  });
  results.push(r50);

  console.log('\n' + '='.repeat(105));
  console.log(`                 RESULTS SUMMARY FOR [${mode}]`);
  console.log('='.repeat(105));
  console.log('Scenario                       | Conc | Reqs | RPS   | Added p50 | Added p99 | Semantic Hits | Uncached Misses');
  console.log('-'.repeat(105));

  for (const r of results) {
    const scStr = r.modeName.padEnd(30);
    const cStr = String(r.concurrency).padStart(4);
    const reqStr = String(r.totalRequests).padStart(4);
    const rpsStr = String(r.rps).padStart(5);
    const p50Str = `${r.p50}ms`.padStart(9);
    const p99Str = `${r.p99}ms`.padStart(9);
    const semHits = String(r.paths['cache:hit:semantic'] || 0).padStart(13);
    const uncache = String(r.paths['upstream:uncached'] || 0).padStart(15);
    console.log(`${scStr} | ${cStr} | ${reqStr} | ${rpsStr} | ${p50Str} | ${p99Str} | ${semHits} | ${uncache}`);
  }
  console.log('='.repeat(105));
}

main().catch((err) => {
  console.error('Fatal benchmark error:', err);
  process.exit(1);
});
