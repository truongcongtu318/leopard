import { describe, expect, test, jest, beforeEach } from '@jest/globals';

import { TrackingRepository } from './tracking.repository.js';
import { DomainError } from '../common/domain-error.js';
import type { TrackingPointInput } from './tracking-point.schema.js';
import type { TrackingOrderAccess } from './tracking.policy.js';

describe('TrackingRepository.recordPointAtomically', () => {
  let tx: any;
  let prisma: any;
  let repository: TrackingRepository;
  const noopAuthorize = (_order: TrackingOrderAccess): void => undefined;
  const noopRateLimit = (): void => undefined;

  const baseInput: TrackingPointInput = {
    clientPointId: '11111111-1111-1111-1111-111111111111',
    latitude: 10.762622,
    longitude: 106.660172,
    capturedAt: new Date('2026-09-15T10:00:00.000Z'),
  };

  const insertedRow = {
    id: 'point-2',
    orderId: 'order-1',
    driverId: 'driver-1',
    clientPointId: baseInput.clientPointId,
    latitude: baseInput.latitude,
    longitude: baseInput.longitude,
    accuracyM: null,
    capturedAt: baseInput.capturedAt,
    createdAt: new Date('2026-09-15T10:00:00.500Z'),
  };

  beforeEach(() => {
    tx = {
      order: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'order-1',
          status: 'IN_TRANSIT',
          customerId: 'customer-1',
          driverId: 'driver-1',
        }),
      },
      $queryRaw: jest.fn(),
    };
    prisma = {
      $transaction: jest.fn((cb: any) => cb(tx)),
    };
    repository = new TrackingRepository(prisma);
  });

  function mockQueryRawSequence(...results: unknown[][]): void {
    for (const result of results) {
      (tx.$queryRaw as jest.Mock).mockResolvedValueOnce(result);
    }
  }

  test('returns the existing point unchanged on a clientPointId replay (dedupe)', async () => {
    mockQueryRawSequence([insertedRow]);

    const result = await repository.recordPointAtomically(
      'driver-1',
      'order-1',
      baseInput,
      noopAuthorize,
      noopRateLimit,
    );

    expect(result).toEqual(insertedRow);
    // Only the dedupe SELECT should run — no previous-point lookup, insert, or DriverProfile update.
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
  });

  test('throws TRACKING_POINT_CONFLICT when a replayed clientPointId carries different data', async () => {
    mockQueryRawSequence([{ ...insertedRow, latitude: 0 }]);

    await expect(
      repository.recordPointAtomically('driver-1', 'order-1', baseInput, noopAuthorize, noopRateLimit),
    ).rejects.toThrow(DomainError);
  });

  test('inserts a new point, updates DriverProfile, and does not invoke onPointRecorded when omitted', async () => {
    mockQueryRawSequence(
      [], // dedupe: none existing
      [], // previousPoint: none
      [insertedRow], // insert RETURNING
      [], // DriverProfile update
    );

    const result = await repository.recordPointAtomically(
      'driver-1',
      'order-1',
      baseInput,
      noopAuthorize,
      noopRateLimit,
    );

    expect(result).toEqual(insertedRow);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(4);
  });

  test('invokes onPointRecorded inside the same tx as the point insert, with the inserted point and null previousPoint when none exists', async () => {
    mockQueryRawSequence(
      [], // dedupe: none existing
      [], // previousPoint: none
      [insertedRow], // insert RETURNING
      [], // DriverProfile update
    );
    const onPointRecorded = jest.fn().mockResolvedValue(undefined);

    await repository.recordPointAtomically(
      'driver-1',
      'order-1',
      baseInput,
      noopAuthorize,
      noopRateLimit,
      onPointRecorded,
    );

    expect(onPointRecorded).toHaveBeenCalledWith(tx, insertedRow, null);
  });

  test('passes the most recent existing point as previousPoint to onPointRecorded', async () => {
    const priorRow = { ...insertedRow, id: 'point-1', capturedAt: new Date('2026-09-15T09:59:30.000Z') };
    mockQueryRawSequence(
      [], // dedupe: none existing
      [priorRow], // previousPoint: prior row
      [insertedRow], // insert RETURNING
      [], // DriverProfile update
    );
    const onPointRecorded = jest.fn().mockResolvedValue(undefined);

    await repository.recordPointAtomically(
      'driver-1',
      'order-1',
      baseInput,
      noopAuthorize,
      noopRateLimit,
      onPointRecorded,
    );

    expect(onPointRecorded).toHaveBeenCalledWith(tx, insertedRow, priorRow);
  });

  test('runs onPointRecorded before the DriverProfile update, inside the same transaction, before $transaction resolves', async () => {
    mockQueryRawSequence(
      [], // dedupe
      [], // previousPoint
      [insertedRow], // insert RETURNING
      [], // DriverProfile update
    );
    const callOrder: string[] = [];
    const originalQueryRaw = tx.$queryRaw;
    let queryRawCallCount = 0;
    tx.$queryRaw = jest.fn((...args: unknown[]) => {
      queryRawCallCount += 1;
      if (queryRawCallCount === 4) {
        callOrder.push('driverProfileUpdate');
      }
      return (originalQueryRaw as jest.Mock)(...args);
    });
    const onPointRecorded = jest.fn(async () => {
      callOrder.push('onPointRecorded');
    });

    await repository.recordPointAtomically(
      'driver-1',
      'order-1',
      baseInput,
      noopAuthorize,
      noopRateLimit,
      onPointRecorded,
    );

    expect(callOrder).toEqual(['onPointRecorded', 'driverProfileUpdate']);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
