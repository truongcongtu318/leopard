import { Injectable, Logger } from '@nestjs/common';
import type { OrderStatus } from '@prisma/client';

import { OrderEventsPublisher, type OrderStatusChangedEvent } from '../orders/order-events.publisher.js';
import { OrdersRepository } from '../orders/orders.repository.js';
import { NotificationsService } from './notifications.service.js';

interface StatusMessage {
  readonly title: string;
  readonly body: string;
}

function describeStatus(status: OrderStatus): StatusMessage {
  switch (status) {
    case 'ACCEPTED':
      return { title: 'Tài xế đã nhận đơn', body: 'Một tài xế đã nhận đơn hàng của bạn.' };
    case 'PICKING_UP':
      return { title: 'Tài xế đang đến lấy hàng', body: 'Tài xế đang trên đường tới điểm lấy hàng.' };
    case 'IN_TRANSIT':
      return { title: 'Đang giao hàng', body: 'Đơn hàng của bạn đang được vận chuyển.' };
    case 'DELIVERED':
      return { title: 'Giao hàng thành công', body: 'Đơn hàng của bạn đã được giao thành công.' };
    case 'CANCELLED':
      return { title: 'Đơn hàng đã bị hủy', body: 'Đơn hàng đã bị hủy.' };
    case 'REQUESTED':
    default:
      return { title: 'Cập nhật đơn hàng', body: `Trạng thái đơn hàng đã thay đổi thành ${status}.` };
  }
}

/**
 * Turns committed order-lifecycle events into persisted notifications.
 * Subscribes to `OrderEventsPublisher` in its constructor — mirrors how
 * `TrackingGateway` subscribes to the same publisher for realtime status
 * broadcasts.
 *
 * `OrderStatusChangedEvent` deliberately carries only
 * orderId/statuses/eventId/occurredAt (no recipient ids — see the
 * notifications plan's Task 3 brief, option (b)), so each handler looks up
 * the order's customerId/driverId itself before notifying.
 *
 * Canonical event / dedup decision (brief item 3): `AcceptOrderService`
 * publishes the driver-accept transition through this SAME
 * `publishStatusChanged` channel (previousStatus REQUESTED → currentStatus
 * ACCEPTED) rather than introducing a second "accepted" event type.
 * `UpdateOrderStatusService` can never itself publish that same transition
 * (its `updateStatus` requires an order already assigned to the calling
 * driver, which REQUESTED orders never are), so there is exactly one
 * publish call per real transition and therefore no duplicate-message risk
 * to deduplicate against.
 *
 * Best-effort: a lookup or notification failure is logged and swallowed —
 * it must never surface back to the order/payment operation that committed
 * the triggering event.
 */
@Injectable()
export class NotificationTriggers {
  private readonly logger = new Logger(NotificationTriggers.name);

  constructor(
    private readonly eventsPublisher: OrderEventsPublisher,
    private readonly ordersRepository: OrdersRepository,
    private readonly notificationsService: NotificationsService,
  ) {
    this.eventsPublisher.subscribe((event) => {
      this.handleOrderStatusChanged(event).catch((error: unknown) => {
        this.logFailure('order status', event.eventId, error);
      });
    });
  }

  /**
   * Notifies the customer for every transition, and the assigned driver for
   * every transition except the initial accept — the driver just performed
   * that action themselves and does not need to be told about it (this is
   * the design's "accepted → customer only" recipient rule).
   */
  private async handleOrderStatusChanged(event: OrderStatusChangedEvent): Promise<void> {
    const order = await this.ordersRepository.findById(event.orderId);
    if (!order) {
      return;
    }

    const message = describeStatus(event.currentStatus);
    const data = { orderId: event.orderId, status: event.currentStatus };

    await this.notificationsService.create({
      userId: order.customerId,
      type: 'ORDER',
      title: message.title,
      body: message.body,
      data,
    });

    const shouldNotifyDriver = order.driverId && event.currentStatus !== 'ACCEPTED';
    if (shouldNotifyDriver) {
      await this.notificationsService.create({
        userId: order.driverId as string,
        type: 'ORDER',
        title: message.title,
        body: message.body,
        data,
      });
    }
  }

  /**
   * Payments call this directly once `confirmPayment`'s transaction has
   * committed — there is no payment event bus to subscribe to, so the
   * design spec has the payments service call this hook directly instead.
   * Best-effort like the order path: errors are logged and swallowed here,
   * never thrown back to the caller.
   */
  async notifyPaymentConfirmed(params: {
    readonly customerId: string;
    readonly orderId: string;
    readonly amountVnd: number;
  }): Promise<void> {
    try {
      await this.notificationsService.create({
        userId: params.customerId,
        type: 'PAYMENT',
        title: 'Thanh toán đã được xác nhận',
        body: `Thanh toán ${params.amountVnd.toLocaleString('vi-VN')}đ cho đơn hàng của bạn đã được xác nhận.`,
        data: { orderId: params.orderId },
      });
    } catch (error) {
      this.logFailure('payment confirmed', params.orderId, error);
    }
  }

  private logFailure(kind: string, id: string, error: unknown): void {
    this.logger.warn(
      `Notification trigger failed (${kind}, ${id}): ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
