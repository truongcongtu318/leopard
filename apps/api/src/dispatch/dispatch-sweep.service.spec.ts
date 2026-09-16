import { describe, expect, test, jest, beforeEach } from '@jest/globals';

import { DispatchSweepService } from './dispatch-sweep.service.js';
import { OFFER_TIMEOUT_SECONDS, REDISPATCH_RADII_M } from './dispatch.constants.js';

function orderStub(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'order-1',
    status: 'REQUESTED',
    driverId: null,
    vehicleType: 'MOTORBIKE',
    priceVnd: 50_000,
    distanceMeters: 5_000,
    durationSeconds: 600,
    cargoNote: null,
    createdAt: new Date(),
    stops: [
      { type: 'PICKUP', lat: 10.1, lng: 106.1, address: 'Pickup addr' },
      { type: 'DROPOFF', lat: 10.2, lng: 106.2, address: 'Dropoff addr' },
    ],
    ...overrides,
  };
}

describe('DispatchSweepService', () => {
  let offers: any;
  let ordersRepository: any;
  let dispatch: any;
  let gateway: any;
  let cancelOrderService: any;
  let service: DispatchSweepService;

  beforeEach(() => {
    offers = {
      expireStalePending: jest.fn().mockResolvedValue(0),
      findOrderIdsNeedingRedispatch: jest.fn().mockResolvedValue(['order-1']),
      findExcludedDriverIds: jest.fn().mockResolvedValue(['already-offered']),
      createPending: jest.fn(),
    };
    ordersRepository = { findById: jest.fn() };
    dispatch = { findCandidates: jest.fn() };
    gateway = { emitOffersToCandidates: jest.fn() };
    cancelOrderService = { cancelUnmatchedOrder: jest.fn() };
    service = new DispatchSweepService(offers, ordersRepository, dispatch, gateway, cancelOrderService);
  });

  test('redispatches with the radius for the current attempt and excludes already-offered drivers', async () => {
    // 30s old => attemptIndex = floor(30/25) = 1 => REDISPATCH_RADII_M[1]
    const createdAt = new Date(Date.now() - 30_000);
    ordersRepository.findById.mockResolvedValue(orderStub({ createdAt }));
    dispatch.findCandidates.mockResolvedValue([{ userId: 'drv-2', distanceM: 4_000 }]);

    await service.runOnce();

    expect(dispatch.findCandidates).toHaveBeenCalledWith(
      { lat: 10.1, lng: 106.1 },
      REDISPATCH_RADII_M[1],
      expect.any(Number),
      'MOTORBIKE',
      ['already-offered'],
    );
    expect(offers.createPending).toHaveBeenCalledWith('order-1', ['drv-2']);
    expect(gateway.emitOffersToCandidates).toHaveBeenCalledTimes(1);
    expect(cancelOrderService.cancelUnmatchedOrder).not.toHaveBeenCalled();
  });

  test('auto-cancels once every redispatch radius has been exhausted', async () => {
    const staleSeconds = OFFER_TIMEOUT_SECONDS * (REDISPATCH_RADII_M.length + 1);
    const createdAt = new Date(Date.now() - staleSeconds * 1000);
    ordersRepository.findById.mockResolvedValue(orderStub({ createdAt }));

    await service.runOnce();

    expect(cancelOrderService.cancelUnmatchedOrder).toHaveBeenCalledWith(
      'order-1',
      'Không tìm được tài xế phù hợp',
    );
    expect(dispatch.findCandidates).not.toHaveBeenCalled();
  });

  test('writes no offer rows and emits nothing when no candidates are found', async () => {
    const createdAt = new Date(Date.now() - 30_000);
    ordersRepository.findById.mockResolvedValue(orderStub({ createdAt }));
    dispatch.findCandidates.mockResolvedValue([]);

    await service.runOnce();

    expect(offers.createPending).not.toHaveBeenCalled();
    expect(gateway.emitOffersToCandidates).not.toHaveBeenCalled();
    expect(cancelOrderService.cancelUnmatchedOrder).not.toHaveBeenCalled();
  });

  test('skips an order that was already resolved since the sweep query ran', async () => {
    ordersRepository.findById.mockResolvedValue(orderStub({ status: 'ACCEPTED', driverId: 'drv-9' }));

    await service.runOnce();

    expect(dispatch.findCandidates).not.toHaveBeenCalled();
    expect(cancelOrderService.cancelUnmatchedOrder).not.toHaveBeenCalled();
  });
});
