import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

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

type UserRow = {
  createdAt: string;
  id: string;
  phone: string;
  role: string;
  updatedAt: string;
};

type DriverProfileRow = {
  availability: string;
  createdAt: string;
  id: string;
  lastKnownAt: string | null;
  location: string | null;
  updatedAt: string;
  userId: string;
  vehicleType: string;
};

type FleetRow = {
  createdAt: string;
  id: string;
  name: string;
  updatedAt: string;
};

type FleetMemberRow = {
  createdAt: string;
  fleetId: string;
  id: string;
  invitedAt: string;
  joinedAt: string | null;
  removedAt: string | null;
  role: string;
  status: string;
  updatedAt: string;
  userId: string;
};

type RefreshSessionRow = {
  createdAt: string;
  expiresAt: string;
  id: string;
  revokedAt: string | null;
  updatedAt: string;
  userId: string;
};

type OrderRow = {
  acceptedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  customerId: string;
  deliveredAt: string | null;
  driverId: string | null;
  etaSeconds: number | null;
  id: string;
  inTransitAt: string | null;
  pickingUpAt: string | null;
  priceVnd: number | null;
  providerSource: string | null;
  status: string;
  updatedAt: string;
};

type OrderStopRow = {
  address: string;
  createdAt: string;
  id: string;
  location: string;
  orderId: string;
  sequence: number;
  type: string;
  updatedAt: string;
};

type OrderStatusHistoryRow = {
  actorId: string | null;
  createdAt: string;
  fromStatus: string | null;
  id: string;
  orderId: string;
  reason: string | null;
  toStatus: string;
};

type TrackingPointRow = {
  capturedAt: string;
  clientPointId: string;
  createdAt: string;
  driverId: string;
  id: string;
  location: string;
  orderId: string;
};

type MediaObjectRow = {
  contentType: string;
  createdAt: string;
  id: string;
  orderId: string;
  provider: string;
  sizeBytes: number;
  storageKey: string;
  type: string;
  uploaderId: string;
};

type PaymentIntentRow = {
  amountVnd: number;
  createdAt: string;
  expiresAt: string | null;
  id: string;
  orderId: string;
  provider: string;
  qrPayload: string | null;
  status: string;
  updatedAt: string;
};

type SeedSnapshot = {
  activeFleetMembers: number;
  deliveredOrders: number;
  driverProfiles: DriverProfileRow[];
  fleets: string[];
  fleetMembers: FleetMemberRow[];
  fleetsDetailed: FleetRow[];
  mediaObjects: MediaObjectRow[];
  membershipsByStatus: Record<string, number>;
  orderStatusHistory: OrderStatusHistoryRow[];
  orderStops: OrderStopRow[];
  orders: OrderRow[];
  ordersByStatus: Record<string, number>;
  paymentIntents: PaymentIntentRow[];
  paymentIntentsByStatus: Record<string, number>;
  refreshSessions: RefreshSessionRow[];
  refreshSessionsByUser: Record<string, number>;
  trackingPoints: TrackingPointRow[];
  users: UserRow[];
  usersByRole: Record<string, string[]>;
};

const ORDER_STATUSES = [
  'REQUESTED',
  'ACCEPTED',
  'PICKING_UP',
  'IN_TRANSIT',
  'DELIVERED',
  'CANCELLED',
] as const;

const MEMBERSHIP_STATUSES = ['INVITED', 'ACTIVE', 'REMOVED'] as const;
const PAYMENT_STATUSES = ['UNPAID', 'QR_CREATED', 'PAID_MANUAL', 'FAILED'] as const;
const USER_ROLES = ['CUSTOMER', 'DRIVER', 'FLEET_OWNER', 'ADMIN'] as const;

// Non-demo fixture deliberately matching the retired phone and fleet-name prefixes.
const STALE_DEMO = {
  actorLinkedHistoryId: 'cccccccc-cccc-4ccc-8ccc-cccccccccc13',
  auditLogId: 'cccccccc-cccc-4ccc-8ccc-cccccccccc12',
  driverProfileId: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
  fleetId: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3',
  fleetMemberId: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc4',
  mediaObjectId: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc8',
  orderId: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc5',
  orderStatusHistoryId: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc9',
  orderStopId: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc6',
  paymentIntentId: 'cccccccc-cccc-4ccc-8ccc-cccccccccc10',
  refreshSessionId: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
  trackingPointId: 'cccccccc-cccc-4ccc-8ccc-cccccccccc11',
  userId: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc0',
  userPhone: '0900000099',
} as const;

const NON_DEMO = {
  auditLogId: 'dddddddd-dddd-4ddd-8ddd-dddddddddd03',
  orderId: 'dddddddd-dddd-4ddd-8ddd-dddddddddd01',
  orderStatusHistoryId: 'dddddddd-dddd-4ddd-8ddd-dddddddddd02',
  userId: 'dddddddd-dddd-4ddd-8ddd-dddddddddd00',
  userPhone: '0911111199',
} as const;

function requireDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for seed determinism tests');
  }

  return databaseUrl;
}

function projectRootFromTestFile(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
}

function seedEntryPointFromTestFile(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'prisma', 'seed.ts');
}

function manifestPathFromTestFile(): string {
  return path.resolve(projectRootFromTestFile(), 'infra', 'seed', 'demo-manifest.json');
}

async function loadManifest(): Promise<DemoManifest> {
  return JSON.parse(await readFile(manifestPathFromTestFile(), 'utf8')) as DemoManifest;
}

function formatPoint(location: Coordinate | null): string | null {
  return location ? `POINT(${location.lng} ${location.lat})` : null;
}

function requireCreatedAt(value: string | undefined, label: string): string {
  if (!value) {
    throw new Error(`${label} must declare createdAt in infra/seed/demo-manifest.json`);
  }

  return value;
}

function orderCreatedAt(order: OrderManifest): string {
  return order.createdAt ?? order.statusHistory[0]?.createdAt ?? '';
}

function trackingCreatedAt(point: TrackingPointManifest): string {
  return point.createdAt ?? point.capturedAt;
}

function fleetMemberCreatedAt(member: FleetMemberManifest): string {
  return member.createdAt ?? member.invitedAt;
}

function sortById<T extends { id: string }>(rows: T[]): T[] {
  return [...rows].sort((left, right) => left.id.localeCompare(right.id));
}

function collectIds(manifest: DemoManifest): {
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
} {
  return {
    driverProfileIds: manifest.driverProfiles.map((profile) => profile.id),
    fleetIds: manifest.fleets.map((fleet) => fleet.id),
    fleetMemberIds: manifest.fleetMembers.map((member) => member.id),
    mediaObjectIds: manifest.orders.flatMap((order) => order.mediaObjects.map((mediaObject) => mediaObject.id)),
    orderIds: manifest.orders.map((order) => order.id),
    orderStatusHistoryIds: manifest.orders.flatMap((order) =>
      order.statusHistory.map((statusHistory) => statusHistory.id),
    ),
    orderStopIds: manifest.orders.flatMap((order) => order.stops.map((stop) => stop.id)),
    paymentIntentIds: manifest.orders.flatMap((order) =>
      order.paymentIntents.map((paymentIntent) => paymentIntent.id),
    ),
    refreshSessionIds: manifest.refreshSessions.map((session) => session.id),
    trackingPointIds: manifest.orders.flatMap((order) => order.trackingPoints.map((point) => point.id)),
    userIds: manifest.users.map((user) => user.id),
  };
}

function expectedSeedState(manifest: DemoManifest): SeedSnapshot {
  const usersByRole = Object.fromEntries(
    USER_ROLES.map((role) => [
      role,
      manifest.users
        .filter((user) => user.role === role)
        .map((user) => user.phone)
        .sort(),
    ]),
  );

  const membershipsByStatus = Object.fromEntries(
    MEMBERSHIP_STATUSES.map((status) => [
      status,
      manifest.fleetMembers.filter((member) => member.status === status).length,
    ]),
  );

  const ordersByStatus = Object.fromEntries(
    ORDER_STATUSES.map((status) => [status, manifest.orders.filter((order) => order.status === status).length]),
  );

  const paymentIntents = manifest.orders.flatMap((order) => order.paymentIntents);
  const paymentIntentsByStatus = Object.fromEntries(
    PAYMENT_STATUSES.map((status) => [
      status,
      paymentIntents.filter((paymentIntent) => paymentIntent.status === status).length,
    ]),
  );

  const refreshSessionsByUser = Object.fromEntries(
    manifest.refreshSessions
      .map((session) => {
        const user = manifest.users.find((candidate) => candidate.id === session.userId);

        if (!user) {
          throw new Error(`Missing manifest user ${session.userId} for refresh session ${session.id}`);
        }

        return [user.phone, 1] as const;
      })
      .sort(([left], [right]) => left.localeCompare(right)),
  );

  return {
    activeFleetMembers: manifest.fleetMembers.filter((member) => member.status === 'ACTIVE').length,
    deliveredOrders: manifest.orders.filter((order) => order.status === 'DELIVERED').length,
    driverProfiles: sortById(
      manifest.driverProfiles.map((profile) => ({
        availability: profile.availability,
        createdAt: requireCreatedAt(profile.createdAt, `driverProfiles[${profile.id}]`),
        id: profile.id,
        lastKnownAt: profile.lastKnownAt,
        location: formatPoint(profile.location),
        updatedAt: requireCreatedAt(profile.createdAt, `driverProfiles[${profile.id}]`),
        userId: profile.userId,
        vehicleType: profile.vehicleType,
      })),
    ),
    fleetMembers: sortById(
      manifest.fleetMembers.map((member) => {
        const createdAt = fleetMemberCreatedAt(member);

        return {
          createdAt,
          fleetId: member.fleetId,
          id: member.id,
          invitedAt: member.invitedAt,
          joinedAt: member.joinedAt,
          removedAt: member.removedAt,
          role: member.role,
          status: member.status,
          updatedAt: createdAt,
          userId: member.userId,
        };
      }),
    ),
    fleets: manifest.fleets.map((fleet) => fleet.name).sort(),
    fleetsDetailed: sortById(
      manifest.fleets.map((fleet) => ({
        createdAt: requireCreatedAt(fleet.createdAt, `fleets[${fleet.id}]`),
        id: fleet.id,
        name: fleet.name,
        updatedAt: requireCreatedAt(fleet.createdAt, `fleets[${fleet.id}]`),
      })),
    ),
    mediaObjects: sortById(
      manifest.orders.flatMap((order) =>
        order.mediaObjects.map((mediaObject) => ({
          contentType: mediaObject.contentType,
          createdAt: requireCreatedAt(mediaObject.createdAt, `mediaObjects[${mediaObject.id}]`),
          id: mediaObject.id,
          orderId: order.id,
          provider: mediaObject.provider,
          sizeBytes: mediaObject.sizeBytes,
          storageKey: mediaObject.storageKey,
          type: mediaObject.type,
          uploaderId: mediaObject.uploaderId,
        })),
      ),
    ),
    membershipsByStatus,
    orders: sortById(
      manifest.orders.map((order) => {
        const createdAt = orderCreatedAt(order);

        if (!createdAt) {
          throw new Error(`orders[${order.id}] must declare createdAt or at least one status history entry`);
        }

        return {
          acceptedAt: order.timestamps.acceptedAt,
          cancelledAt: order.timestamps.cancelledAt,
          createdAt,
          customerId: order.customerId,
          deliveredAt: order.timestamps.deliveredAt,
          driverId: order.driverId,
          etaSeconds: order.etaSeconds,
          id: order.id,
          inTransitAt: order.timestamps.inTransitAt,
          pickingUpAt: order.timestamps.pickingUpAt,
          priceVnd: order.priceVnd,
          providerSource: order.providerSource,
          status: order.status,
          updatedAt: createdAt,
        };
      }),
    ),
    orderStatusHistory: sortById(
      manifest.orders.flatMap((order) =>
        order.statusHistory.map((statusHistory) => ({
          actorId: statusHistory.actorId,
          createdAt: statusHistory.createdAt,
          fromStatus: statusHistory.fromStatus,
          id: statusHistory.id,
          orderId: order.id,
          reason: statusHistory.reason,
          toStatus: statusHistory.toStatus,
        })),
      ),
    ),
    orderStops: sortById(
      manifest.orders.flatMap((order) =>
        order.stops.map((stop) => {
          const createdAt = requireCreatedAt(stop.createdAt, `orderStops[${stop.id}]`);

          return {
            address: stop.address,
            createdAt,
            id: stop.id,
            location: formatPoint(stop.location) ?? '',
            orderId: order.id,
            sequence: stop.sequence,
            type: stop.type,
            updatedAt: createdAt,
          };
        }),
      ),
    ),
    ordersByStatus,
    paymentIntents: sortById(
      manifest.orders.flatMap((order) =>
        order.paymentIntents.map((paymentIntent) => {
          const createdAt = requireCreatedAt(
            paymentIntent.createdAt,
            `paymentIntents[${paymentIntent.id}]`,
          );

          return {
            amountVnd: paymentIntent.amountVnd,
            createdAt,
            expiresAt: paymentIntent.expiresAt,
            id: paymentIntent.id,
            orderId: order.id,
            provider: paymentIntent.provider,
            qrPayload: paymentIntent.qrPayload,
            status: paymentIntent.status,
            updatedAt: createdAt,
          };
        }),
      ),
    ),
    paymentIntentsByStatus,
    refreshSessions: sortById(
      manifest.refreshSessions.map((session) => {
        const createdAt = requireCreatedAt(session.createdAt, `refreshSessions[${session.id}]`);

        return {
          createdAt,
          expiresAt: session.expiresAt,
          id: session.id,
          revokedAt: null,
          updatedAt: createdAt,
          userId: session.userId,
        };
      }),
    ),
    refreshSessionsByUser,
    trackingPoints: sortById(
      manifest.orders.flatMap((order) =>
        order.trackingPoints.map((point) => {
          const createdAt = trackingCreatedAt(point);

          return {
            capturedAt: point.capturedAt,
            clientPointId: point.clientPointId,
            createdAt,
            driverId: point.driverId,
            id: point.id,
            location: formatPoint(point.location) ?? '',
            orderId: order.id,
          };
        }),
      ),
    ),
    users: sortById(
      manifest.users.map((user) => {
        const createdAt = requireCreatedAt(user.createdAt, `users[${user.id}]`);

        return {
          createdAt,
          id: user.id,
          phone: user.phone,
          role: user.role,
          updatedAt: createdAt,
        };
      }),
    ),
    usersByRole,
  };
}

async function snapshotSeedState(client: Client, manifest: DemoManifest): Promise<SeedSnapshot> {
  const ids = collectIds(manifest);

  const users = await client.query<UserRow>(
    `SELECT
         id,
         phone,
         role,
         to_char("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",
         to_char("updatedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "updatedAt"
       FROM "User"
       WHERE id = ANY($1::uuid[])
       ORDER BY id`,
    [ids.userIds],
  );
  const driverProfiles = await client.query<DriverProfileRow>(
    `SELECT
         id,
         "userId",
         availability,
         "vehicleType",
         to_char("lastKnownAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "lastKnownAt",
         ST_AsText("lastKnownLocation"::geometry) AS location,
         to_char("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",
         to_char("updatedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "updatedAt"
       FROM "DriverProfile"
       WHERE id = ANY($1::uuid[])
       ORDER BY id`,
    [ids.driverProfileIds],
  );
  const fleetsDetailed = await client.query<FleetRow>(
    `SELECT
         id,
         name,
         to_char("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",
         to_char("updatedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "updatedAt"
       FROM "Fleet"
       WHERE id = ANY($1::uuid[])
       ORDER BY id`,
    [ids.fleetIds],
  );
  const fleetMembers = await client.query<FleetMemberRow>(
    `SELECT
         id,
         "fleetId",
         "userId",
         role,
         status,
         to_char("invitedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "invitedAt",
         to_char("joinedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "joinedAt",
         to_char("removedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "removedAt",
         to_char("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",
         to_char("updatedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "updatedAt"
       FROM "FleetMember"
       WHERE id = ANY($1::uuid[])
       ORDER BY id`,
    [ids.fleetMemberIds],
  );
  const refreshSessions = await client.query<RefreshSessionRow>(
    `SELECT
         id,
         "userId",
         to_char("expiresAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "expiresAt",
         to_char("revokedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "revokedAt",
         to_char("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",
         to_char("updatedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "updatedAt"
       FROM "RefreshSession"
       WHERE id = ANY($1::uuid[])
       ORDER BY id`,
    [ids.refreshSessionIds],
  );
  const orders = await client.query<OrderRow>(
    `SELECT
         id,
         "customerId",
         "driverId",
         status,
         "providerSource",
         "priceVnd",
         "etaSeconds",
         to_char("acceptedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "acceptedAt",
         to_char("pickingUpAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "pickingUpAt",
         to_char("inTransitAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "inTransitAt",
         to_char("deliveredAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "deliveredAt",
         to_char("cancelledAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "cancelledAt",
         to_char("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",
         to_char("updatedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "updatedAt"
       FROM "Order"
       WHERE id = ANY($1::uuid[])
       ORDER BY id`,
    [ids.orderIds],
  );
  const orderStops = await client.query<OrderStopRow>(
    `SELECT
         id,
         "orderId",
         type,
         sequence,
         address,
         ST_AsText(location::geometry) AS location,
         to_char("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",
         to_char("updatedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "updatedAt"
       FROM "OrderStop"
       WHERE id = ANY($1::uuid[])
       ORDER BY id`,
    [ids.orderStopIds],
  );
  const orderStatusHistory = await client.query<OrderStatusHistoryRow>(
    `SELECT
         id,
         "orderId",
         "fromStatus",
         "toStatus",
         "actorId",
         reason,
         to_char("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt"
       FROM "OrderStatusHistory"
       WHERE id = ANY($1::uuid[])
       ORDER BY id`,
    [ids.orderStatusHistoryIds],
  );
  const trackingPoints = await client.query<TrackingPointRow>(
    `SELECT
         id,
         "orderId",
         "driverId",
         "clientPointId",
         ST_AsText(location::geometry) AS location,
         to_char("capturedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "capturedAt",
         to_char("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt"
       FROM "TrackingPoint"
       WHERE id = ANY($1::uuid[])
       ORDER BY id`,
    [ids.trackingPointIds],
  );
  const mediaObjects = await client.query<MediaObjectRow>(
    `SELECT
         id,
         "orderId",
         "uploaderId",
         type,
         provider,
         "storageKey",
         "contentType",
         "sizeBytes",
         to_char("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt"
       FROM "MediaObject"
       WHERE id = ANY($1::uuid[])
       ORDER BY id`,
    [ids.mediaObjectIds],
  );
  const paymentIntents = await client.query<PaymentIntentRow>(
    `SELECT
         id,
         "orderId",
         provider,
         status,
         "amountVnd",
         "qrPayload",
         to_char("expiresAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "expiresAt",
         to_char("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",
         to_char("updatedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "updatedAt"
       FROM "PaymentIntent"
       WHERE id = ANY($1::uuid[])
       ORDER BY id`,
    [ids.paymentIntentIds],
  );

  return {
    activeFleetMembers: fleetMembers.rows.filter((member) => member.status === 'ACTIVE').length,
    deliveredOrders: orders.rows.filter((order) => order.status === 'DELIVERED').length,
    driverProfiles: driverProfiles.rows,
    fleetMembers: fleetMembers.rows,
    fleets: fleetsDetailed.rows.map((fleet) => fleet.name).sort(),
    fleetsDetailed: fleetsDetailed.rows,
    mediaObjects: mediaObjects.rows,
    membershipsByStatus: Object.fromEntries(
      MEMBERSHIP_STATUSES.map((status) => [
        status,
        fleetMembers.rows.filter((member) => member.status === status).length,
      ]),
    ),
    orderStatusHistory: orderStatusHistory.rows,
    orderStops: orderStops.rows,
    orders: orders.rows,
    ordersByStatus: Object.fromEntries(
      ORDER_STATUSES.map((status) => [status, orders.rows.filter((order) => order.status === status).length]),
    ),
    paymentIntents: paymentIntents.rows,
    paymentIntentsByStatus: Object.fromEntries(
      PAYMENT_STATUSES.map((status) => [
        status,
        paymentIntents.rows.filter((paymentIntent) => paymentIntent.status === status).length,
      ]),
    ),
    refreshSessions: refreshSessions.rows,
    refreshSessionsByUser: Object.fromEntries(
      users.rows
        .map((user) => [
          user.phone,
          refreshSessions.rows.filter((session) => session.userId === user.id).length,
        ])
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
    trackingPoints: trackingPoints.rows,
    users: users.rows,
    usersByRole: Object.fromEntries(
      USER_ROLES.map((role) => [
        role,
        users.rows.filter((user) => user.role === role).map((user) => user.phone).sort(),
      ]),
    ),
  };
}

function runSeed(databaseUrl: string): void {
  execFileSync(
    process.execPath,
    ['--experimental-strip-types', seedEntryPointFromTestFile()],
    {
      cwd: projectRootFromTestFile(),
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
      stdio: 'pipe',
    },
  );
}

async function deleteStaleFixtureIfPresent(client: Client): Promise<void> {
  await client.query('DELETE FROM "AuditLog" WHERE id = $1::uuid', [STALE_DEMO.auditLogId]);
  await client.query('DELETE FROM "AuditLog" WHERE id = $1::uuid', [NON_DEMO.auditLogId]);
  await client.query('DELETE FROM "OrderStatusHistory" WHERE id = $1::uuid', [STALE_DEMO.actorLinkedHistoryId]);
  await client.query('DELETE FROM "MediaObject" WHERE id = $1::uuid', [STALE_DEMO.mediaObjectId]);
  await client.query('DELETE FROM "PaymentIntent" WHERE id = $1::uuid', [STALE_DEMO.paymentIntentId]);
  await client.query('DELETE FROM "TrackingPoint" WHERE id = $1::uuid', [STALE_DEMO.trackingPointId]);
  await client.query('DELETE FROM "OrderStatusHistory" WHERE id = $1::uuid', [STALE_DEMO.orderStatusHistoryId]);
  await client.query('DELETE FROM "OrderStatusHistory" WHERE id = $1::uuid', [NON_DEMO.orderStatusHistoryId]);
  await client.query('DELETE FROM "OrderStop" WHERE id = $1::uuid', [STALE_DEMO.orderStopId]);
  await client.query('DELETE FROM "Order" WHERE id = $1::uuid', [STALE_DEMO.orderId]);
  await client.query('DELETE FROM "Order" WHERE id = $1::uuid', [NON_DEMO.orderId]);
  await client.query('DELETE FROM "RefreshSession" WHERE id = $1::uuid', [STALE_DEMO.refreshSessionId]);
  await client.query('DELETE FROM "FleetMember" WHERE id = $1::uuid', [STALE_DEMO.fleetMemberId]);
  await client.query('DELETE FROM "DriverProfile" WHERE id = $1::uuid', [STALE_DEMO.driverProfileId]);
  await client.query('DELETE FROM "Fleet" WHERE id = $1::uuid', [STALE_DEMO.fleetId]);
  await client.query('DELETE FROM "User" WHERE id = $1::uuid', [STALE_DEMO.userId]);
  await client.query('DELETE FROM "User" WHERE id = $1::uuid', [NON_DEMO.userId]);
}

async function insertStaleFixture(client: Client): Promise<void> {
  await deleteStaleFixtureIfPresent(client);

  await client.query(
    `INSERT INTO "User" (id, phone, role, status)
     VALUES ($1::uuid, $2, 'DRIVER', 'ACTIVE')`,
    [STALE_DEMO.userId, STALE_DEMO.userPhone],
  );

  await client.query(
    `INSERT INTO "User" (id, phone, role, status)
     VALUES ($1::uuid, $2, 'CUSTOMER', 'ACTIVE')`,
    [NON_DEMO.userId, NON_DEMO.userPhone],
  );

  await client.query(
    `INSERT INTO "DriverProfile" (id, "userId", availability, "vehicleType", "lastKnownAt", "lastKnownLocation")
     VALUES (
       $1::uuid,
       $2::uuid,
       'AVAILABLE',
       'MOTORBIKE',
       '2026-08-01T14:05:00.000Z'::timestamptz,
       ST_SetSRID(ST_MakePoint(106.6123, 10.7456), 4326)::geography
     )`,
    [STALE_DEMO.driverProfileId, STALE_DEMO.userId],
  );

  await client.query(
    `INSERT INTO "RefreshSession" (id, "userId", "tokenHash", "expiresAt")
     VALUES ($1::uuid, $2::uuid, 'stale-demo-token-hash', '2026-08-08T14:00:00.000Z'::timestamptz)`,
    [STALE_DEMO.refreshSessionId, STALE_DEMO.userId],
  );

  await client.query(
    `INSERT INTO "Fleet" (id, name)
     VALUES ($1::uuid, 'Demo Fleet Gamma')`,
    [STALE_DEMO.fleetId],
  );

  await client.query(
    `INSERT INTO "FleetMember" (
       id,
       "fleetId",
       "userId",
       role,
       status,
       "invitedAt",
       "joinedAt"
     )
     VALUES (
       $1::uuid,
       $2::uuid,
       $3::uuid,
       'DRIVER',
       'ACTIVE',
       '2026-08-01T14:00:00.000Z'::timestamptz,
       '2026-08-01T14:02:00.000Z'::timestamptz
     )`,
    [STALE_DEMO.fleetMemberId, STALE_DEMO.fleetId, STALE_DEMO.userId],
  );

  await client.query(
    `INSERT INTO "Order" (
       id,
       "customerId",
       "driverId",
       status,
       "providerSource",
       "distanceMeters",
       "durationSeconds",
       "priceVnd",
       "etaSeconds",
       "createdAt",
       "updatedAt"
     )
     VALUES (
       $1::uuid,
       $2::uuid,
       $2::uuid,
       'IN_TRANSIT',
       'DEMO',
       1200,
       600,
       45000,
       600,
       '2026-08-01T14:10:00.000Z'::timestamptz,
       '2026-08-01T14:10:00.000Z'::timestamptz
     )`,
    [STALE_DEMO.orderId, STALE_DEMO.userId],
  );

  await client.query(
    `INSERT INTO "Order" (
       id,
       "customerId",
       status,
       "providerSource",
       "createdAt",
       "updatedAt"
     )
     VALUES (
       $1::uuid,
       $2::uuid,
       'REQUESTED',
       'DEMO',
       '2026-08-01T14:10:00.000Z'::timestamptz,
       '2026-08-01T14:10:00.000Z'::timestamptz
     )`,
    [NON_DEMO.orderId, NON_DEMO.userId],
  );

  await client.query(
    `INSERT INTO "OrderStop" (
       id,
       "orderId",
       type,
       sequence,
       address,
       location
     )
     VALUES (
       $1::uuid,
       $2::uuid,
       'PICKUP',
       1,
       '42 Demo Pickup',
       ST_SetSRID(ST_MakePoint(106.6123, 10.7456), 4326)::geography
     )`,
    [STALE_DEMO.orderStopId, STALE_DEMO.orderId],
  );

  await client.query(
    `INSERT INTO "OrderStatusHistory" (
       id,
       "orderId",
       "fromStatus",
       "toStatus",
       "actorId",
       "reason",
       "createdAt"
     )
     VALUES (
       $1::uuid,
       $2::uuid,
       'ACCEPTED',
       'IN_TRANSIT',
       $3::uuid,
       'stale demo row',
       '2026-08-01T14:12:00.000Z'::timestamptz
     )`,
    [STALE_DEMO.orderStatusHistoryId, STALE_DEMO.orderId, STALE_DEMO.userId],
  );

  await client.query(
    `INSERT INTO "OrderStatusHistory" (
       id,
       "orderId",
       "fromStatus",
       "toStatus",
       "actorId",
       "reason",
       "createdAt"
     )
     VALUES (
       $1::uuid,
       $2::uuid,
       NULL,
       'REQUESTED',
       $3::uuid,
       'demo actor on non-demo order',
       '2026-08-01T14:11:00.000Z'::timestamptz
     )`,
    [STALE_DEMO.actorLinkedHistoryId, NON_DEMO.orderId, STALE_DEMO.userId],
  );

  await client.query(
    `INSERT INTO "OrderStatusHistory" (
       id,
       "orderId",
       "fromStatus",
       "toStatus",
       "actorId",
       "reason",
       "createdAt"
     )
     VALUES (
       $1::uuid,
       $2::uuid,
       NULL,
       'REQUESTED',
       $3::uuid,
       'non-demo history must survive',
       '2026-08-01T14:12:00.000Z'::timestamptz
     )`,
    [NON_DEMO.orderStatusHistoryId, NON_DEMO.orderId, NON_DEMO.userId],
  );

  await client.query(
    `INSERT INTO "AuditLog" (
       id,
       "actorId",
       action,
       "resourceType",
       "resourceId",
       metadata,
       "createdAt"
     )
     VALUES (
       $1::uuid,
       $2::uuid,
       'DEMO_FIXTURE_ACTION',
       'Order',
       $3::uuid,
       '{"ownedBy":"demo"}'::jsonb,
       '2026-08-01T14:13:00.000Z'::timestamptz
     )`,
    [STALE_DEMO.auditLogId, STALE_DEMO.userId, STALE_DEMO.orderId],
  );

  await client.query(
    `INSERT INTO "AuditLog" (
       id,
       "actorId",
       action,
       "resourceType",
       "resourceId",
       metadata,
       "createdAt"
     )
     VALUES (
       $1::uuid,
       $2::uuid,
       'NON_DEMO_ACTION',
       'Order',
       $3::uuid,
       '{"ownedBy":"non-demo"}'::jsonb,
       '2026-08-01T14:14:00.000Z'::timestamptz
     )`,
    [NON_DEMO.auditLogId, NON_DEMO.userId, NON_DEMO.orderId],
  );

  await client.query(
    `INSERT INTO "TrackingPoint" (
       id,
       "orderId",
       "driverId",
       "clientPointId",
       location,
       "capturedAt"
     )
     VALUES (
       $1::uuid,
       $2::uuid,
       $3::uuid,
       'stale-demo-point',
       ST_SetSRID(ST_MakePoint(106.6321, 10.7523), 4326)::geography,
       '2026-08-01T14:14:00.000Z'::timestamptz
     )`,
    [STALE_DEMO.trackingPointId, STALE_DEMO.orderId, STALE_DEMO.userId],
  );

  await client.query(
    `INSERT INTO "MediaObject" (
       id,
       "orderId",
       "uploaderId",
       type,
       provider,
       "storageKey",
       "contentType",
       "sizeBytes"
     )
     VALUES (
       $1::uuid,
       $2::uuid,
       $3::uuid,
       'CARGO',
       'DEMO',
       'demo/stale-demo-proof.jpg',
       'image/jpeg',
       1024
     )`,
    [STALE_DEMO.mediaObjectId, STALE_DEMO.orderId, STALE_DEMO.userId],
  );

  await client.query(
    `INSERT INTO "PaymentIntent" (
       id,
       "orderId",
       provider,
       status,
       "amountVnd",
       "createdAt",
       "updatedAt"
     )
     VALUES (
       $1::uuid,
       $2::uuid,
       'DEMO',
       'QR_CREATED',
       45000,
       '2026-08-01T14:16:00.000Z'::timestamptz,
       '2026-08-01T14:16:00.000Z'::timestamptz
     )`,
    [STALE_DEMO.paymentIntentId, STALE_DEMO.orderId],
  );
}

async function countStaleFixtureRows(client: Client): Promise<Record<string, number>> {
  const auditLog = await client.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM "AuditLog" WHERE id = $1::uuid',
    [STALE_DEMO.auditLogId],
  );
  const actorLinkedHistory = await client.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM "OrderStatusHistory" WHERE id = $1::uuid',
    [STALE_DEMO.actorLinkedHistoryId],
  );
  const user = await client.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM "User" WHERE id = $1::uuid',
    [STALE_DEMO.userId],
  );
  const driverProfile = await client.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM "DriverProfile" WHERE id = $1::uuid',
    [STALE_DEMO.driverProfileId],
  );
  const refreshSession = await client.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM "RefreshSession" WHERE id = $1::uuid',
    [STALE_DEMO.refreshSessionId],
  );
  const fleet = await client.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM "Fleet" WHERE id = $1::uuid',
    [STALE_DEMO.fleetId],
  );
  const fleetMember = await client.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM "FleetMember" WHERE id = $1::uuid',
    [STALE_DEMO.fleetMemberId],
  );
  const order = await client.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM "Order" WHERE id = $1::uuid',
    [STALE_DEMO.orderId],
  );
  const orderStop = await client.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM "OrderStop" WHERE id = $1::uuid',
    [STALE_DEMO.orderStopId],
  );
  const orderStatusHistory = await client.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM "OrderStatusHistory" WHERE id = $1::uuid',
    [STALE_DEMO.orderStatusHistoryId],
  );
  const trackingPoint = await client.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM "TrackingPoint" WHERE id = $1::uuid',
    [STALE_DEMO.trackingPointId],
  );
  const mediaObject = await client.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM "MediaObject" WHERE id = $1::uuid',
    [STALE_DEMO.mediaObjectId],
  );
  const paymentIntent = await client.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM "PaymentIntent" WHERE id = $1::uuid',
    [STALE_DEMO.paymentIntentId],
  );

  return {
    actorLinkedHistory: Number(actorLinkedHistory.rows[0]?.count ?? '0'),
    auditLog: Number(auditLog.rows[0]?.count ?? '0'),
    driverProfile: Number(driverProfile.rows[0]?.count ?? '0'),
    fleet: Number(fleet.rows[0]?.count ?? '0'),
    fleetMember: Number(fleetMember.rows[0]?.count ?? '0'),
    mediaObject: Number(mediaObject.rows[0]?.count ?? '0'),
    order: Number(order.rows[0]?.count ?? '0'),
    orderStatusHistory: Number(orderStatusHistory.rows[0]?.count ?? '0'),
    orderStop: Number(orderStop.rows[0]?.count ?? '0'),
    paymentIntent: Number(paymentIntent.rows[0]?.count ?? '0'),
    refreshSession: Number(refreshSession.rows[0]?.count ?? '0'),
    trackingPoint: Number(trackingPoint.rows[0]?.count ?? '0'),
    user: Number(user.rows[0]?.count ?? '0'),
  };
}

async function countNonDemoFixtureRows(client: Client): Promise<Record<string, number>> {
  const auditLog = await client.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM "AuditLog" WHERE id = $1::uuid',
    [NON_DEMO.auditLogId],
  );
  const order = await client.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM "Order" WHERE id = $1::uuid',
    [NON_DEMO.orderId],
  );
  const orderStatusHistory = await client.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM "OrderStatusHistory" WHERE id = $1::uuid',
    [NON_DEMO.orderStatusHistoryId],
  );
  const user = await client.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM "User" WHERE id = $1::uuid',
    [NON_DEMO.userId],
  );

  return {
    auditLog: Number(auditLog.rows[0]?.count ?? '0'),
    order: Number(order.rows[0]?.count ?? '0'),
    orderStatusHistory: Number(orderStatusHistory.rows[0]?.count ?? '0'),
    user: Number(user.rows[0]?.count ?? '0'),
  };
}

async function installSeedFailureTrigger(client: Client): Promise<void> {
  await client.query(`
    CREATE OR REPLACE FUNCTION seed_test_fail_on_fleet()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RAISE EXCEPTION 'seed test failure after cleanup';
    END;
    $$;
  `);
  await client.query('DROP TRIGGER IF EXISTS seed_test_fail_on_fleet ON "Fleet"');
  await client.query(`
    CREATE TRIGGER seed_test_fail_on_fleet
    BEFORE INSERT ON "Fleet"
    FOR EACH ROW
    EXECUTE FUNCTION seed_test_fail_on_fleet();
  `);
}

async function removeSeedFailureTrigger(client: Client): Promise<void> {
  await client.query('DROP TRIGGER IF EXISTS seed_test_fail_on_fleet ON "Fleet"');
  await client.query('DROP FUNCTION IF EXISTS seed_test_fail_on_fleet()');
}

const seedDescribe = process.env.DATABASE_URL ? describe : describe.skip;

seedDescribe('pilot seed determinism', () => {
  let client: Client;

  beforeAll(async () => {
    client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
  });

  afterAll(async () => {
    if (client) {
      await deleteStaleFixtureIfPresent(client);
      await client.end();
    }
  });

  it('seeds the canonical pilot dataset twice without logical drift or timestamp drift', async () => {
    const databaseUrl = requireDatabaseUrl();
    const manifest = await loadManifest();
    const nullLocationProfiles = manifest.driverProfiles.filter((profile) => profile.location === null);

    expect(nullLocationProfiles.length).toBeGreaterThan(0);

    const expectedSnapshot = expectedSeedState(manifest);

    runSeed(databaseUrl);
    const firstSnapshot = await snapshotSeedState(client, manifest);

    runSeed(databaseUrl);
    const secondSnapshot = await snapshotSeedState(client, manifest);

    expect(firstSnapshot).toEqual(expectedSnapshot);
    expect(secondSnapshot).toEqual(expectedSnapshot);
  });

  it('preserves non-demo prefix collisions and clears manifest-null driver locations on reseed', async () => {
    const databaseUrl = requireDatabaseUrl();
    const manifest = await loadManifest();
    const nullLocationProfile = manifest.driverProfiles.find((profile) => profile.location === null);

    expect(nullLocationProfile).toBeDefined();
    if (!nullLocationProfile) {
      return;
    }

    runSeed(databaseUrl);

    await client.query(
      `UPDATE "DriverProfile"
       SET "lastKnownLocation" = ST_SetSRID(ST_MakePoint(106.6999, 10.7999), 4326)::geography
       WHERE id = $1::uuid`,
      [nullLocationProfile.id],
    );
    await insertStaleFixture(client);

    runSeed(databaseUrl);

    const staleCounts = await countStaleFixtureRows(client);
    const nonDemoCounts = await countNonDemoFixtureRows(client);
    const clearedProfile = await client.query<{ location: string | null }>(
      `SELECT ST_AsText("lastKnownLocation"::geometry) AS location
       FROM "DriverProfile"
       WHERE id = $1::uuid`,
      [nullLocationProfile.id],
    );

    expect(staleCounts).toEqual({
      actorLinkedHistory: 1,
      auditLog: 1,
      driverProfile: 1,
      fleet: 1,
      fleetMember: 1,
      mediaObject: 1,
      order: 1,
      orderStatusHistory: 1,
      orderStop: 1,
      paymentIntent: 1,
      refreshSession: 1,
      trackingPoint: 1,
      user: 1,
    });
    expect(nonDemoCounts).toEqual({
      auditLog: 1,
      order: 1,
      orderStatusHistory: 1,
      user: 1,
    });
    expect(clearedProfile.rows[0]?.location ?? null).toBeNull();
  });

  it('rolls back cleanup and recreation when a database write fails mid-seed', async () => {
    const databaseUrl = requireDatabaseUrl();
    const manifest = await loadManifest();

    runSeed(databaseUrl);
    const beforeFailure = await snapshotSeedState(client, manifest);
    await installSeedFailureTrigger(client);

    try {
      expect(() => runSeed(databaseUrl)).toThrow();
    } finally {
      await removeSeedFailureTrigger(client);
    }

    const afterFailure = await snapshotSeedState(client, manifest);
    expect(afterFailure).toEqual(beforeFailure);
  });
});
