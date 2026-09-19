import { Injectable, Optional } from '@nestjs/common';
import { PaymentsRepository } from './payments.repository.js';
import { PaymentProvider } from './payment.provider.js';
import { PrismaService } from '../database/prisma.service.js';
import { DomainError } from '../common/domain-error.js';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { OrdersRepository } from '../orders/orders.repository.js';
import { OrderEventsPublisher } from '../orders/order-events.publisher.js';
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
    @Optional() private readonly eventsPublisher?: OrderEventsPublisher,
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
    if (active) {
      if (active.status === 'QR_CREATED' && active.qrPayload && (!active.expiresAt || active.expiresAt > new Date())) {
        return active;
      }
      if (active.clientRequestId && active.clientRequestId !== clientRequestId && active.status === 'QR_CREATED') {
        throw new DomainError('PAYMENT_ACTIVE_INTENT_CONFLICT', 409, 'Đơn hàng đã có thanh toán đang hoạt động');
      }
    }

    let intent: PaymentIntent | null = null;

    try {
      const targetIntent = (active && active.status === 'UNPAID')
        ? active
        : await this.prisma.$transaction(async (tx) => {
            return this.paymentsRepo.create({
              orderId,
              amountVnd: order.priceVnd ?? 0,
              status: 'UNPAID',
              clientRequestId,
            }, tx);
          });
      intent = targetIntent;

      const qrResult = await Promise.race([
        this.paymentProvider.createQr({
          amountVnd: order.priceVnd ?? 0,
          orderId,
          idempotencyKey: clientRequestId,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Provider timeout')), 8000)),
      ]);

      const finalizedIntent = await this.prisma.$transaction(async (tx) => {
        return this.paymentsRepo.updateStatus(targetIntent.id, {
          status: 'QR_CREATED',
          clientRequestId,
          provider: qrResult.provider,
          providerReference: qrResult.providerReference,
          qrPayload: qrResult.qrPayload,
          expiresAt: qrResult.expiresAt,
          ...(qrResult.payosOrderCode !== undefined
            ? { payosOrderCode: qrResult.payosOrderCode }
            : {}),
          providerSnapshot: {
            accountNumber: qrResult.accountNumber,
            accountName: qrResult.accountName,
          },
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
    await this.dispatchPaidOrderIfPending(updated.orderId);

    return updated;
  }

  async confirmCashPaymentByDriver(actor: AuthenticatedActor, orderId: string, clientRequestId: string): Promise<PaymentIntent> {
    if (actor.role !== 'DRIVER') {
      throw new DomainError('FORBIDDEN', 403, 'Chỉ tài xế mới được xác nhận thu tiền mặt');
    }

    const order = await this.ordersRepo.findById(orderId);
    if (!order) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy đơn hàng');
    }

    if (order.driverId !== actor.userId) {
      throw new DomainError('FORBIDDEN', 403, 'Chỉ tài xế được phân công mới được xác nhận thu tiền mặt');
    }

    if (order.status === 'CANCELLED') {
      throw new DomainError('INVALID_ORDER_STATUS', 400, 'Không thể xác nhận thanh toán cho đơn hàng đã hủy');
    }

    const existingIdempotency = await this.paymentsRepo.findByConfirmationRequestId(clientRequestId);
    if (existingIdempotency) {
      await this.dispatchInvoiceIssuance(existingIdempotency);
      return existingIdempotency;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      let intent = await this.paymentsRepo.findActiveIntent(orderId, tx);
      if (!intent) {
        intent = await this.paymentsRepo.create({
          orderId,
          amountVnd: order.priceVnd ?? 0,
          status: 'UNPAID',
          provider: 'LOCAL',
          clientRequestId,
        }, tx);
      }

      const updatedIntent = await this.paymentsRepo.updateStatus(intent.id, {
        status: 'PAID_MANUAL',
        provider: 'LOCAL',
        confirmedById: actor.userId,
        confirmedAt: new Date(),
        confirmationNote: `Tài xế đã thu tiền mặt ${(order.priceVnd ?? 0).toLocaleString('vi-VN')} ₫ từ khách`,
        confirmationRequestId: clientRequestId,
      }, tx);

      await this.auditService.append({
        actorId: actor.userId,
        action: 'CONFIRM_PAYMENT',
        resourceType: 'PaymentIntent',
        resourceId: intent.id,
        idempotencyRequestId: clientRequestId,
      }, tx);

      return updatedIntent;
    });

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

    const intents = await this.paymentsRepo.findByOrderId(orderId);

    // Active reconciliation: if any intent is pending and has payosOrderCode, check status with provider
    if (this.paymentProvider && typeof (this.paymentProvider as any).checkPaymentStatus === 'function') {
      for (const intent of intents) {
        if ((intent.status === 'QR_CREATED' || intent.status === 'UNPAID') && intent.payosOrderCode) {
          try {
            const info = await (this.paymentProvider as any).checkPaymentStatus(intent.payosOrderCode);
            if (info && info.status === 'PAID') {
              const paidAt = info.transactions?.[0]?.transactionDateTime
                ? new Date(info.transactions[0].transactionDateTime.replace(' ', 'T'))
                : new Date();
              await this.prisma.$transaction(async (tx) => {
                await this.paymentsRepo.updateStatus(
                  intent.id,
                  {
                    status: 'PAID_MANUAL',
                    providerReference: info.transactions?.[0]?.reference ?? intent.providerReference,
                    confirmedAt: Number.isNaN(paidAt.getTime()) ? new Date() : paidAt,
                    confirmationNote: 'Xác nhận tự động qua đối soát payOS',
                  },
                  tx,
                );
              });
              await this.dispatchPaidOrderIfPending(orderId);
              intent.status = 'PAID_MANUAL';
            }
          } catch {
            // Ignore polling errors
          }
        }
      }
    }

    return intents;
  }

  async dispatchPaidOrderIfPending(orderId: string): Promise<void> {
    if (!this.eventsPublisher) return;
    try {
      const order = await this.ordersRepo.findById(orderId);
      if (!order || order.driverId) {
        return;
      }

      // Accept both PENDING_PAYMENT (VIETQR orders waiting for payment)
      // and REQUESTED (already transitioned, idempotent re-dispatch attempt)
      const isDispatchable =
        order.status === 'PENDING_PAYMENT' || order.status === 'REQUESTED';
      if (!isDispatchable) {
        return;
      }

      // If the order is still PENDING_PAYMENT, transition it to REQUESTED
      // now that payment has been confirmed. This must happen inside a
      // transaction so there is no window where the order is paid but not
      // yet REQUESTED in the database.
      if (order.status === 'PENDING_PAYMENT') {
        await this.prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: orderId },
            data: {
              status: 'REQUESTED',
              statusHistory: {
                create: {
                  fromStatus: 'PENDING_PAYMENT',
                  toStatus: 'REQUESTED',
                  actorId: null,
                },
              },
            },
          });
        });
      }

      const stops = order.stops ?? [];
      const pickup = stops.find((s) => s.type === 'PICKUP') ?? stops[0];
      const dropoff = stops.find((s) => s.type === 'DROPOFF') ?? stops[stops.length - 1];
      if (!pickup || !dropoff) {
        return;
      }
      this.eventsPublisher.publishRequested({
        orderId: order.id,
        pickup: { lat: pickup.lat, lng: pickup.lng },
        pickupAddress: pickup.address,
        dropoffAddress: dropoff.address,
        vehicleType: order.vehicleType,
        priceVnd: order.priceVnd ?? 0,
        distanceMeters: order.distanceMeters ?? 0,
        durationSeconds: order.durationSeconds ?? 0,
        cargoNote: order.cargoNote ?? null,
        occurredAt: new Date().toISOString(),
      });
    } catch {
      // Swallowed: dispatch error post-payment must not break payment response
    }
  }
}
