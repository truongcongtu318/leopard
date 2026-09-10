# Firebase Auth Setup Guide (Phone OTP + Google)

> Hướng dẫn thao tác trên Firebase/Google Cloud console để bật đăng nhập **Phone OTP** và **Google** cho LEOPARD.
> Liên quan: [spec](../superpowers/specs/2026-09-01-auth-identity-otp-google-driver-onboarding-design.md) · [plan](../superpowers/plans/2026-09-01-auth-identity-otp-google-driver-onboarding-plan.md).
>
> Ký hiệu: 🔓 = giá trị công khai (được đưa vào chat/commit) · 🔒 = **bí mật, KHÔNG dán vào chat, KHÔNG commit** (chỉ để ở file/EAS secret).

## 0. Bối cảnh — 3 mảnh ghép

| Mảnh | Dùng ở đâu | Cần gì |
|---|---|---|
| **Backend Admin SDK** | `apps/api` verify idToken | `FIREBASE_PROJECT_ID` + Service Account JSON |
| **Mobile native SDK** | `apps/mobile` gửi OTP/Google, sinh idToken | `google-services.json` (Android) + `GoogleService-Info.plist` (iOS) + Web client ID |
| **Xác minh thiết bị** | Để OTP/Google chạy trên máy thật | SHA-256 (Android) + APNs key (iOS) + billing Blaze |

Định danh app (đã cố định trong `apps/mobile/app.json`, phải khớp tuyệt đối khi khai báo):
- Android package: **`com.leopard.pilot`**
- iOS bundleIdentifier: **`com.leopard.pilot`**
- URL scheme: **`leopard`**

---

## Part A — Tạo Firebase project

1. Vào <https://console.firebase.google.com> → **Add project**.
2. Đặt tên (vd `leopard-pilot`). Google Analytics: tùy chọn (có thể tắt cho gọn).
3. Sau khi tạo, ghi lại **Project ID** (dạng `leopard-pilot-xxxxx`). → 🔓 `FIREBASE_PROJECT_ID`.

## Part B — Bật Phone Authentication

1. Firebase Console → **Build → Authentication → Get started**.
2. Tab **Sign-in method** → **Add new provider → Phone → Enable → Save**.
3. Mở mục **Phone numbers for testing** (trong màn Phone) → thêm vài số test, vd:
   - `+84 900 000 001` → mã `123456`
   - `+84 900 000 002` → mã `654321`
   > Số test **không tốn SMS** và luôn nhận mã cố định — dùng để dev/CI. Đây là cách test mà không cần billing.

## Part C — Bật Google Sign-In

1. Vẫn ở **Authentication → Sign-in method → Add new provider → Google → Enable**.
2. Chọn **Project support email** → Save.
3. Sau khi bật, Google tự tạo các OAuth client. Ta sẽ lấy **Web client ID** ở Part D.

## Part D — Đăng ký app + tải file cấu hình

### D1. Android
1. Firebase Console → **Project settings (⚙️) → General → Your apps → Add app → Android**.
2. **Android package name**: `com.leopard.pilot` (khớp `app.json`).
3. (Tùy chọn) App nickname: `LEOPARD Android`.
4. Bấm **Register app** → **Download `google-services.json`**.
5. Đặt file vào: `apps/mobile/google-services.json`. → 🔒 (không commit; sẽ nạp qua EAS/config plugin).

### D2. iOS
1. **Add app → iOS**.
2. **Apple bundle ID**: `com.leopard.pilot`.
3. **Register app** → **Download `GoogleService-Info.plist`**.
4. Đặt file vào: `apps/mobile/GoogleService-Info.plist`. → 🔒 (không commit).

### D3. Lấy Web client ID (cho Google Sign-In trên RN)
1. **Project settings → General**, kéo xuống danh sách apps, hoặc vào **Google Cloud Console → APIs & Services → Credentials**.
2. Tìm OAuth 2.0 Client ID loại **Web client (auto created by Google Service)**.
3. Copy chuỗi dạng `xxxxxxxx.apps.googleusercontent.com`. → 🔓 **Web client ID** (mobile cần cái này làm `webClientId`).

## Part E — Xác minh thiết bị (bắt buộc để OTP/Google chạy trên máy thật)

### E1. SHA fingerprints (Android)
Firebase cần SHA-1 **và** SHA-256 của keystore ký app, nếu không: Google Sign-In lỗi `DEVELOPER_ERROR`, Phone OTP không gửi tới máy thật.

- **Bản debug (dev client cục bộ):**
  ```bash
  keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
  ```
- **Bản build qua EAS:** EAS tạo/giữ keystore. Lấy SHA bằng:
  ```bash
  cd apps/mobile && eas credentials
  ```
  (chọn Android → xem keystore → copy SHA-256). Nếu phát hành qua Google Play, thêm cả SHA-256 của **Play App Signing** (Play Console → Setup → App signing).

Sau khi có SHA: Firebase Console → **Project settings → Your apps → (Android app) → Add fingerprint** → dán **cả SHA-1 và SHA-256**. Sau đó **tải lại `google-services.json`** (đã cập nhật) và thay vào `apps/mobile/`.

### E2. APNs (iOS) — cho Phone OTP im lặng
1. Apple Developer → tạo **APNs Auth Key (.p8)** (Keys → +, bật Apple Push Notifications service).
2. Firebase Console → **Project settings → Cloud Messaging → Apple app configuration → APNs Authentication Key → Upload** (kèm Key ID + Team ID).
> Thiếu bước này, Phone Auth iOS sẽ rơi về reCAPTCHA hoặc không gửi được mã trên máy thật.

## Part F — Service Account cho Backend (Admin SDK)

1. Firebase Console → **Project settings → Service accounts → Generate new private key** → tải file JSON.
2. Đặt file **ngoài repo** hoặc ở đường dẫn đã gitignore, ví dụ:
   - Local dev: `apps/api/secrets/firebase-service-account.json` (thêm `apps/api/secrets/` vào `.gitignore`).
3. → 🔒 **KHÔNG dán nội dung JSON vào chat, KHÔNG commit.** Đây là khóa cấp quyền admin project.

## Part G — Billing (Blaze)

1. Firebase Console → **⚙️ → Usage and billing → Details & settings → Modify plan → Blaze**.
2. Gắn thẻ. (Vẫn có quota free hằng ngày; số test ở Part B không tốn tiền.)
> Không bật Blaze → OTP tới số thật sẽ bị chặn khi vượt quota nhỏ của gói Spark.

---

## Cần cung cấp lại cho dev (tôi) — checklist bàn giao

**Đưa trực tiếp trong chat (an toàn, 🔓):**
- [ ] `FIREBASE_PROJECT_ID` (vd `leopard-pilot-xxxxx`).
- [ ] **Web client ID** (`...apps.googleusercontent.com`).
- [ ] Danh sách **số test + mã** đã tạo ở Part B.
- [ ] Xác nhận đã bật: Phone ✅, Google ✅, Billing Blaze ✅.

**Đặt vào file trong repo (KHÔNG dán nội dung, 🔒) — chỉ báo "đã đặt xong":**
- [ ] `apps/mobile/google-services.json` (đã gồm SHA ở Part E1).
- [ ] `apps/mobile/GoogleService-Info.plist`.
- [ ] `apps/api/secrets/firebase-service-account.json` (đã gitignore).

**Cấu hình env backend (`apps/api/.env`) — tôi sẽ thêm mẫu; bạn điền giá trị:**
```dotenv
FIREBASE_PROJECT_ID=leopard-pilot-xxxxx
GOOGLE_APPLICATION_CREDENTIALS=./secrets/firebase-service-account.json
```

> ⚠️ Nếu lỡ dán private key/service account vào chat hoặc commit → coi như lộ, phải **revoke key đó** trong Service accounts và tạo key mới.

---

## Definition of Done — thế nào là hoàn thành

Coi như setup xong khi **tất cả** đúng:

1. **Firebase console:** Phone + Google đều `Enabled`; có ≥1 số test; Blaze đã bật.
2. **Android app** đã đăng ký với package `com.leopard.pilot`, có **cả SHA-1 & SHA-256**; `google-services.json` mới nhất nằm ở `apps/mobile/`.
3. **iOS app** đã đăng ký bundle `com.leopard.pilot`; APNs key đã upload; `GoogleService-Info.plist` nằm ở `apps/mobile/`.
4. **Backend:** service account JSON đã đặt đúng path + gitignore; `.env` có `FIREBASE_PROJECT_ID` + `GOOGLE_APPLICATION_CREDENTIALS`.
5. **Kiểm chứng nhanh backend** (không cần thiết bị) — tôi chạy sau khi bạn đặt xong:
   ```bash
   cd apps/api && node -e "const a=require('firebase-admin');a.initializeApp({credential:a.applicationDefault(),projectId:process.env.FIREBASE_PROJECT_ID});console.log('admin init OK', a.app().options.projectId)"
   ```
   In ra `admin init OK <project-id>` = credentials hợp lệ.
6. **Kiểm chứng thiết bị** (sau khi mobile Phase 2 xong): nhập số test → nhận đúng mã cố định → vào app; đăng nhập Google không lỗi `DEVELOPER_ERROR`.

## Lưu ý quan trọng cho tiến độ

- Để **tôi code Phase 1 (backend auth)** thì **CHƯA cần** Firebase thật — tôi dùng fixture `AUTH_FIREBASE_TEST_TOKENS` (`apps/api/src/auth/auth.module.ts:41`). Bạn cứ setup song song.
- Firebase thật chỉ **bắt buộc** khi test OTP/Google trên thiết bị (Phase 2/7).
