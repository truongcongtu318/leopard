import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { OrderStatus } from '@prisma/client';

import { DomainError } from '../common/domain-error.js';
import { PrismaService } from '../database/prisma.service.js';
import type { TrackingPointInput } from './tracking-point.schema.js';
import type { TrackingOrderAccess } from './tracking.policy.js';
import type { TrackingPointDto, TrackingPointQuery, TrackingPointPage } from '@leopard/shared';
import { mapTrackingPoint, type TrackingPointRawRow } from './tracking-response.mapper.js';

@Injectable()
export class TrackingRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async recordPointAtomically(
    actorId: string,
    orderId: string,
    input: TrackingPointInput,
    authorize: (order: TrackingOrderAccess) => void,
    consumeRateLimit: () => void,
  ): Promise<TrackingPointRawRow> {
    return this.prisma.$transaction(async (tx) => {
      const order = await this.findOrderAccessInternal(tx, actorId, orderId);
      if (!order) {
        throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Order was not found');
      }

      authorize(order);
      consumeRateLimit();

      const existing = await tx.$queryRaw<TrackingPointRawRow[]>`
        SELECT
          id,
          "orderId",
          "driverId",
          "clientPointId",
          ST_Y(location::geometry) as latitude,
          ST_X(location::geometry) as longitude,
          "accuracyM",
          "capturedAt",
          "createdAt"
        FROM "TrackingPoint"
        WHERE "orderId" = ${orderId}::uuid AND "clientPointId" = ${input.clientPointId}
      `;

      if (existing.length > 0) {
        const point = existing[0];
        if (!point) throw new Error('Unreachable');
        if (
           point.latitude !== input.latitude || 
           point.longitude !== input.longitude ||
           point.capturedAt.getTime() !== input.capturedAt.getTime()
        ) {
           throw new DomainError('TRACKING_POINT_CONFLICT', 409, 'Conflict tracking point payload');
        }
        return point;
      }

      const insertResult = await tx.$queryRaw<TrackingPointRawRow[]>`
        INSERT INTO "TrackingPoint" (
          id,
          "orderId",
          "driverId",
          "clientPointId",
          location,
          "accuracyM",
          "capturedAt",
          "createdAt"
        ) VALUES (
          gen_random_uuid(),
          ${orderId}::uuid,
          ${actorId}::uuid,
          ${input.clientPointId},
          ST_SetSRID(ST_MakePoint(${input.longitude}, ${input.latitude}), 4326)::geography,
          ${input.accuracyM ?? null},
          ${input.capturedAt},
          NOW()
        )
        RETURNING
          id,
          "orderId",
          "driverId",
          "clientPointId",
          ST_Y(location::geometry) as latitude,
          ST_X(location::geometry) as longitude,
          "accuracyM",
          "capturedAt",
          "createdAt"
      `;
      const inserted = insertResult[0];
      if (!inserted) throw new Error('Unreachable');

      await tx.$queryRaw`
        UPDATE "DriverProfile"
        SET 
          "lastKnownLocation" = ST_SetSRID(ST_MakePoint(${input.longitude}, ${input.latitude}), 4326)::geography,
          "lastKnownAt" = ${input.capturedAt},
          "updatedAt" = NOW()
        WHERE "userId" = ${actorId}::uuid
      `;

      return inserted;
    });
  }

  public async findOrderAccess(actorId: string, orderId: string): Promise<TrackingOrderAccess | null> {
    return this.findOrderAccessInternal(this.prisma, actorId, orderId);
  }

  private async findOrderAccessInternal(db: any, actorId: string, orderId: string): Promise<TrackingOrderAccess | null> {
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, customerId: true, driverId: true },
    });

    if (!order) return null;

    const fleetMemberships = await db.fleetMember.findMany({
      where: {
        userId: actorId,
        status: 'ACTIVE',
      },
      select: { fleetId: true, role: true },
    });

    const activeOwnerFleetIds = fleetMemberships
      .filter((m: any) => m.role === 'OWNER')
      .map((m: any) => m.fleetId);

    let activeDriverFleetIds: string[] = [];
    if (order.driverId) {
      const driverMemberships = await db.fleetMember.findMany({
        where: {
          userId: order.driverId,
          status: 'ACTIVE',
          role: 'DRIVER'
        },
        select: { fleetId: true },
      });
      activeDriverFleetIds = driverMemberships.map((m: any) => m.fleetId);
    }

    return {
      id: order.id,
      status: order.status as OrderStatus,
      customerId: order.customerId,
      driverId: order.driverId,
      activeOwnerFleetIds,
      activeDriverFleetIds,
    };
  }

  public async findHistory(orderId: string, query: TrackingPointQuery): Promise<TrackingPointPage> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const limit = Math.min(pageSize, 100);
    const offset = (page - 1) * limit;

    const conditions: Prisma.Sql[] = [Prisma.sql`"orderId" = ${orderId}::uuid`];
    if (query.from) {
      conditions.push(Prisma.sql`"capturedAt" >= ${query.from}`);
    }
    if (query.to) {
      conditions.push(Prisma.sql`"capturedAt" <= ${query.to}`);
    }
    const where = Prisma.sql`${Prisma.join(conditions, ' AND ')}`;

    const countRes = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM "TrackingPoint" WHERE ${where}
    `;
    const total = Number(countRes[0]?.count ?? 0);

    const items = await this.prisma.$queryRaw<TrackingPointRawRow[]>`
      SELECT
        id,
        "orderId",
        "driverId",
        "clientPointId",
        ST_Y(location::geometry) as latitude,
        ST_X(location::geometry) as longitude,
        "accuracyM",
        "capturedAt",
        "createdAt"
      FROM "TrackingPoint"
      WHERE ${where}
      ORDER BY "capturedAt" DESC, id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      items: items.map(mapTrackingPoint),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  public async findLatestPoint(orderId: string): Promise<TrackingPointRawRow | null> {
    const items = await this.prisma.$queryRaw<TrackingPointRawRow[]>`
      SELECT
        id,
        "orderId",
        "driverId",
        "clientPointId",
        ST_Y(location::geometry) as latitude,
        ST_X(location::geometry) as longitude,
        "accuracyM",
        "capturedAt",
        "createdAt"
      FROM "TrackingPoint"
      WHERE "orderId" = ${orderId}::uuid
      ORDER BY "capturedAt" DESC, id DESC
      LIMIT 1
    `;

    return items.length > 0 ? (items[0] ?? null) : null;
  }
}
