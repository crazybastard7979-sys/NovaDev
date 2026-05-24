FROM node:22-alpine AS base
RUN npm install -g pnpm@10

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY lib/db/package.json ./lib/db/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/cloud-ide/package.json ./artifacts/cloud-ide/
RUN pnpm install --no-frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/lib/db/node_modules ./lib/db/node_modules
COPY --from=deps /app/lib/api-zod/node_modules ./lib/api-zod/node_modules
COPY --from=deps /app/lib/api-spec/node_modules ./lib/api-spec/node_modules
COPY --from=deps /app/lib/api-client-react/node_modules ./lib/api-client-react/node_modules
COPY --from=deps /app/artifacts/api-server/node_modules ./artifacts/api-server/node_modules
COPY --from=deps /app/artifacts/cloud-ide/node_modules ./artifacts/cloud-ide/node_modules
COPY . .
RUN pnpm --filter @workspace/api-server run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 novadev && \
    adduser --system --uid 1001 --ingroup novadev novadev

COPY --from=builder --chown=novadev:novadev /app/artifacts/api-server/dist ./dist
COPY --from=builder --chown=novadev:novadev /app/node_modules ./node_modules

USER novadev
EXPOSE 8080
ENV PORT=8080
CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
