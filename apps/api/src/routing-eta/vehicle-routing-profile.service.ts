import { Injectable } from '@nestjs/common';
import type { VehicleType } from '@prisma/client';
import { DomainError } from '../common/domain-error.js';
import { PrismaService } from '../database/prisma.service.js';

export interface ResolvedVehicleWeight {
  actualGrossWeightKg: number;
  vehicleProfileSource: 'STANDARD_QUOTE_PROFILE' | 'ASSIGNED_VEHICLE_PROFILE' | 'MANUAL_RECOVERY';
  vehicleRoutingProfileId: string | null;
  quoteVehicleRoutingPolicyId: string | null;
}

export class VehicleWeightExceededError extends DomainError {
  constructor(message: string) {
    super('VEHICLE_WEIGHT_EXCEEDED', 400, message);
  }
}

interface WeightComputationInput {
  cargoWeightKg: number;
  tareWeightKg: number;
  maxPayloadKg: number;
  maxGrossWeightKg: number;
  operationalAllowanceKg: number;
  vehicleProfileSource: ResolvedVehicleWeight['vehicleProfileSource'];
  quoteVehicleRoutingPolicyId: string | null;
  vehicleRoutingProfileId: string | null;
}

@Injectable()
export class VehicleRoutingProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveForQuote(vehicleType: VehicleType, cargoWeightKg: number): Promise<ResolvedVehicleWeight> {
    const policy = await this.prisma.quoteVehicleRoutingPolicy.findFirst({
      where: { vehicleType, supersededAt: null },
    });
    if (!policy) {
      throw new DomainError('ROUTING_POLICY_NOT_FOUND', 500, `Chưa có cấu hình quote cho ${vehicleType}`);
    }

    return this.compute({
      cargoWeightKg,
      tareWeightKg: policy.assumedTareWeightKg,
      maxPayloadKg: policy.assumedMaxPayloadKg,
      maxGrossWeightKg: policy.assumedMaxGrossWeightKg,
      operationalAllowanceKg: policy.operationalAllowanceKg,
      vehicleProfileSource: 'STANDARD_QUOTE_PROFILE',
      quoteVehicleRoutingPolicyId: policy.id,
      vehicleRoutingProfileId: null,
    });
  }

  async resolveForDriver(driverProfileId: string, cargoWeightKg: number): Promise<ResolvedVehicleWeight> {
    const profile = await this.prisma.vehicleRoutingProfile.findFirst({
      where: { driverProfileId, supersededAt: null },
    });
    if (!profile) {
      throw new DomainError('VEHICLE_PROFILE_NOT_FOUND', 404, 'Chưa xác minh hồ sơ xe cho tài xế này');
    }

    return this.compute({
      cargoWeightKg,
      tareWeightKg: profile.tareWeightKg,
      maxPayloadKg: profile.maxPayloadKg,
      maxGrossWeightKg: profile.maxGrossWeightKg,
      operationalAllowanceKg: 0,
      vehicleProfileSource: 'ASSIGNED_VEHICLE_PROFILE',
      quoteVehicleRoutingPolicyId: null,
      vehicleRoutingProfileId: profile.id,
    });
  }

  private compute(input: WeightComputationInput): ResolvedVehicleWeight {
    if (input.cargoWeightKg > input.maxPayloadKg) {
      throw new VehicleWeightExceededError(
        `Trọng lượng hàng ${input.cargoWeightKg}kg vượt tải trọng cho phép ${input.maxPayloadKg}kg`,
      );
    }

    const actualGrossWeightKg = input.tareWeightKg + input.cargoWeightKg + input.operationalAllowanceKg;
    if (actualGrossWeightKg > input.maxGrossWeightKg) {
      throw new VehicleWeightExceededError(
        `Tổng trọng lượng vận hành ${actualGrossWeightKg}kg vượt giới hạn đăng kiểm ${input.maxGrossWeightKg}kg`,
      );
    }

    return {
      actualGrossWeightKg,
      vehicleProfileSource: input.vehicleProfileSource,
      vehicleRoutingProfileId: input.vehicleRoutingProfileId,
      quoteVehicleRoutingPolicyId: input.quoteVehicleRoutingPolicyId,
    };
  }
}
