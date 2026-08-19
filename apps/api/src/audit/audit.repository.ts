import { Injectable } from '@nestjs/common';
import type { AuditLog, Prisma } from '@prisma/client';

@Injectable()
export class AuditRepository {
  async append(
    data: Prisma.AuditLogUncheckedCreateInput,
    tx: Prisma.TransactionClient,
  ): Promise<AuditLog> {
    return tx.auditLog.create({ data });
  }
}
