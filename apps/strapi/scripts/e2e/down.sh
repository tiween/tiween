#!/usr/bin/env bash
# e2e:down: stop the background E2E Strapi and destroy the E2E Postgres
# (tmpfs data + any anonymous volume). Never touches the dev `tiween` project.
set -euo pipefail
# shellcheck source=./env.sh
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"
cd "$E2E_APP_DIR"

PID_FILE="$E2E_STATE_DIR/strapi.pid"
if [ -f "$PID_FILE" ]; then
  pid="$(cat "$PID_FILE")"
  if kill -0 "$pid" 2>/dev/null; then
    echo "Stopping E2E Strapi (pid $pid)"
    pkill -TERM -P "$pid" 2>/dev/null || true
    kill -TERM "$pid" 2>/dev/null || true
    for _ in $(seq 1 20); do kill -0 "$pid" 2>/dev/null || break; sleep 0.5; done
    kill -KILL "$pid" 2>/dev/null || true
  fi
  rm -f "$PID_FILE"
fi

echo "Removing E2E Postgres (compose project tiween-e2e)"
docker compose -f "$E2E_COMPOSE_FILE" down -v --remove-orphans

if [ "${1:-}" != "--keep-log" ]; then
  rm -f "$E2E_STATE_DIR"/*.log
fi
