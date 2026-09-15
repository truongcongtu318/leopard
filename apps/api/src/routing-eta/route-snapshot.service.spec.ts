import { Test } from '@nestjs/testing';
import { MAP_PROVIDER } from '../maps/maps.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { VehicleRoutingProfileService } from './vehicle-routing-profile.service.js';
import { RouteSnapshotService } from './route-snapshot.service.js';

describe('RouteSnapshotService', () => {
  it('creates version 1 for the first snapshot of an order, encoding=POLYLINE5', async () => {
    const mapProvider = {
      route: jest.fn().mockResolvedValue([
        {
          polyline: 'abc123',
          distanceM: 7680,
          durationS: 720,
          source: 'VIETMAP',
          calculatedAt: new Date().toISOString(),
          isEstimate: false,
          congestionLevel: 'unknown',
          estimatedArrivalAt: new Date().toISOString(),
          estimatedPriceVnd: 0,
        },
      ]),
    };
    const vehicleWeights = {
      resolveForQuote: jest.fn().mockResolvedValue({
        actualGrossWeightKg: 2850,
        vehicleProfileSource: 'STANDARD_QUOTE_PROFILE',
        vehicleRoutingProfileId: null,
        quoteVehicleRoutingPolicyId: 'policy-1',
      }),
    };
    const tx = {
      orderRouteSnapshot: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 'snap-1', version: 1 }),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        RouteSnapshotService,
        { provide: MAP_PROVIDER, useValue: mapProvider },
        { provide: VehicleRoutingProfileService, useValue: vehicleWeights },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();
    const service = moduleRef.get(RouteSnapshotService);

    const result = await service.createSnapshot(
      {
        orderId: 'order-1',
        reason: 'INITIAL_QUOTE',
        pickup: { latitude: 10.79, longitude: 106.65 },
        stops: [],
        dropoff: { latitude: 10.76, longitude: 106.8 },
        vehicleType: 'TRUCK',
        cargoWeightKg: 800,
        driverProfileId: null,
        departureAt: new Date('2026-09-14T00:00:00Z'),
      },
      tx as any,
    );

    expect(mapProvider.route).toHaveBeenCalledWith(
      expect.objectContaining({ vehicleType: 'TRUCK', cargoWeightKg: 2850 }),
    );
    expect(tx.orderRouteSnapshot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderId: 'order-1',
          version: 1,
          geometryEncoding: 'POLYLINE5',
          quality: 'VERIFIED_PROVIDER',
          vehicleProfileSource: 'STANDARD_QUOTE_PROFILE',
        }),
      }),
    );
    expect(result).toEqual({ id: 'snap-1', version: 1 });
  });
});
