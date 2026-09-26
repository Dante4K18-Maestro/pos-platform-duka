# Architecture

Monorepo: apps/api (Fastify+Prisma → Render), apps/ai (FastAPI, read-only DB role → Render), apps/web (Next.js PWA → Vercel). packages/contracts is the source of truth for the wire format.
