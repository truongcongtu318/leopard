#!/usr/bin/env bash
# Put the demo behind HTTPS.
#
# Why this is required, not cosmetic: the browser Geolocation API refuses to run
# on an insecure origin. Over plain http://<ip> every "use my current location"
# flow fails silently — navigator.geolocation still exists, the call just comes
# back with code 1 "Only secure origins are allowed". That takes out the
# customer's current-location pickup, the driver's location ping (and therefore
# dispatch, which only offers to drivers seen in the last 90s), and the real
# coordinate in the e-POD watermark.
#
# Three tunnels, because each app needs its own origin:
#
#   portal    -> localhost:8888   portal + Admin console (edge nginx)
#   customer  -> localhost:8081   Customer app, served at the root
#   driver    -> localhost:8082   Driver app,   served at the root
#
# The apps cannot share one host with path prefixes: their exported bundles link
# the bundle and every route from the root, and Expo Router's baseUrl support
# re-prepends a prefix to paths the app already hard-codes (see the note in
# infra/nginx/demo-edge.conf).
#
# Run ./infra/scripts/deploy-demo.sh first: the tunnels expect the stack to be
# listening on 80/8081/8082.
#
# The URLs are random and change whenever a tunnel restarts. For stable links you
# need a named tunnel bound to a domain.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
EDGE_CONFIG="${REPO_ROOT}/infra/nginx/demo-edge.conf"
EDGE_PORT="${EDGE_PORT:-8888}"
CUSTOMER_PORT="${CUSTOMER_PORT:-8081}"
DRIVER_PORT="${DRIVER_PORT:-8082}"
CLOUDFLARED="${CLOUDFLARED:-/usr/local/bin/cloudflared}"

info() { printf '\033[1;34m▸\033[0m %s\n' "$1"; }
ok()   { printf '\033[1;32m✓\033[0m %s\n' "$1"; }
fail() { printf '\033[1;31m✗\033[0m %s\n' "$1" >&2; exit 1; }

[[ -f "${EDGE_CONFIG}" ]] || fail "Không tìm thấy ${EDGE_CONFIG}"

# ── 1. nginx in front of the portal host ──
if ! command -v nginx >/dev/null 2>&1; then
  info "Cài nginx"
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update -qq && apt-get install -y -qq nginx
  elif command -v dnf >/dev/null 2>&1; then
    dnf install -y -q nginx
  else
    fail "Không cài được nginx: không nhận diện được package manager"
  fi
fi

info "Cài cấu hình edge proxy (cổng ${EDGE_PORT})"
install -m 0644 "${EDGE_CONFIG}" /etc/nginx/conf.d/demo-edge.conf

# Ubuntu's stock site listens on :80, which the demo stack's gateway container
# already owns — with it enabled nginx refuses to start at all ("port 80 is
# already in use"). Nothing else on this host serves :80 through the system
# nginx, so the stock site is disabled rather than edited, and the gateway keeps
# that port. Only the symlink is removed; the file in sites-available stays.
if [[ -e /etc/nginx/sites-enabled/default ]]; then
  info "Tắt site mặc định của Ubuntu (port 80 thuộc về container gateway)"
  rm -f /etc/nginx/sites-enabled/default
fi

nginx -t >/dev/null 2>&1 || fail "nginx -t thất bại — xem: nginx -t"
systemctl enable nginx >/dev/null 2>&1 || true
systemctl restart nginx
systemctl is-active --quiet nginx || fail "nginx không chạy — xem: journalctl -xeu nginx"
ok "nginx phục vụ portal host ở cổng ${EDGE_PORT}"

# ── 2. cloudflared ──
if [[ ! -x "${CLOUDFLARED}" ]]; then
  info "Tải cloudflared"
  curl -fsSL -o "${CLOUDFLARED}" \
    https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
  chmod +x "${CLOUDFLARED}"
fi

install_tunnel() {
  local name=$1 port=$2
  cat > "/etc/systemd/system/leopard-tunnel-${name}.service" <<EOF
[Unit]
Description=Cloudflare quick tunnel for the LEOPARD demo (${name})
After=network-online.target nginx.service
Wants=network-online.target

[Service]
Type=simple
# QUIC (UDP 7844) is blocked on many VPS networks; HTTP/2 over TCP works
# everywhere and is what the preflight check recommends in that case.
ExecStart=${CLOUDFLARED} tunnel --url http://localhost:${port} --no-autoupdate --protocol http2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable "leopard-tunnel-${name}" >/dev/null 2>&1 || true
  systemctl restart "leopard-tunnel-${name}"
}

tunnel_url() {
  local name=$1 url=""
  for _ in $(seq 1 30); do
    url="$(journalctl -u "leopard-tunnel-${name}" --no-pager -n 200 2>/dev/null \
      | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | tail -1 || true)"
    [[ -n "${url}" ]] && break
    sleep 2
  done
  printf '%s' "${url}"
}

info "Cài 3 dịch vụ tunnel (portal, customer, driver)"
install_tunnel portal "${EDGE_PORT}"
install_tunnel customer "${CUSTOMER_PORT}"
install_tunnel driver "${DRIVER_PORT}"

info "Chờ tunnel đăng ký"
PORTAL_URL="$(tunnel_url portal)"
CUSTOMER_URL="$(tunnel_url customer)"
DRIVER_URL="$(tunnel_url driver)"

[[ -n "${PORTAL_URL}" ]] || fail "Chưa lấy được URL tunnel portal — xem: journalctl -u leopard-tunnel-portal -n 50"

echo
ok "HTTPS đã sẵn sàng"
echo
echo "  Portal (gửi khách)   ${PORTAL_URL}/"
echo "  Admin                ${PORTAL_URL}/login"
echo "  Customer             ${CUSTOMER_URL:-<chưa có>}/"
echo "  Driver               ${DRIVER_URL:-<chưa có>}/"
echo
if [[ -n "${CUSTOMER_URL}" && -n "${DRIVER_URL}" ]]; then
  echo "Portal tự trỏ tới 2 app qua query string, nên hãy gửi khách link này:"
  echo "  ${PORTAL_URL}/?customer=${CUSTOMER_URL}&driver=${DRIVER_URL}"
  echo
fi
echo "Địa chỉ đổi mỗi khi tunnel khởi động lại:"
echo "  systemctl restart leopard-tunnel-{portal,customer,driver}"
