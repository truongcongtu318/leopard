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
COPY apps/driver/package.json apps/driver/
COPY apps/driver/tsconfig.json apps/driver/
COPY apps/driver/metro.config.js apps/driver/
COPY apps/driver/app.json apps/driver/

# Route pnpm's store into the BuildKit cache mount below — see api.Dockerfile.
RUN printf '\nstoreDir: /pnpm/store\n' >> pnpm-workspace.yaml

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY packages/shared/src/ packages/shared/src/
COPY packages/validators/src/ packages/validators/src/
COPY packages/mobile-core/src/ packages/mobile-core/src/
COPY packages/mobile-core/assets/ packages/mobile-core/assets/
COPY apps/driver/app/ apps/driver/app/
COPY apps/driver/src/ apps/driver/src/
COPY apps/driver/assets/ apps/driver/assets/

ENV CI=true
ENV EXPO_PUBLIC_API_URL=""
# See customer.Dockerfile: the one-click demo accounts are hidden in favour of
# the phone + demo-OTP flow. Inlined at build time, so a server-side env file
# cannot override it.
ENV EXPO_PUBLIC_ALLOW_DEMO_AUTH=false

RUN --mount=type=cache,id=metro-cache-driver,target=/tmp/metro-cache \
    TMPDIR=/tmp/metro-cache pnpm --filter driver export --platform web

# ---- runner stage ----
# nginx-unprivileged — see the note in customer.Dockerfile. Listens on 8080
# internally; the host port comes from the compose mapping.
FROM nginxinc/nginx-unprivileged:1.31-alpine AS runner
COPY --from=builder --chown=101:101 /app/apps/driver/dist/ /usr/share/nginx/html/
COPY --chown=101:101 infra/docker/nginx-expo.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
