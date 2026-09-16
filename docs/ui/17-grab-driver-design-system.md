# LEOPARD Driver Design System Specification

> **Tài liệu:** Đột phá chuẩn hóa giao diện Driver theo chuẩn Grab Driver Production  
> **Áp dụng cho:** `apps/driver`, `@leopard/mobile-core`  
> **Nguồn đối chiếu:** 6 ảnh chụp màn hình thực tế của ứng dụng Grab Driver (Cockpit, Popover Thu nhập, Ví, Thu nhập, Hồ sơ, Cài đặt)  
> **Trạng thái:** `APPROVED_SPEC`

---

## 1. Phân tích 6 màn hình thực tế (Visual Deconstruction)

| Màn hình | Layout & Cấu trúc chính | Thành phần giao diện nhận diện | Màu sắc & Tương phản |
|---|---|---|---|
| **1. Cockpit Map (Trang chủ)** | Bản đồ toàn màn hình, Floating HUD trên, Cụm điều khiển ở trung tâm dưới, Dock nổi đáy | • **Top HUD Left**: Capsule trắng bo tròn "Thu nhập" kèm icon biểu đồ cột.<br>• **Top HUD Right**: Avatar tài xế bo tròn kèm viền xanh + chấm trạng thái (xanh/đỏ) + Pill đánh giá `★ 5.00` vàng amber.<br>• **Center Puck**: Vòng định vị mũi tên xanh dương.<br>• **Hero Duty Switch**: Pill đen than `Bật kết nối` kèm icon nguồn `⏻`.<br>• **Notice Card**: Thẻ thông báo tạm ngưng/xác minh (icon tam giác đỏ cảnh báo, link xanh).<br>• **Floating Dock**: Thanh điều hướng 4 icon (Xe, Ghim vị trí, Tia sét cuốc nóng, Khác `...`). | Nền bản đồ xám sáng `#F4F5F7`, nút bật kết nối đen `#1E242B` tương phản cực cao ngoài trời, cảnh báo đỏ `#EF4444`. |
| **2. Popover Thu nhập** | Modal popover phủ nhẹ bản đồ, nút đóng tròn bên góc trái trên | • **Close Button**: Nút tròn trắng chứa dấu `✕`.<br>• **Card Stack**: 3 thẻ xếp chồng gồm Thu nhập (`đ 0 >`), Tiền thưởng (`0 💎 >`), Ví tài khoản (`đ 0 >`). | Thẻ trắng tinh khôi bo góc 16px, viền mỏng mờ, chevron xám `#94A3B8`. |
| **3. Ví tài khoản (Finance Hub)** | Top bar tiêu chuẩn (Back `←`, Tiêu đề `Ví`, Help `?`), danh sách tài sản thẻ, tiện ích giá trị gia tăng, Bottom Tab Bar 3 mục | • **Asset Cards**: Thẻ Ví tiền mặt (icon tròn xanh lá đậm `$` + số dư `đ 1.789`), Ví tín dụng (icon tròn xanh `G` + số dư `đ 0`).<br>• **Value-added Services**: 3 thẻ tiện ích ngang (Nạp tiền ví, Bảo hiểm người thân, Hỗ trợ tài chính) kèm CTA link.<br>• **Finance Tab Bar**: 3 tab đáy cố định (Thu nhập, Tiền thưởng, Ví). | Xanh lá Grab Emerald `#00B14F` làm màu chủ đạo cho số dư và active tab. |
| **4. Thu nhập (Earnings)** | Top bar tiêu chuẩn (Back, `Thu nhập`, Help, Sparkle `✦`), Carousel thẻ chỉ số, Thẻ tổng kết cuốc, Tooltip điều hướng | • **Metric Carousel**: Thẻ "Thu nhập hôm nay" kèm badge "0 Jobs", số tiền to `0 đ`, link "Xem chi tiết".<br>• **Completed Rides Row**: Hàng điều hướng "Cuốc xe đã hoàn tất / 0 cuốc xe >".<br>• **Blue Tooltip**: Bong bóng xanh dương "Xem tiền thưởng của bạn." có mũi tên trỏ xuống tab "Tiền thưởng" ở thanh đáy. | Số tiền lớn 32px Bold `Tabular-nums`, màu xanh dương `#007AFF` cho tooltip giáo dục người dùng. |
| **5. Hồ sơ (Profile)** | Top bar (Back, `Hồ sơ`, Gear `⚙`, Help, Sparkle), Tooltip "Cài đặt" trỏ vào Gear, Card tài xế, KPI hiệu suất, Quick Action Grid, Banner | • **Settings Tooltip**: Bong bóng xanh trỏ lên bánh răng cài đặt.<br>• **Driver Summary**: Avatar lớn, Tên tài xế, Đánh giá `★ 5.0`.<br>• **KPI Card**: Container xám nhạt chia 2 cột "Hàng ngày": `0.0% Chấp nhận` và `0.0% Huỷ bỏ`.<br>• **Action Grid**: Lưới 5 nút tròn xám nhạt (Hộp thư đến có chấm đỏ, Lịch nhận cuốc, Khám phá, Thưởng, Xem thêm).<br>• **Promo & Guide**: Thẻ ảnh full-bleed và thẻ minh họa. | Phân mảng rõ ràng bằng thẻ bo góc lớn (16-20px), icon tròn 52px dễ bấm khi dừng xe. |
| **6. Cài đặt (Settings)** | Danh sách nhóm cài đặt dạng Inset Grouped, Header phân nhóm rõ ràng | • **Section Tài khoản**: Tên + Biển số xe + Số điện thoại, Tương tác truyền thông, Liên kết tài khoản.<br>• **Section Yêu cầu (Highlight)**: Thẻ nổi có dải banner xanh lá `Tăng cơ hội nhận cuốc của bạn`.<br>• **iOS Toggle Switch**: "Tự động nhận cuốc" (Toggle xanh bật), "Đề xuất giá cước" kèm badge đỏ `MỚI` (Toggle tắt).<br>• **Navigation Rows**: Hàng điều hướng có giá trị bên phải, chấm đỏ thông báo và chevron `>`. | Thẻ nhóm viền xám mỏng, switch toggle chuẩn Apple iOS (`#00B14F`), badge đỏ rực rỡ nổi bật tính năng mới. |

---

## 2. Kiến trúc Design System 3 lớp (Three-Layer Token Architecture)

Hệ thống token tuân thủ chặt chẽ nguyên lý: **Primitives → Semantics → Components**.

```
Primitives (Raw: #00B14F, 16px, 9999px)
     ↓
Semantics (Mục đích: surface.canvas, text.brand, status.warning)
     ↓
Components (Giao diện cụ thể: hudCapsule, powerDutySwitch, settingsGroup)
```

### 2.1 Lớp Primitives (Raw Tokens)

Được định nghĩa tại `@leopard/mobile-core/src/theme/driver-tokens.ts`:

- **Bảng màu (Palette)**:
  - `green500` (`#00B14F`): Xanh Emerald chuẩn của ứng dụng tài xế (màu hành động, toggle active, active tab).
  - `green50` (`#E8F8EE`): Xanh nhạt dùng làm nền banner khuyến khích ("Tăng cơ hội nhận cuốc").
  - `dark900` (`#1E242B`): Đen than đậm dùng cho nút hero "Bật kết nối" để đạt độ tương phản tối đa ngoài nắng.
  - `gray50` (`#F8FAFC`): Canvas nền cho các màn hình chi tiết (Ví, Hồ sơ, Cài đặt).
  - `gray100` (`#F1F5F9`): Nền các nút tròn thao tác nhanh (Hộp thư, Lịch, Thưởng).
  - `gray200` (`#E2E8F0`): Đường phân cách mỏng giữa các hàng trong Inset Grouped list.
  - `gray500` (`#64748B`): Màu chữ phụ (biển số xe, mô tả tính năng).
  - `gray900` (`#1E293B`): Màu tiêu đề chính và tên tài xế.
  - `amber500` (`#F59E0B`): Sao đánh giá (`★ 5.00`).
  - `red500` (`#EF4444`): Badge `MỚI`, chấm đỏ thông báo chưa đọc, icon cảnh báo tạm ngưng.
  - `blue500` (`#007AFF`): Bong bóng Tooltip chỉ dẫn và link hành động.

- **Thang đo Typography (iOS 18 HIG aligned)**:
  - `heroNum`: 32px (Bold, `tabular-nums`) cho số dư tiền và thu nhập ngày.
  - `largeTitle`: 28px (Bold) cho tiêu đề lớn.
  - `title1`: 22px (Bold) cho tiêu đề màn hình ("Tất cả cài đặt", "Ví").
  - `title2`: 18px (Bold) cho tên tài xế và card title.
  - `headline`: 16px (Semibold) cho tiêu đề nhóm ("Tài khoản của tôi", "Cài đặt yêu cầu").
  - `body`: 15px (Regular) cho nhãn cài đặt và văn bản chung.
  - `subheadline`: 14px (Medium/Semibold) cho pill HUD và banner phụ.
  - `footnote`: 13px (Regular) cho tỉ lệ Chấp nhận / Huỷ bỏ.
  - `caption`: 12px cho mô tả phụ và nhãn tab bottom bar.
  - `badge`: 10px (Bold) cho badge `MỚI` viết hoa.

- **Thang đo Spacing & Radius**:
  - Spacing chuẩn: 4pt, 8pt, 12pt, 16pt, 20pt, 24pt, 32pt.
  - Corner Radius:
    - `pill` (`9999px`): Nút "Bật kết nối", capsule "Thu nhập", star rating pill, action circles, floating dock.
    - `bento` (`20px`): Container nhóm cài đặt, container KPI hàng ngày.
    - `card` (`16px`): Thẻ ví, thẻ thông báo, thẻ chỉ số thu nhập.
    - `control` (`12px`): Input và button thứ cấp.

- **Đổ bóng & Nổi (Shadows & Elevation)**:
  - `floating`: Độ mờ sâu (`shadowRadius: 16`, `shadowOpacity: 0.16`) dành cho Floating Dock và Bottom Sheet.
  - `powerPill`: Đổ bóng nhấn mạnh (`shadowRadius: 12`, `shadowOpacity: 0.25`) cho nút "Bật kết nối".
  - `md`: Đổ bóng nhẹ cho các capsule Top HUD trên nền bản đồ.
  - `sm`: Đổ bóng mịn cho các thẻ nội dung thông thường.

---

## 3. Đặc tả thành phần chi tiết (Component Specs)

### 3.1 Top HUD Capsules (Thu nhập & Rating Pill)
- **Vị trí**: Nổi trên đỉnh màn hình bản đồ, cách Safe Area Top 8px.
- **Capsule Trái**: Cao 38px, nền trắng, bo tròn `rounded-full`, padding ngang 14px. Chứa icon biểu đồ cột + text "Thu nhập". Nhấp vào mở popover 3 thẻ.
- **Capsule Phải**: Cụm avatar tròn 44px viền xanh kèm chấm trạng thái (xanh lá nếu online, đỏ nếu offline) + capsule điểm đánh giá `★ 5.00` nền trắng nổi bật ngay bên dưới.

### 3.2 Hero Duty Switch ("Bật kết nối" Button Pill)
- **Vị trí**: Nằm chính giữa trục dọc, cách đáy một khoảng an toàn (trên thẻ thông báo hoặc dock).
- **Quy cách**: Cao 52px, padding ngang 28px, bo tròn hoàn toàn (`rounded-full`), nền đen `#1E242B`.
- **Nội dung**: Icon nguồn `⏻` trắng bên trái + chữ "Bật kết nối" trắng Bold 16px.
- **Tương tác**: Chạm vào kích hoạt đổi trạng thái (chuyển sang màu xanh lá `#00B14F` "Đang kết nối" hoặc chuyển offline).

### 3.3 Alert Notice Card (Thẻ thông báo cảnh báo)
- **Quy cách**: Thẻ trắng bo góc 16px, viền mỏng `#E2E8F0`, padding 16px.
- **Bố cục 2 tầng**:
  - Tầng trên: Icon tam giác đỏ cảnh báo + thông báo trạng thái tài khoản ("Chúng tôi cần tạm ngưng hoạt động...").
  - Tầng dưới: Đường kẻ ngăn cách + link hành động căn giữa màu xanh dương "Truy cập Trung tâm trợ giúp".

### 3.4 Floating Dock (Thanh điều hướng nổi Map Cockpit)
- **Quy cách**: Thanh capsule nổi cao 64px, cách viền đáy 16px, nền trắng, đổ bóng `floating`.
- **4 Tab hành động**:
  1. Tab 1: Icon Xe (Tab chính nhận cuốc - nền tròn xanh `#00B14F` khi active).
  2. Tab 2: Icon Ghim vị trí (Điểm đến yêu thích / điều hướng).
  3. Tab 3: Icon Tia sét (Cơ hội nhận cuốc / bản đồ nhiệt nhu cầu).
  4. Tab 4: Icon Ba chấm `...` (Mở rộng menu nhanh).

### 3.5 Finance Tab Bar (Thanh điều hướng phân hệ Tài chính)
- **Quy cách**: Thanh tab đáy cố định cao 60px, nền trắng, viền trên 1px `#E2E8F0`.
- **3 Tab**:
  1. `Thu nhập` (Icon biểu đồ cột)
  2. `Tiền thưởng` (Icon viên kim cương 💎)
  3. `Ví` (Icon chiếc ví, sáng xanh `#00B14F` khi chọn)

### 3.6 Quick Action Circle Grid (Lưới thao tác nhanh màn Hồ sơ)
- **Quy cách**: Lưới ngang 5 nút tròn đường kính 52px, nền xám nhạt `#F1F5F9`.
- **5 Nút**:
  1. Hộp thư đến (icon chat + chấm đỏ notification).
  2. Lịch nhận cuốc (icon lịch).
  3. Khám phá (icon bóng đèn).
  4. Thưởng (icon kim cương).
  5. Xem thêm (icon ba chấm).
- Nhãn bên dưới cỡ chữ 12px, căn giữa, khoảng cách 6px với nút tròn.

### 3.7 Inset Grouped Settings List (Danh sách cài đặt phân nhóm)
- **Quy cách**: Khung bento bo góc 20px, nền trắng, viền `#E2E8F0`.
- **Dải biểu ngữ trên cùng**: Nền xanh nhạt `#E8F8EE`, chữ xanh lá `#008038`, icon mũi tên tăng trưởng "Tăng cơ hội nhận cuốc của bạn".
- **Hàng Switch Toggle**: Tiêu đề + mô tả phụ bên trái, Switch gạt bên phải (màu xanh `#00B14F` khi bật). Thêm badge đỏ `MỚI` ở tính năng mới.
- **Hàng Điều hướng**: Chevron xám `#94A3B8` bên phải, có thể đi kèm giá trị tóm tắt hoặc chấm đỏ báo hiệu.

### 3.8 Educational Tooltips (Bong bóng chỉ dẫn xanh)
- **Quy cách**: Nền xanh dương `#007AFF`, chữ trắng 13px Semibold, bo góc 8px, padding 6px 12px.
- **Mũi tên chỉ hướng**: Tam giác nhọn trỏ chính xác vào icon mục tiêu (trỏ lên bánh răng Cài đặt, trỏ xuống tab Tiền thưởng).

---

## 4. Bảng đối chiếu triển khai mã nguồn (`apps/driver`)

| Màn hình trong mã nguồn | Đường dẫn file | Thành phần Design System áp dụng |
|---|---|---|
| **Cockpit / Trang chủ** | `apps/driver/app/index.tsx` | `hudCapsule`, `powerDutySwitch`, `noticeAlertCard`, `floatingBottomDock` |
| **Thu nhập** | `apps/driver/app/earnings.tsx` | `metricCard`, `educationalTooltip`, `financeTabBar` |
| **Ví tài khoản** | `apps/driver/app/wallet.tsx` | `assetWalletCard`, `valueAddedPromoCard`, `financeTabBar` |
| **Hồ sơ tài xế** | `apps/driver/app/profile.tsx` | `kpiDailyCard`, `quickActionCircleGrid`, `educationalTooltip` |
| **Cài đặt tài xế** | `apps/driver/app/settings.tsx` | `settingsGroup`, `bannerHighlight`, `iosSwitchToggle`, `badgeNew` |

---

## 5. Quy tắc Accessibility & Field Operations

1. **Touch Target tối thiểu**: Mọi nút bấm, capsule, hàng cài đặt đều phải có diện tích chạm tối thiểu **44x44pt** (iOS) và **48x48dp** (Android) theo quy định HIG.
2. **Thao tác một tay ngoài trời (Outdoor One-Handed Zone)**:
   - Các nút bấm quan trọng nhất ("Bật kết nối", Switch nhận cuốc, Dock điều hướng) nằm ở nửa dưới màn hình để tài xế với tới bằng ngón cái.
   - Các capsule hiển thị trạng thái thụ động (Thu nhập, Rating, Cài đặt) đặt ở nửa trên.
3. **Độ tương phản cao**: Nút "Bật kết nối" dùng nền than `#1E242B` trên nền bản đồ đảm bảo tỉ lệ tương phản vượt chuẩn WCAG AA (> 7:1).
4. **Không dùng Emoji thay Icon**: Toàn bộ icon kim cương, ngôi sao, nút nguồn, biểu đồ đều dùng vector SVG chuẩn từ `@leopard/mobile-core`.
