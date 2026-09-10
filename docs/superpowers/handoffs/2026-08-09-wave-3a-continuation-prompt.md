# LEOPARD Wave 3A Continuation Prompt

Sao chép toàn bộ khối prompt bên dưới sang session mới.

```text
Bạn đang tiếp tục triển khai LEOPARD Wave 3A trong repository D:\leopard.

MỤC TIÊU CỦA SESSION

Tiếp tục Wave 3A trên branch hiện có, bắt đầu bằng W3A-T00 Contract/Data/Dependency Preflight, sau đó chỉ chuyển sang PH-08-T02 Persistence and History API khi preflight đã đạt gate. Không triển khai Wave 3B trong session này.

YÊU CẦU TUYỆT ĐỐI

1. KHÔNG commit.
2. KHÔNG stage file.
3. KHÔNG push, mở PR, merge hoặc rebase.
4. Không đổi branch nếu chưa có yêu cầu mới từ user.
5. Giữ toàn bộ thay đổi trong working tree và báo cáo rõ file đã sửa.
6. Không xóa, ghi đè hoặc format các file không thuộc scope; working tree đang có nhiều file untracked của user.
7. Wave 2 remediation đang được tạm gác theo quyết định của user. Không đánh dấu Wave 2 là hoàn tất và không tự mở rộng scope để sửa Wave 2, trừ khi một lỗi trực tiếp chặn Wave 3A.

BASELINE HIỆN TẠI

- Repository: D:\leopard
- Branch phải giữ nguyên: codex/integration-wave-3
- HEAD tại thời điểm handoff: 8749d11
- Branch được tạo từ branch codex/wave-1-runtime-foundations hiện tại, đúng theo yêu cầu của user.
- Không giả định working tree sạch.
- Trước khi sửa file, chạy:
  - git branch --show-current
  - git rev-parse --short HEAD
  - git status --short
- Nếu branch hoặc HEAD khác, đọc lịch sử và trạng thái trước khi tiếp tục; không reset hoặc checkout bỏ thay đổi.

SOURCE OF TRUTH — ĐỌC TRƯỚC KHI IMPLEMENT

Theo thứ tự ưu tiên của AGENTS.md:

1. AGENTS.md
2. docs/product/01-vision-and-scope.md
3. docs/requirements/01-srs.md
4. docs/requirements/02-user-stories.md
5. docs/requirements/03-acceptance-criteria.md
6. docs/architecture/01-system-architecture.md
7. docs/architecture/05-realtime-tracking-design.md
8. docs/data/01-database-design.md
9. docs/data/03-data-access-rules.md
10. docs/api/01-rest-api-spec.md
11. docs/api/02-socket-events.md
12. docs/api/03-error-codes.md
13. docs/api/04-auth-and-permissions.md
14. docs/development/05-definition-of-done.md
15. docs/testing/01-test-strategy.md
16. docs/superpowers/specs/2026-08-09-wave-3-delivery-design.md
17. docs/superpowers/plans/2026-08-09-wave-3a-execution-plan.md
18. docs/superpowers/plans/08-realtime-tracking.md
19. docs/superpowers/plans/09-media-and-payment.md
20. CONTRIBUTING.md

Nếu tài liệu xung đột, áp dụng priority trong AGENTS.md. Khi implementation cố ý thay đổi API/data behavior, cập nhật tài liệu liên quan trong cùng working-tree change.

TRẠNG THÁI ĐÃ HOÀN THÀNH

PH-08-T01 Tracking Policy and Validation đã có trong HEAD:

- apps/api/src/tracking/tracking.policy.ts
- apps/api/src/tracking/tracking.policy.spec.ts
- apps/api/src/tracking/tracking-point.schema.ts
- apps/api/src/tracking/tracking-point.schema.spec.ts
- apps/api/src/tracking/tracking-rate-limiter.ts
- apps/api/src/tracking/tracking-rate-limiter.spec.ts

Behavior đã khóa:

- Chỉ assigned Driver được gửi tracking cho order ACCEPTED, PICKING_UP hoặc IN_TRANSIT.
- Customer chỉ xem order của mình.
- Driver chỉ xem order được assign.
- Fleet Owner chỉ xem khi Owner và assigned Driver đều có active membership trong cùng fleet.
- Admin được xem nhưng không được gửi.
- Tọa độ, UUID, accuracy và capturedAt được validate.
- capturedAt mặc định chỉ được lệch tối đa ±10 phút.
- Rate limit mặc định là 1 point / 2 giây / Driver, không phải theo order.
- Limiter giữ tối đa số key cấu hình và không evict active quota để tránh reset giới hạn.
- Error codes hiện dùng: TRACKING_FORBIDDEN, TRACKING_ORDER_INACTIVE, TRACKING_INVALID_POINT, TRACKING_RATE_LIMITED.

Verification gần nhất của PH-08-T01:

- 3 tracking suites, 33 tests pass.
- Tracking coverage: 98.92% statements, 94.73% branches, 100% functions.
- ESLint cho apps/api/src/tracking pass.
- Review độc lập không còn P0-P2.

Không viết lại PH-08-T01 nếu không có test chứng minh regression hoặc contract preflight yêu cầu một thay đổi tương thích rõ ràng.

BASELINE ISSUES ĐÃ BIẾT

Các lỗi sau đã tồn tại ngoài tracking và phải được phân loại là baseline/harness issue, không được che giấu:

1. pnpm có thể tự chạy install rồi lỗi Windows EPERM khi unlink apps/admin/node_modules/.bin/next.
2. Full API unit suite gần nhất: 12 suites pass, 1 suite fail vì không resolve được argon2 trong auth guard tests.
3. API typecheck có baseline failures:
   - thiếu module/type argon2;
   - Prisma generated client cũ thiếu clientRequestId trên Order/OrderStatusHistory;
   - statusHistory typing không khớp generated client.
4. Không sửa test hoặc hạ strictness để biến các lỗi trên thành pass.
5. Có thể dùng binary đã cài trực tiếp để xác minh hẹp:
   - node apps/api/node_modules/jest/bin/jest.js ...
   - apps/api/node_modules/.bin/tsc.cmd
   - root node_modules/.bin/eslint.cmd với cwd apps/api

Nếu dependency state thay đổi, thử lại command chuẩn trước rồi ghi nhận kết quả mới.

TASK ĐANG THỰC HIỆN: W3A-T00

Goal:

Khóa một controlled baseline duy nhất cho shared contracts, OpenAPI, Prisma migration và provider configuration mà PH-08/PH-09 sẽ dùng. Không wire runtime modules vào AppModule trong task này.

Controlled surfaces thuộc task:

- packages/shared/src/**
- apps/api/openapi/openapi.yaml
- apps/api/test/openapi-contract.spec.ts
- apps/api/prisma/schema.prisma
- apps/api/prisma/migrations/<one-new-wave3-migration>/migration.sql
- apps/api/test/database-schema.spec.ts
- apps/api/src/config/env.schema.ts và test tương ứng
- apps/api/package.json, pnpm-lock.yaml nếu dependency thực sự cần thiết
- .env.example
- docs/api/01-rest-api-spec.md
- docs/api/02-socket-events.md
- docs/api/03-error-codes.md
- docs/data/01-database-design.md

Không sửa trong W3A-T00:

- apps/api/src/app.module.ts
- order lifecycle services
- apps/api/src/media/** runtime implementation
- apps/api/src/payments/** runtime implementation
- apps/admin/**
- apps/mobile/**
- bất kỳ untracked asset/document nào không liên quan

TDD — RED PHẢI ĐƯỢC QUAN SÁT TRƯỚC GREEN

A. Shared contract tests

Viết test trước để yêu cầu:

- TrackingPointDto và tracking page/query types.
- Socket event names, join/leave/send payloads, ack success/error envelope và server event envelope có eventId/occurredAt.
- Payment create request có clientRequestId UUID ở transport validation layer.
- Payment QR projection có amountVnd, provider, providerReference, expiresAt và qrPayload; không expose providerSnapshot.
- Media upload metadata có clientRequestId.
- Stable Wave 3 error code constants/types.

B. OpenAPI contract tests

Viết test trước để yêu cầu:

- GET /orders/{id}/tracking có from, to, page, pageSize.
- Response là page envelope của TrackingPoint, không còn status-event TrackingHistory cũ.
- /fleet/orders/{id}/tracking dùng cùng tracking projection/query contract.
- POST /orders/{id}/payments yêu cầu clientRequestId UUID.
- Payment response khóa các QR fields đã nêu.
- Multipart media endpoints yêu cầu file và clientRequestId.
- Mọi private endpoint vẫn kế thừa bearerAuth.

C. Database schema tests

Viết RED test cho:

- TrackingPoint.accuracyM nullable.
- MediaObject.checksumSha256.
- MediaObject.clientRequestId nullable.
- Idempotency uniqueness cho media khi clientRequestId tồn tại.
- PaymentIntent.provider nullable cho initial UNPAID.
- PaymentIntent.clientRequestId.
- PaymentIntent.providerReference.
- PaymentIntent.confirmedById + FK RESTRICT đến User.
- PaymentIntent.confirmedAt.
- PaymentIntent.confirmationNote.
- PaymentIntent.confirmationRequestId.
- Provider-scoped unique reference khi reference tồn tại.
- Unique confirmation request ID khi tồn tại.
- Partial unique active intent UNPAID/QR_CREATED vẫn được giữ.
- AuditLog có requestId và idempotencyRequestId nếu design cuối cùng yêu cầu PH-09/PH-11 dùng chung AuditService mà không thêm migration thứ hai.

D. Environment/config tests

Viết RED test cho:

- Socket/storage/payment provider selectors có allow-list rõ ràng.
- Credential chỉ bắt buộc khi provider tương ứng được chọn.
- Local/demo provider bị chặn trong production trừ khi có explicit approved flag theo existing demo-provider pattern.
- Validation error không in secret value.
- Không gọi provider/network thật trong test.

GREEN IMPLEMENTATION RULES

1. Tạo/export shared contracts qua packages/shared/src/index.ts.
2. Cập nhật OpenAPI và API/socket/error docs đồng bộ.
3. Chỉ tạo MỘT forward migration Wave 3 cho toàn bộ Tracking/Media/Payment/Audit delta của W3A-T00.
4. Migration phải hỗ trợ:
   - clean install;
   - upgrade từ schema Wave 2 hiện tại;
   - normalize PaymentIntent UNPAID đang dùng map provider VIETMAP/DEMO không đúng domain sang NULL theo quyết định contract;
   - preflight/fail rõ nếu có non-UNPAID invalid payment provider;
   - không drop hoặc tạo trùng partial unique active-payment index hiện có.
5. ProviderSource hiện đang gộp map/storage/payment. Giữ tương thích DB nếu cần, nhưng dùng type alias/check constraint hẹp cho payment provider; không để VIETMAP/LOCAL/S3 thành payment provider hợp lệ.
6. Nullable UNIQUE semantics của PostgreSQL là chủ ý cho optional idempotency keys; xác minh bằng real DB test.
7. Không lưu hoặc expose secret, signed URL, raw provider payload.
8. Không chỉnh AppModule hoặc tạo endpoint runtime trong W3A-T00.
9. Chỉ sửa lockfile qua package manager, không hand-edit lockfile.

W3A-T00 DONE WHEN

- Đã quan sát RED cho từng nhóm test trước implementation.
- Shared contract tests pass.
- OpenAPI contract tests pass.
- Prisma generate pass.
- Clean migration trên disposable PostgreSQL/PostGIS pass.
- Upgrade migration từ Wave 2 pass.
- Database schema tests pass.
- Config tests pass và không leak secret.
- API typecheck/lint/build pass, hoặc mọi failure còn lại được chứng minh là baseline ngoài diff với command/output cụ thể.
- git diff --check pass.
- Không có P0/P1 trong scope W3A-T00.
- Không stage và không commit.

TASK KẾ TIẾP SAU W3A-T00: PH-08-T02

Chỉ bắt đầu khi W3A-T00 đạt gate.

Goal:

Persist tracking point bằng PostGIS, cập nhật DriverProfile last-known location trong cùng transaction và cung cấp authorized paginated history API.

Expected files:

- apps/api/src/tracking/tracking.module.ts
- apps/api/src/tracking/tracking.service.ts
- apps/api/src/tracking/tracking.repository.ts
- apps/api/src/tracking/tracking.controller.ts
- apps/api/src/tracking/tracking-response.mapper.ts
- tracking unit/integration/E2E specs

PH-08-T02 RED tests:

- PostGIS point persistence và coordinate readback.
- Duplicate clientPointId cùng payload trả persisted point cũ.
- Duplicate clientPointId khác payload trả TRACKING_POINT_CONFLICT.
- Tracking point và DriverProfile.lastKnownLocation/lastKnownAt commit cùng transaction.
- Rollback không để lại point hoặc last-known update.
- History order deterministic capturedAt DESC, id DESC.
- from/to UTC filters.
- page/pageSize và max page size 100.
- Customer owner/non-owner matrix.
- assigned/unassigned Driver matrix.
- active/inactive/wrong-fleet Fleet Owner matrix.
- Admin view.
- Foreign resource non-disclosure theo convention hiện tại.

PH-08-T02 implementation constraints:

- Không tin actorId, driverId, fleetId hoặc room/order access facts từ client.
- Resolve order assignment và membership từ DB.
- Dùng parameterized SQL cho PostGIS.
- Persist trước khi trả response; socket broadcast thuộc PH-08-T03, không thêm sớm.
- Không sửa AppModule; Integration Owner wire sau.
- Reuse PH-08-T01 policy/schema/limiter, không duplicate authorization.

WORKFLOW CHO SESSION MỚI

1. Đọc AGENTS.md và source-of-truth kể trên.
2. Kiểm tra branch/HEAD/status, bảo toàn dirty files.
3. Kiểm tra .codegraph; chỉ dùng CodeGraph nếu thư mục này tồn tại.
4. Lập plan ngắn cho W3A-T00.
5. Thực hiện TDD theo từng nhóm nhỏ: RED -> GREEN -> refactor -> scoped verification.
6. Dùng apply_patch cho edit thủ công.
7. Sau khi sửa code, thực hiện independent code/security review theo AGENTS.md và xử lý mọi P0/P1.
8. Chạy verification hẹp sau mỗi nhóm, rồi integration verification cuối task.
9. Không tuyên bố full Wave 3A hoàn tất khi mới xong W3A-T00 hoặc PH-08.
10. Dừng ở boundary an toàn nếu cần quyền mới hoặc contract decision làm thay đổi đáng kể scope.

VERIFICATION COMMANDS ƯU TIÊN

- pnpm --filter shared test
- pnpm --filter api test:contract
- pnpm --filter api test
- pnpm --filter api typecheck
- pnpm --filter api lint
- pnpm --filter api build
- pnpm --filter api prisma:migrate:test
- git diff --check
- git status --short
- git diff --cached --name-only

Nếu pnpm bị EPERM/install hook, dùng binary local tương ứng để có scoped evidence, nhưng vẫn báo rõ command chuẩn chưa đạt:

- node apps/api/node_modules/jest/bin/jest.js --config apps/api/jest.config.cjs --runInBand <patterns>
- apps/api/node_modules/.bin/tsc.cmd --noEmit --project apps/api/tsconfig.json
- từ cwd apps/api: ..\..\node_modules\.bin\eslint.cmd <paths>

FORMAT BÁO CÁO CUỐI SESSION

- Branch và HEAD thực tế.
- Task/subtask đã hoàn thành.
- Files đã sửa/tạo.
- RED commands và failure đã quan sát.
- GREEN/verification commands với pass/fail counts.
- Coverage liên quan.
- Review findings và cách xử lý.
- Baseline failures còn lại, phân biệt rõ với regression.
- Task tiếp theo chính xác.
- Xác nhận: không stage, không commit, không push.
```
