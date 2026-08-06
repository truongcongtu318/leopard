import { DriverAvailability } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateAvailabilityDto {
  @IsEnum(DriverAvailability)
  availability!: DriverAvailability;
}

