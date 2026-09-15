#!/usr/bin/env bash
set -euo pipefail

# ════════════════════════════════════════════════════════════════
#  LEOPARD Demo Deployment — One-Command Setup
#
#  Usage:
#    ./infra/scripts/deploy-demo.sh              # build + start + seed
#    ./infra/scripts/deploy-demo.sh --rebuild    # force image rebuild
#    ./infra/scripts/deploy-demo.sh --reseed     # re-apply demo data only
#    ./infra/scripts/deploy-demo.sh --no-build   # start without rebuilding
#
#  Env overrides:
#    PUBLIC_HOST=<ip-or-domain>   # force the host shown/used in links
# ════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.prod.yml"
ENV_FILE="$PROJECT_ROOT/.env.prod"
ENV_EXAMPLE="$PROJECT_ROOT/.env.prod.example"

# Every image is tagged with this, so a previous build stays addressable instead
# of being silently overwritten as :latest. Defaults to the current commit.
export IMAGE_TAG="${IMAGE_TAG:-$(git -C "$PROJECT_ROOT" rev-parse --short HEAD 2>/dev/null || echo dev)}"

# The Dockerfiles use `RUN --mount=type=cache` for the pnpm store and the
# Next/Metro compile caches, which only works under BuildKit.
export DOCKER_BUILDKIT=1

REBUILD=false
RESEED=false
NO_BUILD=false

for arg in "$@"; do
  case $arg in
    --rebuild)  REBUILD=true ;;
    --reseed)   RESEED=true ;;
    --no-build) NO_BUILD=true ;;
    -h|--help)  sed -n '3,16p' "$0"; exit 0 ;;
    *) echo "Unknown option: $arg (try --help)" >&2; exit 2 ;;
  esac
done

# ── Helpers ─────────────────────────────────────────────────────

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

# `RUN --mount=type=cache` needs BuildKit, and BuildKit needs the buildx plugin.
# Minimal Docker installs (including some distro packages) ship without it, and
# the failure mode is an opaque "the --mount option requires BuildKit" error, so
# make sure it is present before the first build.
BUILDX_VERSION="${BUILDX_VERSION:-0.37.1}"
ensure_buildx() {
  if docker buildx version >/dev/null 2>&1; then
    echo "  ✅ buildx $(docker buildx version | awk '{print $2}')"
    return 0
  fi

  echo "  ⚠️  buildx not found — installing v${BUILDX_VERSION} (required for the build caches)"

  local arch
  case "$(uname -m)" in
    x86_64 | amd64) arch=amd64 ;;
    aarch64 | arm64) arch=arm64 ;;
    *) echo "  ❌ Unsupported architecture: $(uname -m)"; return 1 ;;
  esac

  local plugin_dir="${DOCKER_CONFIG:-$HOME/.docker}/cli-plugins"
  mkdir -p "$plugin_dir"

  if ! curl -fsSL --max-time 180 \
      "https://github.com/docker/buildx/releases/download/v${BUILDX_VERSION}/buildx-v${BUILDX_VERSION}.linux-${arch}" \
      -o "$plugin_dir/docker-buildx"; then
    echo "  ❌ Could not download buildx."
    echo "     Install it manually, or remove the cache mounts from infra/docker/*.Dockerfile"
    echo "     and re-run with DOCKER_BUILDKIT unset."
    return 1
  fi

  chmod +x "$plugin_dir/docker-buildx"

  if ! docker buildx version >/dev/null 2>&1; then
    echo "  ❌ buildx installed but not usable by the docker CLI"
    return 1
  fi

  echo "  ✅ buildx v${BUILDX_VERSION} installed"
}

generate_secret() {
  if command -v openssl &>/dev/null; then
    openssl rand -hex 32
  else
    head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

# Read a KEY=value from .env.prod without sourcing it.
env_value() {
  local key=$1 fallback=${2:-}
  local value
  value=$(grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | tail -1 | cut -d= -f2- || true)
  printf '%s' "${value:-$fallback}"
}

# Rewrite a KEY=value in .env.prod.
env_set() {
  local key=$1 value=$2
  if grep -qE "^${key}=" "$ENV_FILE"; then
    # Use | as delimiter: values may contain / (URLs, JSON).
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    printf '%s=%s\n' "$key" "$value" >>"$ENV_FILE"
  fi
}

# Best-effort public address, overriding with PUBLIC_HOST when provided.
detect_public_host() {
  if [ -n "${PUBLIC_HOST:-}" ]; then
    printf '%s' "$PUBLIC_HOST"
    return
  fi
  local ip
  ip=$(curl -fsS --max-time 4 https://api.ipify.org 2>/dev/null || true)
  if [ -z "$ip" ]; then
    ip=$(hostname -I 2>/dev/null | awk '{print $1}' || true)
  fi
  printf '%s' "${ip:-localhost}"
}

container_id() {
  compose ps -q "$1" 2>/dev/null | head -1
}

# wait_healthy <service> <max_attempts>  (3s between attempts)
wait_healthy() {
  local service=$1 attempts=${2:-40} i status cid
  for ((i = 1; i <= attempts; i++)); do
    cid=$(container_id "$service")
    if [ -n "$cid" ]; then
      status=$(docker inspect \
        --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' \
        "$cid" 2>/dev/null || echo none)
      if [ "$status" = "healthy" ]; then
        return 0
      fi
    fi
    sleep 3
  done
  return 1
}

http_status() {
  # curl already prints 000 when it cannot connect, so a trailing `|| echo 000`
  # would emit 000000. Capture the output and fall back only when it is empty.
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$1" 2>/dev/null) || true
  printf '%s' "${code:-000}"
}

# ── Banner ──────────────────────────────────────────────────────
echo "╔══════════════════════════════════════════════════════════╗"
echo "║        🐆  LEOPARD Demo Deployment                       ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo "   Image tag: ${IMAGE_TAG}"
echo ""

# ── Step 1: Prerequisites ───────────────────────────────────────
echo "🔍 Step 1/6 — Checking prerequisites..."

if ! command -v docker &>/dev/null; then
  echo "  ❌ Docker not found. Install: https://docs.docker.com/get-docker/"
  exit 1
fi
if ! docker compose version &>/dev/null; then
  echo "  ❌ Docker Compose v2 not found."
  exit 1
fi
if ! docker info &>/dev/null; then
  echo "  ❌ Docker daemon not reachable. Is it running? (sudo systemctl start docker)"
  exit 1
fi
if [ ! -f "$COMPOSE_FILE" ]; then
  echo "  ❌ Missing $COMPOSE_FILE"
  exit 1
fi
echo "  ✅ $(docker --version)"
echo "  ✅ $(docker compose version)"

ensure_buildx || exit 1

# How the build is scheduled depends on the memory available, so measure it here.
# BuildKit compiles every service concurrently and the peak is well above what a
# single build needs: on a 4GB box with no swap the OOM killer takes out
# docker-buildx and docker-compose part way through, leaving one image behind.
TOTAL_MB=0
if [ -r /proc/meminfo ]; then
  TOTAL_MB=$(awk '/MemTotal/{printf "%d", $2/1024}' /proc/meminfo)
fi
SWAP_MB=0
if [ -r /proc/meminfo ]; then
  SWAP_MB=$(awk '/SwapTotal/{printf "%d", $2/1024}' /proc/meminfo)
fi

echo "  ✅ RAM ${TOTAL_MB}MB, swap ${SWAP_MB}MB"
if [ "$TOTAL_MB" -lt 8000 ] && [ "$SWAP_MB" -lt 1024 ]; then
  echo "  ⚠️  Little RAM and no swap. Images will be built one at a time;"
  echo "     adding swap makes this much safer:"
  echo "       fallocate -l 4G /swapfile && chmod 600 /swapfile"
  echo "       mkswap /swapfile && swapon /swapfile"
fi

# ── Step 2: Environment file ────────────────────────────────────
echo ""
echo "🔐 Step 2/6 — Setting up environment..."

if [ ! -f "$ENV_FILE" ]; then
  if [ ! -f "$ENV_EXAMPLE" ]; then
    echo "  ❌ Missing $ENV_EXAMPLE"
    exit 1
  fi
  cp "$ENV_EXAMPLE" "$ENV_FILE"

  # Distinct placeholders, so each secret can be substituted independently.
  env_set AUTH_ACCESS_TOKEN_SECRET  "$(generate_secret)"
  env_set AUTH_REFRESH_TOKEN_SECRET "$(generate_secret)"
  env_set ESTIMATE_TOKEN_HMAC_SECRET "$(generate_secret)"

  DB_PASSWORD=$(generate_secret | cut -c1-32)
  env_set POSTGRES_PASSWORD "$DB_PASSWORD"
  env_set DATABASE_URL "postgresql://leopard:${DB_PASSWORD}@postgres:5432/leopard?schema=public"

  echo "  ✅ Generated .env.prod with random secrets"
else
  echo "  ✅ Using existing .env.prod"

  # An .env.prod written before the compose change would still carry the old
  # placeholder, which would start the API with a literal "CHANGE_ME_*" secret.
  if grep -q 'CHANGE_ME' "$ENV_FILE"; then
    echo "  ⚠️  Found unfilled CHANGE_ME placeholders — regenerating secrets"
    env_set AUTH_ACCESS_TOKEN_SECRET  "$(generate_secret)"
    env_set AUTH_REFRESH_TOKEN_SECRET "$(generate_secret)"
    env_set ESTIMATE_TOKEN_HMAC_SECRET "$(generate_secret)"
    if grep -q '^POSTGRES_PASSWORD=CHANGE_ME_DB_PASSWORD' "$ENV_FILE"; then
      DB_PASSWORD=$(generate_secret | cut -c1-32)
      env_set POSTGRES_PASSWORD "$DB_PASSWORD"
      env_set DATABASE_URL "postgresql://leopard:${DB_PASSWORD}@postgres:5432/leopard?schema=public"
    fi
  fi
fi

HOST=$(detect_public_host)
# Media URLs are absolute, so they must point at the address clients actually
# use — otherwise cargo photos and POD signatures resolve to localhost.
env_set PUBLIC_FILES_BASE_URL "http://${HOST}:$(env_value API_PORT 3000)"

# Clients reach the apps through the gateway port, so the API must accept those
# origins. Include the bare host too, for direct-port access.
GATEWAY_PORT_VALUE=$(env_value GATEWAY_PORT 80)
env_set CORS_ORIGINS "http://${HOST},http://${HOST}:${GATEWAY_PORT_VALUE},http://${HOST}:$(env_value ADMIN_PORT 3002),http://${HOST}:$(env_value CUSTOMER_PORT 8081),http://${HOST}:$(env_value DRIVER_PORT 8082),http://${HOST}:$(env_value API_PORT 3000),http://localhost"

echo "  ✅ Public host: http://${HOST}"

# An .env.prod written before the demo-auth acknowledgement existed would boot
# the API with AUTH_DEMO_LOGIN_ENABLED=true and no ALLOW_DEMO_AUTH_PROVIDER, and
# the env schema rejects that combination. Backfill it so an existing file keeps
# working instead of failing at container start.
if [ "$(env_value AUTH_DEMO_LOGIN_ENABLED false)" = "true" ] &&
  ! grep -q '^ALLOW_DEMO_AUTH_PROVIDER=' "$ENV_FILE"; then
  env_set ALLOW_DEMO_AUTH_PROVIDER true
  echo "  ✅ Added ALLOW_DEMO_AUTH_PROVIDER=true (required for demo login in production)"
fi

# ── Step 3: Build images ────────────────────────────────────────
echo ""
echo "📦 Step 3/6 — Building images (first run takes several minutes)..."

if [ "$NO_BUILD" = true ]; then
  echo "  ⏭️  --no-build given, skipping"
elif [ "$REBUILD" = true ]; then
  compose build --pull
  echo "  ✅ Images rebuilt"
else
  # Below 8GB, build one service at a time: concurrent builds are what pushes a
  # small VPS into the OOM killer, and the images are independent anyway.
  if [ "$TOTAL_MB" -lt 8000 ]; then
    echo "  ℹ️  ${TOTAL_MB}MB RAM — building one service at a time"
    for service in api migrate admin customer driver gateway; do
      echo "     ▶ ${service}"
      compose build "$service"
    done
  else
    compose build
  fi
  echo "  ✅ Images ready (cached layers reused)"
fi

# ── Step 4: Database up + migrations/seed ───────────────────────
echo ""
echo "🗃️  Step 4/6 — Starting database, then migrating and seeding..."

compose up -d postgres

if ! wait_healthy postgres 40; then
  echo "  ❌ Postgres did not become healthy. Logs:"
  compose logs --tail 30 postgres
  exit 1
fi
echo "  ✅ Postgres healthy"

if [ "$NO_BUILD" = false ]; then
  # `run` builds the builder-stage image if it is missing, and exits non-zero on
  # a failed migration so the deploy stops before serving a broken stack.
  compose run --rm --build migrate
else
  compose run --rm migrate
fi
echo "  ✅ Migrations applied and demo data seeded"

# ── Step 5: Start application services ──────────────────────────
echo ""
echo "🚀 Step 5/6 — Starting application services..."

compose up -d --remove-orphans
echo "  ✅ Containers started"

if ! wait_healthy api 40; then
  echo "  ❌ API did not become healthy. Logs:"
  compose logs --tail 50 api
  exit 1
fi
echo "  ✅ API healthy"

# ── Step 6: Smoke test ──────────────────────────────────────────
echo ""
echo "🔬 Step 6/6 — Smoke test..."

API_PORT_VALUE=$(env_value API_PORT 3000)
ADMIN_PORT_VALUE=$(env_value ADMIN_PORT 3002)
CUSTOMER_PORT_VALUE=$(env_value CUSTOMER_PORT 8081)
DRIVER_PORT_VALUE=$(env_value DRIVER_PORT 8082)

FAILED=0
# Retry, because `compose up -d` returns as soon as the containers are created
# while Next.js still needs a few seconds to answer. On a fresh VPS this window
# is wider than on a warm local machine.
check() {
  local label=$1 url=$2 attempts=${3:-10} i code
  for ((i = 1; i <= attempts; i++)); do
    code=$(http_status "$url")
    case "$code" in
      200|302|307|308)
        echo "  ✅ ${label} (HTTP ${code})"
        return 0
        ;;
    esac
    sleep 3
  done
  echo "  ❌ ${label} (HTTP ${code}) — ${url}"
  FAILED=$((FAILED + 1))
  return 1
}

check "API health"    "http://localhost:${API_PORT_VALUE}/api/v1/health/live"
check "API docs"      "http://localhost:${API_PORT_VALUE}/docs"
check "Admin console" "http://localhost:${ADMIN_PORT_VALUE}/login"
check "Customer app"  "http://localhost:${CUSTOMER_PORT_VALUE}/"
check "Driver app"    "http://localhost:${DRIVER_PORT_VALUE}/"
check "Gateway"       "http://localhost:${GATEWAY_PORT_VALUE}/"

# ── Summary ─────────────────────────────────────────────────────
echo ""
if [ "$FAILED" -gt 0 ]; then
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║  ⚠️  Deployed with ${FAILED} failing check(s)                      ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  echo "  Debug:  $(basename "$0") --help"
  echo "  Logs:   docker compose -f docker-compose.prod.yml logs -f <service>"
  exit 1
fi

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✅ LEOPARD Demo — Deployment Complete                   ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "  🌐 Demo portal  http://${HOST}:${GATEWAY_PORT_VALUE}/"
echo "  🛡️  Admin         http://${HOST}:${ADMIN_PORT_VALUE}/login"
echo "  📦 Customer      http://${HOST}:${CUSTOMER_PORT_VALUE}/"
echo "  🚛 Driver        http://${HOST}:${DRIVER_PORT_VALUE}/"
echo "  📡 API docs      http://${HOST}:${API_PORT_VALUE}/docs"
echo ""
echo "  🔑 Demo accounts (type into the login box)"
echo "     admin · driver · customer"
echo ""
echo "  Gửi khách link: http://${HOST}:${GATEWAY_PORT_VALUE}/"
echo ""
echo "  Quản lý:"
echo "    logs   docker compose -f docker-compose.prod.yml logs -f"
echo "    stop   docker compose -f docker-compose.prod.yml down"
echo "    seed   ./infra/scripts/deploy-demo.sh --reseed"
echo ""
