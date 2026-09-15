import { Test } from '@nestjs/testing';
import { OutboxRepository } from './outbox.repository.js';
import { RouteEtaRealtimeEmitterImpl } from './route-eta-realtime.emitter.js';
import { OutboxNotifyPublisher } from './outbox-notify.publisher.js';
import { PrismaService } from '../database/prisma.service.js';

describe('OutboxNotifyPublisher', () => {
  it('emits ROUTE_ETA_UPDATED payload then marks the job completed', async () => {
    const payload = { schemaVersion: 1, eventId: 'job-1', orderId: 'order-1', inputRevision: 6, occurredAt: new Date().toISOString(), estimates: { nextStop: {}, completion: {} } };
    const outbox = {
      claimBatch: jest.fn().mockResolvedValue([{ id: 'job-1', aggregateId: 'order-1', type: 'ROUTE_ETA_UPDATED', inputRevision: 6, payload, leaseOwner: 'w', leaseGeneration: 1 }]),
      markCompleted: jest.fn().mockResolvedValue(true),
      markFailedOrDeadLetter: jest.fn(),
    };
    const emitter = { emitRouteEtaUpdated: jest.fn(), emitRouteUpdated: jest.fn() };
    const prisma = { $transaction: jest.fn((fn: any) => fn({})) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        OutboxNotifyPublisher,
        { provide: OutboxRepository, useValue: outbox },
        { provide: RouteEtaRealtimeEmitterImpl, useValue: emitter },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    const publisher = moduleRef.get(OutboxNotifyPublisher);

    const processed = await publisher.runOnce();

    expect(processed).toBe(1);
    expect(emitter.emitRouteEtaUpdated).toHaveBeenCalledWith(payload);
    expect(outbox.markCompleted).toHaveBeenCalled();
  });
});
