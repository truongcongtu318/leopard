# Spec: LEOPARD Full Web Deployment on VPS for Client Demo

- Date: 2026-03-24
- Status: Draft (Review)
- Target: Self-hosted VPS with Docker & Docker Compose

## 1. System Topology & Architecture

Hệ thống đóng gói chạy trên Docker Compose gồm 7 services (6 thường trực + 1 one-shot cho migration):

```
[Khách truy cập / Browser]
         │
         ▼
[Nginx Gateway :80 → container :8080] ─┬─ / ────────────> [Landing Demo Portal]
                                       ├─ /login        ─> [apps/admin (Next.js standalone)]
                                       ├─ /admin/       ─> [apps/admin]
                                       ├─ /_next/       ─> [apps/admin]
                                       └─ /api/v1/      ─> [apps/admin BFF] ─> [apps/api]

[Nginx :8081] ─ Customer App (Expo Web static, proxy /api/v1 + /socket.io) ─> [apps/api]
[Nginx :8082] ─ Driver App   (Expo Web static, proxy /api/v1 + /socket.io) ─> [apps/api]
                                                                                  │
                                                                                  ▼
                                                                   [PostGIS 17 Database :5432]
```

> **Điều chỉnh so với thiết kế ban đầu — hai app Expo không đi qua gateway.**
> Bản export của Expo tham chiếu bundle ở đường dẫn tuyệt đối
> `/_expo/static/js/web/entry-*.js`. Nếu phục vụ cả hai app sau cùng một origin
> (`/customer/`, `/driver/`), chúng sẽ tranh nhau prefix `/_expo/` và nginx chỉ
> trỏ được tới một app. Mỗi app vì vậy chạy ở gốc port riêng, nơi `/_expo/` phân
> giải đúng; portal trỏ thẳng tới port đó.

### Components

1. **`postgres`** (`postgis/postgis:17-3.5`):
   - Lưu trữ dữ liệu hệ thống + PostGIS index.
   - Volume: `leopard-demo-data`.

2. **`api`** (`apps/api`):
   - Build từ `infra/docker/api.Dockerfile` (Node 24.21.0 Alpine 3.24, pin cứng).
   - Expose port `3000`.
   - Cung cấp REST API (`/api/v1`), Swagger Docs (`/api/docs`), WebSocket Gateway (`/dispatch`, `/tracking`, `/notifications`).
   - Volume `leopard-demo-uploads` cho media/POD do `LocalStorageProvider` ghi ra.

2b. **`migrate`** (one-shot, `profiles: ["tools"]`):
   - Build từ cùng `api.Dockerfile` nhưng `target: builder`, vì Prisma CLI và seed
     script là dev-only dependency, không có trong runtime image.
   - Chạy `prisma migrate deploy` rồi `node --experimental-strip-types prisma/seed.ts`.
   - Không chạy khi `up`; deploy script gọi tường minh bằng `compose run --rm`.

3. **`admin`** (`apps/admin`):
   - Build từ `infra/docker/admin.Dockerfile` (Node 24 Alpine Next.js 16 runner).
   - Expose port `3002`.
   - BFF reverse-proxy `/api/v1` về backend `http://api:3000/api/v1`.

4. **`customer`** (`apps/mobile`):
   - Build từ `infra/docker/customer.Dockerfile` mới:
     - Stage 1 (Builder): Node 24 alpine build `pnpm --filter mobile export -p web` với `EXPO_PUBLIC_API_URL=/api/v1`.
     - Stage 2 (Runner): `nginx:alpine` phục vụ static files từ `dist/`, reverse proxy `/api/v1` và `/socket.io` về `http://api:3000`.
   - Expose port `8081`.

5. **`driver`** (`apps/driver`):
   - Build từ `infra/docker/driver.Dockerfile` mới:
     - Stage 1 (Builder): Node 24 alpine build `pnpm --filter driver export -p web` với `EXPO_PUBLIC_API_URL=/api/v1`.
     - Stage 2 (Runner): `nginx:alpine` phục vụ static files từ `dist/`, reverse proxy `/api/v1` và `/socket.io` về `http://api:3000`.
   - Expose port `8082`.

6. **`gateway`** (`infra/docker/gateway`):
   - Container Nginx port `80` (và `443` nếu có SSL).
   - Trang Portal chính `/`: Giao diện Bento sang trọng chứa 4 thẻ mở nhanh app (Admin, Customer, Driver, API Docs) kèm bảng thông tin đăng nhập mẫu 1-chạm sao chép.
   - Hỗ trợ cả 2 cách truy cập:
     - Theo port trực tiếp: `:3002`, `:8081`, `:8082`, `:3000`.
     - Theo subpath hoặc subdomain: `/admin/`, `/customer/`, `/driver/`, `/api/`.

## 2. Dữ liệu Demo & Tài khoản Seed sẵn

Dữ liệu mô phỏng theo `infra/seed/demo-manifest.json`: 9 user, 6 driver profile, 56 đơn hàng, 2 đội xe.

Giao diện chỉ còn **3 vai trò**: Admin, Driver, Customer. Giao diện Fleet Owner
(`apps/admin/src/app/(fleet)`, `src/features/fleet`) đã được gỡ bỏ; backend vẫn
giữ model `Fleet`/`FleetMember` và module `fleets` nên không cần thay đổi schema,
nhưng không có đường đăng nhập nào cấp role đó.

| Vai trò | Từ khoá đăng nhập | Quyền hạn |
|---|---|---|
| **Admin** | `admin` | Giám sát toàn hệ thống, tài xế, đội xe, rút tiền |
| **Driver** | `driver` | Cockpit tài xế, nhận đơn, cập nhật trạng thái, e-POD, ví |
| **Customer** | `customer` | Đặt đơn hàng, theo dõi thời gian thực, thanh toán, hoá đơn |

## 3. Tự động hóa Deploy (`infra/scripts/deploy-demo.sh`)

Script chạy tự động trên VPS, 6 bước:

1. `prerequisites`: Kiểm tra Docker, Docker Compose, Docker daemon, RAM; **cài buildx nếu thiếu** (các Dockerfile dùng `RUN --mount=type=cache` nên cần BuildKit).
2. `environment`: Sinh `.env.prod` với secret ngẫu nhiên 32 byte; tự dò `PUBLIC_HOST` và ghi lại `PUBLIC_FILES_BASE_URL` + `CORS_ORIGINS` theo host thật.
3. `build`: Build 5 image, tag theo `IMAGE_TAG` (mặc định = commit SHA ngắn).
4. `migrate`: Bật `postgres` → chờ healthy → `compose run --rm migrate` (migrate + seed).
5. `start`: `compose up -d --remove-orphans` → chờ API healthy.
6. `smoke`: Kiểm tra 6 endpoint, in bảng link truy cập và tài khoản demo.

Cờ: `--rebuild`, `--reseed`, `--no-build`, `--help`.

## 4. Kế hoạch Verification

1. Build cả 5 image từ cache sạch, không lỗi.
2. Chạy `docker-compose.prod.yml` cục bộ, kiểm tra:
   - Gateway trả về Landing Portal, và `/login` trả về trang đăng nhập Admin.
   - Admin đăng nhập được bằng `admin`.
   - Customer port 8081 load UI và gọi `/api/v1` không lỗi CORS (same-origin qua nginx proxy).
   - Driver port 8082 load Cockpit, kết nối Socket.IO qua `/socket.io/`.
   - Upload media/POD ghi được vào volume (user runtime sở hữu `/app/uploads`).
3. Kiểm tra `deploy-demo.sh` chạy sạch và idempotent.

## 5. Ghi chú triển khai (phát sinh trong quá trình làm)

Những điểm dưới đây không có trong thiết kế ban đầu và đã được xử lý khi implement:

| Phát hiện | Xử lý |
|---|---|
| Không có `.dockerignore` → context 27 GB (`.turbo` 13 GB, `.worktrees` 11 GB) | Thêm `.dockerignore` → còn **78.7 MB** |
| `api.Dockerfile` chưa từng build được: thiếu root `package.json` (`tsc`), chưa build `shared`/`validators`, thiếu `scripts/` và `infra/seed/`, `pnpm deploy` thiếu `--legacy` | Sửa hết |
| User runtime không ghi được `<cwd>/uploads` → upload ảnh/POD lỗi 500 | `install -d -o leopard` cho `/app/uploads` + volume |
| `pnpm deploy` không có Prisma CLI trong runtime image | Tách service `migrate` chạy từ builder stage |
| Expo export dùng `/_expo/` tuyệt đối → không thể phục vụ 2 app dưới subpath | Mỗi app một port riêng |
| Base image trôi (`node:24-alpine`) | Pin `node:24.21.0-alpine3.24`, `nginxinc/nginx-unprivileged:1.31-alpine` |
| nginx chạy root | Chuyển sang image unprivileged (uid 101); gateway listen 8080 trong container, map host 80 |
| Không có cache cho pnpm store / Next / Metro | Thêm `RUN --mount=type=cache`; script tự cài buildx |
| Image không có tag → không rollback được | `image: ...:${IMAGE_TAG:-dev}`, script set theo commit SHA |
