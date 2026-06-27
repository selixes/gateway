// Mock stripe package
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => {
    return {
      checkout: {
        sessions: {
          create: jest.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/session_123' }),
        },
      },
      webhooks: {
        constructEvent: (body: string, signature: string, secret: string) => {
          if (signature === 'invalid_signature') {
            throw new Error('Invalid signature');
          }
          return JSON.parse(body);
        },
      },
    };
  });
});

import { BillingService } from './billing.service';

function createMockPrisma() {
  return {
    organization: {
      findUnique: jest.fn().mockResolvedValue({ id: 'org-1', name: 'Acme', plan: 'FREE' }),
      update: jest.fn().mockResolvedValue({}),
    },
  } as any;
}

describe('BillingService', () => {
  let service: BillingService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new BillingService(mockPrisma);
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_stripe_test';
  });

  afterEach(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  it('should generate a checkout session url successfully', async () => {
    const url = await service.createCheckoutSession('org-1', 'https://success.com', 'https://cancel.com');
    expect(url).toBe('https://checkout.stripe.com/session_123');
    expect(mockPrisma.organization.findUnique).toHaveBeenCalledWith({ where: { id: 'org-1' } });
  });

  it('should upgrade organization to PRO on checkout.session.completed event', async () => {
    const event = {
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { organizationId: 'org-1' },
          customer: 'cust_123',
          subscription: 'sub_123',
        },
      },
    };

    await service.handleWebhook(JSON.stringify(event), 'valid_signature');
    expect(mockPrisma.organization.update).toHaveBeenCalledWith({
      where: { id: 'org-1' },
      data: {
        plan: 'PRO',
        stripeCustomerId: 'cust_123',
        stripeSubscriptionId: 'sub_123',
      },
    });
  });

  it('should downgrade organization to FREE on customer.subscription.deleted event', async () => {
    const event = {
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_123',
          metadata: { organizationId: 'org-1' },
        },
      },
    };

    await service.handleWebhook(JSON.stringify(event), 'valid_signature');
    expect(mockPrisma.organization.update).toHaveBeenCalledWith({
      where: { id: 'org-1' },
      data: {
        plan: 'FREE',
        stripeSubscriptionId: null,
      },
    });
  });
});
