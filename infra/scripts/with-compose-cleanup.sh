#!/usr/bin/env bash
set -u

command_status=0
"$@" || command_status=$?

cleanup_status=0
docker compose down || cleanup_status=$?

if ((command_status != 0)); then
  exit "$command_status"
fi

exit "$cleanup_status"
