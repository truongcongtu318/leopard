import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type {
  AdminDashboardDto,
  AdminUserSummaryDto,
  AdminUserQuery,
  AdminFleetSummaryDto,
  AdminFleetQuery,
  FleetDriverSummaryDto,
  FleetDriverQuery,
  FleetOrderSummaryDto,
  FleetOrderQuery,
} from '@leopard/shared';
import type { Prisma, User, Fleet, DriverProfile, Order } from '@prisma/client';
import type { Role, UserStatus, OrderStatus, FleetMemberStatus } from '@prisma/client';

@Injectable()
export class AdminQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(): Promise<AdminDashboardDto> {
    const [totalUsers, totalOrders, activeFleets, revenueRes] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.order.count(),
      this.prisma.fleet.count(),
      this.prisma.order.aggregate({
        _sum: { priceVnd: true },
        where: { status: 'DELIVERED' },
      }),
    ]);

    return {
      totalUsers,
      totalOrders,
      activeFleets,
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
      phone: u.phone,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt.toISOString(),
    }));

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getFleets(query: AdminFleetQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.FleetWhereInput = {};
    if (query.q) where.name = { contains: query.q, mode: 'insensitive' };

    const [total, fleets] = await Promise.all([
      this.prisma.fleet.count({ where }),
      this.prisma.fleet.findMany({
        where,
        skip,
        take: pageSize,
        include: { _count: { select: { memberships: { where: { role: 'DRIVER', status: 'ACTIVE' } } } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    type FleetWithCount = Fleet & { _count: { memberships: number } };
    const fleetIds = fleets.map((f) => f.id);
    const activeMemberships =
      fleetIds.length > 0
        ? await this.prisma.fleetMember.findMany({
            where: { fleetId: { in: fleetIds }, role: 'DRIVER', status: 'ACTIVE' },
            select: { fleetId: true, userId: true },
          })
        : [];
    const driverIdsByFleet = new Map<string, string[]>();
    for (const membership of activeMemberships) {
      const list = driverIdsByFleet.get(membership.fleetId) ?? [];
      list.push(membership.userId);
      driverIdsByFleet.set(membership.fleetId, list);
    }
    const allDriverIds = [...new Set(activeMemberships.map((m) => m.userId))];
    const activeOrderGroups =
      allDriverIds.length > 0
        ? await this.prisma.order.groupBy({
            by: ['driverId'],
            _count: { _all: true },
            where: {
              driverId: { in: allDriverIds },
              status: { notIn: ['DELIVERED', 'CANCELLED'] },
            },
          })
        : [];
    const activeOrdersByDriver = new Map(
      activeOrderGroups
        .filter((g): g is typeof g & { driverId: string } => g.driverId !== null)
        .map((g) => [g.driverId, g._count._all]),
    );

    const items: AdminFleetSummaryDto[] = fleets.map((f: FleetWithCount) => ({
      id: f.id,
      name: f.name,
      createdAt: f.createdAt.toISOString(),
      driversCount: f._count.memberships,
      activeOrdersCount: (driverIdsByFleet.get(f.id) ?? []).reduce(
        (sum, driverId) => sum + (activeOrdersByDriver.get(driverId) ?? 0),
        0,
      ),
    }));

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getDrivers(query: FleetDriverQuery) {
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
          fleetMemberships: {
            where: { role: 'DRIVER', status: { in: ['INVITED', 'ACTIVE'] } },
            include: { fleet: { select: { name: true } } },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    type DriverWithRelations = User & {
      driverProfile: DriverProfile | null;
      fleetMemberships: Array<{ status: string; fleet: { name: string } }>;
    };
    const items: FleetDriverSummaryDto[] = users.map((u: DriverWithRelations) => ({
      id: u.id,
      name: u.phone,
      phone: u.phone,
      status: u.status,
      availability: u.driverProfile?.availability ?? 'OFFLINE',
      vehicleType: u.driverProfile?.vehicleType ?? 'MOTORBIKE',
      lastKnownAt: u.driverProfile?.lastKnownAt?.toISOString() ?? null,
      membershipStatus: u.fleetMemberships[0]?.status ?? null,
      fleetName: u.fleetMemberships[0]?.fleet.name ?? null,
    }));

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getOrders(query: FleetOrderQuery) {
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
      customer: { phone: string };
      stops: Array<{ type: string; sequence: number; address: string }>;
      paymentIntents: Array<{ status: string }>;
    };
    const items: FleetOrderSummaryDto[] = orders.map((o: OrderWithRelations) => ({
       id: o.id,
       code: o.id.split('-')[0]?.toUpperCase() ?? '',
       status: o.status,
       driverId: o.driverId ?? undefined,
       driverName: o.driver?.phone,
       customerPhone: o.customer.phone,
       pickupLabel: o.stops.find((s) => s.type === 'PICKUP')?.address ?? '',
       dropoffLabel:
         [...o.stops].reverse().find((s) => s.type === 'DROPOFF')?.address ?? '',
       paymentStatus: o.paymentIntents[0]?.status ?? 'UNPAID',
       priceVnd: o.priceVnd ?? 0,
       createdAt: o.createdAt.toISOString(),
       updatedAt: o.updatedAt.toISOString(),
       distanceMeters: o.distanceMeters ?? 0,
    }));

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
