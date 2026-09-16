import { Injectable } from '@nestjs/common';
import type { VehicleType } from '@prisma/client';

import { DriversRepository } from '../drivers/drivers.repository.js';
import { CANDIDATE_LIMIT, REDISPATCH_RADII_M } from './dispatch.constants.js';

@Injectable()
export class DispatchService {
  constructor(private readonly driversRepository: DriversRepository) {}

  async findCandidates(
    pickup: { lat: number; lng: number },
    radiusM: number = REDISPATCH_RADII_M[0]!,
    limit: number = CANDIDATE_LIMIT,
    vehicleType?: VehicleType,
    excludeDriverIds: string[] = [],
  ): Promise<Array<{ userId: string; distanceM: number }>> {
    return this.driversRepository.findNearbyAvailableDrivers(
      pickup.lat,
      pickup.lng,
      radiusM,
      limit,
      vehicleType,
      excludeDriverIds,
    );
  }
}
