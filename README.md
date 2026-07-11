# LEOPARD

LEOPARD là nền tảng kết nối vận chuyển hàng hóa ở mức mini-production pilot. Customer tạo và theo dõi đơn, Driver nhận và thực hiện chuyến, Fleet Owner giám sát đội tài xế của mình, còn Admin vận hành toàn hệ thống.

Repository hiện ở giai đoạn đặc tả và thiết kế SDLC; chưa scaffold mã nguồn ứng dụng.

## Phạm vi pilot

- Customer mobile app/PWA theo mobile-first.
- Driver mobile app/PWA cho availability, nhận đơn, lifecycle và tracking.
- Fleet Owner Web Dashboard để xem fleet profile, drivers, orders, tracking và payment summary thuộc fleet.
- Admin Web Dashboard cô đọng cho users, fleets, drivers, orders, tracking, media và payment state.
- REST API và Socket.IO gateway có authorization theo role, ownership, assignment và fleet membership.
- PostgreSQL/PostGIS cho users, fleets, orders, stops, tracking, media, payments và audit.
- Vietmap, Firebase Phone Auth, S3-compatible storage và VietQR/payOS qua provider interface.
- Demo providers có dữ liệu xác định khi local hoặc thiếu credential được cho phép.
- ETA luôn là “ETA dự kiến”; demo ETA phải hiển thị rõ là dữ liệu mô phỏng.

Không thuộc phạm vi: multi-tenant, fleet management nhiều cấp, dispatch tự động, route optimization nhiều đơn, AI ETA, đối soát ngân hàng tự động, chia doanh thu, app store release/push notification nâng cao và SLA quy mô lớn.

## Tech stack

| Layer | Technology |
| --- | --- |
| Mobile | Expo/React Native hoặc Mobile PWA, TypeScript |
| Operations Web | Next.js, React, TypeScript, Tailwind CSS |
| Backend | NestJS, Prisma, TypeScript |
| Database | PostgreSQL + PostGIS |
| Realtime | Socket.IO / WebSocket |
| Maps | Vietmap với demo fallback có kiểm soát |
| OTP | Firebase Phone Auth hoặc demo provider |
| Storage | Local development, S3-compatible staging |
| Payment | VietQR/payOS hoặc demo provider |
| Local runtime | Docker Compose |

## Tài liệu nguồn

Đọc theo thứ tự:

1. [Vision và Scope](./docs/product/01-vision-and-scope.md)
2. [SRS](./docs/requirements/01-srs.md)
3. [User Stories](./docs/requirements/02-user-stories.md)
4. [System Architecture](./docs/architecture/01-system-architecture.md)
5. [Database Design](./docs/data/01-database-design.md)
6. [REST API Specification](./docs/api/01-rest-api-spec.md)
7. [UI Principles](./docs/ui/01-ui-principles.md)
8. [Development Process](./docs/development/04-definition-of-ready.md)
9. [Test Strategy](./docs/testing/01-test-strategy.md)
10. [Contributing](./CONTRIBUTING.md)

Toàn bộ tài liệu được tổ chức thành tám thư mục vật lý, tương ứng bảy nhóm SDLC đã duyệt: Product, Requirements, Architecture cùng Data/API, UI, Development và Testing. Data/API được tách thư mục để giữ file tập trung nhưng cùng thuộc nhóm System Design.

## Project structure

Structure khuyến nghị cho LEOPARD là monorepo tách theo runtime. Backend giữ business rules; mobile/web chỉ xử lý presentation, form state và cache.

```text
apps/
  api/                  # NestJS REST API, Socket.IO gateway, Prisma access
  mobile/               # Customer + Driver mobile app hoặc mobile-first PWA
  admin/                # Fleet Owner + Admin operations dashboard
  web/                  # Optional customer web/PWA nếu cần tách khỏi mobile

packages/
  shared/               # enums, DTO types, API contracts, constants
  validators/           # shared validation schemas nếu dùng chung client/server
  ui/                   # shared web UI primitives cho admin/web
  config/               # eslint, tsconfig, prettier, tailwind preset

infra/
  docker/               # Dockerfiles, compose fragments
  scripts/              # local/devops helper scripts
  seed/                 # deterministic demo seed assets

docs/
  product/
  requirements/
  architecture/
  data/
  api/
  ui/
  development/
  testing/
```

### Structure rules

- `apps/api` là nơi sở hữu pricing, ETA, order lifecycle, payment state, authorization và provider orchestration.
- `apps/mobile` ưu tiên Customer và Driver vì hai flow này cần mobile-first, tracking và thao tác nhanh.
- `apps/admin` chứa cả Fleet Owner và Admin dashboard; phân quyền quyết định bằng backend, không chỉ ẩn menu ở UI.
- `packages/shared` chỉ chứa code không phụ thuộc framework như enum `Role`, `OrderStatus`, `PaymentStatus`, error code và DTO type.
- `packages/ui` không chứa business rules; component phải nhận dữ liệu đã authorize từ API.
- `infra` không chứa secret thật; credential thật dùng environment variables hoặc secret manager.

## Trạng thái

- Bộ tài liệu mini-production pilot đã được thiết kế.
- Fleet Owner Lite đã nằm trong scope với quyền giới hạn theo `FleetMember`.
- Application code, package scripts, Docker Compose và environment template chưa được scaffold.
- Bước triển khai tiếp theo là dựng monorepo foundation theo [Local Setup](./docs/development/01-local-setup.md).
- Kế hoạch triển khai song song và prompt cho từng Codex session nằm tại [Multi-Agent Execution Guide](./docs/superpowers/README.md).

Các lệnh dự kiến sau khi scaffold:

```bash
pnpm install
pnpm db:up
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Nếu script chưa tồn tại, implementation task phải tạo hoặc ghi rõ verification gần nhất đã chạy. Không commit secret thật.

## Làm việc với agent

Mỗi task nên có Goal, Context, Constraints và Done when. Giữ task theo một story hoặc vertical slice; cập nhật tài liệu khi behavior thay đổi. Quy tắc chi tiết nằm trong [AGENTS.md](./AGENTS.md).

Git workflow dùng `feature/fix/docs branch → develop → main`. Không commit trực tiếp lên `develop` hoặc `main`; xem [CONTRIBUTING.md](./CONTRIBUTING.md) trước khi bắt đầu.

## License

Chưa chọn license. Không phân phối dự án như open source trước khi license được thêm chính thức.
