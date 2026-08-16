import type { PageQuery } from './api.js';

export interface AdminDashboardDto {
  totalUsers: number;
  totalOrders: number;
  activeFleets: number;
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

export interface AdminFleetSummaryDto {
  id: string;
  name: string;
  createdAt: string;
  driversCount: number;
}

export interface AdminFleetQuery extends PageQuery {
  q?: string;
}

export interface AdminUpdateUserStatusCommand {
  status: 'ACTIVE' | 'DISABLED';
  reason: string;
  clientRequestId: string;
}
