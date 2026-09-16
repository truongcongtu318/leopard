import { describe, expect, test, jest, beforeEach } from '@jest/globals';

import { CancelOrderService } from './cancel-order.service.js';

describe('CancelOrderService.cancelUnmatchedOrder', () => {
  let prisma: any;
  let ordersRepository: any;
  let eventsPublisher: any;
  let service: CancelOrderService;

  beforeEach(() => {
    prisma = {
      order: { updateMany: jest.fn() },
      $transaction: jest.fn((cb: any) => cb(prisma)),
    };
    prisma.orderStatusHistory = { create: jest.fn() };
    ordersRepository = { findById: jest.fn() };
    eventsPublisher = { publishStatusChanged: jest.fn() };
    service = new CancelOrderService(prisma, ordersRepository, eventsPublisher);
  });

  test('cancels a still-unmatched REQUESTED order with a null actorId and publishes one event', async () => {
    ordersRepository.findById.mockResolvedValue({
      id: 'order-1',
      status: 'REQUESTED',
      driverId: null,
    });
    prisma.order.updateMany.mockResolvedValue({ count: 1 });
    prisma.orderStatusHistory.create.mockResolvedValue({
      id: 'hist-1',
      createdAt: new Date('2026-09-16T00:00:00.000Z'),
    });

    await service.cancelUnmatchedOrder('order-1', 'Không tìm được tài xế phù hợp');

    expect(prisma.orderStatusHistory.create).toHaveBeenCalledWith({
      data: {
        orderId: 'order-1',
        fromStatus: 'REQUESTED',
        toStatus: 'CANCELLED',
        actorId: null,
        reason: 'Không tìm được tài xế phù hợp',
      },
    });
    expect(eventsPublisher.publishStatusChanged).toHaveBeenCalledTimes(1);
  });

  test('is a no-op when the order already has a driver assigned', async () => {
    ordersRepository.findById.mockResolvedValue({
      id: 'order-1',
      status: 'REQUESTED',
      driverId: 'driver-1',
    });

    await service.cancelUnmatchedOrder('order-1', 'reason');

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(eventsPublisher.publishStatusChanged).not.toHaveBeenCalled();
  });

  test('is a no-op when the order is no longer REQUESTED', async () => {
    ordersRepository.findById.mockResolvedValue({
      id: 'order-1',
      status: 'ACCEPTED',
      driverId: 'driver-1',
    });

    await service.cancelUnmatchedOrder('order-1', 'reason');

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(eventsPublisher.publishStatusChanged).not.toHaveBeenCalled();
  });

  test('does not publish when the transactional update loses a race', async () => {
    ordersRepository.findById.mockResolvedValue({
      id: 'order-1',
      status: 'REQUESTED',
      driverId: null,
    });
    prisma.order.updateMany.mockResolvedValue({ count: 0 });

    await service.cancelUnmatchedOrder('order-1', 'reason');

    expect(eventsPublisher.publishStatusChanged).not.toHaveBeenCalled();
    expect(prisma.orderStatusHistory.create).not.toHaveBeenCalled();
  });
});
