# LEOPARD Codex Instructions

## Project Context

LEOPARD là hệ thống kết nối logistics ở mức mini-production pilot với bốn role:

- Customer tạo và theo dõi shipment order.
- Driver nhận order, cập nhật delivery status và gửi tracking point.
- Fleet Owner quản lý fleet pilot, drivers thuộc fleet và orders của fleet ở chế độ chủ yếu read-only.
- Admin giám sát users, fleets, drivers, orders, tracking, media và payment state.

Approved stack:

- Mobile: Expo (v57) / React Native (v0.86) với TypeScript (`apps/mobile` cho Customer, `apps/driver` cho Driver).
- Mobile Core: `@leopard/mobile-core` (thư viện dùng chung foundation, brand theme tokens, Apple HIG layout, 2026 Liquid Glass floating dock, UI primitives).
- Operations Web: Next.js (App Router, Next 16+ với React 19), TypeScript, Tailwind CSS (`apps/admin`, filter: `web`).
- Backend: NestJS, Prisma, TypeScript (`apps/api`, filter: `api`).
- Database: PostgreSQL + PostGIS.
- Realtime: Socket.IO/WebSocket.
- Integrations: Vietmap, Firebase Phone Auth, S3-compatible storage, VietQR/payOS.

## Source Of Truth

Đọc trước implementation:

1. `docs/product/01-vision-and-scope.md`
2. `docs/requirements/01-srs.md`
3. `docs/requirements/02-user-stories.md`
4. `docs/requirements/03-acceptance-criteria.md`
5. `docs/architecture/01-system-architecture.md`
6. `docs/data/01-database-design.md`
7. `docs/api/01-rest-api-spec.md`
8. `docs/ui/03-screen-specs.md`
9. `docs/development/05-definition-of-done.md`
10. `docs/testing/01-test-strategy.md`
11. `CONTRIBUTING.md`

Nếu tài liệu xung đột, ưu tiên: SRS, Product/Requirements, Architecture/Data/API, UI, Development/Testing, rồi existing code behavior. Khi code cố ý thay đổi behavior, cập nhật tài liệu trong cùng task.

## Prompt Contract

Mỗi implementation task cần có:

- Goal: behavior cần xây dựng hoặc sửa.
- Context: story, acceptance criteria, file hoặc lỗi liên quan.
- Constraints: stack, scope, security, architecture và UI rules.
- Done when: test, build và manual verification cần đạt.

Nếu thiếu thông tin làm thay đổi đáng kể solution, đọc tài liệu liên quan trước rồi lập kế hoạch ngắn.

## Implementation Rules

- Giữ task nhỏ: một story hoặc một vertical slice.
- Không thêm feature nằm trong `docs/product/05-out-of-scope.md` nếu chưa có change request.
- Backend sở hữu business rules, pricing, ETA, lifecycle và authorization.
- Kiểm tra cả role lẫn ownership/assignment ở API.
- Fleet Owner chỉ truy cập dữ liệu qua `FleetMember` hợp lệ; không được kế thừa quyền Admin.
- Dùng provider interfaces cho map/ETA, storage, OTP và payment.
- Demo provider chỉ bật theo config; dữ liệu ETA demo phải deterministic và được ghi nhãn.
- Dùng transaction cho accept order, status history và manual payment confirmation.
- Giữ PostGIS vừa đủ cho point/index/query của pilot.
- Ưu tiên code dễ đọc và module boundary rõ.

## Git Workflow

- Không làm việc trực tiếp trên `main` hoặc `develop`.
- Tạo `feature/*`, `fix/*`, `docs/*`, `refactor/*` hoặc `codex/*` từ `develop`.
- PR thông thường nhắm vào `develop`; chỉ release/hotfix PR mới nhắm vào `main`.
- `release/*` tách từ `develop`; `hotfix/*` tách từ `main` và phải đồng bộ trở lại `develop`.
- Tuân thủ commit convention, review gate và verification trong `CONTRIBUTING.md`.

## UI & Design Token Rules

LEOPARD là hệ thống vận hành logistics thông minh, kết hợp tính chính xác trong điều phối với giao diện người dùng hiện đại, chuẩn **Apple Human Interface Guidelines (HIG)**:

### 1. Brand Palette & Semantic Colors
- **Primary Brand Color**: **Midnight Navy (`#0B2545`)** - Trích xuất từ chữ `L` và đường viền quyền lực của logo Báo LEOPARD. Dùng cho nút CTA chính, Header/Topbar, Active Tab, Focus Ring.
- **Secondary Accent Color**: **Cheetah Golden Amber (`#F59E0B` / `#D97706`)** - Trích xuất từ màu lông báo gấm. Dùng cho Voucher, Badge VIP, Điểm thưởng, Star rating và Slogan.
- **Màu nền Canvas**: Trắng tuyết `#FFFFFF` và xám sáng `#F8FAFC` (`canvas`).
- **Màu thẻ (Card)**: `#FFFFFF`, viền mỏng `#E2E8F0`, bo góc `radius.card` (14pt) / `radius.cardLg` (16pt) kèm đường cong liên tục `...iosContinuousCurve`.
- **Màu chữ & Typography**: Chữ chính `#0F172A` (Slate 900), chữ phụ `#475569` / `#64748B` (`mutedText`/`subtleText`). Số liệu KPI dùng `tabular-nums`.
- **Màu trạng thái (Functional Only)**: Xanh lá online/giao thành công (`#34C759` / `#16A34A`), Đỏ hủy/cảnh báo (`#FF3B30` / `#EF4444`), Vàng cảnh báo (`#F59E0B`), Xanh dương liên kết (`#0284C7` / `#007AFF`).

### 2. Typography & Dynamic Type Contract (`typeScale`)
- **Bắt buộc dùng `typeScale`**: Không được gõ cứng `fontSize: 11, 12, 13, 15...`. Phải dùng trực tiếp:
  - `...typeScale.largeTitle` (34pt, weight 700)
  - `...typeScale.title1` (28pt, weight 700)
  - `...typeScale.title2` (22pt, weight 600)
  - `...typeScale.title3` (20pt, weight 600)
  - `...typeScale.headline` (17pt, weight 600)
  - `...typeScale.body` (17pt, weight 400)
  - `...typeScale.callout` (16pt, weight 400)
  - `...typeScale.subheadline` (15pt, weight 600 - dùng cho label, item title)
  - `...typeScale.footnote` (13pt, weight 400/600 - dùng cho caption, badge, chip)
  - `...typeScale.caption1` (12pt, weight 400/600)
  - `...typeScale.caption2` (11pt, weight 400/700 - dùng cho timestamp, micro-tag)

### 3. Spacing & Layout Rhythm (4pt Apple Grid)
- **Bắt buộc dùng `spacing`**:
  - `spacing.hairline` (2pt), `spacing.xxs` (4pt), `spacing.xs` (8pt), `spacing.sm` (12pt), `spacing.md` (16pt), `spacing.lg` (24pt), `spacing.xl` (32pt).
  - Không gõ khoảng cách tùy tiện (`gap: 3, 6, 7`, `padding: 10, 14, 18`).

### 4. Border Radius & Continuous Squircle (`radius`)
- **Bắt buộc dùng `radius`**:
  - `radius.cardSm` (10pt), `radius.control` (12pt), `radius.card` (14pt), `radius.cardLg` (16pt), `radius.cardXl` (20pt), `radius.modal` (24pt), `radius.pill` (9999pt).
  - Luôn đi kèm `...iosContinuousCurve` (`borderCurve: 'continuous'`).

### 5. Primary CTA Buttons & Interactive Controls
- **Nút CTA chính**: Chiều cao tiêu chuẩn 52-54pt, góc bo `16pt` continuous squircle, hiệu ứng phản hồi vật lý khi nhấn (`scale: 0.985`), đổ bóng đa tầng mềm mại.
- **Thanh trượt nhận đơn (Slide to Action)**: Thiết kế chuẩn Apple Floating Capsule Glass viền kính mờ 1px và phản hồi xúc giác (Haptic).

## Verification

Chạy bộ kiểm tra hẹp nhất phù hợp sau mỗi task.

Backend:

```bash
pnpm --filter api test
pnpm --filter api typecheck
pnpm --filter api lint
```

Frontend / Admin Web:

```bash
pnpm --filter web test
pnpm --filter web typecheck
pnpm --filter web lint
```

Mobile (`apps/mobile`, `apps/driver`, `packages/mobile-core`):

```bash
pnpm --filter mobile test
pnpm --filter mobile typecheck
pnpm --filter driver test
pnpm --filter driver typecheck
pnpm --filter @leopard/mobile-core test
```

Trước release:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

## Review Expectations

Trước khi báo hoàn tất, xác nhận:

- Acceptance criteria và test scenario liên quan đạt.
- Không còn P0/P1 issue thuộc phạm vi.
- Không hardcode mã màu hex, cỡ chữ hay khoảng cách ngoài bộ token.
- Không role nào truy cập dữ liệu riêng tư ngoài quyền.
- Dữ liệu persist sau refresh khi liên quan.
- Diff không chứa refactor hoặc generated file không liên quan.
