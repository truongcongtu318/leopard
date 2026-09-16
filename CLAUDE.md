# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## System Architecture

LEOPARD is a mini-production freight logistics pilot platform connecting Customers, Drivers, and Admins. It is organized as a `pnpm` monorepo managed with `turbo`.

### Applications (`apps/`)

- **`apps/api` (package: `api`)**:
  - NestJS REST API, Socket.IO realtime gateway, Prisma ORM against PostgreSQL + PostGIS.
  - Owns business rules: pricing, ETA estimation, order lifecycle state machine, payments, and authorization.
  - Integration providers (maps/routing, phone OTP, storage, payment) use provider interfaces with deterministic demo fallbacks controlled via `ALLOW_DEMO_PROVIDER`.
- **`apps/admin` (package: `web`)**:
  - Next.js (App Router, Next 16+ with React 19) operations dashboard for Admins.
  - Follows the NexaFleet Modern Bento layout with real-time tracking map and operational statistics.
  - *Note:* Refer to Next.js guides in `node_modules/next/dist/docs/` for breaking conventions in this version.
- **`apps/mobile` (package: `mobile`)**:
  - Expo (v57) / React Native (v0.86) app with Expo Router for Customer flows.
  - Map-first Lalamove-style booking, Fleet Matrix (Van 500kg, Truck 1.25T, 2.5T, Ba gác), Route Spine, VietQR payOS, and VAT e-invoicing.
  - TanStack React Query for caching, React Hook Form for input handling.
- **`apps/driver` (package: `driver`)**:
  - Expo (v57) / React Native (v0.86) standalone app with Expo Router for Driver flows.
  - Field Cockpit, hero duty control switch, 15s push dispatch offers, 4-stage lifecycle (`ACCEPTED ➔ PICKING_UP ➔ IN_TRANSIT ➔ DELIVERED`), electronic POD with signature capture.

### Shared Packages (`packages/`)

- **`packages/mobile-core` (`@leopard/mobile-core`)**: Shared mobile foundation, brand theme tokens, 2026 Liquid Glass floating dock, and UI primitives for Customer and Driver apps.
- **`packages/shared` (`@leopard/shared`)**: Pure TypeScript contracts, enums (`Role`, `OrderStatus`, `PaymentStatus`), and DTO interfaces (no framework dependencies).
- **`packages/validators` (`@leopard/validators`)**: Shared Zod schemas for request validation.
- **`packages/ui` (`@leopard/ui`)**: Shared web UI primitives for Admin/Web (Tailwind CSS based, presentation only, no business logic).
- **`packages/config` (`@leopard/config`)**: Shared ESLint configs and TSConfig bases.

### Key Architectural Invariants

- **Authorization**: API enforces role and ownership/assignment checks (Customer owns the order, Driver is assigned to it).
- **Transactions**: Database transactions are mandatory for accepting orders, recording status transition history, and manual payment confirmations.
- **ETA & Labels**: ETA must always be labeled as "ETA dự kiến"; simulated/demo data must explicitly display "Dữ liệu mô phỏng".
- **Dispatch**: Includes automated single-order dispatch (nearest available driver).
- **Out of Scope**: Multi-tenancy, multi-tier fleets, multi-order routing optimization, AI XGBoost ETA, and automated bank reconciliation are explicitly excluded.

---

## UI Component Development Workflow

When asked to build or refactor a UI component:

1. **FIRST**:
   - Search the repository for an existing equivalent in `@leopard/mobile-core`, `@leopard/ui`, or app workspaces.
   - If no suitable component exists, query the UI MCP (`shadcn-ui-mcp-server`) for structural and state references.

2. **THEN**:
   - Analyze the MCP result for accessibility contracts and component anatomy.
   - Adapt it to the repository conventions.
   - **Never copy NativeWind styling directly** into React Native workspaces.

3. **FINALLY**:
   - Implement for Mobile using `StyleSheet.create` + `@leopard/mobile-core` (Apple HIG tokens, `driverPrimitives`, `iosContinuousCurve`).
   - Implement for Web using Tailwind CSS + `@leopard/ui` primitives.

### Mobile UI & Color Design Rules (Apple HIG Standard)

1. **Standard Navigation Bar (Header)**:
   - Always use `ScreenScaffold` with `onBack` and `title` for screen headers across all mobile apps (`apps/driver`, `apps/mobile`).
   - Fixed 44pt bar height, centered 17pt Semibold title, standard chevron back button `<` with minimum 44x44pt hit target (`hitSlop`).
   - Never create custom `headerBar` implementations with ad-hoc heights (e.g. 52pt) or raw SVG arrows.

2. **Color Restraint (Content-First)**:
   - **No rainbow/pastel icon background boxes**: Do not wrap icons in arbitrary green, amber, blue, purple squares (`#ECFDF5`, `#FFFBEB`, `#EFF6FF`).
   - **Monochrome SF Symbols Style**: Setting, menu, and action icons must be neutral monochrome (`gray500` or `gray700`), placed directly beside labels.
   - **Neutral Data & KPI Typography**: Normal statistics, percentages, and metrics must use high-contrast neutral dark typography (`driverPrimitives.colors.gray900`, bold, `fontVariant: ['tabular-nums']`). Never color numbers green or red unless indicating a specific delta/trend.
   - **Functional Colors Only**: Reserve color strictly for active business signals:
     - Rating stars: `amber500`
     - Critical alerts / destructive actions: `red500` / `red600`
     - Online status indicator / confirmed toggle: `green500`
     - Unread notifications dot: `red500`

3. **Surfaces & Cards (Apple Inset Grouped & Nexa Bento)**:
   - Base canvas: `#F8FAFC` (`gray50`).
   - Cards: Pure white `#FFFFFF`, thin border `#E2E8F0` (`border-slate-200`), rounded-2xl (18-20px, `iosContinuousCurve`), soft shadow (`shadow-sm`).
   - Avoid aggressive pitch-black container boxes (`#0F172A`) that clash with the light iOS theme.

---

## Development & Test Commands

### Monorepo (Root)

- Install dependencies: `pnpm install`
- Start full local dev stack (Docker DB + local API, Driver Web, Admin Web): `pnpm start:all` or `./scripts/start-all.sh`
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

### Driver App (`apps/driver`, filter: `driver`)

- Start Expo dev server: `pnpm --filter driver start`
- Typecheck: `pnpm --filter driver typecheck`
- Lint: `pnpm --filter driver lint`
- Run all tests: `pnpm --filter driver test`

### Shared Packages

- `@leopard/mobile-core`:
  - Test (Jest): `pnpm --filter @leopard/mobile-core test`
  - Typecheck: `pnpm --filter @leopard/mobile-core typecheck`
  - Lint: `pnpm --filter @leopard/mobile-core lint`
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
