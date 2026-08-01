import type {
  GeoPoint,
  MapProvider,
  PlaceCandidate,
  RouteEstimate,
  RouteInput,
} from './map-provider.js';

export interface ResilientMapProviderOptions {
  allowDemoProvider?: boolean;
}

export class ResilientMapProvider implements MapProvider {
  private readonly allowDemoProvider: boolean;

  constructor(
    private readonly primaryProvider: MapProvider,
    private readonly demoProvider: MapProvider,
    options: ResilientMapProviderOptions = {},
  ) {
    this.allowDemoProvider =
      options.allowDemoProvider ?? process.env.ALLOW_DEMO_PROVIDER === 'true';
  }

  async search(query: string): Promise<PlaceCandidate[]> {
    return this.withDemoFallback((provider) => provider.search(query));
  }

  async geocode(placeId: string): Promise<GeoPoint> {
    return this.withDemoFallback((provider) => provider.geocode(placeId));
  }

  async route(input: RouteInput): Promise<RouteEstimate> {
    return this.withDemoFallback((provider) => provider.route(input));
  }

  private async withDemoFallback<T>(
    operation: (provider: MapProvider) => Promise<T>,
  ): Promise<T> {
    try {
      return await operation(this.primaryProvider);
    } catch (error) {
      if (!this.allowDemoProvider) {
        throw error;
      }

      return operation(this.demoProvider);
    }
  }
}
