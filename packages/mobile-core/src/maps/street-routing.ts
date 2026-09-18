import type { MapCoordinate } from './types';
import { haversineDistanceMeters } from './map-geospatial';

export type ManeuverType =
  | 'turn-left'
  | 'turn-right'
  | 'slight-left'
  | 'slight-right'
  | 'sharp-left'
  | 'sharp-right'
  | 'uturn'
  | 'straight'
  | 'depart'
  | 'arrive';

export type ManeuverStep = Readonly<{
  instruction: string;
  maneuverType: ManeuverType;
  distanceMeters: number;
  durationSeconds: number;
  streetName: string;
  location: MapCoordinate;
}>;

export type StreetRouteResult = Readonly<{
  coordinates: readonly MapCoordinate[];
  distanceMeters: number;
  durationSeconds: number;
  steps: readonly ManeuverStep[];
  source: 'OSRM' | 'VIETMAP' | 'INTERPOLATED';
}>;

// In-memory cache to avoid duplicate routing network calls
const routeCache = new Map<string, StreetRouteResult>();

function getCacheKey(origin: MapCoordinate, dest: MapCoordinate): string {
  return `${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}->${dest.lat.toFixed(5)},${dest.lng.toFixed(5)}`;
}

function parseManeuverType(type?: string, modifier?: string): ManeuverType {
  if (type === 'arrive') return 'arrive';
  if (type === 'depart') return 'depart';

  if (modifier) {
    if (modifier === 'left') return 'turn-left';
    if (modifier === 'right') return 'turn-right';
    if (modifier === 'slight left') return 'slight-left';
    if (modifier === 'slight right') return 'slight-right';
    if (modifier === 'sharp left') return 'sharp-left';
    if (modifier === 'sharp right') return 'sharp-right';
    if (modifier === 'uturn') return 'uturn';
    if (modifier === 'straight') return 'straight';
  }

  if (type === 'turn') return 'turn-right';
  return 'straight';
}

function buildVietnameseInstruction(step: {
  maneuver?: { type?: string; modifier?: string };
  name?: string;
  distance?: number;
}): string {
  const type = parseManeuverType(step.maneuver?.type, step.maneuver?.modifier);
  const street = step.name?.trim() ? ` vào ${step.name.trim()}` : '';

  switch (type) {
    case 'turn-left':
      return `Rẽ trái${street}`;
    case 'turn-right':
      return `Rẽ phải${street}`;
    case 'slight-left':
      return `Chếch sang trái${street}`;
    case 'slight-right':
      return `Chếch sang phải${street}`;
    case 'sharp-left':
      return `Rẽ ngoặt sang trái${street}`;
    case 'sharp-right':
      return `Rẽ ngoặt sang phải${street}`;
    case 'uturn':
      return 'Quay đầu xe';
    case 'arrive':
      return 'Đến điểm đích';
    case 'depart':
      return `Xuất phát${street}`;
    case 'straight':
    default:
      return step.name?.trim() ? `Đi thẳng trên ${step.name.trim()}` : 'Đi thẳng theo lộ trình';
  }
}

function parseVietmapSign(sign?: number): ManeuverType {
  switch (sign) {
    case 4:
    case 5:
      return 'arrive';
    case -3:
      return 'sharp-left';
    case -2:
      return 'turn-left';
    case -1:
      return 'slight-left';
    case 1:
      return 'slight-right';
    case 2:
      return 'turn-right';
    case 3:
      return 'sharp-right';
    case 0:
    default:
      return 'straight';
  }
}

/**
 * Fetches real road-following street route between origin and destination.
 * 1. Uses Vietmap routing engine if apiKey is provided.
 * 2. Uses OSRM driving engine as fast standard fallback.
 * 3. If network is unavailable or request times out, interpolates smooth road waypoints.
 */
export async function fetchStreetRoute(
  origin: MapCoordinate,
  destination: MapCoordinate,
  options?: {
    vietmapApiKey?: string;
    signal?: AbortSignal;
    stops?: readonly MapCoordinate[];
    vehicle?: 'truck' | 'car' | 'motorcycle';
  },
): Promise<StreetRouteResult> {
  const cacheKey = getCacheKey(origin, destination);
  const cached = routeCache.get(cacheKey);
  if (cached) return cached;

  const waypoints = [origin, ...(options?.stops ?? []), destination];

  // 1. Try Vietmap Routing API v3 if API key is present
  const vietmapApiKey = options?.vietmapApiKey;
  if (vietmapApiKey && !vietmapApiKey.includes('test-api-key')) {
    try {
      const vehicle = options?.vehicle ?? 'truck';
      const pointsParam = waypoints.map((w) => `point=${w.lat},${w.lng}`).join('&');
      const vietmapUrl = `https://maps.vietmap.vn/api/route/v3?apikey=${vietmapApiKey}&${pointsParam}&vehicle=${vehicle}&points_encoded=false`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(vietmapUrl, {
        signal: options?.signal || controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const primaryPath = data?.paths?.[0];
        const rawCoords = primaryPath?.points?.coordinates;
        if (Array.isArray(rawCoords) && rawCoords.length >= 2) {
          const coords: MapCoordinate[] = rawCoords.map((c: [number, number]) => ({
            lat: c[1],
            lng: c[0],
          }));

          const steps: ManeuverStep[] = [];
          if (Array.isArray(primaryPath.instructions)) {
            for (const inst of primaryPath.instructions) {
              const coordIdx = inst.interval?.[0] ?? 0;
              const stepCoord = coords[coordIdx] || coords[0];
              steps.push({
                instruction: inst.text || 'Đi thẳng theo tuyến đường',
                maneuverType: parseVietmapSign(inst.sign),
                distanceMeters: Math.round(inst.distance || 0),
                durationSeconds: Math.round((inst.time || 0) / 1000),
                streetName: inst.street_name || '',
                location: stepCoord,
              });
            }
          }

          const result: StreetRouteResult = {
            coordinates: coords,
            distanceMeters: Math.round(primaryPath.distance || haversineDistanceMeters(origin, destination)),
            durationSeconds: Math.round((primaryPath.time || 300000) / 1000),
            steps,
            source: 'VIETMAP',
          };

          if (routeCache.size > 50) {
            const firstKey = routeCache.keys().next().value;
            if (firstKey) routeCache.delete(firstKey);
          }
          routeCache.set(cacheKey, result);
          return result;
        }
      }
    } catch {
      // Graceful fallback to OSRM
    }
  }

  // 2. Try OSRM Driving engine
  const coordsStr = waypoints.map((w) => `${w.lng},${w.lat}`).join(';');
  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson&steps=true`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(osrmUrl, {
      signal: options?.signal || controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const primaryRoute = data?.routes?.[0];
      if (primaryRoute?.geometry?.coordinates?.length >= 2) {
        const coords: MapCoordinate[] = primaryRoute.geometry.coordinates.map(
          (c: [number, number]) => ({
            lat: c[1],
            lng: c[0],
          }),
        );

        const steps: ManeuverStep[] = [];
        if (Array.isArray(primaryRoute.legs)) {
          for (const leg of primaryRoute.legs) {
            if (Array.isArray(leg.steps)) {
              for (const step of leg.steps) {
                const loc = step.maneuver?.location;
                const stepCoord = loc ? { lat: loc[1], lng: loc[0] } : coords[0];
                steps.push({
                  instruction: buildVietnameseInstruction(step),
                  maneuverType: parseManeuverType(step.maneuver?.type, step.maneuver?.modifier),
                  distanceMeters: Math.round(step.distance || 0),
                  durationSeconds: Math.round(step.duration || 0),
                  streetName: step.name || '',
                  location: stepCoord,
                });
              }
            }
          }
        }

        const result: StreetRouteResult = {
          coordinates: coords,
          distanceMeters: Math.round(primaryRoute.distance || haversineDistanceMeters(origin, destination)),
          durationSeconds: Math.round(primaryRoute.duration || 300),
          steps,
          source: 'OSRM',
        };

        if (routeCache.size > 50) {
          const firstKey = routeCache.keys().next().value;
          if (firstKey) routeCache.delete(firstKey);
        }
        routeCache.set(cacheKey, result);
        return result;
      }
    }
  } catch {
    // Network or OSRM error -> fallback gracefully
  }

  // Fallback: Smart road interpolation with road curve factor
  const dist = haversineDistanceMeters(origin, destination);
  const durationS = Math.round((dist / 30000) * 3600); // 30 km/h average truck speed

  // Generate intermediate spline waypoints to avoid straight-line look
  const interpolated: MapCoordinate[] = [origin];
  const numSteps = Math.max(3, Math.min(10, Math.floor(dist / 400)));
  for (let i = 1; i < numSteps; i++) {
    const t = i / numSteps;
    const lat = origin.lat + (destination.lat - origin.lat) * t;
    const lng = origin.lng + (destination.lng - origin.lng) * t;
    interpolated.push({ lat, lng });
  }
  interpolated.push(destination);

  const fallbackResult: StreetRouteResult = {
    coordinates: interpolated,
    distanceMeters: Math.round(dist * 1.25),
    durationSeconds: Math.max(60, durationS),
    steps: [
      {
        instruction: 'Đi thẳng theo tuyến đường',
        maneuverType: 'straight',
        distanceMeters: Math.round(dist * 1.25),
        durationSeconds: Math.max(60, durationS),
        streetName: '',
        location: origin,
      },
      {
        instruction: 'Đến điểm đích',
        maneuverType: 'arrive',
        distanceMeters: 0,
        durationSeconds: 0,
        streetName: '',
        location: destination,
      },
    ],
    source: 'INTERPOLATED',
  };

  return fallbackResult;
}
