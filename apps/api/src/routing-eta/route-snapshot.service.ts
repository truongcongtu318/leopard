import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { RouteLegStored } from '@leopard/shared';
import { DomainError } from '../common/domain-error.js';
import { MAP_PROVIDER } from '../maps/maps.service.js';
import type { MapProvider } from '../maps/providers/map-provider.js';
import { computeInputHash, computeRouteHash } from './polyline-hash.js';
import { VehicleRoutingProfileService } from './vehicle-routing-profile.service.js';

export interface CreateRouteSnapshotInput {
  orderId: string;
  reason: 'INITIAL_QUOTE' | 'REROUTE' | 'STOP_COMPLETED' | 'MANUAL_RECOVERY';
  pickup: { id?: string; latitude: number; longitude: number };
  stops: readonly { id: string; latitude: number; longitude: number }[];
  dropoff: { id?: string; latitude: number; longitude: number };
  vehicleType: string;
  cargoWeightKg: number;
  driverProfileId: string | null;
  departureAt: Date;
}

const HASH_ALGORITHM_VERSION = 'sha256-json-v1';

@Injectable()
export class RouteSnapshotService {
  constructor(
    @Inject(MAP_PROVIDER) private readonly mapProvider: MapProvider,
    private readonly vehicleWeights: VehicleRoutingProfileService,
  ) {}

  async createSnapshot(
    input: CreateRouteSnapshotInput,
    tx: Prisma.TransactionClient,
  ): Promise<{ id: string; version: number }> {
    const resolved = input.driverProfileId
      ? await this.vehicleWeights.resolveForDriver(input.driverProfileId, input.cargoWeightKg)
      : await this.vehicleWeights.resolveForQuote(input.vehicleType as never, input.cargoWeightKg);

    const routeInput = {
      pickup: input.pickup,
      stops: input.stops.map((s) => ({ latitude: s.latitude, longitude: s.longitude })),
      dropoff: input.dropoff,
      vehicleType: input.vehicleType,
      cargoWeightKg: resolved.actualGrossWeightKg,
    };

    const [estimate] = await this.mapProvider.route(routeInput);
    if (!estimate) {
      throw new DomainError('ROUTE_NOT_FOUND', 502, 'Không tìm được tuyến đường từ nhà cung cấp bản đồ');
    }

    let pickupId = input.pickup.id;
    let dropoffId = input.dropoff.id;
    if (!pickupId || !dropoffId) {
      const dbStops = await tx.orderStop.findMany({
        where: { orderId: input.orderId },
        orderBy: { sequence: 'asc' },
      });
      if (!pickupId) {
        const p = dbStops.find((s) => s.type === 'PICKUP' || s.sequence === 0);
        pickupId = p?.id ?? 'pickup';
      }
      if (!dropoffId) {
        const d = dbStops.find((s) => s.type === 'DROPOFF') ?? dbStops[dbStops.length - 1];
        dropoffId = d?.id ?? 'dropoff';
      }
    }

    const allStopIds = [pickupId, ...input.stops.map((s) => s.id), dropoffId];
    const storedLegs: RouteLegStored[] = [];

    if (Array.isArray(estimate.legs) && estimate.legs.length === allStopIds.length - 1) {
      for (let i = 0; i < estimate.legs.length; i++) {
        const estLeg = estimate.legs[i]!;
        storedLegs.push({
          fromStopId: allStopIds[i]!,
          toStopId: allStopIds[i + 1]!,
          distanceM: estLeg.distanceM,
          durationS: estLeg.durationS,
          ...(estLeg.geometryStartIndex !== undefined ? { geometryStartIndex: estLeg.geometryStartIndex } : {}),
          ...(estLeg.geometryEndIndex !== undefined ? { geometryEndIndex: estLeg.geometryEndIndex } : {}),
        });
      }
    } else if (allStopIds.length === 2) {
      storedLegs.push({
        fromStopId: allStopIds[0]!,
        toStopId: allStopIds[1]!,
        distanceM: estimate.distanceM,
        durationS: estimate.durationS,
        geometryStartIndex: 0,
      });
    } else {
      for (let i = 0; i < allStopIds.length - 1; i++) {
        storedLegs.push({
          fromStopId: allStopIds[i]!,
          toStopId: allStopIds[i + 1]!,
          distanceM: Math.round(estimate.distanceM / (allStopIds.length - 1)),
          durationS: Math.round(estimate.durationS / (allStopIds.length - 1)),
        });
      }
    }

    const normalizedInput = {
      ...routeInput,
      stopIds: input.stops.map((s) => s.id),
      departureAt: input.departureAt.toISOString(),
    };

    const priorCount = await tx.orderRouteSnapshot.count({ where: { orderId: input.orderId } });
    const version = priorCount + 1;

    const created = await tx.orderRouteSnapshot.create({
      data: {
        orderId: input.orderId,
        version,
        reason: input.reason,
        quality: estimate.source === 'VIETMAP' ? 'VERIFIED_PROVIDER' : 'DEMO',
        geometry: estimate.polyline,
        geometryEncoding: 'POLYLINE5',
        routeHash: computeRouteHash(estimate.polyline),
        inputHash: computeInputHash(normalizedInput),
        hashAlgorithmVersion: HASH_ALGORITHM_VERSION,
        legs: storedLegs as unknown as Prisma.InputJsonValue,
        stopSequence: allStopIds.map((stopId, idx) => ({ stopId, sequence: idx })),
        normalizedInput,
        vehicleProfileSource: resolved.vehicleProfileSource,
        vehicleRoutingProfileId: resolved.vehicleRoutingProfileId,
        quoteVehicleRoutingPolicyId: resolved.quoteVehicleRoutingPolicyId,
        departureAt: input.departureAt,
        source: estimate.source,
        calculatedAt: new Date(estimate.calculatedAt),
      },
    });

    return { id: created.id, version: created.version };
  }
}
