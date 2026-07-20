import type { ProviderSource } from './enums.js';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface RouteEstimate {
  polyline: string;
  distanceM: number;
  durationS: number;
  estimatedArrivalAt: string;
  estimatedPriceVnd: number;
  source: ProviderSource;
  calculatedAt: string;
  isEstimate: boolean;
}
