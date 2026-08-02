export interface GeoPoint {
  latitude: number;
  longitude: number;
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

export interface RouteInput {
  pickup: GeoPoint;
  stops: GeoPoint[];
  dropoff: GeoPoint;
  vehicleType: string;
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
}

export interface VerifiedOrderEstimate extends RouteEstimate {
  normalizedInput: RouteInput;
  expiresAt: string;
}

export interface RouteEstimator {
  estimate(input: RouteInput): Promise<RouteEstimate>;
}

export interface MapProvider {
  search(query: string): Promise<PlaceCandidate[]>;
  geocode(placeId: string): Promise<GeocodeResult>;
  route(input: RouteInput): Promise<RouteEstimate>;
}
