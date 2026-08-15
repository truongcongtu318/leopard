# LEOPARD UI/UX Design Specification

- **Date:** 2026-08-08
- **Status:** Approved
- **Scope:** Toàn bộ hệ thống — 4 role × 2 platform (Mobile Expo + Web Next.js)
- **Design Direction:** Hài hòa — 40% Industrial, 35% Modern SaaS, 25% Văn hóa Việt Nam

---

## 1. Design Principles

1. Mobile-first: Customer và Driver ưu tiên mobile. Fleet Owner và Admin dùng web.
2. Data-dense nhưng có personality: thông tin dày, thao tác nhanh, nhưng có hồn Việt qua họa tiết, màu sắc, typography.
3. Light mode mặc định: tối ưu đọc ngoài trời nắng. Dark mode là tùy chọn.
4. Semantic color: mỗi trạng thái có màu riêng, luôn kèm text/icon.
5. Design system dùng chung tokens, components riêng từng platform nếu cần thiết.
6. Họa tiết Đông Sơn cách điệu xuyên suốt 5 vị trí: splash, empty state, header accent, icon/badge, loading skeleton.
7. Mọi màn hình phải có 5 state: loading, empty, error, success, offline.
8. Không gradient tím, không glassmorphism, không decorative hero, không marketing cards.

---

## 2. Visual Foundation

### 2.1 Color Palette — "Nhiệt Đới Xanh"

Cảm hứng từ ruộng lúa, trời xanh, sông nước Việt Nam.

**Brand Palette — 4 màu chính (đồng bộ canvas Stitch):**

| Màu | Hex | Vai trò |
|-----|-----|---------|
| **Primary** | `#0F766E` | Màu brand chính — primary actions, header, accent |
| **Secondary** | `#CCFBF1` | Màu phụ — selected bg, badge, nền nhẹ |
| **Tertiary** | `#9C573A` | Màu nhấn ấm — họa tiết Đông Sơn, icon, highlight |
| **Neutral** | `#747877` | Màu trung tính — text phụ, border, icon mặc định |

> Mỗi màu có thang tint/shade **T0 → T100** (T0 = `#000000`, T100 = `#FFFFFF`).

**Light Mode (mặc định)**

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-brand` | `#0F766E` | Primary actions, header, brand accents |
| `--color-brand-soft` | `#CCFBF1` | Selected state background, brand badge |
| `--color-brand-text` | `#FFFFFF` | Text on brand background |
| `--color-brand-soft-text` | `#115E59` | Text on brand-soft background |
| `--color-success` | `#16A34A` | DELIVERED, PAID — surface |
| `--color-success-text` | `#14532D` | Success text |
| `--color-success-border` | `#15803D` | Success border |
| `--color-warning` | `#FEF3C7` | PICKING_UP, UNPAID — surface |
| `--color-warning-text` | `#78350F` | Warning text |
| `--color-warning-border` | `#B45309` | Warning border |
| `--color-danger` | `#FEE2E2` | CANCELLED, destructive — surface |
| `--color-danger-text` | `#7F1D1D` | Danger text |
| `--color-danger-border` | `#B91C1C` | Danger border |
| `--color-info` | `#E0F2FE` | REQUESTED, ETA info — surface |
| `--color-info-text` | `#075985` | Info text |
| `--color-info-border` | `#0369A1` | Info border |
| `--color-active` | `#DBEAFE` | ACCEPTED, IN_TRANSIT — surface |
| `--color-active-text` | `#1E3A8A` | Active text |
| `--color-active-border` | `#1D4ED8` | Active border |
| `--color-neutral` | `#F8FAFC` | Page background |
| `--color-neutral-surface` | `#F1F5F9` | Card/section background |
| `--color-neutral-text` | `#0F172A` | Primary text |
| `--color-neutral-muted` | `#64748B` | Secondary text |
| `--color-neutral-border` | `#E2E8F0` | Borders, dividers |

**Dark Mode** — invert surface/text, keep semantic colors:

| Token | Light | Dark |
|-------|-------|------|
| `--color-neutral` | `#F8FAFC` | `#0F172A` |
| `--color-neutral-surface` | `#F1F5F9` | `#1E293B` |
| `--color-neutral-text` | `#0F172A` | `#F8FAFC` |
| `--color-neutral-muted` | `#64748B` | `#94A3B8` |
| `--color-neutral-border` | `#E2E8F0` | `#334155` |

### 2.2 Typography

| Role | Font | Weight | Size Range |
|------|------|--------|------------|
| Headings (H1-H6) | **Crimson Pro**, Georgia, serif | 600-700 | 20px–48px |
| Body / UI | **Be Vietnam Pro**, system-ui, sans-serif | 400-500 | 12px–16px |
| Monospace (mã đơn, số liệu) | **JetBrains Mono**, monospace | 400 | 12px–14px |

**Type Scale:** 12 / 14 / 16 / 18 / 20 / 24 / 32 / 40 / 48 px

**Tiếng Việt:** Cả Crimson Pro và Be Vietnam Pro đều hỗ trợ đầy đủ dấu thanh tiếng Việt. Be Vietnam Pro được thiết kế riêng cho tiếng Việt — dấu thanh sắc nét ở mọi kích thước.

### 2.3 Spacing, Radius, Shadow

```
Spacing:  4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 px
Radius:   6px (controls, cards) / 9999px (pill badges)
Shadow:
  card:   0 1px 2px rgba(0,0,0,0.06)
  modal:  0 4px 12px rgba(0,0,0,0.12)
  drawer: 0 8px 24px rgba(0,0,0,0.16)
Touch target:
  Mobile: 44×44 px minimum
  Desktop: 40 px height controls
Content max-width:
  Customer/Driver: 768 px
  Admin/Fleet Owner: 1440 px
```

### 2.4 Dong Son Pattern Library

Tất cả patterns là SVG inline trong `packages/ui/src/patterns/`. Không phụ thuộc external assets.

| Pattern | File | Usage |
|---------|------|-------|
| `PatternSun` | `pattern-sun.tsx` | Loading spinner, splash screen logo |
| `PatternWave` | `pattern-wave.tsx` | Section divider, card accent bottom border |
| `PatternStar` | `pattern-star.tsx` | Badge icon, empty state illustration, favicon |
| `PatternRice` | `pattern-rice.tsx` | Full-page background pattern (opacity 3-5%) |

Họa tiết geometric tối giản — hình tròn, chấm, đường thẳng, đối xứng. Cảm hứng từ trống đồng Đông Sơn nhưng cách điệu phẳng, hiện đại.

**Vị trí áp dụng trong UI:**
1. **Splash screen & Onboarding** (3 slides) — logo + họa tiết làm background, onboarding dùng illustration Đông Sơn
2. **Empty states** — tất cả empty/error state dùng illustration phong cách Đông Sơn Đương Đại
3. **Header accent & Divider** — PatternWave làm divider giữa header và content, PatternRice làm nền card (opacity 3-5%)
4. **Icon system & Badge** — bộ icon lấy cảm hứng hình học Đông Sơn, nét dày, dễ nhận diện
5. **Loading skeleton & Animation** — skeleton shimmer dạng sóng nước, spinner dạng mặt trời Đông Sơn quay

---

## 3. Illustration Style — "Đông Sơn Đương Đại"

Kết hợp họa tiết Đông Sơn (hình học, đối xứng) với phong cách flat-art hiện đại.

- **Hình khối:** Nhân vật, xe cộ, địa điểm được stylized thành các khối hình học cơ bản (tròn, vuông, tam giác)
- **Màu sắc:** Dùng palette Nhiệt Đới Xanh, màu phẳng, không gradient
- **Chi tiết văn hóa:** Nón lá, xe máy, phố cổ, cây cối nhiệt đới — đơn giản hóa thành silhouette hình học
- **Định dạng:** SVG inline, responsive, không phụ thuộc external assets
- **Dùng cho:** Empty states, onboarding slides, error states, permission denied pages

---

## 4. Motion Language

| Interaction | Animation | Duration | Easing |
|-------------|-----------|----------|--------|
| Page transition | Slide từ phải + fade | 250ms | ease-out |
| Modal / Bottom sheet | Slide từ dưới | 300ms | cubic-bezier(0.16, 1, 0.3, 1) |
| Status change | Badge pulse + màu transition | 400ms | ease-in-out |
| List item add/remove | Fade + scale + slide | 300ms | ease-out |
| Loading skeleton | Sóng nước shimmer (PatternWave) | ∞ | linear |
| Button press | Scale 0.97 + ripple | 150ms | ease-out |
| Toast appear/disappear | Slide từ trên + fade | 200ms | ease-out |
| Pull to refresh | PatternSun spinner quay | ∞ | linear |

**Nguyên tắc:**
- Animate compositor-friendly properties: transform, opacity
- Tôn trọng `prefers-reduced-motion`
- Mobile dùng Reanimated cho animation UI-thread

---

## 5. Navigation Architecture

### 5.1 Mobile (Customer + Driver)

**Customer — 4 Bottom Tabs:**
| Tab | Route | Nội dung |
|-----|-------|----------|
| 📋 Đơn hàng | `/customer/orders` | Danh sách đơn + filter tabs (Tất cả, Đang xử lý, Hoàn thành) |
| 🗺️ Đặt đơn | `/customer/orders/new` | Form tạo đơn: địa chỉ, loại xe, ETA, giá |
| 🔔 Thông báo | `/customer/notifications` | Danh sách thông báo: trạng thái đơn, tin nhắn |
| 👤 Tài khoản | `/customer/profile` | Thông tin cá nhân, lịch sử, cài đặt |

**Driver — 3 Bottom Tabs:**
| Tab | Route | Nội dung |
|-----|-------|----------|
| 🏠 Tổng quan | `/driver/overview` | Availability toggle, KPI hôm nay, active banner, available orders |
| 📋 Đơn hàng | `/driver/orders` | Lịch sử đơn đã nhận |
| 👤 Tài khoản | `/driver/profile` | Thông tin, đánh giá, cài đặt |

**Navigation pattern:** Bottom tabs (max 4 items), sticky. Sau login, backend `role` quyết định route mặc định.

### 5.2 Web (Fleet Owner + Admin)

**Fleet Owner — 4 Sidebar Items:**
| Mục | Route | Nội dung |
|-----|-------|----------|
| 📊 Tổng quan | `/fleet` | Fleet KPIs, driver availability, alerts |
| 🏍️ Tài xế | `/fleet/drivers` | Table/list drivers, status, active order |
| 📋 Đơn hàng | `/fleet/orders` | Server pagination, filter status/driver/date |
| 📈 Báo cáo | `/fleet/reports` | Revenue chart, driver performance |

**Admin — 6 Sidebar Items (đồng bộ canvas Stitch):**
| Mục | Route | Nội dung |
|-----|-------|----------|
| 📊 Tổng quan | `/admin` | Operation KPIs, status breakdown, alerts |
| 🚚 Vận tải | `/admin/transport` | Quản lý vận tải |
| 🏬 Kho bãi | `/admin/warehouse` | Quản lý kho bãi |
| 📋 Đơn hàng | `/admin/orders` | Table, sort, filter, bulk actions |
| 🏍️ Tài xế | `/admin/drivers` | Search, filter, status management |
| ⚙️ Cài đặt | `/admin/settings` | System config, rate cards |

> Footer sidebar: **Hỗ trợ** + **Đăng xuất**. Nút **"Tạo vận đơn mới"** ở đầu sidebar.

**Sidebar behavior:** Cố định từ 1024px. Tablet/mobile dùng drawer (hamburger menu). Sidebar có logo LEOPARD + PatternWave divider + PatternRice accent ở góc dưới.

---

## 6. Component Architecture

### 6.1 Shared Components (`packages/ui/`)

| Component | State | Sub-components |
|-----------|-------|----------------|
| **Button** | `primary`, `secondary`, `destructive`, `icon`, `loading` | — |
| **StatusBadge** | Maps to OrderStatus enum | Text + icon + color |
| **ScreenState** | `loading`, `empty`, `error`, `offline`, `permission-denied` | Skeleton, Illustration, Alert |
| **DataTable** | `loading`, `empty`, `error` | Sortable headers, selection |
| **Pagination** | Page numbers, prev/next | — |
| **FilterBar** | Active filters, clear all | Filter chips |
| **MapPanel** | `loading`, `error` | Skeleton, retry |
| **Input** | `default`, `error`, `disabled` | Label, hint, error inline |
| **Select** | `default`, `error`, `disabled` | Label, hint, error |
| **Textarea** | `default`, `error`, `disabled` | Label, hint, error |
| **OrderTimeline** | Steps from OrderStateMachine | Icon, time, description |
| **RouteSummary** | Route stops, distances, ETA | Stop items, total summary |
| **PaymentStatus** | Maps to PaymentStatus enum | Badge + amount |
| **Dialog** | `confirm`, `alert` | Overlay, actions |
| **Toast** | `success`, `error`, `warning`, `info` | Auto-dismiss, action |
| **Alert** | `error`, `warning`, `info` | Dismissable, icon |

### 6.2 Mobile-Native Components (`apps/mobile/src/ui/`)

| Component | Mục đích |
|-----------|----------|
| **BottomSheet** | Select, filter, confirm (thay Dialog trên mobile) |
| **SwipeableRow** | Swipe để hiện action nhanh trên list item |
| **AvailabilityToggle** | Driver bật/tắt ONLINE với animation |
| **ActiveOrderBanner** | Banner đơn đang chạy luôn visible ở đầu màn hình |
| **PullToRefresh** | Kéo xuống refresh (dùng PatternSun spinner) |
| **QuickActionFab** | Floating action button cho action chính (Đặt đơn mới) |

### 6.3 Web-Native Components (`apps/admin/src/components/`)

| Component | Mục đích |
|-----------|----------|
| **CommandPalette** | Ctrl+K tìm kiếm nhanh (đơn hàng, người dùng, cài đặt) |
| **ColumnResize** | Kéo thả chỉnh độ rộng cột DataTable |
| **BulkActionBar** | Thanh action xuất hiện khi chọn nhiều dòng |
| **DateRangePicker** | Lọc theo khoảng thời gian |
| **ExportButton** | Xuất CSV/Excel cho báo cáo |

### 6.4 Shared Hooks (`packages/ui/src/hooks/`)

| Hook | Purpose |
|------|---------|
| `useOrderState` | State machine validation cho order lifecycle transitions |
| `useEstimateToken` | Validate estimate token trước khi submit đơn |
| `useSessionRefresh` | Refresh token rotation logic |
| `useRoleAccess` | Permission check cho UI conditional rendering |

---

## 7. Screen Specifications (Tóm tắt)

### 7.1 Login (Mobile + Web)

- Phone/Firebase OTP flow hoặc demo account selector (khi `ALLOW_DEMO=true`)
- States: submitting, invalid-credential, provider-unavailable, session-expired
- Splash background: PatternSun + PatternRice (opacity 5%), logo LEOPARD ở giữa
- Onboarding: 3 slides với illustration Đông Sơn Đương Đại

### 7.2 Customer Screens (Mobile)

#### Danh sách đơn hàng
- 3 tab filters: Tất cả / Đang xử lý / Hoàn thành
- Order card: status badge, route summary (📍→🏁), vehicle type, distance, price
- Swipe để xem nhanh action
- FAB "+ Đặt đơn mới" góc phải dưới
- Empty: illustration shipper Đông Sơn + "Bạn chưa có đơn hàng nào"
- Loading: 3 skeleton cards với shimmer sóng nước

#### Tạo đơn hàng mới (wizard 3 bước — đồng bộ canvas Stitch)
- **Bước 1:** Address search với autocomplete (Vietmap), điểm đi/đến
- **Bước 2:** Thêm điểm dừng (tùy chọn, tối đa 5), chọn loại xe: segmented control (🛵 Xe máy / 📦 Xe tải / 🚛 Xe lớn)
- **Bước 3:** Ghi chú hàng hóa, xác nhận ETA & Giá, submit đơn
- Demo label: "⚠️ Dữ liệu mô phỏng" khi source là DEMO
- Submit button disabled đến khi có estimate token hợp lệ

#### Chi tiết đơn hàng
- OrderTimeline: các bước từ PENDING → DELIVERED
- MapPanel: vị trí driver realtime (khi IN_TRANSIT)
- RouteSummary: điểm đi, dừng, đến + khoảng cách
- Driver info: tên, đánh giá, SĐT (khi đã ACCEPTED)
- Payment info: số tiền, trạng thái thanh toán
- Cancel button (chỉ khi PENDING)

### 7.3 Driver Screens (Mobile)

#### Tổng quan
- AvailabilityToggle: ● ONLINE / ○ OFFLINE với animation pulse
- KPI hôm nay: thu nhập, số đơn, đánh giá trung bình
- ActiveOrderBanner: đơn đang chạy (nếu có), màu active, CTA "Tiếp tục giao"
- Danh sách đơn khả dụng: card với route, distance, giá, swipe để nhận đơn
- Empty: illustration + "Không có đơn hàng khả dụng"

#### Chi tiết đơn (đang chạy)
- MapPanel full-width với route line và marker
- RouteSummary: các điểm + khoảng cách
- OrderTimeline: các bước đã/đang/sẽ hoàn thành
- Hàng hóa: ghi chú + SĐT khách (ẩn một phần)
- Sticky bottom: action button cho next state (THEO STATE MACHINE)
  - ACCEPTED → "Đã lấy hàng" → PICKED_UP
  - PICKED_UP → "Bắt đầu giao" → IN_TRANSIT
  - IN_TRANSIT → "Đã giao hàng" → DELIVERED (yêu cầu delivery proof)

### 7.4 Fleet Owner Screens (Web)

#### Tổng quan
- 4 KPI cards: doanh thu hôm nay, tổng đơn, tỉ lệ hoàn thành, đánh giá TB
- Danh sách tài xế: trạng thái, đơn đang chạy
- Đơn hàng gần đây: DataTable mini
- Cảnh báo: đơn quá hạn, tài xế offline lâu

#### Báo cáo
- DateRangePicker
- Biểu đồ doanh thu theo ngày/tuần/tháng
- Bảng hiệu suất tài xế: đơn, doanh thu, đánh giá
- ExportButton: xuất CSV

### 7.5 Admin Screens (Web)

#### Tổng quan
- KPI vận hành: đơn theo status (4 cards), lỗi cần chú ý
- DataTable đơn hàng gần đây
- Alert list: đơn quá hạn, bất thường

#### Quản lý tài xế (Admin)
- DataTable: tên tài xế, SĐT, đội xe, trạng thái, số đơn hôm nay, đánh giá
- FilterBar: tìm kiếm (tên/SĐT), trạng thái (Online/Offline/Disabled), đội xe
- Action: xem chi tiết, khóa/mở khóa tài xế
- Pagination server-side

#### Quản lý người dùng
- DataTable người dùng + filter + status management

#### Cài đặt hệ thống
- 3 sections: **Cấu hình chung** (đăng ký Demo, số đơn/ngày, phí nền tảng %), **Bảo mật** (2FA, hết hạn OTP, đăng nhập sai tối đa), **Thông báo hệ thống** (SMS, Email, Push)
- Nút "Lưu cài đặt" ở dưới

### 7.5b Error States (dùng chung)

- **403 — Từ chối truy cập:** banner LEOPARD + nút "Quay về trang chủ"
- **404 — Không tìm thấy trang:** icon "?" + nút "Quay về trang chủ"
- **500 — Lỗi máy chủ:** nút "Thử lại" + "Liên hệ hỗ trợ"

### 7.6 State Requirements (All Screens)

| State | Implementation |
|-------|---------------|
| **Loading** | Skeleton đúng hình dạng (card, row, table), giữ layout, shimmer sóng nước |
| **Empty** | Illustration Đông Sơn + text hướng dẫn + CTA (nếu applicable) |
| **Error** | Alert với message thân thiện + requestId + nút retry |
| **Success** | Cập nhật data nguồn + toast ngắn (200ms) |
| **Permission denied** | Illustration + redirect về home của role |
| **Offline** | Banner vàng "Đang offline" + giữ data cũ + tự động retry khi online |
| **Session expired** | Lưu draft form vào sessionStorage → redirect login |

---

## 8. Screens Inventory — Đã thiết kế trên Stitch

> Đồng bộ với canvas Stitch (project `9197524441544415939`). Tổng cộng **30 màn hình**.

### Onboarding & Login (7 màn hình)
| # | Screen | Platform | Role | Priority |
|---|--------|----------|------|----------|
| 1 | Onboarding Slide 1 | Mobile | All | P0 |
| 2 | Onboarding Slide 2 | Mobile | All | P0 |
| 3 | Onboarding Slide 3 | Mobile | All | P0 |
| 4 | Đăng nhập | Mobile | All | P0 |
| 5 | Xác thực OTP | Mobile | All | P0 |
| 6 | Chọn tài khoản Demo | Mobile | All | P0 |
| 7 | Đăng nhập Desktop | Web | All | P0 |

### Customer (Mobile — 7 màn hình)
| # | Screen | Role | Priority |
|---|--------|------|----------|
| 8 | Danh sách đơn hàng | Customer | P0 |
| 9 | Tạo đơn hàng — Bước 1 | Customer | P0 |
| 10 | Tạo đơn hàng — Bước 2 | Customer | P0 |
| 11 | Tạo đơn hàng — Bước 3 | Customer | P0 |
| 12 | Chi tiết đơn hàng — REQUESTED | Customer | P0 |
| 13 | Thông báo | Customer | P1 |
| 14 | Tài khoản (Profile) | Customer | P1 |

### Driver (Mobile — 4 màn hình)
| # | Screen | Role | Priority |
|---|--------|------|----------|
| 15 | Tổng quan Tài xế | Driver | P0 |
| 16 | Chi tiết đơn đang giao | Driver | P0 |
| 17 | Lịch sử giao hàng | Driver | P1 |
| 18 | Tài khoản (Profile) | Driver | P1 |

### Fleet Owner (Web — 4 màn hình)
| # | Screen | Role | Priority |
|---|--------|------|----------|
| 19 | Tổng quan | Fleet Owner | P0 |
| 20 | Quản lý tài xế | Fleet Owner | P1 |
| 21 | Quản lý đơn hàng | Fleet Owner | P1 |
| 22 | Báo cáo | Fleet Owner | P1 |

### Admin (Web — 5 màn hình)
| # | Screen | Role | Priority |
|---|--------|------|----------|
| 23 | Admin Dashboard (Tổng quan) | Admin | P0 |
| 24 | Quản lý đơn hàng | Admin | P1 |
| 25 | Quản lý người dùng | Admin | P1 |
| 26 | Quản lý tài xế | Admin | P1 |
| 27 | Cài đặt hệ thống | Admin | P2 |

### Error States (3 màn hình — dùng chung)
| # | Screen | Role | Priority |
|---|--------|------|----------|
| 28 | 403 — Từ chối truy cập | All | P1 |
| 29 | 404 — Không tìm thấy trang | All | P1 |
| 30 | 500 — Lỗi máy chủ | All | P1 |

### Design System Assets (trên canvas)
- Color palette **Nhiệt Đới Xanh** (Primary `#0F766E`, Secondary `#CCFBF1`, Tertiary `#9C573A`, Neutral `#747877` + thang T0→T100)
- Typography showcase (Crimson Pro, Be Vietnam Pro, JetBrains Mono)
- Component previews (Button, Input, Select, Toggle, Icon)
- Spec article `2026-08-08-leopard-ui-ux-design.md`

---

## 9. Implementation Plan

### Strategy: Hybrid A ∩ C
Kết hợp xây dựng design system nền tảng trước, rồi prototype flow chính, rồi mở rộng toàn bộ.

### Phase 1: Design System Core (estimated 2 days)

| # | Task | Output | Files |
|---|------|--------|-------|
| 1.1 | Mở rộng `tokens.css` | Palette Nhiệt Đới Xanh, Crimson Pro + Be Vietnam Pro, spacing, shadow, motion tokens | `packages/ui/src/tokens.css` |
| 1.2 | SVG Pattern Library | 4 pattern components | `packages/ui/src/patterns/` |
| 1.3 | 6 missing components | Input, Select, Textarea, OrderTimeline, RouteSummary, PaymentStatus | `packages/ui/src/` |
| 1.4 | Dialog, Toast, Alert | Overlay components | `packages/ui/src/` |
| 1.5 | Shared hooks | useOrderState, useEstimateToken, useRoleAccess | `packages/ui/src/hooks/` |

### Phase 2: Flow Prototype (estimated 3 days)

| # | Task | Platform | Output |
|---|------|----------|--------|
| 2.1 | Customer: Danh sách đơn | Mobile | `apps/mobile/app/(customer)/orders/index.tsx` |
| 2.2 | Customer: Tạo đơn mới | Mobile | `apps/mobile/app/(customer)/orders/new.tsx` |
| 2.3 | Customer: Chi tiết đơn | Mobile | `apps/mobile/app/(customer)/orders/[id].tsx` |
| 2.4 | Driver: Tổng quan | Mobile | `apps/mobile/app/(driver)/index.tsx` |
| 2.5 | Driver: Chi tiết đơn | Mobile | `apps/mobile/app/(driver)/orders/[id].tsx` |
| 2.6 | Mobile-native components | Mobile | BottomSheet, SwipeableRow, AvailabilityToggle, ActiveOrderBanner |
| 2.7 | Admin: Dashboard | Web | `apps/admin/src/app/(admin)/admin/page.tsx` |
| 2.8 | Admin: Orders table | Web | `apps/admin/src/app/(admin)/admin/orders/page.tsx` |
| 2.9 | Web-native components | Web | CommandPalette, ColumnResize, BulkActionBar, DateRangePicker |

### Phase 3: Full Expansion (estimated 3-4 days)

| # | Task | Platform |
|---|------|----------|
| 3.1 | Customer: Thông báo, Profile | Mobile |
| 3.2 | Driver: History, Profile | Mobile |
| 3.3 | Admin: Users, Fleets, Settings | Web |
| 3.4 | Fleet Owner: Tổng quan, Drivers, Orders, Báo cáo | Web |
| 3.5 | Dark mode — hoàn thiện theme tokens | Both |
| 3.6 | Empty state illustrations Đông Sơn | Both |
| 3.7 | Onboarding flow (3 slides) | Mobile |
| 3.8 | Accessibility audit (WCAG AA) | Both |

---

## 10. Quality Gates

Per screen, before marking complete:
- [ ] 5 states implemented: loading, empty, error, success, offline
- [ ] Touch targets ≥ 44×44 px (mobile) / controls ≥ 40 px height (desktop)
- [ ] WCAG AA contrast on all text
- [ ] Pattern/motion respects `prefers-reduced-motion`
- [ ] No horizontal overflow on 360 px viewport
- [ ] Tested at: 360×800, 390×844, 768×1024, 1024×768, 1440×900
- [ ] All text in Vietnamese (except technical terms)
- [ ] Data-dense views maintain readability
- [ ] Dong Son patterns used at correct positions per Section 2.4

---

## 11. References

- [UI Principles](../ui/01-ui-principles.md)
- [Navigation Map](../ui/02-navigation-map.md)
- [Screen Specifications](../ui/03-screen-specs.md)
- [Design System](../ui/04-design-system.md)
- [Responsive Rules](../ui/05-responsive-rules.md)
- [UI States](../ui/06-empty-loading-error-states.md)
- [OpenAPI Spec](../api/01-rest-api-spec.md)
- [Database Design](../data/01-database-design.md)
