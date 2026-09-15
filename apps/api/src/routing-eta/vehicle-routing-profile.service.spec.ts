import { Test } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service.js';
import { VehicleRoutingProfileService, VehicleWeightExceededError } from './vehicle-routing-profile.service.js';

describe('VehicleRoutingProfileService', () => {
  let service: VehicleRoutingProfileService;
  let prisma: { quoteVehicleRoutingPolicy: { findFirst: jest.Mock }; vehicleRoutingProfile: { findFirst: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      quoteVehicleRoutingPolicy: { findFirst: jest.fn() },
      vehicleRoutingProfile: { findFirst: jest.fn() },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        VehicleRoutingProfileService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(VehicleRoutingProfileService);
  });

  it('computes actualGrossWeightKg from the current quote policy', async () => {
    prisma.quoteVehicleRoutingPolicy.findFirst.mockResolvedValue({
      id: 'policy-1',
      assumedTareWeightKg: 2000,
      assumedMaxPayloadKg: 1000,
      assumedMaxGrossWeightKg: 3200,
      operationalAllowanceKg: 50,
    });

    const result = await service.resolveForQuote('TRUCK', 800);

    expect(result).toEqual({
      actualGrossWeightKg: 2850,
      vehicleProfileSource: 'STANDARD_QUOTE_PROFILE',
      vehicleRoutingProfileId: null,
      quoteVehicleRoutingPolicyId: 'policy-1',
    });
  });

  it('rejects cargo weight over maxPayloadKg', async () => {
    prisma.quoteVehicleRoutingPolicy.findFirst.mockResolvedValue({
      id: 'policy-1',
      assumedTareWeightKg: 2000,
      assumedMaxPayloadKg: 1000,
      assumedMaxGrossWeightKg: 3200,
      operationalAllowanceKg: 50,
    });

    await expect(service.resolveForQuote('TRUCK', 1500)).rejects.toBeInstanceOf(VehicleWeightExceededError);
  });

  it('rejects actualGrossWeightKg over maxGrossWeightKg even when cargo alone fits payload', async () => {
    prisma.vehicleRoutingProfile.findFirst.mockResolvedValue({
      id: 'profile-1',
      tareWeightKg: 3000,
      maxPayloadKg: 1000,
      maxGrossWeightKg: 3500,
    });

    await expect(service.resolveForDriver('driver-1', 900)).rejects.toBeInstanceOf(VehicleWeightExceededError);
  });
});
