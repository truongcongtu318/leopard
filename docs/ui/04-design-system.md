# LEOPARD Core Design System

> **Trạng thái:** Wave 4 core contract
>
> **Audit baseline:** `198bd42` (`2026-08-15`)
>
> **Áp dụng cho:** Customer, Driver, Fleet Owner và Admin

Tài liệu này mở rộng các semantics đã duyệt trong `docs/ui/01-ui-principles.md` đến
`docs/ui/06-empty-loading-error-states.md`; không thay thế SRS, acceptance criteria,
API contract hoặc business rules phía backend. Khi có xung đột, thứ tự source of
truth trong `AGENTS.md` vẫn được giữ nguyên.

## 1. Mục đích và hướng thiết kế

LEOPARD là công cụ vận hành logistics ở mức pilot. Design system phải giúp người
dùng nhận ra việc cần làm, trạng thái chuyến và ngoại lệ nhanh hơn; không tối ưu cho
trang giới thiệu hoặc trình diễn thương hiệu.

| Thuộc tính       | Core direction                                                                                                             |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Purpose          | Giảm thời gian quét, giảm thao tác sai và giữ ngữ cảnh order/route xuyên suốt journey                                      |
| Audience         | Customer thỉnh thoảng tạo đơn; Driver thao tác ngoài hiện trường; Fleet Owner và Admin lặp lại workflow vận hành hằng ngày |
| Tone             | Bình tĩnh, kỹ thuật vừa đủ, trực tiếp và đáng tin cậy                                                                      |
| Density          | Guided/comfortable trên Customer; action-first trên Driver; compact/scannable trên Fleet/Admin                             |
| First scan       | Current task → order status/route → exception → supporting metadata                                                        |
| Memorable detail | `Route Spine`, một motif chức năng nối pickup–stops–dropoff và tiến trình chuyến                                           |
| Constraints      | Mobile-first, WCAG AA, tiếng Việt rõ nghĩa, responsive, fixture có nhãn và backend sở hữu business rules                   |

Operational clarity có nghĩa là:

- Màn hình đầu tiên là workflow thật, không phải hero hoặc marketing copy.
- Một decision point chỉ có một primary action; action phụ không cạnh tranh thị giác.
- Status, ownership/scope, ETA source và độ mới dữ liệu luôn nằm gần nội dung chúng
  mô tả.
- Fleet/Admin ưu tiên exception và khả năng quét; Customer ưu tiên hướng dẫn tuần tự;
  Driver ưu tiên current state và đúng một next action.
- UI chỉ phản ánh permission, lifecycle, giá, ETA và payment state do backend trả về.

### 1.1 Visual language — NexaFleet Modern Bento Dispatch Console

`Operational clarity` phải nhìn thấy được trong composition, không chỉ tồn tại trong
component API. Visual language của LEOPARD trên nền tảng web điều hành (Admin và Fleet)
được nâng cấp toàn diện theo chuẩn **NexaFleet Modern Bento Dispatch Console**: giao diện bàn điều phối
logistics thông minh, tinh tế với hệ thống thẻ bento trắng nổi khối trên nền xám sáng thanh lịch,
kết hợp bản đồ Dark Mode thời gian thực và các khối telemetry giàu tính trực quan.

| Layer            | Cách thể hiện                                                                                | Không được làm                                      |
| ---------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Modern Canvas    | Nền xám sáng tối giản hiện đại (`#F4F5F7` / `#F8FAFC`), tạo độ tương phản cao cho thẻ bento | Dùng màu nền quá sặc sỡ hoặc hiệu ứng tối mù mịt    |
| Elevated Cards   | Thẻ trắng tinh khôi (`bg-white`), bo góc `rounded-3xl` (24–28px), viền mỏng `border-slate-100`, shadow êm (`shadow-xs` / `shadow-sm`)| Dùng viền hộp thô cứng hoặc bóng mờ quá đà che nội dung |
| Topbar & Dock    | Header nổi bo góc với logo LEOPARD, cụm pill navigation trung tâm với tab active đen tuyền (`bg-slate-900 text-white rounded-full`), chuông tròn và user capsule | Che khuất tầm nhìn bản đồ hoặc lạm dụng menu đa cấp |
| Real-time Map    | Bản đồ Dark Mode vector trực quan hóa mạng lưới logistics Đà Nẵng, thanh search kính mờ, zoom controls và marker bưu kiện 3D / selected pill xanh lục | Để map fallback thành hình chữ nhật trống           |
| Bento Widgets    | Bộ 5 widget bento chuẩn: Map tối, Bảng đơn hàng có pill filter, Status Overview (thanh phân đoạn 4 màu), Fulfillment (cột xanh lục), và Revenue (gradient hoàng hôn + sóng trắng) | Dùng biểu đồ giả không gắn với nghiệp vụ vận hành   |

Tỷ lệ thị giác mặc định là **canvas xám sáng tối giản làm nền, thẻ trắng tinh khôi bo góc lớn tạo không gian làm việc,
tab và filter active dùng pill đen tuyền tương phản cao, emerald chỉ báo vận chuyển và hiệu suất, magenta chỉ báo đã giao,
amber/coral cho xếp/dỡ hàng, và gradient hoàng hôn cho doanh thu**.

Silhouette theo role:

- **Customer — Journey Sheet:** route và bước hiện tại dẫn flow; estimate/price tạo
  một data strip dễ so sánh; form dài chia thành stage có số, không thành một dải input.
- **Driver — Field Cockpit:** active trip/current task nằm trên dispatch slab tương
  phản cao; next action ở vùng ngón cái; tracking/proof là signal module nhìn một lần
  biết có đang chặn hoàn tất hay không.
- **Fleet — Bento Scope Ledger:** Bố cục Bento Dispatch Console chuẩn NexaFleet với
  `FleetScopeRail` bảo toàn phạm vi đội xe; bản đồ, bảng đơn hàng, chỉ số trạng thái và doanh thu
  được giới hạn chuẩn xác theo các phương tiện và đơn hàng thuộc đội xe.
- **Admin — NexaFleet Bento Dispatch Console:** Bố cục điều phối 2 cột thông minh:
  Cột trái gồm Bản đồ Dark Mode real-time & Thẻ bảng đơn hàng tích hợp bộ lọc pill;
  Cột phải gồm Thẻ Status Overview (thanh phân đoạn 4 màu liên hoàn), Thẻ Fulfillment Performance
  (cột đứng xanh lục) và Thẻ Doanh thu vận hành (gradient hoàng hôn ấm áp kèm đường sóng trắng mềm mại).

Responsive không chỉ là “không overflow”. Tại `768–1023 px`, table không được giữ
`5–6` cột semantic rồi ép badge/text; chỉ giữ `3–4` cột quyết định hoặc chuyển sang
row-detail. Ở mobile, first viewport phải cho thấy object/task thật và một signal có
ích, không chỉ title + đoạn mô tả.

## 2. Kiến trúc design system

Design system có ba tầng; không tạo bốn palette độc lập theo role.

1. **LEOPARD Core** — semantic colors, typography, spacing, radius, border,
   elevation, focus, motion, state vocabulary, status language và Route Spine.
2. **Platform systems** — Mobile ánh xạ core qua React Native `StyleSheet`, safe
   area, touch/Dynamic Type và native accessibility; Operations Web ánh xạ core qua
   CSS/Tailwind tokens, semantic HTML, keyboard/focus và responsive data patterns.
3. **Role systems** — Customer, Driver, Fleet Owner và Admin chỉ định information
   hierarchy, density, composition và interaction priority; chỉ consume core/platform
   tokens.

Hai platform phải có cùng **ý nghĩa semantic**, không bắt buộc cùng tên class hoặc
implementation detail. Source parity hiện tại là:

- Mobile: `apps/mobile/src/theme/tokens.ts` và `apps/mobile/src/ui/**`.
- Operations Web: `packages/ui/src/tokens.css` và `packages/ui/src/**`.
- App-level composition không được khai báo lại màu/spacing/radius đã có token.

Mọi token mở rộng trong contract này phải được thêm vào cả hai platform hoặc có
rationale rõ vì sao chỉ áp dụng một platform trước khi role implementation bắt đầu.

## 3. Route Spine

`Route Spine` là component family truyền đạt thứ tự và tiến trình, không phải đường
kẻ trang trí.

### Anatomy

- `origin`: pickup, luôn có label và marker bắt đầu.
- `stop`: 0–3 điểm trung gian, đánh số theo thứ tự backend trả về.
- `destination`: dropoff, luôn có label và marker kết thúc.
- `connector`: nối các node theo thứ tự; không tự suy diễn khoảng cách hoặc trạng thái.
- `active segment`: chỉ xuất hiện khi response xác định current leg/current state.
- `metadata`: ETA dự kiến, khoảng cách, timestamp hoặc proof chỉ hiển thị khi có dữ liệu
  tương ứng.

### Variants

| Variant         | Dùng ở đâu              | Quy tắc                                                                                        |
| --------------- | ----------------------- | ---------------------------------------------------------------------------------------------- |
| `route-full`    | Customer/Driver detail  | Dọc trên mobile; hiển thị đầy đủ label, stop order và current leg                              |
| `route-compact` | Fleet/Admin list/detail | Giữ origin, destination, số stops và exception; không nhồi toàn bộ địa chỉ vào row             |
| `status-spine`  | Order lifecycle/history | Node có status label, icon/text và timestamp; không dùng màu là tín hiệu duy nhất              |
| `audit-rail`    | Admin privileged action | Biến thể timeline riêng cho actor, action, reason và request ID; không trộn với physical route |

Không nối node bằng gradient, không animate connector liên tục và không dùng Route
Spine để ngụ ý tracking chính xác khi dữ liệu đang stale/offline. Bản đồ và Route
Spine là hai biểu diễn bổ trợ: bản đồ cho không gian, spine cho thứ tự và trạng thái.

## 4. Token vocabulary

### 4.1 Semantic colors

> **Wave 5 palette change:** `brand.*` chuyển từ sky (`#075985`) sang teal
> (`#0F766E`, soft `#CCFBF1`/`#134E4A`). WCAG AA đã kiểm chứng cho cả hai cặp
> foreground/background (5,47:1 và >7:1). Áp dụng web admin trước; mobile đồng
> bộ theo change request riêng. `info.*` giữ nguyên hue sky vì là semantic
> riêng biệt.

Các giá trị dưới đây là baseline đã có trên mobile và package web. Component chỉ
consume semantic role; không chọn màu theo cảm tính hoặc theo tên hue.

| Token                  | Baseline                      | Dùng cho                                       |
| ---------------------- | ----------------------------- | ---------------------------------------------- |
| `neutral.background`   | `#FFFFFF`                     | Canvas/control background                      |
| `neutral.surface`      | `#F3F4F6`                     | Surface phụ, disabled/skeleton                 |
| `neutral.text`         | `#17202A`                     | Nội dung chính                                 |
| `neutral.mutedText`    | `#4B5563`                     | Metadata và helper text                        |
| `neutral.border`       | `#6B7280`                     | Border có thể nhận biết trên nền sáng          |
| `brand.background`     | `#0F766E`                     | Primary action và active focus identity        |
| `brand.text`           | `#FFFFFF`                     | Text/icon trên brand background                |
| `brand.softBackground` | `#CCFBF1`                     | Selection hoặc branded emphasis nhẹ            |
| `brand.softText`       | `#134E4A`                     | Text trên brand soft background                |
| `info.*`               | `#E0F2FE / #075985 / #0369A1` | Thông tin, `REQUESTED`, QR/ETA metadata        |
| `warning.*`            | `#FEF3C7 / #78350F / #B45309` | Cần chú ý, `PICKING_UP`, `UNPAID`              |
| `active.*`             | `#DBEAFE / #1E3A8A / #1D4ED8` | Active trip/tracking, `ACCEPTED`, `IN_TRANSIT` |
| `success.*`            | `#DCFCE7 / #14532D / #15803D` | Hoàn tất, `DELIVERED`, `PAID_MANUAL`           |
| `danger.*`             | `#FEE2E2 / #7F1D1D / #B91C1C` | Error, destructive, `CANCELLED`, `FAILED`      |

`.*` biểu thị bộ `background`, `text`, `border`. Mọi cặp foreground/background phải
đạt WCAG AA. Status luôn có text; icon là tín hiệu bổ sung, không thay text.

### 4.2 Canonical status mapping

| Domain state          | Semantic role | Nhãn hiển thị tiếng Việt |
| --------------------- | ------------- | ------------------------ |
| `REQUESTED`           | `info`        | Chờ tài xế               |
| `ACCEPTED`            | `active`      | Đã nhận đơn              |
| `PICKING_UP`          | `warning`     | Đang đến điểm lấy        |
| `IN_TRANSIT`          | `active`      | Đang vận chuyển          |
| `DELIVERED`           | `success`     | Đã giao                  |
| `CANCELLED`           | `danger`      | Đã hủy                   |
| `UNPAID`              | `warning`     | Chưa thanh toán          |
| `QR_CREATED`          | `info`        | Đã tạo mã QR             |
| `PAID_MANUAL`         | `success`     | Đã xác nhận thanh toán   |
| `FAILED`              | `danger`      | Thất bại                 |
| Driver `OFFLINE`      | `neutral`     | Ngoại tuyến              |
| Driver `AVAILABLE`    | `success`     | Sẵn sàng                 |
| Driver `BUSY`         | `active`      | Đang bận                 |
| FleetMember `INVITED` | `info`        | Đã mời                   |
| FleetMember `ACTIVE`  | `active`      | Đang tham gia            |
| FleetMember `REMOVED` | `neutral`     | Đã gỡ khỏi đội xe        |
| User `ACTIVE`         | `active`      | Đang hoạt động           |
| User `DISABLED`       | `danger`      | Đã vô hiệu hóa           |

API enum vẫn là machine value; role adapter/view model chịu trách nhiệm cung cấp
nhãn hiển thị. Mapping luôn nhận domain discriminator, ví dụ `userStatus` và
`fleetMemberStatus`, trước khi chọn semantic role/copy. User `ACTIVE` là “Đang hoạt
động”, còn FleetMember `ACTIVE` là “Đang tham gia”; không dùng một global string map
theo raw enum value cho các domain khác nhau.

### 4.3 Typography

Font chính là `Inter`, fallback `system-ui`. Web tải Inter qua app shell; mobile có
thể dùng native system fallback trong pilot nếu chưa package font asset. Không giả
lập weight hoặc chặn render để tải font.

| Token          | Size / line-height / weight | Dùng cho                           | Trạng thái parity                      |
| -------------- | --------------------------- | ---------------------------------- | -------------------------------------- |
| `caption`      | `12 / 16 / 400`             | Timestamp, source, helper          | Đã có mobile; web cần semantic utility |
| `label`        | `14 / 20 / 600`             | Field/control/status label         | Đã có mobile; web cần semantic utility |
| `bodyCompact`  | `14 / 20 / 400`             | Table/list metadata Operations Web | Wave 4 extension                       |
| `body`         | `16 / 24 / 400`             | Nội dung và form mobile            | Đã có mobile                           |
| `sectionTitle` | `20 / 28 / 600`             | Section hoặc panel title           | Ánh xạ từ mobile `title`               |
| `pageTitle`    | `24 / 32 / 700`             | Một `h1`/screen title duy nhất     | Wave 4 extension                       |

- Không scale font theo viewport; layout phải chịu được text zoom/Dynamic Type.
- Heading theo thứ tự, không nhảy cấp vì mục đích tạo style.
- ID, VND, time và số liệu bảng dùng tabular numerals khi platform hỗ trợ.
- Label, địa chỉ và cargo note phải wrap; không truncate thông tin cần để quyết định.
- Không dùng uppercase cho câu dài; uppercase chỉ dành cho micro-label ngắn và vẫn
  phải đọc được bằng screen reader.

### 4.4 Spacing, density và sizing

Scale duy nhất: `xxs=4`, `xs=8`, `sm=12`, `md=16`, `lg=24`, `xl=32` px.

| Context     | Mật độ mặc định    | Khoảng cách ưu tiên                                         |
| ----------- | ------------------ | ----------------------------------------------------------- |
| Customer    | Comfortable/guided | `md` giữa fields, `lg` giữa sections                        |
| Driver      | Action-first/touch | `sm–md`; primary action tối thiểu 48 px khi sticky          |
| Fleet Owner | Compact/read-only  | `xs–sm` trong row, `md` giữa regions                        |
| Admin       | Dense/filter-first | `xs–sm` trong table/filter, `md` giữa investigation regions |

- Control desktop chuẩn 40 px khi dùng chuột/bàn phím; touch target và control trên
  viewport touch tối thiểu `44 × 44` px.
- Content max-width: Customer/Driver 768 px; Operations Web 1440 px.
- Không dùng arbitrary spacing cho layout thông thường. Kích thước map, sidebar,
  column min-width và safe-area offset được phép là layout constraint có tên/rationale.
- Không lồng card trong card. Dùng heading, divider, whitespace hoặc background shift
  để phân nhóm.

### 4.5 Radius, border và elevation

- **Radius tiêu chuẩn:**
  - `radius.card`: Với các thẻ container và widget trên bàn điều phối (**Modern Dispatch Dashboard**), sử dụng `20–26px` (`rounded-2xl` / `rounded-3xl`) tạo khối nổi êm ái, thân thiện và hiện đại. Đối với table row hoặc form con, dùng `6–8px`.
  - `radius.control`: `10–14px` cho các button công cụ, và `radius.pill=999` cho status badge, thanh tìm kiếm search pill, filter chips và floating vehicle toggle buttons.
- **Border & Phân tách:**
  - Border trung tính siêu mảnh (`border-slate-100` hoặc `border-white/80` trên nền canvas) kết hợp đổ bóng nhẹ để tạo sự tách biệt tự nhiên mà không gây gắt mắt.
- **Elevation & Shadow:**
  - Các thẻ chính trên bàn điều phối sử dụng shadow êm nhẹ (`box-shadow: 0 10px 25px -5px rgba(15, 60, 110, 0.05)`) tạo độ nổi tự nhiên trên nền canvas ambient. Popover, dialog và drawer dùng elevation cao hơn để phân lớp tương tác.
  - Không lạm dụng hiệu ứng neon sặc sỡ hoặc shadow đen đậm làm tối giao diện.

### 4.6 Focus

- Web dùng `:focus-visible` ring/outline tối thiểu 2 px, offset 2 px và không bị che
  bởi sticky header/dialog.
- Không xóa outline nếu chưa có replacement đạt contrast.
- Dialog/drawer đưa focus vào heading hoặc control đầu tiên, trap focus, đóng bằng
  `Escape` khi an toàn và trả focus về trigger.
- Route transition đưa focus đến page heading hoặc main region khi navigation không
  tự làm điều đó.
- Mobile cung cấp `accessibilityRole`, label/state/hint phù hợp và thứ tự đọc trùng
  với thứ tự thị giác.

### 4.7 Motion

| Token             | Duration | Dùng cho                                     |
| ----------------- | -------- | -------------------------------------------- |
| `motion.none`     | `0 ms`   | Reduced motion và immediate state            |
| `motion.fast`     | `120 ms` | Hover/pressed/focus color                    |
| `motion.standard` | `180 ms` | Drawer, disclosure, selection transition     |
| `motion.slow`     | `240 ms` | Chỉ cho orientation change có quãng đường rõ |

- Motion chỉ giải thích state hoặc orientation; không dùng để che loading chậm.
- Không animate layout liên tục, route connector, KPI hoặc map marker chỉ để trang trí.
- Web phải tôn trọng `prefers-reduced-motion: reduce`; mobile phải tôn trọng setting
  reduced motion của hệ điều hành. Khi reduced motion bật, spinner/pulse trang trí
  chuyển sang progress copy hoặc indicator không chuyển động khi có thể.
- Loading indicator được phép lặp khi nó là feedback duy nhất, nhưng phải có text/live
  announcement và không làm layout thay đổi kích thước.

## 5. State vocabulary

Mỗi main screen phải có state theo `docs/ui/06-empty-loading-error-states.md` và các
state đặc thù dưới đây khi journey liên quan.

| State               | Contract hiển thị                                     | Accessibility/interaction                                   |
| ------------------- | ----------------------------------------------------- | ----------------------------------------------------------- |
| `loading`           | Skeleton đúng shape, giữ layout, chặn submit lặp      | `busy`; announcement lịch sự, không đọc từng skeleton       |
| `empty`             | Chưa có dữ liệu; action chỉ khi role được tạo dữ liệu | Heading + mô tả; không dùng illustration làm nội dung chính |
| `no-results`        | Có dữ liệu nhưng không khớp filter                    | Hiện filter summary và `Xóa bộ lọc`                         |
| `error`             | Lỗi dễ hiểu, request ID khi cần, retry nếu an toàn    | Error liên kết field/region; urgent error dùng alert        |
| `success`           | Render dữ liệu đã persist và feedback ngắn            | Live announcement; không chỉ dựa vào toast                  |
| `permission-denied` | Không render dữ liệu riêng tư; dẫn về role home       | Focus vào heading; không để data flash trước redirect       |
| `offline`           | Giữ nội dung đã có, trạng thái kết nối và retry       | Không gọi dữ liệu cache là mới nhất                         |
| `stale`             | Hiện timestamp cập nhật cuối tại chỗ                  | Không dùng màu đơn lẻ; map giữ last-known marker            |
| `reconnecting`      | Giữ context, báo đang nối lại                         | `status`/live polite; không khóa action không liên quan     |
| `session-expired`   | Giải thích và về login; giữ draft không nhạy cảm      | Focus vào alert/login heading                               |
| `conflict`          | Nêu dữ liệu đã đổi, tải lại response chuẩn            | Không tự áp lifecycle/assignment từ fixture cũ              |

State domain (order, driver, payment, tracking) không thay thế system state. Ví dụ
order `IN_TRANSIT` vẫn có thể đồng thời `tracking: stale`.

## 6. Component contracts

| Component family | Contract tối thiểu                                                                                                                      |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Button           | Primary, secondary, destructive, ghost/icon khi cần; enabled, pressed/hover, focus, disabled, loading; kích thước không đổi khi loading |
| FormField        | Visible label, required marker có text alternative, hint, stable inline error, invalid/disabled/read-only states                        |
| StatusBadge      | Canonical domain label + semantic role; pill là badge, không biến mọi control thành pill                                                |
| ScreenState      | Loading, empty/no-results, error, success, permission-denied và offline; stale/reconnect/conflict khi liên quan                         |
| RouteSpine       | Full/compact/status variants theo mục 3; long-label và 0–3 stop coverage                                                                |
| EtaIndicator     | Luôn ghi “ETA dự kiến”; source `DEMO` luôn hiện “Dữ liệu mô phỏng”; không render `0 phút` khi loading                                   |
| MapPanel         | Stable aspect/height, skeleton, unavailable/fallback, retry, stale/last-updated và permission state                                     |
| DataTable        | Semantic table; server sort/filter/page state; keyboard-operable headers; responsive row-detail dưới 768 px                             |
| FilterBar        | Visible labels, URL/view-model state rõ, wrap ổn định, clear filters và no-results feedback                                             |
| Pagination       | Current/total page announcement, disabled boundaries, keyboard operation và touch target phù hợp viewport                               |
| Dialog/Drawer    | Labelled modal semantics, initial focus, focus trap/restore, `Escape`, pending/error/success và irreversible warning khi cần            |
| Alert/Toast      | Alert cho việc cần chú ý; toast cho kết quả không chặn; thông tin nguồn vẫn hiện trong content chính                                    |

Role component không copy primitive để đổi màu hoặc spacing. Nếu composition mới có
thể dùng lại ở ít nhất hai role và không chứa business rule, đề xuất nâng lên platform
system qua review riêng.

## 7. Responsive và platform rules

- Breakpoint chuẩn: mobile `360–767`, tablet `768–1023`, desktop `>=1024` px.
- Viewport evidence tối thiểu: `360×800`, `390×844`, `768×1024`, `1024×768`,
  `1440×900`.
- Customer/Driver một cột trên mobile, primary action có thể sticky nhưng phải chừa
  safe area/keyboard và không che nội dung.
- Fleet/Admin dùng sidebar từ 1024 px, drawer dưới 1024 px; table dưới 768 px đổi sang
  row-detail thay vì ép toàn bộ cột vào viewport.
- Map tối thiểu 280 px chiều cao và giữ aspect/height ổn định qua loading/error.
- Chỉ table container chủ ý mới được scroll ngang; page không có horizontal overflow.

## 8. Accessibility gate

- Dùng native/semantic element trước ARIA; không dùng `div/span` làm button/link.
- Web form có `label` nối `htmlFor/id`; hint/error nối bằng `aria-describedby`, invalid
  state dùng `aria-invalid`; error động có live semantics phù hợp.
- Tất cả action dùng được bằng bàn phím; sortable header phải là button trong `th` hoặc
  pattern tương đương, không chỉ `onClick` trên `th`.
- Icon-only button có accessible name; decorative SVG/image bị ẩn khỏi accessibility
  tree; status không chỉ truyền đạt bằng màu.
- Dialog/drawer quản lý initial focus, trap, close và restore; route change giữ focus
  logic.
- Web hỗ trợ text zoom 200%; mobile hỗ trợ Dynamic Type, screen reader và touch target
  tối thiểu 44 px.
- Dynamic status, upload, tracking và command result dùng live announcement không gây
  lặp; motion tôn trọng reduced-motion preference.
- Permission-denied không render children chứa private data.

Gate chi tiết và mẫu evidence nằm tại `docs/ui/11-ui-quality-scorecard.md`.

## 9. Anti-patterns và AI-slop gate

Các pattern sau bị chặn ở static gate:

- Hiệu ứng tối mù mịt (dark purple neon gradient), decorative hero che khuất tác vụ điều phối, hoặc hình ảnh stock trang trí không phục vụ nghiệp vụ.
- Thẻ marketing giả mạo tính năng (ví dụ tự nhận có AI XGBoost hay báo cáo ESG xanh khi backend chưa hỗ trợ).
- Một hue chiếm toàn bộ UI, status chỉ dựa vào màu sắc mà không có nhãn văn bản tiếng Việt rõ ràng.
- Animation cuộn trang gây xao nhãng, marker nhấp nháy liên tục làm phân tán sự tập trung của điều phối viên.
- *Lưu ý phân biệt:* Tông nền canvas xám sáng thanh lịch (`#F4F5F7` / `#F8FAFC`), thẻ nổi bo tròn mềm mại `rounded-3xl` (24–28px), topbar pill đen, bản đồ real-time Dark Mode và các biểu đồ đo lường vận hành (thanh phân đoạn 4 màu, cột đứng xanh lục, thẻ gradient hoàng hôn kèm wave sparkline) trên bàn điều phối **NexaFleet Modern Bento Dispatch Console** là **thiết kế chuẩn được phê duyệt**, không bị xếp vào anti-pattern.

## 10. Dark mode

Dark mode là **N/A cho pilot**. Không tính dark mode vào baseline score hoặc role
scorecard. Không thêm `dark:` utility, `prefers-color-scheme` override, theme toggle
hoặc token tối riêng lẻ. Nếu có change request sau pilot, dark mode phải được triển
khai nguyên hệ thống và audit lại contrast/state parity; partial implementation là
blocking defect.

## 11. Tham chiếu logistics/operations hiện hành

Các nguồn dưới đây là tham khảo phụ, được kiểm tra ngày `2026-08-15`; chúng không
thay đổi requirement LEOPARD.

### Quan sát từ nguồn chính thức

- [Onfleet — Map & Sidebar](https://support.onfleet.com/hc/en-us/articles/360023669612-Map-Sidebar)
  mô tả dashboard gồm map và sidebar; selection task/driver/team ở sidebar tác động
  đến phạm vi map và có keyboard shortcut cho zoom-to-fit.
- [Samsara — GPS Fleet Tracking](https://www.samsara.com/products/telematics/gps-fleet-tracking)
  mô tả dữ liệu GPS thời gian thực cho khả năng hiển thị vị trí vehicle/asset trên
  bản đồ và hỗ trợ người quản lý giám sát hoạt động.
- [Motive — Fleet View 2.0](https://helpcenter.gomotive.com/hc/en-us/articles/36088175670685-Fleet-View-2-0)
  công bố smart clustering, map/list selection đồng bộ, saved view và configurable
  asset cards cho fleet-scale monitoring.

### Suy luận có thể chuyển giao cho LEOPARD

- **Suy luận từ Onfleet và Motive:** Fleet/Admin nên giữ selection/filter đồng bộ giữa
  list và map để người vận hành không mất ngữ cảnh.
- Dense-map state cần clustering hoặc summary strategy, last-updated label và detail
  tại chỗ trước khi điều hướng sâu.
- User preference như column visibility/map viewport chỉ nên lưu khi không làm ẩn
  status/scope/exception bắt buộc.

Không sao chép palette, branding, license-gated feature, telematics depth hoặc workflow
ngoài pilot. LEOPARD vẫn ưu tiên role ownership, read-only Fleet scope, Route Spine,
state vocabulary và API contract nội bộ.

## 12. Baseline visual audit

Audit theo skill `design-system`, trên source đã commit tại `198bd42`, map trực tiếp
vào mười category có điểm trong `docs/ui/11-ui-quality-scorecard.md`. Tổng baseline là
`53/100`. Đây là before score, không phải static-gate score.

**Dark-mode gate:** `N/A` cho pilot và pass ở baseline vì audited runtime paths không
có partial dark style. Gate này nằm ngoài bảng và không tham gia tổng điểm.

| #   | Dimension               | Điểm | Evidence factual                                                                                                                                                                                                                                                                                                                                                                       | Việc phải sửa ở Wave 4                                                                               |
| --- | ----------------------- | ---: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1   | Color consistency       | 6/10 | Mobile và web token cùng palette tại `apps/mobile/src/theme/tokens.ts:41` và `packages/ui/src/tokens.css:3`; nhưng shell/login dùng raw hex tại `apps/admin/src/components/shell/OperationsShell.tsx:112`, `apps/admin/src/features/auth/LoginForm.tsx:123`, và status mapping web lệch mobile tại `packages/ui/src/StatusBadge.tsx:6` so với `apps/mobile/src/ui/StatusBadge.tsx:14`. | Loại raw semantic color, đồng bộ canonical status mapping và thêm parity test.                       |
| 2   | Typography hierarchy    | 6/10 | Mobile có caption/label/body/title tại `apps/mobile/src/theme/tokens.ts:20`; web token chỉ khai báo font family tại `packages/ui/src/tokens.css:48`; page title dùng inline style tại `apps/admin/src/app/(admin)/admin/page.tsx:10`.                                                                                                                                                  | Thêm semantic type utilities `bodyCompact`, `sectionTitle`, `pageTitle`; audit wrap/text zoom.       |
| 3   | Spacing rhythm          | 7/10 | Cùng scale 4/8/12/16/24/32 tại `apps/mobile/src/theme/tokens.ts:1` và `packages/ui/src/tokens.css:36`; admin login vẫn có padding 10 px và spacing inline tại `apps/admin/src/features/auth/LoginForm.tsx:168`.                                                                                                                                                                        | Dùng token cho app composition; chỉ giữ layout constraints có rationale.                             |
| 4   | Component consistency   | 5/10 | Hai platform có Button/Status/ScreenState primitives, nhưng web ScreenState chỉ có bốn state tại `packages/ui/src/ScreenState.tsx:6` trong khi mobile có permission/offline tại `apps/mobile/src/ui/ScreenState.tsx:7`; web badge dùng `rounded-control` tại `packages/ui/src/StatusBadge.tsx:41`.                                                                                     | Chốt component contract/state parity; status badge dùng pill token; app dùng shared primitives.      |
| 5   | Responsive behavior     | 5/10 | Operations shell có desktop/sidebar breakpoint tại `apps/admin/src/components/shell/OperationsShell.tsx:295`; role mobile và web vẫn là placeholder tại `apps/mobile/app/(customer)/orders/index.tsx:3` và `apps/admin/src/app/(fleet)/fleet/page.tsx:7`.                                                                                                                              | Tạo role compositions và evidence đủ năm viewport; row-detail dưới 768 px.                           |
| 6   | Motion & reduced motion | 5/10 | Button dùng transition, table/screen dùng spin/pulse tại `packages/ui/src/Button.tsx:64`, `packages/ui/src/DataTable.tsx:22`, `packages/ui/src/ScreenState.tsx:14`; chưa có reduced-motion handling hoặc motion token.                                                                                                                                                                 | Thêm motion tokens và reduced-motion fallback; motion chỉ truyền đạt state.                          |
| 7   | Accessibility           | 6/10 | Mobile field nối label/error tại `apps/mobile/src/ui/FormField.tsx:22`; drawer trap/restore focus tại `apps/admin/src/components/shell/OperationsShell.tsx:30`; sortable `th` chỉ có click handler tại `packages/ui/src/DataTable.tsx:50` và FilterBar dùng `aria-label` thay visible labels tại `packages/ui/src/FilterBar.tsx:88`.                                                   | Sửa semantic interaction/labels, keyboard sort, live regions, text zoom/Dynamic Type và target size. |
| 8   | Information density     | 4/10 | Nguyên tắc density đã có trong docs nhưng Fleet/Admin pages chỉ render heading/copy placeholder tại `apps/admin/src/app/(admin)/admin/page.tsx:7` và `apps/admin/src/app/(fleet)/fleet/page.tsx:7`.                                                                                                                                                                                    | DS03/DS04 phải định nghĩa filter/table/detail anatomy và exception hierarchy trước code.             |
| 9   | State completeness      | 5/10 | Mobile ScreenState có sáu state tại `apps/mobile/src/ui/ScreenState.tsx:7`, web chỉ có bốn state tại `packages/ui/src/ScreenState.tsx:6`; Customer/Fleet role pages vẫn là placeholder tại `apps/mobile/app/(customer)/orders/index.tsx:3` và `apps/admin/src/app/(fleet)/fleet/page.tsx:7`, nên chưa chứng minh no-results, stale, reconnect hoặc conflict.                           | Đồng bộ platform state contract và tạo role state catalogue/evidence cho các state áp dụng.          |
| 10  | Polish & AI-slop        | 4/10 | Mobile có stable field error và ETA copy tại `apps/mobile/src/ui/FormField.tsx:37`, `apps/mobile/src/ui/EtaIndicator.tsx:26`; web MapPanel chỉ là placeholder tại `packages/ui/src/MapPanel.tsx:11`, web state copy còn generic English tại `packages/ui/src/ScreenState.tsx:59`.                                                                                                      | Hoàn thiện Vietnamese copy, Route Spine/map fallbacks, interaction polish và AI-slop review.         |

### Baseline kết luận

- Điểm mạnh: semantic palette/spacing đã có, mobile primitives có state và accessibility
  foundation, operations shell có responsive drawer/focus baseline.
- P0 design-system drift: canonical status meaning đang khác giữa platform.
- P1 readiness gaps: app-level inline style bỏ qua token; web state/a11y/motion chưa đủ;
  role screens chưa có đủ content để audit density/responsive thực tế.
- Không role implementation nào được tự tạo token để né các gap này.

## 13. Governance và Definition of Ready cho role UI

Role system-design spec chỉ được duyệt khi:

1. Consume core/platform tokens và ghi rationale cho mọi deviation.
2. Có purpose, audience, tone/density, information hierarchy và role-specific motif.
3. Có component/state matrix, long-copy/edge-case và đủ responsive evidence.
4. Chấm theo `docs/ui/11-ui-quality-scorecard.md`: `>=85/100`, không category dưới
   `8/10`, accessibility và AI-slop gate đều pass.
5. Không có partial dark mode, arbitrary semantic color/spacing hoặc private-data flash.
6. Static UI chỉ được ghi `STATIC_GATE_PASSED`; không ghi PH-12 verified trước API,
   Socket, persistence và E2E thật.

Design System Owner duyệt semantic deviation. Product/Backend vẫn duyệt copy hoặc
behavior có thể thay đổi business meaning.
