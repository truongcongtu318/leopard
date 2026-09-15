#!/usr/bin/env bash
set -euo pipefail

# ════════════════════════════════════════════════════════════════
#  LEOPARD Demo Deployment — One-Command Setup
#  Usage: ./infra/scripts/deploy-demo.sh [--rebuild] [--reset-db]
# ════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.prod.yml"
ENV_FILE="$PROJECT_ROOT/.env.prod"
ENV_EXAMPLE="$PROJECT_ROOT/.env.prod.example"

REBUILD=false
RESET_DB=false

for arg in "$@"; do
  case $arg in
    --rebuild) REBUILD=true ;;
    --reset-db) RESET_DB=true ;;
  esac
done

echo "╔══════════════════════════════════════════════════════════╗"
echo "║        🐆 LEOPARD Demo Deployment                       ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── Step 1: Prerequisites ──
echo "🔍 Step 1: Checking prerequisites..."

if ! command -v docker &>/dev/null; then
  echo "  ❌ Docker not found. Install: https://docs.docker.com/get-docker/"
  exit 1
fi
if ! docker compose version &>/dev/null; then
  echo "  ❌ Docker Compose not found."
  exit 1
fi
echo "  ✅ Docker $(docker --version | grep -oP '\d+\.\d+\.\d+')"
echo "  ✅ $(docker compose version)"

# ── Step 2: Generate .env.prod ──
echo ""
echo "🔐 Step 2: Setting up environment..."

generate_secret() {
  openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | od -An -tx1 | tr -d ' \n'
}

if [ ! -f "$ENV_FILE" ]; then
  cp "$ENV_EXAMPLE" "$ENV_FILE"

  ACCESS_SECRET=$(generate_secret)
  REFRESH_SECRET=$(generate_secret)
  ESTIMATE_SECRET=$(generate_secret)
  DB_PASSWORD=$(generate_secret | head -c 24)

  sed -i "s/CHANGE_ME_32_BYTES/${ACCESS_SECRET}/" "$ENV_FILE"
  # second occurrence
  sed -i "0,/CHANGE_ME_32_BYTES/! s/CHANGE_ME_32_BYTES/${REFRESH_SECRET}/" "$ENV_FILE"
  # third occurrence  
  sed -i "s/CHANGE_ME_32_BYTES/${ESTIMATE_SECRET}/" "$ENV_FILE"
  # update db password
  sed -i "s/leopard_demo_change_me/${DB_PASSWORD}/g" "$ENV_FILE"

  echo "  ✅ Generated .env.prod with random secrets"
else
  echo "  ✅ Using existing .env.prod"
fi

# ── Step 3: Build & Start ──
echo ""
echo "📦 Step 3: Building and starting services..."

cd "$PROJECT_ROOT"

BUILD_FLAG=""
if [ "$REBUILD" = true ]; then
  BUILD_FLAG="--build --force-recreate"
  echo "  🔄 Force rebuild requested"
fi

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d $BUILD_FLAG 2>&1 | tail -10
echo "  ✅ Containers started"

# ── Step 4: Wait for health ──
echo ""
echo "💓 Step 4: Waiting for services to be healthy..."

MAX_WAIT=120
ELAPSED=0
while [ $ELAPSED -lt $MAX_WAIT ]; do
  API_HEALTHY=$(docker compose -f "$COMPOSE_FILE" ps --format json 2>/dev/null | grep -c '"healthy"' || echo "0")
  if [ "$API_HEALTHY" -ge 1 ]; then
    echo "  ✅ API healthy after ${ELAPSED}s"
    break
  fi
  sleep 3
  ELAPSED=$((ELAPSED + 3))
  echo "  ⏳ Waiting... (${ELAPSED}s / ${MAX_WAIT}s)"
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
  echo "  ⚠️  Timeout waiting for API health. Check: docker compose -f docker-compose.prod.yml logs api"
fi

# ── Step 5: Run migrations + seed ──
echo ""
echo "🗃️  Step 5: Running database migrations and seed..."

# Run prisma migrate inside the API container
docker compose -f "$COMPOSE_FILE" exec -T api node -e "
  const { execSync } = require('child_process');
  try {
    execSync('npx prisma migrate deploy --schema prisma/schema.prisma', { stdio: 'inherit' });
  } catch(e) {
    console.error('Migration failed:', e.message);
    process.exit(1);
  }
" 2>&1 | tail -5
echo "  ✅ Migrations applied"

if [ "$RESET_DB" = true ]; then
  echo "  🔄 Resetting database with seed data..."
  docker compose -f "$COMPOSE_FILE" exec -T api node -e "
    const { execSync } = require('child_process');
    execSync('npx prisma migrate reset --schema prisma/schema.prisma --force', { stdio: 'inherit' });
  " 2>&1 | tail -5
  echo "  ✅ Database reset and seeded"
else
  # Seed only if database is empty
  docker compose -f "$COMPOSE_FILE" exec -T api node -e "
    const { execSync } = require('child_process');
    try {
      execSync('node --experimental-strip-types prisma/seed.ts', { stdio: 'inherit' });
    } catch(e) {
      console.log('Seed skipped or already applied');
    }
  " 2>&1 | tail -5
  echo "  ✅ Seed data applied"
fi

# ── Step 6: Final check ──
echo ""
echo "🔬 Step 6: Quick smoke test..."

# Detect host IP for display
HOST_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

check_url() {
  local name=$1 url=$2
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
  if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "302" ]; then
    echo "  ✅ $name — HTTP $HTTP_STATUS"
  else
    echo "  ⚠️  $name — HTTP $HTTP_STATUS"
  fi
}

check_url "Gateway Portal" "http://localhost:${GATEWAY_PORT:-80}/"
check_url "API Health"     "http://localhost:${API_PORT:-3000}/api/v1/health/live"
check_url "Admin Console"  "http://localhost:${ADMIN_PORT:-3002}/"
check_url "Customer App"   "http://localhost:8081/"
check_url "Driver App"     "http://localhost:8082/"

# ── Summary ──
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✅ LEOPARD Demo — Deployment Complete                   ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║                                                          ║"
echo "║  🌐 Demo Portal:   http://${HOST_IP}/                    ║"
echo "║  🛡️  Admin:         http://${HOST_IP}:3002/login          ║"
echo "║  📦 Customer:      http://${HOST_IP}:8081/               ║"
echo "║  🚛 Driver:        http://${HOST_IP}:8082/               ║"
echo "║  📡 API Docs:      http://${HOST_IP}:3000/api/docs       ║"
echo "║                                                          ║"
echo "║  🔑 Demo Accounts:                                       ║"
echo "║     Admin    → nhập: admin                               ║"
echo "║     Driver   → nhập: driver                              ║"
echo "║     Customer → nhập: customer                            ║"
echo "║                                                          ║"
echo "║  📋 Commands:                                             ║"
echo "║     Logs:    docker compose -f docker-compose.prod.yml logs -f  ║"
echo "║     Stop:    docker compose -f docker-compose.prod.yml down     ║"
echo "║     Reset:   ./infra/scripts/deploy-demo.sh --reset-db         ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
