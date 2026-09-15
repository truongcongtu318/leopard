# LEOPARD — Hướng dẫn Deploy Demo & Bàn giao

Tài liệu này dành cho người triển khai (dev/ops) và phần cuối là thông tin gửi trực tiếp cho khách.

## 1. Yêu cầu hệ thống

| Hạng mục | Tối thiểu | Khuyến nghị |
|---|---|---|
| OS | Ubuntu 22.04+ / Debian 12+ | Ubuntu 24.04 |
| RAM | 3 GB | **4 GB** |
| Disk trống | 20 GB | **30 GB** |
| vCPU | 2 | **4** |
| Docker Engine | 24.0+ | mới nhất |
| Docker Compose | v2.20+ | mới nhất |
| buildx plugin | có | script tự cài nếu thiếu |

**Vì sao cần 4GB RAM / 30GB disk:** lần deploy đầu phải *build* 5 image (Next.js + 2 Expo Web + NestJS). Bước build này ngốn RAM và disk; VPS 1–2GB sẽ bị OOM giữa chừng, 16GB disk sẽ đầy.

**Về buildx:** các Dockerfile dùng `RUN --mount=type=cache` để giữ cache pnpm store và cache biên dịch Next/Metro. Cú pháp này chỉ chạy dưới BuildKit, mà BuildKit cần plugin buildx. Script `deploy-demo.sh` tự kiểm tra và tải buildx nếu thiếu (bước 1/6), nên bạn không cần làm gì thủ công. Nếu VPS không ra được GitHub, script sẽ báo rõ cách xử lý.

Đã kiểm chứng với gói **FPT PLAT CHEAP 4** (4 vCPU / 4GB / 30GB).

### Cài Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"   # đăng nhập lại để có hiệu lực
```

### Mở port

| Port | Dịch vụ |
|---|---|
| 80 | Gateway — trang portal gửi khách |
| 3000 | API + Swagger docs |
| 3002 | Admin Console |
| 8081 | Customer App |
| 8082 | Driver App |
| 22 | SSH |

Trên cloud (AWS/GCP/FPT…): mở thêm trong Security Group / Firewall. Kiểm tra firewall trên máy:

```bash
sudo ufw allow 80,3000,3002,8081,8082/tcp
```

> **Chỉ cần mở 22 và 80 nếu dùng tunnel HTTPS.** Các port app (3000/3002/8081/8082) và cổng edge 8888 chỉ cần thiết khi truy cập trực tiếp bằng IP; qua tunnel thì mọi thứ đi qua loopback. Mở ít port hơn = ít bề mặt tấn công hơn, và cũng tránh việc khách vào nhầm địa chỉ HTTP (nơi tính năng vị trí không chạy).

## 2. Deploy

```bash
# Nhánh mặc định của repo là `main`, KHÔNG chứa phần deploy này — phải chỉ định develop.
git clone -b develop <repo-url> leopard && cd leopard
./infra/scripts/deploy-demo.sh
```

Script tự động, theo 6 bước:

1. Kiểm tra Docker, Docker Compose, RAM.
2. Sinh `.env.prod` với secret ngẫu nhiên 32 byte (chỉ lần đầu).
3. Build 5 image.
4. Bật Postgres → chờ healthy → chạy `prisma migrate deploy`. Chỉ nạp dữ liệu demo khi database trống (lần deploy đầu) hoặc khi gọi `--reseed`.
5. Bật API/Admin/Customer/Driver/Gateway → chờ API healthy.
6. Smoke test 6 endpoint, in bảng link truy cập.

Nếu VPS có IP public không tự nhận diện đúng (ví dụ sau NAT), chỉ định thủ công:

```bash
PUBLIC_HOST=demo.leopard.vn ./infra/scripts/deploy-demo.sh
```

### Tùy chọn

| Lệnh | Tác dụng |
|---|---|
| `./infra/scripts/deploy-demo.sh` | Deploy / cập nhật (dùng cache image) |
| `... --rebuild` | Build lại image, bỏ qua cache |
| `... --reseed` | Nạp lại dữ liệu demo (có sao lưu trước). **Xoá tài khoản và đơn khách đã tạo** |
| `... --no-build` | Khởi động không build lại |
| `... --help` | Xem hướng dẫn |

## 2b. Bắt buộc: HTTPS (nếu không sẽ mất tính năng vị trí)

Chạy thêm một lần, sau khi deploy xong:

```bash
./infra/scripts/enable-https-tunnel.sh
```

**Vì sao bắt buộc:** trình duyệt chỉ cho dùng Geolocation API trên **secure origin** (HTTPS hoặc `localhost`). Truy cập bằng `http://<IP>` thì `navigator.geolocation.getCurrentPosition` trả lỗi ngay:

```
code: 1  "Only secure origins are allowed"
```

Hậu quả khi chạy HTTP — *không có thông báo lỗi nào*, chỉ là tính năng im lặng không chạy:

| Chỗ | Triệu chứng |
|---|---|
| App Customer — điểm lấy hàng | Ô địa chỉ trống, không tự điền "Vị trí hiện tại" |
| App Customer — nút GPS trong bản đồ | Không lấy được vị trí, địa chỉ cũ giữ nguyên |
| App Driver — watermark e-POD | Không có toạ độ thật |
| App Driver — nhận đơn | Tài xế không được dispatch vì thiếu vị trí trong 90 giây gần nhất |

Script làm 2 việc:

1. nginx trên VPS, cổng **8888** (chỉ loopback), đọc `infra/nginx/demo-edge.conf` — gom 4 app về **một origin**.
2. `cloudflared` quick tunnel → `http://localhost:8888`, chạy dưới systemd.

Kết thúc script in ra URL dạng `https://<tên-ngẫu-nhiên>.trycloudflare.com`:

| Ứng dụng | URL |
|---|---|
| **Demo Portal** (gửi khách link này) | `https://<tunnel>/` |
| Admin Console | `https://<tunnel>/login` |
| Customer App | `https://<tunnel>/customer/` |
| Driver App | `https://<tunnel>/driver/` |

> **Địa chỉ này đổi mỗi lần tunnel khởi động lại.** Đủ cho demo ngắn hạn; muốn link cố định cần domain + named tunnel (`cloudflared tunnel create`) hoặc Let's Encrypt trên domain thật.

## 3. Truy cập

Thay `<HOST>` bằng IP hoặc domain của VPS. **Địa chỉ nên gửi khách là URL HTTPS của tunnel** (mục 2b) — qua HTTP thì mọi tính năng vị trí đều không chạy.

| Ứng dụng | URL (HTTPS, khuyến nghị) | URL trực tiếp qua port |
|---|---|---|
| **Demo Portal** (gửi khách link này) | `https://<tunnel>/` | `http://<HOST>/` |
| Admin Console | `https://<tunnel>/login` | `http://<HOST>/login` |
| Customer App | `https://<tunnel>/customer/` | `http://<HOST>:8081/` |
| Driver App | `https://<tunnel>/driver/` | `http://<HOST>:8082/` |
| API + Swagger | `https://<tunnel>/docs` | `http://<HOST>:3000/docs` |

## 4. Tài khoản demo

Bản deploy **không hiện nút đăng nhập nhanh** trong app. Khách đăng nhập bằng số
điện thoại seed sẵn và mã OTP dùng chung của bản demo:

1. Nhập số điện thoại → bấm **Tiếp tục**
2. Nhập OTP `123456`

| Vai trò | Số điện thoại | OTP |
|---|---|---|
| Admin | `0900000004` | `123456` |
| Driver | `0900000002` | `123456` |
| Customer | `0900000001` | `123456` |

Không có SMS thật được gửi đi — `123456` là mã dùng chung, do
`AUTH_DEMO_LOGIN_ENABLED` + `ALLOW_DEMO_AUTH_PROVIDER` bật trong `.env.prod`.
Trang portal ở `http://<HOST>/` cũng liệt kê sẵn các số này kèm nút sao chép.

> Hệ thống pilot chỉ còn **3 vai trò**: Admin, Driver, Customer. Giao diện Fleet Owner đã được gỡ bỏ.

## 5. Kịch bản demo đề xuất

1. **Customer App** → `0900000001` + OTP `123456` → tạo đơn mới (chọn xe, điểm đón/trả).
2. **Driver App** → `0900000002` + OTP `123456` → bật duty → nhận đơn dispatch.
3. Driver chuyển trạng thái: **Accepted → Picking Up → In Transit → Delivered**, ký e-POD.
4. **Admin Console** → `0900000004` + OTP `123456` → xem đơn trên bản đồ real-time, doanh thu, người dùng.
5. Kiểm tra chi tiết đơn: giá, thanh toán, hoá đơn VAT.

Dữ liệu seed sẵn: 9 user, 6 driver profile, 56 đơn hàng, 2 đội xe. Có thể đặt đơn mới để test trọn luồng.

## 6. Vận hành

```bash
cd leopard

# Xem log tất cả / một service
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f api

# Trạng thái
docker compose --env-file .env.prod -f docker-compose.prod.yml ps

# Restart
docker compose --env-file .env.prod -f docker-compose.prod.yml restart

# Dừng (giữ dữ liệu)
docker compose --env-file .env.prod -f docker-compose.prod.yml down

# Dừng và xoá sạch dữ liệu
docker compose --env-file .env.prod -f docker-compose.prod.yml down -v

# Nạp lại dữ liệu demo (không mất schema)
./infra/scripts/deploy-demo.sh --reseed
```

### Kiến trúc container

Ba tunnel HTTPS, mỗi app một origin:

```
cloudflared (portal)    → :80    Gateway ─┬─ /            Landing portal
                                          ├─ /login       Admin Console
                                          ├─ /admin/      Admin Console (:3002)
                                          ├─ /_next/      tài nguyên Admin
                                          └─ /api/v1/     Admin BFF → API

cloudflared (customer)  → :8081  Customer App   (Expo Web + nginx)
cloudflared (driver)    → :8082  Driver App     (Expo Web + nginx)

Mỗi app container tự proxy /api/v1, /files, /socket.io → API, nên mọi app gọi
API same-origin, không cần CORS.

API           → :3000   (NestJS + Socket.IO)
                   │
                   ├── PostgreSQL + PostGIS (:5432, volume leopard-demo-data)
                   └── uploads/ (volume leopard-demo-uploads)
```

**Vì sao mỗi app một origin, không gộp theo đường dẫn:** bundle export của Expo tham chiếu `/_expo/static/js/web/entry-*.js` ở **gốc**, nên hai app không thể chung một host. Đã thử dùng `experiments.baseUrl` để gộp — **không dùng được**: app ghi cứng các route tuyệt đối như `/customer/home` (66 chỗ), còn Expo Router lại ghép prefix vào chính những path đó, nên sau khi đăng nhập app đi tới `/customer/customer/home` và hiện trang 404 của chính nó. Vì vậy mỗi app có tunnel riêng, phục vụ ở gốc.

**Vì sao Admin không cần tunnel riêng:** route của Next.js vốn đã tuyệt đối (`/login`, `/_next/`), nên ở chung host portal là đúng.

**Vì sao đứng sau proxy mà login Admin vẫn qua được kiểm tra CSRF:** `isSameOriginRequest` so `Origin` với origin suy ra từ `request.url`, mà Next.js dựng URL đó từ hostname lúc khởi động — trong container là `admin:3002`, không bao giờ khớp origin công khai. Hàm này đã được sửa để nhận thêm `X-Forwarded-Host` / `Host` do proxy gửi tới.

## 7. Xử lý sự cố

**Build bị kill / hết RAM**
```bash
dmesg | tail -20                       # tìm "Out of memory"
free -h
```
→ Nâng RAM hoặc thêm swap:
```bash
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
```

**Lỗi `the --mount option requires BuildKit` / `buildx component is missing`**
Script tự cài buildx, nhưng nếu VPS chặn GitHub:
```bash
# Cài thủ công
mkdir -p ~/.docker/cli-plugins
curl -fsSL -o ~/.docker/cli-plugins/docker-buildx \
  https://github.com/docker/buildx/releases/download/v0.37.1/buildx-v0.37.1.linux-amd64
chmod +x ~/.docker/cli-plugins/docker-buildx
docker buildx version
```
Hoặc gỡ các dòng `RUN --mount=type=cache` trong `infra/docker/*.Dockerfile` rồi build lại (mất cache, chậm hơn nhưng vẫn chạy).

**Port đã bị chiếm**
```bash
sudo ss -tlnp | grep -E ':(80|3000|3002|8081|8082)\b'
```
→ Đổi port trong `.env.prod` (`GATEWAY_PORT`, `API_PORT`, …) rồi deploy lại.

**API không healthy**
```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml logs --tail 80 api
```

**Không lấy được vị trí hiện tại (“định vị GPS” không ra gì, watermark e-POD ghi “Chưa có vị trí GPS”)**

Gần như luôn là đang truy cập qua HTTP. Kiểm tra ngay trong Console của trình duyệt:

```js
window.isSecureContext          // phải là true
navigator.geolocation.getCurrentPosition(console.log, console.error)
// qua HTTP sẽ trả: code 1, "Only secure origins are allowed"
```

→ Dùng URL HTTPS của tunnel (mục 2b), không dùng `http://<IP>:8081`.

Chú ý: trên HTTP API `navigator.geolocation` **vẫn tồn tại**, nên đừng kết luận "trình duyệt không hỗ trợ" — lỗi chỉ xuất hiện trong callback.

Dấu hiệu trong DB khi tài xế không ping được vị trí:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T postgres \
  psql -U leopard -d leopard -c \
  'select u.phone, dp.availability, dp."lastKnownAt",
          ST_Y(dp."lastKnownLocation"::geometry) lat, ST_X(dp."lastKnownLocation"::geometry) lng
   from "DriverProfile" dp join "User" u on u.id=dp."userId" order by dp."lastKnownAt" desc nulls last;'
```

`lastKnownAt` cũ (hoặc toạ độ trùng với `infra/seed/demo-manifest.json`) nghĩa là vị trí đang là dữ liệu seed, không phải GPS thật. Hệ quả: dispatch chỉ gửi đơn cho tài xế có vị trí trong **90 giây** gần nhất, nên tài xế sẽ không nhận được offer nào.

**Tunnel đổi URL / không lên**
```bash
systemctl status leopard-tunnel --no-pager
journalctl -u leopard-tunnel -n 40 | grep -E "trycloudflare|ERR"
```
QUIC (UDP 7844) bị chặn là bình thường — unit đã ép `--protocol http2`. Nếu vẫn lỗi, kiểm tra `curl -s -o /dev/null -w '%{http_code}' http://localhost:8888/` để tách lỗi tunnel khỏi lỗi nginx.

**Đăng nhập báo “Đăng nhập demo đang bị tắt” (403 `DEMO_LOGIN_DISABLED`)**

Demo auth mặc định chỉ chạy ở local/staging; bản deploy production phải bật cờ
xác nhận trong `.env.prod`:
```
AUTH_DEMO_LOGIN_ENABLED=true
ALLOW_DEMO_AUTH_PROVIDER=true
```
Thiếu dòng thứ hai thì API từ chối khởi động ngay (env schema bắt buộc). Nếu API
đang chạy mà vẫn 403 thì `.env.prod` chưa được nạp — chạy lại
`./infra/scripts/deploy-demo.sh`, script tự thêm cờ nếu thiếu.

**Migration lỗi**
```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml run --rm migrate
```

**Ảnh/POD không hiển thị**
`PUBLIC_FILES_BASE_URL` trong `.env.prod` phải là địa chỉ khách truy cập được:
```
PUBLIC_FILES_BASE_URL=http://<HOST>:3000
```
Sửa xong chạy lại script (script tự cập nhật biến này).

**Muốn deploy lại từ đầu**
```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml down -v
./infra/scripts/deploy-demo.sh --rebuild
```

## 8. Lưu ý về môi trường demo

- Đây là môi trường **demo/pilot**, không cấu hình cho production thật.
- Toàn bộ provider đang ở chế độ demo/local: map demo, OTP demo, payment demo, mail ghi ra console. **Không cần** Firebase, Vietmap, PayOS hay S3.
- Dữ liệu mô phỏng được gắn nhãn “Dữ liệu mô phỏng”, ETA luôn ghi “ETA dự kiến”.
- Upload (ảnh hàng hoá, chữ ký POD) lưu trong volume `leopard-demo-uploads` — còn dữ liệu khi restart, mất khi `down -v`.
- HTTP thuần, chưa có HTTPS. Nếu khách yêu cầu HTTPS, cần thêm domain + reverse proxy có TLS (Let's Encrypt).

## 9. Nội dung gửi khách

> Kính gửi Quý khách,
>
> Hệ thống LEOPARD demo đã sẵn sàng tại: **http://\<HOST\>/**
>
> Đăng nhập: nhập số điện thoại dùng thử, bấm **Tiếp tục**, rồi nhập mã OTP
> `123456` (mã dùng chung cho bản demo, không gửi SMS thật).
>
> | Vai trò | Số điện thoại | OTP |
> |---|---|---|
> | Quản trị viên | `0900000004` | `123456` |
> | Tài xế | `0900000002` | `123456` |
> | Khách hàng | `0900000001` | `123456` |
>
> Trang chủ http://\<HOST\>/ liệt kê sẵn các số này và có nút sao chép.
>
> Xin lưu ý đây là môi trường demo với dữ liệu mô phỏng, phục vụ mục đích trải nghiệm luồng nghiệp vụ.
