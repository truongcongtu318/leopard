export interface TrackingPointDto {
  id: string;
  orderId: string;
  driverId: string;
  lat: number;
  lng: number;
  recordedAt: string;
}

export interface SendTrackingPointRequest {
  orderId: string;
  lat: number;
  lng: number;
}
