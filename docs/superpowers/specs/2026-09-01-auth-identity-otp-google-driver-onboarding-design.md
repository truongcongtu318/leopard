# Auth Identity — Phone OTP + Google + Driver Onboarding (Design)

> **Trạng thái:** Design draft — chờ duyệt trước khi mở implementation plan.
>
> **Phạm vi chính:** `apps/mobile` (Customer + Driver). Kéo theo thay đổi bắt buộc ở `apps/api` (auth/schema/driver onboarding), `apps/admin` (duyệt tài xế) và cấu hình Firebase/EAS.
>
> **Ownership:** `[APP]` = mobile (phần của bạn) · `[BE]` = backend API · `[ADMIN]` = admin web · `[INFRA]` = Firebase/EAS/CI.
>
> **Branch đề xuất:** `feature/auth-otp-google-driver-onboarding` (tách khỏi `feature/mobile-profile-media-payment`).

## 1. Mục tiêu

Đưa hệ thống đăng nhập từ trạng thái **demo/mockup** hiện tại lên **đăng nhập thật**:

1. Đăng nhập bằng **số điện thoại + OTP thật** (SMS) cho Customer và Driver.
2. Thêm **đăng nhập Google** cho Customer (và Admin/Fleet trên web).
3. **Đăng ký + duyệt tài xế** đúng nghiệp vụ: nộp hồ sơ → `PENDING_APPROVAL` → Admin duyệt → `ACTIVE` mới nhận đơn.
4. Giữ **số điện thoại là neo vận hành**: tài khoản tạo bằng Google vẫn phải **verify phone trước khi giao dịch**.

## 2. Hiện trạng đã khảo sát (baseline)

Luồng backend thiết kế đúng chuẩn Firebase Phone Auth (client lấy `idToken` → server verify), nhưng **client chưa có OTP thật** và **có lỗ hổng nghiệp vụ**:

| # | Vấn đề | Bằng chứng | Tác động |
|---|---|---|---|
| 1 | Mobile không có OTP thật — chỉ dán `idToken` | `apps/mobile/src/auth/LoginScreen.tsx:621` là `TextInput` "SĐT hoặc idToken", `handleLogin` (`:311`) POST thẳng chuỗi đó vào `idToken` | Không gửi/không nhập được OTP thật; thực chất chỉ demo login |
| 2 | Không có Firebase client SDK trong mobile | `apps/mobile/package.json` không có `firebase`/`@react-native-firebase` | Không có cách sinh `idToken` từ OTP/Google |
| 3 | Login OTP ép cứng role CUSTOMER | `apps/api/src/auth/auth.service.ts:67` `loginIdentity(identity.phoneNumber, 'CUSTOMER')` | Tài xế đăng nhập OTP thật sẽ bị tạo thành khách hàng |
| 4 | Verifier bắt buộc `phone_number` | `apps/api/src/auth/providers/firebase-otp.provider.ts:63` `mapDecodedToken` reject nếu thiếu phone | Token Google (chỉ có email, không phone) sẽ bị từ chối |
| 5 | `OtpIdentity` chỉ có `providerUserId` + `phoneNumber` | `apps/api/src/auth/providers/otp-provider.ts:3` | Không mang được email/nhiều provider |
| 6 | Màn đăng ký tài xế là mockup | `apps/mobile/app/(public)/register.tsx:21` `handleRegister` chỉ `setTimeout`, không gọi API | Hồ sơ tài xế không được lưu |
| 7 | Không có trạng thái duyệt | `schema.prisma` `enum UserStatus` (`:16`) chỉ có `ACTIVE`/`DISABLED` | Không có chỗ cho `PENDING_APPROVAL`/`REJECTED` |
| 8 | Driver profile tự tạo mặc định, không kiểm duyệt | `apps/api/src/drivers/drivers.repository.ts:27` auto-create `vehicleType: 'MOTORBIKE'` | Ai cũng thành tài xế khi bật "sẵn sàng" |
| 9 | Không có rate-limit auth | `apps/api/package.json` không có `@nestjs/throttler` | Rủi ro SMS pumping / brute force |
| 10 | Runtime Expo Go, chưa có EAS | Không có `eas.json`/`expo-dev-client`; `expo@57.0.4` | `@react-native-firebase` native cần Dev Client/EAS |

Danh tính hiện tại: `User.phone` là `@unique` bắt buộc (`schema.prisma:82`); `loginIdentity` key theo phone (`auth.service.ts:116`).

## 3. Quyết định thiết kế (đã chốt)

1. **Firebase Auth là nền chung** cho Phone OTP **và** Google. Backend đã có `firebase-admin@14.2.0` verify idToken cho mọi provider. Đánh đổi: SMS OTP của Firebase **không có brandname "LEOPARD"** (nếu bắt buộc brandname → xem §9 phương án SMS nội địa, sẽ làm nhiều hơn).
2. **Khóa tài khoản nội bộ = Firebase `uid`** (`providerUserId`), không phải phone. Cho phép 1 tài khoản gắn nhiều provider (account linking).
3. **Phone là neo vận hành.** Customer đăng nhập Google được vào app nhưng **bị chặn tạo đơn** tới khi verify phone. Driver phone-first, bắt buộc verify ngay.
4. **Driver: Admin duyệt thủ công.** Đăng ký → `PENDING_APPROVAL` → Admin duyệt/từ chối.
5. **Mobile chuyển sang Dev Client + EAS** để dùng `@react-native-firebase/auth`. (Fallback nếu buộc giữ Expo Go: Firebase JS SDK + reCAPTCHA — kém ổn định trên native, ghi ở §9.)

## 4. Mô hình danh tính

Tách bạch **phương thức đăng nhập** (có thể nhiều) khỏi **tài khoản** (một bản ghi có cả email lẫn phone):

```
Firebase User (uid)
  ├─ Provider: phone  → phone_number (verified)
  ├─ Provider: google → email (verified)
  └─ (linked về cùng 1 uid qua Firebase account linking)
        │
        ▼
  Leopard User (firebaseUid = uid)
     email?, phone?, phoneVerifiedAt?, role, status
```

Quy tắc gán role khi login `/auth/firebase`:
- User đã tồn tại (theo `firebaseUid`, hoặc match `phone`/`email` để link) → dùng role hiện có.
- User mới, tự đăng nhập → mặc định `role = CUSTOMER`, `status = ACTIVE`.
- Trở thành `DRIVER` chỉ qua luồng onboarding (§6), không do client tự khai.

## 5. Thay đổi dữ liệu (Prisma) `[BE]`

### 5.1 `User`
- `firebaseUid String? @unique @db.VarChar(128)` — khóa provider.
- `email String? @unique @db.VarChar(255)`.
- `phone String? @unique @db.VarChar(32)` — **đổi từ bắt buộc → nullable** (Google-first chưa có phone). Ràng buộc: user phải có ít nhất phone **hoặc** email.
- `phoneVerifiedAt DateTime? @db.Timestamptz(3)`, `emailVerifiedAt DateTime? @db.Timestamptz(3)`.

> Tác động migration: `seed-determinism.spec.ts` (`ManifestUser` yêu cầu `phone`, `:17-22`) và seed data phải cập nhật. Backfill: user cũ set `firebaseUid = null`, `phoneVerifiedAt = now()` (coi như đã verified).

### 5.2 `enum UserStatus` (`schema.prisma:16`)
Thêm: `PENDING_APPROVAL`, `REJECTED`, `SUSPENDED`. Giữ `ACTIVE`, `DISABLED`.

### 5.3 `DriverProfile` (`schema.prisma:138`)
Thêm hồ sơ KYC: `licensePlate String?`, `licenseNumber String?` (GPLX), `submittedAt DateTime?`, `reviewedAt DateTime?`, `reviewedById String? @db.Uuid`, `rejectionReason String?`. Ảnh giấy tờ (GPLX, cà-vẹt, CCCD) dùng lại model `MediaObject` (đã tồn tại, quan hệ `mediaObjects`) — không tạo cơ chế lưu ảnh mới.

### 5.4 UI status catalogue `[APP]`
`apps/mobile/src/ui/StatusBadge.tsx:140` `user` domain chỉ có `ACTIVE`/`DISABLED` → bổ sung nhãn cho `PENDING_APPROVAL`/`REJECTED`/`SUSPENDED`.

## 6. Hợp đồng API (mới/đổi) `[BE]`

| Method | Route | Mô tả | Ghi chú |
|---|---|---|---|
| POST | `/auth/firebase` (đổi) | Verify Firebase idToken (phone **hoặc** google), upsert theo `firebaseUid`, trả session | Bỏ hard-code CUSTOMER (`auth.service.ts:67`); nới `mapDecodedToken` cho phép chỉ có email |
| POST | `/auth/phone/link` (mới) | User đã đăng nhập (vd Google) gửi phone-idToken để gắn & verify phone | Bước "verify phone sau"; set `phoneVerifiedAt` |
| POST | `/drivers/apply` (mới) | Auth required. Nộp hồ sơ tài xế (vehicleType, licensePlate, licenseNumber, media ids) → tạo `DriverProfile`, set `role=DRIVER`, `status=PENDING_APPROVAL` | |
| GET | `/drivers/me/application` (mới) | Trạng thái hồ sơ của tài xế hiện tại | Cho màn "chờ duyệt" |
| GET | `/admin/drivers/applications?status=` (mới) | `[ADMIN]` Danh sách hồ sơ chờ duyệt | RoleGuard ADMIN |
| POST | `/admin/drivers/:userId/approve` (mới) | `[ADMIN]` Duyệt → `status=ACTIVE` | |
| POST | `/admin/drivers/:userId/reject` (mới) | `[ADMIN]` Từ chối → `status=REJECTED` + lý do | |

**Gate nghiệp vụ:**
- `POST orders` (tạo đơn) yêu cầu `phoneVerifiedAt != null`. Thiếu → `403 PHONE_VERIFICATION_REQUIRED`.
- `POST orders/:id/accept` yêu cầu driver `status=ACTIVE`. Khác → `403 DRIVER_NOT_APPROVED`.

`OtpIdentity` (`otp-provider.ts:3`) mở rộng: `providerUserId`, `phoneNumber?`, `email?`.

## 7. Màn hình & luồng mobile `[APP]`

### 7.1 Đăng nhập (rework `src/auth/LoginScreen.tsx`)
Thay ô "nhập idToken" bằng:
- Ô **số điện thoại (+84)** → `auth().signInWithPhoneNumber()` → điều hướng màn nhập mã.
- Nút **"Đăng nhập với Google"** → Google Sign-In → Firebase credential → `getIdToken()` → `POST /auth/firebase`.
- Giữ khối demo cho local preview (có nhãn), không đưa vào production path.

### 7.2 Màn nhập OTP (mới)
Ô 6 số + đếm ngược gửi lại + `confirmation.confirm(code)` → `getIdToken()` → `POST /auth/firebase`. Xử lý lỗi: sai mã, hết hạn, quá số lần.

### 7.3 Gate verify phone (mới)
Customer đăng nhập Google mà `phoneVerifiedAt == null` và bấm tạo đơn → chặn, mở màn nhập phone + OTP → `POST /auth/phone/link`.

### 7.4 Đăng ký tài xế (thay stub `app/(public)/register.tsx`)
Multi-step thật: (1) thông tin cá nhân, (2) phương tiện (vehicleType, biển số), (3) upload GPLX + cà-vẹt + CCCD (dùng media pipeline sẵn có), (4) submit → `POST /drivers/apply` → màn **"Hồ sơ đang chờ duyệt"**.

### 7.5 Trạng thái tài xế
- `PENDING_APPROVAL`: khóa UI nhận đơn, hiện banner chờ duyệt (poll `/drivers/me/application`).
- `REJECTED`: hiện lý do + cho nộp lại.
- `ACTIVE`: mở workflow nhận đơn như hiện tại.

## 8. Bảo mật & vận hành

- **Rate-limit** `[BE]`: thêm `@nestjs/throttler` cho `/auth/*` và `/auth/phone/link` (chống SMS pumping/brute force). `security.md` yêu cầu rate limiting mọi endpoint.
- **Firebase** `[INFRA]`: bật Phone + Google provider; bật billing Blaze; cấu hình SHA-256 (Android release qua Play App Signing) + APNs (iOS); thêm số test cho dev.
- **Token storage** `[APP]`: access/refresh token lưu `expo-secure-store` (theo `react-native/security.md`), không lưu vào state serialize ra đĩa.
- **Env** `[INFRA]`: `FIREBASE_PROJECT_ID` + `GOOGLE_APPLICATION_CREDENTIALS` (đã hỗ trợ ở `firebase-admin.verifier.ts:36`).

## 9. Phương án thay thế & đánh đổi

- **SMS brandname nội địa (eSMS/Twilio):** OTP hiện tên "LEOPARD", kiểm soát chi phí VN. Nhưng phải tự viết sinh/lưu/verify OTP ở backend + **tự tích hợp Google OAuth riêng + tự viết account-linking** → nhiều việc hơn hẳn. Chỉ chọn nếu brandname là yêu cầu bắt buộc.
- **Giữ Expo Go:** dùng Firebase JS SDK + `expo-firebase-recaptcha` thay cho native — kém ổn định, thêm bước reCAPTCHA. Chỉ dùng nếu không thể chuyển Dev Client/EAS.

## 10. Ngoài phạm vi

- Apple Sign-In, Facebook login.
- Push notification khi đơn được duyệt (có thể thêm sau).
- App-store release, EAS Update rollout policy (thuộc production-readiness riêng).
- Tách app tài xế thành binary riêng (giữ mô hình 1 app role-routing hiện tại).

## 11. Rủi ro

| Rủi ro | Giảm thiểu |
|---|---|
| Migration `phone` nullable phá seed/test | Cập nhật `seed-determinism.spec.ts` + seed; backfill `phoneVerifiedAt` |
| Chuyển Dev Client/EAS làm gãy workflow dev đang chạy Expo Go | Thêm `eas.json` + dev client trong 1 task nền tảng trước, CI verify build |
| Chi phí SMS + abuse | Rate-limit + số test dev + theo dõi quota Firebase |
| Account-linking sai (trùng phone giữa 2 uid) | Quy tắc merge rõ ràng ở `/auth/firebase`, test kỹ |
