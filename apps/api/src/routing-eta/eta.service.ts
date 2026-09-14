import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { OutboxRepository } from './outbox.repository.js';

export type EtaUnavailableReason =
  | 'NO_TARGET_STOP' | 'GPS_TOO_OLD' | 'ROUTE_UNAVAILABLE' | 'PROVIDER_EXHAUSTED' | 'INVALID_ROUTE_INPUT';

export interface EstimateComputation {
  targetStopId: string | null;
  routeSnapshotId: string;
  status: 'AVAILABLE' | 'UNAVAILABLE';
  unavailableReason?: EtaUnavailableReason;
  remainingDistanceM?: number;
  remainingDurationS?: number;
  arrivalAt?: Date;
  baselineDurationS?: number;
  baselineSource: 'VIETMAP' | 'DEMO';
  gpsPointId?: string;
  calculatedAt: Date;
  validUntil: Date;
}

@Injectable()
export class EtaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxRepository,
  ) {}

  // TX1 — called from AcceptOrderService/StopProgressService/TrackingService in their own transaction
  async bumpRevision(tx: Prisma.TransactionClient, orderId: string): Promise<number> {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: { routeEtaInputRevision: { increment: 1 } },
    });

    await this.outbox.enqueue(tx, {
      aggregateType: 'Order',
      aggregateId: orderId,
      type: 'ROUTE_ETA_RECOMPUTE',
      inputRevision: updated.routeEtaInputRevision,
      payload: { orderId },
      dedupeKey: `${orderId}:ROUTE_ETA_RECOMPUTE:${updated.routeEtaInputRevision}`,
    });

    return updated.routeEtaInputRevision;
  }

  // TX2 — called by the worker after it has a provider result for a given inputRevision.
  // Only the estimate whose inputRevision still matches Order.routeEtaInputRevision at the
  // moment this transaction runs is ever promoted to be the current pointer. A stale job
  // (one whose revision a newer bumpRevision has already superseded) always writes its rows
  // as SUPERSEDED and never touches the Order's current-estimate pointers or the notify outbox —
  // regardless of whether it happens to run before or after the job that wins.
  async promoteOrSupersede(input: {
    orderId: string;
    inputRevision: number;
    nextStop: EstimateComputation;
    completion: EstimateComputation;
  }): Promise<'PROMOTED' | 'SUPERSEDED'> {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUniqueOrThrow({ where: { id: input.orderId } });
      const isStillCurrent = order.routeEtaInputRevision === input.inputRevision;

      const nextStopRow = await tx.orderLiveEstimate.create({
        data: this.toEstimateRow(input.orderId, input.inputRevision, 'NEXT_STOP', input.nextStop, isStillCurrent),
      });
      const completionRow = await tx.orderLiveEstimate.create({
        data: this.toEstimateRow(input.orderId, input.inputRevision, 'COMPLETION', input.completion, isStillCurrent),
      });

      if (!isStillCurrent) {
        return 'SUPERSEDED' as const;
      }

      const staleIds = [order.currentNextStopEstimateId, order.currentCompletionEstimateId].filter(
        (id): id is string => id !== null,
      );
      if (staleIds.length > 0) {
        await tx.orderLiveEstimate.updateMany({
          where: { id: { in: staleIds } },
          data: { status: 'SUPERSEDED' },
        });
      }

      await tx.order.update({
        where: { id: input.orderId },
        data: { currentNextStopEstimateId: nextStopRow.id, currentCompletionEstimateId: completionRow.id },
      });

      await this.outbox.enqueue(tx, {
        aggregateType: 'Order',
        aggregateId: input.orderId,
        type: 'ROUTE_ETA_UPDATED',
        inputRevision: input.inputRevision,
        payload: { orderId: input.orderId, inputRevision: input.inputRevision },
        dedupeKey: `${input.orderId}:ROUTE_ETA_UPDATED:${input.inputRevision}`,
      });

      return 'PROMOTED' as const;
    });
  }

  private toEstimateRow(
    orderId: string,
    inputRevision: number,
    kind: 'NEXT_STOP' | 'COMPLETION',
    computation: EstimateComputation,
    isStillCurrent: boolean,
  ) {
    return {
      orderId,
      inputRevision,
      kind,
      targetStopId: computation.targetStopId,
      routeSnapshotId: computation.routeSnapshotId,
      status: isStillCurrent ? computation.status : ('SUPERSEDED' as const),
      unavailableReason: computation.unavailableReason ?? null,
      remainingDistanceM: computation.remainingDistanceM ?? null,
      remainingDurationS: computation.remainingDurationS ?? null,
      arrivalAt: computation.arrivalAt ?? null,
      baselineDurationS: computation.baselineDurationS ?? null,
      baselineSource: computation.baselineSource,
      gpsPointId: computation.gpsPointId ?? null,
      calculatedAt: computation.calculatedAt,
      validUntil: computation.validUntil,
    };
  }
}
