import type {
  ActiveRouteView,
  CurrentEstimateSocketView,
  CurrentEstimateView,
  RouteCoordinate,
  RouteEtaRecomputeView,
  RouteEtaResponse,
  RouteEtaUpdatedEventV1,
  RouteLegView,
} from '@leopard/shared';
import type { RoutePolylineSegment } from '@leopard/mobile-core';
import type { DriverEtaOutcomeView, DriverRouteEtaView } from './model';

export interface RouteEtaChannelState {
  readonly orderId: string;
  readonly desiredInputRevision: number;
  readonly currentInputRevision: number | null;
  readonly response: RouteEtaResponse | null;
  readonly seenSocketEventIds: ReadonlySet<string>;
}

export type RouteEtaAction =
  | {
      readonly kind: 'REST_RESPONSE';
      readonly response: RouteEtaResponse;
    }
  | {
      readonly kind: 'SOCKET_ROUTE_ETA_UPDATED';
      readonly eventId: string;
      readonly orderId: string;
      readonly payload: RouteEtaUpdatedEventV1;
    }
  | {
      readonly kind: 'STOP_PROGRESS_RESPONSE';
      readonly response: RouteEtaResponse;
    };

export function createInitialRouteEtaChannelState(
  orderId: string,
): RouteEtaChannelState {
  return {
    orderId,
    desiredInputRevision: -1,
    currentInputRevision: null,
    response: null,
    seenSocketEventIds: new Set(),
  };
}

/**
 * Builds completed, active, and pending polyline segments from stored route legs.
 */
export function buildRoutePolylineSegments(
  activeRoute?: ActiveRouteView | null,
): readonly RoutePolylineSegment[] | undefined {
  if (!activeRoute || !activeRoute.legs || activeRoute.legs.length === 0) return undefined;
  const coords = activeRoute.fullRouteCoords ?? [];

  const segments: RoutePolylineSegment[] = [];
  for (const leg of activeRoute.legs) {
    const legWithCoords = leg as RouteLegView & { coords?: readonly RouteCoordinate[] };
    let legCoords: readonly RouteCoordinate[] | undefined = legWithCoords.coords;

    if (
      !legCoords &&
      coords.length >= 2 &&
      typeof leg.geometryStartIndex === 'number' &&
      typeof leg.geometryEndIndex === 'number' &&
      leg.geometryEndIndex > leg.geometryStartIndex &&
      leg.geometryEndIndex <= coords.length
    ) {
      legCoords = coords.slice(leg.geometryStartIndex, leg.geometryEndIndex + 1);
    }

    if (legCoords && legCoords.length >= 2) {
      if (leg.progress === 'COMPLETED') {
        segments.push({ kind: 'completed', coords: legCoords });
      } else if (leg.progress === 'ACTIVE') {
        segments.push({ kind: 'active', coords: legCoords });
      } else {
        segments.push({ kind: 'pending', coords: legCoords });
      }
    }
  }

  return segments.length > 0 ? segments : undefined;
}

/**
 * Maps a strongly-typed RouteEtaResponse to the Driver view model.
 */
export function mapRouteEtaResponseToView(
  response: RouteEtaResponse,
): DriverRouteEtaView {
  const est = response.estimates.nextStop ?? response.estimates.completion;
  const polylineCoords = response.activeRoute?.fullRouteCoords ?? [];
  const polylineSegments = buildRoutePolylineSegments(response.activeRoute);

  let estimateAgeLabel: string | null = null;
  if (est?.calculatedAt) {
    const calcTime = new Date(est.calculatedAt).getTime();
    if (!isNaN(calcTime)) {
      const ageSec = Math.max(0, Math.floor((Date.now() - calcTime) / 1000));
      estimateAgeLabel = ageSec < 60 ? 'Vừa xong' : `${Math.floor(ageSec / 60)} phút trước`;
    }
  }

  const distanceMeters =
    est?.remainingDistanceM ??
    (response.activeRoute?.legs?.reduce((sum, l) => sum + l.distanceM, 0) ?? 0);
  const durationSeconds =
    est?.remainingDurationS ??
    (response.activeRoute?.legs?.reduce((sum, l) => sum + l.durationS, 0) ?? 0);
  const etaTargetTime = est?.arrivalAt ?? null;

  let outcome: DriverEtaOutcomeView = 'NOT_REQUESTED';
  if (est) {
    if (est.outcome === 'AVAILABLE') {
      outcome = est.isStale ? 'STALE' : 'COMPUTED';
    } else {
      outcome = 'NOT_COMPUTABLE';
    }
  }

  let recomputeStatus: 'PENDING' | 'RECOMPUTING' | 'FAILED' | 'READY' = 'READY';
  if (response.recompute.state === 'PENDING') {
    recomputeStatus = 'RECOMPUTING';
  } else if (response.recompute.state === 'FAILED') {
    recomputeStatus = 'FAILED';
  }

  const activeLegIndex = response.activeRoute?.legs
    ? Math.max(0, response.activeRoute.legs.findIndex((l) => l.progress === 'ACTIVE'))
    : 0;

  const activeStopId =
    est?.targetStopId ??
    (response.activeRoute?.legs?.[activeLegIndex]?.toStopId ?? null);

  return {
    distanceMeters,
    durationSeconds,
    etaTargetTime,
    estimateAgeLabel,
    recomputeStatus,
    recomputeFailureReason: response.recompute.failedReason ?? undefined,
    outcome,
    source: (response.activeRoute?.source as any) ?? 'DEMO',
    activeLegIndex,
    activeStopId,
    polylineCoords,
    polylineSegments,
  };
}

function mergeEstimate(
  prev: CurrentEstimateView | null | undefined,
  incoming: CurrentEstimateView | null | undefined,
): CurrentEstimateView | null {
  if (!incoming) return prev ?? null;
  if (!prev) return incoming;
  return {
    kind: incoming.kind ?? prev.kind,
    outcome: incoming.outcome ?? prev.outcome,
    targetStopId: incoming.targetStopId ?? prev.targetStopId,
    remainingDistanceM: incoming.remainingDistanceM ?? prev.remainingDistanceM,
    remainingDurationS: incoming.remainingDurationS ?? prev.remainingDurationS,
    arrivalAt: incoming.arrivalAt ?? prev.arrivalAt,
    unavailableReason: incoming.unavailableReason ?? prev.unavailableReason,
    calculatedAt: incoming.calculatedAt || prev.calculatedAt,
    validUntil: incoming.validUntil || prev.validUntil,
    isStale: incoming.isStale ?? prev.isStale,
    staleSinceAt: incoming.staleSinceAt ?? prev.staleSinceAt,
  };
}

function mergeRecompute(
  prev: RouteEtaRecomputeView | undefined,
  incoming: RouteEtaRecomputeView,
): RouteEtaRecomputeView {
  if (!prev) return incoming;
  return {
    state: incoming.state || prev.state,
    failedReason: incoming.failedReason ?? prev.failedReason,
    failedInputRevision: incoming.failedInputRevision ?? prev.failedInputRevision,
    nextRetryAt: incoming.nextRetryAt ?? prev.nextRetryAt,
  };
}

function mergeActiveRoute(
  prev: ActiveRouteView | null | undefined,
  incoming: ActiveRouteView | null | undefined,
): ActiveRouteView | null {
  if (!incoming) return prev ?? null;
  if (!prev) return incoming;
  return {
    snapshotId: incoming.snapshotId || prev.snapshotId,
    routeSnapshotVersion: incoming.routeSnapshotVersion ?? prev.routeSnapshotVersion,
    geometryEncoding: incoming.geometryEncoding || prev.geometryEncoding,
    geometryHash: incoming.geometryHash || prev.geometryHash,
    fullRouteCoords:
      incoming.fullRouteCoords && incoming.fullRouteCoords.length > 0
        ? incoming.fullRouteCoords
        : prev.fullRouteCoords,
    legs: incoming.legs && incoming.legs.length > 0 ? incoming.legs : prev.legs,
    calculatedAt: incoming.calculatedAt || prev.calculatedAt,
    ageSeconds: incoming.ageSeconds ?? prev.ageSeconds,
    source: incoming.source || prev.source,
    quality: incoming.quality || prev.quality,
  };
}

function socketEstimateToView(
  socketEst: CurrentEstimateSocketView | null | undefined,
  prev: CurrentEstimateView | null | undefined,
): CurrentEstimateView | null {
  if (!socketEst) return prev ?? null;
  return {
    kind: socketEst.kind,
    outcome: socketEst.outcome,
    targetStopId: socketEst.targetStopId ?? prev?.targetStopId ?? null,
    remainingDistanceM: socketEst.remainingDistanceM ?? prev?.remainingDistanceM ?? null,
    remainingDurationS: socketEst.remainingDurationS ?? prev?.remainingDurationS ?? null,
    arrivalAt: socketEst.arrivalAt ?? prev?.arrivalAt ?? null,
    unavailableReason: (socketEst.unavailableReason as any) ?? prev?.unavailableReason ?? null,
    calculatedAt: socketEst.calculatedAt || prev?.calculatedAt || new Date().toISOString(),
    validUntil: socketEst.validUntil || prev?.validUntil || new Date(Date.now() + 120_000).toISOString(),
    isStale: prev?.isStale ?? false,
    staleSinceAt: prev?.staleSinceAt ?? null,
  };
}

function socketPayloadToRouteEtaResponse(
  prev: RouteEtaResponse | null,
  payload: RouteEtaUpdatedEventV1,
): RouteEtaResponse {
  const nextStop = socketEstimateToView(payload.estimates.nextStop, prev?.estimates.nextStop);
  const completion = socketEstimateToView(payload.estimates.completion, prev?.estimates.completion);

  const recompute: RouteEtaRecomputeView = {
    state: 'CURRENT',
    failedReason: null,
    failedInputRevision: null,
    nextRetryAt: null,
  };

  return {
    orderId: payload.orderId,
    serverTime: payload.occurredAt,
    desiredInputRevision: payload.inputRevision,
    currentInputRevision: payload.inputRevision,
    recompute,
    quotedRoute: prev?.quotedRoute ?? null,
    activeRoute: prev?.activeRoute ?? null,
    estimates: {
      nextStop,
      completion,
    },
  };
}

/**
 * Monotonic revision reducer for Route ETA channel state.
 * Evaluates desiredInputRevision first, then currentInputRevision.
 * Rejects stale/lower revisions and deduplicates socket event IDs.
 */
export function reduceRouteEtaByRevision(
  state: RouteEtaChannelState,
  action: RouteEtaAction,
): RouteEtaChannelState {
  let incomingOrderId = '';
  let incomingDesired = -1;
  let incomingCurrent: number | null = -1;
  let eventId = '';

  if (action.kind === 'REST_RESPONSE' || action.kind === 'STOP_PROGRESS_RESPONSE') {
    incomingOrderId = action.response.orderId;
    incomingDesired = action.response.desiredInputRevision;
    incomingCurrent = action.response.currentInputRevision;
  } else if (action.kind === 'SOCKET_ROUTE_ETA_UPDATED') {
    if (action.payload?.schemaVersion !== 1) {
      return state;
    }
    incomingOrderId = action.payload.orderId || action.orderId;
    incomingDesired = action.payload.inputRevision;
    incomingCurrent = action.payload.inputRevision;
    eventId = action.eventId || action.payload.eventId || '';
  }

  // Mismatched order ID is ignored
  if (state.orderId && incomingOrderId && state.orderId !== incomingOrderId) {
    return state;
  }

  // Deduplicate socket eventId
  if (eventId && state.seenSocketEventIds.has(eventId)) {
    return state;
  }

  // Initial accept if no state exists yet
  if (!state.response || state.desiredInputRevision < 0) {
    const nextSeen = eventId
      ? new Set([...state.seenSocketEventIds, eventId])
      : state.seenSocketEventIds;

    let initialResponse: RouteEtaResponse;
    if (action.kind === 'REST_RESPONSE' || action.kind === 'STOP_PROGRESS_RESPONSE') {
      initialResponse = action.response;
    } else {
      initialResponse = socketPayloadToRouteEtaResponse(null, action.payload);
    }

    return {
      orderId: incomingOrderId || state.orderId,
      desiredInputRevision: incomingDesired,
      currentInputRevision: incomingCurrent,
      response: initialResponse,
      seenSocketEventIds: nextSeen,
    };
  }

  // Monotonic check: desiredInputRevision takes precedence
  if (incomingDesired < state.desiredInputRevision) {
    return state;
  }

  if (incomingDesired === state.desiredInputRevision) {
    const stateCur = state.currentInputRevision ?? -1;
    const incCur = incomingCurrent ?? -1;
    if (incCur < stateCur) {
      return state;
    }

    if (incCur === stateCur) {
      // Revisions are equal: merge missing / supplementary fields without overwriting good values
      const nextSeen = eventId
        ? new Set([...state.seenSocketEventIds, eventId])
        : state.seenSocketEventIds;

      let mergedResponse: RouteEtaResponse;
      if (action.kind === 'REST_RESPONSE' || action.kind === 'STOP_PROGRESS_RESPONSE') {
        mergedResponse = {
          orderId: state.orderId,
          serverTime: action.response.serverTime || state.response.serverTime,
          desiredInputRevision: state.desiredInputRevision,
          currentInputRevision: state.currentInputRevision,
          estimates: {
            nextStop: mergeEstimate(state.response.estimates.nextStop, action.response.estimates.nextStop),
            completion: mergeEstimate(state.response.estimates.completion, action.response.estimates.completion),
          },
          recompute: mergeRecompute(state.response.recompute, action.response.recompute),
          activeRoute: mergeActiveRoute(state.response.activeRoute, action.response.activeRoute),
          quotedRoute: action.response.quotedRoute ?? state.response.quotedRoute ?? null,
        };
      } else {
        mergedResponse = socketPayloadToRouteEtaResponse(state.response, action.payload);
      }

      return {
        ...state,
        response: mergedResponse,
        seenSocketEventIds: nextSeen,
      };
    }
  }

  // incoming is newer (either desired > curDesired, or same desired and current > curCurrent)
  const nextSeen = eventId
    ? new Set([...state.seenSocketEventIds, eventId])
    : state.seenSocketEventIds;

  let newResponse: RouteEtaResponse;
  if (action.kind === 'REST_RESPONSE' || action.kind === 'STOP_PROGRESS_RESPONSE') {
    newResponse = {
      ...action.response,
      activeRoute: mergeActiveRoute(state.response.activeRoute, action.response.activeRoute),
      quotedRoute: action.response.quotedRoute ?? state.response.quotedRoute ?? null,
    };
  } else {
    newResponse = socketPayloadToRouteEtaResponse(state.response, action.payload);
  }

  return {
    orderId: incomingOrderId || state.orderId,
    desiredInputRevision: incomingDesired,
    currentInputRevision: incomingCurrent,
    response: newResponse,
    seenSocketEventIds: nextSeen,
  };
}
