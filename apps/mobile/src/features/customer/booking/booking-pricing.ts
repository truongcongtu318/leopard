export type VehicleTypeId = 'BIKE_3W' | 'VAN_500KG' | 'TRUCK_125T' | 'TRUCK_25T';

export interface VehicleRateConfig {
  id: VehicleTypeId;
  name: string;
  tag: string;
  capacityKg: number;
  dimensions: string;
  etaMinutes: number;
  baseFareVnd: number;
  perKmVnd: number;
  loadingFeeVnd: number;
}

export const VEHICLE_RATES: Record<VehicleTypeId, VehicleRateConfig> = {
  BIKE_3W: {
    id: 'BIKE_3W',
    name: 'Xe Ba Gác',
    tag: 'Tiết kiệm',
    capacityKg: 500,
    dimensions: '1.4×1.0×1.2m',
    etaMinutes: 5,
    baseFareVnd: 70_000,
    perKmVnd: 10_000,
    loadingFeeVnd: 60_000,
  },
  VAN_500KG: {
    id: 'VAN_500KG',
    name: 'Xe Van 500kg',
    tag: 'Đô thị',
    capacityKg: 500,
    dimensions: '1.8×1.2×1.2m',
    etaMinutes: 8,
    baseFareVnd: 130_000,
    perKmVnd: 14_000,
    loadingFeeVnd: 100_000,
  },
  TRUCK_125T: {
    id: 'TRUCK_125T',
    name: 'Xe Tải 1.25 Tấn',
    tag: 'Phổ biến',
    capacityKg: 1_250,
    dimensions: '3.2×1.6×1.7m',
    etaMinutes: 12,
    baseFareVnd: 200_000,
    perKmVnd: 18_000,
    loadingFeeVnd: 150_000,
  },
  TRUCK_25T: {
    id: 'TRUCK_25T',
    name: 'Xe Tải 2.5 Tấn',
    tag: 'Tải lớn',
    capacityKg: 2_500,
    dimensions: '4.3×1.8×1.9m',
    etaMinutes: 15,
    baseFareVnd: 320_000,
    perKmVnd: 22_000,
    loadingFeeVnd: 250_000,
  },
};

export const STOP_SURCHARGE_VND = 30_000;
export const VAT_RATE = 0.08;

export interface BookingPricingInput {
  vehicleId: VehicleTypeId;
  distanceKm: number;
  stopCount?: number;
  hasLoadingSupport?: boolean;
  hasVatInvoice?: boolean;
}

export interface BookingPricingBreakdown {
  vehicleId: VehicleTypeId;
  vehicleName: string;
  baseFare: number;
  distanceFare: number;
  stopFare: number;
  transportFare: number;
  loadingFee: number;
  subtotal: number;
  vatFee: number;
  totalFare: number;
}

export function calculateBookingFare(input: BookingPricingInput): BookingPricingBreakdown {
  const rate = VEHICLE_RATES[input.vehicleId] ?? VEHICLE_RATES.TRUCK_125T;
  const stopCount = Math.max(0, input.stopCount ?? 0);
  const distanceFare = Math.round(input.distanceKm * rate.perKmVnd);
  const stopFare = stopCount * STOP_SURCHARGE_VND;
  const transportFare = Math.max(rate.baseFareVnd, distanceFare) + stopFare;

  const loadingFee = input.hasLoadingSupport ? rate.loadingFeeVnd : 0;
  const subtotal = transportFare + loadingFee;
  const vatFee = input.hasVatInvoice ? Math.round(subtotal * VAT_RATE) : 0;
  const totalFare = subtotal + vatFee;

  return {
    vehicleId: rate.id,
    vehicleName: rate.name,
    baseFare: rate.baseFareVnd,
    distanceFare,
    stopFare,
    transportFare,
    loadingFee,
    subtotal,
    vatFee,
    totalFare,
  };
}
