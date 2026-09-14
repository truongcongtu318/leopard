import { Test } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service.js';
import { OutboxRepository } from './outbox.repository.js';
import { EtaService } from './eta.service.js';
import { MAP_PROVIDER } from '../maps/maps.service.js';
import { RouteEtaRecomputeWorker } from './route-eta-recompute.worker.js';

describe('RouteEtaRecomputeWorker', () => {
  it('skips provider call when an estimate for this inputRevision already exists (idempotency pre-check)', async () => {
    const outbox = {
      claimBatch: jest.fn().mockResolvedValue([
        { id: 'job-1', aggregateId: 'order-1', type: 'ROUTE_ETA_RECOMPUTE', inputRevision: 6, payload: {}, leaseOwner: 'w', leaseGeneration: 1 },
      ]),
      markCompleted: jest.fn(),
      markFailedOrDeadLetter: jest.fn(),
      enqueue: jest.fn(),
    };
    const prisma = {
      orderLiveEstimate: { findFirst: jest.fn().mockResolvedValue({ id: 'existing' }) },
      $transaction: jest.fn((fn: any) => fn({ outboxEvent: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) } })),
    };
    const mapProvider = { route: jest.fn() };
    const etaService = { promoteOrSupersede: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        RouteEtaRecomputeWorker,
        { provide: OutboxRepository, useValue: outbox },
        { provide: EtaService, useValue: etaService },
        { provide: PrismaService, useValue: prisma },
        { provide: MAP_PROVIDER, useValue: mapProvider },
      ],
    }).compile();
    const worker = moduleRef.get(RouteEtaRecomputeWorker);

    const processed = await worker.runOnce();

    expect(processed).toBe(1);
    expect(mapProvider.route).not.toHaveBeenCalled();
    expect(etaService.promoteOrSupersede).not.toHaveBeenCalled();
  });
});
