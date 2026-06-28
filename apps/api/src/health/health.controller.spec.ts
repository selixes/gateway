import { HealthController } from './health.controller';
import { ServiceUnavailableException } from '@nestjs/common';

function createMockRedis(isAvailable: boolean) {
  return {
    isAvailable: () => isAvailable,
  } as any;
}

function createMockPrisma(fails: boolean) {
  return {
    $queryRaw: fails
      ? jest.fn().mockRejectedValue(new Error('Connection failure'))
      : jest.fn().mockResolvedValue([{ '1': 1 }]),
  } as any;
}

describe('HealthController', () => {
  let controller: HealthController;

  it('should return service info on check', () => {
    controller = new HealthController(createMockPrisma(false), createMockRedis(true));
    const result = controller.check();
    expect(result.status).toBe('ok');
    expect(result.service).toBe('selixes-gateway-api');
  });

  it('should return ok on liveness', () => {
    controller = new HealthController(createMockPrisma(false), createMockRedis(true));
    const result = controller.liveness();
    expect(result.status).toBe('ok');
  });

  it('should return ok on readiness if all components are healthy', async () => {
    controller = new HealthController(createMockPrisma(false), createMockRedis(true));
    const result = await controller.readiness();
    expect(result.status).toBe('ok');
    expect(result.services.database).toBe('up');
    expect(result.services.redis).toBe('up');
  });

  it('should throw ServiceUnavailableException if Redis is down', async () => {
    controller = new HealthController(createMockPrisma(false), createMockRedis(false));
    await expect(controller.readiness()).rejects.toThrow(ServiceUnavailableException);
  });

  it('should throw ServiceUnavailableException if Postgres is down', async () => {
    controller = new HealthController(createMockPrisma(true), createMockRedis(true));
    await expect(controller.readiness()).rejects.toThrow(ServiceUnavailableException);
  });
});
