import { Injectable } from '@nestjs/common';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { DomainError } from '../common/domain-error.js';
import { PrismaService } from '../database/prisma.service.js';
import { EtaService } from './eta.service.js';

export class StopProgressCommandConflictError extends DomainError {
  constructor(message: string) {
    super('STOP_PROGRESS_CONFLICT', 409, message);
  }
}

export type StopProgressStep = 'ARRIVED' | 'SERVICE_STARTED' | 'SERVICE_COMPLETED';

@Injectable()
export class StopProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly etaService: EtaService,
  ) {}

  async record(
    actor: AuthenticatedActor,
    orderId: string,
    stopId: string,
    step: StopProgressStep,
    clientRequestId: string,
    occurredAt: Date,
  ): Promise<{ eventId: string; replayed: boolean; inputRevision: number }> {
    return this.prisma.$transaction(async (tx) => {
      await tx.orderStop.findFirstOrThrow({ where: { id: stopId, orderId } });

      const existing = await tx.stopProgressEvent.findUnique({
        where: { stopId_clientRequestId: { stopId, clientRequestId } },
      });
      if (existing) {
        const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
        return { eventId: existing.id, replayed: true, inputRevision: order.routeEtaInputRevision };
      }

      const existingState = await tx.stopProgressState.findUnique({
        where: { orderId_stopId_step: { orderId, stopId, step } },
      });
      if (existingState) {
        throw new StopProgressCommandConflictError(`Bước ${step} của điểm dừng này đã được ghi nhận`);
      }

      // Two truly concurrent record() calls with the same clientRequestId can both
      // pass the findUnique idempotency check above (READ COMMITTED doesn't see the
      // other's uncommitted insert yet). The unique constraint on
      // (stopId, clientRequestId) is the actual backstop: the losing insert raises
      // P2002, which we treat as idempotent-success — re-query the now-committed
      // winning event and return the same replayed shape the sequential-retry path
      // above returns, instead of letting the raw Prisma error propagate.
      let event: { id: string };
      try {
        event = await tx.stopProgressEvent.create({
          data: { orderId, stopId, step, action: 'RECORDED', actorId: actor.userId, clientRequestId, occurredAt },
        });
      } catch (error) {
        const isUniqueViolation =
          typeof error === 'object' && error !== null && 'code' in error && (error as { code: unknown }).code === 'P2002';
        if (!isUniqueViolation) {
          throw error;
        }
        const winningEvent = await tx.stopProgressEvent.findUnique({
          where: { stopId_clientRequestId: { stopId, clientRequestId } },
        });
        if (!winningEvent) {
          throw error;
        }
        const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
        return { eventId: winningEvent.id, replayed: true, inputRevision: order.routeEtaInputRevision };
      }

      await tx.stopProgressState.create({
        data: { orderId, stopId, step, activeEventId: event.id },
      });

      const inputRevision = await this.etaService.bumpRevision(tx, orderId);

      return { eventId: event.id, replayed: false, inputRevision };
    });
  }

  async void(
    actor: AuthenticatedActor,
    orderId: string,
    stopId: string,
    supersedesEventId: string,
    clientRequestId: string,
    reason: string,
    occurredAt: Date,
  ): Promise<{ eventId: string; replayed: boolean; inputRevision: number }> {
    return this.prisma.$transaction(async (tx) => {
      await tx.orderStop.findFirstOrThrow({ where: { id: stopId, orderId } });

      const existing = await tx.stopProgressEvent.findUnique({
        where: { stopId_clientRequestId: { stopId, clientRequestId } },
      });
      if (existing) {
        const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
        return { eventId: existing.id, replayed: true, inputRevision: order.routeEtaInputRevision };
      }

      const original = await tx.stopProgressEvent.findFirstOrThrow({
        where: { id: supersedesEventId, orderId, stopId },
      });

      // Same race as record(): two truly concurrent void() calls with the same
      // clientRequestId can both pass the findUnique check above before either
      // commits. The unique constraint on (stopId, clientRequestId) is the actual
      // backstop — the losing insert raises P2002, treated here as idempotent
      // success by re-querying the now-committed winning event.
      let voidEvent: { id: string };
      try {
        voidEvent = await tx.stopProgressEvent.create({
          data: {
            orderId,
            stopId,
            step: original.step,
            action: 'VOIDED',
            actorId: actor.userId,
            clientRequestId,
            occurredAt,
            supersedesEventId,
            reason,
          },
        });
      } catch (error) {
        const isUniqueViolation =
          typeof error === 'object' && error !== null && 'code' in error && (error as { code: unknown }).code === 'P2002';
        if (!isUniqueViolation) {
          throw error;
        }
        const winningEvent = await tx.stopProgressEvent.findUnique({
          where: { stopId_clientRequestId: { stopId, clientRequestId } },
        });
        if (!winningEvent) {
          throw error;
        }
        const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
        return { eventId: winningEvent.id, replayed: true, inputRevision: order.routeEtaInputRevision };
      }

      await tx.stopProgressState.delete({
        where: { orderId_stopId_step: { orderId, stopId, step: original.step } },
      });

      const inputRevision = await this.etaService.bumpRevision(tx, orderId);

      return { eventId: voidEvent.id, replayed: false, inputRevision };
    });
  }
}
