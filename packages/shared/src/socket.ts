import type { OrderStatus, ProviderSource } from './enums.js';
import type { TrackingPoint } from './tracking.js';

export const TRACKING_NAMESPACE = '/tracking';

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
