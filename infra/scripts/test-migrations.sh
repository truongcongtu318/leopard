#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DATABASE_URL="${DATABASE_URL:-postgresql://leopard:leopard_local@127.0.0.1:5432/leopard?schema=public}"
PRISMA_BIN="$ROOT_DIR/apps/api/node_modules/.bin/prisma"
JEST_BIN="$ROOT_DIR/apps/api/node_modules/.bin/jest"
GUARD_SCRIPT="$ROOT_DIR/infra/scripts/assert-local-database-url.sh"

[[ -r "$GUARD_SCRIPT" ]] || { printf 'FAIL: missing database URL guard\n' >&2; exit 1; }
# shellcheck disable=SC1090
source "$GUARD_SCRIPT"
assert_local_database_url "$DATABASE_URL"

cd "$ROOT_DIR"

docker compose up -d postgres >/dev/null

DATABASE_URL="$DATABASE_URL" "$PRISMA_BIN" generate \
  --config apps/api/prisma.config.ts \
  --schema apps/api/prisma/schema.prisma

DATABASE_URL="$DATABASE_URL" "$PRISMA_BIN" migrate reset \
  --config apps/api/prisma.config.ts \
  --schema apps/api/prisma/schema.prisma \
  --force

DATABASE_URL="$DATABASE_URL" node --experimental-strip-types apps/api/prisma/seed.ts
DATABASE_URL="$DATABASE_URL" node --experimental-strip-types apps/api/prisma/seed.ts

DATABASE_URL="$DATABASE_URL" "$PRISMA_BIN" migrate deploy \
  --config apps/api/prisma.config.ts \
  --schema apps/api/prisma/schema.prisma

DATABASE_URL="$DATABASE_URL" "$PRISMA_BIN" migrate deploy \
  --config apps/api/prisma.config.ts \
  --schema apps/api/prisma/schema.prisma

(
  cd "$ROOT_DIR/apps/api"
  DATABASE_URL="$DATABASE_URL" ROOT_DIR="$ROOT_DIR" node --input-type=module <<'NODE'
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL;
const rootDir = process.env.ROOT_DIR;
const client = new pg.Client({ connectionString: databaseUrl });
let connected = false;

try {
  await client.connect();
  connected = true;

  const expectedChecksum = createHash('sha256')
    .update(readFileSync(`${rootDir}/apps/api/prisma/migrations/0001_baseline/migration.sql`))
    .digest('hex');
  const migrationResult = await client.query(`
    SELECT migration_name, checksum, finished_at, rolled_back_at
    FROM "_prisma_migrations"
    WHERE migration_name = '0001_baseline'
  `);
  const appliedResult = await client.query(`
    SELECT COUNT(*)::int AS count
    FROM "_prisma_migrations"
    WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
  `);
  const migration = migrationResult.rows[0];

  if (
    migrationResult.rows.length !== 1 ||
    migration?.checksum !== expectedChecksum ||
    migration.finished_at === null ||
    migration.rolled_back_at !== null ||
    appliedResult.rows[0]?.count !== 1
  ) {
    throw new Error('baseline migration history is not a single applied, checksum-matched migration');
  }

  process.stdout.write(
    'migration upgrade invariant passed: baseline deploy is idempotent and its applied checksum matches the working tree\n',
  );
} finally {
  if (connected) {
    await client.end();
  }
}
NODE
)

DATABASE_URL="$DATABASE_URL" "$JEST_BIN" \
  --config apps/api/jest.config.cjs \
  --runInBand \
  --testRegex='(database-schema|seed-determinism)\.spec\.ts$' \
  --testPathIgnorePatterns='.*\.e2e-spec\.ts$'

DATABASE_URL="$DATABASE_URL" "$JEST_BIN" \
  --config apps/api/jest-e2e.config.cjs \
  --runInBand \
  --testRegex='(health|app)\.e2e-spec\.ts$' \
  --testPathIgnorePatterns='database-schema\.spec\.ts$'
