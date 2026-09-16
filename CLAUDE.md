# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## System Architecture

LEOPARD is a mini-production freight logistics pilot platform connecting Customers, Drivers, and Admins. It is organized as a `pnpm` monorepo managed with `turbo`.

### Applications (`apps/`)
- **`apps/api` (package: `api`)**: NestJS REST API, Socket.IO realtime gateway, Prisma ORM against PostgreSQL + PostGIS. Owns pricing, ETA estimation, order lifecycle state machine, and authorization.
- **`apps/admin` (package: `web`)**: Next.js 16+ (App Router with React 19) operations dashboard for Admins (NexaFleet Modern Bento layout).
- **`apps/mobile` (package: `mobile`)**: Expo (v57) / React Native (v0.86) app with Expo Router for Customer booking flows.
- **`apps/driver` (package: `driver`)**: Expo (v57) / React Native (v0.86) standalone app with Expo Router for Driver dispatch and execution.

### Shared Packages (`packages/`)
- **`packages/mobile-core` (`@leopard/mobile-core`)**: Shared mobile foundation, brand tokens, Apple HIG layout, and UI primitives.
- **`packages/shared` (`@leopard/shared`)**: Pure TypeScript contracts, enums (`Role`, `OrderStatus`, `PaymentStatus`), and DTO interfaces.
- **`packages/validators` (`@leopard/validators`)**: Shared Zod schemas for request validation.
- **`packages/ui` (`@leopard/ui`)**: Shared web UI primitives for Admin/Web (Tailwind CSS based).
- **`packages/config` (`@leopard/config`)**: Shared ESLint configs and TSConfig bases.

---

## Architectural & Business Invariants

- **Authorization**: API strictly enforces role and ownership/assignment checks (Customer owns order, Driver assigned to order).
- **Transactions**: Database transactions are mandatory for accepting orders, recording status history, and confirming payments.
- **ETA & Labels**: ETA must always be labeled as "ETA dự kiến"; simulated data must display "Dữ liệu mô phỏng".
- **Out of Scope**: Multi-tenancy, multi-tier fleets, multi-order routing optimization, and automated bank reconciliation are strictly excluded.

---

## Mobile UI & Design Token Rules (Apple HIG Standard)

1. **Brand Palette**:
   - Primary: **Midnight Navy (`#0B2545`)** (`customerPalette.primary` / `leopardPalette.primary`) — Main action CTA, TabBar Active, Header, Focus ring.
   - Secondary: **Cheetah Golden Amber (`#F59E0B`)** (`customerPalette.accent` / `leopardPalette.accentYellow`) — Vouchers, Badges, Star rating.
   - Canvas: `#FFFFFF` / `#F8FAFC`. Card: `#FFFFFF`, border `#E2E8F0`, `radius.card` (14pt) / `radius.cardLg` (16pt).
   - Functional signals only: Online/Success `#34C759`, Alert/Cancel `#FF3B30`, Link `#0284C7`.
2. **Typography (`typeScale`)**:
   - Never hardcode `fontSize`. Always use `...typeScale.<name>` (`largeTitle`, `title1`, `title2`, `title3`, `headline`, `body`, `callout`, `subheadline`, `footnote`, `caption1`, `caption2`).
3. **Spacing & 4pt Grid (`spacing`)**:
   - Always use `spacing`: `hairline: 2`, `xxs: 4`, `xs: 8`, `sm: 12`, `md: 16`, `lg: 24`, `xl: 32`.
4. **Border Radius (`radius` + `iosContinuousCurve`)**:
   - Always use `radius`: `cardSm: 10`, `control: 12`, `card: 14`, `cardLg: 16`, `cardXl: 20`, `modal: 24`, `pill: 9999` with `...iosContinuousCurve`.
5. **CTA Buttons**:
   - Height 52-54pt, 16pt continuous squircle, physical press feedback (`scale: 0.985`), multi-layer shadow.

---

## Git Workflow & Direct Push Policy

- **Integration Branch**: `develop`.
- **Direct Push Policy**: Cho phép commit và push trực tiếp lên nhánh `develop` **khi có sự đồng ý hoặc được yêu cầu trực tiếp từ người dùng**, không bắt buộc phải tách nhánh con tạo PR.
- **Commit Format**: Tuân thủ Conventional Commits (`feat(scope): ...`, `fix(scope): ...`, `refactor(scope): ...`).

---

## Development & Test Commands

### Monorepo (Root)
- Full local stack: `./scripts/start-all.sh` or `pnpm start:all`
- Run dev services: `pnpm dev`
- Build / Lint / Typecheck: `pnpm build` | `pnpm lint` | `pnpm typecheck`
- Run all tests: `pnpm test`

### Backend (`apps/api`)
- Dev: `pnpm --filter api dev`
- Typecheck / Lint: `pnpm --filter api typecheck` | `pnpm --filter api lint`
- Run all unit tests: `pnpm --filter api test`
- Run single test: `pnpm --filter api test -- src/orders/accept-order.service.spec.ts`
- Run E2E test: `pnpm --filter api test:e2e -- src/orders/order-lifecycle.e2e-spec.ts`

### Admin Web (`apps/admin`, filter: `web`)
- Dev: `pnpm --filter web dev`
- Typecheck / Lint: `pnpm --filter web typecheck` | `pnpm --filter web lint`
- Run all tests: `pnpm --filter web test`
- Run single test: `pnpm --filter web test -- src/components/bento/BentoWidgets.test.tsx`

### Customer Mobile (`apps/mobile`, filter: `mobile`)
- Dev: `pnpm --filter mobile start`
- Typecheck / Lint: `pnpm --filter mobile typecheck` | `pnpm --filter mobile lint`
- Run all tests: `pnpm --filter mobile test`
- Run single test: `pnpm --filter mobile test -- src/features/home/HomeDashboardScreen.test.tsx`

### Driver Mobile (`apps/driver`, filter: `driver`)
- Dev: `pnpm --filter driver start`
- Typecheck / Lint: `pnpm --filter driver typecheck` | `pnpm --filter driver lint`
- Run all tests: `pnpm --filter driver test`
- Run single test: `pnpm --filter driver test -- src/features/orders/IncomingDispatchModal.test.tsx`

### Mobile Core (`packages/mobile-core`)
- Typecheck / Test: `pnpm --filter @leopard/mobile-core typecheck` | `pnpm --filter @leopard/mobile-core test`
- Run single test: `pnpm --filter @leopard/mobile-core test -- src/ui/Button.tsx`
