import { Injectable } from '@nestjs/common';
import type { OrderStatus } from '@prisma/client';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { DomainError } from '../common/domain-error.js';
import { requestContextStore } from '../common/logger.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { assertOrderTransition } from './domain/order-state-machine.js';
import { OrderEventsPublisher, type OrderStatusChangedEvent } from './order-events.publisher.js';
import { mapOrderResponse, type MappedOrderResponse } from './order-response.mapper.js';
import { OrdersRepository } from './orders.repository.js';
import type { ReportOrderIncidentDto } from '../drivers/dto/report-order-incident.dto.js';

@Injectable()
export class ReportOrderIncidentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersRepository: OrdersRepository,
    private readonly eventsPublisher: OrderEventsPublisher,
  ) {}

  async reportIncident(
    actor: AuthenticatedActor,
    orderId: string,
    dto: ReportOrderIncidentDto,
  ): Promise<MappedOrderResponse> {
    const reason = dto.reason.trim();
    if (!reason) {
      throw new DomainError('VALIDATION_ERROR', 422, 'Lý do sự cố không được để trống');
    }

    const order = await this.ordersRepository.findById(orderId);
    if (!order) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy đơn hàng');
    }

    if (order.driverId !== actor.userId) {
      throw new DomainError(
        'FORBIDDEN',
        403,
        'Chỉ tài xế được phân công mới có thể báo cáo sự cố đơn hàng',
      );
    }

    if (dto.clientRequestId) {
      const existingHistory = await this.prisma.orderStatusHistory.findFirst({
        where: {
          orderId,
          actorId: actor.userId,
          clientRequestId: dto.clientRequestId,
        },
      });
      if (existingHistory) {
        return mapOrderResponse(order);
      }
    }

    // Cargo already picked up (IN_TRANSIT) must be routed back to the sender
    // rather than simply cancelled — spec §3.6 step 4.
    const targetStatus: OrderStatus = order.status === 'IN_TRANSIT' ? 'RETURNING' : 'INCIDENT_CANCELLED';

    assertOrderTransition({
      from: order.status,
      to: targetStatus,
      actorRole: actor.role,
      hasDeliveryProof: false,
      cancelReason: reason,
    });

    const now = new Date();
    const requestId = requestContextStore.getStore()?.get('requestId') as string | undefined;

    const result = await this.prisma.$transaction(async (tx) => {

      const updateRes = await tx.order.updateMany({
        where: {
          id: orderId,
          driverId: actor.userId,
          status: order.status,
        },
        data: {
          status: targetStatus,
          incidentReason: reason,
          incidentNote: dto.note ?? null,
          incidentReportedAt: now,
        },
      });

      if (updateRes.count === 0) {
        throw new DomainError('ORDER_INVALID_TRANSITION', 409, 'Trạng thái đơn hàng đã thay đổi.');
      }

      const profile = await tx.driverProfile.findUnique({
        where: { userId: actor.userId },
      });
      const nextAvailability = profile?.autoOfflineOnComplete ? 'OFFLINE' : 'AVAILABLE';
      await tx.driverProfile.update({
        where: { userId: actor.userId },
        data: {
          availability: nextAvailability,
          autoOfflineOnComplete: false,
        },
      });

      const history = await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: targetStatus,
          actorId: actor.userId,
          clientRequestId: dto.clientRequestId ?? null,
          reason,
        },
      });

      // Compliance/fraud-review trail — spec §3.6 step 6. Mirrors the
      // ORDER_CANCELLED_BY_ADMIN audit entry in CancelOrderService.
      await tx.auditLog.create({
        data: {
          actorId: actor.userId,
          action: 'ORDER_INCIDENT_REPORTED',
          resourceType: 'Order',
          resourceId: orderId,
          metadata: {
            reason,
            note: dto.note ?? null,
            evidenceMediaId: dto.evidenceMediaId ?? null,
            fromStatus: order.status,
            toStatus: targetStatus,
            ...(typeof requestId === 'string' ? { requestId } : {}),
          },
        },
      });

      return {
        order: await this.ordersRepository.findById(orderId, tx),
        event: {
          orderId,
          previousStatus: order.status,
          currentStatus: targetStatus,
          eventId: history.id,
          occurredAt: history.createdAt.toISOString(),
        } satisfies OrderStatusChangedEvent,
      };
    });

    if (!result.order) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy đơn hàng');
    }

    if (result.event) {
      this.eventsPublisher.publishStatusChanged(result.event);
    }

    return mapOrderResponse(result.order);
  }
}
