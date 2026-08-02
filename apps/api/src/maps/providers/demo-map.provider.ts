import { DemoRouteEstimator } from '../domain/demo-route-estimator.js';
import type {
  GeocodeResult,
  MapProvider,
  PlaceCandidate,
  RouteEstimate,
  RouteInput,
} from './map-provider.js';
import { MapProviderNotFoundError } from './map-provider.js';

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
        point: demoPoint(`demo:${normalizedQuery.toLowerCase()}`),
        source: 'DEMO',
      },
    ];
  }

  async geocode(placeId: string): Promise<GeocodeResult> {
    const normalizedPlaceId = placeId.trim().toLowerCase();

    if (!normalizedPlaceId.startsWith('demo:') || normalizedPlaceId === 'demo:') {
      throw new MapProviderNotFoundError();
    }

    return {
      label: demoLabel(normalizedPlaceId),
      point: demoPoint(normalizedPlaceId),
      source: 'DEMO',
    };
  }

  async route(input: RouteInput): Promise<RouteEstimate> {
    return this.estimator.estimate(input);
  }
}

function demoPoint(seed: string) {
  const hash = [...seed].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );

  return {
    latitude: 10.7 + (hash % 1_000) / 10_000,
    longitude: 106.6 + (hash % 1_000) / 10_000,
  };
}

function demoLabel(placeId: string): string {
  const rawLabel = placeId.startsWith('demo:') ? placeId.slice('demo:'.length) : placeId;
  const normalizedLabel = rawLabel
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  return `${normalizedLabel || placeId} (Demo data)`;
}
