import { Injectable } from '@nestjs/common';
import type { DriverAvailability, DriverProfile, OrderStatus, VehicleType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import type { OrderWithRelations } from '../orders/orders.repository.js';
import type { Prisma } from '@prisma/client';

@Injectable()
export class DriversRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findDriverProfileByUserId(
    userId: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<DriverProfile | null> {
    return tx.driverProfile.findUnique({
      where: { userId },
    });
  }

  async updateAvailability(
    userId: string,
    availability: DriverAvailability,
    autoOfflineOnComplete?: boolean,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<DriverProfile> {
    const existing = await this.findDriverProfileByUserId(userId, tx);

    if (!existing) {
      return tx.driverProfile.create({
        data: {
          userId,
          availability,
          vehicleType: 'MOTORBIKE',
          autoOfflineOnComplete: autoOfflineOnComplete ?? false,
        },
      });
    }

    return tx.driverProfile.update({
      where: { userId },
      data: {
        availability,
        ...(autoOfflineOnComplete !== undefined ? { autoOfflineOnComplete } : {}),
      },
    });
  }

  /** Batches the per-order stop lookup so a page of orders costs one query,
   * not one query per row (see spec's N+1 note). */
  private async findStopsForOrderIds(orderIds: string[]): Promise<Map<string, unknown[]>> {
    if (orderIds.length === 0) return new Map();

    const rows = await this.prisma.$queryRaw<Array<{ orderId: string } & Record<string, unknown>>>`
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

    const byOrderId = new Map<string, unknown[]>();
    for (const row of rows) {
      const list = byOrderId.get(row.orderId) ?? [];
      list.push(row);
      byOrderId.set(row.orderId, list);
    }
    return byOrderId;
  }

  async findDriverLastKnownLocation(userId: string): Promise<{ lat: number; lng: number } | null> {
    const rows = await this.prisma.$queryRaw<Array<{ lat: number; lng: number }>>`
      SELECT ST_Y("lastKnownLocation"::geometry) as lat, ST_X("lastKnownLocation"::geometry) as lng
      FROM "DriverProfile"
      WHERE "userId" = ${userId}::uuid AND "lastKnownLocation" IS NOT NULL
    `;
    const row = rows[0];
    return row ? { lat: row.lat, lng: row.lng } : null;
  }

  async findAvailableOrders(
    page = 1,
    pageSize = 20,
    vehicleType?: VehicleType,
    driverLocation?: { lat: number; lng: number },
    radiusKm?: number,
  ): Promise<{ items: OrderWithRelations[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const skip = (page - 1) * pageSize;

    // Distance-sorted path: driver has a known location and asked for a
    // radius filter — rank by distance from pickup instead of recency.
    if (driverLocation && radiusKm && radiusKm > 0) {
      const radiusM = radiusKm * 1000;
      // Fixed argument positions regardless of whether vehicleType is set —
      // keeps this one template (no branching) and easy to reason about.
      const vehicleTypeParam = vehicleType ?? null;
      const distanceRows = await this.prisma.$queryRaw<Array<{ orderId: string; distance_m: number }>>`
        SELECT o.id as "orderId",
          ST_Distance(os.location, ST_SetSRID(ST_MakePoint(${driverLocation.lng}, ${driverLocation.lat}), 4326)::geography) as distance_m
        FROM "Order" o
        JOIN "OrderStop" os ON os."orderId" = o.id AND os.type = 'PICKUP'
        WHERE o.status = 'REQUESTED'
          AND (${vehicleTypeParam}::text IS NULL OR o."vehicleType"::text = ${vehicleTypeParam}::text)
          AND ST_DWithin(os.location, ST_SetSRID(ST_MakePoint(${driverLocation.lng}, ${driverLocation.lat}), 4326)::geography, ${radiusM})
        ORDER BY distance_m ASC
      `;

      const total = distanceRows.length;
      const pageOrderIds = distanceRows.slice(skip, skip + pageSize).map((r) => r.orderId);

      const [orders, stopsByOrderId] = await Promise.all([
        this.prisma.order.findMany({
          where: { id: { in: pageOrderIds } },
          include: { statusHistory: { orderBy: { createdAt: 'desc' } } },
        }),
        this.findStopsForOrderIds(pageOrderIds),
      ]);

      const orderById = new Map(orders.map((order) => [order.id, order]));
      const items: OrderWithRelations[] = pageOrderIds
        .map((id) => orderById.get(id))
        .filter((order): order is (typeof orders)[number] => Boolean(order))
        .map((order) => ({
          ...order,
          stops: (stopsByOrderId.get(order.id) as OrderWithRelations['stops']) ?? [],
          statusHistory: order.statusHistory ?? [],
        }));

      return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 0,
      };
    }

    const where: Prisma.OrderWhereInput = {
      status: 'REQUESTED',
      ...(vehicleType ? { vehicleType } : {}),
    };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
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
      stops: (stopsByOrderId.get(order.id) as OrderWithRelations['stops']) ?? [],
      statusHistory: order.statusHistory ?? [],
    }));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 0,
    };
  }

  async updateLocation(
    userId: string,
    lat: number,
    lng: number,
    isStationaryHeartbeat = false,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<void> {
    // A stationary heartbeat only needs to extend lastKnownAt so the driver
    // stays inside the 90s radar window (see findNearbyAvailableDrivers) —
    // skip re-writing the geography point when the coordinate has not moved,
    // per spec §3.2.A.
    if (isStationaryHeartbeat) {
      await tx.$queryRaw`
        UPDATE "DriverProfile"
        SET "lastKnownAt" = NOW()
        WHERE "userId" = ${userId}::uuid
      `;
      return;
    }

    await tx.$queryRaw`
      UPDATE "DriverProfile"
      SET
        "lastKnownLocation" = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        "lastKnownAt" = NOW()
      WHERE "userId" = ${userId}::uuid
    `;
  }

  async findNearbyAvailableDrivers(
    lat: number,
    lng: number,
    radiusM: number,
    limit = 50,
    vehicleType?: VehicleType,
    excludeDriverIds: string[] = [],
  ): Promise<Array<{ userId: string; distanceM: number }>> {
    const rows = vehicleType
      ? await this.prisma.$queryRaw<Array<{ userId: string; distance_m: number }>>`
          SELECT
            "userId",
            ST_Distance("lastKnownLocation", ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) AS distance_m
          FROM "DriverProfile"
          WHERE availability = 'AVAILABLE'
            AND "vehicleType"::text = ${vehicleType}
            AND "lastKnownAt" > NOW() - INTERVAL '90 seconds'
            AND ST_DWithin("lastKnownLocation", ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${radiusM})
            AND NOT ("userId" = ANY(${excludeDriverIds}::uuid[]))
          ORDER BY distance_m ASC
          LIMIT ${limit}
        `
      : await this.prisma.$queryRaw<Array<{ userId: string; distance_m: number }>>`
          SELECT
            "userId",
            ST_Distance("lastKnownLocation", ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) AS distance_m
          FROM "DriverProfile"
          WHERE availability = 'AVAILABLE'
            AND "lastKnownAt" > NOW() - INTERVAL '90 seconds'
            AND ST_DWithin("lastKnownLocation", ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${radiusM})
            AND NOT ("userId" = ANY(${excludeDriverIds}::uuid[]))
          ORDER BY distance_m ASC
          LIMIT ${limit}
        `;

    return rows.map((row) => ({ userId: row.userId, distanceM: row.distance_m }));
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
        "contactName",
        "contactPhone",
        note,
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

  async getPerformanceStats(driverId: string): Promise<{
    ratingAvg: number | null;
    ratingCount: number;
    acceptancePct: number | null;
    cancellationPct: number | null;
    recentReviews: Array<{
      id: string;
      orderId: string;
      rating: number;
      comment: string | null;
      createdAt: Date;
    }>;
  }> {
    const [ratingAgg, offerGroups, totalAssigned, cancelledAssigned, recentReviews] =
      await Promise.all([
        this.prisma.orderReview.aggregate({
          where: { order: { driverId } },
          _avg: { rating: true },
          _count: { _all: true },
        }),
        this.prisma.orderDispatchOffer.groupBy({
          by: ['status'],
          where: { driverId, status: { in: ['ACCEPTED', 'DECLINED', 'EXPIRED'] } },
          _count: { _all: true },
        }),
        this.prisma.order.count({ where: { driverId, status: { not: 'REQUESTED' } } }),
        this.prisma.order.count({
          where: { driverId, status: { in: ['CANCELLED', 'INCIDENT_CANCELLED'] } },
        }),
        this.prisma.orderReview.findMany({
          where: { order: { driverId }, comment: { not: null } },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            orderId: true,
            rating: true,
            comment: true,
            createdAt: true,
            customer: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        }),
      ]);

    const acceptedCount = offerGroups.find((g) => g.status === 'ACCEPTED')?._count._all ?? 0;
    const resolvedOfferCount = offerGroups.reduce((sum, g) => sum + g._count._all, 0);

    return {
      ratingAvg: ratingAgg._avg.rating,
      ratingCount: ratingAgg._count._all,
      acceptancePct: resolvedOfferCount > 0 ? (acceptedCount / resolvedOfferCount) * 100 : null,
      cancellationPct: totalAssigned > 0 ? (cancelledAssigned / totalAssigned) * 100 : null,
      recentReviews,
    };
  }
}
