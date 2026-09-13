import { Injectable } from '@nestjs/common';
import type { Order, OrderStop, OrderStatusHistory, Prisma, StopType, ProviderSource, OrderStatus, MediaObject, VehicleType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';

type OrdersPrismaClient = PrismaService | Prisma.TransactionClient;

export interface CreateOrderParams {
  customerId: string;
  providerSource: ProviderSource;
  distanceMeters: number;
  durationSeconds: number;
  priceVnd: number;
  routeSnapshot: Prisma.InputJsonValue;
  vehicleType?: VehicleType;
  cargoWeightKg?: number;
  cargoNote?: string;
  stops: Array<{
    type: StopType;
    sequence: number;
    address: string;
    latitude: number;
    longitude: number;
    contactName?: string;
    contactPhone?: string;
    note?: string;
  }>;
  clientRequestId?: string;
}

export interface OrderWithRelations extends Order {
  stops: Array<OrderStop & { lat: number; lng: number }>;
  statusHistory: OrderStatusHistory[];
  mediaObjects?: MediaObject[];
}

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(params: CreateOrderParams): Promise<OrderWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          customerId: params.customerId,
          clientRequestId: params.clientRequestId ?? null,
          status: 'REQUESTED',
          providerSource: params.providerSource,
          distanceMeters: params.distanceMeters,
          durationSeconds: params.durationSeconds,
          priceVnd: params.priceVnd,
          routeSnapshot: params.routeSnapshot,
          vehicleType: params.vehicleType ?? 'MOTORBIKE',
          cargoWeightKg: params.cargoWeightKg ?? null,
          cargoNote: params.cargoNote ?? null,
          statusHistory: {
            create: {
              fromStatus: null,
              toStatus: 'REQUESTED',
              actorId: params.customerId,
            },
          },
          paymentIntents: {
            create: {
              provider: null,
              status: 'UNPAID',
              amountVnd: params.priceVnd,
            },
          },
        },
      });

      const stopsWithCoords: Array<OrderStop & { lat: number; lng: number }> = [];

      for (const stop of params.stops) {
        const stopRows = await tx.$queryRaw<Array<OrderStop & { lat: number; lng: number }>>`
          INSERT INTO "OrderStop" (
            id,
            "orderId",
            type,
            sequence,
            address,
            "contactName",
            "contactPhone",
            note,
            location,
            "createdAt",
            "updatedAt"
          )
          VALUES (
            gen_random_uuid(),
            ${order.id}::uuid,
            ${stop.type}::"StopType",
            ${stop.sequence},
            ${stop.address},
            ${stop.contactName ?? null},
            ${stop.contactPhone ?? null},
            ${stop.note ?? null},
            ST_SetSRID(ST_MakePoint(${stop.longitude}, ${stop.latitude}), 4326)::geography,
            NOW(),
            NOW()
          )
          RETURNING
            id,
            "orderId",
            type,
            sequence,
            address,
            "contactName",
            "contactPhone",
            note,
            ST_Y(location::geometry) as lat,
            ST_X(location::geometry) as lng,
            "createdAt",
            "updatedAt"
        `;

        const insertedStop = stopRows[0];
        if (insertedStop) {
          stopsWithCoords.push(insertedStop);
        }
      }

      const createdOrder = await tx.order.findUnique({
        where: { id: order.id },
        include: {
          statusHistory: { orderBy: { createdAt: 'desc' } },
        },
      });

      return {
        ...createdOrder!,
        stops: stopsWithCoords,
        statusHistory: createdOrder!.statusHistory,
      };
    });
  }

  async findByClientRequestId(
    customerId: string,
    clientRequestId: string,
    tx?: OrdersPrismaClient,
  ): Promise<OrderWithRelations | null> {
    return this.findByCustomerAndClientRequestId(customerId, clientRequestId, tx);
  }

  async findByCustomerAndClientRequestId(
    customerId: string,
    clientRequestId: string,
    tx?: OrdersPrismaClient,
  ): Promise<OrderWithRelations | null> {
    const db = tx ?? this.prisma;
    const order = await db.order.findFirst({
      where: { customerId, clientRequestId },
      include: {
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!order) {
      return null;
    }

    const stops = await db.$queryRaw<Array<OrderStop & { lat: number; lng: number }>>`
      SELECT
        id,
        "orderId",
        type,
        sequence,
        address,
        "contactName",
        "contactPhone",
        note,
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
      stops,
      statusHistory: order.statusHistory,
    };
  }

  async findById(id: string, tx?: OrdersPrismaClient): Promise<OrderWithRelations | null> {
    const db = tx ?? this.prisma;
    const order = await db.order.findUnique({
      where: { id },
      include: {
        statusHistory: { orderBy: { createdAt: 'desc' } },
        mediaObjects: true,
      },
    });

    if (!order) {
      return null;
    }

    const stops = await db.$queryRaw<Array<OrderStop & { lat: number; lng: number }>>`
      SELECT
        id,
        "orderId",
        type,
        sequence,
        address,
        "contactName",
        "contactPhone",
        note,
        ST_Y(location::geometry) as lat,
        ST_X(location::geometry) as lng,
        "createdAt",
        "updatedAt"
      FROM "OrderStop"
      WHERE "orderId" = ${id}::uuid
      ORDER BY sequence ASC
    `;

    return {
      ...order,
      stops,
      statusHistory: order.statusHistory,
      mediaObjects: order.mediaObjects,
    };
  }

  async findCustomerOrders(
    customerId: string,
    page = 1,
    pageSize = 20,
  ): Promise<{ items: OrderWithRelations[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const skip = (page - 1) * pageSize;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          statusHistory: { orderBy: { createdAt: 'desc' } },
        },
      }),
      this.prisma.order.count({ where: { customerId } }),
    ]);

    const items: OrderWithRelations[] = await Promise.all(
      orders.map(async (order) => {
        const stops = await this.prisma.$queryRaw<Array<OrderStop & { lat: number; lng: number }>>`
          SELECT
            id,
            "orderId",
            type,
            sequence,
            address,
            "contactName",
            "contactPhone",
            note,
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
          stops,
          statusHistory: order.statusHistory,
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

  private async findStopsForOrderIds(orderIds: string[]): Promise<Map<string, Array<OrderStop & { lat: number; lng: number }>>> {
    if (orderIds.length === 0) return new Map();

    const rows = await this.prisma.$queryRaw<Array<OrderStop & { lat: number; lng: number }>>`
      SELECT
        id,
        "orderId",
        type,
        sequence,
        address,
        "contactName",
        "contactPhone",
        note,
        ST_Y(location::geometry) as lat,
        ST_X(location::geometry) as lng,
        "createdAt",
        "updatedAt"
      FROM "OrderStop"
      WHERE "orderId" = ANY(${orderIds}::uuid[])
      ORDER BY sequence ASC
    `;

    const byOrderId = new Map<string, Array<OrderStop & { lat: number; lng: number }>>();
    for (const row of rows) {
      const list = byOrderId.get(row.orderId) ?? [];
      list.push(row);
      byOrderId.set(row.orderId, list);
    }
    return byOrderId;
  }

  /** Driver's completed/terminal orders (DELIVERED, CANCELLED,
   * INCIDENT_CANCELLED, RETURNED) — backs the driver history screen. */
  async findDriverOrderHistory(
    driverId: string,
    page = 1,
    pageSize = 20,
  ): Promise<{ items: OrderWithRelations[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const skip = (page - 1) * pageSize;
    const where: Prisma.OrderWhereInput = {
      driverId,
      status: { in: ['DELIVERED', 'CANCELLED', 'INCIDENT_CANCELLED', 'RETURNED'] },
    };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          statusHistory: { orderBy: { createdAt: 'desc' } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    const stopsByOrderId = await this.findStopsForOrderIds(orders.map((order) => order.id));
    const items: OrderWithRelations[] = orders.map((order) => ({
      ...order,
      stops: stopsByOrderId.get(order.id) ?? [],
      statusHistory: order.statusHistory,
    }));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 0,
    };
  }

  async isDriverInFleetOwnerFleets(fleetOwnerUserId: string, driverUserId: string): Promise<boolean> {
    const ownerFleets = await this.prisma.fleetMember.findMany({
      where: {
        userId: fleetOwnerUserId,
        status: 'ACTIVE',
        role: 'OWNER',
      },
      select: { fleetId: true },
    });

    if (ownerFleets.length === 0) {
      return false;
    }

    const fleetIds = ownerFleets.map((f) => f.fleetId);

    const driverMembership = await this.prisma.fleetMember.findFirst({
      where: {
        userId: driverUserId,
        fleetId: { in: fleetIds },
        status: 'ACTIVE',
      },
    });

    return !!driverMembership;
  }
}
