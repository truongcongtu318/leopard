import { describe, expect, it } from 'vitest';

import {
  DriverAvailability,
  FleetMemberRole,
  FleetMemberStatus,
  MediaType,
  OrderStatus,
  parsePageQuery,
  PaymentStatus,
  ProviderSource,
  Role,
  StopType,
  UserStatus,
  VehicleType,
} from './index.js';
import type { Page } from './index.js';

describe('shared domain contracts', () => {
  it('defines the canonical baseline enum values', () => {
    expect({
      Role,
      UserStatus,
      FleetMemberRole,
      FleetMemberStatus,
      DriverAvailability,
      OrderStatus,
      StopType,
      MediaType,
      PaymentStatus,
      ProviderSource,
      VehicleType,
    }).toEqual({
      Role: ['CUSTOMER', 'DRIVER', 'FLEET_OWNER', 'ADMIN'],
      UserStatus: ['ACTIVE', 'DISABLED'],
      FleetMemberRole: ['OWNER', 'DRIVER'],
      FleetMemberStatus: ['INVITED', 'ACTIVE', 'REMOVED'],
      DriverAvailability: ['OFFLINE', 'AVAILABLE', 'BUSY'],
      OrderStatus: ['REQUESTED', 'ACCEPTED', 'PICKING_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'],
      StopType: ['PICKUP', 'STOP', 'DROPOFF'],
      MediaType: ['CARGO', 'DELIVERY_PROOF'],
      PaymentStatus: ['UNPAID', 'QR_CREATED', 'PAID_MANUAL', 'FAILED'],
      ProviderSource: ['VIETMAP', 'DEMO', 'PAYOS', 'VIETQR', 'LOCAL', 'S3'],
      VehicleType: ['MOTORBIKE', 'VAN', 'TRUCK'],
    });
    expect(ProviderSource).not.toContain('FIREBASE');
  });

  it('uses the documented pagination response shape', () => {
    const page: Page<{ id: string }> = {
      items: [{ id: 'order-1' }],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    };

    expect(page).toEqual({
      items: [{ id: 'order-1' }],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it('rejects page sizes above 100', () => {
    expect(() => parsePageQuery({ page: '2', pageSize: '101' })).toThrow(
      'pageSize must be between 1 and 100',
    );
  });
});
