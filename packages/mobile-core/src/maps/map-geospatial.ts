import type { MapCoordinate } from './types';

export type BoundingBox = {
  sw: [number, number]; // [lng, lat]
  ne: [number, number]; // [lng, lat]
};

export type ViewportInsets = {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
};

/**
 * Calculates forward azimuth / compass bearing from start coordinate to end coordinate in degrees [0, 360).
 * Implements spherical forward azimuth based on WGS84 great-circle navigation.
 */
export function calculateBearing(start: MapCoordinate, end: MapCoordinate): number {
  const dLng = ((end.lng - start.lng) * Math.PI) / 180;
  const lat1 = (start.lat * Math.PI) / 180;
  const lat2 = (end.lat * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  const radians = Math.atan2(y, x);
  const degrees = (radians * 180) / Math.PI;
  return (degrees + 360) % 360;
}

/**
 * Calculates BoundingBox enclosing all supplied coordinates with configurable margin padding.
 * Defaults to 15% margin padding to ensure pins aren't clipped by screen edges.
 */
export function calculateRouteBoundingBox(
  coords: readonly MapCoordinate[],
  paddingRatio = 0.15,
): BoundingBox | null {
  if (!coords || coords.length === 0) return null;

  let minLat = coords[0].lat;
  let maxLat = coords[0].lat;
  let minLng = coords[0].lng;
  let maxLng = coords[0].lng;

  for (let i = 1; i < coords.length; i++) {
    const c = coords[i];
    if (c.lat < minLat) minLat = c.lat;
    if (c.lat > maxLat) maxLat = c.lat;
    if (c.lng < minLng) minLng = c.lng;
    if (c.lng > maxLng) maxLng = c.lng;
  }

  const latSpan = Math.max(0.002, maxLat - minLat);
  const lngSpan = Math.max(0.002, maxLng - minLng);

  const padLat = latSpan * paddingRatio;
  const padLng = lngSpan * paddingRatio;

  return {
    sw: [minLng - padLng, minLat - padLat],
    ne: [maxLng + padLng, maxLat + padLat],
  };
}

/**
 * Linear coordinate interpolation between two points.
 * `t` ranges from 0 (start) to 1 (end).
 */
export function lerpCoordinate(
  start: MapCoordinate,
  end: MapCoordinate,
  t: number,
): MapCoordinate {
  const clampedT = Math.max(0, Math.min(1, t));
  return {
    lat: start.lat + (end.lat - start.lat) * clampedT,
    lng: start.lng + (end.lng - start.lng) * clampedT,
  };
}

/**
 * Shortest path spherical angular interpolation for compass bearing in degrees.
 * Seamlessly handles the 360/0 degree wrap-around.
 */
export function slerpBearing(current: number, target: number, t: number): number {
  const clampedT = Math.max(0, Math.min(1, t));
  const diff = (((target - current + 540) % 360) - 180);
  return (current + diff * clampedT + 360) % 360;
}

/**
 * Calculates the visible center Y offset to ensure vehicle marker and route
 * remain centered in the unobstructed upper viewport above BottomSheets.
 *
 * @returns Pixel offset to apply to the camera anchor (negative shifts camera focus upward)
 */
export function calculateDynamicVisibleCenterOffset(
  screenHeight: number,
  sheetHeight: number,
  topInset = 0,
): number {
  if (screenHeight <= 0) return 0;
  const clampedSheetHeight = Math.max(0, Math.min(screenHeight, sheetHeight));
  // Visible region spans from topInset to (screenHeight - clampedSheetHeight)
  const visibleHeight = Math.max(0, screenHeight - clampedSheetHeight - topInset);
  const visibleCenterY = topInset + visibleHeight / 2;
  const screenCenterY = screenHeight / 2;

  return visibleCenterY - screenCenterY;
}

/**
 * Haversine great-circle distance in meters between two coordinates.
 */
export function haversineDistanceMeters(
  a: MapCoordinate,
  b: MapCoordinate,
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const sinDlat = Math.sin(dLat / 2);
  const sinDlng = Math.sin(dLng / 2);
  const h =
    sinDlat * sinDlat +
    Math.cos(lat1) * Math.cos(lat2) * sinDlng * sinDlng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Projects a point onto a line segment [p1, p2].
 * Returns projected point, parameter t in [0, 1], and distance in meters.
 */
export function projectPointOnSegment(
  point: MapCoordinate,
  p1: MapCoordinate,
  p2: MapCoordinate,
): { point: MapCoordinate; t: number; distanceMeters: number } {
  const dx = p2.lng - p1.lng;
  const dy = p2.lat - p1.lat;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return {
      point: p1,
      t: 0,
      distanceMeters: haversineDistanceMeters(point, p1),
    };
  }

  const rawT =
    ((point.lng - p1.lng) * dx + (point.lat - p1.lat) * dy) / lenSq;
  const t = Math.max(0, Math.min(1, rawT));
  const projectedPoint: MapCoordinate = {
    lat: p1.lat + t * dy,
    lng: p1.lng + t * dx,
  };

  return {
    point: projectedPoint,
    t,
    distanceMeters: haversineDistanceMeters(point, projectedPoint),
  };
}

export type AnchorRouteParams = {
  routeCoords?: readonly MapCoordinate[];
  truckLocation?: MapCoordinate;
  originCoords?: MapCoordinate;
  destinationCoords?: MapCoordinate;
  isPickupLeg?: boolean;
};

/**
 * Anchors the route polyline seamlessly into the vehicle marker.
 * Eliminates visual disconnect gaps between the truck marker and the route polyline:
 * - When isPickupLeg is true (PICKING_UP/ACCEPTED): connects truckLocation -> originCoords -> (planned delivery route).
 * - When isPickupLeg is false (IN_TRANSIT): snaps truckLocation onto the nearest route segment and trims passed waypoints.
 */
export function anchorRouteToTruck({
  destinationCoords,
  isPickupLeg = false,
  originCoords,
  routeCoords = [],
  truckLocation,
}: AnchorRouteParams): readonly MapCoordinate[] {
  if (!truckLocation) {
    if (routeCoords.length >= 2) return routeCoords;
    if (originCoords && destinationCoords) return [originCoords, destinationCoords];
    return routeCoords;
  }

  // 1. Pickup leg: driver is approaching originCoords
  if (isPickupLeg) {
    const target = originCoords ?? (routeCoords.length > 0 ? routeCoords[0] : destinationCoords);
    if (!target) return [truckLocation];

    // Check if routeCoords is already a route towards target (e.g. streetRoute from truck to origin)
    if (routeCoords.length >= 2) {
      const lastDist = haversineDistanceMeters(routeCoords[routeCoords.length - 1], target);
      if (lastDist < 500) {
        // routeCoords ends at target, so it is the pickup route. Snap truck onto it.
        let bestSegmentIdx = 0;
        let minDistance = Infinity;

        for (let i = 0; i < routeCoords.length - 1; i++) {
          const proj = projectPointOnSegment(truckLocation, routeCoords[i], routeCoords[i + 1]);
          if (proj.distanceMeters < minDistance) {
            minDistance = proj.distanceMeters;
            bestSegmentIdx = i;
          }
        }

        const remaining = routeCoords.slice(bestSegmentIdx + 1);
        return [truckLocation, ...remaining];
      }
    }

    // Otherwise, routeCoords is either empty or delivery leg (not towards origin).
    // We only connect truck to origin for pickup leg, never draw line across to destination.
    return [truckLocation, target];
  }

  // 2. Delivery leg (IN_TRANSIT): vehicle is moving along routeCoords towards destination
  if (routeCoords.length >= 2) {
    let bestSegmentIdx = 0;
    let minDistance = Infinity;

    for (let i = 0; i < routeCoords.length - 1; i++) {
      const proj = projectPointOnSegment(truckLocation, routeCoords[i], routeCoords[i + 1]);
      if (proj.distanceMeters < minDistance) {
        minDistance = proj.distanceMeters;
        bestSegmentIdx = i;
      }
    }

    // Remaining path ahead of the vehicle
    const remainingAfterSegment = routeCoords.slice(bestSegmentIdx + 1);
    return [truckLocation, ...remainingAfterSegment];
  }

  // Fallback if no full routeCoords polyline exists
  if (destinationCoords) {
    return [truckLocation, destinationCoords];
  }

  return [truckLocation];
}
