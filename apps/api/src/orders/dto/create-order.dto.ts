import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { VehicleType, StopType } from '@prisma/client';

export class OrderStopInputDto {
  @IsOptional()
  @IsEnum(StopType)
  type?: StopType;

  @IsString()
  address!: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}

export class CreateOrderDto {
  @ValidateNested()
  @Type(() => OrderStopInputDto)
  pickup!: OrderStopInputDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderStopInputDto)
  stops?: OrderStopInputDto[];

  @ValidateNested()
  @Type(() => OrderStopInputDto)
  dropoff!: OrderStopInputDto;

  @IsEnum(VehicleType)
  vehicleType!: VehicleType;

  @IsOptional()
  @IsString()
  cargoNote?: string;

  @IsOptional()
  @IsNumber()
  cargoWeightKg?: number;

  @IsString()
  estimateToken!: string;

  @IsOptional()
  @IsString()
  clientRequestId?: string;
}

export class OrderQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pageSize?: number;
}

