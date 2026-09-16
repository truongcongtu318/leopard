#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "=== LEOPARD Local Dev Stack (Chạy trực tiếp trên máy) ==="

# 1. Đảm bảo Docker daemon chạy để cấp Database
if ! docker info >/dev/null 2>&1; then
  echo "Đang bật Docker daemon..."
  sudo systemctl start docker
fi

# 2. Bật container PostgreSQL + PostGIS (port 5432)
echo "Đang bật PostgreSQL + PostGIS (localhost:5432)..."
docker compose up -d postgres

# 3. Đồng bộ migration DB
echo "Đang kiểm tra schema database..."
DATABASE_URL="postgresql://leopard:leopard_local@127.0.0.1:5432/leopard?schema=public" \
  pnpm --filter api prisma:migrate:deploy >/dev/null 2>&1 || true

# 4. Bật toàn bộ dịch vụ local qua Turbo (Hot-Reload / Fast Refresh)
echo ""
echo "Các dịch vụ đang chạy trực tiếp trên máy (Hot-Reload bật):"
echo "  - Customer App (Web): http://localhost:8081"
echo "  - Driver App (Web):   http://localhost:8082"
echo "  - Backend API:        http://localhost:3000"
echo "  - Admin Console:      http://localhost:3002"
echo "  - PostgreSQL DB:      localhost:5432"
echo ""

pnpm dev
