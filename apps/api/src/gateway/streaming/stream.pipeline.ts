import { StreamChunk } from './stream.types';
import { Logger } from '@nestjs/common';

const logger = new Logger('PIIMaskStage');

export type StreamStage = (
  stream: AsyncGenerator<StreamChunk>,
) => AsyncGenerator<StreamChunk>;

export function composePipeline(
  initialStream: AsyncGenerator<StreamChunk>,
  stages: StreamStage[],
): AsyncGenerator<StreamChunk> {
  return stages.reduce((stream, stage) => stage(stream), initialStream);
}

// ── 1. PII Masking Stage ───────────────────────────────────────────────────
export function createPiiMaskStage(): StreamStage {
  const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const CREDIT_CARD_REGEX = /\b(?:\d[ -]*?){13,16}\b/g;
  const SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/g;
  const PASSPORT_REGEX = /\b[A-Z0-9]{9}\b/gi;
  const IBAN_REGEX = /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/gi;
  const DOB_REGEX = /\b(?:\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}|\d{4}[\/\.-]\d{1,2}[\/\.-]\d{1,2})\b/g;

  return async function* piiMaskStage(stream: AsyncGenerator<StreamChunk>) {
    let textBuffer = '';
    const bufferThreshold = 100;

    const redactAndLog = (text: string, regex: RegExp, label: string, replacement: string) => {
      let updated = text;
      const matches = text.match(regex);
      if (matches && matches.length > 0) {
        logger.warn(`[PII Audit Log] Intercepted and redacted ${matches.length} instance(s) of ${label}`);
        updated = text.replace(regex, replacement);
      }
      return updated;
    };

    for await (const chunk of stream) {
      if (chunk.type === 'token' && chunk.content) {
        textBuffer += chunk.content;

        let scrubbed = textBuffer;
        scrubbed = redactAndLog(scrubbed, EMAIL_REGEX, 'Email Address', '[REDACTED_EMAIL]');
        scrubbed = redactAndLog(scrubbed, CREDIT_CARD_REGEX, 'Credit Card Number', '[REDACTED_CARD]');
        scrubbed = redactAndLog(scrubbed, SSN_REGEX, 'Social Security Number (SSN)', '[REDACTED_SSN]');
        scrubbed = redactAndLog(scrubbed, PASSPORT_REGEX, 'Passport Number', '[REDACTED_PASSPORT]');
        scrubbed = redactAndLog(scrubbed, IBAN_REGEX, 'IBAN Bank Account', '[REDACTED_IBAN]');
        scrubbed = redactAndLog(scrubbed, DOB_REGEX, 'Date of Birth (DOB)', '[REDACTED_DOB]');

        textBuffer = scrubbed;

        if (textBuffer.length > bufferThreshold) {
          const emitLength = textBuffer.length - 40;
          const toEmit = textBuffer.substring(0, emitLength);
          textBuffer = textBuffer.substring(emitLength);
          yield { ...chunk, content: toEmit };
        }
      } else {
        if (textBuffer.length > 0) {
          yield { type: 'token', content: textBuffer };
          textBuffer = '';
        }
        yield chunk;
      }
    }

    if (textBuffer.length > 0) {
      yield { type: 'token', content: textBuffer };
    }
  };
}

// ── 2. Token Metering Stage ────────────────────────────────────────────────
export function createTokenMeteringStage(onMetered: (completionTokens: number) => void): StreamStage {
  return async function* tokenMeteringStage(stream: AsyncGenerator<StreamChunk>) {
    let generatedText = '';
    for await (const chunk of stream) {
      if (chunk.type === 'token' && chunk.content) {
        generatedText += chunk.content;
      }
      yield chunk;
    }
    const count = Math.ceil(generatedText.length / 4); // 4 chars per token average
    onMetered(count);
  };
}

export interface CacheCaptureState {
  enabled: boolean;
  bytes: number;
  chunks: string[];
}

// ── 3. Write-Behind Cache Capture Stage ────────────────────────────────────
export function createCacheCaptureStage(
  onComplete: (fullResponse: string) => Promise<void>,
  maxBytes: number = 512 * 1024, // 512 KB
): StreamStage {
  return async function* cacheCaptureStage(stream: AsyncGenerator<StreamChunk>) {
    const state: CacheCaptureState = {
      enabled: true,
      bytes: 0,
      chunks: [],
    };
    let success = false;

    for await (const chunk of stream) {
      if (state.enabled && chunk.type === 'token' && chunk.content) {
        const tokenBytes = Buffer.byteLength(chunk.content, 'utf8');
        state.bytes += tokenBytes;
        if (state.bytes > maxBytes) {
          state.enabled = false;
          state.chunks = []; // Aggressively dereference memory to let GC reclaim it
        } else {
          state.chunks.push(chunk.content);
        }
      }
      if (chunk.type === 'end') {
        success = true;
      }
      yield chunk;
    }

    if (success && state.enabled && state.chunks.length > 0) {
      const fullResponse = state.chunks.join('');
      state.chunks = []; // Dereference immediately after join
      onComplete(fullResponse).catch(() => {});
    }
  };
}

// ── 4. Latency & Telemetry Analytics Stage ─────────────────────────────────
export function createAnalyticsStage(
  startTime: number,
  onMetrics: (metrics: { ttftMs: number; generationMs: number }) => void,
): StreamStage {
  return async function* analyticsStage(stream: AsyncGenerator<StreamChunk>) {
    let ttftMs = 0;
    for await (const chunk of stream) {
      if (chunk.type === 'start' && chunk.latency?.ttftMs) {
        ttftMs = chunk.latency.ttftMs;
      }
      yield chunk;
    }
    const generationMs = Date.now() - startTime;
    onMetrics({ ttftMs, generationMs });
  };
}
