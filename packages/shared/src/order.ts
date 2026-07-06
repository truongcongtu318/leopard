import type { PaymentStatus } from "./payment";

export const vehicleTypes = ["VAN", "SMALL_TRUCK", "MEDIUM_TRUCK"] as const;

export type VehicleType = (typeof vehicleTypes)[number];

export const orderStatuses = [
  "REQUESTED",
  "ACCEPTED",
  "PICKING_UP",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED"
] as const;

export type OrderStatus = (typeof orderStatuses)[number];

export interface GeoPointDto {
  address: string;
  lat: number;
  lng: number;
}

export interface OrderStopDto extends GeoPointDto {
  sequence: number;
}

export interface CreateOrderRequest {
  pickup: GeoPointDto;
  dropoff: GeoPointDto;
  stops: OrderStopDto[];
  vehicleType: VehicleType;
  cargoNotes?: string;
}

export interface OrderDto {
  id: string;
  customerId: string;
  driverId: string | null;
  pickup: GeoPointDto;
  dropoff: GeoPointDto;
  stops: OrderStopDto[];
  vehicleType: VehicleType;
  cargoNotes: string | null;
  status: OrderStatus;
  distanceKm: number;
  etaMinutes: number;
  estimatedPriceVnd: number;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}
