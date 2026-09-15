import { describe, expect, it, jest } from '@jest/globals';

jest.mock('expo-location', () => ({
  Accuracy: { High: 6 },
  getCurrentPositionAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
}));

import {
  getDriverCurrentLocation,
  type DriverLocationProvider,
} from './driver-current-location';

function createProvider(): jest.Mocked<DriverLocationProvider> {
  return {
    getCurrentPositionAsync: jest.fn(),
    requestForegroundPermissionsAsync: jest.fn(),
  };
}

describe('getDriverCurrentLocation', () => {
  it('returns the real device coordinates after foreground permission is granted', async () => {
    const provider = createProvider();
    provider.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    provider.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 10.81234, longitude: 106.67123 },
    });

    await expect(getDriverCurrentLocation(provider)).resolves.toEqual({
      kind: 'ready',
      coords: { lat: 10.81234, lng: 106.67123 },
    });
    expect(provider.getCurrentPositionAsync).toHaveBeenCalledTimes(1);
  });

  it('does not invent fallback coordinates when location permission is denied', async () => {
    const provider = createProvider();
    provider.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });

    await expect(getDriverCurrentLocation(provider)).resolves.toEqual({
      kind: 'permission-denied',
    });
    expect(provider.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('reports an error when the GPS response contains invalid coordinates', async () => {
    const provider = createProvider();
    provider.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    provider.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: Number.NaN, longitude: 106.67123 },
    });

    await expect(getDriverCurrentLocation(provider)).resolves.toEqual({ kind: 'error' });
  });
});
