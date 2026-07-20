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

## Cấu trúc runtime dự kiến

```text
apps/web
apps/admin
apps/mobile
apps/api
packages/shared
packages/ui
packages/config
```

Docker, PostgreSQL/PostGIS, environment template và provider configuration chưa thuộc foundation. Credential thật không được commit.
