# LEOPARD Driver Home V2 — Implementation Specification

> **Trạng thái:** `PROPOSED`
>
> **Ngày:** 2026-09-14
>
> **Phạm vi:** Driver mobile Home tại route thực tế `/orders`
>
> **Mục tiêu:** Thiết kế lại Home để tài xế xác định trạng thái, chuyến hiện tại và hành động tiếp theo trong một lần quét ngắn
>
> **Tài liệu nền:** [Driver Mobile System Design](08-driver-mobile-system-design.md)

Tài liệu này là đặc tả triển khai tập trung cho Home Driver V2. Nó không thay thế
business rules, lifecycle, API authorization hoặc data contract hiện có. Nếu có
xung đột, ưu tiên SRS, requirements, architecture/API và
[08-driver-mobile-system-design.md](08-driver-mobile-system-design.md).

## 1. Quyết định thiết kế

Home Driver dùng **light operational canvas** thay vì phủ navy toàn màn hình:

- Canvas: `#F4F7FB`.
- Card: `#FFFFFF`.
- Navy `#0B1E42`: header, typography chính, navigation active và visual anchor.
- Cam `#F97316`: primary action và focus cần chú ý.
- Xanh lá `#16A34A`: trạng thái sẵn sàng/online đã được backend xác nhận.

Navy toàn màn hình tiếp tục dùng cho splash, login và OTP vì các màn đó có một tác
vụ duy nhất. Home có mật độ thông tin lớn, thường được dùng ngoài trời và cần phân
biệt nhanh nhiều loại trạng thái; canvas sáng giúp hierarchy rõ hơn. Không tạo một
dark theme riêng trong phạm vi triển khai này.

Primary CTA nền cam phải dùng chữ navy đậm. Không mặc định dùng chữ trắng trên
`#F97316` nếu chưa đo contrast trên implementation thật.

## 2. Nghiên cứu tham chiếu

| Sản phẩm | Pattern đã xác nhận | Cách áp dụng có giới hạn cho LEOPARD |
| --- | --- | --- |
| [Grab Driver](https://www.grab.com/ph/blog/driver/may-bagong-bihis-ang-grab-driver-app/) | Online/offline dễ truy cập, tìm booking thời gian thực, earnings một chạm và shortcut ở đáy Home | Đặt availability ở đầu màn hình; đưa điều hướng thường dùng về bottom navigation |
| [Lalamove Driver](https://www.lalamove.com/vi-vn/driver/capnhattinhnangmoi_heatmap) | Bộ lọc đơn hiển thị trực tiếp, nhóm đơn tiện chuyến/đường dài và cho biết filter đang áp dụng | Chỉ hiển thị 2–3 filter có giá trị quyết định; không biến Home thành màn lọc phức tạp |
| [Uber Freight](https://help.uber.com/freight/carrier/article/using-the-uber-freight-app-to-search-and-book-loads?nodeId=dfe69814-ea0d-43e8-ad16-f77621cd2e0c) | Tìm/sắp xếp theo vị trí, ngày lấy, quãng đường đến điểm lấy, giá và trọng lượng | Card đơn ưu tiên thực nhận, pickup distance, tuyến đường và loại xe |
| [Amazon Relay](https://relay.amazon.com/blog/how-truckers-use-the-amazon-relay-mobile-app) | Lịch chuyến, hướng dẫn theo từng bước, cảnh báo thay đổi, truck navigation và báo sự cố | Khi có active trip, Home chuyển trọng tâm sang đúng việc tiếp theo thay vì tiếp tục quảng bá đơn mới |
| [Roadie Driver](https://driver.roadie.com/) | Driver chủ động chọn/bỏ qua gig, hỗ trợ chuyến đơn và nhiều điểm; payout gắn với khoảng cách và kích thước hàng | Giữ quyết định nhận đơn minh bạch, nhưng không thêm loại gig hoặc pricing ngoài pilot |

Các pattern trên là bằng chứng tham khảo về hierarchy và thao tác. Chúng không cấp
quyền thêm auto-accept, bidding, multi-order, incentive, heatmap hoặc truck routing
nếu product scope và backend chưa hỗ trợ.

## 3. Vấn đề của Home hiện tại

Implementation hiện tập trung trong
[`DriverOrdersScreen.tsx`](../../apps/driver/src/features/orders/DriverOrdersScreen.tsx).

1. Map chiếm gần toàn bộ viewport; nội dung quyết định bị đẩy vào bottom sheet.
2. Error state của danh sách che phần lớn màn hình và khiến Home mất giá trị khi API
   tạm lỗi.
3. Availability, active trip và available orders cạnh tranh trong cùng hierarchy.
4. Active-trip card chứa nhiều lớp: route, proof, tracking, contact và CTA.
5. Public order card lặp ETA/route/price ở nhiều vùng.
6. Drawer chứa cả các destination sử dụng thường xuyên, không thuận tiện cho thao
   tác một tay.
7. Copy như “Mở buồng lái điều phối chuyến” dài và mang tính hệ thống.

## 4. Mục tiêu trải nghiệm

Trong ba giây đầu, Driver phải trả lời được:

1. Tôi đang online, offline hay có lỗi kết nối?
2. Tôi có chuyến đang thực hiện không?
3. Hành động duy nhất cần làm tiếp theo là gì?

Mỗi trạng thái Home chỉ có một visual anchor và tối đa một primary CTA trong first
viewport. Map, thống kê và metadata không được đẩy current task xuống dưới fold.

## 5. Information hierarchy

| Ưu tiên | Nội dung | Quy tắc |
| ---: | --- | --- |
| 0 | Session, permission hoặc system exception chặn workflow | Banner gọn ở đầu content; có label và action khắc phục |
| 1 | Active trip; nếu không có thì availability | Luôn nằm trong first viewport |
| 2 | Exactly-one next task | CTA 48–52 px, dùng động từ rõ |
| 3 | Điểm đến vật lý tiếp theo và ETA dự kiến | Không suy diễn từ dữ liệu thiếu |
| 4 | Tracking/proof readiness | Hiện khi liên quan, kèm text thay vì chỉ màu/icon |
| 5 | Available orders phù hợp | Danh sách là chính; map là secondary view |
| 6 | Thu nhập nhanh, lịch sử và metadata | Không cạnh tranh với current work |

## 6. State-driven Home

### 6.1 AVAILABLE và chưa có active trip

- Header: lời chào ngắn, thông tin xe một dòng, notification action.
- Availability strip: “Sẵn sàng nhận đơn” và toggle/control có label đầy đủ.
- Section “Đơn phù hợp gần bạn”.
- Filter chips tối đa ba mục: thời điểm, pickup radius và vehicle match.
- Render 2–3 order cards đầu tiên; phần còn lại dùng list scroll.
- Map không chiếm background. Dùng action “Xem trên bản đồ” để mở map riêng hoặc
  sheet lớn.

### 6.2 Có active trip

- Active trip thay availability làm visual anchor.
- Card chỉ chứa: reference, canonical status, next destination, ETA dự kiến và
  tracking/proof exception nếu có.
- Primary CTA đổi từ “MỞ BUỒNG LÁI ĐIỀU PHỐI CHUYẾN” thành “Tiếp tục chuyến”.
- Call, chat và report incident là secondary actions, không đặt ngang hàng CTA.
- Available orders nằm sau active trip và có thể ẩn khi backend không cho nhận song
  song.

### 6.3 OFFLINE hoặc tạm nghỉ

- Availability card có title “Bạn đang tạm nghỉ”.
- Primary CTA: “Bắt đầu nhận đơn”.
- Có thể hiển thị số chuyến và thực nhận hôm nay dưới dạng hai chỉ số nhỏ.
- Không chạy animation tìm đơn hoặc ngụ ý hệ thống đang matching.

### 6.4 Loading

- Header và availability skeleton giữ nguyên kích thước cuối.
- Danh sách dùng tối đa hai skeleton order cards.
- Không phủ loading spinner toàn màn hình.
- Không thay đổi snap point hoặc layout khi data hoàn tất.

### 6.5 Empty

- Giữ availability và filter hiện tại.
- Copy: “Chưa có đơn phù hợp quanh bạn”.
- Secondary action: “Điều chỉnh bộ lọc”.
- Không dùng illustration lớn hoặc animation liên tục.

### 6.6 Error và offline network

- Nếu có cached content, giữ nội dung cuối cùng và thêm banner:
  “Mất kết nối — dữ liệu có thể chưa được cập nhật”.
- Action “Thử lại” nằm trong banner, touch target tối thiểu 44 px.
- Nếu chưa có cache, header, availability và bottom navigation vẫn render; chỉ vùng
  danh sách chuyển thành error state.
- Không để error card phủ map hoặc toàn viewport như implementation hiện tại.

### 6.7 Permission denied

- Location denied không được giả thành network error.
- Giải thích lợi ích cụ thể: pickup distance và tracking.
- Action mở hướng dẫn/cài đặt chỉ xuất hiện nếu capability hiện tại hỗ trợ.
- Danh sách public chỉ render theo dữ liệu backend cho phép; client không tự mở rộng
  scope vì thiếu location.

## 7. Mobile anatomy

```text
Safe area
┌────────────────────────────────────┐
│ Chào anh Tuấn              Bell    │
│ 51C-889.24 · Xe tải 2.5T           │
├────────────────────────────────────┤
│ SẴN SÀNG NHẬN ĐƠN           Toggle│
│ Đang tìm trong bán kính 5 km       │
├────────────────────────────────────┤
│ [System/connection banner nếu có]  │
│                                    │
│ CHUYẾN ĐANG THỰC HIỆN              │
│ LEP-2048      Đang đến lấy hàng    │
│ Tân Bình → Quận 7                  │
│ 2,4 km · ETA dự kiến 12 phút       │
│ [          TIẾP TỤC CHUYẾN       ] │
│                                    │
│ ĐƠN PHÙ HỢP              Bộ lọc    │
│ [Nhận ngay] [≤5 km] [Xe 2.5T]      │
│ ┌────────────────────────────────┐ │
│ │ Tân Bình → Bình Thạnh          │ │
│ │ Cách điểm lấy 1,2 km           │ │
│ │ 14 km · 285.000 ₫ thực nhận    │ │
│ │                  Xem chi tiết  │ │
│ └────────────────────────────────┘ │
├────────────────────────────────────┤
│ Home       Đơn      Thu nhập    Tôi│
└────────────────────────────────────┘
Safe area
```

Nếu không có active trip, section đó được bỏ hoàn toàn; không render placeholder
rỗng. Nếu active trip tồn tại, nó phải xuất hiện trước available orders.

## 8. Component contract đề xuất

Tách `DriverOrdersScreen.tsx` theo feature boundary, không tách chỉ vì mỗi component
có vài dòng:

| Component | Trách nhiệm | Không được sở hữu |
| --- | --- | --- |
| `DriverHomeHeader` | Greeting, vehicle summary, notification/menu entry | Session query, drawer state toàn cục |
| `DriverAvailabilityCard` | Hiện availability canonical và gửi command callback | Tự đổi AVAILABLE/OFFLINE trước server response |
| `DriverSystemBanner` | Connection, permission, tracking exception và retry | Domain status của order |
| `DriverActiveTripCard` | Current trip summary và navigation tới workflow | Tự suy ra next lifecycle command |
| `DriverOrderFilters` | Hiện filter chips và mở settings sheet | Filter private data phía client |
| `DriverNearbyOrderCard` | Public summary đủ để quyết định mở chi tiết | Contact/customer private fields |
| `DriverNearbyOrdersList` | Loading/empty/error/content cho order collection | Availability hoặc active-trip state |
| `DriverBottomNavigation` | Các route thường dùng đã tồn tại | Tạo route/feature mới ngoài scope |

State nghiệp vụ tiếp tục đến từ `DriverListView`/port. Presentational component chỉ
nhận immutable props và callback. Không chuyển server state sang các `useState` cục
bộ để mô phỏng thành công.

## 9. Order card V2

Thông tin trong collapsed card theo thứ tự:

1. Pickup → drop-off, tối đa hai dòng mỗi địa chỉ.
2. Pickup distance và pickup time.
3. Thực nhận dự kiến — số lớn nhất trong card.
4. Trip distance, ETA dự kiến, vehicle và cargo summary.
5. Một secondary action “Xem chi tiết”.

Không lặp `etaLabel`, `publicRouteLabel` hoặc `priceLabel`. Không đặt “Bỏ qua” và
“Nhận đơn” ngang nhau nếu backend vẫn yêu cầu xem detail trước khi accept. Chỉ render
action mà capability hiện có cho phép.

Không hiển thị customer name, phone, full private notes hoặc contact actions trước
assignment.

## 10. Map policy

- Map không còn là full-screen background mặc định của Home.
- Khi Driver tìm đơn, list là primary surface; map mở theo action riêng.
- Khi có active trip, map preview được phép xuất hiện sau current-task card hoặc
  trong trip workflow.
- Bất kỳ map preview nào cũng tuân thủ chiều cao tối thiểu 280 px theo
  [responsive rules](05-responsive-rules.md).
- Map failure không được làm mất availability, active trip hoặc cached list.

## 11. Visual tokens

| Token dùng trong spec | Giá trị mục tiêu | Vai trò |
| --- | --- | --- |
| `driver.home.canvas` | `#F4F7FB` | Nền operational screen |
| `driver.home.surface` | `#FFFFFF` | Card/list surface |
| `driver.home.navy` | `#0B1E42` | Brand anchor và text mạnh |
| `driver.home.navyPressed` | `#142B50` | Pressed/selected navy surface |
| `driver.home.orange` | `#F97316` | Primary action/focus |
| `driver.home.success` | `#16A34A` | Online/healthy đã xác nhận |
| `driver.home.text` | `#12233F` | Body chính |
| `driver.home.muted` | `#64748B` | Metadata |
| `driver.home.border` | `#E2E8F0` | Hairline border |
| `driver.home.danger` | `#DC2626` | Error/blocker |

Khi triển khai, map các giá trị này về semantic token trong `@leopard/mobile-core`.
Không hardcode lặp lại nếu token tương đương đã tồn tại. Mọi cặp foreground/background
phải được đo contrast trên Web, Android và iOS.

## 12. Typography, spacing và touch

- Page title: 20–22 px, weight 800, tối đa một dòng.
- Section title: 16–18 px, weight 700.
- Body: 14–15 px, line-height 20–22 px.
- Metadata: 12–13 px; không dùng dưới 12 px cho thông tin quyết định.
- Tiền, ETA và order reference dùng tabular numerals.
- Card radius: 18–20 px; tránh card lồng card.
- Section gap: 20–24 px; content padding ngang: 16–20 px.
- Primary CTA: cao 52 px; action khác tối thiểu 44 × 44 px.
- Bottom navigation phải chừa safe-area và không che list item cuối.

## 13. Interaction và motion

- Availability change: haptic medium sau command thành công; rollback/refresh nếu
  server từ chối.
- Filter selection: haptic selection; chip active có color + text/icon, không chỉ
  đổi màu.
- Primary CTA: pressed scale rất nhẹ `0.98`, 100–140 ms.
- Bottom sheet dùng spring token hiện có của `@leopard/mobile-core`.
- Không pulse liên tục toàn card. Chỉ tracking/radar indicator nhỏ được animation và
  phải tôn trọng reduced motion.
- Incoming offer vẫn là interruptive modal có timeout theo contract hiện có; Home
  không tự tạo countdown mới.

## 14. Navigation

Bottom navigation mục tiêu:

1. `Trang chủ` — current Home/available work.
2. `Đơn` — danh sách/lịch sử theo route đã tồn tại.
3. `Thu nhập` — route hiện có.
4. `Tôi` — profile/settings entry.

Chỉ triển khai tab khi route tương ứng đã tồn tại và quyền truy cập rõ. Drawer có
thể tiếp tục chứa tính năng ít dùng hoặc support trong giai đoạn chuyển tiếp. Không
giữ hai navigation control cùng dẫn đến mọi destination trong thời gian dài.

## 15. Responsive behavior

### 360–767 px

- Một cột.
- First viewport phải chứa header, availability hoặc active trip anchor và primary
  CTA.
- Filter chips cuộn ngang có chủ ý; page không được horizontal overflow.
- Bottom navigation cố định và chừa safe area.

### 768–1023 px

- Content max-width 720 px, căn giữa.
- Có thể dùng hai cột cho active trip/map preview và orders list nếu vẫn giữ thứ tự
  đọc accessibility.
- Không phóng card mobile lên toàn chiều rộng tablet.

Viewport bắt buộc: `360×800`, `390×844`, `768×1024`. Bổ sung `360×640` cho stress
test first viewport và font scaling.

## 16. Accessibility và outdoor use

- Touch target tối thiểu 44 × 44 px.
- Availability switch có role, label, value và disabled/busy state.
- Status luôn có text; màu không là tín hiệu duy nhất.
- Banner mới dùng live region phù hợp, tránh đọc lại mỗi lần query polling.
- Focus order: header → system banner → availability/active trip → primary CTA →
  filters → orders → bottom navigation.
- Dynamic Type không làm che CTA hoặc overlap status.
- Address được wrap/truncate có kiểm soát; accessible label vẫn chứa nội dung cần
  thiết.
- Kiểm tra contrast WCAG AA và thử dưới chế độ brightness cao ngoài trời.

## 17. Implementation plan

### Phase 0 — Khóa baseline

1. Chụp trạng thái hiện tại cho loading, empty, error, available và active trip.
2. Chạy test hiện có của `DriverOrdersScreen` và runtime adapter.
3. Xác nhận route thật `/orders` và route labels trong navigation.
4. Ghi lại issue hiện có để phân biệt regression với lỗi nền.

### Phase 1 — Component extraction

1. Tách availability, active trip, system banner và public order card.
2. Giữ nguyên `DriverListView` và callback contract.
3. Loại dữ liệu/copy lặp trong card.
4. Không đổi API hoặc lifecycle trong phase này.

### Phase 2 — Home composition

1. Thay full-screen map canvas bằng light content canvas.
2. Render theo state hierarchy tại mục 6.
3. Chuyển map thành secondary action/preview.
4. Giữ cached content khi list refetch lỗi nếu query layer cung cấp data cũ.

### Phase 3 — Navigation và interaction

1. Thêm bottom navigation cho các route đã tồn tại.
2. Chuẩn hóa CTA copy và haptic.
3. Kiểm tra incoming-offer modal không bị bottom navigation che.

### Phase 4 — Verification

1. Unit test component state và callbacks.
2. Integration test query loading/error/refetch và availability command.
3. E2E: available → mở order; active trip → tiếp tục; offline → online; network
   error → retry.
4. Visual QA bốn viewport và font scaling.
5. Accessibility: labels, focus order, reduced motion, touch target và contrast.

## 18. Acceptance criteria

- [ ] Home dùng canvas sáng; navy là brand anchor, không phủ toàn screen.
- [ ] Availability hoặc active trip nằm trong first viewport.
- [ ] Active trip có đúng một primary CTA “Tiếp tục chuyến”.
- [ ] Public order card không lặp price/ETA/route và không lộ private contact data.
- [ ] List là primary order-discovery surface; map không còn full-screen background.
- [ ] Loading, empty, error, success và permission-denied đều có state riêng.
- [ ] Refetch error không xóa cached active trip/list đang hiển thị.
- [ ] Không horizontal overflow ở 360 px.
- [ ] Touch target tối thiểu 44 px và primary CTA tối thiểu 48 px.
- [ ] Mọi ETA dùng nhãn “ETA dự kiến”; demo data dùng “Dữ liệu mô phỏng”.
- [ ] Availability/accept action chặn double-submit và phản ánh server result.
- [ ] Tests liên quan, Driver typecheck và lint đều đạt.
- [ ] Browser/device QA đạt tại `360×640`, `360×800`, `390×844`, `768×1024`.
- [ ] Không còn P0/P1 trong phạm vi redesign.

## 19. Không nằm trong phạm vi

- Thay đổi order lifecycle hoặc pricing.
- Thêm bidding, incentive, heatmap hoặc multi-order capability.
- Tự xây truck-specific navigation khi provider chưa hỗ trợ.
- Dark mode đầy đủ.
- Thay đổi quyền Driver, contact projection hoặc assignment rules.
- Thay API chỉ để phục vụ visual layout nếu view model hiện tại đã đủ dữ liệu.

## 20. Definition of done

Implementation chỉ hoàn tất khi code, tests, visual QA và accessibility QA cùng đạt.
Screenshot hoặc fixture đẹp không thay thế runtime evidence. Diff phải tập trung vào
Driver Home, không chứa refactor hoặc generated file ngoài phạm vi; mọi thay đổi
behavior phải cập nhật lại [screen specs](03-screen-specs.md) trong cùng task.
