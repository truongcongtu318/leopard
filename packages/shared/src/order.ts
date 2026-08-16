import type { ProviderSource } from './enums.js';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface RouteEstimate {
  polyline: string;
  distanceM: number;
  durationS: number;
  estimatedArrivalAt: string;
  estimatedPriceVnd: number;
  source: ProviderSource;
  calculatedAt: string;
  isEstimate: boolean;
}

export interface OrderStopDto {
  type: string;
  address: string;
  contactName?: string;
  contactPhone?: string;
  note?: string;
}

export interface OrderTimelineDto {
  status: string;
  timestamp: string;
  note?: string;
}

export interface OrderDetailDto {
  id: string;
  code: string;
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  stopsCount: number;
  vehicleType: string;
  totalDistanceKm: number;
  estimatedDurationMin: number;
  priceVnd: number;
  createdAt: string;
  driverName?: string;
  driverPhone?: string;
  driverVehiclePlate?: string;
  paymentStatus: string;
  cargoDescription: string;
  weightKg: number;
  stops: OrderStopDto[];
  timeline: OrderTimelineDto[];
}
