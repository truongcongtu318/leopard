# Hướng dẫn lấy credential để chạy LEOPARD ở mức production

Tài liệu này trả lời đúng một câu: **vào đâu, bấm gì, lấy giá trị nào, dán vào biến nào**.

Ký hiệu:

- 🔓 = giá trị công khai, được phép nằm trong bundle app / commit
- 🔒 = **bí mật** — không dán vào chat, không commit, chỉ để trong `.env.prod` trên VPS

Thứ tự làm đề xuất (theo mức chặn):

| # | Việc | Chặn cái gì | Thời gian |
|---|---|---|---|
| 1 | Domain + HTTPS thật | Tính năng vị trí (bắt buộc HTTPS) | 30 phút |
| 2 | Firebase (OTP thật) | Đăng nhập production | 1–2 giờ |
| 3 | Vietmap | Bản đồ + ETA thật | 15 phút |
| 4 | payOS | Thu tiền thật | 1–3 ngày (chờ duyệt) |
| 5 | S3 / R2 | Ảnh không mất khi xoá VPS | 30 phút |
| 6 | SMTP | Hoá đơn VAT qua email | 30 phút |

---

## 1. Domain + HTTPS thật

**Vì sao bắt buộc:** trình duyệt chỉ cho dùng Geolocation API trên HTTPS. Tunnel tạm đang dùng được nhưng URL đổi mỗi lần restart — không thể bàn giao production.

**Cần mua:** 1 domain (khuyến nghị `.vn` hoặc `.com`).

- Nhà bán VN: [Tenten](https://tenten.vn), [PA Vietnam](https://www.pavietnam.vn), [Mắt Bão](https://matbao.net)
- Quốc tế: [Namecheap](https://www.namecheap.com), [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/) (giá gốc, không lãi)

**Cần trỏ DNS:**

| Bản ghi | Tên | Giá trị |
|---|---|---|
| A | `demo` (hoặc `@`) | IP VPS |
| A | `api` | IP VPS |
| A | `app` | IP VPS |

Ví dụ sẽ có: `demo.leopard.vn`, `api.leopard.vn`, `app.leopard.vn`.

**Sau khi có DNS**, tôi dựng Let's Encrypt (miễn phí, tự gia hạn) bằng một lệnh:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d demo.leopard.vn -d api.leopard.vn -d app.leopard.vn
```

→ Lúc đó không cần tunnel nữa, link cố định, không phụ thuộc Cloudflare.

**Bạn cần làm:** mua domain + trỏ 3 bản ghi A về `161.248.147.18`, rồi báo tôi.

---

## 2. Firebase — OTP thật (thay mã demo)

Hiện tại đăng nhập dùng OTP demo (một mã dùng chung). Production phải gửi SMS thật.

### 2.1 Tạo project

1. Vào <https://console.firebase.google.com> → **Add project**
2. Đặt tên, ví dụ `leopard-production`. Ghi lại **Project ID** (dạng `leopard-production-a1b2c`) → 🔓 `FIREBASE_PROJECT_ID`

### 2.2 Bật Phone Authentication

1. **Build → Authentication → Get started**
2. Tab **Sign-in method → Add new provider → Phone → Enable → Save**
3. ⚠️ **Bắt buộc nâng lên gói Blaze** (trả theo dùng) để gửi SMS thật. Vào **Settings → Usage and billing → Modify plan → Blaze**, thêm thẻ.
   - SMS Việt Nam khoảng **1.000–1.500đ/tin**. Bật **billing budget alert** ở mức bạn chịu được.
4. **Authentication → Settings → SMS region policy**: thêm **Vietnam** vào danh sách cho phép (mặc định chặn).

### 2.3 Backend cần Service Account (🔒)

1. **Project settings** (bánh răng) → tab **Service accounts**
2. **Generate new private key** → **Generate key** → tải file JSON về
3. Đặt file lên VPS, **ngoài** thư mục repo:

```bash
scp ~/Downloads/leopard-production-*.json root@161.248.147.18:/etc/leopard/firebase-service-account.json
ssh root@161.248.147.18 'chmod 600 /etc/leopard/firebase-service-account.json'
```

4. Trong `.env.prod` trên VPS:

```
FIREBASE_PROJECT_ID=leopard-production-a1b2c
GOOGLE_APPLICATION_CREDENTIALS=/etc/leopard/firebase-service-account.json
AUTH_DEMO_LOGIN_ENABLED=false
ALLOW_DEMO_AUTH_PROVIDER=false
```

> **Tắt demo login chính là cách chuyển sang Firebase OTP.** Không có biến
> `AUTH_PROVIDER` nào được code đọc — backend chọn Firebase khi demo login tắt
> (`AUTH_DEMO_LOGIN_ENABLED=false`); nếu vẫn còn `true` thì mã demo vẫn được
> chấp nhận song song. Xem `apps/api/src/auth/auth.module.ts`.

> `.env.prod` đã bị gitignore. File JSON **tuyệt đối không** đặt trong repo.

### 2.4 App cần Web config (🔓) + VAPID key cho push

1. **Project settings → General → Your apps → Add app → Web** (biểu tượng `</>`)
2. Đặt nickname, **không** cần Hosting → **Register app**
3. Copy khối `firebaseConfig` → điền vào Dockerfile build args:

| Giá trị trong console | Biến môi trường | Ghi chú |
|---|---|---|
| `apiKey` | `EXPO_PUBLIC_FIREBASE_API_KEY` | 🔓 |
| `authDomain` | `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | 🔓 |
| `projectId` | `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | 🔓 |
| `storageBucket` | `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | 🔓 |
| `messagingSenderId` | `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | 🔓 |
| `appId` | `EXPO_PUBLIC_FIREBASE_APP_ID` | 🔓 |

4. Cho push notification (FCM): **Project settings → Cloud Messaging → Web Push certificates → Generate key pair** → 🔓 `EXPO_PUBLIC_FIREBASE_VAPID_KEY`

> ⚠️ `EXPO_PUBLIC_*` bị **inline vào bundle lúc build**, không đọc lúc chạy. Đổi giá trị phải rebuild image (customer/driver), không chỉ sửa `.env.prod`.

### 2.5 Cho app native (chỉ khi build iOS/Android thật)

1. **Add app → Android** → package name **`com.leopard.pilot`** → tải `google-services.json` → đặt vào `apps/mobile/`
2. **Add app → iOS** → bundle ID **`com.leopard.pilot`** → tải `GoogleService-Info.plist` → đặt vào `apps/mobile/`
3. Android: thêm **SHA-1 và SHA-256** của keystore (`cd android && ./gradlew signingReport`) vào **Project settings → Your apps → Android → Add fingerprint**

> Bước này chỉ cần khi phát hành app native. Bản web/PWA không cần.

### 2.6 Test số điện thoại (miễn phí SMS)

**Authentication → Sign-in method → Phone → Phone numbers for testing**: thêm số test với mã cố định. Số test **không tốn tiền** — dùng để kiểm thử trước khi mở cho khách thật.

Hướng dẫn chi tiết hơn (Google Sign-In, APNs): `docs/development/07-firebase-auth-setup.md`.

---

## 3. Vietmap — bản đồ + ETA thật

Hiện `MAP_PROVIDER=demo` nên khoảng cách/thời gian là dữ liệu mô phỏng. Giá cước tính theo đó ⇒ **sai tiền thật**.

1. Vào <https://maps.vietmap.vn> → **Đăng ký** (cần email + SĐT)
2. Đăng nhập → **Quản lý API key / Sản phẩm** → tạo key cho các dịch vụ:
   - **Search / Autocomplete** (tìm địa chỉ)
   - **Geocode / Reverse Geocode** (toạ độ ⇄ địa chỉ)
   - **Route / Routing** (đường đi + ETA)
3. Copy key → 🔒 `VIETMAP_API_KEY`
4. Sửa `.env.prod`:

```
MAP_PROVIDER=vietmap
VIETMAP_API_KEY=<key>
ALLOW_DEMO_PROVIDER=false
```

> `ALLOW_DEMO_PROVIDER=true` cùng key thật sẽ bị **API từ chối khởi động** — cố ý, vì nó biến sự cố Vietmap thành dữ liệu mô phỏng âm thầm (sai giá cước).

Có bản miễn phí giới hạn request/tháng; xem bảng giá để chọn gói.

---

## 4. payOS — thanh toán thật

> **Đây là mục có thời gian chờ lâu nhất.** payOS cần duyệt hồ sơ doanh nghiệp, thường **1–3 ngày làm việc**. Làm sớm.

1. Vào <https://payos.vn> → **Đăng ký**
2. Chuẩn bị hồ sơ: **Giấy phép kinh doanh**, CMND/CCCD người đại diện, **số tài khoản ngân hàng** đứng tên công ty
3. Gửi duyệt → chờ xác nhận
4. Sau khi duyệt: **Kênh thanh toán → Thông tin tích hợp** → lấy 3 giá trị:

| Trong console | Biến | Ghi chú |
|---|---|---|
| Client ID | 🔒 `PAYOS_CLIENT_ID` | |
| API Key | 🔒 `PAYOS_API_KEY` | |
| Checksum Key | 🔒 `PAYOS_CHECKSUM_KEY` | dùng để verify webhook |

5. Khai **Webhook URL** trỏ về hệ thống (cần domain HTTPS ở mục 1):

```
https://api.leopard.vn/api/v1/payments/webhook/payos
```

6. `.env.prod`:

```
PAYMENT_PROVIDER=payos
PAYOS_CLIENT_ID=...
PAYOS_API_KEY=...
PAYOS_CHECKSUM_KEY=...
```

**Nếu chưa có pháp nhân:** không đăng ký được payOS. Phương án thay thế: dùng **VietQR** (chuyển khoản + đối soát thủ công qua Admin) — hệ thống đã hỗ trợ `PAYMENT_PROVIDER=vietqr`.

---

## 5. S3 / object storage — ảnh không mất khi xoá VPS

Hiện `STORAGE_PROVIDER=local`: ảnh e-POD, ảnh hàng hoá, hoá đơn nằm **trên VPS**. Xoá volume hoặc hỏng VPS là mất hết bằng chứng giao hàng.

**Chọn 1 trong 3:**

| Nhà cung cấp | Ưu | Nhược |
|---|---|---|
| **Cloudflare R2** | Miễn phí 10GB, **không tính phí băng thông ra** | Cần tài khoản Cloudflare |
| **VNG Cloud vStorage** | Ở VN, hỗ trợ tiếng Việt, hoá đơn VAT | Trả phí |
| **AWS S3** | Phổ biến nhất | Tính phí băng thông ra |

**Ví dụ với Cloudflare R2** (rẻ nhất cho demo):

1. <https://dash.cloudflare.com> → **R2** → **Create bucket**, đặt tên `leopard-media`
2. **R2 → API → Manage API tokens → Create API token** → quyền **Object Read & Write**
3. Lấy: **Account ID** (ở cột phải trang R2) và **Access Key ID / Secret Access Key** vừa tạo

`.env.prod`:

```
STORAGE_PROVIDER=s3
S3_ACCESS_KEY_ID=<access key>
S3_SECRET_ACCESS_KEY=<secret>
S3_BUCKET=leopard-media
S3_REGION=auto
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
```

Với VNG Cloud hoặc AWS: thay `S3_REGION` / `S3_ENDPOINT` theo tài liệu nhà cung cấp (AWS dùng `ap-southeast-1`, có thể bỏ trống `S3_ENDPOINT`).

---

## 6. SMTP — gửi hoá đơn VAT và thông báo qua email

Hiện `MAIL_PROVIDER=console`: email chỉ được in ra log, **không gửi đi**.

**Cách nhanh nhất cho tên miền riêng — Resend:**

1. <https://resend.com> → đăng ký → **API Keys → Create**
2. **Domains → Add domain** → thêm domain của bạn → làm theo hướng dẫn thêm bản ghi DNS (SPF/DKIM)

`.env.prod`:

```
MAIL_PROVIDER=smtp
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=resend
SMTP_PASS=<API key>
MAIL_FROM=hoa-don@leopard.vn
```

**Hoặc Gmail (nhanh, giới hạn ~500 mail/ngày):**

1. Bật **xác thực 2 bước** cho tài khoản Google
2. Vào <https://myaccount.google.com/apppasswords> → tạo **App password** (16 ký tự)
3. `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER=<gmail>`, `SMTP_PASS=<app password>`

> Dùng Gmail thì email gửi từ địa chỉ Gmail, dễ vào spam và không phù hợp hoá đơn khách hàng — chỉ nên dùng để test.

---

## 7. Sau khi có credential

Gửi tôi danh sách đã có, tôi sẽ:

1. Cập nhật `.env.prod` trên VPS (giá trị bí mật do **bạn** dán, tôi không cần thấy)
2. Rebuild phần cần rebuild (`EXPO_PUBLIC_*` phải rebuild image)
3. Verify thật từng cái, không chỉ kiểm tra khởi động:
   - **Vietmap**: geocode một địa chỉ thật, so khoảng cách với Google Maps
   - **Firebase**: gửi OTP tới số thật, đăng nhập
   - **payOS**: tạo một giao dịch số tiền nhỏ, kiểm tra webhook về
   - **S3**: upload ảnh e-POD, tải lại từ URL S3
   - **SMTP**: gửi hoá đơn tới email thật, kiểm tra đã nhận

## Bảng tổng hợp biến môi trường

| Biến | Bí mật | Lấy ở đâu |
|---|---|---|
| `FIREBASE_PROJECT_ID` | 🔓 | Firebase Console |
| `GOOGLE_APPLICATION_CREDENTIALS` | 🔒 (file) | Service accounts → Generate key |
| `EXPO_PUBLIC_FIREBASE_*` | 🔓 | Firebase → Web app config |
| `EXPO_PUBLIC_FIREBASE_VAPID_KEY` | 🔓 | Cloud Messaging → Web Push |
| `VIETMAP_API_KEY` | 🔒 | maps.vietmap.vn |
| `PAYOS_CLIENT_ID` / `API_KEY` / `CHECKSUM_KEY` | 🔒 | payos.vn → Thông tin tích hợp |
| `S3_ACCESS_KEY_ID` / `SECRET_ACCESS_KEY` | 🔒 | R2 / VNG / AWS |
| `S3_BUCKET` / `REGION` / `ENDPOINT` | 🔓 | Như trên |
| `SMTP_HOST` / `PORT` / `USER` / `PASS` / `MAIL_FROM` | 🔒 | Resend / Gmail |
| `AUTH_DEMO_OTP` | 🔒 | Tự sinh — chỉ dùng khi demo |
