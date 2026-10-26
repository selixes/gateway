import { Injectable, Logger, OnModuleInit, OnModuleDestroy, OnApplicationShutdown } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RunStatus } from '@prisma/client';

export interface AuditRecord {
  runId: string;
  runStatus: RunStatus;
  duration: number;
  completedAt: Date;
  errorMessage?: string;
  trace?: {
    provider: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    latency: number;
    estimatedCost: number;
    actualCost: number;
    requestId: string;
    status: string;
    httpStatus: number;
    promptSnapshot: any;
    responseSnapshot: any;
  };
}

export function parseClampedInt(
  val: string | undefined,
  defaultVal: number,
  min: number,
  max: number,
): number {
  if (val === undefined || val === null) {
    return defaultVal;
  }
  const trimmed = String(val).trim();
  if (trimmed === '') {
    return defaultVal;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return defaultVal;
  }
  return Math.min(Math.max(parsed, min), max);
}

@Injectable()
export class AsyncAuditService implements OnModuleInit, OnModuleDestroy, OnApplicationShutdown {
  private readonly logger = new Logger(AsyncAuditService.name);
  private queue: AuditRecord[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private isFlushing = false;
  private isDestroyed = false;
  private currentFlush: Promise<void> | null = null;
  private shutdownDeadline: number | null = null;

  private totalEnqueued = 0;
  private totalFlushed = 0;
  private totalDropped = 0;

  private readonly BATCH_SIZE = parseClampedInt(process.env.AUDIT_BATCH_SIZE, 50, 1, 500);
  private readonly FLUSH_INTERVAL_MS = parseClampedInt(process.env.AUDIT_FLUSH_INTERVAL_MS, 50, 10, 60000);
  private readonly MAX_QUEUE_SIZE = 10000;

  public getBatchSize(): number {
    return this.BATCH_SIZE;
  }

  public getFlushIntervalMs(): number {
    return this.FLUSH_INTERVAL_MS;
  }

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    if (this.isAsyncMode()) {
      this.flushTimer = setInterval(() => {
        this.flush().catch((err) => {
          this.logger.error(`Error during periodic audit flush: ${err.message}`);
        });
      }, this.FLUSH_INTERVAL_MS);
      this.logger.log(`[AsyncAuditService] Initialized in ASYNC mode (${this.FLUSH_INTERVAL_MS}ms batch flusher active).`);
    } else {
      this.logger.log('[AsyncAuditService] Initialized in SYNC mode.');
    }
  }

  onModuleDestroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  async onApplicationShutdown(_signal?: string) {
    if (this.isDestroyed && this.queue.length === 0) {
      return;
    }
    this.isDestroyed = true;
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    try {
      this.logger.log(`[AsyncAuditService] Starting application shutdown audit drain (queue: ${this.queue.length} records)...`);
      const deadline = Date.now() + 3000;
      this.shutdownDeadline = deadline;

      // Await in-flight flush if one is running, raced against deadline
      if (this.currentFlush) {
        try {
          const remainingMs = Math.max(0, this.shutdownDeadline - Date.now());
          await this.raceWithTimeout(
            this.currentFlush,
            remainingMs,
            'In-flight flush timed out during shutdown',
          );
        } catch {
          // error already handled/logged inside executeFlush or timeout
        }
      }

      while (true) {
        if (this.queue.length === 0) {
          break;
        }
        const remainingMs = this.shutdownDeadline - Date.now();
        if (remainingMs <= 0) {
          this.logger.warn(`[AsyncAuditService] Shutdown deadline (3s) exceeded while draining.`);
          break;
        }

        const lengthBefore = this.queue.length;
        try {
          await this.raceWithTimeout(
            this.flush(),
            remainingMs,
            'Flush timed out during shutdown',
          );
        } catch (err: any) {
          this.logger.warn(`[AsyncAuditService] Flush timed out or failed during shutdown: ${err.message}`);
        }

        if (this.queue.length >= lengthBefore) {
          this.logger.warn(`[AsyncAuditService] Flush made no progress during shutdown (queue length: ${this.queue.length}). Breaking drain loop.`);
          break;
        }
      }

      if (this.queue.length > 0) {
        const unpersisted = this.queue.length;
        this.totalDropped += unpersisted;
        this.logger.warn(`[AsyncAuditService] Shutdown completed with ${unpersisted} unpersisted record(s) left in queue.`);
        this.queue = [];
      } else {
        this.logger.log(`[AsyncAuditService] Audit queue drained successfully.`);
      }
    } finally {
      this.shutdownDeadline = null;
      if (this.prisma && typeof this.prisma.$disconnect === 'function') {
        try {
          this.logger.log('[AsyncAuditService] Disconnecting database connection...');
          await this.raceWithTimeout(
            this.prisma.$disconnect(),
            2000,
            'Prisma $disconnect timed out during shutdown',
          );
          this.logger.log('[AsyncAuditService] Database disconnected successfully.');
        } catch (err: any) {
          this.logger.error(`[AsyncAuditService] Error during database disconnect: ${err.message}`);
        }
      }
    }
  }

  private raceWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMsg: string,
  ): Promise<T> {
    if (timeoutMs <= 0) {
      return Promise.reject(new Error(timeoutMsg));
    }
    let timer: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(timeoutMsg)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
      if (timer) {
        clearTimeout(timer);
      }
    });
  }

  public isAsyncMode(): boolean {
    const mode = (process.env.AUDIT_MODE || 'async').toLowerCase();
    return mode === 'async';
  }

  public async record(entry: AuditRecord): Promise<void> {
    if (this.isDestroyed) {
      this.totalDropped++;
      this.logger.warn(`[AsyncAuditService] Service is destroyed/shut down. Dropping audit record for run ${entry.runId}.`);
      return;
    }

    if (!this.isAsyncMode()) {
      // Synchronous path
      await this.persistDirect(entry);
      return;
    }

    // Bounded queue protection
    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      this.totalDropped++;
      this.logger.warn(`[AsyncAuditService] Audit queue full (${this.MAX_QUEUE_SIZE}). Dropping oldest record.`);
      this.queue.shift(); // Drop oldest to prevent unbounded memory growth
    }

    this.queue.push(entry);
    this.totalEnqueued++;

    // Flush immediately if batch size reached
    if (this.queue.length >= this.BATCH_SIZE && !this.isFlushing) {
      setImmediate(() => {
        this.flush().catch((err) => {
          this.logger.error(`Error during immediate batch flush: ${err.message}`);
        });
      });
    }
  }

  public async flush(): Promise<void> {
    if (this.currentFlush) {
      await this.currentFlush;
      return;
    }
    if (this.queue.length === 0) {
      return;
    }

    this.isFlushing = true;
    this.currentFlush = this.executeFlush();
    try {
      await this.currentFlush;
    } finally {
      this.isFlushing = false;
      this.currentFlush = null;
    }
  }

  private async executeFlush(): Promise<void> {
    const batch = this.queue.splice(0, this.BATCH_SIZE);

    const updates = batch.map((item) =>
      this.prisma.workflowRun.update({
        where: { id: item.runId },
        data: {
          status: item.runStatus,
          completedAt: item.completedAt,
          duration: item.duration,
          errorMessage: item.errorMessage,
        },
      }),
    );

    const traces = batch
      .filter((item) => item.trace !== undefined)
      .map((item) => {
        const t = item.trace!;
        return this.prisma.aITrace.create({
          data: {
            run: { connect: { id: item.runId } },
            provider: t.provider,
            model: t.model,
            promptTokens: t.promptTokens,
            completionTokens: t.completionTokens,
            latency: t.latency,
            estimatedCost: t.estimatedCost,
            actualCost: t.actualCost,
            requestId: t.requestId,
            status: t.status,
            httpStatus: t.httpStatus,
            promptSnapshot: t.promptSnapshot,
            responseSnapshot: t.responseSnapshot,
          },
        });
      });

    try {
      const runTransaction = async () => {
        if (typeof this.prisma.$transaction === 'function') {
          await this.prisma.$transaction([...updates, ...traces]);
        } else {
          await Promise.all([...updates, ...traces]);
        }
      };

      if (this.shutdownDeadline !== null) {
        const remainingMs = this.shutdownDeadline - Date.now();
        if (remainingMs <= 0) {
          throw new Error('Shutdown deadline exceeded before transaction');
        }
        await this.raceWithTimeout(
          runTransaction(),
          remainingMs,
          'Batch transaction timed out during shutdown',
        );
      } else {
        await runTransaction();
      }

      this.totalFlushed += batch.length;
    } catch (err: any) {
      this.logger.error(`[AsyncAuditService] Batch flush failed: ${err.message}`);
      // Fallback: try individual writes so one bad record does not drop the whole batch
      for (const item of batch) {
        if (this.isDestroyed && this.shutdownDeadline && Date.now() > this.shutdownDeadline) {
          this.logger.warn(`[AsyncAuditService] Shutdown deadline exceeded during fallback writes. Skipping remaining fallback item(s).`);
          this.totalDropped++;
          continue;
        }
        try {
          await this.persistDirect(item);
          this.totalFlushed++;
        } catch (individualErr: any) {
          this.logger.error(`[AsyncAuditService] Individual fallback write failed for run ${item.runId}: ${individualErr.message}`);
          this.totalDropped++;
        }
      }
    } finally {
      // If items accumulated while flushing and not destroyed, trigger next batch
      if (this.queue.length >= this.BATCH_SIZE && !this.isDestroyed) {
        setImmediate(() => {
          this.flush().catch(() => {});
        });
      }
    }
  }

  private async persistDirect(item: AuditRecord): Promise<void> {
    const doPersist = async () => {
      await this.prisma.workflowRun.update({
        where: { id: item.runId },
        data: {
          status: item.runStatus,
          completedAt: item.completedAt,
          duration: item.duration,
          errorMessage: item.errorMessage,
        },
      });

      if (item.trace) {
        const t = item.trace;
        await this.prisma.aITrace.create({
          data: {
            run: { connect: { id: item.runId } },
            provider: t.provider,
            model: t.model,
            promptTokens: t.promptTokens,
            completionTokens: t.completionTokens,
            latency: t.latency,
            estimatedCost: t.estimatedCost,
            actualCost: t.actualCost,
            requestId: t.requestId,
            status: t.status,
            httpStatus: t.httpStatus,
            promptSnapshot: t.promptSnapshot,
            responseSnapshot: t.responseSnapshot,
          },
        });
      }
    };

    if (this.shutdownDeadline !== null) {
      const remainingMs = this.shutdownDeadline - Date.now();
      if (remainingMs <= 0) {
        throw new Error('Shutdown deadline exceeded before persistDirect execution');
      }
      await this.raceWithTimeout(
        doPersist(),
        remainingMs,
        'persistDirect timed out during shutdown',
      );
    } else {
      await doPersist();
    }
  }

  public getStats() {
    return {
      mode: this.isAsyncMode() ? 'async' : 'sync',
      queueLength: this.queue.length,
      totalEnqueued: this.totalEnqueued,
      totalFlushed: this.totalFlushed,
      totalDropped: this.totalDropped,
      batchSize: this.BATCH_SIZE,
      flushIntervalMs: this.FLUSH_INTERVAL_MS,
    };
  }
}

