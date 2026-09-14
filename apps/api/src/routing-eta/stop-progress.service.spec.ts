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

  it('recovers from a P2002 unique-constraint race on create by re-querying the winning event', async () => {
    const winningEvent = { id: 'event-1', orderId: 'order-1', stopId: 'stop-1', step: 'ARRIVED', clientRequestId: 'req-1' };
    const p2002 = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
    const tx = {
      orderStop: { findFirstOrThrow: jest.fn().mockResolvedValue({ id: 'stop-1', orderId: 'order-1' }) },
      stopProgressEvent: {
        findUnique: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(winningEvent),
        create: jest.fn().mockRejectedValue(p2002),
      },
      stopProgressState: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      order: { findUniqueOrThrow: jest.fn().mockResolvedValue({ routeEtaInputRevision: 7 }) },
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

    expect(result).toEqual({ eventId: 'event-1', replayed: true, inputRevision: 7 });
    expect(tx.stopProgressState.create).not.toHaveBeenCalled();
    expect(etaService.bumpRevision).not.toHaveBeenCalled();
  });
});

describe('StopProgressService.void', () => {
  const actor = { userId: 'driver-1', role: 'DRIVER' } as any;

  it('recovers from a P2002 unique-constraint race on create by re-querying the winning event', async () => {
    const original = { id: 'event-1', orderId: 'order-1', stopId: 'stop-1', step: 'ARRIVED' };
    const winningVoidEvent = { id: 'event-2', orderId: 'order-1', stopId: 'stop-1', step: 'ARRIVED', clientRequestId: 'req-void-1' };
    const p2002 = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
    const tx = {
      orderStop: { findFirstOrThrow: jest.fn().mockResolvedValue({ id: 'stop-1', orderId: 'order-1' }) },
      stopProgressEvent: {
        findUnique: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(winningVoidEvent),
        findFirstOrThrow: jest.fn().mockResolvedValue(original),
        create: jest.fn().mockRejectedValue(p2002),
      },
      stopProgressState: {
        delete: jest.fn(),
      },
      order: { findUniqueOrThrow: jest.fn().mockResolvedValue({ routeEtaInputRevision: 9 }) },
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

    const result = await service.void(actor, 'order-1', 'stop-1', 'event-1', 'req-void-1', 'sai điểm dừng', new Date());

    expect(result).toEqual({ eventId: 'event-2', replayed: true, inputRevision: 9 });
    expect(tx.stopProgressState.delete).not.toHaveBeenCalled();
    expect(etaService.bumpRevision).not.toHaveBeenCalled();
  });
});
