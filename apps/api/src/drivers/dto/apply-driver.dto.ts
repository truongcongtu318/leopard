import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import type { VehicleType } from '@prisma/client';

const VEHICLE_TYPES = ['MOTORBIKE', 'VAN', 'TRUCK'] as const satisfies readonly VehicleType[];

export class ApplyDriverDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  declare name: string;

  @IsIn(VEHICLE_TYPES)
  declare vehicleType: VehicleType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  declare licensePlate: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  declare licenseNumber: string;
}
