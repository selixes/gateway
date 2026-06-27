// Mock uuid since v10+ is ESM-only
let uuidCounter = 0;
jest.mock('uuid', () => ({
  v4: () => `test-uuid-${++uuidCounter}`,
}));

import { QuotaGuard } from './quota.guard';
import { HttpException, HttpStatus } from '@nestjs/common';

// ── Mocks ──────────────────────────────────────────────────────────────────────

function createMockRedis(overrides: Partial<{
  isAvailable: () => boolean;
  eval: (...args: any[]) => Promise<any>;
}> = {}) {
  return {
    isAvailable: overrides.isAvailable ?? (() => true),
    eval: overrides.eval ?? (async () => [1, 0.05]),
    hgetall: async () => ({}),
    hset: async () => {},
    hincrby: async () => {},
    expire: async () => {},
    incrbyfloat: async () => {},
    isFallbackActive: () => false,
  } as any;
}

function createMockPrisma(overrides: Partial<{
  budgetReservation: any;
}> = {}) {
  const createdReservation = { id: 'res-1', requestId: null as string | null, status: 'CREATED' };
  return {
    budgetReservation: {
      create: async (args: any) => {
        createdReservation.requestId = args.data.requestId;
        return { ...createdReservation, ...args.data };
      },
      update: async (args: any) => ({ ...createdReservation, ...args.data }),
      delete: async () => {},
      findUnique: async () => null,
      findMany: async () => [],
      ...(overrides.budgetReservation ?? {}),
    },
  } as any;
}

function createMockExecutionContext(apiKey: any, body: any = {}) {
  const req = {
    resolvedApiKey: apiKey,
    body: {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
      ...body,
    },
  } as any;
  return {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
    _req: req, // expose for assertion
  } as any;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('QuotaGuard', () => {
  let guard: QuotaGuard;

  describe('Request ID Propagation', () => {
    it('should set requestId on both req and apiKey so GatewayService receives it', async () => {
      const redis = createMockRedis();
      const prisma = createMockPrisma();
      guard = new QuotaGuard(redis, prisma);

      const apiKey = {
        id: 'key-1',
        organizationId: 'org-1',
        dailyRpmLimit: 100,
        dailyTpmLimit: null,
        monthlyUsdCap: null,
        orgPlan: 'PRO',
      };
      const ctx = createMockExecutionContext(apiKey);
      await guard.canActivate(ctx);

      const req = ctx._req;
      // Both req.requestId and apiKey.requestId must be set and identical
      expect(req.requestId).toBeDefined();
      expect(typeof req.requestId).toBe('string');
      expect(req.requestId.length).toBeGreaterThan(0);
      expect((apiKey as any).requestId).toBe(req.requestId);
    });

    it('should generate a unique requestId for each invocation', async () => {
      const redis = createMockRedis();
      const prisma = createMockPrisma();
      guard = new QuotaGuard(redis, prisma);

      const apiKey1: any = { id: 'key-1', organizationId: 'org-1', dailyRpmLimit: 10, dailyTpmLimit: null, monthlyUsdCap: null, orgPlan: 'PRO' };
      const apiKey2: any = { id: 'key-1', organizationId: 'org-1', dailyRpmLimit: 10, dailyTpmLimit: null, monthlyUsdCap: null, orgPlan: 'PRO' };

      const ctx1 = createMockExecutionContext(apiKey1);
      const ctx2 = createMockExecutionContext(apiKey2);
      await guard.canActivate(ctx1);
      await guard.canActivate(ctx2);

      expect(apiKey1.requestId).not.toBe(apiKey2.requestId);
    });
  });

  describe('Fail-Closed (Cloud Tier)', () => {
    it('should throw 503 when Redis is unavailable in Cloud tier', async () => {
      const originalEnv = process.env.SELIXES_TIER;
      process.env.SELIXES_TIER = 'cloud';
      try {
        const redis = createMockRedis({ isAvailable: () => false });
        const prisma = createMockPrisma();
        guard = new QuotaGuard(redis, prisma);

        const apiKey = { id: 'key-1', organizationId: 'org-1', dailyRpmLimit: 10, dailyTpmLimit: null, monthlyUsdCap: null, orgPlan: 'PRO' };
        const ctx = createMockExecutionContext(apiKey);

        await expect(guard.canActivate(ctx)).rejects.toThrow(HttpException);
        try {
          await guard.canActivate(ctx);
        } catch (e: any) {
          expect(e.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
        }
      } finally {
        if (originalEnv === undefined) delete process.env.SELIXES_TIER;
        else process.env.SELIXES_TIER = originalEnv;
      }
    });

    it('should throw 503 when Redis eval fails in Cloud tier', async () => {
      const originalEnv = process.env.SELIXES_TIER;
      process.env.SELIXES_TIER = 'cloud';
      try {
        const redis = createMockRedis({
          eval: async () => { throw new Error('Redis connection reset'); },
        });
        const prisma = createMockPrisma();
        guard = new QuotaGuard(redis, prisma);

        const apiKey = { id: 'key-1', organizationId: 'org-1', dailyRpmLimit: 100, dailyTpmLimit: null, monthlyUsdCap: null, orgPlan: 'PRO' };
        const ctx = createMockExecutionContext(apiKey);

        await expect(guard.canActivate(ctx)).rejects.toThrow(HttpException);
        try {
          await guard.canActivate(ctx);
        } catch (e: any) {
          expect(e.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
        }
      } finally {
        if (originalEnv === undefined) delete process.env.SELIXES_TIER;
        else process.env.SELIXES_TIER = originalEnv;
      }
    });
  });

  describe('Fail-Open (Community Tier)', () => {
    it('should allow request when Redis is unavailable in Community tier', async () => {
      const originalEnv = process.env.SELIXES_TIER;
      delete process.env.SELIXES_TIER;
      delete process.env.GATEWAY_TIER;
      try {
        const redis = createMockRedis({ isAvailable: () => false });
        const prisma = createMockPrisma();
        guard = new QuotaGuard(redis, prisma);

        const apiKey = { id: 'key-1', organizationId: 'org-1', dailyRpmLimit: 10, dailyTpmLimit: null, monthlyUsdCap: null, orgPlan: 'COMMUNITY' };
        const ctx = createMockExecutionContext(apiKey);

        const result = await guard.canActivate(ctx);
        expect(result).toBe(true);
        expect(ctx._req.quotaBypass).toBe(true);
      } finally {
        if (originalEnv !== undefined) process.env.SELIXES_TIER = originalEnv;
      }
    });
  });

  describe('Budget Reservation State Machine', () => {
    it('should create CREATED reservation and transition to PRECHARGED on budget success', async () => {
      const createdReservations: any[] = [];
      const updatedReservations: any[] = [];

      const prisma = createMockPrisma({
        budgetReservation: {
          create: async (args: any) => {
            const res = { id: 'res-test', ...args.data };
            createdReservations.push(res);
            return res;
          },
          update: async (args: any) => {
            updatedReservations.push(args);
            return { id: args.where.id, ...args.data };
          },
          delete: async () => {},
        },
      });

      const redis = createMockRedis({
        eval: async () => [1, 0.02], // admitted
      });

      guard = new QuotaGuard(redis, prisma);

      const apiKey = {
        id: 'key-budget',
        organizationId: 'org-budget',
        dailyRpmLimit: null,
        dailyTpmLimit: null,
        monthlyUsdCap: 50.0,
        orgPlan: 'PRO',
      };
      const ctx = createMockExecutionContext(apiKey);

      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);

      // Check CREATED reservation was created
      expect(createdReservations.length).toBe(1);
      expect(createdReservations[0].status).toBe('CREATED');
      expect(createdReservations[0].apiKeyId).toBe('key-budget');

      // Check it was updated to PRECHARGED
      expect(updatedReservations.length).toBe(1);
      expect(updatedReservations[0].data.status).toBe('PRECHARGED');
      expect(updatedReservations[0].data.prechargedAt).toBeDefined();

      // estimatedCost should be propagated onto apiKey
      expect(apiKey['estimatedCost']).toBeGreaterThan(0);
    });

    it('should delete reservation when budget is rejected', async () => {
      const deletedReservations: any[] = [];

      const prisma = createMockPrisma({
        budgetReservation: {
          create: async (args: any) => {
            return { id: 'res-rejected', ...args.data };
          },
          update: async () => {},
          delete: async (args: any) => {
            deletedReservations.push(args);
          },
        },
      });

      const redis = createMockRedis({
        eval: async () => [0, 50.0], // rejected - budget exceeded
      });

      guard = new QuotaGuard(redis, prisma);

      const apiKey = {
        id: 'key-over',
        organizationId: 'org-over',
        dailyRpmLimit: null,
        dailyTpmLimit: null,
        monthlyUsdCap: 10.0,
        orgPlan: 'ENTERPRISE', // ENTERPRISE has no RPM/TPM limits, so only budget check runs
      };
      const ctx = createMockExecutionContext(apiKey);

      await expect(guard.canActivate(ctx)).rejects.toThrow(HttpException);
      try {
        await guard.canActivate(ctx);
      } catch (e: any) {
        expect(e.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        const response = e.getResponse();
        expect(response.type).toBe('budget');
      }

      // Reservation should have been deleted (cleanup on rejection)
      expect(deletedReservations.length).toBeGreaterThan(0);
    });
  });

  describe('No-limit fast path', () => {
    it('should return true immediately when no limits are configured', async () => {
      const redis = createMockRedis();
      const prisma = createMockPrisma();
      guard = new QuotaGuard(redis, prisma);

      const apiKey = {
        id: 'key-unlimited',
        organizationId: 'org-unlimited',
        dailyRpmLimit: null,
        dailyTpmLimit: null,
        monthlyUsdCap: null,
        orgPlan: 'ENTERPRISE', // ENTERPRISE has rpm: null, tpm: null
      };
      const ctx = createMockExecutionContext(apiKey);

      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
      // No requestId should be generated on the fast path
      expect(ctx._req.requestId).toBeUndefined();
    });
  });

  describe('No apiKey (bypass)', () => {
    it('should return true when resolvedApiKey is not present', async () => {
      const redis = createMockRedis();
      const prisma = createMockPrisma();
      guard = new QuotaGuard(redis, prisma);

      const ctx = createMockExecutionContext(null);

      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
    });
  });
});
