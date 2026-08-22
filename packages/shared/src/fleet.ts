import type { PageQuery } from './api.js';

export interface FleetProfileDto {
  id: string;
  name: string;
  createdAt: string;
  driversCount: number;
  activeOrdersCount: number;
  todayRevenueVnd: number;
}

export interface FleetDriverSummaryDto {
  id: string;
  name: string;
  phone: string;
  status: string;
  availability: string;
  vehicleType: string;
  lastKnownAt?: string | null;
  membershipStatus: string | null;
  fleetName: string | null;
}

export interface FleetDriverQuery extends PageQuery {
  status?: string;
  q?: string;
}

export interface FleetOrderSummaryDto {
  id: string;
  code: string;
  status: string;
  driverId?: string | undefined;
  driverName?: string | undefined;
  customerPhone: string | null;
  pickupLabel: string;
  dropoffLabel: string;
  paymentStatus: string;
  priceVnd: number;
  createdAt: string;
  updatedAt: string;
  distanceMeters: number;
}

export interface FleetOrderQuery extends PageQuery {
  driverId?: string;
  status?: string;
  from?: string;
  to?: string;
  q?: string;
}
