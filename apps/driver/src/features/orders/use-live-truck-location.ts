import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import type { MapCoordinate } from '@leopard/mobile-core';

export type LiveTruckLocation = Readonly<{
  /** Latest real GPS fix, or null while it is still unknown. */
  coords: MapCoordinate | null;
  /** Null until the first fix resolves; then a real heading in degrees. */
  heading: number | null;
  isPermissionDenied: boolean;
}>;

export type LocationProvider = Readonly<{
  requestForegroundPermissionsAsync: () => Promise<{ status: string }>;
  watchPositionAsync: (
    options: Location.LocationOptions,
    callback: (position: Location.LocationObject) => void,
  ) => Promise<{ remove: () => void }>;
}>;

const expoProvider: LocationProvider = {
  requestForegroundPermissionsAsync: () => Location.requestForegroundPermissionsAsync(),
  watchPositionAsync: (options, callback) =>
    Location.watchPositionAsync(options, callback) as unknown as Promise<{
      remove: () => void;
    }>,
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

/**
 * Streams the truck's real GPS position onto the mission map.
 *
 * The cockpit map previously read the driver position once on mount and then
 * substituted a hardcoded Hanoi coordinate whenever the fix fell outside a
 * narrow latitude band — so the vehicle marker either froze at the pickup point
 * or drew a position the driver had never been at. This hook never invents a
 * coordinate: when there is no fix the caller gets `null` and must hide the
 * marker instead of drawing a guess.
 */
export function useLiveTruckLocation(
  enabled = true,
  provider: LocationProvider = expoProvider,
): LiveTruckLocation {
  const [coords, setCoords] = useState<MapCoordinate | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);

  useEffect(() => {
    if (!enabled) return undefined;

    let subscription: { remove: () => void } | null = null;
    let cancelled = false;

    async function startWatching() {
      try {
        const permission = await provider.requestForegroundPermissionsAsync();
        if (cancelled) return;

        if (permission.status !== 'granted') {
          setIsPermissionDenied(true);
          return;
        }

        setIsPermissionDenied(false);
        subscription = await provider.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
          (position) => {
            const { latitude, longitude, heading: rawHeading } = position.coords;
            if (!isValidCoordinate(latitude, longitude)) return;
            setCoords({ lat: latitude, lng: longitude });
            // expo-location reports -1 when the device cannot determine a
            // heading (e.g. standing still), which must not rotate the marker.
            if (typeof rawHeading === 'number' && rawHeading >= 0) {
              setHeading(rawHeading);
            }
          },
        );
        if (cancelled && subscription) {
          subscription.remove();
          subscription = null;
        }
      } catch {
        if (!cancelled) setIsPermissionDenied(false);
      }
    }

    void startWatching();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [enabled, provider]);

  return { coords, heading, isPermissionDenied };
}
