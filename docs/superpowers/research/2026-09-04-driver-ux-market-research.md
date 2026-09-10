# LEOPARD — Nghiên cứu thị trường & Đề xuất Redesign UI/UX cho Tài xế (Driver)

> **Ngày:** 2026-09-04
> **Phạm vi:** Toàn bộ hệ thống driver (nhận đơn → thực hiện chuyến → thu nhập/hiệu suất → hồ sơ)
> **Loại tài liệu:** Báo cáo phân tích + đề xuất (chưa mockup, chưa code)
> **Bối cảnh sản phẩm:** LEOPARD là nền tảng **vận tải hàng hóa** (freight/logistics) cho thị trường VN — có `cargo`, `VehicleType`, role `FLEET_OWNER`, COD/payment. Đây **không** phải ride-hailing thuần.
> **Định hướng đã khóa (doc 14 + memory, đã đính chính màu 2026-09-04):** operational-first cockpit, không phải super-app kiểu Ahamove; 40% industrial / 35% SaaS / 25% Đông Sơn; mobile-first, data-dense, WCAG AA. **Brand color:** xanh biển `#0284C7`/`#0369A1` (accent chính) · vàng `#D97706` (điểm nhấn) · xanh lá pastel `#16A34A` (tín hiệu tích cực) · nền trắng/slate nhạt `#F8FAFC` — đúng `leopardPalette`/`pastelTheme` đang chạy thật trong `apps/mobile/src/theme/tokens.ts` và `packages/ui/src/tokens.css`, và khớp brief khách hàng gốc ("Trắng, vàng, xanh biển, xanh lá pastel"). Doc 14 trước đó ghi teal `#0F766E` — giá trị này **chưa từng được triển khai** trong code và đã được đính chính trực tiếp trong doc 14 (xem ERRATA đầu file).

---

## 0. Tóm tắt điều hành (TL;DR)

App tài xế LEOPARD hiện đã có **nền tảng nghiệp vụ đúng và tương đối đầy đủ** cho một sản phẩm freight: availability, danh sách đơn công khai (privacy-gated), active mission cockpit, proof-of-delivery gate, tracking, earnings/performance/history. Kiến trúc màn hình (view-model rõ ràng, trạng thái loading/empty/error/conflict) đã tốt hơn phần lớn app freight VN.

**Vấn đề không nằm ở "thiếu màn", mà ở 6 khoảng trống về trải nghiệm vận hành:**

1. **Không có "trạm điều khiển" (Home cockpit) thật.** Tab "Tổng quan" thực chất chỉ là danh sách đơn. Tài xế không có một màn tổng quan trong-ngày (đang online/offline, thu nhập hôm nay, nhiệm vụ kế tiếp, cảnh báo, tiến độ thưởng).
2. **Công tắc nhận đơn (ONLINE/OFFLINE) bị "chôn"** dưới dạng một nút trong header của list — trong khi toàn ngành coi đây là *nút anh hùng*.
3. **Thiếu ví & luồng COD của tài xế** — yếu tố sống còn của freight VN (Ahamove/Lalamove đều xoay quanh ví trả trước + đối soát COD).
4. **Bản đồ dẫn đường chưa phải trung tâm.** Active mission dùng bản đồ *lược đồ mô phỏng*, chưa có handoff sang Google Maps/nav thật.
5. **POD còn sơ khai** (1 ảnh) so với chuẩn freight (ảnh + chữ ký + người nhận + COD).
6. **Nợ kỹ thuật UI:** earnings/performance/history đang là **mock data inline**, không qua repository/query; **hai hệ token song song** (`leopardPalette` vs `colors`); **emoji làm icon** (🔔💳💰🕒👤★🏆📸) — phá vỡ tính hệ thống.

**Đề xuất:** giữ nguyên triết lý cockpit, tái cấu trúc điều hướng quanh **5 trụ** (Trạm điều khiển · Nhiệm vụ · Ví & COD · Hiệu suất · Hồ sơ), nâng công tắc nhận đơn thành duty-control bền vững, đưa bản đồ + dẫn đường lên trung tâm active mission, chuẩn hóa POD, và trả nợ hệ thống thiết kế. Chi tiết ở §5–§6.

---

## 1. Hiện trạng hệ thống Driver LEOPARD (grounded từ code)

### 1.1 Bản đồ màn hình & điều hướng

Tab bar tài xế (`apps/mobile/app/driver/_layout.tsx`) có **4 tab**:

| Tab | Route | Màn thực tế | Nhận xét |
|-----|-------|-------------|----------|
| **Tổng quan** | `/driver/orders` | `DriverOrdersScreen` (list nhận đơn) | ❗ Là *danh sách đơn*, không phải dashboard tổng quan |
| **Doanh thu** | `/driver/earnings` | `DriverEarningsScreen` | Mock data inline |
| **Lịch sử** | `/driver/history` | `DriverHistoryScreen` | Mock data inline |
| **Hồ sơ** | `/driver/profile` | `DriverProfileRuntime` | — |

**Màn "mồ côi"** (có tồn tại nhưng không nằm trong tab bar, chỉ tới được qua deep-link/profile): `performance`, `kyc`, `settings`, `chat/[id]`, `orders/[id]`. → Hiệu suất và KYC là thông tin tài xế quan tâm hằng ngày nhưng bị "giấu".

### 1.2 Đánh giá từng cụm

**A. Nhận đơn — `DriverOrdersScreen`**
- ✅ Có `AvailabilityControl` (trạng thái nhận đơn) + `StatusBadge`.
- ✅ Tab con "Chờ nhận / Đang thực hiện" có badge đếm.
- ✅ `ActiveTripRail` nổi bật chuyến đang chạy với chỉ báo live tracking.
- ✅ `PublicOrderCard` chỉ hiển thị *public summary* (route ẩn danh, vehicle, cargo, ETA) — **privacy-gating tốt**, đúng chuẩn bảo mật trước khi phân công.
- ❗ Công tắc availability là **một `Button` trong header**, không phải switch bền vững/nổi bật.
- ❗ Mô hình nhận đơn là **duyệt danh sách thụ động** — không có cơ chế *offer đẩy có đếm ngược* cho đơn cần phản hồi nhanh, cũng không có *swipe-to-accept*.
- ❗ Không có gợi ý nhu cầu (khu vực nào đang nhiều đơn / heatmap).

**B. Thực hiện chuyến — `DriverOrderDetailScreen`**
- ✅ Cockpit rất chỉn chu: `missionStatusSlab`, `RouteSpine` + `EtaIndicator`, `LedgerSection` đánh số (01–04), `ProofPanel`, `TrackingPanel`, `StatusTimeline`.
- ✅ **Sticky footer CTA theo trạng thái** (một nhiệm vụ chính tại một thời điểm) — đúng nguyên tắc "one primary task".
- ✅ Proof gate hiển thị độc lập với validate loại/kích thước file; xử lý tracking stale/offline/permission-denied.
- ❗ Bản đồ là `RouteMapSchematic` (**lược đồ mô phỏng**), chưa phải map thật + **không có nút "Dẫn đường" mở Google Maps/Waze**.
- ❗ Liên hệ khách (`customerContact`) hiển thị dạng text; **không có nút gọi (số ẩn danh) / tin nhắn mẫu** nổi bật ngay tại mission.
- ❗ POD chỉ **1 ảnh**; thiếu chữ ký/tên người nhận/ghi chú/thu COD.
- ❗ Không có **SOS/chia sẻ hành trình** nổi bật cho an toàn.

**C. Thu nhập — `DriverEarningsScreen`**
- ✅ Chip kỳ (Hôm nay/Tuần/Tháng), summary card, breakdown cước/tip/thưởng.
- ❗ **`mockTrips` inline**, tổng số/giờ online hardcode; không qua repository/query (trái với §6 của chính plan UI/UX).
- ❗ Không có **tiến độ mục tiêu/quest thưởng**, không có nút "rút tiền/đối soát".

**D. Hiệu suất — `DriverPerformanceScreen`**
- ✅ Rating card, tier "Hạng Vàng", 4 chỉ số vận hành (nhận đơn, đúng giờ, POD, hủy) có chuẩn hệ thống, feed đánh giá khách.
- ❗ **`mockReviews` inline**; tier **không có thanh tiến độ lên hạng kế tiếp**; sao dùng ký tự `★★★★★` thay vì icon.

**E. Lịch sử — `DriverHistoryScreen`**
- ✅ Filter Tất cả/Đã giao/Đã hủy, card route TỪ→ĐẾN, payout, badge POD.
- ❗ **`mockHistory` inline**; chưa phân trang/infinite (plan T03 yêu cầu paginate); emoji `📸`.

### 1.3 Nợ hệ thống thiết kế (design-system debt)

| Vấn đề | Bằng chứng | Ảnh hưởng |
|--------|-----------|-----------|
| **2 hệ token song song** | `DriverOrdersScreen` dùng `leopardPalette`; earnings/history/perf dùng `colors` | Không nhất quán màu/typography giữa các màn cùng role |
| **Emoji làm icon** | `TabBar` (🔔💳💰🕒👤), perf (🏆★), history (📸) | Phá brand, không đổi màu/scale, kém a11y, lệch với `CoreIcons`/`RoleIcons` |
| **Mock data trong màn production** | `mockTrips`/`mockReviews`/`mockHistory` | Vi phạm repository/query layer; không có loading/empty/error/offline thực |
| **Tab "Tổng quan" gây hiểu nhầm** | route = `/driver/orders` | Nhãn hứa "tổng quan" nhưng đưa vào list |

---

## 2. Nghiên cứu thị trường — Benchmark

> Các pattern dưới đây là **quy ước UX đã được kiểm chứng và ổn định** của từng app (không phải chi tiết phiên bản dễ lỗi thời). Chia làm 3 nhóm theo yêu cầu.

### 2.1 Nhóm 1 — Freight/Giao vận VN (sát nghiệp vụ nhất)

**Ahamove — Tài xế**
- Công tắc **online/offline** rõ ràng; **ví trả trước là trung tâm** (tài xế nạp tiền để nhận đơn/hoa hồng), **quản lý COD** nổi bật.
- Đơn broadcast: hiện điểm lấy/giao, khoảng cách, giá, **số tiền COD**; nhận nhanh. Hỗ trợ **đơn nhiều điểm**.
- Luồng: nhận → đến lấy → lấy hàng → giao → hoàn tất, **chụp ảnh chứng minh + thu COD**; **gọi khách (số ẩn danh)**.

**Lalamove — Driver**
- Online toggle + matching; card đơn: **nhiều chặng (multi-stop)**, loại xe, giá, khoảng cách.
- Mô hình **ví/credit** tương tự; POD gồm **ảnh + chữ ký + người nhận**; rating.

**Grab (GrabExpress/GrabCar/GrabFood) — Driver**
- **Nút GO ONLINE là hero** ở giữa Home; khi offline → dashboard thu nhập + incentive.
- **Job offer full-screen có đếm ngược** (~15s): khoảng cách tới điểm đón, cước ước tính, loại dịch vụ; tap/swipe để nhận.
- Active: **map-centric**, nút mở nav ngoài, **stepper trạng thái** + **swipe-to-confirm** cho chuyển trạng thái.
- **Earnings + quest/incentive có thanh tiến độ**; **heatmap nhu cầu**; **SOS/chia sẻ chuyến**.

### 2.2 Nhóm 2 — Ride-hailing lớn (chuẩn mực UX vận hành)

**Uber Driver / Gojek / Be Driver**
- **Go online** trung tâm + đồng hồ thu nhập real-time.
- **Trip request card + countdown**; **map dẫn đường** là màn chính; **Uber Pro/tier + quests**; thu nhập tuần; **Instant Pay** (rút nhanh).
- Chỉ số **acceptance/cancellation/rating** minh bạch, gắn với ưu tiên phân đơn.

> **Bài học:** availability + offer + map + earnings/incentive là "bốn trụ" của mọi driver app trưởng thành. LEOPARD đã có availability & map (schematic) nhưng thiếu độ nổi bật và cơ chế offer/incentive.

### 2.3 Nhóm 3 — Fleet/Logistics quốc tế (đúng "chất" freight của LEOPARD)

**Uber Freight (carrier)** — **Load board**: duyệt các "load" khả dụng với **giá cước, khoảng cách, khung giờ lấy/giao, khối lượng, loại thiết bị**; **đặt load**; thông tin kho/bãi, **giờ hẹn (appointment)**, detention; **upload BOL/POD số hóa**.

**Onfleet (last-mile driver)** — **Task list do điều phối giao**, tối ưu tuyến, ETA; **POD mạnh** (chữ ký + ảnh + barcode + ghi chú); trạng thái start→arrive→**complete/fail** (có lý do thất bại); tự động thông báo khách.

**Amazon Flex** — Theo **ca/block đặt trước**; **itinerary các điểm dừng**; nav; **scan kiện**; **POD ảnh "để tại cửa"**; báo cáo sự cố.

> **Bài học cho LEOPARD:** mô hình **duyệt danh sách đơn công khai** hiện tại **giống load-board của Uber Freight** — đây là lựa chọn đúng cho freight (tài xế chủ động chọn), khác với offer-đẩy của ride-hailing. Nên **giữ load-board làm chính** và **bổ sung offer-đẩy có đếm ngược cho nhánh auto-dispatch** (đơn gấp/được gán). POD nên tiến tới chuẩn Onfleet (đa bằng chứng + lý do thất bại).

### 2.4 Bảng tổng hợp năng lực (capability matrix)

| Năng lực | Ahamove | Lalamove | Grab/Uber | Uber Freight/Onfleet | **LEOPARD hiện tại** |
|----------|:--:|:--:|:--:|:--:|:--:|
| Duty control (online) nổi bật | ✅ | ✅ | ✅ (hero) | ✅ | ⚠️ (chôn trong list) |
| Home/dashboard trong ngày | ✅ | ✅ | ✅ | ✅ | ❌ |
| Load-board duyệt đơn | ✅ | ✅ | — | ✅ | ✅ |
| Offer đẩy + đếm ngược | ✅ | ✅ | ✅ | ⚠️ | ❌ |
| Map dẫn đường thật + handoff | ✅ | ✅ | ✅ | ✅ | ⚠️ (lược đồ) |
| Stepper + swipe-to-confirm | ⚠️ | ⚠️ | ✅ | ✅ | ⚠️ (CTA nút) |
| Ví + COD tài xế | ✅ | ✅ | ⚠️ | — | ❌ |
| Earnings + quest/incentive | ⚠️ | ⚠️ | ✅ | — | ⚠️ (không quest) |
| Hiệu suất + tiến độ tier | ⚠️ | ⚠️ | ✅ | ⚠️ | ⚠️ (tier tĩnh) |
| POD đa bằng chứng | ✅ | ✅ | ⚠️ | ✅ (mạnh) | ⚠️ (1 ảnh) |
| Gọi ẩn danh / tin mẫu | ✅ | ✅ | ✅ | ✅ | ⚠️ (text) |
| An toàn (SOS/share) | ⚠️ | ⚠️ | ✅ | ⚠️ | ❌ |
| Gợi ý nhu cầu/heatmap | ⚠️ | ⚠️ | ✅ | ⚠️ | ❌ |

Chú thích: ✅ có/mạnh · ⚠️ có một phần/yếu · ❌ chưa có.

---

## 3. Phân tích khoảng trống (Gap Analysis)

Ánh xạ pattern thị trường → khoảng trống LEOPARD, xếp theo mức độ tác động vận hành:

| # | Khoảng trống | Chuẩn thị trường tham chiếu | Tác động | Mức |
|---|--------------|-----------------------------|----------|-----|
| G1 | Không có Home cockpit trong ngày | Grab/Uber home dashboard | Tài xế mất "một cái nhìn" điều hành → nhiều thao tác điều hướng | **Cao** |
| G2 | Duty control bị chôn | Grab "GO" hero | Bật/tắt nhận đơn là hành vi #1 mỗi ca, cần luôn thấy & luôn chạm được | **Cao** |
| G3 | Thiếu Ví & COD tài xế | Ahamove/Lalamove ví + COD | Freight VN gắn chặt COD/đối soát → thiếu là chặn nghiệp vụ | **Cao** |
| G4 | Map chưa phải trung tâm + không handoff nav | mọi driver app | Dẫn đường là công việc lõi khi đang chạy | **Cao** |
| G5 | POD sơ khai (1 ảnh) | Onfleet POD đa bằng chứng | Rủi ro tranh chấp giao nhận, thiếu chữ ký/người nhận/COD | **Trung–Cao** |
| G6 | Nợ hệ thống thiết kế (token/icon/mock) | — (nội bộ) | Không nhất quán, khó bảo trì, chặn đường nối API thật | **Trung–Cao** |
| G7 | Không có offer đẩy + đếm ngược | Grab/Uber/Ahamove | Đơn gấp/auto-dispatch không có kênh phản hồi nhanh | **Trung** |
| G8 | Earnings/Performance thiếu incentive & tiến độ tier | Grab quests, Uber Pro | Giảm động lực & giữ chân tài xế | **Trung** |
| G9 | Liên hệ/an toàn yếu (gọi ẩn danh, SOS, share) | mọi app | Trải nghiệm & an toàn hiện trường | **Trung** |
| G10 | Không gợi ý nhu cầu/heatmap | Grab heatmap | Tài xế không biết đứng đâu để có đơn | **Thấp–Trung** |

---

## 4. Nguyên tắc thiết kế cho redesign

Kế thừa doc 14 + memory "operational-first cockpit", bổ sung 6 nguyên tắc dẫn đường cho lần redesign này:

1. **Cockpit, không phải feed.** Mỗi màn trả lời "việc kế tiếp của tôi là gì?" — ưu tiên hành động đang chờ, không phải nội dung để lướt.
2. **Duty state luôn hiện diện.** Trạng thái online/offline và chuyến đang chạy phải thấy được ở mọi nơi (persistent bar), không phải đào trong list.
3. **Một nhiệm vụ chính mỗi thời điểm.** Giữ pattern sticky primary CTA đã tốt; mở rộng sang swipe-to-confirm cho hành động bất khả hồi (đã lấy hàng, đã giao).
4. **Map-first khi đang chạy, data-dense khi đang quyết định.** Lúc active: bản đồ + dẫn đường là trung tâm. Lúc chọn đơn: bảng số liệu dày, dễ scan (giữ load-board).
5. **Tiền bạc minh bạch tuyệt đối.** Cước, COD, ví, thưởng, đối soát — freight VN sống bằng lòng tin dòng tiền.
6. **Một hệ thống hình ảnh duy nhất.** Một bộ token, một bộ icon vector, không emoji; semantic color luôn kèm text/icon (WCAG AA).

---

## 5. Đề xuất Redesign

### 5.1 Kiến trúc thông tin & điều hướng mới (IA)

Chuyển từ 4 tab "lệch nghĩa" sang **5 trụ** rõ vai trò + **1 thanh trạng thái bền vững**:

```text
┌─────────────────────────────────────────────┐
│  DUTY BAR (persistent, mọi màn)              │
│  ● Đang nhận đơn  ·  Chuyến LP-… đang chạy →  │
├─────────────────────────────────────────────┤
│                nội dung màn                   │
├─────────────────────────────────────────────┤
│ [Trạm ĐK] [Nhiệm vụ] [Ví & COD] [Hiệu suất] [Hồ sơ] │
└─────────────────────────────────────────────┘
```

| Trụ (tab) | Gồm | Thay đổi so với hiện tại |
|-----------|-----|--------------------------|
| **Trạm điều khiển** (Home) | Duty toggle lớn · thu nhập hôm nay · nhiệm vụ kế tiếp · cảnh báo (KYC/POD treo) · tiến độ thưởng · shortcut | **Màn mới** — tách khỏi list đơn |
| **Nhiệm vụ** (Đơn) | Load-board "Chờ nhận" + "Đang thực hiện" (chính là `DriverOrdersScreen` nâng cấp) + màn active mission | Đổi nhãn đúng nghĩa; bỏ availability khỏi header (đưa lên duty bar) |
| **Ví & COD** | Số dư ví · COD đang giữ/cần nộp · lịch sử giao dịch · rút/đối soát | **Trụ mới** — lấp G3 |
| **Hiệu suất** | Rating · tier + tiến độ lên hạng · 4 chỉ số · đánh giá khách (đưa `performance` ra khỏi "mồ côi") | Nâng cấp + gắn tiến độ |
| **Hồ sơ** | Thông tin · KYC (badge trạng thái) · phương tiện · cài đặt · hỗ trợ | Gom `kyc`/`settings` về đây |

> **Lưu ý số tab:** 5 tab + duty bar là ranh giới trên cho mobile. Nếu muốn giữ 4 tab, gộp **Hiệu suất** vào **Trạm điều khiển** (dạng thẻ + link "xem chi tiết"). Khuyến nghị 5 tab vì Ví & COD quá quan trọng để ẩn.

### 5.2 Trạm điều khiển (Home cockpit) — màn mới, ưu tiên #1

Thứ tự thông tin (trên → dưới), theo "câu hỏi tài xế hỏi lúc mở app":
1. **Tôi đang bật/tắt?** → Duty toggle lớn (switch, kèm text trạng thái + màu semantic), luôn đầu màn.
2. **Có việc đang chạy không?** → Active mission banner (nếu có) → chạm vào là vào thẳng cockpit.
3. **Hôm nay tôi kiếm được bao nhiêu?** → Earnings-today card (số lớn + số chuyến + giờ online) → link sang Ví.
4. **Có gì chặn tôi không?** → Alert strip: KYC chưa duyệt / POD đang treo / ví âm.
5. **Sắp có thưởng gì?** → Quest/incentive progress (thanh tiến độ).
6. **Đơn quanh tôi?** → Preview 1–2 đơn gần nhất + nút "Xem tất cả" (sang Nhiệm vụ). (Tùy chọn) mini heatmap gợi ý khu vực.

### 5.3 Nhiệm vụ — nhận đơn (nâng cấp `DriverOrdersScreen`)

- **Giữ mô hình load-board** (đúng chất freight, khác ride-hailing) — điểm mạnh sẵn có, giữ privacy-gating.
- **Bỏ `AvailabilityControl` khỏi header** → chuyển lên **duty bar** bền vững.
- **Làm giàu `PublicOrderCard`** theo chuẩn Uber Freight load-board: khoảng cách-tới-điểm-lấy, khung giờ lấy/giao, khối lượng/loại hàng, **cước rõ ràng**, (nếu có) **COD**. Sắp xếp/lọc: gần nhất · cước cao · phù hợp loại xe.
- **Bổ sung nhánh offer-đẩy** cho đơn auto-dispatch/gấp: card offer có **đếm ngược + Nhận/Bỏ qua** (không thay thế load-board, chỉ thêm kênh).

### 5.4 Nhiệm vụ — active mission (nâng cấp `DriverOrderDetailScreen`)

- **Đảo trọng tâm sang map-first khi đang chạy:** bản đồ thật chiếm phần trên, nút **"Dẫn đường"** mở Google Maps/Waze (handoff), giữ `RouteSpine`/`EtaIndicator` làm lớp thông tin.
- **Stepper trạng thái + swipe-to-confirm** cho chuyển trạng thái bất khả hồi (`ACCEPTED → PICKED_UP → IN_TRANSIT → DELIVERED`) — nâng cấp từ sticky button hiện có, đúng state machine đã khóa trong `@leopard/shared`.
- **Thanh liên hệ nhanh:** gọi (số ẩn danh) · tin nhắn mẫu · (khi cần) SOS/chia sẻ hành trình.
- **Nâng POD lên chuẩn freight (Onfleet):** ảnh (nhiều) + **chữ ký** + **tên người nhận** + ghi chú + (nếu COD) **xác nhận thu COD**; và **luồng "giao thất bại" có lý do** (`fail reason`).

### 5.5 Ví & COD — trụ mới (lấp G3)

- **Số dư ví** + trạng thái (đủ/thiếu để nhận đơn nếu áp mô hình prepaid như Ahamove/Lalamove).
- **COD đang giữ / cần nộp** + lịch nộp; **lịch sử giao dịch** (cước, thưởng, phí, COD) minh bạch.
- Nút **rút tiền / đối soát**. (Không tự thực hiện giao dịch trong UI review — chỉ thiết kế luồng; tích hợp cổng thanh toán theo plan 09.)

### 5.6 Hiệu suất & Hồ sơ

- **Hiệu suất:** giữ 4 chỉ số + rating; thêm **thanh tiến độ lên hạng kế tiếp** ("còn X chuyến / giữ đúng giờ ≥ Y% để lên hạng"); thay `★`/`🏆` bằng icon vector.
- **Hồ sơ:** gom **KYC** (badge trạng thái duyệt) + **phương tiện** + **cài đặt** + **hỗ trợ**; đưa các màn "mồ côi" về đúng chỗ.

### 5.7 Trả nợ hệ thống thiết kế (xuyên suốt)

1. **Hợp nhất token:** chọn một nguồn (khuyến nghị mở rộng `colors` semantic, ánh xạ `leopardPalette` vào đó) — mọi màn driver dùng chung.
2. **Thay toàn bộ emoji bằng icon vector** trong `CoreIcons`/`RoleIcons` (tab bar, sao, huy hiệu, camera/POD).
3. **Rút mock data khỏi màn:** earnings/performance/history đi qua repository/query (`Demo*Repository`), có đủ loading/empty/error/offline như plan yêu cầu.
4. **Đổi nhãn tab** cho đúng nghĩa (Tổng quan → Trạm điều khiển; Đơn → Nhiệm vụ).

---

## 6. Lộ trình ưu tiên (đề xuất)

> Sắp theo tác động vận hành / công sức. Không phải cam kết tiến độ — để bạn chọn.

**P0 — Nền vận hành & trả nợ (bắt buộc trước khi nối API)**
- Duty bar bền vững + tách availability khỏi list (G2).
- Màn **Trạm điều khiển** tối thiểu: duty toggle + earnings-today + active banner + alert strip (G1).
- Hợp nhất token + thay emoji bằng icon vector (G6).
- Rút mock data → repository/query cho earnings/history/performance (G6).

**P1 — Lõi nghiệp vụ freight**
- **Ví & COD** (G3).
- **Map-first + handoff nav** cho active mission (G4).
- **POD đa bằng chứng + luồng giao thất bại** (G5).
- Làm giàu load-board card + sắp xếp/lọc (một phần G1/G7).

**P2 — Giữ chân & an toàn**
- Offer-đẩy + đếm ngược cho auto-dispatch (G7).
- Incentive/quest + tiến độ tier (G8).
- Liên hệ nhanh (gọi ẩn danh/tin mẫu) + SOS/share (G9).
- Gợi ý nhu cầu/heatmap (G10).

---

## 7. Rủi ro & lưu ý

- **Đừng ride-hailing-hóa freight.** LEOPARD là load-board; offer-đẩy chỉ là *kênh bổ sung* cho auto-dispatch, không thay thế mô hình duyệt-chọn. Ép countdown lên mọi đơn sẽ sai bản chất.
- **Không biến cockpit thành super-app.** Theo memory: operational-first, không nhồi khuyến mãi/marketing card vào màn vận hành.
- **COD & ví là vùng nhạy cảm tài chính** — thiết kế luồng ở tầng UI, tích hợp thanh toán/đối soát theo plan 09; không hardcode PII/secret; backend là nguồn chân lý ownership/authorization.
- **Số tab:** 5 tab là ranh giới trên; nếu chật, gộp Hiệu suất vào Trạm điều khiển.
- **Bám state machine đã khóa** (`@leopard/shared`) cho stepper — UI chỉ đọc `allowedTransitions`, không tự chế transition.
- **Nghiên cứu thị trường** trong tài liệu này dựa trên **quy ước UX ổn định của các app**, không phải chi tiết phiên bản; nếu cần số liệu/screenshot cập nhật để thuyết trình stakeholder, nên chụp trực tiếp từ app thật ở bước sau (công cụ web search phiên này đang lỗi backend).
- **Brand color đã được đính chính (2026-09-04):** đối chiếu `LoginScreen.tsx` + `theme/tokens.ts` + `packages/ui/src/tokens.css` cho thấy code thật đang chạy xanh biển/vàng/xanh lá pastel (`leopardPalette`), khớp brief khách hàng — không phải teal `#0F766E` như doc 14 ghi trước đó. Doc 14 đã được sửa trực tiếp (ERRATA + giá trị hex trong task UI-01-T01/T02); mọi công việc UI kế tiếp nên dùng `leopardPalette`/`packages/ui/src/tokens.css` làm nguồn chân lý duy nhất.

---

## Phụ lục — Tham chiếu code hiện trạng

- Điều hướng: `apps/mobile/app/driver/_layout.tsx` · `apps/mobile/src/navigation/TabBar.tsx`
- Nhận đơn: `apps/mobile/src/features/driver/orders/DriverOrdersScreen.tsx`
- Active mission: `apps/mobile/src/features/driver/orders/DriverOrderDetailScreen.tsx`
- Thu nhập: `apps/mobile/src/features/driver/earnings/DriverEarningsScreen.tsx`
- Hiệu suất: `apps/mobile/src/features/driver/performance/DriverPerformanceScreen.tsx`
- Lịch sử: `apps/mobile/src/features/driver/history/DriverHistoryScreen.tsx`
- Định hướng thiết kế: `docs/superpowers/plans/14-ui-ux-standalone(1).md`
