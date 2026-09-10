import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDefined,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Matches,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { VehicleType, StopType } from '@prisma/client';

export class OrderStopInputDto {
  @IsOptional()
  @IsEnum(StopType)
  type?: StopType;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(500)
  address!: string;

  @ValidateIf((stop: OrderStopInputDto) => stop.latitude === undefined || stop.lat !== undefined)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(-90)
  @Max(90)
  lat?: number;

  @ValidateIf((stop: OrderStopInputDto) => stop.longitude === undefined || stop.lng !== undefined)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(-180)
  @Max(180)
  lng?: number;

  @ValidateIf((stop: OrderStopInputDto) => stop.lat === undefined || stop.latitude !== undefined)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ValidateIf((stop: OrderStopInputDto) => stop.lng === undefined || stop.longitude !== undefined)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(-180)
  @Max(180)
  longitude?: number;
}

export class CreateOrderDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => OrderStopInputDto)
  pickup!: OrderStopInputDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => OrderStopInputDto)
  stops?: OrderStopInputDto[];

  @IsDefined()
  @ValidateNested()
  @Type(() => OrderStopInputDto)
  dropoff!: OrderStopInputDto;

  @IsEnum(VehicleType)
  vehicleType!: VehicleType;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(1000)
  cargoNote?: string;

  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  @Max(10_000)
  cargoWeightKg?: number;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  estimateToken!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(128)
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

