# Prompt bàn giao: hoàn thiện Driver mobile → API → DB test plan

Bạn tiếp quản task kiểm thử và sửa các lỗi Driver của LEOPARD. Làm việc trong `D:\leopard`, branch hiện tại `feature/mobile-ui-refactor`. Không reset, checkout, hay xóa các thay đổi đang có. Đọc `AGENTS.md` trước; repo có `.codegraph`, nên dùng CodeGraph trước khi đọc/định vị code.

## Mục tiêu

Đưa luồng Driver từ app Expo qua REST/Socket tới backend về trạng thái có thể đánh giá release: test harness khớp production, các lỗi Driver đã tái hiện được sửa bằng test-first, và báo cáo kiểm thử cập nhật bằng bằng chứng thực thi. Không chỉ báo “test pass”: phân biệt unit/in-memory, API integration, PostgreSQL/PostGIS thật, PWA E2E và native device smoke.

Không mở rộng scope pilot: không tự thêm COD, hoàn hàng, multi-order dispatch hoặc workflow status mới nếu không có quyết định Product Owner. Backend giữ business rules/authorization/transaction; Frontend không tự quyết định lifecycle.

## Nguồn cần đọc

1. `AGENTS.md`
2. `docs/requirements/01-srs.md`, `docs/requirements/03-acceptance-criteria.md`
3. `docs/product/03-business-process.md`, `docs/product/05-out-of-scope.md`
4. `docs/api/01-rest-api-spec.md`, `docs/api/02-socket-events.md`
5. `docs/ui/03-screen-specs.md`, `docs/testing/01-test-strategy.md`
6. Báo cáo hiện có: `docs/testing/07-driver-ux-research-and-e2e-plan.md`
7. Prompt này.

## Trạng thái workspace — phải giữ lại

Các thay đổi do đợt audit hiện có và chưa commit:

- `docs/testing/07-driver-ux-research-and-e2e-plan.md`: nghiên cứu UX, matrix 24 nhóm test và findings F01–F12.
- `apps/driver/src/features/orders/DriverOrderDetailRuntime.audit.test.tsx`: regression audit cho runtime.
- `apps/driver/src/features/orders/socket-contract.audit.test.ts`: regression audit cho Socket URI và lifecycle contract.
- `apps/driver/src/auth/driver-register-recovery.audit.test.tsx`: regression audit cho KYC retry.
- `apps/api/src/drivers/availability.e2e-spec.ts`
- `apps/api/src/orders/accept-order.integration-spec.ts`
- `apps/api/src/orders/order-lifecycle.e2e-spec.ts`

Ba E2E API cuối chỉ được chỉnh test harness: `createNestApplication({ bodyParser: false })` để khớp `apps/api/src/main.ts`. Đây là root cause của PATCH timeout trước đó: parser mặc định đã consume request body, trong khi middleware JSON scoped của `AppModule` chờ lại stream đã kết thúc. `availability.e2e-spec.ts` cũng đã cập nhật assertion response active thành `{ order: null, availability: 'OFFLINE' }`, đúng contract service hiện tại. Không revert các thay đổi này.

Test artifacts cục bộ ở `.tmp/driver-audit/`; chúng là bằng chứng, không cần commit. `api-driver-core.json` đã tồn tại.

## Kết quả đã chạy — lấy làm baseline, không diễn giải quá mức

| Lệnh / mức | Kết quả |
| --- | --- |
| Driver Jest toàn bộ | 22 suites, 188 tests pass |
| `@leopard/mobile-core` Jest | 12 suites, 137 tests pass |
| API unit Jest | 51 suites, 498 pass; 3 suites/6 tests skip do cần DB thật |
| Driver typecheck | pass |
| API typecheck | pass |
| Driver web export | pass, artifact `.tmp/driver-audit/web-export` |
| API Driver core E2E sau sửa harness | 18 pass, 1 fail; `api-driver-core.json` |
| API body-size E2E riêng | 3 pass, 1 fail `ECONNRESET`; `api-body-size.json` |

Lệnh API Driver core đã chạy:

```powershell
# cwd D:\leopard\apps\api
.\node_modules\.bin\jest.cmd --config jest-e2e.config.cjs --runInBand --runTestsByPath src/drivers/availability.e2e-spec.ts src/orders/accept-order.integration-spec.ts src/orders/order-lifecycle.e2e-spec.ts --json --outputFile ../../.tmp/driver-audit/api-driver-core.json
```

Một failure còn lại là assertion test, không phải lỗi đã chứng minh ở product: `order-lifecycle.e2e-spec.ts` mong audit metadata chứa `requestId: admin-cancel-request-1`, nhưng request test không gửi `x-request-id`; actual audit record có `requestId: null`. Kiểm tra error và test tại `apps/api/src/orders/order-lifecycle.e2e-spec.ts` khoảng dòng 270–305. Sửa test bằng cách gửi header đúng hoặc đổi assertion theo contract sau khi đối chiếu với `OrdersController`/audit service; không thay đổi production để thỏa assertion sai.

Không có Docker hay PostgreSQL process khả dụng trong session audit. `apps/api/.env` trỏ `127.0.0.1:5433/leopard`, nhưng port không lắng nghe. Do đó chưa đạt DB transaction/race thật, PostGIS, Socket handshake thật, PWA E2E thật hay native device smoke. Không chạy migrate/seed lên database người dùng. DB suite thật yêu cầu database disposable được gate check chặt:

- `LEOPARD_REAL_DB_RACE_TEST=true` và database `leopard_real_db_race_test`
- `LEOPARD_REAL_DB_GEO_TEST=true` và database `leopard_real_db_geo_test`

## Lỗi Driver đã tái hiện — giữ test RED cho tới khi sửa

### P1: upload proof xong không mở hành động DELIVERED

- Test: `apps/driver/src/features/orders/DriverOrderDetailRuntime.audit.test.tsx`
- Result: 3 tests: 1 pass, 2 fail (`.tmp/driver-audit/runtime.json`).
- Root cause: `DriverOrderDetailRuntime.handleSelectProof()` chỉ patch `proof` vào React Query cache. Nó không remap `primaryTask`/`offeredLifecycleCommand`. `DriverOrderDetailScreen` render action theo `view.primaryTask`; adapter chỉ tạo command DELIVERED khi map toàn order có proof `persisted`.
- Files cần đọc/sửa: `apps/driver/src/features/orders/DriverOrderDetailRuntime.tsx`, `adapter.ts`, `DriverOrderDetailScreen.tsx`, audit test.
- Acceptance: IN_TRANSIT → chọn ảnh → upload success, khi vẫn ở detail screen CTA đổi ngay sang “Xác nhận đã giao”; không reload/re-enter; click tiếp gửi DELIVERED đúng một lần.

### P1: runtime không chặn double-tap mutation

- Test cùng `DriverOrderDetailRuntime.audit.test.tsx`.
- Result: pending request, hai taps gọi `executeLifecycle` hai lần.
- Cần thêm pending/error state runtime cho lifecycle, proof upload, availability và dispatch accept nếu cùng pattern. Đối chiếu idempotency REST: Adapter hiện status POST chỉ gửi `{ status }`, không thấy `clientRequestId`.
- Acceptance: CTA disable/pending trong khi request chạy, failure giữ recovery rõ ràng, response mất/retry không nhân status history.

### P1: KYC partial upload làm retry gọi lại apply và bị pending conflict

- Test: `apps/driver/src/auth/driver-register-recovery.audit.test.tsx`
- Result: 1 pass, 1 fail (`.tmp/driver-audit/registration.json`).
- Root cause: `driver-register.tsx` gọi `POST /driver/apply`, rồi lần lượt upload ba documents. Nếu upload thứ hai fail, button submit hiện lại; lần sau lại POST apply. BE `DriverApplicationService.loadApplicableUser()` trả `DRIVER_APPLICATION_PENDING` sau apply đã commit.
- Files cần đọc/sửa: `apps/driver/app/(public)/driver-register.tsx`, `apps/api/src/drivers/driver-application.service.ts`, document service/controller, audit test và existing registration tests.
- Trước khi chọn fix, kiểm tra API cho phép document upload ở trạng thái Customer/Driver pending. Thiết kế phải resume phần thiếu sau refresh; không tạo lại signed contract/file dư. Quyết định upload docs trước apply hay apply idempotent/resumable phải theo security/transaction behavior thực tế, không đoán.

### P1: Socket URL dùng REST base có `/api/v1`

- Test: `apps/driver/src/features/orders/socket-contract.audit.test.ts`
- Result: 4 tests: 1 pass, 3 fail (`.tmp/driver-audit/socket-contract.json`).
- With `EXPO_PUBLIC_API_URL=http://127.0.0.1:3000/api/v1`, client produces `/api/v1/tracking` and `/api/v1/dispatch`; backend gateways expose `/tracking` and `/dispatch`.
- Files cần đọc/sửa: `packages/mobile-core/src/api/http-client.ts`, `packages/mobile-core/src/api/socket-client.ts`, `apps/driver/src/features/orders/tracking-sender.ts`, `dispatch-offer-listener.ts`, `.env.example` and app env docs if config contract changes.
- Acceptance: origin-only socket URL derived safely from REST base (trailing slash/path cases), explicit socket URL overrides work, tracking/dispatch handshakes and authenticated join receive expected ACK with a real local API when available.

### P1: lifecycle contract drift `PICKED_UP`

- Test: `socket-contract.audit.test.ts`.
- Shared `packages/shared/src/domain/order/order-status.ts` and its state machine include `PICKED_UP`; Prisma/OpenAPI/backend state machine do not.
- SRS/business process currently define `REQUESTED → ACCEPTED → PICKING_UP → IN_TRANSIT → DELIVERED`.
- Do not silently add DB status. First decide/record one authoritative lifecycle. Lean pilot option is align shared client to existing SRS/backend; if product wants a separate PICKED_UP state, plan schema migration, OpenAPI, all UI/API/DB state machines, history, docs and tests together.

### P2 items to address after P1

- Driver list CTA says “NHẬN ĐƠN” but currently only opens detail: `apps/driver/src/features/orders/DriverOrdersScreen.tsx`.
- Missing-proof BE response is `ORDER_INVALID_TRANSITION`/409, while FE special mapping only recognizes synthetic `PROOF_REQUIRED` variants/400: `adapter.ts` and `apps/api/src/orders/domain/order-state-machine.ts`.
- Fallback copy presents sample location/distance/fare as if live data; ensure unavailable/demo labels are honest.
- `DriverOrdersScreen` has local drawer plus global drawer provider; reproduce before changing.

## Required next sequence

1. Re-run the three Driver core API suites. Resolve the single audit assertion correctly and ensure all pass. Then run API lint/typecheck and a targeted full relevant suite.
2. Treat each P1 bug as one vertical slice: keep a failing test, implement one root-cause fix, run focused test, then broader Driver/API tests. Do not batch unrelated refactors.
3. Update `docs/testing/07-driver-ux-research-and-e2e-plan.md` after each verified result: execution date, command, pass/fail/skip, test level, root cause, exact files changed, and remaining limitation. Do not claim DB/E2E/native pass from mocked runtime tests.
4. Investigate `test/security/body-size-limit.e2e-spec.ts` final case (`>15MB /driver/apply` returns `ECONNRESET` rather than expected 413) with root-cause tracing. It may be parser/socket behavior or a test harness issue. Preserve three passing cases; do not weaken the security expectation without evidence.
5. Set up a disposable Postgres/PostGIS test database only if available and authorized in the new session. Then run real DB race/geo gates, Socket handshake and two-client Driver/Customer observer test. Do not use the normal `leopard` DB.
6. Add a real Driver PWA E2E harness. `apps/driver` lacks `test:e2e`; Admin’s Playwright setup does not cover Driver. Cover login, availability, accept, PICKING_UP, tracking, IN_TRANSIT, proof upload, DELIVERED, error/retry, two-driver accept race, and Customer/Fleet/Admin observation. Add native GPS/camera/background smoke separately.

## Commands and verification

Use direct Jest binary if `pnpm.cmd` appears silent/hangs in non-interactive execution:

```powershell
# cwd apps/driver
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath src/features/orders/DriverOrderDetailRuntime.audit.test.tsx
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath src/features/orders/socket-contract.audit.test.ts
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath src/auth/driver-register-recovery.audit.test.tsx
..\..\node_modules\.bin\tsc.cmd --noEmit
..\..\node_modules\.bin\eslint.cmd .

# cwd apps/api
.\node_modules\.bin\jest.cmd --config jest-e2e.config.cjs --runInBand --runTestsByPath src/drivers/availability.e2e-spec.ts src/orders/accept-order.integration-spec.ts src/orders/order-lifecycle.e2e-spec.ts
..\..\node_modules\.bin\tsc.cmd --noEmit --project tsconfig.json
..\..\node_modules\.bin\eslint.cmd .
```

Before handoff, run `git diff --check`, inspect the diff for unrelated files/secrets, and update `docs/testing/07-driver-ux-research-and-e2e-plan.md`. Do not commit, push, open a PR, or change external systems unless explicitly requested.

## Completion definition for the next session

Report each P1 as fixed only after its regression test turns green and relevant broader checks pass. Report any remaining DB/E2E/native gaps as NOT RUN with the exact missing environment dependency. A credible release recommendation needs: no P0/P1 Driver defects open; coherent lifecycle contract; API authorization/ownership and race tests executed against real DB; PWA E2E with real API/Socket; and device smoke for photo/GPS permissions.
