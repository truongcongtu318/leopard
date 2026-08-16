import { Injectable } from '@nestjs/common';
import { PaymentsRepository } from './payments.repository.js';
import { PaymentProvider } from './payment.provider.js';
import { PrismaService } from '../database/prisma.service.js';
import { DomainError } from '../common/domain-error.js';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { OrdersRepository } from '../orders/orders.repository.js';
import { AuditService } from '../audit/audit.service.js';
import type { PaymentIntent } from '@prisma/client';
import type { PaymentQr } from './payment.provider.js';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentsRepo: PaymentsRepository,
    private readonly paymentProvider: PaymentProvider,
    private readonly prisma: PrismaService,
    private readonly ordersRepo: OrdersRepository,
    private readonly auditService: AuditService,
  ) {}

  async createPaymentIntent(actor: AuthenticatedActor, orderId: string, clientRequestId: string): Promise<PaymentIntent> {
    const order = await this.ordersRepo.findById(orderId);
    if (!order) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy đơn hàng');
    }

    if (order.customerId !== actor.userId && actor.role !== 'ADMIN') {
      throw new DomainError('FORBIDDEN', 403, 'Không có quyền tạo thanh toán cho đơn hàng này');
    }

    // Idempotency check
    const existing = await this.paymentsRepo.findByClientRequestId(orderId, clientRequestId);
    if (existing) {
      return existing;
    }

    // Active intent check
    const active = await this.paymentsRepo.findActiveIntent(orderId);
    if (active && active.clientRequestId !== clientRequestId) {
      throw new DomainError('PAYMENT_ACTIVE_INTENT_CONFLICT', 409, 'Đơn hàng đã có thanh toán đang hoạt động');
    }

    let intent: PaymentIntent | null = null;

    try {
      const createdIntent = await this.prisma.$transaction(async (tx) => {
        return this.paymentsRepo.create({
          orderId,
          amountVnd: order.priceVnd ?? 0,
          status: 'UNPAID',
          clientRequestId,
        }, tx);
      });
      intent = createdIntent;

      const qrResult = await Promise.race([
        this.paymentProvider.createQr({
          amountVnd: order.priceVnd ?? 0,
          orderId,
          idempotencyKey: clientRequestId,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Provider timeout')), 5000)),
      ]);

      const finalizedIntent = await this.prisma.$transaction(async (tx) => {
        return this.paymentsRepo.updateStatus(createdIntent.id, {
          status: 'QR_CREATED',
          provider: qrResult.provider,
          providerReference: qrResult.providerReference,
          qrPayload: qrResult.qrPayload,
          expiresAt: qrResult.expiresAt,
        }, tx);
      });
      return finalizedIntent;
    } catch (error) {
      if (intent) {
        const intentToFail = intent;
        await this.prisma.$transaction(async (tx) => {
          await this.paymentsRepo.updateStatus(intentToFail.id, { status: 'FAILED' }, tx);
        }).catch(() => {});
      }
      throw new DomainError('PAYMENT_PROVIDER_FAILED', 500, 'Tạo thanh toán thất bại');
    }
  }

  async confirmPayment(actor: AuthenticatedActor, paymentId: string, note: string, clientRequestId: string): Promise<PaymentIntent> {
    if (actor.role !== 'ADMIN') {
      throw new DomainError('FORBIDDEN', 403, 'Chỉ Admin mới được xác nhận thanh toán');
    }

    const trimmedNote = note.trim();
    if (trimmedNote.length < 5 || trimmedNote.length > 500) {
      throw new DomainError('VALIDATION_ERROR', 422, 'Ghi chú phải từ 5 đến 500 ký tự');
    }

    const existingIdempotency = await this.paymentsRepo.findByConfirmationRequestId(clientRequestId);
    if (existingIdempotency) {
      return existingIdempotency;
    }

    const intent = await this.paymentsRepo.findById(paymentId);
    if (!intent) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy thanh toán');
    }

    if (intent.status === 'PAID_MANUAL') {
      return intent;
    }

    if (intent.status !== 'UNPAID' && intent.status !== 'QR_CREATED') {
      throw new DomainError('PAYMENT_ALREADY_CONFIRMED', 409, 'Thanh toán không ở trạng thái có thể xác nhận');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await this.paymentsRepo.updateStatus(paymentId, {
        status: 'PAID_MANUAL',
        confirmedById: actor.userId,
        confirmedAt: new Date(),
        confirmationNote: trimmedNote,
        confirmationRequestId: clientRequestId,
      }, tx);

      await this.auditService.append({
        actorId: actor.userId,
        action: 'CONFIRM_PAYMENT',
        resourceType: 'PaymentIntent',
        resourceId: paymentId,
        idempotencyRequestId: clientRequestId,
      }, tx);

      return updated;
    });
  }

  async getPaymentHistory(actor: AuthenticatedActor, orderId: string): Promise<PaymentIntent[]> {
    const order = await this.ordersRepo.findById(orderId);
    if (!order) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy đơn hàng');
    }

    if (order.customerId !== actor.userId && actor.role !== 'ADMIN') {
      throw new DomainError('FORBIDDEN', 403, 'Không có quyền xem thanh toán');
    }

    return this.paymentsRepo.findByOrderId(orderId);
  }
}
