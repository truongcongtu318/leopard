# Đặc Tả Kỹ Thuật & Thiết Kế (Design Spec)
# Tái Thiết Kế Luồng Đặt Xe Tải Chuẩn Apple HIG (iOS 17/18) Cho React Native & Expo Router

**Mã tài liệu:** `SPEC-2026-03-31-IOS18-BOOKING-FLOW-REDESIGN`  
**Tác giả:** Senior iOS Product Designer & React Native Architecture Specialist  
**Đối tượng sử dụng:** Chủ cửa hàng / Kho hàng vận chuyển hàng hóa (VD: Cửa hàng VLXD Đại Phát)  
**Trạng thái:** Chờ phê duyệt (Pending Approval)  
**Nền tảng:** React Native (Expo v57 / RN 0.86), Expo Router, `@leopard/mobile-core`

---

## 1. Bối Cảnh & Mục Tiêu Nghiệp Vụ (Context & Problem Statement)

### 1.1. Thực trạng
Màn hình "Thông tin đặt xe" hiện tại triển khai dưới dạng **Gesture Bottom Sheet** (1320 dòng mã với `Modal` và `PanResponder`), gây ra các vấn đề nghiêm trọng đối với trải nghiệm người dùng B2B (chủ kho):
1. **Xung đột thao tác:** Xung đột giữa vuốt cuộn danh sách (nhiều nội dung) và cử chỉ vuốt kéo đóng sheet dẫn đến việc thường xuyên vô tình đóng mất dữ liệu đang nhập.
2. **Mất tiêu đề và định hướng:** Khi cuộn xuống các mục thanh toán/dịch vụ, tiêu đề và thông tin lộ trình bị khuất hoàn toàn.
3. **Bàn phím che khuất dữ liệu:** Khi nhập số điện thoại hoặc ghi chú, bàn phím ảo che mất nút hành động và các trường bên dưới.
4. **Thiếu nút hành động chính cố định (Sticky Primary CTA):** Không có thanh dock cố định tính tổng cước và nút "Đặt xe" luôn sẵn sàng.

### 1.2. Mục tiêu tái thiết kế
1. **Xóa bỏ hoàn toàn Bottom Sheet cho trang Đặt xe**, chuyển thành một trang đầy đủ (**Full Page**) được push vào navigation stack với đường dẫn `/customer/booking`.
2. **Thêm màn hình "Tìm địa chỉ"** (`/customer/search-address`) nối nhịp nhàng giữa Trang chủ (`/customer/home`) và trang Đặt xe.
3. **Tuân thủ 100% Apple Human Interface Guidelines (iOS 17/18)**: Thiết kế Inset Grouped List, SF Pro Dynamic Type (≥13pt cho thông tin quan trọng), duy nhất 1 màu nhấn thương hiệu (**Midnight Navy `#0B2545`**), thanh đáy cố định vật liệu kính mờ (`regularMaterial`), và hỗ trợ Dark Mode.
4. **Tích hợp chính xác cấu trúc giá cước từ file cấu hình hệ thống**:
   - Giá xuất xe tối thiểu (Base dispatch fare): Xe Ba Gác `70.000 đ`, Van 500kg `130.000 đ`, Xe Tải 1.25T `200.000 đ`, Xe Tải 2.5T `320.000 đ`.
   - Cước cự ly di chuyển tính theo km thực tế: Xe Ba Gác `10.000 đ/km`, Van `14.000 đ/km`, Xe Tải 1.25T `18.000 đ/km`, Xe Tải 2.5T `22.000 đ/km`.
   - Phụ phí điểm dừng: `30.000 đ / điểm dừng`.
   - Phí bốc xếp: `150.000 đ` (Xe Tải 1.25T).
   - Thuế VAT: `8%` tổng cước dịch vụ khi khách bật yêu cầu xuất hóa đơn.

---

## 2. Kiến Trúc Điều Hướng (Navigation Architecture)

### 2.1. Sơ đồ Luồng Điều Hướng (Route Map)
```
[Trang Chủ: /customer/home]
   │
   ├── Chạm ô tìm kiếm "Bạn muốn giao hàng đến đâu?" ────────► [/customer/search-address]
   │                                                               │
   │                                                               ├── Chọn địa chỉ từ tìm kiếm ──┐
   │                                                               ├── Chọn từ "Gần đây" ────────┼──► [/customer/booking]
   │                                                               └── Chọn từ "Sổ địa chỉ" ─────┤     (Full Page Push)
   │                                                                                             │
   ├── Chạm Chip gợi ý nhanh (VD: "Kho Tân Bình", "Jamona") ─────────────────────────────────────┤
   └── Chạm mục trong "Sổ địa chỉ" ở trang chủ ──────────────────────────────────────────────────┘
```

### 2.2. Kiểm soát Tab Bar & Native Stack
- Cả hai route `/customer/search-address` và `/customer/booking` đều là màn hình độc lập không thuộc Tab Bar.
- Trong `apps/mobile/app/customer/_layout.tsx`:
  - Thêm `pathname.includes('/customer/search-address')` và `pathname.includes('/customer/booking')` vào điều kiện `isSubScreenWithoutNav`.
  - Floating Dock Tab Bar tự động ẩn hoàn toàn khi bước vào 2 màn hình này.
- Khi người dùng ở `/customer/booking` và bấm nút Back:
  - Nếu form chưa có dữ liệu chỉnh sửa: Pop về `/customer/search-address` (giữ nguyên từ khóa vừa gõ).
  - Nếu form đã có dữ liệu chỉnh sửa: Hiển thị Action Sheet `Bỏ đơn đang nhập?` với 2 lựa chọn:
    1. `Bỏ đơn` (Destructive, màu đỏ `#FF3B30`) ➔ Pop màn hình.
    2. `Tiếp tục nhập` (Cancel, màu accent) ➔ Ở lại form.

---

## 3. Hệ Thống Design Tokens Chuẩn Apple HIG & Mapping Sang React Native

| Quy chuẩn Apple HIG | Token trong `@leopard/mobile-core` | Giá trị hiển thị Light Mode | Giá trị hiển thị Dark Mode |
| :--- | :--- | :--- | :--- |
| **Brand Accent (Duy nhất)** | `customerPalette.primary` | `#0B2545` (Midnight Navy) | `#4D88DF` (High-contrast Blue) |
| **Canvas Background** | `customerPalette.canvas` | `#F2F2F7` (`systemGroupedBackground`) | `#000000` |
| **Card / Cell Surface** | Thẻ Inset Grouped | `#FFFFFF` (`secondarySystemGrouped`) | `#1C1C1E` |
| **Đường viền / Card Border** | Viền mỏng chuẩn HIG | `#E2E8F0` (0.5pt - 1pt) | `#2C2C2E` |
| **Bo góc Squircle liên tục** | `radius.card` (14pt) + `iosContinuousCurve` | `borderCurve: 'continuous'` | `borderCurve: 'continuous'` |
| **Màu chữ chính (Label)** | `customerPalette.textPrimary` | `#000000` (100%) | `#FFFFFF` (100%) |
| **Màu chữ phụ (Secondary)** | `customerPalette.textSecondary` | `#3C3C43` (60%) | `#EBEBF5` (60%) |
| **Màu Placeholder** | `customerPalette.textMutedSlate` | `#8E8E93` (30% mờ rõ ràng) | `#636366` |
| **Màu ngữ nghĩa (Semantic)** | `colors.statusSuccess` / `colors.statusError` | `#34C759` (Kho) / `#FF3B30` (Giao/Lỗi) | `#30D158` / `#FF453A` |
| **Typography Scale** | `typeScale.<name>` | `largeTitle(34)`, `title2(22)`, `headline(17)`, `body(17)`, `subheadline(15)`, `footnote(13)` | Cùng kích thước scale |

---

## 4. Công Thức & Động Cơ Tính Cước (Pricing Engine Specification)

### 4.1. Nguồn Dữ Liệu Giá Chuẩn (Từ `apps/api/.env`)
- `PRICING_MINIMUM_FARE_VND`: `70.000 đ`
- `PRICING_STOP_SURCHARGE_VND`: `30.000 đ / điểm dừng`
- Cấu hình từng xe:
  - **Xe Ba Gác**: `baseFareVnd: 70.000 đ`, `perKmVnd: 10.000 đ/km`, `loadingFeeVnd: 60.000 đ`
  - **Van 500kg**: `baseFareVnd: 130.000 đ`, `perKmVnd: 14.000 đ/km`, `loadingFeeVnd: 100.000 đ`
  - **Xe Tải 1.25 Tấn (Mặc định)**: `baseFareVnd: 200.000 đ`, `perKmVnd: 18.000 đ/km`, `loadingFeeVnd: 150.000 đ`
  - **Xe Tải 2.5 Tấn**: `baseFareVnd: 320.000 đ`, `perKmVnd: 22.000 đ/km`, `loadingFeeVnd: 250.000 đ`

### 4.2. Thuật Toán Tính Cước Thời Gian Thực (Client-side & Sync API)
$$\text{Cước vận chuyển} = \max(\text{baseFareVnd} + \text{distanceFareVnd} + \text{stopFareVnd}, \text{minimumFareVnd})$$
Trong đó:
- `distanceFareVnd = Math.round(distanceKm * perKmVnd)`.
- `stopFareVnd = stopCount * 30.000 đ`.
- `loadingFeeVnd = hasLoadingSupport ? rate.loadingFeeVnd : 0`.
- `subtotalVnd = transportFareVnd + loadingFeeVnd`.
- `vatFeeVnd = hasVatInvoice ? Math.round(subtotalVnd * 0.08) : 0`.
- `totalFareVnd = subtotalVnd + vatFeeVnd`.

Khi chọn xe hoặc thay đổi toggle dịch vụ, giao diện nhảy số mượt mà ngay tức thì mà không cần chờ đợi mạng.

---

## 5. Thiết Kế Màn Hình 1: "Tìm Địa Chỉ" (`/customer/search-address`)

### 5.1. Cấu trúc Giao diện (Layout)
1. **Nav Bar Chuẩn iOS**:
   - Nút Back (`chevron.backward`) kích thước tối thiểu 44×44pt.
   - Ô nhập tìm kiếm dạng Pill cao 36pt, nền `systemFill`, placeholder "Tìm địa chỉ giao hàng", tự động `autoFocus={true}`, mở bàn phím ngay khi vào màn hình.
   - Nút `(x)` tròn để xóa sạch chuỗi tìm kiếm chỉ với 1 chạm.
2. **Thẻ Cố Định Hàng Đầu (Pinned Action Card)**:
   - "Chọn trên bản đồ" với icon ghim `mappin.and.ellipse` màu Midnight Navy `#0B2545`. Chạm vào mở bản đồ toàn màn hình có ghim cố định ở tâm để kéo thả vị trí.
3. **Danh Sách Inset Grouped**:
   - Khi chưa gõ:
     - Nhóm "Gần đây": Các địa chỉ giao hàng trước đó (lấy từ đơn hàng cũ).
     - Nhóm "Sổ địa chỉ": Các địa chỉ kho/đối tác đã lưu trong `addressStore`.
   - Khi đang gõ:
     - Danh sách kết quả tìm kiếm tức thì qua `vietmapSearchService`. Các từ khóa trùng khớp được in đậm (`Headline`), phần còn lại là chữ thường (`Subheadline`, màu `secondaryLabel`).
4. **Các Trạng Thái Ngoại Lệ**:
   - **Rỗng (Empty)**: Gợi ý các địa điểm phổ biến hoặc sổ địa chỉ.
   - **Không tìm thấy kết quả**: Hiển thị illustration/icon kính lúp, thông điệp hướng dẫn và nút CTA "Chọn trên bản đồ".
   - **Chưa cấp quyền vị trí**: Banner thông báo màu ấm trên đầu danh sách kèm nút "Mở Cài đặt".

---

## 6. Thiết Kế Màn Hình 2: "Đặt Xe" Full-Page (`/customer/booking`)

### 6.1. D1: Đầu Trang & Navigation Bar Động
- **Route Map Header**: Cao cố định 180pt, tràn lên sát đỉnh màn hình. Thể hiện trực quan điểm lấy hàng (chấm xanh), điểm giao hàng (ô vuông đỏ) và đường đi nối hai điểm. Bản đồ ở chế độ tĩnh (`pointerEvents="none"` hoặc chạm để mở Full Map).
- **Nút Back tròn (Circle Glass Button)**: Tròn 44pt, nền kính mờ `rgba(255,255,255,0.85)` (hoặc dark blur trong Dark Mode), icon mũi tên Midnight Navy.
- **Inline Navigation Bar**: Khi người dùng cuộn nội dung qua 140pt, Nav Bar chuyển từ trong suốt sang nền mờ vật liệu, làm mờ dần nút tròn và hiện Inline Title "Đặt xe" căn giữa chuẩn iOS. Không sử dụng Large Title.

### 6.2. D2: Section 1 — Lộ Trình (Inset Grouped Card)
- Thẻ nằm đè lên chân bản đồ `-16pt`, đổ bóng nhẹ (`elevation: 2`, `shadowOpacity: 0.08`).
- **Điểm lấy hàng**: Chấm tròn xanh lá `#34C759`, nhãn tag "Kho", hiển thị tên kho và số nhà + tên đường. Chạm có chevron mở đổi địa chỉ.
- **Đường nét đứt dọc**: Nối từ điểm lấy đến điểm giao.
- **Điểm giao hàng**: Ô vuông đỏ `#FF3B30`, hiển thị tên công trình/người nhận và địa chỉ.
- **Nút "+ Thêm điểm dừng"**: Màu Midnight Navy, chạm để thêm điểm trả hàng trung gian (tối đa 3 điểm dừng theo quy định hệ thống).
- **Footer**: Hiển thị cự ly và thời gian ước tính: *"Khoảng 12,5 km · dự kiến 35 phút"*. Báo lỗi viền đỏ nếu điểm lấy và giao trùng nhau.

### 6.3. D3: Section 2 — Loại Xe
- Sắp xếp tăng dần theo tải trọng:
  1. Xe Ba Gác (70.000 đ · 500 kg · tag "Tiết kiệm")
  2. Van 500kg (130.000 đ · 500 kg · tag "Đô thị")
  3. Xe Tải 1.25T (200.000 đ · 1.250 kg · tag "Phổ biến" — **Mặc định chọn**)
  4. Xe Tải 2.5T (320.000 đ · 2.500 kg · tag "Tải lớn")
- **Quy tắc HIG**: Tuyệt đối **KHÔNG dùng Radio Button tròn**. Mỗi hàng là một vùng chạm kích thước lớn (hit target > 60pt), hàng được chọn có viền nhấn mỏng, nền highlight nhẹ và icon **Checkmark (`✓`) màu Midnight Navy** ở cạnh phải.
- Footer: Link màu accent "Xem kích thước thùng xe".

### 6.4. D4: Section 3 — Người Nhận
- Trường "Tên người nhận": Ô nhập văn bản kèm nút mở danh bạ thiết bị (Icon `person.crop.circle`).
- Trường "Số điện thoại":
  - Tách mã quốc gia `+84` thành badge riêng biệt bên trái.
  - Bàn phím số `keyboardType="number-pad"`.
  - Tự động bỏ số `0` ở đầu nếu người dùng nhập thừa, tự động format nhóm chữ số: `90 123 4567`.
  - Validate: hiển thị thông báo lỗi màu đỏ ngay dưới trường nếu để trống hoặc thiếu chữ số.

### 6.5. D5: Section 4 — Hàng Hóa
- **Loại hàng**: Thanh chip cuộn ngang bo tròn (Kiện hàng, May mặc, Vật liệu XD, Nội thất, Khác). Chip đang chọn có nền Midnight Navy, chữ trắng. Mép phải có gradient mờ dần để báo hiệu còn nội dung cuộn.
- **Ghi chú**: Ô nhập nhiều dòng (`multiline`), màu placeholder `customerPalette.textMutedSlate` phân biệt 100% với chữ đã nhập.
- **Ảnh hàng hóa**: Lưới thumbnail 72×72pt bo góc squircle 10pt. Nút xóa trên ảnh có kích thước vùng chạm ≥ 44pt. Ô "+ Thêm ảnh" ở cuối. Cho phép chọn hoặc chụp ảnh, giới hạn tối đa 5 ảnh.

### 6.6. D6: Section 5 — Dịch Vụ Thêm
- Gộp chung vào **MỘT thẻ Inset Grouped duy nhất**, ngăn cách bằng đường kẻ phân cách 0.5pt (không tách card rời).
- **Toggle "Tài xế hỗ trợ bốc xếp"**: Subtitle `+150.000 đ`.
- **Toggle "Xuất hóa đơn VAT"**: Subtitle `Phụ thu 8%`.
  - Khi bật toggle: Tự động trượt mở (accordion spring animation) các trường nhập: Tên công ty, Mã số thuế, Email nhận hóa đơn điện tử.

### 6.7. D7: Section 6 — Thanh Toán
- Danh sách chọn một với icon và checkmark màu Midnight Navy:
  - **VietQR** (kèm tag "Khuyên dùng")
  - **Tiền mặt**

### 6.8. D8: Thanh Đáy Cố Định (Sticky Bottom Bar)
- Nằm cố định trên Safe Area đáy, nền mờ vật liệu (`regularMaterial`), viền trên 0.5pt.
- **Hàng trên**: "Tổng cước" + Giá cước cỡ lớn (Title 2, Semibold, font số tabular) + Nút "Chi tiết ⌵" màu accent.
- **Hàng dưới**: Nút chính "Đặt xe" full-width, chiều cao 50pt, bo góc squircle 14pt, nền Midnight Navy `#0B2545`. Nút tự động chuyển sang trạng thái disabled (mờ 40%, không phản hồi bấm) khi thiếu thông tin bắt buộc.
- Khi bàn phím mở: Thanh đáy tự động ẩn đi để nhường chỗ cho Keyboard Accessory Toolbar có nút "Trước", "Tiếp", "Xong".

---

## 7. Chi Tiết 10 Trạng Thái Giao Diện (State Specifications)

1. **Trạng thái 1: Luồng chuyển cảnh 3 màn hình**: Trang chủ ➔ Tìm địa chỉ (đang gõ kết quả) ➔ Đặt xe (đầu trang).
2. **Trạng thái 2: Màn hình Tìm địa chỉ**:
   - *2A*: Mặc định rỗng (hiển thị "Chọn trên bản đồ", mục Gần đây, Sổ địa chỉ).
   - *2B*: Không có kết quả tìm kiếm (hình minh họa + nút chọn trên bản đồ).
   - *2C*: Chưa cấp quyền vị trí (banner hướng dẫn bật quyền).
3. **Trạng thái 3: Đặt xe mặc định**: Bản đồ lộ trình 180pt, xe 1.25T mặc định (200.000 đ), thanh cước đáy hiển thị 200.000 đ.
4. **Trạng thái 4: Đặt xe đang cuộn**: Nội dung cuộn qua bản đồ, Nav bar chuyển kính mờ hiện inline title "Đặt xe", thanh đáy giữ nguyên vị trí.
5. **Trạng thái 5: Đang nhập số điện thoại**: Bàn phím số mở, thanh đáy ẩn hoàn toàn, keyboard toolbar hiển thị nút "Xong".
6. **Trạng thái 6: Lỗi Validate**: Báo lỗi đỏ khi thiếu tên người nhận, số điện thoại sai định dạng, hoặc điểm lấy/giao trùng nhau; nút Đặt xe disabled.
7. **Trạng thái 7: Bật Bốc xếp + VAT**: Mở rộng form hóa đơn VAT. Tính toán cước thời gian thực: Cước xe 200.000 đ + Bốc xếp 150.000 đ = 350.000 đ; VAT 8% = 28.000 đ ➔ Tổng cước: **378.000 đ**.
8. **Trạng thái 8: Sheet Chi Tiết Giá**: Bottom sheet nhỏ trượt lên thể hiện rõ ràng từng khoản cước và thuế.
9. **Trạng thái 9: Action Sheet "Bỏ đơn đang nhập?"**: Xác nhận khi người dùng vuốt quay lại hoặc bấm nút Back khi form đã có dữ liệu.
10. **Trạng thái 10: Dark Mode**: Toàn bộ giao diện hiển thị trên nền đen `#000000`, thẻ card `#1C1C1E`, văn bản tương phản cao chuẩn WCAG.

---

## 8. Kế Hoạch Kiểm Thử Tự Động (Testing Strategy)

1. **Unit Tests (`*.test.ts`)**:
   - `phone-formatter.test.ts`: Kiểm tra tiền tố `+84`, loại bỏ số 0 đầu, định dạng nhóm `90 123 4567`.
   - `booking-pricing.test.ts`: Kiểm tra công thức cước xuất xe, cước km vượt, phụ phí điểm dừng, phí bốc xếp và thuế VAT 8%.
   - `booking-validation.test.ts`: Kiểm tra schema xác thực dữ liệu đầu vào.
2. **Component & Integration Tests (`*.test.tsx`)**:
   - `SearchAddressScreen.test.tsx`: Tìm kiếm địa chỉ, danh sách gợi ý, chọn địa chỉ và push sang trang Đặt xe.
   - `BookingScreen.test.tsx`:
     - Render mặc định xe 1.25T với giá 200.000 đ.
     - Chọn xe 2.5T, kiểm tra cước cập nhật tức thì thành 320.000 đ.
     - Bật toggle bốc xếp và VAT, kiểm tra giá nhảy chính xác thành 378.000 đ.
     - Nhập thiếu số điện thoại, kiểm tra hiển thị lỗi đỏ và nút Đặt xe bị vô hiệu hóa.
     - Mở Sheet chi tiết giá và đóng lại.
     - Kích hoạt Action Sheet khi bấm Back trên form đã nhập.
3. **Snapshot & HIG Compliance Check**:
   - Đảm bảo các kích thước vùng bấm tối thiểu ≥ 44×44pt.
   - Đảm bảo Tab Bar bị ẩn khi ở màn hình tìm địa chỉ và đặt xe.
