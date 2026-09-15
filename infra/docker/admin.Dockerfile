# ---- builder stage ----
FROM node:24-alpine AS builder
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

RUN pnpm install --frozen-lockfile

COPY packages/ui/src/ packages/ui/src/
COPY apps/admin/src/ apps/admin/src/

ENV CI=true
RUN pnpm --filter web run build

# ---- runner stage (standalone) ----
FROM node:24-alpine AS runner
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
