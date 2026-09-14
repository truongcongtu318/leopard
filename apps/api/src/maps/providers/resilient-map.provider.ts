import type {
  GeocodeResult,
  MapProvider,
  PlaceCandidate,
  RouteEstimate,
  RouteInput,
} from './map-provider.js';
import { MapProviderNotFoundError } from './map-provider.js';

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

  async geocode(placeId: string): Promise<GeocodeResult> {
    return this.withDemoFallback((provider) => provider.geocode(placeId));
  }

  async route(input: RouteInput): Promise<RouteEstimate[]> {
    const allowDemoForThisCall = this.allowDemoProvider && input.vehicleType !== 'TRUCK';
    return this.withDemoFallback((provider) => provider.route(input), allowDemoForThisCall);
  }

  private async withDemoFallback<T>(
    operation: (provider: MapProvider) => Promise<T>,
    allowDemoOverride: boolean = this.allowDemoProvider,
  ): Promise<T> {
    try {
      return await operation(this.primaryProvider);
    } catch (error) {
      if (error instanceof MapProviderNotFoundError) {
        throw error;
      }

      if (!allowDemoOverride) {
        throw error;
      }

      return operation(this.demoProvider);
    }
  }
}
