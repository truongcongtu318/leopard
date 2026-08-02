import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

type SeedSnapshot = {
  activeFleetMembers: number;
  deliveredOrders: number;
  fleets: string[];
  membershipsByStatus: Record<string, number>;
  ordersByStatus: Record<string, number>;
  paymentIntentsByStatus: Record<string, number>;
  refreshSessionsByUser: Record<string, number>;
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

async function snapshotSeedState(client: Client): Promise<SeedSnapshot> {
  const usersByRole = await client.query<{ phone: string; role: string }>(
    'SELECT role, phone FROM "User" ORDER BY role, phone',
  );
  const fleets = await client.query<{ name: string }>('SELECT name FROM "Fleet" ORDER BY name');
  const membershipsByStatus = await client.query<{ count: string; status: string }>(
    'SELECT status, COUNT(*)::text AS count FROM "FleetMember" GROUP BY status ORDER BY status',
  );
  const ordersByStatus = await client.query<{ count: string; status: string }>(
    'SELECT status, COUNT(*)::text AS count FROM "Order" GROUP BY status ORDER BY status',
  );
  const paymentIntentsByStatus = await client.query<{ count: string; status: string }>(
    'SELECT status, COUNT(*)::text AS count FROM "PaymentIntent" GROUP BY status ORDER BY status',
  );
  const refreshSessionsByUser = await client.query<{ count: string; phone: string }>(
    `SELECT "User".phone, COUNT(*)::text AS count
     FROM "RefreshSession"
     JOIN "User" ON "User".id = "RefreshSession"."userId"
     GROUP BY "User".phone
     ORDER BY "User".phone`,
  );
  const activeFleetMembers = await client.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM "FleetMember" WHERE status = $1',
    ['ACTIVE'],
  );
  const deliveredOrders = await client.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM "Order" WHERE status = $1',
    ['DELIVERED'],
  );

  return {
    activeFleetMembers: Number(activeFleetMembers.rows[0]?.count ?? '0'),
    deliveredOrders: Number(deliveredOrders.rows[0]?.count ?? '0'),
    fleets: fleets.rows.map(({ name }) => name),
    membershipsByStatus: Object.fromEntries(
      MEMBERSHIP_STATUSES.map((status) => [status, 0]).concat(
        membershipsByStatus.rows.map(({ status, count }) => [status, Number(count)]),
      ),
    ),
    ordersByStatus: Object.fromEntries(
      ORDER_STATUSES.map((status) => [status, 0]).concat(
        ordersByStatus.rows.map(({ status, count }) => [status, Number(count)]),
      ),
    ),
    paymentIntentsByStatus: Object.fromEntries(
      PAYMENT_STATUSES.map((status) => [status, 0]).concat(
        paymentIntentsByStatus.rows.map(({ status, count }) => [status, Number(count)]),
      ),
    ),
    refreshSessionsByUser: Object.fromEntries(
      refreshSessionsByUser.rows.map(({ phone, count }) => [phone, Number(count)]),
    ),
    usersByRole: Object.fromEntries(
      USER_ROLES.map((role) => [
        role,
        usersByRole.rows.filter((user) => user.role === role).map(({ phone }) => phone),
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

describe('pilot seed determinism', () => {
  const client = new Client({ connectionString: requireDatabaseUrl() });

  beforeAll(async () => {
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
  });

  it('seeds the canonical pilot dataset twice without duplicating logical records', async () => {
    const databaseUrl = requireDatabaseUrl();

    runSeed(databaseUrl);
    const firstSnapshot = await snapshotSeedState(client);

    runSeed(databaseUrl);
    const secondSnapshot = await snapshotSeedState(client);

    expect(secondSnapshot).toEqual(firstSnapshot);
    expect(secondSnapshot.fleets).toEqual(['Demo Fleet Alpha', 'Demo Fleet Beta']);
    expect(secondSnapshot.activeFleetMembers).toBe(5);
    expect(secondSnapshot.deliveredOrders).toBe(1);
    expect(secondSnapshot.membershipsByStatus).toEqual({
      ACTIVE: 5,
      INVITED: 1,
      REMOVED: 1,
    });
    expect(secondSnapshot.ordersByStatus).toEqual({
      REQUESTED: 1,
      ACCEPTED: 1,
      PICKING_UP: 1,
      IN_TRANSIT: 1,
      DELIVERED: 1,
      CANCELLED: 1,
    });
    expect(secondSnapshot.paymentIntentsByStatus).toEqual({
      UNPAID: 0,
      QR_CREATED: 1,
      PAID_MANUAL: 1,
      FAILED: 0,
    });
    expect(secondSnapshot.usersByRole).toEqual({
      CUSTOMER: ['0900000001'],
      DRIVER: ['0900000002', '0900000005', '0900000006', '0900000007', '0900000008'],
      FLEET_OWNER: ['0900000003'],
      ADMIN: ['0900000004'],
    });
    expect(secondSnapshot.refreshSessionsByUser).toEqual({
      '0900000001': 1,
      '0900000002': 1,
      '0900000005': 1,
      '0900000006': 1,
      '0900000007': 1,
      '0900000008': 1,
      '0900000003': 1,
      '0900000004': 1,
    });
  });
});
