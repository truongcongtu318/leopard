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
});
