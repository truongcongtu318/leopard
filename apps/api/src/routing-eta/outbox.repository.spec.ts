import { Test } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service.js';
import { OutboxRepository } from './outbox.repository.js';

describe('OutboxRepository', () => {
  it('enqueue is a no-op on duplicate dedupeKey (idempotent insert)', async () => {
    const prisma = {
      outboxEvent: {
        upsert: jest.fn().mockResolvedValue({}),
      },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [OutboxRepository, { provide: PrismaService, useValue: prisma }],
    }).compile();
    const repo = moduleRef.get(OutboxRepository);

    await repo.enqueue(prisma as any, {
      aggregateType: 'Order',
      aggregateId: 'order-1',
      type: 'ROUTE_ETA_RECOMPUTE',
      inputRevision: 5,
      payload: { orderId: 'order-1' },
      dedupeKey: 'order-1:ROUTE_ETA_RECOMPUTE:5',
    });

    expect(prisma.outboxEvent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { dedupeKey: 'order-1:ROUTE_ETA_RECOMPUTE:5' },
        create: expect.objectContaining({ dedupeKey: 'order-1:ROUTE_ETA_RECOMPUTE:5' }),
        update: {},
      }),
    );
  });

  it('markCompleted only succeeds when lease fields still match (fencing)', async () => {
    const prisma = { outboxEvent: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) } };
    const moduleRef = await Test.createTestingModule({
      providers: [OutboxRepository, { provide: PrismaService, useValue: prisma }],
    }).compile();
    const repo = moduleRef.get(OutboxRepository);

    const ok = await repo.markCompleted(prisma as any, 'job-1', 'worker-a', 3);

    expect(prisma.outboxEvent.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'job-1',
        status: 'LEASED',
        leaseOwner: 'worker-a',
        leaseGeneration: 3,
        leaseExpiresAt: { gt: expect.any(Date) },
      },
      data: { status: 'COMPLETED', completedAt: expect.any(Date) },
    });
    expect(ok).toBe(false);
  });

  it('markFailedOrDeadLetter does not mutate when the lease no longer matches (fencing)', async () => {
    const prisma = {
      outboxEvent: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'job-1',
          attempts: 1,
          maxAttempts: 8,
          leaseOwner: 'worker-a',
          leaseGeneration: 3,
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        update: jest.fn(),
      },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [OutboxRepository, { provide: PrismaService, useValue: prisma }],
    }).compile();
    const repo = moduleRef.get(OutboxRepository);

    await expect(
      repo.markFailedOrDeadLetter('job-1', 'worker-b', 4, 'boom', 1000),
    ).resolves.toBeUndefined();

    expect(prisma.outboxEvent.updateMany).toHaveBeenCalledWith({
      where: { id: 'job-1', status: 'LEASED', leaseOwner: 'worker-b', leaseGeneration: 4 },
      data: expect.objectContaining({ status: 'PENDING' }),
    });
    expect(prisma.outboxEvent.update).not.toHaveBeenCalled();
  });
});
