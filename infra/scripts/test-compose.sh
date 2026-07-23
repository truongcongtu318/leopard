#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

fail() {
  printf 'compose verification failed: %s\n' "$1" >&2
  exit 1
}

require_file() {
  [[ -f "$1" ]] || fail "required file is missing: $1"
}

require_line() {
  local file="$1"
  local pattern="$2"
  local description="$3"

  grep -Eq "$pattern" "$file" || fail "$description"
}

require_file compose.yaml
require_file .env.example
require_file infra/scripts/wait-for-db.sh
require_file infra/scripts/with-compose-cleanup.sh

compose_config="$(docker compose config)" || fail 'docker compose config is invalid'
services="$(docker compose config --services)" || fail 'Compose services cannot be listed'
[[ "$services" == *'postgres'* ]] || fail 'compose must define the postgres service'
[[ "$services" == *'api'* ]] || fail 'compose must define the api service'
[[ "$services" == *'admin'* ]] || fail 'compose must define the admin service'

grep -Fq 'image: postgis/postgis:17-3.5' <<<"$compose_config" ||
  fail 'rendered config must use postgis/postgis:17-3.5'
grep -Fq 'pg_isready' <<<"$compose_config" ||
  fail 'postgres service must define a pg_isready health check'
grep -Fq '${POSTGRES_DB:-leopard}' compose.yaml ||
  fail 'POSTGRES_DB must use a demo-local interpolated default'
grep -Fq '${POSTGRES_USER:-leopard}' compose.yaml ||
  fail 'POSTGRES_USER must use a demo-local interpolated default'
grep -Fq '${POSTGRES_PASSWORD:-leopard_local}' compose.yaml ||
  fail 'POSTGRES_PASSWORD must use a demo-local interpolated default'
grep -Fq '127.0.0.1:${POSTGRES_PORT:-5432}:5432' compose.yaml ||
  fail 'postgres port must bind only to the loopback interface'
grep -Fq '127.0.0.1:${API_PORT:-3000}:3000' compose.yaml ||
  fail 'api port must bind only to the loopback interface'
grep -Fq '127.0.0.1:${ADMIN_PORT:-3002}:3002' compose.yaml ||
  fail 'admin port must bind only to the loopback interface'
grep -Eq '^[[:space:]]+tmpfs:' compose.yaml ||
  fail 'postgres data must be ephemeral for clean database runs'
grep -Fq '/var/lib/postgresql/data' compose.yaml ||
  fail 'postgres data directory must use the ephemeral mount'

for env_name in \
  NODE_ENV PORT DATABASE_URL CORS_ORIGINS \
  POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD POSTGRES_PORT \
  AUTH_PROVIDER MAP_PROVIDER ALLOW_DEMO_PROVIDER STORAGE_PROVIDER PAYMENT_PROVIDER \
  API_PORT ADMIN_PORT; do
  require_line .env.example "^${env_name}=" ".env.example is missing ${env_name}"
done

for credential_name in \
  VIETMAP_API_KEY FIREBASE_PROJECT_ID PAYOS_CLIENT_ID PAYOS_API_KEY \
  PAYOS_CHECKSUM_KEY S3_ACCESS_KEY_ID S3_SECRET_ACCESS_KEY; do
  require_line .env.example "^${credential_name}=$" \
    ".env.example must keep ${credential_name} blank"
done

fake_bin="$(mktemp -d)"
cleanup_fake_bin() {
  rm -rf -- "$fake_bin"
}
trap cleanup_fake_bin EXIT

cat >"$fake_bin/docker" <<'FAKE_DOCKER'
#!/usr/bin/env bash
set -u

if [[ "${1-}" == 'compose' && "${2-}" == 'down' ]]; then
  printf '%s\n' "$*" >>"${FAKE_DOCKER_LOG:?}"
  exit "${FAKE_DOCKER_DOWN_STATUS:-0}"
fi

exit "${FAKE_DOCKER_OTHER_STATUS:-1}"
FAKE_DOCKER
chmod +x "$fake_bin/docker"

fake_log="$fake_bin/docker.log"
: >"$fake_log"

set +e
PATH="$fake_bin:$PATH" FAKE_DOCKER_LOG="$fake_log" \
  FAKE_DOCKER_DOWN_STATUS=19 \
  bash infra/scripts/with-compose-cleanup.sh bash -c 'exit 23'
wrapped_status=$?
set -e
[[ "$wrapped_status" -eq 23 ]] ||
  fail 'cleanup wrapper must preserve the original command failure status'
grep -Fxq 'compose down' "$fake_log" ||
  fail 'cleanup wrapper must always invoke docker compose down'

: >"$fake_log"
set +e
PATH="$fake_bin:$PATH" FAKE_DOCKER_LOG="$fake_log" \
  FAKE_DOCKER_DOWN_STATUS=19 \
  bash infra/scripts/with-compose-cleanup.sh bash -c 'exit 0'
cleanup_status=$?
set -e
[[ "$cleanup_status" -eq 19 ]] ||
  fail 'cleanup wrapper must surface cleanup failure after command success'

set +e
PATH="$fake_bin:$PATH" FAKE_DOCKER_LOG="$fake_log" \
  DB_WAIT_ATTEMPTS=2 DB_WAIT_INTERVAL_SECONDS=0 \
  bash infra/scripts/wait-for-db.sh >/dev/null 2>&1
wait_status=$?
set -e
[[ "$wait_status" -ne 0 ]] || fail 'database wait must fail after its bounded timeout'

# Dockerfile checks
require_file infra/docker/api.Dockerfile
require_file infra/docker/admin.Dockerfile
require_line infra/docker/api.Dockerfile 'FROM.*AS builder' 'api Dockerfile must use multi-stage build'
require_line infra/docker/api.Dockerfile 'FROM.*AS runner' 'api Dockerfile must have a runner stage'
require_line infra/docker/api.Dockerfile 'USER leopard' 'api Dockerfile must set non-root USER'
require_line infra/docker/admin.Dockerfile 'FROM.*AS builder' 'admin Dockerfile must use multi-stage build'
require_line infra/docker/admin.Dockerfile 'FROM.*AS runner' 'admin Dockerfile must have a runner stage'
require_line infra/docker/admin.Dockerfile 'USER leopard' 'admin Dockerfile must set non-root USER'

printf 'compose static verification passed\n'

bash infra/scripts/wait-for-db.sh

container_id="$(docker compose ps -q postgres)"
[[ -n "$container_id" ]] || fail 'postgres container is not running'
health_status="$(docker inspect --format '{{.State.Health.Status}}' "$container_id")"
[[ "$health_status" == 'healthy' ]] || fail 'postgres container is not healthy'

postgres_user="${POSTGRES_USER:-leopard}"
postgres_db="${POSTGRES_DB:-leopard}"
postgis_version="$(
  docker compose exec -T postgres \
    psql -v ON_ERROR_STOP=1 -U "$postgres_user" -d "$postgres_db" \
    -Atc 'SELECT PostGIS_Version();'
)"
[[ -n "$postgis_version" ]] || fail 'PostGIS readiness query returned no version'

set +e
bash infra/scripts/with-compose-cleanup.sh bash -c 'exit 23'
deliberate_status=$?
set -e
[[ "$deliberate_status" -eq 23 ]] ||
  fail 'deliberate wrapped failure must retain status 23'

running_services="$(docker compose ps --status running -q)"
[[ -z "$running_services" ]] || fail 'Compose services remain running after cleanup'

printf 'compose verification passed; PostGIS %s\n' "$postgis_version"
