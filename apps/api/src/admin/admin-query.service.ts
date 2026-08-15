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
    const items: AdminFleetSummaryDto[] = fleets.map((f: FleetWithCount) => ({
      id: f.id,
      name: f.name,
      createdAt: f.createdAt.toISOString(),
      driversCount: f._count.memberships,
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
        include: { driverProfile: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    type UserWithProfile = User & { driverProfile: DriverProfile | null };
    const items: FleetDriverSummaryDto[] = users.map((u: UserWithProfile) => ({
      id: u.id,
      name: u.phone,
      phone: u.phone,
      status: u.status,
      availability: u.driverProfile?.availability ?? 'OFFLINE',
      vehicleType: u.driverProfile?.vehicleType ?? 'MOTORBIKE',
      lastKnownAt: u.driverProfile?.lastKnownAt?.toISOString() ?? null,
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
        include: { driver: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    type OrderWithDriver = Order & { driver: User | null };
    const items: FleetOrderSummaryDto[] = orders.map((o: OrderWithDriver) => ({
       id: o.id,
       code: o.id.split('-')[0]?.toUpperCase() ?? '',
       status: o.status,
       driverId: o.driverId ?? undefined,
       driverName: o.driver?.phone,
       priceVnd: o.priceVnd ?? 0,
       createdAt: o.createdAt.toISOString(),
       distanceMeters: o.distanceMeters ?? 0,
    }));

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
