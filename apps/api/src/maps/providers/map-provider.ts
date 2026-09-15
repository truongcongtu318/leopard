import type { PricingQuote } from '../domain/pricing.service.js';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export class MapProviderNotFoundError extends Error {
  constructor(message = 'Map place not found') {
    super(message);
    this.name = 'MapProviderNotFoundError';
    Object.setPrototypeOf(this, MapProviderNotFoundError.prototype);
  }
}

export type MapProviderSource = 'VIETMAP' | 'DEMO';

export interface PlaceCandidate {
  placeId: string;
  label: string;
  address?: string;
  point: GeoPoint;
  source: MapProviderSource;
}

export interface GeocodeResult {
  label: string;
  address?: string;
  point: GeoPoint;
  source: MapProviderSource;
}

export type CongestionLevel = 'low' | 'moderate' | 'heavy' | 'severe' | 'unknown';

export interface RouteInput {
  pickup: GeoPoint;
  stops: GeoPoint[];
  dropoff: GeoPoint;
  vehicleType: string;
  cargoWeightKg?: number | undefined;
  hasLoadingSupport?: boolean | undefined;
  hasVatInvoice?: boolean | undefined;
}

export interface RouteEstimateLeg {
  distanceM: number;
  durationS: number;
  geometryStartIndex?: number;
  geometryEndIndex?: number;
}

export interface RouteEstimate {
  polyline: string;
  distanceM: number;
  durationS: number;
  estimatedArrivalAt: string;
  estimatedPriceVnd: number;
  source: MapProviderSource;
  calculatedAt: string;
  isEstimate: boolean;
  congestionLevel: CongestionLevel;
  legs?: readonly RouteEstimateLeg[];
}

export interface VerifiedOrderEstimate extends RouteEstimate {
  routeId: string;
  normalizedInput: RouteInput;
  expiresAt: string;
  quote?: PricingQuote;
}

export interface RouteEstimator {
  estimate(input: RouteInput): Promise<RouteEstimate[]>;
}

export interface MapProvider {
  search(query: string): Promise<PlaceCandidate[]>;
  geocode(placeId: string): Promise<GeocodeResult>;
  route(input: RouteInput): Promise<RouteEstimate[]>;
}
