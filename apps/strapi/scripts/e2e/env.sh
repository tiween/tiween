# shellcheck shell=bash
# E2E environment, sourced by up.sh / down.sh / seed-admin wrappers.
#
# Strapi loads apps/strapi/.env with dotenv, which never overrides a variable
# that is already set (even to ""). Every value that could reach the dev DB,
# ImageKit, Brevo, Sentry or Konnect is therefore set here explicitly.

E2E_APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export E2E_APP_DIR
export E2E_STATE_DIR="$E2E_APP_DIR/.e2e"
export E2E_COMPOSE_FILE="$E2E_APP_DIR/docker-compose.e2e.yml"

export E2E=true
export NODE_ENV=development

export E2E_BASE_URL="${E2E_BASE_URL:-http://localhost:1338}"
_e2e_port="$(node -e 'const u=new URL(process.argv[1]);process.stdout.write(u.port||(u.protocol==="https:"?"443":"80"))' "$E2E_BASE_URL")"
export E2E_STRAPI_PORT="$_e2e_port"

export E2E_ADMIN_EMAIL="${E2E_ADMIN_EMAIL:-e2e-admin@tiween.local}"
export E2E_ADMIN_PASSWORD="${E2E_ADMIN_PASSWORD:-E2eAdmin123!}"

export E2E_DATABASE_NAME="${E2E_DATABASE_NAME:-tiween_e2e}"
export E2E_DATABASE_PORT="${E2E_DATABASE_PORT:-5439}"
export E2E_DATABASE_USERNAME="${E2E_DATABASE_USERNAME:-e2e}"
export E2E_DATABASE_PASSWORD="${E2E_DATABASE_PASSWORD:-e2e}"

# Server
export HOST=127.0.0.1
export PORT="$E2E_STRAPI_PORT"
export APP_URL="$E2E_BASE_URL"
export STRAPI_ADMIN_BACKEND_URL="$E2E_BASE_URL"
export CRON_ENABLED=false
export STRAPI_TELEMETRY_DISABLED=true

# Database (DATABASE_URL wins in pg, so it must point at the E2E DB too)
export DATABASE_CLIENT=postgres
export DATABASE_HOST=127.0.0.1
export DATABASE_PORT="$E2E_DATABASE_PORT"
export DATABASE_NAME="$E2E_DATABASE_NAME"
export DATABASE_USERNAME="$E2E_DATABASE_USERNAME"
export DATABASE_PASSWORD="$E2E_DATABASE_PASSWORD"
export DATABASE_URL="postgres://$E2E_DATABASE_USERNAME:$E2E_DATABASE_PASSWORD@127.0.0.1:$E2E_DATABASE_PORT/$E2E_DATABASE_NAME"
export DATABASE_SSL=false

# Throwaway secrets (E2E only, never used anywhere else)
export APP_KEYS="e2eKeyA0000000000000000==,e2eKeyB0000000000000000=="
export ADMIN_JWT_SECRET="e2e-admin-jwt-secret"
export API_TOKEN_SALT="e2e-api-token-salt"
export TRANSFER_TOKEN_SALT="e2e-transfer-token-salt"
export JWT_SECRET="e2e-jwt-secret"
export ENCRYPTION_KEY="e2e-encryption-key-0000000000000"
export TICKET_QR_SECRET="e2e-ticket-qr-secret"

# Local upload provider: blank ImageKit creds make config/plugins.ts fall back
export IMAGEKIT_PUBLIC_KEY=""
export IMAGEKIT_PRIVATE_KEY=""
export IMAGEKIT_URL_ENDPOINT=""

# No outbound side effects
export BREVO_API_KEY=""
export SENTRY_DSN=""
export KONNECT_API_KEY=""
export KONNECT_WALLET_ID=""

# The dev bootstrap admin (admin@test.com) is left on: it proves the E2E
# upsert works when other admins exist.
