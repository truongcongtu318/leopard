import type { RouteCoordinate } from './route-coordinate.js';

export type PolylineEncoding = 'POLYLINE5' | 'POLYLINE6';

const MAX_ENCODED_LENGTH = 2_000_000;
const MAX_POINTS = 20_000;

export class PolylineDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PolylineDecodeError';
  }
}

export function decodePolyline(encoded: string, encoding: PolylineEncoding): readonly RouteCoordinate[] {
  if (encoded.length > MAX_ENCODED_LENGTH) {
    throw new PolylineDecodeError(`Polyline string exceeds ${MAX_ENCODED_LENGTH} characters`);
  }

  const factor = encoding === 'POLYLINE6' ? 1e6 : 1e5;
  const points: RouteCoordinate[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    const latDelta = decodeSignedValue();
    lat += latDelta;
    if (index >= encoded.length) {
      throw new PolylineDecodeError('Polyline truncated mid-coordinate-pair');
    }
    const lngDelta = decodeSignedValue();
    lng += lngDelta;

    const point = { lat: lat / factor, lng: lng / factor };
    if (point.lat < -90 || point.lat > 90 || point.lng < -180 || point.lng > 180) {
      throw new PolylineDecodeError(`Decoded coordinate out of range: ${JSON.stringify(point)}`);
    }
    points.push(point);

    if (points.length > MAX_POINTS) {
      throw new PolylineDecodeError(`Polyline exceeds ${MAX_POINTS} points`);
    }
  }

  return points;

  function decodeSignedValue(): number {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      if (index >= encoded.length) {
        throw new PolylineDecodeError('Polyline truncated mid-varint');
      }
      byte = encoded.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  }
}
