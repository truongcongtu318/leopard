#!/usr/bin/env bash
# Automated backup of the deployed demo/production stack.
#
# Runs pg_dump inside the postgres container, so the host needs only Docker —
# the previous backup.sh required a host pg_dump and psql, which a Docker-only
# VPS does not have, so no backup was ever taken there.
#
# Usage:
#   ./infra/scripts/backup-demo.sh                 # database only
#   ./infra/scripts/backup-demo.sh --with-uploads  # also archive uploaded media
#   BACKUP_DIR=/mnt/backups ./infra/scripts/backup-demo.sh
#
# Schedule daily at 02:30 (idempotent):
#   ./infra/scripts/backup-demo.sh --install-cron
#
# Restore: see infra/scripts/restore-demo.sh, or the command printed at the end.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env.prod"
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.prod.yml"

BACKUP_DIR="${BACKUP_DIR:-/root/leopard-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
WITH_UPLOADS=false
INSTALL_CRON=false

for arg in "$@"; do
  case $arg in
    --with-uploads) WITH_UPLOADS=true ;;
    --install-cron) INSTALL_CRON=true ;;
    --help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "Tham số không nhận diện được: $arg" >&2; exit 2 ;;
  esac
done

[[ -f "$ENV_FILE" ]] || { echo "❌ Không tìm thấy ${ENV_FILE}" >&2; exit 1; }

env_value() {
  local key=$1 fallback=${2:-} value
  value=$(grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | tail -1 | cut -d= -f2- || true)
  printf '%s' "${value:-$fallback}"
}

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

if [ "$INSTALL_CRON" = true ]; then
  CRON_LINE="30 2 * * * BACKUP_DIR=${BACKUP_DIR} RETENTION_DAYS=${RETENTION_DAYS} ${SCRIPT_DIR}/backup-demo.sh --with-uploads >> ${BACKUP_DIR}/cron.log 2>&1"
  mkdir -p "$BACKUP_DIR"
  # Replace any previous line for this script, so re-running does not stack jobs.
  ( crontab -l 2>/dev/null | grep -v 'backup-demo.sh' || true; echo "$CRON_LINE" ) | crontab -
  echo "✅ Đã cài cron: 02:30 hằng ngày → ${BACKUP_DIR}"
  crontab -l | grep backup-demo.sh
  exit 0
fi

DB_USER="$(env_value POSTGRES_USER leopard)"
DB_NAME="$(env_value POSTGRES_DB leopard)"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
DB_FILE="${BACKUP_DIR}/leopard-db-${TIMESTAMP}.sql.gz"
FAILED=0

echo "╔══════════════════════════════════════════════════════════╗"
echo "║   LEOPARD — backup (database${WITH_UPLOADS:+, + uploads})"
echo "╚══════════════════════════════════════════════════════════╝"

if ! compose ps postgres --status running --format '{{.Name}}' | grep -q .; then
  echo "❌ Container postgres không chạy — không backup được" >&2
  exit 1
fi

# --clean --if-exists makes the dump self-contained and re-runnable.
if compose exec -T postgres pg_dump -U "$DB_USER" -d "$DB_NAME" \
    --no-owner --no-privileges --clean --if-exists | gzip > "$DB_FILE"; then
  SIZE="$(du -h "$DB_FILE" | cut -f1)"
  echo "  ✅ Database → ${DB_FILE} (${SIZE})"
else
  echo "  ❌ pg_dump thất bại" >&2
  rm -f "$DB_FILE"
  exit 1
fi

# A dump that cannot be read is worse than no dump: check it now rather than
# during an incident. `gzip -t` also catches a truncated write.
if ! gzip -t "$DB_FILE" 2>/dev/null; then
  echo "  ❌ File backup hỏng (gzip -t thất bại)" >&2
  FAILED=1
fi

# -tA keeps the output one compact JSON object; an aligned psql result would
# carry padding spaces and produce invalid JSON in the manifest.
COUNTS=$(compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -tAc \
  "SELECT json_build_object('users', (SELECT count(*) FROM \"User\"), 'orders', (SELECT count(*) FROM \"Order\"), 'media', (SELECT count(*) FROM \"MediaObject\"), 'driverProfiles', (SELECT count(*) FROM \"DriverProfile\"));" \
  2>/dev/null | tr -d '\n' || echo '{}')

# Bash closes `${VAR:-...}` at the first `}`, so a literal `{}` default would
# emit a stray brace and corrupt the JSON. Normalise with an explicit check.
if [ -z "${COUNTS//[[:space:]]/}" ]; then COUNTS='{}'; fi

cat > "${BACKUP_DIR}/leopard-db-${TIMESTAMP}.manifest.json" <<EOF
{
  "timestamp": "${TIMESTAMP}",
  "database": "${DB_NAME}",
  "backupFile": "$(basename "$DB_FILE")",
  "sizeCompressed": "$(du -h "$DB_FILE" | cut -f1)",
  "checksumSha256": "$(sha256sum "$DB_FILE" | cut -d' ' -f1)",
  "recordCounts": ${COUNTS},
  "host": "$(hostname)",
  "imageTag": "$(docker inspect leopard-demo-api-1 --format '{{.Config.Image}}' 2>/dev/null || echo unknown)"
}
EOF
echo "  📋 Manifest: ${BACKUP_DIR}/leopard-db-${TIMESTAMP}.manifest.json"
echo "  🔑 Record counts: ${COUNTS:-{}}"

if [ "$WITH_UPLOADS" = true ]; then
  UP_FILE="${BACKUP_DIR}/leopard-uploads-${TIMESTAMP}.tar.gz"
  # Uploads live in a named volume; archive it through a throwaway container so
  # the host does not need to know where Docker keeps volumes.
  if docker run --rm -v leopard-demo-uploads:/data:ro -v "${BACKUP_DIR}:/backup" \
      alpine:3 sh -c "tar czf /backup/$(basename "$UP_FILE") -C /data ." 2>/dev/null; then
    echo "  ✅ Uploads  → ${UP_FILE} ($(du -h "$UP_FILE" | cut -f1))"
  else
    echo "  ⚠️  Không archive được uploads (thiếu image alpine hoặc volume trống)" >&2
  fi
fi

# Retention. Runs even when a check above failed, so a disk cannot fill up with
# old dumps just because one run misbehaved.
DELETED=$(find "$BACKUP_DIR" -maxdepth 1 -type f \
  \( -name 'leopard-db-*.sql.gz' -o -name 'leopard-uploads-*.tar.gz' -o -name 'leopard-db-*.manifest.json' \) \
  -mtime "+${RETENTION_DAYS}" -print -delete | wc -l | tr -d ' ')
echo "  🧹 Xoá ${DELETED} file cũ hơn ${RETENTION_DAYS} ngày"
echo "  📦 Tổng dung lượng backups: $(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)"

echo
echo "Khôi phục (GHI ĐÈ toàn bộ dữ liệu hiện có):"
echo "  gunzip -c ${DB_FILE} | docker compose --env-file .env.prod -f docker-compose.prod.yml \\"
echo "    exec -T postgres psql -U ${DB_USER} -d ${DB_NAME}"
echo "  hoặc: ./infra/scripts/restore-demo.sh ${DB_FILE}"

[ "$FAILED" = 0 ] || exit 1
