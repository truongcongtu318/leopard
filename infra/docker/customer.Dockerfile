# ---- builder stage ----
FROM node:24-alpine AS builder
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

RUN pnpm install --frozen-lockfile

COPY packages/shared/src/ packages/shared/src/
COPY packages/validators/src/ packages/validators/src/
COPY packages/mobile-core/src/ packages/mobile-core/src/
COPY packages/mobile-core/assets/ packages/mobile-core/assets/
COPY apps/mobile/app/ apps/mobile/app/
COPY apps/mobile/src/ apps/mobile/src/
COPY apps/mobile/assets/ apps/mobile/assets/
COPY apps/mobile/public/ apps/mobile/public/

ENV CI=true
ENV EXPO_PUBLIC_API_URL=""
ENV EXPO_PUBLIC_ALLOW_DEMO_AUTH=true
RUN pnpm --filter mobile export --platform web

# ---- runner stage ----
FROM nginx:alpine AS runner
COPY --from=builder /app/apps/mobile/dist/ /usr/share/nginx/html/
COPY infra/docker/nginx-expo.conf /etc/nginx/conf.d/default.conf
RUN sed -i 's/listen 8080/listen 8081/' /etc/nginx/conf.d/default.conf
EXPOSE 8081
