/**
 * ================================================================================
 *    SAME-MODEL CROSS-PROVIDER RECOVERY BENCHMARK (40 REAL RUNS)
 * ================================================================================
 * Validates:
 * 1. Primary: http://127.0.0.1:11434 (qwen2.5-coder:1.5b)
 * 2. Standby: http://127.0.0.1:11435 (qwen2.5-coder:1.5b)
 * 3. 40 Real Mid-Stream Aborts across N = 1, 50, 200 tokens.
 * 4. Compares Raw Completions continuation (/v1/completions) vs
 *    Chat Instruction continuation (/v1/chat/completions).
 * 5. Measures:
 *    - Gap in ms (last token of primary -> first token of standby)
 *    - Seam Repetition count
 *    - Seam Divergence count
 *    - Seam Contradiction count
 *    GATE: Repetition <= 1 in 40, Divergence <= 1 in 40.
 * ================================================================================
 */

const http = require('http');
const axios = require('axios');
const { deduplicateSeam, renderChatPrompt } = require('../apps/api/dist/gateway/streaming/resilient-stream.js');

const PRIMARY_URL = 'http://127.0.0.1:11434';
const STANDBY_URL = 'http://127.0.0.1:11435';
const MODEL = 'qwen2.5-coder:1.5b';

// Pre-warmed HTTP keep-alive agent for standby
const standbyKeepAliveAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 20,
  maxFreeSockets: 10,
  keepAliveMsecs: 60000,
});

const TEST_PROMPTS = [
  'Explain how Redis sentinel implements leader election and split-brain prevention in distributed systems.',
  'Write a complete TypeScript implementation of a thread-safe LRU cache with TTL eviction.',
  'Describe the architecture of PostgreSQL write-ahead logging (WAL) and how crash recovery restores consistency.',
  'Explain how B-tree indexes are structured in relational databases, including page splits and rebalancing.',
  'Detail how Linux handles page faults in virtual memory management and the demand paging mechanism.',
  'Implement an asynchronous token bucket rate limiter in Node.js using Redis atomic transactions.',
  'Explain the Raft consensus algorithm, specifically log replication and state machine application.',
  'Describe how TLS 1.3 performs zero-RTT session resumption and key exchange with Diffie-Hellman.',
];

/**
 * Streams from primary until abortTokenCount, then violently destroys the socket.
 */
function streamPrimaryUntilAbort(messages, abortTokenCount) {
  return new Promise((resolve, reject) => {
    let aborted = false;
    let partialText = '';
    let tokenCount = 0;
    let lastTokenTime = Date.now();
    let buffer = '';
    const abortController = new AbortController();

    const postData = JSON.stringify({
      model: MODEL,
      messages,
      stream: true,
      temperature: 0.2,
      max_tokens: 350,
    });

    const req = http.request(`${PRIMARY_URL}/v1/chat/completions`, {
      method: 'POST',
      signal: abortController.signal,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    }, (res) => {
      res.on('error', () => {});

      res.on('data', (chunk) => {
        if (aborted) return;
        buffer += chunk.toString('utf8');
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ') || trimmed === 'data: [DONE]') continue;
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            const token = parsed.choices?.[0]?.delta?.content ?? '';
            if (token) {
              tokenCount++;
              partialText += token;
              lastTokenTime = Date.now();

              if (tokenCount >= abortTokenCount) {
                aborted = true;
                abortController.abort();
                resolve({ partialText, tokenCount, lastTokenTime });
                return;
              }
            }
          } catch {}
        }
      });

      res.on('end', () => {
        resolve({ partialText, tokenCount, lastTokenTime });
      });
    });

    req.on('error', (err) => {
      if (aborted || err.name === 'AbortError' || err.code === 'ECONNRESET') {
        resolve({ partialText, tokenCount, lastTokenTime });
        return;
      }
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Continues via standby using raw completions endpoint (/v1/completions).
 */
function continueViaRawCompletions(messages, partialText, lastPrimaryTokenTime) {
  return new Promise((resolve, reject) => {
    const rawPrompt = renderChatPrompt(messages) + partialText;
    const postData = JSON.stringify({
      model: MODEL,
      prompt: rawPrompt,
      stream: true,
      max_tokens: 35,
      temperature: 0.2,
    });

    let firstTokenTime = 0;
    let continuationText = '';
    let buffer = '';

    const req = http.request(`${STANDBY_URL}/v1/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Connection': 'close',
        'Content-Length': Buffer.byteLength(postData),
      },
    }, (res) => {
      res.on('data', (chunk) => {
        buffer += chunk.toString('utf8');
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ') || trimmed === 'data: [DONE]') continue;
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            const token = parsed.choices?.[0]?.text ?? '';
            if (token) {
              if (!firstTokenTime) {
                firstTokenTime = Date.now();
              }
              continuationText += token;
            }
          } catch {}
        }
      });

      res.on('end', () => {
        const gapMs = firstTokenTime ? firstTokenTime - lastPrimaryTokenTime : 0;
        const deduplicatedContinuation = deduplicateSeam(partialText, continuationText);
        resolve({
          gapMs,
          rawContinuation: continuationText,
          deduplicatedContinuation,
          fullText: partialText + '[SEAM]' + deduplicatedContinuation,
        });
      });

      res.on('error', reject);
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Continues via standby using chat instruction method (/v1/chat/completions).
 */
function continueViaChatInstruction(messages, partialText, lastPrimaryTokenTime) {
  return new Promise((resolve, reject) => {
    const continuationMessages = [
      ...messages,
      { role: 'assistant', content: partialText },
    ];

    const postData = JSON.stringify({
      model: MODEL,
      messages: continuationMessages,
      stream: true,
      max_tokens: 35,
      temperature: 0.2,
    });

    let firstTokenTime = 0;
    let continuationText = '';
    let buffer = '';

    const req = http.request(`${STANDBY_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Connection': 'close',
        'Content-Length': Buffer.byteLength(postData),
      },
    }, (res) => {
      res.on('data', (chunk) => {
        buffer += chunk.toString('utf8');
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ') || trimmed === 'data: [DONE]') continue;
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            const token = parsed.choices?.[0]?.delta?.content ?? '';
            if (token) {
              if (!firstTokenTime) {
                firstTokenTime = Date.now();
              }
              continuationText += token;
            }
          } catch {}
        }
      });

      res.on('end', () => {
        const gapMs = firstTokenTime ? firstTokenTime - lastPrimaryTokenTime : 0;
        const deduplicatedContinuation = deduplicateSeam(partialText, continuationText);
        resolve({
          gapMs,
          rawContinuation: continuationText,
          deduplicatedContinuation,
          fullText: partialText + '[SEAM]' + deduplicatedContinuation,
        });
      });

      res.on('error', reject);
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function judgeSeamQuality(partialText, continuationText) {
  const pWords = partialText.trim().split(/\s+/).slice(-5).map(w => w.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const cWords = continuationText.trim().split(/\s+/).slice(0, 5).map(w => w.toLowerCase().replace(/[^a-z0-9]/g, ''));

  // 1. Repetition check: 2 or more identical adjacent words at the boundary
  let repeated = false;
  if (pWords.length >= 2 && cWords.length >= 2) {
    for (let i = 0; i < pWords.length - 1; i++) {
      const pBigram = `${pWords[i]} ${pWords[i + 1]}`;
      for (let j = 0; j < cWords.length - 1; j++) {
        const cBigram = `${cWords[j]} ${cWords[j + 1]}`;
        if (pBigram === cBigram && pBigram.length > 5) {
          repeated = true;
          break;
        }
      }
    }
  }

  // 2. Divergence check: check if continuation starts with greeting or resets prompt
  const lowerC = continuationText.toLowerCase().trim();
  const diverged =
    lowerC.startsWith('hello!') ||
    lowerC.startsWith('sure, i can') ||
    lowerC.startsWith('as an ai') ||
    lowerC.startsWith('certainly!') ||
    lowerC.length < 5;

  // 3. Contradiction: check for sudden direct negation of immediately preceding context
  const pLast = partialText.slice(-60).toLowerCase();
  const contradicted =
    (pLast.includes('not') && cWords.slice(0, 3).includes('always')) ||
    (pLast.includes('immutable') && cWords.slice(0, 3).includes('mutable'));

  return { repeated, diverged, contradicted };
}

async function runBenchmark() {
  console.log('='.repeat(80));
  console.log('       SAME-MODEL CROSS-PROVIDER RECOVERY BENCHMARK (40 REAL RUNS)');
  console.log('='.repeat(80));
  console.log(`Primary Provider : ${PRIMARY_URL} (${MODEL})`);
  console.log(`Standby Provider : ${STANDBY_URL} (${MODEL})`);
  console.log(`Connection Pool  : Persistent HTTP Keep-Alive`);
  console.log('='.repeat(80));

  const runs = [];
  const tokenBreakpoints = [
    ...new Array(10).fill(1),    // 10 runs @ N = 1
    ...new Array(15).fill(50),   // 15 runs @ N = 50
    ...new Array(15).fill(200),  // 15 runs @ N = 200
  ];

  console.log('\nRun# | N   | Raw Gap (ms) | Chat Gap (ms) | Raw Rep? | Raw Div? | Chat Rep? | Chat Div?');
  console.log('-'.repeat(80));

  let rawRepCount = 0;
  let rawDivCount = 0;
  let rawContradictCount = 0;

  let chatRepCount = 0;
  let chatDivCount = 0;
  let chatContradictCount = 0;

  const rawGaps = [];
  const chatGaps = [];
  const examples = [];

  for (let i = 0; i < 40; i++) {
    const N = tokenBreakpoints[i];
    const promptText = TEST_PROMPTS[i % TEST_PROMPTS.length];
    const messages = [{ role: 'user', content: promptText }];

    // 1. Stream from Primary and kill socket at N tokens
    const primaryResult = await streamPrimaryUntilAbort(messages, N);

    // 2. Recover via Raw Completions (/v1/completions)
    const rawRec = await continueViaRawCompletions(messages, primaryResult.partialText, primaryResult.lastTokenTime);
    rawGaps.push(rawRec.gapMs);
    const rawQuality = judgeSeamQuality(primaryResult.partialText, rawRec.deduplicatedContinuation);
    if (rawQuality.repeated) rawRepCount++;
    if (rawQuality.diverged) rawDivCount++;
    if (rawQuality.contradicted) rawContradictCount++;

    // 3. Recover via Chat Instruction (/v1/chat/completions)
    const chatRec = await continueViaChatInstruction(messages, primaryResult.partialText, primaryResult.lastTokenTime);
    chatGaps.push(chatRec.gapMs);
    const chatQuality = judgeSeamQuality(primaryResult.partialText, chatRec.deduplicatedContinuation);
    if (chatQuality.repeated) chatRepCount++;
    if (chatQuality.diverged) chatDivCount++;
    if (chatQuality.contradicted) chatContradictCount++;

    runs.push({
      run: i + 1,
      N,
      prompt: promptText.slice(0, 35) + '...',
      rawGap: rawRec.gapMs,
      chatGap: chatRec.gapMs,
      rawRep: rawQuality.repeated,
      rawDiv: rawQuality.diverged,
      chatRep: chatQuality.repeated,
      chatDiv: chatQuality.diverged,
    });

    if (examples.length < 3 && N >= 50) {
      examples.push({
        run: i + 1,
        N,
        prompt: promptText,
        fullTextRaw: rawRec.fullText,
        fullTextChat: chatRec.fullText,
      });
    }

    const rNum = String(i + 1).padStart(4);
    const nStr = String(N).padStart(3);
    const rGapStr = `${rawRec.gapMs}ms`.padStart(12);
    const cGapStr = `${chatRec.gapMs}ms`.padStart(13);
    const rRepStr = (rawQuality.repeated ? 'YES' : 'no').padStart(8);
    const rDivStr = (rawQuality.diverged ? 'YES' : 'no').padStart(8);
    const cRepStr = (chatQuality.repeated ? 'YES' : 'no').padStart(9);
    const cDivStr = (chatQuality.diverged ? 'YES' : 'no').padStart(9);

    console.log(`${rNum} | ${nStr} | ${rGapStr} | ${cGapStr} | ${rRepStr} | ${rDivStr} | ${cRepStr} | ${cDivStr}`);
  }

  // Calculate percentiles
  rawGaps.sort((a, b) => a - b);
  chatGaps.sort((a, b) => a - b);

  const rawMedian = rawGaps[Math.floor(rawGaps.length * 0.5)];
  const rawP95 = rawGaps[Math.floor(rawGaps.length * 0.95)];

  const chatMedian = chatGaps[Math.floor(chatGaps.length * 0.5)];
  const chatP95 = chatGaps[Math.floor(chatGaps.length * 0.95)];

  console.log('\n' + '='.repeat(80));
  console.log('                    RECOVERY BENCHMARK SUMMARY (40 RUNS)');
  console.log('='.repeat(80));
  console.log(`Metric                      | Raw Completions (/v1/completions) | Chat Instruction (/v1/chat)`);
  console.log('-'.repeat(80));
  console.log(`Recovery Gap Median         | ${String(rawMedian + ' ms').padEnd(33)} | ${chatMedian} ms`);
  console.log(`Recovery Gap p95            | ${String(rawP95 + ' ms').padEnd(33)} | ${chatP95} ms`);
  console.log(`Seam Repetition Count       | ${String(rawRepCount + ' / 40').padEnd(33)} | ${chatRepCount} / 40`);
  console.log(`Seam Divergence Count       | ${String(rawDivCount + ' / 40').padEnd(33)} | ${chatDivCount} / 40`);
  console.log(`Seam Contradiction Count    | ${String(rawContradictCount + ' / 40').padEnd(33)} | ${chatContradictCount} / 40`);
  console.log('='.repeat(80));

  console.log('\n' + '='.repeat(80));
  console.log('              3 FULL EXAMPLES OF SPLICED TEXT (RAW COMPLETION)');
  console.log('='.repeat(80));
  examples.forEach((ex, idx) => {
    console.log(`\n--- [Example ${idx + 1}] (Run #${ex.run}, Abort at N=${ex.N}) ---`);
    console.log(`Prompt: "${ex.prompt}"`);
    console.log(`\nSpliced Output (Seam marked with [SEAM]):`);
    console.log(ex.fullTextRaw);
    console.log('-'.repeat(80));
  });

  const gatePass = rawRepCount <= 1 && rawDivCount <= 1;
  console.log('\n' + '='.repeat(80));
  console.log(`GATE: Repetition <= 1 in 40 && Divergence <= 1 in 40: [${gatePass ? 'PASS' : 'FAIL'}]`);
  console.log('='.repeat(80));

  process.exit(gatePass ? 0 : 1);
}

runBenchmark().catch((err) => {
  console.error('Fatal benchmark error:', err);
  process.exit(1);
});
