import { useCallback } from 'react';

import { getDriverCurrentLocation, type DriverLocationState } from './driver-current-location';

export type MapCoordinate = Readonly<{ lat: number; lng: number }>;

/** Shown on the watermark when the device will not give us a position. */
export const WATERMARK_GPS_UNAVAILABLE = 'Chưa có vị trí GPS';

const WATERMARK_TIME_UNAVAILABLE = 'Chưa có thời gian';

/** Renders a coordinate pair for the on-photo watermark. */
export function formatWatermarkCoords(coords: MapCoordinate): string {
  const lat = `${Math.abs(coords.lat).toFixed(5)}° ${coords.lat >= 0 ? 'N' : 'S'}`;
  const lng = `${Math.abs(coords.lng).toFixed(5)}° ${coords.lng >= 0 ? 'E' : 'W'}`;
  return `${lat}, ${lng}`;
}

/**
 * Formats the capture timestamp for the watermark. Falls back to an explicit
 * "unavailable" label rather than inventing a plausible-looking time, because a
 * fabricated timestamp on delivery evidence is worse than an honest gap.
 */
export function formatWatermarkTimestamp(date: Date | null | undefined): string {
  if (!date || Number.isNaN(date.getTime())) return WATERMARK_TIME_UNAVAILABLE;
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${pad(
    date.getDate(),
  )}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export type WatermarkLocation = Readonly<{
  formatWatermarkCoords: (coords: MapCoordinate) => string;
  formatWatermarkTimestamp: (date: Date | null | undefined) => string;
  getCurrentLocation: () => Promise<DriverLocationState>;
}>;

/**
 * Supplies the GPS fix and formatting used to watermark a POD photo at the
 * moment of capture.
 */
export function useWatermarkLocation(): WatermarkLocation {
  const getCurrentLocation = useCallback(() => getDriverCurrentLocation(), []);

  return {
    formatWatermarkCoords,
    formatWatermarkTimestamp,
    getCurrentLocation,
  };
}
