import { useEffect, useMemo, useRef, useState } from 'react';
import * as turf from '@turf/turf';
import type { MapCoordinate, MapStop } from './types';

export interface VietmapInstruction {
  text: string;
  streetName?: string;
  distance: number; // in meters
  time: number; // in milliseconds
  sign: number; // -3: sharp left, -2: left, -1: slight left, 0: straight, 1: slight right, 2: right, 3: sharp right, 4: reach dest, 6: roundabout
  interval: [number, number]; // [startIndex, endIndex] in coordinates array
}

export interface UseVietmapRouteParams {
  origin?: { coords?: MapCoordinate; label?: string };
  destination?: { coords?: MapCoordinate; label?: string };
  stops?: readonly MapStop[];
  routeCoords?: readonly MapCoordinate[];
  resolvedApiKey?: string;
  vehicleType?: string;
}

export interface UseVietmapRouteResult {
  coordinates: [number, number][]; // [lng, lat][]
  routeGeoJSON: any;
  instructions: VietmapInstruction[];
  cumDist: number[]; // cumDist[i] = cumulative distance in meters up to vertex i
  totalDistanceM: number;
  totalDistanceKm: number;
  totalDurationMin: number;
  isLoading: boolean;
  error: Error | null;
}

// In-memory cache across hook mounts to prevent redundant HTTP requests
const routeCache = new Map<string, {
  coordinates: [number, number][];
  instructions: VietmapInstruction[];
  totalDistanceM: number;
  totalDurationMin: number;
}>();

function buildCacheKey(points: MapCoordinate[], profile: string): string {
  return `${profile}:${points.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join(';')}`;
}

/**
 * Calculates cumulative distance along an array of [lng, lat] coordinates in meters.
 * cumDist[0] = 0, cumDist[i] = cumDist[i - 1] + dist(pt[i-1], pt[i])
 */
export function computeCumulativeDistances(coords: [number, number][]): number[] {
  if (!coords || coords.length === 0) return [0];
  const cum: number[] = [0];
  let acc = 0;
  for (let i = 1; i < coords.length; i++) {
    const from = turf.point(coords[i - 1]!);
    const to = turf.point(coords[i]!);
    const dMeters = turf.distance(from, to, { units: 'meters' });
    acc += dMeters;
    cum.push(acc);
  }
  return cum;
}

export function useVietmapRoute({
  origin,
  destination,
  stops = [],
  routeCoords = [],
  resolvedApiKey = '',
  vehicleType = 'truck',
}: UseVietmapRouteParams): UseVietmapRouteResult {
  const initialData = useMemo(() => {
    if (routeCoords && routeCoords.length >= 2) {
      const explicitCoords = routeCoords.map((c) => [c.lng, c.lat] as [number, number]);
      const cum = computeCumulativeDistances(explicitCoords);
      const totalDist = cum[cum.length - 1] || 0;
      return {
        coordinates: explicitCoords,
        cumDist: cum,
        totalDistanceM: totalDist,
        totalDurationMin: Math.max(1, Math.round((totalDist / 1000 / 30) * 60)),
        instructions: [
          {
            text: `Đi về phía ${destination?.label || 'điểm đến'}`,
            distance: totalDist,
            time: (totalDist / 1000 / 30) * 3600000,
            sign: 0,
            interval: [0, explicitCoords.length - 1] as [number, number],
          },
        ],
      };
    }
    return null;
  }, [routeCoords, destination?.label]);

  const [coordinates, setCoordinates] = useState<[number, number][]>(() => initialData?.coordinates || []);
  const [instructions, setInstructions] = useState<VietmapInstruction[]>(() => initialData?.instructions || []);
  const [totalDistanceM, setTotalDistanceM] = useState<number>(() => initialData?.totalDistanceM || 0);
  const [totalDurationMin, setTotalDurationMin] = useState<number>(() => initialData?.totalDurationMin || 0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Extract ordered list of coordinates that require routing
  const rawWaypoints = useMemo<MapCoordinate[]>(() => {
    const list: MapCoordinate[] = [];
    if (origin?.coords) list.push(origin.coords);
    for (const stop of stops) {
      if (stop.coords) list.push(stop.coords);
    }
    if (destination?.coords) list.push(destination.coords);
    return list;
  }, [origin?.coords, destination?.coords, stops]);

  const profile = vehicleType === 'motorcycle' || vehicleType === 'bike' ? 'motorcycle' : 'truck';

  const pointsHash = useMemo(() => {
    if (routeCoords && routeCoords.length >= 2) {
      return `route:${routeCoords.map((c) => `${c.lat},${c.lng}`).join(';')}`;
    }
    return `wp:${rawWaypoints.map((p) => `${p.lat},${p.lng}`).join(';')}`;
  }, [routeCoords, rawWaypoints]);

  useEffect(() => {
    // 1. If explicit multi-point routeCoords was provided, state was already initialized synchronously
    if (initialData) {
      setCoordinates(initialData.coordinates);
      setInstructions(initialData.instructions);
      setTotalDistanceM(initialData.totalDistanceM);
      setTotalDurationMin(initialData.totalDurationMin);
      return;
    }

    // If fewer than 2 points, no routing possible
    if (rawWaypoints.length < 2) {
      setCoordinates([]);
      setInstructions([]);
      setTotalDistanceM(0);
      setTotalDurationMin(0);
      return;
    }

    const cacheKey = buildCacheKey(rawWaypoints, profile);
    const cached = routeCache.get(cacheKey);
    if (cached) {
      setCoordinates(cached.coordinates);
      setInstructions(cached.instructions);
      setTotalDistanceM(cached.totalDistanceM);
      setTotalDurationMin(cached.totalDurationMin);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsLoading(true);
    setError(null);

    const hasValidKey = Boolean(
      resolvedApiKey &&
        !resolvedApiKey.includes('test-api-key') &&
        resolvedApiKey.trim().length > 10,
    );

    const pointsParam = rawWaypoints.map((p) => `point=${p.lat},${p.lng}`).join('&');
    const osrmPoints = rawWaypoints.map((p) => `${p.lng},${p.lat}`).join(';');

    const fetchOSRM = async () => {
      const url = `https://router.project-osrm.org/route/v1/driving/${osrmPoints}?overview=full&geometries=geojson&steps=true`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`OSRM HTTP error: ${res.status}`);
      const data = await res.json();
      const route = data?.routes?.[0];
      const coords = route?.geometry?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) {
        throw new Error('OSRM returned empty geometry');
      }

      const dist = route.distance || 0;
      const durationMin = Math.max(1, Math.round((route.duration || 0) / 60));
      const steps: VietmapInstruction[] = [];

      if (route.legs && Array.isArray(route.legs)) {
        let coordIdx = 0;
        for (const leg of route.legs) {
          if (leg.steps && Array.isArray(leg.steps)) {
            for (const st of leg.steps) {
              const modifier = st.maneuver?.modifier;
              let sign = 0;
              if (modifier === 'left') sign = -2;
              else if (modifier === 'slight left') sign = -1;
              else if (modifier === 'sharp left') sign = -3;
              else if (modifier === 'right') sign = 2;
              else if (modifier === 'slight right') sign = 1;
              else if (modifier === 'sharp right') sign = 3;

              const stepCoordsCount = st.geometry?.coordinates?.length || 1;
              const nextIdx = Math.min(coords.length - 1, coordIdx + stepCoordsCount);
              steps.push({
                text: st.maneuver?.instruction || st.name || 'Đi thẳng',
                streetName: st.name,
                distance: st.distance || 0,
                time: (st.duration || 0) * 1000,
                sign,
                interval: [coordIdx, nextIdx],
              });
              coordIdx = nextIdx;
            }
          }
        }
      }

      if (steps.length === 0) {
        steps.push({
          text: `Đi về phía ${destination?.label || 'điểm đến'}`,
          distance: dist,
          time: durationMin * 60000,
          sign: 0,
          interval: [0, coords.length - 1],
        });
      }

      return {
        coordinates: coords as [number, number][],
        instructions: steps,
        totalDistanceM: dist,
        totalDurationMin: durationMin,
      };
    };

    const fetchVietmap = async () => {
      const url = `https://maps.vietmap.vn/api/route/v3?apikey=${resolvedApiKey}&${pointsParam}&vehicle=${profile}&points_encoded=false`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`VietMap Route v3 HTTP error: ${res.status}`);
      const data = await res.json();
      const path = data?.paths?.[0];
      const coords = path?.points?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) {
        throw new Error('VietMap returned empty route points');
      }

      const dist = path.distance || 0;
      const durationMin = Math.max(1, Math.round((path.time || 0) / 60000));
      const rawInst = path.instructions || [];
      const steps: VietmapInstruction[] = rawInst.map((inst: any) => ({
        text: inst.text || 'Đi thẳng',
        streetName: inst.street_name,
        distance: inst.distance || 0,
        time: inst.time || 0,
        sign: typeof inst.sign === 'number' ? inst.sign : 0,
        interval: Array.isArray(inst.interval) ? [inst.interval[0], inst.interval[1]] : [0, coords.length - 1],
      }));

      return {
        coordinates: coords as [number, number][],
        instructions: steps,
        totalDistanceM: dist,
        totalDurationMin: durationMin,
      };
    };

    const runRouting = async () => {
      try {
        let result: {
          coordinates: [number, number][];
          instructions: VietmapInstruction[];
          totalDistanceM: number;
          totalDurationMin: number;
        };

        if (hasValidKey) {
          try {
            result = await fetchVietmap();
          } catch {
            // Fallback to OSRM on Vietmap API failure/exhaustion
            result = await fetchOSRM();
          }
        } else {
          result = await fetchOSRM();
        }

        routeCache.set(cacheKey, result);
        setCoordinates(result.coordinates);
        setInstructions(result.instructions);
        setTotalDistanceM(result.totalDistanceM);
        setTotalDurationMin(result.totalDurationMin);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError(err);
          // Fallback to straight-line interpolation between waypoints
          const straight = rawWaypoints.map((p) => [p.lng, p.lat] as [number, number]);
          setCoordinates(straight);
          const cum = computeCumulativeDistances(straight);
          const totalDist = cum[cum.length - 1] || 0;
          setTotalDistanceM(totalDist);
          setTotalDurationMin(Math.max(1, Math.round((totalDist / 1000 / 25) * 60)));
        }
      } finally {
        setIsLoading(false);
      }
    };

    runRouting();

    return () => {
      controller.abort();
    };
  }, [pointsHash, resolvedApiKey, profile, destination?.label]);

  const cumDist = useMemo(() => computeCumulativeDistances(coordinates), [coordinates]);

  const routeGeoJSON = useMemo(() => {
    if (coordinates.length < 2) return null;
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { color: '#2F7BFF' },
          geometry: {
            type: 'LineString',
            coordinates,
          },
        },
      ],
    };
  }, [coordinates]);

  return {
    coordinates,
    routeGeoJSON,
    instructions,
    cumDist,
    totalDistanceM,
    totalDistanceKm: Math.round((totalDistanceM / 1000) * 10) / 10,
    totalDurationMin,
    isLoading,
    error,
  };
}
