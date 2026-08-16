import { Controller, Post, Get, Param, Body, UseGuards, UseFilters } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { RequireRoles } from '../auth/decorators/require-roles.js';
import { CurrentUser, type AuthenticatedActor } from '../auth/decorators/current-user.js';
import { ApiExceptionFilter } from '../common/api-exception.filter.js';

import type { PaymentIntent } from '@prisma/client';

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
  ): Promise<PaymentIntent> {
    return this.paymentsService.createPaymentIntent(actor, orderId, clientRequestId);
  }

  @Get('orders/:id/payments')
  async getPayments(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') orderId: string,
  ): Promise<PaymentIntent[]> {
    return this.paymentsService.getPaymentHistory(actor, orderId);
  }

  @Post('admin/payments/:id/confirm')
  @RequireRoles('ADMIN')
  async confirmPayment(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') paymentId: string,
    @Body('note') note: string,
    @Body('clientRequestId') clientRequestId: string,
  ): Promise<PaymentIntent> {
    return this.paymentsService.confirmPayment(actor, paymentId, note, clientRequestId);
  }
}
