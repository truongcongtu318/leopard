# LEOPARD Codex Instructions

## Project Context

LEOPARD là hệ thống kết nối logistics ở mức mini-production pilot với bốn role:

- Customer tạo và theo dõi shipment order.
- Driver nhận order, cập nhật delivery status và gửi tracking point.
- Fleet Owner quản lý fleet pilot, drivers thuộc fleet và orders của fleet ở chế độ chủ yếu read-only.
- Admin giám sát users, fleets, drivers, orders, tracking, media và payment state.

Approved stack:

- Mobile: Expo/React Native hoặc Mobile PWA, TypeScript.
- Operations Web: Next.js, React, TypeScript, Tailwind CSS.
- Backend: NestJS, Prisma, TypeScript.
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

## UI Rules

LEOPARD là hệ thống vận hành logistics thông minh, kết hợp tính chính xác trong điều phối với giao diện người dùng hiện đại, tinh tế và trực quan:

- Customer và Driver theo định dạng mobile-first; Fleet Owner/Admin sử dụng giao diện **NexaFleet Modern Bento Dispatch Console**:
  - Tông nền canvas xám sáng thanh lịch (`#F4F5F7` / `#F8FAFC`), tạo độ tương phản cao và tôn vinh các thẻ bento trắng tinh khôi.
  - Hệ thống thẻ nổi màu trắng tinh tế (`bg-white`), bo góc mềm mại `rounded-3xl` (24px–28px), viền mỏng kín đáo `border-slate-100` với đổ bóng êm ái (`shadow-xs` / `shadow-sm`).
  - Topbar nổi bo góc với logo thương hiệu bên trái, cụm điều hướng trung tâm với tab active dạng pill đen tuyền (`bg-slate-900 text-white rounded-full`), chuông thông báo tròn và capsule hồ sơ người dùng bên phải.
  - Bản đồ theo dõi thời gian thực Dark Mode (Real-time tracking map) tích hợp thanh tìm kiếm kính mờ, nút phóng to, zoom `+ / -` và marker bưu kiện 3D / selected pill xanh lục.
  - Bố cục Bento 2 cột trực quan: Cột trái gồm Bản đồ tối & Bảng danh sách đơn hàng có pill filter; Cột phải gồm Tổng quan trạng thái (thanh phân đoạn 4 màu), Hiệu suất thực hiện (cột đứng xanh lục) và Doanh thu vận hành (thẻ gradient hoàng hôn kèm biểu đồ sóng trắng mềm mại).
- Mọi màn hình chính có đầy đủ loading, empty, error, success và permission-denied state.
- ETA luôn dùng nhãn “ETA dự kiến”; dữ liệu demo/mô phỏng phải hiển thị rõ “Dữ liệu mô phỏng”.
- Dữ liệu hiển thị phải phản ánh đúng phạm vi pilot (không đưa các giả định AI XGBoost hay báo cáo ESG ngoài scope vào nghiệp vụ thực).
- Kiểm tra text overflow, overlap, keyboard focus và tương phản màu sắc (WCAG AA) trước khi hoàn tất.

## Verification

Chạy bộ kiểm tra hẹp nhất phù hợp sau mỗi task.

Backend:

```bash
pnpm --filter api test
pnpm --filter api typecheck
pnpm --filter api lint
```

Frontend:

```bash
pnpm --filter web test
pnpm --filter web typecheck
pnpm --filter web lint
```

Trước release:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Nếu script chưa tồn tại, nói rõ và chạy verification gần nhất có sẵn. UI thay đổi phải kiểm tra viewport trong `docs/ui/05-responsive-rules.md`.

## Review Expectations

Trước khi báo hoàn tất, xác nhận:

- Acceptance criteria và test scenario liên quan đạt.
- Không còn P0/P1 issue thuộc phạm vi.
- Không role nào truy cập dữ liệu riêng tư ngoài quyền.
- Dữ liệu persist sau refresh khi liên quan.
- Diff không chứa refactor hoặc generated file không liên quan.
- API/data/UI docs được cập nhật khi behavior thay đổi.
- Không có secret hoặc dữ liệu cá nhân trong code, fixture hay log.

## Subagent Rules

Dùng subagent chủ yếu cho exploration, independent review, test/log analysis, UI review và security review. Không để nhiều agent ghi cùng file nếu không có worktree tách biệt.
