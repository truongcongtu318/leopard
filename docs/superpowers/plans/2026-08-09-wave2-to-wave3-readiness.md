# LEOPARD Backend Wave 2 to Wave 3 Readiness

**Updated:** 2026-08-09
**Scope:** Backend Wave 2 remediation and Wave 3A entry gate
**Current baseline reference:** `origin/develop` at `ae8e5a5`

## 1. Goal

Hoàn tất các phần còn thiếu của Backend Wave 2, tái lập toàn bộ verification trên một baseline sạch và chỉ mở Wave 3 khi không còn blocker production, security hoặc acceptance criteria thuộc phạm vi Wave 2.

## 2. Current Status

| Phase / Task | Current assessment | Remaining work |
| --- | --- | --- |
| PH-05-T01..T04 Auth and Access | Implemented, chưa đóng gate | Firebase production verifier và startup secret validation |
| PH-05-T05 Client Login | Đã merge, ngoài phạm vi remediation BE chính | Chỉ chạy regression khi auth contract thay đổi |
| PH-06-T01..T06 Order and Driver | Implemented, còn gap | Admin audit, validation 422, delayed idempotency, real-DB gate |
| PH-07-T01..T04 Map/Pricing/ETA | Implemented, còn gap | Production env, Customer-only estimate authorization |
| PH-13-T02 Seed and Migration | Implemented, có evidence lịch sử | Chạy lại trên database sạch và upgrade path |
| Wave 2 integration gate | Chưa đạt | Full verification và cập nhật baseline registry |

Không dùng working tree hiện tại làm baseline Wave 3 nếu nó chưa ở `develop` sạch. Tạo remediation branch/worktree mới từ baseline `develop` đã đồng bộ.

## 3. Mandatory Remediation Before Wave 3

### W2-R01: Production Runtime Configuration

**Goal:** API khởi động ổn định trong production và fail-fast khi thiếu cấu hình bắt buộc.

**Files likely involved:**

- `.env.example`
- `compose.yaml`
- `apps/api/src/config/env.schema.ts`
- `apps/api/src/maps/maps.module.ts`
- Auth, pricing và estimate-token configuration tests

**Required changes:**

- Khai báo và validate `AUTH_ACCESS_TOKEN_SECRET`.
- Khai báo và validate `AUTH_REFRESH_TOKEN_SECRET`.
- Khai báo và validate `ESTIMATE_TOKEN_HMAC_SECRET` với độ dài tối thiểu phù hợp.
- Khai báo và validate `PRICING_MINIMUM_FARE_VND`.
- Khai báo và validate `PRICING_STOP_SURCHARGE_VND`.
- Khai báo và validate `PRICING_VEHICLE_RATES_JSON`.
- Khi `MAP_PROVIDER=vietmap`, bắt buộc `VIETMAP_API_KEY` hợp lệ.
- Demo provider chỉ được bật bằng config rõ ràng và phải giữ nhãn `source=DEMO`, `isEstimate=true`.
- Không dùng secret mặc định trong production.

**Done when:**

- Production config hợp lệ khởi động được API.
- Thiếu từng secret/config bắt buộc làm startup fail với lỗi đã redact.
- `.env.example` và Compose cung cấp đầy đủ tên biến cần cấu hình.

### W2-R02: Real Firebase ID Token Verification

**Goal:** `/auth/firebase` xác minh Firebase ID token thật ở backend thay vì chỉ hỗ trợ fixture local/test.

**Files likely involved:**

- `apps/api/src/auth/auth.module.ts`
- `apps/api/src/auth/providers/firebase-otp.provider.ts`
- `apps/api/src/auth/providers/firebase-otp.provider.spec.ts`
- `apps/api/package.json`

**Required changes:**

- Tích hợp Firebase Admin SDK sau provider interface hiện có.
- Đọc project/credential từ environment hoặc credential chain; không hardcode credential.
- Chỉ cho phép token fixture trong local/test.
- Map invalid token thành `401 INVALID_PROVIDER_TOKEN`.
- Map timeout/provider unavailable thành lỗi `503` ổn định.
- Không log ID token, API key, refresh token hoặc credential.
- Không tự cấp role đặc quyền cho tài khoản Firebase mới; role phải tuân theo provisioning policy phía server.

**Done when:**

- Unit test mock SDK không gọi network thật.
- E2E bao phủ valid, invalid, timeout và provider-unavailable.
- Production wiring không còn sử dụng `unavailableFirebaseVerifier` làm implementation mặc định.

### W2-R03: Audited Admin Order Cancellation

**Goal:** Admin cancellation cập nhật order, status history và audit atomically.

**Files likely involved:**

- `apps/api/src/orders/cancel-order.service.ts`
- Audit repository/service thuộc module sở hữu audit
- Order lifecycle integration tests

**Required changes:**

- Giữ bắt buộc `reason` không rỗng đối với Admin.
- Trong cùng transaction: conditional order update, status history và append-only `AuditLog`.
- Audit chứa actor, action, resource ID, reason và request correlation ID khi có.
- Không cho phép API sửa hoặc xóa audit record.
- Nếu ghi history/audit thất bại, rollback order và Driver availability.

**Done when:**

- Admin cancel thành công tạo đúng một audit record.
- Retry/concurrency không tạo duplicate mutation hoặc duplicate audit ngoài contract.
- Transaction failure không để lại partial state.

### W2-R04: Create Order Validation Compliance

**Goal:** `POST /orders` đạt AC-02 và trả validation envelope nhất quán.

**Files likely involved:**

- `apps/api/src/orders/dto/create-order.dto.ts`
- `apps/api/src/orders/orders.service.ts`
- `apps/api/src/orders/customer-orders.e2e-spec.ts`

**Required changes:**

- Chỉ cho phép tối đa 3 intermediate stops.
- Latitude trong `[-90, 90]`, longitude trong `[-180, 180]`.
- Address, estimate token và `clientRequestId` nếu có không được là chuỗi rỗng.
- `cargoWeightKg` phải hữu hạn, không âm và nằm trong giới hạn pilot được tài liệu cho phép.
- Vehicle type chỉ nhận `MOTORBIKE`, `VAN`, `TRUCK`.
- Validation input trả HTTP `422` với code `VALIDATION_ERROR` và field details.
- Estimate token mismatch/expired tiếp tục dùng stable domain error đã định nghĩa, không làm lộ payload hoặc secret.

**Done when:**

- E2E bao phủ missing field, hơn 3 stops, tọa độ ngoài range, vehicle sai, empty string và cargo weight sai.
- Không tạo order, stop, payment intent hoặc history khi validation thất bại.

### W2-R05: Customer-Only Estimate Authorization

**Goal:** Chỉ Customer được tạo route/price/ETA estimate token.

**Files likely involved:**

- `apps/api/src/maps/maps.controller.ts`
- `apps/api/src/maps/maps.e2e-spec.ts`

**Required changes:**

- Áp dụng `RoleGuard` và `@RequireRoles('CUSTOMER')` cho `POST /orders/estimate`.
- Không tin role từ body, query hoặc header do client tự khai báo.
- Giữ rate limit theo actor và IP.

**Done when:**

- Customer nhận estimate hợp lệ.
- Driver, Fleet Owner và Admin nhận `403`.
- Missing/invalid/revoked authentication nhận `401`.

### W2-R06: Durable Create Order Idempotency

**Goal:** Retry cùng `clientRequestId` luôn trả lại order đã tạo, kể cả khi estimate token đã hết hạn sau lần tạo đầu tiên.

**Files likely involved:**

- `apps/api/src/orders/orders.service.ts`
- `apps/api/src/orders/orders.repository.ts`
- `apps/api/src/orders/customer-orders.e2e-spec.ts`

**Required changes:**

- Nếu request có `clientRequestId`, tra cứu order hiện hữu của đúng Customer trước khi verify estimate token.
- Nếu order tồn tại, trả response persisted trước đó.
- Nếu chưa tồn tại, verify estimate và tạo order transactionally.
- Giữ unique constraint `(customerId, clientRequestId)` làm concurrency backstop.
- Khi nhận Prisma unique violation, đọc và trả order bằng cùng contract response.
- Không cho phép Customer khác reuse idempotency key để đọc order ngoài ownership.

**Done when:**

- Retry tức thời và retry sau khi estimate token hết hạn trả cùng order ID.
- Hai request concurrent chỉ tạo một order, một initial history và một payment intent.
- Cùng key của hai Customer không xung đột và không rò dữ liệu.

### W2-R07: Reliable Real-Database Concurrency Gate

**Goal:** Race-condition suite không thể báo xanh khi người chạy đã opt-in nhưng cấu hình database sai.

**Files likely involved:**

- `apps/api/test/real-db-race-condition.integration-spec.ts`
- Backend test scripts nếu cần

**Required changes:**

- Không opt-in: cho phép skip với lý do rõ ràng.
- Đã opt-in nhưng thiếu `DATABASE_URL`: fail-fast.
- Đã opt-in nhưng database không phải disposable test database: fail-fast.
- Cleanup chỉ fixture IDs do suite tạo.
- Lặp race acceptance tối thiểu 20 lần.
- Mỗi vòng phải có đúng một success và một `409 ORDER_ALREADY_ASSIGNED`.
- Xác nhận không double assignment, không duplicate status history và Driver state nhất quán.

**Done when:**

- Cấu hình sai làm command exit non-zero.
- Dedicated PostgreSQL/PostGIS suite chạy lặp ổn định.
- Default mocked/in-memory suite vẫn chạy được khi không có `DATABASE_URL`.

## 3.1 Remediation Implementation Evidence (2026-08-09)

| Remediation | Implementation status | Evidence hiện có | Gate còn lại |
| --- | --- | --- | --- |
| W2-R01 | `VERIFIED` | Production config fail-fast; Compose static config pass; API production-mode khởi động trên PostGIS disposable; `/health/ready` trả `database=connected` | Không còn |
| W2-R02 | `VERIFIED` | Firebase Admin `verifyIdToken(idToken, true)` sau provider boundary; unit mock không gọi network; E2E valid/invalid/timeout/unavailable pass; tài khoản mới luôn provision `CUSTOMER` | Staging credential smoke được giữ ngoài CI và không chặn Wave 2 |
| W2-R03 | `VERIFIED` | Admin cancel ghi order, availability, history và append-only `AuditLog` trong cùng transaction; rollback test pass; real-DB concurrent retry tạo đúng một cancellation/audit và phục hồi Driver availability | Không còn |
| W2-R04 | `VERIFIED` | E2E validation matrix trả `422 VALIDATION_ERROR` cho missing field, >3 stops, coordinate, vehicle, empty string và cargo weight; xác nhận không có partial state | Không còn |
| W2-R05 | `VERIFIED` | Customer estimate pass; Driver/Fleet Owner/Admin nhận `403`; auth invalid/revoked nhận `401`; rate limit theo actor + IP vẫn pass | Không còn |
| W2-R06 | `VERIFIED` | Lookup `(customerId, clientRequestId)` trước verify estimate; delayed retry với token không còn hợp lệ trả cùng order; real-DB concurrent retry tạo đúng một order/history/payment intent | Không còn |
| W2-R07 | `VERIFIED` | Opt-out skip có lý do; opt-in thiếu/sai DB fail-fast; cleanup chỉ fixture IDs; acceptance race lặp 20 vòng; status, Admin cancellation và create idempotency concurrency đều pass trên PostgreSQL/PostGIS 17/3.5 | Không còn |

Verification đã chạy trên working tree hiện tại:

- Clean frozen install: pass trong linked worktree mới; Prisma Client được generate trước migration gate.
- Unit Wave 2: `139 passed`, `3 skipped` (không tính các test Wave 3 đang untracked trong working tree chính).
- E2E/integration/matrix: `82 passed`, `4 skipped` (real-DB suite).
- Real PostgreSQL/PostGIS suite: `4 passed`, gồm 20 vòng accept race, status race, audited Admin cancellation và concurrent create idempotency.
- Database schema: `7 passed` trên fresh migration và `7 passed` sau upgrade path từ baseline.
- Seed determinism: `3 passed`, gồm seed hai lần, prefix collision/cleanup và rollback khi seed fail.
- Contract: `34 passed`.
- Validators: `9 passed`; API/validators typecheck, API lint/build và `git diff --check`: pass.
- Compose static config: pass.
- Production startup/health trên database disposable: pass.
- Production dependency audit: `0 critical`, `14 high`, `8 moderate`, `1 low`; các advisory nằm ở dependency transitive/optional của Firebase Admin, Prisma tooling và Expo, cần risk review/upgrade riêng trước release gate.

**Technical gate: `PASSED`.** Việc còn lại thuộc orchestration là tạo/publish baseline commit SHA và cập nhật master registry trước khi tách branch Wave 3 từ baseline đó.

## 4. Dependency and Workspace Repair

- Working tree chính vẫn có `node_modules` thuộc SID Windows cũ; không sửa ACL hệ thống vì user hiện tại không có ownership privilege.
- Linked worktree sạch `D:\leopard-wave2-verify` đã chạy `pnpm install --frozen-lockfile` thành công.
- Native `argon2`, Prisma Client generation, ESLint resolution, typecheck và build đều pass trong clean worktree.
- Build scripts không cần thiết của `@firebase/util` và `protobufjs` được explicit-deny trong `pnpm-workspace.yaml`; các native/tooling scripts đã allow vẫn chạy thành công.
- Prisma migration gate hiện generate client trước migrate/schema test để không thể dùng generated client stale.
- Không commit generated artifacts; `git diff --check` và secret scan sạch.

## 5. Wave 2 Verification Gate

Chạy trên branch/worktree sạch tách từ `develop` và trên database disposable khi command yêu cầu:

```bash
pnpm --filter api test
pnpm --filter api test:e2e
pnpm --filter api test:contract
pnpm --filter api typecheck
pnpm --filter api lint
pnpm --filter api build
git diff --check
```

Chạy thêm:

- Clean migration trên database mới.
- Upgrade-path migration từ Wave 1/đầu Wave 2 baseline.
- Seed hai lần và kiểm tra logical/checksum invariants.
- Real PostgreSQL/PostGIS refresh concurrency test.
- Real PostgreSQL/PostGIS order acceptance/status concurrency test.
- Authorization matrix cho Customer, Driver, Fleet Owner và Admin.
- Secret/dependency audit phù hợp với repository policy.

## 6. Wave 2 Exit Criteria

Wave 2 chỉ được đánh dấu `PASSED` khi:

- [x] W2-R01..W2-R07 hoàn tất và có regression tests.
- [x] Không còn P0/P1 thuộc Wave 2.
- [x] Firebase production verifier hoạt động qua provider boundary.
- [x] Production API khởi động với config hợp lệ và fail-fast khi config sai.
- [x] Order lifecycle, audit và idempotency giữ cùng transaction boundary yêu cầu.
- [x] Authorization và ownership matrix không có data leak.
- [x] Unit, integration, E2E, contract, lint, typecheck và build đều exit 0.
- [x] Migration/seed chạy được trên database sạch và upgrade path.
- [x] `git diff --check` sạch; không có secret hoặc dữ liệu cá nhân trong diff/fixture/log.
- [ ] `docs/superpowers/plans/00-master-orchestration.md` được cập nhật task status, Wave 2 baseline SHA và gate status.

## 7. Wave 3A Start Plan

Sau khi Wave 2 đạt exit criteria, mở hai lane Backend Wave 3A song song.

### Lane A: PH-08 Realtime Tracking

Thứ tự thực hiện:

1. PH-08-T01 Tracking policy, point validation và rate limiter.
2. PH-08-T02 PostGIS persistence và tracking history API.
3. PH-08-T03 Socket authentication, order rooms và persist-before-broadcast.
4. PH-08-T04 Authorization matrix và latency gate.

Critical boundaries:

- Chỉ assigned Driver gửi point cho active order.
- Customer owner, active Fleet Owner của assigned Driver và Admin mới được xem/join.
- Không broadcast trước khi database commit.
- Không tin room name/order ID do client gửi nếu chưa policy lookup.

### Lane B: PH-09 Media and Payment

Thứ tự thực hiện:

1. PH-09-T01 Storage provider và secure upload policy.
2. PH-09-T03 Payment provider contracts có thể chạy song song với T01.
3. PH-09-T02 Media REST và delivery proof integration.
4. PH-09-T04 Payment intent và audited manual confirmation.
5. PH-09-T05 Media/payment authorization và cleanup gate.

Critical boundaries:

- Storage/payment SDK luôn nằm sau provider interface.
- Không public trực tiếp storage object.
- Không suy luận `PAID` từ việc tạo QR.
- Admin confirmation bắt buộc note và audit trong cùng transaction.
- PH-09 sở hữu integration implementation cho `DeliveryProofReader` do PH-06 phát hành.

## 8. Wave 3 Ownership and Integration Rules

- Chỉ định một migration owner duy nhất cho Prisma schema/migrations trong Wave 3.
- Không để PH-08 và PH-09 cùng chỉnh cùng controlled surface nếu chưa có integration owner.
- Integration owner sở hữu `apps/api/src/app.module.ts` và wiring giữa Order, Tracking, Media và Payment.
- PH-08 và PH-09 dùng task branches/worktrees riêng từ cùng Wave 2 passed baseline SHA.
- PH-10 Fleet Owner chỉ bắt đầu sau PH-08 gate.
- PH-11 Admin Operations chỉ bắt đầu sau PH-09 gate.
- Không tạo Wave 3 branch từ working tree đang chứa thay đổi Wave 1/UI hoặc file chưa commit không liên quan.

## 9. Recommended Execution Order

1. Tạo remediation branch/worktree từ `develop` sạch.
2. Thực hiện W2-R01 và W2-R02 trước vì chúng khóa production auth/runtime.
3. Thực hiện W2-R03..W2-R06 theo TDD; có thể chia ownership Auth/Runtime và Order/Map.
4. Hoàn thiện W2-R07 và dependency/workspace repair.
5. Chạy full Wave 2 verification gate.
6. Review correctness, authorization và security độc lập.
7. Cập nhật master registry với verified commit SHA.
8. Tạo Wave 3 integration branch từ đúng Wave 2 passed baseline.
9. Mở PH-08 và PH-09 song song theo ownership đã khóa.
