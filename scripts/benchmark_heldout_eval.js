/**
 * ================================================================================
 *          HELD-OUT EVALUATION BENCHMARK (ZERO-TUNING / FROZEN GUARDS)
 * ================================================================================
 * Evaluates frozen code commit 457811a on completely held-out datasets:
 * 1. 2,000 PAWS hard non-paraphrases (from 'test' split).
 * 2. 1,000 QQP non-duplicates (is_duplicate = 0 from 'validation' split).
 * 3. 500 fresh QQP true duplicates (is_duplicate = 1 from 'validation' split).
 *
 * Rules:
 * - NO code changes or tuning.
 * - Exact false-hit counts + Clopper-Pearson / Wilson 95% confidence upper bound.
 * - Exact true-hit rate on 500 fresh QQP duplicates.
 * ================================================================================
 */

const fs = require('fs');
const path = require('path');
const {
  normalizePromptForEmbedding,
  cosineSimilarity,
  verifyEntityGuard,
} = require('../apps/api/dist/gateway/semantic-cache.service.js');

const FROZEN_COMMIT = '0957468 (public: selixes-gateway)';

const pawsHeldoutPath = path.join(__dirname, 'data', 'heldout_paws_2000.json');
const qqpNonDupPath = path.join(__dirname, 'data', 'heldout_qqp_non_dup_1000.json');
const qqpDupPath = path.join(__dirname, 'data', 'heldout_qqp_dup_500.json');

const pawsHeldout = JSON.parse(fs.readFileSync(pawsHeldoutPath, 'utf8'));
const qqpNonDup = JSON.parse(fs.readFileSync(qqpNonDupPath, 'utf8'));
const qqpDup = JSON.parse(fs.readFileSync(qqpDupPath, 'utf8'));

function getTokenOverlap(s1, s2) {
  const t1 = s1.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  const t2 = s2.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  const maxLen = Math.max(t1.length, t2.length);
  if (maxLen === 0) return 0;
  const common = t1.filter((w) => t2.includes(w));
  return common.length / maxLen;
}

// Wilson score 95% upper bound for binomial proportion
function calculate95UpperConfidenceBound(k, n) {
  if (n === 0) return 0;
  if (k === 0) {
    // Exact Clopper-Pearson rule for 0 successes: 1 - (0.05)^(1/n)
    return 1 - Math.pow(0.05, 1 / n);
  }
  const z = 1.95996; // 95% two-sided z-score
  const p = k / n;
  const denominator = 1 + (z * z) / n;
  const center = p + (z * z) / (2 * n);
  const spread = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return Math.min(1.0, (center + spread) / denominator);
}

async function main() {
  const { pipeline, AutoTokenizer, AutoModelForSequenceClassification } = await import('@xenova/transformers');

  console.log('='.repeat(95));
  console.log('              HELD-OUT EVALUATION BENCHMARK (FROZEN GUARDS)');
  console.log('='.repeat(95));
  console.log(`Frozen Commit Hash : ${FROZEN_COMMIT}`);
  console.log(`Datasets Loaded    :`);
  console.log(`- Held-out PAWS Hard Non-Paraphrases : ${pawsHeldout.length} pairs (test split)`);
  console.log(`- Held-out QQP Non-Duplicates        : ${qqpNonDup.length} pairs (validation split)`);
  console.log(`- Fresh QQP True Duplicates          : ${qqpDup.length} pairs (validation split)`);
  console.log('='.repeat(95));

  console.log('\nLoading Stage 1 Bi-Encoder (Xenova/all-MiniLM-L6-v2)...');
  const biEncoder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

  console.log('Loading Stage 2 Cross-Encoder (cross-encoder/quora-distilroberta-base)...');
  const ceTokenizer = await AutoTokenizer.from_pretrained('cross-encoder/quora-distilroberta-base');
  const ceModel = await AutoModelForSequenceClassification.from_pretrained('cross-encoder/quora-distilroberta-base', { quantized: false });

  const sigmoid = (x) => 1 / (1 + Math.exp(-x));

  async function evaluatePair(p1, p2) {
    // Stage 0: Guard check (Frozen regex & entity order check)
    const guard = verifyEntityGuard(p1, p2);
    if (!guard.allowed) {
      return { allowed: false, reason: guard.reason, biScore: 0, ceScore: 0, hit: false };
    }

    // Stage 1: Bi-encoder cosine
    const v1 = (await biEncoder(normalizePromptForEmbedding(p1), { pooling: 'mean', normalize: true })).data;
    const v2 = (await biEncoder(normalizePromptForEmbedding(p2), { pooling: 'mean', normalize: true })).data;
    const biScore = cosineSimilarity(v1, v2);

    if (biScore < 0.70) {
      return { allowed: true, biScore, ceScore: 0, filteredByStage1: true, hit: false };
    }

    // Stage 2: Bidirectional cross-encoder
    const inAB = await ceTokenizer(p1, { text_pair: p2, padding: true, truncation: true });
    const { logits: logAB } = await ceModel(inAB);
    const ceAB = sigmoid(logAB.data[0]);

    const inBA = await ceTokenizer(p2, { text_pair: p1, padding: true, truncation: true });
    const { logits: logBA } = await ceModel(inBA);
    const ceBA = sigmoid(logBA.data[0]);

    const ceBi = Math.min(ceAB, ceBA);
    const overlap = getTokenOverlap(p1, p2);

    // Frozen adaptive threshold rule: overlap >= 70% requires >= 0.985, else >= 0.95
    const requiredThreshold = overlap >= 0.70 ? 0.985 : 0.95;
    const hit = ceBi >= requiredThreshold;

    return {
      allowed: true,
      biScore,
      ceScore: ceBi,
      overlap,
      hit,
      filteredByStage1: false,
    };
  }

  async function runSuite(name, pairs, isNegative) {
    console.log(`\nStarting evaluation of ${name} (${pairs.length} pairs)...`);
    let guardBlocked = 0;
    let stage1Filtered = 0;
    let hits = 0;
    const falseHitDetails = [];

    const startTime = Date.now();
    for (let i = 0; i < pairs.length; i++) {
      const [p1, p2] = pairs[i];
      const res = await evaluatePair(p1, p2);

      if (!res.allowed) {
        guardBlocked++;
      } else if (res.filteredByStage1) {
        stage1Filtered++;
      } else if (res.hit) {
        hits++;
        if (isNegative && falseHitDetails.length < 5) {
          falseHitDetails.push({
            idx: i,
            p1,
            p2,
            biScore: res.biScore,
            ceScore: res.ceScore,
            overlap: res.overlap,
          });
        }
      }

      if ((i + 1) % 100 === 0 || i === pairs.length - 1) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = ((i + 1) / elapsed).toFixed(1);
        process.stdout.write(`  Evaluated: ${i + 1} / ${pairs.length} pairs (${rate} pairs/sec) | Hits: ${hits} | Guards Blocked: ${guardBlocked}\r`);
      }
    }
    console.log();

    const rate = hits / pairs.length;
    const ub95 = calculate95UpperConfidenceBound(hits, pairs.length);

    return {
      name,
      total: pairs.length,
      guardBlocked,
      stage1Filtered,
      hits,
      rate,
      ub95,
      falseHitDetails,
    };
  }

  // 1. Evaluate 2,000 Held-Out PAWS Non-Paraphrases
  const pawsRes = await runSuite('Held-Out PAWS Hard Non-Paraphrases (test split)', pawsHeldout, true);

  // 2. Evaluate 1,000 Held-Out QQP Non-Duplicates
  const qqpNonDupRes = await runSuite('Held-Out QQP Non-Duplicates (val split)', qqpNonDup, true);

  // 3. Evaluate 500 Fresh QQP True Duplicates
  const qqpDupRes = await runSuite('Fresh QQP True Duplicates (val split)', qqpDup, false);

  console.log('\n' + '='.repeat(110));
  console.log('                      HELD-OUT EVALUATION RESULTS (FROZEN GUARDS)');
  console.log('='.repeat(110));
  console.log('Dataset Name                              | Total | Guard Block | Stage 1 Filt | Hits  | Hit Rate | 95% Upper Bound');
  console.log('-'.repeat(110));

  const printRow = (r) => {
    const nameStr = r.name.padEnd(41);
    const totStr = String(r.total).padStart(5);
    const gbStr = String(r.guardBlocked).padStart(11);
    const s1Str = String(r.stage1Filtered).padStart(12);
    const hitsStr = String(r.hits).padStart(5);
    const rateStr = `${(r.rate * 100).toFixed(2)}%`.padStart(8);
    const ubStr = `${(r.ub95 * 100).toFixed(2)}%`.padStart(15);
    console.log(`${nameStr} | ${totStr} | ${gbStr} | ${s1Str} | ${hitsStr} | ${rateStr} | ${ubStr}`);
  };

  printRow(pawsRes);
  printRow(qqpNonDupRes);
  printRow(qqpDupRes);
  console.log('='.repeat(110));

  console.log('\nDetailed Metrics:');
  console.log(`- Frozen Code Commit Hash                  : ${FROZEN_COMMIT}`);
  console.log(`- PAWS 2,000 Held-out False Hits           : ${pawsRes.hits} / 2000 (${(pawsRes.rate * 100).toFixed(2)}%)`);
  console.log(`- PAWS 2,000 95% Confidence Upper Bound    : ${(pawsRes.ub95 * 100).toFixed(2)}%`);
  console.log(`- QQP 1,000 Held-out False Hits            : ${qqpNonDupRes.hits} / 1000 (${(qqpNonDupRes.rate * 100).toFixed(2)}%)`);
  console.log(`- QQP 1,000 95% Confidence Upper Bound     : ${(qqpNonDupRes.ub95 * 100).toFixed(2)}%`);
  console.log(`- Fresh QQP 500 True Duplicates Hit Rate   : ${qqpDupRes.hits} / 500 (${(qqpDupRes.rate * 100).toFixed(2)}%)`);

  if (pawsRes.falseHitDetails.length > 0) {
    console.log('\nSample PAWS False Hits (Unfiltered):');
    pawsRes.falseHitDetails.forEach((d) => {
      console.log(`  [Idx ${d.idx}] biScore=${d.biScore.toFixed(4)}, ceBi=${d.ceScore.toFixed(4)}, overlap=${(d.overlap * 100).toFixed(1)}%`);
      console.log(`    P1: "${d.p1}"`);
      console.log(`    P2: "${d.p2}"`);
    });
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error in held-out benchmark:', err);
  process.exit(1);
});
