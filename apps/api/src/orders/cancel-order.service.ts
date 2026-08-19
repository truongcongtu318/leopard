import { Injectable } from '@nestjs/common';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { DomainError } from '../common/domain-error.js';
import { requestContextStore } from '../common/logger.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { assertOrderTransition } from './domain/order-state-machine.js';
import type { CancelOrderDto } from './dto/cancel-order.dto.js';
import { mapOrderResponse, type MappedOrderResponse } from './order-response.mapper.js';
import { OrdersRepository } from './orders.repository.js';

@Injectable()
export class CancelOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersRepository: OrdersRepository,
  ) {}

  async cancelOrder(
    actor: AuthenticatedActor,
    orderId: string,
    dto: CancelOrderDto,
  ): Promise<MappedOrderResponse> {
    const reason = dto.reason?.trim();
    if (actor.role === 'ADMIN' && !reason) {
      throw new DomainError(
        'VALIDATION_ERROR',
        422,
        'Validation failed',
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
        await tx.driverProfile.update({
          where: { userId: order.driverId },
          data: { availability: 'AVAILABLE' },
        });
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: 'CANCELLED',
          actorId: actor.userId,
          reason: reason ?? null,
        },
      });

      if (actor.role === 'ADMIN') {
        const requestId = requestContextStore.getStore()?.get('requestId');
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

      return this.ordersRepository.findById(orderId, tx);
    });

    if (!result) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy đơn hàng');
    }

    return mapOrderResponse(result);
  }
}
