import type { OrderStatus, ProviderSource } from './enums.js';
import type { TrackingPoint } from './tracking.js';

export const TRACKING_NAMESPACE = '/tracking';

export const TrackingSocketEvent = {
  joinOrder: 'tracking:join-order',
  leaveOrder: 'tracking:leave-order',
  sendPoint: 'tracking:send-point',
  pointUpdated: 'tracking:point-updated',
  orderStatusUpdated: 'order:status-updated',
  sessionError: 'session:error',
} as const;
export type TrackingSocketEvent = (typeof TrackingSocketEvent)[keyof typeof TrackingSocketEvent];

export type SocketAck<T = undefined> =
  | ({ ok: true } & (T extends undefined ? {} : T))
  | { ok: false; error: { code: SocketErrorCode; message: string } };

export type SocketErrorCode =
  | 'AUTH_REQUIRED'
  | 'SESSION_EXPIRED'
  | 'TRACKING_FORBIDDEN'
  | 'TRACKING_INVALID_POINT'
  | 'TRACKING_RATE_LIMITED'
  | 'TRACKING_ORDER_INACTIVE'
  | 'TRACKING_POINT_CONFLICT'
  | 'RESOURCE_NOT_FOUND'
  | 'PROVIDER_UNAVAILABLE';

export interface JoinOrderPayload {
  readonly orderId: string;
}

export interface LeaveOrderPayload {
  readonly orderId: string;
}

export interface TrackingJoinOrderPayload {
  orderId: string;
}

export interface TrackingLeaveOrderPayload {
  orderId: string;
}

export interface TrackingJoinOrderAck {
  ok: boolean;
  latestPoint?: TrackingPoint | null;
  error?: {
    code: string;
    message: string;
  };
}

export interface SendTrackingPointPayload {
  readonly orderId: string;
  readonly clientPointId: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracyM?: number;
  readonly capturedAt: string;
}

export interface TrackingPointUpdatedEvent {
  orderId: string;
  point?: TrackingPoint;
  latitude?: number;
  longitude?: number;
  capturedAt?: string;
  driverId?: string;
  eventId?: string;
  occurredAt?: string;
}

export interface OrderStatusUpdatedEvent {
  orderId: string;
  previousStatus?: OrderStatus | null;
  currentStatus?: OrderStatus;
  status?: OrderStatus;
  changedAt?: string;
  reason?: string | null;
  eventId?: string;
  occurredAt?: string;
}

export interface EtaUpdatedEvent {
  orderId: string;
  durationSeconds: number;
  source?: ProviderSource;
  calculatedAt?: string;
  eventId?: string;
  occurredAt?: string;
}

export interface SessionErrorEvent {
  code: string;
  message: string;
}

