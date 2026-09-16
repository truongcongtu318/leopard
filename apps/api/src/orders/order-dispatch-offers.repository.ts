import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class OrderDispatchOffersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createPending(orderId: string, driverIds: string[]): Promise<void> {
    if (driverIds.length === 0) return;
    await this.prisma.orderDispatchOffer.createMany({
      data: driverIds.map((driverId) => ({ orderId, driverId })),
      skipDuplicates: true,
    });
  }

  async findExcludedDriverIds(orderId: string): Promise<string[]> {
    const rows = await this.prisma.orderDispatchOffer.findMany({
      where: { orderId },
      select: { driverId: true },
    });
    return rows.map((row) => row.driverId);
  }

  async markDeclined(orderId: string, driverId: string): Promise<number> {
    const result = await this.prisma.orderDispatchOffer.updateMany({
      where: { orderId, driverId, status: 'PENDING' },
      data: { status: 'DECLINED', respondedAt: new Date() },
    });
    return result.count;
  }

  async markAccepted(
    tx: Prisma.TransactionClient,
    orderId: string,
    driverId: string,
  ): Promise<void> {
    await tx.orderDispatchOffer.updateMany({
      where: { orderId, driverId },
      data: { status: 'ACCEPTED', respondedAt: new Date() },
    });
  }

  async expireStalePending(timeoutSeconds: number): Promise<number> {
    const cutoff = new Date(Date.now() - timeoutSeconds * 1000);
    const result = await this.prisma.orderDispatchOffer.updateMany({
      where: { status: 'PENDING', offeredAt: { lt: cutoff } },
      data: { status: 'EXPIRED', respondedAt: new Date() },
    });
    return result.count;
  }

  async findOrderIdsNeedingRedispatch(timeoutSeconds: number): Promise<string[]> {
    const cutoff = new Date(Date.now() - timeoutSeconds * 1000);
    const rows = await this.prisma.order.findMany({
      where: {
        status: 'REQUESTED',
        driverId: null,
        createdAt: { lt: cutoff },
        dispatchOffers: { none: { status: 'PENDING' } },
      },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }
}
