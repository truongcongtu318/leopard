import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PrismaPg } from '@prisma/adapter-pg';
import prismaClientPackage from '@prisma/client';

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
  fleetIds: string[];
  orderIds: string[];
  userIds: string[];
};

const DEMO_PHONE_PREFIX = '09000000';
const DEMO_FLEET_NAME_PREFIX = 'Demo Fleet ';

const { PrismaClient } = prismaClientPackage;

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

async function loadExistingDemoBoundary(): Promise<DemoBoundary> {
  const users = await prisma.user.findMany({
    where: {
      phone: {
        startsWith: DEMO_PHONE_PREFIX,
      },
    },
    select: {
      id: true,
    },
  });

  const fleets = await prisma.fleet.findMany({
    where: {
      name: {
        startsWith: DEMO_FLEET_NAME_PREFIX,
      },
    },
    select: {
      id: true,
    },
  });

  const userIds = users.map((user) => user.id);
  const fleetIds = fleets.map((fleet) => fleet.id);

  const orders =
    userIds.length === 0
      ? []
      : await prisma.order.findMany({
          where: {
            OR: [
              {
                customerId: {
                  in: userIds,
                },
              },
              {
                driverId: {
                  in: userIds,
                },
              },
            ],
          },
          select: {
            id: true,
          },
        });

  return {
    fleetIds,
    orderIds: orders.map((order) => order.id),
    userIds,
  };
}

async function deleteExistingDemoBoundary(boundary: DemoBoundary): Promise<void> {
  if (boundary.orderIds.length > 0) {
    await prisma.mediaObject.deleteMany({
      where: {
        orderId: {
          in: boundary.orderIds,
        },
      },
    });
    await prisma.paymentIntent.deleteMany({
      where: {
        orderId: {
          in: boundary.orderIds,
        },
      },
    });
    await prisma.trackingPoint.deleteMany({
      where: {
        orderId: {
          in: boundary.orderIds,
        },
      },
    });
    await prisma.orderStatusHistory.deleteMany({
      where: {
        orderId: {
          in: boundary.orderIds,
        },
      },
    });
    await prisma.orderStop.deleteMany({
      where: {
        orderId: {
          in: boundary.orderIds,
        },
      },
    });
    await prisma.order.deleteMany({
      where: {
        id: {
          in: boundary.orderIds,
        },
      },
    });
  }

  if (boundary.userIds.length > 0 || boundary.fleetIds.length > 0) {
    await prisma.refreshSession.deleteMany({
      where: {
        userId: {
          in: boundary.userIds,
        },
      },
    });
    await prisma.fleetMember.deleteMany({
      where: {
        OR: [
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
    await prisma.driverProfile.deleteMany({
      where: {
        userId: {
          in: boundary.userIds,
        },
      },
    });
    await prisma.fleet.deleteMany({
      where: {
        id: {
          in: boundary.fleetIds,
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: boundary.userIds,
        },
      },
    });
  }
}

async function insertUsers(manifest: DemoManifest): Promise<void> {
  await prisma.user.createMany({
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

async function insertDriverProfiles(manifest: DemoManifest): Promise<void> {
  await prisma.driverProfile.createMany({
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

    await prisma.$executeRaw`
      UPDATE "DriverProfile"
      SET "lastKnownLocation" = ST_SetSRID(
            ST_MakePoint(${profile.location.lng}, ${profile.location.lat}),
            4326
          )::geography
      WHERE id = ${profile.id}::uuid
    `;
  }
}

async function insertFleets(manifest: DemoManifest): Promise<void> {
  await prisma.fleet.createMany({
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

async function insertFleetMembers(manifest: DemoManifest): Promise<void> {
  await prisma.fleetMember.createMany({
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

async function insertRefreshSessions(manifest: DemoManifest): Promise<void> {
  await prisma.refreshSession.createMany({
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

async function insertOrders(manifest: DemoManifest): Promise<void> {
  await prisma.order.createMany({
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

async function insertOrderChildren(manifest: DemoManifest): Promise<void> {
  for (const order of manifest.orders) {
    for (const stop of order.stops) {
      const createdAt = requiredCreatedAt(stop.createdAt, `orderStops[${stop.id}]`);

      await prisma.$executeRaw`
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
      await prisma.orderStatusHistory.createMany({
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

      await prisma.$executeRaw`
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
      await prisma.mediaObject.createMany({
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
      await prisma.paymentIntent.createMany({
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
            providerSnapshot: paymentIntent.providerSnapshot,
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
  const boundary = await loadExistingDemoBoundary();

  await deleteExistingDemoBoundary(boundary);
  await insertUsers(manifest);
  await insertDriverProfiles(manifest);
  await insertFleets(manifest);
  await insertFleetMembers(manifest);
  await insertOrders(manifest);
  await insertOrderChildren(manifest);
  await insertRefreshSessions(manifest);

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
