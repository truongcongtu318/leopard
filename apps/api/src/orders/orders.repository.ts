import { Injectable } from '@nestjs/common';
import type { Order, OrderStop, OrderStatusHistory, Prisma, StopType, ProviderSource, OrderStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';

type OrdersPrismaClient = PrismaService | Prisma.TransactionClient;

export interface CreateOrderParams {
  customerId: string;
  providerSource: ProviderSource;
  distanceMeters: number;
  durationSeconds: number;
  priceVnd: number;
  routeSnapshot: Prisma.InputJsonValue;
  stops: Array<{
    type: StopType;
    sequence: number;
    address: string;
    latitude: number;
    longitude: number;
  }>;
  clientRequestId?: string;
}

export interface OrderWithRelations extends Order {
  stops: Array<OrderStop & { lat: number; lng: number }>;
  statusHistory: OrderStatusHistory[];
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
          statusHistory: {
            create: {
              fromStatus: null,
              toStatus: 'REQUESTED',
              actorId: params.customerId,
            },
          },
          paymentIntents: {
            create: {
              provider: params.providerSource,
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

      const statusHistory = await tx.orderStatusHistory.findMany({
        where: { orderId: order.id },
        orderBy: { createdAt: 'desc' },
      });

      return {
        ...order,
        stops: stopsWithCoords,
        statusHistory,
      };
    });
  }

  async findByClientRequestId(
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
