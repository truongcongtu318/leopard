import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { DriverIdleLocationPing, type IdleLocationHttpClient, type LocationProvider } from './idle-location-ping';

function createMockClient(): IdleLocationHttpClient {
  return {
    patch: jest.fn<IdleLocationHttpClient['patch']>().mockResolvedValue({}),
  };
}

function createMockLocation(
  coords: { latitude: number; longitude: number } = { latitude: 10.7326, longitude: 106.7168 },
) {
  return {
    requestForegroundPermissionsAsync: jest
      .fn<LocationProvider['requestForegroundPermissionsAsync']>()
      .mockResolvedValue({ status: 'granted' }),
    getCurrentPositionAsync: jest
      .fn<LocationProvider['getCurrentPositionAsync']>()
      .mockResolvedValue({ coords }),
  };
}

describe('DriverIdleLocationPing', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sends an immediate ping on start()', async () => {
    const client = createMockClient();
    const location = createMockLocation();
    const ping = new DriverIdleLocationPing(client, location, 12_000);

    ping.start();
    await jest.advanceTimersByTimeAsync(0);

    expect(client.patch).toHaveBeenCalledWith('/driver/location', {
      lat: 10.7326,
      lng: 106.7168,
    });
    ping.stop();
  });

  it('does not start a second interval if already running', async () => {
    const client = createMockClient();
    const location = createMockLocation();
    const ping = new DriverIdleLocationPing(client, location, 12_000);

    ping.start();
    ping.start();
    await jest.advanceTimersByTimeAsync(0);

    expect(client.patch).toHaveBeenCalledTimes(1);
    ping.stop();
  });

  it('stops sending pings after stop() is called', async () => {
    const client = createMockClient();
    const location = createMockLocation();
    const ping = new DriverIdleLocationPing(client, location, 12_000);

    ping.start();
    await jest.advanceTimersByTimeAsync(0);
    ping.stop();

    await jest.advanceTimersByTimeAsync(60_000);

    expect(client.patch).toHaveBeenCalledTimes(1);
    expect(ping.isRunning()).toBe(false);
  });

  it('skips sending a ping when the driver has not moved more than 25m', async () => {
    const client = createMockClient();
    const location = createMockLocation({ latitude: 10.7326, longitude: 106.7168 });
    const ping = new DriverIdleLocationPing(client, location, 12_000);

    ping.start();
    await jest.advanceTimersByTimeAsync(0);
    expect(client.patch).toHaveBeenCalledTimes(1);

    // Same position (0m movement) on the next tick.
    await jest.advanceTimersByTimeAsync(12_000);

    expect(client.patch).toHaveBeenCalledTimes(1);
    ping.stop();
  });

  it('sends a new ping once the driver moves more than 25m', async () => {
    const client = createMockClient();
    const location = createMockLocation({ latitude: 10.7326, longitude: 106.7168 });
    const ping = new DriverIdleLocationPing(client, location, 12_000);

    ping.start();
    await jest.advanceTimersByTimeAsync(0);
    expect(client.patch).toHaveBeenCalledTimes(1);

    // ~0.01 degrees latitude is roughly 1.1km away — well past the 25m threshold.
    location.getCurrentPositionAsync.mockResolvedValueOnce({
      coords: { latitude: 10.7426, longitude: 106.7168 },
    });

    await jest.advanceTimersByTimeAsync(12_000);

    expect(client.patch).toHaveBeenCalledTimes(2);
    ping.stop();
  });

  it('does not send a ping when location permission is denied', async () => {
    const client = createMockClient();
    const location: LocationProvider = {
      requestForegroundPermissionsAsync: jest
        .fn<LocationProvider['requestForegroundPermissionsAsync']>()
        .mockResolvedValue({ status: 'denied' }),
      getCurrentPositionAsync: jest.fn<LocationProvider['getCurrentPositionAsync']>(),
    };
    const ping = new DriverIdleLocationPing(client, location, 12_000);

    ping.start();
    await jest.advanceTimersByTimeAsync(0);

    expect(location.getCurrentPositionAsync).not.toHaveBeenCalled();
    expect(client.patch).not.toHaveBeenCalled();
    ping.stop();
  });
});
