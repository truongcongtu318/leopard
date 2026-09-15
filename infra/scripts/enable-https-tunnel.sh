#!/usr/bin/env bash
# Put the demo behind one HTTPS origin.
#
# Why this exists: the browser Geolocation API refuses to run on an insecure
# origin, so over plain HTTP every "use my current location" flow in the
# Customer and Driver apps fails. A tunnel gives a real TLS certificate without
# a domain or an account, and this script also fronts all four apps on a single
# origin so the Customer and Driver links stay relative.
#
# What it sets up:
#   - nginx on :8888 (loopback only) reading infra/nginx/demo-edge.conf
#   - cloudflared quick tunnel -> http://localhost:8888
#
# Run ./infra/scripts/deploy-demo.sh first: the edge proxy expects the stack to
# already be listening on 3000/3002/8081/8082 and the portal on 80.
#
# The tunnel URL is random and changes whenever cloudflared restarts. For a
# stable link you need a named tunnel bound to a domain.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
EDGE_CONFIG="${REPO_ROOT}/infra/nginx/demo-edge.conf"
EDGE_PORT="${EDGE_PORT:-8888}"
CLOUDFLARED="${CLOUDFLARED:-/usr/local/bin/cloudflared}"

info() { printf '\033[1;34m▸\033[0m %s\n' "$1"; }
ok()   { printf '\033[1;32m✓\033[0m %s\n' "$1"; }
fail() { printf '\033[1;31m✗\033[0m %s\n' "$1" >&2; exit 1; }

[[ -f "${EDGE_CONFIG}" ]] || fail "Không tìm thấy ${EDGE_CONFIG}"

# ── 1. nginx ──
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
# that port. The symlink is only removed; the file in sites-available stays.
if [[ -e /etc/nginx/sites-enabled/default ]]; then
  info "Tắt site mặc định của Ubuntu (port 80 thuộc về container gateway)"
  rm -f /etc/nginx/sites-enabled/default
fi

nginx -t >/dev/null 2>&1 || fail "nginx -t thất bại — xem: nginx -t"
systemctl enable nginx >/dev/null 2>&1 || true
systemctl restart nginx
systemctl is-active --quiet nginx || fail "nginx không chạy — xem: journalctl -xeu nginx"
ok "nginx đang phục vụ cổng ${EDGE_PORT}"

# ── 2. cloudflared ──
if [[ ! -x "${CLOUDFLARED}" ]]; then
  info "Tải cloudflared"
  curl -fsSL -o "${CLOUDFLARED}" \
    https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
  chmod +x "${CLOUDFLARED}"
fi

info "Cài cloudflared thành dịch vụ"
cat > /etc/systemd/system/leopard-tunnel.service <<EOF
[Unit]
Description=Cloudflare quick tunnel for the LEOPARD demo
After=network-online.target nginx.service
Wants=network-online.target

[Service]
Type=simple
# QUIC (UDP 7844) is blocked on many VPS networks; HTTP/2 over TCP works
# everywhere and is what the preflight check recommends in that case.
ExecStart=${CLOUDFLARED} tunnel --url http://localhost:${EDGE_PORT} --no-autoupdate --protocol http2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable leopard-tunnel >/dev/null 2>&1 || true
systemctl restart leopard-tunnel

info "Chờ tunnel đăng ký"
URL=""
for _ in $(seq 1 30); do
  URL="$(journalctl -u leopard-tunnel --no-pager -n 200 2>/dev/null \
    | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | tail -1 || true)"
  [[ -n "${URL}" ]] && break
  sleep 2
done

[[ -n "${URL}" ]] || fail "Chưa lấy được URL tunnel — xem: journalctl -u leopard-tunnel -n 50"

echo
ok "HTTPS đã sẵn sàng"
echo
echo "  Portal      ${URL}/"
echo "  Admin       ${URL}/login"
echo "  Customer    ${URL}/customer/"
echo "  Driver      ${URL}/driver/"
echo
echo "Gửi khách link portal ở trên. Địa chỉ này đổi mỗi khi tunnel khởi động lại:"
echo "  systemctl restart leopard-tunnel && journalctl -u leopard-tunnel -n 30 | grep trycloudflare"
