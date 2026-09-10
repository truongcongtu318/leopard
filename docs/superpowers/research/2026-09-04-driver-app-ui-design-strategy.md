# LEOPARD Driver — Chiến lược Redesign UI theo hướng App-native

> **Ngày:** 2026-09-04
> **Phạm vi:** Toàn bộ 10 màn hình driver — chiến lược thị giác (UI craft), không phải kiến trúc thông tin (IA đã bàn ở báo cáo trước)
> **Liên quan:** `docs/superpowers/research/2026-09-04-driver-ux-market-research.md` (phân tích thị trường + đề xuất IA/tính năng)
> **Phát hiện quan trọng:** Repo đã có sẵn một bản thiết kế app-native hoàn chỉnh do Claude Design tạo ra, chưa được đối chiếu/triển khai — xem §2.

---

## 0. Tóm tắt điều hành

Bạn nhận xét đúng: driver hiện tại **nghiêng về "website" hơn "app"**. Sau khi đọc toàn bộ 10 màn + hệ token, tôi xác định được nguyên nhân cụ thể (không phải cảm tính):

1. **Icon lẫn lộn hai hệ.** Màn đơn hàng (list/detail) đã dùng icon vector SVG tử tế (`CoreIcons.tsx`). Nhưng 6/10 màn còn lại (Doanh thu, Lịch sử, Hiệu suất, KYC, Cài đặt, Chat, Hồ sơ) dùng **emoji trực tiếp làm icon** (🔔💳💰🕒👤🏆★📸🛡️⭐📞) — đây là dấu hiệu "web/demo" rõ nhất, vì emoji render khác nhau theo OS/font, không đổi màu theo theme, không có state (active/inactive), không đúng kích thước lưới.
2. **Bottom tab bar của driver là bản "phẳng" hơn** so với `FloatingNavBar` mà Customer đang dùng — driver dùng `TabBar` cũ: nằm trong luồng layout (không nổi/không đổ bóng), icon emoji, không có hiệu ứng active rõ ràng. Đây là khác biệt cụ thể, dễ sửa nhất, tác động cao nhất.
3. **Mật độ nhãn chữ-hoa (eyebrow) quá dày** ("DRIVER · FIELD COCKPIT", "CHỈ SỐ VẬN HÀNH", "GIẤY TỜ PHÁP LÝ ĐÃ NỘP"...) — đúng ngôn ngữ **dashboard vận hành/enterprise report**, không phải ngôn ngữ app tiêu dùng. Dùng được ở 1-2 nơi làm điểm nhấn, nhưng lặp lại ở mọi màn thì thành "website nội bộ".
4. **Card phẳng viền đã ổn** (radius 6, border 1px, không shadow nặng) — phần này **không phải vấn đề**, đã khá gần chuẩn app-native rồi.
5. **Một số màn dùng khối màu pastel lớn xếp chồng** (Hồ sơ: 3 card xanh/lá/vàng liên tiếp) — đọc giống *landing page feature section* hơn là *danh sách thông tin trong app*.

**Tin tốt:** Trong repo đã có sẵn `apps/mobile/Leopard system mobile app-handoff/` — một bộ thiết kế **"Mobile design v3"** do Claude Design tạo, phủ đủ cả 10 màn driver (kể cả **Ví — chưa có trong code**), với ngôn ngữ thị giác đúng thứ bạn đang muốn: hero tối đậm cho màn vận hành, card phẳng viền không shadow, **100% icon SVG line-art không emoji**, tab bar nổi dạng viên bo, typography đậm-gọn, ma trận trạng thái (loading/error/offline/permission/conflict) đầy đủ cho mỗi màn. Chiến lược dưới đây **lấy bản thiết kế này làm kim chỉ nam**, đối chiếu với code thật, và điều chỉnh màu thương hiệu cho khớp `leopardPalette` đã chốt.

---

## 1. Danh sách đầy đủ 10 trang Driver

| # | Trang | File hiện tại | Vào từ đâu | Trạng thái |
|---|-------|---------------|-----------|-----------|
| 1 | **Tổng quan** (nhận đơn / dashboard) | `DriverOrdersScreen.tsx` | Tab bar | Có code, cần polish |
| 2 | **Chi tiết đơn** (active mission) | `DriverOrderDetailScreen.tsx` | Từ #1 | Có code, cần polish |
| 3 | **Doanh thu** | `DriverEarningsScreen.tsx` | Tab bar | Có code, mock data inline |
| 4 | **Lịch sử** | `DriverHistoryScreen.tsx` | Tab bar | Có code, mock data inline |
| 5 | **Hồ sơ** | `ProfileScreen.tsx` (`ProfileRuntime`) | Tab bar | Có code |
| 6 | **Hiệu suất** | `DriverPerformanceScreen.tsx` | Menu Hồ sơ (chưa nối route thật) | Có code, "mồ côi" |
| 7 | **Hồ sơ KYC** | `DriverKycScreen.tsx` | Menu Hồ sơ (đã nối) | Có code |
| 8 | **Cài đặt** | `DriverSettingsScreen.tsx` | Menu Hồ sơ (đã nối) | Có code |
| 9 | **Chat đơn hàng** | `DriverChatScreen.tsx` | Từ #2 | Có code |
| 10 | **Ví & rút tiền** | *(chưa có)* | *(chưa có entry point)* | **Chỉ tồn tại trong mockup** — chưa code |

Route thật (`apps/mobile/app/driver/`): `orders/index.tsx`, `orders/[id].tsx`, `earnings.tsx`, `history.tsx`, `profile.tsx`, `performance.tsx`, `kyc.tsx`, `settings.tsx`, `chat/[id].tsx`. Thiếu: `wallet.tsx`.

---

## 2. Phát hiện: Bản thiết kế app-native đã có sẵn trong repo

`apps/mobile/Leopard system mobile app-handoff/leopard-system-mobile-app/project/Leopard Mobile.dc.html` là **handoff bundle từ Claude Design** — một prototype HTML/CSS/JS mô phỏng đúng khung điện thoại (status bar, tai thỏ, safe area), phủ toàn bộ 10 màn driver ở trên **cộng thêm ma trận trạng thái** (`DRIVER_LIST_SCENARIOS`, `DRIVER_DETAIL_SCENARIOS` — 10 và 22 kịch bản: loading/error/offline/permission/conflict/race-condition...).

### 2.1 Token thị giác của mockup (đối chiếu với code)

| Token | Mockup "v3" | Code hiện tại (`tokens.ts`) | Nhận xét |
|---|---|---|---|
| Font | **Inter** | (không set font family riêng — hệ thống mặc định) | Mockup có nhân dạng chữ rõ hơn |
| Nền màn (body) | `#F6F5F1` (ấm, ngà) | `colors.neutral.canvas = #F8FAFC` (lạnh, xanh xám) | Mockup ấm hơn — hợp tinh thần "Đông Sơn" của doc 14 |
| Hero tối (màn vận hành) | `#0B2530` (navy-teal đậm, full-bleed, đồng bộ với status bar) | `colors.operational.ink = #0F172A`, chỉ là khối bo góc dưới, **không đồng bộ status bar** | Mockup có cảm giác "hero" thật; code hiện tại là "card tối" chèn trong trang |
| Brand tương tác | `#075985` (sky-800, đậm) | `leopardPalette.primary = #0284C7` (sky-600) | Cùng họ xanh biển, mockup đậm hơn 1 bậc |
| Border card | `#E5E2DA` (ấm) | `colors.neutral.subtleBorder ≈ #F1F5F9` / `cardBorder = #E2E8F0` (lạnh) | Cùng ý tưởng, khác nhiệt độ màu |
| Bán kính | `6px` card/button, `999px` chỉ cho badge/chip/tab-dot | `radius.card = 6`, `radius.pill = 999` | **Trùng khớp hoàn toàn** ✅ |
| Shadow | **Không dùng** — card chỉ viền 1px | `leopardElevation.subtle/modal` dùng rải rác | Mockup phẳng hơn, dứt khoát hơn |
| Icon | 100% SVG line-art, stroke 1.8–2.4px, không fill | Vector ở 2 màn order; **emoji ở 6 màn còn lại** | Đây là gap lớn nhất |
| Tab bar | Nổi, bo 10px, viền 1px, active = pill nền xanh nhạt + chữ xanh đậm | `TabBar.tsx`: trong luồng, active = nền `primaryBg` nhưng icon emoji | Cấu trúc gần giống, thiếu icon + độ "nổi" |
| Typography tiêu đề | 27px/800, letter-spacing -0.3 | `typography.pageTitle`: 24px/700 | Mockup đậm/gọn hơn |

### 2.2 Quyết định hòa giải token (đề xuất)

Không đề xuất đổi hex thương hiệu lần nữa (đã chốt `leopardPalette` ở phiên trước, đang chạy thật). Thay vào đó: **giữ nguyên bảng màu `leopardPalette` đã chốt, nhưng chuyển toàn bộ 4 quy tắc cấu trúc sau từ mockup vào code**, vì đây là phần tạo ra cảm giác "app" chứ không phải hex cụ thể:

1. **Hero full-bleed đồng bộ status bar** cho các màn vận hành (Tổng quan, Chi tiết đơn, Hồ sơ) — không phải card tối chèn trong trang.
2. **100% icon vector, 0% emoji** — kể cả badge/tier/rating/POD/call button.
3. **Card phẳng-viền là chuẩn duy nhất** — bỏ dần shadow rải rác, giữ nhất quán.
4. **Tab bar nổi** cho driver, đồng bộ pattern với `FloatingNavBar` của Customer (hiện Customer đã có, Driver thì chưa — mất cân bằng giữa 2 role trong cùng app).

---

## 3. Nguyên tắc thiết kế "app-native, hiện đại, tối giản, không icon hoạt hình"

Đúc kết từ chuẩn mobile-native trưởng thành (iOS Human Interface Guidelines, Material Design 3) + bản mockup nội bộ đã có:

1. **Icon là ngôn ngữ, không phải trang trí.** Một bộ icon line-art nhất quán (stroke 1.75–2px, lưới 24×24, không fill trừ chấm/marker nhỏ). Không emoji — emoji không kiểm soát được màu, độ đậm, kích thước, và khác nhau giữa iOS/Android.
2. **Icon luôn đi cùng "chip" hình học** khi làm điểm neo trực quan (khối bo 6px chứa icon), không thả icon trần giữa văn bản — pattern này đã có sẵn trong `LedgerSection`/`iconCircleInfo` của mockup, tăng cảm giác "app" rõ rệt so với icon trần.
3. **Một hero, không nhiều "card tối" rải rác.** Màu tối/nổi bật chỉ nên xuất hiện ở **đúng một vùng** mỗi màn (thường là header) — tránh lặp lại khối tối ở nhiều nơi trong cùng màn (hiện `DriverOrderDetailScreen` có tới 2 khối tối: header ink + `missionStatusSlab`).
4. **Nhãn chữ-hoa dùng như gia vị, không phải cấu trúc chính.** Tối đa 1 eyebrow/màn (trong header). Các "SECTION LABEL" giữa thân bài nên chuyển thành tiêu đề thường (sentence case) hoặc icon+label ngắn.
5. **Số liệu dùng tabular nums + độ đậm phân cấp rõ.** Số tiền/KPI là điểm neo mắt đầu tiên — đã đúng ở Doanh thu/Hiệu suất, giữ nguyên.
6. **Trạng thái luôn có 3 tầng: màu — icon/dot — chữ.** Không dùng màu đơn độc (đã tốt ở `StatusBadge`, giữ nguyên).
7. **Tab bar là "trạm chỉ huy nổi", không phải thanh chân trang.** Bo góc lớn, viền nhẹ, tách khỏi nội dung bằng khoảng trắng, đổ bóng vừa phải.
8. **Card thưa gọn hơn là dày trang trí.** Bỏ các khối pastel lớn nối tiếp nhau (kiểu landing page); gộp thành list item gọn trong 1 card viền, dùng màu chỉ ở icon-chip nhỏ, không nhuộm cả khối nền.

---

## 4. Chiến lược từng trang

Mỗi trang: **Hiện trạng** (trích code) → **Vấn đề** → **Hướng target** (bám mockup + nguyên tắc §3) → **Việc cụ thể**.

### 4.1 Tổng quan (Dashboard / Nhận đơn) — `DriverOrdersScreen.tsx`

**Hiện trạng:** Header ink + `AvailabilityControl` (nút trong card) + tab con Chờ nhận/Đang thực hiện + `ActiveTripRail` (viền trái 4px) + list `PublicOrderCard` (đã dùng `IconLocationPin` — tốt).

**Vấn đề:** Đây là màn tốt nhất hiện có, nhưng: (a) availability là 1 nút phẳng trong card, không phải "trạm điều khiển" nổi bật; (b) không có dải KPI trong ngày (mockup có 3 ô KPI: Chuyến hôm nay / Thu nhập ước tính / Đánh giá TB — rất "app dashboard", hiện code chưa có); (c) `activeRail` dùng viền trái 4px — chấp nhận được nhưng nên thêm icon-chip.

**Target:** Header ink full-bleed → duty-toggle nổi bật ngay dưới header (dạng switch lớn, không phải nút text) → dải KPI 3 cột (card viền, số đậm 19px, nhãn 11px uppercase — đúng mockup `kpiCardStyle`) → active trip rail (icon-chip + viền trái giữ nguyên, vì đây là điểm nhấn hợp lý duy nhất của màn) → load-board list (giữ nguyên, đã tốt).

**Việc cụ thể:**
- Thay `Button` availability bằng component switch lớn có icon (chấm live + label), tách khỏi card thường.
- Thêm dải KPI 3 cột dùng dữ liệu thật (không mock) — tái dùng pattern `kpiCardStyle` từ mockup.
- Icon-hóa `ActiveTripRail`: thêm icon-chip (gói hàng/route) ở đầu card thay vì chỉ text.

### 4.2 Chi tiết đơn (Active Mission) — `DriverOrderDetailScreen.tsx`

**Hiện trạng:** Header ink + `missionStatusSlab` (khối tối thứ 2!) + `RouteSpine`/`EtaIndicator` + `LedgerSection` đánh số 01–04 + `ProofPanel` (viền dashed) + `TrackingPanel` (map lược đồ) + sticky CTA.

**Vấn đề:** Hai khối tối chồng nhau (header + missionStatusSlab) làm màn nặng và rối; `LedgerSection` đánh số 01/02/03/04 là **cấu trúc web-document** (đánh số bước tài liệu) hơn là cấu trúc app; proof panel viền dashed trông giống "upload zone web", không giống app camera-first.

**Target:** Bỏ `missionStatusSlab` tối — chuyển thông tin của nó (leg hiện tại, tracking label) lên **ngay trong header ink** (mockup làm đúng vậy: header + badge, không có khối tối thứ 2). Bỏ đánh số 01–04, thay bằng icon-chip đầu mỗi khối (route/hàng hóa/proof/tracking) — nhất quán với nguyên tắc §3.2. Proof: đổi viền dashed → card thường + icon camera-chip + CTA to (camera-first, không phải "kéo thả file" kiểu web).

**Việc cụ thể:**
- Gộp `missionStatusSlab` vào header (badge trạng thái + tracking label ngay dưới title).
- Đổi `LedgerSection` (index 01–04) → section header thường: icon-chip + tiêu đề, bỏ số thứ tự trừ khi thật sự là quy trình tuần tự có ý nghĩa cho tài xế.
- Proof panel: bỏ border dashed, dùng `iconCircleInfo`-style chip máy ảnh + CTA "Chụp ảnh xác nhận" nổi bật (primary button, không phải khối viền đứt).
- Map: giữ lược đồ minh họa như mockup (đã đúng triết lý "không giả lập tile thật"), nhưng thêm nút "Mở Google Maps/Waze" (theo đề xuất G4 ở báo cáo trước).

### 4.3 Doanh thu — `DriverEarningsScreen.tsx`

**Hiện trạng:** Chip kỳ (Hôm nay/Tuần/Tháng), summary card số lớn, 4 ô stat, list chuyến — **hoàn toàn không icon**, mock data inline.

**Vấn đề:** Không icon ở đâu cả khiến màn thành "bảng số liệu kế toán" — chính là cảm giác web nhất trong toàn bộ 10 màn. Chuông báo tốt (số to, tabular) nhưng thiếu neo hình học.

**Target:** Thêm icon-chip nhỏ ở mỗi trip-card (icon route/gói hàng), icon nhỏ cạnh mỗi label stat (chuyến/giờ/tip/thưởng) dùng cùng bộ `CoreIcons`. Chip kỳ giữ nguyên (đã đúng pattern pill). Rút mock → repository/query.

**Việc cụ thể:**
- Icon-hóa 4 stat trong summary card (số chuyến, giờ online, tip, thưởng) bằng icon nhỏ 14px đứng trước label.
- Icon route nhỏ trong mỗi trip-card.
- Rút `mockTrips` khỏi component, đi qua data layer.

### 4.4 Lịch sử — `DriverHistoryScreen.tsx`

**Hiện trạng:** Filter chip Tất cả/Đã giao/Đã hủy, card route TỪ→ĐẾN, `📸 Đã nộp POD` (emoji).

**Vấn đề:** Emoji camera; nhãn "TỪ"/"ĐẾN" chữ hoa nhỏ lặp lại — ổn ở đây vì đúng vai trò route label (mockup cũng dùng cách này), không cần đổi.

**Target:** Thay `📸` bằng icon camera vector nhỏ + label "Đã nộp POD" cùng dòng, màu success.

**Việc cụ thể:**
- Thay emoji POD badge bằng `IconCamera` (hoặc icon tương đương trong `CoreIcons`) + `StatusBadge`-style pill thay vì text màu rời rạc.
- Rút `mockHistory`, thêm phân trang/infinite scroll (đã nêu ở báo cáo trước, giữ nguyên khuyến nghị).

### 4.5 Hồ sơ — `ProfileScreen.tsx`

**Hiện trạng:** Avatar tròn chữ cái + tên + rating `⭐` emoji + 3 stat box + **3 card pastel lớn liên tiếp** (xanh biển/xanh lá/vàng) cho Liên hệ / Năng lực / KYC + menu card + logout.

**Vấn đề:** 3 card pastel lớn nối tiếp là pattern **landing-page feature section**, không phải app profile — app thật (iOS Settings, Grab, Circle) dùng list gọn dòng-đơn với icon nhỏ, không nhuộm cả khối nền theo từng chủ đề màu. `⭐` emoji cho rating trong khi màn Hiệu suất đã có rating chuẩn hơn — trùng lặp không nhất quán.

**Target:** Gộp 3 card pastel thành **1 card thông tin dạng list dòng** (icon-chip nhỏ đầu dòng + label + value, giống `infoRowStyle` của mockup), giữ đúng 1 điểm nhấn màu duy nhất (badge trạng thái KYC dạng pill nhỏ, không nhuộm cả card). Thay `⭐` bằng icon rating vector.

**Việc cụ thể:**
- Hợp nhất "Liên hệ / Năng lực / KYC" thành 1 `infoCard` dạng list (mỗi dòng: icon nhỏ + label + value), badge trạng thái KYC là pill nhỏ cuối dòng, không phải card riêng tô màu.
- Rating: icon vector, không emoji.
- Giữ nguyên avatar, stat row, menu card, logout — các phần này đã ổn.

### 4.6 Hiệu suất — `DriverPerformanceScreen.tsx`

**Hiện trạng:** `★★★★★` text stars, `🏆` emoji tier badge, 4 metric rows, review feed.

**Vấn đề:** Emoji đậm đặc nhất trong toàn bộ 10 màn (2 loại emoji + text-star). Đây là màn "vui/động lực" nên dễ bị kéo về hướng trang trí — cần kỷ luật giữ line-art.

**Target:** Sao đánh giá dùng icon vector fill/outline theo mức (star component thật, không phải ký tự Unicode lặp). Tier badge dùng icon huy hiệu vector nhỏ + pill màu, bỏ `🏆`. Thêm thanh tiến độ lên hạng kế tiếp (đã đề xuất ở báo cáo trước — đúng lúc làm cùng đợt vì đang sửa màn này).

**Việc cụ thể:**
- Component `StarRating` dùng SVG (đổ đầy theo rating, không lặp ký tự).
- Tier: icon huy hiệu vector + pill, bỏ emoji.
- Thêm progress bar "còn X chuyến để lên hạng Bạch Kim" dưới tier badge.

### 4.7 Hồ sơ KYC — `DriverKycScreen.tsx`

**Hiện trạng:** `🛡️` emoji shield trong banner xanh lá, `✓ Đã duyệt` text checkmark, list giấy tờ.

**Vấn đề:** Banner xanh lá full-width với emoji lớn — giống "trust badge" trên trang web bán hàng hơn là trạng thái hồ sơ trong app.

**Target:** Banner trạng thái thu gọn thành hàng ngang: icon shield vector nhỏ trong chip tròn + text 2 dòng (không chiếm cả khối màu lớn). Mỗi document row: icon loại giấy tờ (CCCD/GPLX/đăng ký xe khác icon nhau) + `StatusBadge` pill thật thay vì text `✓ Đã duyệt` tự chế.

**Việc cụ thể:**
- Icon shield vector trong chip tròn 44px, không phủ nền cả card.
- Icon riêng cho từng loại giấy tờ (id-card/license/vehicle-doc/insurance) — tăng khả năng quét nhanh, đúng tinh thần "app thật".
- Badge trạng thái dùng `StatusBadge`/`badgeVisual` pattern nhất quán với toàn hệ thống, không tự viết text màu rời.

### 4.8 Cài đặt — `DriverSettingsScreen.tsx`

**Hiện trạng:** 3 nhóm card, `Switch` native cho 3 toggle, chevron `›` cho nav row, badge "Đã cấp" pastel.

**Vấn đề:** Đây là màn **gần chuẩn app nhất** rồi (dùng `Switch` thật, list rows đúng kiểu Settings app quen thuộc). Không có emoji. Việc cần làm chỉ là thêm icon leading cho mỗi row để tăng khả năng quét — hiện toàn bộ dòng chỉ có text, hơi "phẳng".

**Target:** Thêm icon nhỏ 20px đầu mỗi row (chuông/tự động/pin/bản đồ/khóa/tài liệu) — pattern chuẩn của mọi app Settings (iOS Settings, Android Settings đều có icon leading).

**Việc cụ thể:**
- Thêm icon-chip nhỏ (không cần nền màu, icon trần 20px đủ) đầu mỗi `settingRow`.
- Giữ nguyên toàn bộ cấu trúc còn lại — đây là màn cần polish ít nhất.

### 4.9 Chat đơn hàng — `DriverChatScreen.tsx`

**Hiện trạng:** Bubble trái/phải chuẩn, quick-reply chips, `📞 Gọi khách` emoji button trong header.

**Vấn đề:** Cấu trúc chat đã đúng chuẩn app (bubble, quick reply, input bar) — chỉ có nút gọi dùng emoji giữa header, lạc tông so với phần còn lại của icon system.

**Target:** Thay `📞` bằng `IconPhone` vector trong nút pill, giữ nguyên mọi thứ khác.

**Việc cụ thể:**
- Đổi 1 icon duy nhất: nút gọi trong `headerRight`.

### 4.10 Ví & rút tiền — *(chưa có, chỉ có trong mockup)*

**Hiện trạng:** Không tồn tại trong code (`apps/mobile/app/driver/`). Mockup có: card số dư lớn + CTA rút tiền + card tài khoản nhận tiền + lịch sử rút tiền dạng list.

**Vấn đề:** Đây là gap tính năng đã nêu ở báo cáo trước (G3) — nhắc lại ở đây vì khi build mới, nên build **đúng theo ngôn ngữ app-native ngay từ đầu** thay vì build xong rồi sửa như 9 màn kia.

**Target:** Dùng đúng pattern mockup: card số dư (số cực lớn, đậm, tabular) + primary CTA full-width + card tài khoản ngân hàng (icon ngân hàng-chip + số tài khoản che 1 phần + tên) + list lịch sử rút tiền (badge trạng thái pill).

**Việc cụ thể:** Xây mới theo pattern trên, nối route `apps/mobile/app/driver/wallet.tsx`, thêm entry point từ menu Hồ sơ hoặc thẻ nổi bật trong Tổng quan (theo đề xuất Ví & COD ở báo cáo trước).

---

## 5. Việc dùng chung cho toàn bộ 10 trang (làm 1 lần, lợi 10 màn)

1. **Nâng cấp `TabBar` của driver lên pattern `FloatingNavBar`** (nổi, bo lớn, đổ bóng nhẹ, icon vector, active-pill) — việc có tác động cao nhất/màn hình nào cũng thấy, nên làm **đầu tiên**.
2. **Bổ sung icon còn thiếu vào `CoreIcons.tsx`**: camera/POD, shield/KYC, star/rating, trophy/tier, phone-call, bank/wallet, id-card, license, vehicle-doc, insurance-doc, bell/notification — tất cả set line-art 1.75–2px stroke đồng bộ style đã có (`IconLocationPin`, `IconSpeedTruck`).
3. **Xóa mock data inline** ở Earnings/History/Performance — đi qua repository/query (đã ghi trong báo cáo trước, nhắc lại vì ảnh hưởng cùng nhóm màn).
4. **Chuẩn hóa header ink** thành 1 component full-bleed đồng bộ status bar, dùng cho Tổng quan/Chi tiết đơn/Hồ sơ (3 màn có `headerTone="ink"`), loại bỏ khối tối phụ (`missionStatusSlab`) ở màn chi tiết đơn.
5. **Giảm mật độ eyebrow chữ-hoa**: chỉ giữ 1 eyebrow/màn (trong header), đổi các "SECTION LABEL" giữa thân bài sang icon+tiêu đề thường.

---

## 6. Thứ tự triển khai đề xuất

| Bước | Việc | Vì sao trước |
|---|---|---|
| 1 | Bổ sung icon còn thiếu vào `CoreIcons.tsx` | Mọi việc sau đều cần icon này |
| 2 | Nâng `TabBar` driver → floating + vector icon | Tác động cao nhất, thấy ngay ở mọi màn |
| 3 | Thay emoji còn lại (Earnings/History/Performance/KYC/Profile/Chat) | Việc nhỏ, độc lập, làm nhanh sau khi có icon |
| 4 | Polish Tổng quan (KPI dải + duty-toggle nổi bật) | Màn dùng nhiều nhất mỗi ca |
| 5 | Polish Chi tiết đơn (gộp header, bỏ đánh số, proof camera-first) | Màn phức tạp nhất, cần thời gian |
| 6 | Gộp 3 card pastel Hồ sơ → 1 list card | Việc gọn, độc lập |
| 7 | Build Ví & rút tiền theo pattern mockup | Tính năng mới, làm sau khi hệ icon/token đã chuẩn |

---

## Phụ lục — Nguồn tham chiếu

- Mockup app-native: `apps/mobile/Leopard system mobile app-handoff/leopard-system-mobile-app/project/Leopard Mobile.dc.html` (+ `support.js` là runtime engine, không chứa style).
- Icon vector hiện có: `apps/mobile/src/ui/icons/CoreIcons.tsx`.
- Floating nav mẫu (đã dùng cho Customer): `apps/mobile/src/ui/FloatingNavBar.tsx`.
- Tab bar driver hiện tại (cần nâng cấp): `apps/mobile/src/navigation/TabBar.tsx`, `apps/mobile/app/driver/_layout.tsx`.
- Token màu đã chốt: `apps/mobile/src/theme/tokens.ts` (`leopardPalette`), `packages/ui/src/tokens.css`.
- Báo cáo IA/tính năng liên quan: `docs/superpowers/research/2026-09-04-driver-ux-market-research.md`.
