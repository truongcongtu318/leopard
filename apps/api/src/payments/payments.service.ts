import { Injectable } from '@nestjs/common';
import { PaymentsRepository } from './payments.repository.js';
import { PaymentProvider } from './payment.provider.js';
import { PrismaService } from '../database/prisma.service.js';
import { DomainError } from '../common/domain-error.js';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { OrdersRepository } from '../orders/orders.repository.js';
import { AuditService } from '../audit/audit.service.js';
import { NotificationTriggers } from '../notifications/notification-triggers.service.js';
import { InvoiceIssuancePort } from '../invoices/invoice-issuance.port.js';
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
    private readonly notificationTriggers: NotificationTriggers,
    private readonly invoiceIssuancePort: InvoiceIssuancePort,
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
          ...(qrResult.payosOrderCode !== undefined
            ? { payosOrderCode: qrResult.payosOrderCode }
            : {}),
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
      await this.dispatchInvoiceIssuance(existingIdempotency);
      return existingIdempotency;
    }

    const intent = await this.paymentsRepo.findById(paymentId);
    if (!intent) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy thanh toán');
    }

    if (intent.status === 'PAID_MANUAL') {
      // Retry-on-replay (Phase 0's chosen recovery model): a prior issuance
      // attempt may have failed after this payment already committed, so
      // every replay of an already-PAID_MANUAL confirmation re-checks
      // whether the invoice exists rather than silently no-opping forever.
      await this.dispatchInvoiceIssuance(intent);
      return intent;
    }

    if (intent.status !== 'UNPAID' && intent.status !== 'QR_CREATED') {
      throw new DomainError('PAYMENT_ALREADY_CONFIRMED', 409, 'Thanh toán không ở trạng thái có thể xác nhận');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedIntent = await this.paymentsRepo.updateStatus(paymentId, {
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

      return updatedIntent;
    });

    // Post-commit, best-effort: a notification-trigger failure must never
    // fail a payment confirmation that already succeeded. The idempotency
    // guards above (confirmationRequestId lookup, PAID_MANUAL short-circuit)
    // mean a replayed confirmation never reaches this line, so it never
    // creates a second PAYMENT notification.
    await this.dispatchPaymentConfirmedNotification(updated);
    await this.dispatchInvoiceIssuance(updated);

    return updated;
  }

  /**
   * Post-commit, best-effort invoice issuance (Phase 0's chosen recovery
   * model: synchronous retry-on-replay, not a durable outbox). Never throws
   * — a failure here must never fail or undo a payment confirmation that
   * already committed. Notifies the customer only when the invoice was
   * issued but has no email on file yet; a send failure is not surfaced
   * here as the invoice endpoints already expose a retry action.
   */
  private async dispatchInvoiceIssuance(intent: PaymentIntent): Promise<void> {
    try {
      const result = await this.invoiceIssuancePort.ensureInvoiceForPayment(intent.orderId, intent.id);
      if (result?.needsEmailPrompt) {
        const order = await this.ordersRepo.findById(intent.orderId);
        if (order) {
          await this.notificationTriggers.notifyInvoiceEmailMissing({
            customerId: order.customerId,
            orderId: intent.orderId,
          });
        }
      }
    } catch {
      // Swallowed: invoice issuance must never fail a payment confirmation.
    }
  }

  private async dispatchPaymentConfirmedNotification(intent: PaymentIntent): Promise<void> {
    try {
      const order = await this.ordersRepo.findById(intent.orderId);
      if (!order) {
        return;
      }
      await this.notificationTriggers.notifyPaymentConfirmed({
        customerId: order.customerId,
        orderId: intent.orderId,
        amountVnd: intent.amountVnd,
      });
    } catch {
      // Swallowed: notification delivery must never fail payment confirmation.
    }
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
