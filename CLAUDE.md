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
- **`apps/mobile` (package: `mobile`)**:
  - Expo (v57) / React Native (v0.86) app with Expo Router for Customer flows.
  - Map-first booking, Fleet Matrix (Van 500kg, Truck 1.25T, 2.5T, Ba gác), Route Spine, VietQR payOS, and VAT e-invoicing.
  - TanStack React Query for caching, React Hook Form for input handling.
- **`apps/driver` (package: `driver`)**:
  - Expo (v57) / React Native (v0.86) standalone app with Expo Router for Driver flows.
  - Field Cockpit, hero duty control switch, 15s push dispatch offers, 4-stage lifecycle (`ACCEPTED ➔ PICKING_UP ➔ IN_TRANSIT ➔ DELIVERED`), electronic POD with signature capture.

### Shared Packages (`packages/`)

- **`packages/mobile-core` (`@leopard/mobile-core`)**: Shared mobile foundation, brand theme tokens, Apple HIG layout, 2026 Liquid Glass floating dock, and UI primitives for Customer and Driver apps.
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
   - Implement for Mobile using `StyleSheet.create` + `@leopard/mobile-core` (Apple HIG tokens, `iosContinuousCurve`, `typeScale`, `spacing`, `radius`).
   - Implement for Web using Tailwind CSS + `@leopard/ui` primitives.

### Mobile UI & Design Token Rules (Apple HIG Standard)

1. **Brand Colors & Palette**:
   - **Primary Action & Brand**: **Midnight Navy (`#0B2545`)** (`customerPalette.primary` / `leopardPalette.primary`) — Trích xuất từ chữ `L` và viền Báo của Logo. Dùng cho Nút CTA chính, TabBar Active, Header/Topbar, Input Focus Ring.
   - **Secondary Accent**: **Cheetah Golden Amber (`#F59E0B` / `#D97706`)** (`customerPalette.accent` / `leopardPalette.accentYellow`) — Trích xuất từ lông Báo gấm. Dùng cho Voucher, Badge VIP, Điểm thưởng, Star rating và Slogan.
   - **Canvas & Cards**: Nền `#FFFFFF` / `#F8FAFC` (`canvas`). Thẻ Inset Grouped màu `#FFFFFF`, viền mỏng `#E2E8F0`, bo góc `radius.card` (14pt) hoặc `radius.cardLg` (16pt) kèm `...iosContinuousCurve`.
   - **Neutral Typography**: Chữ chính `#0F172A` (Slate 900), chữ phụ `#475569` / `#64748B`. Số liệu KPI dùng fontVariant `['tabular-nums']`.
   - **Functional Colors Only**: Chỉ dùng màu cho tín hiệu thực: Xanh lá online/thành công (`#34C759` / `#16A34A`), Đỏ hủy/cảnh báo (`#FF3B30` / `#EF4444`), Vàng cảnh báo (`#F59E0B`), Xanh dương liên kết (`#0284C7` / `#007AFF`).

2. **Typography & Dynamic Type Contract (`typeScale`)**:
   - **Không được gõ cứng `fontSize` lẻ**: Luôn dùng trực tiếp `...typeScale.<style>`:
     - `largeTitle` (34pt/41pt, weight 700)
     - `title1` (28pt/34pt, weight 700)
     - `title2` (22pt/28pt, weight 600)
     - `title3` (20pt/25pt, weight 600)
     - `headline` (17pt/22pt, weight 600)
     - `body` (17pt/22pt, weight 400)
     - `callout` (16pt/21pt, weight 400)
     - `subheadline` (15pt/20pt, weight 600 - dùng cho labels, form field titles)
     - `footnote` (13pt/18pt, weight 400/600 - dùng cho captions, meta chips)
     - `caption1` (12pt/16pt, weight 400/600)
     - `caption2` (11pt/13pt, weight 400/700 - dùng cho timestamps, badges)

3. **Spacing & 4pt Grid (`spacing`)**:
   - `spacing.hairline` (2pt), `spacing.xxs` (4pt), `spacing.xs` (8pt), `spacing.sm` (12pt), `spacing.md` (16pt), `spacing.lg` (24pt), `spacing.xl` (32pt).
   - Tuyệt đối không gõ khoảng cách tùy tiện ngoài thang đo (`gap: 3, 6, 7`, `padding: 10, 14, 18`).

4. **Border Radius & Continuous Squircle (`radius`)**:
   - `radius.cardSm` (10pt), `radius.control` (12pt), `radius.card` (14pt), `radius.cardLg` (16pt), `radius.cardXl` (20pt), `radius.modal` (24pt), `radius.pill` (9999pt).
   - Luôn áp dụng `...iosContinuousCurve` (`borderCurve: 'continuous'`).

5. **Primary CTA Buttons & Controls**:
   - Nút hành động chính (Primary CTA): Chiều cao 52-54pt, góc bo 16pt continuous squircle, hiệu ứng nhấn vật lý (`scale: 0.985`), đổ bóng đa tầng.
   - Thanh trượt nhận đơn (`SlideToAction`): Kiểu dáng Apple Floating Capsule Glass viền kính mờ 1px và phản hồi xúc giác (Haptic).

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

### Backend (`apps/api`)

- Dev server: `pnpm --filter api dev`
- Build: `pnpm --filter api build`
- Typecheck: `pnpm --filter api typecheck`
- Lint: `pnpm --filter api lint`
- Run all unit tests: `pnpm --filter api test`

### Operations Web / Admin (`apps/admin`, filter: `web`)

- Dev server: `pnpm --filter web dev`
- Build: `pnpm --filter web build`
- Typecheck: `pnpm --filter web typecheck`
- Lint: `pnpm --filter web lint`
- Run all unit tests: `pnpm --filter web test`

### Customer Mobile App (`apps/mobile`, filter: `mobile`)

- Start Expo dev server: `pnpm --filter mobile start`
- Typecheck: `pnpm --filter mobile typecheck`
- Lint: `pnpm --filter mobile lint`
- Run all tests: `pnpm --filter mobile test`

### Driver Mobile App (`apps/driver`, filter: `driver`)

- Start Expo dev server: `pnpm --filter driver start`
- Typecheck: `pnpm --filter driver typecheck`
- Lint: `pnpm --filter driver lint`
- Run all tests: `pnpm --filter driver test`

### Shared Mobile Core (`packages/mobile-core`)

- Typecheck: `pnpm --filter @leopard/mobile-core typecheck`
- Lint: `pnpm --filter @leopard/mobile-core lint`
- Run all tests: `pnpm --filter @leopard/mobile-core test`
