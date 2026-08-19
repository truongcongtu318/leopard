#!/usr/bin/env bash
set -euo pipefail

# LEOPARD Staging Rollback Script
# Usage: ./infra/scripts/rollback-staging.sh [--to-image=<tag>]
#
# Rolls back the LEOPARD staging deployment to the previous known-good state.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

ROLLBACK_IMAGE="${1:-}"
for arg in "$@"; do
  case $arg in
    --to-image=*)
      ROLLBACK_IMAGE="${arg#*=}"
      ;;
  esac
done

echo "╔══════════════════════════════════════════════════════════╗"
echo "║          LEOPARD Staging Rollback                        ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# --- Step 1: Stop current deployment ---
echo "🛑 Step 1: Stopping current deployment..."
if [ -f "$PROJECT_ROOT/compose.yaml" ]; then
  docker compose -f "$PROJECT_ROOT/compose.yaml" down --timeout 30 2>&1 || true
  echo "  ✅ Containers stopped"
else
  echo "  ⚠️  No compose.yaml found. Manual stop required."
  echo "  Kill processes: pkill -f 'node.*main.js' || true"
fi

# --- Step 2: Restore previous database state ---
echo ""
echo "🗃️  Step 2: Database rollback options..."

LATEST_BACKUP=$(ls -t "$PROJECT_ROOT/backups/"leopard_backup_*.sql.gz 2>/dev/null | head -1 || echo "")
if [ -n "$LATEST_BACKUP" ]; then
  echo "  Latest backup found: $(basename "$LATEST_BACKUP")"
  echo "  To restore: ./infra/scripts/restore.sh $LATEST_BACKUP"
else
  echo "  ⚠️  No backup found in $PROJECT_ROOT/backups/"
  echo "  Ensure daily backups are configured before production use."
fi

# --- Step 3: Redeploy previous version ---
echo ""
echo "🔄 Step 3: Redeploying previous version..."

if [ -n "$ROLLBACK_IMAGE" ]; then
  echo "  Rolling back to image: ${ROLLBACK_IMAGE}"
  if [ -f "$PROJECT_ROOT/compose.yaml" ]; then
    IMAGE_TAG="$ROLLBACK_IMAGE" docker compose -f "$PROJECT_ROOT/compose.yaml" up -d 2>&1 || {
      echo "  ❌ Rollback deployment failed"
      exit 1
    }
    echo "  ✅ Previous version deployed"
  fi
else
  echo "  No rollback image specified."
  echo "  Usage: ./infra/scripts/rollback-staging.sh --to-image=<previous-commit-sha>"
  echo ""
  echo "  Recent git tags/commits:"
  git -C "$PROJECT_ROOT" log --oneline -5 2>/dev/null || echo "  (git log unavailable)"
fi

# --- Step 4: Verify rollback ---
echo ""
echo "💓 Step 4: Verifying rollback..."

API_URL="${API_BASE_URL:-http://localhost:3000}"
MAX_RETRIES=5
RETRY_DELAY=3

for i in $(seq 1 $MAX_RETRIES); do
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/health" 2>/dev/null || echo "000")
  if [ "$HTTP_STATUS" = "200" ]; then
    echo "  ✅ Health check passed after rollback"
    break
  fi
  if [ "$i" = "$MAX_RETRIES" ]; then
    echo "  ⚠️  Health check not passing — manual intervention required"
    echo "  Check logs: docker compose logs api"
  fi
  echo "  ⏳ Waiting... (${i}/${MAX_RETRIES})"
  sleep $RETRY_DELAY
done

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Rollback procedure complete.                            ║"
echo "║  Run smoke test: ./infra/scripts/smoke-staging.sh        ║"
echo "╚══════════════════════════════════════════════════════════╝"
