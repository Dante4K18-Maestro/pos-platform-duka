#!/usr/bin/env bash
set -euo pipefail
echo "==> resetting local database (dev only — never point this at Neon prod)"
pnpm --filter @pos/api exec prisma migrate reset --force
pnpm db:seed
