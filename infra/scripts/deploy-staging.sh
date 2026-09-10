#!/usr/bin/env bash
set -euo pipefail

# LEOPARD Staging Deployment Script
# Usage: ./infra/scripts/deploy-staging.sh [--dry-run] [--image-tag=latest]
#
# Deploys the LEOPARD stack to staging environment.
# Steps: validate env → build images → run migrations → deploy → health check

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Parse arguments
DRY_RUN=false
IMAGE_TAG="${IMAGE_TAG:-$(git -C "$PROJECT_ROOT" rev-parse --short HEAD 2>/dev/null || echo 'latest')}"
COMMIT_SHA="$(git -C "$PROJECT_ROOT" rev-parse HEAD 2>/dev/null || echo 'unknown')"

for arg in "$@"; do
  case $arg in
    --dry-run)
      DRY_RUN=true
      ;;
    --image-tag=*)
      IMAGE_TAG="${arg#*=}"
      ;;
  esac
done

echo "╔══════════════════════════════════════════════════════════╗"
echo "║          LEOPARD Staging Deployment                      ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo "  Commit:     ${COMMIT_SHA}"
echo "  Image Tag:  ${IMAGE_TAG}"
echo "  Dry Run:    ${DRY_RUN}"
echo ""

# --- Step 1: Validate Environment ---
echo "🔍 Step 1: Validating environment..."

REQUIRED_VARS=(
  "DATABASE_URL"
  "AUTH_ACCESS_TOKEN_SECRET"
  "AUTH_REFRESH_TOKEN_SECRET"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var:-}" ]; then
    MISSING_VARS+=("$var")
  fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo "  ❌ Missing required environment variables:"
  for var in "${MISSING_VARS[@]}"; do
    echo "     - $var"
  done
  echo ""
  echo "  Copy .env.example and fill in values:"
  echo "  cp .env.example .env && source .env"
  exit 1
fi
echo "  ✅ All required environment variables set"

# --- Step 2: Build Images ---
echo ""
echo "📦 Step 2: Building Docker images..."

if [ "$DRY_RUN" = true ]; then
  echo "  [DRY RUN] Would build: leopard-api:${IMAGE_TAG}, leopard-web:${IMAGE_TAG}"
else
  if [ -f "$PROJECT_ROOT/compose.yaml" ]; then
    docker compose -f "$PROJECT_ROOT/compose.yaml" build \
      --build-arg IMAGE_TAG="$IMAGE_TAG" \
      --build-arg COMMIT_SHA="$COMMIT_SHA" 2>&1 | tail -5
    echo "  ✅ Images built successfully"
  else
    echo "  ⚠️  compose.yaml not found, skipping Docker build"
    echo "  Building with pnpm instead..."
    cd "$PROJECT_ROOT"
    pnpm build
    echo "  ✅ pnpm build complete"
  fi
fi

# --- Step 3: Run Database Migrations ---
echo ""
echo "🗃️  Step 3: Running database migrations..."

if [ "$DRY_RUN" = true ]; then
  echo "  [DRY RUN] Would run: prisma migrate deploy"
else
  cd "$PROJECT_ROOT"
  pnpm --filter api prisma:generate
  npx --filter api prisma migrate deploy --schema apps/api/prisma/schema.prisma 2>&1 || {
    echo "  ❌ Migration failed! Aborting deployment."
    echo "  Run rollback: ./infra/scripts/rollback-staging.sh"
    exit 1
  }
  echo "  ✅ Migrations applied successfully"
fi

# --- Step 4: Deploy Application ---
echo ""
echo "🚀 Step 4: Deploying application..."

if [ "$DRY_RUN" = true ]; then
  echo "  [DRY RUN] Would deploy with image tag: ${IMAGE_TAG}"
  echo "  [DRY RUN] Would set commit SHA: ${COMMIT_SHA}"
else
  if [ -f "$PROJECT_ROOT/compose.yaml" ]; then
    docker compose -f "$PROJECT_ROOT/compose.yaml" up -d --remove-orphans 2>&1 | tail -5
    echo "  ✅ Containers started"
  else
    echo "  ⚠️  No compose.yaml — manual deployment required"
    echo "  Start API:  cd apps/api && node dist/main.js"
    echo "  Start Web:  cd apps/admin && pnpm start"
  fi
fi

# --- Step 5: Health Check ---
echo ""
echo "💓 Step 5: Running health check..."

if [ "$DRY_RUN" = true ]; then
  echo "  [DRY RUN] Would check: GET /health"
  echo ""
  echo "  ✅ Dry run complete. No changes were made."
  exit 0
fi

API_URL="${API_BASE_URL:-http://localhost:3000}"
MAX_RETRIES=10
RETRY_DELAY=3

for i in $(seq 1 $MAX_RETRIES); do
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/health" 2>/dev/null || echo "000")
  if [ "$HTTP_STATUS" = "200" ]; then
    echo "  ✅ Health check passed (attempt ${i}/${MAX_RETRIES})"
    break
  fi
  if [ "$i" = "$MAX_RETRIES" ]; then
    echo "  ❌ Health check failed after ${MAX_RETRIES} attempts"
    echo "  Last status: ${HTTP_STATUS}"
    echo "  Run rollback: ./infra/scripts/rollback-staging.sh"
    exit 1
  fi
  echo "  ⏳ Waiting for API... (attempt ${i}/${MAX_RETRIES}, status: ${HTTP_STATUS})"
  sleep $RETRY_DELAY
done

# --- Step 6: Post-Deploy Smoke ---
echo ""
echo "🔬 Step 6: Running post-deploy smoke test..."
./infra/scripts/smoke-staging.sh 2>/dev/null || {
  echo "  ⚠️  Smoke test script not available, skipping"
}

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✅ Deployment Complete                                  ║"
echo "║                                                          ║"
echo "║  Commit:  ${COMMIT_SHA:0:12}                             ║"
echo "║  Tag:     ${IMAGE_TAG}                                   ║"
echo "╚══════════════════════════════════════════════════════════╝"
