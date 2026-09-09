import { Injectable } from '@nestjs/common';

import { DriversRepository } from '../drivers/drivers.repository.js';

const DEFAULT_RADIUS_M = 3_000;
const DEFAULT_CANDIDATE_LIMIT = 6;

@Injectable()
export class DispatchService {
  constructor(private readonly driversRepository: DriversRepository) {}

  async findCandidates(
    pickup: { lat: number; lng: number },
    radiusM: number = DEFAULT_RADIUS_M,
    limit: number = DEFAULT_CANDIDATE_LIMIT,
  ): Promise<Array<{ userId: string; distanceM: number }>> {
    return this.driversRepository.findNearbyAvailableDrivers(
      pickup.lat,
      pickup.lng,
      radiusM,
      limit,
    );
  }
}
