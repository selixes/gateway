import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import { createHash } from 'crypto';
import { Pinecone } from '@pinecone-database/pinecone';

export const PINE_CONE_NAMESPACE_V2 = 'v2';
export const DEFAULT_SEMANTIC_CACHE_TTL_SECONDS = 86400; // 24 hours
export const DEFAULT_SEMANTIC_CACHE_CAPACITY = 1000;
export const DEFAULT_SEMANTIC_CACHE_THRESHOLD = 0.95;

export const DESTRUCTIVE_VERBS_REGEX = /\b(deploy|delete|drop|truncate|grant|revoke|transfer|refund|execute|restart|rollback|kill)\b/i;

export function isDestructiveVerbPrompt(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  return DESTRUCTIVE_VERBS_REGEX.test(text);
}

export interface ExtractedEntities {
  numbers: Set<string>;
  ids: Set<string>;
  emails: Set<string>;
  quoted: Set<string>;
  envWords: Set<string>;
}

export function extractEntities(text: string): ExtractedEntities {
  if (!text || typeof text !== 'string') {
    return {
      numbers: new Set(),
      ids: new Set(),
      emails: new Set(),
      quoted: new Set(),
      envWords: new Set(),
    };
  }

  // 1. Numbers
  const numbers = new Set((text.match(/\b\d+(?:\.\d+)?\b/g) || []).map((n) => n.trim()));

  // 2. IDs and hashes (hex hashes 6+, prefixed IDs like cus_123, ticket #123, key_live_99, a77147a)
  const idMatches = text.match(/(?:[a-z0-9_-]+_[a-z0-9_-]+|#[0-9]+|\b[0-9a-f]{6,64}\b)/gi) || [];
  const ids = new Set(idMatches.map((id) => id.toLowerCase().replace(/^[#]/, '')));

  // 3. Emails
  const emails = new Set(
    (text.match(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g) || []).map((e) => e.toLowerCase()),
  );

  // 4. Quoted strings
  const quotes: string[] = [];
  const qMatches = text.match(/"([^"]+)"|'([^']+)'|`([^`]+)`/g) || [];
  for (const q of qMatches) quotes.push(q.slice(1, -1).trim().toLowerCase());
  const quoted = new Set(quotes);

  // 5. Environment words (staging, production, prod, dev, development)
  const envMatches = (text.match(/\b(staging|production|prod|dev|development)\b/gi) || []).map((e) => {
    const el = e.toLowerCase();
    if (el === 'prod') return 'production';
    if (el === 'dev') return 'development';
    return el;
  });
  const envWords = new Set(envMatches);

  return { numbers, ids, emails, quoted, envWords };
}

export function setsEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}

function tokenizeTokens(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
}

function lcsLength(t1: string[], t2: string[]): number {
  const m = t1.length;
  const n = t2.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (t1[i - 1] === t2[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

function getBigrams(tokens: string[]): Set<string> {
  const bg = new Set<string>();
  for (let i = 0; i < tokens.length - 1; i++) {
    bg.add(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return bg;
}

function bigramJaccard(t1: string[], t2: string[]): number {
  const b1 = getBigrams(t1);
  const b2 = getBigrams(t2);
  let inter = 0;
  for (const b of b1) {
    if (b2.has(b)) inter++;
  }
  const union = new Set([...b1, ...b2]).size;
  return union === 0 ? 1 : inter / union;
}

export function extractCapitalizedNames(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  const matches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+\b/g) || [];
  return matches.map((m) => m.trim().toLowerCase());
}

export function verifyEntityGuard(
  promptA: string,
  promptB: string,
): { allowed: boolean; reason?: string } {
  // Hard bypass destructive/privileged verbs
  if (isDestructiveVerbPrompt(promptA) || isDestructiveVerbPrompt(promptB)) {
    return { allowed: false, reason: 'hard-bypass-destructive-verb' };
  }

  const eA = extractEntities(promptA);
  const eB = extractEntities(promptB);

  if (!setsEqual(eA.numbers, eB.numbers)) return { allowed: false, reason: 'numbers-mismatch' };
  if (!setsEqual(eA.ids, eB.ids)) return { allowed: false, reason: 'ids-mismatch' };
  if (!setsEqual(eA.emails, eB.emails)) return { allowed: false, reason: 'emails-mismatch' };
  if (!setsEqual(eA.quoted, eB.quoted)) return { allowed: false, reason: 'quoted-mismatch' };
  if (!setsEqual(eA.envWords, eB.envWords)) return { allowed: false, reason: 'env-mismatch' };

  // Check capitalized multi-word named entity order
  const namesA = extractCapitalizedNames(promptA);
  const namesB = extractCapitalizedNames(promptB);
  if (namesA.length >= 2 && namesB.length >= 2) {
    const sA = new Set(namesA);
    const sB = new Set(namesB);
    if (sA.size === sB.size && [...sA].every((n) => sB.has(n))) {
      if (namesA.join('|') !== namesB.join('|')) {
        return { allowed: false, reason: 'named-entity-order-inversion' };
      }
    }
  }

  // High ordered-token similarity check
  const tA = tokenizeTokens(promptA);
  const tB = tokenizeTokens(promptB);
  const maxLen = Math.max(tA.length, tB.length);
  if (maxLen > 0) {
    const common = tA.filter((w) => tB.includes(w));
    const overlapRatio = common.length / maxLen;
    if (overlapRatio >= 0.6) {
      const lcs = lcsLength(tA, tB);
      const lcsRatio = lcs / maxLen;
      const bgJaccard = bigramJaccard(tA, tB);
      if (lcsRatio < 0.85 || bgJaccard < 0.75) {
        return { allowed: false, reason: 'ordered-token-mismatch' };
      }
    }
  }

  return { allowed: true };
}

/**
 * Normalizes input prompt text prior to embedding generation:
 * - Lowercases text
 * - Expands common technical & database abbreviations
 * - Strips timestamps (ISO 8601, date formats, times)
 * - Strips IDs, UUIDs, hex hashes, and numeric identifiers
 * - Collapses repeated whitespace and trims
 */
export function normalizePromptForEmbedding(text: string): string {
  if (!text || typeof text !== 'string') return '';

  let normalized = text.toLowerCase();

  // 1. Expand common technical domain abbreviations
  const abbreviations: Record<string, string> = {
    '\\bdb\\b': 'database',
    '\\berr\\b': 'error',
    '\\bmsg\\b': 'message',
    '\\breq\\b': 'request',
    '\\bres\\b': 'response',
    '\\bauth\\b': 'authentication',
    '\\bconfig\\b': 'configuration',
    '\\bparams\\b': 'parameters',
    '\\bsql\\b': 'structured query language',
    '\\bstmt\\b': 'statement',
    '\\bconn\\b': 'connection',
    '\\bidx\\b': 'index',
  };
  for (const [pattern, replacement] of Object.entries(abbreviations)) {
    normalized = normalized.replace(new RegExp(pattern, 'g'), replacement);
  }

  // 2. Strip timestamps (ISO 8601, YYYY-MM-DD, HH:MM:SS, time-of-day)
  normalized = normalized
    .replace(/\b\d{4}-\d{2}-\d{2}[tT ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[zZ]|[+-]\d{2}:?\d{2})?\b/g, '')
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, '')
    .replace(/\b\d{1,2}:\d{2}(?:\:\d{2})?(?:\s*[ap]m)?\b/gi, '');

  // 3. Strip UUIDs, long hex hashes, and tagged IDs (id: 12345, #54321)
  normalized = normalized
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '')
    .replace(/\b[0-9a-f]{16,64}\b/gi, '')
    .replace(/(?:id|order|job|txn|session|user)[_#:\-\s]*\d+\b/gi, '')
    .replace(/\b\d{5,}\b/g, '');

  // 4. Collapse whitespace and trim
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

export const PII_PATTERNS = {
  EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  CREDIT_CARD: /\b(?:\d[ -]*?){13,16}\b/,
  PHONE: /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
  SSN: /\b\d{3}-\d{2}-\d{4}\b/,
  PASSPORT: /\b(?=[A-Za-z0-9]*\d)(?=[A-Za-z0-9]*[A-Za-z])[A-Za-z0-9]{8,9}\b/,
  IBAN: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/i,
  DOB: /\b(?:\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}|\d{4}[\/\.-]\d{1,2}[\/\.-]\d{1,2})\b/,
};

// -----------------------------------------------------------------------------
// Vector Mathematics Utilities
// -----------------------------------------------------------------------------
export function dotProduct(a: number[] | Float32Array, b: number[] | Float32Array): number {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

export function magnitude(v: number[] | Float32Array): number {
  let sum = 0;
  for (let i = 0; i < v.length; i++) {
    sum += v[i] * v[i];
  }
  return Math.sqrt(sum);
}

export function cosineSimilarity(a: number[] | Float32Array, b: number[] | Float32Array): number {
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  return dotProduct(a, b) / (magA * magB);
}

// -----------------------------------------------------------------------------
// In-Memory Vector Ring Buffer
// -----------------------------------------------------------------------------
export interface RingBufferEntry {
  id: string;
  vector: number[];
  responseData: any;
  organizationId: string;
  scopeHash: string;
  promptText?: string;
  expiresAt: number;
  createdAt: number;
}

export class VectorRingBuffer {
  private buffer: RingBufferEntry[];
  private pointer = 0;
  private count = 0;
  readonly capacity: number;

  constructor(capacity = DEFAULT_SEMANTIC_CACHE_CAPACITY) {
    this.capacity = capacity > 0 ? capacity : DEFAULT_SEMANTIC_CACHE_CAPACITY;
    this.buffer = new Array(this.capacity);
  }

  upsert(entry: RingBufferEntry): void {
    this.buffer[this.pointer] = entry;
    this.pointer = (this.pointer + 1) % this.capacity;
    if (this.count < this.capacity) {
      this.count++;
    }
  }

  query(
    queryVector: number[],
    threshold: number,
    organizationId: string,
    scopeHash?: string,
    promptText?: string,
    nowSec: number = Math.floor(Date.now() / 1000),
  ): { match: RingBufferEntry; score: number } | null {
    if (!organizationId) return null;
    let bestMatch: RingBufferEntry | null = null;
    let bestScore = -1;

    for (let i = 0; i < this.count; i++) {
      const item = this.buffer[i];
      if (!item) continue;

      // Tenant isolation: must strictly match organizationId
      if (item.organizationId !== organizationId) continue;

      // Scope isolation: if scopeHash is provided, must match
      if (scopeHash && item.scopeHash !== scopeHash) continue;

      // TTL expiration check: ignore expired entries
      if (item.expiresAt && item.expiresAt < nowSec) continue;

      // Entity guard: if promptText is provided and item has stored promptText
      if (promptText && item.promptText) {
        const guard = verifyEntityGuard(promptText, item.promptText);
        if (!guard.allowed) continue;
      }

      // Calculate cosine similarity
      const score = cosineSimilarity(queryVector, item.vector);
      if (score >= threshold && score > bestScore) {
        bestScore = score;
        bestMatch = item;
      }
    }

    if (bestMatch && bestScore >= threshold) {
      return { match: bestMatch, score: bestScore };
    }
    return null;
  }

  queryTopK(
    queryVector: number[],
    threshold: number,
    topK = 3,
    organizationId: string,
    scopeHash?: string,
    promptText?: string,
    nowSec: number = Math.floor(Date.now() / 1000),
  ): Array<{ match: RingBufferEntry; score: number }> {
    if (!organizationId) return [];
    const candidates: Array<{ match: RingBufferEntry; score: number }> = [];

    for (let i = 0; i < this.count; i++) {
      const item = this.buffer[i];
      if (!item) continue;

      // Tenant isolation: must strictly match organizationId
      if (item.organizationId !== organizationId) continue;

      // Scope isolation: if scopeHash is provided, must match
      if (scopeHash && item.scopeHash !== scopeHash) continue;

      // TTL expiration check: ignore expired entries
      if (item.expiresAt && item.expiresAt < nowSec) continue;

      // Entity guard: if promptText is provided and item has stored promptText
      if (promptText && item.promptText) {
        const guard = verifyEntityGuard(promptText, item.promptText);
        if (!guard.allowed) continue;
      }

      // Calculate cosine similarity
      const score = cosineSimilarity(queryVector, item.vector);
      if (score >= threshold) {
        candidates.push({ match: item, score });
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, topK);
  }

  size(): number {
    return this.count;
  }

  clear(): void {
    this.buffer = new Array(this.capacity);
    this.pointer = 0;
    this.count = 0;
  }
}

@Injectable()
export class SemanticCacheService implements OnModuleInit {
  private readonly logger = new Logger(SemanticCacheService.name);
  private pinecone: Pinecone | null = null;
  private pineconeIndex: any = null;
  private readonly ringBuffer: VectorRingBuffer;
  private localPipeline: any = null;
  private localPipelinePromise: Promise<any> | null = null;
  private crossEncoderTokenizer: any = null;
  private crossEncoderModel: any = null;
  private crossEncoderPromise: Promise<any> | null = null;

  constructor() {
    const capacity = parseInt(
      process.env.SEMANTIC_CACHE_CAPACITY || String(DEFAULT_SEMANTIC_CACHE_CAPACITY),
      10,
    );
    this.ringBuffer = new VectorRingBuffer(capacity);

    if (this.getBackend() === 'pinecone') {
      this.initPinecone();
    } else {
      this.logger.log(`[Semantic Cache] Initialized in-memory vector ring buffer (capacity: ${capacity})`);
    }
  }

  onModuleInit() {
    const backend = this.getBackend();
    if (backend === 'memory') {
      this.logger.log(`[Semantic Cache] Running in local in-memory mode. Outbound network egress = 0.`);
      return;
    }

    const isSemanticCacheRequested = process.env.SEMANTIC_CACHE_ENABLED === 'true';
    const hasPineconeKey = !!process.env.PINECONE_API_KEY;
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

    if (isSemanticCacheRequested && (!hasPineconeKey || !hasOpenAIKey)) {
      this.logger.warn(
        `[Semantic Cache Warning] SEMANTIC_CACHE_ENABLED=true with Pinecone backend, but missing keys: ` +
        `${!hasPineconeKey ? 'PINECONE_API_KEY ' : ''}${!hasOpenAIKey ? 'OPENAI_API_KEY' : ''}. ` +
        `Semantic cache requests will fail open to live upstream providers. Never returning fake/canned data.`,
      );
    }
  }

  getBackend(): 'memory' | 'pinecone' {
    return process.env.SEMANTIC_CACHE_BACKEND === 'pinecone' ? 'pinecone' : 'memory';
  }

  getRingBuffer(): VectorRingBuffer {
    return this.ringBuffer;
  }

  private initPinecone(): void {
    const apiKey = process.env.PINECONE_API_KEY;
    const indexName = process.env.PINECONE_INDEX || 'selixes-semantic-cache';
    const pineconeHost = process.env.PINECONE_HOST;

    if (apiKey) {
      try {
        this.pinecone = new Pinecone({ apiKey });
        this.pineconeIndex = pineconeHost
          ? this.pinecone.index(indexName, pineconeHost)
          : this.pinecone.index(indexName);
        this.logger.log(`Initialized Pinecone vector store on index: ${indexName} (namespace: ${PINE_CONE_NAMESPACE_V2})`);
      } catch (err: any) {
        this.logger.warn(`Failed to initialize Pinecone: ${err.message}`);
      }
    } else {
      this.logger.warn('PINECONE_API_KEY not set. Semantic caching is disabled.');
    }
  }

  isAvailable(): boolean {
    if (this.getBackend() === 'memory') {
      return true;
    }
    return this.pinecone !== null && this.pineconeIndex !== null;
  }

  isCrossEncoderEnabled(): boolean {
    return process.env.SEMANTIC_CACHE_CROSS_ENCODER === 'true';
  }

  /**
   * Computes a deterministic scope hash from parameters that affect the model's completion.
   * Scopes include: model, system prompt, tools/tool_choice, temperature, top_p, response_format, max_tokens.
   */
  computeScopeHash(body: Record<string, any>): string {
    const systemMessages = (body.messages ?? [])
      .filter((m: any) => m && m.role === 'system')
      .map((m: any) => m.content ?? '');
    const systemPrompt = [body.system, ...systemMessages].filter(Boolean).join('\n');

    const canonical = {
      model: body.model ?? '',
      systemPrompt,
      tools: body.tools ?? null,
      tool_choice: body.tool_choice ?? null,
      temperature: body.temperature ?? null,
      top_p: body.top_p ?? null,
      response_format: body.response_format ?? null,
      max_tokens: body.max_tokens ?? null,
    };

    return createHash('sha256').update(JSON.stringify(canonical)).digest('hex').slice(0, 16);
  }

  /**
   * Detects whether data contains any personally identifiable information (PII).
   */
  hasPII(data: any): boolean {
    if (data === null || data === undefined) return false;
    if (typeof data === 'string') {
      return (
        PII_PATTERNS.EMAIL.test(data) ||
        PII_PATTERNS.CREDIT_CARD.test(data) ||
        PII_PATTERNS.PHONE.test(data) ||
        PII_PATTERNS.SSN.test(data) ||
        PII_PATTERNS.PASSPORT.test(data) ||
        PII_PATTERNS.IBAN.test(data) ||
        PII_PATTERNS.DOB.test(data)
      );
    }
    if (Array.isArray(data)) {
      return data.some((item) => this.hasPII(item));
    }
    if (typeof data === 'object') {
      for (const [key, val] of Object.entries(data)) {
        if (/api_?key|password|secret|token|auth/i.test(key)) return true;
        if (this.hasPII(val)) return true;
      }
    }
    return false;
  }

  /**
   * Recursively scrubs PII from prompt text or response objects before storage.
   */
  scrubPII(data: any): any {
    if (data === null || data === undefined) return data;

    if (typeof data === 'string') {
      let result = data;
      result = result.replace(new RegExp(PII_PATTERNS.EMAIL.source, 'g'), '[REDACTED_EMAIL]');
      result = result.replace(new RegExp(PII_PATTERNS.CREDIT_CARD.source, 'g'), '[REDACTED_CARD]');
      result = result.replace(new RegExp(PII_PATTERNS.PHONE.source, 'g'), '[REDACTED_PHONE]');
      result = result.replace(new RegExp(PII_PATTERNS.SSN.source, 'g'), '[REDACTED_SSN]');
      result = result.replace(new RegExp(PII_PATTERNS.PASSPORT.source, 'gi'), '[REDACTED_PASSPORT]');
      result = result.replace(new RegExp(PII_PATTERNS.IBAN.source, 'gi'), '[REDACTED_IBAN]');
      result = result.replace(new RegExp(PII_PATTERNS.DOB.source, 'g'), '[REDACTED_DOB]');
      return result;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.scrubPII(item));
    }

    if (typeof data === 'object') {
      const scrubbed: Record<string, any> = {};
      for (const [key, val] of Object.entries(data)) {
        if (/api_?key|password|secret|token|auth/i.test(key)) {
          scrubbed[key] = '[REDACTED_CREDENTIAL]';
        } else {
          scrubbed[key] = this.scrubPII(val);
        }
      }
      return scrubbed;
    }

    return data;
  }

  /**
   * Inject or override local extractor pipeline (useful for testing and offline environments).
   */
  setLocalExtractor(pipeline: any): void {
    this.localPipeline = pipeline;
  }

  /**
   * Inject or override local cross-encoder model (useful for testing and offline environments).
   */
  setLocalCrossEncoder(ce: { tokenizer: any; model: any } | null): void {
    if (ce) {
      this.crossEncoderTokenizer = ce.tokenizer;
      this.crossEncoderModel = ce.model;
    } else {
      this.crossEncoderTokenizer = null;
      this.crossEncoderModel = null;
    }
  }

  /**
   * Lazy-loads local ONNX cross-encoder model via @xenova/transformers.
   */
  async getLocalCrossEncoder(): Promise<{ tokenizer: any; model: any } | null> {
    if (this.crossEncoderTokenizer && this.crossEncoderModel) {
      return { tokenizer: this.crossEncoderTokenizer, model: this.crossEncoderModel };
    }
    if (this.crossEncoderPromise) return this.crossEncoderPromise;

    this.crossEncoderPromise = (async () => {
      try {
        const dynamicImport = new Function('specifier', 'return import(specifier)');
        const { AutoTokenizer, AutoModelForSequenceClassification, env } = await dynamicImport('@xenova/transformers');

        // Prefer strictly local offline execution
        if (process.env.SEMANTIC_CACHE_OFFLINE === 'true' || process.env.NODE_ENV === 'production') {
          env.allowRemoteModels = false;
          env.allowLocalModels = true;
        }
        if (process.env.SEMANTIC_CACHE_LOCAL_MODEL_DIR) {
          env.localModelPath = process.env.SEMANTIC_CACHE_LOCAL_MODEL_DIR;
        }

        const modelId = process.env.SEMANTIC_CACHE_CROSS_ENCODER_MODEL || 'cross-encoder/quora-distilroberta-base';
        this.crossEncoderTokenizer = await AutoTokenizer.from_pretrained(modelId);
        this.crossEncoderModel = await AutoModelForSequenceClassification.from_pretrained(modelId, { quantized: false });
        return { tokenizer: this.crossEncoderTokenizer, model: this.crossEncoderModel };
      } catch (err: any) {
        this.logger.error(`Failed to load cross-encoder verifier: ${err.message}`);
        return null;
      } finally {
        this.crossEncoderPromise = null;
      }
    })();

    return this.crossEncoderPromise;
  }

  /**
   * Evaluates semantic equivalence between promptA and promptB using Stage 2 cross-encoder.
   * Returns sigmoid confidence score in [0, 1].
   */
  async scoreCrossEncoder(promptA: string, promptB: string): Promise<number | null> {
    const ce = await this.getLocalCrossEncoder();
    if (!ce) return null;
    try {
      const inputs = await ce.tokenizer(promptA, { text_pair: promptB, padding: true, truncation: true });
      const { logits } = await ce.model(inputs);
      const raw = logits.data[0];
      return 1 / (1 + Math.exp(-raw));
    } catch (err: any) {
      this.logger.error(`Cross-encoder scoring error: ${err.message}`);
      return null;
    }
  }

  /**
   * Lazy-loads local ONNX feature extraction pipeline via @xenova/transformers.
   */
  private async getLocalExtractor(): Promise<any> {
    if (this.localPipeline) return this.localPipeline;
    if (this.localPipelinePromise) return this.localPipelinePromise;

    this.localPipelinePromise = (async () => {
      try {
        const dynamicImport = new Function('specifier', 'return import(specifier)');
        const { pipeline, env } = await dynamicImport('@xenova/transformers');

        // Prefer strictly local offline execution
        if (process.env.SEMANTIC_CACHE_OFFLINE === 'true' || process.env.NODE_ENV === 'production') {
          env.allowRemoteModels = false;
          env.allowLocalModels = true;
        }
        if (process.env.SEMANTIC_CACHE_LOCAL_MODEL_DIR) {
          env.localModelPath = process.env.SEMANTIC_CACHE_LOCAL_MODEL_DIR;
        }

        const modelName = process.env.SEMANTIC_CACHE_LOCAL_MODEL || 'Xenova/all-MiniLM-L6-v2';
        this.localPipeline = await pipeline('feature-extraction', modelName);
        return this.localPipeline;
      } catch (err: any) {
        this.logger.error(`Failed to load local embedding pipeline: ${err.message}`);
        throw err;
      } finally {
        this.localPipelinePromise = null;
      }
    })();

    return this.localPipelinePromise;
  }

  /**
   * Generates a dense vector embedding.
   * If backend is 'memory', generates locally via @xenova/transformers (384-dimensional).
   * If backend is 'pinecone', generates via OpenAI text-embedding-3-small (1536-dimensional).
   * Applies prompt normalization before embedding by default.
   */
  async generateEmbedding(text: string, options: { normalize?: boolean } = {}): Promise<number[]> {
    const shouldNormalize = options.normalize !== false && process.env.SEMANTIC_CACHE_NORMALIZE !== 'false';
    const inputText = shouldNormalize ? normalizePromptForEmbedding(text) : text;

    if (this.getBackend() === 'memory') {
      const extractor = await this.getLocalExtractor();
      const output = await extractor(inputText, { pooling: 'mean', normalize: true });
      return Array.from(output.data);
    }

    // Pinecone backend: OpenAI embedding API
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY is required for Pinecone semantic cache embeddings');
    }

    const embeddingsBaseUrl = (process.env.EMBEDDINGS_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
    const endpoint = `${embeddingsBaseUrl}/embeddings`;

    try {
      const response = await axios.post(
        endpoint,
        {
          input: text,
          model: 'text-embedding-3-small',
        },
        {
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        },
      );

      return response.data.data[0].embedding;
    } catch (error: any) {
      this.logger.error(`Failed to generate embedding: ${error.message}`);
      throw error;
    }
  }

  /**
   * Unified query method across memory and pinecone backends.
   * Supports two-stage retrieval: Stage 1 bi-encoder candidates + Stage 2 cross-encoder verification.
   */
  async query(
    vector: number[],
    threshold: number,
    organizationId?: string,
    scopeHash?: string,
    promptText?: string,
    options: { useCrossEncoder?: boolean; crossEncoderThreshold?: number } = {},
  ): Promise<any | null> {
    if (!organizationId) {
      this.logger.warn('query invoked without organizationId: skipping query to prevent cross-tenant data leakage');
      return null;
    }

    const useCrossEncoder = options.useCrossEncoder ?? (process.env.SEMANTIC_CACHE_CROSS_ENCODER === 'true');
    const ceThreshold = options.crossEncoderThreshold ?? parseFloat(process.env.SEMANTIC_CACHE_CROSS_ENCODER_THRESHOLD || '0.85');

    if (this.getBackend() === 'memory') {
      if (!useCrossEncoder) {
        const result = this.ringBuffer.query(vector, threshold, organizationId, scopeHash, promptText);
        if (result) {
          this.logger.log(`[Semantic Cache Hit (Memory)] Score: ${result.score.toFixed(4)} >= ${threshold} (scope: ${scopeHash ?? 'any'})`);
          return result.match.responseData;
        }
        return null;
      }

      // Stage 1: bi-encoder top-3 candidates
      const stage1Threshold = Math.min(threshold, 0.70);
      const candidates = this.ringBuffer.queryTopK(vector, stage1Threshold, 3, organizationId, scopeHash, promptText);
      if (!candidates || candidates.length === 0) return null;

      // Stage 2: ONNX cross-encoder verification
      for (const candidate of candidates) {
        if (!promptText || !candidate.match.promptText) {
          if (candidate.score >= threshold) return candidate.match.responseData;
          continue;
        }
        const ceScore = await this.scoreCrossEncoder(promptText, candidate.match.promptText);
        if (ceScore !== null && ceScore >= ceThreshold) {
          this.logger.log(`[Semantic Cache Hit (Cross-Encoder)] CE Score: ${ceScore.toFixed(4)} >= ${ceThreshold} (Bi-encoder: ${candidate.score.toFixed(4)})`);
          return candidate.match.responseData;
        }
      }
      return null;
    }

    return this.queryPinecone(vector, threshold, organizationId, scopeHash, promptText);
  }

  /**
   * Unified upsert method across memory and pinecone backends.
   */
  async upsert(
    id: string,
    vector: number[],
    responseData: any,
    organizationId?: string,
    scopeHash?: string,
    ttlSeconds?: number,
    promptText?: string,
  ): Promise<void> {
    if (!organizationId) {
      this.logger.warn('upsert invoked without organizationId: skipping upsert to prevent un-scoped cache storage');
      return;
    }

    if (this.getBackend() === 'memory') {
      const configuredTtl = ttlSeconds ?? parseInt(process.env.SEMANTIC_CACHE_TTL_SECONDS || String(DEFAULT_SEMANTIC_CACHE_TTL_SECONDS), 10);
      const expiresAt = Math.floor(Date.now() / 1000) + configuredTtl;
      this.ringBuffer.upsert({
        id,
        vector,
        responseData,
        organizationId,
        scopeHash: scopeHash ?? 'global',
        promptText,
        expiresAt,
        createdAt: Date.now(),
      });
      this.logger.log(`Upserted semantic cache vector ${id} to in-memory ring buffer (scope: ${scopeHash ?? 'global'})`);
      return;
    }

    return this.upsertPinecone(id, vector, responseData, organizationId, scopeHash, ttlSeconds, promptText);
  }

  /**
   * Queries Pinecone for the closest vector within the caller's organization and matching scopeHash.
   * Enforces v2 namespace, TTL expiration check, and lazy eviction.
   */
  async queryPinecone(
    vector: number[],
    threshold: number,
    organizationId?: string,
    scopeHash?: string,
    promptText?: string,
  ): Promise<any | null> {
    if (!this.pineconeIndex) return null;
    if (!organizationId) {
      this.logger.warn('queryPinecone invoked without organizationId: skipping query to prevent cross-tenant data leakage');
      return null;
    }

    try {
      const targetNamespace = this.pineconeIndex.namespace
        ? this.pineconeIndex.namespace(PINE_CONE_NAMESPACE_V2)
        : this.pineconeIndex;

      const nowSec = Math.floor(Date.now() / 1000);
      const filter: Record<string, any> = {
        organizationId: { $eq: organizationId },
        expiresAt: { $gte: nowSec },
      };

      if (scopeHash) {
        filter.scopeHash = { $eq: scopeHash };
      }

      const queryOptions: any = {
        vector,
        topK: 1,
        includeMetadata: true,
        filter,
      };

      const result = await targetNamespace.query(queryOptions);

      if (result.matches && result.matches.length > 0) {
        const match = result.matches[0];

        if (match.metadata && match.metadata.expiresAt && match.metadata.expiresAt < nowSec) {
          this.logger.log(`[Semantic Cache] Vector ${match.id} expired at ${match.metadata.expiresAt} (now: ${nowSec}). Evicting lazily.`);
          if (targetNamespace.deleteOne) {
            targetNamespace.deleteOne(match.id).catch(() => {});
          }
          return null;
        }

        if (match.score && match.score >= threshold) {
          if (match.metadata && match.metadata.responseData) {
            if (promptText && match.metadata.promptText) {
              const guard = verifyEntityGuard(promptText, match.metadata.promptText as string);
              if (!guard.allowed) return null;
            }
            this.logger.log(`[Semantic Cache Hit] Score: ${match.score.toFixed(4)} >= ${threshold} (scope: ${scopeHash ?? 'any'})`);
            return JSON.parse(match.metadata.responseData as string);
          }
        }
      }
      return null;
    } catch (error: any) {
      this.logger.error(`Failed to query Pinecone: ${error.message}`);
      return null;
    }
  }

  /**
   * Upserts the generated vector and response to Pinecone in the 'v2' namespace with tenant and scope attribution.
   */
  async upsertPinecone(
    id: string,
    vector: number[],
    responseData: any,
    organizationId?: string,
    scopeHash?: string,
    ttlSeconds?: number,
    promptText?: string,
  ): Promise<void> {
    if (!this.pineconeIndex) return;
    if (!organizationId) {
      this.logger.warn('upsertPinecone invoked without organizationId: skipping upsert to prevent un-scoped cache storage');
      return;
    }

    try {
      const targetNamespace = this.pineconeIndex.namespace
        ? this.pineconeIndex.namespace(PINE_CONE_NAMESPACE_V2)
        : this.pineconeIndex;

      const configuredTtl = ttlSeconds ?? parseInt(process.env.SEMANTIC_CACHE_TTL_SECONDS || String(DEFAULT_SEMANTIC_CACHE_TTL_SECONDS), 10);
      const expiresAt = Math.floor(Date.now() / 1000) + configuredTtl;

      const metadata: Record<string, any> = {
        responseData: JSON.stringify(responseData),
        organizationId,
        scopeHash: scopeHash ?? 'global',
        promptText: promptText || '',
        expiresAt,
      };

      await targetNamespace.upsert([
        {
          id,
          values: vector,
          metadata,
        },
      ]);
      this.logger.log(`Upserted semantic cache vector ${id} to Pinecone (namespace: ${PINE_CONE_NAMESPACE_V2}, scope: ${scopeHash ?? 'global'})`);
    } catch (error: any) {
      this.logger.error(`Failed to upsert to Pinecone: ${error.message}`);
    }
  }
}
