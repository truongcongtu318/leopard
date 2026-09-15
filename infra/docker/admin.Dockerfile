# ---- builder stage ----
# Starts from the shared dependency image — see the note in api.Dockerfile.
ARG DEPS_IMAGE=leopard-deps:dev
FROM ${DEPS_IMAGE} AS builder

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

# The standalone tree keeps its monorepo shape: server.js sits at
# apps/admin/server.js and resolves `next` from apps/admin/node_modules, which
# sits beside the hoisted root node_modules/.pnpm. Copying the root alone and
# flattening apps/admin into /app leaves /app/node_modules holding only .pnpm,
# and the container dies with MODULE_NOT_FOUND from /app/server.js.
COPY --from=builder --chown=leopard:leopard /app/apps/admin/.next/standalone/ ./
COPY --from=builder --chown=leopard:leopard /app/apps/admin/.next/static/ ./apps/admin/.next/static/

USER leopard
EXPOSE 3002
ENV PORT=3002
ENV HOSTNAME=0.0.0.0
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/login',(r)=>{process.exit([200,302,307,308].includes(r.statusCode)?0:1)})"
ENTRYPOINT ["node", "apps/admin/server.js"]
