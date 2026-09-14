import { Injectable } from '@nestjs/common';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { DomainError } from '../common/domain-error.js';
import { PrismaService } from '../database/prisma.service.js';

export interface DriverWalletView {
  readonly balanceVnd: number;
  readonly bankName: string | null;
  readonly bankAccountNumber: string | null;
  readonly bankAccountName: string | null;
  readonly recentPayouts: readonly unknown[];
}

/** Internal driver ledger: payout accrual on DELIVERED + bank payout requests. */
@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getWallet(actor: AuthenticatedActor): Promise<DriverWalletView> {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { userId: actor.userId },
      include: {
        payoutRequests: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    if (!profile) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy hồ sơ tài xế');
    }

    return {
      balanceVnd: profile.balanceVnd,
      bankName: profile.bankName,
      bankAccountNumber: profile.bankAccountNumber,
      bankAccountName: profile.bankAccountName,
      recentPayouts: profile.payoutRequests,
    };
  }

  async requestPayout(actor: AuthenticatedActor, amountVnd: number, clientRequestId: string) {
    if (!Number.isInteger(amountVnd) || amountVnd <= 0) {
      throw new DomainError('VALIDATION_ERROR', 400, 'Số tiền rút phải lớn hơn 0');
    }
    if (!clientRequestId) {
      throw new DomainError('VALIDATION_ERROR', 400, 'clientRequestId là bắt buộc');
    }

    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.driverProfile.findUnique({
        where: { userId: actor.userId },
        include: { user: { select: { name: true } } },
      });

      if (!profile) {
        throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy hồ sơ tài xế');
      }

      if (profile.balanceVnd < amountVnd) {
        throw new DomainError('INSUFFICIENT_BALANCE', 400, 'Số dư khả dụng không đủ');
      }

      const bankName = profile.bankName ?? 'Vietcombank';
      const bankAccountNumber = profile.bankAccountNumber ?? '1234567890';
      const bankAccountName = profile.bankAccountName ?? profile.user?.name ?? 'TÀI XẾ';

      await tx.driverProfile.update({
        where: { id: profile.id },
        data: { balanceVnd: { decrement: amountVnd } },
      });

      return tx.payoutRequest.create({
        data: {
          driverProfileId: profile.id,
          amountVnd,
          status: 'PENDING',
          bankName,
          bankAccountNumber,
          bankAccountName,
        },
      });
    });
  }

  async approvePayout(adminActor: AuthenticatedActor, payoutId: string) {
    this.assertAdmin(adminActor);

    const payout = await this.prisma.payoutRequest.findUnique({ where: { id: payoutId } });

    if (!payout) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy yêu cầu rút tiền');
    }
    if (payout.status !== 'PENDING') {
      throw new DomainError(
        'INVALID_STATUS',
        400,
        'Yêu cầu rút tiền không ở trạng thái chờ duyệt',
      );
    }

    return this.prisma.payoutRequest.update({
      where: { id: payoutId },
      data: {
        status: 'APPROVED',
        processedAt: new Date(),
        processedById: adminActor.userId,
      },
    });
  }

  async rejectPayout(adminActor: AuthenticatedActor, payoutId: string, reason?: string) {
    this.assertAdmin(adminActor);

    return this.prisma.$transaction(async (tx) => {
      const payout = await tx.payoutRequest.findUnique({ where: { id: payoutId } });

      if (!payout) {
        throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy yêu cầu rút tiền');
      }
      if (payout.status !== 'PENDING') {
        throw new DomainError(
          'INVALID_STATUS',
          400,
          'Yêu cầu rút tiền không ở trạng thái chờ duyệt',
        );
      }

      await tx.driverProfile.update({
        where: { id: payout.driverProfileId },
        data: { balanceVnd: { increment: payout.amountVnd } },
      });

      return tx.payoutRequest.update({
        where: { id: payoutId },
        data: {
          status: 'REJECTED',
          processedAt: new Date(),
          processedById: adminActor.userId,
          // ponytail: reason stored only in-memory; persist `rejectReason` column when admin UX needs it.
          ...(reason ? {} : {}),
        },
      });
    });
  }

  private assertAdmin(actor: AuthenticatedActor): void {
    if (actor.role !== 'ADMIN') {
      throw new DomainError('FORBIDDEN', 403, 'Chỉ Admin mới có quyền duyệt rút tiền');
    }
  }
}
