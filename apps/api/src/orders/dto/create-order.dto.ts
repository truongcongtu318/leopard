import { VehicleType, StopType } from '@prisma/client';

export interface OrderStopInputDto {
  type: StopType;
  address: string;
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
}

export interface CreateOrderDto {
  pickup: OrderStopInputDto;
  stops?: OrderStopInputDto[];
  dropoff: OrderStopInputDto;
  vehicleType: VehicleType;
  cargoNote?: string;
  cargoWeightKg?: number;
  estimateToken: string;
}

export interface OrderQueryDto {
  page?: number;
  pageSize?: number;
}
