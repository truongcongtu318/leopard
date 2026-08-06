import type { DriverAvailability } from '@prisma/client';

export interface UpdateAvailabilityDto {
  availability: DriverAvailability;
}
