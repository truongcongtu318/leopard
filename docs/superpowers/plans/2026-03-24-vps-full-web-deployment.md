# LEOPARD Full Web VPS Deployment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy full LEOPARD stack (API + Admin + Customer Web + Driver Web) on a VPS via Docker Compose with a Gateway landing portal for client demo handoff.

**Architecture:** 6-container Docker Compose: postgres → api → admin (Next.js standalone) → customer (Expo Web static + Nginx) → driver (Expo Web static + Nginx) → gateway (Nginx port 80 with landing portal). Gateway reverse-proxies to each service. Customer/Driver Nginx instances proxy `/api/v1` and `/socket.io` to the API container.

**Tech Stack:** Docker, Docker Compose, Nginx, Node 24 Alpine, PostGIS 17, pnpm 11

**Spec:** `docs/superpowers/specs/2026-03-24-vps-full-web-deployment-design.md`

## Global Constraints

- Node 24, pnpm 11.11.0 — enforced via corepack in Dockerfiles
- Demo mode: `AUTH_PROVIDER=demo`, `MAP_PROVIDER=demo`, `ALLOW_DEMO_PROVIDER=true`
- 3 demo roles exposed: Admin (`admin`), Driver (`driver`), Customer (`customer`)
- Fleet Owner UI removed; backend Fleet models stay (no schema changes)
- `EXPO_PUBLIC_API_URL` must NOT be hardcoded to localhost — use empty string so browser resolves relative to origin, then Nginx proxies `/api/v1` → `http://api:3000/api/v1`
- Admin BFF already proxies `/api/v1` server-side via `API_URL` env var

---

### Task 1: Customer & Driver Dockerfiles (Expo Web export + Nginx)

**Files:**
- Create: `infra/docker/customer.Dockerfile`
- Create: `infra/docker/driver.Dockerfile`
- Create: `infra/docker/nginx-expo.conf` (shared Nginx template)

**Interfaces:**
- Consumes: `apps/mobile/` Expo Web export, `apps/driver/` Expo Web export
- Produces: Docker images `leopard-customer`, `leopard-driver` serving static SPA on port 8081/8082, proxying `/api/v1/` and `/socket.io/` to upstream `api:3000`

- [ ] **Step 1: Create shared Nginx config for Expo Web SPA**

```nginx
# infra/docker/nginx-expo.conf
# Shared Nginx config for Expo Web SPA apps (customer / driver)
# Serves static files from /usr/share/nginx/html with SPA fallback
# Proxies /api/v1/ and /socket.io/ to backend API

server {
    listen 8080;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls to backend
    location /api/v1/ {
        proxy_pass http://api:3000/api/v1/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 20M;
    }

    # Proxy static file serving (local storage uploads)
    location /files/ {
        proxy_pass http://api:3000/files/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Proxy Socket.IO (WebSocket upgrade)
    location /socket.io/ {
        proxy_pass http://api:3000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }

    # Cache static assets
    location /_expo/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

- [ ] **Step 2: Create customer.Dockerfile**

```dockerfile
# infra/docker/customer.Dockerfile
# Stage 1: Build Expo Web export
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

# Stage 2: Serve with Nginx
FROM nginx:alpine AS runner
COPY --from=builder /app/apps/mobile/dist/ /usr/share/nginx/html/
COPY infra/docker/nginx-expo.conf /etc/nginx/conf.d/default.conf
RUN sed -i 's/listen 8080/listen 8081/' /etc/nginx/conf.d/default.conf
EXPOSE 8081
```

- [ ] **Step 3: Create driver.Dockerfile**

```dockerfile
# infra/docker/driver.Dockerfile
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
COPY apps/driver/package.json apps/driver/
COPY apps/driver/tsconfig.json apps/driver/
COPY apps/driver/metro.config.js apps/driver/
COPY apps/driver/app.json apps/driver/

RUN pnpm install --frozen-lockfile

COPY packages/shared/src/ packages/shared/src/
COPY packages/validators/src/ packages/validators/src/
COPY packages/mobile-core/src/ packages/mobile-core/src/
COPY packages/mobile-core/assets/ packages/mobile-core/assets/
COPY apps/driver/app/ apps/driver/app/
COPY apps/driver/src/ apps/driver/src/
COPY apps/driver/assets/ apps/driver/assets/

ENV CI=true
ENV EXPO_PUBLIC_API_URL=""
ENV EXPO_PUBLIC_ALLOW_DEMO_AUTH=true
RUN pnpm --filter driver export --platform web

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/driver/dist/ /usr/share/nginx/html/
COPY infra/docker/nginx-expo.conf /etc/nginx/conf.d/default.conf
RUN sed -i 's/listen 8080/listen 8082/' /etc/nginx/conf.d/default.conf
EXPOSE 8082
```

- [ ] **Step 4: Test build locally**

```bash
docker build -f infra/docker/customer.Dockerfile -t leopard-customer .
docker build -f infra/docker/driver.Dockerfile -t leopard-driver .
```

- [ ] **Step 5: Commit**

```bash
git add infra/docker/nginx-expo.conf infra/docker/customer.Dockerfile infra/docker/driver.Dockerfile
git commit -m "infra: add customer and driver web Dockerfiles with Nginx proxy"
```

---

### Task 2: Update Admin Dockerfile for standalone output

**Files:**
- Modify: `infra/docker/admin.Dockerfile`

**Interfaces:**
- Consumes: `apps/admin/.next/standalone/` output from `next build`
- Produces: Lighter Docker image using `node server.js` instead of `next start`

- [ ] **Step 1: Update admin.Dockerfile to use standalone output**

Replace the current runner stage with standalone-based runner:

```dockerfile
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

# standalone output includes minimal node_modules
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
```

- [ ] **Step 2: Test build**

```bash
docker build -f infra/docker/admin.Dockerfile -t leopard-admin .
```

- [ ] **Step 3: Commit**

```bash
git add infra/docker/admin.Dockerfile
git commit -m "infra: update admin Dockerfile to use Next.js standalone output"
```

---

### Task 3: Gateway Nginx + Landing Portal

**Files:**
- Create: `infra/docker/gateway/nginx.conf`
- Create: `infra/docker/gateway/index.html`
- Create: `infra/docker/gateway/Dockerfile`

**Interfaces:**
- Consumes: Internal Docker network services: `api:3000`, `admin:3002`, `customer:8081`, `driver:8082`
- Produces: Single port 80 entry point with landing portal and reverse proxy to all services

- [ ] **Step 1: Create gateway Nginx config**

```nginx
# infra/docker/gateway/nginx.conf
upstream api_upstream    { server api:3000; }
upstream admin_upstream  { server admin:3002; }
upstream customer_upstream { server customer:8081; }
upstream driver_upstream { server driver:8082; }

server {
    listen 80;
    server_name _;

    # Landing portal
    location = / {
        root /usr/share/nginx/html;
        index index.html;
    }
    location = /index.html {
        root /usr/share/nginx/html;
    }
    location = /favicon.ico {
        root /usr/share/nginx/html;
        try_files $uri =204;
    }

    # Admin console
    location /admin/ {
        proxy_pass http://admin_upstream/admin/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    # Admin login page
    location /login {
        proxy_pass http://admin_upstream/login;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    # Admin Next.js internals
    location /_next/ {
        proxy_pass http://admin_upstream/_next/;
        proxy_set_header Host $host;
    }
    # Admin BFF API proxy
    location /api/v1/ {
        proxy_pass http://admin_upstream/api/v1/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 20M;
    }

    # Customer app
    location /customer/ {
        proxy_pass http://customer_upstream/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Driver app
    location /driver/ {
        proxy_pass http://driver_upstream/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API docs direct access
    location /api/docs {
        proxy_pass http://api_upstream/api/docs;
        proxy_set_header Host $host;
    }

    # WebSocket for admin tracking
    location /socket.io/ {
        proxy_pass http://api_upstream/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }

    # Static file uploads
    location /files/ {
        proxy_pass http://api_upstream/files/;
        proxy_set_header Host $host;
    }
}
```

- [ ] **Step 2: Create landing portal HTML**

Create `infra/docker/gateway/index.html` — a self-contained demo handoff page with:
- LEOPARD branding, dark header
- 3 app cards (Admin Console, Customer App, Driver App) with direct links
- Demo account table with 1-click copy buttons
- "Dữ liệu mô phỏng" label
- Mobile-responsive

- [ ] **Step 3: Create gateway Dockerfile**

```dockerfile
# infra/docker/gateway/Dockerfile
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/index.html
RUN rm -f /etc/nginx/conf.d/default.conf.bak
EXPOSE 80
```

- [ ] **Step 4: Commit**

```bash
git add infra/docker/gateway/
git commit -m "infra: add gateway Nginx with landing demo portal"
```

---

### Task 4: Production Docker Compose

**Files:**
- Create: `docker-compose.prod.yml`
- Create: `.env.prod.example`

**Interfaces:**
- Consumes: All Dockerfiles from Tasks 1–3, existing `infra/docker/api.Dockerfile`
- Produces: Single `docker compose -f docker-compose.prod.yml up -d --build` command to start full stack

- [ ] **Step 1: Create .env.prod.example**

Minimal env file with auto-generated secrets placeholder and demo-mode defaults.

- [ ] **Step 2: Create docker-compose.prod.yml**

6 services: `postgres`, `api`, `admin`, `customer`, `driver`, `gateway`. Key points:
- postgres: persistent volume, healthcheck
- api: depends on postgres healthy, runs migration entrypoint
- admin: depends on api started, `API_URL=http://api:3000/api/v1`
- customer: depends on api started
- driver: depends on api started
- gateway: depends on all, port 80 exposed to host

- [ ] **Step 3: Test locally**

```bash
docker compose -f docker-compose.prod.yml up -d --build
# Wait for health checks
docker compose -f docker-compose.prod.yml ps
curl -s http://localhost/
curl -s http://localhost:3000/api/v1/health/live
```

- [ ] **Step 4: Commit**

```bash
git add docker-compose.prod.yml .env.prod.example
git commit -m "infra: add production Docker Compose for full demo deployment"
```

---

### Task 5: Deploy script + README

**Files:**
- Create: `infra/scripts/deploy-demo.sh`
- Create: `docs/deployment/DEMO-HANDOFF.md`

**Interfaces:**
- Consumes: `docker-compose.prod.yml`, `.env.prod.example`
- Produces: 1-command deploy script, handoff documentation for client

- [ ] **Step 1: Create deploy-demo.sh**

Script that:
1. Checks Docker + Docker Compose prerequisites
2. Generates `.env.prod` from `.env.prod.example` with random 32-byte secrets if not exists
3. Runs `docker compose -f docker-compose.prod.yml up -d --build`
4. Waits for all healthchecks
5. Runs DB migration + seed via API container
6. Prints handoff summary with URLs and demo accounts

- [ ] **Step 2: Create DEMO-HANDOFF.md**

Markdown doc for client with:
- System requirements (Docker, 4GB RAM, ports 80/3000/3002/8081/8082)
- Quick start: `git clone` + `./infra/scripts/deploy-demo.sh`
- Access URLs table
- Demo accounts table
- How to reset demo data
- Troubleshooting

- [ ] **Step 3: Test full flow**

```bash
chmod +x infra/scripts/deploy-demo.sh
./infra/scripts/deploy-demo.sh
```

- [ ] **Step 4: Commit**

```bash
git add infra/scripts/deploy-demo.sh docs/deployment/DEMO-HANDOFF.md
git commit -m "infra: add demo deploy script and handoff documentation"
```
