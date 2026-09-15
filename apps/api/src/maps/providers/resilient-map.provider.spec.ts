import { describe, expect, it, jest } from '@jest/globals';

import { MapProviderNotFoundError, type MapProvider } from './map-provider.js';
import { ResilientMapProvider } from './resilient-map.provider.js';

function createProvider(overrides: Partial<MapProvider> = {}): MapProvider {
  return {
    search: jest.fn(),
    geocode: jest.fn(),
    route: jest.fn(),
    ...overrides,
  };
}

describe('ResilientMapProvider', () => {
  it('returns the primary provider result when the primary call succeeds', async () => {
    const primary = createProvider({
      search: jest.fn().mockResolvedValue([]),
    });
    const demo = createProvider();
    const provider = new ResilientMapProvider(primary, demo, { allowDemoProvider: true });

    await provider.search('query');

    expect(primary.search).toHaveBeenCalledWith('query');
    expect(demo.search).not.toHaveBeenCalled();
  });

  it('falls back to the demo provider for search when the primary fails and allowDemoProvider is true', async () => {
    const primary = createProvider({
      search: jest.fn().mockRejectedValue(new Error('down')),
    });
    const demo = createProvider({
      search: jest.fn().mockResolvedValue([]),
    });
    const provider = new ResilientMapProvider(primary, demo, { allowDemoProvider: true });

    await provider.search('query');

    expect(demo.search).toHaveBeenCalledWith('query');
  });

  it('does not fall back to demo when allowDemoProvider is false', async () => {
    const primaryError = new Error('down');
    const primary = createProvider({
      geocode: jest.fn().mockRejectedValue(primaryError),
    });
    const demo = createProvider();
    const provider = new ResilientMapProvider(primary, demo, { allowDemoProvider: false });

    await expect(provider.geocode('place-1')).rejects.toBe(primaryError);
    expect(demo.geocode).not.toHaveBeenCalled();
  });

  it('rethrows MapProviderNotFoundError without falling back to demo', async () => {
    const notFoundError = new MapProviderNotFoundError();
    const primary = createProvider({
      geocode: jest.fn().mockRejectedValue(notFoundError),
    });
    const demo = createProvider();
    const provider = new ResilientMapProvider(primary, demo, { allowDemoProvider: true });

    await expect(provider.geocode('place-1')).rejects.toBe(notFoundError);
    expect(demo.geocode).not.toHaveBeenCalled();
  });

  it('never falls back to demo for TRUCK routes even when allowDemoProvider is true', async () => {
    const primaryError = new Error('Vietmap unavailable');
    const primary: MapProvider = {
      search: jest.fn(),
      geocode: jest.fn(),
      route: jest.fn().mockRejectedValue(primaryError),
    };
    const demo: MapProvider = {
      search: jest.fn(),
      geocode: jest.fn(),
      route: jest.fn().mockResolvedValue([]),
    };
    const provider = new ResilientMapProvider(primary, demo, { allowDemoProvider: true });

    await expect(
      provider.route({
        pickup: { latitude: 10, longitude: 106 },
        stops: [],
        dropoff: { latitude: 10.1, longitude: 106.1 },
        vehicleType: 'TRUCK',
        cargoWeightKg: 1000,
      }),
    ).rejects.toBe(primaryError);
    expect(demo.route).not.toHaveBeenCalled();
  });

  it('still falls back to demo for non-TRUCK routes when allowDemoProvider is true', async () => {
    const primary: MapProvider = {
      search: jest.fn(),
      geocode: jest.fn(),
      route: jest.fn().mockRejectedValue(new Error('down')),
    };
    const demo: MapProvider = {
      search: jest.fn(),
      geocode: jest.fn(),
      route: jest.fn().mockResolvedValue([]),
    };
    const provider = new ResilientMapProvider(primary, demo, { allowDemoProvider: true });

    await provider.route({
      pickup: { latitude: 10, longitude: 106 },
      stops: [],
      dropoff: { latitude: 10.1, longitude: 106.1 },
      vehicleType: 'MOTORBIKE',
    });

    expect(demo.route).toHaveBeenCalled();
  });
});
