// apps/api/src/drivers/withdrawals.repository.ts
import { Injectable } from '@nestjs/common';
import type { WithdrawalRequest } from '@prisma/client';
import { DomainError } from '../common/domain-error.js';
import { PrismaService } from '../database/prisma.service.js';

export interface WalletSummary {
  readonly availableBalanceVnd: number;
  readonly lifetimeDeliveredVnd: number;
  readonly pendingWithdrawalVnd: number;
  readonly deliveredOrderCount: number;
  readonly bankName: string | null;
  readonly bankAccountNumber: string | null;
  readonly bankAccountName: string | null;
}

export interface UpdateBankAccountInput {
  readonly bankName: string;
  readonly bankAccountNumber: string;
  readonly bankAccountName: string;
}

export interface CreateWithdrawalRequestInput {
  readonly driverId: string;
  readonly amountVnd: number;
  readonly bankName: string;
  readonly bankAccountNumber: string;
  readonly bankAccountName: string;
  readonly clientRequestId?: string | undefined;
}

@Injectable()
export class WithdrawalsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getWalletSummary(driverId: string): Promise<WalletSummary> {
    const [deliveredOrders, heldWithdrawals, deposits, profile] = await Promise.all([
      this.prisma.order.findMany({
        where: { driverId, status: 'DELIVERED' },
        select: {
          id: true,
          priceVnd: true,
          paymentIntents: {
            select: {
              status: true,
              confirmationNote: true,
            },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      this.prisma.withdrawalRequest.findMany({
        where: { driverId, status: { in: ['PENDING', 'APPROVED'] } },
      }),
      this.prisma.driverDeposit.findMany({
        where: { driverId, status: 'COMPLETED' },
      }),
      // Bank columns already exist on DriverProfile (schema.prisma:287-289) — no new migration.
      this.prisma.driverProfile.findUnique({
        where: { userId: driverId },
        select: { bankName: true, bankAccountNumber: true, bankAccountName: true },
      }),
    ]);

    const totalDepositedVnd = deposits.reduce(
      (sum: number, d: { amountVnd: number }) => sum + (d.amountVnd ?? 0),
      0,
    );

    let netOrdersEarningsVnd = 0;
    let lifetimeDeliveredVnd = 0;

    for (const order of deliveredOrders) {
      const price = order.priceVnd ?? 0;
      lifetimeDeliveredVnd += price;
      const latestPayment = (order as any).paymentIntents?.[0];
      const isCash = latestPayment?.confirmationNote?.includes('tiền mặt');

      if (isCash) {
        // Driver collected 100% cash in hand; platform charges 20% commission fee
        netOrdersEarningsVnd -= Math.round(price * 0.2);
      } else {
        // Online payment (payOS / VietQR): platform collected 100%; driver earns 80%
        netOrdersEarningsVnd += Math.round(price * 0.8);
      }
    }

    const pendingWithdrawalVnd = heldWithdrawals
      .filter((w: WithdrawalRequest) => w.status === 'PENDING')
      .reduce((sum: number, w: WithdrawalRequest) => sum + w.amountVnd, 0);
    const heldTotalVnd = heldWithdrawals.reduce(
      (sum: number, w: WithdrawalRequest) => sum + w.amountVnd,
      0,
    );

    const availableBalanceVnd = totalDepositedVnd + netOrdersEarningsVnd - heldTotalVnd;

    return {
      availableBalanceVnd,
      lifetimeDeliveredVnd,
      pendingWithdrawalVnd,
      deliveredOrderCount: deliveredOrders.length,
      bankName: profile?.bankName ?? null,
      bankAccountNumber: profile?.bankAccountNumber ?? null,
      bankAccountName: profile?.bankAccountName ?? null,
    };
  }

  async updateBankAccount(driverId: string, input: UpdateBankAccountInput) {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { userId: driverId },
      select: { id: true },
    });
    if (!profile) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy hồ sơ tài xế');
    }
    return this.prisma.driverProfile.update({
      where: { userId: driverId },
      data: {
        bankName: input.bankName,
        bankAccountNumber: input.bankAccountNumber,
        bankAccountName: input.bankAccountName,
      },
    });
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
  ): Promise<{ items: any[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const [withdrawals, deliveredOrders, deposits] = await Promise.all([
      this.prisma.withdrawalRequest.findMany({
        where: { driverId },
      }),
      this.prisma.order.findMany({
        where: { driverId, status: 'DELIVERED' },
        select: {
          id: true,
          priceVnd: true,
          deliveredAt: true,
          updatedAt: true,
          paymentIntents: {
            select: {
              status: true,
              confirmationNote: true,
            },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      this.prisma.driverDeposit.findMany({
        where: { driverId, status: 'COMPLETED' },
      }),
    ]);

    const txs: any[] = [];

    for (const w of withdrawals) {
      txs.push({
        id: w.id,
        type: 'WITHDRAWAL',
        status: w.status,
        amountVnd: w.amountVnd,
        bankName: w.bankName,
        bankAccountNumber: w.bankAccountNumber,
        bankAccountName: w.bankAccountName,
        createdAt: w.createdAt,
        title: `Rút tiền về ${w.bankName ?? 'ngân hàng'}`,
      });
    }

    for (const order of deliveredOrders) {
      const price = order.priceVnd ?? 0;
      const latestPayment = (order as any).paymentIntents?.[0];
      const isCash = latestPayment?.confirmationNote?.includes('tiền mặt') || latestPayment?.status === 'PAID_MANUAL';
      const shortId = order.id.slice(-6).toUpperCase();
      const orderDate = order.deliveredAt ?? order.updatedAt;

      if (isCash) {
        txs.push({
          id: `fee-${order.id}`,
          type: 'PLATFORM_FEE',
          status: 'APPROVED',
          amountVnd: Math.round(price * 0.2),
          bankName: null,
          bankAccountNumber: null,
          bankAccountName: null,
          createdAt: orderDate,
          title: `Phí hoa hồng đơn #${shortId} (thu tiền mặt)`,
        });
      } else {
        txs.push({
          id: `payout-${order.id}`,
          type: 'ORDER_PAYOUT',
          status: 'APPROVED',
          amountVnd: Math.round(price * 0.8),
          bankName: null,
          bankAccountNumber: null,
          bankAccountName: null,
          createdAt: orderDate,
          title: `Cước cuốc xe #${shortId}`,
        });
      }
    }

    for (const d of deposits) {
      txs.push({
        id: `dep-${d.id}`,
        type: 'ORDER_PAYOUT',
        status: 'APPROVED',
        amountVnd: d.amountVnd,
        bankName: null,
        bankAccountNumber: null,
        bankAccountName: null,
        createdAt: d.completedAt ?? d.createdAt,
        title: 'Nạp tiền vào ví tài xế',
      });
    }

    txs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = txs.length;
    const skip = (page - 1) * pageSize;
    const items = txs.slice(skip, skip + pageSize);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 0 };
  }

  async createDeposit(data: {
    driverId: string;
    amountVnd: number;
    payosOrderCode: bigint;
    qrPayload?: string | undefined;
    clientRequestId?: string | undefined;
  }) {
    return this.prisma.driverDeposit.create({
      data: {
        driverId: data.driverId,
        amountVnd: data.amountVnd,
        payosOrderCode: data.payosOrderCode,
        ...(data.qrPayload ? { qrPayload: data.qrPayload } : {}),
        ...(data.clientRequestId ? { clientRequestId: data.clientRequestId } : {}),
        status: 'PENDING',
      },
    });
  }

  async findDepositByOrderCode(payosOrderCode: bigint) {
    return this.prisma.driverDeposit.findUnique({
      where: { payosOrderCode },
    });
  }

  async completeDeposit(id: string) {
    return this.prisma.driverDeposit.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });
  }
}
