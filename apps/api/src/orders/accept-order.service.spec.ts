import { describe, expect, test, jest, beforeEach } from '@jest/globals';

import { AcceptOrderService } from './accept-order.service.js';
import { DomainError } from '../common/domain-error.js';

describe('AcceptOrderService', () => {
  let prisma: any;
  let ordersRepository: any;
  let eventsPublisher: any;
  let offers: any;
  let service: AcceptOrderService;
  const driverActor = { userId: 'driver-1', role: 'DRIVER' as const };

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn() },
      order: { findUnique: jest.fn(), updateMany: jest.fn() },
      $transaction: jest.fn((cb: any) => cb(prisma)),
    };
    prisma.driverProfile = {
      updateMany: jest.fn(),
      findUnique: jest.fn().mockResolvedValue({
        userId: 'driver-1',
        vehicleType: 'MOTORBIKE',
      }),
    };
    prisma.orderStatusHistory = { create: jest.fn(), findFirst: jest.fn() };
    ordersRepository = { findById: jest.fn() };
    eventsPublisher = { publishStatusChanged: jest.fn() };
    offers = { markAccepted: jest.fn() };
    service = new AcceptOrderService(prisma, ordersRepository, eventsPublisher, offers);
  });

  test('publishes exactly one canonical status-changed event on a successful accept', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'driver-1', status: 'ACTIVE' });
    prisma.order.findUnique.mockResolvedValue({
      id: 'order-1',
      status: 'REQUESTED',
      driverId: null,
      vehicleType: 'MOTORBIKE',
    });
    prisma.driverProfile.updateMany.mockResolvedValue({ count: 1 });
    prisma.order.updateMany.mockResolvedValue({ count: 1 });
    prisma.orderStatusHistory.create.mockResolvedValue({
      id: 'hist-1',
      createdAt: new Date('2026-09-05T00:00:00.000Z'),
    });
    ordersRepository.findById.mockResolvedValue({
      id: 'order-1',
      status: 'ACCEPTED',
      driverId: 'driver-1',
      createdAt: new Date('2026-09-05T00:00:00.000Z'),
      updatedAt: new Date('2026-09-05T00:00:00.000Z'),
    });

    await service.acceptOrder(driverActor, 'order-1');

    expect(eventsPublisher.publishStatusChanged).toHaveBeenCalledTimes(1);
    expect(eventsPublisher.publishStatusChanged).toHaveBeenCalledWith({
      orderId: 'order-1',
      previousStatus: 'REQUESTED',
      currentStatus: 'ACCEPTED',
      eventId: 'hist-1',
      occurredAt: '2026-09-05T00:00:00.000Z',
    });
    expect(offers.markAccepted).toHaveBeenCalledWith(prisma, 'order-1', 'driver-1');
  });

  test('does not publish when the driver is not approved', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'driver-1', status: 'PENDING_APPROVAL' });

    await expect(service.acceptOrder(driverActor, 'order-1')).rejects.toThrow(DomainError);
    expect(eventsPublisher.publishStatusChanged).not.toHaveBeenCalled();
  });

  test('does not publish when the order is already assigned (pre-transaction check)', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'driver-1', status: 'ACTIVE' });
    prisma.order.findUnique.mockResolvedValue({ id: 'order-1', status: 'ACCEPTED', driverId: 'other-driver' });

    await expect(service.acceptOrder(driverActor, 'order-1')).rejects.toThrow(DomainError);
    expect(eventsPublisher.publishStatusChanged).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('does not publish when the driver is busy inside the transaction', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'driver-1', status: 'ACTIVE' });
    prisma.order.findUnique.mockResolvedValue({
      id: 'order-1',
      status: 'REQUESTED',
      driverId: null,
      vehicleType: 'MOTORBIKE',
    });
    prisma.driverProfile.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.acceptOrder(driverActor, 'order-1')).rejects.toThrow(DomainError);
    expect(eventsPublisher.publishStatusChanged).not.toHaveBeenCalled();
  });

  test('does not publish on a lost race for the same order inside the transaction', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'driver-1', status: 'ACTIVE' });
    prisma.order.findUnique.mockResolvedValue({
      id: 'order-1',
      status: 'REQUESTED',
      driverId: null,
      vehicleType: 'MOTORBIKE',
    });
    prisma.driverProfile.updateMany.mockResolvedValue({ count: 1 });
    prisma.order.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.acceptOrder(driverActor, 'order-1')).rejects.toThrow(DomainError);
    expect(eventsPublisher.publishStatusChanged).not.toHaveBeenCalled();
    expect(prisma.orderStatusHistory.create).not.toHaveBeenCalled();
  });

  test('returns the existing order state on a clientRequestId replay instead of re-running the transaction', async () => {
    prisma.orderStatusHistory.findFirst.mockResolvedValue({
      id: 'hist-1',
      orderId: 'order-1',
      actorId: 'driver-1',
      clientRequestId: 'req-accept-1',
    });
    ordersRepository.findById.mockResolvedValue({
      id: 'order-1',
      status: 'ACCEPTED',
      driverId: 'driver-1',
      createdAt: new Date('2026-09-05T00:00:00.000Z'),
      updatedAt: new Date('2026-09-05T00:00:00.000Z'),
    });

    const result = await service.acceptOrder(driverActor, 'order-1', 'req-accept-1');

    expect(result.status).toBe('ACCEPTED');
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.driverProfile.updateMany).not.toHaveBeenCalled();
    expect(eventsPublisher.publishStatusChanged).not.toHaveBeenCalled();
  });

  test('runs the normal accept flow when clientRequestId has no prior history row', async () => {
    prisma.orderStatusHistory.findFirst.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue({ id: 'driver-1', status: 'ACTIVE' });
    prisma.order.findUnique.mockResolvedValue({
      id: 'order-1',
      status: 'REQUESTED',
      driverId: null,
      vehicleType: 'MOTORBIKE',
    });
    prisma.driverProfile.updateMany.mockResolvedValue({ count: 1 });
    prisma.order.updateMany.mockResolvedValue({ count: 1 });
    prisma.orderStatusHistory.create.mockResolvedValue({
      id: 'hist-2',
      createdAt: new Date('2026-09-05T00:00:00.000Z'),
    });
    ordersRepository.findById.mockResolvedValue({
      id: 'order-1',
      status: 'ACCEPTED',
      driverId: 'driver-1',
      createdAt: new Date('2026-09-05T00:00:00.000Z'),
      updatedAt: new Date('2026-09-05T00:00:00.000Z'),
    });

    await service.acceptOrder(driverActor, 'order-1', 'req-accept-2');

    expect(prisma.orderStatusHistory.findFirst).toHaveBeenCalledWith({
      where: { orderId: 'order-1', actorId: 'driver-1', clientRequestId: 'req-accept-2' },
    });
    expect(eventsPublisher.publishStatusChanged).toHaveBeenCalledTimes(1);
    expect(prisma.orderStatusHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ clientRequestId: 'req-accept-2' }),
      }),
    );
  });
});
