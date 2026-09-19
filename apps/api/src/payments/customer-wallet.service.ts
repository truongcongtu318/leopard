import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { DomainError } from '../common/domain-error.js';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import type { RequestCustomerWithdrawalDto } from './dto/customer-withdrawal.dto.js';
import type { WithdrawalRequest } from '@prisma/client';

export interface CustomerWalletSummary {
  readonly refundableBalanceVnd: number;
  readonly totalHeldEscrowVnd: number;
  readonly cancelledPaidAmount: number;
  readonly pendingWithdrawalsVnd: number;
  readonly approvedWithdrawalsVnd: number;
  readonly withdrawalRequests: Array<{
    readonly id: string;
    readonly amountVnd: number;
    readonly status: string;
    readonly bankName: string | null;
    readonly bankAccountNumber: string | null;
    readonly bankAccountName: string | null;
    readonly reviewNote: string | null;
    readonly reviewedAt: string | null;
    readonly createdAt: string;
  }>;
}

const ACTIVE_ORDER_STATUSES = [
  'REQUESTED',
  'SEARCHING',
  'ASSIGNED',
  'ACCEPTED',
  'ARRIVED_AT_PICKUP',
  'PICKED_UP',
  'IN_TRANSIT',
];

@Injectable()
export class CustomerWalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getWalletSummary(customerId: string): Promise<CustomerWalletSummary> {
    const [orders, withdrawals] = await Promise.all([
      this.prisma.order.findMany({
        where: { customerId },
        include: {
          paymentIntents: {
            where: {
              status: { in: ['PAID_MANUAL'] },
            },
          },
        },
      }),
      this.prisma.withdrawalRequest.findMany({
        where: { driverId: customerId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    let cancelledPaidAmount = 0;
    let totalHeldEscrowVnd = 0;

    for (const order of orders) {
      const orderPaidVnd = (order.paymentIntents || []).reduce(
        (sum, p) => sum + (p.amountVnd ?? 0),
        0,
      );

      if (order.status === 'CANCELLED') {
        cancelledPaidAmount += orderPaidVnd;
      } else if (ACTIVE_ORDER_STATUSES.includes(order.status)) {
        totalHeldEscrowVnd += orderPaidVnd;
      }
    }

    const pendingWithdrawalsVnd = withdrawals
      .filter((w) => w.status === 'PENDING')
      .reduce((sum, w) => sum + w.amountVnd, 0);

    const approvedWithdrawalsVnd = withdrawals
      .filter((w) => w.status === 'APPROVED')
      .reduce((sum, w) => sum + w.amountVnd, 0);

    const refundableBalanceVnd = Math.max(
      0,
      cancelledPaidAmount - pendingWithdrawalsVnd - approvedWithdrawalsVnd,
    );

    return {
      refundableBalanceVnd,
      totalHeldEscrowVnd,
      cancelledPaidAmount,
      pendingWithdrawalsVnd,
      approvedWithdrawalsVnd,
      withdrawalRequests: withdrawals.map((w) => ({
        id: w.id,
        amountVnd: w.amountVnd,
        status: w.status,
        bankName: w.bankName,
        bankAccountNumber: w.bankAccountNumber,
        bankAccountName: w.bankAccountName,
        reviewNote: w.reviewNote,
        reviewedAt: w.reviewedAt ? w.reviewedAt.toISOString() : null,
        createdAt: w.createdAt.toISOString(),
      })),
    };
  }

  async requestWithdrawal(
    actor: AuthenticatedActor,
    dto: RequestCustomerWithdrawalDto,
  ): Promise<WithdrawalRequest> {
    if (dto.clientRequestId) {
      const existing = await this.prisma.withdrawalRequest.findFirst({
        where: {
          driverId: actor.userId,
          clientRequestId: dto.clientRequestId,
        },
      });
      if (existing) {
        return existing;
      }
    }

    const summary = await this.getWalletSummary(actor.userId);
    if (dto.amountVnd > summary.refundableBalanceVnd) {
      throw new DomainError(
        'INSUFFICIENT_BALANCE',
        409,
        `Số tiền yêu cầu rút (${dto.amountVnd.toLocaleString('vi-VN')} ₫) vượt quá số dư ký quỹ có thể hoàn (${summary.refundableBalanceVnd.toLocaleString('vi-VN')} ₫)`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const request = await tx.withdrawalRequest.create({
        data: {
          driverId: actor.userId,
          amountVnd: dto.amountVnd,
          status: 'PENDING',
          bankName: dto.bankName.trim(),
          bankAccountNumber: dto.bankAccountNumber.trim(),
          bankAccountName: dto.bankAccountName.trim().toUpperCase(),
          clientRequestId: dto.clientRequestId ?? null,
        },
      });

      await this.auditService.append(
        {
          actorId: actor.userId,
          action: 'CUSTOMER_WITHDRAWAL_REQUESTED',
          resourceType: 'WithdrawalRequest',
          resourceId: request.id,
          ...(dto.clientRequestId ? { idempotencyRequestId: dto.clientRequestId } : {}),
          metadata: {
            amountVnd: dto.amountVnd,
            bankName: dto.bankName,
            bankAccountNumber: dto.bankAccountNumber,
            bankAccountName: dto.bankAccountName,
          },
        },
        tx,
      );

      return request;
    });
  }
}
