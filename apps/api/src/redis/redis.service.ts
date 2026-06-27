import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import CircuitBreaker from 'opossum';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  private breaker: CircuitBreaker;
  private useFallback = false;

  // In-memory fallback datastores
  private memStore = new Map<string, string>();
  private memHashes = new Map<string, Map<string, string>>();
  private memTTLs = new Map<string, number>(); // expiration timestamp in ms

  onModuleInit() {
    this.client = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      lazyConnect: true, // connect on-demand to prevent startup blockage
      enableOfflineQueue: false, // fail fast — don't queue commands
      connectTimeout: 2000,
      commandTimeout: 500,
    });

    this.client.on('error', (err) => {
      this.logger.warn(`Redis connection error: ${err.message}. Routing traffic to in-memory fallback.`);
      this.useFallback = true;
    });

    this.client.on('connect', () => {
      this.logger.log('Redis connected successfully.');
      this.useFallback = false;
    });

    // Circuit breaker wraps the raw client execute call
    this.breaker = new CircuitBreaker(
      (cmd: () => Promise<any>) => cmd(),
      {
        timeout: 500,              // single command timeout
        errorThresholdPercentage: 50,
        resetTimeout: 10000,      // try to reclose after 10s
        volumeThreshold: 5,
      },
    );

    this.breaker.on('open', () => {
      this.logger.warn('Redis circuit OPEN — using in-memory fallback');
      this.useFallback = true;
    });
    this.breaker.on('halfOpen', () => this.logger.log('Redis circuit HALF-OPEN — probing'));
    this.breaker.on('close', () => {
      this.logger.log('Redis circuit CLOSED — recovered');
      this.useFallback = false;
    });
  }

  async onModuleDestroy() {
    await this.client.quit().catch(() => {});
  }

  private readonly MAX_MEM_ENTRIES = 10000;

  // Helper to check and handle key expiration
  private isExpired(key: string): boolean {
    const expiry = this.memTTLs.get(key);
    if (expiry && expiry < Date.now()) {
      this.memStore.delete(key);
      this.memHashes.delete(key);
      this.memTTLs.delete(key);
      return true;
    }
    return false;
  }

  // Enforces a size cap on in-memory datastores to prevent OOM crashes
  private enforceLimits() {
    if (this.memStore.size > this.MAX_MEM_ENTRIES) {
      const oldestKey = this.memStore.keys().next().value;
      if (oldestKey !== undefined) {
        this.memStore.delete(oldestKey);
        this.memTTLs.delete(oldestKey);
      }
    }
    if (this.memHashes.size > this.MAX_MEM_ENTRIES) {
      const oldestKey = this.memHashes.keys().next().value;
      if (oldestKey !== undefined) {
        this.memHashes.delete(oldestKey);
        this.memTTLs.delete(oldestKey);
      }
    }
  }

  // ── Public proxy methods ─────────────────────────────────────────

  async get(key: string): Promise<string | null> {
    if (this.useFallback) {
      if (this.isExpired(key)) return null;
      return this.memStore.get(key) ?? null;
    }
    try {
      return (await this.breaker.fire(() => this.client.get(key))) as string | null;
    } catch (err) {
      this.logger.warn(`Redis command failed (get): ${err.message}. Using fallback.`);
      this.useFallback = true;
      if (this.isExpired(key)) return null;
      return this.memStore.get(key) ?? null;
    }
  }

  async set(key: string, value: string, ...args: any[]): Promise<any> {
    // Parse TTL if passed, e.g., 'EX', 300
    let ttlMs = 0;
    if (args && args.length >= 2) {
      const option = args[0];
      const val = parseInt(args[1], 10);
      if (option === 'EX') ttlMs = val * 1000;
      else if (option === 'PX') ttlMs = val;
    }

    if (this.useFallback) {
      this.memStore.set(key, value);
      this.enforceLimits();
      if (ttlMs > 0) this.memTTLs.set(key, Date.now() + ttlMs);
      else this.memTTLs.delete(key);
      return 'OK';
    }
    try {
      return await this.breaker.fire(() => (this.client.set as any)(key, value, ...args));
    } catch (err) {
      this.logger.warn(`Redis command failed (set): ${err.message}. Using fallback.`);
      this.useFallback = true;
      this.memStore.set(key, value);
      this.enforceLimits();
      if (ttlMs > 0) this.memTTLs.set(key, Date.now() + ttlMs);
      else this.memTTLs.delete(key);
      return 'OK';
    }
  }

  async del(key: string): Promise<number> {
    if (this.useFallback) {
      this.memTTLs.delete(key);
      const hashDeleted = this.memHashes.delete(key);
      const valDeleted = this.memStore.delete(key);
      return hashDeleted || valDeleted ? 1 : 0;
    }
    try {
      const res = await this.breaker.fire(() => this.client.del(key));
      return (res as number) ?? 0;
    } catch (err) {
      this.logger.warn(`Redis command failed (del): ${err.message}. Using fallback.`);
      this.useFallback = true;
      this.memTTLs.delete(key);
      const hashDeleted = this.memHashes.delete(key);
      const valDeleted = this.memStore.delete(key);
      return hashDeleted || valDeleted ? 1 : 0;
    }
  }

  async incrbyfloat(key: string, increment: number): Promise<string | null> {
    if (this.useFallback) {
      if (this.isExpired(key)) this.memStore.delete(key);
      const val = parseFloat(this.memStore.get(key) ?? '0') + increment;
      const valStr = val.toString();
      this.memStore.set(key, valStr);
      this.enforceLimits();
      return valStr;
    }
    try {
      return (await this.breaker.fire(() => this.client.incrbyfloat(key, increment))) as string | null;
    } catch (err) {
      this.logger.warn(`Redis command failed (incrbyfloat): ${err.message}. Using fallback.`);
      this.useFallback = true;
      if (this.isExpired(key)) this.memStore.delete(key);
      const val = parseFloat(this.memStore.get(key) ?? '0') + increment;
      const valStr = val.toString();
      this.memStore.set(key, valStr);
      this.enforceLimits();
      return valStr;
    }
  }

  async incr(key: string): Promise<number> {
    if (this.useFallback) {
      if (this.isExpired(key)) this.memStore.delete(key);
      const val = parseInt(this.memStore.get(key) ?? '0', 10) + 1;
      this.memStore.set(key, val.toString());
      return val;
    }
    try {
      const res = await this.breaker.fire(() => this.client.incr(key));
      return (res as number) ?? 0;
    } catch (err) {
      this.logger.warn(`Redis command failed (incr): ${err.message}. Using fallback.`);
      this.useFallback = true;
      if (this.isExpired(key)) this.memStore.delete(key);
      const val = parseInt(this.memStore.get(key) ?? '0', 10) + 1;
      this.memStore.set(key, val.toString());
      return val;
    }
  }

  async decr(key: string): Promise<number> {
    if (this.useFallback) {
      if (this.isExpired(key)) this.memStore.delete(key);
      const val = parseInt(this.memStore.get(key) ?? '0', 10) - 1;
      this.memStore.set(key, val.toString());
      return val;
    }
    try {
      const res = await this.breaker.fire(() => this.client.decr(key));
      return (res as number) ?? 0;
    } catch (err) {
      this.logger.warn(`Redis command failed (decr): ${err.message}. Using fallback.`);
      this.useFallback = true;
      if (this.isExpired(key)) this.memStore.delete(key);
      const val = parseInt(this.memStore.get(key) ?? '0', 10) - 1;
      this.memStore.set(key, val.toString());
      return val;
    }
  }

  async expire(key: string, seconds: number): Promise<number | null> {
    if (this.useFallback) {
      this.memTTLs.set(key, Date.now() + seconds * 1000);
      return 1;
    }
    try {
      return (await this.breaker.fire(() => this.client.expire(key, seconds))) as number | null;
    } catch (err) {
      this.logger.warn(`Redis command failed (expire): ${err.message}. Using fallback.`);
      this.useFallback = true;
      this.memTTLs.set(key, Date.now() + seconds * 1000);
      return 1;
    }
  }

  async ttl(key: string): Promise<number> {
    if (this.useFallback) {
      const expiry = this.memTTLs.get(key);
      if (!expiry) return -1;
      const diff = Math.ceil((expiry - Date.now()) / 1000);
      return diff > 0 ? diff : -2;
    }
    try {
      const res = await this.breaker.fire(() => this.client.ttl(key));
      return (res as number) ?? -1;
    } catch (err) {
      this.logger.warn(`Redis command failed (ttl): ${err.message}. Using fallback.`);
      this.useFallback = true;
      const expiry = this.memTTLs.get(key);
      if (!expiry) return -1;
      const diff = Math.ceil((expiry - Date.now()) / 1000);
      return diff > 0 ? diff : -2;
    }
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    if (this.useFallback) {
      if (this.isExpired(key)) return {};
      const hash = this.memHashes.get(key);
      if (!hash) return {};
      return Object.fromEntries(hash);
    }
    try {
      const res = await this.breaker.fire(() => this.client.hgetall(key));
      return (res as Record<string, string>) ?? {};
    } catch (err) {
      this.logger.warn(`Redis command failed (hgetall): ${err.message}. Using fallback.`);
      this.useFallback = true;
      if (this.isExpired(key)) return {};
      const hash = this.memHashes.get(key);
      if (!hash) return {};
      return Object.fromEntries(hash);
    }
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    if (this.useFallback) {
      if (this.isExpired(key)) this.memHashes.delete(key);
      let hash = this.memHashes.get(key);
      if (!hash) {
        hash = new Map<string, string>();
        this.memHashes.set(key, hash);
        this.enforceLimits();
      }
      const existed = hash.has(field);
      hash.set(field, value);
      return existed ? 0 : 1;
    }
    try {
      const res = await this.breaker.fire(() => this.client.hset(key, field, value));
      return (res as number) ?? 0;
    } catch (err) {
      this.logger.warn(`Redis command failed (hset): ${err.message}. Using fallback.`);
      this.useFallback = true;
      if (this.isExpired(key)) this.memHashes.delete(key);
      let hash = this.memHashes.get(key);
      if (!hash) {
        hash = new Map<string, string>();
        this.memHashes.set(key, hash);
        this.enforceLimits();
      }
      const existed = hash.has(field);
      hash.set(field, value);
      return existed ? 0 : 1;
    }
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    if (this.useFallback) {
      if (this.isExpired(key)) this.memHashes.delete(key);
      let hash = this.memHashes.get(key);
      if (!hash) {
        hash = new Map<string, string>();
        this.memHashes.set(key, hash);
        this.enforceLimits();
      }
      const val = parseInt(hash.get(field) ?? '0', 10) + increment;
      hash.set(field, val.toString());
      return val;
    }
    try {
      const res = await this.breaker.fire(() => this.client.hincrby(key, field, increment));
      return (res as number) ?? 0;
    } catch (err) {
      this.logger.warn(`Redis command failed (hincrby): ${err.message}. Using fallback.`);
      this.useFallback = true;
      if (this.isExpired(key)) this.memHashes.delete(key);
      let hash = this.memHashes.get(key);
      if (!hash) {
        hash = new Map<string, string>();
        this.memHashes.set(key, hash);
        this.enforceLimits();
      }
      const val = parseInt(hash.get(field) ?? '0', 10) + increment;
      hash.set(field, val.toString());
      return val;
    }
  }

  async hincrbyfloat(key: string, field: string, increment: number): Promise<string> {
    if (this.useFallback) {
      if (this.isExpired(key)) this.memHashes.delete(key);
      let hash = this.memHashes.get(key);
      if (!hash) {
        hash = new Map<string, string>();
        this.memHashes.set(key, hash);
        this.enforceLimits();
      }
      const val = parseFloat(hash.get(field) ?? '0') + increment;
      const valStr = val.toString();
      hash.set(field, valStr);
      return valStr;
    }
    try {
      const res = await this.breaker.fire(() => this.client.hincrbyfloat(key, field, increment));
      return (res as string) ?? "0";
    } catch (err) {
      this.logger.warn(`Redis command failed (hincrbyfloat): ${err.message}. Using fallback.`);
      this.useFallback = true;
      if (this.isExpired(key)) this.memHashes.delete(key);
      let hash = this.memHashes.get(key);
      if (!hash) {
        hash = new Map<string, string>();
        this.memHashes.set(key, hash);
        this.enforceLimits();
      }
      const val = parseFloat(hash.get(field) ?? '0') + increment;
      const valStr = val.toString();
      hash.set(field, valStr);
      return valStr;
    }
  }

  // Raw eval for Lua scripts
  async eval(script: string, numkeys: number, ...args: (string | number)[]): Promise<any> {
    if (this.useFallback) {
      return [1, Date.now()];
    }
    try {
      return await this.breaker.fire(() => (this.client.eval as any)(script, numkeys, ...args));
    } catch (err) {
      this.logger.warn(`Redis command failed (eval): ${err.message}. Routing to fallback.`);
      this.useFallback = true;
      return [1, Date.now()];
    }
  }

  isAvailable(): boolean {
    return !this.useFallback;
  }

  isFallbackActive(): boolean {
    return this.useFallback;
  }
}
