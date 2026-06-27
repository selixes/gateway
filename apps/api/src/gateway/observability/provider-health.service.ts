import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class ProviderHealthService {
  private readonly logger = new Logger(ProviderHealthService.name);

  // Health calculation parameters
  private readonly BASE_SCORE = 100;
  private readonly CONCURRENCY_PENALTY_WEIGHT = 2; // Penalty per active concurrent request
  private readonly FAILURE_INITIAL_PENALTY = 50;   // Penalty applied on a failure
  private readonly DECAY_HALF_LIFE_SEC = 30;       // Penalty recovers by half every 30 seconds

  constructor(private readonly redis: RedisService) {}

  /**
   * Increments active concurrency count for a provider in Redis.
   */
  async incrementConcurrency(provider: string): Promise<number> {
    if (!this.redis.isAvailable()) return 0;
    try {
      const key = `gateway:health:concurrency:${provider}`;
      return await this.redis.incr(key);
    } catch (err: any) {
      this.logger.error(`Failed to increment concurrency for ${provider}: ${err.message}`);
      return 0;
    }
  }

  /**
   * Decrements active concurrency count for a provider in Redis.
   */
  async decrementConcurrency(provider: string): Promise<number> {
    if (!this.redis.isAvailable()) return 0;
    try {
      const key = `gateway:health:concurrency:${provider}`;
      const count = await this.redis.decr(key);
      if (count < 0) {
        await this.redis.set(key, '0');
        return 0;
      }
      return count;
    } catch (err: any) {
      this.logger.error(`Failed to decrement concurrency for ${provider}: ${err.message}`);
      return 0;
    }
  }

  /**
   * Returns the current active concurrency for a provider.
   */
  async getConcurrency(provider: string): Promise<number> {
    if (!this.redis.isAvailable()) return 0;
    try {
      const key = `gateway:health:concurrency:${provider}`;
      const val = await this.redis.get(key);
      return val ? Math.max(0, parseInt(val, 10)) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Records a provider failure and updates the penalty tracking in Redis.
   */
  async recordFailure(provider: string): Promise<void> {
    if (!this.redis.isAvailable()) return;
    try {
      const lastFailureKey = `gateway:health:last_failure:${provider}`;
      const failuresKey = `gateway:health:failures:${provider}`;

      await this.redis.set(lastFailureKey, Date.now().toString());
      await this.redis.incr(failuresKey);
      this.logger.warn(`Interrupted failure recorded for ${provider}. Penalty applied.`);
    } catch (err: any) {
      this.logger.error(`Failed to record failure for ${provider}: ${err.message}`);
    }
  }

  /**
   * Records a provider success, resetting consecutive failure counts in Redis.
   */
  async recordSuccess(provider: string): Promise<void> {
    if (!this.redis.isAvailable()) return;
    try {
      const failuresKey = `gateway:health:failures:${provider}`;
      await this.redis.set(failuresKey, '0');
    } catch (err: any) {
      this.logger.error(`Failed to record success for ${provider}: ${err.message}`);
    }
  }

  /**
   * Gets the dynamic health score of a provider, including half-life recovery.
   * HealthScore = BASE_SCORE - (ActiveConcurrency * weight) - (FailurePenalty * e^(-lambda * t))
   */
  async getHealthScore(provider: string): Promise<number> {
    if (!this.redis.isAvailable()) {
      return this.BASE_SCORE;
    }

    try {
      const concurrency = await this.getConcurrency(provider);
      const concurrencyPenalty = concurrency * this.CONCURRENCY_PENALTY_WEIGHT;

      const lastFailureKey = `gateway:health:last_failure:${provider}`;
      const failuresKey = `gateway:health:failures:${provider}`;

      const [lastFailureRaw, failuresRaw] = await Promise.all([
        this.redis.get(lastFailureKey),
        this.redis.get(failuresKey),
      ]);

      const lastFailureTime = lastFailureRaw ? parseInt(lastFailureRaw, 10) : 0;
      const failureCount = failuresRaw ? parseInt(failuresRaw, 10) : 0;

      let failurePenalty = 0;
      if (failureCount > 0 && lastFailureTime > 0) {
        const elapsedSec = (Date.now() - lastFailureTime) / 1000;
        const lambda = Math.log(2) / this.DECAY_HALF_LIFE_SEC;
        const rawPenalty = failureCount * this.FAILURE_INITIAL_PENALTY;
        failurePenalty = rawPenalty * Math.exp(-lambda * elapsedSec);
      }

      const score = this.BASE_SCORE - concurrencyPenalty - failurePenalty;
      
      // Enforce lower bound of 0
      return Math.max(0, Math.round(score));
    } catch (err: any) {
      this.logger.error(`Error calculating health score for ${provider}: ${err.message}`);
      return this.BASE_SCORE;
    }
  }
}
