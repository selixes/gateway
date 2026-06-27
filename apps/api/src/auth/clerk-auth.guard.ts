import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { verifyToken } from '@clerk/backend';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface ApiKeyMeta {
  id: string;
  organizationId: string;
  status: string;
  dailyRpmLimit: number | null;
  dailyTpmLimit: number | null;
  monthlyUsdCap: string | null; // Decimal serialized as string
  orgPlan?: string;
}

const KEY_FORMAT = /^(selixes|apishield)_live_[a-f0-9]{32}$/;
const CACHE_TTL = 300; // 5 minutes, fixed - NOT sliding

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClerkAuthGuard.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    this.ensureClerkEnv();
    if (process.env.DEV_BYPASS_TOKEN) {
      this.logger.warn(
        `⚠️ WARNING: Development auth bypass is active using the token specified in DEV_BYPASS_TOKEN environment variable. This should NEVER be configured in production.`,
      );
    }
  }

  private ensureClerkEnv() {
    if (!process.env.CLERK_SECRET_KEY || process.env.CLERK_SECRET_KEY.includes('REPLACE')) {
      try {
        const pathsToTry = [
          path.join(process.cwd(), '../../apps/web/.clerk/.tmp/keyless.json'),
          path.join(process.cwd(), 'apps/web/.clerk/.tmp/keyless.json'),
          path.join(__dirname, '../../../../web/.clerk/.tmp/keyless.json'),
          path.join(__dirname, '../../../../apps/web/.clerk/.tmp/keyless.json'),
        ];

        for (const p of pathsToTry) {
          if (fs.existsSync(p)) {
            const keyless = JSON.parse(fs.readFileSync(p, 'utf8'));
            if (keyless.secretKey) {
              process.env.CLERK_SECRET_KEY = keyless.secretKey;
              this.logger.log(
                `🗝️ Loaded Clerk Keyless secret key dynamically. Key type: ${keyless.secretKey.startsWith('sk_live_') ? 'live' : 'test'}`,
              );
              return;
            }
          }
        }
      } catch (err) {
        this.logger.warn(
          `Failed to dynamically load Clerk Keyless credentials: ${err.message}`,
        );
      }
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader: string = req.headers['authorization'] ?? '';

    // ── Step 1: Extract bearer token ─────────────────────────────
    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Authorization header');
    }
    const token = authHeader.slice(7);

    // ── Step 2: Dev bypass (no DB, no Redis) ──────────────────────
    const bypassToken = process.env.DEV_BYPASS_TOKEN;
    if (bypassToken && token === bypassToken) {
      if (process.env.NODE_ENV === 'production') {
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
        this.logger.error(
          `[SECURITY_ALERT] gateway_auth_bypass_attempts_total: Unauthorized auth bypass attempt in production from IP ${clientIp}`,
        );
        throw new UnauthorizedException('Authentication bypasses are disabled in production.');
      }

      let defaultOrg = await this.prisma.organization.findFirst({
        where: { clerkOrgId: 'demo_org_001' },
      });
      if (!defaultOrg) {
        defaultOrg = await this.prisma.organization.findFirst();
      }
      const orgId = defaultOrg ? defaultOrg.id : 'dev-sandbox';

      req.resolvedApiKey = {
        id: 'dev',
        organizationId: orgId,
        status: 'ACTIVE',
        dailyRpmLimit: null,
        dailyTpmLimit: null,
        monthlyUsdCap: null,
      };
      req['userId'] = 'demo_user_001';
      req['orgId'] = orgId;
      req['userRole'] = 'ADMIN';
      return true;
    }

    // ── Step 3: Check credentials type ────────────────────────────
    if (token.startsWith('selixes_live_') || token.startsWith('apishield_live_')) {
      // ── Step 3a: Regex pre-filter (zero DB cost for garbage keys) ──
      if (!KEY_FORMAT.test(token)) {
        throw new UnauthorizedException('Invalid or revoked API Key');
      }

      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      // ── Step 3b: Redis key cache lookup ───────────────────────────
      const cacheKey = `api:key:meta:${hashedToken}`;
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          const meta: ApiKeyMeta = JSON.parse(cached);
          if (meta.status === 'REVOKED') {
            throw new UnauthorizedException('Invalid or revoked API Key');
          }
          req.resolvedApiKey = meta;
          return true;
        }
      } catch (err) {
        this.logger.warn(`Redis key meta lookup error: ${err.message}`);
        // Redis unavailable — fall through to Postgres
      }

      // ── Step 3c: Postgres lookup fallback ──────────────────────────
      try {
        const apiKey = await this.prisma.apiKey.findUnique({
          where: { key: hashedToken },
          select: {
            id: true,
            organizationId: true,
            status: true,
            dailyRpmLimit: true,
            dailyTpmLimit: true,
            monthlyUsdCap: true,
            organization: {
              select: {
                plan: true,
              },
            },
          },
        });

        if (!apiKey || apiKey.status === 'REVOKED') {
          throw new UnauthorizedException('Invalid or revoked API Key');
        }

        // Cache the metadata in Redis with fixed TTL
        const meta: ApiKeyMeta = {
          id: apiKey.id,
          organizationId: apiKey.organizationId,
          status: apiKey.status,
          dailyRpmLimit: apiKey.dailyRpmLimit,
          dailyTpmLimit: apiKey.dailyTpmLimit,
          monthlyUsdCap: apiKey.monthlyUsdCap?.toString() ?? null,
          orgPlan: apiKey.organization?.plan,
        };
        await this.redis
          .set(cacheKey, JSON.stringify(meta), 'EX', CACHE_TTL)
          .catch(() => {}); // Redis write failures are non-fatal

        req.resolvedApiKey = meta;
        return true;
      } catch (err) {
        if (err instanceof UnauthorizedException) throw err;
        this.logger.error(`Database key lookup error: ${err.message}`);
        // Both Redis and Postgres are offline
        throw new ServiceUnavailableException('Auth service temporarily unavailable');
      }
    } else {
      // ── Step 4: Handle standard Clerk JWT session token ───────────
      this.ensureClerkEnv();

      if (!process.env.CLERK_SECRET_KEY || process.env.CLERK_SECRET_KEY.includes('REPLACE')) {
        this.logger.error('Clerk secret key is missing or not configured.');
        throw new UnauthorizedException('Clerk authentication is not configured');
      }

      try {
        // Local signature verification using Clerk's JWKS
        const payload = await verifyToken(token, {
          secretKey: process.env.CLERK_SECRET_KEY,
        });

        // Map Clerk organization ID to internal Organization UUID
        const clerkOrgId = (payload as any).org_id;
        if (!clerkOrgId) {
          throw new UnauthorizedException('No active organization selected. Please select or join an organization.');
        }

        const dbOrg = await this.prisma.organization.findUnique({
          where: { clerkOrgId },
        });

        if (!dbOrg) {
          throw new UnauthorizedException('Selected organization is not synchronized in the Selixes database.');
        }

        const dbUser = await this.prisma.user.findUnique({
          where: { clerkUserId: payload.sub },
          select: { role: true },
        });

        req['userId'] = payload.sub;
        req['orgId'] = dbOrg.id;
        req['userRole'] = dbUser ? dbUser.role : 'CLIENT_VIEWER';

        return true;
      } catch (err) {
        this.logger.warn(`Clerk Auth failed: ${err.message}`);
        throw new UnauthorizedException('Invalid or expired session');
      }
    }
  }
}
