import { Injectable } from '@nestjs/common';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { DomainError } from '../common/domain-error.js';
import { PrismaService } from '../database/prisma.service.js';
import { mapOrderResponse, type MappedOrderResponse } from './order-response.mapper.js';
import { OrdersRepository } from './orders.repository.js';

@Injectable()
export class AcceptOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersRepository: OrdersRepository,
  ) {}

  async acceptOrder(
    actor: AuthenticatedActor,
    orderId: string,
  ): Promise<MappedOrderResponse> {
    if (actor.role !== 'DRIVER') {
      throw new DomainError('FORBIDDEN', 403, 'Chỉ tài xế mới có thể nhận đơn hàng');
    }

    const driverProfile = await this.prisma.driverProfile.findUnique({
      where: { userId: actor.userId },
    });

    if (!driverProfile || driverProfile.availability !== 'AVAILABLE') {
      throw new DomainError(
        'DRIVER_HAS_ACTIVE_ORDER',
        409,
        'Lái xe không ở trạng thái sẵn sàng để nhận đơn',
      );
    }

    const activeOrders = await this.prisma.order.findMany({
      where: {
        driverId: actor.userId,
        status: { in: ['ACCEPTED', 'PICKING_UP', 'IN_TRANSIT'] },
      },
      take: 1,
    });

    if (activeOrders.length > 0) {
      throw new DomainError(
        'DRIVER_HAS_ACTIVE_ORDER',
        409,
        'Lái xe đã có đơn hàng đang xử lý',
      );
    }

    const existingOrder = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!existingOrder) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy đơn hàng');
    }

    if (existingOrder.status !== 'REQUESTED' || existingOrder.driverId !== null) {
      throw new DomainError(
        'ORDER_ALREADY_ASSIGNED',
        409,
        'Đơn hàng đã có tài xế khác tiếp nhận',
      );
    }

    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const updateRes = await tx.order.updateMany({
        where: {
          id: orderId,
          status: 'REQUESTED',
        },
        data: {
          driverId: actor.userId,
          status: 'ACCEPTED',
          acceptedAt: now,
        },
      });

      if (updateRes.count === 0) {
        throw new DomainError(
          'ORDER_ALREADY_ASSIGNED',
          409,
          'Đơn hàng đã có tài xế khác tiếp nhận',
        );
      }

      await tx.driverProfile.update({
        where: { userId: actor.userId },
        data: { availability: 'BUSY' },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: 'REQUESTED',
          toStatus: 'ACCEPTED',
          actorId: actor.userId,
        },
      });

      return this.ordersRepository.findById(orderId);
    });

    if (!result) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy đơn hàng');
    }

    return mapOrderResponse(result);
  }
}
