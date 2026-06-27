import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import * as crypto from 'crypto';

@Injectable()
export class KeysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findAll(organizationId: string) {
    const keys = await this.prisma.apiKey.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return keys.map(k => ({
      ...k,
      key: k.preview || `selixes_live_••••••••••••`,
    }));
  }

  async create(organizationId: string, name: string) {
    const rawKey = 'selixes_live_' + crypto.randomBytes(16).toString('hex');
    const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');
    const preview = 'selixes_live_••••••••' + rawKey.slice(-4);
    
    const apiKey = await this.prisma.apiKey.create({
      data: {
        organizationId,
        name,
        key: hashedKey,
        preview,
        status: 'ACTIVE',
      },
    });

    return {
      ...apiKey,
      key: rawKey,
    };
  }

  async revoke(organizationId: string, id: string) {
    const key = await this.prisma.apiKey.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!key) {
      throw new NotFoundException('API Key not found or belongs to another organization');
    }

    const updatedKey = await this.prisma.apiKey.update({
      where: { id },
      data: { status: 'REVOKED' },
    });

    // Immediately invalidate Redis metadata cache (since db contains the hash, key.key is already hashed)
    await this.redis.del(`api:key:meta:${key.key}`).catch(() => {});

    return updatedKey;
  }
}

