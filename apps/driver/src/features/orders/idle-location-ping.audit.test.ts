import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { DriverIdleLocationPing } from './idle-location-ping';

// Audit expectations express desired behavior. Known failures are deliberately
// retained as regression evidence.
describe('DriverIdleLocationPing audit: stationary radar heartbeat', () => {
  const patch = jest.fn<any>().mockResolvedValue(undefined);
  const client = { patch };
  const samePoint = { coords: { latitude: 10.7326, longitude: 106.7168 } };
  const location = {
    requestForegroundPermissionsAsync: jest.fn<any>().mockResolvedValue({ status: 'granted' }),
    getCurrentPositionAsync: jest.fn<any>().mockResolvedValue(samePoint),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('still PATCHes /driver/location on the 90s heartbeat even when the driver has not moved', async () => {
    const ping = new DriverIdleLocationPing(client as any, location as any, 12_000);
    ping.start();

    // 8 ticks * 12s = 96s of standing still — must have pinged at least once
    // past the 90s mark to keep the backend's lastKnownAt fresh.
    for (let i = 0; i < 8; i += 1) {
      await jest.advanceTimersByTimeAsync(12_000);
    }
    ping.stop();

    expect(patch).toHaveBeenCalledWith(
      '/driver/location',
      expect.objectContaining({ isStationaryHeartbeat: true }),
    );
    expect(patch.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
