import type { RouteCoordinate } from '@leopard/shared';

export type PolylineEncoding = 'POLYLINE5' | 'POLYLINE6';

export function decodePolyline(
  encoded: string,
  encoding: PolylineEncoding = 'POLYLINE5',
): readonly RouteCoordinate[] {
  const factor = encoding === 'POLYLINE6' ? 1e6 : 1e5;
  const points: RouteCoordinate[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    const latDelta = decodeSignedValue();
    lat += latDelta;
    if (index >= encoded.length) {
      break;
    }
    const lngDelta = decodeSignedValue();
    lng += lngDelta;

    points.push({ lat: lat / factor, lng: lng / factor });
  }

  return points;

  function decodeSignedValue(): number {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      if (index >= encoded.length) break;
      byte = encoded.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  }
}
