import { describe, expect, it, jest } from '@jest/globals';

import { MapsService } from './maps.service.js';
import type { EstimateTokenService } from './domain/estimate-token.service.js';
import type { PricingService } from './domain/pricing.service.js';
import type { MapProvider, RouteEstimate, RouteInput } from './providers/map-provider.js';

describe('MapsService.estimate', () => {
  const routeInput: RouteInput = {
    pickup: { latitude: 10.76, longitude: 106.66 },
    stops: [],
    dropoff: { latitude: 10.8, longitude: 106.7 },
    vehicleType: 'MOTORBIKE',
  };

  function estimateOf(durationS: number, distanceM: number): RouteEstimate {
    return {
      polyline: `polyline-${durationS}`,
      distanceM,
      durationS,
      estimatedArrivalAt: '2026-08-01T03:30:00.000Z',
      estimatedPriceVnd: 0,
      source: 'VIETMAP',
      calculatedAt: '2026-08-01T03:00:00.000Z',
      isEstimate: true,
      congestionLevel: 'unknown',
    };
  }

  function services(routeEstimates: RouteEstimate[]) {
    const mapProvider: MapProvider = {
      search: jest.fn<MapProvider['search']>(),
      geocode: jest.fn<MapProvider['geocode']>(),
      route: jest.fn<MapProvider['route']>().mockResolvedValue(routeEstimates),
    };
    const pricingService = {
      quote: jest
        .fn<PricingService['quote']>()
        .mockImplementation(({ distanceMeters }) => ({
          amountVnd: 10_000 + distanceMeters,
          currency: 'VND',
        })),
    } as unknown as PricingService;
    const estimateTokenService = {
      issue: jest
        .fn<EstimateTokenService['issue']>()
        .mockImplementation(({ routeId }) => `token-${routeId}`),
    } as unknown as EstimateTokenService;

    return { mapProvider, pricingService, estimateTokenService };
  }

  it('recommends the route with the lowest durationS', async () => {
    const { mapProvider, pricingService, estimateTokenService } = services([
      estimateOf(1_800, 12_000),
      estimateOf(1_620, 14_000),
      estimateOf(2_100, 11_000),
    ]);
    const service = new MapsService(mapProvider, pricingService, estimateTokenService);

    const result = await service.estimate(routeInput);

    expect(result.routes).toHaveLength(3);
    const recommended = result.routes.filter((route) => route.isRecommended);
    expect(recommended).toHaveLength(1);
    expect(recommended[0]?.durationS).toBe(1_620);
  });

  it('limits the response to at most 3 routes, keeping the fastest ones', async () => {
    const { mapProvider, pricingService, estimateTokenService } = services([
      estimateOf(2_000, 10_000),
      estimateOf(1_500, 9_000),
      estimateOf(1_800, 11_000),
      estimateOf(2_500, 8_000),
    ]);
    const service = new MapsService(mapProvider, pricingService, estimateTokenService);

    const result = await service.estimate(routeInput);

    expect(result.routes).toHaveLength(3);
    expect(result.routes.map((route) => route.durationS).sort((a, b) => a - b)).toEqual([
      1_500, 1_800, 2_000,
    ]);
  });

  it('issues a distinct token and routeId for every route, priced from its own distance', async () => {
    const { mapProvider, pricingService, estimateTokenService } = services([
      estimateOf(1_800, 12_000),
      estimateOf(1_620, 14_000),
    ]);
    const service = new MapsService(mapProvider, pricingService, estimateTokenService);

    const result = await service.estimate(routeInput);

    expect(result.routes.map((route) => route.routeId)).toEqual(['route-0', 'route-1']);
    expect(result.routes.map((route) => route.estimateToken)).toEqual([
      'token-route-0',
      'token-route-1',
    ]);
    // Routes are sorted ascending by durationS before mapping (per MapsService.estimate),
    // so route-0 is the 1_620s/14_000m route and route-1 is the 1_800s/12_000m route.
    expect(result.routes[0]?.estimatedPriceVnd).toBe(10_000 + 14_000);
    expect(result.routes[1]?.estimatedPriceVnd).toBe(10_000 + 12_000);
  });

  it('throws MAP_PROVIDER_UNAVAILABLE when the provider returns no routes', async () => {
    const { mapProvider, pricingService, estimateTokenService } = services([]);
    const service = new MapsService(mapProvider, pricingService, estimateTokenService);

    await expect(service.estimate(routeInput)).rejects.toMatchObject({
      code: 'MAP_PROVIDER_UNAVAILABLE',
    });
  });
});
