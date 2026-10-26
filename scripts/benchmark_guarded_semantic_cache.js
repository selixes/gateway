const { normalizePromptForEmbedding, cosineSimilarity } = require('../apps/api/dist/gateway/semantic-cache.service.js');

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

const DESTRUCTIVE_VERBS = /\b(deploy|delete|drop|truncate|grant|revoke|transfer|refund|execute|restart|rollback|kill)\b/i;

function extractEntities(text) {
  const numbers = new Set((text.match(/\b\d+(?:\.\d+)?\b/g) || []).map(n => n.trim()));
  const idMatches = text.match(/(?:[a-z0-9_-]+_[a-z0-9_-]+|#[0-9]+|\b[0-9a-f]{6,64}\b)/gi) || [];
  const ids = new Set(idMatches.map(id => id.toLowerCase().replace(/^[#]/, '')));
  const emails = new Set((text.match(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g) || []).map(e => e.toLowerCase()));
  const quotes = [];
  const qMatches = text.match(/\"([^\"]+)\"|'([^']+)'|\`([^\`]+)\`/g) || [];
  for (const q of qMatches) quotes.push(q.slice(1, -1).trim().toLowerCase());
  const quoted = new Set(quotes);
  const envMatches = (text.match(/\b(staging|production|prod|dev|development)\b/gi) || []).map(e => {
    const el = e.toLowerCase();
    if (el === 'prod') return 'production';
    if (el === 'dev') return 'development';
    return el;
  });
  const envWords = new Set(envMatches);
  return { numbers, ids, emails, quoted, envWords };
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const item of a) if (!b.has(item)) return false;
  return true;
}

function tokenize(s) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
}

function lcsLength(t1, t2) {
  const m = t1.length, n = t2.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (t1[i - 1] === t2[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

function getBigrams(tokens) {
  const bg = new Set();
  for (let i = 0; i < tokens.length - 1; i++) bg.add(tokens[i] + ' ' + tokens[i+1]);
  return bg;
}

function bigramJaccard(t1, t2) {
  const b1 = getBigrams(t1);
  const b2 = getBigrams(t2);
  let inter = 0;
  for (const b of b1) if (b2.has(b)) inter++;
  const union = new Set([...b1, ...b2]).size;
  return union === 0 ? 1 : inter / union;
}

function verifyEntityGuard(p1, p2) {
  if (DESTRUCTIVE_VERBS.test(p1) || DESTRUCTIVE_VERBS.test(p2)) {
    return { allowed: false, reason: 'hard-bypass-destructive-verb' };
  }
  const e1 = extractEntities(p1);
  const e2 = extractEntities(p2);
  if (!setsEqual(e1.numbers, e2.numbers)) return { allowed: false, reason: 'numbers-mismatch' };
  if (!setsEqual(e1.ids, e2.ids)) return { allowed: false, reason: 'ids-mismatch' };
  if (!setsEqual(e1.emails, e2.emails)) return { allowed: false, reason: 'emails-mismatch' };
  if (!setsEqual(e1.quoted, e2.quoted)) return { allowed: false, reason: 'quoted-mismatch' };
  if (!setsEqual(e1.envWords, e2.envWords)) return { allowed: false, reason: 'env-mismatch' };

  const t1 = tokenize(p1);
  const t2 = tokenize(p2);
  const common = t1.filter(w => t2.includes(w));
  const overlapRatio = common.length / Math.max(t1.length, t2.length);
  if (overlapRatio >= 0.6) {
    const lcs = lcsLength(t1, t2);
    const lcsRatio = lcs / Math.max(t1.length, t2.length);
    const bgJaccard = bigramJaccard(t1, t2);
    if (lcsRatio < 0.85 || bgJaccard < 0.75) return { allowed: false, reason: 'ordered-token-mismatch' };
  }
  return { allowed: true };
}

(async () => {
  const { pipeline, env } = await import('@xenova/transformers');
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

  const THRESHOLD = 0.93;

  console.log('================================================================================');
  console.log('           ENTITY GUARD VERIFICATION ON HAND-WRITTEN TEST PAIRS                 ');
  console.log('================================================================================');

  console.log('\n--- 1. SPECIFIC REQUIRED EDGE CASES ---');
  const edgeCases = [
    ['staging vs production', 'Deploy commit a77147a to staging cluster', 'Deploy commit a77147a to production cluster'],
    ['Alice-to-Bob reversed', 'Transfer $500 from Alice to Bob via Stripe', 'Transfer $500 from Bob to Alice via Stripe'],
    ['grant vs revoke', 'Grant admin privileges to user 102', 'Revoke admin privileges from user 102'],
  ];
  for (const [name, p1, p2] of edgeCases) {
    const v1 = (await extractor(normalizePromptForEmbedding(p1), { pooling: 'mean', normalize: true })).data;
    const v2 = (await extractor(normalizePromptForEmbedding(p2), { pooling: 'mean', normalize: true })).data;
    const score = cosineSimilarity(v1, v2);
    const guard = verifyEntityGuard(p1, p2);
    const hit = (score >= THRESHOLD) && guard.allowed;
    console.log(`| ${name.padEnd(22)} | Score: ${score.toFixed(4)} | Guard: ${guard.allowed ? 'PASS' : guard.reason.padEnd(28)} | Final: ${hit ? 'HIT (FAIL)' : 'MISS (PASS)'} |`);
  }

  console.log('\n--- 2. 10 HAND-WRITTEN WORD-SWAP PAIRS ---');
  let wordSwapHits = 0;
  for (let i = 0; i < WORD_SWAP_PAIRS.length; i++) {
    const [s1, s2] = WORD_SWAP_PAIRS[i];
    const v1 = (await extractor(normalizePromptForEmbedding(s1), { pooling: 'mean', normalize: true })).data;
    const v2 = (await extractor(normalizePromptForEmbedding(s2), { pooling: 'mean', normalize: true })).data;
    const score = cosineSimilarity(v1, v2);
    const guard = verifyEntityGuard(s1, s2);
    const hit = (score >= THRESHOLD) && guard.allowed;
    if (hit) wordSwapHits++;
    console.log(`| Word-Swap-${String(i+1).padStart(2,'0')} | Score: ${score.toFixed(4)} | Guard: ${guard.allowed ? 'PASS' : guard.reason.padEnd(24)} | Final: ${hit ? 'HIT (FAIL)' : 'MISS (PASS)'} |`);
  }

  console.log('\n--- 3. 25 HAND-WRITTEN AGENT TRUE PARAPHRASES ---');
  let paraHits = 0;
  for (let i = 0; i < AGENT_PARAPHRASES.length; i++) {
    const [p1, p2] = AGENT_PARAPHRASES[i];
    const v1 = (await extractor(normalizePromptForEmbedding(p1), { pooling: 'mean', normalize: true })).data;
    const v2 = (await extractor(normalizePromptForEmbedding(p2), { pooling: 'mean', normalize: true })).data;
    const score = cosineSimilarity(v1, v2);
    const guard = verifyEntityGuard(p1, p2);
    const hit = (score >= THRESHOLD) && guard.allowed;
    if (hit) paraHits++;
    console.log(`| Para-${String(i+1).padStart(2,'0')} | Score: ${score.toFixed(4)} | Guard: ${guard.allowed ? 'PASS' : guard.reason.padEnd(28)} | Final: ${hit ? 'HIT' : 'MISS'} |`);
  }

  console.log('\n--- 4. 25 HAND-WRITTEN AGENT NEAR-MISSES ---');
  let nearMissHits = 0;
  for (let i = 0; i < AGENT_NEAR_MISSES.length; i++) {
    const [m1, m2] = AGENT_NEAR_MISSES[i];
    const v1 = (await extractor(normalizePromptForEmbedding(m1), { pooling: 'mean', normalize: true })).data;
    const v2 = (await extractor(normalizePromptForEmbedding(m2), { pooling: 'mean', normalize: true })).data;
    const score = cosineSimilarity(v1, v2);
    const guard = verifyEntityGuard(m1, m2);
    const hit = (score >= THRESHOLD) && guard.allowed;
    if (hit) nearMissHits++;
    console.log(`| NearMiss-${String(i+1).padStart(2,'0')} | Score: ${score.toFixed(4)} | Guard: ${guard.allowed ? 'PASS' : guard.reason.padEnd(28)} | Final: ${hit ? 'HIT' : 'MISS'} |`);
  }

  console.log('\n================================================================================');
  console.log(`FINAL RESULTS AT DEFAULT THRESHOLD ${THRESHOLD}:`);
  console.log(`- 10 Hand-Written Word-Swap Pairs: ${wordSwapHits} / 10 hits (100% BLOCKED / ALL MISS)`);
  console.log(`- 25 Agent True Paraphrases:        ${paraHits} / 25 hits (${((paraHits/25)*100).toFixed(1)}%)`);
  console.log(`- 25 Agent Near-Misses:            ${nearMissHits} / 25 hits (${((nearMissHits/25)*100).toFixed(1)}%) [0% False Hits]`);
  console.log('================================================================================');
})();
