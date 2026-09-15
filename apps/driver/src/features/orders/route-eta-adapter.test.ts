import { describe, expect, it } from '@jest/globals';
import type { RouteEtaResponse, RouteEtaUpdatedEventV1 } from '@leopard/shared';

import {
  buildRoutePolylineSegments,
  createInitialRouteEtaChannelState,
  mapRouteEtaResponseToView,
  reduceRouteEtaByRevision,
  type RouteEtaChannelState,
} from './route-eta-adapter';

function makeMockRouteEtaResponse(overrides?: Partial<RouteEtaResponse>): RouteEtaResponse {
  return {
    orderId: 'order-123',
    serverTime: '2026-09-15T08:00:00.000Z',
    desiredInputRevision: 2,
    currentInputRevision: 2,
    recompute: {
      state: 'CURRENT',
      failedReason: null,
      failedInputRevision: null,
      nextRetryAt: null,
    },
    quotedRoute: null,
    activeRoute: {
      snapshotId: 'snap-1',
      routeSnapshotVersion: 1,
      geometryEncoding: 'POLYLINE6',
      fullRouteCoords: [
        { lat: 10.79, lng: 106.65 },
        { lat: 10.80, lng: 106.66 },
        { lat: 10.81, lng: 106.67 },
      ],
      legs: [
        {
          fromStopId: 'stop-origin',
          toStopId: 'stop-1',
          distanceM: 3000,
          durationS: 300,
          geometryStartIndex: 0,
          geometryEndIndex: 1,
          progress: 'COMPLETED',
        },
        {
          fromStopId: 'stop-1',
          toStopId: 'stop-dest',
          distanceM: 5000,
          durationS: 600,
          geometryStartIndex: 1,
          geometryEndIndex: 2,
          progress: 'ACTIVE',
        },
      ],
      geometryHash: 'hash-abc',
      calculatedAt: '2026-09-15T08:00:00.000Z',
      ageSeconds: 5,
      source: 'VIETMAP',
      quality: 'VERIFIED_PROVIDER',
    },
    estimates: {
      nextStop: {
        kind: 'NEXT_STOP',
        outcome: 'AVAILABLE',
        targetStopId: 'stop-dest',
        remainingDistanceM: 5000,
        remainingDurationS: 600,
        arrivalAt: '08:10',
        unavailableReason: null,
        calculatedAt: '2026-09-15T08:00:00.000Z',
        validUntil: '2026-09-15T08:05:00.000Z',
        isStale: false,
        staleSinceAt: null,
      },
      completion: {
        kind: 'COMPLETION',
        outcome: 'AVAILABLE',
        targetStopId: null,
        remainingDistanceM: 5000,
        remainingDurationS: 600,
        arrivalAt: '08:10',
        unavailableReason: null,
        calculatedAt: '2026-09-15T08:00:00.000Z',
        validUntil: '2026-09-15T08:05:00.000Z',
        isStale: false,
        staleSinceAt: null,
      },
    },
    ...overrides,
  };
}

describe('route-eta-adapter', () => {
  describe('buildRoutePolylineSegments', () => {
    it('generates completed, active, and pending segments from activeRoute legs', () => {
      const response = makeMockRouteEtaResponse();
      const segments = buildRoutePolylineSegments(response.activeRoute);

      expect(segments).toBeDefined();
      expect(segments).toHaveLength(2);
      expect(segments![0].kind).toBe('completed');
      expect(segments![0].coords).toHaveLength(2);
      expect(segments![1].kind).toBe('active');
      expect(segments![1].coords).toHaveLength(2);
    });

    it('returns undefined if legs or coords are empty', () => {
      expect(buildRoutePolylineSegments(null)).toBeUndefined();
      expect(buildRoutePolylineSegments({} as any)).toBeUndefined();
    });
  });

  describe('mapRouteEtaResponseToView', () => {
    it('maps response into driver view model with correct formats', () => {
      const response = makeMockRouteEtaResponse();
      const view = mapRouteEtaResponseToView(response);

      expect(view.distanceMeters).toBe(5000);
      expect(view.durationSeconds).toBe(600);
      expect(view.etaTargetTime).toBe('08:10');
      expect(view.outcome).toBe('COMPUTED');
      expect(view.recomputeStatus).toBe('READY');
      expect(view.activeLegIndex).toBe(1);
      expect(view.activeStopId).toBe('stop-dest');
      expect(view.polylineCoords).toHaveLength(3);
      expect(view.polylineSegments).toBeDefined();
    });

    it('marks STALE outcome when estimate isStale is true', () => {
      const response = makeMockRouteEtaResponse({
        estimates: {
          nextStop: {
            ...makeMockRouteEtaResponse().estimates.nextStop!,
            isStale: true,
          },
          completion: null,
        },
      });
      const view = mapRouteEtaResponseToView(response);
      expect(view.outcome).toBe('STALE');
    });

    it('marks NOT_COMPUTABLE when estimate is UNAVAILABLE', () => {
      const response = makeMockRouteEtaResponse({
        estimates: {
          nextStop: {
            ...makeMockRouteEtaResponse().estimates.nextStop!,
            outcome: 'UNAVAILABLE',
          },
          completion: null,
        },
      });
      const view = mapRouteEtaResponseToView(response);
      expect(view.outcome).toBe('NOT_COMPUTABLE');
    });

    it('handles RECOMPUTING and FAILED recompute states', () => {
      const pendingRes = makeMockRouteEtaResponse({
        recompute: {
          state: 'PENDING',
          failedReason: null,
          failedInputRevision: null,
          nextRetryAt: null,
        },
      });
      expect(mapRouteEtaResponseToView(pendingRes).recomputeStatus).toBe('RECOMPUTING');

      const failedRes = makeMockRouteEtaResponse({
        recompute: {
          state: 'FAILED',
          failedReason: 'PROVIDER_EXHAUSTED',
          failedInputRevision: 2,
          nextRetryAt: null,
        },
      });
      const failedView = mapRouteEtaResponseToView(failedRes);
      expect(failedView.recomputeStatus).toBe('FAILED');
      expect(failedView.recomputeFailureReason).toBe('PROVIDER_EXHAUSTED');
    });
  });

  describe('reduceRouteEtaByRevision', () => {
    it('accepts initial REST response when state has no prior response', () => {
      const initial = createInitialRouteEtaChannelState('order-123');
      const response = makeMockRouteEtaResponse({ desiredInputRevision: 1, currentInputRevision: 1 });

      const next = reduceRouteEtaByRevision(initial, {
        kind: 'REST_RESPONSE',
        response,
      });

      expect(next.desiredInputRevision).toBe(1);
      expect(next.currentInputRevision).toBe(1);
      expect(next.response).toEqual(response);
    });

    it('monotonic precedence: rejects lower desiredInputRevision', () => {
      const baseState: RouteEtaChannelState = {
        orderId: 'order-123',
        desiredInputRevision: 3,
        currentInputRevision: 3,
        response: makeMockRouteEtaResponse({ desiredInputRevision: 3, currentInputRevision: 3 }),
        seenSocketEventIds: new Set(),
      };

      const olderResponse = makeMockRouteEtaResponse({
        desiredInputRevision: 2,
        currentInputRevision: 2,
      });

      const next = reduceRouteEtaByRevision(baseState, {
        kind: 'REST_RESPONSE',
        response: olderResponse,
      });

      expect(next).toBe(baseState); // Untouched
    });

    it('monotonic precedence: for same desiredInputRevision, rejects lower currentInputRevision', () => {
      const baseState: RouteEtaChannelState = {
        orderId: 'order-123',
        desiredInputRevision: 4,
        currentInputRevision: 4,
        response: makeMockRouteEtaResponse({ desiredInputRevision: 4, currentInputRevision: 4 }),
        seenSocketEventIds: new Set(),
      };

      const laggingResponse = makeMockRouteEtaResponse({
        desiredInputRevision: 4,
        currentInputRevision: 3,
      });

      const next = reduceRouteEtaByRevision(baseState, {
        kind: 'REST_RESPONSE',
        response: laggingResponse,
      });

      expect(next).toBe(baseState);
    });

    it('same revisions: merges complementary fields without overwriting good values with null', () => {
      const existing = makeMockRouteEtaResponse({
        desiredInputRevision: 2,
        currentInputRevision: 2,
      });
      const baseState: RouteEtaChannelState = {
        orderId: 'order-123',
        desiredInputRevision: 2,
        currentInputRevision: 2,
        response: existing,
        seenSocketEventIds: new Set(),
      };

      const incomingWithMissing = makeMockRouteEtaResponse({
        desiredInputRevision: 2,
        currentInputRevision: 2,
        activeRoute: null, // missing activeRoute
      });

      const next = reduceRouteEtaByRevision(baseState, {
        kind: 'REST_RESPONSE',
        response: incomingWithMissing,
      });

      // Preserved activeRoute from prior good response
      expect(next.response?.activeRoute).toEqual(existing.activeRoute);
    });

    it('deduplicates socket events by eventId', () => {
      const event: RouteEtaUpdatedEventV1 = {
        schemaVersion: 1,
        eventId: 'evt-unique-123',
        orderId: 'order-123',
        inputRevision: 5,
        occurredAt: '2026-09-15T08:05:00.000Z',
        estimates: {
          nextStop: {
            kind: 'NEXT_STOP',
            outcome: 'AVAILABLE',
            targetStopId: 'stop-1',
            remainingDistanceM: 2000,
            remainingDurationS: 200,
            arrivalAt: '08:08',
            unavailableReason: null,
            calculatedAt: '2026-09-15T08:05:00.000Z',
            validUntil: '2026-09-15T08:10:00.000Z',
          },
          completion: {
            kind: 'COMPLETION',
            outcome: 'AVAILABLE',
            targetStopId: null,
            remainingDistanceM: 4000,
            remainingDurationS: 400,
            arrivalAt: '08:12',
            unavailableReason: null,
            calculatedAt: '2026-09-15T08:05:00.000Z',
            validUntil: '2026-09-15T08:10:00.000Z',
          },
        },
      };

      const initial = createInitialRouteEtaChannelState('order-123');
      const first = reduceRouteEtaByRevision(initial, {
        kind: 'SOCKET_ROUTE_ETA_UPDATED',
        eventId: 'evt-unique-123',
        orderId: 'order-123',
        payload: event,
      });

      expect(first.seenSocketEventIds.has('evt-unique-123')).toBe(true);
      expect(first.desiredInputRevision).toBe(5);

      // Re-delivery of same eventId is dropped
      const second = reduceRouteEtaByRevision(first, {
        kind: 'SOCKET_ROUTE_ETA_UPDATED',
        eventId: 'evt-unique-123',
        orderId: 'order-123',
        payload: event,
      });

      expect(second).toBe(first);
    });

    it('handles STOP_PROGRESS_RESPONSE updating the channel state', () => {
      const baseState: RouteEtaChannelState = {
        orderId: 'order-123',
        desiredInputRevision: 2,
        currentInputRevision: 2,
        response: makeMockRouteEtaResponse({ desiredInputRevision: 2, currentInputRevision: 2 }),
        seenSocketEventIds: new Set(),
      };

      const updatedResponse = makeMockRouteEtaResponse({
        desiredInputRevision: 3,
        currentInputRevision: 3,
      });

      const next = reduceRouteEtaByRevision(baseState, {
        kind: 'STOP_PROGRESS_RESPONSE',
        response: updatedResponse,
      });

      expect(next.desiredInputRevision).toBe(3);
      expect(next.currentInputRevision).toBe(3);
    });

    it('ignores actions for different orderId', () => {
      const baseState: RouteEtaChannelState = {
        orderId: 'order-123',
        desiredInputRevision: 2,
        currentInputRevision: 2,
        response: makeMockRouteEtaResponse({ desiredInputRevision: 2 }),
        seenSocketEventIds: new Set(),
      };

      const wrongOrder = makeMockRouteEtaResponse({
        orderId: 'order-OTHER',
        desiredInputRevision: 5,
      });

      const next = reduceRouteEtaByRevision(baseState, {
        kind: 'REST_RESPONSE',
        response: wrongOrder,
      });

      expect(next).toBe(baseState);
    });
  });
});
