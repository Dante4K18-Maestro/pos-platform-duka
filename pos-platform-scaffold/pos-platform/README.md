# pos-platform

A general-purpose, offline-first POS with an AI assistant bolted on properly
instead of bolted on for a demo. Retail-first (Loyverse as the closest
analogue), built to extend to cafés and salons via business profiles.

## Monorepo layout

- `apps/api` — Node 20 · TypeScript · Fastify · Prisma. Deploys to Render.
- `apps/ai` — Python 3.12 · FastAPI. Read-only DB role. Deploys to Render.
- `apps/web` — Next.js 15 App Router, installable PWA. Deploys to Vercel.
- `packages/contracts` — zod schemas shared by client and server. The source
  of truth for the API; nothing hand-writes request/response types.
- `packages/money` — integer-minor-units arithmetic, tax, rounding.
- `packages/business-profiles` — retail / cafe / salon: flags, vocabulary, seeds.
- `packages/ui` — shared primitives + design tokens.
- `packages/config` — shared eslint / tsconfig / prettier config.
- `infra` — docker-compose for local dev and render.yaml. The Vercel config
  lives at `apps/web/vercel.json`, next to the app it builds.
- `docs` — architecture notes and ADRs, one file per irreversible decision.

## Getting started

```
pnpm install
cp .env.example .env
docker compose -f infra/docker-compose.yml up -d   # local postgres + adminer
pnpm db:migrate
pnpm db:seed
pnpm dev
```

## Deploy order

This is also the order that catches integration problems earliest:

1. Neon database → `prisma migrate deploy` from CI
2. Render API (health check green, seeded demo tenant)
3. Next.js PWA to Vercel, pointed at the Render URL
4. Install it on a real Android phone and make a sale
5. Daraja sandbox callback wired to the Render URL
6. Render AI service last — it's the one service that can tolerate a slow
   first response, so it goes on once the till itself works end to end.

See `docs/06-deployment.md` for the free-tier caveats (Render cold starts,
Vercel Hobby's non-commercial fair-use limit, Neon vs Render Postgres).

## Status

Walking skeleton — see `docs/07-roadmap.md`.
