import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { UpdateOrderStatusService } from './update-order-status.service.js';

describe('UpdateOrderStatusService - Balance Accrual', () => {
  let service: UpdateOrderStatusService;
  let prisma: any;
  let ordersRepository: any;
  let proofReader: any;
  let eventsPublisher: any;

  const driverActor: AuthenticatedActor = {
    userId: 'driver-1',
    role: 'DRIVER',
    sessionId: 'sess-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    const tx = {
      order: {
        findUnique: jest.fn(),
        updateMany: jest.fn(),
      },
      orderStatusHistory: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      driverProfile: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
    };

    prisma = {
      $transaction: jest.fn(async (cb: (client: typeof tx) => Promise<unknown>) => cb(tx)),
      _tx: tx,
    };

    ordersRepository = {
      findById: jest.fn(),
    };

    proofReader = {
      hasDeliveryProof: jest.fn().mockResolvedValue(true),
    };

    eventsPublisher = {
      publishStatusChanged: jest.fn(),
    };

    service = new UpdateOrderStatusService(
      prisma,
      ordersRepository,
      proofReader,
      eventsPublisher,
    );
  });

  it('increments driver balance by driverPayoutVnd from routeSnapshot upon DELIVERED', async () => {
    const tx = prisma._tx;
    tx.order.findUnique.mockResolvedValue({
      id: 'order-1',
      driverId: driverActor.userId,
      status: 'IN_TRANSIT',
      priceVnd: 100_000,
      routeSnapshot: {
        driverPayoutVnd: 85_000,
      },
    });

    tx.orderStatusHistory.findFirst.mockResolvedValue(null);
    tx.order.updateMany.mockResolvedValue({ count: 1 });
    tx.driverProfile.update.mockResolvedValue({});
    tx.orderStatusHistory.create.mockResolvedValue({
      id: 'hist-1',
      createdAt: new Date(),
    });
    ordersRepository.findById.mockResolvedValue({
      id: 'order-1',
      status: 'DELIVERED',
      stops: [],
      statusHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await service.updateStatus(driverActor, 'order-1', {
      status: 'DELIVERED',
      clientRequestId: 'req-1',
    });

    expect(tx.driverProfile.update).toHaveBeenCalledWith({
      where: { userId: driverActor.userId },
      data: {
        availability: 'AVAILABLE',
        autoOfflineOnComplete: false,
        balanceVnd: { increment: 85_000 },
      },
    });
  });

  it('falls back to 85% of priceVnd when routeSnapshot has no driverPayoutVnd', async () => {
    const tx = prisma._tx;
    tx.order.findUnique.mockResolvedValue({
      id: 'order-2',
      driverId: driverActor.userId,
      status: 'IN_TRANSIT',
      priceVnd: 200_000,
      routeSnapshot: null,
    });

    tx.orderStatusHistory.findFirst.mockResolvedValue(null);
    tx.order.updateMany.mockResolvedValue({ count: 1 });
    tx.driverProfile.update.mockResolvedValue({});
    tx.orderStatusHistory.create.mockResolvedValue({
      id: 'hist-2',
      createdAt: new Date(),
    });
    ordersRepository.findById.mockResolvedValue({
      id: 'order-2',
      status: 'DELIVERED',
      stops: [],
      statusHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await service.updateStatus(driverActor, 'order-2', {
      status: 'DELIVERED',
      clientRequestId: 'req-2',
    });

    expect(tx.driverProfile.update).toHaveBeenCalledWith({
      where: { userId: driverActor.userId },
      data: {
        availability: 'AVAILABLE',
        autoOfflineOnComplete: false,
        balanceVnd: { increment: 170_000 },
      },
    });
  });
});
