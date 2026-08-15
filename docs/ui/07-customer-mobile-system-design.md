# W4-DS01 — Customer Mobile System Design

> **Owner:** ECC Customer Role Design Owner
>
> **Ngày:** 2026-08-15
>
> **Core baseline:** `06c7801` — Wave 4 core design contract
>
> **Trạng thái:** `APPROVED_FOR_STATIC_IMPLEMENTATION — RUNTIME_EVIDENCE_PENDING`
>
> **Independent review:** Helmholtz (`01a003b2-71af-7ab0-b3c8-c7a8e46e2082`),
> 2026-08-15 — không có P0/P1/P2
>
> **Routes:** `/customer/orders`, `/customer/orders/new`, `/customer/orders/:id`

Tài liệu này đặc tả role system design cho Customer mobile. Nó kế thừa LEOPARD
Core, không thay thế SRS, acceptance criteria, API contract hoặc business rules phía
backend. Trạng thái trên chỉ nói design artifact đã đủ để review; không phải
`STATIC_GATE_PASSED`, không chứng minh implementation đã tồn tại và không đánh dấu
PH-12 `VERIFIED`.

## 1. Purpose, audience và design direction

| Thuộc tính       | Quyết định Customer                                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose          | Giúp người gửi tạo đúng một shipment order, hiểu route/giá/ETA dự kiến trước khi xác nhận và theo dõi order sau khi tạo.                  |
| Audience         | Customer dùng không thường xuyên như người vận hành; có thể thao tác bằng một tay, trong thời gian ngắn và chưa quen thuật ngữ logistics. |
| Tone             | `Guided / calm`: bình tĩnh, trực tiếp, giải thích đúng lúc, không dùng giọng marketing hoặc tạo cảm giác ETA là cam kết.                  |
| Density          | `Comfortable`: một decision point tại một thời điểm; metadata phụ lùi sau task, status và route.                                          |
| First scan       | Current task/action → order status + route → exception cần xử lý → giá/ETA/payment → tracking và metadata.                                |
| Memorable detail | **Customer Route Spine** giữ cùng một trật tự pickup → 0–3 stops → dropoff từ list, form tạo đơn đến detail/timeline.                     |
| Constraints      | Mobile-first, tiếng Việt, WCAG AA, touch target `44 × 44`, Dynamic Type, safe area, deterministic preview, backend authority.             |

Customer UI là workflow vận hành, không phải landing page:

- First viewport hiển thị order/task thật; không có hero, slogan hoặc marketing card.
- Mỗi decision point chỉ có một primary action. Secondary/destructive action không
  cạnh tranh thị giác với primary action.
- Route Spine truyền đạt thứ tự và tiến trình; nó không phải đường trang trí và không
  thay thế bản đồ.
- Không dùng dashboard KPI giả để lấp màn hình list hoặc detail.

## 2. Nguồn quyết định và skill evidence

### 2.1 Source of truth đã đối chiếu

| Nguồn                                                                                                                                                      | Quyết định được mang vào artifact                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| [Vision and scope](../product/01-vision-and-scope.md)                                                                                                      | Customer mobile-first; complete journey từ tạo order đến tracking/payment; demo provider phải xác định.                                         |
| [SRS](../requirements/01-srs.md), [user stories](../requirements/02-user-stories.md), [acceptance criteria](../requirements/03-acceptance-criteria.md)     | Pickup, 0–3 stops, dropoff, vehicle/cargo/media; own-order privacy; estimate/ETA/source; cancel, tracking và payment states.                    |
| [System architecture](../architecture/01-system-architecture.md), [database design](../data/01-database-design.md), [REST API](../api/01-rest-api-spec.md) | Frontend chỉ quản lý presentation/form/cache; REST/Socket/provider đi qua port/adapter; order response là nguồn giá, ETA, lifecycle và payment. |
| [UI principles](./01-ui-principles.md), [navigation](./02-navigation-map.md), [screen specs](./03-screen-specs.md)                                         | Ba route Customer, current-task-first, status/route summary và đúng copy ETA/demo.                                                              |
| [Core design system](./04-design-system.md), [responsive rules](./05-responsive-rules.md), [UI states](./06-empty-loading-error-states.md)                 | Core token/component/state vocabulary, Route Spine, 360/390/768 behavior, safe-area sticky action và complete states.                           |
| [UI quality scorecard](./11-ui-quality-scorecard.md)                                                                                                       | Mười category, accessibility/AI-slop/no-partial-dark gates và evidence package bắt buộc.                                                        |
| [Wave 4 static plan](../superpowers/plans/2026-08-15-wave-4-static-ui-parallel-plan.md)                                                                    | Feature-local model/port/fixture/adapter seam; preview guard; W4-DS01 component/state catalogue contract.                                       |
| [Definition of Done](../development/05-definition-of-done.md), [test strategy](../testing/01-test-strategy.md)                                             | Responsive/state coverage, authorization boundary, deterministic test data và không tuyên bố hoàn tất trước build/smoke/E2E thật.               |

Nếu các nguồn xung đột, giữ thứ tự ưu tiên trong `AGENTS.md`. Artifact không mở
rộng các mục ngoài pilot.

### 2.2 Evidence thực tế từ skills

| Skill                       | Guidance đã đọc và áp dụng                                                                                                                                                        | Dấu vết trong artifact                                                                                                         |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `frontend-design-direction` | Chọn rõ purpose, audience, tone, memorable detail và constraints trước implementation; first screen phải là product workflow; hierarchy, text fit và motion phục vụ scan.         | Direction `guided / calm`, Customer Route Spine, anatomy ba screen, one-primary-action và long-copy checks.                    |
| `react-native-patterns`     | Route file mỏng; validate route/external data; tách server/route/form/UI state; virtualize list; dùng một styling system; safe area, Dynamic Type và native accessibility từ đầu. | Mục 11, 12 và 15 khóa Expo route seam, `FlatList`, `StyleSheet`, port/view model, keyboard/safe-area và RN semantics.          |
| `design-system`             | Audit theo mười dimension; tái dùng token/component hiện có; review responsive, state, accessibility và AI-slop; không tạo visual flourish/dependency thừa.                       | Token mapping chỉ consume core, inventory/variants, scorecard readiness không tự chấm điểm, do/don't và preview evidence plan. |

Context7 đã được dùng ngày `2026-08-15` với official React Native documentation
(`/react/react-native-website`) để kiểm chứng:

- `accessibilityLabel`, `accessibilityHint`, `accessibilityRole`,
  `accessibilityState` và live-region semantics cho nội dung động;
- `useWindowDimensions()` cập nhật cả `width` và `fontScale`; font scaling mặc định
  được giữ bật;
- `KeyboardAvoidingView` cần behavior có chủ ý theo platform;
- React Native core `SafeAreaView` đã deprecated; project đã có
  `react-native-safe-area-context`, nên implementation dùng provider/insets của
  package này thay vì core `SafeAreaView`.

Repository baseline tại [`apps/mobile/package.json`](../../apps/mobile/package.json)
đang dùng React Native `0.86.0` và `react-native-safe-area-context` `5.8.0`; đây là
evidence source, chưa phải device verification.

Các ghi nhận trên là design evidence, không phải runtime test evidence.

## 3. Authority boundary

### 3.1 Backend là authority

Backend/API/Socket tiếp tục sở hữu:

- role, ownership, permission và dữ liệu nào được phép render;
- lifecycle, current/next state, khả năng cancel và kết quả conflict;
- route snapshot, distance, duration, **giá dự kiến**, **ETA dự kiến**, source,
  `calculatedAt` và tính hợp lệ của `estimateToken`;
- Driver assignment, tracking authorization, tracking history và event hợp lệ;
- payment status, khả năng tạo intent, QR amount/reference/expiry/source;
- media type/size authorization, persistence và signed URL;
- success chỉ sau response đã persist.

UI không suy luận các quyền trên từ enum. Ví dụ, dù AC hiện nói Customer chỉ cancel
được `REQUESTED`, component vẫn chỉ render action khi view model trả
`cancel.availability = 'available'`.

### 3.2 Client được sở hữu

Client sở hữu:

- bố cục, visible labels, focus/read order, form state và validation hình dạng dữ
  liệu phục vụ UX;
- giới hạn form 0–3 stop theo contract đã công bố, required field và định dạng tọa
  độ trước khi gửi;
- trạng thái request `idle/loading/error/success`, chống double-submit và retry an
  toàn;
- format display VND/time/distance từ giá trị backend; không tính giá, route hoặc ETA;
- filter/list position, disclosure, modal và selected-media local state;
- thông báo stale/offline/reconnecting đúng theo dữ liệu adapter cung cấp.

### 3.3 Fixture tuyệt đối không làm business logic

Static fixture là immutable snapshot. Fixture không được:

- dùng `Math.random()`, `Date.now()` hoặc công thức distance/price/ETA;
- tự chuyển lifecycle, tự gán Driver hoặc suy ra action từ status;
- tự đếm ngược để quyết định estimate/QR hết hạn;
- đổi payment state, tracking freshness hoặc cancel availability sau callback;
- giả persistence, QR thanh toán thật, upload thật hay Socket event thật.

Mỗi snapshot chứa sẵn semantic state và display value đã duyệt. Preview controller
có thể chuyển sang một scenario khác để review catalogue, nhưng đó là chọn snapshot,
không phải mô phỏng mutation thành công.

## 4. Information hierarchy

### 4.1 Scan order chung

1. **Current task:** việc Customer có thể hoặc cần làm ngay.
2. **Order status + physical route:** status tiếng Việt và Route Spine cùng context.
3. **Exception:** estimate expired, no Driver, tracking stale, QR expired hoặc action
   unavailable.
4. **Decision data:** giá dự kiến, ETA dự kiến, vehicle, payment.
5. **Supporting context:** map, Driver, media, status history, timestamps và ID.

System state và domain state phải cùng tồn tại. Ví dụ, order `IN_TRANSIT` có thể có
`tracking = stale`; payment `QR_CREATED` có thể có `qr = expired`.

### 4.2 First scan theo screen

| Screen                 | First viewport phải trả lời                                           | Primary action                                                                                                 |
| ---------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `/customer/orders`     | “Tôi có order nào, trạng thái và route nào cần chú ý?”                | `Tạo đơn mới`; trong empty state đặt action cùng message.                                                      |
| `/customer/orders/new` | “Tôi đang nhập đoạn route nào và bước tiếp theo là gì?”               | `Tính giá và ETA dự kiến`; sau estimate hợp lệ đổi thành `Tạo đơn`.                                            |
| `/customer/orders/:id` | “Order đang ở đâu trong journey, có exception gì và tôi làm được gì?” | Đúng một action có `emphasis=primary` do view model cung cấp; payment/cancel còn lại là secondary/destructive. |

## 5. Layout grid và screen anatomy

### 5.1 Grid contract

Role layer không thêm spacing token. Grid chỉ dùng scale core
`4/8/12/16/24/32` và named constraints đã có.

| Viewport     | Canvas và grid                                                                | Composition                                                                                                                   |
| ------------ | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `360 × 800`  | Gutter `spacing.md` (16), 4 cột, gap `spacing.sm` (12)                        | Một cột nội dung; sticky action full content width; map cao tối thiểu 280 px.                                                 |
| `390 × 844`  | Gutter `spacing.md` (16), 4 cột, gap `spacing.sm` (12)                        | Một cột, thêm room cho helper/error copy nhưng không tăng density tùy ý.                                                      |
| `768 × 1024` | Gutter `spacing.lg` (24), 8 cột, gap `spacing.md` (16), content max-width 768 | List row dùng grid; create/detail có thể chia `5 + 3` cột khi fontScale/keyboard cho phép; reflow một cột khi text không fit. |

Không có horizontal page scroll. Filter, address, cargo, price, ETA và action phải
wrap trong container. Grid không dựa duy nhất vào width: implementation đọc cả
`width` và `fontScale`; Dynamic Type lớn buộc composition hai cột quay về một cột.

### 5.2 `/customer/orders`

```text
┌ Page title: Đơn hàng của tôi ───── [Tạo đơn mới] ┐
│ Status filter (visible label + current summary)   │
│ Connection/stale notice khi áp dụng               │
├ Order row: status + compact Route Spine + time ───┤
├ Order row: status + compact Route Spine + time ───┤
│ Load-more / pagination result feedback            │
└ Bottom navigation / safe area                     ┘
```

- Dùng `FlatList`; row và `renderItem` có stable identity, không map danh sách lớn
  trong `ScrollView`.
- Mobile dùng một labelled filter control hoặc wrapping controls; không giấu filter
  bắt buộc trong horizontal overflow.
- Row scan order: status → pickup/dropoff + số stops → updated time → price/ETA
  summary nếu response có.
- Row là một target điều hướng; không đặt nhiều nested pressable cạnh tranh bên trong.
- Tại 768 px, route chiếm 5 cột, status/time/amount chiếm 3 cột.

### 5.3 `/customer/orders/new`

```text
┌ Back ─ Page title: Tạo đơn                         ┐
│ Customer Route Spine                              │
│  ● Điểm lấy hàng — AddressField                   │
│  ○ Điểm dừng 1..3 — AddressField + Xóa            │
│  ＋ Thêm điểm dừng                                 │
│  ● Điểm giao hàng — AddressField                  │
├ Vehicle selector                                  │
├ Cargo note / weight / optional cargo media        │
├ Route preview / estimate / price / ETA source     │
│ Stable inline errors and status feedback          │
└ Sticky primary action + keyboard/safe-area inset  ┘
```

- Guided order: route → vehicle/cargo → estimate → confirmation.
- Trước estimate hợp lệ, primary action là `Tính giá và ETA dự kiến`.
- Khi estimate ready và token hợp lệ theo view model, primary action là `Tạo đơn`.
- Khi field ảnh hưởng estimate đổi, client bỏ estimate cũ khỏi confirmation state và
  yêu cầu tính lại; không tự tính giá/ETA mới.
- Tại 768 px với font scale thường, route/form chiếm 5 cột và route/estimate summary
  read-only chiếm 3 cột. Khi font scale lớn hoặc keyboard làm chiều cao bị giới hạn,
  các section trở về một cột và giữ nguyên reading order.

### 5.4 `/customer/orders/:id`

```text
┌ Back ─ Order short ID ─ StatusBadge                ┐
│ Exception/current-task region                     │
├ Full Customer Route Spine + price/ETA/source      │
├ Map/tracking ───────────── Driver/last updated    │
├ Payment panel / QR                                │
├ Cargo + delivery media                            │
├ Status Spine / history                            │
└ Primary action; secondary; cancel region          ┘
```

- Header/status/exception là full width. Route/map dùng 5 cột và contextual
  Driver/payment/actions dùng 3 cột tại 768 px; history trở lại full width.
- No Driver, stale location, QR expired và cancel unavailable nằm gần panel liên
  quan, không bị đẩy thành toast.
- Destructive cancel không sticky khi primary payment/current-task action đang tồn
  tại; nó nằm trong section cuối và mở confirmation.
- Permission-denied render thay toàn bộ private composition, không render rồi mới
  che.

## 6. Customer Route Spine

### 6.1 Anatomy

Customer Route Spine consume core `RouteSpine`:

- `origin`: marker bắt đầu + visible label `Điểm lấy hàng` + address đầy đủ;
- `stop`: 0–3 marker trung gian, đánh số theo thứ tự form/backend;
- `destination`: marker kết thúc + visible label `Điểm giao hàng`;
- `connector`: chỉ nối thứ tự, decorative với screen reader;
- `metadata`: stop count, distance, ETA/timestamp chỉ khi view model có dữ liệu;
- `active segment`: chỉ khi backend response xác định current leg.

### 6.2 Coverage 0–3 stops

| Stop count | Visual contract                                                            | Interaction/accessibility                                                                          |
| ---------: | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
|        `0` | Origin nối trực tiếp destination; không render node hoặc khoảng trống giả. | Đọc “Điểm lấy hàng” rồi “Điểm giao hàng”. `Thêm điểm dừng` khả dụng.                               |
|        `1` | Một node `Điểm dừng 1`, connector liên tục.                                | Label “Điểm dừng 1 trong 1”; remove target tối thiểu 44 px.                                        |
|        `2` | Hai node `1`, `2`; address wrap độc lập.                                   | Reading/focus order trùng route order; add vẫn khả dụng.                                           |
|        `3` | Ba node `1`, `2`, `3`; không co text hoặc marker để nhét một dòng.         | Không render add affordance hoặc render disabled với text “Tối đa 3 điểm dừng”; không chỉ đổi màu. |

Pilot không dùng drag-and-drop để reorder. Thứ tự là vị trí field rõ ràng; Customer
có thể sửa nội dung hoặc xóa stop. Quyết định này tránh một gesture khó dùng bằng
screen reader và không thêm feature ngoài requirement.

### 6.3 Role compositions

| Composition              | Core variant được dùng        | Usage                                                                               |
| ------------------------ | ----------------------------- | ----------------------------------------------------------------------------------- |
| `CustomerRouteSummary`   | `route-compact`               | Order row: origin, destination và “N điểm dừng”; không truncate address quyết định. |
| `CustomerRouteEntry`     | `route-full` + `AddressField` | Create flow; field/action là child composition, connector không suy diễn route.     |
| `CustomerRouteDetail`    | `route-full`                  | Detail; route snapshot read-only, ETA/source/timestamp kế bên.                      |
| `CustomerStatusTimeline` | `status-spine`                | Lifecycle history; tách khỏi physical route và chỉ dùng timestamps backend trả.     |

Map và Route Spine luôn bổ trợ nhau. Stale/no-location không làm connector đổi màu
hoặc giả vị trí chính xác.

## 7. Component inventory và variants

| Component/composition | Variants/states phải có                                                                | Contract Customer                                                                   |
| --------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `ScreenScaffold`      | default, keyboard-visible, sticky-action, permission-denied                            | Safe-area insets, max-width 768, scroll inset không để footer che content.          |
| `PageHeader`          | list, create/detail with back, busy                                                    | Một page title; action không làm title co mất nghĩa.                                |
| `Button`              | primary, secondary, destructive; pressed, disabled, loading                            | Cùng kích thước khi loading; `accessibilityState`; one-primary-action.              |
| `StatusBadge`         | toàn bộ Order/Payment canonical states                                                 | Nhãn tiếng Việt + semantic role core; không dùng raw enum làm visible copy.         |
| `CustomerRouteSpine`  | compact, entry, full, status; 0/1/2/3 stops                                            | Theo mục 6; connector decorative; no continuous animation.                          |
| `AddressField`        | idle, focused, searching, results, no-results, selected, invalid, provider-error       | Visible label, selected address wrap, stable error area; search qua port.           |
| `StopControls`        | add, remove, max-reached                                                               | 44 px target; accessible label nêu đúng stop; không reorder gesture.                |
| `VehicleSelector`     | MOTORBIKE, VAN, TRUCK; selected, invalid, disabled                                     | Native radio semantics; copy tiếng Việt nhưng value gửi vẫn canonical.              |
| `CargoFields`         | note, optional weight, invalid                                                         | Long cargo note wrap; keyboard phù hợp; không tự tính vehicle/price.                |
| `CargoMediaPicker`    | empty, selected-local, invalid type/size, uploading, retry, uploaded                   | JPEG/PNG/WebP, 10 MB được validate trước request; giữ selection khi retry được.     |
| `EstimatePanel`       | idle, loading, ready, demo, error, outdated, expired                                   | Route/distance/duration/price/ETA đều từ port; source/timestamp visible.            |
| `EtaIndicator`        | loading, ready, `DEMO`, unavailable, expired                                           | Luôn “ETA dự kiến”; `DEMO` luôn “Dữ liệu mô phỏng”; loading không render `0 phút`.  |
| `PriceSummary`        | ready, unavailable, outdated                                                           | Label `Giá dự kiến`; format VND, không tính hoặc sửa amount.                        |
| `MapTrackingPanel`    | loading, route-only, live, stale, no-location, reconnecting, disconnected, unavailable | Min-height 280; last-updated visible; giữ last-known marker khi stale/disconnected. |
| `DriverSummary`       | no-driver, assigned, unavailable                                                       | Không invent contact/chat/call feature; chỉ hiện dữ liệu được cấp quyền.            |
| `PaymentPanel`        | UNPAID, QR_CREATED, QR expired, PAID_MANUAL, FAILED, pending                           | Amount/reference/expiry/source từ backend; preview QR không payable.                |
| `MediaGallery`        | empty, loading, ready, unavailable/error                                               | Cargo/proof media read-only trên detail; alt/accessible labels có loại và thứ tự.   |
| `ActionBar`           | estimate, create, pay, refresh, pending, disabled                                      | Sticky only when useful; safe area + keyboard; action order do view model cung cấp. |
| `CancelConfirmation`  | available, unavailable, open, pending, error, success/conflict                         | Destructive confirmation; no fake local transition; focus/read order rõ.            |
| `ScreenState`         | loading, empty, no-results, error, success, permission-denied, offline                 | Copy/action theo screen; permission state không nhận/render private children.       |

### 7.1 AddressField details

- Search query là form/UI state; result là server state qua `CustomerOrderPort`.
- Result list dùng `FlatList` với stable key; loading, no-results và provider error có
  region riêng, không thay label của input.
- Query input có thể là một dòng; selected address luôn render trong read-only text
  block có wrap để Customer kiểm tra đầy đủ label trước estimate.
- Tọa độ là dữ liệu boundary; không hiển thị như primary copy và không được fixture
  tự tạo từ address string.
- Khi chọn result mới, mọi estimate phụ thuộc route chuyển sang `outdated`; amount và
  ETA cũ không tiếp tục được dùng cho submit.

### 7.2 Estimate, price và ETA

`EstimatePanel` nhận một discriminated view state, không nhận các field rời dễ tạo
combination vô nghĩa:

| State      | Nội dung                                                                               | Primary action                                   |
| ---------- | -------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `idle`     | Chưa có estimate; giải thích ngắn cần hoàn tất route/vehicle.                          | `Tính giá và ETA dự kiến` khi form shape hợp lệ. |
| `loading`  | Skeleton đúng shape + “Đang tính giá và ETA dự kiến”.                                  | Disabled/busy; không cho request lặp.            |
| `ready`    | Distance, duration, `Giá dự kiến`, `ETA dự kiến`, source, `calculatedAt`.              | `Tạo đơn`.                                       |
| `demo`     | Như ready và nhãn persistent `Dữ liệu mô phỏng`.                                       | `Tạo đơn`; demo label không nằm trong tooltip.   |
| `error`    | Message dễ hiểu; request ID khi cần hỗ trợ; giữ input.                                 | `Thử tính lại`.                                  |
| `outdated` | Nói route/vehicle đã đổi và estimate cần tính lại; không hiện amount như còn hiệu lực. | `Tính lại giá và ETA dự kiến`.                   |
| `expired`  | “Ước tính đã hết hạn. Hãy tính lại trước khi tạo đơn.”                                 | `Tính lại giá và ETA dự kiến`.                   |

Backend vẫn là authority khi submit. Runtime contract cần trả hoặc map rõ trạng thái
hết hạn; UI không tự đặt thời hạn bằng fixture/timer.

### 7.3 Payment, map/tracking, media và cancel

- `PaymentPanel` chỉ render action khi view model cung cấp `canCreateIntent`. QR có
  amount, reference, expiry và provider source. Snapshot preview dùng placeholder
  không encode payload thanh toán và luôn nằm dưới preview banner.
- `MapTrackingPanel` giữ route/last-known marker khi reconnecting hoặc stale, đồng
  thời hiện “Cập nhật lần cuối …”. `no-location` khác `no-driver` và khác map provider
  unavailable.
- Cargo image là optional. Client có thể báo file type/size trước request, nhưng
  server quyết định acceptance. Static callback không biến `selected-local` thành
  `uploaded`; catalogue chọn hai snapshot riêng. Nếu order đã persist nhưng cargo
  upload lỗi, UI giữ returned order ID và chỉ retry upload—không replay create order.
- Cancel action xuất hiện theo `cancel.availability`. Confirmation có action
  `Giữ đơn` và `Xác nhận hủy đơn`; pending khóa cả hai action chống gửi lặp. Conflict
  tải lại order response chuẩn trước khi render state tiếp theo.

## 8. Token mapping — chỉ consume LEOPARD Core

Không có Customer palette, type scale, radius hoặc shadow riêng. Nếu platform token
chưa parity, role lane chờ Mobile Foundation; không copy raw value vào screen.

| Intent           | Core token/contract                                        | Customer usage                                                                                 |
| ---------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Canvas/surface   | `neutral.background`, `neutral.surface`                    | Canvas, section shift, skeleton/disabled surface.                                              |
| Primary action   | `brand.background`, `brand.text`                           | Đúng một primary CTA.                                                                          |
| Main/muted copy  | `neutral.text`, `neutral.mutedText`                        | Address/cargo/status context và metadata.                                                      |
| Status/feedback  | `info.*`, `warning.*`, `active.*`, `success.*`, `danger.*` | Canonical status, estimate info, stale warning, success/error; luôn kèm text.                  |
| Typography       | `pageTitle`, `sectionTitle`, `body`, `label`, `caption`    | Một page title; section hierarchy; numeric metadata dùng tabular numerals khi platform hỗ trợ. |
| Spacing          | `xxs/xs/sm/md/lg/xl`                                       | Field gap `md`, section gap `lg`, grid gutters/gaps theo mục 5.                                |
| Radius           | `radius.control`, `radius.card`, `radius.pill`             | Control/panel, status badge; không bo mọi section.                                             |
| Border/elevation | Core neutral 1 px; shadow chỉ modal/drawer                 | Section dùng divider/whitespace; no page-section shadow.                                       |
| Touch/control    | `control.minimumTouchHeight`                               | Tất cả action ít nhất 44 px; sticky primary giữ size.                                          |
| Motion           | `motion.none/fast/standard/slow`                           | Pressed/state/disclosure; reduced motion dùng `none`.                                          |
| Map/layout       | Core min map height 280, content max-width 768             | Không tạo role size token mới.                                                                 |

Mobile baseline hiện có semantic color/spacing/radius/body tokens tại
[`tokens.ts`](../../apps/mobile/src/theme/tokens.ts). `pageTitle` và motion platform
mapping vẫn là trách nhiệm Mobile Foundation nếu chưa có trong runtime; Customer
screen không tự khai báo raw replacement.

## 9. Interaction, feedback và motion

### 9.1 Interaction rules

- Route file đọc/validate params rồi delegate; business/async state ở feature
  container/hook.
- Một action pending đặt `busy + disabled`, giữ nguyên kích thước/label context và
  chặn double-submit.
- Success chỉ announce sau response đã persist. Toast có thể bổ sung, không thay nội
  dung source đã refresh.
- Retry chỉ xuất hiện khi an toàn: list/detail fetch, address search, estimate, map,
  tracking reconnect, media upload và payment refresh theo port contract.
- Destructive cancel luôn có confirmation; back/system dismiss khi pending không
  được tạo request thứ hai.
- Pull-to-refresh giữ content cũ nếu có; không thay toàn screen bằng spinner.

### 9.2 Motion

| Transition                                 | Token                         | Purpose                                                |
| ------------------------------------------ | ----------------------------- | ------------------------------------------------------ |
| Pressed/focus color                        | `motion.fast` (120 ms)        | Xác nhận control đã nhận input.                        |
| Filter/disclosure/modal                    | `motion.standard` (180 ms)    | Giữ orientation khi mở/đóng.                           |
| Route/screen orientation có quãng đường rõ | Tối đa `motion.slow` (240 ms) | Chỉ dùng khi giúp hiểu vị trí mới.                     |
| Immediate state/privacy boundary           | `motion.none`                 | Permission-denied, disabled/pending và reduced motion. |

Không animate Route Spine connector liên tục, marker nhấp nháy, KPI, price hoặc ETA.
Không dùng animation để che provider/network latency.

### 9.3 Reduced motion

- Tôn trọng OS reduced-motion setting qua platform utility do Mobile Foundation sở
  hữu; Customer components chỉ consume result.
- Tắt connector drawing, shimmer/pulse decorative và travel animation; dùng static
  skeleton shape + progress copy/live announcement.
- Modal/disclosure chuyển ngay hoặc dùng fade ngắn không bắt buộc; focus/read order
  không đổi giữa normal và reduced motion.
- Loading indicator lặp chỉ khi là feedback thiết yếu và luôn có text; không tạo
  layout shift.

## 10. Responsive, keyboard, safe area và long content

### 10.1 Viewport behavior

| Check      | `360 × 800`                                                              | `390 × 844`                                              | `768 × 1024`                                            |
| ---------- | ------------------------------------------------------------------------ | -------------------------------------------------------- | ------------------------------------------------------- |
| Order list | One-column virtualized rows; filter control wraps; create CTA reachable. | Cùng hierarchy, không tăng số metadata cạnh tranh.       | Row grid `5 + 3`; title/action cùng row nếu text fit.   |
| Create     | One-column guided flow; sticky CTA; full-width fields.                   | One-column; helper/error có room nhưng address vẫn wrap. | `5 + 3` split ở fontScale thường; fallback one-column.  |
| Detail     | Status/route first; map 280 px; panels tuần tự.                          | Cùng order, thêm whitespace core.                        | Route/map `5`, context/payment `3`, history full width. |
| Overflow   | Không horizontal overflow.                                               | Không horizontal overflow.                               | Không horizontal overflow; max content 768.             |

### 10.2 Keyboard + safe area + sticky action

- Root app giữ `SafeAreaProvider`; screen đọc bottom inset từ
  `react-native-safe-area-context`.
- Form screen dùng `KeyboardAvoidingView`/keyboard-aware composition với behavior
  explicit theo iOS/Android; không dùng React Native core `SafeAreaView`.
- Sticky action đặt trên `max(bottomInset, spacing.md)` và cộng scroll content inset
  bằng footer height + safe area; field/error cuối cùng vẫn scroll qua footer.
- Khi keyboard mở, focused field, suggestion result và active CTA không bị che. Nếu
  chiều cao không đủ, CTA tham gia scroll flow thay vì ép overlay.
- Submit bằng keyboard không bỏ qua validation/pending guard; `returnKeyType` chỉ
  chuyển focus hoặc gọi cùng guarded handler.
- Bottom navigation shell và sticky action không được chồng nhau; shell/foundation
  owner cung cấp inset contract chung.

### 10.3 Long Vietnamese copy và Dynamic Type

- Test address ít nhất 3–4 dòng, 3 stops đều dài và cargo note nhiều dòng; không dùng
  ellipsis cho thông tin cần quyết định route.
- `allowFontScaling` giữ mặc định `true`; không đặt fixed height cho text container.
- Không đặt `maxFontSizeMultiplier` để cap body/form/action nếu chưa có accessibility
  review; gate dùng ít nhất một accessibility-large size có trên test device.
- Layout dùng `useWindowDimensions().fontScale`; type lớn làm action label wrap, row
  stack và grid hai cột reflow một cột.
- Visible labels, hint và error không chồng nhau; stable error area không được cắt khi
  font tăng.
- Price/ETA/source có thể wrap thành các dòng riêng; không thu nhỏ font để giữ một
  hàng.
- Map giữ min-height nhưng không buộc text/controls overlay trên map.

## 11. React Native accessibility contract

### 11.1 Semantics và accessible names

| Element                    | RN contract / label example                                                                                                         |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Page/section heading       | `Text accessibilityRole="header"`; một page title trước section headings trong read order.                                          |
| Order row                  | `Pressable accessibilityRole="button"`; label tổng hợp vừa đủ: “Đơn …, Chờ tài xế, từ … đến …”; hint “Mở chi tiết đơn”.             |
| Status badge               | Label “Trạng thái đơn: Chờ tài xế”; visible text không phải raw enum.                                                               |
| Status filter              | Button/adjustable control có visible label `Trạng thái`; selected state qua `accessibilityState`.                                   |
| Address input              | `TextInput` có visible label, `accessibilityLabel`, hint/error liên hệ; placeholder không thay label.                               |
| Address results            | Mỗi result là button với full address; announce result count sau response, không sau mỗi keystroke.                                 |
| Route node                 | Accessible group đọc role + index + full address; connector/marker decorative bị ẩn.                                                |
| Add/remove stop            | “Thêm điểm dừng”; “Xóa điểm dừng 2”; hint nêu kết quả khi chưa rõ.                                                                  |
| Vehicle selector           | `radiogroup`/`radio` semantics và `checked` state; label tiếng Việt.                                                                |
| Primary/destructive action | `button`, name cụ thể, `busy/disabled`; tối thiểu 44 × 44 px.                                                                       |
| Map                        | Accessible summary “Bản đồ lộ trình…” + last updated; map controls có name riêng; không đọc mọi tile/marker decorative.             |
| QR                         | `image` với amount/reference/expiry; expired được announce bằng text, không chỉ đổi opacity.                                        |
| Cancel confirmation        | Modal accessible name, reading order heading → consequence → actions; focus/announcement trở về cancel trigger hoặc result heading. |

Tất cả icon-only action có accessible name. `hitSlop` có thể mở vùng chạm nhưng visual
target và khoảng cách vẫn phải tránh target chồng nhau.

### 11.2 Dynamic announcements

- `loading`, result count, tracking reconnect, upload/payment/cancel result dùng
  polite live announcement khi không khẩn cấp.
- Field validation và request failure chặn task dùng alert semantics; không announce
  cùng message nhiều lần ở parent và child.
- Android dùng `accessibilityLiveRegion` phù hợp; iOS dùng platform announcement
  utility có kiểm soát khi native semantics không tự announce.
- Permission-denied focus/read order bắt đầu ở denial heading; private children không
  mount.
- Navigation đến detail/create đưa accessibility focus đến page title khi Expo Router
  không tự làm điều đó.

### 11.3 Touch/read-order gate

- Mọi press target tối thiểu `44 × 44` px, kể cả add/remove stop, retry, QR refresh,
  media remove và modal close.
- Visual order = screen-reader order = keyboard focus order trên mobile web export.
- Sticky footer không che focused control, TalkBack/VoiceOver focus ring hoặc error.
- Status/route/payment không truyền đạt bằng màu, map position hoặc icon đơn lẻ.

## 12. Copy rules

### 12.1 Vocabulary bắt buộc

| Intent      | Copy dùng                                                | Không dùng                                    |
| ----------- | -------------------------------------------------------- | --------------------------------------------- |
| ETA         | `ETA dự kiến`                                            | `ETA`, `Đến lúc`, ngôn ngữ cam kết.           |
| Demo source | `Dữ liệu mô phỏng` cạnh ETA/estimate                     | Tooltip-only hoặc giấu trong info icon.       |
| Price       | `Giá dự kiến`                                            | `Giá cuối cùng` khi backend chỉ trả estimate. |
| Create      | `Tính giá và ETA dự kiến`, `Tạo đơn`                     | `Submit`, `Tiếp tục` mơ hồ ở decision cuối.   |
| Cancel      | `Hủy đơn`, `Xác nhận hủy đơn`, `Giữ đơn`                 | `OK`, destructive icon không label.           |
| Tracking    | `Cập nhật lần cuối …`, `Đang kết nối lại`                | `Live` khi dữ liệu stale/no location.         |
| Empty list  | `Bạn chưa có đơn hàng nào.` + `Tạo đơn mới`              | `Không có dữ liệu` generic.                   |
| No results  | `Không có đơn khớp trạng thái đã chọn.` + `Xóa bộ lọc`   | Dùng cùng copy với empty account.             |
| Error       | Vấn đề + hành động tiếp theo; request ID khi cần support | Stack, provider credential, raw `details`.    |

Canonical order/payment labels dùng bảng trong core design system. Action bắt đầu
bằng động từ nghiệp vụ, sentence case, tiếng Việt. Timestamp nói rõ timezone theo
presentation policy; amount format VND từ integer backend. Không invent Driver phone,
chat, insurance, guarantee hoặc delivery promise.

### 12.2 Sensitive/private copy

- Permission-denied không nhắc lại order ID, address, Driver hoặc payment amount.
- Screen reader aggregate label không đọc cargo note/media metadata nhạy cảm ở list.
- Preview fixture chỉ dùng dữ liệu hư cấu rõ ràng, không copy PII/log production.

## 13. Full Customer state matrix

Mỗi scenario ID là một immutable preview snapshot. `success` trong catalogue mô tả
composition sau persisted response theo contract; preview không chứng minh persistence.

### 13.1 `/customer/orders`

| Scenario ID         | State/input                    | Presentation và action                                             | Accessibility/privacy                                              |
| ------------------- | ------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `C-LIST-LOADING`    | Initial `loading`              | Skeleton rows đúng shape; filter/create giữ layout; no `0` values. | Region busy + polite “Đang tải đơn hàng”; không đọc từng skeleton. |
| `C-LIST-SUCCESS`    | `success`, nhiều status        | Normal list, compact Route Spine, controlled load-more.            | Announce result count sau load; rows có concise names.             |
| `C-LIST-EMPTY`      | `empty`, account chưa có order | “Bạn chưa có đơn hàng nào.” + `Tạo đơn mới`.                       | Heading + action; không dùng illustration làm nội dung chính.      |
| `C-LIST-NO-RESULTS` | `no-results`, filter active    | Filter summary + `Xóa bộ lọc`; không gọi là empty account.         | Focus/announcement vào no-results heading; clear filter 44 px.     |
| `C-LIST-ERROR`      | Initial query `error`          | Message dễ hiểu, request ID nếu có, `Thử lại`.                     | Alert once; no technical details.                                  |
| `C-LIST-REFRESHING` | Có content, refresh pending    | Giữ rows, inline refresh status; disable duplicate refresh.        | Polite status; không reset focus/list position.                    |
| `C-LIST-PAGE-ERROR` | Load-more error                | Giữ items; inline `Thử tải thêm`.                                  | Error gắn với pagination region.                                   |
| `C-LIST-OFFLINE`    | Cached content + offline       | Persistent offline notice, timestamps; safe retry.                 | Không gọi cache là mới nhất.                                       |
| `C-LIST-PERMISSION` | `permission-denied`            | Chỉ denial state + về role home.                                   | Không mount/order rows, không data flash.                          |

### 13.2 `/customer/orders/new`

| Scenario ID                 | State/input                          | Presentation và action                                               | Authority/accessibility                               |
| --------------------------- | ------------------------------------ | -------------------------------------------------------------------- | ----------------------------------------------------- |
| `C-NEW-READY`               | Empty valid form shell               | Guided fields; estimate CTA disabled đến khi form shape valid.       | Visible labels; disabled reason in text.              |
| `C-NEW-INVALID`             | Field validation error               | Stable inline errors; focus/scroll đến first invalid field.          | Error liên hệ field và announced once.                |
| `C-NEW-ADDRESS-LOADING`     | Address search pending               | Stable result region skeleton/progress.                              | Polite “Đang tìm địa điểm”.                           |
| `C-NEW-ADDRESS-NO-RESULTS`  | Search returns none                  | “Không tìm thấy địa điểm phù hợp”; keep query.                       | Result count announcement; no false selected point.   |
| `C-NEW-ADDRESS-ERROR`       | Map provider error                   | Keep query/selected route; `Thử tìm lại`.                            | Provider detail hidden; safe retry.                   |
| `C-NEW-ESTIMATE-LOADING`    | Estimate request pending             | Stable panel skeleton; CTA busy; no zero ETA/price.                  | Busy state + one polite announcement.                 |
| `C-NEW-ESTIMATE-ERROR`      | Provider/API failure                 | Keep all input; explanatory error + `Thử tính lại`.                  | Alert, request ID only when useful.                   |
| `C-NEW-ESTIMATE-READY`      | Valid estimate response              | Route, distance, duration, price, ETA, source/time; `Tạo đơn`.       | Group label reads “Giá dự kiến… ETA dự kiến…”.        |
| `C-NEW-ESTIMATE-DEMO`       | Ready + source DEMO                  | Same content + persistent `Dữ liệu mô phỏng`.                        | Demo label included in accessible summary.            |
| `C-NEW-ESTIMATE-OUTDATED`   | Estimate-driving input changed       | Remove old confirmation affordance; ask calculate again.             | Does not announce stale amount as usable.             |
| `C-NEW-ESTIMATE-EXPIRED`    | Port says estimate expired           | Expired message + `Tính lại giá và ETA dự kiến`.                     | No client/fixture expiry calculation.                 |
| `C-NEW-MEDIA-INVALID`       | Wrong MIME/over 10 MB                | Inline file error before request; keep form.                         | Error names accepted JPEG/PNG/WebP and 10 MB limit.   |
| `C-NEW-MEDIA-RETRY`         | Upload/orchestration error           | Keep selection when possible + retry/remove.                         | Buttons named with file context; 44 px.               |
| `C-NEW-SUBMIT-PENDING`      | Create request pending               | `Đang tạo đơn`; all submit paths busy/disabled.                      | Busy state; double-submit blocked.                    |
| `C-NEW-SUBMIT-ERROR`        | API validation/provider error        | Keep non-sensitive draft; field/region error; retry when safe.       | Backend message mapped; raw details hidden.           |
| `C-NEW-SUBMIT-CONFLICT`     | Estimate invalid/expired at server   | Explain data changed/estimate expired; refresh estimate.             | Backend remains authority; no local forced success.   |
| `C-NEW-CREATED-MEDIA-ERROR` | Order persisted, cargo upload failed | Show returned order + cargo retry; never submit create again.        | Announce partial result precisely; no fake rollback.  |
| `C-NEW-SUCCESS`             | Persisted response snapshot          | Confirmation then navigate to returned order detail.                 | Announce “Đã tạo đơn”; preview banner says simulated. |
| `C-NEW-OFFLINE`             | Offline before estimate/submit       | Keep non-sensitive draft; no fake estimate/create; retry connection. | Offline status persistent.                            |
| `C-NEW-PERMISSION`          | Wrong role/session ownership state   | Denial/session path; form/private draft not rendered to wrong role.  | Focus denial/login heading.                           |

### 13.3 `/customer/orders/:id`

| Scenario ID                      | State/input                         | Presentation và action                                                            | Authority/accessibility                                    |
| -------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `C-DETAIL-LOADING`               | Initial `loading`                   | Stable header/route/map/panel skeletons.                                          | Busy region; no private placeholder values.                |
| `C-DETAIL-SUCCESS`               | `success`                           | Status, full route, estimate, map/tracking, payment, media, history.              | Heading/section order follows visual order.                |
| `C-DETAIL-ERROR`                 | Query `error`                       | No stale private flash; error + safe retry/request ID.                            | Alert once.                                                |
| `C-DETAIL-PERMISSION`            | `permission-denied`/foreign ID      | Denial only; return to Customer orders.                                           | Private composition never mounts.                          |
| `C-DETAIL-NO-DRIVER`             | `driver.kind = none`                | “Chưa có tài xế nhận đơn”; route/status remain.                                   | Text, not empty map marker or color alone.                 |
| `C-DETAIL-NO-LOCATION`           | Driver assigned, no point           | Route-only map + “Chưa có vị trí tài xế”.                                         | Distinct from no Driver and permission denial.             |
| `C-DETAIL-TRACKING-FRESH`        | Fresh point/event                   | Marker + backend timestamp; normal status.                                        | Accessible summary, no repetitive per-point announcements. |
| `C-DETAIL-TRACKING-STALE`        | Adapter says stale                  | Keep last marker + “Cập nhật lần cuối …”; no live claim.                          | Warning text/icon, not color alone.                        |
| `C-DETAIL-TRACKING-RECONNECT`    | Socket reconnecting                 | Keep context; inline “Đang kết nối lại”.                                          | Polite status; unrelated actions remain available.         |
| `C-DETAIL-TRACKING-DISCONNECTED` | Reconnect failed/disconnected       | Keep last marker/time; persistent disconnected notice + safe retry.               | Does not announce last-known data as live.                 |
| `C-DETAIL-MAP-ERROR`             | Map provider unavailable            | Route Spine remains; stable 280 px fallback + retry.                              | Fallback conveys route textually.                          |
| `C-DETAIL-PAYMENT-UNPAID`        | UNPAID + action supplied            | Amount/source context + `Tạo mã QR thanh toán`.                                   | Primary only when view model marks it primary.             |
| `C-DETAIL-PAYMENT-PENDING`       | Create intent pending               | Stable panel; action busy; prevent duplicate intent.                              | Busy + polite announcement.                                |
| `C-DETAIL-QR-READY`              | QR_CREATED, valid                   | QR, amount, reference, expiry, source.                                            | Image label includes amount/reference/expiry.              |
| `C-DETAIL-QR-EXPIRED`            | Port says QR expired                | Expired label; QR visually and semantically inactive; refresh action if supplied. | No fixture/client expiry calculation; not opacity-only.    |
| `C-DETAIL-PAYMENT-PAID`          | PAID_MANUAL                         | Canonical success badge + confirmation metadata.                                  | Read-only; Customer cannot confirm payment.                |
| `C-DETAIL-PAYMENT-FAILED`        | FAILED                              | Failure reason safe for user + retry/create action only if supplied.              | Alert/status text; no raw provider details.                |
| `C-DETAIL-PAYMENT-CONFLICT`      | Active intent already exists        | Refresh payment source and show the active intent; do not create another locally. | Backend owns uniqueness; announce refreshed state.         |
| `C-DETAIL-MEDIA-EMPTY`           | No visible media                    | Concise “Chưa có ảnh”; no decorative placeholder card.                            | Section can be skipped if no decision depends on it.       |
| `C-DETAIL-MEDIA-ERROR`           | Signed URL/load error               | Keep metadata; retry safely.                                                      | Image error has text alternative.                          |
| `C-DETAIL-CANCEL-AVAILABLE`      | View model allows cancel            | Destructive secondary action opens confirmation.                                  | Name `Hủy đơn`; consequence stated.                        |
| `C-DETAIL-CANCEL-UNAVAILABLE`    | `cancel.availability = unavailable` | No actionable destructive control; inline reason supplied by backend/view model.  | Reason is text and reachable in read order.                |
| `C-DETAIL-CANCEL-PENDING`        | Cancel command pending              | Confirmation/action busy; block dismiss/double-submit where needed.               | Busy/disabled states announced.                            |
| `C-DETAIL-CANCEL-ERROR`          | Command error                       | Keep order source; error in modal/region + safe retry.                            | Focus remains in modal or moves to error heading.          |
| `C-DETAIL-CANCEL-CONFLICT`       | Lifecycle changed                   | Close/replace stale confirmation, refetch source and explain change.              | UI does not force CANCELLED.                               |
| `C-DETAIL-CANCEL-SUCCESS`        | Persisted cancel response           | Render refreshed canonical `CANCELLED` status + feedback.                         | Announce once; preview does not claim real persistence.    |
| `C-DETAIL-OFFLINE`               | Cached detail + offline             | Keep content, last-updated labels; disable unsupported network commands.          | Disabled reason visible; cache not called latest.          |

Session expiration is a shell-level state across all three routes: preserve only
non-sensitive draft per approved storage policy, clear private runtime data and move
focus to login/session-expired heading.

## 14. Feature-local view-model, port, fixture và adapter seam

### 14.1 Proposed ownership surface for implementation

| File/surface                                           | Responsibility                                                                            |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `apps/mobile/app/(customer)/orders/*.tsx`              | Thin Expo routes: parse/validate params, select screen; no fetching/business logic.       |
| `apps/mobile/src/features/customer/orders/model.ts`    | Readonly display models and discriminated state unions.                                   |
| `apps/mobile/src/features/customer/orders/port.ts`     | Query/command/event interfaces; no URL, Socket or provider SDK detail.                    |
| `apps/mobile/src/features/customer/orders/fixtures.ts` | Fresh immutable deterministic snapshots keyed by scenario IDs in mục 13.                  |
| `apps/mobile/src/features/customer/orders/adapter.ts`  | Real REST/Socket/media/payment mapping after Wave 3 contract handoff.                     |
| `apps/mobile/src/features/customer/orders/*Screen.tsx` | Container/hook + presentational composition; server cache/form/UI state remain separated. |
| `apps/mobile/src/features/customer/orders/preview/**`  | Guarded catalogue selectors/compositions; never production default.                       |

No draft DTO is added to `packages/shared`. Dynamic `:id`, deep-link input, API
responses and Socket payloads are untrusted and validated at boundary using the
project-approved schema mechanism. This doc does not add a dependency; if no schema
utility exists, implementation opens a controlled decision instead of ad-hoc trust.

### 14.2 State ownership

| Concern                                             | Owner                                                                            |
| --------------------------------------------------- | -------------------------------------------------------------------------------- |
| Server order/list/estimate/payment/tracking history | Query cache via port; never duplicated into client store.                        |
| Socket tracking updates                             | Event port reconciled into server cache; adapter owns duplicate/reconnect rules. |
| Route state                                         | Validated `orderId` and optional filter/search params.                           |
| Form state                                          | React Hook Form/local form model; shape validation only.                         |
| UI state                                            | Focused address, disclosure, cancel modal, selected local media.                 |
| Session secret                                      | Existing secure session storage; never fixture/AsyncStorage/plain log.           |

Presentational components receive immutable data and callbacks. They do not import
`httpClient`, Socket.IO, storage, map, payment or native picker/location SDK.

### 14.3 View-model rules

- Provide semantic unions such as `EstimateView`, `TrackingView`, `PaymentView` and
  `CancelView`; impossible combinations are not represented with unrelated booleans.
- Provide canonical display labels/source/timestamps and explicit action descriptors.
- `actions` contains at most one `emphasis: 'primary'`; component does not choose by
  status.
- `cancel.availability`, `estimate.kind`, `tracking.freshness`, `qr.kind` and
  permission are explicit port/adapter outputs.
- Fixture factories return a new deeply frozen object per call; callbacks are spies
  or intent records, never in-place mutation.

## 15. Local preview catalogue và production guard

### 15.1 Guard contract

Mobile foundation hiện có source contract tại
[`preview-mode.ts`](../../apps/mobile/src/preview/preview-mode.ts),
[`scenario.ts`](../../apps/mobile/src/preview/scenario.ts),
[`PreviewComposition.tsx`](../../apps/mobile/src/preview/PreviewComposition.tsx) và
[`PreviewBanner.tsx`](../../apps/mobile/src/preview/PreviewBanner.tsx):

1. fixture chỉ được chọn khi environment là development/test;
2. build flag đúng giá trị opt-in;
3. local preview opt-in là true;
4. mọi trường hợp khác fail closed sang runtime và không gọi lazy fixture provider;
5. fixture composition luôn hiện `Bản xem trước giao diện — dữ liệu mô phỏng`.

Customer catalogue phải reuse boundary này, không tạo preview switch riêng. Production
export cần test/scan chứng minh fixture provider không được gọi và Customer fixture
không trở thành runtime default.

### 15.2 Catalogue structure

| Catalogue group         | Specimens/scenarios                                                                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `customer/components`   | Buttons; canonical badges; AddressField states; vehicle selector; media states; estimate/ETA/demo; price; payment/QR; map/tracking; cancel confirmation. |
| `customer/route-spine`  | 0, 1, 2, 3 stops; long address; compact/entry/full/status variants; stale/no-location context.                                                           |
| `customer/orders`       | Tất cả `C-LIST-*` scenarios.                                                                                                                             |
| `customer/orders-new`   | Tất cả `C-NEW-*`, gồm keyboard-visible, long cargo, estimate expired và submit pending.                                                                  |
| `customer/order-detail` | Tất cả `C-DETAIL-*`, gồm no Driver, stale/no location, QR expired và cancel unavailable.                                                                 |
| `customer/responsive`   | 360×800, 390×844, 768×1024; default + accessibility-large Dynamic Type; keyboard open/closed.                                                            |
| `customer/motion-a11y`  | Normal/reduced motion; VoiceOver/TalkBack read order; touch-target overlay/check.                                                                        |

Catalogue navigation là development tooling, không xuất hiện trong Customer runtime
routes. QR/media/location/provider data trong catalogue đều inert.

### 15.3 Evidence plan — chưa được tuyên bố là đã có

Implementation/static-gate owner phải bàn giao:

1. Screenshot matrix của ba routes tại 360×800, 390×844, 768×1024, gồm long
   address/cargo, 0–3 stops, keyboard và sticky/safe area.
2. Component/state catalogue captures cho mọi scenario ID; mỗi capture có preview
   banner và deterministic fixture ID.
3. VoiceOver và TalkBack walkthrough: list → create estimate → submit pending; detail
   → tracking stale → QR expired → cancel confirmation.
4. Normal/reduced-motion comparison; proof loading/pressed/disabled giữ kích thước.
5. Contrast/touch-target/text-fit results; no horizontal overflow.
6. Commands thực tế: `pnpm --filter mobile test`, `typecheck`, `lint`, `export` và
   Maestro khi environment sẵn sàng.
7. Real-integration evidence sau Wave 3: API/Socket/upload/payment adapters,
   persistence qua relaunch, ownership denial và E2E role journey.

Không có screenshot, score, test pass hoặc screen-reader result nào được invent trong
tài liệu này.

## 16. Scorecard readiness mapping — chưa chấm điểm

Threshold tương lai vẫn là `>=85/100`, mọi category `>=8/10`, accessibility gate và
AI-slop gate pass, zero blockers. Bảng dưới chỉ map design readiness; cột score cố ý
không tồn tại vì Customer implementation/evidence chưa hoàn tất.

|   # | Category                | Design decision sẵn sàng                                                              | Runtime evidence còn cần                                         | Status                |
| --: | ----------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------- |
|   1 | Color consistency       | Mục 8 chỉ dùng core semantic tokens/canonical labels; color luôn kèm text.            | Token scan, contrast result, status samples trên implementation. | `SPECIFIED / PENDING` |
|   2 | Typography hierarchy    | Một page title, heading order, wrap/Dynamic Type và long Vietnamese fixtures đã khóa. | RN tree + screenshots ở font scale lớn; overlap/text-fit result. | `SPECIFIED / PENDING` |
|   3 | Spacing rhythm          | Chỉ dùng core scale; grid/gutter có named rationale; no nested card.                  | Source scan và dense/long compositions thực tế.                  | `SPECIFIED / PENDING` |
|   4 | Component consistency   | Inventory và variants ở mục 7; one-primary-action, stable loading size.               | Catalogue, interaction tests và deviation log.                   | `SPECIFIED / PENDING` |
|   5 | Responsive behavior     | Anatomy/grid 360/390/768; keyboard/safe-area/sticky/reflow contract.                  | Screenshot/overflow matrix trên device/export.                   | `SPECIFIED / PENDING` |
|   6 | Motion & reduced motion | Core motion mapping và fallback ở mục 9.                                              | Normal/reduced recordings hoặc tests.                            | `SPECIFIED / PENDING` |
|   7 | Accessibility           | RN roles/labels/states/live regions, 44 px, read order và privacy gate ở mục 11.      | VoiceOver/TalkBack, touch-target, contrast và focus evidence.    | `SPECIFIED / PENDING` |
|   8 | Information density     | First scan/current task/status/route/exception hierarchy ở mục 4–5.                   | Annotated implemented screens + reviewer scan test.              | `SPECIFIED / PENDING` |
|   9 | State completeness      | Full scenario matrix gồm required generic/domain states ở mục 13.                     | Catalogue captures/tests cho từng applicable state.              | `SPECIFIED / PENDING` |
|  10 | Polish & AI-slop        | Copy, edge cases, map/media fallback và do/don't đã khóa.                             | Visual diff, AI-slop checklist và reviewer decision.             | `SPECIFIED / PENDING` |

**Accessibility gate:** design contract ready; runtime gate `PENDING`.

**AI-slop gate:** prohibited patterns specified; runtime/source review `PENDING`.

**Dark mode:** `N/A` cho pilot; no-partial-dark source scan `PENDING`.

**Role score:** `NOT SCORED` cho đến khi có implementation, preview build và evidence
package thực tế.

## 17. Do / Don't

### Do

- Dùng Customer Route Spine để giữ pickup–stops–dropoff nhất quán xuyên journey.
- Hiện status, source, `calculatedAt`/last updated và exception tại nội dung chúng mô
  tả.
- Giữ một primary action, target 44 px, stable pending state và safe-area inset.
- Giữ input/draft khi estimate/provider/upload retry an toàn.
- Phân biệt empty với no-results, no Driver với no location, stale với live, expired
  với failed.
- Dùng divider, heading, whitespace và surface shift để nhóm nội dung.
- Để adapter map backend DTO/event sang immutable role view model.

### Don't

- Không gradient tím/xanh trang trí, glassmorphism, decorative hero/blob hoặc stock
  image.
- Không card lồng card, mọi section đều rounded, shadow nhiều lớp hoặc pill cho mọi
  control.
- Không partial dark mode, `dark:` utility, theme toggle hoặc dark token riêng lẻ.
- Không animate connector/marker/price/ETA để trang trí.
- Không dùng random fixture, QR payable, fake upload/Socket/persistence hoặc fake
  success mutation.
- Không tính price/ETA, suy luận lifecycle/permission/payment/cancel ở component.
- Không gọi Vietmap/payment/storage trực tiếp hoặc đưa provider credential vào client.
- Không dùng generic English, raw enum, `Submit`, tooltip-only source hoặc color-only
  status.
- Không truncate long address/cargo cần cho quyết định và không ép text vào fixed
  height.

## 18. Design handoff và unresolved runtime evidence

### Decisions locked by W4-DS01

- Direction `guided / calm`, comfortable density, first-scan order và Customer Route
  Spine là role motif.
- Anatomy/grid cho ba routes tại 360/390/768, gồm keyboard/safe-area/sticky action.
- Component inventory/variants, 0–3 stops, complete Customer state matrix,
  accessibility/copy/motion/reduced-motion contracts.
- Core-only token mapping và feature-local view-model/port/fixture/adapter boundary.
- Guarded local preview catalogue/evidence plan và scorecard readiness mapping không
  có fabricated score.

### Runtime evidence/blockers còn mở

- Tại thời điểm authoring, source
  [`orders/index.tsx`](<../../apps/mobile/app/(customer)/orders/index.tsx>) vẫn là
  placeholder; routes `/new`, `/:id`, role components và Customer catalogue chưa có
  implementation evidence trong artifact này.
- Mobile Foundation cần chứng minh platform mapping cho `pageTitle`, motion/reduced
  motion, scaffold/sticky inset và các component còn thiếu; role lane không tự thêm
  raw replacement.
- Estimate/QR expiry cần contract adapter rõ từ Wave 3; backend vẫn là authority.
- Create-order + cargo-media dùng hai API operations; adapter phải chứng minh partial
  success/retry không tạo duplicate order.
- Chưa có screenshot 360/390/768, long-copy/Dynamic Type/keyboard capture, contrast,
  touch-target, VoiceOver/TalkBack hoặc reduced-motion result.
- Chưa chạy Customer component tests, mobile lint/typecheck/export, Maestro,
  API/Socket/upload/payment integration, persistence hoặc authorization E2E.

Reviewer chỉ có thể chuyển artifact sang approved role spec sau direction/design review.
Integration Owner chỉ có thể ghi `STATIC_GATE_PASSED` sau implementation và evidence
package; PH-12 vẫn chờ real integration và E2E.
