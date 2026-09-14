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

      const event = await tx.stopProgressEvent.create({
        data: { orderId, stopId, step, action: 'RECORDED', actorId: actor.userId, clientRequestId, occurredAt },
      });
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

      const voidEvent = await tx.stopProgressEvent.create({
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
      await tx.stopProgressState.delete({
        where: { orderId_stopId_step: { orderId, stopId, step: original.step } },
      });

      const inputRevision = await this.etaService.bumpRevision(tx, orderId);

      return { eventId: voidEvent.id, replayed: false, inputRevision };
    });
  }
}
