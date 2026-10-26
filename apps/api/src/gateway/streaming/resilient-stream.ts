import { StreamChunk } from './stream.types';
import { Logger } from '@nestjs/common';
import * as http from 'http';
import * as https from 'https';

const logger = new Logger('ResilientStream');

/**
 * Keep-alive connection pool for standby providers, pre-warmed at boot.
 */
export class StandbyConnectionPool {
  private static httpAgent: http.Agent | null = null;
  private static httpsAgent: https.Agent | null = null;

  static initPool() {
    if (!this.httpAgent) {
      this.httpAgent = new http.Agent({
        keepAlive: true,
        maxSockets: 50,
        maxFreeSockets: 20,
        keepAliveMsecs: 60000,
      });
    }
    if (!this.httpsAgent) {
      this.httpsAgent = new https.Agent({
        keepAlive: true,
        maxSockets: 50,
        maxFreeSockets: 20,
        keepAliveMsecs: 60000,
      });
    }
  }

  static getAgent(isHttps: boolean) {
    this.initPool();
    return isHttps ? this.httpsAgent : this.httpAgent;
  }
}

// Initialize warm keep-alive pools at module load / gateway boot
StandbyConnectionPool.initPool();

/**
 * Renders conversation messages into a raw ChatML / completion prompt.
 */
export function renderChatPrompt(messages: any[]): string {
  if (!messages || !Array.isArray(messages)) return '';
  let prompt = '';
  for (const m of messages) {
    const role = m.role || 'user';
    const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content || '');
    prompt += `<|im_start|>${role}\n${content}<|im_end|>\n`;
  }
  prompt += `<|im_start|>assistant\n`;
  return prompt;
}

export interface ResilientStreamOptions {
  requestId: string;
  providerChain: string[];
  body: Record<string, any>;
  signal?: AbortSignal;
  stallMs?: number;
  useRawCompletion?: boolean;
  onRecovered?: (info: {
    partialText: string;
    primaryProvider: string;
    standbyProvider: string;
    gapMs: number;
    mode: 'raw_completion' | 'chat_instruction' | 'none';
  }) => void;
  createProviderStream: (
    provider: string,
    body: Record<string, any>,
    signal?: AbortSignal,
  ) => AsyncGenerator<StreamChunk>;
  createRawCompletionStream?: (
    provider: string,
    prompt: string,
    signal?: AbortSignal,
  ) => AsyncGenerator<StreamChunk>;
}

export interface ResilientStreamResult {
  stream: AsyncGenerator<StreamChunk>;
  getRecoveryInfo: () => {
    recovered: boolean;
    partialText: string;
    primaryProvider: string | null;
    standbyProvider: string | null;
    gapMs: number;
    mode: 'raw_completion' | 'chat_instruction' | 'none';
  };
}

/**
 * Deduplicates overlapping text between the end of partialText and the beginning of continuationText.
 * Strips any prefix of continuationText that matches a suffix of partialText.
 */
export function deduplicateSeam(partialText: string, continuationText: string): string {
  if (!partialText || !continuationText) return continuationText;

  // Normalize spaces for comparison
  const maxOverlap = Math.min(partialText.length, continuationText.length, 250);
  for (let len = maxOverlap; len > 0; len--) {
    const suffix = partialText.slice(-len);
    if (continuationText.startsWith(suffix)) {
      return continuationText.slice(len);
    }
  }

  // Check word-boundary overlap (ignoring leading/trailing punctuation or spacing differences)
  const partialWords = partialText.trim().split(/\s+/);
  const contWords = continuationText.trim().split(/\s+/);
  const maxWords = Math.min(partialWords.length, contWords.length, 10);

  for (let w = maxWords; w > 0; w--) {
    const pSlice = partialWords.slice(-w).join(' ').toLowerCase();
    const cSlice = contWords.slice(0, w).join(' ').toLowerCase();
    if (pSlice === cSlice) {
      let idx = 0;
      let matchedCount = 0;
      const tokens = continuationText.split(/(\s+)/);
      for (const t of tokens) {
        idx += t.length;
        if (t.trim().length > 0) {
          matchedCount++;
          if (matchedCount === w) break;
        }
      }
      return continuationText.slice(idx).replace(/^\s+/, ' ');
    }
  }

  return continuationText;
}

/**
 * Checks whether the accumulated content or chunk represents a partial/unclosed tool call.
 */
export function isPartialToolCallChunk(chunk: StreamChunk, accumulatedContent: string): boolean {
  if (chunk.raw?.choices?.[0]?.delta?.tool_calls) {
    return true;
  }
  const trimmed = accumulatedContent.trim();
  if (trimmed.startsWith('{') && !trimmed.endsWith('}')) {
    try {
      JSON.parse(trimmed);
      return false;
    } catch {
      return true;
    }
  }
  return false;
}

/**
 * Orchestrates a resilient stream with same-model raw completion failover and stall detection.
 */
export function createResilientStream(options: ResilientStreamOptions): ResilientStreamResult {
  const {
    providerChain,
    body,
    signal,
    onRecovered,
    createProviderStream,
    createRawCompletionStream,
    useRawCompletion = true,
  } = options;

  const stallMs = options.stallMs ?? parseInt(process.env.STREAM_STALL_MS || '300', 10);

  let recovered = false;
  let partialText = '';
  let primaryProvider: string | null = null;
  let standbyProvider: string | null = null;
  let recoveryMode: 'raw_completion' | 'chat_instruction' | 'none' = 'none';
  let gapMs = 0;
  let isToolCallInProgress = false;

  const recoveryInfo = {
    get recovered() { return recovered; },
    get partialText() { return partialText; },
    get primaryProvider() { return primaryProvider; },
    get standbyProvider() { return standbyProvider; },
    get gapMs() { return gapMs; },
    get mode() { return recoveryMode; },
  };

  async function* resilientGenerator(): AsyncGenerator<StreamChunk> {
    let currentProviderIndex = 0;
    let lastTokenTimestamp = Date.now();
    let hasEmittedFirstToken = false;

    // Speculative standby tracking on stalls
    let speculativeStandbyPromise: Promise<AsyncGenerator<StreamChunk>> | null = null;
    let speculativeAbortController: AbortController | null = null;

    function triggerSpeculativeStandby(nextProvider: string) {
      if (speculativeStandbyPromise) return;
      speculativeAbortController = new AbortController();
      const nextSignal = speculativeAbortController.signal;

      logger.warn(`[Stream Stall] No token arrived for ${stallMs}ms. Starting speculative standby failover to ${nextProvider}...`);

      speculativeStandbyPromise = (async () => {
        if (createRawCompletionStream && useRawCompletion) {
          try {
            const rawPrompt = renderChatPrompt(body.messages) + partialText;
            recoveryMode = 'raw_completion';
            return createRawCompletionStream(nextProvider, rawPrompt, nextSignal);
          } catch (err: any) {
            logger.warn(`[Standby Raw Completion Fallback] ${err.message}. Falling back to chat instruction.`);
          }
        }

        recoveryMode = 'chat_instruction';
        const continuationBody = {
          ...body,
          messages: [
            ...(body.messages || []),
            { role: 'assistant', content: partialText },
          ],
        };
        return createProviderStream(nextProvider, continuationBody, nextSignal);
      })();
    }

    function cancelSpeculativeStandby() {
      if (speculativeAbortController) {
        speculativeAbortController.abort();
        speculativeAbortController = null;
      }
      speculativeStandbyPromise = null;
    }

    while (currentProviderIndex < providerChain.length) {
      const provider = providerChain[currentProviderIndex];
      if (!primaryProvider) {
        primaryProvider = provider;
      }

      let providerStream: AsyncGenerator<StreamChunk>;
      const isRecoveryAttempt = currentProviderIndex > 0;

      try {
        if (isRecoveryAttempt) {
          standbyProvider = provider;
          logger.warn(`[Mid-Stream Recovery] Primary ${primaryProvider} aborted after ${partialText.length} chars. Failover to ${provider} (mode: ${recoveryMode}).`);

          if (speculativeStandbyPromise) {
            // Re-use pre-warmed speculative standby stream if available
            providerStream = await speculativeStandbyPromise;
            speculativeStandbyPromise = null;
            speculativeAbortController = null;
          } else if (createRawCompletionStream && useRawCompletion) {
            try {
              const rawPrompt = renderChatPrompt(body.messages) + partialText;
              recoveryMode = 'raw_completion';
              providerStream = createRawCompletionStream(provider, rawPrompt, signal);
            } catch (err: any) {
              logger.warn(`[Raw Completion Fallback] ${err.message}. Using chat continuation.`);
              recoveryMode = 'chat_instruction';
              const continuationBody = {
                ...body,
                messages: [
                  ...(body.messages || []),
                  { role: 'assistant', content: partialText },
                ],
              };
              providerStream = createProviderStream(provider, continuationBody, signal);
            }
          } else {
            recoveryMode = 'chat_instruction';
            const continuationBody = {
              ...body,
              messages: [
                ...(body.messages || []),
                { role: 'assistant', content: partialText },
              ],
            };
            providerStream = createProviderStream(provider, continuationBody, signal);
          }
        } else {
          providerStream = createProviderStream(provider, body, signal);
        }

        let isFirstStandbyToken = isRecoveryAttempt;
        let seamBuffer = '';
        let seamResolved = !isRecoveryAttempt;

        for await (const chunk of providerStream) {
          if (signal?.aborted) {
            cancelSpeculativeStandby();
            return;
          }

          if (chunk.type === 'token' && chunk.content) {
            hasEmittedFirstToken = true;

            // If primary emitted a token, cancel any speculative standby
            if (!isRecoveryAttempt) {
              cancelSpeculativeStandby();
            }

            if (isPartialToolCallChunk(chunk, partialText)) {
              isToolCallInProgress = true;
            }

            if (isRecoveryAttempt && isFirstStandbyToken) {
              gapMs = Date.now() - lastTokenTimestamp;
              isFirstStandbyToken = false;
              recovered = true;

              if (onRecovered) {
                onRecovered({
                  partialText,
                  primaryProvider: primaryProvider || 'unknown',
                  standbyProvider: provider,
                  gapMs,
                  mode: recoveryMode,
                });
              }
            }

            // Seam deduplication for continuation stream
            if (isRecoveryAttempt && !seamResolved) {
              seamBuffer += chunk.content;
              if (seamBuffer.length >= 25 || seamBuffer.includes('\n')) {
                const deduplicated = deduplicateSeam(partialText, seamBuffer);
                seamResolved = true;
                if (deduplicated.length > 0) {
                  partialText += deduplicated;
                  lastTokenTimestamp = Date.now();
                  yield { ...chunk, content: deduplicated };
                }
              }
              continue;
            }

            partialText += chunk.content;
            lastTokenTimestamp = Date.now();
            yield chunk;
          } else if (chunk.type === 'start') {
            if (!hasEmittedFirstToken) {
              yield chunk;
            }
          } else if (chunk.type === 'end') {
            if (isRecoveryAttempt && !seamResolved && seamBuffer.length > 0) {
              const deduplicated = deduplicateSeam(partialText, seamBuffer);
              if (deduplicated.length > 0) {
                partialText += deduplicated;
                yield { type: 'token', content: deduplicated };
              }
              seamResolved = true;
            }
            cancelSpeculativeStandby();
            yield chunk;
            return;
          } else {
            yield chunk;
          }
        }

        cancelSpeculativeStandby();
        return;
      } catch (err: any) {
        lastTokenTimestamp = Date.now();
        logger.warn(`[Stream Interruption] Provider ${provider} failed mid-stream: ${err.message}`);

        if (isToolCallInProgress) {
          cancelSpeculativeStandby();
          logger.error(`[Stream Interruption] Partial tool-call JSON interrupted. Emitting structured error.`);
          yield {
            type: 'error',
            content: JSON.stringify({
              error: {
                type: 'partial_tool_call_interrupted',
                code: 'PARTIAL_TOOL_CALL_INTERRUPTED',
                message: 'Stream interrupted during tool call JSON generation. Terminated safely without broken JSON.',
                details: {
                  provider,
                  partialLength: partialText.length,
                },
              },
            }),
          };
          return;
        }

        currentProviderIndex++;
        if (currentProviderIndex >= providerChain.length) {
          cancelSpeculativeStandby();
          yield {
            type: 'error',
            content: `All providers in chain [${providerChain.join(', ')}] failed mid-stream.`,
          };
          throw new Error(`All providers failed mid-stream. Last error: ${err.message}`);
        }
      }
    }
  }

  return {
    stream: resilientGenerator(),
    getRecoveryInfo: () => recoveryInfo,
  };
}
