# Mobile screens completion — Customer & Driver (Wave 6)

> **Trạng thái:** Design approved, chờ implementation plan
>
> **Phạm vi:** `apps/mobile` (Customer + Driver only — Fleet Owner/Admin là web, ngoài phạm vi theo `README.md`)
>
> **Branch:** `feature/mobile-profile-media-payment`

## 1. Mục tiêu

Hoàn thiện các màn hình mobile Customer/Driver để mỗi màn hình phản ánh đúng và đầy
đủ business logic đã đặc tả, đồng thời sửa các điểm mobile app gọi sai hoặc chưa gọi
API backend đã có sẵn. Không có API backend mới nào cần tạo — khảo sát xác nhận
`apps/api` đã cung cấp đủ endpoint; vấn đề nằm ở lớp adapter phía mobile.

## 2. Hiện trạng đã khảo sát (baseline)

Đã có (Wave 3–5): `/login`, Customer Orders (list/new/detail), Driver Orders
(list/detail) — đủ UI, adapter gọi API thật qua `port.ts`/`adapter.ts` tách network
khỏi UI, có preview/fixture catalogue theo scenario.

Gap cụ thể tìm thấy khi đối chiếu code với `docs/api/01-rest-api-spec.md` và
`apps/api/src/**/*.controller.ts`:

| # | Vấn đề | Bằng chứng | Tác động |
|---|---|---|---|
| 1 | Không có màn hình Profile cho Customer/Driver | Không có file `*profile*` nào trong `apps/mobile/**`; không nơi nào gọi `POST /auth/logout` | Không có cách đăng xuất trên mobile |
| 2 | Customer payment gọi sai route | `apps/mobile/src/features/customer/orders/adapter.ts:1176-1183` gọi `POST /payments/qr`; route thật là `POST orders/:id/payments` (`apps/api/src/payments/payments.controller.ts:17`) | Nút "Tạo mã QR thanh toán" luôn lỗi 404 khi chạy với backend thật |
| 3 | Customer payment status gọi endpoint không tồn tại | `adapter.ts:1221` gọi `GET /payments/:id`; backend không có route này, chỉ có `GET orders/:id/payments` (list) | Poll trạng thái thanh toán luôn fail |
| 4 | Customer cargo media chưa wiring | `mapOrderToDetail` hard-code `media: {kind:'empty', ...}` trong `adapter.ts:604-608`; `CustomerMediaPickerPort.pickCargoImage` (`port.ts:33`) không được gọi ở đâu | Không thể tải/xem ảnh hàng hóa dù backend có `POST orders/:id/media/cargo` |
| 5 | Driver proof upload gửi sai content-type | `uploadDeliveryProof` (`apps/mobile/src/features/driver/orders/adapter.ts:1219`) gửi JSON body qua `client.post`; backend dùng `FileInterceptor('file')` yêu cầu `multipart/form-data` (`apps/api/src/media/media.controller.ts:19`) | Upload ảnh xác nhận giao hàng sẽ lỗi trên backend thật |
| 6 | Driver proof có fallback gọi route chết | `adapter.ts:1246` fallback `POST /media/upload` — route không tồn tại trong `MediaController` | Dead code, cần dọn |
| 7 | Không có viewer ảnh thật | Cả cargo image lẫn delivery-proof chỉ hiện label text, không gọi `GET media/:id/url` để lấy signed URL và hiển thị ảnh | Người dùng không xem được ảnh đã tải |
| 8 | Không có bottom navigation | `apps/mobile/app/customer/_layout.tsx` và `driver/_layout.tsx` chỉ là `<Slot/>` trống | Lệch `docs/ui/02-navigation-map.md` ("bottom navigation tối đa 4 mục") |

Không phát hiện gap nào yêu cầu API backend mới — `GET /me`, `POST /auth/logout`,
`POST/GET orders/:id/payments`, `POST orders/:id/media/cargo`,
`POST orders/:id/media/delivery-proof`, `GET media/:id/url` đều đã tồn tại và đúng
role guard theo `apps/api/src/**`.

## 3. Kiến trúc & thành phần mới

### 3.1 Bottom tab navigation

Mới hoàn toàn, dùng chung cho Customer và Driver:

- `apps/mobile/src/navigation/TabBar.tsx` — nhận `items: readonly {id, label, route}[]`
  và `activeRoute`; render tối đa 4 mục theo `docs/ui/02-navigation-map.md`. Dùng
  `colors.brand.background` cho active, `colors.neutral.mutedText` cho inactive; touch
  target tối thiểu `44×44` theo `control.minimumTouchHeight`. Không dùng icon library
  mới — dùng ký tự/label text rõ nghĩa tiếng Việt nếu chưa có icon set đã duyệt (tránh
  vi phạm mục 9 "tạo dependency ... chỉ để thêm flourish").
- `apps/mobile/app/customer/_layout.tsx`, `apps/mobile/app/driver/_layout.tsx`: bọc
  `<Slot/>` hiện tại trong layout có `TabBar` cố định đáy màn hình, tôn trọng safe
  area (root đã áp `SafeAreaView` toàn app theo comment trong `ScreenScaffold.tsx`).
- Customer tabs: **Đơn hàng** (`/customer/orders`), **Hồ sơ** (`/customer/profile`).
  "Tạo đơn" giữ nguyên là action-button trong Orders list — không tách tab riêng
  (YAGNI, hành vi hiện tại đã đúng).
- Driver tabs: **Đơn hàng** (`/driver/orders`), **Hồ sơ** (`/driver/profile`).

### 3.2 Feature `profile` (Customer + Driver)

Lặp lại đúng pattern đã có ở `features/customer/orders` và `features/driver/orders`
để nhất quán kiến trúc (port tách interface khỏi network, adapter implement qua
`HttpClient`, model là view type thuần, fixtures + preview catalogue cho local
preview mode):

```text
src/features/customer/profile/
  port.ts       — ProfilePort { getProfileView(): Promise<ProfileView>; logout(): Promise<LogoutResult> }
  model.ts      — ProfileView (loading | error | content), LogoutResult
  adapter.ts    — GET /me, POST /auth/logout; clear sessionStore; điều hướng '/(public)/login'
  fixtures.ts + preview/catalogue.ts
  ProfileScreen.tsx
src/features/driver/profile/   — cấu trúc tương tự, dùng chung ProfileView shape qua generic nếu hợp lý
```

Nội dung màn hình (tối giản theo scope đã chốt — không có push notification/đổi
ngôn ngữ theo `docs/product/05-out-of-scope.md`):

- Số điện thoại (`AuthUser.phone`), nhãn vai trò (Khách hàng/Tài xế theo
  `AuthUser.role`), trạng thái tài khoản (`AuthUser.status` qua canonical status
  mapping mục 4.2 design system — User `ACTIVE`="Đang hoạt động", `DISABLED`="Đã vô
  hiệu hóa"), app version (từ `expo-constants`).
- Không hiển thị "tên" — `AuthUser` backend không có field này
  (`apps/api/src/auth/auth.service.ts:12-17`); không bịa dữ liệu không tồn tại.
- Nút **Đăng xuất** (`Button variant="destructive"`), có confirm dialog trước khi gọi
  `POST /auth/logout`, `isLoading` trong lúc chờ, luôn `clearSession()` local kể cả
  khi API lỗi (logout phải luôn thành công phía client).

### 3.3 Media viewer dùng chung

`apps/mobile/src/ui/MediaImage.tsx` — nhận `mediaId: string`, tự gọi
`GET /media/:id/url` lấy signed URL, cache trong lần render, render `<Image>` với
state `loading | ready | error`. Dùng thay cho label text hiện tại ở:

- Customer `CustomerOrderDetailScreen` — khu vực "Ảnh hàng hóa".
- Driver `DriverOrderDetailScreen` — khu vực delivery-proof.

Không tạo component riêng cho từng role — đây là composition có thể dùng lại ở ít
nhất hai role, đúng điều kiện nâng cấp lên platform system theo mục 6 design system.

### 3.4 HTTP client: hỗ trợ multipart

`apps/mobile/src/api/http-client.ts` hiện chỉ có `JSON.stringify(body)` cho mọi
request — đây là nguyên nhân gốc của gap #5. Thêm:

```ts
postForm<T>(path: string, form: FormData): Promise<T>
```

Không set `Content-Type` thủ công (để runtime tự set `multipart/form-data; boundary=...`),
giữ nguyên logic refresh-token-on-401 và `x-request-id` đã có trong `request()`.

## 4. Sửa lỗi cụ thể

| Vấn đề | Sửa |
|---|---|
| #2, #3 — Payment sai route | `createPaymentQr` đổi sang `POST orders/:id/payments` body `{clientRequestId}` (amount luôn lấy từ order đã persist, đúng rule `docs/api/01-rest-api-spec.md`); bỏ `getPaymentStatus(paymentId)` độc lập, thay bằng đọc lại `GET orders/:id/payments` và lấy phần tử mới nhất (`createdAt DESC`) |
| #4 — Cargo media chưa wiring | `pickCargoImage` → build `FormData` → `httpClient.postForm('orders/:id/media/cargo', formData)` kèm `clientRequestId` (UUID, idempotency key theo spec); cập nhật `media` view dùng `MediaImage` khi upload xong |
| #5 — Proof upload sai content-type | `uploadDeliveryProof` chuyển sang `httpClient.postForm(...)` |
| #6 — Dead fallback | Xóa fallback `POST /media/upload`; khi upload thật lỗi, trả `kind: 'upload-retry'` (state đã có sẵn trong `DriverProofView`) |
| #7 — Không xem được ảnh | Wire `MediaImage` (mục 3.3) vào cả hai detail screen |

## 5. API mapping (không cần API mới)

| Màn hình/luồng | Endpoint | Trạng thái trước | Trạng thái sau |
|---|---|---|---|
| Customer/Driver Profile | `GET /me`, `POST /auth/logout` | Có sẵn, chưa gọi | Wired |
| Customer cargo media | `POST orders/:id/media/cargo`, `GET media/:id/url` | Có sẵn, chưa wire | Wired |
| Customer payment | `POST orders/:id/payments`, `GET orders/:id/payments` | Có sẵn, mobile gọi sai path | Sửa đúng path |
| Driver delivery-proof | `POST orders/:id/media/delivery-proof` | Có sẵn, mobile gửi sai content-type | Sửa multipart |
| Driver proof viewer | `GET media/:id/url` | Có sẵn, chưa wire | Wired |

## 6. UI states & error handling

Theo `docs/ui/06-empty-loading-error-states.md` và mục 5 design system — mọi màn
hình chính có đủ `loading/empty/error/success/permission-denied`; state domain cộng
thêm khi liên quan:

- **Profile**: `loading` khi fetch `/me`; `error` có retry khi lỗi mạng; `session-expired`
  khi 401 không refresh được → redirect `/login` (đã có sẵn logic refresh-token trong
  `http-client.ts`, tái dùng nguyên vẹn). Đăng xuất luôn thành công phía client dù API
  lỗi — không để user kẹt trong session cũ.
- **Media upload** (cargo + proof, dùng chung validator `validateMediaFile`, đổi tên
  từ `validateDeliveryProofFile` hiện có để dùng chung 2 role): `invalid-type`,
  `too-large`, `upload-retry` — tái dùng state đã có ở Driver, áp dụng thêm cho
  Customer.
- **MediaImage**: `loading` (skeleton giữ aspect ratio), `error` (không chặn phần còn
  lại của order detail render).
- **TabBar**: active route lấy từ route hiện tại (Expo Router `usePathname`), không
  tự quản state riêng — tránh lệch đồng bộ với navigation thật.

## 7. Visual design

Theo `docs/ui/04-design-system.md` — không sáng tạo token hoặc pattern mới ngoài core
đã duyệt; không tham khảo trend app public vì mục 9 của design system chặn cứng
gradient, glassmorphism, card lồng card, decorative blob. "Hiện đại, hài hòa" đạt được
qua:

- **TabBar**: 2 mục rõ ràng, active dùng `colors.brand.background` + label đậm
  (`typography.label`), inactive dùng `colors.neutral.mutedText`; border-top 1px
  `colors.neutral.subtleBorder` phân tách khỏi content — không shadow nhiều lớp.
- **ProfileScreen**: silhouette **Journey Sheet** (Customer) / **Field Cockpit**
  (Driver) đã định nghĩa sẵn — dùng `ScreenScaffold` + `SectionHeading` hiện có, liệt
  kê thông tin dạng list-row phân cách bằng divider (không card lồng card), avatar
  tròn hiển thị chữ cái đầu số điện thoại/role trên nền `brand.softBackground` (không
  dùng ảnh đại diện giả). Đăng xuất là sticky footer action theo đúng
  `ScreenScaffold.stickyFooter` contract đã có.
- **MediaImage**: khung ảnh bo góc `radius.card=6`, không thêm shadow trang trí; state
  lỗi dùng `colors.danger.*` có text, không chỉ icon.

## 8. Testing

Theo `docs/testing/01-test-strategy.md` và pattern hiện có mỗi feature:

- `adapter.test.ts` cho `profile` (mock `HttpClient`, cover success/error/logout).
- `*.test.tsx` cho `ProfileScreen` theo scenario catalogue (giữ convention preview).
- `http-client.test.ts` thêm case cho `postForm` (đúng multipart, không set
  `Content-Type` thủ công, vẫn qua refresh-token-on-401).
- Cập nhật `adapter.test.ts` của `customer/orders` cho path payment mới; xóa test cũ
  còn assert path sai.
- Coverage giữ ≥80% theo `testing.md` (rule global).

## 9. Ngoài phạm vi (giữ nguyên theo `docs/product/05-out-of-scope.md`)

- Đổi ngôn ngữ, dark mode, push notification, chỉnh sửa thông tin cá nhân (chỉ xem +
  đăng xuất).
- Fleet Owner/Admin mobile — hai role này chỉ có web dashboard theo kiến trúc đã duyệt.
- Không tạo API backend mới — toàn bộ endpoint cần thiết đã tồn tại.

## 10. Rollout

- Branch: `feature/mobile-profile-media-payment` từ `develop`.
- Cập nhật `docs/ui/03-screen-specs.md` (+`/customer/profile`, `/driver/profile`) khi
  implementation xong, đúng rule "cập nhật tài liệu khi behavior thay đổi" trong
  `AGENTS.md`.
- Không cần sửa `docs/api/01-rest-api-spec.md` — API đã đúng, chỉ mobile client sai.
