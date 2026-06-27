import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

process.env.REPLAY_CRYPTO_SECRET = 'test-secure-replay-crypto-secret-key-32b';

class MockPrismaService {
  async onModuleInit() {}
  async $connect() {}
  async $disconnect() {}
  $queryRaw = jest.fn().mockResolvedValue([{}]);
}

class MockRedisService {
  async onModuleInit() {}
  async onModuleDestroy() {}
  isAvailable = jest.fn().mockReturnValue(true);
  get = jest.fn();
  set = jest.fn();
  del = jest.fn();
  incr = jest.fn().mockResolvedValue(1);
  expire = jest.fn();
}

import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/redis/redis.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env.DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/dummy';
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';
    process.env.REDIS_PASSWORD = 'dummy';
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
    process.env.CLERK_SECRET_KEY = 'sk_test_mock';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
    .overrideProvider(PrismaService)
    .useClass(MockPrismaService)
    .overrideProvider(RedisService)
    .useClass(MockRedisService)
    .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
