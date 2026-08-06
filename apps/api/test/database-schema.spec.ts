import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { Client } from 'pg';

const expectedTables = [
  'AuditLog',
  'DriverProfile',
  'Fleet',
  'FleetMember',
  'MediaObject',
  'Order',
  'OrderStatusHistory',
  'OrderStop',
  'PaymentIntent',
  'RefreshSession',
  'TrackingPoint',
  'User',
] as const;

const expectedEnums = {
  DriverAvailability: ['OFFLINE', 'AVAILABLE', 'BUSY'],
  FleetMemberRole: ['OWNER', 'DRIVER'],
  FleetMemberStatus: ['INVITED', 'ACTIVE', 'REMOVED'],
  MediaType: ['CARGO', 'DELIVERY_PROOF'],
  OrderStatus: [
    'REQUESTED',
    'ACCEPTED',
    'PICKING_UP',
    'IN_TRANSIT',
    'DELIVERED',
    'CANCELLED',
  ],
  PaymentStatus: ['UNPAID', 'QR_CREATED', 'PAID_MANUAL', 'FAILED'],
  ProviderSource: ['VIETMAP', 'DEMO', 'PAYOS', 'VIETQR', 'LOCAL', 'S3'],
  Role: ['CUSTOMER', 'DRIVER', 'FLEET_OWNER', 'ADMIN'],
  StopType: ['PICKUP', 'STOP', 'DROPOFF'],
  UserStatus: ['ACTIVE', 'DISABLED'],
  VehicleType: ['MOTORBIKE', 'VAN', 'TRUCK'],
} as const;

type IndexRow = {
  indexdef: string;
  indexname: string;
  tablename: string;
};

function requireDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for database schema tests');
  }

  return databaseUrl;
}

describe('canonical pilot database schema', () => {
  const client = new Client({ connectionString: requireDatabaseUrl() });

  beforeAll(async () => {
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
  });

  it('installs PostGIS and creates every canonical table', async () => {
    const extension = await client.query<{ extversion: string }>(
      "SELECT extversion FROM pg_extension WHERE extname = 'postgis'",
    );
    const tables = await client.query<{ tablename: string }>(
      `SELECT tablename
       FROM pg_tables
       WHERE schemaname = 'public'
         AND tablename = ANY($1::text[])
       ORDER BY tablename`,
      [expectedTables],
    );

    expect(extension.rows[0]?.extversion).toMatch(/^3\.5/);
    expect(tables.rows.map(({ tablename }) => tablename)).toEqual(expectedTables);
  });

  it('uses the exact canonical enum values in order', async () => {
    const result = await client.query<{ enum_name: string; enum_values: string[] }>(
      `SELECT type.typname AS enum_name,
              array_agg(value.enumlabel ORDER BY value.enumsortorder) AS enum_values
       FROM pg_type AS type
       JOIN pg_enum AS value ON value.enumtypid = type.oid
       WHERE type.typname = ANY($1::text[])
       GROUP BY type.typname`,
      [Object.keys(expectedEnums)],
    );
    const actual = Object.fromEntries(
      result.rows.map(({ enum_name, enum_values }) => [
        enum_name,
        // pg returns PostgreSQL enum labels as a text-array string like "{A,B,C}";
        // strip braces and split so we compare against a canonical JS array.
        typeof enum_values === 'string'
          ? enum_values.replace(/^\{|\}$/g, '').split(',')
          : enum_values,
      ]),
    );

    expect(actual).toEqual(expectedEnums);
  });

  it('uses UUID primary keys, timestamptz timestamps and integer operational values', async () => {
    const primaryKeys = await client.query<{
      column_name: string;
      data_type: string;
      table_name: string;
    }>(
      `SELECT table_name, column_name, data_type
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = ANY($1::text[])
         AND column_name = 'id'`,
      [expectedTables],
    );
    const timestamps = await client.query<{
      column_name: string;
      data_type: string;
      table_name: string;
    }>(
      `SELECT table_name, column_name, data_type
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = ANY($1::text[])
         AND column_name LIKE '%At'`,
      [expectedTables],
    );
    const operationalValues = await client.query<{
      column_name: string;
      data_type: string;
      table_name: string;
    }>(
      `SELECT table_name, column_name, data_type
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND column_name = ANY($1::text[])`,
      [[
        'amountVnd',
        'distanceMeters',
        'durationSeconds',
        'etaSeconds',
        'priceVnd',
        'sequence',
        'sizeBytes',
      ]],
    );

    expect(primaryKeys.rows).toHaveLength(expectedTables.length);
    expect(primaryKeys.rows.every(({ data_type }) => data_type === 'uuid')).toBe(true);
    expect(timestamps.rows.length).toBeGreaterThan(0);
    expect(
      timestamps.rows.every(({ data_type }) => data_type === 'timestamp with time zone'),
    ).toBe(true);
    expect(operationalValues.rows.length).toBe(7);
    expect(operationalValues.rows.every(({ data_type }) => data_type === 'integer')).toBe(
      true,
    );
  });

  it('limits JSONB to provider and audit snapshots', async () => {
    const result = await client.query<{ column_name: string; table_name: string }>(
      `SELECT table_name, column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND data_type = 'jsonb'
       ORDER BY table_name, column_name`,
    );

    expect(result.rows).toEqual([
      { table_name: 'AuditLog', column_name: 'metadata' },
      { table_name: 'Order', column_name: 'routeSnapshot' },
      { table_name: 'PaymentIntent', column_name: 'providerSnapshot' },
    ]);
  });

  it('uses PostGIS geography points with GiST indexes', async () => {
    const geographyColumns = await client.query<{
      column_name: string;
      formatted_type: string;
      table_name: string;
    }>(
      `SELECT class.relname AS table_name,
              attribute.attname AS column_name,
              format_type(attribute.atttypid, attribute.atttypmod) AS formatted_type
       FROM pg_attribute AS attribute
       JOIN pg_class AS class ON class.oid = attribute.attrelid
       JOIN pg_namespace AS namespace ON namespace.oid = class.relnamespace
       WHERE namespace.nspname = 'public'
         AND class.relname = ANY($1::text[])
         AND attribute.attname = ANY($2::text[])
         AND attribute.attnum > 0
       ORDER BY class.relname, attribute.attname`,
      [
        ['DriverProfile', 'OrderStop', 'TrackingPoint'],
        ['lastKnownLocation', 'location'],
      ],
    );
    const indexes = await client.query<IndexRow>(
      `SELECT tablename, indexname, indexdef
       FROM pg_indexes
       WHERE schemaname = 'public'
         AND tablename = ANY($1::text[])`,
      [['DriverProfile', 'OrderStop', 'TrackingPoint']],
    );

    expect(geographyColumns.rows).toEqual([
      {
        table_name: 'DriverProfile',
        column_name: 'lastKnownLocation',
        formatted_type: 'geography(Point,4326)',
      },
      {
        table_name: 'OrderStop',
        column_name: 'location',
        formatted_type: 'geography(Point,4326)',
      },
      {
        table_name: 'TrackingPoint',
        column_name: 'location',
        formatted_type: 'geography(Point,4326)',
      },
    ]);
    for (const tableName of ['DriverProfile', 'OrderStop', 'TrackingPoint']) {
      expect(
        indexes.rows.some(
          ({ indexdef, tablename }) =>
            tablename === tableName && indexdef.includes('USING gist'),
        ),
      ).toBe(true);
    }
  });

  it('enforces canonical lookup, ordering and partial uniqueness indexes', async () => {
    const result = await client.query<IndexRow>(
      `SELECT tablename, indexname, indexdef
       FROM pg_indexes
       WHERE schemaname = 'public'
         AND tablename = ANY($1::text[])`,
      [[
        'FleetMember',
        'Order',
        'OrderStatusHistory',
        'OrderStop',
        'PaymentIntent',
        'TrackingPoint',
      ]],
    );
    const definitions = result.rows.map(({ indexdef }) => indexdef);

    expect(definitions).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/ON public\."Order".*\("customerId", "createdAt" DESC\)/),
        expect.stringMatching(/ON public\."Order".*\(status, "createdAt" DESC\)/),
        expect.stringMatching(
          /UNIQUE INDEX.*ON public\."Order".*\("customerId", "clientRequestId"\)/,
        ),
        expect.stringMatching(
          /UNIQUE INDEX.*ON public\."Order".*\("driverId"\).*WHERE.*status.*ACCEPTED.*PICKING_UP.*IN_TRANSIT/,
        ),
        expect.stringMatching(
          /ON public\."FleetMember".*\("fleetId", role, status\)/,
        ),
        expect.stringMatching(
          /UNIQUE INDEX.*ON public\."FleetMember".*\("userId"\).*WHERE.*role.*DRIVER.*status.*ACTIVE/,
        ),
        expect.stringMatching(
          /ON public\."TrackingPoint".*\("orderId", "capturedAt" DESC\)/,
        ),
        expect.stringMatching(
          /UNIQUE INDEX.*ON public\."TrackingPoint".*\("orderId", "clientPointId"\)/,
        ),
        expect.stringMatching(
          /ON public\."PaymentIntent".*\("orderId", "createdAt" DESC\)/,
        ),
        expect.stringMatching(
          /UNIQUE INDEX.*ON public\."PaymentIntent".*\("orderId"\).*WHERE.*status.*UNPAID.*QR_CREATED/,
        ),
        expect.stringMatching(
          /UNIQUE INDEX.*ON public\."OrderStop".*\("orderId", sequence\)/,
        ),
        expect.stringMatching(
          /ON public\."OrderStatusHistory".*\("orderId", "createdAt" DESC\)/,
        ),
        expect.stringMatching(
          /UNIQUE INDEX.*ON public\."OrderStatusHistory".*\("orderId", "actorId", "clientRequestId"\)/,
        ),
      ]),
    );
  });

  it('keeps status history append-only and protects order history from cascading deletes', async () => {
    const historyColumns = await client.query<{ column_name: string }>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'OrderStatusHistory'
       ORDER BY ordinal_position`,
    );
    const orderDeleteActions = await client.query<{
      constraint_name: string;
      delete_action: string;
      table_name: string;
    }>(
      `SELECT tc.constraint_name,
              tc.table_name,
              rc.delete_rule AS delete_action
       FROM information_schema.table_constraints AS tc
       JOIN information_schema.referential_constraints AS rc
         ON rc.constraint_schema = tc.constraint_schema
        AND rc.constraint_name = tc.constraint_name
       JOIN information_schema.constraint_column_usage AS ccu
         ON ccu.constraint_schema = tc.constraint_schema
        AND ccu.constraint_name = tc.constraint_name
       WHERE tc.constraint_schema = 'public'
         AND tc.constraint_type = 'FOREIGN KEY'
         AND ccu.table_name = 'Order'`,
    );

    expect(historyColumns.rows.map(({ column_name }) => column_name)).toEqual(
      expect.arrayContaining([
        'id',
        'orderId',
        'fromStatus',
        'toStatus',
        'actorId',
        'clientRequestId',
        'reason',
        'createdAt',
      ]),
    );
    expect(historyColumns.rows.map(({ column_name }) => column_name)).not.toContain('updatedAt');
    expect(orderDeleteActions.rows.length).toBeGreaterThanOrEqual(5);
    expect(
      orderDeleteActions.rows.every(({ delete_action }) => delete_action === 'RESTRICT'),
    ).toBe(true);
  });
});
