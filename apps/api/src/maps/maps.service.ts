import { Inject, Injectable } from '@nestjs/common';
import type { VehicleType } from '@prisma/client';

import { DomainError } from '../common/domain-error.js';
import { PrismaService } from '../database/prisma.service.js';
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
const MAX_ROUTES = 3;

export interface RouteOptionResponse extends RouteEstimate {
  routeId: string;
  estimateToken: string;
  isRecommended: boolean;
}

export interface OrderEstimateResponse {
  routes: RouteOptionResponse[];
}

export interface NearbyDriverResponseItem {
  id: string;
  lat: number;
  lng: number;
  vehicleType: VehicleType;
  distanceM: number;
  updatedAt?: string;
  licensePlate?: string;
}

export interface NearbyDriversResponse {
  source: 'LIVE' | 'DEMO';
  drivers: NearbyDriverResponseItem[];
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
    private readonly prisma?: PrismaService,
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
    const routeEstimates = await this.withProvider(() => this.mapProvider.route(input));

    if (routeEstimates.length === 0) {
      throw this.providerUnavailableError();
    }

    const limited = [...routeEstimates]
      .sort((a, b) => a.durationS - b.durationS)
      .slice(0, MAX_ROUTES);

    const routes = limited.map((estimate, index) => {
      const routeId = `route-${index}`;
      const quote = this.pricingService.quote({
        vehicleType: input.vehicleType,
        distanceMeters: estimate.distanceM,
        stopCount: input.stops.length,
        cargoWeightKg: input.cargoWeightKg,
        hasLoadingSupport: input.hasLoadingSupport,
        hasVatInvoice: input.hasVatInvoice,
      });
      const pricedEstimate = { ...estimate, estimatedPriceVnd: quote.amountVnd };
      const estimateToken = this.estimateTokenService.issue({
        routeInput: input,
        estimate: pricedEstimate,
        quote,
        routeId,
      });

      return {
        ...pricedEstimate,
        routeId,
        estimateToken,
        isRecommended: index === 0,
      };
    });

    return { routes };
  }

  defaultSource(): MapProviderSource {
    return this.mapProvider instanceof DemoMapProvider ? 'DEMO' : 'VIETMAP';
  }

  async getNearbyDrivers(query: {
    lat: number;
    lng: number;
    radiusM?: number;
    vehicleType?: VehicleType;
    limit?: number;
  }): Promise<NearbyDriversResponse> {
    if (!this.prisma) {
      return { source: 'LIVE', drivers: [] };
    }

    const radiusM = query.radiusM ?? 10_000;
    const limit = query.limit ?? 20;

    const rows = query.vehicleType
      ? await this.prisma.$queryRaw<
          Array<{
            id: string;
            userId: string;
            vehicleType: string;
            licensePlate: string | null;
            lat: number;
            lng: number;
            distance_m: number;
            lastKnownAt: Date | null;
          }>
        >`
          SELECT
            dp.id,
            dp."userId",
            dp."vehicleType"::text AS "vehicleType",
            dp."licensePlate",
            ST_Y(dp."lastKnownLocation"::geometry) AS lat,
            ST_X(dp."lastKnownLocation"::geometry) AS lng,
            ST_Distance(dp."lastKnownLocation", ST_SetSRID(ST_MakePoint(${query.lng}, ${query.lat}), 4326)::geography) AS distance_m,
            dp."lastKnownAt"
          FROM "DriverProfile" dp
          WHERE dp.availability = 'AVAILABLE'
            AND dp."vehicleType"::text = ${query.vehicleType}
            AND dp."lastKnownLocation" IS NOT NULL
            AND dp."lastKnownAt" > NOW() - INTERVAL '30 minutes'
            AND ST_DWithin(dp."lastKnownLocation", ST_SetSRID(ST_MakePoint(${query.lng}, ${query.lat}), 4326)::geography, ${radiusM})
          ORDER BY distance_m ASC
          LIMIT ${limit}
        `
      : await this.prisma.$queryRaw<
          Array<{
            id: string;
            userId: string;
            vehicleType: string;
            licensePlate: string | null;
            lat: number;
            lng: number;
            distance_m: number;
            lastKnownAt: Date | null;
          }>
        >`
          SELECT
            dp.id,
            dp."userId",
            dp."vehicleType"::text AS "vehicleType",
            dp."licensePlate",
            ST_Y(dp."lastKnownLocation"::geometry) AS lat,
            ST_X(dp."lastKnownLocation"::geometry) AS lng,
            ST_Distance(dp."lastKnownLocation", ST_SetSRID(ST_MakePoint(${query.lng}, ${query.lat}), 4326)::geography) AS distance_m,
            dp."lastKnownAt"
          FROM "DriverProfile" dp
          WHERE dp.availability = 'AVAILABLE'
            AND dp."lastKnownLocation" IS NOT NULL
            AND dp."lastKnownAt" > NOW() - INTERVAL '30 minutes'
            AND ST_DWithin(dp."lastKnownLocation", ST_SetSRID(ST_MakePoint(${query.lng}, ${query.lat}), 4326)::geography, ${radiusM})
          ORDER BY distance_m ASC
          LIMIT ${limit}
        `;

    const drivers: NearbyDriverResponseItem[] = rows.map((r) => ({
      id: r.userId,
      lat: Number(r.lat),
      lng: Number(r.lng),
      vehicleType: r.vehicleType as VehicleType,
      distanceM: Math.round(Number(r.distance_m)),
      ...(r.lastKnownAt ? { updatedAt: r.lastKnownAt instanceof Date ? r.lastKnownAt.toISOString() : new Date(r.lastKnownAt).toISOString() } : {}),
      ...(r.licensePlate ? { licensePlate: r.licensePlate } : {}),
    }));

    return {
      source: 'LIVE',
      drivers,
    };
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
      'Dịch vụ bản đồ tạm thời không khả dụng',
    );
  }
}
