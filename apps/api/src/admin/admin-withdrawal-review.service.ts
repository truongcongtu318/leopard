// apps/api/src/admin/admin-withdrawal-review.service.ts
import { Injectable } from '@nestjs/common';
import type { WithdrawalRequest, WithdrawalStatus } from '@prisma/client';

import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { AuditService } from '../audit/audit.service.js';
import { DomainError } from '../common/domain-error.js';
import { PrismaService } from '../database/prisma.service.js';

export interface WithdrawalSummary {
  readonly id: string;
  readonly driverId: string;
  readonly amountVnd: number;
  readonly status: WithdrawalStatus;
  readonly bankName: string | null;
  readonly bankAccountNumber: string | null;
  readonly bankAccountName: string | null;
  readonly createdAt: string;
  readonly userRole?: string | undefined;
  readonly userName?: string | undefined;
  readonly userPhone?: string | undefined;
}

type WithdrawalWithDriver = WithdrawalRequest & {
  driver?: { name: string | null; phone: string | null; role: string } | null;
};

function toSummary(r: WithdrawalWithDriver): WithdrawalSummary {
  return {
    id: r.id,
    driverId: r.driverId,
    amountVnd: r.amountVnd,
    status: r.status,
    bankName: r.bankName,
    bankAccountNumber: r.bankAccountNumber,
    bankAccountName: r.bankAccountName,
    createdAt: r.createdAt.toISOString(),
    userRole: r.driver?.role ?? undefined,
    userName: r.driver?.name ?? undefined,
    userPhone: r.driver?.phone ?? undefined,
  };
}

/** Admin review of driver withdrawal requests (approve / reject) — mirrors
 * AdminDriverReviewService's approve/reject shape exactly. */
@Injectable()
export class AdminWithdrawalReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listPending(): Promise<WithdrawalSummary[]> {
    const requests = await this.prisma.withdrawalRequest.findMany({
      where: { status: 'PENDING' },
      include: { driver: { select: { name: true, phone: true, role: true } } },
    });
    return requests.map(toSummary);
  }

  async approve(actor: AuthenticatedActor, id: string, note: string, clientRequestId?: string): Promise<void> {
    const trimmed = this.assertValidNote(note);

    if (clientRequestId) {
      const existing = await this.prisma.auditLog.findFirst({
        where: { idempotencyRequestId: clientRequestId },
      });
      if (existing) return;
    }

    const request = await this.requirePendingRequest(id);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      if (clientRequestId) {
        const existing = await tx.auditLog.findFirst({
          where: { idempotencyRequestId: clientRequestId },
        });
        if (existing) return;
      }

      await tx.withdrawalRequest.update({
        where: { id },
        data: { status: 'APPROVED', reviewedById: actor.userId, reviewedAt: now, reviewNote: trimmed },
      });
      await this.audit.append(
        {
          actorId: actor.userId,
          action: 'WITHDRAWAL_APPROVED',
          resourceType: 'WithdrawalRequest',
          resourceId: id,
          ...(clientRequestId ? { idempotencyRequestId: clientRequestId } : {}),
          metadata: { driverId: request.driverId, amountVnd: request.amountVnd, note: trimmed },
        },
        tx,
      );
    });
  }

  async reject(actor: AuthenticatedActor, id: string, note: string, clientRequestId?: string): Promise<void> {
    const trimmed = this.assertValidNote(note);

    if (clientRequestId) {
      const existing = await this.prisma.auditLog.findFirst({
        where: { idempotencyRequestId: clientRequestId },
      });
      if (existing) return;
    }

    const request = await this.requirePendingRequest(id);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      if (clientRequestId) {
        const existing = await tx.auditLog.findFirst({
          where: { idempotencyRequestId: clientRequestId },
        });
        if (existing) return;
      }

      await tx.withdrawalRequest.update({
        where: { id },
        data: { status: 'REJECTED', reviewedById: actor.userId, reviewedAt: now, reviewNote: trimmed },
      });
      await this.audit.append(
        {
          actorId: actor.userId,
          action: 'WITHDRAWAL_REJECTED',
          resourceType: 'WithdrawalRequest',
          resourceId: id,
          ...(clientRequestId ? { idempotencyRequestId: clientRequestId } : {}),
          metadata: { driverId: request.driverId, amountVnd: request.amountVnd, note: trimmed },
        },
        tx,
      );
    });
  }

  private assertValidNote(note: string): string {
    const trimmed = note.trim();
    if (trimmed.length < 5 || trimmed.length > 500) {
      throw new DomainError('VALIDATION_ERROR', 422, 'Ghi chú phải từ 5 đến 500 ký tự');
    }
    return trimmed;
  }

  private async requirePendingRequest(id: string): Promise<WithdrawalRequest> {
    const request = await this.prisma.withdrawalRequest.findUnique({ where: { id } });
    if (!request) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy yêu cầu rút tiền');
    }
    if (request.status !== 'PENDING') {
      throw new DomainError('WITHDRAWAL_ALREADY_REVIEWED', 409, 'Yêu cầu rút tiền đã được xử lý trước đó');
    }
    return request;
  }
}
