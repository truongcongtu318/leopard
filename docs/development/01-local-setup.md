# Local setup

Foundation workspace đã sẵn sàng cho shared packages và các ứng dụng runtime trong monorepo.

## Yêu cầu

- Node.js 24 LTS.
- Corepack, dùng pnpm được pin trong `package.json`.

## Cài đặt và kiểm tra foundation

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

CI chạy đúng các lệnh quality này cho pull request vào `develop` và `main`.

## Cấu trúc runtime ứng dụng
 
```text
apps/api             # NestJS REST API & Realtime Gateway
apps/admin           # Operations Web Dashboard (Fleet Owner & Admin)
apps/mobile          # Customer Mobile App (Expo)
apps/driver          # Standalone Driver Mobile App (Expo, bundle com.leopard.driver)
packages/shared      # Shared DTOs, Enums, Contracts
packages/validators  # Zod validation schemas
packages/mobile-core # Shared mobile theme, UI, auth session, API client
packages/ui          # Shared web UI components
packages/config      # Shared configs (ESLint, TS, Prettier)
```

## Chạy các ứng dụng cục bộ

### 1. Khởi động Backend API (Port 3000)

```bash
# Thiết lập biến môi trường từ .env.example
cp .env.example .env

# Chạy Docker Compose cho Postgres/PostGIS (nếu có) hoặc dùng database cục bộ
# Khởi động NestJS backend
pnpm --filter api start:dev
```

Truy cập REST API tại `http://localhost:3000/api/v1`.

### 2. Khởi động Operations Web (Port 3002)

```bash
pnpm --filter admin dev
```

Truy cập Admin & Fleet Owner Dashboard tại `http://localhost:3002`.

### 3. Khởi động Customer Mobile App (Port 8081)

Mặc định chạy trên Metro port **`8081`**:

```bash
pnpm --filter mobile start
# Hoặc chạy trên web browser để preview (http://localhost:8081)
pnpm --filter mobile web
```

### 4. Khởi động Standalone Driver Mobile App (Port 8082)

Ứng dụng độc lập dành riêng cho tài xế (bundle `com.leopard.driver`, deep link scheme `leoparddriver://`), mặc định chạy trên Metro port **`8082`** (đã cấu hình sẵn CORS trong `.env.example`):

```bash
pnpm --filter driver start
# Hoặc chạy trên web browser để preview (http://localhost:8082)
pnpm --filter driver web
```

> **Lưu ý xác thực:** Tài xế sử dụng tài khoản có role `DRIVER` được tạo từ flow đăng ký tài xế hoặc cấp bởi hệ thống. Màn hình login của app Driver tự động chặn các tài khoản không có quyền tài xế và cung cấp liên kết chuyển sang đăng ký tài xế.

Docker, PostgreSQL/PostGIS, environment template và provider configuration tuân thủ theo các tài liệu kiến trúc. Credential thật không được commit.
