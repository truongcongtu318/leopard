# LEOPARD

LEOPARD is a 6-week MVP/Demo project for a cargo transportation connection system. The product connects Customers who create shipment orders with Drivers who accept and complete those orders, while Admin users monitor orders, users, drivers, tracking, uploads, and payment state.

This repository is currently in the planning and specification phase. It contains the SRS, architecture, database design, API specification, UI flow specification, sprint plan, and Codex working instructions that coding agents and developers should follow when implementation begins.

## Product Scope

The MVP includes:

- Customer Web App/PWA for shipment order creation and order tracking.
- Driver Web App/PWA for viewing, accepting, and updating shipment orders.
- Admin Dashboard for users, drivers, orders, status, tracking, media, and payment overview.
- Backend API for authentication, orders, drivers, admin, tracking, upload, payment, and integrations.
- PostgreSQL/PostGIS database for users, orders, stops, coordinates, tracking points, media, and payment intents.
- Vietmap integration for address search, geocoding, routing, distance, and ETA at MVP level.
- Socket.IO/WebSocket realtime tracking demo.
- Media upload for cargo and delivery confirmation images.
- VietQR/payOS QR payment creation at MVP/demo level.

The MVP does not include production SLA, native mobile apps, automatic bank reconciliation, advanced AI ETA, production-grade route optimization, Fleet Owner dashboard, or high-concurrency guarantees.

## Approved Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | NestJS, TypeScript |
| ORM | Prisma |
| Database | PostgreSQL + PostGIS |
| Realtime | Socket.IO / WebSocket |
| Maps | Vietmap API with demo fallback |
| OTP | Firebase Phone Auth when configured |
| Media Storage | Local storage for dev, DigitalOcean Spaces/S3-compatible for staging |
| Payment | VietQR/payOS with demo fallback |
| Local Runtime | Docker Compose |

## Repository Structure

```text
.
|-- AGENTS.md
|-- README.md
`-- docs
    |-- srs-leopard-mvp.md
    |-- project
    |   |-- 01-product-backlog-user-stories.md
    |   |-- 02-system-architecture.md
    |   |-- 03-database-design-erd.md
    |   |-- 04-api-specification.md
    |   `-- 05-ui-flow-screen-spec.md
    `-- workflows
        |-- 01-six-week-sprint-plan.md
        |-- 02-agent-goal-cards.md
        |-- 04-review-and-verification-gates.md
        `-- codex-best-practices-for-leopard.md
```

Planned implementation structure:

```text
apps/
  web/      # Next.js Customer, Driver, Admin UI
  api/      # NestJS API and Socket.IO gateway
packages/
  shared/   # Shared DTOs, enums, and validation helpers
```

## Active Documentation

Start here:

1. [AGENTS.md](./AGENTS.md) - Codex and agent working rules for this repository.
2. [SRS](./docs/srs-leopard-mvp.md) - product requirements and acceptance criteria.
3. [Product Backlog](./docs/project/01-product-backlog-user-stories.md) - user stories and implementation order.
4. [System Architecture](./docs/project/02-system-architecture.md) - module and integration architecture.
5. [Database Design and ERD](./docs/project/03-database-design-erd.md) - entities, enums, constraints, and Prisma draft.
6. [API Specification](./docs/project/04-api-specification.md) - endpoint contracts, payloads, errors, and Socket.IO events.
7. [UI Flow and Screen Specification](./docs/project/05-ui-flow-screen-spec.md) - screen map, UI states, and demo flow.
8. [6-Week Sprint Plan](./docs/workflows/01-six-week-sprint-plan.md) - phased implementation plan.
9. [Codex Best Practices for LEOPARD](./docs/workflows/codex-best-practices-for-leopard.md) - how to prompt and review Codex work.

## Development Status

Current status:

- Git repository initialized.
- Requirements and workflow documents exist.
- Application code has not been scaffolded yet.

Recommended next implementation step:

1. Scaffold the monorepo with `apps/web`, `apps/api`, and `packages/shared`.
2. Add Docker Compose for PostgreSQL/PostGIS.
3. Add `.env.example`.
4. Implement Week 1 from the sprint plan.

## Local Setup

Application setup will be finalized after the monorepo is scaffolded. The expected future commands are:

```bash
pnpm install
pnpm db:up
pnpm dev
```

Expected future verification commands:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

If these scripts do not exist yet, follow the current sprint task and add them as part of foundation work.

## Environment Variables

The implementation should provide `.env.example` with at least:

```dotenv
DATABASE_URL="postgresql://leopard:leopard@localhost:5432/leopard?schema=public"
JWT_SECRET="replace-with-local-dev-secret"
WEB_ORIGIN="http://localhost:3000"
API_PORT="4000"
VIETMAP_API_KEY=""
STORAGE_DRIVER="local"
LOCAL_UPLOAD_DIR="./uploads"
S3_ENDPOINT=""
S3_ACCESS_KEY_ID=""
S3_SECRET_ACCESS_KEY=""
S3_BUCKET=""
PAYMENT_MODE="demo"
PAYOS_CLIENT_ID=""
PAYOS_API_KEY=""
PAYOS_CHECKSUM_KEY=""
```

Never commit real secrets.

## Agent Workflow

Use this task prompt structure:

```text
Goal:
[one small story or goal]

Context:
- [specific docs sections]
- [specific files]

Constraints:
- [stack]
- [scope limits]
- [security/authorization rules]
- [UI rules if relevant]

Done when:
- [behavior]
- [tests/checks]
- [manual verification]
```

Keep implementation tasks small: one endpoint, one screen, one provider, one business rule, or one bug at a time.

## Verification Rules

Backend changes should eventually run:

```bash
pnpm --filter api test
pnpm --filter api typecheck
pnpm --filter api lint
```

Frontend changes should eventually run:

```bash
pnpm --filter web test
pnpm --filter web typecheck
pnpm --filter web lint
```

Release or sprint completion should eventually run:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

If a script is unavailable, report it and run the closest available check.

## License

No license has been selected yet. Do not reuse or distribute this project as open source until a license is explicitly added.
