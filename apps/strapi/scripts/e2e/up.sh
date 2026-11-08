#!/usr/bin/env bash
# e2e:up: fresh E2E Postgres -> build -> Strapi on $E2E_BASE_URL (background)
# -> wait for /_health -> seed:shorts -> E2E super-admin upsert.
# Env knobs: E2E_BASE_URL, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD,
#            E2E_SKIP_BUILD=1 (reuse dist/ from a previous e2e build).
set -euo pipefail
# shellcheck source=./env.sh
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"
cd "$E2E_APP_DIR"
mkdir -p "$E2E_STATE_DIR"

PID_FILE="$E2E_STATE_DIR/strapi.pid"
LOG_FILE="$E2E_STATE_DIR/strapi.log"
STRAPI_BIN="$E2E_APP_DIR/node_modules/.bin/strapi"

step() { printf '\n==> %s\n' "$*"; }

# 1. A rerun starts from scratch: stop our previous Strapi, refuse a stranger.
"$(dirname "${BASH_SOURCE[0]}")/down.sh" --keep-log >/dev/null 2>&1 || true
if lsof -iTCP:"$E2E_STRAPI_PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "e2e:up: port $E2E_STRAPI_PORT is already in use by another process" >&2
  exit 1
fi

step "Starting fresh E2E Postgres (port $E2E_DATABASE_PORT, db $E2E_DATABASE_NAME)"
docker compose -f "$E2E_COMPOSE_FILE" down -v --remove-orphans >/dev/null 2>&1 || true
docker compose -f "$E2E_COMPOSE_FILE" up -d --wait

if [ "${E2E_SKIP_BUILD:-}" != "1" ]; then
  step "Building Strapi (server + admin, backend $E2E_BASE_URL)"
  "$STRAPI_BIN" build
fi

step "Starting Strapi on $E2E_BASE_URL (log: $LOG_FILE)"
nohup "$STRAPI_BIN" start >"$LOG_FILE" 2>&1 &
echo $! >"$PID_FILE"

step "Waiting for $E2E_BASE_URL/_health"
for _ in $(seq 1 180); do
  if ! kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "e2e:up: Strapi exited during boot; last log lines:" >&2
    tail -40 "$LOG_FILE" >&2
    exit 1
  fi
  code="$(curl -s -o /dev/null -w '%{http_code}' "$E2E_BASE_URL/_health" || true)"
  if [ "$code" = "204" ] || [ "$code" = "200" ]; then
    echo "Strapi is up (pid $(cat "$PID_FILE"))"
    break
  fi
  sleep 1
done
if [ "${code:-}" != "204" ] && [ "${code:-}" != "200" ]; then
  echo "e2e:up: Strapi did not become healthy in 180s" >&2
  tail -40 "$LOG_FILE" >&2
  exit 1
fi

step "Seeding the short-film catalog (local uploads)"
"$E2E_APP_DIR/node_modules/.bin/tsx" scripts/seeds/shorts.ts --allow-local-uploads --verify \
  >"$E2E_STATE_DIR/seed-shorts.log" 2>&1 || {
  echo "e2e:up: seed:shorts failed; see $E2E_STATE_DIR/seed-shorts.log" >&2
  tail -40 "$E2E_STATE_DIR/seed-shorts.log" >&2
  exit 1
}
grep -E '^Summary:|list total' "$E2E_STATE_DIR/seed-shorts.log" || true

step "Upserting the E2E super-admin ($E2E_ADMIN_EMAIL)"
"$E2E_APP_DIR/node_modules/.bin/tsx" scripts/e2e/seed-admin.ts

step "E2E stack ready: $E2E_BASE_URL/admin  ($E2E_ADMIN_EMAIL)"
echo "Stop it with: yarn workspace @tiween/admin e2e:down"
