import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

@Injectable()
export class WebhookSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const expected = process.env.SELIXES_WEBHOOK_SECRET;

    if (!expected || expected.includes('REPLACE')) {
      throw new UnauthorizedException('Webhook authentication is not configured');
    }

    const provided = req.headers['x-selixes-webhook-secret'] ?? req.headers['x-apishield-webhook-secret'];
    const token = Array.isArray(provided) ? provided[0] : provided;

    if (!token || !safeEqual(token, expected)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return true;
  }
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
