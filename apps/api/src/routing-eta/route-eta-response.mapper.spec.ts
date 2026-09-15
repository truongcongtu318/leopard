import { mapRouteEtaResponse } from './route-eta-response.mapper.js';

describe('mapRouteEtaResponse', () => {
  it('marks recompute as PENDING when desiredInputRevision is ahead of the current pointer', () => {
    const now = new Date('2026-09-14T00:00:00Z');
    const result = mapRouteEtaResponse({
      orderId: 'order-1',
      now,
      order: { routeEtaInputRevision: 7 },
      currentNextStop: {
        inputRevision: 6,
        status: 'AVAILABLE',
        kind: 'NEXT_STOP',
        targetStopId: 'stop-1',
        remainingDistanceM: 100,
        remainingDurationS: 60,
        arrivalAt: now,
        calculatedAt: now,
        validUntil: new Date(now.getTime() + 120_000),
        unavailableReason: null,
      },
      currentCompletion: null,
      activeRoute: null,
      quotedRoute: null,
      pendingDeadLetterInputRevision: null,
    });

    expect(result.recompute.state).toBe('PENDING');
    expect(result.currentInputRevision).toBe(6);
  });

  it('marks recompute as FAILED when the outstanding revision matches a dead-lettered job', () => {
    const now = new Date('2026-09-14T00:00:00Z');
    const result = mapRouteEtaResponse({
      orderId: 'order-1',
      now,
      order: { routeEtaInputRevision: 7 },
      currentNextStop: {
        inputRevision: 6,
        status: 'AVAILABLE',
        kind: 'NEXT_STOP',
        targetStopId: 'stop-1',
        remainingDistanceM: 100,
        remainingDurationS: 60,
        arrivalAt: now,
        calculatedAt: now,
        validUntil: new Date(now.getTime() + 120_000),
        unavailableReason: null,
      },
      currentCompletion: null,
      activeRoute: null,
      quotedRoute: null,
      pendingDeadLetterInputRevision: 7,
    });

    expect(result.recompute).toEqual({
      state: 'FAILED',
      failedReason: null,
      failedInputRevision: 7,
      nextRetryAt: null,
    });
  });

  it('correctly maps activeRoute with decoded coordinates and leg progress', () => {
    const calculatedAt = new Date('2026-09-14T00:00:00Z');
    const now = new Date('2026-09-14T00:02:00Z'); // 120s later

    // Valid polyline for (10.79, 106.65) to (10.76, 106.8)
    const geometry = '}s{`Ac_hjSjAkCFQRu@';

    const result = mapRouteEtaResponse({
      orderId: 'order-1',
      now,
      order: { routeEtaInputRevision: 3, status: 'IN_TRANSIT' },
      currentNextStop: {
        inputRevision: 3,
        status: 'AVAILABLE',
        kind: 'NEXT_STOP',
        targetStopId: 'stop-2',
        remainingDistanceM: 500,
        remainingDurationS: 60,
        arrivalAt: now,
        calculatedAt,
        validUntil: new Date(now.getTime() + 60_000),
        unavailableReason: null,
      },
      currentCompletion: null,
      activeRoute: {
        id: 'snap-1',
        version: 2,
        geometry,
        geometryEncoding: 'POLYLINE5',
        routeHash: 'hash-123',
        source: 'VIETMAP',
        quality: 'VERIFIED_PROVIDER',
        calculatedAt,
        legs: [
          {
            fromStopId: 'stop-1',
            toStopId: 'stop-2',
            distanceM: 1000,
            durationS: 120,
            geometryStartIndex: 0,
            geometryEndIndex: 1,
          },
          {
            fromStopId: 'stop-2',
            toStopId: 'stop-3',
            distanceM: 2000,
            durationS: 240,
            geometryStartIndex: 1,
            geometryEndIndex: 2,
          },
        ],
      },
      quotedRoute: null,
      pendingDeadLetterInputRevision: null,
      stopsWithProgress: [
        { id: 'stop-1', progress: 'COMPLETED' },
        { id: 'stop-2', progress: 'ACTIVE' },
        { id: 'stop-3', progress: 'PENDING' },
      ],
    });

    expect(result.activeRoute).not.toBeNull();
    expect(result.activeRoute?.snapshotId).toBe('snap-1');
    expect(result.activeRoute?.routeSnapshotVersion).toBe(2);
    expect(result.activeRoute?.geometryHash).toBe('hash-123');
    expect(result.activeRoute?.source).toBe('VIETMAP');
    expect(result.activeRoute?.quality).toBe('VERIFIED_PROVIDER');
    expect(result.activeRoute?.ageSeconds).toBe(120);
    expect(result.activeRoute?.fullRouteCoords.length).toBeGreaterThan(0);

    expect(result.activeRoute?.legs).toEqual([
      {
        fromStopId: 'stop-1',
        toStopId: 'stop-2',
        distanceM: 1000,
        durationS: 120,
        geometryStartIndex: 0,
        geometryEndIndex: 1,
        progress: 'ACTIVE',
      },
      {
        fromStopId: 'stop-2',
        toStopId: 'stop-3',
        distanceM: 2000,
        durationS: 240,
        geometryStartIndex: 1,
        geometryEndIndex: 2,
        progress: 'PENDING',
      },
    ]);
  });

  it('handles invalid/corrupt polyline gracefully without crashing request', () => {
    const calculatedAt = new Date('2026-09-14T00:00:00Z');
    const now = new Date('2026-09-14T00:01:00Z');

    const result = mapRouteEtaResponse({
      orderId: 'order-1',
      now,
      order: { routeEtaInputRevision: 1 },
      currentNextStop: null,
      currentCompletion: null,
      activeRoute: {
        id: 'snap-bad',
        version: 1,
        geometry: 'invalid_truncated_polyline_??',
        geometryEncoding: 'POLYLINE5',
        routeHash: 'hash-bad',
        source: 'VIETMAP',
        quality: 'LEGACY_RECOVERED',
        calculatedAt,
        legs: [],
      },
      quotedRoute: null,
      pendingDeadLetterInputRevision: null,
    });

    expect(result.activeRoute).not.toBeNull();
    expect(result.activeRoute?.fullRouteCoords).toEqual([]);
    expect(result.activeRoute?.quality).toBe('LEGACY_RECOVERED');
  });

  it('reflects earliest stale timestamp when stale by calculatedAt + ROUTE_ETA_STALE_AFTER', () => {
    // ROUTE_ETA_STALE_AFTER_S is 90s
    const calculatedAt = new Date('2026-09-14T00:00:00Z');
    const validUntil = new Date('2026-09-14T00:05:00Z'); // 300s later
    const now = new Date('2026-09-14T00:01:40Z'); // 100s later (stale by 90s rule, but before validUntil)

    const result = mapRouteEtaResponse({
      orderId: 'order-1',
      now,
      order: { routeEtaInputRevision: 1 },
      currentNextStop: {
        inputRevision: 1,
        status: 'AVAILABLE',
        kind: 'NEXT_STOP',
        targetStopId: 'stop-1',
        remainingDistanceM: 100,
        remainingDurationS: 60,
        arrivalAt: now,
        calculatedAt,
        validUntil,
        unavailableReason: null,
      },
      currentCompletion: null,
      activeRoute: null,
      quotedRoute: null,
      pendingDeadLetterInputRevision: null,
    });

    expect(result.estimates.nextStop?.isStale).toBe(true);
    // staleSinceAt must be calculatedAt + 90s = 00:01:30Z, NOT validUntil (00:05:00Z)
    expect(result.estimates.nextStop?.staleSinceAt).toBe('2026-09-14T00:01:30.000Z');
  });

  it('reflects earliest stale timestamp when stale by validUntil', () => {
    const calculatedAt = new Date('2026-09-14T00:00:00Z');
    const validUntil = new Date('2026-09-14T00:01:00Z'); // 60s later (before 90s calculatedAt rule)
    const now = new Date('2026-09-14T00:01:10Z'); // 70s later

    const result = mapRouteEtaResponse({
      orderId: 'order-1',
      now,
      order: { routeEtaInputRevision: 1 },
      currentNextStop: {
        inputRevision: 1,
        status: 'AVAILABLE',
        kind: 'NEXT_STOP',
        targetStopId: 'stop-1',
        remainingDistanceM: 100,
        remainingDurationS: 60,
        arrivalAt: now,
        calculatedAt,
        validUntil,
        unavailableReason: null,
      },
      currentCompletion: null,
      activeRoute: null,
      quotedRoute: null,
      pendingDeadLetterInputRevision: null,
    });

    expect(result.estimates.nextStop?.isStale).toBe(true);
    expect(result.estimates.nextStop?.staleSinceAt).toBe('2026-09-14T00:01:00.000Z');
  });

  it('leaves activeRoute and quotedRoute as null when snapshots are null', () => {
    const now = new Date('2026-09-14T00:00:00Z');
    const result = mapRouteEtaResponse({
      orderId: 'order-1',
      now,
      order: { routeEtaInputRevision: 1 },
      currentNextStop: null,
      currentCompletion: null,
      activeRoute: null,
      quotedRoute: null,
      pendingDeadLetterInputRevision: null,
    });

    expect(result.activeRoute).toBeNull();
    expect(result.quotedRoute).toBeNull();
  });
});
