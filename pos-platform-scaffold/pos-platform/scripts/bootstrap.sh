#!/usr/bin/env bash
set -euo pipefail

echo "==> installing workspace deps"
pnpm install

if [ ! -f .env ]; then
  cp .env.example .env
  echo "==> wrote .env from .env.example — fill in real values before running anything against Daraja or a real LLM key"
fi

echo "==> starting local postgres"
docker compose -f infra/docker-compose.yml up -d

echo "==> running migrations"
pnpm db:migrate

echo "==> seeding demo tenant"
pnpm db:seed

echo "==> done. run 'pnpm dev' to start api + ai + web"
