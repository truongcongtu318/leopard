# LEOPARD Wave 3A Session Handoff — 2026-08-11

## Mục tiêu session

Đọc handoff `2026-08-09-wave-3a-continuation-prompt.md`, tiếp tục W3A-T00 và các task PH-08 tracking. Không stage, commit, push hoặc chuyển branch.

## Branch và nguyên tắc

- Branch: `codex/integration-wave-3`.
- HEAD khi session trước kết thúc: `8749d11` (không có commit mới).
- Working tree có nhiều thay đổi W3A/PH-08 và nhiều file docs/assets do user sở hữu; không reset hoặc dọn untracked files.
- Không bắt đầu Wave 3B.

## Đã hoàn tất

### W3A-T00 — shared/API/config/database

- Shared contracts mới trong `packages/shared/src/`: `errors.ts`, `media.ts`, `payment.ts`, `socket.ts`, `tracking.ts`, `transport-validation.ts`, `wave3-contracts.test.ts`; export qua `index.ts`.
- OpenAPI và API docs cập nhật tracking query/page, payment QR projection, media UUID, socket envelope, security và exact error codes:
  - `apps/api/openapi/openapi.yaml`
  - `apps/api/test/openapi-contract.spec.ts`
  - `docs/api/01-rest-api-spec.md`
  - `docs/api/02-socket-events.md`
  - `docs/api/03-error-codes.md`
- Config selectors và production safety trong `apps/api/src/config/env.schema.ts`, spec và `.env.example`:
  - `SOCKET_PROVIDER=in-memory`
  - `STORAGE_PROVIDER=local|s3`
  - `PAYMENT_PROVIDER=demo|payos|vietqr`
  - selector-specific production opt-in flags.
  - S3 endpoint production hardening: HTTPS, no credentials/fragments, reject loopback/link-local/metadata, mapped IPv6 và trailing-dot aliases.
- Prisma schema/migration/docs:
  - `apps/api/prisma/schema.prisma`
  - `apps/api/prisma/migrations/20260809000000_wave3_contract_data_preflight/migration.sql`
  - `apps/api/test/database-schema.spec.ts`
  - `docs/data/01-database-design.md`
  - Migration duy nhất của Wave 3A; preserve active payment index; normalize legacy UNPAID map placeholders; fail-fast invalid provider rows; add tracking accuracy, media checksum/request id, payment request/confirmation/audit fields.
- Seed compatibility trong `apps/api/prisma/seed.ts`, `apps/api/test/seed-determinism.spec.ts`, `infra/seed/demo-manifest.json`.
- Order creation khởi tạo PaymentIntent UNPAID với `provider: null` trong `apps/api/src/orders/orders.repository.ts`, có regression spec.
- Dependencies/lock cập nhật trong `apps/api/package.json` và `pnpm-lock.yaml` với exact pins cho AWS S3, Nest websocket, Socket.IO và `file-type`.

### PH-08-T02 — tracking REST persistence/history

Files chính trong `apps/api/src/tracking/`:

- `tracking.repository.ts`: parameterized PostGIS SQL, Order lock, active membership resolution, duplicate replay/conflict, atomic DriverProfile last-known update, deterministic history pagination.
- `tracking.service.ts`: policy reuse, rate limiter, malformed UUID handling, 404 concealment cho history foreign resources.
- `tracking.controller.ts`, `tracking.module.ts`, `tracking-response.mapper.ts` và specs.
- Real DB suite `tracking.repository.database.spec.ts` có explicit `LEOPARD_TRACKING_DB_TEST=true` gate.

Real PostGIS evidence: persistence/readback, atomic last-known, sequential/concurrent duplicate, conflict, rollback, inclusive UTC filtering và deterministic pagination đều pass.

### PH-08-T03 — authenticated tracking sockets

- `tracking.gateway.ts`: namespace `/tracking`, handshake auth, room `order:<uuid>`, join/leave/send-point events, stable ack errors, session expiry event, persist-before-broadcast.
- `socket-auth.adapter.ts`: verify access token, live refresh session, revoke/expiry và authoritative active user status.
- `tracking.events.ts`: deterministic persisted point event id và `occurredAt`.
- Gateway được đăng ký trong `tracking.module.ts`; không sửa AppModule.

### PH-08-T04 — order status event integration

- `apps/api/src/orders/order-events.publisher.ts`: in-process publisher/subscriber port.
- `UpdateOrderStatusService` tạo event từ persisted status-history id và publish chỉ sau transaction commit; idempotent replay không phát event; rollback không phát event.
- `OrdersModule` cung cấp/export publisher.
- `TrackingModule` import `OrdersModule`; gateway broadcast `order:status-updated` vào đúng order room.
- Tests mới:
  - `order-events.publisher.spec.ts`
  - `update-order-status.events.spec.ts`
  - mở rộng `tracking.gateway.spec.ts` với room status event và 100 local point latency test.

## Verification đã chạy

- Shared Wave 3 contract: 10 tests pass.
- Tracking/order scoped Jest gần nhất: 12 suites, 62 passed, 5 skipped.
- `git diff --check`: pass.
- ESLint scoped cho T03/T04: pass.
- Prisma format/validate, migration clean/upgrade/fail-fast, seed determinism và database-schema suite: pass từ session trước.
- Security/correctness review trước đó: không còn P0/P1 trong W3A diff sau các fix S3 endpoint, PaymentRecord/MediaRecord projection, order provider null và migration preflight.

## Blocker còn lại

1. `pnpm install --frozen-lockfile --offline` bị Windows `EPERM` khi unlink `apps/admin/node_modules/.bin/next.CMD`; install không hoàn tất.
2. `apps/api/node_modules` chưa có dependency mới `@nestjs/websockets` và `socket.io`, nên full real Socket.IO integration chưa chạy được. Gateway unit test đã dùng virtual test doubles và pass.
3. `pnpm --filter api typecheck` còn lỗi Prisma client generated cũ: thiếu nullable PaymentIntent provider và các field `clientRequestId`/`statusHistory`; đây là stale generated-client/environment issue, không có lỗi TypeScript mới trong tracking/event code.

## Session kế tiếp — checklist

1. Không reset/dọn working tree. Kiểm tra branch/status trước khi làm.
2. Giải quyết install dependency an toàn (nếu cần xin quyền network/escalation); chạy lại `pnpm install --frozen-lockfile`.
3. Chạy `prisma generate` bằng generated client mới; sau đó chạy `pnpm --filter api typecheck`, build và full API test.
4. Chạy real in-process Socket.IO suite với package thật; kiểm tra handshake missing/invalid/expired/revoked, cross-order denial, idempotent leave, ack không disconnect, no unauthorized room leakage.
5. Chạy migration/real DB gate với database disposable và `LEOPARD_TRACKING_DB_TEST=true`; kiểm tra không còn open handles.
6. Rà lại `TrackingModule`/`OrdersModule` wiring trong integration app trước khi tuyên bố PH-08-T04 full GREEN.
7. Chỉ sau khi PH-08 full gate pass mới cân nhắc PH-09 hoặc task tiếp theo theo execution plan.

## Git safety

- Không stage.
- Không commit.
- Không push.
- Không dùng `git reset --hard` hoặc `git checkout --`.
