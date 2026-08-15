import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class FleetScopeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveFleetScope(userId: string, role: 'OWNER' | 'DRIVER'): Promise<{ fleetId: string } | null> {
    const membership = await this.prisma.fleetMember.findFirst({
      where: {
        userId,
        role,
        status: 'ACTIVE',
      },
      select: {
        fleetId: true,
      },
    });

    return membership;
  }

  async checkMembershipStatus(userId: string, role: 'OWNER' | 'DRIVER'): Promise<{ status: string } | null> {
    const membership = await this.prisma.fleetMember.findFirst({
      where: { userId, role },
      select: { status: true },
      orderBy: { updatedAt: 'desc' },
    });
    return membership;
  }

  async findOrderDriverFleet(orderId: string): Promise<{ fleetId: string } | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { driverId: true },
    });
    if (!order || !order.driverId) return null;
    return this.findActiveFleetScope(order.driverId, 'DRIVER');
  }
}
