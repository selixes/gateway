import { PromptCacheInterceptor } from './prompt-cache.interceptor';
import { of } from 'rxjs';

describe('PromptCacheInterceptor', () => {
  let interceptor: PromptCacheInterceptor;
  let mockRedis: any;

  beforeEach(() => {
    mockRedis = {
      isAvailable: jest.fn().mockReturnValue(true),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
    };
    interceptor = new PromptCacheInterceptor(mockRedis);
  });

  function createMockContext(req: any, res: any) {
    return {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    } as any;
  }

  it('with no org, it sets X-Cache: BYPASS and does not touch Redis (read or write)', async () => {
    const headers: Record<string, string> = {};
    const req = {
      headers: {},
      body: { model: 'gpt-4o', messages: [{ role: 'user', content: 'test prompt' }] },
      resolvedApiKey: undefined,
      orgId: undefined,
      user: undefined,
    };
    const res = {
      setHeader: jest.fn((name, value) => {
        headers[name] = value;
      }),
    };
    const next = {
      handle: jest.fn().mockReturnValue(of({ result: 'ok' })),
    };

    const result$ = await interceptor.intercept(createMockContext(req, res), next);
    let output: any;
    result$.subscribe((val) => {
      output = val;
    });

    expect(headers['X-Cache']).toBe('BYPASS');
    expect(mockRedis.get).not.toHaveBeenCalled();
    expect(mockRedis.set).not.toHaveBeenCalled();
    expect(next.handle).toHaveBeenCalledTimes(1);
    expect(output).toEqual({ result: 'ok' });
  });

  it('with org A vs org B, the cache keys differ and isolate cached responses', async () => {
    const redisStore = new Map<string, string>();
    mockRedis.get.mockImplementation(async (key: string) => redisStore.get(key) || null);
    mockRedis.set.mockImplementation(async (key: string, val: string) => {
      redisStore.set(key, val);
      return 'OK';
    });

    const body = { model: 'gpt-4o', messages: [{ role: 'user', content: 'identical prompt' }] };

    // Org A request (miss, then next handler completes and would write on refresh or service)
    const headersA: Record<string, string> = {};
    const reqA = {
      headers: {},
      body,
      resolvedApiKey: { organizationId: 'org-A' },
    };
    const resA = {
      setHeader: jest.fn((name, value) => {
        headersA[name] = value;
      }),
    };
    const nextA = {
      handle: jest.fn().mockReturnValue(of({ choices: [{ message: { content: 'from org-A' } }] })),
    };

    await interceptor.intercept(createMockContext(reqA, resA), nextA);

    // Verify key queried for Org A contains org-A prefix
    expect(mockRedis.get).toHaveBeenCalledTimes(1);
    const keyOrgA = mockRedis.get.mock.calls[0][0];
    expect(keyOrgA).toContain('cache:prompt:org-A:');

    // Org B request with identical prompt body
    const headersB: Record<string, string> = {};
    const reqB = {
      headers: {},
      body,
      resolvedApiKey: { organizationId: 'org-B' },
    };
    const resB = {
      setHeader: jest.fn((name, value) => {
        headersB[name] = value;
      }),
    };
    const nextB = {
      handle: jest.fn().mockReturnValue(of({ choices: [{ message: { content: 'from org-B' } }] })),
    };

    await interceptor.intercept(createMockContext(reqB, resB), nextB);

    expect(mockRedis.get).toHaveBeenCalledTimes(2);
    const keyOrgB = mockRedis.get.mock.calls[1][0];
    expect(keyOrgB).toContain('cache:prompt:org-B:');

    // Cache keys MUST differ across tenants
    expect(keyOrgA).not.toEqual(keyOrgB);
  });
});
