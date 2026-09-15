# Apple Design 2026 Admin Operations Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển đổi toàn diện giao diện Web Operations (`apps/admin`) sang chuẩn thiết kế Apple 2026 (macOS Sequoia / visionOS inspired Bento Dispatch Console), đồng thời loại bỏ hoàn toàn cổng Fleet Owner (`/fleet/**`) bị out-of-scope theo đúng `docs/product/05-out-of-scope.md` để tập trung 100% cho vai trò Quản trị viên (`ADMIN`).

**Architecture:** Giữ vững Next.js App Router (React 19, Tailwind CSS v4, Lucide icons). Loại bỏ route group `(fleet)` và feature `fleet`. Cải tạo `OperationsShell`, hệ thống Bento widgets (`BentoMapCard`, `BentoOrdersCard`, telemetry KPIs), và các trang danh sách/chi tiết (`orders`, `drivers`, `users`, `driver-applications`) theo phong cách Apple 2026: Canvas xám bạc `#F5F5F7`, thẻ bento kính mờ `backdrop-blur-xl bg-white/80`, bo góc `rounded-3xl` (24px) viền mỏng hairline `border-black/[0.06]`, đổ bóng mềm phân tầng, navigation segmented pill bar, và typography SF Pro / Plus Jakarta Sans sắc nét với số liệu Tabular Mono.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Radix UI Dialog, Leaflet, Recharts, Lucide Icons, Jest + React Testing Library.

**Spec Reference:** `docs/ui/12-design-strategy-rules.md`, `docs/product/05-out-of-scope.md`, `docs/ui/03-screen-specs.md`.

## Global Constraints

- **Scope:** Loại bỏ hoàn toàn portal `/fleet/**`. Không đụng vào Backend API của Fleet nếu không cần thiết; chỉ dọn dẹp sạch sẽ code web `apps/admin`.
- **Thiết kế Apple 2026:**
  - Nền canvas: `#F5F5F7` / `#FBFBFD` thanh lịch.
  - Card & Surfaces: `bg-white/80 backdrop-blur-xl border border-black/[0.06] rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.03)]`.
  - Không dùng gradient AI-slop (tím/hồng), không dùng emoji làm biểu tượng hệ thống.
  - Số liệu tiền cước, mã đơn hàng, tọa độ và thời gian bắt buộc dùng font tabular mono (`font-mono tabular-nums`).
  - Nút bấm và badges: Bo góc tròn mềm (radius 12-14px hoặc pill 9999px), viền hairline siêu mảnh, trạng thái hover/active phản hồi tinh tế.
- **Verification:** Chạy `pnpm --filter web test`, `pnpm --filter web typecheck` và `pnpm --filter web lint` qua 100% sau mỗi task.

---

### Task 1: Loại bỏ Portal FLEET_OWNER (Out of Scope) khỏi Apps/Admin

**Files:**
- Delete: `apps/admin/src/app/(fleet)`
- Delete: `apps/admin/src/features/fleet`
- Modify: `apps/admin/src/app/operations-route-guards.test.tsx`
- Modify: `apps/admin/src/lib/auth/role-policy.ts`
- Modify: `apps/admin/src/lib/auth/role-policy.test.ts`
- Modify: `apps/admin/src/lib/auth/server-session.ts`
- Modify: `apps/admin/src/lib/auth/server-session.test.ts`
- Modify: `apps/admin/src/app/api/v1/auth/login/demo/route.ts`
- Modify: `apps/admin/src/features/auth/LoginForm.tsx`
- Modify: `apps/admin/src/features/auth/LoginForm.test.tsx`
- Modify: `apps/admin/src/components/shell/RoleNavigation.test.tsx`
- Modify: `apps/admin/src/app/page.tsx`
- Modify: `apps/admin/src/app/page.test.tsx`

**Interfaces:**
- Consumes: User session chứa `role: 'ADMIN'`.
- Produces: Route guards và session handling chỉ phục vụ Admin, mọi request role khác redirect an toàn.

- [ ] **Step 1: Xóa thư mục route và feature của fleet**

Xóa đĩa:
- `rm -rf apps/admin/src/app/\(fleet\)`
- `rm -rf apps/admin/src/features/fleet`

- [ ] **Step 2: Cập nhật auth/role-policy và server-session loại bỏ fleet_owner**

Trong `apps/admin/src/lib/auth/role-policy.ts`, bỏ nhánh `FLEET_OWNER`.
Trong `apps/admin/src/lib/auth/server-session.ts`, bỏ map demo token `qa-fleet`.
Trong `apps/admin/src/app/page.tsx`, redirect mặc định sang `/admin` thay vì kiểm tra role fleet.

- [ ] **Step 3: Cập nhật LoginForm & demo route**

Trong `apps/admin/src/features/auth/LoginForm.tsx`, bỏ button Demo Fleet Owner, chỉ giữ Demo Admin.
Trong `apps/admin/src/app/api/v1/auth/login/demo/route.ts`, bỏ account `fleet-owner`.

- [ ] **Step 4: Chạy test kiểm tra xem suite web còn sót tham chiếu fleet không**

Run: `pnpm --filter web test`
Expected: PASS toàn bộ các test của auth, shell, admin mà không còn fail do thiếu module fleet.

- [ ] **Step 5: Commit task loại bỏ fleet portal**

```bash
git add apps/admin/
git commit -m "refactor(web): remove out-of-scope fleet owner portal and scope web strictly to admin"
```

---

### Task 2: Nâng cấp Header Bar và Shell theo Chuẩn macOS Sequoia / Apple 2026

**Files:**
- Modify: `apps/admin/src/components/shell/OperationsShell.tsx`
- Modify: `apps/admin/src/components/shell/RoleNavigation.tsx`
- Modify: `apps/admin/src/components/shell/OperationsShell.test.tsx`
- Modify: `apps/admin/src/components/shell/RoleNavigation.test.tsx`
- Modify: `apps/admin/src/app/(admin)/admin/layout.tsx`

**Interfaces:**
- Consumes: `navItems: readonly NavItem[]`, `role: 'admin'`.
- Produces: Floating glass topbar, segmented navigation pill bar phong cách macOS, Spotlight search button với phím tắt `⌘K`, user avatar capsule cao cấp.

- [ ] **Step 1: Viết test cho Shell với phong cách Apple và vai trò thuần Admin**

Cập nhật `OperationsShell.test.tsx` để assert:
- Topbar hiển thị nhãn Admin Dispatch Console.
- Danh mục điều hướng gồm: Tổng quan, Đơn hàng, Người dùng, Đội xe, Tài xế, Duyệt hồ sơ.
- Có nút tìm kiếm Spotlight / quick search `⌘K`.

- [ ] **Step 2: Cải tạo `RoleNavigation.tsx` sang dạng Segmented Control Pill**

Style tabs:
- Bọc container: `bg-slate-200/50 p-1 rounded-full backdrop-blur-md border border-black/[0.04] flex items-center gap-1`.
- Tab active: `bg-slate-900 text-white shadow-xs rounded-full px-4 py-1.5 text-xs font-semibold`.
- Tab inactive: `text-slate-600 hover:text-slate-900 px-3.5 py-1.5 text-xs font-medium transition-colors`.

- [ ] **Step 3: Cải tạo `OperationsShell.tsx` sang Apple Floating Header Bar**

Header nổi với:
- `bg-white/80 backdrop-blur-xl border border-black/[0.06] rounded-2xl sm:rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.03)]`.
- Logo LEOPARD kèm badge `Admin Console` nhỏ tinh tế.
- Spotlight search pill: `bg-slate-100 hover:bg-slate-200/70 border border-slate-200/60 rounded-full px-3 py-1.5 text-xs text-slate-500 flex items-center gap-2`.
- Capsule quản trị viên: avatar tròn, tên Nguyễn Hoài Nam, role Quản trị viên điều phối.

- [ ] **Step 4: Chạy test shell**

Run: `pnpm --filter web test -- src/components/shell/`
Expected: PASS 100%.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/components/shell/ apps/admin/src/app/\(admin\)/admin/layout.tsx
git commit -m "feat(web): redesign operations shell to Apple 2026 floating glass header"
```

---

### Task 3: Redesign Bento Dispatch Console (`/admin`) chuẩn Apple HIG 2026

**Files:**
- Modify: `apps/admin/src/features/admin/AdminOverviewScreen.tsx`
- Modify: `apps/admin/src/components/bento/BentoMapCard.tsx`
- Modify: `apps/admin/src/components/bento/BentoOrdersCard.tsx`
- Modify: `apps/admin/src/components/bento/StatusOverviewCard.tsx`
- Modify: `apps/admin/src/components/bento/FulfillmentPerformanceCard.tsx`
- Modify: `apps/admin/src/components/bento/RevenueOverTimeCard.tsx`
- Modify: `apps/admin/src/components/bento/BentoWidgets.test.tsx`
- Modify: `apps/admin/src/features/admin/AdminScreens.test.tsx`

**Interfaces:**
- Consumes: `AdminOverviewRouteView` (metrics, orderDistribution, recentOrders).
- Produces: Màn hình Bento Dispatch Dashboard chuẩn Apple 2026: 4 thẻ KPI Telemetry tinh xảo, Bản đồ điều phối thời gian thực với thanh tìm kiếm kính mờ, Sổ đơn hàng dạng Cupertino list với status pill, và 3 thẻ phân tích đồ họa sắc sảo.

- [ ] **Step 1: Viết test cho các Bento Card cải tiến**

Cập nhật `BentoWidgets.test.tsx`:
- Kiểm tra các card render với class bo góc `rounded-3xl` và viền `border-black/[0.06]`.
- Đảm bảo hiển thị đầy đủ thông tin cước phí và route của đơn hàng.

- [ ] **Step 2: Nâng cấp 4 thẻ KPI Telemetry phía trên**

Trong `AdminOverviewScreen.tsx`:
- Thiết kế thẻ KPI theo phong cách Apple Settings/Widgets: Nền trắng kính mờ, icon tròn phong cách SF Symbols với nền pastel thương hiệu (`bg-sky-50 text-sky-600`, `bg-emerald-50 text-emerald-600`, `bg-amber-50 text-amber-600`, `bg-indigo-50 text-indigo-600`).
- Số liệu lớn sắc sảo với `font-mono tabular-nums tracking-tight text-2xl font-bold text-slate-900`.

- [ ] **Step 3: Nâng cấp `BentoMapCard.tsx` và `BentoOrdersCard.tsx`**

- `BentoMapCard.tsx`:
  - Thanh tìm kiếm kính mờ góc trên: bo tròn pill `backdrop-blur-md bg-white/85 border border-black/[0.08]`.
  - Cụm điều khiển zoom góc dưới: nút tròn kính mờ nổi bật.
  - Popover đơn hàng trên bản đồ với hiệu ứng glassmorphism.
- `BentoOrdersCard.tsx`:
  - Header với pill filter chuyển trạng thái mượt mà (`Tất cả`, `Chờ tài xế`, `Đang giao`, `Hoàn thành`).
  - Hàng đơn hàng: Avatar khách hàng tròn, Lộ trình Route Spine gọn gàng (`A ➔ B`), Trọng tải/Cước phí chuẩn Tabular Mono, Badge trạng thái Apple pastel chuẩn (`bg-emerald-50 text-emerald-700 border-emerald-200/60`).

- [ ] **Step 4: Nâng cấp `StatusOverviewCard`, `FulfillmentPerformanceCard`, `RevenueOverTimeCard`**

- `StatusOverviewCard`: Thanh phân đoạn 4 màu liên kết mượt mà bo góc tròn.
- `FulfillmentPerformanceCard`: Biểu đồ cột OTD màu xanh ngọc lục bảo bóng bẩy với KPI nổi bật.
- `RevenueOverTimeCard`: Thẻ gradient hoàng hôn Apple ấm áp kết hợp biểu đồ sóng doanh thu mềm mại.

- [ ] **Step 5: Chạy test Bento Widgets và Overview Screen**

Run: `pnpm --filter web test -- src/features/admin/AdminScreens.test.tsx src/components/bento/BentoWidgets.test.tsx`
Expected: PASS 100%.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src/features/admin/AdminOverviewScreen.tsx apps/admin/src/components/bento/
git commit -m "feat(web): elevate Bento dispatch console to Apple 2026 aesthetics"
```

---

### Task 4: Chuẩn hóa các Trang Danh mục & Chi tiết Quản trị (`orders`, `drivers`, `users`, `driver-applications`)

**Files:**
- Modify: `apps/admin/src/features/admin/AdminListScreen.tsx`
- Modify: `apps/admin/src/features/admin/AdminOrderDetailScreen.tsx`
- Modify: `apps/admin/src/features/admin/DriverApplicationsScreen.tsx`
- Modify: `apps/admin/src/features/admin/AdminShared.tsx`
- Modify: `packages/ui/src/DataTable.tsx`
- Modify: `packages/ui/src/StatusBadge.tsx`

**Interfaces:**
- Consumes: Admin list views và order detail view.
- Produces: Bảng dữ liệu Apple Data Table (hairline dividers, subtle zebra/hover, badge status iOS pastel), thanh lọc dữ liệu Filter bar dạng pill, và màn hình chi tiết đơn hàng chuẩn hoá nghiệp vụ (Route Spine, POD inspection, Audit actions).

- [ ] **Step 1: Viết test cho Admin List & Detail Screen**

Cập nhật `AdminScreens.test.tsx` và `DriverApplicationsScreen.test.tsx` để bảo đảm các component render mượt mà không lỗi DOM hoặc CSS.

- [ ] **Step 2: Nâng cấp `AdminListScreen.tsx` & `DataTable.tsx`**

- Thẻ bao ngoài bảng: `bg-white/90 backdrop-blur-xl border border-black/[0.06] rounded-3xl p-5 shadow-xs`.
- Header bảng: `text-xs font-semibold uppercase tracking-wider text-slate-400 py-3 border-b border-slate-100`.
- Hàng dữ liệu: Hover nhẹ nhàng `hover:bg-slate-50/70 transition-colors`, đường kẻ hairline `border-b border-slate-100/80`.
- Bộ lọc Filter Bar: Ô tìm kiếm và select bo tròn `rounded-xl bg-slate-50 border border-slate-200/80 focus:bg-white`.

- [ ] **Step 3: Nâng cấp `AdminOrderDetailScreen.tsx`**

- Chia layout 2 cột Bento trực quan: Cột trái (Lộ trình Route Spine, Bản đồ Tracking PostGIS, Chứng từ giao hàng e-POD), Cột phải (Chi tiết cước & Thanh toán VietQR, Lịch sử trạng thái và Bàn phím lệnh Admin Command Audit Rail).
- Card chi tiết bo góc `rounded-3xl` viền hairline sang trọng.

- [ ] **Step 4: Chạy test toàn diện các màn hình Admin**

Run: `pnpm --filter web test -- src/features/admin/`
Expected: PASS 100%.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/features/admin/ packages/ui/
git commit -m "feat(web): align admin list, order detail, and driver review screens with Apple design"
```

---

### Task 5: Kiểm thử Tổng thể & Build Verification

**Files:**
- Verify: Toàn bộ project `apps/admin` và workspace packages liên quan.

- [ ] **Step 1: Chạy toàn bộ test unit của web**

Run: `pnpm --filter web test`
Expected: PASS toàn bộ test suites, không có console error nghiêm trọng.

- [ ] **Step 2: Chạy typecheck và lint**

Run: `pnpm --filter web typecheck && pnpm --filter web lint`
Expected: 0 errors, 0 warnings blocking.

- [ ] **Step 3: Chạy Next.js build**

Run: `pnpm --filter web build`
Expected: Build thành công trang tĩnh và preview routes.

- [ ] **Step 4: Commit và hoàn tất**

```bash
git add .
git commit -m "chore(web): verify complete Apple 2026 admin web redesign and test suite"
```
