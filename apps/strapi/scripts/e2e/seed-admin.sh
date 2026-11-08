#!/usr/bin/env bash
# e2e:seed-admin: rerun only the E2E super-admin upsert against the E2E DB.
set -euo pipefail
# shellcheck source=./env.sh
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"
cd "$E2E_APP_DIR"
exec "$E2E_APP_DIR/node_modules/.bin/tsx" scripts/e2e/seed-admin.ts
