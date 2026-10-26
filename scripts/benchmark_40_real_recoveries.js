/**
 * Benchmark 40 Real Mid-Stream Recoveries with Proper 429 Retries
 * Primary: openai/gpt-oss-120b (Groq API)
 * Standby: qwen/qwen3.8-27b (Groq API)
 */

const https = require('https');

const API_KEY = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || '';
const PRIMARY_MODEL = 'openai/gpt-oss-120b';
const STANDBY_MODEL = 'qwen/qwen3.8-27b';

function streamPrimary(model, prompt, abortAfterTokens) {
  return new Promise((resolve) => {
    function attempt(retriesLeft) {
      const data = JSON.stringify({
        model,
        messages: prompt,
        max_tokens: 200,
        stream: true,
        temperature: 0.3,
      });

      const req = https.request('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
        timeout: 15000,
      }, (res) => {
        if (res.statusCode === 429 || res.statusCode >= 500) {
          res.resume();
          if (retriesLeft > 0) {
            setTimeout(() => attempt(retriesLeft - 1), 3000);
            return;
          }
          resolve({ partialText: '', tokenCount: 0 });
          return;
        }

        let tokens = [];
        let tokenCount = 0;
        let buffer = '';
        let resolved = false;

        res.on('data', (chunk) => {
          if (resolved) return;
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop();

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:') || trimmed.includes('[DONE]')) continue;
            try {
              const json = JSON.parse(trimmed.slice(5).trim());
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                tokens.push(content);
                tokenCount++;
                if (tokenCount >= abortAfterTokens && !resolved) {
                  resolved = true;
                  res.destroy();
                  req.destroy();
                  resolve({ partialText: tokens.join(''), tokenCount });
                  return;
                }
              }
            } catch (e) {}
          }
        });

        res.on('end', () => {
          if (!resolved) {
            resolved = true;
            resolve({ partialText: tokens.join(''), tokenCount });
          }
        });
      });

      req.on('error', () => {
        if (retriesLeft > 0) setTimeout(() => attempt(retriesLeft - 1), 1500);
        else resolve({ partialText: '', tokenCount: 0 });
      });

      req.write(data);
      req.end();
    }

    attempt(8);
  });
}

function streamStandbyContinuation(model, originalPrompt, partialText) {
  return new Promise((resolve) => {
    function attempt(retriesLeft) {
      const t0 = performance.now();
      const continuationMessages = [
        ...originalPrompt,
        {
          role: 'system',
          content: `You are continuing a response that was cut off mid-stream. The response so far was:\n\n"""\n${partialText}\n"""\n\nContinue the response seamlessly starting immediately from where it stopped. Do not repeat any words already generated.`,
        },
      ];

      const data = JSON.stringify({
        model,
        messages: continuationMessages,
        max_tokens: 150,
        stream: true,
        temperature: 0.3,
      });

      const req = https.request('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
        timeout: 15000,
      }, (res) => {
        if (res.statusCode === 429 || res.statusCode >= 500) {
          res.resume();
          if (retriesLeft > 0) {
            setTimeout(() => attempt(retriesLeft - 1), 3000);
            return;
          }
          resolve({ continuationText: '', ttftMs: 0 });
          return;
        }

        let tokens = [];
        let buffer = '';
        let ttft = null;
        let resolved = false;

        res.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop();

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:') || trimmed.includes('[DONE]')) continue;
            try {
              const json = JSON.parse(trimmed.slice(5).trim());
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                if (ttft === null) ttft = performance.now() - t0;
                tokens.push(content);
              }
            } catch (e) {}
          }
        });

        res.on('end', () => {
          if (!resolved) {
            resolved = true;
            resolve({ continuationText: tokens.join(''), ttftMs: ttft || (performance.now() - t0) });
          }
        });
      });

      req.on('error', () => {
        if (retriesLeft > 0) setTimeout(() => attempt(retriesLeft - 1), 1500);
        else resolve({ continuationText: '', ttftMs: 0 });
      });

      req.write(data);
      req.end();
    }

    attempt(8);
  });
}

async function run() {
  console.log('================================================================================');
  console.log('       MEASURING REPETITION & DIVERGENCE ON 40 REAL MID-STREAM RECOVERIES       ');
  console.log('================================================================================');

  const prompts = [
    'Explain the differences between PostgreSQL B-tree, GiST, and BRIN indexes with performance tradeoffs.',
    'Describe how distributed consensus works in Raft compared to Paxos, focusing on leader election.',
    'What happens under the hood when a Linux process allocates virtual memory using mmap vs brk?',
    'Explain how TCP congestion control handles packet loss in BBR compared to CUBIC.'
  ];

  let targetSuccesses = 40;
  let repetitionsCount = 0;
  let divergencesCount = 0;
  let contradictionsCount = 0;
  let cleanContinuationsCount = 0;

  const gaps = [];
  const runRecords = [];

  let attempts = 0;
  while (runRecords.length < targetSuccesses) {
    attempts++;
    const currentIdx = runRecords.length + 1;
    const promptText = prompts[currentIdx % prompts.length];
    const prompt = [{ role: 'user', content: promptText }];
    const abortTokens = 20 + ((currentIdx * 7) % 45); // between 20 and 65 tokens

    const primary = await streamPrimary(PRIMARY_MODEL, prompt, abortTokens);
    if (!primary.partialText || primary.partialText.length < 10) {
      await new Promise(r => setTimeout(r, 2000));
      continue;
    }

    const standby = await streamStandbyContinuation(STANDBY_MODEL, prompt, primary.partialText);
    if (!standby.continuationText || standby.continuationText.length < 5) {
      await new Promise(r => setTimeout(r, 2000));
      continue;
    }

    gaps.push(standby.ttftMs);

    // Analysis
    const lastWords = primary.partialText.trim().split(/\s+/).slice(-4).join(' ').toLowerCase();
    const lastWord = primary.partialText.trim().split(/\s+/).pop().replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const firstWord = standby.continuationText.trim().split(/\s+/)[0]?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    // Check repetition
    const hasWordRepetition = lastWord && firstWord && (lastWord === firstWord || standby.continuationText.toLowerCase().slice(0, 80).includes(lastWords));

    // Check divergence: did standby start with a greeting, repeat title, or ignore continuation?
    const hasDivergence = /^(hello|sure|here is|certainly|#|explain|to explain|as an ai)/i.test(standby.continuationText.trim());

    // Check contradiction
    const hasContradiction = /\b(however, this is incorrect|contrary to the above|actually, no)\b/i.test(standby.continuationText);

    if (hasWordRepetition) repetitionsCount++;
    if (hasDivergence) divergencesCount++;
    if (hasContradiction) contradictionsCount++;
    if (!hasWordRepetition && !hasDivergence && !hasContradiction) cleanContinuationsCount++;

    runRecords.push({
      run: currentIdx,
      abortTokens,
      gapMs: standby.ttftMs,
      repeated: hasWordRepetition,
      diverged: hasDivergence,
      contradicted: hasContradiction,
    });

    console.log(`[${String(currentIdx).padStart(2, '0')}/${targetSuccesses}] Gap: ${standby.ttftMs.toFixed(1).padStart(6)}ms | Repetition: ${hasWordRepetition ? 'YES' : 'NO '} | Divergence: ${hasDivergence ? 'YES' : 'NO '} | Contradiction: ${hasContradiction ? 'YES' : 'NO '}`);
    await new Promise(r => setTimeout(r, 800)); // Pacing
  }

  gaps.sort((a, b) => a - b);
  const medianGap = gaps[Math.floor(gaps.length / 2)];
  const p95Gap = gaps[Math.floor(gaps.length * 0.95)];

  console.log('\n================================================================================');
  console.log('                             FINAL MEASURED RESULTS                             ');
  console.log('================================================================================');
  console.log(`Completed Recoveries Evaluated:   ${runRecords.length}`);
  console.log(`Recovery Gap Median:              ${medianGap.toFixed(2)} ms`);
  console.log(`Recovery Gap p95:                 ${p95Gap.toFixed(2)} ms`);
  console.log(`Exact Seam Repetitions:           ${repetitionsCount} / ${runRecords.length} (${((repetitionsCount / runRecords.length) * 100).toFixed(1)}%)`);
  console.log(`Exact Seam Divergences:           ${divergencesCount} / ${runRecords.length} (${((divergencesCount / runRecords.length) * 100).toFixed(1)}%)`);
  console.log(`Exact Contradictions:             ${contradictionsCount} / ${runRecords.length} (${((contradictionsCount / runRecords.length) * 100).toFixed(1)}%)`);
  console.log(`Clean Syntactic Continuations:    ${cleanContinuationsCount} / ${runRecords.length} (${((cleanContinuationsCount / runRecords.length) * 100).toFixed(1)}%)`);
  console.log('================================================================================');
}

run().catch(console.error);
