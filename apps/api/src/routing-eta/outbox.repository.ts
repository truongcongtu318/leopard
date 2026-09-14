import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';

type OutboxEventType = 'ROUTE_ETA_RECOMPUTE' | 'ROUTE_ETA_UPDATED' | 'ROUTE_UPDATED';

export interface OutboxClaim {
  id: string;
  aggregateId: string;
  type: OutboxEventType;
  inputRevision: number | null;
  payload: unknown;
  leaseOwner: string;
  leaseGeneration: number;
}

@Injectable()
export class OutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  async enqueue(
    tx: Prisma.TransactionClient,
    event: {
      aggregateType: string;
      aggregateId: string;
      type: OutboxEventType;
      inputRevision?: number;
      payload: unknown;
      dedupeKey: string;
    },
  ): Promise<void> {
    await tx.outboxEvent.upsert({
      where: { dedupeKey: event.dedupeKey },
      create: {
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        type: event.type,
        inputRevision: event.inputRevision ?? null,
        payload: event.payload as Prisma.InputJsonValue,
        dedupeKey: event.dedupeKey,
      },
      update: {},
    });
  }

  async claimBatch(workerId: string, limit: number, leaseMs: number): Promise<OutboxClaim[]> {
    const now = new Date();
    const leaseExpiresAt = new Date(now.getTime() + leaseMs);

    return this.prisma.$transaction(async (tx) => {
      const rows: { id: string }[] = await tx.$queryRaw`
        SELECT id FROM "OutboxEvent"
        WHERE (status = 'PENDING' AND "nextAttemptAt" <= ${now} AND attempts < "maxAttempts")
           OR (status = 'LEASED' AND "leaseExpiresAt" < ${now} AND attempts < "maxAttempts")
        ORDER BY "nextAttemptAt"
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      `;

      const claims: OutboxClaim[] = [];
      for (const row of rows) {
        const updated = await tx.outboxEvent.update({
          where: { id: row.id },
          data: {
            status: 'LEASED',
            leaseOwner: workerId,
            leaseGeneration: { increment: 1 },
            leaseExpiresAt,
            attempts: { increment: 1 },
          },
        });
        claims.push({
          id: updated.id,
          aggregateId: updated.aggregateId,
          type: updated.type as OutboxEventType,
          inputRevision: updated.inputRevision,
          payload: updated.payload,
          leaseOwner: workerId,
          leaseGeneration: updated.leaseGeneration,
        });
      }
      return claims;
    });
  }

  async heartbeat(id: string, leaseOwner: string, leaseGeneration: number, leaseMs: number): Promise<boolean> {
    const now = new Date();
    const result = await this.prisma.outboxEvent.updateMany({
      where: { id, status: 'LEASED', leaseOwner, leaseGeneration, leaseExpiresAt: { gt: now } },
      data: { leaseExpiresAt: new Date(now.getTime() + leaseMs) },
    });
    return result.count === 1;
  }

  async markCompleted(
    tx: Prisma.TransactionClient,
    id: string,
    leaseOwner: string,
    leaseGeneration: number,
  ): Promise<boolean> {
    const now = new Date();
    const result = await tx.outboxEvent.updateMany({
      where: { id, status: 'LEASED', leaseOwner, leaseGeneration, leaseExpiresAt: { gt: now } },
      data: { status: 'COMPLETED', completedAt: now },
    });
    return result.count === 1;
  }

  async markFailedOrDeadLetter(
    id: string,
    leaseOwner: string,
    leaseGeneration: number,
    error: string,
    backoffMs: number,
  ): Promise<void> {
    const sanitizedError = redactSecrets(error).slice(0, 500);
    const current = await this.prisma.outboxEvent.findUnique({ where: { id } });
    if (!current) {
      return; // job no longer exists — nothing to update
    }

    const exhausted = current.attempts >= current.maxAttempts;
    const result = await this.prisma.outboxEvent.updateMany({
      where: { id, status: 'LEASED', leaseOwner, leaseGeneration },
      data: exhausted
        ? { status: 'DEAD_LETTER', lastError: sanitizedError }
        : { status: 'PENDING', lastError: sanitizedError, nextAttemptAt: new Date(Date.now() + backoffMs) },
    });

    if (result.count === 0) {
      return; // lease was lost between the read and the write — another worker owns this job now
    }
  }
}

function redactSecrets(message: string): string {
  return message.replace(/apikey=[^&\s]+/gi, 'apikey=[REDACTED]');
}

export function newWorkerId(): string {
  return randomUUID();
}
