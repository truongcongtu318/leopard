// apps/api/src/drivers/withdrawals.repository.ts
import { Injectable } from '@nestjs/common';
import type { WithdrawalRequest } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';

export interface WalletSummary {
  readonly availableBalanceVnd: number;
  readonly lifetimeDeliveredVnd: number;
  readonly pendingWithdrawalVnd: number;
  readonly deliveredOrderCount: number;
}

export interface CreateWithdrawalRequestInput {
  readonly driverId: string;
  readonly amountVnd: number;
  readonly bankName: string;
  readonly bankAccountNumber: string;
  readonly bankAccountName: string;
  readonly clientRequestId?: string;
}

@Injectable()
export class WithdrawalsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getWalletSummary(driverId: string): Promise<WalletSummary> {
    const [deliveredOrders, heldWithdrawals] = await Promise.all([
      this.prisma.order.findMany({
        where: { driverId, status: 'DELIVERED' },
        select: { priceVnd: true },
      }),
      this.prisma.withdrawalRequest.findMany({
        where: { driverId, status: { in: ['PENDING', 'APPROVED'] } },
      }),
    ]);

    const lifetimeDeliveredVnd = deliveredOrders.reduce(
      (sum: number, o: { priceVnd: number | null }) => sum + (o.priceVnd ?? 0),
      0,
    );
    const pendingWithdrawalVnd = heldWithdrawals
      .filter((w: WithdrawalRequest) => w.status === 'PENDING')
      .reduce((sum: number, w: WithdrawalRequest) => sum + w.amountVnd, 0);
    const heldTotalVnd = heldWithdrawals.reduce(
      (sum: number, w: WithdrawalRequest) => sum + w.amountVnd,
      0,
    );

    return {
      availableBalanceVnd: lifetimeDeliveredVnd - heldTotalVnd,
      lifetimeDeliveredVnd,
      pendingWithdrawalVnd,
      deliveredOrderCount: deliveredOrders.length,
    };
  }

  createWithdrawalRequest(input: CreateWithdrawalRequestInput): Promise<WithdrawalRequest> {
    return this.prisma.withdrawalRequest.create({
      data: {
        driverId: input.driverId,
        amountVnd: input.amountVnd,
        bankName: input.bankName,
        bankAccountNumber: input.bankAccountNumber,
        bankAccountName: input.bankAccountName,
        clientRequestId: input.clientRequestId ?? null,
      },
    });
  }

  findWithdrawalRequestByClientRequestId(
    driverId: string,
    clientRequestId: string,
  ): Promise<WithdrawalRequest | null> {
    return this.prisma.withdrawalRequest.findFirst({ where: { driverId, clientRequestId } });
  }

  async findDriverWithdrawalHistory(
    driverId: string,
    page = 1,
    pageSize = 20,
  ): Promise<{ items: WithdrawalRequest[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      this.prisma.withdrawalRequest.findMany({
        where: { driverId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.withdrawalRequest.count({ where: { driverId } }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 0 };
  }
}
