import { Injectable } from '@nestjs/common';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { DomainError } from '../common/domain-error.js';
import { requestContextStore } from '../common/logger.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { assertOrderTransition } from './domain/order-state-machine.js';
import type { CancelOrderDto } from './dto/cancel-order.dto.js';
import { OrderEventsPublisher, type OrderStatusChangedEvent } from './order-events.publisher.js';
import { mapOrderResponse, type MappedOrderResponse } from './order-response.mapper.js';
import { OrdersRepository } from './orders.repository.js';

@Injectable()
export class CancelOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersRepository: OrdersRepository,
    private readonly eventsPublisher: OrderEventsPublisher,
  ) {}

  async cancelOrder(
    actor: AuthenticatedActor,
    orderId: string,
    dto: CancelOrderDto,
    explicitRequestId?: string,
  ): Promise<MappedOrderResponse> {
    const reason = dto.reason?.trim();
    const requestId =
      explicitRequestId ??
      (requestContextStore.getStore()?.get('requestId') as string | undefined);
    if (actor.role === 'ADMIN' && !reason) {
      throw new DomainError(
        'VALIDATION_ERROR',
        422,
        'Dữ liệu không hợp lệ',
        [{ field: 'reason', messages: ['must not be empty for Admin cancellation'] }],
      );
    }

    const order = await this.ordersRepository.findById(orderId);

    if (!order) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy đơn hàng');
    }

    if (actor.role === 'CUSTOMER' && order.customerId !== actor.userId) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy đơn hàng');
    }

    assertOrderTransition({
      from: order.status,
      to: 'CANCELLED',
      actorRole: actor.role,
      hasDeliveryProof: false,
      ...(reason ? { cancelReason: reason } : {}),
    });

    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const updateRes = await tx.order.updateMany({
        where: {
          id: orderId,
          status: order.status,
        },
        data: {
          status: 'CANCELLED',
          cancelledAt: now,
        },
      });

      if (updateRes.count === 0) {
        throw new DomainError('ORDER_INVALID_TRANSITION', 409, 'Trạng thái đơn hàng đã thay đổi.');
      }

      if (order.driverId) {
        const driverProfile = await tx.driverProfile.findUnique({
          where: { userId: order.driverId },
        });
        const targetAvailability = driverProfile?.autoOfflineOnComplete ? 'OFFLINE' : 'AVAILABLE';
        await tx.driverProfile.update({
          where: { userId: order.driverId },
          data: {
            availability: targetAvailability,
            autoOfflineOnComplete: false,
          },
        });
      }

      const history = await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: 'CANCELLED',
          actorId: actor.userId,
          reason: reason ?? null,
        },
      });

      if (actor.role === 'ADMIN') {
        await tx.auditLog.create({
          data: {
            actorId: actor.userId,
            action: 'ORDER_CANCELLED_BY_ADMIN',
            resourceType: 'Order',
            resourceId: orderId,
            metadata: {
              reason,
              ...(typeof requestId === 'string' ? { requestId } : {}),
            },
          },
        });
      }

      return {
        order: await this.ordersRepository.findById(orderId, tx),
        event: {
          orderId,
          previousStatus: order.status,
          currentStatus: 'CANCELLED',
          eventId: history.id,
          occurredAt: history.createdAt.toISOString(),
        } satisfies OrderStatusChangedEvent,
      };
    });

    if (!result.order) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy đơn hàng');
    }

    this.eventsPublisher.publishStatusChanged(result.event);

    return mapOrderResponse(result.order);
  }
}
