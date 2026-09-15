import { describe, expect, test, jest, beforeEach } from '@jest/globals';

import { TrackingService } from './tracking.service.js';
import type { TrackingRepository } from './tracking.repository.js';
import type { TrackingRateLimiter } from './tracking-rate-limiter.js';
import type { EtaService } from '../routing-eta/eta.service.js';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';

describe('TrackingService.recordPoint — GPS coalescing', () => {
  let repository: jest.Mocked<Pick<TrackingRepository, 'recordPointAtomically'>>;
  let rateLimiter: jest.Mocked<Pick<TrackingRateLimiter, 'consume'>>;
  let etaService: jest.Mocked<Pick<EtaService, 'bumpRevision'>>;
  let service: TrackingService;
  let tx: any;

  const actor: AuthenticatedActor = { userId: 'driver-1', role: 'DRIVER' as const };
  const orderId = '11111111-1111-1111-1111-111111111111';
  // capturedAt must stay within the schema's +/-10min skew window of the real clock at test time.
  const capturedAt = new Date(Date.now());
  const rawInput = {
    clientPointId: 'fd3d8668-e6c0-48d2-85f2-e121b29b696c',
    latitude: 10.0,
    longitude: 106.0,
    capturedAt: capturedAt.toISOString(),
  };

  const insertedPoint = {
    id: 'point-2',
    orderId,
    driverId: 'driver-1',
    clientPointId: rawInput.clientPointId,
    latitude: 10.0,
    longitude: 106.0,
    accuracyM: null,
    capturedAt,
    createdAt: capturedAt,
  };

  function secondsBefore(seconds: number): Date {
    return new Date(capturedAt.getTime() - seconds * 1000);
  }

  function secondsAfter(seconds: number): Date {
    return new Date(capturedAt.getTime() + seconds * 1000);
  }

  beforeEach(() => {
    tx = {
      order: {
        findUniqueOrThrow: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      orderLiveEstimate: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    repository = {
      recordPointAtomically: jest.fn(async (_actorId, _orderId, _input, authorize, consumeRateLimit, onPointRecorded) => {
        authorize({
          id: orderId,
          status: 'IN_TRANSIT',
          customerId: 'customer-1',
          driverId: 'driver-1',
          activeOwnerFleetIds: [],
          activeDriverFleetIds: [],
        } as any);
        consumeRateLimit();
        const previousPoint = (tx as any).__previousPoint ?? null;
        if (onPointRecorded) {
          await onPointRecorded(tx, insertedPoint, previousPoint);
        }
        return insertedPoint;
      }),
    } as any;
    rateLimiter = { consume: jest.fn() } as any;
    etaService = { bumpRevision: jest.fn().mockResolvedValue(7) } as any;
    service = new TrackingService(repository as any, rateLimiter as any, etaService as any);
  });

  test('bumps the revision on the very first GPS point for an order (no prior bump, no previous point)', async () => {
    tx.order.findUniqueOrThrow.mockResolvedValue({
      routeEtaLastBumpAt: null,
      currentNextStopEstimateId: null,
    });

    await service.recordPoint(actor, orderId, rawInput);

    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: orderId },
      data: { routeEtaLastBumpAt: insertedPoint.capturedAt, routeEtaLastGpsPointId: insertedPoint.id },
    });
    expect(etaService.bumpRevision).toHaveBeenCalledWith(tx, orderId);
  });

  test('does NOT bump when the point arrives soon after the last bump, has barely moved, and the estimate is still valid', async () => {
    tx.order.findUniqueOrThrow.mockResolvedValue({
      routeEtaLastBumpAt: secondsBefore(10), // under the 30s interval
      currentNextStopEstimateId: 'estimate-1',
    });
    tx.orderLiveEstimate.findUnique.mockResolvedValue({
      id: 'estimate-1',
      validUntil: secondsAfter(300), // well after capturedAt — not expired
    });
    tx.__previousPoint = {
      // ~1m away — well under the 50m coalescing threshold
      latitude: 10.000005,
      longitude: 106.000005,
    };

    await service.recordPoint(actor, orderId, rawInput);

    expect(tx.order.update).not.toHaveBeenCalled();
    expect(etaService.bumpRevision).not.toHaveBeenCalled();
  });

  test('bumps when the interval has elapsed even though movement is small and the estimate is still valid', async () => {
    tx.order.findUniqueOrThrow.mockResolvedValue({
      routeEtaLastBumpAt: secondsBefore(90), // over the 30s interval
      currentNextStopEstimateId: 'estimate-1',
    });
    tx.orderLiveEstimate.findUnique.mockResolvedValue({
      id: 'estimate-1',
      validUntil: secondsAfter(300),
    });
    tx.__previousPoint = { latitude: 10.000005, longitude: 106.000005 };

    await service.recordPoint(actor, orderId, rawInput);

    expect(etaService.bumpRevision).toHaveBeenCalledWith(tx, orderId);
  });

  test('bumps when the driver has moved beyond the distance threshold even within the interval', async () => {
    tx.order.findUniqueOrThrow.mockResolvedValue({
      routeEtaLastBumpAt: secondsBefore(10), // under the interval
      currentNextStopEstimateId: 'estimate-1',
    });
    tx.orderLiveEstimate.findUnique.mockResolvedValue({
      id: 'estimate-1',
      validUntil: secondsAfter(300),
    });
    tx.__previousPoint = { latitude: 10.01, longitude: 106.01 }; // ~1.5km away — over the 50m threshold

    await service.recordPoint(actor, orderId, rawInput);

    expect(etaService.bumpRevision).toHaveBeenCalledWith(tx, orderId);
  });

  test('bumps when the current live estimate has expired even within the interval and without movement', async () => {
    tx.order.findUniqueOrThrow.mockResolvedValue({
      routeEtaLastBumpAt: secondsBefore(10),
      currentNextStopEstimateId: 'estimate-1',
    });
    tx.orderLiveEstimate.findUnique.mockResolvedValue({
      id: 'estimate-1',
      validUntil: secondsBefore(60), // before capturedAt — expired
    });
    tx.__previousPoint = { latitude: 10.000005, longitude: 106.000005 };

    await service.recordPoint(actor, orderId, rawInput);

    expect(etaService.bumpRevision).toHaveBeenCalledWith(tx, orderId);
  });

  test('treats a missing current estimate as expired and bumps', async () => {
    tx.order.findUniqueOrThrow.mockResolvedValue({
      routeEtaLastBumpAt: secondsBefore(10),
      currentNextStopEstimateId: null,
    });
    tx.__previousPoint = { latitude: 10.000005, longitude: 106.000005 };

    await service.recordPoint(actor, orderId, rawInput);

    expect(etaService.bumpRevision).toHaveBeenCalledWith(tx, orderId);
  });

  test('does not bump on every single GPS point when the driver is stationary and estimate is fresh (coalescing works)', async () => {
    tx.order.findUniqueOrThrow.mockResolvedValue({
      routeEtaLastBumpAt: secondsBefore(1),
      currentNextStopEstimateId: 'estimate-1',
    });
    tx.orderLiveEstimate.findUnique.mockResolvedValue({
      id: 'estimate-1',
      validUntil: secondsAfter(300),
    });
    tx.__previousPoint = { latitude: 10.0, longitude: 106.0 }; // identical position

    await service.recordPoint(actor, orderId, rawInput);

    expect(etaService.bumpRevision).not.toHaveBeenCalled();
    expect(tx.order.update).not.toHaveBeenCalled();
  });
});
