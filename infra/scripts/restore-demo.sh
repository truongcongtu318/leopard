#!/usr/bin/env bash
# Restore the database from a backup produced by infra/scripts/backup-demo.sh.
#
# This OVERWRITES the current database: the dump is taken with --clean
# --if-exists, so every table it contains is dropped and recreated.
#
# Usage:
#   ./infra/scripts/restore-demo.sh /root/leopard-backups/leopard-db-20260915_0230.sql.gz
#   ./infra/scripts/restore-demo.sh <file> --yes     # skip the confirmation prompt
#
# Safety: the current database is dumped to a restore-point file first, so an
# accidental restore of the wrong backup is recoverable.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env.prod"
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.prod.yml"
BACKUP_DIR="${BACKUP_DIR:-/root/leopard-backups}"

BACKUP_FILE="${1:-}"
CONFIRM="${2:-}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Dùng: $0 <file-backup.sql.gz> [--yes]" >&2
  echo "Các bản backup hiện có:" >&2
  ls -1t "${BACKUP_DIR}"/leopard-db-*.sql.gz 2>/dev/null | head -10 >&2 || echo "  (chưa có)" >&2
  exit 2
fi

[[ -f "$BACKUP_FILE" ]] || { echo "❌ Không tìm thấy file: ${BACKUP_FILE}" >&2; exit 1; }
[[ -f "$ENV_FILE" ]] || { echo "❌ Không tìm thấy ${ENV_FILE}" >&2; exit 1; }

# Refuse to restore a dump that cannot be read before touching the database.
if ! gzip -t "$BACKUP_FILE" 2>/dev/null; then
  echo "❌ File backup hỏng (gzip -t thất bại): ${BACKUP_FILE}" >&2
  exit 1
fi

env_value() {
  local key=$1 fallback=${2:-} value
  value=$(grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | tail -1 | cut -d= -f2- || true)
  printf '%s' "${value:-$fallback}"
}

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

DB_USER="$(env_value POSTGRES_USER leopard)"
DB_NAME="$(env_value POSTGRES_DB leopard)"

BEFORE=$(compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -tAc \
  'SELECT count(*) FROM "User";' 2>/dev/null | tr -d '[:space:]' || echo '?')

echo "╔══════════════════════════════════════════════════════════╗"
echo "║   LEOPARD — khôi phục database (GHI ĐÈ)"
echo "╚══════════════════════════════════════════════════════════╝"
echo "  Nguồn:        ${BACKUP_FILE}"
echo "  Database:     ${DB_NAME}"
echo "  Hiện có:      ${BEFORE} tài khoản"
echo

if [ "$CONFIRM" != "--yes" ]; then
  printf "Gõ 'restore' để xác nhận ghi đè: "
  read -r answer
  [ "$answer" = "restore" ] || { echo "Đã huỷ."; exit 0; }
fi

# Restore point: never make an overwrite unrecoverable.
RESTORE_POINT="${BACKUP_DIR}/leopard-preserve-$(date +%Y%m%d_%H%M%S).sql.gz"
mkdir -p "$BACKUP_DIR"
echo "  💾 Lưu bản hiện tại trước khi ghi đè..."
if compose exec -T postgres pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges \
    --clean --if-exists | gzip > "$RESTORE_POINT"; then
  echo "     ✅ ${RESTORE_POINT}"
else
  echo "     ❌ Không lưu được bản hiện tại — dừng để tránh mất dữ liệu" >&2
  rm -f "$RESTORE_POINT"
  exit 1
fi

echo "  ⬇️  Đang khôi phục..."
if ! gunzip -c "$BACKUP_FILE" | compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=0 >/tmp/leopard-restore.log 2>&1; then
  echo "  ❌ psql trả về lỗi — xem /tmp/leopard-restore.log" >&2
  echo "     Bản trước khi ghi đè: ${RESTORE_POINT}" >&2
  exit 1
fi

AFTER=$(compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -tAc \
  'SELECT count(*) FROM "User";' 2>/dev/null | tr -d '[:space:]' || echo '?')
COUNTS=$(compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -tAc \
  "SELECT json_build_object('users', (SELECT count(*) FROM \"User\"), 'orders', (SELECT count(*) FROM \"Order\"), 'media', (SELECT count(*) FROM \"MediaObject\"));" \
  2>/dev/null | tr -d '\n' || echo '{}')

echo "  ✅ Khôi phục xong"
echo "     Tài khoản: ${BEFORE} → ${AFTER}"
echo "     Số liệu:   ${COUNTS}"
echo
echo "Kiểm tra stack:"
echo "  docker compose --env-file .env.prod -f docker-compose.prod.yml restart api"
echo "  curl -s http://localhost:3000/api/v1/health/live"
