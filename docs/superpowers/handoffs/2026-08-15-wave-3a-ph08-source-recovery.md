# LEOPARD — Wave 3A PH-08 Source Recovery & Restore (Session Handoff)

**Ngày:** 2026-08-15
**Branch:** `codex/integration-wave-3` (KHÔNG được chuyển branch)
**Nhiệm vụ:** Khôi phục các file source PH-08 (realtime tracking) bị mất khỏi working tree, rồi đưa `packages/shared` + `apps/api` về trạng thái typecheck xanh.

---

## 0. Bối cảnh & ràng buộc cứng (MUST NOT)

Working tree đang ở trạng thái **half-applied**: nhiều file Wave 3A (PH-08) đã bị mất khỏi disk nhưng vẫn còn được tham chiếu từ `app.module.ts`, `orders.module.ts`, `packages/shared/src/index.ts`. Nhiệm vụ là phục hồi đúng contract, không viết lại từ đầu một cách tuỳ tiện.

**TUYỆT ĐỐI KHÔNG:**
1. Không `git add` / `git commit` / `git push` / chuyển branch.
2. Không `git reset --hard` hoặc `git checkout --` (dùng `git cat-file -p HEAD:<path>` để đọc blob nếu cần).
3. Không xoá / dọn untracked files (user sở hữu nhiều docs/assets; `docs/`, `prompt.md`, `stitch-project.png`, `packages/brand/`, `packages/testkit/` là của user).
4. Không hand-edit `pnpm-lock.yaml` (chỉ sửa qua package manager).
5. Wave 3 = **backend-only**. KHÔNG đụng `apps/admin/**`, `apps/mobile/**`, web E2E/Playwright — đó là Wave 4.
6. Không kill process codegraph MCP / infrastructure.

---

## 1. Trạng thái hiện tại (đã khôi phục sẵn, ĐỪNG làm lại)

Các file này **đã được khôi phục** và tồn tại trên disk — kiểm tra chứ đừng tạo lại:

### 1a. Đã khôi phục từ HEAD (11 file, trước đó là `D` deleted)
- `apps/api/jest-database.config.cjs`
- `apps/api/src/auth/providers/firebase-admin.verifier.ts`
- `apps/api/src/config/env.schema.spec.ts`
- `apps/api/src/tracking/tracking-point.schema.ts`
- `apps/api/src/tracking/tracking-point.schema.spec.ts`
- `apps/api/src/tracking/tracking-rate-limiter.ts`
- `apps/api/src/tracking/tracking-rate-limiter.spec.ts`
- `apps/api/src/tracking/tracking.policy.ts`
- `apps/api/src/tracking/tracking.policy.spec.ts`
- `apps/api/test/real-db-race-gate.spec.ts`
- `apps/api/test/real-db-race-gate.ts`

### 1b. Đã khôi phục từ transcript (6 file, staged trong `.tmp-recovered/`)
Các file này đã được extract từ transcript JSONL và đang ở `.tmp-recovered/` với tên dạng `leopard_apps_api_src_<dir>_<file>.ts`. **Bước đầu tiên: copy chúng về đúng path.**

| File trong `.tmp-recovered/` | Đường dẫn đích |
|---|---|
| `leopard_apps_api_src_tracking_tracking.module.ts` | `apps/api/src/tracking/tracking.module.ts` |
| `leopard_apps_api_src_tracking_tracking.service.ts` | `apps/api/src/tracking/tracking.service.ts` |
| `leopard_apps_api_src_tracking_tracking.controller.ts` | `apps/api/src/tracking/tracking.controller.ts` |
| `leopard_apps_api_src_tracking_tracking.gateway.ts` | `apps/api/src/tracking/tracking.gateway.ts` |
| `leopard_apps_api_src_tracking_socket-auth.adapter.ts` | `apps/api/src/tracking/socket-auth.adapter.ts` |
| `leopard_apps_api_src_orders_order-events.publisher.ts` | `apps/api/src/orders/order-events.publisher.ts` |

> Nội dung đầy đủ của 6 file này cũng được lưu trong `.tmp-recovered-ph08.json` (map path → content). Nếu `.tmp-recovered/` bị xoá, đọc lại từ JSON đó.

---

## 2. Các file CÒN THIẾU — phải tạo mới đúng contract

Đây là phần quan trọng nhất. Các file dưới đây **không thể khôi phục** (không có trong HEAD, không có trong transcript `toolUseResult.file`) và phải **tạo lại đúng interface** mà consumer đang gọi.

### 2a. `packages/shared/src/tracking.ts` (MISSING — tạo mới)

Consumer: `apps/api/src/tracking/tracking.controller.ts` (import `parseTrackingPointQuery, type TrackingPointPage`), `apps/api/src/tracking/tracking.service.ts` (import `type TrackingPointDto, TrackingPointPage, TrackingPointQuery`).

Contract yêu cầu (theo `docs/superpowers/specs/2026-08-09-wave-3-delivery-design.md` §7 và `docs/api/01-rest-api-spec.md`):

```ts
// TrackingPointDto — phải khớp đúng field này (design §7)
interface TrackingPointDto {
  id: string;
  orderId: string;
  driverId: string;
  clientPointId: string;
  latitude: number;
  longitude: number;
  accuracyM?: number;
  capturedAt: string;   // ISO UTC
  createdAt: string;    // ISO UTC
}

// Page envelope chuẩn — reuse `Page<T>` từ './api.js'
type TrackingPointPage = Page<TrackingPointDto>;

// Query: from/to là ISO UTC timestamp; page/pageSize giới hạn ≤ 100
interface TrackingPointQuery extends PageQuery {
  from?: Date;
  to?: Date;
}
// Input dạng raw string (controller nhận Query strings)
interface TrackingPointQueryInput extends PageQueryInput {
  from?: string;
  to?: string;
}

export function parseTrackingPointQuery(input: unknown): TrackingPointQuery;
```

`parseTrackingPointQuery` phải:
- Parse `page`/`pageSize` qua `parsePageQuery` (đã có trong `./api.js`).
- Parse `from`/`to` bằng `Date.parse`; nếu invalid throw `TypeError`/`RangeError` (controller `parseQuery` trong tracking.controller.ts đang bắt `TypeError`/`RangeError` để map sang `BAD_REQUEST`).
- Sắp xếp deterministic theo `capturedAt DESC, id DESC` (do repository lo, nhưng query contract phải giữ `from/to` inclusive UTC).

### 2b. `packages/shared/src/socket.ts` (MISSING — tạo mới)

Consumer: `apps/api/src/tracking/tracking.gateway.ts` import:
`TrackingSocketEvent, type SocketAck, type SocketErrorCode, type JoinOrderPayload, type LeaveOrderPayload, type SendTrackingPointPayload`.

Contract (theo `docs/api/02-socket-events.md`):

```ts
// Event name constants — PHẢI khớp đúng chuỗi này
export const TrackingSocketEvent = {
  joinOrder: 'tracking:join-order',
  leaveOrder: 'tracking:leave-order',
  sendPoint: 'tracking:send-point',
  pointUpdated: 'tracking:point-updated',
  orderStatusUpdated: 'order:status-updated',
  sessionError: 'session:error',
} as const;
export type TrackingSocketEvent = (typeof TrackingSocketEvent)[keyof typeof TrackingSocketEvent];

// Ack envelope phân biệt
export type SocketAck<T = undefined> =
  | { ok: true; latestPoint?: T | null; point?: T }
  | { ok: false; error: { code: SocketErrorCode; message: string } };
// (xem cách gateway dùng: joinOrder trả {ok:true, latestPoint}, sendPoint trả {ok:true, point})

export type SocketErrorCode =
  | 'AUTH_REQUIRED'
  | 'SESSION_EXPIRED'
  | 'TRACKING_FORBIDDEN'
  | 'TRACKING_INVALID_POINT'
  | 'TRACKING_RATE_LIMITED'
  | 'TRACKING_ORDER_INACTIVE'
  | 'TRACKING_POINT_CONFLICT'
  | 'RESOURCE_NOT_FOUND'
  | 'PROVIDER_UNAVAILABLE';

export interface JoinOrderPayload { readonly orderId: string; }
export interface LeaveOrderPayload { readonly orderId: string; }
export interface SendTrackingPointPayload {
  readonly orderId: string;
  readonly clientPointId: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracyM?: number;
  readonly capturedAt: string;
}
```

> Chú ý: gateway gọi `ackError` trả `{ ok: false, error: { code: error.code as SocketErrorCode, ... } }` và `{ ok: false, error: { code: 'PROVIDER_UNAVAILABLE', ... } }`. Type `SocketAck` phải cho phép hai dạng ack trên typecheck đúng. Đọc kỹ `tracking.gateway.ts` để type khớp với cách dùng (`Promise<SocketAck<{...}>>`, `Extract<SocketAck, {ok:false}>`).

### 2c. `packages/shared/src/errors.ts` (MISSING — tạo mới)

Chỉ cần export tập stable error-code constants (được dùng bởi docs + là single-source-of-truth). Theo design §7/§13 + `docs/api/03-error-codes.md`:

```ts
export const TrackingErrorCode = {
  forbidden: 'TRACKING_FORBIDDEN',
  invalidPoint: 'TRACKING_INVALID_POINT',
  rateLimited: 'TRACKING_RATE_LIMITED',
  orderInactive: 'TRACKING_ORDER_INACTIVE',
  pointConflict: 'TRACKING_POINT_CONFLICT',
} as const;
export type TrackingErrorCode = (typeof TrackingErrorCode)[keyof typeof TrackingErrorCode];

// Cộng thêm các code Wave 3 ổn định khác nếu cần (payment/media)
export const PaymentErrorCode = {
  activeIntentConflict: 'PAYMENT_ACTIVE_INTENT_CONFLICT',
  providerFailed: 'PAYMENT_PROVIDER_FAILED',
} as const;
export type PaymentErrorCode = (typeof PaymentErrorCode)[keyof typeof PaymentErrorCode];
```

> Đây là file nhẹ; nội dung chính xác không bị consumer import trực tiếp (code dùng `DomainError` với string code inline). Tạo đủ để `index.ts` export không fail. Mở `docs/api/03-error-codes.md` để đồng bộ danh sách code.

### 2d. `packages/shared/src/media.ts` + `payment.ts` (MISSING — tạo stub tối thiểu)

Consumer hiện tại của PH-08 KHÔNG import hai file này. Chúng chỉ cần tồn tại để `index.ts` `export *` không fail. Tạo **stub tối thiểu đúng tên type** để typecheck shared qua, và ghi chú rõ PH-09 (media/payment full) là task riêng ngoài phạm vi recovery này.

Gợi ý tối thiểu (tham chiếu Prisma model `MediaObject` / `PaymentIntent` trong `apps/api/prisma/schema.prisma` và design §11/§13):

```ts
// media.ts
import type { MediaType, ProviderSource } from './enums.js';
export interface MediaObjectDto {
  id: string;
  orderId: string;
  type: MediaType;
  provider: ProviderSource;
  contentType: string;
  sizeBytes: number;
  clientRequestId?: string;
  createdAt: string;
}
export interface MediaUploadRequest { readonly clientRequestId: string; }

// payment.ts
import type { PaymentStatus, ProviderSource } from './enums.js';
export interface PaymentIntentDto {
  id: string;
  orderId: string;
  provider: ProviderSource | null;
  status: PaymentStatus;
  amountVnd: number;
  clientRequestId?: string;
  providerReference?: string;
  expiresAt?: string;
  createdAt: string;
}
```

> Nếu session được giao luôn PH-09, mở rộng đầy đủ theo `docs/superpowers/specs/2026-08-09-wave-3-delivery-design.md` §11–§14. Nếu chỉ recovery PH-08, giữ stub + comment `// PH-09: full contract (see delivery design §11–§14)`.

### 2e. `packages/shared/src/transport-validation.ts` (MISSING — tạo mới nếu cần)

Được nhắc trong handoff `2026-08-11-wave-3a-session-summary.md` là 1 trong các shared contract W3A-T00. Nếu `tracking.ts`/`socket.ts` tự chứa logic parse thì file này có thể chỉ là re-export helper. Kiểm tra xem còn file nào import `transport-validation.js` không; nếu không ai import, có thể bỏ khỏi `index.ts` hoặc tạo file rỗng với comment. **Ưu tiên: giữ `index.ts` compile xanh.**

### 2f. `packages/shared/src/domain/index.ts` (MISSING — tạo mới)

Re-export 6 file đang có trong `packages/shared/src/domain/`:

```ts
export * from './order/order-status.js';
export * from './order/order-state-machine.js';
export * from './order/order.constants.js';
export * from './payment/payment-status.js';
export * from './user/user-role.js';
export * from './vehicle/vehicle-type.js';
```

### 2g. `packages/shared/src/repositories/index.ts` (MISSING — tạo mới)

Thư mục `repositories/` đang trống. Tạo file rỗng (chỉ comment) để `export * from './repositories/index.js'` trong `index.ts` không fail:

```ts
// PH-09/PH-10: query-port types for authorized consumers will live here.
```

### 2h. `apps/api/src/tracking/tracking.repository.ts` (MISSING — tạo mới, quan trọng)

Consumer: `tracking.service.ts` gọi `this.repository.recordPointAtomically(...)`, `.findOrderAccess(...)`, `.findHistory(...)`, `.findLatestPoint(...)`. Đồng thời `tracking.module.ts` cung cấp `TrackingRepository` vào providers.

Contract yêu cầu (khớp với cách service gọi):

```ts
import type { TrackingPointInput } from './tracking-point.schema.js';
import type { TrackingOrderAccess } from './tracking.policy.js';
import type { TrackingPointDto, TrackingPointQuery } from '@leopard/shared';

@Injectable()
export class TrackingRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Record point + update DriverProfile.lastKnownLocation trong CÙNG transaction.
  // authorizeFn: (order: TrackingOrderAccess) => void — gọi assertCanSendTracking
  // rateLimitFn: () => void — gọi rateLimiter.consume
  recordPointAtomically(
    actorId: string,
    orderId: string,
    input: TrackingPointInput,
    authorize: (order: TrackingOrderAccess) => void,
    consumeRateLimit: () => void,
  ): Promise<unknown>; // trả về point (idempotent replay/conflict theo design §8)

  findOrderAccess(actorId: string, orderId: string): Promise<TrackingOrderAccess | null>;

  findHistory(orderId: string, query: TrackingPointQuery): Promise<TrackingPointPage>;

  findLatestPoint(orderId: string): Promise<TrackingPointDto | null>;
}
```

**Semantics bắt buộc (theo design §8 — Tracking Persistence and Delivery):**
- Unique `(orderId, clientPointId)` là idempotency boundary.
- Duplicate `clientPointId`: payload tương đương → trả persisted point; payload khác → `TRACKING_POINT_CONFLICT`.
- `capturedAt` không quá xa tương lai / không cũ hơn giới hạn (đã có ở `tracking-point.schema.ts`).
- Record point và update `DriverProfile.lastKnownLocation/lastKnownAt` cùng transaction.
- Lấy `TrackingOrderAccess` phải resolve `activeOwnerFleetIds` / `activeDriverFleetIds` từ `FleetMember` (status ACTIVE), phục vụ `assertCanViewTracking`/`assertCanSendTracking` trong `tracking.policy.ts`.
- Dùng parameterized PostGIS SQL cho `geography(Point,4326)` (model `TrackingPoint.location` là `Unsupported("geography(Point,4326)")`).
- `findHistory` sắp xếp deterministic `capturedAt DESC, id DESC`, `from/to` inclusive UTC, `pageSize ≤ 100`.

> Đọc `tracking.policy.ts` + `tracking-point.schema.ts` + `tracking.service.ts` (đã khôi phục) để khớp chính xác signature. Đọc `apps/api/src/orders/orders.repository.ts` để mượn pattern `$transaction` + parameterized query hiện có của project.

### 2i. `apps/api/src/tracking/tracking-response.mapper.ts` (MISSING — tạo mới)

Consumer: `tracking.service.ts` gọi `mapTrackingPoint(point)`.

```ts
import type { TrackingPointDto } from '@leopard/shared';

export function mapTrackingPoint(point: /* persisted TrackingPoint row */): TrackingPointDto {
  // location là geography — đọc lat/lng qua ST_X/ST_Y hoặc column đã select
  return {
    id: point.id,
    orderId: point.orderId,
    driverId: point.driverId,
    clientPointId: point.clientPointId,
    latitude: /* lat */,
    longitude: /* lng */,
    ...(point.accuracyM == null ? {} : { accuracyM: point.accuracyM }),
    capturedAt: point.capturedAt.toISOString(),
    createdAt: point.createdAt.toISOString(),
  };
}
```

> Vì `location` là `Unsupported("geography(Point,4326)")`, Prisma không select trực tiếp được toạ độ — repository phải dùng raw SQL `ST_X(location::geometry) AS longitude, ST_Y(...) AS latitude` và trả về shape chứa `latitude`/`longitude` để mapper đọc. Giữ mapper thuần (không có side effect).

### 2j. `apps/api/src/tracking/tracking.events.ts` (MISSING — tạo mới)

Consumer: `tracking.gateway.ts` gọi `sessionErrorEvent(code, message)` và `trackingPointEvent({ orderId, point })`.

Contract (theo `docs/api/02-socket-events.md` — flat envelope, `eventId` deterministic = persisted ID):

```ts
export function sessionErrorEvent(code: string, message: string): {
  eventId: string; occurredAt: string; code: string; message: string;
} {
  return { eventId: /* deterministic or uuid */, occurredAt: new Date().toISOString(), code, message };
}

export function trackingPointEvent(payload: { orderId: string; point: unknown }): {
  eventId: string; occurredAt: string; orderId: string; point: unknown;
} {
  // eventId = point.id (persisted), occurredAt = point.createdAt
  return { eventId: point.id, occurredAt: point.createdAt, orderId: payload.orderId, point: payload.point };
}
```

> `eventId` của point-updated = persisted point id; của order-status-updated = status-history id (xem `order-events.publisher.ts` đã khôi phục). Khớp lại kiểu để gateway typecheck đúng.

### 2k. `apps/api/src/auth/session-authenticator.ts` (KHÔNG bắt buộc — bỏ qua)

Design §9 đề xuất tách `SessionAuthenticator.authenticateAccessToken`, nhưng **`socket-auth.adapter.ts` (đã khôi phục) đã inline logic** (dùng trực tiếp `TokenService.verifyAccessToken` + `PrismaService`). Không file nào import `session-authenticator.js`. → **Không cần tạo.** Chỉ tạo nếu muốn refactor để khớp design; ngược lại bỏ qua, tránh dead code.

---

## 3. Thứ tự thực hiện (step-by-step)

1. **Copy 6 file từ `.tmp-recovered/` về đúng path** (bảng ở §1b). Tạo thư mục `apps/api/src/tracking/` nếu chưa có.
2. **Tạo các shared contract còn thiếu** (§2a–§2g) trong `packages/shared/src/`. Đặc biệt `tracking.ts` + `socket.ts` phải khớp đúng tên export mà consumer import.
3. **Tạo 3 file tracking còn thiếu** (§2h–§2j): `tracking.repository.ts`, `tracking-response.mapper.ts`, `tracking.events.ts`.
4. **Tạo stub media/payment** (§2d) nếu chưa có.
5. **Relink node_modules nếu cần** — kiểm tra `@nestjs/websockets`, `socket.io`, `argon2` resolve được (xem §5).
6. **Chạy typecheck** (§6) và sửa lỗi còn lại cho tới xanh.
7. **Dọn temp artifacts** (xem §7).

---

## 4. Dependency graph (để không sót import)

```
app.module.ts ──> TrackingModule (tracking.module.ts)
tracking.module.ts ──> AuthModule, DatabaseModule, OrdersModule
                       TrackingController, TrackingService, TrackingGateway,
                       TrackingRateLimiter, TrackingRepository, SocketAuthAdapter

tracking.controller.ts ──> parseTrackingPointQuery, TrackingPointPage (@leopard/shared)
                           CurrentUser, RequireRoles, AccessTokenGuard, RoleGuard, ApiExceptionFilter
tracking.service.ts ──> TrackingPointDto/Page/Query (@leopard/shared)
                        tracking.policy, tracking-point.schema, tracking-rate-limiter,
                        TrackingRepository, mapTrackingPoint (mapper)
tracking.gateway.ts ──> TrackingSocketEvent/SocketAck/... (@leopard/shared)
                        SocketAuthAdapter, tracking.events (sessionErrorEvent/trackingPointEvent),
                        TrackingService, OrderEventsPublisher (@orders)
tracking.policy.ts ──> @prisma/client (OrderStatus, Role), AuthenticatedActor, DomainError
tracking-point.schema.ts ──> zod, DomainError
tracking-rate-limiter.ts ──> DomainError

orders.module.ts ──> OrderEventsPublisher (order-events.publisher.ts)
update-order-status.service.ts ──> OrderEventsPublisher, OrderStatusChangedEvent
```

---

## 5. Node modules (đã gần xong, chỉ xác nhận)

Trước đây đã:
- Tạo symlink top-level `apps/api/node_modules/@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`.
- Chưa tạo symlink `argon2` (store entry có sẵn tại `node_modules/.pnpm/argon2@0.44.0`).

Nếu typecheck báo `Cannot find module 'argon2'`, tạo:
```
apps/api/node_modules/argon2 → ../../../node_modules/.pnpm/argon2@0.44.0/node_modules/argon2
```
(dùng `fs.symlinkSync(to, from, 'junction')` trên Windows).

Xác nhận bằng: `node -e "require.resolve('@nestjs/websockets', {paths:['apps/api']}); require.resolve('socket.io', {paths:['apps/api']})"`.

---

## 6. Verification

```bash
# 1. Shared contracts
pnpm --filter shared typecheck        # hoặc tsc -p packages/shared/tsconfig.json --noEmit
pnpm --filter shared test             # contracts.test.ts phải pass (10 tests)

# 2. API typecheck (mục tiêu chính)
pnpm --filter api typecheck

# 3. API tests (nếu DB/env cho phép)
pnpm --filter api test                # tracking/order scoped suites

# 4. Prisma generate trước khi typecheck (stale client đã được nhắc trong handoff 2026-08-11)
pnpm --filter api exec prisma generate
```

**Tiêu chí xong:** `packages/shared` compile sạch + `apps/api` typecheck không còn lỗi nào bắt nguồn từ file tracking/order-events bị thiếu. (Lỗi `argon2` link hoặc stale Prisma client là environment issue, xử lý ở §5 + `prisma generate`, không phải bug code mới.)

---

## 7. Dọn temp artifacts (sau khi xong)

Các file/đường dẫn tạm được tạo trong quá trình điều tra — xoá an toàn (không nằm trong repo user sở hữu):
- `.tmp-recovered/` (đã copy xong 6 file)
- `.tmp-recovered2/`
- `.tmp-recovered-ph08.json`
- `.tmp-recover-codegraph.cjs`, `.tmp-recover2.cjs`, `.tmp-inventory.cjs`
- `.tmp-lockgen/`
- `.tmp-codex-probe.cjs`, `.tmp-codex-search.cjs`
- `schema-gen.tmp.prisma` (cả ở root và `apps/api/prisma/schema-gen.tmp.prisma`)

> Chỉ xoá các file `.tmp-*` ở trên. KHÔNG xoá `docs/`, `prompt.md`, `stitch-project.png`, `packages/brand/`, `packages/testkit/`, `.stitch/`, `.playwright-mcp/`.

---

## 8. Tài liệu tham chiếu (đọc khi cần)

- `docs/superpowers/specs/2026-08-09-wave-3-delivery-design.md` — §7 Tracking Contract, §8 Persistence, §9 Socket Auth, §10 Order Event.
- `docs/superpowers/plans/2026-08-09-wave-3a-execution-plan.md` — PH-08-T01..T04 RED/GREEN.
- `docs/api/01-rest-api-spec.md`, `docs/api/02-socket-events.md`, `docs/api/03-error-codes.md`.
- `docs/superpowers/handoffs/2026-08-11-wave-3a-session-summary.md` — danh sách file PH-08-T02/T03/T04 đã từng tồn tại.
- Prisma: `apps/api/prisma/schema.prisma` (model `TrackingPoint`, `DriverProfile`, `FleetMember`, `OrderStatusHistory`, `RefreshSession`).
- Pattern tham chiếu: `apps/api/src/orders/orders.repository.ts` (PostGIS/parameterized query + `$transaction`), `apps/api/src/auth/token.service.ts` (`verifyAccessToken`).

---

## 9. Lưu ý về tính đúng đắn

- **Không tự bịa contract.** Mọi interface của file tạo mới phải khớp đúng cách consumer (đã khôi phục) gọi. Nếu consumer import tên khác, sửa theo consumer — consumer là source of truth đã được verify.
- `tracking.policy.ts` mong đợi `TrackingOrderAccess` có đủ `id, status, customerId, driverId, activeOwnerFleetIds, activeDriverFleetIds` — repository phải cung cấp đủ các field này khi resolve order access.
- Giữ immutability (không mutate object), error handling tường minh (`DomainError`), validate ở biên (schema). Khớp style chung của project.
