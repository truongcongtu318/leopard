#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GUARD_SCRIPT="$ROOT_DIR/infra/scripts/assert-local-database-url.sh"
REMOTE_DATABASE_URL='postgresql://leopard:leopard_local@example.invalid:5432/leopard?schema=public'
LOOPBACK_LOOKALIKE_DATABASE_URL='postgresql://leopard:leopard_local@127.evil:5432/leopard?schema=public'
LOCAL_DATABASE_URL='postgresql://leopard:leopard_local@127.0.0.1:5432/leopard?schema=public'

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

[[ -f "$GUARD_SCRIPT" ]] || fail "missing database URL guard"

# The guard accepts the documented local URL forms and rejects remote hosts.
# shellcheck disable=SC1090
source "$GUARD_SCRIPT"
assert_local_database_url "$LOCAL_DATABASE_URL"
if (unset ALLOW_DESTRUCTIVE_RESET; assert_local_database_url "$REMOTE_DATABASE_URL"); then
  fail "remote database URL was accepted without explicit opt-in"
fi
if (unset ALLOW_DESTRUCTIVE_RESET; assert_local_database_url "$LOOPBACK_LOOKALIKE_DATABASE_URL"); then
  fail "non-IP hostname with a loopback-looking prefix was accepted"
fi
if ! (ALLOW_DESTRUCTIVE_RESET=1 assert_local_database_url "$REMOTE_DATABASE_URL"); then
  fail "explicit destructive opt-in was rejected"
fi

for script in reset-demo.sh test-migrations.sh; do
  script_path="$ROOT_DIR/infra/scripts/$script"
  [[ -x "$script_path" ]] || fail "$script is not executable"

  guard_line="$(grep -n 'assert_local_database_url "\$DATABASE_URL"' "$script_path" | head -n 1 | cut -d: -f1)"
  reset_line="$(grep -n 'migrate reset' "$script_path" | head -n 1 | cut -d: -f1)"
  [[ -n "$guard_line" && -n "$reset_line" && "$guard_line" -lt "$reset_line" ]] || \
    fail "$script does not guard DATABASE_URL before migrate reset"

  if [[ "$script" == 'test-migrations.sh' ]]; then
    compose_line="$(grep -n 'docker compose up' "$script_path" | head -n 1 | cut -d: -f1)"
    [[ -n "$compose_line" && "$guard_line" -lt "$compose_line" ]] || \
      fail "$script reaches Docker before guarding DATABASE_URL"
  fi

  output_file="$(mktemp)"
  if env -u ALLOW_DESTRUCTIVE_RESET DATABASE_URL="$REMOTE_DATABASE_URL" "$script_path" >"$output_file" 2>&1; then
    rm -f "$output_file"
    fail "$script accepted a remote database URL"
  fi
  if grep -q 'migrate reset\|docker compose' "$output_file"; then
    rm -f "$output_file"
    fail "$script reached a destructive/dependent command before rejecting the URL"
  fi
  rm -f "$output_file"
done

printf 'migration safety checks passed\n'
