// Mock svix package
jest.mock('svix', () => {
  return {
    Webhook: jest.fn().mockImplementation((secret) => {
      return {
        verify: (payload: string, headers: any) => {
          if (headers['svix-signature'] === 'invalid_signature') {
            throw new Error('Invalid signature');
          }
          return JSON.parse(payload);
        },
      };
    }),
  };
});

import { ClerkWebhookController } from './clerk-webhook.controller';
import { BadRequestException } from '@nestjs/common';

function createMockPrisma() {
  return {
    user: {
      upsert: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({}),
    },
    organization: {
      upsert: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn().mockResolvedValue({ id: 'org-uuid-1', name: 'Acme' }),
    },
  } as any;
}

describe('ClerkWebhookController', () => {
  let controller: ClerkWebhookController;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    controller = new ClerkWebhookController(mockPrisma);
    process.env.CLERK_WEBHOOK_SECRET = 'whsec_test_secret';
  });

  afterEach(() => {
    delete process.env.CLERK_WEBHOOK_SECRET;
  });

  it('should verify signature successfully and process user.created event', async () => {
    const event = {
      type: 'user.created',
      data: {
        id: 'user_1',
        email_addresses: [{ email_address: 'test@example.com' }],
      },
    };

    const mockReq = {
      headers: {
        'svix-id': 'msg_1',
        'svix-timestamp': '123456',
        'svix-signature': 'valid_signature',
      },
      rawBody: Buffer.from(JSON.stringify(event)),
    };

    const result = await controller.handleClerkWebhook(event, mockReq);
    expect(result).toEqual({ received: true });
    expect(mockPrisma.user.updateMany).toHaveBeenCalled();
  });

  it('should verify signature successfully and process organizationMembership.created event', async () => {
    const event = {
      type: 'organizationMembership.created',
      data: {
        role: 'admin',
        organization: { id: 'clerk_org_1' },
        public_user_data: {
          user_id: 'user_1',
          identifier: 'test@example.com',
        },
      },
    };

    const mockReq = {
      headers: {
        'svix-id': 'msg_2',
        'svix-timestamp': '123456',
        'svix-signature': 'valid_signature',
      },
      rawBody: Buffer.from(JSON.stringify(event)),
    };

    const result = await controller.handleClerkWebhook(event, mockReq);
    expect(result).toEqual({ received: true });
    expect(mockPrisma.user.upsert).toHaveBeenCalled();
  });

  it('should throw BadRequestException if signature is invalid', async () => {
    const event = {
      type: 'user.created',
      data: { id: 'user_1' },
    };

    const mockReq = {
      headers: {
        'svix-id': 'msg_1',
        'svix-timestamp': '123456',
        'svix-signature': 'invalid_signature',
      },
      rawBody: Buffer.from(JSON.stringify(event)),
    };

    await expect(
      controller.handleClerkWebhook(event, mockReq),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if svix headers are missing', async () => {
    const event = { type: 'user.created', data: {} };
    const mockReq = {
      headers: {},
      rawBody: Buffer.from(JSON.stringify(event)),
    };

    await expect(
      controller.handleClerkWebhook(event, mockReq),
    ).rejects.toThrow(BadRequestException);
  });
});
