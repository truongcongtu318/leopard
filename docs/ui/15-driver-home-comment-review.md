# Phản biện nhận xét UI/UX trang tổng quan Driver

**Ngày rà soát:** 14/09/2026  
**Nguồn nhận xét:** `D:/leopard/comment.md`  
**Phạm vi kiểm chứng:** `/orders`, bottom sheet, bottom navigation và driver sidebar

## Kết luận

Nhận xét trong `comment.md` đúng về cảm giác không gian: top HUD đang cao, sheet mở mặc định quá lớn và thông tin radar bị lặp. Tuy nhiên, một số chẩn đoán kỹ thuật đã lỗi thời hoặc chưa chính xác. Vấn đề cần ưu tiên nhất là hệ thống đang render hai sidebar drawer với hai nguồn trạng thái availability khác nhau, cùng nhiều dữ liệu tài xế/KPI hard-code.

Hướng thiết kế phù hợp:

- Giữ nền trắng/sáng cho bề mặt nổi; navy là màu thương hiệu, trạng thái và CTA.
- Giữ bottom navigation trong trạng thái chờ đơn.
- Thu gọn top HUD thành một thanh 64–80 px, bỏ KPI và radar khỏi header.
- Bottom sheet là nơi duy nhất hiển thị radar, bộ lọc và danh sách đơn.
- Chuyển sang mission mode khi đã nhận đơn; lúc đó có thể ẩn bottom navigation.

## Kiểm chứng từng nhận xét

| Nhận xét trong `comment.md` | Kết luận | Bằng chứng/giải thích |
|---|---|---|
| Thông tin Online/Offline và KPI nổi bật | Đúng một phần | Dễ thấy nhưng diện tích và mật độ lớn hơn giá trị sử dụng tức thời |
| Map + bottom sheet phù hợp app tài xế | Đúng | Kiến trúc bốn lớp hợp lý cho trạng thái chờ đơn |
| Filter tải trọng tiện cho tài xế | Không đồng ý trong mô hình một xe đang hoạt động | Backend nên chỉ gửi đơn phù hợp xe đã duyệt; nếu có nhiều xe, tài xế chọn “xe đang chạy”, không lọc tùy ý 1.25T/2.5T |
| Home và Profile cùng render | Sai | Profile là route `/profile`; không có Profile screen trong `DriverOrdersScreen` |
| Có nội dung sidebar lặp trong DOM | Đúng, nhưng nguyên nhân khác | `DriverDrawerProvider` render drawer toàn cục và `DriverOrdersScreen` render thêm một drawer cục bộ; nút menu mở cả hai |
| Bottom nav che nội dung sheet | Chưa đúng với code hiện tại | Nav có `zIndex: 50`, sheet `zIndex: 40`; sheet content có `paddingBottom: 104` để tránh vùng dock |
| Nên ẩn bottom nav khi Online | Không đồng ý | Online/chờ đơn vẫn cần chuyển Đơn, Thu nhập, Tôi; chỉ nên ẩn trong active trip/mission mode |
| CTA mở rộng bán kính đang chìm | Sai với code hiện tại | CTA đã là nút navy, cao tối thiểu 44 px trong empty state |
| Nút “Thử nổ đơn” phải có dev flag | Đúng, mức P0 trước release | Nút hiện render vô điều kiện khi không có active trip |
| Radar animation giúp người dùng yên tâm | Chỉ đúng nếu tiết chế | Ưu tiên trạng thái thật, “cập nhật lúc…” và retry; animation vô hạn có thể tạo cảm giác giả hoạt động và tốn pin |
| Top card chiếm quá nhiều màn hình | Đúng | Header + availability/KPI ước tính khoảng 190–220 px, chưa tính top inset; trên màn thấp có thể vượt 35% |

## Phân tích không gian hiện tại

`topHudContainer` bắt đầu ở 28 px trên Android hoặc 48 px trên iOS. Bên trong có:

- Glass wrapper: 20 px vertical padding.
- Header: nút menu/chuông cao 44 px.
- Availability card: 28 px vertical padding, hàng trạng thái/toggle 48 px, khoảng cách và hàng KPI/chip khoảng 55–70 px.

Tổng HUD thực tế vào khoảng 190–220 px. Với viewport 640 px, phần này chiếm khoảng 30–34%; với màn thấp hơn có thể cao hơn.

Bottom sheet mở mặc định tại `0.54`, nghĩa là che 54% viewport. Khoảng bản đồ nhìn thấy hữu ích nằm giữa đáy HUD và đỉnh sheet chỉ còn khoảng 10–20% tùy thiết bị. Vì vậy nhận xét “bản đồ bị bóp nghẹt” là hợp lý.

Vấn đề không chỉ là padding. `DriverAvailabilityCard` đang chứa đồng thời:

1. Label “Trạng thái nhận đơn”.
2. Headline “Sẵn sàng nhận đơn”.
3. Toggle Trực tuyến/Ngoại tuyến.
4. Dòng quét bán kính.
5. KPI tổng hợp.
6. Ba chip nhãn KPI.

Trong sheet, `DriverOrderFilters` lại hiển thị radar, bán kính và số đơn. Hai vùng đang cạnh tranh để trả lời cùng một câu hỏi.

## Những vấn đề quan trọng chưa được `comment.md` nêu

### P0 — Hai drawer và hai nguồn availability

`DriverDrawerProvider` bao toàn ứng dụng và luôn mount `DriverSidebarDrawer`. `DriverOrdersScreen` lại có `isSidebarOpen` riêng, gọi cả `setIsSidebarOpen(true)` lẫn `openDrawer()`, sau đó render thêm một drawer nữa.

Hệ quả:

- Hai panel/backdrop chồng nhau khi mở.
- Nội dung sidebar xuất hiện hai lần trong DOM/accessibility tree tùy trạng thái.
- Drawer toàn cục dùng availability do provider giữ; drawer cục bộ dùng `view.availability` từ runtime/API.
- Toggle ở hai drawer có thể không cùng trạng thái hoặc gọi hai flow khác nhau.

Chỉ giữ drawer toàn cục. Nút menu trên Home gọi `openDrawer()`; bỏ state và drawer cục bộ khỏi `DriverOrdersScreen`. Availability phải có một source of truth từ query/runtime dùng chung.

### P0 — Nút mô phỏng đang có trong production tree

`DriverOrderFilters` luôn render “Thử nổ đơn” nếu không có active trip. Props không có cờ `showDebugActions`, nên build production vẫn có đường vào modal đơn giả.

Nên bỏ hoàn toàn khỏi UI production. Preview/test harness truyền `showDebugActions=true`; runtime thật mặc định false và có build-time guard.

### P1 — Dữ liệu tài xế và KPI hard-code

Home đang truyền cố định:

- `Nguyễn Văn Tuấn`.
- `51C-889.24`.
- `2.5T`.

`DriverAvailabilityCard` mặc định `4 chuyến`, `620.000 ₫`, `5.5h`. Sidebar cũng lặp dữ liệu mẫu. Đây là rủi ro tin cậy cao hơn lỗi spacing: tài xế thật có thể nhìn thấy danh tính/biển số/thu nhập giả.

Runtime phải trả một `DriverHomeSummary` có driver identity, active vehicle, availability và today stats. Trong lúc thiếu dữ liệu, dùng skeleton hoặc ẩn KPI; không dùng giá trị demo trông như dữ liệu thật.

### P1 — Bộ lọc phương tiện có thể phá rule nghiệp vụ

Driver đang chọn `Xe tải 2.5T` mặc định cục bộ nhưng filter feed lại cho chọn `Xe van`, `1.25T`, `2.5T`. Nếu tài xế chỉ có một xe active đã duyệt, việc xem/nhận đơn của tải trọng khác là không cần thiết và có thể không an toàn.

Đề xuất:

- Một xe active: bỏ toàn bộ chip tải trọng; backend lọc theo vehicle ID.
- Nhiều xe đã duyệt: header hiển thị “Xe đang chạy”; đổi xe qua modal xác nhận trước khi hệ thống tải lại feed.
- Filter trong sheet chỉ dành cho khoảng cách, hướng tuyến, thời gian hoặc loại thùng trong phạm vi xe hiện tại.

### P1 — Loading/error khác cấu trúc content

Loading tự dựng một toggle/header cũ thay vì dùng cùng `DriverHomeHeader` và skeleton của `DriverAvailabilityCard`. Điều này làm layout nhảy khi tải xong và tăng hai implementation cần bảo trì.

Nên giữ nguyên geometry của header/content, chỉ thay data bằng skeleton hoặc trạng thái disabled.

### P2 — Tab state cục bộ không cần thiết

`activeTab` đổi ngay trước khi router điều hướng. Trạng thái active nên lấy từ pathname; nếu navigation lỗi, dock hiện tab đã chọn dù route chưa đổi.

## Debate: có nên giữ bản đồ lớn?

Bản đồ có ích khi:

- Hiển thị vị trí hiện tại có đáng tin cậy.
- Cho tài xế hiểu khu vực quét/điểm nóng.
- Hiển thị pickup của đơn gần nhất hoặc active route.

Bản đồ ít giá trị khi chỉ là nền trang trí dưới hai lớp card. Vì vậy không nên “cố để map” rồi phủ kín bằng HUD và sheet. Cần đảm bảo trạng thái chờ đơn nhìn thấy ít nhất khoảng 35–45% bản đồ; nếu chưa có dữ liệu heatmap/order location thật, có thể dùng canvas đơn giản hơn và ưu tiên trạng thái nhận đơn.

## Debate: bottom navigation hay sidebar?

Giữ bottom navigation làm điều hướng chính vì bốn mục đều thường dùng: Trang chủ, Đơn, Thu nhập, Tôi. Sidebar chỉ nên chứa tác vụ phụ:

- Trợ giúp/SOS.
- Cài đặt.
- Chính sách, giấy tờ và đăng xuất.

Không lặp lại bốn tab, trạng thái Online/Offline và KPI trong sidebar. Việc lặp cả hai hệ điều hướng làm tăng tải nhận thức và tạo nhiều source of truth.

## Bố cục đề xuất

### Chờ đơn — Online

```text
┌──────────────────────────────────┐
│ ☰  Tuấn · 51C-889.24     ● Online│  64–80 px
├──────────────────────────────────┤
│                                  │
│              MAP                 │  tối thiểu 35–45%
│          vị trí hiện tại         │
│                                  │
├────────── drag handle ───────────┤
│ Radar 5 km · cập nhật vừa xong  ⚙│
│ Đơn gần bạn                      │
│ [order cards hoặc empty state]   │
└──────────────────────────────────┘
   [Home] [Đơn] [Thu nhập] [Tôi]
```

- Top HUD chỉ chứa menu, tên/xe, trạng thái và chuông nếu có thông báo thật.
- Bỏ KPI khỏi Home; đưa vào Thu nhập. Có thể giữ một con số nhỏ “620k hôm nay” trong sheet khi có dữ liệu thật.
- Radar chỉ xuất hiện trong sheet.
- Empty state mặc định sheet ở snap khoảng 0.24–0.30; có đơn dùng 0.44–0.54.

### Offline

- Top pill hiển thị `Ngoại tuyến`.
- Sheet khoảng 0.30–0.38 với CTA lớn `Bắt đầu nhận đơn` và lý do nếu không thể online.
- Không hiển thị radar animation khi offline.

### Đang có chuyến

- Chuyển sang mission mode: route map, điểm tiếp theo, ETA dự kiến, CTA nghiệp vụ.
- Ẩn dock điều hướng hoặc thay bằng thanh tác vụ an toàn tối giản.
- Không hiển thị filter và feed đơn mới trừ khi nghiệp vụ cho phép nhận đơn ghép.

## Thứ tự ưu tiên sửa

1. Bỏ drawer cục bộ; hợp nhất availability source of truth.
2. Chặn tuyệt đối “Thử nổ đơn” khỏi runtime production.
3. Thay dữ liệu hard-code bằng dữ liệu thật/skeleton.
4. Nén top HUD, bỏ KPI và radar trùng.
5. Đổi snap mặc định theo empty/orders/active trip.
6. Bỏ filter tải trọng hoặc chuyển thành active vehicle selector có kiểm soát.
7. Lấy active bottom tab từ pathname.
8. Đồng nhất loading/error/content geometry và kiểm tra viewport thấp.

## Tiêu chí nghiệm thu

- Chỉ có một sidebar trong component tree và một nguồn availability.
- Không có debug action trong production build.
- Không có tên, biển số, thu nhập hoặc xếp hạng demo trên runtime thật.
- Ở viewport thấp nhất được hỗ trợ, map còn vùng quan sát hữu ích và HUD không va sheet.
- Dock không che CTA/card cuối ở mọi snap point.
- Empty state, có đơn và active trip có snap mặc định riêng.
- Tài xế không thể lọc/nhận đơn ngoài phương tiện active đã duyệt.
- Mission mode giảm điều hướng gây xao nhãng trong khi thực hiện chuyến.
