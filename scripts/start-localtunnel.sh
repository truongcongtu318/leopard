#!/usr/bin/env bash

# Dọn các tiến trình localtunnel cũ
pkill -f "localtunnel" 2>/dev/null || true
sleep 1

# Lấy mật khẩu bypass của localtunnel (IP public của máy)
TUNNEL_PASSWORD=$(curl -s --max-time 3 https://loca.lt/mytunnelpassword 2>/dev/null || echo "123.19.222.179")

echo "Đang khởi động LocalTunnel..."
rm -f /tmp/lt-api.log /tmp/lt-customer.log /tmp/lt-driver.log

nohup pnpm dlx localtunnel --port 3000 --subdomain leopard-api-tuinfi > /tmp/lt-api.log 2>&1 &
nohup pnpm dlx localtunnel --port 8081 --subdomain leopard-customer-tuinfi > /tmp/lt-customer.log 2>&1 &
nohup pnpm dlx localtunnel --port 8082 --subdomain leopard-driver-tuinfi > /tmp/lt-driver.log 2>&1 &

sleep 4

API_URL=$(grep -o 'https://[-a-zA-Z0-9@:%._\+~#=]\+\.loca\.lt' /tmp/lt-api.log 2>/dev/null | head -n 1 || echo "https://leopard-api-tuinfi.loca.lt")
CUSTOMER_URL=$(grep -o 'https://[-a-zA-Z0-9@:%._\+~#=]\+\.loca\.lt' /tmp/lt-customer.log 2>/dev/null | head -n 1 || echo "https://leopard-customer-tuinfi.loca.lt")
DRIVER_URL=$(grep -o 'https://[-a-zA-Z0-9@:%._\+~#=]\+\.loca\.lt' /tmp/lt-driver.log 2>/dev/null | head -n 1 || echo "https://leopard-driver-tuinfi.loca.lt")

echo ""
echo "=========================================================="
echo "🚀 LOCALTUNNEL ĐÃ ĐƯỢC BẬT THÀNH CÔNG!"
echo "=========================================================="
echo "🔗 API Backend:               $API_URL"
echo "👉 Webhook URL payOS:         $API_URL/api/v1/payments/webhook/payos"
echo "----------------------------------------------------------"
echo "📱 Customer App (Web/Mobile): $CUSTOMER_URL"
echo "🚚 Driver App (Web/Mobile):   $DRIVER_URL"
echo "----------------------------------------------------------"
echo "🔑 Mật khẩu LocalTunnel (nếu web hỏi): $TUNNEL_PASSWORD"
echo "=========================================================="
