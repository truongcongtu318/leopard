#!/usr/bin/env bash
set -euo pipefail

attempts="${DB_WAIT_ATTEMPTS:-30}"
interval_seconds="${DB_WAIT_INTERVAL_SECONDS:-2}"

if [[ ! "$attempts" =~ ^[1-9][0-9]*$ ]]; then
  printf 'DB_WAIT_ATTEMPTS must be a positive integer\n' >&2
  exit 2
fi

if [[ ! "$interval_seconds" =~ ^[0-9]+([.][0-9]+)?$ ]]; then
  printf 'DB_WAIT_INTERVAL_SECONDS must be a non-negative number\n' >&2
  exit 2
fi

postgres_user="${POSTGRES_USER:-leopard}"
postgres_db="${POSTGRES_DB:-leopard}"

for ((attempt = 1; attempt <= attempts; attempt += 1)); do
  if docker compose exec -T postgres \
    pg_isready -U "$postgres_user" -d "$postgres_db" >/dev/null 2>&1; then
    printf 'database is ready\n'
    exit 0
  fi

  if ((attempt < attempts)); then
    sleep "$interval_seconds"
  fi
done

printf 'database did not become ready after %s attempts\n' "$attempts" >&2
exit 1

