import type { PageQuery } from './api.js';

export interface AdminDashboardDto {
  totalUsers: number;
  totalOrders: number;
  revenueVnd: number;
}

export interface AdminUserSummaryDto {
  id: string;
  phone: string;
  role: string;
  status: string;
  createdAt: string;
}

export interface AdminUserQuery extends PageQuery {
  role?: string;
  status?: string;
  q?: string;
}

export interface AdminUpdateUserStatusCommand {
  status: 'ACTIVE' | 'DISABLED';
  reason: string;
  clientRequestId: string;
}

export interface AdminDriverSummaryDto {
  id: string;
  name: string;
  phone: string;
  status: string;
  availability: string;
  vehicleType: string;
  lastKnownAt?: string | null;
}

export interface AdminDriverQuery extends PageQuery {
  status?: string;
  q?: string;
}

export interface AdminOrderSummaryDto {
  id: string;
  code: string;
  status: string;
  driverId?: string | undefined;
  driverName?: string | undefined;
  customerPhone: string | null;
  pickupLabel: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffLabel: string;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  paymentStatus: string;
  priceVnd: number;
  createdAt: string;
  updatedAt: string;
  distanceMeters: number;
}

export interface AdminOrderQuery extends PageQuery {
  driverId?: string;
  status?: string;
  from?: string;
  to?: string;
  q?: string;
}
