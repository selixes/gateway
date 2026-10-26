/**
 * Download real QQP (500 duplicates) and real PAWS (500 non-paraphrases) from Hugging Face Datasets API.
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
  console.log(`[Download] Fetching ${dataset} (target: ${targetCount})...`);

  while (results.length < targetCount && offset < 5000) {
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
    console.log(`  Fetched offset ${offset}, collected ${results.length}/${targetCount} matching pairs.`);
  }

  return results;
}

async function main() {
  const qqpPath = path.join(DATA_DIR, 'real_qqp_duplicates_500.json');
  const pawsPath = path.join(DATA_DIR, 'real_paws_non_paraphrases_500.json');

  if (!fs.existsSync(qqpPath)) {
    // SetFit/qqp: label 1 is duplicate
    const qqp = await fetchHuggingFaceRows(
      'SetFit/qqp',
      'default',
      'train',
      (row) => {
        if (row.label === 1 && row.text1 && row.text2) {
          return [row.text1.trim(), row.text2.trim()];
        }
        return null;
      },
      500,
    );
    fs.writeFileSync(qqpPath, JSON.stringify(qqp, null, 2), 'utf8');
    console.log(`Saved ${qqp.length} real QQP duplicates to ${qqpPath}`);
  } else {
    console.log(`QQP dataset already cached at ${qqpPath}`);
  }

  if (!fs.existsSync(pawsPath)) {
    // google-research-datasets/paws: label 0 is non-paraphrase (hard negative)
    const paws = await fetchHuggingFaceRows(
      'google-research-datasets/paws',
      'labeled_final',
      'train',
      (row) => {
        if (row.label === 0 && row.sentence1 && row.sentence2) {
          return [row.sentence1.trim(), row.sentence2.trim()];
        }
        return null;
      },
      500,
    );
    fs.writeFileSync(pawsPath, JSON.stringify(paws, null, 2), 'utf8');
    console.log(`Saved ${paws.length} real PAWS non-paraphrases to ${pawsPath}`);
  } else {
    console.log(`PAWS dataset already cached at ${pawsPath}`);
  }
}

main().catch((err) => {
  console.error('Fatal download error:', err);
  process.exit(1);
});
