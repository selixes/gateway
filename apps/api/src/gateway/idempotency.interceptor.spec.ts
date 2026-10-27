import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { RedisService } from '../redis/redis.service';

describe('IdempotencyInterceptor', () => {
  let interceptor: IdempotencyInterceptor;
  let mockRedis: jest.Mocked<Partial<RedisService>>;
  let mockContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    mockRedis = {
      isAvailable: jest.fn().mockReturnValue(true),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };

    mockReq = {
      headers: {
        'idempotency-key': 'idemp-uuid-12345',
      },
      resolvedApiKey: {
        id: 'key-test-123',
        organizationId: 'org-test-456',
      },
      method: 'POST',
      url: '/v1/chat/completions',
      body: {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello world' }],
      },
    };

    mockRes = {
      setHeader: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
    };

    mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockReq,
        getResponse: () => mockRes,
      }),
    } as any;

    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({ choices: [{ message: { content: 'Generated response' } }] })),
    };

    interceptor = new IdempotencyInterceptor(mockRedis as any);
  });

  it('should pass through directly if idempotency-key header is absent', async () => {
    delete mockReq.headers['idempotency-key'];
    const result$ = await interceptor.intercept(mockContext, mockCallHandler);
    
    expect(mockCallHandler.handle).toHaveBeenCalled();
    expect(mockRedis.get).not.toHaveBeenCalled();
    expect(mockRes.setHeader).not.toHaveBeenCalledWith('X-Idempotency-Cache', expect.any(String));
  });

  it('should pass through directly if resolvedApiKey is missing', async () => {
    delete mockReq.resolvedApiKey;
    const result$ = await interceptor.intercept(mockContext, mockCallHandler);

    expect(mockCallHandler.handle).toHaveBeenCalled();
    expect(mockRedis.get).not.toHaveBeenCalled();
  });

  it('should pass through directly if Redis is not available', async () => {
    mockRedis.isAvailable = jest.fn().mockReturnValue(false);
    const result$ = await interceptor.intercept(mockContext, mockCallHandler);

    expect(mockCallHandler.handle).toHaveBeenCalled();
    expect(mockRedis.get).not.toHaveBeenCalled();
  });

  it('should record MISS, acquire lock, call next.handle(), and cache completed response on fresh execution', async () => {
    mockRedis.get = jest.fn().mockResolvedValue(null);

    const result$ = await interceptor.intercept(mockContext, mockCallHandler);

    expect(mockRes.setHeader).toHaveBeenCalledWith('X-Idempotency-Cache', 'MISS');
    expect(mockRedis.set).toHaveBeenCalledWith(
      expect.stringContaining('idempotency:fingerprint:'),
      expect.stringContaining('"status":"RUNNING"'),
      'EX',
      300,
    );

    await new Promise<void>((resolve) => {
      result$.subscribe({
        next: (data) => {
          expect(data).toEqual({ choices: [{ message: { content: 'Generated response' } }] });
          // Verify that completed response was cached in Redis
          expect(mockRedis.set).toHaveBeenCalledWith(
            expect.stringContaining('idempotency:fingerprint:'),
            expect.stringContaining('"status":"COMPLETED"'),
            'EX',
            300,
          );
          resolve();
        },
      });
    });
  });

  it('should return cached response with HIT header if identical request was previously COMPLETED', async () => {
    const cachedRecord = {
      status: 'COMPLETED',
      response: { id: 'chatcmpl-cached-1', choices: [{ message: { content: 'Cached result' } }] },
      startedAt: Date.now() - 5000,
      completedAt: Date.now() - 4000,
    };
    mockRedis.get = jest.fn().mockResolvedValue(JSON.stringify(cachedRecord));

    const result$ = await interceptor.intercept(mockContext, mockCallHandler);

    expect(mockRes.setHeader).toHaveBeenCalledWith('X-Idempotency-Cache', 'HIT');
    expect(mockCallHandler.handle).not.toHaveBeenCalled();

    await new Promise<void>((resolve) => {
      result$.subscribe({
        next: (data) => {
          expect(data).toEqual(cachedRecord.response);
          resolve();
        },
      });
    });
  });

  it('should delete lock key in Redis and rethrow if next.handle() throws an error', async () => {
    mockRedis.get = jest.fn().mockResolvedValue(null);
    const downstreamError = new Error('Upstream provider rate limit');
    mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => downstreamError));

    const result$ = await interceptor.intercept(mockContext, mockCallHandler);

    await new Promise<void>((resolve, reject) => {
      result$.subscribe({
        next: () => reject(new Error('Should have failed')),
        error: (err) => {
          expect(err).toBe(downstreamError);
          expect(mockRedis.del).toHaveBeenCalledWith(expect.stringContaining('idempotency:fingerprint:'));
          resolve();
        },
      });
    });
  });
});
