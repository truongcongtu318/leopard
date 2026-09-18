#!/usr/bin/env bash
PORT="$1"
LOGFILE="$2"

while true; do
  pnpm dlx localtunnel --port "$PORT" >> "$LOGFILE" 2>&1 || true
  sleep 2
done
