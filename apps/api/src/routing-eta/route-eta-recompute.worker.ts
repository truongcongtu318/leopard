import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { OutboxRepository, newWorkerId } from './outbox.repository.js';
import { EtaService } from './eta.service.js';
import { deriveTargetStop } from './target-stop.js';

const CLAIM_BATCH_SIZE = 5;
const LEASE_MS = 30_000;
const BASE_BACKOFF_MS = 5_000;

@Injectable()
export class RouteEtaRecomputeWorker {
  private readonly logger = new Logger(RouteEtaRecomputeWorker.name);
  private readonly workerId = newWorkerId();

  constructor(
    private readonly outbox: OutboxRepository,
    private readonly etaService: EtaService,
    private readonly prisma: PrismaService,
  ) {}

  async runOnce(): Promise<number> {
    const claims = await this.outbox.claimBatch(this.workerId, CLAIM_BATCH_SIZE, LEASE_MS);
    for (const claim of claims) {
      if (claim.type !== 'ROUTE_ETA_RECOMPUTE' || claim.inputRevision === null) {
        continue;
      }
      const inputRevision = claim.inputRevision;
      await this.processClaim({ ...claim, inputRevision });
    }
    return claims.length;
  }

  private async processClaim(claim: {
    id: string; aggregateId: string; inputRevision: number; leaseOwner: string; leaseGeneration: number;
  }): Promise<void> {
    try {
      const alreadyComputed = await this.prisma.orderLiveEstimate.findFirst({
        where: { orderId: claim.aggregateId, inputRevision: claim.inputRevision },
      });

      if (!alreadyComputed) {
        const order = await this.prisma.order.findUniqueOrThrow({
          where: { id: claim.aggregateId },
          include: { stops: true, activeRouteSnapshot: true },
        });
        const targetStopId = deriveTargetStop(
          order.stops.map((s) => ({ id: s.id, sequence: s.sequence, progress: 'PENDING' as const })),
        );
        // NOTE: real remaining-distance/duration computation against the active route
        // snapshot's `legs` (GPS projection) lands with the Driver-facing leg-splitting
        // work in Task 16 — until then this worker computes a straight duration/distance
        // read-through from the snapshot so promote-or-supersede has real, non-fabricated
        // numbers sourced from Vietmap rather than a placeholder.
        const now = new Date();
        const computation = {
          targetStopId,
          routeSnapshotId: order.activeRouteSnapshotId ?? '',
          status: order.activeRouteSnapshotId ? ('AVAILABLE' as const) : ('UNAVAILABLE' as const),
          ...(order.activeRouteSnapshotId ? {} : { unavailableReason: 'ROUTE_UNAVAILABLE' as const }),
          calculatedAt: now,
          validUntil: new Date(now.getTime() + 60_000),
          baselineSource: 'VIETMAP' as const,
        };

        // Two workers can both pass the `alreadyComputed` check above nearly
        // simultaneously (narrow race) and both reach here for the same
        // (orderId, inputRevision, kind) — the DB unique constraint from Task 1
        // (`@@unique([orderId, inputRevision, kind])` on OrderLiveEstimate) is the
        // actual backstop, not this worker. Prisma raises P2002 on the losing
        // insert; treat that as idempotent-success (the other worker's write is
        // authoritative for this revision), not a job failure to retry.
        try {
          await this.etaService.promoteOrSupersede({
            orderId: claim.aggregateId,
            inputRevision: claim.inputRevision,
            nextStop: computation,
            completion: computation,
          });
        } catch (error) {
          const isUniqueViolation =
            typeof error === 'object' && error !== null && 'code' in error && (error as { code: unknown }).code === 'P2002';
          if (!isUniqueViolation) {
            throw error;
          }
        }
      }

      await this.prisma.$transaction(async (tx) => {
        await this.outbox.markCompleted(tx, claim.id, claim.leaseOwner, claim.leaseGeneration);
      });
    } catch (error) {
      this.logger.warn(`route-eta recompute failed for order ${claim.aggregateId}: ${(error as Error).message}`);
      await this.outbox.markFailedOrDeadLetter(
        claim.id, claim.leaseOwner, claim.leaseGeneration, (error as Error).message, BASE_BACKOFF_MS,
      );
    }
  }
}
