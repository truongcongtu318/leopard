import { describe, expect, it, jest } from '@jest/globals';

import { DispatchService } from './dispatch.service.js';
import type { DriversRepository } from '../drivers/drivers.repository.js';

function createMockDriversRepository() {
  return {
    findNearbyAvailableDrivers: jest.fn<DriversRepository['findNearbyAvailableDrivers']>(),
  };
}

describe('DispatchService', () => {
  it('delegates to DriversRepository.findNearbyAvailableDrivers with default radius and limit', async () => {
    const driversRepository = createMockDriversRepository();
    driversRepository.findNearbyAvailableDrivers.mockResolvedValue([
      { userId: 'drv-1', distanceM: 120 },
      { userId: 'drv-2', distanceM: 480 },
    ]);

    const service = new DispatchService(driversRepository as unknown as DriversRepository);
    const result = await service.findCandidates({ lat: 10.7326, lng: 106.7168 });

    expect(driversRepository.findNearbyAvailableDrivers).toHaveBeenCalledWith(
      10.7326,
      106.7168,
      3_000,
      6,
      undefined,
      [],
    );
    expect(result).toEqual([
      { userId: 'drv-1', distanceM: 120 },
      { userId: 'drv-2', distanceM: 480 },
    ]);
  });

  it('forwards a custom radius and limit', async () => {
    const driversRepository = createMockDriversRepository();
    driversRepository.findNearbyAvailableDrivers.mockResolvedValue([]);

    const service = new DispatchService(driversRepository as unknown as DriversRepository);
    await service.findCandidates({ lat: 1, lng: 2 }, 6_000, 10);

    expect(driversRepository.findNearbyAvailableDrivers).toHaveBeenCalledWith(1, 2, 6_000, 10, undefined, []);
  });

  it('forwards vehicleType through to the repository so candidates are pre-filtered', async () => {
    const driversRepository = createMockDriversRepository();
    driversRepository.findNearbyAvailableDrivers.mockResolvedValue([]);

    const service = new DispatchService(driversRepository as unknown as DriversRepository);
    await service.findCandidates({ lat: 10.7326, lng: 106.7168 }, 3_000, 6, 'TRUCK');

    expect(driversRepository.findNearbyAvailableDrivers).toHaveBeenCalledWith(
      10.7326,
      106.7168,
      3_000,
      6,
      'TRUCK',
      [],
    );
  });

  it('forwards excludeDriverIds through to the repository', async () => {
    const driversRepository = createMockDriversRepository();
    driversRepository.findNearbyAvailableDrivers.mockResolvedValue([]);

    const service = new DispatchService(driversRepository as unknown as DriversRepository);
    await service.findCandidates({ lat: 10.7326, lng: 106.7168 }, 6_000, 6, 'TRUCK', ['drv-1']);

    expect(driversRepository.findNearbyAvailableDrivers).toHaveBeenCalledWith(
      10.7326,
      106.7168,
      6_000,
      6,
      'TRUCK',
      ['drv-1'],
    );
  });
});
