# ---- builder stage ----
# Starts from the shared dependency image — see the note in api.Dockerfile.
ARG DEPS_IMAGE=leopard-deps:dev
FROM ${DEPS_IMAGE} AS builder

COPY packages/shared/src/ packages/shared/src/
COPY packages/validators/src/ packages/validators/src/
COPY packages/mobile-core/src/ packages/mobile-core/src/
COPY packages/mobile-core/assets/ packages/mobile-core/assets/
COPY apps/mobile/app/ apps/mobile/app/
COPY apps/mobile/src/ apps/mobile/src/
COPY apps/mobile/assets/ apps/mobile/assets/
COPY apps/mobile/public/ apps/mobile/public/

ENV CI=true \
    NODE_OPTIONS="--max-old-space-size=1024"
# Relative REST base. It must NOT be empty: the client falls back to
# http://localhost:3000/api/v1 when the value is falsy, which makes the deployed
# app call the visitor's own machine and fail every request. A leading-slash path
# resolves against the app's origin, and each app's nginx proxies /api/v1 and
# /socket.io to the API, so no CORS is involved.
ENV EXPO_PUBLIC_API_URL=/api/v1
# Off, so the login screen shows the ordinary phone + OTP flow instead of the
# one-click demo accounts. Clients sign in with a seeded phone number and the
# demo OTP, which the gateway portal lists. Note this is inlined into the bundle
# at build time by Expo — it cannot be changed by an env file on the server.
ENV EXPO_PUBLIC_ALLOW_DEMO_AUTH=true
ARG EXPO_PUBLIC_VIETMAP_API_KEY=""
ENV EXPO_PUBLIC_VIETMAP_API_KEY=${EXPO_PUBLIC_VIETMAP_API_KEY}

# --clear is required, not optional. Metro caches each module's transformed
# output, and Expo inlines the EXPO_PUBLIC_* values during that transform — but
# the cache key does not include those values. Reusing a warm cache after an env
# change therefore produced a bundle where edited modules carried the new value
# and untouched ones kept the old one, which is how a deployed build ended up
# calling localhost from some modules and /api/v1 from others. A cold transform
# every time is the price of a bundle whose inlined config is internally
# consistent.
RUN pnpm --filter mobile export --platform web --clear

# ---- runner stage ----
# nginx-unprivileged runs as uid 101 and its configs already write to the paths a
# non-root worker needs, so the container does not run as root.
#
# Both Expo images listen on 8080 internally and differ only in the static files
# they carry; the host-facing port is chosen by the compose port mapping. That
# avoids having to rewrite the config (which the unprivileged user cannot do) or
# keep two near-identical nginx configs in sync.
FROM nginxinc/nginx-unprivileged:1.31-alpine AS runner
# --chown=101:101 (the image's nginx user) keeps the config readable no matter
# what mode the file has in the build context; a 0600 source file would otherwise
# land in the image owned by root and nginx would exit with
# "open() .../default.conf failed (13: Permission denied)".
COPY --from=builder --chown=101:101 /app/apps/mobile/dist/ /usr/share/nginx/html/
COPY --chown=101:101 infra/docker/nginx-expo.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
