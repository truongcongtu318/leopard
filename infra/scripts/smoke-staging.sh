#!/usr/bin/env bash
set -euo pipefail

# LEOPARD Staging Smoke Test
# Usage: ./infra/scripts/smoke-staging.sh [--base-url=http://localhost:3000]
#
# Runs P0 smoke tests for all four roles against the staging API.

API_URL="${1:-${API_BASE_URL:-http://localhost:3000}}"

for arg in "$@"; do
  case $arg in
    --base-url=*)
      API_URL="${arg#*=}"
      ;;
  esac
done

echo "╔══════════════════════════════════════════════════════════╗"
echo "║          LEOPARD Staging Smoke Test                      ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo "  Base URL: ${API_URL}"
echo ""

PASS=0
FAIL=0

check() {
  local name="$1"
  local method="$2"
  local path="$3"
  local token="${4:-}"
  local expected_status="${5:-200}"

  local headers=(-H "Content-Type: application/json" -H "Accept: application/json")
  if [ -n "$token" ]; then
    headers+=(-H "Authorization: Bearer $token")
  fi

  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "${headers[@]}" "${API_URL}${path}" 2>/dev/null || echo "000")

  if [ "$status" = "$expected_status" ]; then
    echo "  ✅ ${name} (${status})"
    ((PASS++))
  else
    echo "  ❌ ${name} — expected ${expected_status}, got ${status}"
    ((FAIL++))
  fi
}

login_demo() {
  local role="$1"
  local response
  response=$(curl -s -X POST -H "Content-Type: application/json" \
    -d "{\"role\":\"${role}\"}" "${API_URL}/auth/login/demo" 2>/dev/null || echo '{}')
  echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))" 2>/dev/null || echo ""
}

# --- 1. System Health ---
echo "🏥 System Health"
check "GET /health" GET "/health" "" "200"
echo ""

# --- 2. Authentication ---
echo "🔑 Demo Authentication"
CUSTOMER_TOKEN=$(login_demo "CUSTOMER")
DRIVER_TOKEN=$(login_demo "DRIVER")
ADMIN_TOKEN=$(login_demo "ADMIN")

if [ -n "$CUSTOMER_TOKEN" ]; then
  echo "  ✅ Customer login"
  ((PASS++))
else
  echo "  ❌ Customer login failed"
  ((FAIL++))
fi

if [ -n "$DRIVER_TOKEN" ]; then
  echo "  ✅ Driver login"
  ((PASS++))
else
  echo "  ❌ Driver login failed"
  ((FAIL++))
fi

if [ -n "$ADMIN_TOKEN" ]; then
  echo "  ✅ Admin login"
  ((PASS++))
else
  echo "  ❌ Admin login failed"
  ((FAIL++))
fi
echo ""

# --- 3. Customer Journey ---
echo "👤 Customer Journey"
check "GET /me" GET "/me" "$CUSTOMER_TOKEN" "200"
check "GET /orders" GET "/orders" "$CUSTOMER_TOKEN" "200"
check "POST /orders/estimate" POST "/orders/estimate" "$CUSTOMER_TOKEN" "400"
echo ""

# --- 4. Driver Journey ---
echo "🚗 Driver Journey"
check "GET /me (driver)" GET "/me" "$DRIVER_TOKEN" "200"
check "GET /driver/orders/available" GET "/driver/orders/available" "$DRIVER_TOKEN" "200"
echo ""

# --- 5. Admin Journey ---
echo "🛡️  Admin Journey"
check "GET /admin/dashboard" GET "/admin/dashboard" "$ADMIN_TOKEN" "200"
check "GET /admin/users" GET "/admin/users" "$ADMIN_TOKEN" "200"
check "GET /admin/orders" GET "/admin/orders" "$ADMIN_TOKEN" "200"
check "GET /admin/fleets" GET "/admin/fleets" "$ADMIN_TOKEN" "200"
echo ""

# --- 6. Authorization Boundaries ---
echo "🔒 Authorization Boundaries"
check "Customer → Admin (403)" GET "/admin/dashboard" "$CUSTOMER_TOKEN" "403"
check "Driver → Admin (403)" GET "/admin/dashboard" "$DRIVER_TOKEN" "403"
check "No auth → Orders (401)" GET "/orders" "" "401"
echo ""

# --- Results ---
TOTAL=$((PASS + FAIL))
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Results: ${PASS}/${TOTAL} passed, ${FAIL} failed"
if [ "$FAIL" -eq 0 ]; then
  echo "║  ✅ All smoke tests passed"
else
  echo "║  ❌ ${FAIL} smoke test(s) failed"
fi
echo "╚══════════════════════════════════════════════════════════╝"

exit "$FAIL"
