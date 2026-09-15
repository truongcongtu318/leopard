# Spec: LEOPARD Full Web Deployment on VPS for Client Demo

- Date: 2026-03-24
- Status: Draft (Review)
- Target: Self-hosted VPS with Docker & Docker Compose

## 1. System Topology & Architecture

Hệ thống đóng gói chạy trên Docker Compose gồm 6 services:

```
[Khách truy cập / Browser]
         │
         ▼
[Nginx Gateway :80] ───────────────┬─ / ──────────> [Landing Demo Portal]
                                   ├─ :3002 (/admin)───> [apps/admin (Next.js 16)]
                                   ├─ :8081 (/customer)─> [apps/mobile (Expo Web)]
                                   ├─ :8082 (/driver)──> [apps/driver (Expo Web)]
                                   └─ :3000 (/api) ────> [apps/api (NestJS)]
                                                               │
                                                               ▼
                                                    [PostGIS 17 Database :5432]
```

### Components

1. **`postgres`** (`postgis/postgis:17-3.5`):
   - Lưu trữ dữ liệu hệ thống + PostGIS index.
   - Volume: `leopard-postgres-data`.

2. **`api`** (`apps/api`):
   - Build từ `infra/docker/api.Dockerfile` (Node 24 Alpine).
   - Expose port `3000`.
   - Cung cấp REST API (`/api/v1`), Swagger Docs (`/api/docs`), WebSocket Gateway (`/dispatch`, `/tracking`, `/notifications`).

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

Dữ liệu mô phỏng theo `infra/seed/demo-manifest.json` gồm xe, đơn hàng, tuyến đường mẫu:

| Vai trò | Số điện thoại | Cơ chế đăng nhập | Quyền hạn |
|---|---|---|---|
| **Admin** | `+840000000004` | Demo Login (1 click) hoặc OTP `123456` | Giám sát toàn hệ thống, tài xế, đội xe |
| **Fleet Owner** | `+840000000003` | Demo Login (1 click) hoặc OTP `123456` | Quản trị đội xe, đơn hàng của đội |
| **Driver** | `+840000000002` | Demo Login (1 click) hoặc OTP `123456` | Cockpit tài xế, nhận đơn, e-POD |
| **Customer** | `+840000000001` | Demo Login (1 click) hoặc OTP `123456` | Đặt đơn hàng, theo dõi thời gian thực |

## 3. Tự động hóa Deploy (`deploy.sh`)

Script chạy tự động trên VPS:
1. `validate_prerequisites`: Kiểm tra Docker, Docker Compose, Port khả dụng.
2. `setup_env`: Tạo file `.env` từ `.env.example` với random secret 32-byte an toàn.
3. `start_database`: Bật `postgres`, đợi healthcheck pass.
4. `run_migrations_and_seed`: Chạy `prisma migrate deploy` và `node prisma/seed.ts`.
5. `build_and_start_services`: `docker compose -f docker-compose.prod.yml up -d --build`.
6. `healthcheck`: Kiểm tra HTTP 200/302 cho cả 4 services.
7. `print_handoff_summary`: Xuất link truy cập, hướng dẫn test và tài khoản demo để gửi trực tiếp cho đối tác.

## 4. Kế hoạch Verification

1. Build thử nghiệm Dockerfile `customer` và `driver` đảm bảo build xanh 100%.
2. Chạy thử `docker-compose.prod.yml` cục bộ, kiểm tra:
   - Gateway port 80 trả về Landing Portal.
   - Admin port 3002 đăng nhập thành công role Admin/Fleet Owner.
   - Customer port 8081 load UI, gọi API `/api/v1` không lỗi CORS.
   - Driver port 8082 load Cockpit, nhận đơn qua Socket.IO.
3. Kiểm tra script `deploy.sh` chạy sạch, idempotent.
