import type { OrderStatus } from '../enums.js';
import type { RouteCoordinate } from './route-coordinate.js';

export type RouteSnapshotQuality =
  | 'VERIFIED_PROVIDER'
  | 'DEMO'
  | 'LEGACY_RECOVERED'
  | 'PARTIAL';

export type RouteProviderSource = 'VIETMAP' | 'DEMO';

export type EtaUnavailableReason =
  | 'NO_TARGET_STOP'
  | 'GPS_TOO_OLD'
  | 'ROUTE_UNAVAILABLE'
  | 'PROVIDER_EXHAUSTED'
  | 'INVALID_ROUTE_INPUT';

export type RouteLegProgress = 'COMPLETED' | 'ACTIVE' | 'PENDING';

export interface RouteLegStored {
  fromStopId: string;
  toStopId: string;
  distanceM: number;
  durationS: number;
  geometryStartIndex?: number;
  geometryEndIndex?: number;
}

export interface RouteLegView {
  fromStopId: string;
  toStopId: string;
  distanceM: number;
  durationS: number;
  geometryStartIndex?: number;
  geometryEndIndex?: number;
  progress: RouteLegProgress;
}

export interface ActiveRouteView {
  snapshotId: string;
  routeSnapshotVersion: number;
  geometryEncoding: 'POLYLINE5' | 'POLYLINE6';
  fullRouteCoords: readonly RouteCoordinate[];
  legs: readonly RouteLegView[];
  geometryHash: string;
  calculatedAt: string;
  ageSeconds: number;
  source: RouteProviderSource;
  quality: RouteSnapshotQuality;
}

export interface QuotedRouteView {
  snapshotId: string;
  routeSnapshotVersion: number;
  geometryEncoding: 'POLYLINE5' | 'POLYLINE6';
  fullRouteCoords: readonly RouteCoordinate[];
  legs: readonly RouteLegView[];
  geometryHash: string;
  calculatedAt: string;
  ageSeconds: number;
  source: RouteProviderSource;
  quality: RouteSnapshotQuality;
}

export interface CurrentEstimateView {
  kind: 'NEXT_STOP' | 'COMPLETION';
  outcome: 'AVAILABLE' | 'UNAVAILABLE';
  targetStopId: string | null;
  remainingDistanceM: number | null;
  remainingDurationS: number | null;
  arrivalAt: string | null;
  unavailableReason: EtaUnavailableReason | null;
  calculatedAt: string;
  validUntil: string;
  isStale: boolean;
  staleSinceAt: string | null;
}

export interface RouteEtaRecomputeView {
  state: 'CURRENT' | 'PENDING' | 'FAILED';
  failedReason: EtaUnavailableReason | null;
  failedInputRevision: number | null;
  nextRetryAt: string | null;
}

export interface RouteEtaResponse {
  orderId: string;
  serverTime: string;
  desiredInputRevision: number;
  currentInputRevision: number | null;
  recompute: RouteEtaRecomputeView;
  quotedRoute: QuotedRouteView | null;
  activeRoute: ActiveRouteView | null;
  estimates: {
    nextStop: CurrentEstimateView | null;
    completion: CurrentEstimateView | null;
  };
}

export interface StopProgressCommandResponse {
  progressEvent: {
    id: string;
    orderId: string;
    stopId: string;
    step: 'ARRIVED' | 'SERVICE_STARTED' | 'SERVICE_COMPLETED';
    action: 'RECORDED' | 'VOIDED';
    occurredAt: string;
  };
  recompute: {
    inputRevision: number;
    state: 'QUEUED';
  };
  currentRouteEta: RouteEtaResponse;
  replayed: boolean;
}

export function isRouteEtaSubscribeEligibleStatus(status?: OrderStatus | null): boolean {
  return status === 'ACCEPTED' || status === 'PICKING_UP' || status === 'IN_TRANSIT';
}
