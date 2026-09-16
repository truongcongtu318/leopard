import * as Location from 'expo-location';

import type { MapCoordinate } from '@leopard/mobile-core';

export type DriverLocationState =
  | Readonly<{ kind: 'loading' }>
  | Readonly<{ kind: 'ready'; coords: MapCoordinate }>
  | Readonly<{ kind: 'permission-denied' }>
  | Readonly<{ kind: 'error' }>;

export type DriverLocationProvider = Readonly<{
  requestForegroundPermissionsAsync: () => Promise<{ status: string }>;
  getCurrentPositionAsync: (options?: { accuracy?: number; maximumAge?: number }) => Promise<{
    coords: { latitude: number; longitude: number };
  }>;
}>;

const expoLocationProvider: DriverLocationProvider = {
  requestForegroundPermissionsAsync: () => Location.requestForegroundPermissionsAsync(),
  getCurrentPositionAsync: (options) => Location.getCurrentPositionAsync(options),
};

function isValidCoordinate(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export async function getDriverCurrentLocation(
  provider: DriverLocationProvider = expoLocationProvider,
): Promise<DriverLocationState> {
  try {
    const permission = await provider.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      return { kind: 'permission-denied' };
    }

    const position = await provider.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      // expo-location's web shim defaults maximumAge to Infinity, so once a
      // stale/coarse fix is cached in this tab it gets served forever —
      // force a fresh read every time this is called.
      maximumAge: 0,
    });
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;

    if (!isValidCoordinate(latitude, longitude)) {
      return { kind: 'error' };
    }

    return {
      kind: 'ready',
      coords: { lat: latitude, lng: longitude },
    };
  } catch {
    return { kind: 'error' };
  }
}
