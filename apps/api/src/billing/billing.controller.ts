import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  BadRequestException,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentOrg } from '../auth/decorators';

class CheckoutDto {
  successUrl: string;
  cancelUrl: string;
}

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('checkout')
  @UseGuards(ClerkAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async checkout(
    @CurrentOrg() orgId: string,
    @Body() dto: CheckoutDto,
  ) {
    if (!dto.successUrl || !dto.cancelUrl) {
      throw new BadRequestException('Missing successUrl or cancelUrl');
    }
    const checkoutUrl = await this.billingService.createCheckoutSession(orgId, dto.successUrl, dto.cancelUrl);
    return { checkoutUrl };
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Req() req: any,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : '';
    if (!rawBody) {
      throw new BadRequestException('Missing raw request body');
    }
    await this.billingService.handleWebhook(rawBody, signature);
    return { received: true };
  }
}
