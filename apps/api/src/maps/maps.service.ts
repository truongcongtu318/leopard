import { Inject, Injectable } from '@nestjs/common';

import { DomainError } from '../common/domain-error.js';
import { EstimateTokenService } from './domain/estimate-token.service.js';
import { PricingService } from './domain/pricing.service.js';
import { DemoMapProvider } from './providers/demo-map.provider.js';
import type {
  GeocodeResult,
  MapProviderSource,
  MapProvider,
  PlaceCandidate,
  RouteEstimate,
  RouteInput,
} from './providers/map-provider.js';
import { MapProviderNotFoundError } from './providers/map-provider.js';

export const MAP_PROVIDER = Symbol('MAP_PROVIDER');

export interface OrderEstimateResponse extends RouteEstimate {
  estimateToken: string;
}

export class MapPlaceNotFoundError extends Error {
  constructor() {
    super('Map place not found');
    this.name = 'MapPlaceNotFoundError';
    Object.setPrototypeOf(this, MapPlaceNotFoundError.prototype);
  }
}

@Injectable()
export class MapsService {
  constructor(
    @Inject(MAP_PROVIDER) private readonly mapProvider: MapProvider,
    private readonly pricingService: PricingService,
    private readonly estimateTokenService: EstimateTokenService,
  ) {}

  async search(query: string): Promise<PlaceCandidate[]> {
    return this.withProvider(() => this.mapProvider.search(query));
  }

  async geocode(placeId: string): Promise<GeocodeResult> {
    try {
      return await this.mapProvider.geocode(placeId);
    } catch (error) {
      if (error instanceof MapProviderNotFoundError) {
        throw new MapPlaceNotFoundError();
      }

      throw this.providerUnavailableError();
    }
  }

  async estimate(input: RouteInput): Promise<OrderEstimateResponse> {
    const estimate = await this.withProvider(() => this.mapProvider.route(input));
    const quote = this.pricingService.quote({
      vehicleType: input.vehicleType,
      distanceMeters: estimate.distanceM,
      stopCount: input.stops.length,
    });
    const pricedEstimate = {
      ...estimate,
      estimatedPriceVnd: quote.amountVnd,
    };
    const estimateToken = this.estimateTokenService.issue({
      routeInput: input,
      estimate: pricedEstimate,
      quote,
    });

    return {
      estimateToken,
      ...pricedEstimate,
    };
  }

  defaultSource(): MapProviderSource {
    return this.mapProvider instanceof DemoMapProvider ? 'DEMO' : 'VIETMAP';
  }

  private async withProvider<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch {
      throw this.providerUnavailableError();
    }
  }

  private providerUnavailableError(): DomainError {
    return new DomainError(
      'MAP_PROVIDER_UNAVAILABLE',
      503,
      'Map provider unavailable',
    );
  }
}
