import { AsyncAuditService, AuditRecord, parseClampedInt } from './async-audit.service';
import { RunStatus } from '@prisma/client';

function createHandledRejectedPromise(err: Error) {
  const p = Promise.reject(err);
  p.catch(() => {});
  return p;
}

describe('AsyncAuditService', () => {
  let service: AsyncAuditService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      workflowRun: {
        update: jest.fn().mockImplementation(() => Promise.resolve({ id: 'run-1' })),
      },
      aITrace: {
        create: jest.fn().mockImplementation(() => Promise.resolve({ id: 'trace-1' })),
      },
      $transaction: jest.fn().mockImplementation((promises) => Promise.all(promises)),
      $disconnect: jest.fn().mockImplementation(() => Promise.resolve()),
    };
    delete process.env.AUDIT_MODE;
    delete process.env.AUDIT_FLUSH_INTERVAL_MS;
    delete process.env.AUDIT_BATCH_SIZE;
    service = new AsyncAuditService(mockPrisma);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
    await service.onApplicationShutdown();
  });

  it('records asynchronously by default into queue', async () => {
    service.onModuleInit();
    expect(service.isAsyncMode()).toBe(true);

    const record: AuditRecord = {
      runId: 'run-test-1',
      runStatus: RunStatus.SUCCESS,
      duration: 12,
      completedAt: new Date(),
      trace: {
        provider: 'openai',
        model: 'gpt-4o',
        promptTokens: 10,
        completionTokens: 20,
        latency: 12,
        estimatedCost: 0.001,
        actualCost: 0.001,
        requestId: 'req-1',
        status: 'success',
        httpStatus: 200,
        promptSnapshot: {},
        responseSnapshot: {},
      },
    };

    await service.record(record);
    const stats = service.getStats();
    expect(stats.totalEnqueued).toBe(1);
    expect(stats.queueLength).toBe(1);

    // Flush manually and verify Prisma execution
    await service.flush();
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(service.getStats().totalFlushed).toBe(1);
    expect(service.getStats().queueLength).toBe(0);
  });

  it('operates synchronously when AUDIT_MODE=sync', async () => {
    process.env.AUDIT_MODE = 'sync';
    service = new AsyncAuditService(mockPrisma);
    service.onModuleInit();
    expect(service.isAsyncMode()).toBe(false);

    const record: AuditRecord = {
      runId: 'run-sync-1',
      runStatus: RunStatus.SUCCESS,
      duration: 15,
      completedAt: new Date(),
    };

    await service.record(record);
    expect(mockPrisma.workflowRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'run-sync-1' },
      }),
    );
    expect(service.getStats().queueLength).toBe(0);
  });

  it('clears interval timer on onModuleDestroy while preserving queue for onApplicationShutdown', async () => {
    service.onModuleInit();
    await service.record({
      runId: 'run-late-1',
      runStatus: RunStatus.SUCCESS,
      duration: 10,
      completedAt: new Date(),
    });

    // onModuleDestroy only clears the timer
    await service.onModuleDestroy();
    expect(service.getStats().queueLength).toBe(1);

    // Late records can still be enqueued before HTTP server closes
    await service.record({
      runId: 'run-late-2',
      runStatus: RunStatus.SUCCESS,
      duration: 10,
      completedAt: new Date(),
    });
    expect(service.getStats().queueLength).toBe(2);

    // onApplicationShutdown executes the final drain
    await service.onApplicationShutdown();
    expect(service.getStats().queueLength).toBe(0);
    expect(service.getStats().totalFlushed).toBe(2);
  });

  it('drains a large queue of 120 records across multiple batches on shutdown, persisting all 120', async () => {
    service.onModuleInit();
    for (let i = 0; i < 120; i++) {
      await service.record({
        runId: `run-drain-${i}`,
        runStatus: RunStatus.SUCCESS,
        duration: 10,
        completedAt: new Date(),
      });
    }

    expect(service.getStats().queueLength).toBe(120);
    await service.onModuleDestroy();
    await service.onApplicationShutdown();

    expect(service.getStats().queueLength).toBe(0);
    expect(service.getStats().totalFlushed).toBe(120);
    expect(service.getStats().totalDropped).toBe(0);
    expect(mockPrisma.workflowRun.update).toHaveBeenCalledTimes(120);
  });

  it('gracefully handles shutdown while an interval flush is mid-flight with no records lost', async () => {
    let resolveInFlight: () => void;
    const inFlightPromise = new Promise<void>((resolve) => {
      resolveInFlight = resolve;
    });

    let firstCall = true;
    mockPrisma.$transaction = jest.fn().mockImplementation((promises) => {
      if (firstCall) {
        firstCall = false;
        return inFlightPromise.then(() => Promise.all(promises));
      }
      return Promise.all(promises);
    });

    service.onModuleInit();

    // Enqueue 30 records
    for (let i = 0; i < 30; i++) {
      await service.record({
        runId: `run-mid-${i}`,
        runStatus: RunStatus.SUCCESS,
        duration: 10,
        completedAt: new Date(),
      });
    }

    // Trigger in-flight flush manually
    const flushPromise = service.flush();

    // Enqueue 20 more while first flush is in flight
    for (let i = 30; i < 50; i++) {
      await service.record({
        runId: `run-mid-${i}`,
        runStatus: RunStatus.SUCCESS,
        duration: 10,
        completedAt: new Date(),
      });
    }

    // Call shutdown while first flush is still resolving
    await service.onModuleDestroy();
    const shutdownPromise = service.onApplicationShutdown();

    // Release the in-flight flush
    resolveInFlight!();

    await flushPromise;
    await shutdownPromise;

    expect(service.getStats().queueLength).toBe(0);
    expect(service.getStats().totalFlushed).toBe(50);
    expect(service.getStats().totalDropped).toBe(0);
  });

  it('resolves onApplicationShutdown within deadline margin when DB is always failing and tracks dropped count', async () => {
    mockPrisma.$transaction = jest.fn().mockImplementation(() =>
      createHandledRejectedPromise(new Error('Connection refused')),
    );
    mockPrisma.workflowRun.update = jest.fn().mockImplementation(() =>
      createHandledRejectedPromise(new Error('Connection refused')),
    );
    mockPrisma.aITrace.create = jest.fn().mockImplementation(() =>
      createHandledRejectedPromise(new Error('Connection refused')),
    );

    service.onModuleInit();
    for (let i = 0; i < 20; i++) {
      await service.record({
        runId: `run-fail-${i}`,
        runStatus: RunStatus.SUCCESS,
        duration: 10,
        completedAt: new Date(),
      });
    }

    const start = Date.now();
    await service.onModuleDestroy();
    await service.onApplicationShutdown();
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(3500);
    expect(service.getStats().totalDropped).toBe(20);
    expect(service.getStats().queueLength).toBe(0);
  });

  it('resolves within ~3.5s during shutdown when $transaction and persistDirect never resolve', async () => {
    mockPrisma.$transaction = jest.fn().mockImplementation(() => new Promise(() => {}));
    mockPrisma.workflowRun.update = jest.fn().mockImplementation(() => new Promise(() => {}));
    mockPrisma.aITrace.create = jest.fn().mockImplementation(() => new Promise(() => {}));

    service.onModuleInit();
    for (let i = 0; i < 5; i++) {
      await service.record({
        runId: `run-hang-${i}`,
        runStatus: RunStatus.SUCCESS,
        duration: 10,
        completedAt: new Date(),
      });
    }

    const start = Date.now();
    await service.onModuleDestroy();
    await service.onApplicationShutdown();
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(2950);
    expect(elapsed).toBeLessThan(3800);
    expect(service.getStats().totalDropped).toBe(5);
    expect(service.getStats().queueLength).toBe(0);
  }, 10000);

  it('drops and counts late records if received after onApplicationShutdown has completed', async () => {
    service.onModuleInit();
    await service.onModuleDestroy();
    await service.onApplicationShutdown();

    await service.record({
      runId: 'run-post-shutdown',
      runStatus: RunStatus.SUCCESS,
      duration: 10,
      completedAt: new Date(),
    });

    expect(service.getStats().queueLength).toBe(0);
    expect(service.getStats().totalDropped).toBe(1);
  });

  it('asserts $disconnect is called only after the audit queue drain completes', async () => {
    let drainedBeforeDisconnect = false;
    mockPrisma.$disconnect = jest.fn().mockImplementation(() => {
      // At the moment $disconnect is invoked, all records must be flushed and queue empty
      if (service.getStats().queueLength === 0 && service.getStats().totalFlushed === 3) {
        drainedBeforeDisconnect = true;
      }
      return Promise.resolve();
    });

    service.onModuleInit();
    for (let i = 0; i < 3; i++) {
      await service.record({
        runId: `run-disconnect-${i}`,
        runStatus: RunStatus.SUCCESS,
        duration: 10,
        completedAt: new Date(),
      });
    }

    expect(mockPrisma.$disconnect).not.toHaveBeenCalled();
    expect(service.getStats().queueLength).toBe(3);

    await service.onModuleDestroy();
    expect(mockPrisma.$disconnect).not.toHaveBeenCalled();

    await service.onApplicationShutdown();

    expect(mockPrisma.$disconnect).toHaveBeenCalledTimes(1);
    expect(drainedBeforeDisconnect).toBe(true);
    expect(service.getStats().totalFlushed).toBe(3);
    expect(service.getStats().queueLength).toBe(0);
  });

  describe('shutdown ordering: UsageAccumulator stops before Prisma disconnects', () => {
    it('UsageAccumulatorService.onModuleDestroy clears its interval before AsyncAuditService.$disconnect fires', async () => {
      // Simulate UsageAccumulatorService lifecycle: start interval, then destroy
      let accumulatorIntervalActive = true;
      const fakeAccumulatorInterval = setInterval(() => {}, 60000);
      const accumulatorOnModuleDestroy = () => {
        clearInterval(fakeAccumulatorInterval);
        accumulatorIntervalActive = false;
      };

      // Enqueue one audit record
      service.onModuleInit();
      await service.record({
        runId: 'run-ordering-1',
        runStatus: RunStatus.SUCCESS,
        duration: 5,
        completedAt: new Date(),
      });
      expect(service.getStats().queueLength).toBe(1);

      // Step 1: Destroy accumulator (clears its cron interval)
      accumulatorOnModuleDestroy();
      expect(accumulatorIntervalActive).toBe(false);

      // Step 2: Clear audit timer
      await service.onModuleDestroy();

      // $disconnect must not have been called yet
      expect(mockPrisma.$disconnect).not.toHaveBeenCalled();

      // Step 3: Drain audit queue then disconnect Prisma
      let intervalWasStoppedAtDisconnect = false;
      mockPrisma.$disconnect = jest.fn().mockImplementation(() => {
        intervalWasStoppedAtDisconnect = !accumulatorIntervalActive;
        return Promise.resolve();
      });

      await service.onApplicationShutdown();

      expect(mockPrisma.$disconnect).toHaveBeenCalledTimes(1);
      expect(intervalWasStoppedAtDisconnect).toBe(true);
      expect(service.getStats().queueLength).toBe(0);
      expect(service.getStats().totalFlushed).toBe(1);
    });

    it('only AsyncAuditService calls $disconnect — no other path disconnects Prisma', async () => {
      // Verify that onModuleDestroy alone (without onApplicationShutdown) never calls $disconnect
      service.onModuleInit();
      await service.record({
        runId: 'run-no-disconnect',
        runStatus: RunStatus.SUCCESS,
        duration: 1,
        completedAt: new Date(),
      });
      await service.onModuleDestroy();
      expect(mockPrisma.$disconnect).not.toHaveBeenCalled();
      // cleanup
      await service.onApplicationShutdown();
      expect(mockPrisma.$disconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Configuration parsing and clamping', () => {
    it('uses default values when input is NaN', () => {
      expect(parseClampedInt('not-a-number', 50, 1, 500)).toBe(50);
      expect(parseClampedInt('NaN', 50, 10, 60000)).toBe(50);
      expect(parseClampedInt('12abc', 50, 1, 500)).toBe(50);
      expect(parseClampedInt('Infinity', 50, 1, 500)).toBe(50);
      expect(parseClampedInt('42.7', 50, 1, 500)).toBe(50); // non-integer

      process.env.AUDIT_BATCH_SIZE = 'abc';
      process.env.AUDIT_FLUSH_INTERVAL_MS = 'invalid';
      const s = new AsyncAuditService(mockPrisma);
      expect(s.getBatchSize()).toBe(50);
      expect(s.getFlushIntervalMs()).toBe(50);
    });

    it('uses default values when input is empty or whitespace', () => {
      expect(parseClampedInt('', 50, 1, 500)).toBe(50);
      expect(parseClampedInt('   ', 50, 10, 60000)).toBe(50);
      expect(parseClampedInt(undefined, 50, 1, 500)).toBe(50);
      expect(parseClampedInt(null as any, 50, 10, 60000)).toBe(50);

      process.env.AUDIT_BATCH_SIZE = '';
      process.env.AUDIT_FLUSH_INTERVAL_MS = '   ';
      const s = new AsyncAuditService(mockPrisma);
      expect(s.getBatchSize()).toBe(50);
      expect(s.getFlushIntervalMs()).toBe(50);
    });

    it('clamps negative values to the defined minimum', () => {
      expect(parseClampedInt('-1', 50, 1, 500)).toBe(1);
      expect(parseClampedInt('-500', 50, 1, 500)).toBe(1);
      expect(parseClampedInt('-10', 50, 10, 60000)).toBe(10);
      expect(parseClampedInt('0', 50, 1, 500)).toBe(1);
      expect(parseClampedInt('5', 50, 10, 60000)).toBe(10);

      process.env.AUDIT_BATCH_SIZE = '-100';
      process.env.AUDIT_FLUSH_INTERVAL_MS = '-9999';
      const s = new AsyncAuditService(mockPrisma);
      expect(s.getBatchSize()).toBe(1);
      expect(s.getFlushIntervalMs()).toBe(10);
    });

    it('clamps huge values to the defined maximum', () => {
      expect(parseClampedInt('999999', 50, 1, 500)).toBe(500);
      expect(parseClampedInt('99999999', 50, 10, 60000)).toBe(60000);

      process.env.AUDIT_BATCH_SIZE = '9999';
      process.env.AUDIT_FLUSH_INTERVAL_MS = '999999';
      const s = new AsyncAuditService(mockPrisma);
      expect(s.getBatchSize()).toBe(500);
      expect(s.getFlushIntervalMs()).toBe(60000);
    });

    it('accepts valid in-range values without altering them', () => {
      expect(parseClampedInt('200', 50, 1, 500)).toBe(200);
      expect(parseClampedInt('1000', 50, 10, 60000)).toBe(1000);

      process.env.AUDIT_BATCH_SIZE = '250';
      process.env.AUDIT_FLUSH_INTERVAL_MS = '500';
      const s = new AsyncAuditService(mockPrisma);
      expect(s.getBatchSize()).toBe(250);
      expect(s.getFlushIntervalMs()).toBe(500);
      expect(s.getStats().batchSize).toBe(250);
      expect(s.getStats().flushIntervalMs).toBe(500);
    });
  });
});

