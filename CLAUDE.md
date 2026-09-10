# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## System Architecture

LEOPARD is a mini-production freight logistics pilot platform connecting Customers, Drivers, Fleet Owners, and Admins. It is organized as a `pnpm` monorepo managed with `turbo`.

### Applications (`apps/`)

- **`apps/api` (package: `api`)**:
  - NestJS REST API, Socket.IO realtime gateway, Prisma ORM against PostgreSQL + PostGIS.
  - Owns business rules: pricing, ETA estimation, order lifecycle state machine, payments, and authorization.
  - Integration providers (maps/routing, phone OTP, storage, payment) use provider interfaces with deterministic demo fallbacks controlled via `ALLOW_DEMO_PROVIDER`.
- **`apps/admin` (package: `web`)**:
  - Next.js (App Router, Next 16+ with React 19) operations dashboard for Fleet Owners and Admins.
  - Follows the NexaFleet Modern Bento layout with real-time tracking map and operational statistics.
  - *Note:* Refer to Next.js guides in `node_modules/next/dist/docs/` for breaking conventions in this version.
- **`apps/mobile` (package: `mobile`)**:
  - Expo (v57) / React Native (v0.86) app with Expo Router for Customer and Driver flows.
  - TanStack React Query for caching, React Hook Form for input handling.

### Shared Packages (`packages/`)

- **`packages/shared` (`@leopard/shared`)**: Pure TypeScript contracts, enums (`Role`, `OrderStatus`, `PaymentStatus`), and DTO interfaces (no framework dependencies).
- **`packages/validators` (`@leopard/validators`)**: Shared Zod schemas for request validation.
- **`packages/ui` (`@leopard/ui`)**: Shared web UI primitives for Admin/Web (Tailwind CSS based, presentation only, no business logic).
- **`packages/config` (`@leopard/config`)**: Shared ESLint configs and TSConfig bases.

### Key Architectural Invariants

- **Authorization**: API enforces role, ownership, assignment, and fleet membership. Fleet Owners access fleet data via valid `FleetMember` records (read-only for most fleet entities) and do not inherit Admin privileges.
- **Transactions**: Database transactions are mandatory for accepting orders, recording status transition history, and manual payment confirmations.
- **ETA & Labels**: ETA must always be labeled as "ETA dự kiến"; simulated/demo data must explicitly display "Dữ liệu mô phỏng".
- **Out of Scope**: Multi-tenancy, multi-tier fleets, automated dispatch algorithms, multi-order routing optimization, AI XGBoost ETA, and automated bank reconciliation are explicitly excluded from the pilot.

---

## Development & Test Commands

### Monorepo (Root)

- Install dependencies: `pnpm install`
- Start all dev services: `pnpm dev`
- Build all packages/apps: `pnpm build`
- Lint all: `pnpm lint`
- Typecheck all: `pnpm typecheck`
- Run all tests: `pnpm test`
- Run contract tests: `pnpm test:contract`
- Run all E2E tests: `pnpm test:e2e`

### Backend (`apps/api`)

- Dev server: `pnpm --filter api dev`
- Build: `pnpm --filter api build`
- Typecheck: `pnpm --filter api typecheck`
- Lint: `pnpm --filter api lint`
- Run all unit/spec tests: `pnpm --filter api test`
- Run a single test: `pnpm --filter api test -- src/orders/accept-order.service.spec.ts`
- Run E2E tests: `pnpm --filter api test:e2e`
- Run a single E2E test: `pnpm --filter api test:e2e -- src/orders/order-lifecycle.e2e-spec.ts`
- Contract tests: `pnpm --filter api test:contract`
- Prisma generate: `pnpm --filter api prisma:generate`
- Database test migrations & database tests: `pnpm db:migrate:test`

### Operations Web / Admin (`apps/admin`, filter: `web`)

*Note: Package name is `web`, filter using `--filter web`.*

- Dev server: `pnpm --filter web dev`
- Dev server with preview fixtures: `pnpm --filter web dev:preview`
- Build: `pnpm --filter web build`
- Typecheck: `pnpm --filter web typecheck`
- Lint: `pnpm --filter web lint`
- Run all unit tests: `pnpm --filter web test`
- Run a single test: `pnpm --filter web test -- src/preview/preview-mode.test.ts`
- Run E2E tests (Playwright): `pnpm --filter web test:e2e`

### Mobile App (`apps/mobile`, filter: `mobile`)

- Start Expo dev server: `pnpm --filter mobile start`
- Typecheck: `pnpm --filter mobile typecheck`
- Lint: `pnpm --filter mobile lint`
- Run all tests: `pnpm --filter mobile test`
- Run a single test: `pnpm --filter mobile test -- src/smoke.test.tsx`
- Run E2E tests (Maestro): `pnpm --filter mobile test:e2e`

### Shared Packages

- `@leopard/shared`:
  - Test (Vitest): `pnpm --filter @leopard/shared test`
  - Single test: `pnpm --filter @leopard/shared test -- src/index.test.ts`
- `@leopard/validators`:
  - Test (Vitest): `pnpm --filter @leopard/validators test`
  - Single test: `pnpm --filter @leopard/validators test -- src/index.test.ts`
- `@leopard/ui`:
  - Test (Jest): `pnpm --filter @leopard/ui test`

---

## Git Workflow & Conventions

- Base and integration branch: `develop`. Never commit directly to `main` or `develop`.
- Branch naming: `feature/<issue>-<name>`, `fix/<issue>-<name>`, `docs/<issue>-<name>`, `refactor/<issue>-<name>`, or `codex/<type>-<name>`.
- Standard PRs target `develop`; only `release/*` and `hotfix/*` target `main`.
- Commit format: Conventional Commits (`feat(scope): imperative summary`).
