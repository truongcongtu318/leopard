import { Injectable } from '@nestjs/common';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { DomainError } from '../common/domain-error.js';
import { PrismaService } from '../database/prisma.service.js';
import { DeliveryProofReader } from './domain/delivery-proof-reader.js';
import { assertOrderTransition } from './domain/order-state-machine.js';
import type { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { mapOrderResponse, type MappedOrderResponse } from './order-response.mapper.js';
import { OrdersRepository } from './orders.repository.js';

@Injectable()
export class UpdateOrderStatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersRepository: OrdersRepository,
    private readonly proofReader: DeliveryProofReader,
  ) {}

  async updateStatus(
    actor: AuthenticatedActor,
    orderId: string,
    dto: UpdateOrderStatusDto,
  ): Promise<MappedOrderResponse> {
    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy đơn hàng');
      }

      if (order.driverId !== actor.userId) {
        throw new DomainError(
          'FORBIDDEN',
          403,
          'Chỉ tài xế được phân công mới có thể cập nhật trạng thái đơn hàng',
        );
      }

      if (dto.clientRequestId) {
        const existingHistory = await tx.orderStatusHistory.findFirst({
          where: {
            orderId,
            actorId: actor.userId,
            clientRequestId: dto.clientRequestId,
          },
        });

        if (existingHistory) {
          return this.ordersRepository.findById(orderId, tx);
        }
      }

      if (order.status === dto.status) {
        throw new DomainError('ORDER_INVALID_TRANSITION', 409, 'Trạng thái đơn hàng đã thay đổi.');
      }

      const hasDeliveryProof = await this.proofReader.hasDeliveryProof(orderId);

      assertOrderTransition({
        from: order.status,
        to: dto.status,
        actorRole: actor.role,
        hasDeliveryProof,
      });

      const now = new Date();
      const statusTimestamps: Record<string, Date> = {};

      if (dto.status === 'PICKING_UP') {
        statusTimestamps.pickingUpAt = now;
      } else if (dto.status === 'IN_TRANSIT') {
        statusTimestamps.inTransitAt = now;
      } else if (dto.status === 'DELIVERED') {
        statusTimestamps.deliveredAt = now;
      }

      const updateRes = await tx.order.updateMany({
        where: {
          id: orderId,
          driverId: actor.userId,
          status: order.status,
        },
        data: {
          status: dto.status,
          ...statusTimestamps,
        },
      });

      if (updateRes.count === 0) {
        throw new DomainError('ORDER_INVALID_TRANSITION', 409, 'Trạng thái đơn hàng đã thay đổi.');
      }

      if (dto.status === 'DELIVERED') {
        await tx.driverProfile.update({
          where: { userId: actor.userId },
          data: { availability: 'AVAILABLE' },
        });
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: dto.status,
          actorId: actor.userId,
          clientRequestId: dto.clientRequestId ?? null,
        },
      });

      return this.ordersRepository.findById(orderId, tx);
    });

    if (!result) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy đơn hàng');
    }

    return mapOrderResponse(result);
  }
}
