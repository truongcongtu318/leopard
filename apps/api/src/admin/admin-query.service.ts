import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type {
  AdminDashboardDto,
  AdminUserSummaryDto,
  AdminUserQuery,
  AdminDriverSummaryDto,
  AdminDriverQuery,
  AdminOrderSummaryDto,
  AdminOrderQuery,
} from '@leopard/shared';
import { Prisma } from '@prisma/client';
import type { User, DriverProfile, Order } from '@prisma/client';
import type { Role, UserStatus, OrderStatus } from '@prisma/client';

@Injectable()
export class AdminQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(): Promise<AdminDashboardDto> {
    const [totalUsers, totalOrders, revenueRes] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.order.count(),
      this.prisma.order.aggregate({
        _sum: { priceVnd: true },
        where: { status: 'DELIVERED' },
      }),
    ]);

    return {
      totalUsers,
      totalOrders,
      revenueVnd: revenueRes._sum.priceVnd ?? 0,
    };
  }

  async getUsers(query: AdminUserQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.UserWhereInput = {};
    if (query.role) where.role = query.role as Role;
    if (query.status) where.status = query.status as UserStatus;
    if (query.q) where.phone = { contains: query.q, mode: 'insensitive' };

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const items: AdminUserSummaryDto[] = users.map((u: User) => ({
      id: u.id,
      phone: u.phone ?? '',
      role: u.role,
      status: u.status,
      createdAt: u.createdAt.toISOString(),
    }));

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getDrivers(query: AdminDriverQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.UserWhereInput = { role: 'DRIVER' };
    if (query.status) where.status = query.status as UserStatus;
    if (query.q) where.phone = { contains: query.q, mode: 'insensitive' };

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          driverProfile: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    type DriverWithRelations = User & {
      driverProfile: DriverProfile | null;
    };
    const items: AdminDriverSummaryDto[] = users.map((u: DriverWithRelations) => ({
      id: u.id,
      name: u.name ?? u.phone ?? '',
      phone: u.phone ?? '',
      status: u.status,
      availability: u.driverProfile?.availability ?? 'OFFLINE',
      vehicleType: u.driverProfile?.vehicleType ?? 'MOTORBIKE',
      lastKnownAt: u.driverProfile?.lastKnownAt?.toISOString() ?? null,
    }));

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getOrders(query: AdminOrderQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.OrderWhereInput = {};
    if (query.status) where.status = query.status as OrderStatus;
    if (query.driverId) where.driverId = query.driverId;
    if (query.from && query.to) {
       where.createdAt = { gte: new Date(query.from), lte: new Date(query.to) };
    }
    if (query.q) {
       // Full-text search on order is not available on UUID; skip for now
    }

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          driver: true,
          customer: { select: { phone: true } },
          stops: { orderBy: { sequence: 'asc' } },
          paymentIntents: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    type OrderWithRelations = Order & {
      driver: User | null;
      customer: { phone: string | null };
      stops: Array<{ id: string; type: string; sequence: number; address: string }>;
      paymentIntents: Array<{ status: string }>;
    };
    // ponytail: one raw query for all stop coords (N+1 findMany per order if upgraded naively)
    const orderIds = orders.map((o) => o.id);
    const stopCoords: Array<{ orderId: string; type: string; lat: number | null; lng: number | null }> =
      orderIds.length > 0
        ? await this.prisma.$queryRaw`
            SELECT "orderId", type,
              ST_Y(location::geometry) as lat,
              ST_X(location::geometry) as lng
            FROM "OrderStop"
            WHERE "orderId" IN (${Prisma.join(orderIds.map((id) => Prisma.sql`${id}::uuid`))})
          `
        : [];
    const coordsByOrder = new Map<string, typeof stopCoords>();
    for (const row of stopCoords) {
      const list = coordsByOrder.get(row.orderId) ?? [];
      list.push(row);
      coordsByOrder.set(row.orderId, list);
    }
    const items: AdminOrderSummaryDto[] = orders.map((o: OrderWithRelations) => {
      const rawId = o.id.replace(/-/g, '');
      const suffix = rawId.slice(-4).toUpperCase();
      const pickup = o.stops.find((s) => s.type === 'PICKUP');
      const dropoff = [...o.stops].reverse().find((s) => s.type === 'DROPOFF');
      const pickupCoord = coordsByOrder.get(o.id)?.find((c) => c.type === 'PICKUP');
      const dropoffCoord = coordsByOrder.get(o.id)?.find((c) => c.type === 'DROPOFF');
      return {
        id: o.id,
        code: `LP-${suffix}`,
        status: o.status,
        driverId: o.driverId ?? undefined,
        driverName: (o.driver?.name ?? o.driver?.phone) ?? undefined,
        customerPhone: o.customer.phone ?? null,
        pickupLabel: pickup?.address ?? '',
       pickupLat: pickupCoord?.lat ?? null,
       pickupLng: pickupCoord?.lng ?? null,
       dropoffLabel: dropoff?.address ?? '',
       dropoffLat: dropoffCoord?.lat ?? null,
       dropoffLng: dropoffCoord?.lng ?? null,
       paymentStatus: o.paymentIntents[0]?.status ?? 'UNPAID',
       priceVnd: o.priceVnd ?? 0,
       createdAt: o.createdAt.toISOString(),
       updatedAt: o.updatedAt.toISOString(),
       distanceMeters: o.distanceMeters ?? 0,
     };
    });

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
