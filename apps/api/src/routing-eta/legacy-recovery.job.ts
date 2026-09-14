import type { PrismaService } from '../database/prisma.service.js';
import type { EtaService } from './eta.service.js';
import { computeInputHash, computeRouteHash } from './polyline-hash.js';

const NON_TERMINAL_STATUSES = ['ACCEPTED', 'PICKING_UP', 'IN_TRANSIT', 'RETURNING'];

// OrderStop.location is a PostGIS `Unsupported("geography(Point,4326)")` column, so it is not
// exposed as a scalar on the generated Prisma type. Legacy pre-migration data may still carry a
// denormalized latitude/longitude on the row (or callers may enrich stops with it via a raw
// ST_X/ST_Y projection before invoking this job) — we read it defensively and treat it as absent
// when not present, which safely routes the order to the recompute path instead of the legacy path.
interface LegacyStopCoords {
  id: string;
  sequence: number;
  latitude?: number;
  longitude?: number;
}

export async function runLegacyRouteRecovery(
  prisma: PrismaService,
  etaService: EtaService,
  recoveryJobVersion: string,
): Promise<{ recovered: number; enqueuedForRecompute: number }> {
  const orders = await prisma.order.findMany({
    where: { activeRouteSnapshotId: null, status: { in: NON_TERMINAL_STATUSES as never } },
    include: { stops: true },
  });

  let recovered = 0;
  let enqueuedForRecompute = 0;

  for (const order of orders) {
    await prisma.$transaction(async (tx) => {
      const legacy = order.routeSnapshot as { polyline?: string; source?: string; calculatedAt?: string } | null;
      const stops = order.stops as unknown as LegacyStopCoords[];
      const hasValidGeometry = typeof legacy?.polyline === 'string' && legacy.polyline.length > 0;
      const hasValidCoords = stops.every((s) => typeof s.latitude === 'number' && typeof s.longitude === 'number');

      if (legacy && hasValidGeometry && hasValidCoords) {
        const normalizedInput = { stopIds: stops.map((s) => s.id) };
        await tx.orderRouteSnapshot.create({
          data: {
            orderId: order.id,
            version: 1,
            reason: 'MANUAL_RECOVERY',
            quality: 'LEGACY_RECOVERED',
            geometry: legacy.polyline!,
            geometryEncoding: 'POLYLINE5',
            routeHash: computeRouteHash(legacy.polyline!),
            inputHash: computeInputHash(normalizedInput),
            hashAlgorithmVersion: 'sha256-json-v1',
            legs: [],
            stopSequence: stops.map((s) => ({ stopId: s.id, sequence: s.sequence })),
            normalizedInput,
            vehicleProfileSource: 'MANUAL_RECOVERY',
            vehicleRoutingProfileId: null,
            quoteVehicleRoutingPolicyId: null,
            departureAt: new Date(legacy.calculatedAt ?? Date.now()),
            source: legacy.source === 'VIETMAP' ? 'VIETMAP' : 'DEMO',
            calculatedAt: new Date(legacy.calculatedAt ?? Date.now()),
            legacySourceSnapshotJson: legacy as never,
            legacyMissingFields: [],
            recoveryJobVersion,
            recoveredAt: new Date(),
          },
        });
        recovered += 1;
        return;
      }

      await etaService.bumpRevision(tx, order.id);
      enqueuedForRecompute += 1;
    });
  }

  return { recovered, enqueuedForRecompute };
}
