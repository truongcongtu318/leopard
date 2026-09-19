import { describe, expect, it, test } from 'vitest';
import { PaymentErrorCode, MediaErrorCode } from './errors.js';

import {
  DriverAvailability,
  MediaType,
  OrderStatus,
  parsePageQuery,
  PaymentStatus,
  ProviderSource,
  Role,
  StopType,
  UserStatus,
  VehicleType,
  WithdrawalStatus,
} from './index.js';
import type { Page } from './index.js';

describe('shared domain contracts', () => {
  it('defines the canonical baseline enum values', () => {
    expect({
      Role,
      UserStatus,
      DriverAvailability,
      OrderStatus,
      StopType,
      MediaType,
      PaymentStatus,
      ProviderSource,
      VehicleType,
      WithdrawalStatus,
    }).toEqual({
      Role: ['CUSTOMER', 'DRIVER', 'ADMIN'],
      UserStatus: ['ACTIVE', 'DISABLED'],
      DriverAvailability: ['OFFLINE', 'AVAILABLE', 'BUSY'],
      OrderStatus: [
        'PENDING_PAYMENT',
        'REQUESTED',
        'ACCEPTED',
        'PICKING_UP',
        'IN_TRANSIT',
        'DELIVERED',
        'CANCELLED',
        'INCIDENT_CANCELLED',
        'RETURNING',
        'RETURNED',
      ],
      StopType: ['PICKUP', 'STOP', 'DROPOFF'],
      MediaType: ['CARGO', 'PICKUP_PROOF', 'DELIVERY_PROOF'],
      PaymentStatus: ['UNPAID', 'QR_CREATED', 'PAID_MANUAL', 'FAILED'],
      ProviderSource: ['VIETMAP', 'DEMO', 'PAYOS', 'VIETQR', 'LOCAL', 'S3'],
      VehicleType: ['MOTORBIKE', 'VAN', 'TRUCK'],
      WithdrawalStatus: ['PENDING', 'APPROVED', 'REJECTED'],
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

  test('payment and media error codes are defined', () => {
    expect(PaymentErrorCode).toBeDefined();
    expect(PaymentErrorCode.activeIntentConflict).toBe('PAYMENT_ACTIVE_INTENT_CONFLICT');
    expect(MediaErrorCode.unsupportedType).toBe('MEDIA_UNSUPPORTED_TYPE');
  });
});
