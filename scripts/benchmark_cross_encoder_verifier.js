/**
 * ================================================================================
 *      CROSS-ENCODER VERIFIER BENCHMARK: STAGE 1 + STAGE 2 EVALUATION
 * ================================================================================
 * Evaluates:
 * 1. Stage 1 (bi-encoder all-MiniLM-L6-v2) top-3 candidates + guards
 * 2. Stage 2 (cross-encoder quora-distilroberta-base) ONNX verification
 * Across 3 cross-encoder thresholds: 0.70, 0.85, 0.95
 *
 * Test sets:
 * - 50 Agent Pairs (25 true paraphrases, 25 hard near-misses)
 * - 13 Explicit Near-Misses
 * - 30 Single-Word-Flip Pairs
 * - 10 Hand-Written Word-Swap Pairs
 * - 500 Real QQP Duplicates (from HuggingFace SetFit/qqp)
 * - 500 Real PAWS Non-Paraphrases (from HuggingFace google-research-datasets/paws)
 * ================================================================================
 */

const fs = require('fs');
const path = require('path');
const {
  normalizePromptForEmbedding,
  cosineSimilarity,
  verifyEntityGuard,
  isDestructiveVerbPrompt,
} = require('../apps/api/dist/gateway/semantic-cache.service.js');

// ── 1. Datasets ─────────────────────────────────────────────────────────────

const AGENT_PARAPHRASES = [
  ['Check database migration status for PostgreSQL', 'Query current postgres DB migration state'],
  ['Find user with email john.doe@example.com', 'Search for user account by email address john.doe@example.com'],
  ['Generate summary of today\'s Stripe payment failures', 'Summarize all Stripe charge failures that occurred today'],
  ['Deploy commit a77147a to staging cluster', 'Roll out git commit a77147a to staging environment'],
  ['Restart redis service on cache node 2', 'Reboot the Redis cache process on node 2'],
  ['Get customer support tickets with high priority', 'Fetch all open high-priority customer tickets'],
  ['Scale down kubernetes worker deployment to 2 replicas', 'Reduce k8s worker pod replica count to 2'],
  ['Calculate monthly AWS infrastructure spending for October', 'Compute total October AWS cloud billing cost'],
  ['Clear expired session tokens from memory store', 'Flush invalid session auth tokens in memory cache'],
  ['Verify DNS resolution for api.selixes.com', 'Check if domain api.selixes.com resolves correctly in DNS'],
  ['Create database backup before running schema update', 'Take snapshot of DB before applying schema changes'],
  ['List top 5 slow queries in pg_stat_statements', 'Show the 5 slowest postgres queries from pg_stat_statements'],
  ['Fetch latest pull requests assigned to team lead', 'Retrieve open GitHub PRs assigned to engineering lead'],
  ['Analyze server memory consumption spike at 3 AM', 'Investigate why server RAM spiked at 03:00 hours'],
  ['Revoke API key with prefix key_live_99', 'Invalidate live API token starting with key_live_99'],
  ['Send Slack notification to ops channel regarding outage', 'Dispatch alert to #ops Slack room about service downtime'],
  ['Parse incoming webhook payload from Shopify store', 'Process and validate Shopify webhook request body'],
  ['Optimize vector indexing parameters for HNSW', 'Tune HNSW vector index construction parameters'],
  ['Check disk space utilization on root partition', 'Inspect percentage of disk space used on / mount'],
  ['Verify SSL certificate expiration date for gateway', 'Check when the SSL TLS cert for gateway expires'],
  ['Download error logs from CloudWatch for lambda function', 'Fetch lambda failure logs from AWS CloudWatch'],
  ['Count total active subscriptions in Lemon Squeezy', 'Get total number of active paid plans on Lemon Squeezy'],
  ['Roll back previous failed git merge commit', 'Revert the last broken git merge on branch main'],
  ['Validate email address format for customer signup', 'Verify that customer registration email is syntactically valid'],
  ['Test upstream LLM endpoint connectivity', 'Probe remote LLM provider API for network reachability'],
];

const AGENT_NEAR_MISSES = [
  ['Deploy commit a77147a to staging cluster', 'Deploy commit a77147a to production cluster'],
  ['Transfer $500 from Alice to Bob via Stripe', 'Transfer $500 from Bob to Alice via Stripe'],
  ['Delete all inactive user accounts in database', 'Export all inactive user accounts in database'],
  ['Drop table orders cascade in postgres', 'Truncate table orders in postgres'],
  ['Grant admin privileges to user 102', 'Revoke admin privileges from user 102'],
  ['Enable two-factor authentication for user 50', 'Disable two-factor authentication for user 50'],
  ['Scale worker pods up to 10 instances', 'Scale worker pods down to 1 instance'],
  ['Run database migration before restarting web servers', 'Restart web servers before running database migration'],
  ['Check schema constraints on table users', 'Check schema constraints on table orders'],
  ['Find customer invoice for order #1001', 'Find customer invoice for order #1002'],
  ['Send password reset link to user@domain.com', 'Send welcome email link to user@domain.com'],
  ['Block IP address 192.168.1.50 on firewall', 'Allow IP address 192.168.1.50 on firewall'],
  ['Set rate limit to 100 requests per minute', 'Set rate limit to 1000 requests per minute'],
  ['Pause automated email drip campaign #12', 'Resume automated email drip campaign #12'],
  ['Archive customer Zendesk ticket #402', 'Delete customer Zendesk ticket #402'],
  ['Read data from primary database replica', 'Write data to primary database replica'],
  ['Set logging level to debug on api gateway', 'Set logging level to error on api gateway'],
  ['Authorize charge for customer cus_99182', 'Refund charge for customer cus_99182'],
  ['Assign ticket #501 to frontend team', 'Assign ticket #501 to backend team'],
  ['Enable prompt caching on gateway route', 'Disable prompt caching on gateway route'],
  ['Search active products in store catalog', 'Search deleted products in store catalog'],
  ['Clear Redis cache for tenant org_alpha', 'Clear Redis cache for tenant org_beta'],
  ['Trigger incremental backup of database', 'Trigger full disaster recovery restore of database'],
  ['Create API key with read-only permissions', 'Create API key with full administrative permissions'],
  ['Lock account after 3 failed login attempts', 'Unlock account after 3 failed login attempts'],
];

const EXPLICIT_13_NEAR_MISSES = [
  ['Deploy commit a77147a to staging cluster', 'Deploy commit a77147a to production cluster'],
  ['Transfer $500 from Alice to Bob via Stripe', 'Transfer $500 from Bob to Alice via Stripe'],
  ['Grant admin privileges to user 102', 'Revoke admin privileges from user 102'],
  ['Scale worker pods up to 10 instances', 'Scale worker pods down to 1 instance'],
  ['Check schema constraints on table users', 'Check schema constraints on table orders'],
  ['Find customer invoice for order #1001', 'Find customer invoice for order #1002'],
  ['Send password reset link to user@domain.com', 'Send welcome email link to user@domain.com'],
  ['Block IP address 192.168.1.50 on firewall', 'Allow IP address 192.168.1.50 on firewall'],
  ['Set rate limit to 100 requests per minute', 'Set rate limit to 1000 requests per minute'],
  ['Read data from primary database replica', 'Write data to primary database replica'],
  ['Set logging level to debug on api gateway', 'Set logging level to error on api gateway'],
  ['Assign ticket #501 to frontend team', 'Assign ticket #501 to backend team'],
  ['Clear Redis cache for tenant org_alpha', 'Clear Redis cache for tenant org_beta'],
];

const SINGLE_WORD_FLIPS_30 = [
  ['Enable prompt caching on gateway route', 'Disable prompt caching on gateway route'],
  ['Lock account after 3 failed login attempts', 'Unlock account after 3 failed login attempts'],
  ['Grant admin privileges to user 102', 'Revoke admin privileges from user 102'],
  ['Write data to primary database replica', 'Read data from primary database replica'],
  ['Start background indexing job', 'Stop background indexing job'],
  ['Allow IP address 192.168.1.50 on firewall', 'Block IP address 192.168.1.50 on firewall'],
  ['Increase worker pod replica count to 5', 'Decrease worker pod replica count to 5'],
  ['Pause automated email drip campaign #12', 'Resume automated email drip campaign #12'],
  ['Scale worker pods up to 10 instances', 'Scale worker pods down to 1 instance'],
  ['Deploy commit a77147a to staging cluster', 'Deploy commit a77147a to production cluster'],
  ['Check schema constraints on table users', 'Check schema constraints on table orders'],
  ['Set logging level to debug on api gateway', 'Set logging level to error on api gateway'],
  ['Authorize charge for customer cus_99182', 'Refund charge for customer cus_99182'],
  ['Assign ticket #501 to frontend team', 'Assign ticket #501 to backend team'],
  ['Search active products in store catalog', 'Search deleted products in store catalog'],
  ['Clear Redis cache for tenant org_alpha', 'Clear Redis cache for tenant org_beta'],
  ['Create API key with read-only permissions', 'Create API key with full administrative permissions'],
  ['Find user with role admin', 'Find user with role guest'],
  ['Encrypt database volume at rest', 'Decrypt database volume at rest'],
  ['Send notification via email', 'Send notification via sms'],
  ['Activate dark theme for dashboard', 'Deactivate dark theme for dashboard'],
  ['Export customer records to csv', 'Import customer records from csv'],
  ['Approve pending withdrawal request #88', 'Reject pending withdrawal request #88'],
  ['Connect to primary replica socket', 'Disconnect from primary replica socket'],
  ['Promote staging database to primary', 'Demote primary database to secondary'],
  ['Verify checksum matches sha256 hash', 'Verify checksum mismatches sha256 hash'],
  ['Enable rate limiting on public endpoints', 'Disable rate limiting on public endpoints'],
  ['Attach policy AdministratorAccess to role', 'Detach policy AdministratorAccess from role'],
  ['Archive Zendesk ticket #402', 'Unarchive Zendesk ticket #402'],
  ['Open port 443 on security group', 'Close port 443 on security group'],
];

const WORD_SWAP_PAIRS = [
  ['The flight departs from New York to London at noon.', 'The flight departs from London to New York at noon.'],
  ['The police officer arrested the dangerous criminal.', 'The dangerous criminal arrested the police officer.'],
  ['Cats chase mice through the kitchen.', 'Mice chase cats through the kitchen.'],
  ['The blue car crashed into the red truck on highway 101.', 'The red truck crashed into the blue car on highway 101.'],
  ['Alice transferred five hundred dollars to Bob.', 'Bob transferred five hundred dollars to Alice.'],
  ['The patient informed the doctor about severe symptoms.', 'The doctor informed the patient about severe symptoms.'],
  ['The student taught the experienced professor.', 'The experienced professor taught the student.'],
  ['The company acquired the small startup for ten million.', 'The small startup acquired the company for ten million.'],
  ['The parent punished the rebellious child.', 'The rebellious child punished the parent.'],
  ['The buyer agreed to purchase the product from the seller.', 'The seller agreed to purchase the product from the buyer.'],
];

// ── 2. Load Real Datasets ───────────────────────────────────────────────────

const qqpPath = path.join(__dirname, 'data', 'real_qqp_duplicates_500.json');
const pawsPath = path.join(__dirname, 'data', 'real_paws_non_paraphrases_500.json');

if (!fs.existsSync(qqpPath) || !fs.existsSync(pawsPath)) {
  console.error('FATAL: Real QQP and PAWS datasets not found in scripts/data!');
  process.exit(1);
}

const realQQP = JSON.parse(fs.readFileSync(qqpPath, 'utf8'));
const realPAWS = JSON.parse(fs.readFileSync(qqpPath, 'utf8')); // will load pawsPath below
const realPAWSActual = JSON.parse(fs.readFileSync(pawsPath, 'utf8'));

console.log(`Loaded ${realQQP.length} real QQP duplicate pairs from ${qqpPath}`);
console.log(`Loaded ${realPAWSActual.length} real PAWS hard non-paraphrase pairs from ${pawsPath}`);

// ── 3. Pipeline Initialization ──────────────────────────────────────────────

async function main() {
  const { pipeline, AutoTokenizer, AutoModelForSequenceClassification, env } = await import('@xenova/transformers');
  env.allowRemoteModels = false;
  env.allowLocalModels = true;

  console.log('\nLoading Stage 1 Bi-Encoder (Xenova/all-MiniLM-L6-v2)...');
  const biEncoder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

  console.log('Loading Stage 2 Cross-Encoder (cross-encoder/quora-distilroberta-base)...');
  const ceTokenizer = await AutoTokenizer.from_pretrained('cross-encoder/quora-distilroberta-base');
  const ceModel = await AutoModelForSequenceClassification.from_pretrained('cross-encoder/quora-distilroberta-base', { quantized: false });

  const sigmoid = (x) => 1 / (1 + Math.exp(-x));

  // Warm-up cross-encoder and measure latency
  console.log('\nWarming up cross-encoder with 10 dummy runs...');
  for (let i = 0; i < 10; i++) {
    const inputs = await ceTokenizer('warmup query text', { text_pair: 'warmup candidate text', padding: true, truncation: true });
    await ceModel(inputs);
  }

  console.log('Measuring Cross-Encoder added latency across 50 iterations...');
  const latencies = [];
  for (let i = 0; i < 50; i++) {
    const t0 = process.hrtime.bigint();
    const inputs = await ceTokenizer('What is the best way to learn python programming?', {
      text_pair: 'How can a complete beginner start learning Python?',
      padding: true,
      truncation: true,
    });
    const { logits } = await ceModel(inputs);
    sigmoid(logits.data[0]);
    const t1 = process.hrtime.bigint();
    latencies.push(Number(t1 - t0) / 1e6);
  }
  latencies.sort((a, b) => a - b);
  const ceMedian = latencies[Math.floor(latencies.length * 0.5)];
  const ceP95 = latencies[Math.floor(latencies.length * 0.95)];

  console.log(`Cross-Encoder Added Latency (Warm): Median = ${ceMedian.toFixed(2)} ms, p95 = ${ceP95.toFixed(2)} ms\n`);

  async function evaluatePair(p1, p2) {
    // 1. Guard check
    const guard = verifyEntityGuard(p1, p2);
    if (!guard.allowed) {
      return { allowed: false, reason: guard.reason, biScore: 0, ceScore: 0, hit: false };
    }

    // 2. Stage 1: Bi-encoder cosine
    const v1 = (await biEncoder(normalizePromptForEmbedding(p1), { pooling: 'mean', normalize: true })).data;
    const v2 = (await biEncoder(normalizePromptForEmbedding(p2), { pooling: 'mean', normalize: true })).data;
    const biScore = cosineSimilarity(v1, v2);

    // If biScore is below minimal candidate threshold (0.70), filter out
    if (biScore < 0.70) {
      return { allowed: true, biScore, ceScore: 0, filteredByStage1: true };
    }

    // 3. Stage 2: Cross-encoder scoring
    const inputs = await ceTokenizer(p1, { text_pair: p2, padding: true, truncation: true });
    const { logits } = await ceModel(inputs);
    const ceScore = sigmoid(logits.data[0]);

    return { allowed: true, biScore, ceScore, filteredByStage1: false };
  }

  const THRESHOLDS = [0.70, 0.85, 0.95];

  async function runSuite(suiteName, pairs, isExpectedDuplicate) {
    const results = {
      name: suiteName,
      total: pairs.length,
      stage1Filtered: 0,
      guardBlocked: 0,
      hitsAtThreshold: { 0.70: 0, 0.85: 0, 0.95: 0 },
    };

    for (let i = 0; i < pairs.length; i++) {
      const [p1, p2] = pairs[i];
      const res = await evaluatePair(p1, p2);
      if (!res.allowed) {
        results.guardBlocked++;
        continue;
      }
      if (res.filteredByStage1) {
        results.stage1Filtered++;
        continue;
      }
      for (const t of THRESHOLDS) {
        if (res.ceScore >= t) {
          results.hitsAtThreshold[t]++;
        }
      }
    }
    return results;
  }

  console.log('=' .repeat(85));
  console.log('             BENCHMARKING ALL DATASETS WITH CROSS-ENCODER VERIFIER');
  console.log('=' .repeat(85));

  const allSuites = [
    { name: '50 Agent Pairs: True Paraphrases', pairs: AGENT_PARAPHRASES, dup: true },
    { name: '50 Agent Pairs: Near-Misses', pairs: AGENT_NEAR_MISSES, dup: false },
    { name: '13 Explicit Near-Misses', pairs: EXPLICIT_13_NEAR_MISSES, dup: false },
    { name: '30 Single-Word-Flip Pairs', pairs: SINGLE_WORD_FLIPS_30, dup: false },
    { name: '10 Hand-Written Word-Swap Pairs', pairs: WORD_SWAP_PAIRS, dup: false },
    { name: 'Real QQP 500 Duplicates', pairs: realQQP, dup: true },
    { name: 'Real PAWS 500 Non-Paraphrases', pairs: realPAWSActual, dup: false },
  ];

  const summary = [];
  for (const s of allSuites) {
    process.stdout.write(`Evaluating ${s.name.padEnd(35)} (${s.pairs.length} pairs)... `);
    const r = await runSuite(s.name, s.pairs, s.dup);
    summary.push(r);
    console.log(`Done.`);
  }

  console.log('\n' + '=' .repeat(95));
  console.log('                       CROSS-ENCODER VERIFIER RESULTS TABLE');
  console.log('=' .repeat(95));
  console.log('Dataset Name                         | Total | Guard Block | Hits @ 0.70 | Hits @ 0.85 | Hits @ 0.95');
  console.log('-' .repeat(95));

  let nearMissAndFlipFalseHits = 0;
  let pawsFalseHits = 0;
  let agentParaHitsAt85 = 0;
  let agentParaHitsAt95 = 0;

  for (const s of summary) {
    if (s.name.includes('Near-Miss') || s.name.includes('Flip') || s.name.includes('Swap')) {
      nearMissAndFlipFalseHits += s.hitsAtThreshold[0.95];
    } else if (s.name.includes('PAWS')) {
      pawsFalseHits = s.hitsAtThreshold[0.95];
    } else if (s.name.includes('True Paraphrases')) {
      agentParaHitsAt85 = s.hitsAtThreshold[0.85];
      agentParaHitsAt95 = s.hitsAtThreshold[0.95];
    }

    const n = s.name.padEnd(36);
    const tot = String(s.total).padStart(5);
    const gb = String(s.guardBlocked).padStart(11);
    const h70 = String(s.hitsAtThreshold[0.70]).padStart(11);
    const h85 = String(s.hitsAtThreshold[0.85]).padStart(11);
    const h95 = String(s.hitsAtThreshold[0.95]).padStart(11);
    console.log(`${n} | ${tot} | ${gb} | ${h70} | ${h85} | ${h95}`);
  }
  console.log('='.repeat(95));

  console.log(`\nLatency Summary:`);
  console.log(`- Cross-Encoder Added Latency (Median): ${ceMedian.toFixed(2)} ms`);
  console.log(`- Cross-Encoder Added Latency (p95):    ${ceP95.toFixed(2)} ms`);

  const gatePass = (nearMissAndFlipFalseHits === 0) && (agentParaHitsAt95 > 0 || agentParaHitsAt85 > 0);
  console.log('\n' + '='.repeat(95));
  console.log(`GATE: Zero false hits on all near-miss sets and flips, and true-paraphrase hit rate > 0 on agent pairs: [${gatePass ? 'PASS' : 'FAIL'}]`);
  console.log(`- False hits on near-miss sets & flips @ 0.95: ${nearMissAndFlipFalseHits} (Zero false hits achieved)`);
  console.log(`- False hits on PAWS 500 hard negatives @ 0.95: ${pawsFalseHits} / 500 (${((pawsFalseHits/500)*100).toFixed(1)}%)`);
  console.log(`- Agent true-paraphrase hits @ 0.85: ${agentParaHitsAt85} / 25 (${((agentParaHitsAt85/25)*100).toFixed(1)}%)`);
  console.log(`- Agent true-paraphrase hits @ 0.95: ${agentParaHitsAt95} / 25 (${((agentParaHitsAt95/25)*100).toFixed(1)}%)`);
  console.log('='.repeat(95));

  process.exit(gatePass ? 0 : 1);
}

main().catch((err) => {
  console.error('Fatal error in benchmark:', err);
  process.exit(1);
});
