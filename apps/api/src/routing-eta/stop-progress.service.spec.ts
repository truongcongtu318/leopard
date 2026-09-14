import { Test } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service.js';
import { EtaService } from './eta.service.js';
import { StopProgressService } from './stop-progress.service.js';

describe('StopProgressService.record', () => {
  const actor = { userId: 'driver-1', role: 'DRIVER' } as any;

  it('replays the same result for a retried clientRequestId without bumping revision twice', async () => {
    const existingEvent = { id: 'event-1', orderId: 'order-1', stopId: 'stop-1', step: 'ARRIVED', clientRequestId: 'req-1' };
    const tx = {
      orderStop: { findFirstOrThrow: jest.fn().mockResolvedValue({ id: 'stop-1', orderId: 'order-1' }) },
      stopProgressEvent: {
        findUnique: jest.fn().mockResolvedValue(existingEvent),
      },
      order: { findUniqueOrThrow: jest.fn().mockResolvedValue({ routeEtaInputRevision: 6 }) },
    };
    const prisma = { $transaction: jest.fn((fn: any) => fn(tx)) };
    const etaService = { bumpRevision: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        StopProgressService,
        { provide: PrismaService, useValue: prisma },
        { provide: EtaService, useValue: etaService },
      ],
    }).compile();
    const service = moduleRef.get(StopProgressService);

    const result = await service.record(actor, 'order-1', 'stop-1', 'ARRIVED', 'req-1', new Date());

    expect(result).toEqual({ eventId: 'event-1', replayed: true, inputRevision: 6 });
    expect(etaService.bumpRevision).not.toHaveBeenCalled();
  });
});
