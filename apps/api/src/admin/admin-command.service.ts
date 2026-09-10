import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { AdminUpdateUserStatusCommand } from '@leopard/shared';
import { DomainError } from '../common/domain-error.js';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { AuditService } from '../audit/audit.service.js';
import { UserStatus } from '@prisma/client';

@Injectable()
export class AdminCommandService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async updateUserStatus(actor: AuthenticatedActor, userId: string, command: AdminUpdateUserStatusCommand): Promise<void> {
    if (userId === actor.userId) {
      throw new DomainError('FORBIDDEN', 403, 'Không thể tự vô hiệu hóa tài khoản của chính mình');
    }
    const reason = command.reason?.trim() ?? '';
    if (reason.length < 5 || reason.length > 500) {
      throw new DomainError('VALIDATION_ERROR', 422, 'Lý do phải từ 5 đến 500 ký tự');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy người dùng');
    if (!['ACTIVE', 'DISABLED'].includes(command.status)) {
      throw new DomainError('VALIDATION_ERROR', 422, 'Trạng thái không hợp lệ');
    }

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.auditLog.findFirst({
        where: { idempotencyRequestId: command.clientRequestId },
      });
      if (existing) return;

      await tx.user.update({ where: { id: userId }, data: { status: command.status as UserStatus } });
      await this.audit.append({
        actorId: actor.userId,
        action: 'UPDATE_USER_STATUS',
        resourceType: 'User',
        resourceId: userId,
        idempotencyRequestId: command.clientRequestId,
        metadata: { fromStatus: user.status, toStatus: command.status, reason },
      }, tx);
    });
  }
}
