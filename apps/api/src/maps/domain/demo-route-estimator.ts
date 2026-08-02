import type {
  GeoPoint,
  RouteEstimate,
  RouteEstimator,
  RouteInput,
} from '../providers/map-provider.js';
import { sumHaversineLegsMeters } from './haversine.js';

const ROAD_FACTOR = 1.25;
const SPEED_METERS_PER_SECOND = 30_000 / 3_600;
const STOP_DELAY_SECONDS = 5 * 60;
const SECONDS_PER_MINUTE = 60;

export class DemoRouteEstimator implements RouteEstimator {
  constructor(private readonly now: () => Date = () => new Date()) {}

  async estimate(input: RouteInput): Promise<RouteEstimate> {
    const calculatedAt = this.now();
    const routePoints = [input.pickup, ...input.stops, input.dropoff];
    const distanceM = Math.round(sumHaversineLegsMeters(routePoints) * ROAD_FACTOR);
    const durationS = roundToMinute(
      distanceM / SPEED_METERS_PER_SECOND + input.stops.length * STOP_DELAY_SECONDS,
    );
    const estimatedArrivalAt = new Date(calculatedAt.getTime() + durationS * 1_000);

    return {
      polyline: encodePolyline(routePoints),
      distanceM,
      durationS,
      estimatedArrivalAt: estimatedArrivalAt.toISOString(),
      estimatedPriceVnd: 0,
      source: 'DEMO',
      isEstimate: true,
      calculatedAt: calculatedAt.toISOString(),
    };
  }
}

function roundToMinute(seconds: number): number {
  return Math.round(seconds / SECONDS_PER_MINUTE) * SECONDS_PER_MINUTE;
}

function encodePolyline(points: readonly GeoPoint[]): string {
  let previousLatitude = 0;
  let previousLongitude = 0;
  let encoded = '';

  for (const point of points) {
    const latitude = Math.round(point.latitude * 100_000);
    const longitude = Math.round(point.longitude * 100_000);

    encoded += encodePolylineValue(latitude - previousLatitude);
    encoded += encodePolylineValue(longitude - previousLongitude);

    previousLatitude = latitude;
    previousLongitude = longitude;
  }

  return encoded;
}

function encodePolylineValue(value: number): string {
  let shifted = value < 0 ? ~(value << 1) : value << 1;
  let encoded = '';

  while (shifted >= 0x20) {
    encoded += String.fromCharCode((0x20 | (shifted & 0x1f)) + 63);
    shifted >>= 5;
  }

  return encoded + String.fromCharCode(shifted + 63);
}
