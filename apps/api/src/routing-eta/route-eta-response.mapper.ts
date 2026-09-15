import {
  decodePolyline,
  type ActiveRouteView,
  type CurrentEstimateView,
  type EtaUnavailableReason,
  type PolylineEncoding,
  type QuotedRouteView,
  type RouteCoordinate,
  type RouteEtaResponse,
  type RouteLegProgress,
  type RouteLegStored,
  type RouteLegView,
  type RouteProviderSource,
  type RouteSnapshotQuality,
} from '@leopard/shared';

const ROUTE_ETA_STALE_AFTER_S = 90;
// Defined for parity with spec §4.3 and used once GPS-point join is added.
const GPS_STALE_AFTER_S = 120;

export interface EstimateRow {
  inputRevision: number;
  status: 'AVAILABLE' | 'UNAVAILABLE';
  kind: 'NEXT_STOP' | 'COMPLETION';
  targetStopId: string | null;
  remainingDistanceM: number | null;
  remainingDurationS: number | null;
  arrivalAt: Date | null;
  calculatedAt: Date;
  validUntil: Date;
  unavailableReason: string | null;
}

export interface RouteSnapshotRow {
  id: string;
  version: number;
  geometry: string;
  geometryEncoding: string;
  routeHash: string;
  legs: unknown;
  source: RouteProviderSource;
  quality: RouteSnapshotQuality;
  calculatedAt: Date;
}

export interface MapRouteEtaResponseInput {
  orderId: string;
  now: Date;
  order: { routeEtaInputRevision: number; status?: string };
  currentNextStop: EstimateRow | null;
  currentCompletion: EstimateRow | null;
  activeRoute: RouteSnapshotRow | null;
  quotedRoute: RouteSnapshotRow | null;
  pendingDeadLetterInputRevision: number | null;
  stopsWithProgress?: readonly { id: string; progress: RouteLegProgress }[];
}

export function mapRouteEtaResponse(input: MapRouteEtaResponseInput): RouteEtaResponse {
  const currentInputRevision =
    input.currentNextStop?.inputRevision ?? input.currentCompletion?.inputRevision ?? null;
  const isCurrent = currentInputRevision === input.order.routeEtaInputRevision;

  const recompute = isCurrent
    ? { state: 'CURRENT' as const, failedReason: null, failedInputRevision: null, nextRetryAt: null }
    : input.pendingDeadLetterInputRevision === input.order.routeEtaInputRevision
      ? {
          state: 'FAILED' as const,
          failedReason: null,
          failedInputRevision: input.pendingDeadLetterInputRevision,
          nextRetryAt: null,
        }
      : { state: 'PENDING' as const, failedReason: null, failedInputRevision: null, nextRetryAt: null };

  const targetStopId = input.currentNextStop?.targetStopId ?? null;

  return {
    orderId: input.orderId,
    serverTime: input.now.toISOString(),
    desiredInputRevision: input.order.routeEtaInputRevision,
    currentInputRevision,
    recompute,
    quotedRoute: toRouteView(
      input.quotedRoute,
      input.now,
      input.stopsWithProgress,
      targetStopId,
      input.order.status,
    ),
    activeRoute: toRouteView(
      input.activeRoute,
      input.now,
      input.stopsWithProgress,
      targetStopId,
      input.order.status,
    ),
    estimates: {
      nextStop: toEstimateView(input.currentNextStop, input.now),
      completion: toEstimateView(input.currentCompletion, input.now),
    },
  };
}

function toRouteView(
  row: RouteSnapshotRow | null,
  now: Date,
  stopsWithProgress?: readonly { id: string; progress: RouteLegProgress }[],
  targetStopId?: string | null,
  orderStatus?: string,
): ActiveRouteView | null {
  if (!row) {
    return null;
  }

  let fullRouteCoords: readonly RouteCoordinate[] = [];
  const encoding = (row.geometryEncoding === 'POLYLINE6' ? 'POLYLINE6' : 'POLYLINE5') as PolylineEncoding;
  try {
    fullRouteCoords = decodePolyline(row.geometry, encoding);
  } catch {
    fullRouteCoords = [];
  }

  const rawLegs = Array.isArray(row.legs) ? (row.legs as RouteLegStored[]) : [];
  let foundActive = false;

  const legs: RouteLegView[] = rawLegs.map((leg, index) => {
    let progress: RouteLegProgress = 'PENDING';
    if (orderStatus === 'DELIVERED') {
      progress = 'COMPLETED';
    } else if (stopsWithProgress && stopsWithProgress.length > 0) {
      const toStop = stopsWithProgress.find((s) => s.id === leg.toStopId);
      const fromStop = stopsWithProgress.find((s) => s.id === leg.fromStopId);

      if (toStop?.progress === 'COMPLETED') {
        progress = 'COMPLETED';
      } else if (!foundActive && (toStop?.id === targetStopId || fromStop?.progress === 'COMPLETED' || index === 0)) {
        progress = 'ACTIVE';
        foundActive = true;
      } else {
        progress = 'PENDING';
      }
    } else {
      if (
        index === 0 &&
        (orderStatus === 'ACCEPTED' || orderStatus === 'PICKING_UP' || orderStatus === 'IN_TRANSIT')
      ) {
        progress = 'ACTIVE';
      } else {
        progress = 'PENDING';
      }
    }

    return {
      fromStopId: leg.fromStopId,
      toStopId: leg.toStopId,
      distanceM: leg.distanceM,
      durationS: leg.durationS,
      ...(leg.geometryStartIndex !== undefined ? { geometryStartIndex: leg.geometryStartIndex } : {}),
      ...(leg.geometryEndIndex !== undefined ? { geometryEndIndex: leg.geometryEndIndex } : {}),
      progress,
    };
  });

  const ageSeconds = Math.max(0, Math.round((now.getTime() - row.calculatedAt.getTime()) / 1000));

  return {
    snapshotId: row.id,
    routeSnapshotVersion: row.version,
    geometryEncoding: encoding,
    fullRouteCoords,
    legs,
    geometryHash: row.routeHash,
    calculatedAt: row.calculatedAt.toISOString(),
    ageSeconds,
    source: row.source,
    quality: row.quality,
  };
}

function toEstimateView(row: EstimateRow | null, now: Date): CurrentEstimateView | null {
  if (!row) {
    return null;
  }

  const staleAtCalculated = new Date(row.calculatedAt.getTime() + ROUTE_ETA_STALE_AFTER_S * 1000);
  const staleAtValid = row.validUntil;
  const isStale =
    now.getTime() > staleAtCalculated.getTime() || now.getTime() > staleAtValid.getTime();

  let staleSinceAt: string | null = null;
  if (isStale) {
    const earliestStale = Math.min(staleAtCalculated.getTime(), staleAtValid.getTime());
    staleSinceAt = new Date(earliestStale).toISOString();
  }

  return {
    kind: row.kind,
    outcome: row.status === 'AVAILABLE' ? 'AVAILABLE' : 'UNAVAILABLE',
    targetStopId: row.targetStopId,
    remainingDistanceM: row.remainingDistanceM,
    remainingDurationS: row.remainingDurationS,
    arrivalAt: row.arrivalAt?.toISOString() ?? null,
    unavailableReason: (row.unavailableReason as EtaUnavailableReason) ?? null,
    calculatedAt: row.calculatedAt.toISOString(),
    validUntil: row.validUntil.toISOString(),
    isStale,
    staleSinceAt,
  };
}
