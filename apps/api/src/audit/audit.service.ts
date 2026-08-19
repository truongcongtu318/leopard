import { Injectable } from '@nestjs/common';
import type { AuditLog } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { AuditRepository } from './audit.repository.js';

export interface AuditInput {
  actorId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  requestId?: string;
  idempotencyRequestId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private readonly repository: AuditRepository) {}

  append(input: AuditInput, tx: Prisma.TransactionClient): Promise<AuditLog> {
    return this.repository.append(
      {
        actorId: input.actorId,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        requestId: input.requestId ?? null,
        idempotencyRequestId: input.idempotencyRequestId ?? null,
        metadata: input.metadata
          ? ({ ...input.metadata } as Prisma.InputJsonValue)
          : Prisma.DbNull,
      },
      tx,
    );
  }
}
