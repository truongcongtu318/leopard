import { Injectable } from '@nestjs/common';
import type { DriverAvailability, DriverProfile, OrderStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import type { OrderWithRelations } from '../orders/orders.repository.js';

@Injectable()
export class DriversRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findDriverProfileByUserId(userId: string): Promise<DriverProfile | null> {
    return this.prisma.driverProfile.findUnique({
      where: { userId },
    });
  }

  async updateAvailability(
    userId: string,
    availability: DriverAvailability,
  ): Promise<DriverProfile> {
    const existing = await this.findDriverProfileByUserId(userId);

    if (!existing) {
      return this.prisma.driverProfile.create({
        data: {
          userId,
          availability,
          vehicleType: 'MOTORBIKE',
        },
      });
    }

    return this.prisma.driverProfile.update({
      where: { userId },
      data: { availability },
    });
  }

  async findAvailableOrders(
    page = 1,
    pageSize = 20,
  ): Promise<{ items: OrderWithRelations[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const skip = (page - 1) * pageSize;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { status: 'REQUESTED' },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          statusHistory: { orderBy: { createdAt: 'desc' } },
        },
      }),
      this.prisma.order.count({ where: { status: 'REQUESTED' } }),
    ]);

    const items: OrderWithRelations[] = await Promise.all(
      orders.map(async (order) => {
        const stops = await this.prisma.$queryRaw<Array<any>>`
          SELECT
            id,
            "orderId",
            type,
            sequence,
            address,
            ST_Y(location::geometry) as lat,
            ST_X(location::geometry) as lng,
            "createdAt",
            "updatedAt"
          FROM "OrderStop"
          WHERE "orderId" = ${order.id}::uuid
          ORDER BY sequence ASC
        `;

        return {
          ...order,
          stops: stops ?? [],
          statusHistory: order.statusHistory ?? [],
        };
      }),
    );

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 0,
    };
  }

  async findActiveOrderByDriverId(driverId: string): Promise<OrderWithRelations | null> {
    const activeStatuses: OrderStatus[] = ['ACCEPTED', 'PICKING_UP', 'IN_TRANSIT'];

    const order = await this.prisma.order.findMany({
      where: {
        driverId,
        status: { in: activeStatuses },
      },
      take: 1,
      orderBy: { createdAt: 'desc' },
      include: {
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });

    const first = order[0];
    if (!first) {
      return null;
    }

    const stops = await this.prisma.$queryRaw<Array<any>>`
      SELECT
        id,
        "orderId",
        type,
        sequence,
        address,
        ST_Y(location::geometry) as lat,
        ST_X(location::geometry) as lng,
        "createdAt",
        "updatedAt"
      FROM "OrderStop"
      WHERE "orderId" = ${first.id}::uuid
      ORDER BY sequence ASC
    `;

    return {
      ...first,
      stops: stops ?? [],
      statusHistory: first.statusHistory ?? [],
    };
  }
}
