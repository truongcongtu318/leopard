# LEOPARD Driver Mobile System Design

> **Card:** W4-DS02
>
> **Ownership:** Driver role design document
>
> **Trạng thái:** `APPROVED_FOR_STATIC_IMPLEMENTATION`
>
> **Implementation/static-gate evidence:** `PENDING`
>
> **Independent review:** Halley (`01a003b1-473a-7112-a0f8-236a160dc5a6`),
> 2026-08-15 — không có P0/P1/P2
>
> **Routes:** `/driver/orders`, `/driver/orders/:id`

Tài liệu này khóa design contract cho Driver mobile trước khi W4-S03 triển khai
screen. Đây không phải bằng chứng rằng Driver journey, API, Socket, upload hoặc
location đã hoạt động. Mọi lifecycle, assignment, tracking health, proof readiness,
ETA và permission nghiệp vụ vẫn do backend/adapter có thẩm quyền cung cấp.

## 1. Mục đích, audience và hướng thiết kế

Driver thao tác ngoài hiện trường, thường bằng một tay, dưới ánh sáng mạnh, trong lúc
đang di chuyển giữa các điểm. Giao diện phải trả lời được ba câu hỏi trong lần quét
đầu tiên:

1. Tôi đang sẵn sàng hay đang có chuyến nào?
2. Chuyến hiện ở trạng thái nào và kết nối gửi vị trí có ổn không?
3. Việc duy nhất cần làm tiếp theo là gì?

| Thuộc tính       | Quyết định cho Driver                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Purpose          | Giảm thời gian tìm current task, giảm transition sai và làm rõ tracking/proof trước khi Driver hành động                        |
| Audience         | Driver pilot lặp lại workflow ngoài hiện trường trên điện thoại, có thể gặp nắng mạnh, rung, mạng chập chờn và thao tác một tay |
| Tone             | Trực tiếp, bình tĩnh, không đổ lỗi; copy dùng động từ nghiệp vụ cụ thể                                                          |
| Direction        | Outdoor, action-first, tương phản cao bằng semantic token đã duyệt; không tạo palette riêng                                     |
| Density          | `sm–md`, ít metadata trong lần quét đầu; chi tiết hỗ trợ nằm sau current task                                                   |
| First scan       | System exception ảnh hưởng chuyến → active trip/current status → đúng một primary task → route → tracking/proof → metadata      |
| Memorable detail | `Active-trip rail`: một rail chức năng nối order, trạng thái chuyến, tracking health và proof readiness                         |
| Constraints      | Mobile-first, WCAG AA, Dynamic Type, safe area, touch target, privacy trước assignment, fixture có guard và backend authority   |

### 1.1 Skill evidence đã áp dụng

| Skill                       | Evidence trong design contract này                                                                                                                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend-design-direction` | Khóa purpose/audience/tone/density/first scan; chọn outdoor action-first; dùng `Active-trip rail` làm chi tiết nhận diện có chức năng; loại hero, flourish và nested card                                         |
| `react-native-patterns`     | Route mỏng và validate param; tách server/route/form/native state; `FlatList` cho danh sách; `StyleSheet` + core token; safe area, Dynamic Type, native accessibility; native location/socket/client nằm sau port |
| `design-system`             | Map semantic color/type/spacing/radius/motion về core; định nghĩa component/state catalogue; map đủ mười category scorecard; giữ dark mode `N/A` và áp dụng AI-slop gate                                          |

Tên skill ở đây đi cùng quyết định cụ thể; không được dùng bảng này như implementation
evidence. Evidence runtime phải theo mục 15 và 16.

### 1.2 Current React Native documentation check

Context7 resolved official React Native documentation
`/react/react-native-website`. The retrieved pages are versioned `0.87`, while this
repository currently declares React Native `0.86.0`; W4-S03 must verify exact
project-version behavior. The check supports platform details only and does not
override LEOPARD requirements:

- [React Native accessibility docs](https://github.com/react/react-native-website/blob/main/website/versioned_docs/version-0.87/accessibility.md)
  confirm role/label/state semantics and that `accessibilityLiveRegion` is Android
  only. iOS status announcement therefore belongs in an accessibility hook/API
  boundary.
- [AccessibilityInfo docs](https://github.com/react/react-native-website/blob/main/website/versioned_docs/version-0.87/accessibilityinfo.md)
  expose initial reduced-motion query plus `reduceMotionChanged`; subscriptions must
  be removed on cleanup.
- [FlatList optimization docs](https://github.com/react/react-native-website/blob/main/docs/optimizing-flatlist-configuration.md)
  and
  [VirtualizedList docs](https://github.com/react/react-native-website/blob/main/website/versioned_docs/version-0.87/virtualizedlist.md)
  support stable keys/memoized render paths and warn that off-window items can
  unmount. Pending/business state must therefore live outside a row.

## 2. Source of truth và invariant nghiệp vụ

Tài liệu này kế thừa:

- Product scope và role tại
  [01-vision-and-scope.md](../product/01-vision-and-scope.md),
  [02-stakeholders-and-roles.md](../product/02-stakeholders-and-roles.md) và
  [03-business-process.md](../product/03-business-process.md).
- Driver, tracking và media requirements tại
  [01-srs.md](../requirements/01-srs.md),
  [02-user-stories.md](../requirements/02-user-stories.md) và
  [03-acceptance-criteria.md](../requirements/03-acceptance-criteria.md).
- Boundary và reliability tại
  [01-system-architecture.md](../architecture/01-system-architecture.md),
  [05-realtime-tracking-design.md](../architecture/05-realtime-tracking-design.md),
  [01-database-design.md](../data/01-database-design.md) và
  [03-data-access-rules.md](../data/03-data-access-rules.md).
- Wire contract hiện tại tại
  [01-rest-api-spec.md](../api/01-rest-api-spec.md),
  [02-socket-events.md](../api/02-socket-events.md),
  [03-error-codes.md](../api/03-error-codes.md) và
  [04-auth-and-permissions.md](../api/04-auth-and-permissions.md).
- UI core tại [01-ui-principles.md](01-ui-principles.md) đến
  [06-empty-loading-error-states.md](06-empty-loading-error-states.md), đặc biệt
  [04-design-system.md](04-design-system.md) và
  [11-ui-quality-scorecard.md](11-ui-quality-scorecard.md).
- W4-DS02/W4-S03 tại
  [Wave 4 static UI plan](../superpowers/plans/2026-08-15-wave-4-static-ui-parallel-plan.md),
  cùng [Definition of Done](../development/05-definition-of-done.md) và
  [test strategy](../testing/01-test-strategy.md).

Các invariant không được đặt lại ở presentation:

| Invariant                                                 | Contract UI                                                                                                         |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Driver chỉ thấy order `REQUESTED` có thể nhận             | Render đúng collection do port trả; không lọc một collection rộng để giả lập quyền                                  |
| Chỉ Driver `AVAILABLE` và không có active order được nhận | Chỉ render capability `accept` do response/port cung cấp; không suy ra từ toggle cục bộ                             |
| Accept là transaction có điều kiện                        | Pending chặn double-submit; 409 không được hiện success hoặc giữ assignment giả                                     |
| Chỉ assigned Driver cập nhật lifecycle/tracking/proof     | Public summary và assigned-full là hai scope dữ liệu riêng; private children không mount trước authorization        |
| Một Driver có tối đa một active order                     | `Active-trip rail` biểu diễn order port trả về; component không tự chọn một order trong nhiều fixture               |
| Tracking point chỉ hợp lệ cho active assigned order       | Tracking sender nằm sau port; presentational layer chỉ hiển thị health/timestamp/capability                         |
| `DELIVERED` cần ít nhất một proof image                   | Chỉ backend response xác nhận proof đã persist và có thể offer command hoàn tất                                     |
| ETA/route do backend cung cấp                             | UI chỉ format; luôn ghi “ETA dự kiến”, source `DEMO` luôn ghi “Dữ liệu mô phỏng”                                    |
| Driver public query chỉ có summary                        | Không client-side che/mask dữ liệu nhạy cảm đã tải; backend/adapter phải không đưa dữ liệu đó vào public view model |
| Offline queue tracking có giới hạn                        | Chỉ hiện queue/last-sent do tracking port báo; component không tự tạo hoặc tự flush queue                           |

### 2.1 Exactly-one next lifecycle action

`DriverOrderDetailView` có tối đa một `offeredLifecycleCommand`. Command này phải đến
từ contract/backend capability đã được adapter xác thực. Screen không dùng
`switch (status)` để phát minh transition; fixture cũng không được tính command từ
status.

| Context backend đã xác nhận                             | Command có thể được offer              | Primary label                                                                 | Điều kiện hiển thị                                 |
| ------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------- |
| Public `REQUESTED`, Driver đủ điều kiện                 | Accept order, kết quả thành `ACCEPTED` | `Nhận đơn`                                                                    | Port trả capability accept cho đúng order          |
| Assigned `ACCEPTED`                                     | `PICKING_UP`                           | `Bắt đầu đi lấy hàng`                                                         | Backend offer đúng command                         |
| Assigned `PICKING_UP`                                   | `IN_TRANSIT`                           | `Đã lấy hàng — bắt đầu giao`                                                  | Backend offer đúng command                         |
| Assigned `IN_TRANSIT`, proof chưa được backend xác nhận | Không có lifecycle command             | `Thêm ảnh xác nhận giao hàng` là task action, không phải lifecycle transition | View model trả proof task là blocker hiện tại      |
| Assigned `IN_TRANSIT`, proof đã persist                 | `DELIVERED`                            | `Xác nhận đã giao`                                                            | Backend re-query/command response offer transition |
| `DELIVERED` hoặc `CANCELLED`                            | Không có                               | Không render sticky lifecycle action                                          | Terminal state do backend trả                      |

Bảng trên chỉ để trace requirement. Nó không phải state machine phía client. Nếu
response không có command, có nhiều hơn một command, target không thuộc contract hoặc
command mâu thuẫn order scope, adapter fail closed: không render lifecycle action,
ghi telemetry an toàn và cho tải lại. Không chọn command đầu tiên.

REST spec hiện chỉ mô tả status input và chưa công bố field server-computed
`offeredLifecycleCommand`. W4-I01 phải reconcile field/capability tương đương trước
khi nối runtime. Cho đến lúc đó, static catalogue chỉ dùng snapshot đã được
Integration/Backend owner phê duyệt; không biến lifecycle table thành fixture logic.

## 3. Outdoor action-first direction

### 3.1 Tương phản và mật độ

- Canvas dùng `neutral.background`; nội dung chính dùng `neutral.text`; border 1 px
  đủ nhận biết. Không hạ contrast bằng surface trong suốt.
- Brand chỉ dành cho primary task. Tracking healthy, stale, offline và error dùng
  semantic role khác nhau kèm icon/text/timestamp; không phủ cả screen bằng một hue.
- Primary Driver action có chiều cao tối thiểu 48 px; mọi target khác tối thiểu
  `44 × 44` px.
- Khoảng cách trong cluster là `sm`, giữa section là `md` hoặc `lg`; không bù mật độ
  bằng card lồng card.
- Một page title, một current-task heading và một primary action. Metadata dùng
  `caption`/`label`, không cạnh tranh với status/action.

“Outdoor/high contrast” không cho phép role tự thêm màu neon, black theme hoặc
shadow. Contrast phải được đo trên implementation thật; tài liệu không tự nhận đã
pass AA.

### 3.2 Active-trip rail

`ActiveTripRail` là chi tiết nhận diện của Driver nhưng hoàn toàn có chức năng:

1. Edge line dùng `active.border`, không gradient và không animation liên tục.
2. Order short reference và canonical status label luôn có text.
3. Origin → destination summary lấy nguyên từ authorized view model.
4. Tracking health có label, last persisted timestamp và queue copy khi port cung cấp.
5. Proof readiness chỉ hiện khi liên quan đến current task.
6. Toàn rail là một navigation target tối thiểu 44 px tới active detail, với
   accessible name tổng hợp; action bên trong không lồng `Pressable`.

Rail nằm ngay sau system exception/header trên `/driver/orders`. Trên detail, cùng
semantics được dùng trong `CurrentTaskHeader`, không render một banner lặp lại. Khi
tracking stale/offline, connector dừng ở last-known state; rail không ngụ ý vị trí
đang live.

## 4. Information hierarchy

| Priority | Nội dung                                               | Quy tắc                                                                       |
| -------: | ------------------------------------------------------ | ----------------------------------------------------------------------------- |
|        0 | Permission/session/system exception đang chặn workflow | Inline rail ở đầu content; không mount dữ liệu riêng tư khi permission-denied |
|        1 | Active trip hoặc availability nếu chưa có trip         | Luôn thấy trong first viewport                                                |
|        2 | Current canonical status + exactly-one primary task    | Status có text; action ở vùng chạm một tay                                    |
|        3 | Route order và next physical destination               | Dùng `RouteSpine route-full` sau assignment; không suy diễn current leg       |
|        4 | Tracking health và proof readiness                     | Timestamp/copy tại chỗ, không chỉ toast                                       |
|        5 | Cargo/contact cần cho chuyến                           | Chỉ assigned-full scope; text wrap                                            |
|        6 | Map, history, IDs và metadata hỗ trợ                   | Không đẩy primary task khỏi first viewport                                    |

System state và domain state đồng thời tồn tại. Ví dụ order có thể `IN_TRANSIT` trong
khi tracking `stale`; không thay status order bằng “Mất kết nối”.

## 5. Anatomy `/driver/orders`

```text
Safe-area top
┌──────────────────────────────────────┐
│ Page title        Availability       │
│ [connection/location exception]      │
│ Active-trip rail (nếu có)            │
├──────────────────────────────────────┤
│ Đơn có thể nhận       refreshed-at   │
│ ─ Available order row ─────────────  │
│ ─ Available order row ─────────────  │
│ ... FlatList / screen state          │
└──────────────────────────────────────┘
Bottom navigation + safe-area bottom
```

### 5.1 Regions

1. **Screen header**
   - Một heading “Đơn của tài xế”.
   - `AvailabilityControl` hiển thị cả domain label và pending/error state.
   - Không dùng hero, KPI hoặc lời giới thiệu tính năng.
2. **System exception rail**
   - Chỉ xuất hiện khi offline, reconnecting, location permission hoặc stale state
     ảnh hưởng màn hình.
   - Giữ cached content khi an toàn; không biến mọi lỗi thành full-screen takeover.
3. **Active-trip rail**
   - Có trước available list khi port trả active order.
   - Khi Driver `BUSY`, availability là read-only/capability-disabled; UI không tự
     khóa dựa trên việc rail có mặt.
4. **Available orders**
   - `FlatList`/`FlashList`, stable key, memoized row và pull-to-refresh do query
     container sở hữu.
   - Pending/selection/business state nằm ở container/server cache, không chỉ trong
     row vì virtualized row có thể unmount ngoài render window.
   - Row chỉ dùng public summary do backend trả: order reference, coarse route label,
     vehicle/cargo summary an toàn và server timestamps/estimate nếu có.
   - Không render customer phone, exact address, signed media URL hoặc tracking trước
     assignment.
   - Row có một navigation affordance “Xem chi tiết”; accept nằm ở detail để tránh
     nhiều primary actions cạnh tranh trong list.
5. **State region**
   - Loading skeleton giữ đúng chiều cao row.
   - Empty khác no-results; no-results chỉ dùng khi port thật sự có active query/filter
     summary. REST hiện chưa contract Driver filter nên screen không tự thêm filter.
6. **Bottom navigation**
   - Tối đa bốn mục theo navigation map.
   - Không chồng lên active rail hoặc sticky action của detail.

## 6. Anatomy `/driver/orders/:id`

Route file chỉ parse/validate UUID, xử lý invalid/foreign route rồi giao cho feature
screen. Không fetch hoặc gọi native API trong route component.

```text
Safe-area top
┌──────────────────────────────────────┐
│ Back   Chi tiết đơn   short ref      │
│ [system exception / permission]      │
│ Current status + tracking health     │
│ Current task / proof readiness       │
├──────────────────────────────────────┤
│ Authorized route summary/spine       │
│ Cargo/contact (assigned only)        │
│ Proof/upload                         │
│ Tracking map + last updated          │
│ Status history / metadata            │
│ scroll clearance for action dock     │
├──────────────────────────────────────┤
│ Exactly one safe-area primary action │
└──────────────────────────────────────┘
```

### 6.1 Public requested detail

- Chỉ render `PUBLIC_SUMMARY` view model.
- Không tạo `route-full` bằng cách mask exact address đã tải. Nếu backend chưa cấp
  authorized route nodes, dùng plain route summary.
- Primary task chỉ là `Nhận đơn` khi port offer accept capability.
- Pending giữ nguyên button geometry, chặn double-submit và đọc “Đang nhận đơn”.
- 409 chuyển sang conflict composition ở mục 7.7; không mở assigned-full sections.

### 6.2 Assigned active detail

- `CurrentTaskHeader` gom canonical order status, tracking health và timestamp; không
  gom cả page thành card.
- `RouteSpine route-full` hiển thị pickup, 0–3 stops, dropoff theo thứ tự backend.
  Active segment chỉ có khi response chỉ rõ current leg.
- Cargo/contact chỉ render từ `ASSIGNED_FULL` view model; route transition không flash
  public/private composition cũ.
- Proof region được đưa sát current task khi view model chọn upload là primary task.
- Tracking map có chiều cao ổn định tối thiểu 280 px, text fallback và last-updated.
  Stale/offline giữ last-known marker nhưng gắn nhãn rõ.
- `status-spine` là history append-only ở cuối; không dùng nó thay physical route.
- `StatusActionDock` nằm sticky bottom, chừa safe area và content clearance đo theo
  chiều cao thật. Một screen không có hai primary buttons.

### 6.3 Terminal detail

- `DELIVERED` hoặc `CANCELLED` không có sticky lifecycle action.
- Giữ route, proof/history được cấp quyền và completion/cancellation status.
- Không render “Giao lại”, “Hoàn tác” hoặc mutation ngoài API pilot.

## 7. Component inventory và variants

Role components consume mobile primitives/core token. Composition dùng divider,
heading và background shift; không card lồng card.

### 7.1 `AvailabilityControl`

| Variant từ view model | Hiển thị                                                      | Interaction                                                                   |
| --------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `OFFLINE`             | “Trạng thái nhận đơn: Ngoại tuyến” + neutral status           | Toggle/action “Bật sẵn sàng” chỉ khi capability cho phép                      |
| `AVAILABLE`           | “Trạng thái nhận đơn: Sẵn sàng” + success status              | Toggle checked; action đổi trạng thái do port xử lý                           |
| `BUSY`                | “Trạng thái nhận đơn: Đang bận” + active status               | Read-only/disabled reason “Bạn đang có chuyến hoạt động” nếu backend cung cấp |
| `pending`             | Label nghiệp vụ giữ nguyên, có busy state                     | Chặn press lặp; geometry không đổi                                            |
| `error`               | Giữ trạng thái đã persist gần nhất + inline message/requestId | Retry an toàn qua callback; không tự đảo toggle                               |

Network offline phải ghi “Kết nối mạng: Ngoại tuyến” để không nhầm với Driver
availability `OFFLINE`.

### 7.2 Active-order banner: `ActiveTripRail`

| Variant           | Semantic treatment                                           | Nội dung bắt buộc                                                                          |
| ----------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `healthy`         | `active` edge + tracking `success`                           | Order, status, route summary, “Đang gửi vị trí”, last persisted                            |
| `stale`           | Active order giữ nguyên; tracking dùng `warning`             | “Vị trí chưa cập nhật”, timestamp, action hỗ trợ nếu port cấp                              |
| `offline`         | Active order giữ nguyên; connection dùng `neutral`/`warning` | “Mất kết nối — vị trí mới chưa gửi”, last persisted                                        |
| `reconnecting`    | `info` status, không pulse liên tục                          | “Đang kết nối lại”, context và timestamp                                                   |
| `location-denied` | `danger` cho permission exception, không đổi order status    | Copy rõ quyền vị trí; secondary callback “Mở cài đặt”/“Cho phép vị trí” do native port cấp |
| `proof-required`  | Order status vẫn `IN_TRANSIT`; task dùng `warning`           | “Cần ảnh xác nhận trước khi hoàn tất”                                                      |

### 7.3 `DriverRouteSpine`

| Variant          | Scope             | Contract                                                                                                  |
| ---------------- | ----------------- | --------------------------------------------------------------------------------------------------------- |
| `assigned-full`  | Assigned Driver   | Core `route-full`, 0–3 stops, full labels được cấp quyền, metadata do backend trả                         |
| `long-label`     | Assigned Driver   | Wrap toàn bộ địa chỉ; connector không co lệch hoặc che marker                                             |
| `current-leg`    | Assigned Driver   | Active segment chỉ khi response cung cấp; không nội suy từ order status                                   |
| `stale-tracking` | Assigned Driver   | Physical route giữ nguyên; tracking freshness đặt cạnh map/metadata, không làm connector giống live trace |
| `public-summary` | Unassigned Driver | Không render full spine nếu thiếu authorized nodes; dùng text summary từ port                             |

Không dùng gradient connector, moving dot, decorative dash hoặc animation lặp.

### 7.4 `TrackingHealth`

| State do tracking port cung cấp | Copy mẫu                                | Visual/a11y                                       |
| ------------------------------- | --------------------------------------- | ------------------------------------------------- |
| `not-started`                   | “Chưa bắt đầu gửi vị trí”               | Neutral text; không gọi đây là lỗi                |
| `healthy`                       | “Đang gửi vị trí · cập nhật lúc 14:32”  | Success icon + text + timestamp                   |
| `stale`                         | “Vị trí chưa cập nhật · lần cuối 14:27” | Warning; giữ last-known marker                    |
| `offline`                       | “Mất kết nối · vị trí mới chưa gửi”     | Warning/neutral; queue copy chỉ khi port xác nhận |
| `reconnecting`                  | “Đang kết nối lại”                      | Polite announcement một lần khi state đổi         |
| `permission-denied`             | “Chưa được phép dùng vị trí”            | Alert + callback do native port cung cấp          |
| `unavailable`                   | “Chưa thể gửi vị trí”                   | Error và retry nếu an toàn                        |

Component không tính stale threshold, không tạo queue, không đếm ngược lần gửi và
không announce từng tracking point.

### 7.5 `StatusActionDock`

| Variant      | Primary task                                         | Quy tắc                                            |
| ------------ | ---------------------------------------------------- | -------------------------------------------------- |
| `accept`     | `Nhận đơn`                                           | Chỉ từ offered accept capability                   |
| `advance`    | Label/target từ validated offered command            | Tối đa một command; disabled reason luôn visible   |
| `proof-task` | `Thêm ảnh xác nhận giao hàng`                        | Không giả làm lifecycle action                     |
| `complete`   | `Xác nhận đã giao`                                   | Chỉ sau proof persist và backend offer `DELIVERED` |
| `pending`    | `Đang nhận đơn`/`Đang cập nhật trạng thái`           | Busy + disabled; không đổi kích thước              |
| `blocked`    | Không primary command hoặc button disabled có reason | Không tự chọn fallback transition                  |
| `terminal`   | Không render dock                                    | Content có safe-area bottom bình thường            |

Secondary action như “Mở cài đặt”, “Thử tải ảnh lại” hoặc “Tải lại dữ liệu” không
được dùng brand treatment khi lifecycle command đang khả dụng. Với terminal
`DELIVERED`, confirmation step nếu triển khai phải là một decision point mới có đúng
một confirm primary; không dùng long-press/swipe làm cách duy nhất.

### 7.6 `DeliveryProof`

| Variant          | Nội dung/action                                       | Persistence semantics                              |
| ---------------- | ----------------------------------------------------- | -------------------------------------------------- |
| `empty`          | Helper JPEG/PNG/WebP, tối đa 10 MB                    | Không gọi là thiếu nếu backend chưa yêu cầu        |
| `required`       | “Cần ảnh xác nhận trước khi hoàn tất”                 | Upload task là primary; lifecycle command vắng mặt |
| `selected-local` | Preview + “Chưa tải lên”                              | Không gọi là proof đã có                           |
| `uploading`      | Stable progress region, cancel chỉ khi port hỗ trợ    | Chặn submit lặp                                    |
| `persisted`      | Thumbnail/metadata từ server + “Đã tải lên”           | Chỉ sau response persist/refetch                   |
| `invalid-type`   | Copy từ `FILE_TYPE_UNSUPPORTED`                       | Validate sớm nhưng backend vẫn xác thực            |
| `too-large`      | Copy từ `FILE_TOO_LARGE`                              | Giữ screen context, cho chọn file khác             |
| `upload-retry`   | Giữ selection khi platform cho phép + error/requestId | “Thử tải lại”; không đổi order status              |

File picker, URI handling, upload transport và camera/gallery permission nằm sau
proof port/hook. Presentational component chỉ nhận preview-safe data và callback;
không import native picker/storage/client.

### 7.7 `DriverConflictNotice`

| Error                            | Composition                                                               | Recovery                                                             |
| -------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `ORDER_ALREADY_ASSIGNED` (409)   | Alert “Tài xế khác vừa nhận đơn này.”; không render success/assigned data | “Xem đơn còn trống” gọi refetch rồi điều hướng/list update từ server |
| `DRIVER_HAS_ACTIVE_ORDER` (409)  | Hiện active-trip reference do response mới trả                            | “Mở chuyến đang thực hiện”                                           |
| `ORDER_INVALID_TRANSITION` (409) | “Trạng thái đơn đã thay đổi.” + current server status khi an toàn         | Refetch detail; không retry stale command tự động                    |
| Unknown conflict                 | Generic safe copy + requestId                                             | Tải lại; không hiển thị raw `details`                                |

Conflict là inline/full region có `alert` semantics tùy mức chặn, không chỉ toast.

## 8. Token mapping

Không có Driver-private palette. Mọi role style map về
[core vocabulary](04-design-system.md).

| Intent                 | Core/mobile token                                                | Áp dụng                                              |
| ---------------------- | ---------------------------------------------------------------- | ---------------------------------------------------- |
| Canvas/content         | `colors.neutral.background`, `neutral.text`, `neutral.mutedText` | Screen, body, metadata                               |
| Primary action         | `brand.background` + `brand.text`                                | Exactly-one primary task                             |
| Requested/info         | `info.*`                                                         | `REQUESTED`, reconnect/support metadata              |
| Pickup/proof attention | `warning.*`                                                      | `PICKING_UP`, stale, proof required                  |
| Active trip            | `active.*`                                                       | `ACCEPTED`, `IN_TRANSIT`, active-trip rail           |
| Healthy/completed      | `success.*`                                                      | Availability, tracking healthy, `DELIVERED`          |
| Error/blocked          | `danger.*`                                                       | Permission/error/conflict; status vẫn có text        |
| Type                   | `caption`, `label`, `body`, `sectionTitle`, `pageTitle`          | Một page title; numeric/time dễ quét; long text wrap |
| Spacing                | `xxs/xs/sm/md/lg/xl = 4/8/12/16/24/32`                           | Cluster `sm`, section `md–lg`, no arbitrary gaps     |
| Sizing                 | Touch `>=44`; sticky primary `>=48`; content max `768`           | One-handed and Dynamic Type safe                     |
| Shape                  | `radius.control=6`, `radius.card=6`, `radius.pill` chỉ badge     | Border 1 px; no rounded-everything                   |
| Elevation              | Không shadow cho page section                                    | Chỉ modal/drawer nếu platform primitive yêu cầu      |
| Motion                 | `none=0`, `fast=120`, `standard=180`, `slow=240`                 | Press/state/orientation only                         |

Factual platform baseline tại thời điểm viết:

- `apps/mobile/src/theme/tokens.ts:1-80` đã có spacing, radius, minimum touch height
  44, caption/label/body/title và semantic palette.
- Core `pageTitle`, sticky Driver height 48 và motion vocabulary chưa có đầy đủ trong
  mobile token runtime; W4-S01/Foundation owner phải cung cấp hoặc phê duyệt named
  platform mapping. Driver lane không khai báo raw replacement.
- `apps/mobile/src/ui/StatusBadge.tsx:14-50` map semantic colors nhưng đang render raw
  enum; canonical Vietnamese domain label vẫn là residual foundation evidence.

Disabled state không chỉ dựa vào opacity; label/reason và
`accessibilityState.disabled` phải còn rõ, đồng thời implementation phải đo contrast
thật.

## 9. Interaction, command feedback và motion

### 9.1 Command lifecycle

1. Press nhận/lifecycle/upload gọi callback một lần với immutable command input.
2. Container tạo/giữ `clientRequestId` theo contract, đưa action sang pending và chặn
   double-submit.
3. Success chỉ hiển thị sau response persist; query cache/refetch là nguồn render mới.
4. Error giữ context và dữ liệu đã persist trước đó; retry chỉ dùng command semantics
   an toàn.
5. Conflict invalidates stale query rồi render server response; không mutate fixture
   hoặc view model tại chỗ.

Lifecycle mutation không được queue im lặng khi offline. Tracking queue là ngoại lệ
đã định nghĩa ở tracking architecture và vẫn do tracking adapter sở hữu.

### 9.2 Touch và gesture

- Không có action chỉ dùng swipe, long-press hoặc icon không label.
- Whole-row navigation target và icon action đều tối thiểu 44 px; sticky primary tối
  thiểu 48 px.
- Pressed feedback dùng `motion.fast`/semantic change; loading giữ width/height.
- Pull-to-refresh là bổ sung, luôn có recovery action accessible trong error state.
- Map pan/zoom không được là cách duy nhất hiểu route; Route Spine/text là equivalent.

### 9.3 Motion và reduced motion

- Dùng `motion.fast` cho pressed/focus color và `motion.standard` cho disclosure hoặc
  task-region replacement giúp định hướng.
- Không animate Route Spine connector, active rail, map marker hoặc tracking pulse
  liên tục.
- Không dùng motion để giả “live” hoặc che network latency.
- Hook/platform layer đọc reduced-motion setting. Khi bật, mọi transition role dùng
  `motion.none`; progress giữ copy/timestamp và geometry, không pulse.
- Platform hook query initial reduced-motion value, subscribe
  `reduceMotionChanged` và remove subscription khi unmount.
- Announcement và visual motion độc lập: tắt motion không được làm mất status
  feedback.

## 10. Full state matrix

Một screen có thể đồng thời có domain state và system state. Priority là
permission/session blocker → command conflict/error → connectivity/tracking
exception → content.

| State                         | `/driver/orders`                                                                              | `/driver/orders/:id`                                                                         | Action/data rule                                                                             | Announcement                                          |
| ----------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `loading`                     | Header/availability + row-shaped skeleton giữ layout                                          | Task/route/proof/map skeleton đúng shape                                                     | Disable mutation; không render `0 phút` hay fake status                                      | Polite một lần: “Đang tải dữ liệu chuyến”             |
| `empty`                       | “Hiện chưa có đơn có thể nhận”; giữ availability và active rail nếu có                        | Chỉ dùng khi authorized optional collection như history/media rỗng, không thay missing order | Action chỉ khi role thực sự có thể làm gì; không thêm create order                           | Heading + concise description                         |
| `no-results`                  | “Không có đơn khớp điều kiện” + query summary và “Xóa bộ lọc” chỉ khi port có filter contract | Có thể dùng cho history sub-filter, không dùng cho order not found                           | REST Driver filter chưa chốt: không phát minh filter chỉ để có state                         | Polite, focus/reading order vào summary               |
| `error`                       | Giữ cache nếu có; inline/full error và retry                                                  | Giữ authorized persisted content; lỗi section ở đúng region                                  | Hiện requestId khi hỗ trợ; không lộ raw details/stack                                        | Blocking error dùng alert; retry label cụ thể         |
| `success`                     | Render list/availability từ persisted response; refresh timestamp                             | Render new status/proof từ response/refetch                                                  | Feedback ngắn trong content, không chỉ toast; không mutate fixture                           | Polite: tên command + status mới                      |
| `permission-denied`           | Không mount order rows/active trip; dẫn về role home/login                                    | Không mount route/contact/media/tracking private children                                    | 401/403/404 policy do auth/port; không flash trước redirect                                  | Alert/heading, focus/reading starts at denial         |
| `offline`                     | Giữ cached list có “Dữ liệu có thể cũ”; accept disabled trừ khi port nói khác                 | Giữ active detail/last marker; lifecycle không fake queue                                    | Tracking queue/last sent chỉ theo port; retry connection là secondary                        | Polite once on transition; no repeated banner reads   |
| `stale`                       | Last-refreshed cạnh list/rail                                                                 | Last-known tracking marker + timestamp; order status vẫn canonical                           | Stale threshold do adapter/port; action capability không tự đổi                              | “Vị trí chưa cập nhật, lần cuối…”                     |
| `reconnecting`                | Giữ context/list; info rail                                                                   | Giữ route/map/last point; không khóa action không liên quan nếu port cho phép                | Socket refresh/reconcile ở adapter; component không join room                                | Polite một lần khi bắt đầu và khi restored            |
| `409 accept race`             | Row có thể giữ đến khi refetch; alert cạnh region                                             | Không mở assigned-full; conflict notice thay accept task                                     | Không optimistic assignment; recovery tải server list                                        | Assertive: “Tài xế khác vừa nhận đơn này”             |
| `proof required`              | Active rail ghi blocker khi active order cần proof                                            | Proof region trở thành current task; không có lifecycle command                              | Upload task là primary; `DELIVERED` chưa được offer                                          | Polite current-task summary; action có label đầy đủ   |
| `upload retry`                | Active rail vẫn giữ order/status cũ                                                           | Giữ selected file khi platform cho phép, error/requestId + “Thử tải lại”                     | Không đổi status; 413/415 yêu cầu chọn file hợp lệ thay vì blind retry                       | Error alert một lần; progress không đọc mỗi phần trăm |
| `location permission`         | Availability/list vẫn dùng được theo capability; connection rail nói rõ GPS                   | Last-known route/map vẫn hiện; tracking health `permission-denied`                           | Native port quyết định requestable hay open-settings; không lặp prompt; chỉ foreground pilot | Alert khi chặn tracking, action name rõ               |
| `session-expired`             | Xóa private render, chuyển login theo auth flow                                               | Không giữ route/contact/media trên screen                                                    | Chỉ giữ draft không nhạy cảm; Driver flow thường không có draft lifecycle                    | Alert/login heading                                   |
| `invalid transition conflict` | Active rail refresh từ server                                                                 | Remove stale action, show current status và refetch                                          | Không retry cùng stale target tự động                                                        | Alert “Trạng thái đơn đã thay đổi”                    |
| `terminal`                    | Active rail biến mất sau persisted refresh; list state cập nhật                               | Completion/cancellation summary, no dock                                                     | Không có hidden mutation affordance                                                          | Polite completion once                                |

Location permission ở đây chỉ là foreground tracking của pilot. Background location,
push notification và advanced device permission vẫn ngoài scope.

## 11. Responsive, one-handed reach và edge content

### 11.1 Viewport contract

| Viewport     | Composition                                                                                                                                                |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `360 × 800`  | Một cột; `md` horizontal inset; row metadata stack; sticky primary full available width; không horizontal overflow                                         |
| `390 × 844`  | Cùng hierarchy 360, không đổi meaning hoặc đẩy action lên header; dùng khoảng thở thêm cho route/cargo                                                     |
| `768 × 1024` | Content centered, max 768; available rows có thể chuyển grid route/metadata; active rail và task action vẫn full-width, không biến thành desktop dashboard |

Map giữ chiều cao tối thiểu 280 px và stable aspect/height qua loading/error. Tablet
không được dùng khoảng trống để thêm KPI/card không có requirement.

### 11.2 Safe-area sticky action

- `StatusActionDock` dùng bottom safe-area inset và biết chiều cao bottom navigation
  nếu hai region cùng tồn tại.
- Root hiện đã dùng `SafeAreaView` cho cả bốn edge tại
  `apps/mobile/app/_layout.tsx:42-44`; Foundation owner phải chỉ định một inset owner
  cho dock/scaffold để không double-pad bottom.
- Scroll content có bottom clearance từ measured dock height + `md` + safe-area, không
  hardcode một con số đoán.
- Dock tăng chiều cao theo Dynamic Type; không absolute-position text vào fixed-height
  shell.
- Khi keyboard/native picker overlay xuất hiện, dock không che action hệ thống hoặc
  content cần xác nhận.
- Nếu screen reader focus vào nội dung cuối, dock không cắt/che focus target.

### 11.3 Long route, cargo và Dynamic Type

- Pickup, 0–3 stops và dropoff wrap đầy đủ theo thứ tự; marker/connector không đổi
  order khi text cao nhiều dòng.
- Cargo note wrap; nếu dùng disclosure vì rất dài, preview vẫn có accessible
  “Xem đầy đủ” và không cắt thông tin cần để quyết định nhận/chở.
- Public summary chỉ dùng text backend đã giảm scope; không tự truncate/mask PII.
- Order ID, timestamp, VND/meter/second dùng tabular numerals khi platform hỗ trợ,
  nhưng có label cho screen reader.
- Không cố định số dòng cho current task, status, permission/error hoặc primary label.
- Test ít nhất default, font lớn và accessibility size; khi không đủ ngang, metadata
  xuống dòng trước khi action bị co.

### 11.4 One-handed reach

- Primary task nằm ở bottom action zone; không đặt action nghiệp vụ duy nhất ở góc
  trên hoặc trong map.
- Availability control ở đầu screen vì là mode-setting, nhưng target 44 px và trạng
  thái vẫn được nhắc trong active rail/current task.
- Secondary support action không cạnh tranh brand color với primary lifecycle task.
- Không yêu cầu gesture từ mép màn hình để hoàn tất flow.

## 12. React Native accessibility contract

### 12.1 Semantics và reading order

- Page title dùng `accessibilityRole="header"`; heading/task/section theo đúng visual
  order.
- Availability dùng native switch/button semantics,
  `accessibilityState={{ checked, disabled, busy }}` phù hợp và label phân biệt
  availability với network connectivity.
- Status badge đọc canonical Vietnamese label và domain, ví dụ “Trạng thái đơn: Đang
  vận chuyển”; raw enum chỉ dùng trong test/debug an toàn.
- Active rail là một navigation target có label tổng hợp; không lồng accessible
  actions.
- Route Spine đọc pickup → stop 1..3 → dropoff; decorative connector bị ẩn khỏi
  accessibility tree.
- Map có text alternative gồm route/tracking state và last updated; screen-reader
  user không cần thao tác map để hiểu chuyến.
- Proof thumbnail có label “Ảnh xác nhận giao hàng”; không dùng filename/URL làm
  accessible name.
- Permission-denied không mount private children vào accessibility tree.

### 12.2 Status announcements

Container/hook phát announcement khi persisted state **thay đổi**, không phát từ mỗi
render. Native announcement API nếu cần nằm trong platform hook, không trong
presentational component. Android có thể dùng `accessibilityLiveRegion`; iOS phải
dùng platform announcement path phù hợp. Không giả định một prop có cùng behavior
trên cả hai hệ điều hành.

| Event                                | Priority/copy pattern                                                            |
| ------------------------------------ | -------------------------------------------------------------------------------- |
| Availability persist thành công      | Polite: “Trạng thái nhận đơn đã chuyển sang Sẵn sàng”                            |
| Accept persist thành công            | Polite: “Đã nhận đơn. Trạng thái: Đã nhận đơn”                                   |
| Lifecycle persist thành công         | Polite: “Đã cập nhật: Đang đến điểm lấy/Đang vận chuyển/Đã giao”                 |
| Tracking đổi healthy → stale/offline | Polite một lần với last-updated; không announce mỗi point                        |
| Reconnect thành công                 | Polite: “Đã kết nối lại. Vị trí mới nhất đang được đồng bộ” nếu adapter xác nhận |
| Proof upload success                 | Polite: “Ảnh xác nhận đã tải lên” sau persist                                    |
| 409/permission/blocking upload error | Alert một lần, sau đó đưa reading order đến recovery action                      |

### 12.3 Touch, text và perception

- Mọi target tối thiểu `44 × 44`; primary sticky tối thiểu 48 px.
- `allowFontScaling` không bị tắt cho text nghiệp vụ; layout chịu Dynamic Type.
- Status/tracking/proof không dựa vào màu, rung hoặc motion đơn lẻ.
- Reduced-motion setting được tôn trọng; loading vẫn có copy và busy state.
- TalkBack và VoiceOver phải hoàn tất được: bật availability → mở order → nhận → đọc
  route/current task → chọn/upload proof qua port → xác nhận command được offer.
- Action disabled có reason visible và accessible hint; không để screen reader gặp
  một nút im lặng không làm gì.

## 13. Copy: do / don't

| Context                     | Do                                                                              | Don't                                             |
| --------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------- |
| Availability                | “Trạng thái nhận đơn: Sẵn sàng”                                                 | “Online”                                          |
| Network                     | “Mất kết nối — vị trí mới chưa gửi”                                             | “Offline” không nêu domain                        |
| Accept                      | “Nhận đơn” / “Đang nhận đơn”                                                    | “Submit”, “Claim”, “Done”                         |
| `ACCEPTED` → `PICKING_UP`   | “Bắt đầu đi lấy hàng”                                                           | “Tiếp theo”                                       |
| `PICKING_UP` → `IN_TRANSIT` | “Đã lấy hàng — bắt đầu giao”                                                    | “Cập nhật trạng thái”                             |
| Proof blocker               | “Cần ảnh xác nhận trước khi hoàn tất”                                           | “Thiếu dữ liệu”                                   |
| Complete                    | “Xác nhận đã giao”                                                              | “Hoàn thành” nếu không nêu việc gì                |
| Accept race                 | “Tài xế khác vừa nhận đơn này. Hãy xem các đơn còn trống.”                      | “Có lỗi xảy ra” hoặc success rồi rollback         |
| Tracking stale              | “Vị trí chưa cập nhật · lần cuối 14:27”                                         | “Live” khi không có freshness                     |
| ETA                         | “ETA dự kiến · 18 phút”; `DEMO`: “Dữ liệu mô phỏng”                             | “ETA 18 phút” hoặc giấu source trong tooltip      |
| Upload failure              | “Chưa tải được ảnh. Ảnh đã chọn vẫn được giữ; hãy thử lại.” khi đúng capability | “Upload failed”                                   |
| Permission                  | “Cho phép vị trí để gửi hành trình của chuyến này”                              | Đổ lỗi “Bạn đã tắt GPS” khi chưa biết nguyên nhân |

Copy không hứa “đã lưu”, “đã gửi” hoặc “đã giao” trước response persist. Error có thể
hiện requestId để hỗ trợ nhưng không hiện stack, token, file URI hoặc raw details.

## 14. Feature-local architecture, ports và guarded fixtures

### 14.1 Proposed ownership

```text
apps/mobile/app/(driver)/orders/index.tsx
apps/mobile/app/(driver)/orders/[id].tsx
apps/mobile/src/features/driver/orders/
  model.ts
  port.ts
  adapter.ts
  fixtures.ts
  DriverOrdersScreen.tsx
  DriverOrderDetailScreen.tsx
  components/
```

Route files mỏng: validate untrusted params, chọn container và render permission/state.
Feature không thêm draft DTO vào `packages/shared`.

### 14.2 View model contract

Đây là presentation shape minh họa, không phải wire DTO:

```ts
type DriverPrimaryTaskView =
  | Readonly<{ kind: 'accept'; command: OfferedDriverCommandView }>
  | Readonly<{ kind: 'advance-lifecycle'; command: OfferedDriverCommandView }>
  | Readonly<{ kind: 'upload-proof'; upload: ProofTaskView }>
  | null;

type DriverOrderDetailView = Readonly<{
  accessScope: 'PUBLIC_SUMMARY' | 'ASSIGNED_FULL';
  order: DriverOrderView;
  tracking: TrackingHealthView;
  proof: ProofReadinessView;
  offeredLifecycleCommand: OfferedDriverCommandView | null;
  primaryTask: DriverPrimaryTaskView;
}>;
```

Contract invariants:

- `offeredLifecycleCommand` là `null` hoặc đúng một command đã được adapter xác thực.
- `primaryTask` là `null` hoặc đúng một task; view không tự ưu tiên giữa command và
  proof.
- Route/cargo/contact fields absent trong public scope, không phải string đã mask.
- Tracking health/freshness, active segment, proof readiness và ETA đều là explicit
  values từ port/adapter.
- Mọi object/array là immutable; adapter/factory trả object mới.

Nếu `primaryTask` và `offeredLifecycleCommand` mâu thuẫn, container fail closed và
render contract error; presentational component không sửa model.

### 14.3 Ports và state ownership

| Concern                                     | Owner                                                          |
| ------------------------------------------- | -------------------------------------------------------------- |
| Server order/availability/media state       | Query/command port + server cache; không copy vào client store |
| Route param `id`                            | Expo Router route, validate UUID trước query                   |
| Local disclosure/selection                  | Component-local state                                          |
| Proof form selection/progress               | Form/controller + injected proof port                          |
| Socket tracking/history reconciliation      | Tracking adapter/event port                                    |
| Foreground location permission/sender/queue | Native location hook/port                                      |
| Auth token                                  | Existing secure session boundary                               |
| Accessibility announcements                 | Platform hook observing semantic state transitions             |

Port shape tối thiểu giữ query/command/native concerns tách nhau:

```ts
type DriverOrdersPort = Readonly<{
  getOrdersView: () => Promise<DriverOrdersView>;
  getOrderDetailView: (orderId: string) => Promise<DriverOrderDetailView>;
  setAvailability: (input: AvailabilityCommandInput) => Promise<DriverOrdersView>;
  acceptOrder: (input: OfferedDriverCommandInput) => Promise<DriverOrderDetailView>;
  executeLifecycle: (input: OfferedDriverCommandInput) => Promise<DriverOrderDetailView>;
}>;

type DriverTrackingPort = Readonly<{
  observeHealth: (
    orderId: string,
    onChange: (health: TrackingHealthView) => void,
  ) => Readonly<{ unsubscribe: () => void }>;
}>;

type DriverProofPort = Readonly<{
  selectProof: () => Promise<ProofSelectionView | null>;
  uploadProof: (input: ProofUploadInput) => Promise<ProofReadinessView>;
}>;
```

`OfferedDriverCommandInput` mang opaque command/capability identity cùng
`clientRequestId`; component không tự lắp target từ status hiện tại. Subscription
phải cleanup khi route/order đổi. Tên method là feature contract minh họa, không đóng
đinh URL, Socket event hay native SDK.

Presentational files không import HTTP client, TanStack Query, Socket.IO, native
location, picker/storage SDK hoặc production adapter. Chúng nhận readonly data và
callbacks qua props. Adapter validate REST/event payload ở boundary, loại duplicate
event và bỏ stale point theo tracking contract.

### 14.4 Fixtures

- Driver fixtures là deterministic presentation snapshots, không phải backend fake
  service và không mutate sau command.
- Snapshot chỉ được tạo từ approved contract examples/scenario packet. Fixture không
  tính lifecycle/assignment/tracking health/ETA, không chọn “next status” và không
  tạo random price/time/coordinates.
- Mỗi factory trả frozen/new object; không dùng PII thật, token, signed URL hoặc local
  file path.
- Driver `fixtures.ts` chỉ được lazy import sau existing preview boundary xác nhận
  `NODE_ENV !== 'production'`, build flag và local opt-in.
- Preview luôn render banner
  `Bản xem trước giao diện — dữ liệu mô phỏng`.
- Runtime fail closed; production path không import fixture module và không có
  fallback fake success.

Baseline hiện có hỗ trợ một phần contract này:

- `apps/mobile/src/preview/preview-mode.ts:11-19` fail closed nếu thiếu local/build/env
  guard.
- `apps/mobile/src/preview/scenario.ts:92-116` chỉ gọi lazy scenario provider sau khi
  mode là fixture.
- `apps/mobile/src/preview/PreviewBanner.tsx:5-17` có banner bắt buộc và accessible
  label.
- Generic preview vocabulary hiện mới có sáu state, chưa phải Driver catalogue.

## 15. Preview catalogue và evidence package

### 15.1 Catalogue bắt buộc

Mỗi scenario ID là snapshot được phê duyệt, không phải hàm suy diễn business rule.

| Catalogue group      | Scenarios                                                                                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Availability         | `offline`, `available`, `busy`, `pending`, `error`                                                                                                                      |
| Active rail          | `healthy`, `stale`, `offline`, `reconnecting`, `location-denied`, `proof-required`, long route                                                                          |
| Route Spine          | 0 stop, 3 stops, long pickup/dropoff, current-leg supplied, stale-tracking                                                                                              |
| Tracking             | not-started, healthy, stale, offline queue reported, reconnecting, permission-denied, unavailable                                                                       |
| Status action        | accept, advance each approved target snapshot, proof task, complete, pending, disabled reason, terminal                                                                 |
| Proof/upload         | empty, required, selected-local, uploading, persisted, 413, 415, retry                                                                                                  |
| Conflict             | accept race 409, active-order 409, invalid-transition 409, unknown safe conflict                                                                                        |
| `/driver/orders`     | loading, multiple requested, active + requested, empty, no-results where contracted, error, permission-denied, offline                                                  |
| `/driver/orders/:id` | public requested, accepted, picking-up, in-transit proof-required, upload retry, ready-to-deliver, terminal, stale/reconnecting, location permission, permission-denied |

### 15.2 Evidence phải thu ở W4-S03/W4-S07

| Evidence             | Minimum                                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| Component catalogue  | Tất cả variants mục 7, production components/tokens, preview banner visible                              |
| State catalogue      | Mọi row mục 10 có test/screenshot hoặc documented non-applicability do contract, không bỏ state bắt buộc |
| Responsive           | `360×800`, `390×844`, `768×1024`; default + long route/cargo + Dynamic Type                              |
| One-handed/safe area | Sticky action, bottom nav, device inset, scroll clearance và keyboard/picker overlay                     |
| Accessibility        | RN tree assertions, 44/48 target audit, VoiceOver/TalkBack walkthrough và announcement log               |
| Motion               | Normal/reduced-motion comparison; no continuous route/tracking animation                                 |
| Visual quality       | Contrast measurements, overflow/text-fit checklist, AI-slop/no-partial-dark source scan                  |
| Verification         | Mobile test/typecheck/lint/export; changed-file coverage `>=80%`                                         |

Không dùng mockup cô lập làm evidence nếu production composition khác. Không ghi
`STATIC_GATE_PASSED` chỉ từ tài liệu này.

## 16. Mapping mười scorecard categories

Role chưa có implementation/catalogue nên **không chấm điểm** ở W4-DS02. `N/A` cũng
không được dùng khi W4-S07 review; mỗi category phải có score và evidence thật. Bảng
này map design decision tới packet cần thu, đồng thời ghi factual baseline hiện tại.

|   # | Category                | Design contract                                                                   | Implementation evidence còn phải có                       | Factual status lúc viết                                                                              |
| --: | ----------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
|   1 | Color consistency       | Chỉ core semantic roles; canonical labels; status không dựa màu                   | Token scan, contrast result, status samples               | Mobile palette tồn tại; Driver samples/contrast chưa có                                              |
|   2 | Typography hierarchy    | Một page title, task heading, long-copy/Dynamic Type, tabular metadata            | RN tree + screenshots default/accessibility text          | Mobile mới có caption/label/body/title; `pageTitle` runtime pending                                  |
|   3 | Spacing rhythm          | Scale 4/8/12/16/24/32, Driver `sm–md`, no nested cards                            | Source scan + long composition                            | Core spacing tồn tại; Driver composition chưa tồn tại                                                |
|   4 | Component consistency   | Variants mục 7, exactly-one primary, stable pending/error/success                 | Catalogue + interaction tests + deviation log             | Base Button/Status/ScreenState tồn tại; Driver components pending                                    |
|   5 | Responsive behavior     | 360/390/768, measured safe-area dock, map >=280, no overflow                      | Screenshot matrix + overflow/text-fit checks              | Root SafeAreaProvider tồn tại; role viewport evidence pending                                        |
|   6 | Motion & reduced motion | Core duration, purposeful state motion, reduced fallback                          | Normal/reduced recording hoặc test                        | Mobile role motion token/handling chưa được chứng minh                                               |
|   7 | Accessibility           | Native semantics, announcements, touch 44/48, Dynamic Type, privacy               | RN assertions + VoiceOver/TalkBack walkthrough + contrast | Base primitives có một phần semantics; Driver journey evidence pending                               |
|   8 | Information density     | First scan/current task/active rail/action-first                                  | Annotated screenshots + reviewer scan test                | Driver route hiện là placeholder; không có density evidence                                          |
|   9 | State completeness      | Full matrix mục 10                                                                | State catalogue + tests/screenshots                       | Generic ScreenState có 6 states; no-results/stale/reconnect/conflict và Driver domain states pending |
|  10 | Polish & AI-slop        | Vietnamese copy, functional rail, no hero/gradient/glass/nested card/partial dark | Visual diff, AI-slop gate, source scan                    | Không có Driver implementation để pass/fail                                                          |

Scorecard chỉ được ghi `PASS` khi đạt `>=85/100`, không category dưới `8/10`,
accessibility/AI-slop gate pass và không blocker theo
[11-ui-quality-scorecard.md](11-ui-quality-scorecard.md).

## 17. Hard gates và residual implementation evidence

### 17.1 Do

- Dùng workflow thật làm first screen.
- Giữ exactly-one primary task và visible blocking reason.
- Phân biệt availability, network và tracking health bằng domain label.
- Giữ last-known data có timestamp khi offline/stale.
- Render success từ persisted response.
- Dùng thin route, validated params, feature-local immutable view model/port và
  virtualized list.

### 17.2 Don't

- Không gradient, glassmorphism, decorative hero/blob, marketing card hoặc
  atmospheric stock media.
- Không card lồng card, rounded-everything, multi-layer shadow hoặc one-hue screen.
- Không partial dark mode: không theme toggle, `dark:`, dark token riêng hoặc
  `prefers-color-scheme` override.
- Không status chỉ bằng màu/icon/emoji; không generic English/lorem.
- Không fixture tự quyết lifecycle, assignment, tracking, ETA hoặc permission.
- Không import native location/socket/client/picker/storage vào presentational layer.
- Không fake persistence, fake live marker hoặc fake command success.

### 17.3 Factual residuals

| Residual                                          | Evidence hiện tại                                                                                      | Owner/gate                         |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| Driver list chưa triển khai                       | `apps/mobile/app/(driver)/orders/index.tsx:3-9` là placeholder                                         | W4-S03                             |
| Driver detail route chưa tồn tại                  | Không có `apps/mobile/app/(driver)/orders/[id].tsx`                                                    | W4-S03                             |
| Role components/catalogue chưa tồn tại            | Không có `apps/mobile/src/features/driver/**`                                                          | W4-S03                             |
| Core mobile parity còn thiếu                      | `pageTitle`, motion/reduced-motion và Driver sticky 48 chưa có đầy đủ runtime token/component evidence | W4-S01                             |
| Canonical status copy chưa hoàn tất               | Mobile `StatusBadge` đang hiển thị raw enum                                                            | W4-S01                             |
| Full system-state vocabulary chưa hoàn tất        | Mobile `ScreenState` hiện chỉ có loading, empty, error, success, permission-denied, offline            | W4-S01/W4-S03                      |
| Server-offered next command chưa có wire field rõ | REST spec mới mô tả `POST /driver/orders/:id/status` input                                             | W4-I01 + Backend/Integration owner |
| Tracking/location/upload thật chưa nối            | Static track cấm API/Socket/GPS/upload thật                                                            | W4-I02/W4-I03                      |
| Responsive/a11y/motion/contrast evidence chưa có  | Chưa có Driver production composition để đo                                                            | W4-S03/W4-S07                      |
| Persistence/E2E chưa có                           | Static spec không chứng minh refresh/relaunch hoặc cross-client journey                                | W4-I05                             |

W4-DS02 có thể chuyển sang design review vì visual hierarchy, anatomy, state,
component và boundary decisions đã được khóa. Screen implementation chỉ nên bắt đầu
sau khi Foundation/Integration Owner xác nhận platform API và ownership; full Wave 4
chỉ hoàn tất sau real adapters, persistence và E2E theo plan.
