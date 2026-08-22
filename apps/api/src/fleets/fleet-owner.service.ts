import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { FleetScopeRepository } from './fleet-scope.repository.js';
import type {
  FleetProfileDto,
  FleetDriverSummaryDto,
  FleetDriverQuery,
  FleetOrderSummaryDto,
  FleetOrderQuery,
} from '@leopard/shared';
import { DomainError } from '../common/domain-error.js';
import type { Prisma, FleetMember, User, DriverProfile, Order } from '@prisma/client';
import type { FleetMemberStatus as PrismaFleetMemberStatus, OrderStatus } from '@prisma/client';

@Injectable()
export class FleetOwnerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeRepo: FleetScopeRepository,
  ) {}

  async getProfile(fleetId: string): Promise<FleetProfileDto> {
    const fleet = await this.prisma.fleet.findUnique({ where: { id: fleetId } });
    if (!fleet) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Fleet not found');
    }

    const driversCount = await this.prisma.fleetMember.count({
      where: { fleetId, role: 'DRIVER', status: 'ACTIVE' },
    });

    const activeOrdersCount = await this.prisma.order.count({
      where: {
        status: { in: ['ACCEPTED', 'PICKING_UP', 'IN_TRANSIT'] },
        driver: {
          fleetMemberships: { some: { fleetId, role: 'DRIVER', status: 'ACTIVE' } },
        },
      },
    });

    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const revResult = await this.prisma.order.aggregate({
      _sum: { priceVnd: true },
      where: {
        status: 'DELIVERED',
        deliveredAt: { gte: startOfToday },
        driver: {
          fleetMemberships: { some: { fleetId, role: 'DRIVER', status: 'ACTIVE' } },
        },
      },
    });

    return {
      id: fleet.id,
      name: fleet.name,
      createdAt: fleet.createdAt.toISOString(),
      driversCount,
      activeOrdersCount,
      todayRevenueVnd: revResult._sum.priceVnd ?? 0,
    };
  }

  async getDrivers(fleetId: string, query: FleetDriverQuery): Promise<{ items: FleetDriverSummaryDto[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.FleetMemberWhereInput = { fleetId, role: 'DRIVER' };
    if (query.status) {
       where.status = query.status as PrismaFleetMemberStatus;
    }
    if (query.q) {
       where.user = {
         phone: { contains: query.q, mode: 'insensitive' }
       };
    }

    const [total, members] = await Promise.all([
      this.prisma.fleetMember.count({ where }),
      this.prisma.fleetMember.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          user: {
             include: { driverProfile: true }
          }
        },
        orderBy: { joinedAt: 'desc' },
      }),
    ]);

    type MemberWithProfile = FleetMember & { user: User & { driverProfile: DriverProfile | null } };
    const items = members.map((m: MemberWithProfile) => ({
      id: m.userId,
      name: m.user.phone,
      phone: m.user.phone,
      status: m.status,
      availability: m.user.driverProfile?.availability ?? 'OFFLINE',
      vehicleType: m.user.driverProfile?.vehicleType ?? 'MOTORBIKE',
      lastKnownAt: m.user.driverProfile?.lastKnownAt?.toISOString() ?? null,
      membershipStatus: m.status,
      fleetName: null,
    }));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getOrders(fleetId: string, query: FleetOrderQuery): Promise<{ items: FleetOrderSummaryDto[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.OrderWhereInput = {
       driver: {
          fleetMemberships: { some: { fleetId, role: 'DRIVER', status: 'ACTIVE' } }
       }
    };
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
    const items = orders.map((o: OrderWithRelations) => ({
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

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
