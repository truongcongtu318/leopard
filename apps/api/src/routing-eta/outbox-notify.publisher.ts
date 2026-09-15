import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { OutboxRepository, newWorkerId } from './outbox.repository.js';
import { RouteEtaRealtimeEmitterImpl } from './route-eta-realtime.emitter.js';

const CLAIM_BATCH_SIZE = 20;
const LEASE_MS = 10_000;

@Injectable()
export class OutboxNotifyPublisher {
  private readonly logger = new Logger(OutboxNotifyPublisher.name);
  private readonly workerId = newWorkerId();

  constructor(
    private readonly outbox: OutboxRepository,
    private readonly emitter: RouteEtaRealtimeEmitterImpl,
    private readonly prisma: PrismaService,
  ) {}

  async runOnce(): Promise<number> {
    const claims = await this.outbox.claimBatch(this.workerId, CLAIM_BATCH_SIZE, LEASE_MS);
    for (const claim of claims) {
      try {
        if (claim.type === 'ROUTE_ETA_UPDATED') {
          this.emitter.emitRouteEtaUpdated(claim.payload as never);
        } else if (claim.type === 'ROUTE_UPDATED') {
          this.emitter.emitRouteUpdated(claim.payload as never);
        } else {
          continue;
        }
        await this.prisma.$transaction(async (tx) => {
          await this.outbox.markCompleted(tx, claim.id, claim.leaseOwner, claim.leaseGeneration);
        });
      } catch (error) {
        this.logger.warn(`notify publish failed for job ${claim.id}: ${(error as Error).message}`);
        await this.outbox.markFailedOrDeadLetter(claim.id, claim.leaseOwner, claim.leaseGeneration, (error as Error).message, 2_000);
      }
    }
    return claims.length;
  }
}
