#!/usr/bin/env bash
set -euo pipefail

# LEOPARD Database Backup Script
# Usage: ./infra/scripts/backup.sh [--output-dir=/path/to/backups]
#
# Creates a timestamped pg_dump backup of the LEOPARD database.
# Requires: pg_dump, DATABASE_URL environment variable

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Parse arguments
OUTPUT_DIR="${PROJECT_ROOT}/backups"
for arg in "$@"; do
  case $arg in
    --output-dir=*)
      OUTPUT_DIR="${arg#*=}"
      ;;
  esac
done

# Validate environment
if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ DATABASE_URL environment variable is required."
  echo "   Example: export DATABASE_URL=postgresql://user:pass@localhost:5432/leopard"
  exit 1
fi

if ! command -v pg_dump &> /dev/null; then
  echo "❌ pg_dump is not installed. Install postgresql-client."
  exit 1
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${OUTPUT_DIR}/leopard_backup_${TIMESTAMP}.sql.gz"
MANIFEST_FILE="${OUTPUT_DIR}/leopard_backup_${TIMESTAMP}.manifest.json"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║          LEOPARD Database Backup                         ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo "  Timestamp:   ${TIMESTAMP}"
echo "  Output:      ${BACKUP_FILE}"
echo ""

# Run pg_dump with compression
echo "📦 Creating backup..."
pg_dump "$DATABASE_URL" \
  --format=plain \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  2>/dev/null | gzip > "$BACKUP_FILE"

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

# Count records for manifest
echo "📊 Generating manifest..."
RECORD_COUNTS=$(psql "$DATABASE_URL" -t -A -c "
  SELECT json_build_object(
    'users', (SELECT count(*) FROM \"User\"),
    'orders', (SELECT count(*) FROM \"Order\"),
    'orderStops', (SELECT count(*) FROM \"OrderStop\"),
    'orderStatusHistory', (SELECT count(*) FROM \"OrderStatusHistory\"),
    'trackingPoints', (SELECT count(*) FROM \"TrackingPoint\"),
    'paymentIntents', (SELECT count(*) FROM \"PaymentIntent\"),
    'mediaObjects', (SELECT count(*) FROM \"MediaObject\"),
    'fleets', (SELECT count(*) FROM \"Fleet\"),
    'fleetMembers', (SELECT count(*) FROM \"FleetMember\"),
    'driverProfiles', (SELECT count(*) FROM \"DriverProfile\"),
    'auditLogs', (SELECT count(*) FROM \"AuditLog\"),
    'refreshSessions', (SELECT count(*) FROM \"RefreshSession\")
  )
" 2>/dev/null || echo '{}')

# Write manifest
cat > "$MANIFEST_FILE" << EOF
{
  "timestamp": "${TIMESTAMP}",
  "backupFile": "$(basename "$BACKUP_FILE")",
  "sizeCompressed": "${BACKUP_SIZE}",
  "databaseUrl": "$(echo "$DATABASE_URL" | sed 's/:[^:@]*@/:***@/')",
  "recordCounts": ${RECORD_COUNTS:-{}},
  "pgDumpVersion": "$(pg_dump --version | head -1)",
  "checksumSha256": "$(sha256sum "$BACKUP_FILE" | cut -d' ' -f1)"
}
EOF

echo ""
echo "  ✅ Backup complete"
echo "  📁 File:     ${BACKUP_FILE} (${BACKUP_SIZE})"
echo "  📋 Manifest: ${MANIFEST_FILE}"
echo "  🔑 SHA-256:  $(sha256sum "$BACKUP_FILE" | cut -d' ' -f1)"
echo ""
echo "  Record counts:"
echo "  ${RECORD_COUNTS}" | python3 -m json.tool 2>/dev/null || echo "  ${RECORD_COUNTS}"
