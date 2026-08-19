import type { TrackingPointDto } from '@leopard/shared';

export interface TrackingPointRawRow {
  id: string;
  orderId: string;
  driverId: string;
  clientPointId: string;
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  capturedAt: Date;
  createdAt: Date;
}

export function mapTrackingPoint(point: TrackingPointRawRow): TrackingPointDto {
  return {
    id: point.id,
    orderId: point.orderId,
    driverId: point.driverId,
    clientPointId: point.clientPointId,
    latitude: point.latitude,
    longitude: point.longitude,
    ...(point.accuracyM == null ? {} : { accuracyM: point.accuracyM }),
    capturedAt: point.capturedAt.toISOString(),
    createdAt: point.createdAt.toISOString(),
  };
}
