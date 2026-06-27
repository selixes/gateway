import { UsageAccumulatorService } from './usage-accumulator.service';

// ── Mocks ──────────────────────────────────────────────────────────────────────

function createMockRedis(overrides: Partial<{
  isAvailable: () => boolean;
  eval: (...args: any[]) => Promise<any>;
}> = {}) {
  return {
    isAvailable: overrides.isAvailable ?? (() => true),
    eval: overrides.eval ?? (async () => [1, 0.01]),
    incrbyfloat: async () => {},
    expire: async () => {},
    hincrby: async () => {},
    hincrbyfloat: async () => {},
    isFallbackActive: () => false,
  } as any;
}

function createMockPrisma(overrides: Partial<{
  budgetReservation: any;
  usageRecord: any;
}> = {}) {
  return {
    budgetReservation: {
      findUnique: async () => null,
      update: async (args: any) => args.data,
      findMany: async () => [],
      ...(overrides.budgetReservation ?? {}),
    },
    usageRecord: {
      create: async (args: any) => args.data,
      ...(overrides.usageRecord ?? {}),
    },
  } as any;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('UsageAccumulatorService', () => {
  let service: UsageAccumulatorService;

  describe('Reconciliation', () => {
    it('should reconcile a PRECHARGED reservation via RECONCILE_LUA', async () => {
      const updatedReservations: any[] = [];
      const evalCalls: any[] = [];

      const prisma = createMockPrisma({
        budgetReservation: {
          findUnique: async () => ({
            id: 'res-1',
            requestId: 'req-1',
            status: 'PRECHARGED',
            spendKey: 'quota:spend:key-1:2026-06',
          }),
          update: async (args: any) => {
            updatedReservations.push(args);
            return args.data;
          },
        },
      });

      const redis = createMockRedis({
        eval: async (...args: any[]) => {
          evalCalls.push(args);
          return [1, -0.002]; // reconciled with delta
        },
      });

      service = new UsageAccumulatorService(redis, prisma);

      await service.record({
        requestId: 'req-1',
        apiKeyId: 'key-1',
        organizationId: 'org-1',
        model: 'gpt-4o',
        provider: 'openai',
        promptTokens: 100,
        completionTokens: 50,
        providerChain: 'openai:200',
        isDegraded: false,
        latencyMs: 200,
        quotaBypass: false,
        sessionId: undefined,
        estimatedCost: 0.002,
      });

      // Should have updated to RECONCILED
      expect(updatedReservations.length).toBe(1);
      expect(updatedReservations[0].data.status).toBe('RECONCILED');
      expect(updatedReservations[0].data.reconciledAt).toBeDefined();
    });

    it('should NOT reconcile a reservation that does not exist', async () => {
      const updatedReservations: any[] = [];

      const prisma = createMockPrisma({
        budgetReservation: {
          findUnique: async () => null, // no reservation found
          update: async (args: any) => {
            updatedReservations.push(args);
            return args.data;
          },
        },
      });

      const redis = createMockRedis();
      service = new UsageAccumulatorService(redis, prisma);

      await service.record({
        requestId: 'req-orphan',
        apiKeyId: 'key-1',
        organizationId: 'org-1',
        model: 'gpt-4o',
        provider: 'openai',
        promptTokens: 100,
        completionTokens: 50,
        providerChain: 'openai:200',
        isDegraded: false,
        latencyMs: 200,
        quotaBypass: false,
        sessionId: undefined,
        estimatedCost: 0.002,
      });

      // No reservation to reconcile, so incrbyfloat for spend should be called instead
      expect(updatedReservations.length).toBe(0);
    });

    it('should NOT reconcile a CREATED reservation', async () => {
      const updatedReservations: any[] = [];

      const prisma = createMockPrisma({
        budgetReservation: {
          findUnique: async () => ({
            id: 'res-created',
            requestId: 'req-created',
            status: 'CREATED',
            spendKey: 'quota:spend:key-1:2026-06',
          }),
          update: async (args: any) => {
            updatedReservations.push(args);
            return args.data;
          },
        },
      });

      const redis = createMockRedis();
      service = new UsageAccumulatorService(redis, prisma);

      await service.record({
        requestId: 'req-created',
        apiKeyId: 'key-1',
        organizationId: 'org-1',
        model: 'gpt-4o',
        provider: 'openai',
        promptTokens: 100,
        completionTokens: 50,
        providerChain: 'openai:200',
        isDegraded: false,
        latencyMs: 200,
        quotaBypass: false,
        sessionId: undefined,
        estimatedCost: 0.002,
      });

      // CREATED reservation must not be reconciled
      expect(updatedReservations.length).toBe(0);
    });

    it('should skip Redis writes when quotaBypass is true', async () => {
      let evalCalled = false;

      const prisma = createMockPrisma({
        budgetReservation: {
          findUnique: async () => ({
            id: 'res-bypass',
            requestId: 'req-bypass',
            status: 'PRECHARGED',
          }),
          update: async () => ({}),
        },
      });

      const redis = createMockRedis({
        eval: async () => {
          evalCalled = true;
          return [1, 0];
        },
      });

      service = new UsageAccumulatorService(redis, prisma);

      await service.record({
        requestId: 'req-bypass',
        apiKeyId: 'key-1',
        organizationId: 'org-1',
        model: 'gpt-4o',
        provider: 'openai',
        promptTokens: 100,
        completionTokens: 50,
        providerChain: 'openai:200',
        isDegraded: false,
        latencyMs: 200,
        quotaBypass: true, // Redis was down during this request
        sessionId: undefined,
        estimatedCost: 0.002,
      });

      // Redis eval should NOT have been called for reconciliation
      expect(evalCalled).toBe(false);
    });
  });

  describe('Cleanup Worker', () => {
    it('should refund expired PRECHARGED reservations', async () => {
      const updatedReservations: any[] = [];
      const staleRes = {
        id: 'res-stale',
        requestId: 'req-stale',
        spendKey: 'quota:spend:key-1:2026-06',
        estimatedCostUsd: 0.05,
        status: 'PRECHARGED',
        attempts: 0,
        createdAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      };

      const prisma = createMockPrisma({
        budgetReservation: {
          findUnique: async () => null,
          findMany: async (args: any) => {
            if (args && args.where && args.where.status === 'CREATED') {
              return [];
            }
            return [staleRes];
          },
          update: async (args: any) => {
            updatedReservations.push(args);
            return { ...staleRes, ...args.data };
          },
        },
      });

      const redis = createMockRedis({
        eval: async () => [1, 0.05], // refund successful
      });

      service = new UsageAccumulatorService(redis, prisma);
      await service.cleanupExpiredReservations();

      // Should have 2 updates: REFUND_PENDING then REFUNDED
      expect(updatedReservations.length).toBe(2);
      expect(updatedReservations[0].data.status).toBe('REFUND_PENDING');
      expect(updatedReservations[1].data.status).toBe('REFUNDED');
      expect(updatedReservations[1].data.refundedAt).toBeDefined();
    });

    it('should dead-letter a reservation after max retry attempts', async () => {
      const updatedReservations: any[] = [];
      const failRes = {
        id: 'res-fail',
        requestId: 'req-fail',
        spendKey: 'quota:spend:key-2:2026-06',
        estimatedCostUsd: 0.03,
        status: 'PRECHARGED',
        attempts: 4, // next will be 5th = dead letter
        createdAt: new Date(Date.now() - 15 * 60 * 1000),
      };

      const prisma = createMockPrisma({
        budgetReservation: {
          findUnique: async () => null,
          findMany: async (args: any) => {
            if (args && args.where && args.where.status === 'CREATED') {
              return [];
            }
            return [failRes];
          },
          update: async (args: any) => {
            updatedReservations.push(args);
            return { ...failRes, ...args.data };
          },
        },
      });

      const redis = createMockRedis({
        isAvailable: () => false, // Redis down during cleanup
        eval: async () => { throw new Error('Redis unavailable'); },
      });

      service = new UsageAccumulatorService(redis, prisma);
      await service.cleanupExpiredReservations();

      // First update: REFUND_PENDING (attempts incremented)
      expect(updatedReservations[0].data.status).toBe('REFUND_PENDING');

      // Second update: should be DEAD_LETTER since attempts >= 5
      const lastUpdate = updatedReservations[updatedReservations.length - 1];
      expect(lastUpdate.data.status).toBe('DEAD_LETTER');
    });

    it('should transition stale CREATED reservations directly to EXPIRED with no Redis refund', async () => {
      const updatedReservations: any[] = [];
      const staleRes = {
        id: 'res-stale-created',
        requestId: 'req-stale-created',
        status: 'CREATED',
        createdAt: new Date(Date.now() - 15 * 60 * 1000),
      };

      const prisma = createMockPrisma({
        budgetReservation: {
          findMany: async (args: any) => {
            if (args && args.where && args.where.status === 'CREATED') {
              return [staleRes];
            }
            return [];
          },
          update: async (args: any) => {
            updatedReservations.push(args);
            return { ...staleRes, ...args.data };
          },
        },
      });

      let evalCalled = false;
      const redis = createMockRedis({
        eval: async () => {
          evalCalled = true;
          return [1, 0];
        },
      });

      service = new UsageAccumulatorService(redis, prisma);
      await service.cleanupExpiredReservations();

      // Should have 1 update: status -> EXPIRED, with specific lastError
      expect(updatedReservations.length).toBe(1);
      expect(updatedReservations[0].data.status).toBe('EXPIRED');
      expect(updatedReservations[0].data.lastError).toBe('Reservation expired before Redis precharge.');
      expect(evalCalled).toBe(false); // no Redis eval should occur for CREATED status
    });
  });

  describe('Dev mode bypass', () => {
    it('should skip DB write for dev apiKeyId', async () => {
      let dbWriteCalled = false;

      const prisma = createMockPrisma({
        budgetReservation: {
          findUnique: async () => null,
        },
        usageRecord: {
          create: async () => {
            dbWriteCalled = true;
            return {};
          },
        },
      });

      const redis = createMockRedis();
      service = new UsageAccumulatorService(redis, prisma);

      await service.record({
        requestId: 'req-dev',
        apiKeyId: 'dev',
        organizationId: 'dev-sandbox',
        model: 'gpt-4o',
        provider: 'openai',
        promptTokens: 100,
        completionTokens: 50,
        providerChain: 'openai:200',
        isDegraded: false,
        latencyMs: 200,
        quotaBypass: false,
        sessionId: undefined,
      });

      expect(dbWriteCalled).toBe(false);
    });
  });
});
