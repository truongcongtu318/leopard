import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { OutboxRepository, newWorkerId } from './outbox.repository.js';
import { EtaService } from './eta.service.js';

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
        // Real computation (route fetch + leg/target-stop derivation) is added in Task 8
        // alongside StopProgressService, which supplies the target-stop/leg data this
        // worker needs. This task only proves the claim/idempotency/completion wiring.
        throw new Error('computation not yet wired — see Task 8');
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
