import type { GeoPoint } from '../providers/map-provider.js';

const EARTH_RADIUS_METERS = 6_371_000;
const DEGREES_TO_RADIANS = Math.PI / 180;

export function haversineDistanceMeters(from: GeoPoint, to: GeoPoint): number {
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);

  const chordLength =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(chordLength), Math.sqrt(1 - chordLength));
}

export function sumHaversineLegsMeters(points: readonly GeoPoint[]): number {
  if (points.length < 2) {
    return 0;
  }

  let totalMeters = 0;

  for (let index = 1; index < points.length; index += 1) {
    const previousPoint = points[index - 1];
    const point = points[index];

    if (previousPoint && point) {
      totalMeters += haversineDistanceMeters(previousPoint, point);
    }
  }

  return totalMeters;
}

function toRadians(degrees: number): number {
  return degrees * DEGREES_TO_RADIANS;
}
