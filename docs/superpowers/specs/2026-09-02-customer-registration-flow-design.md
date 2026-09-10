# Thiết kế: Luồng hoàn tất hồ sơ sau đăng nhập + Trang đăng ký Customer

- **Ngày:** 2026-09-02
- **Nhánh:** feature/mobile-profile-media-payment
- **Trạng thái:** Đề xuất (chờ review)
- **Tham chiếu UX:** https://app.ahamove.com/sign-up

---

## 1. Bối cảnh & Vấn đề

Luồng đăng nhập mobile hiện tại:

1. **SĐT:** nhập số → OTP (Firebase) → verify → có Firebase idToken.
2. **Google:** `signInWithGoogle()` (popup) → có Firebase idToken.
3. Cả hai gọi chung `exchangeIdToken(idToken)` → `POST /auth/firebase` → backend `loginFirebase` **tự upsert user** (user mới ⇒ role `CUSTOMER`, `status=ACTIVE`) → trả `{ user, session }`.
4. `app/(public)/login.tsx` điều hướng theo `role`.

**Vấn đề:** không phân biệt user mới/cũ; user mới (cả SĐT lẫn Google) vào thẳng `/customer/home` với hồ sơ trống, chưa có tên/email đầy đủ, **chưa đồng ý điều khoản** (Nghị định 13/2023 PDPD yêu cầu consent tường minh).

Ngoài ra `apps/mobile/app/(public)/register.tsx` **thực chất đã là trang đăng ký tài xế** (KYC, `POST /driver/apply`) nhưng tên route `register` gây hiểu nhầm là đăng ký chung.

## 2. Mục tiêu

1. Sau đăng nhập (**SĐT hoặc Google**): nếu **chưa onboarding** → đưa sang **trang đăng ký Customer** (điền thông tin bắt buộc + consent, có prefill); nếu **đã onboarding** → vào thẳng theo role như cũ.
2. Đổi tên route đăng ký tài xế cho rõ nghĩa + thêm **link chuyển sang đăng ký tài xế** từ màn customer.
3. Thêm **màn đăng ký Customer** đúng chuẩn UX Ahamove, hỗ trợ prefill và xác minh SĐT cho user Google.

## 3. Quyết định đã chốt

| # | Quyết định | Lý do |
|---|---|---|
| D1 | User mới **mặc định CUSTOMER**, không có màn chọn vai trò. Có **link "Đăng ký làm tài xế"** ở màn customer-register. | Khớp backend hiện tại; DRIVER chỉ cấp qua onboarding tài xế. |
| D2 | Xác định "chưa onboarding" bằng mốc **`User.onboardedAt`** (chỉ set khi bấm "Hoàn tất"). Backend trả cờ **`profileComplete = (onboardedAt != null)`**. **Backfill `onboardedAt = now()` cho toàn bộ user hiện có** trong migration. | Bền và đúng cho cả Google (đã có tên/email vẫn phải qua consent); user cũ không bị kéo lại. |
| D3 | Trường **bắt buộc**: **Họ và tên, Số điện thoại, Email**. **Ảnh đại diện tùy chọn** (skip được). + **consent chia tầng** (2 bắt buộc + 2 tùy chọn). | Theo yêu cầu (tên/SĐT/email bắt buộc) + mô hình consent Ahamove. |
| D4 | **User Google (chưa có SĐT): bắt buộc verify OTP** số điện thoại ngay trong trang đăng ký (dùng luồng `linkPhone` sẵn có). SĐT trong DB **luôn đã xác thực**. | App giao hàng cần SĐT thật; tận dụng `POST /auth/phone/link`. |
| D5 | **Prefill** trang đăng ký từ `GET /me`: SĐT-OTP ⇒ có sẵn SĐT (khóa); Google ⇒ có sẵn tên + email. | Giảm ma sát; điền sẵn những gì đã biết. |
| D6 | **Địa chỉ tách trang riêng, làm sau**; **Mã giới thiệu (referral) không đưa vào v1**. | Giữ scope; Ahamove cũng thu địa chỉ ở bước tạo đơn. |

## 4. Phân tích Ahamove (đối chiếu & điều chỉnh)

Form Ahamove: `Tên đầy đủ`, `Số điện thoại`, `Email`, `Mã giới thiệu (không bắt buộc)` + 4 checkbox consent:

1. (Bắt buộc) Đồng ý Chính sách & Điều khoản.
2. (Bắt buộc) Cho phép xử lý dữ liệu cá nhân để thực hiện đơn hàng và cung cấp dịch vụ.
3. (Tùy chọn) Marketing/truyền thông.
4. (Tùy chọn) Chuyển giao dữ liệu cho bên thứ ba.

Không có avatar, không có địa chỉ ở bước đăng ký.

**Điều chỉnh cho LEOPARD:**

| Ahamove | LEOPARD |
|---|---|
| SĐT là ô nhập | SĐT-OTP ⇒ prefill **khóa**; Google ⇒ ô nhập + **verify OTP** (D4) |
| Email không đánh dấu bắt buộc | **Email bắt buộc** (D3) |
| Mã giới thiệu | **Bỏ ở v1** (D6) |
| Không có avatar | **Có avatar, tùy chọn/skip** |
| 4 consent | Giữ nguyên 4 consent (2 bắt buộc + 2 tùy chọn) |

## 5. Kiến trúc luồng

```
[SĐT OTP] ─┐                         ┌─ verify → idToken ─┐
           ├─ handleVerifyOtp        │                    │
[Google]  ─┘  handleGoogleLogin ─────┘                    ▼
                                        exchangeIdToken(idToken)
                                        POST /auth/firebase
                                        → { user: { name, email, phone, role,
                                                    status, profileComplete }, session }
                                                     │
                                    profileComplete === false ?
                                                     │
                    ┌─────────────────────────────────┴───────────────────┐
                  false                                                   true
     router.replace('/(public)/customer-register')          điều hướng theo role (như cũ)
                    │                                        CUSTOMER→/customer/home
     GET /me → prefill (name/email/phone)                   DRIVER→/driver/orders
                    │
     [Google] SĐT trống → nhập + verify OTP → POST /auth/phone/link
                    │
     điền tên/email + tick 2 consent bắt buộc
                    │
     PATCH /users/me  → set onboardedAt=now  → profileComplete=true
                    │
     router.replace('/customer/home')
```

## 6. Thay đổi Backend (`apps/api`)

### 6.1. Prisma schema + migration

Thêm vào `model User`:

```prisma
name               String?   @db.VarChar(120)   // đã có sẵn
onboardedAt        DateTime? @db.Timestamptz(3)  // NEW: mốc hoàn tất đăng ký
consentTermsAt     DateTime? @db.Timestamptz(3)  // NEW: đồng ý T&C (bắt buộc)
consentServiceAt   DateTime? @db.Timestamptz(3)  // NEW: xử lý dữ liệu dịch vụ (bắt buộc)
consentMarketing   Boolean   @default(false)     // NEW: tùy chọn
consentThirdParty  Boolean   @default(false)     // NEW: tùy chọn
avatarMediaId      String?   @db.Uuid            // NEW: avatar (tùy chọn), tham chiếu MediaObject
```

- **Backfill:** migration chạy `UPDATE "User" SET "onboardedAt" = COALESCE("createdAt", now()) WHERE "onboardedAt" IS NULL;` để mọi user hiện có được coi là đã onboarding.
- Các cột còn lại nullable / có default ⇒ an toàn với dữ liệu cũ.
- `avatarMediaId`: v1 chỉ lưu id (không ràng buộc FK cứng) để giảm phạm vi; cân nhắc relation sau.

### 6.2. Bắt tên/email từ provider (đặc biệt Google)

- `OtpIdentity` (`providers/otp-provider.ts`) thêm `readonly name?: string;` (email đã có).
- `FirebaseOtpProvider.mapDecodedToken` (`providers/firebase-otp.provider.ts`) đọc claim `name` (Google displayName) → `identity.name`. SĐT-OTP không có claim này ⇒ `undefined`.
- `AuthService.upsertIdentityUser`:
  - Khi **tạo mới**: set `name: identity.name ?? null`, `email` như hiện tại. (Không set `onboardedAt` ⇒ user mới `profileComplete=false`.)
  - Khi **user cũ**: backfill `name` nếu đang trống và provider có name (giữ nguyên logic backfill email/phone hiện có).

### 6.3. AuthResponse/AuthUser: mở rộng cho prefill + cờ hoàn tất

`AuthUser` (`auth.service.ts:12`) mở rộng:

```ts
export interface AuthUser {
  readonly id: string;
  readonly phone: string | null;
  readonly email: string | null;      // NEW (prefill)
  readonly name: string | null;       // NEW (prefill)
  readonly role: Role;
  readonly status: UserStatus;
  readonly profileComplete: boolean;   // NEW = onboardedAt != null
}
```

- `serializeUser` tính `profileComplete = user.onboardedAt != null` và trả thêm `name`, `email`. Cần nới kiểu input của `serializeUser`/`requireActiveUser` để đọc `onboardedAt`, `name`, `email` từ prisma user.
- Áp cho mọi nơi trả `AuthUser`: `loginFirebase`, `loginDemo`, `linkPhone`, `getCurrentUser`.

### 6.4. Endpoint hoàn tất hồ sơ

Module mới `apps/api/src/users/` (khuôn theo `drivers`):

- **`PATCH /users/me`** (AccessTokenGuard). Body (class-validator):

```ts
{
  name: string;              // bắt buộc, trim 1..120
  email: string;             // bắt buộc, định dạng email, unique
  avatarMediaId?: string;    // tùy chọn, uuid
  consentTerms: true;        // bắt buộc = true
  consentService: true;      // bắt buộc = true
  consentMarketing?: boolean;
  consentThirdParty?: boolean;
}
```

- **Tiền điều kiện:** user phải đã có `phone` (đã xác thực). Nếu `phone == null` (Google chưa link SĐT) ⇒ 409 `PHONE_REQUIRED` ("Vui lòng xác minh số điện thoại trước"). (SĐT chỉ được set qua login OTP hoặc `linkPhone` ⇒ luôn đã verify.)
- Xử lý: set `name`, `email`, `avatarMediaId?`, `consentTermsAt=now`, `consentServiceAt=now`, cờ marketing/thirdParty, **`onboardedAt=now`**. Trả `AuthUser` (`profileComplete=true`).
- Lỗi email trùng ⇒ 409 `EMAIL_ALREADY_USED` (thông điệp tiếng Việt).

### 6.5. Xác minh SĐT cho user Google — tái dùng `linkPhone`

- Không cần endpoint mới: mobile gọi `POST /auth/phone/link` (đã có) với idToken từ OTP để gắn + xác thực SĐT vào tài khoản đang đăng nhập. `linkPhone` đã xử lý 409 `PHONE_ALREADY_LINKED`.

### 6.6. Test backend

- unit: `serializeUser` trả `profileComplete` đúng theo `onboardedAt`; trả `name`/`email`.
- unit: `upsertIdentityUser` lưu `name` từ Google identity; SĐT-OTP không có name ⇒ null.
- e2e: login mới ⇒ `profileComplete=false`; `PATCH /users/me` hợp lệ ⇒ `GET /me` `profileComplete=true`.
- e2e: `PATCH /users/me` thiếu consent bắt buộc ⇒ 400; khi `phone==null` ⇒ 409 `PHONE_REQUIRED`; email trùng ⇒ 409.
- migration: user cũ sau backfill có `onboardedAt != null`.

## 7. Thay đổi Mobile (`apps/mobile`)

### 7.1. Điều hướng theo `profileComplete` (bao phủ cả SĐT & Google)

- `LoginScreen.tsx` interface `AuthResponse.user` thêm `name`, `email`, `profileComplete`.
- Sửa **một chỗ** `exchangeIdToken` (`src/auth/LoginScreen.tsx:549`): truyền `profileComplete` ra ngoài → cả `handleVerifyOtp` (SĐT) lẫn `handleGoogleLogin` (Google) tự động được bao phủ.
- Đổi chữ ký: `onLoginSuccess?: (role: Role, profileComplete: boolean) => void` (cả `src/auth/LoginScreen.tsx` và `src/features/auth/LoginScreen.tsx`). Demo login (dòng ~677) truyền `res.user.profileComplete`.
- `app/(public)/login.tsx` `handleLoginSuccess(role, profileComplete)`:
  - `if (!profileComplete) { router.replace('/(public)/customer-register'); return; }`
  - còn lại switch theo role như cũ.

### 7.2. Màn mới: `app/(public)/customer-register.tsx`

Phong cách bám `register.tsx`/`LoginScreen.tsx` (ScrollView, card, primaryBtn, token LEOPARD). Khi mount gọi `GET /me` để **prefill**. Có **reCAPTCHA container** ẩn (web phone auth) như login để verify SĐT.

- **Masthead**: logo + "Hoàn tất hồ sơ" + subline "Chỉ một bước nữa để bắt đầu đặt đơn cùng LEOPARD".
- **Card 1 — Thông tin cá nhân**:
  - **Số điện thoại**:
    - Nếu `/me.phone` đã có ⇒ hiển thị **prefill, khóa** (icon ổ khóa).
    - Nếu trống (Google) ⇒ ô nhập + nút **"Gửi mã"** → nhập OTP 6 số → **"Xác minh"** → `sendPhoneOtp` → `confirm` → `POST /auth/phone/link`. Sau khi verify hiện badge "Đã xác minh". Nút "Hoàn tất" **khóa** đến khi SĐT được xác minh.
  - **Họ và tên** — bắt buộc (prefill từ Google nếu có).
  - **Email** — bắt buộc, `keyboardType="email-address"` (prefill từ Google nếu có).
  - **Ảnh đại diện** — nút "Tải ảnh" (dùng `pickDeviceImage` + `POST /media` sẵn có để lấy `avatarMediaId`), có nút **"Bỏ qua"**, thumbnail khi đã chọn.
- **Card 2 — Đồng ý điều khoản** (checkbox tự dựng, `accessibilityRole="checkbox"`, `accessibilityState={{checked}}`):
  - ☑ (bắt buộc) "Tôi đã đọc và đồng ý với **Điều khoản & Chính sách** của LEOPARD."
  - ☑ (bắt buộc) "Cho phép LEOPARD xử lý dữ liệu cá nhân để thực hiện đơn hàng và cung cấp dịch vụ."
  - ☑ (tùy chọn) "Nhận thông tin ưu đãi, marketing từ LEOPARD."
  - ☑ (tùy chọn) "Cho phép chia sẻ dữ liệu cho đối tác thứ ba liên quan."
- **Nút "Hoàn tất"**: bật khi `name` không rỗng **và** email hợp lệ **và** SĐT đã xác minh **và** 2 consent bắt buộc đã tick → `PATCH /users/me` → cập nhật `sessionStore` → `router.replace('/customer/home')`.
- **Link phụ cuối trang**: "Đăng ký làm tài xế đối tác →" → `router.push('/(public)/driver-register')`.
- Xử lý lỗi qua `errorBox` (401 hết phiên, 409 email/SĐT trùng hoặc thiếu SĐT, 4xx khác theo API, còn lại mặc định) — theo khuôn `register.tsx`.

### 7.3. Đổi tên route đăng ký tài xế

- `app/(public)/register.tsx` → `app/(public)/driver-register.tsx` (giữ nguyên nội dung KYC).
- Cập nhật mọi tham chiếu `'/(public)/register'`: `login.tsx` `onNavigateRegister`, `OnboardingScreen` `onDriverRegister`, link ở customer-register. (Grep `(public)/register` toàn repo khi code để không sót.)

### 7.4. Session store

- Sau `PATCH /users/me` / `linkPhone` cập nhật lại state để `/customer/home` không bị điều hướng ngược. Cân nhắc lưu `profileComplete` (tối thiểu cập nhật ngay sau khi hoàn tất).

### 7.5. Test mobile

- unit: nút "Hoàn tất" bị vô hiệu khi thiếu tên/email/consent bắt buộc, hoặc (Google) SĐT chưa xác minh; bật khi đủ.
- unit: `login.tsx` điều hướng `/(public)/customer-register` khi `profileComplete=false`, theo role khi `true` — kiểm cả nhánh Google (qua `exchangeIdToken`).
- unit: prefill từ `GET /me` (Google ⇒ tên/email; OTP ⇒ SĐT khóa).

## 8. Ngoài phạm vi lần này (ghi nhận tương lai)

- **Trang địa chỉ** (`customer/address`): chọn địa chỉ hoặc xin quyền `expo-location`.
- **Mã giới thiệu (referral)**: cần cột + logic thưởng.
- Ràng buộc relation chặt cho `avatarMediaId`.
- Xác minh **email** (gửi link/OTP email) — v1 chỉ lưu, chưa verify.

## 9. Danh sách file chạm (dự kiến)

**Backend:**
- `apps/api/prisma/schema.prisma` (+ migration mới, có backfill `onboardedAt`)
- `apps/api/src/auth/providers/otp-provider.ts` (OtpIdentity + name)
- `apps/api/src/auth/providers/firebase-otp.provider.ts` (đọc claim name)
- `apps/api/src/auth/auth.service.ts` (AuthUser, serializeUser, upsertIdentityUser)
- `apps/api/src/users/` (module + controller + service + dto — mới)
- `apps/api/src/app.module.ts` (đăng ký UsersModule)
- e2e: `apps/api/src/users/*.e2e-spec.ts` (mới)

**Mobile:**
- `apps/mobile/app/(public)/login.tsx`
- `apps/mobile/app/(public)/customer-register.tsx` (mới)
- `apps/mobile/app/(public)/register.tsx` → `driver-register.tsx` (đổi tên)
- `apps/mobile/src/auth/LoginScreen.tsx`, `apps/mobile/src/features/auth/LoginScreen.tsx`
- `apps/mobile/src/features/onboarding/OnboardingScreen.tsx`
- (tùy) `apps/mobile/src/auth/session-store.ts`
- Test tương ứng.

## 10. Rủi ro & lưu ý

- **Backfill `onboardedAt`**: phải chạy trong cùng migration; nếu bỏ sót, toàn bộ user cũ sẽ bị kéo về trang đăng ký.
- **User Google trùng email/SĐT với tài khoản khác**: `linkPhone` trả 409 `PHONE_ALREADY_LINKED`; PATCH email trùng trả 409 — cần thông điệp rõ ràng, cho sửa lại.
- **reCAPTCHA trên customer-register**: web phone auth cần verifier riêng; đảm bảo `resetRecaptcha` khi lỗi/hủy.
- **Hai bản LoginScreen** (`src/auth` dùng thật qua `login.tsx`; `src/features/auth`): giữ đồng bộ chữ ký `onLoginSuccess`, xác định bản đang dùng để không sót.
- **SĐT luôn verified**: nhờ chỉ set qua OTP/linkPhone ⇒ `PATCH /users/me` không cần tự verify SĐT, chỉ cần kiểm `phone != null`.
