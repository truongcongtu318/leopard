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

export interface JoinOrderPayload { readonly orderId: string; }
export interface LeaveOrderPayload { readonly orderId: string; }
export interface SendTrackingPointPayload {
  readonly orderId: string;
  readonly clientPointId: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracyM?: number;
  readonly capturedAt: string;
}
