# Kế Hoạch Tối Ưu Giao Diện Khách Hàng (Customer Mobile App)
**Mục tiêu:** Nâng cấp trải nghiệm One-Thumb Ergonomics, giảm thiểu thao tác rườm rà, đưa toàn bộ quy trình gọi xe vào luồng trực quan, mượt mà chuẩn Apple HIG 2026.

---

## I. Phân Tích Thực Trạng & Điểm Nghẽn Hiện Tại (UX Pain Points)

1. **Thao tác 2 tay & Phân mảnh bước:**
   - Người dùng nhập điểm lấy/giao ở nửa trên màn hình -> chọn xe ở giữa -> bấm nút thì lại bật một **Modal toàn màn hình** (`BookingDetailsModal`) che khuất hoàn toàn bản đồ lộ trình.
   - Thao tác đóng/mở modal gây đứt gãy cảm xúc người dùng (không thấy xe và tuyến đường di chuyển).
2. **Kích thước các thành phần chọn xe chưa tối ưu ngón cái (Thumb Zone):**
   - Danh sách xe đang dài, các nút dịch vụ cộng thêm (bốc xếp, VAT) bị giấu sâu trong modal thay vì hiển thị trực quan ngay tại bước chọn phương tiện.
3. **Cước phí & Voucher:**
   - Chưa làm nổi bật số tiền tiết kiệm được ngay trên thanh chọn xe.

---

## II. Đề Xuất Giải Pháp Thiết Kế Mới (3-Stage Bottom Sheet)

Thay thế việc bật Modal che kín màn hình bằng **Bottom Sheet tương tác 3 mức (Snap Points)** chuẩn Apple Maps / Uber:

### 1. Mức 1: Thu gọn & Khám phá (`~22% - 25%`)
- **Hiển thị:**
  - Ô tìm kiếm nhanh với placeholder thân thiện: *"Giao hàng đến đâu hôm nay?"*
  - Hàng chip địa chỉ nhanh (Hub thường dùng): *Kho Q1, Lê Duẩn, KCN Tân Bình...* (1 chạm là chọn xong điểm đến).
  - Bản đồ phía trên thoáng đãng (chiếm 75% diện tích), hiển thị các xe lân cận đang di chuyển live.

### 2. Mức 2: Lộ trình & Ma trận xe (`~55% - 60%`)
- **Kích hoạt:** Ngay khi khách chọn điểm đến (từ gợi ý hoặc chip nhanh).
- **Hiển thị:**
  - Tuyến đường vẽ nét polyline mượt mà trên bản đồ với pin Điểm lấy (Xanh) & Điểm giao (Vàng).
  - Thẻ tóm tắt lộ trình rút gọn.
  - **Ma trận 4 dòng xe (Fleet Cards):**
    * `BIKE_3W` (Xe Ba Gác · 70k · Ngõ nhỏ)
    * `VAN_500KG` (Xe Van 500kg · 130k · Phố cấm 24/7)
    * `TRUCK_125T` (Xe Tải 1.25T · 200k · Chuyển nhà/kho)
    * `TRUCK_25T` (Xe Tải 2.5T · 320k · Tải nặng)
  - Thẻ xe hiển thị rõ: Icon phương tiện, kích thước thùng, tải trọng, ETA xe gần nhất, giá cước chuẩn.
  - Nút chuyển phương thức thanh toán nhanh (*VietQR / Tiền mặt*).

### 3. Mức 3: Tiện ích mở rộng & Xác nhận (`~88%`)
- **Kích hoạt:** Khi khách vuốt sheet lên hoặc bấm vào khu vực chi tiết hàng hóa.
- **Hiển thị:**
  - Toggle bật nhanh: *Tài xế hỗ trợ bốc xếp*, *Xuất hóa đơn VAT*.
  - Ghi chú hàng hóa & Tên người nhận hàng tại điểm giao.
  - Khung mã giảm giá / Voucher tự động gợi ý mã tốt nhất.

### 4. Nút Hành Động Chính (One-Thumb Sticky CTA)
- Luôn ghim cố định ở sát đáy màn hình (vùng ngón tay cái dễ với tới nhất).
- Màu thương hiệu **Midnight Navy (`#0B2545`)**, bo góc squircle 16pt, chiều cao 54pt.
- Hiển thị giá tiền live nổi bật với màu **Cheetah Amber (`#F59E0B`)**: Tự động nhảy số khi đổi loại xe hoặc bật/tắt bốc xếp.

---

## III. Các File Cần Thay Đổi & Kế Hoạch Triển Khai

| STT | File cần sửa | Nhiệm vụ chi tiết |
| :--- | :--- | :--- |
| **1** | `apps/mobile/src/features/home/HomeDashboardScreen.tsx` | Tái cấu trúc giao diện chính: tích hợp các tầng hiển thị vào Bottom Sheet, tối ưu thẻ lộ trình, gắn thanh CTA ghim đáy. |
| **2** | `apps/mobile/src/features/home/components/BookingDetailsModal.tsx` | Chuyển đổi từ Modal che màn hình sang dạng Bottom Sheet Component linh hoạt với handle kéo thả và hiệu ứng mờ nền tự nhiên. |
| **3** | `apps/mobile/src/features/home/HomeDashboardScreen.test.tsx` | Cập nhật và bổ sung unit test cho các tương tác chọn xe, chọn địa chỉ và tính cước mới. |

---

## IV. Tiêu Chí Nghiệm Thu (Acceptance Criteria)
1. **Trực quan & Dễ dùng:** Khách hàng có thể đặt đơn hoàn chỉnh chỉ với **3 chạm** (Chọn hub nhanh -> Chọn xe -> Bấm Gọi xe).
2. **Không che bản đồ:** Bản đồ lộ trình luôn quan sát được rõ ràng trong suốt quá trình chọn xe.
3. **Bảo toàn chức năng:** Toàn bộ API ước tính cước (`estimateOrder`), tạo đơn (`createOrder`), phân loại xe giữ nguyên vẹn 100%.
4. **Unit test:** Bộ unit test trong `apps/mobile` chạy pass toàn bộ không lỗi.
