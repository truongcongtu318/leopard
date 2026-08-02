import { Module } from '@nestjs/common';

import { EstimateTokenService } from './domain/estimate-token.service.js';
import { PricingService } from './domain/pricing.service.js';
import {
  BearerAuthGuard,
  MapsController,
  MapsRateLimitGuard,
} from './maps.controller.js';
import { MAP_PROVIDER, MapsService } from './maps.service.js';
import { DemoMapProvider } from './providers/demo-map.provider.js';
import type { MapProvider } from './providers/map-provider.js';
import { ResilientMapProvider } from './providers/resilient-map.provider.js';
import { VietmapProvider } from './providers/vietmap.provider.js';

@Module({
  controllers: [MapsController],
  providers: [
    BearerAuthGuard,
    MapsRateLimitGuard,
    MapsService,
    {
      provide: MAP_PROVIDER,
      useFactory: (): MapProvider => createMapProvider(process.env),
    },
    {
      provide: PricingService,
      useFactory: (): PricingService => PricingService.fromEnv(testPricingDefaults(process.env)),
    },
    {
      provide: EstimateTokenService,
      useFactory: (): EstimateTokenService =>
        EstimateTokenService.fromEnv(testEstimateTokenDefaults(process.env)),
    },
  ],
  exports: [EstimateTokenService],
})
export class MapsModule {}

function createMapProvider(source: NodeJS.ProcessEnv): MapProvider {
  const demoProvider = new DemoMapProvider();

  if ((source.MAP_PROVIDER ?? 'demo').toLowerCase() !== 'vietmap') {
    return demoProvider;
  }

  const primaryProvider = new VietmapProvider({
    apiKey: source.VIETMAP_API_KEY ?? '',
    ...(source.VIETMAP_BASE_URL ? { baseUrl: source.VIETMAP_BASE_URL } : {}),
    ...(source.VIETMAP_TIMEOUT_MS
      ? { timeoutMs: parsePositiveInteger(source.VIETMAP_TIMEOUT_MS) }
      : {}),
  });

  return new ResilientMapProvider(primaryProvider, demoProvider, {
    allowDemoProvider: source.ALLOW_DEMO_PROVIDER === 'true',
  });
}

function testPricingDefaults(source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  if (source.NODE_ENV !== 'test') {
    return source;
  }

  return {
    PRICING_MINIMUM_FARE_VND: '10000',
    PRICING_STOP_SURCHARGE_VND: '2500',
    PRICING_VEHICLE_RATES_JSON: JSON.stringify({
      MOTORBIKE: { baseFareVnd: 10_000, perKmVnd: 3_500 },
      VAN: { baseFareVnd: 20_000, perKmVnd: 8_000 },
      TRUCK: { baseFareVnd: 35_000, perKmVnd: 12_000 },
    }),
    ...source,
  };
}

function testEstimateTokenDefaults(source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  if (source.NODE_ENV !== 'test') {
    return source;
  }

  return {
    ESTIMATE_TOKEN_HMAC_SECRET: 'test-estimate-token-secret-32-bytes',
    ...source,
  };
}

function parsePositiveInteger(value: string): number {
  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return 5_000;
  }

  return parsed;
}
