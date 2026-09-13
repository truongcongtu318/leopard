import { DriverAvailability } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export class UpdateAvailabilityDto {
  @IsEnum(DriverAvailability)
  availability!: DriverAvailability;

  @IsOptional()
  @IsBoolean()
  autoOfflineOnComplete?: boolean;
}
