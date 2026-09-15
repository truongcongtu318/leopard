# ---- builder stage ----
# Starts from the shared dependency image — see the note in api.Dockerfile.
ARG DEPS_IMAGE=leopard-deps:dev
FROM ${DEPS_IMAGE} AS builder

COPY packages/shared/src/ packages/shared/src/
COPY packages/validators/src/ packages/validators/src/
COPY packages/mobile-core/src/ packages/mobile-core/src/
COPY packages/mobile-core/assets/ packages/mobile-core/assets/
COPY apps/driver/app/ apps/driver/app/
COPY apps/driver/src/ apps/driver/src/
COPY apps/driver/assets/ apps/driver/assets/

ENV CI=true
# See customer.Dockerfile: a relative base, never empty, or the client falls back
# to http://localhost:3000/api/v1 and calls the visitor's own machine.
ENV EXPO_PUBLIC_API_URL=/api/v1
# See customer.Dockerfile: the one-click demo accounts are hidden in favour of
# the phone + demo-OTP flow. Inlined at build time, so a server-side env file
# cannot override it.
ENV EXPO_PUBLIC_ALLOW_DEMO_AUTH=false

# --clear is required — see the note in customer.Dockerfile: Metro's transform
# cache does not key on the EXPO_PUBLIC_* values, so a warm cache mixes old and
# new inlined config into one bundle.
RUN pnpm --filter driver export --platform web --clear

# ---- runner stage ----
# nginx-unprivileged — see the note in customer.Dockerfile. Listens on 8080
# internally; the host port comes from the compose mapping.
FROM nginxinc/nginx-unprivileged:1.31-alpine AS runner
COPY --from=builder --chown=101:101 /app/apps/driver/dist/ /usr/share/nginx/html/
COPY --chown=101:101 infra/docker/nginx-expo.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
