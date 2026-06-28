import { Controller, Get, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { RateLimitGuard } from '../auth/rate-limit.guard';

@Controller('health')
@UseGuards(RateLimitGuard)
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'selixes-gateway-api',
    };
  }

  @Get('liveness')
  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('readiness')
  async readiness() {
    const issues: string[] = [];

    // Check Redis
    if (!this.redis.isAvailable()) {
      issues.push('Redis is unavailable');
    }

    // Check Postgres
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (err: any) {
      issues.push(`PostgreSQL is unavailable: ${err.message}`);
    }

    if (issues.length > 0) {
      throw new ServiceUnavailableException({
        status: 'error',
        timestamp: new Date().toISOString(),
        details: issues,
      });
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: 'up',
        redis: 'up',
      },
    };
  }
}
