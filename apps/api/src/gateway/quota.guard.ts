import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { v4 as uuidv4 } from 'uuid';
import { PRICING } from './usage-accumulator.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationStatus } from '@prisma/client';

const BUDGET_CHECK_LUA = `
local spend_key = KEYS[1]
local precharge_key = KEYS[2]
local cap = tonumber(ARGV[1])
local est_cost = tonumber(ARGV[2])

local current = tonumber(redis.call('GET', spend_key) or '0')
if current >= cap then
  return {0, current}
elseif current + est_cost > cap then
  return {0, current}
else
  redis.call('INCRBYFLOAT', spend_key, est_cost)
  redis.call('SET', precharge_key, tostring(est_cost), 'EX', 3600)
  return {1, current + est_cost}
end
`;

// ── Lua script: atomic sliding window check-and-admit ──────────────────────
// Uses Redis server TIME as authoritative clock (fixes G7 clock skew)
// Member = `${nowMs}:${requestId}` to prevent same-millisecond ZADD collisions
// Returns {admitted, nowMs} (1 = admitted, 0 = rejected)
const SLIDING_WINDOW_LUA = `
local key       = KEYS[1]
local limit     = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local member    = ARGV[3]

local t       = redis.call('TIME')
local now_ms  = tonumber(t[1]) * 1000 + math.floor(tonumber(t[2]) / 1000)
local min_score = now_ms - window_ms

redis.call('ZREMRANGEBYSCORE', key, '-inf', min_score)
local current = tonumber(redis.call('ZCARD', key))

if current < limit then
  redis.call('ZADD', key, now_ms, member)
  redis.call('EXPIRE', key, math.ceil(window_ms / 1000) + 1)
  return {1, now_ms}
else
  return {0, now_ms}
end
`;

const PLAN_LIMITS: Record<string, { rpm: number | null; tpm: number | null }> = {
  'FREE':       { rpm: 60,   tpm: 50000 },
  'COMMUNITY':  { rpm: 120,  tpm: 100000 },
  'PRO':        { rpm: 1000, tpm: 1000000 },
  'ENTERPRISE': { rpm: null, tpm: null },
};

// ── Token estimation ────────────────────────────────────────────────────────
// Returns a conservative over-estimate to err on the side of protecting limits
const CHARS_PER_TOKEN: Record<string, number> = {
  'gpt-4o':       4.0,
  'gpt-4o-mini':  4.0,
  'gpt-4-turbo':  4.0,
  'claude-3-5-sonnet': 3.5,
  'claude-3-haiku':    3.5,
  default:         3.5,   // conservative fallback
};
const COMPLETION_MULTIPLIER = 1.5; // over-estimate completion tokens pre-flight

function estimateTokens(model: string, messages: Array<{ role: string; content: string }>): number {
  const charsPerToken = CHARS_PER_TOKEN[model] ?? CHARS_PER_TOKEN.default;
  const totalChars = messages.reduce((sum, m) => sum + (m.content?.length ?? 0), 0);
  const promptTokens = Math.ceil(totalChars / charsPerToken);
  return Math.ceil(promptTokens * (1 + COMPLETION_MULTIPLIER));
}

// ── Retry-After helpers ─────────────────────────────────────────────────────
function secondsUntilNextMonth(): number {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  return Math.ceil((nextMonth.getTime() - now.getTime()) / 1000);
}

@Injectable()
export class QuotaGuard implements CanActivate {
  private readonly logger = new Logger(QuotaGuard.name);

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const apiKey = req.resolvedApiKey;

    if (!apiKey) {
      // Bypassed or not resolved (e.g. standard Clerk JWT on dashboard)
      return true;
    }

    const { dailyRpmLimit, dailyTpmLimit, monthlyUsdCap, orgPlan, organizationId } = apiKey;
    const keyId = apiKey.id;
    const orgLimits = PLAN_LIMITS[orgPlan ?? 'FREE'] ?? PLAN_LIMITS.FREE;
    const orgRpmLimit = orgLimits.rpm;
    const orgTpmLimit = orgLimits.tpm;

    // ── Fast path: no limits configured ───────────────────────────────────
    if (!dailyRpmLimit && !dailyTpmLimit && !monthlyUsdCap && !orgRpmLimit && !orgTpmLimit) {
      return true;
    }

    // ── Fail-open/closed: Redis unavailable ───────────────────────────────────────
    if (!this.redis.isAvailable()) {
      const isCloudTier = process.env.SELIXES_TIER === 'cloud' || process.env.GATEWAY_TIER === 'cloud';
      if (isCloudTier) {
        this.logger.error(`[SECURITY_ALERT] Redis down in Cloud Tier. Blocking request for key ${keyId} (fail-closed).`);
        throw new HttpException(
          { error: 'service_unavailable', message: 'Quota enforcement service is temporarily unavailable.' },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      } else {
        this.logger.warn(`[SECURITY_ALERT] Redis is unavailable in Community/self-hosted tier. Failing open, quota checks bypassed for key ${keyId}.`);
        req.quotaBypass = true;  // signal to accumulator: skip Redis writes
        return true;
      }
    }

    const requestId = uuidv4();
    req.requestId = requestId;  // attach for later use in router and accumulator
    apiKey.requestId = requestId;  // propagate to GatewayService via resolvedApiKey

    const body = req.body ?? {};
    const model: string = body.model ?? 'gpt-4o';
    const messages = body.messages ?? [];

    try {
      // ── RPM check ──────────────────────────────────────────────────────────
      if (dailyRpmLimit) {
        const rpmKey = `quota:rpm:${keyId}`;
        const member = `${Date.now()}:${requestId}`;
        const result: number[] = await this.redis.eval(
          SLIDING_WINDOW_LUA, 1, rpmKey, dailyRpmLimit, 60000, member,
        );
        if (result && result[0] === 0) {
          throw new HttpException(
            { error: 'rate_limit_exceeded', type: 'rpm',
              message: 'Requests per minute limit exceeded. Please retry later.' },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }

      // ── Organization aggregate RPM check ───────────────────────────────────
      if (orgRpmLimit) {
        const orgRpmKey = `quota:org:rpm:${organizationId}`;
        const member = `${Date.now()}:${requestId}`;
        const result: number[] = await this.redis.eval(
          SLIDING_WINDOW_LUA, 1, orgRpmKey, orgRpmLimit, 60000, member,
        );
        if (result && result[0] === 0) {
          throw new HttpException(
            { error: 'rate_limit_exceeded', type: 'org_rpm',
              message: 'Organization aggregate requests per minute limit exceeded. Please retry later.' },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }

      // ── TPM pre-flight estimate ────────────────────────────────────────────
      if (dailyTpmLimit) {
        const estimatedTokens = estimateTokens(model, messages);
        const tpmKey = `quota:tpm:${keyId}`;
        const member = `${Date.now()}:${requestId}:${estimatedTokens}`;
        const result: number[] = await this.redis.eval(
          SLIDING_WINDOW_LUA, 1, tpmKey, dailyTpmLimit, 60000, member,
        );
        if (result && result[0] === 0) {
          throw new HttpException(
            { error: 'rate_limit_exceeded', type: 'tpm',
              message: 'Tokens per minute limit exceeded. Please retry later.' },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
        req.estimatedTokens = estimatedTokens;
      }

      // ── Organization aggregate TPM check ───────────────────────────────────
      if (orgTpmLimit) {
        const estimatedTokens = estimateTokens(model, messages);
        const orgTpmKey = `quota:org:tpm:${organizationId}`;
        const member = `${Date.now()}:${requestId}:${estimatedTokens}`;
        const result: number[] = await this.redis.eval(
          SLIDING_WINDOW_LUA, 1, orgTpmKey, orgTpmLimit, 60000, member,
        );
        if (result && result[0] === 0) {
          throw new HttpException(
            { error: 'rate_limit_exceeded', type: 'org_tpm',
              message: 'Organization aggregate tokens per minute limit exceeded. Please retry later.' },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }

      // ── Monthly budget cap ─────────────────────────────────────────────────
      if (monthlyUsdCap) {
        const month = new Date().toISOString().slice(0, 7); // YYYY-MM
        const spendKey = `quota:spend:${keyId}:${month}`;

        // Estimate the cost of this request pre-flight
        const prices = PRICING[model] ?? { prompt: 0.005, completion: 0.015 };
        const charsPerToken = CHARS_PER_TOKEN[model] ?? CHARS_PER_TOKEN.default;
        const totalChars = messages.reduce((sum, m) => sum + (m.content?.length ?? 0), 0);
        const promptTokens = Math.ceil(totalChars / charsPerToken);
        const completionTokens = Math.ceil(promptTokens * COMPLETION_MULTIPLIER);
        const estimatedCost = (promptTokens / 1000) * prices.prompt + (completionTokens / 1000) * prices.completion;

        const cap = parseFloat(monthlyUsdCap.toString());

        // Step 1: Create reservation record as CREATED in database
        let reservation;
        try {
          reservation = await this.prisma.budgetReservation.create({
            data: {
              requestId,
              apiKeyId: keyId,
              organizationId,
              month,
              spendKey,
              estimatedCostUsd: estimatedCost,
              status: ReservationStatus.CREATED,
            },
          });
        } catch (dbErr) {
          this.logger.error(`Failed to create BudgetReservation for request ${requestId}: ${dbErr.message}`);
          const isCloudTier = process.env.SELIXES_TIER === 'cloud' || process.env.GATEWAY_TIER === 'cloud';
          if (isCloudTier) {
            throw new HttpException(
              { error: 'service_unavailable', message: 'Quota reservation system is temporarily unavailable.' },
              HttpStatus.SERVICE_UNAVAILABLE,
            );
          }
        }

        const prechargeKey = `quota:precharge:${requestId}`;

        let result: number[];
        try {
          result = await this.redis.eval(
            BUDGET_CHECK_LUA, 2, spendKey, prechargeKey, cap, estimatedCost,
          );
        } catch (redisErr) {
          // Rollback reservation record in DB
          if (reservation) {
            await this.prisma.budgetReservation.delete({ where: { id: reservation.id } }).catch(() => {});
          }
          throw redisErr;
        }

        if (result && result[0] === 0) {
          // Rejected. Delete reservation record.
          if (reservation) {
            await this.prisma.budgetReservation.delete({ where: { id: reservation.id } }).catch(() => {});
          }
          const retryAfter = secondsUntilNextMonth();
          throw new HttpException(
            { error: 'rate_limit_exceeded', type: 'budget',
              message: 'Monthly spending budget cap exceeded.',
              retryAfterSeconds: retryAfter },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        // Success: Update reservation to PRECHARGED
        if (reservation) {
          await this.prisma.budgetReservation.update({
            where: { id: reservation.id },
            data: {
              status: ReservationStatus.PRECHARGED,
              prechargedAt: new Date(),
            },
          }).catch((dbErr) => {
            this.logger.error(`Failed to update BudgetReservation to PRECHARGED for request ${requestId}: ${dbErr.message}`);
          });
        }

        // Store estimatedCost on apiKey to pass it down to accumulator
        apiKey.estimatedCost = estimatedCost;
      }
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      const isCloudTier = process.env.SELIXES_TIER === 'cloud' || process.env.GATEWAY_TIER === 'cloud';
      if (isCloudTier) {
        this.logger.error(`[SECURITY_ALERT] Quota check encountered Redis error in Cloud Tier, failing closed: ${err.message}`);
        throw new HttpException(
          { error: 'service_unavailable', message: 'Quota enforcement service encountered an error.' },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      this.logger.warn(`Quota check encountered Redis error, failing open: ${err.message}`);
      req.quotaBypass = true;
      return true;
    }

    return true;
  }
}
