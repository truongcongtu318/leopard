# ---- builder stage ----
# Starts from the shared dependency image (see deps.Dockerfile), which already
# holds the installed workspace. This stage therefore only copies sources and
# compiles — no install runs on a per-commit rebuild. DEPS_IMAGE is supplied by
# docker-compose.prod.yml, which deploy-demo.sh points at the hashed tag.
ARG DEPS_IMAGE=leopard-deps:dev
FROM ${DEPS_IMAGE} AS builder

# Limit Node.js heap during build to 2048MB to avoid OOM on 4GB VPS
ENV CI=true \
    NODE_OPTIONS="--max-old-space-size=2048"

# 1. Prisma schema & config first (changes rarely):
# prisma generate only depends on schema and config, so copying them first ensures
# that changes to application code in apps/api/src/ do not invalidate prisma generate!
COPY apps/api/prisma/ apps/api/prisma/
COPY apps/api/prisma.config.ts apps/api/
COPY infra/seed/ infra/seed/

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm --filter api exec prisma generate

# 2. Shared packages (change less frequently than api source code):
COPY packages/shared/src/ packages/shared/src/
RUN pnpm --filter @leopard/shared build

COPY packages/validators/src/ packages/validators/src/
RUN pnpm --filter @leopard/validators build

# 3. API application source (changes frequently on routine commits):
COPY apps/api/src/ apps/api/src/
COPY apps/api/scripts/ apps/api/scripts/

RUN pnpm --filter api run build

# ---- production deps stage ----
FROM builder AS deps
# --legacy is required from pnpm v10 on: without it, deploy refuses to run for a
# workspace that has not enabled inject-workspace-packages.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm --filter api deploy --legacy --prod /app/api-prod

# `pnpm deploy` copies the @prisma/client package but not its generated output.
# `prisma generate` writes the client to <store>/@prisma+client@…/node_modules/.prisma,
# and @prisma/client/default.js resolves `.prisma/client` relative to its own
# symlink-resolved location — so the generated folder has to sit next to the
# deployed @prisma/client, not at the project root. Without this the container
# starts and dies with:
#   SyntaxError: The requested module '@prisma/client' does not provide an
#   export named 'PrismaClient'
# The store directory name is content-hashed, so resolve both sides at build
# time instead of hardcoding it. `@prisma/client/default.js` resolves
# `.prisma/client` as a bare specifier, so Node looks in the `node_modules` that
# contains `@prisma` — two levels above the resolved client directory.
RUN set -eux; \
    generated="$(ls -d /app/node_modules/.pnpm/@prisma+client*/node_modules/.prisma | head -1)"; \
    client_pkg="$(readlink -f /app/api-prod/node_modules/@prisma/client)"; \
    modules_dir="$(dirname "$(dirname "$client_pkg")")"; \
    cp -a "$generated" "$modules_dir/.prisma"

# ---- runner stage ----
FROM node:24.21.0-alpine3.24 AS runner
RUN addgroup -g 1001 leopard && adduser -u 1001 -G leopard -D leopard
WORKDIR /app

# Safe production heap limit for 4GB VPS (leaves headroom for Postgres/Next.js/OS)
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=768"

# Only the compiled output and production node_modules are needed at runtime: the
# compiled dist/ never reads prisma/schema.prisma or prisma.config.ts (those are
# used by the migrate service, which runs from the builder stage).
COPY --from=deps /app/api-prod/ ./
COPY --from=builder /app/apps/api/dist/ ./dist/

# DocsModule.setupSwagger() resolves the spec as <cwd>/openapi/openapi.yaml
# (../../openapi relative to dist/docs/), so it has to ship with the image for
# ENABLE_API_DOCS=true to work. It is read at startup, not at build time, so a
# missing copy only shows up as a crash loop in the container.
COPY apps/api/openapi/ ./openapi/

# LocalStorageProvider writes uploads to <cwd>/uploads. The runtime user must own
# it or every upload fails. Created here rather than chowned after a COPY so the
# directory is not duplicated into a second layer.
RUN install -d -o leopard -g leopard /app/uploads

USER leopard
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/v1/health/live',(r)=>{process.exit(r.statusCode===200?0:1)})"
ENTRYPOINT ["node", "dist/main.js"]
