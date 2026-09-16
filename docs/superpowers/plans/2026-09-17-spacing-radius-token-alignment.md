# Kế hoạch Chuẩn hóa 100% Spacing, Padding, Gap & Border Radius (Apple HIG Token Alignment)

## 1. Mục tiêu (Objective)
Đồng bộ hóa 100% các giá trị khoảng cách (`padding`, `margin`, `gap`) và bo góc (`borderRadius`) trong toàn bộ ứng dụng **Customer (`apps/mobile`)**, **Driver (`apps/driver`)** và **Mobile Core (`packages/mobile-core`)** theo đúng bảng Design Tokens chuẩn **Apple Human Interface Guidelines (4pt Grid & Squircle Curvature)**.

---

## 2. Bảng quy đổi chuẩn (Token Mapping Rules)

### 2.1. Spacing, Padding, Margin & Gap (Lưới 4pt Apple)
| Giá trị gõ tay cũ | Token chuẩn `@leopard/mobile-core` | Giá trị chuẩn (pt) | Ứng dụng thực tế |
| :--- | :--- | :--- | :--- |
| `1`, `2`, `3` | `spacing.hairline` / `spacing.xxs` | `2` / `4` | Khoảng cách siêu nhỏ (icon-to-label, connector) |
| `5`, `6`, `7` | `spacing.xs` | `8` | Khoảng cách giữa các chip, hàng nhỏ |
| `9`, `10`, `11` | `spacing.sm` | `12` | Padding trong card nhỏ, khoảng cách giữa các field |
| `13`, `14`, `15` | `spacing.md` | `16` | Padding tiêu chuẩn màn hình, card lớn |
| `18`, `20`, `22` | `spacing.lg` | `24` | Khoảng cách giữa các Section chính |
| `28`, `30`, `36` | `spacing.xl` | `32` | Header padding, Hero gap |

### 2.2. Border Radius & Continuous Squircle
| Giá trị gõ tay cũ | Token chuẩn `@leopard/mobile-core` | Giá trị chuẩn (pt) | Ứng dụng thực tế |
| :--- | :--- | :--- | :--- |
| `3`, `4`, `5` | `radius.cardSm` (hoặc `4` cho tag nhỏ) | `4` / `6` | Badge nhỏ, dot indicator |
| `8`, `9`, `10` | `radius.cardSm` | `10` | Chip filter, ô nhập mã nhỏ |
| `11`, `12`, `13` | `radius.control` | `12` | Nút bấm nhỏ, ô nhập text input |
| `14`, `15` | `radius.card` | `14` | Inset Grouped Card tiêu chuẩn iOS |
| `16`, `17`, `18`, `19` | `radius.cardLg` | `16` | Card lớn, Modal header, CTA button |
| `20`, `22`, `24`, `26` | `radius.modal` | `24` | Bottom Sheet, Dialog popover |
| `999`, `9999`, `30`, `32` | `radius.pill` | `9999` | Nút tròn, Avatar, Tag pill |

---

## 3. Các giai đoạn triển khai (Phased Execution Plan)

### Giai đoạn 1: Chuẩn hóa `apps/mobile` (Customer App)
1. **Màn hình chính & Đặt xe**:
   - `HomeDashboardScreen.tsx`: Chuẩn hóa card lộ trình, bảng chọn xe Fleet Matrix, Bottom sheet.
   - `MapAddressPickerModal.tsx` & `SavedAddressPickerModal.tsx`: Chuẩn hóa ô tìm kiếm, danh sách địa chỉ.
   - `BookingDetailsModal.tsx` & `checkout/[id].tsx`: Chuẩn hóa form thông tin hàng hóa và bảng thanh toán.
2. **Màn hình Theo dõi & Đơn hàng**:
   - `CustomerOrdersScreen.tsx` & `CustomerOrderDetailScreen.tsx`: Danh sách đơn, timeline trạm dừng.
   - `RealtimeTrackingScreen.tsx`: Bản đồ tracking, thẻ tài xế, thanh điều khiển.
3. **Màn hình Tài khoản & Phụ trợ**:
   - `CustomerWalletScreen.tsx`, `AddressBookScreen.tsx`, `NotificationsScreen.tsx`, `ProfileScreen.tsx`.

### Giai đoạn 2: Chuẩn hóa `apps/driver` (Driver App)
1. **Màn hình Buồng lái & Nhận chuyến**:
   - `DriverOrdersScreen.tsx` & `IncomingDispatchModal.tsx`: Popup nhận đơn 15s, thanh trượt nhận chuyến.
   - `DriverActiveTripCard.tsx`: Thẻ hành trình đang chạy, các nút chuyển trạng thái 4 bước.
   - `detail/*` (`AssignedDetailView.tsx`, `CompletedOrderDetailView.tsx`, `EpodPanel.tsx`).
2. **Màn hình Thu nhập, Ví & Cài đặt**:
   - `DriverEarningsScreen.tsx`, `DriverWalletScreen.tsx`, `DriverHistoryScreen.tsx`, `DriverSettingsScreen.tsx`.

### Giai đoạn 3: Xác minh & Kiểm thử (Verification & Test Gates)
1. Chạy unit tests cho từng app:
   - `pnpm --filter @leopard/mobile-core test`
   - `pnpm --filter mobile test`
   - `pnpm --filter driver test`
2. Kiểm tra typecheck toàn bộ monorepo:
   - `pnpm typecheck`
3. Kiểm tra hiển thị trực tiếp trên trình duyệt (Hot-reload trên cả 2 cổng 8081 và 8082).
