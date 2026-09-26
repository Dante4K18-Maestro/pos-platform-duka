FROM node:20-slim AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages packages
RUN pnpm install --frozen-lockfile --filter @pos/api...

FROM deps AS build
COPY apps/api apps/api
RUN pnpm --filter @pos/api prisma:generate
RUN pnpm --filter @pos/api build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
EXPOSE 4000
# Render's free instances have an ephemeral filesystem: nothing written here
# survives a redeploy or spin-down. No local file storage, ever.
CMD ["node", "apps/api/dist/index.js"]
