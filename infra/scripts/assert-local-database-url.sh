#!/usr/bin/env bash
set -euo pipefail

assert_local_database_url() {
  local database_url="${1:-}"
  local host

  if [[ -z "$database_url" ]]; then
    printf 'Refusing destructive database operation: DATABASE_URL is empty.\n' >&2
    return 1
  fi

  if ! host="$(
    DATABASE_URL="$database_url" node --input-type=module -e '
      const raw = process.env.DATABASE_URL;

      try {
        const url = new URL(raw);
        if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
          process.exit(1);
        }

        process.stdout.write(url.hostname.replace(/^\[|\]$/g, "").toLowerCase());
      } catch {
        process.exit(1);
      }
    '
  )"; then
    printf 'Refusing destructive database operation: DATABASE_URL is not a valid PostgreSQL URL.\n' >&2
    return 1
  fi

  case "$host" in
    localhost|127.0.0.1|::1)
      return 0
      ;;
  esac

  printf 'Refusing destructive database operation for non-local host %s. Use a loopback DATABASE_URL.\n' "$host" >&2
  return 1
}
