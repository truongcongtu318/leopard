import { DemoRouteEstimator } from '../domain/demo-route-estimator.js';
import type {
  GeoPoint,
  MapProvider,
  PlaceCandidate,
  RouteEstimate,
  RouteInput,
} from './map-provider.js';

export class DemoMapProvider implements MapProvider {
  constructor(private readonly estimator = new DemoRouteEstimator()) {}

  async search(query: string): Promise<PlaceCandidate[]> {
    const normalizedQuery = query.trim();

    if (normalizedQuery.length === 0) {
      return [];
    }

    return [
      {
        placeId: `demo:${normalizedQuery.toLowerCase()}`,
        label: `${normalizedQuery} (Demo data)`,
        source: 'DEMO',
      },
    ];
  }

  async geocode(placeId: string): Promise<GeoPoint> {
    const normalizedPlaceId = placeId.trim().toLowerCase();
    const hash = [...normalizedPlaceId].reduce(
      (total, character) => total + character.charCodeAt(0),
      0,
    );

    return {
      latitude: 10.7 + (hash % 1_000) / 10_000,
      longitude: 106.6 + (hash % 1_000) / 10_000,
    };
  }

  async route(input: RouteInput): Promise<RouteEstimate> {
    return this.estimator.estimate(input);
  }
}
