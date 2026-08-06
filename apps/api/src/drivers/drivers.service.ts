import { Injectable } from '@nestjs/common';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { DomainError } from '../common/domain-error.js';
import { PrismaService } from '../database/prisma.service.js';
import { mapOrderResponse, type MappedOrderResponse } from '../orders/order-response.mapper.js';
import { DriversRepository } from './drivers.repository.js';
import type { UpdateAvailabilityDto } from './dto/update-availability.dto.js';

@Injectable()
export class DriversService {
  constructor(
    private readonly driversRepository: DriversRepository,
    private readonly prisma: PrismaService,
  ) {}

  async updateAvailability(
    actor: AuthenticatedActor,
    dto: UpdateAvailabilityDto,
  ): Promise<{ availability: string }> {
    if (dto.availability === 'BUSY') {
      throw new DomainError(
        'BAD_REQUEST',
        400,
        'Lái xe không thể tự chuyển sang trạng thái BUSY thủ công',
      );
    }

    if (dto.availability !== 'AVAILABLE' && dto.availability !== 'OFFLINE') {
      throw new DomainError(
        'BAD_REQUEST',
        400,
        'Trạng thái sẵn sàng phải là AVAILABLE hoặc OFFLINE',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.availability === 'AVAILABLE') {
        const activeOrdersCount = await tx.order.count({
          where: {
            driverId: actor.userId,
            status: { in: ['ACCEPTED', 'PICKING_UP', 'IN_TRANSIT'] },
          },
        });

        if (activeOrdersCount > 0) {
          throw new DomainError('DRIVER_HAS_ACTIVE_ORDER', 409, 'Driver has an active order');
        }
      }

      return this.driversRepository.updateAvailability(actor.userId, dto.availability, tx);
    });

    return { availability: updated.availability };
  }

  async getAvailableOrders(
    _actor: AuthenticatedActor,
    page = 1,
    pageSize = 20,
  ): Promise<{ items: MappedOrderResponse[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const result = await this.driversRepository.findAvailableOrders(page, pageSize);

    return {
      items: result.items.map(mapOrderResponse),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    };
  }

  async getActiveOrder(
    actor: AuthenticatedActor,
  ): Promise<{ order: MappedOrderResponse | null }> {
    const order = await this.driversRepository.findActiveOrderByDriverId(actor.userId);

    return {
      order: order ? mapOrderResponse(order) : null,
    };
  }
}
