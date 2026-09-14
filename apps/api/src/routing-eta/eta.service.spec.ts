import { Test } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service.js';
import { OutboxRepository } from './outbox.repository.js';
import { EtaService } from './eta.service.js';

describe('EtaService.bumpRevision', () => {
  it('increments routeEtaInputRevision and enqueues a recompute job in the same tx', async () => {
    const tx = {
      order: {
        update: jest.fn().mockResolvedValue({ id: 'order-1', routeEtaInputRevision: 6 }),
      },
    };
    const outbox = { enqueue: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        EtaService,
        { provide: OutboxRepository, useValue: outbox },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();
    const service = moduleRef.get(EtaService);

    const revision = await service.bumpRevision(tx as any, 'order-1');

    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { routeEtaInputRevision: { increment: 1 } },
    });
    expect(revision).toBe(6);
    expect(outbox.enqueue).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        aggregateType: 'Order',
        aggregateId: 'order-1',
        type: 'ROUTE_ETA_RECOMPUTE',
        inputRevision: 6,
        dedupeKey: 'order-1:ROUTE_ETA_RECOMPUTE:6',
      }),
    );
  });
});

describe('EtaService.promoteOrSupersede', () => {
  function baseComputation(overrides: Partial<any> = {}) {
    return {
      targetStopId: 'stop-1',
      routeSnapshotId: 'snap-1',
      status: 'AVAILABLE' as const,
      remainingDistanceM: 5000,
      remainingDurationS: 600,
      arrivalAt: new Date('2026-09-14T01:00:00Z'),
      baselineDurationS: 600,
      baselineSource: 'VIETMAP' as const,
      calculatedAt: new Date('2026-09-14T00:50:00Z'),
      validUntil: new Date('2026-09-14T00:52:00Z'),
      ...overrides,
    };
  }

  it('promotes when the job revision is still the current one, marks prior current as SUPERSEDED', async () => {
    const tx = {
      order: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'order-1', routeEtaInputRevision: 6,
          currentNextStopEstimateId: 'old-next', currentCompletionEstimateId: 'old-completion',
        }),
        update: jest.fn(),
      },
      orderLiveEstimate: {
        updateMany: jest.fn(),
        create: jest.fn()
          .mockResolvedValueOnce({ id: 'new-next' })
          .mockResolvedValueOnce({ id: 'new-completion' }),
      },
    };
    const outbox = { enqueue: jest.fn(), markCompleted: jest.fn().mockResolvedValue(true) };
    const prisma = { $transaction: jest.fn((fn: any) => fn(tx)) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        EtaService,
        { provide: OutboxRepository, useValue: outbox },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    const service = moduleRef.get(EtaService);

    const result = await service.promoteOrSupersede({
      orderId: 'order-1', inputRevision: 6, leaseOwner: 'worker-a', leaseGeneration: 1, outboxJobId: 'job-1',
      nextStop: baseComputation(),
      completion: baseComputation({ targetStopId: null }),
    });

    expect(result).toBe('PROMOTED');
    expect(tx.orderLiveEstimate.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['old-next', 'old-completion'] } },
      data: { status: 'SUPERSEDED' },
    });
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { currentNextStopEstimateId: 'new-next', currentCompletionEstimateId: 'new-completion' },
    });
    expect(outbox.enqueue).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ type: 'ROUTE_ETA_UPDATED', dedupeKey: 'order-1:ROUTE_ETA_UPDATED:6' }),
    );
  });

  it('supersedes silently (no pointer change, no notify) when a newer revision already landed', async () => {
    const tx = {
      order: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'order-1', routeEtaInputRevision: 7, // newer than the job's revision 6
          currentNextStopEstimateId: 'current-next', currentCompletionEstimateId: 'current-completion',
        }),
        update: jest.fn(),
      },
      orderLiveEstimate: {
        updateMany: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'stale-row' }),
      },
    };
    const outbox = { enqueue: jest.fn(), markCompleted: jest.fn().mockResolvedValue(true) };
    const prisma = { $transaction: jest.fn((fn: any) => fn(tx)) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        EtaService,
        { provide: OutboxRepository, useValue: outbox },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    const service = moduleRef.get(EtaService);

    const result = await service.promoteOrSupersede({
      orderId: 'order-1', inputRevision: 6, leaseOwner: 'worker-a', leaseGeneration: 1, outboxJobId: 'job-1',
      nextStop: baseComputation(), completion: baseComputation({ targetStopId: null }),
    });

    expect(result).toBe('SUPERSEDED');
    expect(tx.order.update).not.toHaveBeenCalled();
    expect(outbox.enqueue).not.toHaveBeenCalledWith(tx, expect.objectContaining({ type: 'ROUTE_ETA_UPDATED' }));
  });
});
