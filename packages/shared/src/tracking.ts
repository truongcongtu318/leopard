import type { GeoPoint } from './order.js';

export interface TrackingPoint extends GeoPoint {
  id: string;
  orderId: string;
  driverId: string;
  clientPointId: string;
  heading?: number | null;
  speed?: number | null;
  accuracyM?: number | null;
  capturedAt: string;
  createdAt?: string;
}

export interface SendTrackingPointPayload {
  orderId: string;
  clientPointId: string;
  latitude: number;
  longitude: number;
  accuracyM?: number;
  capturedAt: string;
}

export interface TrackingHistoryResponse {
  orderId: string;
  points: TrackingPoint[];
  latestPoint: TrackingPoint | null;
}
