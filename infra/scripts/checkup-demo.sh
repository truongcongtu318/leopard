#!/usr/bin/env bash
# Health check for the deployed stack — the monitoring a small VPS actually
# needs, without an external service.
#
# Checks, in order of what breaks a running system:
#   1. every expected container is running
#   2. the API answers its liveness endpoint
#   3. disk headroom (a full disk stops Postgres from writing)
#   4. TLS tunnels are up, when the systemd units exist
#
# Exit code 0 = healthy, 1 = at least one check failed, so cron mail (or any
# wrapper) reports it.
#
# Usage:
#   ./infra/scripts/checkup-demo.sh
#   ./infra/scripts/checkup-demo.sh --install-cron   # every 15 minutes

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env.prod"
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.prod.yml"
LOG_FILE="${CHECKUP_LOG:-/var/log/leopard-checkup.log}"
DISK_WARN_PERCENT="${DISK_WARN_PERCENT:-85}"
DISK_FAIL_PERCENT="${DISK_FAIL_PERCENT:-95}"

if [ "${1:-}" = "--install-cron" ]; then
  CRON_LINE="*/15 * * * * ${SCRIPT_DIR}/checkup-demo.sh >> ${LOG_FILE} 2>&1"
  ( crontab -l 2>/dev/null | grep -v 'checkup-demo.sh' || true; echo "$CRON_LINE" ) | crontab -
  echo "✅ Đã cài cron: mỗi 15 phút → ${LOG_FILE}"
  exit 0
fi

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

FAILED=0
report() {
  local level=$1 message=$2
  printf '%s [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$level" "$message"
  [ "$level" = "FAIL" ] && FAILED=1
  return 0
}

# 1. Containers
EXPECTED="postgres api admin customer driver gateway"
RUNNING="$(compose ps --status running --format '{{.Service}}' 2>/dev/null | sort | tr '\n' ' ')"
for svc in $EXPECTED; do
  if printf '%s' "$RUNNING" | grep -qw "$svc"; then
    report OK "container ${svc} đang chạy"
  else
    report FAIL "container ${svc} KHÔNG chạy"
  fi
done

# 2. API liveness
API_PORT="$(grep -E '^API_PORT=' "$ENV_FILE" 2>/dev/null | tail -1 | cut -d= -f2- || true)"
API_PORT="${API_PORT:-3000}"
CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "http://localhost:${API_PORT}/api/v1/health/live" 2>/dev/null || echo 000)"
if [ "$CODE" = "200" ]; then
  report OK "API health 200"
else
  report FAIL "API health trả ${CODE}"
fi

# 3. Disk. Postgres needs room to write WAL; a full disk is a hard outage.
DISK_PCT="$(df / | tail -1 | awk '{print $5}' | tr -d '%')"
if [ "${DISK_PCT:-100}" -ge "$DISK_FAIL_PERCENT" ]; then
  report FAIL "disk ${DISK_PCT}% (ngưỡng ${DISK_FAIL_PERCENT}%) — dọn gấp: docker image prune -af"
elif [ "${DISK_PCT:-100}" -ge "$DISK_WARN_PERCENT" ]; then
  report WARN "disk ${DISK_PCT}% (ngưỡng cảnh báo ${DISK_WARN_PERCENT}%)"
else
  report OK "disk ${DISK_PCT}%"
fi

# 4. Tunnels, when they are managed by systemd.
for unit in leopard-tunnel-portal leopard-tunnel-customer leopard-tunnel-driver; do
  if systemctl list-unit-files "${unit}.service" >/dev/null 2>&1 &&
     systemctl cat "${unit}.service" >/dev/null 2>&1; then
    if systemctl is-active --quiet "$unit"; then
      report OK "${unit} active"
    else
      report FAIL "${unit} KHÔNG active"
    fi
  fi
done

# 5. Postgres accepts connections (the container can be "running" yet refusing).
if compose exec -T postgres pg_isready -q 2>/dev/null; then
  report OK "postgres nhận kết nối"
else
  report FAIL "postgres không nhận kết nối"
fi

if [ "$FAILED" = 0 ]; then
  report OK "tất cả kiểm tra đạt"
else
  report FAIL "có kiểm tra thất bại"
fi

exit "$FAILED"
