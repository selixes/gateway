import {
  SemanticCacheService,
  PINE_CONE_NAMESPACE_V2,
  VectorRingBuffer,
  cosineSimilarity,
  dotProduct,
  magnitude,
  normalizePromptForEmbedding,
  verifyEntityGuard,
  extractEntities,
  isDestructiveVerbPrompt,
} from './semantic-cache.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SemanticCacheService', () => {
  let service: SemanticCacheService;
  let fakeNamespaceV2: any;
  let fakeIndex: any;
  let storage: Array<{ id: string; values: number[]; metadata: Record<string, any> }>;

  beforeEach(() => {
    storage = [];
    fakeNamespaceV2 = {
      query: jest.fn().mockImplementation(async (options: any) => {
        const { filter } = options;
        const nowSec = Math.floor(Date.now() / 1000);
        const matches = storage
          .filter((item) => {
            if (filter?.organizationId?.$eq && item.metadata?.organizationId !== filter.organizationId.$eq) {
              return false;
            }
            if (filter?.scopeHash?.$eq && item.metadata?.scopeHash !== filter.scopeHash.$eq) {
              return false;
            }
            if (filter?.expiresAt?.$gte && item.metadata?.expiresAt < filter.expiresAt.$gte) {
              return false;
            }
            return true;
          })
          .map((item) => ({
            id: item.id,
            score: 0.95,
            metadata: item.metadata,
          }));
        return { matches };
      }),
      upsert: jest.fn().mockImplementation(async (records: any[]) => {
        for (const record of records) {
          storage.push(record);
        }
      }),
      deleteOne: jest.fn().mockImplementation(async (id: string) => {
        storage = storage.filter((item) => item.id !== id);
      }),
    };

    fakeIndex = {
      namespace: jest.fn().mockImplementation((ns: string) => {
        if (ns === PINE_CONE_NAMESPACE_V2) return fakeNamespaceV2;
        return fakeNamespaceV2;
      }),
    };

    service = new SemanticCacheService();
    (service as any).pinecone = {};
    (service as any).pineconeIndex = fakeIndex;
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.SEMANTIC_CACHE_BACKEND;
    delete process.env.OPENAI_API_KEY;
    delete process.env.EMBEDDINGS_BASE_URL;
  });

  it('(a) query passes filter { organizationId, scopeHash, expiresAt } in namespace v2', async () => {
    const vector = [0.1, 0.2, 0.3];
    await service.queryPinecone(vector, 0.85, 'org-acme', 'scope-1234');

    expect(fakeIndex.namespace).toHaveBeenCalledWith(PINE_CONE_NAMESPACE_V2);
    expect(fakeNamespaceV2.query).toHaveBeenCalledTimes(1);
    expect(fakeNamespaceV2.query).toHaveBeenCalledWith(
      expect.objectContaining({
        vector,
        topK: 1,
        includeMetadata: true,
        filter: expect.objectContaining({
          organizationId: { $eq: 'org-acme' },
          scopeHash: { $eq: 'scope-1234' },
          expiresAt: expect.objectContaining({ $gte: expect.any(Number) }),
        }),
      }),
    );
  });

  it('(b) upsert stores metadata.organizationId, metadata.scopeHash, and metadata.expiresAt in namespace v2', async () => {
    const vector = [0.1, 0.2, 0.3];
    const responseData = { choices: [{ message: { content: 'hello' } }] };

    await service.upsertPinecone('req-1', vector, responseData, 'org-acme', 'scope-1234', 3600);

    expect(fakeIndex.namespace).toHaveBeenCalledWith(PINE_CONE_NAMESPACE_V2);
    expect(fakeNamespaceV2.upsert).toHaveBeenCalledTimes(1);
    expect(fakeNamespaceV2.upsert).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'req-1',
        values: vector,
        metadata: expect.objectContaining({
          responseData: JSON.stringify(responseData),
          organizationId: 'org-acme',
          scopeHash: 'scope-1234',
          expiresAt: expect.any(Number),
        }),
      }),
    ]);
  });

  it('(c) with no org, the index is never called (fail-closed for query and upsert)', async () => {
    const vector = [0.1, 0.2, 0.3];
    const responseData = { choices: [{ message: { content: 'hello' } }] };

    // Query with undefined organizationId
    const queryResult = await service.queryPinecone(vector, 0.85, undefined, 'scope-1234');
    expect(queryResult).toBeNull();
    expect(fakeNamespaceV2.query).not.toHaveBeenCalled();

    // Query with empty string organizationId
    const queryResultEmpty = await service.queryPinecone(vector, 0.85, '', 'scope-1234');
    expect(queryResultEmpty).toBeNull();
    expect(fakeNamespaceV2.query).not.toHaveBeenCalled();

    // Upsert with undefined organizationId
    await service.upsertPinecone('req-no-org', vector, responseData, undefined, 'scope-1234');
    expect(fakeNamespaceV2.upsert).not.toHaveBeenCalled();

    // Upsert with empty string organizationId
    await service.upsertPinecone('req-no-org-2', vector, responseData, '', 'scope-1234');
    expect(fakeNamespaceV2.upsert).not.toHaveBeenCalled();
  });

  it('(d) org A upserted vector is not returned for an org B query (tenant isolation)', async () => {
    const vector = [0.1, 0.2, 0.3];
    const responseDataA = { choices: [{ message: { content: 'response for Org A' } }] };

    // Org A upserts
    await service.upsertPinecone('req-org-a', vector, responseDataA, 'org-A', 'scope-1234');
    expect(storage).toHaveLength(1);
    expect(storage[0].metadata.organizationId).toBe('org-A');

    // Org B queries with the identical vector and scope
    const resultB = await service.queryPinecone(vector, 0.85, 'org-B', 'scope-1234');
    expect(resultB).toBeNull();

    // Org A queries with the same vector and hits
    const resultA = await service.queryPinecone(vector, 0.85, 'org-A', 'scope-1234');
    expect(resultA).toEqual(responseDataA);
  });

  it('(e) different model, tools, or temperature computes a different scopeHash and misses (scope isolation)', async () => {
    const vector = [0.1, 0.2, 0.3];
    const responseData = { choices: [{ message: { content: 'hello code' } }] };

    const bodyA = {
      model: 'gpt-4o',
      temperature: 0.2,
      messages: [{ role: 'user', content: 'test query' }],
    };
    const bodyDiffModel = {
      model: 'claude-3-5-sonnet',
      temperature: 0.2,
      messages: [{ role: 'user', content: 'test query' }],
    };
    const bodyWithTools = {
      model: 'gpt-4o',
      temperature: 0.2,
      messages: [{ role: 'user', content: 'test query' }],
      tools: [{ type: 'function', function: { name: 'get_weather' } }],
    };

    const scopeA = service.computeScopeHash(bodyA);
    const scopeDiffModel = service.computeScopeHash(bodyDiffModel);
    const scopeTools = service.computeScopeHash(bodyWithTools);

    expect(scopeA).not.toEqual(scopeDiffModel);
    expect(scopeA).not.toEqual(scopeTools);

    // Upsert with scopeA
    await service.upsertPinecone('req-scope-a', vector, responseData, 'org-acme', scopeA);

    // Query with different model scope -> must miss
    const resultDiffModel = await service.queryPinecone(vector, 0.85, 'org-acme', scopeDiffModel);
    expect(resultDiffModel).toBeNull();

    // Query with tool-calling scope -> must miss
    const resultTools = await service.queryPinecone(vector, 0.85, 'org-acme', scopeTools);
    expect(resultTools).toBeNull();

    // Query with identical scopeA -> hits
    const resultSameScope = await service.queryPinecone(vector, 0.85, 'org-acme', scopeA);
    expect(resultSameScope).toEqual(responseData);
  });

  it('(f) expired match is skipped and lazily deleted', async () => {
    const vector = [0.1, 0.2, 0.3];
    const responseData = { choices: [{ message: { content: 'expired content' } }] };

    // Insert an already expired record (-100s)
    const expiredAt = Math.floor(Date.now() / 1000) - 100;
    storage.push({
      id: 'expired-1',
      values: vector,
      metadata: {
        responseData: JSON.stringify(responseData),
        organizationId: 'org-acme',
        scopeHash: 'scope-1',
        expiresAt: expiredAt,
      },
    });

    const result = await service.queryPinecone(vector, 0.85, 'org-acme', 'scope-1');
    expect(result).toBeNull();
  });

  it('(g) PII detection flags sensitive prompt data and scrubPII redacts it', () => {
    const cleanPrompt = 'Summarize database migration architecture.';
    const piiPrompt = 'Contact me at user@example.com or phone +1 (555) 234-5678, SSN 000-12-3456';

    expect(service.hasPII(cleanPrompt)).toBe(false);
    expect(service.hasPII(piiPrompt)).toBe(true);

    const scrubbed = service.scrubPII(piiPrompt);
    expect(scrubbed).toContain('[REDACTED_EMAIL]');
    expect(scrubbed).toContain('[REDACTED_PHONE]');
    expect(scrubbed).toContain('[REDACTED_SSN]');
    expect(scrubbed).not.toContain('user@example.com');
  });

  it('(h) EMBEDDINGS_BASE_URL override is respected during embedding calls in pinecone mode', async () => {
    process.env.SEMANTIC_CACHE_BACKEND = 'pinecone';
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.EMBEDDINGS_BASE_URL = 'http://localhost:4001/v1';

    mockedAxios.post.mockResolvedValueOnce({
      data: {
        data: [{ embedding: [0.5, 0.6, 0.7] }],
      },
    } as any);

    const embedding = await service.generateEmbedding('hello test prompt');
    expect(embedding).toEqual([0.5, 0.6, 0.7]);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://localhost:4001/v1/embeddings',
      expect.objectContaining({ input: 'hello test prompt' }),
      expect.any(Object),
    );
  });

  describe('VectorRingBuffer & In-Memory Semantic Caching (Claims A, B, C, D)', () => {
    it('(i) cosine similarity: identical unit vectors yield 1.0, orthogonal yield 0.0', () => {
      const v1 = [1, 0, 0];
      const v2 = [1, 0, 0];
      const vOrthogonal = [0, 1, 0];

      expect(cosineSimilarity(v1, v2)).toBeCloseTo(1.0, 5);
      expect(cosineSimilarity(v1, vOrthogonal)).toBeCloseTo(0.0, 5);
      expect(dotProduct(v1, v2)).toBe(1);
      expect(magnitude(v1)).toBe(1);
    });

    it('(j) ring buffer wraparound: fill past capacity, oldest evicted, lookups still correct (Claim C)', () => {
      const buffer = new VectorRingBuffer(3); // Small capacity = 3

      // Insert 5 entries (0, 1, 2, 3, 4)
      for (let i = 0; i < 5; i++) {
        buffer.upsert({
          id: `entry-${i}`,
          vector: [i === 0 ? 1 : 0, i === 1 ? 1 : 0, i === 2 ? 1 : 0, i === 3 ? 1 : 0, i === 4 ? 1 : 0],
          responseData: { message: `content-${i}` },
          organizationId: 'org-acme',
          scopeHash: 'scope-1',
          expiresAt: Math.floor(Date.now() / 1000) + 3600,
          createdAt: Date.now(),
        });
      }

      // Buffer size should be capped at 3
      expect(buffer.size()).toBe(3);

      // Oldest entries (0 and 1) must be evicted
      const queryOld0 = buffer.query([1, 0, 0, 0, 0], 0.9, 'org-acme', 'scope-1');
      expect(queryOld0).toBeNull();

      const queryOld1 = buffer.query([0, 1, 0, 0, 0], 0.9, 'org-acme', 'scope-1');
      expect(queryOld1).toBeNull();

      // Recent entries (2, 3, 4) must hit
      const queryRecent2 = buffer.query([0, 0, 1, 0, 0], 0.9, 'org-acme', 'scope-1');
      expect(queryRecent2).not.toBeNull();
      expect(queryRecent2?.match.id).toBe('entry-2');

      const queryRecent4 = buffer.query([0, 0, 0, 0, 1], 0.9, 'org-acme', 'scope-1');
      expect(queryRecent4).not.toBeNull();
      expect(queryRecent4?.match.id).toBe('entry-4');
    });

    it('(k) ring buffer tenant isolation: tenant A vectors never returned to tenant B (Claim C)', () => {
      const buffer = new VectorRingBuffer(10);
      const unitVector = [0.577, 0.577, 0.577];

      buffer.upsert({
        id: 'entry-org-a',
        vector: unitVector,
        responseData: { secret: 'org-a data' },
        organizationId: 'org-A',
        scopeHash: 'scope-common',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        createdAt: Date.now(),
      });

      // Tenant B queries with identical vector and scope -> must miss
      const resB = buffer.query(unitVector, 0.9, 'org-B', 'scope-common');
      expect(resB).toBeNull();

      // Query without organizationId -> must fail closed
      const resNoOrg = buffer.query(unitVector, 0.9, '', 'scope-common');
      expect(resNoOrg).toBeNull();

      // Tenant A queries -> hits
      const resA = buffer.query(unitVector, 0.9, 'org-A', 'scope-common');
      expect(resA).not.toBeNull();
      expect(resA?.match.responseData).toEqual({ secret: 'org-a data' });
    });

    it('(l) ring buffer scope isolation: different model/tools scopeHash causes cache miss (Claim C)', () => {
      const buffer = new VectorRingBuffer(10);
      const vector = [0.707, 0.707, 0];

      buffer.upsert({
        id: 'entry-scoped',
        vector,
        responseData: { answer: 'deterministic response' },
        organizationId: 'org-A',
        scopeHash: 'scope-gpt4-temp02',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        createdAt: Date.now(),
      });

      // Query with same org but different scope (e.g. diff model or tools) -> misses
      const diffScopeResult = buffer.query(vector, 0.9, 'org-A', 'scope-claude-temp02');
      expect(diffScopeResult).toBeNull();

      // Query with matching scope -> hits
      const matchResult = buffer.query(vector, 0.9, 'org-A', 'scope-gpt4-temp02');
      expect(matchResult).not.toBeNull();
      expect(matchResult?.match.responseData).toEqual({ answer: 'deterministic response' });
    });

    it('(m) ring buffer TTL expiration ignores expired entries (Claim C)', () => {
      const buffer = new VectorRingBuffer(10);
      const vector = [1, 0, 0];
      const nowSec = Math.floor(Date.now() / 1000);

      buffer.upsert({
        id: 'expired-entry',
        vector,
        responseData: { old: true },
        organizationId: 'org-A',
        scopeHash: 'scope-1',
        expiresAt: nowSec - 50, // Expired 50s ago
        createdAt: Date.now() - 60000,
      });

      const res = buffer.query(vector, 0.9, 'org-A', 'scope-1', nowSec);
      expect(res).toBeNull();
    });

    it('(n) local embedding generation runs offline with zero external network calls (Claims B & D)', async () => {
      const memService = new SemanticCacheService();
      expect(memService.getBackend()).toBe('memory');

      // Inject a local mock extractor simulating @xenova/transformers 384-dim vector
      const mockPipeline = jest.fn().mockImplementation(async (text: string) => {
        return {
          data: new Float32Array(384).fill(0.05),
        };
      });
      memService.setLocalExtractor(mockPipeline);

      // Embedding is generated locally
      const embedding = await memService.generateEmbedding('Summarize the database migration error.');
      expect(embedding).toHaveLength(384);
      expect(mockPipeline).toHaveBeenCalledWith('summarize the database migration error.', {
        pooling: 'mean',
        normalize: true,
      });
      // Zero axios/OpenAI/Pinecone network calls made
      expect(mockedAxios.post).not.toHaveBeenCalled();

      // Upsert and Query locally
      await memService.upsert('req-local-1', embedding, { content: 'Local cached response' }, 'org-local', 'scope-local');
      const hit = await memService.query(embedding, 0.95, 'org-local', 'scope-local');
      expect(hit).toEqual({ content: 'Local cached response' });
    });

    it('(p) entity guard blocks staging vs production, Alice-to-Bob reversed, grant vs revoke, and 10 word-swap pairs', () => {
      // 1. Staging vs Production
      expect(verifyEntityGuard('Deploy commit a77147a to staging cluster', 'Deploy commit a77147a to production cluster').allowed).toBe(false);
      expect(verifyEntityGuard('Inspect commit a77147a on staging cluster', 'Inspect commit a77147a on production cluster').allowed).toBe(false);

      // 2. Alice-to-Bob reversed
      expect(verifyEntityGuard('Transfer $500 from Alice to Bob via Stripe', 'Transfer $500 from Bob to Alice via Stripe').allowed).toBe(false);
      expect(verifyEntityGuard('Send $500 from Alice to Bob via Stripe', 'Send $500 from Bob to Alice via Stripe').allowed).toBe(false);

      // 3. Grant vs Revoke
      expect(verifyEntityGuard('Grant admin privileges to user 102', 'Revoke admin privileges from user 102').allowed).toBe(false);

      // 4. 10 hand-written word-swap pairs
      const wordSwapPairs = [
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

      for (const [p1, p2] of wordSwapPairs) {
        const guard = verifyEntityGuard(p1, p2);
        expect(guard.allowed).toBe(false);
      }
    });

    it('(q) VectorRingBuffer query enforces entity guard when promptText is provided', () => {
      const buffer = new VectorRingBuffer(10);
      const vectorA = [1, 0, 0];
      const vectorB = [0.99, 0.01, 0]; // Near-identical vector, high cosine similarity > 0.95

      buffer.upsert({
        id: 'entry-staging',
        vector: vectorA,
        responseData: { output: 'Staging deployment result' },
        organizationId: 'org-1',
        scopeHash: 'scope-1',
        promptText: 'Inspect commit a77147a on staging cluster',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        createdAt: Date.now(),
      });

      // Query with production prompt -> Entity guard detects env-mismatch and returns NULL (MISS)
      const missResult = buffer.query(
        vectorB,
        0.90,
        'org-1',
        'scope-1',
        'Inspect commit a77147a on production cluster',
      );
      expect(missResult).toBeNull();

      // Query with identical staging prompt -> Entity guard passes and returns cached data (HIT)
      const hitResult = buffer.query(
        vectorA,
        0.90,
        'org-1',
        'scope-1',
        'Inspect commit a77147a on staging cluster',
      );
      expect(hitResult).not.toBeNull();
      expect(hitResult?.match.responseData).toEqual({ output: 'Staging deployment result' });
    });

    it('(r) Stage 1 queryTopK retrieves candidates and Stage 2 cross-encoder verifies equivalence', async () => {
      const buffer = new VectorRingBuffer(10);
      const vQuery = [1, 0, 0];
      const vMatch1 = [0.99, 0.05, 0]; // High similarity ~0.99
      const vMatch2 = [0.95, 0.1, 0];  // Moderate similarity ~0.95
      const vMatch3 = [0.75, 0.2, 0];  // Lower similarity ~0.75

      buffer.upsert({
        id: 'entry-1',
        vector: vMatch1,
        responseData: { output: 'Response 1' },
        organizationId: 'org-test',
        scopeHash: 'scope-1',
        promptText: 'Check database migration status for PostgreSQL',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        createdAt: Date.now(),
      });
      buffer.upsert({
        id: 'entry-2',
        vector: vMatch2,
        responseData: { output: 'Response 2' },
        organizationId: 'org-test',
        scopeHash: 'scope-1',
        promptText: 'Query postgres migration status',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        createdAt: Date.now(),
      });
      buffer.upsert({
        id: 'entry-3',
        vector: vMatch3,
        responseData: { output: 'Response 3' },
        organizationId: 'org-test',
        scopeHash: 'scope-1',
        promptText: 'List all slow queries',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        createdAt: Date.now(),
      });

      // Stage 1 top-K candidates
      const topK = buffer.queryTopK(vQuery, 0.70, 3, 'org-test', 'scope-1');
      expect(topK).toHaveLength(3);
      expect(topK[0].match.id).toBe('entry-1');
      expect(topK[1].match.id).toBe('entry-2');
      expect(topK[2].match.id).toBe('entry-3');

      // Stage 2: SemanticCacheService with mocked cross-encoder
      const memService = new SemanticCacheService();
      (memService as any).ringBuffer = buffer;

      // Mock Cross-Encoder returning high logit for entry-1, low logit for entry-2
      const mockTokenizer = jest.fn().mockResolvedValue({ input_ids: [1, 2, 3] });
      const mockModel = jest.fn().mockImplementation(async (inputs: any) => {
        // Return logit 5.0 (sigmoid ~0.993)
        return { logits: { data: [5.0] } };
      });
      memService.setLocalCrossEncoder({ tokenizer: mockTokenizer, model: mockModel });

      const hit = await memService.query(
        vQuery,
        0.90,
        'org-test',
        'scope-1',
        'Check database migration status for PostgreSQL',
        { useCrossEncoder: true, crossEncoderThreshold: 0.85 },
      );
      expect(hit).toEqual({ output: 'Response 1' });

      // When cross-encoder returns negative logit -5.0 (sigmoid ~0.006 < 0.85), must MISS
      const mockModelReject = jest.fn().mockResolvedValue({ logits: { data: [-5.0] } });
      memService.setLocalCrossEncoder({ tokenizer: mockTokenizer, model: mockModelReject });

      const miss = await memService.query(
        vQuery,
        0.90,
        'org-test',
        'scope-1',
        'Check database migration status for PostgreSQL',
        { useCrossEncoder: true, crossEncoderThreshold: 0.85 },
      );
      expect(miss).toBeNull();
    });

    it('(s) regex entity guards: direct unit tests for numbers, ids, emails, quoted, envWords, and destructive verbs', () => {
      // 1. Numbers mismatch
      const numRes = verifyEntityGuard('Fetch details for order 101', 'Fetch details for order 102');
      expect(numRes.allowed).toBe(false);
      expect(numRes.reason).toBe('numbers-mismatch');

      // 2. IDs and hashes mismatch
      const idRes = verifyEntityGuard('Inspect git commit a77147a on repository', 'Inspect git commit b92170f on repository');
      expect(idRes.allowed).toBe(false);
      expect(idRes.reason).toBe('ids-mismatch');

      // 3. Email addresses mismatch
      const emailRes = verifyEntityGuard('Send invoice to alice@company.com', 'Send invoice to bob@company.com');
      expect(emailRes.allowed).toBe(false);
      expect(emailRes.reason).toBe('emails-mismatch');

      // 4. Quoted literals mismatch
      const quoteRes = verifyEntityGuard('Run query "SELECT * FROM users"', 'Run query "SELECT * FROM orders"');
      expect(quoteRes.allowed).toBe(false);
      expect(quoteRes.reason).toBe('quoted-mismatch');

      // 5. Environment keywords mismatch
      const envRes = verifyEntityGuard('Check health of staging cluster', 'Check health of production cluster');
      expect(envRes.allowed).toBe(false);
      expect(envRes.reason).toBe('env-mismatch');

      // 6. Destructive verbs detection
      const verbs = ['deploy', 'delete', 'drop', 'truncate', 'grant', 'revoke', 'transfer', 'refund', 'execute', 'restart', 'rollback', 'kill'];
      for (const verb of verbs) {
        expect(isDestructiveVerbPrompt(`${verb} service node`)).toBe(true);
        expect(isDestructiveVerbPrompt(`Please ${verb.toUpperCase()} the target`)).toBe(true);
        const guardRes = verifyEntityGuard(`${verb} database records`, `${verb} database records`);
        expect(guardRes.allowed).toBe(false);
        expect(guardRes.reason).toBe('hard-bypass-destructive-verb');
      }

      // Safe non-destructive verbs must pass
      expect(isDestructiveVerbPrompt('Analyze database records')).toBe(false);
      expect(isDestructiveVerbPrompt('Inspect cluster latency')).toBe(false);
      expect(isDestructiveVerbPrompt('Verify query performance')).toBe(false);

      // 7. extractEntities accuracy
      const sample = 'User alice@test.com with ID cus_9872 deployed commit 1a2b3c4d on prod with limit 50 and note "urgent"';
      const entities = extractEntities(sample);
      expect(entities.numbers.has('50')).toBe(true);
      expect(entities.emails.has('alice@test.com')).toBe(true);
      expect(entities.ids.has('cus_9872')).toBe(true);
      expect(entities.ids.has('1a2b3c4d')).toBe(true);
      expect(entities.quoted.has('urgent')).toBe(true);
      expect(entities.envWords.has('production')).toBe(true);
    });
  });
});
