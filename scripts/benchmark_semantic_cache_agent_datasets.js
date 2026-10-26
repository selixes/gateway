/**
 * ================================================================================
 *      SEMANTIC CACHE QUALITY: AGENT DATASETS, LATENCY & HISTOGRAMS
 * ================================================================================
 * Validates:
 * 1. Warm-up (20 runs) + 200 real embeddings latency (median and p95) with all-MiniLM-L6-v2.
 * 2. 50 Hand-written AGENT-style prompt pairs:
 *    - 25 True agent paraphrases
 *    - 25 Hard near-miss pairs (subtle semantic differences, e.g. staging vs prod)
 * 3. 10 sample QQP duplicates + 10 sample PAWS hard negatives with scores.
 * 4. Histograms (0.05 bins) and exact hit counts @ thresholds [0.85, 0.90, 0.93, 0.95].
 * ================================================================================
 */

const { normalizePromptForEmbedding, cosineSimilarity } = require('../apps/api/dist/gateway/semantic-cache.service.js');

// ── 50 Hand-Written AGENT-Style Prompt Pairs ─────────────────────────────────

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
  // Opposite environments
  ['Deploy commit a77147a to staging cluster', 'Deploy commit a77147a to production cluster'],
  // Inverted financial / transfer direction
  ['Transfer $500 from Alice to Bob via Stripe', 'Transfer $500 from Bob to Alice via Stripe'],
  // Destructive vs Read-only operations
  ['Delete all inactive user accounts in database', 'Export all inactive user accounts in database'],
  ['Drop table orders cascade in postgres', 'Truncate table orders in postgres'],
  // Permissions grant vs revoke
  ['Grant admin privileges to user 102', 'Revoke admin privileges from user 102'],
  ['Enable two-factor authentication for user 50', 'Disable two-factor authentication for user 50'],
  // Scaling up vs scaling down
  ['Scale worker pods up to 10 instances', 'Scale worker pods down to 1 instance'],
  // Order of execution
  ['Run database migration before restarting web servers', 'Restart web servers before running database migration'],
  // Different target tables / entities
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

// 10 Hand-Written Duplicate Pairs
const SAMPLE_QQP_DUPLICATES = [
  ['How can I increase my internet speed?', 'What can I do to improve my internet speed?'],
  ['What is the best way to learn Python for a beginner?', 'How should a beginner start learning Python?'],
  ['Why is the sky blue during the day?', 'What causes the sky to appear blue during daytime?'],
  ['How do I reset my database root password?', 'What are the steps to reset the DB root password?'],
  ['Can an AI agent run indefinitely without looping?', 'Is it possible for an AI agent to run continuously without getting stuck in a loop?'],
  ['How do I optimize SQL queries for postgres?', 'What is the best way to speed up PostgreSQL database queries?'],
  ['What is the capital city of Australia?', 'Which city serves as Australia\'s capital?'],
  ['How does Redis caching reduce server latency?', 'In what way does in-memory Redis caching improve response time?'],
  ['How do I handle authentication errors in Node.js?', 'What is the proper way to catch auth failures in Node?'],
  ['Why did the database migration fail on table users?', 'What caused the DB migration failure on the users table?'],
];

// 10 Hand-Written Word-Swap Pairs (Word scrambled / opposing meaning)
const SAMPLE_PAWS_NEGATIVES = [
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

function buildHistogram(scores) {
  const binEdges = [
    '<0.50',
    '0.50-0.55',
    '0.55-0.60',
    '0.60-0.65',
    '0.65-0.70',
    '0.70-0.75',
    '0.75-0.80',
    '0.80-0.85',
    '0.85-0.90',
    '0.90-0.95',
    '0.95-1.00',
    '1.00'
  ];
  const bins = {};
  for (const edge of binEdges) bins[edge] = 0;

  for (const s of scores) {
    if (s >= 1.0) {
      bins['1.00']++;
    } else if (s < 0.50) {
      bins['<0.50']++;
    } else {
      let placed = false;
      for (let i = 1; i < binEdges.length - 1; i++) {
        const [low, high] = binEdges[i].split('-').map(Number);
        if (s >= low && s < high) {
          bins[binEdges[i]]++;
          placed = true;
          break;
        }
      }
      if (!placed) bins['0.95-1.00']++;
    }
  }
  return bins;
}

function countHits(scores, thresholds) {
  const counts = {};
  for (const t of thresholds) {
    const hits = scores.filter(s => s >= t).length;
    counts[t] = `${hits} / ${scores.length} (${((hits / scores.length) * 100).toFixed(1)}%)`;
  }
  return counts;
}

(async () => {
  console.log('================================================================================');
  console.log('   SECTION 2: SEMANTIC CACHE DATASETS, HISTOGRAMS & AGENT PROMPTS VERIFICATION  ');
  console.log('================================================================================');

  // Load real local model
  const { pipeline, env } = await import('@xenova/transformers');
  env.allowRemoteModels = false;
  env.allowLocalModels = true;

  console.log('Loading local model Xenova/all-MiniLM-L6-v2...');
  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

  // ── 1. Latency Measurement: 20-Run Warm-up + 200 Real Embeddings ─────────────
  console.log('\n--- 1. EMBEDDING LATENCY: 20 WARM-UP RUNS + 200 TIMED RUNS ---');
  const samplePrompt = 'Summarize the database migration error on table users with postgres connection pooling.';

  // 20 Warm-up runs
  for (let i = 0; i < 20; i++) {
    await extractor(samplePrompt, { pooling: 'mean', normalize: true });
  }

  // 200 Timed runs
  const latencies = [];
  for (let i = 0; i < 200; i++) {
    const t0 = performance.now();
    await extractor(samplePrompt, { pooling: 'mean', normalize: true });
    latencies.push(performance.now() - t0);
  }

  latencies.sort((a, b) => a - b);
  const minLatency = latencies[0];
  const medianLatency = latencies[Math.floor(latencies.length / 2)];
  const p95Latency = latencies[Math.floor(latencies.length * 0.95)];
  const maxLatency = latencies[latencies.length - 1];

  console.log(`200 Embeddings (Post Warm-Up): Min=${minLatency.toFixed(2)} ms | Median=${medianLatency.toFixed(2)} ms | p95=${p95Latency.toFixed(2)} ms | Max=${maxLatency.toFixed(2)} ms`);

  // ── 2. 10 Hand-Written Duplicate Pairs with Cosine Scores ──────────────────────
  console.log('\n--- 2. 10 HAND-WRITTEN DUPLICATE PAIRS (WITH NORMALIZED COSINE SCORES) ---');
  const qqpScores = [];
  for (let i = 0; i < SAMPLE_QQP_DUPLICATES.length; i++) {
    const [q1, q2] = SAMPLE_QQP_DUPLICATES[i];
    const v1 = (await extractor(normalizePromptForEmbedding(q1), { pooling: 'mean', normalize: true })).data;
    const v2 = (await extractor(normalizePromptForEmbedding(q2), { pooling: 'mean', normalize: true })).data;
    const score = cosineSimilarity(v1, v2);
    qqpScores.push(score);
    console.log(`[Duplicate-${String(i+1).padStart(2, '0')}] Score: ${score.toFixed(4)} | P1: "${q1}" | P2: "${q2}"`);
  }

  // ── 3. 10 Hand-Written Word-Swap Pairs with Cosine Scores ──────────────────────
  console.log('\n--- 3. 10 HAND-WRITTEN WORD-SWAP PAIRS (WITH NORMALIZED COSINE SCORES) ---');
  const pawsScores = [];
  for (let i = 0; i < SAMPLE_PAWS_NEGATIVES.length; i++) {
    const [s1, s2] = SAMPLE_PAWS_NEGATIVES[i];
    const v1 = (await extractor(normalizePromptForEmbedding(s1), { pooling: 'mean', normalize: true })).data;
    const v2 = (await extractor(normalizePromptForEmbedding(s2), { pooling: 'mean', normalize: true })).data;
    const score = cosineSimilarity(v1, v2);
    pawsScores.push(score);
    console.log(`[Word-Swap-${String(i+1).padStart(2, '0')}] Score: ${score.toFixed(4)} | S1: "${s1}" | S2: "${s2}"`);
  }

  // ── 4. 50 Hand-Written AGENT-Style Prompt Pairs ─────────────────────────────
  console.log('\n--- 4. 50 HAND-WRITTEN AGENT PAIRS (25 True Paraphrases + 25 Hard Near-Misses) ---');
  const agentParaScores = [];
  for (let i = 0; i < AGENT_PARAPHRASES.length; i++) {
    const [p1, p2] = AGENT_PARAPHRASES[i];
    const v1 = (await extractor(normalizePromptForEmbedding(p1), { pooling: 'mean', normalize: true })).data;
    const v2 = (await extractor(normalizePromptForEmbedding(p2), { pooling: 'mean', normalize: true })).data;
    const score = cosineSimilarity(v1, v2);
    agentParaScores.push(score);
    if (i < 5) console.log(`  [Agent-Para-${String(i+1).padStart(2, '0')}] Score: ${score.toFixed(4)} | "${p1}" <=> "${p2}"`);
  }

  const agentNearMissScores = [];
  for (let i = 0; i < AGENT_NEAR_MISSES.length; i++) {
    const [m1, m2] = AGENT_NEAR_MISSES[i];
    const v1 = (await extractor(normalizePromptForEmbedding(m1), { pooling: 'mean', normalize: true })).data;
    const v2 = (await extractor(normalizePromptForEmbedding(m2), { pooling: 'mean', normalize: true })).data;
    const score = cosineSimilarity(v1, v2);
    agentNearMissScores.push(score);
    if (i < 5) console.log(`  [Agent-NearMiss-${String(i+1).padStart(2, '0')}] Score: ${score.toFixed(4)} | "${m1}" <=> "${m2}"`);
  }

  // ── 5. Score Histograms & Threshold Counts ───────────────────────────────────
  console.log('\n================================================================================');
  console.log('            SCORE HISTOGRAMS (0.05 BINS) & EXACT HIT COUNTS                     ');
  console.log('================================================================================');

  const thresholds = [0.85, 0.90, 0.93, 0.95];

  console.log('\n--- EXACT COUNTS (Hits / N) AT THRESHOLDS ---');
  console.log('| Dataset | Count | Thresh 0.85 | Thresh 0.90 | Thresh 0.93 | Thresh 0.95 |');
  console.log('|---|---|---|---|---|---|');

  const qqpCounts = countHits(qqpScores, thresholds);
  console.log(`| Hand-Written Duplicates      | ${qqpScores.length} | ${qqpCounts[0.85]} | ${qqpCounts[0.90]} | ${qqpCounts[0.93]} | ${qqpCounts[0.95]} |`);

  const pawsCounts = countHits(pawsScores, thresholds);
  console.log(`| Hand-Written Word-Swap Pairs | ${pawsScores.length} | ${pawsCounts[0.85]} | ${pawsCounts[0.90]} | ${pawsCounts[0.93]} | ${pawsCounts[0.95]} |`);

  const agentParaCounts = countHits(agentParaScores, thresholds);
  console.log(`| Hand-Written Agent Paraphrases | ${agentParaScores.length} | ${agentParaCounts[0.85]} | ${agentParaCounts[0.90]} | ${agentParaCounts[0.93]} | ${agentParaCounts[0.95]} |`);

  const agentNearMissCounts = countHits(agentNearMissScores, thresholds);
  console.log(`| Hand-Written Agent Near-Misses | ${agentNearMissScores.length} | ${agentNearMissCounts[0.85]} | ${agentNearMissCounts[0.90]} | ${agentNearMissCounts[0.93]} | ${agentNearMissCounts[0.95]} |`);

  console.log('\n--- SCORE HISTOGRAMS (0.05 BINS) ---');
  console.log('Score Bin      | HW Duplicates  | HW Word-Swap   | Agent Paraphrases | Agent Near-Misses');
  console.log('---------------|----------------|----------------|-------------------|------------------');
  const hQQP = buildHistogram(qqpScores);
  const hPAWS = buildHistogram(pawsScores);
  const hAPara = buildHistogram(agentParaScores);
  const hAMiss = buildHistogram(agentNearMissScores);

  for (const bin of Object.keys(hQQP)) {
    console.log(`${bin.padEnd(14)} | ${String(hQQP[bin]).padEnd(14)} | ${String(hPAWS[bin]).padEnd(14)} | ${String(hAPara[bin]).padEnd(17)} | ${String(hAMiss[bin])}`);
  }
})();
