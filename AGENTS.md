# AGENTS.md

Hướng dẫn chuẩn hóa dành cho Codex & AI Agents khi làm việc trong repository LEOPARD.

## 1. Kiến trúc hệ thống (System Architecture)

LEOPARD là nền tảng kết nối vận tải hàng hóa (Freight Logistics) dạng monorepo quản lý bằng `pnpm` + `turbo`:

### Ứng dụng (`apps/`)
- **`apps/api` (package: `api`)**: NestJS REST API, Socket.IO realtime, Prisma ORM với PostgreSQL + PostGIS. Nắm toàn bộ quy tắc nghiệp vụ: tính giá, ước tính ETA, máy trạng thái đơn hàng và phân quyền API.
- **`apps/admin` (package: `web`)**: Next.js 16+ (App Router với React 19) Dashboard điều phối dành cho Admin theo giao diện NexaFleet Modern Bento.
- **`apps/mobile` (package: `mobile`)**: Expo (v57) / React Native (v0.86) app dành cho Khách hàng (Customer booking & tracking).
- **`apps/driver` (package: `driver`)**: Expo (v57) / React Native (v0.86) standalone app dành cho Tài xế (Driver cockpit & POD).

### Gói dùng chung (`packages/`)
- **`packages/mobile-core` (`@leopard/mobile-core`)**: Nền tảng dùng chung cho Mobile, Design Tokens, Apple HIG components, 2026 Liquid Glass floating dock.
- **`packages/shared` (`@leopard/shared`)**: Pure TypeScript contracts, enums (`Role`, `OrderStatus`, `PaymentStatus`), DTO interfaces.
- **`packages/validators` (`@leopard/validators`)**: Shared Zod schemas xác thực dữ liệu.
- **`packages/ui` (`@leopard/ui`)**: Shared web UI components dành cho Admin/Web.

---

## 2. Quy tắc nghiệp vụ bất biến (Business Invariants)

- **Phân quyền & Sở hữu**: API bắt buộc kiểm tra cả quyền Role và tính sở hữu/phân công (Customer sở hữu đơn hàng, Driver được gán đơn).
- **Giao dịch an toàn (Transactions)**: Bắt buộc dùng Database Transaction khi Driver nhận đơn, ghi lịch sử trạng thái đơn và xác nhận thanh toán thủ công.
- **Nhãn hiển thị**: ETA luôn ghi rõ "ETA dự kiến"; Dữ liệu demo/mô phỏng phải hiển thị rõ "Dữ liệu mô phỏng".
- **Phạm vi Pilot**: Nghiêm cấm đưa các tính năng ngoài scope vào code (Multi-tenancy, AI XGBoost ETA, đối soát ngân hàng tự động).

---

## 3. Quy chuẩn UI & Design Tokens chuẩn Apple HIG

### 3.1. Bảng màu thương hiệu (Brand Palette)
- **Màu chủ đạo (Primary)**: **Midnight Navy (`#0B2545`)** (`customerPalette.primary` / `leopardPalette.primary`) — Nút CTA chính, TabBar Active, Header/Topbar, Input Focus Ring.
- **Màu điểm nhấn (Accent)**: **Cheetah Golden Amber (`#F59E0B`)** (`customerPalette.accent` / `leopardPalette.accentYellow`) — Voucher, Badge VIP, Điểm thưởng, Star rating.
- **Màu nền Canvas & Card**: Nền `#FFFFFF` / `#F8FAFC` (`canvas`). Thẻ Inset Grouped `#FFFFFF` viền mỏng `#E2E8F0`, bo góc `radius.card` (14pt) hoặc `radius.cardLg` (16pt).
- **Màu tín hiệu (Functional Only)**: Online/Thành công `#34C759`, Huỷ/Cảnh báo `#FF3B30`, Liên kết `#0284C7`.

### 3.2. Quy chuẩn Typography (`typeScale`)
- **Nghiêm cấm gõ cứng `fontSize`**: Luôn dùng trực tiếp `...typeScale.<name>`:
  - `largeTitle` (34pt, weight 700)
  - `title1` (28pt, weight 700)
  - `title2` (22pt, weight 600)
  - `title3` (20pt, weight 600)
  - `headline` (17pt, weight 600)
  - `body` (17pt, weight 400)
  - `callout` (16pt, weight 400)
  - `subheadline` (15pt, weight 600 - dùng cho labels, item title)
  - `footnote` (13pt, weight 400/600 - dùng cho caption, badge, chip)
  - `caption1` (12pt, weight 400/600)
  - `caption2` (11pt, weight 400/700 - dùng cho timestamp, micro-tag)

### 3.3. Lưới khoảng cách 4pt (`spacing`)
- Luôn dùng `spacing`: `hairline: 2`, `xxs: 4`, `xs: 8`, `sm: 12`, `md: 16`, `lg: 24`, `xl: 32`. Tuyệt đối không gõ khoảng cách tùy tiện ngoài thang đo (`gap: 3, 6, 7`, `padding: 10, 14, 18`).

### 3.4. Bo góc Squircle (`radius` + `iosContinuousCurve`)
- Luôn dùng `radius`: `cardSm: 10`, `control: 12`, `card: 14`, `cardLg: 16`, `cardXl: 20`, `modal: 24`, `pill: 9999` đi kèm `...iosContinuousCurve` (`borderCurve: 'continuous'`).

### 3.5. Nút bấm CTA & Điều khiển tương tác
- Nút CTA chính: Chiều cao 52-54pt, góc bo 16pt continuous squircle, hiệu ứng nhấn vật lý (`scale: 0.985`), đổ bóng đa tầng.
- Thanh trượt nhận đơn (`SlideToAction`): Apple Floating Capsule Glass viền kính mờ 1px và phản hồi xúc giác (Haptic).

---

## 4. Quy trình Git & Quyền Push trực tiếp (Git Workflow & Direct Push Policy)

- **Nhánh tích hợp chính**: `develop`.
- **Direct Push Policy**: Cho phép commit và push trực tiếp lên nhánh `develop` **khi có sự đồng ý hoặc được yêu cầu trực tiếp từ người dùng**, không bắt buộc phải tách nhánh con tạo PR.
- **Commit Format**: Tuân thủ Conventional Commits (`feat(scope): ...`, `fix(scope): ...`, `refactor(scope): ...`).

---

## 5. Lệnh kiểm thử & Phát triển (Commands & Verification)

### Monorepo
- Khởi động full local stack: `./scripts/start-all.sh` hoặc `pnpm start:all`
- Chạy dev server: `pnpm dev`
- Build / Lint / Typecheck toàn bộ: `pnpm build` | `pnpm lint` | `pnpm typecheck`
- Chạy toàn bộ tests: `pnpm test`

### Backend (`apps/api`)
- Dev: `pnpm --filter api dev`
- Typecheck / Lint: `pnpm --filter api typecheck` | `pnpm --filter api lint`
- Chạy toàn bộ tests: `pnpm --filter api test`
- Chạy 1 test đơn lẻ: `pnpm --filter api test -- src/orders/accept-order.service.spec.ts`

### Admin Web (`apps/admin`, filter: `web`)
- Dev: `pnpm --filter web dev`
- Typecheck / Lint: `pnpm --filter web typecheck` | `pnpm --filter web lint`
- Chạy toàn bộ tests: `pnpm --filter web test`
- Chạy 1 test đơn lẻ: `pnpm --filter web test -- src/components/bento/BentoWidgets.test.tsx`

### Customer Mobile (`apps/mobile`, filter: `mobile`)
- Dev: `pnpm --filter mobile start`
- Typecheck / Lint: `pnpm --filter mobile typecheck` | `pnpm --filter mobile lint`
- Chạy toàn bộ tests: `pnpm --filter mobile test`
- Chạy 1 test đơn lẻ: `pnpm --filter mobile test -- src/features/home/HomeDashboardScreen.test.tsx`

### Driver Mobile (`apps/driver`, filter: `driver`)
- Dev: `pnpm --filter driver start`
- Typecheck / Lint: `pnpm --filter driver typecheck` | `pnpm --filter driver lint`
- Chạy toàn bộ tests: `pnpm --filter driver test`
- Chạy 1 test đơn lẻ: `pnpm --filter driver test -- src/features/orders/IncomingDispatchModal.test.tsx`

### Mobile Core (`packages/mobile-core`)
- Typecheck / Test: `pnpm --filter @leopard/mobile-core typecheck` | `pnpm --filter @leopard/mobile-core test`
- Chạy 1 test đơn lẻ: `pnpm --filter @leopard/mobile-core test -- src/ui/Button.tsx`
