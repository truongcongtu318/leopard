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

type ManifestUser = {
  id: string;
  phone: string;
  role: 'CUSTOMER' | 'DRIVER' | 'FLEET_OWNER' | 'ADMIN';
  status: 'ACTIVE' | 'DISABLED';
};

type DriverProfileManifest = {
  id: string;
  userId: string;
  availability: 'OFFLINE' | 'AVAILABLE' | 'BUSY';
  vehicleType: 'MOTORBIKE' | 'VAN' | 'TRUCK';
  lastKnownAt: string | null;
  location: Coordinate | null;
};

type FleetManifest = {
  id: string;
  name: string;
};

type FleetMemberManifest = {
  id: string;
  fleetId: string;
  userId: string;
  role: 'OWNER' | 'DRIVER';
  status: 'INVITED' | 'ACTIVE' | 'REMOVED';
  invitedAt: string;
  joinedAt: string | null;
  removedAt: string | null;
};

type RefreshSessionManifest = {
  id: string;
  userId: string;
  seedKey: string;
  expiresAt: string;
};

type OrderStopManifest = {
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

type TrackingPointManifest = {
  id: string;
  driverId: string;
  clientPointId: string;
  capturedAt: string;
  location: Coordinate;
};

type MediaObjectManifest = {
  id: string;
  uploaderId: string;
  type: 'CARGO' | 'DELIVERY_PROOF';
  provider: 'VIETMAP' | 'DEMO' | 'PAYOS' | 'VIETQR' | 'LOCAL' | 'S3';
  storageKey: string;
  contentType: string;
  sizeBytes: number;
};

type PaymentIntentManifest = {
  id: string;
  provider: 'VIETMAP' | 'DEMO' | 'PAYOS' | 'VIETQR' | 'LOCAL' | 'S3';
  status: 'UNPAID' | 'QR_CREATED' | 'PAID_MANUAL' | 'FAILED';
  amountVnd: number;
  qrPayload: string | null;
  providerSnapshot: Record<string, string> | null;
  expiresAt: string | null;
};

type OrderManifest = {
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

function toTokenHash(seedKey: string): string {
  return createHash('sha256').update(`leopard-demo-seed:${seedKey}`).digest('hex');
}

async function upsertUsers(manifest: DemoManifest): Promise<void> {
  for (const user of manifest.users) {
    await prisma.user.upsert({
      where: { phone: user.phone },
      create: user,
      update: {
        id: user.id,
        role: user.role,
        status: user.status,
      },
    });
  }
}

async function upsertDriverProfiles(manifest: DemoManifest): Promise<void> {
  for (const profile of manifest.driverProfiles) {
    await prisma.driverProfile.upsert({
      where: { userId: profile.userId },
      create: {
        id: profile.id,
        userId: profile.userId,
        availability: profile.availability,
        vehicleType: profile.vehicleType,
        lastKnownAt: toDate(profile.lastKnownAt),
      },
      update: {
        id: profile.id,
        availability: profile.availability,
        vehicleType: profile.vehicleType,
        lastKnownAt: toDate(profile.lastKnownAt),
      },
    });

    if (profile.location) {
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
}

async function upsertFleets(manifest: DemoManifest): Promise<void> {
  for (const fleet of manifest.fleets) {
    await prisma.fleet.upsert({
      where: { id: fleet.id },
      create: fleet,
      update: {
        name: fleet.name,
      },
    });
  }
}

async function upsertFleetMembers(manifest: DemoManifest): Promise<void> {
  for (const member of manifest.fleetMembers) {
    await prisma.fleetMember.upsert({
      where: {
        fleetId_userId: {
          fleetId: member.fleetId,
          userId: member.userId,
        },
      },
      create: {
        id: member.id,
        fleetId: member.fleetId,
        userId: member.userId,
        role: member.role,
        status: member.status,
        invitedAt: new Date(member.invitedAt),
        joinedAt: toDate(member.joinedAt),
        removedAt: toDate(member.removedAt),
      },
      update: {
        id: member.id,
        role: member.role,
        status: member.status,
        invitedAt: new Date(member.invitedAt),
        joinedAt: toDate(member.joinedAt),
        removedAt: toDate(member.removedAt),
      },
    });
  }
}

async function replaceRefreshSessions(manifest: DemoManifest): Promise<void> {
  const userIds = manifest.refreshSessions.map((session) => session.userId);

  await prisma.refreshSession.deleteMany({
    where: {
      userId: {
        in: userIds,
      },
    },
  });

  await prisma.refreshSession.createMany({
    data: manifest.refreshSessions.map((session) => ({
      id: session.id,
      userId: session.userId,
      tokenHash: toTokenHash(session.seedKey),
      expiresAt: new Date(session.expiresAt),
      revokedAt: null,
    })),
  });
}

async function upsertOrders(manifest: DemoManifest): Promise<void> {
  for (const order of manifest.orders) {
    await prisma.order.upsert({
      where: { id: order.id },
      create: {
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
      },
      update: {
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
      },
    });
  }
}

async function replaceOrderChildren(manifest: DemoManifest): Promise<void> {
  const orderIds = manifest.orders.map((order) => order.id);

  await prisma.mediaObject.deleteMany({
    where: {
      orderId: {
        in: orderIds,
      },
    },
  });
  await prisma.paymentIntent.deleteMany({
    where: {
      orderId: {
        in: orderIds,
      },
    },
  });
  await prisma.trackingPoint.deleteMany({
    where: {
      orderId: {
        in: orderIds,
      },
    },
  });
  await prisma.orderStatusHistory.deleteMany({
    where: {
      orderId: {
        in: orderIds,
      },
    },
  });
  await prisma.orderStop.deleteMany({
    where: {
      orderId: {
        in: orderIds,
      },
    },
  });

  for (const order of manifest.orders) {
    if (order.stops.length > 0) {
      for (const stop of order.stops) {
        await prisma.$executeRaw`
          INSERT INTO "OrderStop" (
            id,
            "orderId",
            type,
            sequence,
            address,
            location
          )
          VALUES (
            ${stop.id}::uuid,
            ${order.id}::uuid,
            ${stop.type}::"StopType",
            ${stop.sequence},
            ${stop.address},
            ST_SetSRID(ST_MakePoint(${stop.location.lng}, ${stop.location.lat}), 4326)::geography
          )
        `;
      }
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

    if (order.trackingPoints.length > 0) {
      for (const point of order.trackingPoints) {
        await prisma.$executeRaw`
          INSERT INTO "TrackingPoint" (
            id,
            "orderId",
            "driverId",
            "clientPointId",
            location,
            "capturedAt"
          )
          VALUES (
            ${point.id}::uuid,
            ${order.id}::uuid,
            ${point.driverId}::uuid,
            ${point.clientPointId},
            ST_SetSRID(ST_MakePoint(${point.location.lng}, ${point.location.lat}), 4326)::geography,
            ${new Date(point.capturedAt)}::timestamptz
          )
        `;
      }
    }

    if (order.mediaObjects.length > 0) {
      await prisma.mediaObject.createMany({
        data: order.mediaObjects.map((media) => ({
          id: media.id,
          orderId: order.id,
          uploaderId: media.uploaderId,
          type: media.type,
          provider: media.provider,
          storageKey: media.storageKey,
          contentType: media.contentType,
          sizeBytes: media.sizeBytes,
        })),
      });
    }

    if (order.paymentIntents.length > 0) {
      await prisma.paymentIntent.createMany({
        data: order.paymentIntents.map((paymentIntent) => ({
          id: paymentIntent.id,
          orderId: order.id,
          provider: paymentIntent.provider,
          status: paymentIntent.status,
          amountVnd: paymentIntent.amountVnd,
          qrPayload: paymentIntent.qrPayload,
          providerSnapshot: paymentIntent.providerSnapshot,
          expiresAt: toDate(paymentIntent.expiresAt),
        })),
      });
    }
  }
}

export async function seedPilotData(): Promise<void> {
  const manifest = await loadManifest();

  await upsertUsers(manifest);
  await upsertDriverProfiles(manifest);
  await upsertFleets(manifest);
  await upsertFleetMembers(manifest);
  await upsertOrders(manifest);
  await replaceOrderChildren(manifest);
  await replaceRefreshSessions(manifest);

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
