import { describe, expect, it } from 'vitest';

import { createOrderSchema, geoPointSchema, pageQuerySchema } from './index.js';

const pickup = {
  label: 'Ben Thanh Market',
  latitude: 10.772,
  longitude: 106.698,
};

const dropoff = {
  label: 'Tan Son Nhat Airport',
  latitude: 10.818,
  longitude: 106.652,
};

describe('shared request schemas', () => {
  it('accepts an order with pickup and dropoff only', () => {
    const result = createOrderSchema.safeParse({
      pickup,
      stops: [],
      dropoff,
      vehicleType: 'MOTORBIKE',
      cargoNote: 'Small parcel',
      estimateToken: 'signed-estimate-token',
    });

    expect(result.success).toBe(true);
  });

  it('accepts an order with three intermediate stops', () => {
    const result = createOrderSchema.safeParse({
      pickup,
      stops: [
        { label: 'Stop 1', latitude: 10.78, longitude: 106.69 },
        { label: 'Stop 2', latitude: 10.79, longitude: 106.68 },
        { label: 'Stop 3', latitude: 10.8, longitude: 106.67 },
      ],
      dropoff,
      vehicleType: 'VAN',
      cargoNote: 'Three-stop delivery',
      estimateToken: 'signed-estimate-token',
    });

    expect(result.success).toBe(true);
  });

  it('rejects a vehicle type outside the shared contract', () => {
    const result = createOrderSchema.safeParse({
      pickup,
      stops: [],
      dropoff,
      vehicleType: 'BICYCLE',
      cargoNote: 'Unsupported vehicle',
      estimateToken: 'signed-estimate-token',
    });

    expect(result.success).toBe(false);
  });

  it('rejects latitude outside the geographic range', () => {
    expect(geoPointSchema.safeParse({ latitude: 90.001, longitude: 106.7 }).success).toBe(false);
  });

  it('rejects longitude outside the geographic range', () => {
    expect(geoPointSchema.safeParse({ latitude: 10.7, longitude: 180.001 }).success).toBe(false);
  });

  it('rejects an order with four intermediate stops', () => {
    const result = createOrderSchema.safeParse({
      pickup,
      stops: [
        { label: 'Stop 1', latitude: 10.78, longitude: 106.69 },
        { label: 'Stop 2', latitude: 10.79, longitude: 106.68 },
        { label: 'Stop 3', latitude: 10.8, longitude: 106.67 },
        { label: 'Stop 4', latitude: 10.81, longitude: 106.66 },
      ],
      dropoff,
      vehicleType: 'TRUCK',
      cargoNote: 'Too many stops',
      estimateToken: 'signed-estimate-token',
    });

    expect(result.success).toBe(false);
  });

  it('rejects blank location labels', () => {
    const result = createOrderSchema.safeParse({
      pickup: { ...pickup, label: '   ' },
      stops: [],
      dropoff,
      vehicleType: 'MOTORBIKE',
      cargoNote: 'Small parcel',
      estimateToken: 'signed-estimate-token',
    });

    expect(result.success).toBe(false);
  });

  it('enforces the documented pilot cargo-weight range', () => {
    const baseOrder = {
      pickup,
      stops: [],
      dropoff,
      vehicleType: 'MOTORBIKE',
      cargoNote: 'Weight boundary',
      estimateToken: 'signed-estimate-token',
    } as const;

    expect(createOrderSchema.safeParse({ ...baseOrder, cargoWeightKg: 0 }).success).toBe(true);
    expect(createOrderSchema.safeParse({ ...baseOrder, cargoWeightKg: -1 }).success).toBe(false);
    expect(createOrderSchema.safeParse({ ...baseOrder, cargoWeightKg: 10_001 }).success).toBe(false);
  });

  it('rejects page sizes above 100', () => {
    expect(pageQuerySchema.safeParse({ page: '2', pageSize: '101' }).success).toBe(false);
  });
});
