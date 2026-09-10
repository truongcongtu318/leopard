import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
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

  // Deliberately lenient at the pipe level: only the *type* is checked here.
  // Whether the value is the literal `true` required to proceed is a domain
  // rule (CONTRACT_NOT_ACCEPTED/422), enforced in DriverApplicationService —
  // so `false` and "missing" must both reach that check, not be rejected
  // earlier as a generic validation error.
  @IsOptional()
  @IsBoolean()
  declare contractAccepted?: boolean;

  // Either a typed signature (plain string, ≤120 chars) or a base64 image
  // data-URI. Deliberately unvalidated beyond "is it a string" here — magic
  // bytes / size / data-URI shape are checked by parseSignatureInput at the
  // domain boundary, since the declared type/shape must never be trusted.
  @IsOptional()
  @IsString()
  declare signature?: string;
}
