import {
  Controller,
  Post,
  Body,
  Headers,
  BadRequestException,
  Logger,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { Webhook } from 'svix';
import { RateLimitGuard } from '../auth/rate-limit.guard';

type ClerkEvent = {
  type: string;
  data: Record<string, any>;
};

@Controller('webhooks/clerk')
@UseGuards(RateLimitGuard)
export class ClerkWebhookController {
  private readonly logger = new Logger(ClerkWebhookController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async handleClerkWebhook(
    @Body() event: ClerkEvent,
    @Req() req: any,
  ) {
    const secret = process.env.CLERK_WEBHOOK_SECRET;
    if (!secret || secret.includes('REPLACE')) {
      throw new BadRequestException('Clerk webhook secret is not configured');
    }

    const svixId = req.headers['svix-id'] as string;
    const svixTimestamp = req.headers['svix-timestamp'] as string;
    const svixSignature = req.headers['svix-signature'] as string;

    if (!svixId || !svixTimestamp || !svixSignature) {
      throw new BadRequestException('Missing Svix headers');
    }

    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(event);

    try {
      const wh = new Webhook(secret);
      wh.verify(rawBody, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      });
    } catch (err: any) {
      this.logger.error(`Clerk webhook verification failed: ${err.message}`);
      throw new BadRequestException('Invalid Svix signature');
    }

    this.logger.log(`Clerk event verified: ${event.type}`);

    switch (event.type) {
      case 'user.created':
        await this.handleUserCreated(event.data);
        break;
      case 'user.updated':
        await this.handleUserUpdated(event.data);
        break;
      case 'organization.created':
        await this.handleOrgCreated(event.data);
        break;
      case 'organizationMembership.created':
        await this.handleMembershipCreated(event.data);
        break;
      default:
        this.logger.debug(`Unhandled Clerk event: ${event.type}`);
    }

    return { received: true };
  }

  private async handleUserCreated(data: Record<string, any>) {
    const email = data.email_addresses?.[0]?.email_address;
    if (!email) return;

    await this.prisma.user.updateMany({
      where: { clerkUserId: data.id },
      data: { email },
    });
    this.logger.log(`User observed: ${email}. Organization binding is deferred until membership sync.`);
  }

  private async handleUserUpdated(data: Record<string, any>) {
    const email = data.email_addresses?.[0]?.email_address;
    if (!email) return;

    await this.prisma.user.updateMany({
      where: { clerkUserId: data.id },
      data: { email },
    });
    this.logger.log(`User updated: ${data.id}`);
  }

  private async handleOrgCreated(data: Record<string, any>) {
    await this.prisma.organization.upsert({
      where: { clerkOrgId: data.id },
      create: {
        clerkOrgId: data.id,
        name: data.name,
        plan: 'FREE',
      },
      update: { name: data.name },
    });
    this.logger.log(`Organization synced: ${data.name}`);
  }

  private async handleMembershipCreated(data: Record<string, any>) {
    const org = await this.prisma.organization.findUnique({
      where: { clerkOrgId: data.organization?.id },
    });
    if (!org) return;

    const roleMap: Record<string, UserRole> = {
      admin: UserRole.ADMIN,
      basic_member: UserRole.CLIENT_VIEWER,
    };
    const role = roleMap[data.role] ?? UserRole.CLIENT_VIEWER;

    const clerkUserId = data.public_user_data?.user_id;
    const email = data.public_user_data?.identifier ?? `${clerkUserId}@unknown.clerk`;
    if (!clerkUserId) {
      this.logger.warn('Clerk membership event missing public_user_data.user_id');
      return;
    }

    await this.prisma.user.upsert({
      where: { clerkUserId },
      create: {
        clerkUserId,
        email,
        organizationId: org.id,
        role,
      },
      update: { organizationId: org.id, role, email },
    });
    this.logger.log(`Membership set: user→org ${org.name} as ${role}`);
  }
}
