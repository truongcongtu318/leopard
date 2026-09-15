# ---- builder stage ----
# Pinned base image — see the note in api.Dockerfile.
FROM node:24.21.0-alpine3.24 AS builder
RUN corepack enable && corepack prepare pnpm@11.11.0 --activate
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/config/package.json packages/config/
COPY packages/config/tsconfig/ packages/config/tsconfig/
COPY packages/shared/package.json packages/shared/
COPY packages/shared/tsconfig.json packages/shared/
COPY packages/validators/package.json packages/validators/
COPY packages/validators/tsconfig.json packages/validators/
COPY packages/mobile-core/package.json packages/mobile-core/
COPY packages/mobile-core/tsconfig.json packages/mobile-core/
COPY apps/mobile/package.json apps/mobile/
COPY apps/mobile/tsconfig.json apps/mobile/
COPY apps/mobile/metro.config.js apps/mobile/
COPY apps/mobile/app.json apps/mobile/

# Route pnpm's store into the BuildKit cache mount below — see api.Dockerfile.
RUN printf '\nstoreDir: /pnpm/store\n' >> pnpm-workspace.yaml

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY packages/shared/src/ packages/shared/src/
COPY packages/validators/src/ packages/validators/src/
COPY packages/mobile-core/src/ packages/mobile-core/src/
COPY packages/mobile-core/assets/ packages/mobile-core/assets/
COPY apps/mobile/app/ apps/mobile/app/
COPY apps/mobile/src/ apps/mobile/src/
COPY apps/mobile/assets/ apps/mobile/assets/
COPY apps/mobile/public/ apps/mobile/public/

ENV CI=true
# Relative API base: each Expo app is served by its own nginx, which proxies
# /api/v1 and /socket.io to the API, so the apps stay same-origin and need no CORS.
ENV EXPO_PUBLIC_API_URL=""
ENV EXPO_PUBLIC_ALLOW_DEMO_AUTH=true

# Metro caches transforms under TMPDIR; pointing it at a cache mount keeps that
# cache across builds instead of re-transforming every module.
RUN --mount=type=cache,id=metro-cache-mobile,target=/tmp/metro-cache \
    TMPDIR=/tmp/metro-cache pnpm --filter mobile export --platform web

# ---- runner stage ----
# nginx-unprivileged runs as uid 101 and its configs already write to the paths a
# non-root worker needs, so the container does not run as root.
#
# Both Expo images listen on 8080 internally and differ only in the static files
# they carry; the host-facing port is chosen by the compose port mapping. That
# avoids having to rewrite the config (which the unprivileged user cannot do) or
# keep two near-identical nginx configs in sync.
FROM nginxinc/nginx-unprivileged:1.31-alpine AS runner
COPY --from=builder /app/apps/mobile/dist/ /usr/share/nginx/html/
COPY infra/docker/nginx-expo.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
