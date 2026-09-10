import * as Location from 'expo-location';

import { httpClient } from '@leopard/mobile-core';

const PING_INTERVAL_MS = 12_000;
const MIN_MOVE_METERS = 25;
const EARTH_RADIUS_M = 6_371_000;

export type LatLng = Readonly<{ lat: number; lng: number }>;

export type IdleLocationHttpClient = {
  patch(path: string, body?: unknown): Promise<unknown>;
};

export type LocationProvider = {
  requestForegroundPermissionsAsync: () => Promise<{ status: string }>;
  getCurrentPositionAsync: (options?: {
    accuracy?: number;
  }) => Promise<{ coords: { latitude: number; longitude: number } }>;
};

const defaultLocationProvider: LocationProvider = {
  requestForegroundPermissionsAsync: () => Location.requestForegroundPermissionsAsync(),
  getCurrentPositionAsync: (options) => Location.getCurrentPositionAsync(options),
};

function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Reports the driver's coarse location while they are AVAILABLE (not on an active
 * order) so dispatch can find nearby drivers. Foreground-only for now — see
 * Dispatch Radar design doc, Phase 1 decision on background location permissions.
 */
export class DriverIdleLocationPing {
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastSent: LatLng | null = null;

  constructor(
    private readonly client: IdleLocationHttpClient = httpClient,
    private readonly location: LocationProvider = defaultLocationProvider,
    private readonly intervalMs: number = PING_INTERVAL_MS,
  ) {}

  isRunning(): boolean {
    return this.timer !== null;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.tick();
    }, this.intervalMs);
    void this.tick();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.lastSent = null;
  }

  private async tick(): Promise<void> {
    try {
      const { status } = await this.location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const position = await this.location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const next: LatLng = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      if (this.lastSent && distanceMeters(this.lastSent, next) < MIN_MOVE_METERS) {
        return;
      }

      await this.client.patch('/driver/location', next);
      this.lastSent = next;
    } catch {
      // Best-effort ping: a transient GPS/network failure should not stop the
      // interval, next tick will retry.
    }
  }
}

export function createDriverIdleLocationPing(
  client?: IdleLocationHttpClient,
  location?: LocationProvider,
): DriverIdleLocationPing {
  return new DriverIdleLocationPing(client, location);
}
