#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DATABASE_URL="${DATABASE_URL:-postgresql://leopard:leopard_local@127.0.0.1:5432/leopard?schema=public}"
PRISMA_BIN="$ROOT_DIR/apps/api/node_modules/.bin/prisma"

cd "$ROOT_DIR"

DATABASE_URL="$DATABASE_URL" "$PRISMA_BIN" generate \
  --config apps/api/prisma.config.ts \
  --schema apps/api/prisma/schema.prisma

DATABASE_URL="$DATABASE_URL" "$PRISMA_BIN" migrate reset \
  --config apps/api/prisma.config.ts \
  --schema apps/api/prisma/schema.prisma \
  --force

DATABASE_URL="$DATABASE_URL" node --experimental-strip-types apps/api/prisma/seed.ts
