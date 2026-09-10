# Local setup

Foundation workspace đã sẵn sàng cho shared packages. Runtime apps và local infrastructure sẽ được scaffold ở phase sau.

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

### 1. Khởi động Backend API

```bash
# Thiết lập biến môi trường từ .env.example
cp .env.example .env

# Chạy Docker Compose cho Postgres/PostGIS (nếu có) hoặc dùng database cục bộ
# Khởi động NestJS backend
pnpm --filter api start:dev
```

### 2. Khởi động Operations Web (Admin & Fleet Owner)

```bash
pnpm --filter admin dev
```

Truy cập tại `http://localhost:3002`.

### 3. Khởi động Customer Mobile App

```bash
pnpm --filter mobile start
# Hoặc chạy trên web browser để preview
pnpm --filter mobile web
```

### 4. Khởi động Standalone Driver Mobile App

Ứng dụng độc lập dành riêng cho tài xế (bundle `com.leopard.driver`, deep link scheme `leoparddriver://`):

```bash
pnpm --filter driver start
# Hoặc chạy trên web browser để preview
pnpm --filter driver web
```

> **Lưu ý xác thực:** Tài xế sử dụng tài khoản có role `DRIVER` được tạo từ flow đăng ký tài xế hoặc cấp bởi hệ thống. Màn hình login của app Driver tự động chặn các tài khoản không có quyền tài xế và cung cấp liên kết chuyển sang đăng ký tài xế.

Docker, PostgreSQL/PostGIS, environment template và provider configuration tuân thủ theo các tài liệu kiến trúc. Credential thật không được commit.
