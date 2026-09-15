# Đề xuất điều chỉnh UI/UX Driver theo từng màn hình

**Trạng thái:** Đề xuất thiết kế để review trước implementation  
**Phạm vi:** `apps/driver`, `@leopard/mobile-core` và các contract Driver liên quan  
**Nguồn tham khảo nội bộ:** `leopard-driver-app`  
**Ngày đánh giá:** 2026-09-14

## 1. Mục tiêu

Tài liệu này chuyển các ý tưởng UI/UX có giá trị trong prototype
[`leopard-driver-app`](../../leopard-driver-app) thành đề xuất có thể triển khai cho
[`apps/driver`](../../apps/driver), đồng thời giữ đúng lifecycle, quyền truy cập và
API của LEOPARD pilot.

Mục tiêu trải nghiệm:

1. Trong ba giây, tài xế biết mình đang online, offline, bận hay gặp lỗi kết nối.
2. Khi có chuyến, màn hình luôn nêu đúng điểm cần đến và một hành động cần làm tiếp.
3. Thông tin hỗ trợ quyết định nhận đơn phải đọc được ngoài trời, bằng một tay.
4. Không để map, card trang trí, dashboard hoặc navigation che nhiệm vụ hiện tại.
5. Luồng lỗi, hủy, báo sự cố, hoàn hàng và proof phải hoàn chỉnh như luồng giao thành công.

Tài liệu này bổ sung cho:

- [Driver mobile system design](08-driver-mobile-system-design.md)
- [Driver Home redesign implementation spec](13-driver-home-redesign-implementation-spec.md)
- [Responsive rules](05-responsive-rules.md)
- [Loading, empty và error states](06-empty-loading-error-states.md)

Nếu nội dung mâu thuẫn, thứ tự ưu tiên vẫn theo `AGENTS.md`: SRS và Product/Requirements,
Architecture/Data/API, UI, rồi existing code behavior.

## 2. Đánh giá prototype tham khảo

Prototype là React/Vite + Tailwind 4, dùng canvas navy rất đậm, surface slate, accent
amber, chữ Plus Jakarta Sans và số liệu monospace. Cấu trúc chính nằm tại
[`App.tsx`](../../leopard-driver-app/src/App.tsx), gồm Cockpit, danh sách đơn, active
flow, thu nhập, lịch sử, thông báo, hồ sơ, đăng ký, chat và incident modal.

### 2.1 Pattern nên kế thừa

| Pattern | Giá trị | Cách áp dụng vào production |
| --- | --- | --- |
| Online/offline luôn nhìn thấy | Giảm nhầm trạng thái nhận đơn | Availability card ở Home; khi `BUSY` chuyển thành read-only |
| Home đổi sang operational cockpit khi có active trip | Tập trung vào chuyến đang chạy | Active trip thay danh sách đơn làm visual anchor |
| Offer modal có thời hạn | Tài xế hiểu đơn không chờ vô hạn | Giữ countdown chỉ khi backend/dispatch contract cấp expiry |
| Active flow chia theo bước | Giảm tải nhận thức | Một detail screen render theo server capability/next task |
| CTA lớn, đặt thấp | Dễ thao tác một tay | Sticky action cao 52px, chừa safe area |
| Quick reply trong chat | Giảm nhập liệu khi đang dừng xe | Chỉ gửi khi tài xế chủ động chọn; copy theo current leg |
| Completion summary | Cho tài xế biết chuyến thực sự kết thúc | Hiện payout, proof, thời gian và lựa chọn online/offline |
| Incident có hotline + lý do | Tạo đường thoát rõ trong tình huống khẩn | Full-height sheet; lý do phụ thuộc trạng thái chuyến |

### 2.2 Pattern không sao chép nguyên

| Vấn đề trong prototype | Lý do không phù hợp |
| --- | --- |
| Header, bottom nav và sidebar cùng chứa navigation | Trùng destination, tăng tải nhận thức và tốn diện tích |
| Dark navy phủ toàn bộ mọi trang | Khó đọc lâu ngoài trời; warning/success giảm độ nổi bật |
| Chữ quyết định 10–11px và nhiều uppercase | Không phù hợp thao tác thực địa và Dynamic Type |
| Pulse/bounce/spin trên nhiều thành phần | Gây nhiễu, tốn pin và không tôn trọng reduced motion |
| Amber, blue, green, rose cùng đóng vai accent | Không có hierarchy màu ổn định |
| Nhiều card lồng card, border và gradient | Mật độ thị giác cao trên viewport 360–390px |
| Demo ribbon, “Nổ cuốc mẫu”, “Demo OTP” | Chỉ dành cho evaluator, tuyệt đối không xuất hiện production |
| State như `NAVIGATING_TO_PICKUP`, `ARRIVED_AT_DESTINATION`, `COD_COLLECTED`, `COMPLETED` | Không trùng canonical `OrderStatus` hiện tại |
| COD, customer OTP, tier bonus và heatmap | Chưa được API/product scope hiện tại bảo đảm |
| Ảnh, watermark, chữ ký và OCR mô phỏng | Có thể tạo cảm giác bằng chứng đã persist dù backend chưa lưu |
| Hotline, tài khoản ngân hàng, rating và số liệu hardcode | Là dữ liệu nghiệp vụ, phải đến từ API hoặc được ghi rõ mô phỏng |

Prototype là nguồn tham khảo hierarchy và interaction, không phải source of truth cho
nghiệp vụ hoặc component implementation.

## 3. Hướng thiết kế chung

### 3.1 Màu sắc

Giữ navy đậm làm màu thương hiệu, nhưng không dùng làm canvas cho toàn bộ màn hình
nghiệp vụ.

| Semantic token | Màu mục tiêu | Cách dùng |
| --- | --- | --- |
| `driver.canvas` | `#F4F7FB` | Nền các trang vận hành và tài khoản |
| `driver.surface` | `#FFFFFF` | Card, sheet, list row |
| `driver.navy` | `#0B1E42` | Header, brand anchor, text mạnh, selected state |
| `driver.orange` | `#F97316` | Primary CTA và focus |
| `driver.success` | `#16A34A` | Online hoặc thao tác đã được server xác nhận |
| `driver.warning` | `#D97706` | Proof, deadline và điều kiện cần chú ý |
| `driver.danger` | `#DC2626` | Blocker, incident, destructive action |
| `driver.text` | `#12233F` | Nội dung chính |
| `driver.muted` | `#64748B` | Metadata |
| `driver.border` | `#E2E8F0` | Hairline divider |

Navy full-screen chỉ phù hợp splash, login và một số đoạn brand hero ngắn. Map có thể
dùng dark treatment khi cần tương phản tuyến đường, nhưng phần nhiệm vụ đặt trên surface
sáng.

### 3.2 Typography và mật độ

- Page title: 20–22px, weight 800, tối đa một dòng.
- Section title: 16–18px, weight 700, sentence case.
- Body và địa chỉ: 14–16px, line-height tối thiểu 20px.
- Metadata: 12–13px; không dùng 10px cho dữ liệu quyết định.
- Tiền, ETA, quãng đường, biển số và mã đơn dùng tabular numerals.
- Content padding ngang 16–20px; section gap 20–24px.
- Card radius 18–20px; inner controls 10–14px; tránh bo tròn giống nhau ở mọi cấp.

### 3.3 Navigation

Bottom navigation là điều hướng chính, gồm bốn mục:

1. `Trang chủ` — `/orders`, availability, active trip và đơn phù hợp.
2. `Đơn` — `/history`, lịch sử và trạng thái chuyến.
3. `Thu nhập` — `/earnings`, tổng quan thu nhập; từ đây đi vào `/wallet`.
4. `Tôi` — `/profile`, hồ sơ, KYC, hiệu suất và cài đặt.

Drawer chỉ giữ destination ít dùng: hỗ trợ, hợp đồng, KYC, cài đặt và đăng xuất. Không
lặp lại cả bốn tab chính trong drawer. Detail, chat, proof, incident và onboarding không
hiện bottom nav; luôn có back navigation rõ.

### 3.4 Quy tắc màn hình vận hành

- Mỗi trạng thái chỉ có một primary CTA.
- CTA đến từ capability/next task do backend xác nhận; UI không tự suy ra nghiệp vụ chỉ
  từ `status` khi contract capability đã có.
- Call, chat, chỉ đường và báo sự cố là secondary actions.
- Map không là cách duy nhất hiểu tuyến đường; luôn có route text tương đương.
- Server success mới được phép hiển thị success state.
- Lifecycle mutation không queue im lặng khi offline.
- Cached active trip không biến mất khi refetch lỗi.

## 4. Đề xuất theo từng màn hình

### 4.1 Splash — `/`

**Giữ:** navy full-screen, logo, brand motion ngắn.  
**Điều chỉnh:** không bắt tài xế chờ 3,5 giây nếu session đã hydrate; animation kết thúc
sớm khi điều hướng sẵn sàng. CTA “Bắt đầu” chỉ dùng nếu splash mang tính onboarding,
không dùng ở mỗi lần mở app.

**Bố cục:** logo giữa, một dòng định vị sản phẩm, progress nhỏ ở dưới safe area.  
**States:** hydrating, refresh-session, expired-session, routing error.

### 4.2 Login — `/(public)/login`

Tiếp tục hướng đã redesign: ảnh `driver-hero-bg.jpg` là brand atmosphere, navy đậm làm
anchor, form nằm trọn một viewport. Giữ một primary action gửi OTP, Google login là
secondary, đăng ký tài xế là text action.

**Cần kiểm tra:** keyboard không che CTA, số điện thoại lỗi hiển thị inline, session
expired có banner gọn, viewport `360×640` không phải scroll.

### 4.3 Xác thực OTP — `/(public)/verify-otp`

Không dùng ảnh hero. Dùng surface sáng, icon shield nhỏ, tiêu đề và số điện thoại đã
mask. Sáu ô OTP là anchor; tự submit khi đủ số nhưng vẫn giữ nút xác nhận accessible.

**States:** nhập thiếu, verifying, sai mã, hết hạn, resend countdown, resend error,
network error. Chuyển từ login bằng `slide_from_right` 240–280ms; back giữ số điện thoại.

### 4.4 Đăng ký tài xế — `/(public)/driver-register`

Kế thừa ý tưởng step flow của `DriverRegisterView`, nhưng tách thành bốn bước ngắn:

1. Thông tin cá nhân.
2. Phương tiện.
3. Chụp giấy tờ bắt buộc bằng camera sau.
4. Xem và chấp thuận hợp đồng.

Progress dùng “Bước 2/4” kèm tên bước, không dùng chỉ các chấm khó hiểu. Sticky footer có
Back và một primary CTA. Autosave draft cục bộ; rời màn hình phải cảnh báo nếu có dữ liệu
chưa lưu. Không ghi “AI OCR” nếu provider OCR chưa tồn tại.

Bước 3 dùng một guide card ngắn ở đầu màn hình (“đủ bốn góc, không lóa, rõ chữ”), sau đó
là checklist ba document card. Mỗi card có loại giấy tờ, yêu cầu ảnh, trạng thái bắt buộc/
đã chụp, preview và một primary action `Chụp ảnh` hoặc `Chụp lại`; không dùng `Tải ảnh`
làm hành động chính trong onboarding mobile.

**States:** initial, draft restored, uploading từng giấy tờ, upload retry, validation,
submit pending, submitted, duplicate application.

### 4.5 KYC pending — `/(public)/kyc-pending`

Đưa trạng thái xét duyệt lên đầu, sau đó là timeline ba bước: đã nộp, đang xét, kết quả.
Thông tin xe chỉ hiển thị dữ liệu server. Primary action là “Kiểm tra trạng thái”; hotline
là secondary. Nếu bị từ chối, đổi primary action thành “Cập nhật hồ sơ” và hiển thị lý do
cụ thể.

### 4.6 Hợp đồng — `/contract`

Header gọn, metadata version/ngày hiệu lực, nội dung PDF hoặc bản tóm tắt có thể đọc.
Không đặt canvas ký trực tiếp nếu backend hiện chỉ nhận typed signature. Checkbox chỉ bật
sau khi contract đã tải thành công. Có hành động tải/xem PDF và trạng thái lỗi riêng.

### 4.7 Home/Dispatch — `/orders`

Áp dụng đầy đủ [Driver Home redesign](13-driver-home-redesign-implementation-spec.md):

- Header nhẹ với tên, xe và notification.
- Availability hoặc active trip nằm trong first viewport.
- Danh sách đơn là primary surface; map là secondary action.
- Order card ưu tiên pickup distance, route, thực nhận, loại xe và cargo.
- Có tối đa ba filter có giá trị quyết định.

Không đưa dashboard ba cột “thu nhập/chuyến/km” lên trên danh sách như prototype; trên
màn nhỏ, nó đẩy công việc chính xuống dưới fold. Có thể giữ một dòng “Hôm nay” compact
khi offline hoặc chưa có đơn.

**States:** loading skeleton, available, offline, busy, empty, cached+offline, initial
error, location denied, availability pending/error, active trip, incoming offer.

### 4.8 Incoming offer — modal/sheet trên Home

Kế thừa tính khẩn cấp của `DispatchOfferModal`, nhưng chỉ hiển thị dữ liệu backend cho
phép trước assignment:

- Thời gian còn lại nếu response có `expiresAt`.
- Pickup area và khoảng cách đến điểm lấy.
- Drop-off area, quãng đường, ETA dự kiến.
- Vehicle, cargo summary và thực nhận dự kiến.

Primary CTA: `Xem và nhận đơn`. Secondary: `Bỏ qua`. Không lộ tên, số điện thoại, địa chỉ
đầy đủ hoặc media riêng tư. Không pulse toàn modal; countdown dùng text + progress giảm
chuyển động.

### 4.9 Chi tiết đơn trước khi nhận — `/orders/[id]`, `REQUESTED`

Đây là màn quyết định, không phải active cockpit. Thứ tự:

1. Giá thực nhận dự kiến.
2. Pickup distance và pickup window.
3. Route public summary.
4. Vehicle/cargo và yêu cầu bốc xếp đã xác nhận.
5. Điều kiện chuyến.
6. Sticky CTA `Nhận đơn`.

Accept pending khóa double-submit. Accept race chuyển sang conflict state với action
`Xem đơn còn trống`. Driver busy chuyển sang `Mở chuyến đang thực hiện`.

### 4.10 Chuyến đã nhận — `ACCEPTED`

Visual anchor là “Đến điểm lấy hàng”, địa chỉ pickup và ETA dự kiến. Secondary actions:
chỉ đường, gọi người gửi, chat, báo sự cố. Cargo và ghi chú lấy hàng nằm ngay sau route,
không bị e-POD đẩy xuống.

Primary CTA theo contract hiện tại: `Bắt đầu đi lấy hàng`. Nếu sản phẩm muốn tách
`đã đến điểm lấy`, cần thêm capability/API trước; không đưa status prototype vào UI đơn
phương.

### 4.11 Đang lấy hàng — `PICKING_UP`

Header/current task: “Xác nhận hàng trước khi rời điểm lấy”. Hiển thị:

- Người gửi và ghi chú vào cổng/tòa nhà.
- Loại hàng, số lượng, trọng lượng, kích thước nếu có.
- Cảnh báo dễ vỡ hoặc bốc xếp.
- Ảnh hàng gốc nếu được cấp quyền.

Primary CTA: `Đã nhận hàng — bắt đầu giao`, dùng slide hoặc confirm sheet nếu cần chống
chạm nhầm. Không hiển thị e-POD giao hàng ở bước này.

### 4.12 Đang giao — `IN_TRANSIT`

Màn hình chia thành ba vùng, theo thứ tự:

1. Current leg: điểm tiếp theo, ETA dự kiến, tracking health.
2. Actions: chỉ đường, gọi đúng contact, chat, báo sự cố.
3. Route/cargo detail có thể thu gọn.

Với đơn nhiều điểm, phải hiển thị danh sách stop theo `sequence`, trạng thái từng stop và
chỉ dẫn tới stop chưa hoàn tất tiếp theo. Nếu API chưa có stop-level lifecycle, ghi rõ
blocker; không giả lập tiến độ client-side.

### 4.13 Xác thực giao hàng — e-POD sheet

Không render một panel e-POD dài trong mọi trạng thái. Chỉ mở full-height sheet khi
`IN_TRANSIT` và task hiện tại yêu cầu proof.

Luồng đề xuất:

1. Chụp/chọn ảnh thực bằng native picker.
2. Xem preview, dung lượng và loại file.
3. Upload với progress và retry giữ file local.
4. Refetch snapshot sau khi server persist.
5. Primary CTA `Xác nhận đã giao` chỉ mở khi backend trả capability tương ứng.

Nếu chữ ký người nhận là yêu cầu chính thức, phải có media/schema/API và consent copy
trước khi thiết kế canvas. Không dùng tên người nhận, chữ ký, GPS watermark hoặc success
state hardcode như prototype.

### 4.14 Báo sự cố — incident sheet

Giữ hotline và danh sách lý do dễ chọn từ prototype, nhưng lý do phụ thuộc current status:

- Trước khi lấy hàng: hỏng xe, tai nạn, không gặp người gửi, hàng sai quy cách.
- Sau khi lấy hàng: không gặp người nhận, sai địa chỉ, từ chối nhận, tai nạn.

Cho phép note và evidence photo nếu API hỗ trợ. Trước submit phải giải thích hậu quả:
“Đơn sẽ kết thúc” hoặc “Bạn cần hoàn hàng về điểm gửi”. Success screen phải dùng status
server trả về, không tự giải phóng tài xế.

### 4.15 Hoàn hàng — `RETURNING`

Đây là màn bắt buộc phải bổ sung trước khi coi lifecycle hoàn chỉnh:

- Active trip vẫn ghim trên Home và tài xế vẫn `BUSY`.
- Navigation target là pickup/origin hoặc return stop do backend cấp.
- Tracking tiếp tục hoạt động.
- Contact chuyển sang người gửi.
- Banner giải thích lý do hoàn hàng.
- Primary CTA: `Xác nhận đã hoàn hàng`.
- Có ảnh xác nhận hoàn hàng nếu requirement giữ điều kiện này.

Sau server success, chuyển `RETURNED`, dừng tracking và giải phóng availability.

### 4.16 Hoàn tất chuyến — `DELIVERED` hoặc `RETURNED`

Kế thừa completion summary của prototype nhưng bỏ animation bounce/confetti. Nội dung:

- Icon success và canonical status.
- Mã đơn, thời điểm kết thúc.
- Thực nhận đã xác nhận, không dùng số ước tính như số đã quyết toán.
- Quãng đường/thời gian nếu backend cung cấp.
- Trạng thái proof read-only.
- Với `RETURNED`, dùng copy hoàn hàng thay vì “giao thành công”.

Primary CTA: `Về trang chủ`. Secondary: `Xem chi tiết chuyến`. Nếu có
`autoOfflineOnComplete`, hiển thị availability sau hoàn tất.

### 4.17 Lịch sử — `/history`

Kế thừa filter period/status từ `JobHistoryView`, nhưng dùng canonical terminal status:
`DELIVERED`, `CANCELLED`, `INCIDENT_CANCELLED`, `RETURNED`. `RETURNING` phải nằm trong
active trip, không nằm lịch sử.

Mỗi row gồm status, route, thời gian và thực nhận. Search theo mã đơn là secondary.
Detail lịch sử read-only; không hiển thị lifecycle CTA hoặc incident action.

**States:** loading skeleton, empty theo filter, error retry, pagination/loading more.

### 4.18 Thu nhập — `/earnings`

Kế thừa wallet balance và period selector của prototype, nhưng giảm card trang trí:

- Tổng thực nhận là anchor.
- Hôm nay/tuần/tháng là segmented control.
- Chuyến, thời gian online và quãng đường là ba chỉ số compact.
- Breakdown chỉ hiển thị các khoản backend thật sự trả.
- CTA `Xem ví và rút tiền` dẫn tới `/wallet`.

Không hiển thị hạng, top %, bonus, tip hoặc chiết khấu nếu chưa có contract tương ứng.

### 4.19 Ví và rút tiền — `/wallet`

Tách khỏi Earnings để giảm rủi ro thao tác tài chính. Hiển thị số dư khả dụng, số đang
xử lý, tài khoản nhận mặc định và lịch sử rút gần nhất. CTA `Rút tiền` mở form theo từng
bước: số tiền → tài khoản → review → submit.

Success phải là response server; không tự trừ balance trước khi mutation thành công.
Error giữ nguyên dữ liệu đã nhập và `clientRequestId` để retry an toàn.

### 4.20 Tài khoản ngân hàng — `/wallet/bank-accounts`

Danh sách account dùng row đơn giản, status verified rõ bằng text. Che số tài khoản trừ
bốn số cuối. Add/edit là màn riêng hoặc sheet, có validation tên chủ tài khoản. Xóa hoặc
đổi mặc định cần confirmation. Không cho rút tiền tới account pending/rejected.

### 4.21 Hiệu suất — `/performance`

Chỉ hiển thị metric được backend định nghĩa: tỷ lệ nhận, hủy, đúng giờ hoặc rating nếu
đã có nguồn dữ liệu. Mỗi metric có khoảng thời gian và giải thích cách tính. Không dùng
“Hạng Vàng”, “Top 5%” hoặc lời hứa thưởng lấy từ prototype nếu ngoài scope.

### 4.22 Chat — `/chat/[id]`

Kế thừa order context và quick replies của prototype. Header phải hiển thị đúng contact
theo current leg, không mặc định luôn là customer. Quick reply thay đổi theo pickup,
delivery hoặc return.

Composer chừa keyboard/safe area, send button có pending/error. Ảnh đính kèm chỉ xuất
hiện khi media API hỗ trợ. Chat đã kết thúc chuyển read-only và ghi rõ lý do.

### 4.23 Thông báo

Prototype có Notifications tab nhưng production chưa có route Driver tương ứng. Trước
khi thêm tab, cần xác nhận notification API và deep-link contract. Giai đoạn đầu dùng
icon trong header mở notification sheet/list; không chiếm một trong bốn tab chính.

Mỗi notification có type, thời gian, trạng thái đọc và deep link có kiểm tra quyền. Empty
state gọn; không tạo promotional notification/incentive ngoài scope.

### 4.24 Hồ sơ — `/profile`

Giữ identity summary, vehicle và KYC status; giảm hero tối, badge và số liệu hardcode.
Không cần ba tab lồng trong Profile. Bố cục đề xuất:

1. Avatar, tên, số điện thoại, xe đang dùng và action chỉnh sửa.
2. KYC/giấy tờ với status và expiry.
3. Ví, hiệu suất, hợp đồng, cài đặt dưới dạng menu rows.
4. Support và đăng xuất ở cuối.

Các số liệu chuyến/rating chỉ hiển thị nếu đến từ `DriverProfileView` thật.

### 4.25 Chỉnh sửa hồ sơ — `/profile-edit`

Form chia nhóm cá nhân, liên hệ khẩn cấp và avatar. Giá trị không cho sửa phải có lý do,
không chỉ disabled opacity. Save sticky ở cuối, dirty-state guard khi back, inline
validation và success toast sau refetch.

### 4.26 Hồ sơ KYC — `/kyc`

Kế thừa danh sách giấy tờ có thumbnail/status từ prototype nhưng dùng dữ liệu server.
Mỗi document row hiển thị loại, ngày hết hạn, trạng thái và action đúng capability:
upload, xem, chụp lại hoặc chờ duyệt. Camera guide cần nêu đủ bốn góc, không lóa, rõ chữ;
không tuyên bố OCR khi chưa có provider.

### 4.27 Cài đặt — `/settings`

Nhóm theo: thông báo/âm thanh, vị trí/tracking, dẫn đường, quyền riêng tư và ứng dụng.
Không lặp availability ở đây. Mỗi toggle có title, description, current value và pending
state. Nút mở OS settings chỉ dùng khi native capability tồn tại.

### 4.28 Not found và lỗi khởi động

404 có action `Về trang chủ`. Root error có logo nhỏ, copy trực tiếp, `Thử khởi động lại`
và mã yêu cầu nếu có. Không để người dùng ở màn trắng hoặc chỉ một dòng text.

## 5. Lifecycle UI mục tiêu

| Server status | Màn hình/chế độ | Điểm đến chính | Primary CTA |
| --- | --- | --- | --- |
| `REQUESTED` | Offer detail | Chưa điều hướng | `Nhận đơn` |
| `ACCEPTED` | Pickup mission | Pickup/origin | `Bắt đầu đi lấy hàng` |
| `PICKING_UP` | Pickup verification | Pickup/origin | `Đã nhận hàng — bắt đầu giao` |
| `IN_TRANSIT` | Delivery mission | Next stop/drop-off | `Thêm ảnh xác nhận` hoặc `Xác nhận đã giao` |
| `RETURNING` | Return mission | Pickup/return stop | `Xác nhận đã hoàn hàng` |
| `DELIVERED` | Completion summary | Không điều hướng | `Về trang chủ` |
| `RETURNED` | Return completion | Không điều hướng | `Về trang chủ` |
| `CANCELLED` | Terminal notice | Không điều hướng | `Về trang chủ` |
| `INCIDENT_CANCELLED` | Incident completion | Không điều hướng | `Về trang chủ` |

Các status terminal không render call/navigation/incident/lifecycle actions. `RETURNING`
vẫn là active mission, giữ tracking và `BUSY`.

## 6. Component direction

| Component | Trách nhiệm |
| --- | --- |
| `DriverAppHeader` | Page context, notification, menu ít dùng |
| `DriverBottomNavigation` | Bốn route chính và safe-area |
| `DriverAvailabilityCard` | Availability server-authoritative |
| `DriverActiveMissionCard` | Chuyến hiện tại, next stop, ETA và one CTA |
| `DriverOrderOfferCard` | Public decision data, không lộ private contact |
| `DriverMissionHeader` | Status, current task và tracking health |
| `DriverNextStopCard` | Điểm tiếp theo, contact, note, navigation |
| `DriverProofSheet` | Select/preview/upload/refetch proof |
| `DriverIncidentSheet` | Reason, evidence, consequence và submit |
| `DriverCompletionSummary` | Terminal result và availability sau chuyến |
| `DriverSystemBanner` | Network, permission, stale tracking, server error |

Không copy JSX/Tailwind từ prototype sang React Native. Chuyển pattern về semantic
tokens và primitives trong `@leopard/mobile-core`.

## 7. Motion và feedback

- Page push: 240–280ms; detail từ phải, modal/sheet từ dưới.
- Pressed feedback: scale tối đa `0.98`, 100–140ms.
- Success: icon/check fade + scale nhẹ, không confetti hoặc bounce liên tục.
- Tracking/radar chỉ animation ở indicator nhỏ.
- Countdown không animate toàn card.
- Tôn trọng reduced motion; mọi trạng thái vẫn hiểu được khi animation tắt.
- Haptic chỉ sau server success hoặc khi chọn control, không rung theo polling.

## 8. Responsive và accessibility

Viewport bắt buộc: `360×640`, `360×800`, `390×844`, `768×1024`.

- First viewport của active mission phải chứa current task và primary CTA.
- Touch target tối thiểu 44×44px; primary CTA tối thiểu 48px.
- Bottom nav và sticky CTA chừa safe-area; item cuối không bị che.
- Địa chỉ wrap tối thiểu hai dòng; accessible label giữ nội dung đầy đủ.
- Status có text, không chỉ màu hoặc icon.
- Focus order: header → banner → current task → primary CTA → secondary actions → detail.
- Dynamic Type không làm overlap badge, CTA hoặc OTP cells.
- Đo WCAG AA trên Web, Android và iOS; kiểm tra brightness cao ngoài trời.

## 9. Thứ tự triển khai

### Phase 0 — Khóa nghiệp vụ

1. Thống nhất canonical lifecycle và xử lý khác biệt với prototype.
2. Sửa `RETURNING/RETURNED`: active query, availability, tracking, navigation, proof và CTA.
3. Bổ sung `clientRequestId` cho lifecycle/incident retry.
4. Xác định capability/API cho multi-stop, COD, chữ ký và notifications.

### Phase 1 — Operational core

1. Home/Dispatch light canvas và four-tab navigation.
2. Offer detail và incoming offer.
3. Active mission theo exactly-one next task.
4. Proof sheet, incident sheet, return flow và completion summary.

### Phase 2 — Supporting workflow

1. History và read-only detail.
2. Chat theo current contact.
3. Earnings, wallet và bank accounts.
4. Cached/offline/error/permission states.

### Phase 3 — Account và onboarding

1. Profile, edit profile, KYC và settings.
2. Registration, pending approval và contract.
3. Performance và notifications khi backend contract đã rõ.

## 10. Definition of done

- [ ] Mỗi screen có loading, empty, error, success và permission-denied khi áp dụng.
- [ ] Active mission và one primary CTA xuất hiện trong first viewport.
- [ ] `RETURNING` không biến mất khỏi Home/active API và Driver vẫn `BUSY`.
- [ ] `RETURNING` dẫn về điểm gửi/return stop, tiếp tục tracking và hoàn tất được `RETURNED`.
- [ ] Multi-stop không được mô phỏng client-side; UI dùng next stop từ server.
- [ ] Proof/chữ ký/OTP chỉ hiển thị khi API và product scope hỗ trợ.
- [ ] Không có dữ liệu tài chính, rating, hotline, vehicle hoặc contact hardcode.
- [ ] Public order không lộ full address, contact, media hoặc tracking riêng tư.
- [ ] Lifecycle/incident command chặn double-submit và retry cùng `clientRequestId`.
- [ ] Refetch error không xóa cached active trip.
- [ ] Bottom nav có bốn mục, không trùng toàn bộ với drawer.
- [ ] Không horizontal overflow và không che CTA ở bốn viewport bắt buộc.
- [ ] Touch target, focus, screen reader, Dynamic Type, contrast và reduced motion đạt.
- [ ] Driver tests, typecheck và manual browser/device QA đạt.
- [ ] Không còn P0/P1 trong lifecycle Driver.
