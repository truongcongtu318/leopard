import { act, renderHook, waitFor } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import type * as Location from 'expo-location';

import { useLiveTruckLocation, type LocationProvider } from './use-live-truck-location';

type WatchCallback = (position: Location.LocationObject) => void;

function createProvider(overrides?: { permissionStatus?: string }) {
  let emit: WatchCallback | null = null;
  const remove = jest.fn();

  const provider: LocationProvider = {
    requestForegroundPermissionsAsync: jest.fn(async () => ({
      status: overrides?.permissionStatus ?? 'granted',
    })),
    watchPositionAsync: jest.fn(
      async (_options: Location.LocationOptions, callback: WatchCallback) => {
        emit = callback;
        return { remove };
      },
    ) as unknown as LocationProvider['watchPositionAsync'],
  };

  return {
    remove,
    emitPosition: (lat: number, lng: number, heading?: number) => {
      emit?.({
        coords: { latitude: lat, longitude: lng, heading },
      } as unknown as Location.LocationObject);
    },
    provider,
  };
}

describe('useLiveTruckLocation', () => {
  it('reports no coordinate until a real GPS fix arrives', async () => {
    const { provider } = createProvider();
    const { result } = await renderHook(() => useLiveTruckLocation(true, provider));

    // Crucially it must not invent a fallback position.
    expect(result.current.coords).toBeNull();
  });

  it('streams the real device coordinate', async () => {
    const harness = createProvider();
    const { result } = await renderHook(() => useLiveTruckLocation(true, harness.provider));

    await waitFor(() => expect(harness.provider.watchPositionAsync).toHaveBeenCalled());

    await act(async () => {
      harness.emitPosition(10.7769, 106.7009, 45);
    });

    expect(result.current.coords).toEqual({ lat: 10.7769, lng: 106.7009 });
    expect(result.current.heading).toBe(45);
  });

  it('ignores the -1 heading expo reports when it cannot determine direction', async () => {
    const harness = createProvider();
    const { result } = await renderHook(() => useLiveTruckLocation(true, harness.provider));

    await waitFor(() => expect(harness.provider.watchPositionAsync).toHaveBeenCalled());

    await act(async () => {
      harness.emitPosition(10.7769, 106.7009, -1);
    });

    expect(result.current.coords).toEqual({ lat: 10.7769, lng: 106.7009 });
    expect(result.current.heading).toBeNull();
  });

  it('drops out-of-range coordinates instead of drawing them', async () => {
    const harness = createProvider();
    const { result } = await renderHook(() => useLiveTruckLocation(true, harness.provider));

    await waitFor(() => expect(harness.provider.watchPositionAsync).toHaveBeenCalled());

    await act(async () => {
      harness.emitPosition(999, 999);
    });

    expect(result.current.coords).toBeNull();
  });

  it('surfaces a denied permission without watching', async () => {
    const harness = createProvider({ permissionStatus: 'denied' });
    const { result } = await renderHook(() => useLiveTruckLocation(true, harness.provider));

    await waitFor(() => expect(result.current.isPermissionDenied).toBe(true));
    expect(harness.provider.watchPositionAsync).not.toHaveBeenCalled();
  });
});
