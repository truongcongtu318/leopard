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
COPY apps/api/package.json apps/api/
COPY apps/api/tsconfig.json apps/api/

RUN pnpm install --frozen-lockfile

COPY packages/shared/src/ packages/shared/src/
COPY packages/validators/src/ packages/validators/src/
COPY apps/api/src/ apps/api/src/
COPY apps/api/prisma/ apps/api/prisma/
COPY apps/api/prisma.config.ts apps/api/

ENV CI=true
RUN pnpm --filter api exec prisma generate
RUN pnpm --filter api run build

# ---- production deps stage ----
FROM builder AS deps
RUN pnpm --filter api deploy --prod /app/api-prod

# ---- runner stage ----
FROM node:24-alpine AS runner
RUN addgroup -g 1001 leopard && adduser -u 1001 -G leopard -D leopard
WORKDIR /app

COPY --from=deps /app/api-prod/ ./
COPY --from=builder /app/apps/api/dist/ ./dist/
COPY --from=builder /app/apps/api/prisma/ ./prisma/
COPY --from=builder /app/apps/api/prisma.config.ts ./

USER leopard
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/v1/health/live',(r)=>{process.exit(r.statusCode===200?0:1)})"
ENTRYPOINT ["node", "dist/main.js"]
