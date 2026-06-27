import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationStatus } from '@prisma/client';

// USD cost per 1000 tokens — extend as you add models
export const PRICING: Record<string, { prompt: number; completion: number }> = {
  'gpt-4o':             { prompt: 0.005,  completion: 0.015  },
  'gpt-4o-mini':        { prompt: 0.00015,completion: 0.0006 },
  'claude-3-5-sonnet':  { prompt: 0.003,  completion: 0.015  },
  'claude-3-haiku':     { prompt: 0.00025,completion: 0.00125},
  'gemini-3.5-flash':   { prompt: 0.000075,completion: 0.0003 },
  'gemini-3.1-pro':     { prompt: 0.00125, completion: 0.005  },
  'llama3-continuity':  { prompt: 0,      completion: 0      }, // free
  'llama3-continuity-degraded': { prompt: 0, completion: 0   }, // free
};

export interface UsagePayload {
  requestId: string;
  apiKeyId: string;
  organizationId: string;
  model: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  providerChain: string;
  isDegraded: boolean;
  latencyMs: number;
  quotaBypass: boolean;  // true when Redis was down during this request
  sessionId?: string;
  estimatedCost?: number;
}

const RECONCILE_LUA = `
local spend_key = KEYS[1]
local precharge_key = KEYS[2]
local actual_cost = tonumber(ARGV[1])

local est_cost_str = redis.call('GET', precharge_key)
if est_cost_str then
  local est_cost = tonumber(est_cost_str)
  local delta = actual_cost - est_cost
  redis.call('INCRBYFLOAT', spend_key, delta)
  redis.call('DEL', precharge_key)
  return {1, delta}
else
  return {0, 0}
end
`;

const REFUND_LUA = `
local spend_key = KEYS[1]
local precharge_key = KEYS[2]

local est_cost_str = redis.call('GET', precharge_key)
if est_cost_str then
  local est_cost = tonumber(est_cost_str)
  redis.call('INCRBYFLOAT', spend_key, -est_cost)
  redis.call('DEL', precharge_key)
  return {1, est_cost}
else
  return {0, 0}
end
`;

@Injectable()
export class UsageAccumulatorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UsageAccumulatorService.name);
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    // Run cleanup worker every 60 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredReservations().catch(err =>
        this.logger.error(`Error in cleanupExpiredReservations: ${err.message}`)
      );
    }, 60000);
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  async record(payload: UsagePayload): Promise<void> {
    const { requestId, apiKeyId, organizationId, model, provider,
            promptTokens, completionTokens, providerChain,
            isDegraded, latencyMs, quotaBypass, sessionId, estimatedCost } = payload;

    const totalTokens = promptTokens + completionTokens;
    const prices = PRICING[model] ?? { prompt: 0.005, completion: 0.015 };
    const costUsd = (promptTokens / 1000) * prices.prompt
                  + (completionTokens / 1000) * prices.completion;

    const month = new Date().toISOString().slice(0, 7);
    const spendKey  = `quota:spend:${apiKeyId}:${month}`;
    const prechargeKey = `quota:precharge:${requestId}`;
    const rpmKey    = `quota:rpm:${apiKeyId}`;
    const tpmKey    = `quota:tpm:${apiKeyId}`;
    const now       = Date.now();

    const redisWrites: Promise<any>[] = [];

    // ── Reconcile monthly budget reservation ───────────────────────────────
    let reservationUpdated = false;
    let reconciledDelta = 0;
    if (apiKeyId !== 'dev') {
      try {
        const reservation = await this.prisma.budgetReservation.findUnique({
          where: { requestId },
        });

        if (reservation) {
          if (reservation.status === ReservationStatus.PRECHARGED) {
            // Run reconciliation Lua script
            if (!quotaBypass && this.redis.isAvailable()) {
              const res: number[] = await this.redis.eval(RECONCILE_LUA, 2, spendKey, prechargeKey, costUsd);
              if (res && res[0] === 1) {
                reconciledDelta = res[1];
              }
            }
            await this.prisma.budgetReservation.update({
              where: { id: reservation.id },
              data: {
                status: ReservationStatus.RECONCILED,
                actualCostUsd: costUsd,
                reconciledDeltaUsd: reconciledDelta,
                reconciledAt: new Date(),
              },
            });
            reservationUpdated = true;
          }
        }
      } catch (err) {
        this.logger.error(`Failed to reconcile BudgetReservation for request ${requestId}: ${err.message}`);
      }
    }

    // Only write to Redis if it was available during this request
    if (!quotaBypass) {
      if (!reservationUpdated) {
        redisWrites.push(
          this.redis.incrbyfloat(spendKey, costUsd)
            .then(() => this.redis.expire(spendKey, 60 * 60 * 24 * 35))
        );
      }

      redisWrites.push(
        this.redis.eval(
          `redis.call('ZADD', KEYS[1], ARGV[1], ARGV[2])
           redis.call('EXPIRE', KEYS[1], 61)`,
          1, rpmKey, now, `${now}:${requestId}`,
        ),
        this.redis.eval(
          `redis.call('ZADD', KEYS[1], ARGV[1], ARGV[2])
           redis.call('EXPIRE', KEYS[1], 61)`,
          1, tpmKey, now, `${now}:${requestId}:${totalTokens}`,
        ),
      );

      // Store agent reasoning budgets metrics inside session:metrics key
      if (sessionId) {
        const sessionKey = `session:metrics:${sessionId}`;
        redisWrites.push(
          this.redis.hincrby(sessionKey, 'total_calls', 1),
          this.redis.hincrbyfloat(sessionKey, 'total_cost_usd', costUsd),
        );
      }
    }

    // Postgres audit record — fire-and-forget (never blocks client response)
    const dbWrite = apiKeyId === 'dev'
      ? Promise.resolve()
      : this.prisma.usageRecord.create({
          data: {
            requestId,
            apiKeyId,
            organizationId,
            provider,
            model,
            promptTokens,
            completionTokens,
            totalTokens,
            costUsd: costUsd.toFixed(6),
            estimatedCost: estimatedCost ?? 0,
            providerChain,
            isDegraded,
            latencyMs,
            cacheHit: false,
            sessionId: sessionId || null,
          },
        }).catch(err => this.logger.error(`UsageRecord write failed: ${err.message}`));

    // Run all writes in parallel
    try {
      await Promise.all([...redisWrites, dbWrite]);
    } catch (err) {
      this.logger.error(`Usage accumulation parallel write error: ${err.message}`);
    }
  }

  async cleanupExpiredReservations(): Promise<void> {
    // 10 minutes ago
    const cutoff = new Date(Date.now() - 10 * 60 * 1000);

    // 1. Process CREATED reservations separately (expire directly with no Redis interaction)
    const expiredCreated = await this.prisma.budgetReservation.findMany({
      where: {
        status: ReservationStatus.CREATED,
        createdAt: {
          lt: cutoff,
        },
      },
      take: 50,
    });

    for (const res of expiredCreated) {
      try {
        await this.prisma.budgetReservation.update({
          where: { id: res.id },
          data: {
            status: ReservationStatus.EXPIRED,
            lastError: 'Reservation expired before Redis precharge.',
          },
        });
      } catch (err) {
        this.logger.error(`Failed to expire CREATED reservation ${res.requestId}: ${err.message}`);
      }
    }

    // 2. Process PRECHARGED reservations separately (requires Redis refund)
    const expiredPrecharged = await this.prisma.budgetReservation.findMany({
      where: {
        status: ReservationStatus.PRECHARGED,
        createdAt: {
          lt: cutoff,
        },
        attempts: {
          lt: 5,
        },
        OR: [
          { nextRetryAt: null },
          { nextRetryAt: { lt: new Date() } },
        ],
      },
      take: 50,
    });

    if (expiredPrecharged.length === 0) {
      return;
    }

    this.logger.log(`Found ${expiredPrecharged.length} expired reservations for cleanup.`);

    for (const res of expiredPrecharged) {
      const { id, requestId, spendKey, status } = res;
      const prechargeKey = `quota:precharge:${requestId}`;

      // Transition to REFUND_PENDING
      await this.prisma.budgetReservation.update({
        where: { id },
        data: {
          status: ReservationStatus.REFUND_PENDING,
          attempts: { increment: 1 },
        },
      });

      try {
        let refunded = false;
        let refundAmount = 0;

        if (this.redis.isAvailable()) {
          const evalRes = await this.redis.eval(REFUND_LUA, 2, spendKey, prechargeKey);
          if (evalRes && evalRes[0] === 1) {
            refunded = true;
            refundAmount = evalRes[1];
          }
        } else {
          throw new Error('Redis unavailable during cleanup');
        }

        // Successfully processed. Transition to REFUNDED.
        await this.prisma.budgetReservation.update({
          where: { id },
          data: {
            status: ReservationStatus.REFUNDED,
            refundedAt: new Date(),
            actualCostUsd: 0,
            reconciledDeltaUsd: -refundAmount,
            lastError: refunded ? 'Refunded estimated cost from Redis' : 'No precharge key found in Redis (already reconciled/deleted)',
          },
        });
      } catch (err) {
        this.logger.error(`Failed to process refund for reservation ${requestId}: ${err.message}`);
        const nextAttempts = res.attempts + 1;
        const statusBack = nextAttempts >= 5 ? ReservationStatus.DEAD_LETTER : status;
        const nextRetry = nextAttempts >= 5 ? null : new Date(Date.now() + 60000 * nextAttempts);

        await this.prisma.budgetReservation.update({
          where: { id },
          data: {
            status: statusBack,
            nextRetryAt: nextRetry,
            lastError: err.message,
          },
        });
      }
    }
  }
}
