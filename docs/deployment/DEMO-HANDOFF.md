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
4. Bật Postgres → chờ healthy → chạy `prisma migrate deploy` + seed demo.
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
| `... --reseed` | Chỉ chạy lại migration + seed demo |
| `... --no-build` | Khởi động không build lại |
| `... --help` | Xem hướng dẫn |

## 3. Truy cập

Thay `<HOST>` bằng IP hoặc domain của VPS.

| Ứng dụng | URL |
|---|---|
| **Demo Portal** (gửi khách link này) | `http://<HOST>/` |
| Admin Console | `http://<HOST>/login` |
| Customer App | `http://<HOST>:8081/` |
| Driver App | `http://<HOST>:8082/` |
| API + Swagger | `http://<HOST>:3000/docs` |

## 4. Tài khoản demo

Tất cả dùng **Demo Login** — gõ thẳng từ khoá vào ô đăng nhập, không cần OTP.

| Vai trò | Gõ vào ô đăng nhập |
|---|---|
| Admin | `admin` |
| Driver | `driver` |
| Customer | `customer` |

Số điện thoại tương ứng cũng dùng được: `+840000000004` (admin), `+840000000002` (driver), `+840000000001` (customer).

> Hệ thống pilot chỉ còn **3 vai trò**: Admin, Driver, Customer. Giao diện Fleet Owner đã được gỡ bỏ.

## 5. Kịch bản demo đề xuất

1. **Customer App** → đăng nhập `customer` → tạo đơn mới (chọn xe, điểm đón/trả).
2. **Driver App** → đăng nhập `driver` → bật duty → nhận đơn dispatch.
3. Driver chuyển trạng thái: **Accepted → Picking Up → In Transit → Delivered**, ký e-POD.
4. **Admin Console** → đăng nhập `admin` → xem đơn trên bản đồ real-time, doanh thu, người dùng.
5. Kiểm tra chi tiết đơn: giá, thanh toán, hoá đơn VAT.

Dữ liệu seed sẵn: 9 user, 6 driver profile, 56 đơn hàng, 2 đội xe. Có thể đặt đơn mới để test trọn luồng.

## 6. Vận hành

```bash
cd leopard

# Xem log tất cả / một service
docker compose -f docker-compose.prod.yml logs -f
docker compose -f docker-compose.prod.yml logs -f api

# Trạng thái
docker compose -f docker-compose.prod.yml ps

# Restart
docker compose -f docker-compose.prod.yml restart

# Dừng (giữ dữ liệu)
docker compose -f docker-compose.prod.yml down

# Dừng và xoá sạch dữ liệu
docker compose -f docker-compose.prod.yml down -v

# Nạp lại dữ liệu demo (không mất schema)
./infra/scripts/deploy-demo.sh --reseed
```

### Kiến trúc container

```
Gateway (nginx unprivileged :8080 trong container → host :80)
├── /            → Landing portal
├── /login       → Admin Console
├── /admin/      → Admin Console (Next.js standalone :3002)
├── /_next/      → tài nguyên của Admin
└── /api/v1/     → Admin BFF → API

Customer App  → http://<HOST>:8081/   (Expo Web + nginx, proxy /api/v1 + /socket.io → API)
Driver App    → http://<HOST>:8082/   (Expo Web + nginx, proxy /api/v1 + /socket.io → API)
API           → http://<HOST>:3000/   (NestJS + Socket.IO)
                   │
                   ├── PostgreSQL + PostGIS (:5432, volume leopard-demo-data)
                   └── uploads/ (volume leopard-demo-uploads)
```

**Vì sao 2 app Expo không đi qua gateway:** bản export của Expo tham chiếu bundle ở đường dẫn tuyệt đối `/_expo/static/js/web/entry-*.js`. Nếu để cả hai sau cùng một origin, chúng sẽ tranh nhau prefix `/_expo/` và nginx chỉ trỏ được tới một app. Mỗi app vì vậy được phục vụ ở gốc port riêng của nó, nơi `/_expo/` phân giải đúng; portal trỏ thẳng tới port đó.

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
docker compose -f docker-compose.prod.yml logs --tail 80 api
```

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
docker compose -f docker-compose.prod.yml down -v
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
> Tài khoản dùng thử (gõ từ khoá vào ô đăng nhập):
>
> | Vai trò | Từ khoá |
> |---|---|
> | Quản trị viên | `admin` |
> | Tài xế | `driver` |
> | Khách hàng | `customer` |
>
> Xin lưu ý đây là môi trường demo với dữ liệu mô phỏng, phục vụ mục đích trải nghiệm luồng nghiệp vụ.
