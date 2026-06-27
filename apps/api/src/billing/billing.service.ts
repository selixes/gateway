import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private stripe: Stripe;

  constructor(private readonly prisma: PrismaService) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if ((!apiKey || apiKey.includes('REPLACE')) && process.env.NODE_ENV === 'production') {
      throw new Error('STRIPE_SECRET_KEY must be configured in production');
    }
    this.stripe = new Stripe(apiKey || 'sk_test_mock', {
      apiVersion: '2025-01-27' as any, // Stripe API version compatibility
    });
  }

  async createCheckoutSession(organizationId: string, successUrl: string, cancelUrl: string): Promise<string> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new BadRequestException('Organization not found');
    }

    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Selixes PRO Plan Subscription',
                description: 'Unlock higher rate limits, larger concurrency limits, and priority outages fail-over protection.',
              },
              unit_amount: 4900, // $49.00
              recurring: {
                interval: 'month',
              },
            },
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          organizationId,
        },
        subscription_data: {
          metadata: {
            organizationId,
          },
        },
      });

      if (!session.url) {
        throw new Error('Stripe session did not generate a URL');
      }
      return session.url;
    } catch (err: any) {
      this.logger.error(`Stripe checkout session creation failed: ${err.message}`);
      throw new BadRequestException(`Stripe checkout failed: ${err.message}`);
    }
  }

  async handleWebhook(rawBody: string, signature: string): Promise<void> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      if (process.env.NODE_ENV === 'production') {
        throw new BadRequestException('Stripe webhook signing secret is not configured');
      }
      this.logger.warn('STRIPE_WEBHOOK_SECRET is not configured. Webhook signature check is bypassed (dev-only).');
    }

    let event: Stripe.Event;

    try {
      if (webhookSecret) {
        event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      } else {
        event = JSON.parse(rawBody) as Stripe.Event;
      }
    } catch (err: any) {
      this.logger.error(`Stripe signature verification failed: ${err.message}`);
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    this.logger.log(`Received Stripe webhook event: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const organizationId = session.metadata?.organizationId;

      if (organizationId) {
        await this.prisma.organization.update({
          where: { id: organizationId },
          data: {
            plan: 'PRO',
            stripeCustomerId: typeof session.customer === 'string' ? session.customer : null,
            stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : null,
          },
        });
        this.logger.log(`Organization ${organizationId} upgraded to PRO plan via Stripe.`);
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const organizationId = subscription.metadata?.organizationId;
      const where = organizationId
        ? { id: organizationId }
        : { stripeSubscriptionId: subscription.id };

      await this.prisma.organization.update({
        where,
        data: {
          plan: 'FREE',
          stripeSubscriptionId: null,
        },
      });
      this.logger.log(`Organization subscription ${subscription.id} downgraded to FREE.`);
    } else if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as any;
      const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : null;
      if (subscriptionId) {
        this.logger.warn(`Payment failed for subscription ${subscriptionId}. Organization may need downgrading if retries fail.`);
        // In a real app, you might downgrade immediately or wait for subscription.deleted
      }
    } else if (event.type === 'invoice.paid') {
      const invoice = event.data.object as any;
      const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : null;
      if (subscriptionId) {
        this.logger.log(`Invoice paid successfully for subscription ${subscriptionId}.`);
      }
    } else if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
        const organizationId = subscription.metadata?.organizationId;
        const where = organizationId ? { id: organizationId } : { stripeSubscriptionId: subscription.id };
        await this.prisma.organization.update({
          where,
          data: {
            plan: 'FREE',
            stripeSubscriptionId: null,
          },
        });
        this.logger.log(`Subscription ${subscription.id} updated to ${subscription.status}, downgraded org to FREE.`);
      }
    }
  }
}
