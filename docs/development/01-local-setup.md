# Local setup

Repo hiện ở giai đoạn specification; cấu trúc implementation dự kiến:

```text
apps/web
apps/admin
apps/mobile
apps/api
packages/shared
packages/ui
packages/config
```

## Yêu cầu

- Node.js LTS và pnpm.
- Docker + Docker Compose.
- PostgreSQL có PostGIS qua container.

## Luồng setup dự kiến

```bash
pnpm install
cp .env.example .env
pnpm db:up
pnpm prisma:migrate
pnpm db:seed
pnpm dev
```

Local mặc định `AUTH_PROVIDER=demo`, `MAP_PROVIDER=demo`, `STORAGE_PROVIDER=local`, `PAYMENT_PROVIDER=demo`. Credential thật không được commit. Khi scaffold được tạo, README và tài liệu này phải cập nhật theo script thực tế.
