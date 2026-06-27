import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly RATE_LIMIT = 60; // 60 requests
  private readonly WINDOW_SECONDS = 60; // per 60 seconds

  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress || 'unknown';
    const path = request.route.path;

    if (!this.redis.isAvailable()) {
      // If Redis is down, we fail-open for health checks and webhooks
      return true;
    }

    const key = `ratelimit:${path}:${ip}`;
    
    try {
      const current = await this.redis.incr(key);
      if (current === 1) {
        await this.redis.expire(key, this.WINDOW_SECONDS);
      }

      if (current > this.RATE_LIMIT) {
        throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      // On internal redis error, fail-open
      return true;
    }
  }
}
