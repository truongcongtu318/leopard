import { Controller, Post, Get, Param, Body, HttpCode, HttpStatus, UseGuards, UseFilters } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { RequireRoles } from '../auth/decorators/require-roles.js';
import { CurrentUser, type AuthenticatedActor } from '../auth/decorators/current-user.js';
import { ApiExceptionFilter } from '../common/api-exception.filter.js';
import { ConfirmCashPaymentDto } from './dto/confirm-cash-payment.dto.js';

import type { PaymentIntent } from '@prisma/client';

function serializePaymentIntent(intent: PaymentIntent) {
  return {
    ...intent,
    payosOrderCode: intent.payosOrderCode !== null && intent.payosOrderCode !== undefined ? intent.payosOrderCode.toString() : null,
  };
}

@Controller()
@UseFilters(ApiExceptionFilter)
@UseGuards(AccessTokenGuard, RoleGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('orders/:id/payments')
  async createPayment(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') orderId: string,
    @Body('clientRequestId') clientRequestId: string,
  ): Promise<any> {
    const intent = await this.paymentsService.createPaymentIntent(actor, orderId, clientRequestId);
    const snapshot = (intent.providerSnapshot as any) ?? {};
    return {
      ...serializePaymentIntent(intent),
      accountNumber: snapshot.accountNumber ?? intent.providerReference,
      accountName: snapshot.accountName ?? 'TRAN VAN LINH',
      bankName: 'VietQR payOS (Napas 24/7)',
    };
  }

  @Get('orders/:id/payments')
  async getPayments(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') orderId: string,
  ): Promise<any[]> {
    const intents = await this.paymentsService.getPaymentHistory(actor, orderId);
    return intents.map(serializePaymentIntent);
  }

  @Post('admin/payments/:id/confirm')
  @RequireRoles('ADMIN')
  async confirmPayment(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') paymentId: string,
    @Body('note') note: string,
    @Body('clientRequestId') clientRequestId: string,
  ): Promise<any> {
    const intent = await this.paymentsService.confirmPayment(actor, paymentId, note, clientRequestId);
    return serializePaymentIntent(intent);
  }

  @Post('driver/orders/:id/confirm-cash')
  @RequireRoles('DRIVER')
  @HttpCode(HttpStatus.OK)
  async confirmCash(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') orderId: string,
    @Body() dto: ConfirmCashPaymentDto,
  ): Promise<any> {
    const intent = await this.paymentsService.confirmCashPaymentByDriver(actor, orderId, dto.clientRequestId);
    return serializePaymentIntent(intent);
  }
}
