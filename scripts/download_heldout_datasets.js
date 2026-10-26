/**
 * Download held-out datasets for zero-leakage evaluation:
 * 1. 2,000 PAWS hard non-paraphrases from 'test' split (completely unseen in tuning).
 * 2. 1,000 QQP non-duplicates (label === 0) from 'validation' split.
 * 3. 500 fresh QQP duplicates (label === 1) from 'validation' split.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function fetchHuggingFaceRows(dataset, config, split, filterFn, targetCount) {
  const results = [];
  let offset = 0;
  const limit = 100;
  console.log(`[Download] Fetching ${dataset} [${split}] (target: ${targetCount})...`);

  while (results.length < targetCount) {
    const url = `https://datasets-server.huggingface.co/rows?dataset=${encodeURIComponent(dataset)}&config=${encodeURIComponent(config)}&split=${encodeURIComponent(split)}&offset=${offset}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
    }
    const data = await res.json();
    if (!data.rows || data.rows.length === 0) break;

    for (const r of data.rows) {
      const match = filterFn(r.row);
      if (match) {
        results.push(match);
        if (results.length >= targetCount) break;
      }
    }

    offset += limit;
    process.stdout.write(`  Offset: ${offset} | Collected: ${results.length} / ${targetCount}\r`);
  }
  console.log(`\n  Done: Collected ${results.length} pairs from ${dataset} [${split}].`);
  return results;
}

async function main() {
  const pawsHeldoutPath = path.join(DATA_DIR, 'heldout_paws_2000.json');
  const qqpNonDupPath = path.join(DATA_DIR, 'heldout_qqp_non_dup_1000.json');
  const qqpDupPath = path.join(DATA_DIR, 'heldout_qqp_dup_500.json');

  // 1. 2,000 PAWS non-paraphrases from 'test' split
  if (!fs.existsSync(pawsHeldoutPath)) {
    const paws = await fetchHuggingFaceRows(
      'google-research-datasets/paws',
      'labeled_final',
      'test',
      (row) => {
        if (row.label === 0 && row.sentence1 && row.sentence2) {
          return [row.sentence1.trim(), row.sentence2.trim()];
        }
        return null;
      },
      2000,
    );
    fs.writeFileSync(pawsHeldoutPath, JSON.stringify(paws, null, 2), 'utf8');
    console.log(`Saved ${paws.length} held-out PAWS pairs to ${pawsHeldoutPath}`);
  } else {
    console.log(`Held-out PAWS already cached at ${pawsHeldoutPath}`);
  }

  // 2. 1,000 QQP non-duplicates from 'validation' split
  if (!fs.existsSync(qqpNonDupPath)) {
    const qqpNonDup = await fetchHuggingFaceRows(
      'SetFit/qqp',
      'default',
      'validation',
      (row) => {
        if (row.label === 0 && row.text1 && row.text2) {
          return [row.text1.trim(), row.text2.trim()];
        }
        return null;
      },
      1000,
    );
    fs.writeFileSync(qqpNonDupPath, JSON.stringify(qqpNonDup, null, 2), 'utf8');
    console.log(`Saved ${qqpNonDup.length} held-out QQP non-duplicates to ${qqpNonDupPath}`);
  } else {
    console.log(`Held-out QQP non-duplicates already cached at ${qqpNonDupPath}`);
  }

  // 3. 500 fresh QQP duplicates from 'validation' split
  if (!fs.existsSync(qqpDupPath)) {
    const qqpDup = await fetchHuggingFaceRows(
      'SetFit/qqp',
      'default',
      'validation',
      (row) => {
        if (row.label === 1 && row.text1 && row.text2) {
          return [row.text1.trim(), row.text2.trim()];
        }
        return null;
      },
      500,
    );
    fs.writeFileSync(qqpDupPath, JSON.stringify(qqpDup, null, 2), 'utf8');
    console.log(`Saved ${qqpDup.length} held-out QQP duplicates to ${qqpDupPath}`);
  } else {
    console.log(`Held-out QQP duplicates already cached at ${qqpDupPath}`);
  }
}

main().catch((err) => {
  console.error('Fatal download error:', err);
  process.exit(1);
});
