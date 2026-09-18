#!/usr/bin/env bash
set -e

CLOUDFLARED="${HOME}/.local/bin/cloudflared"

if [[ ! -x "$CLOUDFLARED" ]]; then
  echo "Downloading cloudflared..."
  mkdir -p "${HOME}/.local/bin"
  curl -fsSL -o "$CLOUDFLARED" https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
  chmod +x "$CLOUDFLARED"
fi

# Dọn các tiến trình tunnel cũ
pkill -f "cloudflared tunnel --url" 2>/dev/null || true
sleep 1

echo "Đang khởi động Cloudflare Tunnels..."
rm -f /tmp/tunnel-api.log /tmp/tunnel-customer.log /tmp/tunnel-driver.log

nohup "$CLOUDFLARED" tunnel --url http://localhost:3000 > /tmp/tunnel-api.log 2>&1 &
nohup "$CLOUDFLARED" tunnel --url http://localhost:8081 > /tmp/tunnel-customer.log 2>&1 &
nohup "$CLOUDFLARED" tunnel --url http://localhost:8082 > /tmp/tunnel-driver.log 2>&1 &

echo "Đang chờ cấp link HTTPS từ Cloudflare..."
for i in {1..25}; do
  sleep 1
  API_URL=$(grep -o 'https://[-a-zA-Z0-9@:%._\+~#=]\+\.trycloudflare\.com' /tmp/tunnel-api.log 2>/dev/null | head -n 1 || true)
  CUSTOMER_URL=$(grep -o 'https://[-a-zA-Z0-9@:%._\+~#=]\+\.trycloudflare\.com' /tmp/tunnel-customer.log 2>/dev/null | head -n 1 || true)
  DRIVER_URL=$(grep -o 'https://[-a-zA-Z0-9@:%._\+~#=]\+\.trycloudflare\.com' /tmp/tunnel-driver.log 2>/dev/null | head -n 1 || true)
  
  if [[ -n "$API_URL" && -n "$CUSTOMER_URL" && -n "$DRIVER_URL" ]]; then
    break
  fi
done

echo ""
echo "=========================================================="
echo "⚡ CLOUDFLARE HTTPS TUNNELS ĐÃ SẴN SÀNG:"
echo "=========================================================="
echo "🔗 Backend API (Webhook payOS): $API_URL"
echo "👉 Webhook URL payOS:            ${API_URL}/api/v1/payments/webhook/payos"
echo "----------------------------------------------------------"
echo "📱 Customer App (Web/Mobile):    $CUSTOMER_URL"
echo "🚚 Driver Cockpit (Web/Mobile):  $DRIVER_URL"
echo "=========================================================="
