import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { PaymentWebhookService } from './payment-webhook.service.js';

/**
 * Called directly by payOS's servers, not by our own authenticated clients —
 * intentionally outside the AccessTokenGuard/RoleGuard applied to
 * PaymentsController. Authenticity is established by verifying the payload's
 * HMAC signature (PaymentWebhookService), not by a bearer token.
 */
@Controller('payments/webhook')
export class PaymentsWebhookController {
  constructor(private readonly webhookService: PaymentWebhookService) {}

  @Post('payos')
  @HttpCode(200)
  async handlePayosWebhook(@Body() body: unknown): Promise<Readonly<{ received: true }>> {
    await this.webhookService.handlePayosWebhook(body);
    return { received: true };
  }
}
