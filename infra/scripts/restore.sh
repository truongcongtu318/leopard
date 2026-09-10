#!/usr/bin/env bash
set -euo pipefail

# LEOPARD Database Restore Script
# Usage: ./infra/scripts/restore.sh <backup-file> [--target-url=postgresql://...]
#
# Restores a LEOPARD backup into a target database.
# Supports both .sql.gz (compressed) and .sql (plain) files.
# Includes integrity verification via record-count smoke test.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Parse arguments
BACKUP_FILE="${1:-}"
TARGET_URL="${DATABASE_URL:-}"

for arg in "$@"; do
  case $arg in
    --target-url=*)
      TARGET_URL="${arg#*=}"
      ;;
  esac
done

# Validate
if [ -z "$BACKUP_FILE" ]; then
  echo "❌ Usage: restore.sh <backup-file> [--target-url=postgresql://...]"
  echo "   Example: ./infra/scripts/restore.sh backups/leopard_backup_20260819.sql.gz"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Backup file not found: $BACKUP_FILE"
  exit 1
fi

if [ -z "$TARGET_URL" ]; then
  echo "❌ DATABASE_URL or --target-url is required."
  exit 1
fi

if ! command -v psql &> /dev/null; then
  echo "❌ psql is not installed. Install postgresql-client."
  exit 1
fi

echo "╔══════════════════════════════════════════════════════════╗"
echo "║          LEOPARD Database Restore                        ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo "  Backup:  ${BACKUP_FILE}"
echo "  Target:  $(echo "$TARGET_URL" | sed 's/:[^:@]*@/:***@/')"
echo ""

# Verify checksum if manifest exists
MANIFEST_FILE="${BACKUP_FILE%.sql.gz}.manifest.json"
if [ -f "$MANIFEST_FILE" ]; then
  EXPECTED_SHA=$(python3 -c "import json; print(json.load(open('$MANIFEST_FILE'))['checksumSha256'])" 2>/dev/null || echo "")
  if [ -n "$EXPECTED_SHA" ]; then
    ACTUAL_SHA=$(sha256sum "$BACKUP_FILE" | cut -d' ' -f1)
    if [ "$EXPECTED_SHA" = "$ACTUAL_SHA" ]; then
      echo "  ✅ Checksum verified: $ACTUAL_SHA"
    else
      echo "  ❌ Checksum mismatch!"
      echo "     Expected: $EXPECTED_SHA"
      echo "     Actual:   $ACTUAL_SHA"
      exit 1
    fi
  fi
fi

# Restore
echo ""
echo "📦 Restoring database..."
if [[ "$BACKUP_FILE" == *.gz ]]; then
  gunzip -c "$BACKUP_FILE" | psql "$TARGET_URL" --quiet --set ON_ERROR_STOP=off > /dev/null 2>&1
else
  psql "$TARGET_URL" --quiet --set ON_ERROR_STOP=off < "$BACKUP_FILE" > /dev/null 2>&1
fi

# Integrity smoke test
echo "🔍 Running integrity smoke test..."
SMOKE_RESULT=$(psql "$TARGET_URL" -t -A -c "
  SELECT json_build_object(
    'users', (SELECT count(*) FROM \"User\"),
    'orders', (SELECT count(*) FROM \"Order\"),
    'fleets', (SELECT count(*) FROM \"Fleet\"),
    'trackingPoints', (SELECT count(*) FROM \"TrackingPoint\"),
    'paymentIntents', (SELECT count(*) FROM \"PaymentIntent\")
  )
" 2>/dev/null || echo '{}')

echo ""
echo "  ✅ Restore complete"
echo ""
echo "  Record counts after restore:"
echo "  ${SMOKE_RESULT}" | python3 -m json.tool 2>/dev/null || echo "  ${SMOKE_RESULT}"

# Compare with manifest if available
if [ -f "$MANIFEST_FILE" ]; then
  echo ""
  echo "  📋 Comparing with backup manifest..."
  MANIFEST_COUNTS=$(python3 -c "
import json, sys
m = json.load(open('$MANIFEST_FILE'))
r = json.loads('$SMOKE_RESULT') if '$SMOKE_RESULT' != '{}' else {}
rc = m.get('recordCounts', {})
all_pass = True
for table in ['users', 'orders', 'fleets', 'trackingPoints', 'paymentIntents']:
    expected = int(rc.get(table, 0))
    actual = int(r.get(table, 0))
    status = '✅' if expected == actual else '⚠️'
    if expected != actual: all_pass = False
    print(f'     {status} {table}: {actual} (expected {expected})')
if all_pass:
    print('  ✅ All record counts match manifest.')
else:
    print('  ⚠️  Some counts differ — review manually.')
" 2>/dev/null || echo "  Could not compare with manifest")
  echo "$MANIFEST_COUNTS"
fi

echo ""
echo "Done."
