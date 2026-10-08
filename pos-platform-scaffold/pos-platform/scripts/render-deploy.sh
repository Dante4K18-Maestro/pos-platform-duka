#!/usr/bin/env bash
# Creates the pos-api web service on Render using the REST API.
# Prerequisite: a payment card on file (https://dashboard.render.com/billing) —
# Render rejects service creation without one, even on the free plan.
#
# Usage: RENDER_API_KEY=rnd_xxx bash scripts/render-deploy.sh
# (Reads secrets from .env in the project root for the sync:false vars.)

set -euo pipefail
cd "$(dirname "$0")/.."

: "${RENDER_API_KEY:?Set RENDER_API_KEY (rnd_...) — the key from the Render dashboard}"
OWNER_ID="${OWNER_ID:-tea-d777ptuslomc73dap7eg}"
REPO="https://github.com/Dante4K18-Maestro/pos-platform-duka"

set -a; . ./.env; set +a

if [[ "$DATABASE_URL" == *127.0.0.1* || "$DATABASE_URL" == *localhost* ]]; then
  echo "Refusing to deploy: DATABASE_URL in .env points at the local dev Postgres."
  echo "Export a production DATABASE_URL (e.g. the Neon connection string) first:"
  echo "  DATABASE_URL='postgresql://...' RENDER_API_KEY=rnd_xxx bash scripts/render-deploy.sh"
  exit 1
fi

curl -sf -X POST "https://api.render.com/v1/services" \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$(cat <<EOF
{
  "type": "web_service",
  "name": "pos-api",
  "ownerId": "$OWNER_ID",
  "repo": "$REPO",
  "branch": "main",
  "rootDir": "pos-platform-scaffold/pos-platform",
  "plan": "free",
  "autoDeploy": "yes",
  "serviceDetails": {
    "env": "node",
    "healthCheckPath": "/health",
    "envSpecificDetails": {
      "buildPlan": "starter",
      "buildCommand": "pnpm install --frozen-lockfile && pnpm --filter @pos/api prisma:generate && pnpm --filter @pos/api build",
      "startCommand": "node apps/api/dist/index.js"
    }
  },
  "envVars": [
    {"key": "TZ", "value": "Africa/Nairobi"},
    {"key": "MPESA_ENVIRONMENT", "value": "sandbox"},
    {"key": "MPESA_SHORTCODE", "value": "174379"},
    {"key": "MPESA_CALLBACK_URL", "value": "https://pos-api.onrender.com/payments/mpesa/callback"},
    {"key": "PUBLIC_BASE_URL", "value": "https://pos-api.onrender.com"},
    {"key": "SCHEDULER_ENABLED", "value": "true"},
    {"key": "TRADING_HOURS_START", "value": "6"},
    {"key": "TRADING_HOURS_END", "value": "22"},
    {"key": "TRADING_TIMEZONE", "value": "Africa/Nairobi"},
    {"key": "DATABASE_URL", "value": "$DATABASE_URL"},
    {"key": "JWT_ACCESS_SECRET", "value": "$JWT_ACCESS_SECRET"},
    {"key": "JWT_REFRESH_SECRET", "value": "$JWT_REFRESH_SECRET"},
    {"key": "AI_SERVICE_TOKEN", "value": "$AI_SERVICE_TOKEN"},
    {"key": "MPESA_CONSUMER_KEY", "value": "$MPESA_CONSUMER_KEY"},
    {"key": "MPESA_CONSUMER_SECRET", "value": "$MPESA_CONSUMER_SECRET"},
    {"key": "MPESA_PASSKEY", "value": "$MPESA_PASSKEY"}
  ]
}
EOF
)" && echo && echo "pos-api created — first build starts automatically."
