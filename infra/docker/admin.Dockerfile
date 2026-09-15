# ---- builder stage ----
# Pinned base image — see the note in api.Dockerfile.
FROM node:24.21.0-alpine3.24 AS builder
RUN corepack enable && corepack prepare pnpm@11.11.0 --activate
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/config/package.json packages/config/
COPY packages/config/tsconfig/ packages/config/tsconfig/
COPY packages/ui/package.json packages/ui/
COPY packages/ui/tsconfig.json packages/ui/
COPY apps/admin/package.json apps/admin/
COPY apps/admin/tsconfig.json apps/admin/
COPY apps/admin/next.config.mjs apps/admin/
COPY apps/admin/postcss.config.mjs apps/admin/

# Route pnpm's store into the BuildKit cache mount below — see api.Dockerfile.
RUN printf '\nstoreDir: /pnpm/store\n' >> pnpm-workspace.yaml

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY packages/ui/src/ packages/ui/src/
COPY apps/admin/src/ apps/admin/src/

ENV CI=true

# Next's compile cache lives in .next/cache. Without a persistent mount it is
# discarded whenever a source COPY above invalidates the layer, so every rebuild
# recompiles from scratch. The cache is intentionally not part of the image.
RUN --mount=type=cache,id=next-cache,target=/app/apps/admin/.next/cache \
    pnpm --filter web run build

# ---- runner stage (standalone) ----
# `output: "standalone"` in next.config.mjs means the server ships with a pruned
# node_modules, so the full dependency tree is not needed at runtime.
FROM node:24.21.0-alpine3.24 AS runner
RUN addgroup -g 1001 leopard && adduser -u 1001 -G leopard -D leopard
WORKDIR /app

COPY --from=builder /app/apps/admin/.next/standalone/apps/admin/ ./
COPY --from=builder /app/apps/admin/.next/standalone/node_modules/ ./node_modules/
COPY --from=builder /app/apps/admin/.next/static/ ./.next/static/

USER leopard
EXPOSE 3002
ENV PORT=3002
ENV HOSTNAME=0.0.0.0
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002',(r)=>{process.exit(r.statusCode===200||r.statusCode===302?0:1)})"
ENTRYPOINT ["node", "server.js"]
