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
    maximumAge?: number;
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
const STATIONARY_HEARTBEAT_MS = 45_000;
const STALE_AFTER_MS = 60_000;

export type IdlePingHealth = 'idle' | 'healthy' | 'permission-denied' | 'stale';

export class DriverIdleLocationPing {
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastSent: LatLng | null = null;
  private lastSentAt: number | null = null;
  private health: IdlePingHealth = 'idle';
  private readonly healthSubscribers = new Set<(health: IdlePingHealth) => void>();

  constructor(
    private readonly client: IdleLocationHttpClient = httpClient,
    private readonly location: LocationProvider = defaultLocationProvider,
    private readonly intervalMs: number = PING_INTERVAL_MS,
  ) {}

  isRunning(): boolean {
    return this.timer !== null;
  }

  getHealth(): IdlePingHealth {
    return this.health;
  }

  /** Mirrors `DriverTrackingSender.observeHealth` — immediately replays the
   * current state, then notifies on every change. */
  observeHealth(callback: (health: IdlePingHealth) => void): { unsubscribe: () => void } {
    callback(this.health);
    this.healthSubscribers.add(callback);
    return { unsubscribe: () => this.healthSubscribers.delete(callback) };
  }

  private setHealth(next: IdlePingHealth): void {
    if (this.health === next) return;
    this.health = next;
    for (const subscriber of this.healthSubscribers) subscriber(next);
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
    this.lastSentAt = null;
    this.setHealth('idle');
  }

  private async tick(): Promise<void> {
    try {
      const { status } = await this.location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        this.setHealth('permission-denied');
        return;
      }

      const position = await this.location.getCurrentPositionAsync({
        // expo-location's web shim only sets enableHighAccuracy when
        // accuracy > Balanced, so Balanced silently falls back to coarse
        // IP-based geolocation — use High so web picks up real GPS like the
        // customer app's location button does. It also defaults
        // maximumAge to Infinity on web regardless of accuracy, so a single
        // stale/coarse fix gets served forever after — force maximumAge: 0
        // so every tick asks the browser for a fresh position.
        accuracy: Location.Accuracy.High,
        maximumAge: 0,
      });
      const next: LatLng = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      if (this.lastSent && distanceMeters(this.lastSent, next) < MIN_MOVE_METERS) {
        const elapsed = this.lastSentAt !== null ? Date.now() - this.lastSentAt : 0;
        if (elapsed < STATIONARY_HEARTBEAT_MS) {
          if (elapsed > STALE_AFTER_MS) this.setHealth('stale');
          return;
        }
        await this.client.patch('/driver/location', {
          ...next,
          isStationaryHeartbeat: true,
        });
        this.lastSent = next;
        this.lastSentAt = Date.now();
        this.setHealth('healthy');
        return;
      }

      await this.client.patch('/driver/location', next);
      this.lastSent = next;
      this.lastSentAt = Date.now();
      this.setHealth('healthy');
    } catch {
      // Best-effort ping: a transient GPS/network failure should not stop the
      // interval, next tick will retry — but do surface it as stale so the
      // driver isn't left believing they're visible to dispatch.
      this.setHealth('stale');
    }
  }
}

export function createDriverIdleLocationPing(
  client?: IdleLocationHttpClient,
  location?: LocationProvider,
): DriverIdleLocationPing {
  return new DriverIdleLocationPing(client, location);
}
