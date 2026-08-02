import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PrismaPg } from '@prisma/adapter-pg';
import prismaClientPackage, { type Prisma } from '@prisma/client';

type Coordinate = {
  lat: number;
  lng: number;
};

type TimestampedManifest = {
  createdAt?: string;
};

type ManifestUser = TimestampedManifest & {
  id: string;
  phone: string;
  role: 'CUSTOMER' | 'DRIVER' | 'FLEET_OWNER' | 'ADMIN';
  status: 'ACTIVE' | 'DISABLED';
};

type DriverProfileManifest = TimestampedManifest & {
  id: string;
  userId: string;
  availability: 'OFFLINE' | 'AVAILABLE' | 'BUSY';
  vehicleType: 'MOTORBIKE' | 'VAN' | 'TRUCK';
  lastKnownAt: string | null;
  location: Coordinate | null;
};

type FleetManifest = TimestampedManifest & {
  id: string;
  name: string;
};

type FleetMemberManifest = TimestampedManifest & {
  id: string;
  fleetId: string;
  userId: string;
  role: 'OWNER' | 'DRIVER';
  status: 'INVITED' | 'ACTIVE' | 'REMOVED';
  invitedAt: string;
  joinedAt: string | null;
  removedAt: string | null;
};

type RefreshSessionManifest = TimestampedManifest & {
  id: string;
  userId: string;
  seedKey: string;
  expiresAt: string;
};

type OrderStopManifest = TimestampedManifest & {
  id: string;
  type: 'PICKUP' | 'STOP' | 'DROPOFF';
  sequence: number;
  address: string;
  location: Coordinate;
};

type OrderStatusHistoryManifest = {
  id: string;
  fromStatus: 'REQUESTED' | 'ACCEPTED' | 'PICKING_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED' | null;
  toStatus: 'REQUESTED' | 'ACCEPTED' | 'PICKING_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  actorId: string | null;
  reason: string | null;
  createdAt: string;
};

type TrackingPointManifest = TimestampedManifest & {
  id: string;
  driverId: string;
  clientPointId: string;
  capturedAt: string;
  location: Coordinate;
};

type MediaObjectManifest = TimestampedManifest & {
  id: string;
  uploaderId: string;
  type: 'CARGO' | 'DELIVERY_PROOF';
  provider: 'VIETMAP' | 'DEMO' | 'PAYOS' | 'VIETQR' | 'LOCAL' | 'S3';
  storageKey: string;
  contentType: string;
  sizeBytes: number;
};

type PaymentIntentManifest = TimestampedManifest & {
  id: string;
  provider: 'VIETMAP' | 'DEMO' | 'PAYOS' | 'VIETQR' | 'LOCAL' | 'S3';
  status: 'UNPAID' | 'QR_CREATED' | 'PAID_MANUAL' | 'FAILED';
  amountVnd: number;
  qrPayload: string | null;
  providerSnapshot: Record<string, string> | null;
  expiresAt: string | null;
};

type OrderManifest = TimestampedManifest & {
  id: string;
  customerId: string;
  driverId: string | null;
  status: 'REQUESTED' | 'ACCEPTED' | 'PICKING_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  providerSource: 'VIETMAP' | 'DEMO' | 'PAYOS' | 'VIETQR' | 'LOCAL' | 'S3' | null;
  distanceMeters: number | null;
  durationSeconds: number | null;
  priceVnd: number | null;
  etaSeconds: number | null;
  timestamps: {
    acceptedAt: string | null;
    pickingUpAt: string | null;
    inTransitAt: string | null;
    deliveredAt: string | null;
    cancelledAt: string | null;
  };
  routeSnapshot: Record<string, string | number | boolean | null>;
  stops: OrderStopManifest[];
  statusHistory: OrderStatusHistoryManifest[];
  trackingPoints: TrackingPointManifest[];
  mediaObjects: MediaObjectManifest[];
  paymentIntents: PaymentIntentManifest[];
};

type DemoManifest = {
  users: ManifestUser[];
  driverProfiles: DriverProfileManifest[];
  fleets: FleetManifest[];
  fleetMembers: FleetMemberManifest[];
  refreshSessions: RefreshSessionManifest[];
  orders: OrderManifest[];
};

type DemoBoundary = {
  driverProfileIds: string[];
  fleetIds: string[];
  fleetMemberIds: string[];
  mediaObjectIds: string[];
  orderIds: string[];
  orderStatusHistoryIds: string[];
  orderStopIds: string[];
  paymentIntentIds: string[];
  refreshSessionIds: string[];
  trackingPointIds: string[];
  userIds: string[];
};

const { PrismaClient } = prismaClientPackage;
type SeedClient = Prisma.TransactionClient;

function requireDatabaseUrl(): string {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required to run the deterministic seed');
  }

  return connectionString;
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: requireDatabaseUrl(),
  }),
});

function manifestPath(): string {
  return path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    '..',
    'infra',
    'seed',
    'demo-manifest.json',
  );
}

async function loadManifest(): Promise<DemoManifest> {
  const rawManifest = await readFile(manifestPath(), 'utf8');
  return JSON.parse(rawManifest) as DemoManifest;
}

function toDate(value: string | null): Date | null {
  return value ? new Date(value) : null;
}

function requiredCreatedAt(value: string | undefined, label: string): Date {
  if (!value) {
    throw new Error(`${label} must declare createdAt in infra/seed/demo-manifest.json`);
  }

  return new Date(value);
}

function createdAtForFleetMember(member: FleetMemberManifest): Date {
  return member.createdAt ? new Date(member.createdAt) : new Date(member.invitedAt);
}

function createdAtForOrder(order: OrderManifest): Date {
  if (order.createdAt) {
    return new Date(order.createdAt);
  }

  const initialStatus = order.statusHistory[0]?.createdAt;
  if (!initialStatus) {
    throw new Error(`orders[${order.id}] must declare createdAt or at least one status history entry`);
  }

  return new Date(initialStatus);
}

function createdAtForTrackingPoint(point: TrackingPointManifest): Date {
  return point.createdAt ? new Date(point.createdAt) : new Date(point.capturedAt);
}

function toTokenHash(seedKey: string): string {
  return createHash('sha256').update(`leopard-demo-seed:${seedKey}`).digest('hex');
}

async function loadExistingDemoBoundary(client: SeedClient, manifest: DemoManifest): Promise<DemoBoundary> {
  const orderIds = manifest.orders.map((order) => order.id);
  const existingOrders = await client.order.findMany({
    where: {
      id: {
        in: orderIds,
      },
    },
    select: {
      id: true,
    },
  });

  return {
    driverProfileIds: manifest.driverProfiles.map((profile) => profile.id),
    fleetIds: manifest.fleets.map((fleet) => fleet.id),
    fleetMemberIds: manifest.fleetMembers.map((member) => member.id),
    mediaObjectIds: manifest.orders.flatMap((order) =>
      order.mediaObjects.map((mediaObject) => mediaObject.id),
    ),
    orderIds: existingOrders.map((order) => order.id),
    orderStatusHistoryIds: manifest.orders.flatMap((order) =>
      order.statusHistory.map((statusHistory) => statusHistory.id),
    ),
    orderStopIds: manifest.orders.flatMap((order) => order.stops.map((stop) => stop.id)),
    paymentIntentIds: manifest.orders.flatMap((order) =>
      order.paymentIntents.map((paymentIntent) => paymentIntent.id),
    ),
    refreshSessionIds: manifest.refreshSessions.map((session) => session.id),
    trackingPointIds: manifest.orders.flatMap((order) =>
      order.trackingPoints.map((trackingPoint) => trackingPoint.id),
    ),
    userIds: manifest.users.map((user) => user.id),
  };
}

async function deleteExistingDemoBoundary(client: SeedClient, boundary: DemoBoundary): Promise<void> {
  if (boundary.userIds.length > 0) {
    // Actor-owned rows can point at orders outside the demo order boundary.
    await client.auditLog.deleteMany({
      where: {
        actorId: {
          in: boundary.userIds,
        },
      },
    });
    await client.orderStatusHistory.deleteMany({
      where: {
        OR: [
          {
            id: {
              in: boundary.orderStatusHistoryIds,
            },
          },
          {
            actorId: {
              in: boundary.userIds,
            },
          },
        ],
      },
    });
    await client.trackingPoint.deleteMany({
      where: {
        OR: [
          {
            id: {
              in: boundary.trackingPointIds,
            },
          },
          {
            driverId: {
              in: boundary.userIds,
            },
          },
        ],
      },
    });
    await client.mediaObject.deleteMany({
      where: {
        OR: [
          {
            id: {
              in: boundary.mediaObjectIds,
            },
          },
          {
            uploaderId: {
              in: boundary.userIds,
            },
          },
        ],
      },
    });
  }

  if (boundary.orderIds.length > 0) {
    await client.mediaObject.deleteMany({
      where: {
        OR: [
          {
            id: {
              in: boundary.mediaObjectIds,
            },
          },
          {
            orderId: {
              in: boundary.orderIds,
            },
          },
        ],
      },
    });
    await client.paymentIntent.deleteMany({
      where: {
        OR: [
          {
            id: {
              in: boundary.paymentIntentIds,
            },
          },
          {
            orderId: {
              in: boundary.orderIds,
            },
          },
        ],
      },
    });
    await client.trackingPoint.deleteMany({
      where: {
        OR: [
          {
            id: {
              in: boundary.trackingPointIds,
            },
          },
          {
            orderId: {
              in: boundary.orderIds,
            },
          },
        ],
      },
    });
    await client.orderStatusHistory.deleteMany({
      where: {
        OR: [
          {
            id: {
              in: boundary.orderStatusHistoryIds,
            },
          },
          {
            orderId: {
              in: boundary.orderIds,
            },
          },
        ],
      },
    });
    await client.orderStop.deleteMany({
      where: {
        OR: [
          {
            id: {
              in: boundary.orderStopIds,
            },
          },
          {
            orderId: {
              in: boundary.orderIds,
            },
          },
        ],
      },
    });
    await client.order.deleteMany({
      where: {
        id: {
          in: boundary.orderIds,
        },
      },
    });
  }

  if (boundary.userIds.length > 0 || boundary.fleetIds.length > 0) {
    await client.refreshSession.deleteMany({
      where: {
        OR: [
          {
            id: {
              in: boundary.refreshSessionIds,
            },
          },
          {
            userId: {
              in: boundary.userIds,
            },
          },
        ],
      },
    });
    await client.fleetMember.deleteMany({
      where: {
        OR: [
          {
            id: {
              in: boundary.fleetMemberIds,
            },
          },
          {
            fleetId: {
              in: boundary.fleetIds,
            },
          },
          {
            userId: {
              in: boundary.userIds,
            },
          },
        ],
      },
    });
    await client.driverProfile.deleteMany({
      where: {
        OR: [
          {
            id: {
              in: boundary.driverProfileIds,
            },
          },
          {
            userId: {
              in: boundary.userIds,
            },
          },
        ],
      },
    });
    await client.fleet.deleteMany({
      where: {
        id: {
          in: boundary.fleetIds,
        },
      },
    });
    await client.user.deleteMany({
      where: {
        id: {
          in: boundary.userIds,
        },
      },
    });
  }
}

async function insertUsers(client: SeedClient, manifest: DemoManifest): Promise<void> {
  await client.user.createMany({
    data: manifest.users.map((user) => {
      const createdAt = requiredCreatedAt(user.createdAt, `users[${user.id}]`);

      return {
        id: user.id,
        phone: user.phone,
        role: user.role,
        status: user.status,
        createdAt,
        updatedAt: createdAt,
      };
    }),
  });
}

async function insertDriverProfiles(client: SeedClient, manifest: DemoManifest): Promise<void> {
  await client.driverProfile.createMany({
    data: manifest.driverProfiles.map((profile) => {
      const createdAt = requiredCreatedAt(profile.createdAt, `driverProfiles[${profile.id}]`);

      return {
        id: profile.id,
        userId: profile.userId,
        availability: profile.availability,
        vehicleType: profile.vehicleType,
        lastKnownAt: toDate(profile.lastKnownAt),
        createdAt,
        updatedAt: createdAt,
      };
    }),
  });

  for (const profile of manifest.driverProfiles) {
    if (!profile.location) {
      continue;
    }

    await client.$executeRaw`
      UPDATE "DriverProfile"
      SET "lastKnownLocation" = ST_SetSRID(
            ST_MakePoint(${profile.location.lng}, ${profile.location.lat}),
            4326
          )::geography
      WHERE id = ${profile.id}::uuid
    `;
  }
}

async function insertFleets(client: SeedClient, manifest: DemoManifest): Promise<void> {
  await client.fleet.createMany({
    data: manifest.fleets.map((fleet) => {
      const createdAt = requiredCreatedAt(fleet.createdAt, `fleets[${fleet.id}]`);

      return {
        id: fleet.id,
        name: fleet.name,
        createdAt,
        updatedAt: createdAt,
      };
    }),
  });
}

async function insertFleetMembers(client: SeedClient, manifest: DemoManifest): Promise<void> {
  await client.fleetMember.createMany({
    data: manifest.fleetMembers.map((member) => {
      const createdAt = createdAtForFleetMember(member);

      return {
        id: member.id,
        fleetId: member.fleetId,
        userId: member.userId,
        role: member.role,
        status: member.status,
        invitedAt: new Date(member.invitedAt),
        joinedAt: toDate(member.joinedAt),
        removedAt: toDate(member.removedAt),
        createdAt,
        updatedAt: createdAt,
      };
    }),
  });
}

async function insertRefreshSessions(client: SeedClient, manifest: DemoManifest): Promise<void> {
  await client.refreshSession.createMany({
    data: manifest.refreshSessions.map((session) => {
      const createdAt = requiredCreatedAt(session.createdAt, `refreshSessions[${session.id}]`);

      return {
        id: session.id,
        userId: session.userId,
        tokenHash: toTokenHash(session.seedKey),
        expiresAt: new Date(session.expiresAt),
        revokedAt: null,
        createdAt,
        updatedAt: createdAt,
      };
    }),
  });
}

async function insertOrders(client: SeedClient, manifest: DemoManifest): Promise<void> {
  await client.order.createMany({
    data: manifest.orders.map((order) => {
      const createdAt = createdAtForOrder(order);

      return {
        id: order.id,
        customerId: order.customerId,
        driverId: order.driverId,
        status: order.status,
        routeSnapshot: order.routeSnapshot,
        providerSource: order.providerSource,
        distanceMeters: order.distanceMeters,
        durationSeconds: order.durationSeconds,
        priceVnd: order.priceVnd,
        etaSeconds: order.etaSeconds,
        acceptedAt: toDate(order.timestamps.acceptedAt),
        pickingUpAt: toDate(order.timestamps.pickingUpAt),
        inTransitAt: toDate(order.timestamps.inTransitAt),
        deliveredAt: toDate(order.timestamps.deliveredAt),
        cancelledAt: toDate(order.timestamps.cancelledAt),
        createdAt,
        updatedAt: createdAt,
      };
    }),
  });
}

async function insertOrderChildren(client: SeedClient, manifest: DemoManifest): Promise<void> {
  for (const order of manifest.orders) {
    for (const stop of order.stops) {
      const createdAt = requiredCreatedAt(stop.createdAt, `orderStops[${stop.id}]`);

      await client.$executeRaw`
        INSERT INTO "OrderStop" (
          id,
          "orderId",
          type,
          sequence,
          address,
          location,
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${stop.id}::uuid,
          ${order.id}::uuid,
          ${stop.type}::"StopType",
          ${stop.sequence},
          ${stop.address},
          ST_SetSRID(ST_MakePoint(${stop.location.lng}, ${stop.location.lat}), 4326)::geography,
          ${createdAt}::timestamptz,
          ${createdAt}::timestamptz
        )
      `;
    }

    if (order.statusHistory.length > 0) {
      await client.orderStatusHistory.createMany({
        data: order.statusHistory.map((entry) => ({
          id: entry.id,
          orderId: order.id,
          fromStatus: entry.fromStatus,
          toStatus: entry.toStatus,
          actorId: entry.actorId,
          reason: entry.reason,
          createdAt: new Date(entry.createdAt),
        })),
      });
    }

    for (const point of order.trackingPoints) {
      const createdAt = createdAtForTrackingPoint(point);

      await client.$executeRaw`
        INSERT INTO "TrackingPoint" (
          id,
          "orderId",
          "driverId",
          "clientPointId",
          location,
          "capturedAt",
          "createdAt"
        )
        VALUES (
          ${point.id}::uuid,
          ${order.id}::uuid,
          ${point.driverId}::uuid,
          ${point.clientPointId},
          ST_SetSRID(ST_MakePoint(${point.location.lng}, ${point.location.lat}), 4326)::geography,
          ${new Date(point.capturedAt)}::timestamptz,
          ${createdAt}::timestamptz
        )
      `;
    }

    if (order.mediaObjects.length > 0) {
      await client.mediaObject.createMany({
        data: order.mediaObjects.map((mediaObject) => ({
          id: mediaObject.id,
          orderId: order.id,
          uploaderId: mediaObject.uploaderId,
          type: mediaObject.type,
          provider: mediaObject.provider,
          storageKey: mediaObject.storageKey,
          contentType: mediaObject.contentType,
          sizeBytes: mediaObject.sizeBytes,
          createdAt: requiredCreatedAt(
            mediaObject.createdAt,
            `mediaObjects[${mediaObject.id}]`,
          ),
        })),
      });
    }

    if (order.paymentIntents.length > 0) {
      await client.paymentIntent.createMany({
        data: order.paymentIntents.map((paymentIntent) => {
          const createdAt = requiredCreatedAt(
            paymentIntent.createdAt,
            `paymentIntents[${paymentIntent.id}]`,
          );

          return {
            id: paymentIntent.id,
            orderId: order.id,
            provider: paymentIntent.provider,
            status: paymentIntent.status,
            amountVnd: paymentIntent.amountVnd,
            qrPayload: paymentIntent.qrPayload,
            providerSnapshot: paymentIntent.providerSnapshot ?? undefined,
            expiresAt: toDate(paymentIntent.expiresAt),
            createdAt,
            updatedAt: createdAt,
          };
        }),
      });
    }
  }
}

export async function seedPilotData(): Promise<void> {
  const manifest = await loadManifest();

  await prisma.$transaction(
    async (client) => {
      const boundary = await loadExistingDemoBoundary(client, manifest);

      await deleteExistingDemoBoundary(client, boundary);
      await insertUsers(client, manifest);
      await insertDriverProfiles(client, manifest);
      await insertFleets(client, manifest);
      await insertFleetMembers(client, manifest);
      await insertOrders(client, manifest);
      await insertOrderChildren(client, manifest);
      await insertRefreshSessions(client, manifest);
    },
    {
      maxWait: 10_000,
      timeout: 30_000,
    },
  );

  process.stdout.write(
    `Seeded ${manifest.users.length} users, ${manifest.fleets.length} fleets and ${manifest.orders.length} orders.\n`,
  );
}

async function main(): Promise<void> {
  await seedPilotData();
  await prisma.$disconnect();
}

void main().catch(async (error: unknown) => {
  await prisma.$disconnect();
  console.error(error);
  process.exitCode = 1;
});
