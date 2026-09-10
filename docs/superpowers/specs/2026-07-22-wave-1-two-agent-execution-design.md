# Thiết kế thực thi Wave 1 với hai agent trên một branch

**Trạng thái:** Đã được người dùng phê duyệt hướng thiết kế ngày 2026-07-22  
**Branch thực thi duy nhất:** `codex/wave-1-runtime-foundations`  
**Baseline bất biến:** `4339526f45db33b4f9e460a367004f2f2628d254`  
**Phạm vi:** PH-02, PH-03, PH-04, PH-13-T01 và PH-13-T03

## 1. Mục tiêu

Thiết kế này quy định cách hai implementation agent hoàn thành toàn bộ Wave 1 trên cùng một branch và cùng một working tree mà không tự commit hoặc push. Nó bổ sung execution contract cho từng task, quyền ghi file, điểm đồng bộ dependency, review gate, evidence và điều kiện hoàn tất Wave 1.

Kết quả Wave 1 phải tạo được bốn foundation có thể tích hợp và kiểm chứng cùng nhau:

- NestJS API core, Prisma/PostGIS baseline, OpenAPI, logging/error pipeline và health checks.
- Expo mobile foundation cho Customer và Driver.
- Next.js operations web foundation cho Fleet Owner và Admin.
- Local infrastructure cùng CI/supply-chain gate tối thiểu.

Thiết kế này không thay đổi product behavior, API contract, data model hoặc UI requirements đã được phê duyệt. Khi có xung đột, thứ tự ưu tiên tài liệu trong `AGENTS.md` vẫn được áp dụng.

## 2. Ngoài phạm vi

- Không triển khai Auth, Order, Map/ETA, Tracking, Media, Payment, Fleet data pages hoặc Admin data pages.
- Không chạy PH-13-T02 hoặc PH-13-T04..T06.
- Không tạo phase branch, task branch hoặc worktree riêng.
- Không cho implementation agent chạy `git commit`, `git push`, `git pull`, `git rebase`, `git merge`, `git switch`, `git checkout` hoặc sửa lịch sử Git.
- Không thay đổi source-of-truth documents để hợp thức hóa behavior khác với yêu cầu hiện tại.
- Không yêu cầu credential provider thật trong local hoặc CI.

## 3. Quyết định đã khóa

### 3.1 Một branch, một working tree

Toàn bộ Wave 1 được thực hiện trên `codex/wave-1-runtime-foundations`. Hai agent có thể làm song song chỉ khi ownership path không giao nhau. Mọi file chưa được cấp ownership đều là read-only.

Mô hình này là ngoại lệ có chủ đích so với mô hình task branch/phase branch trong master orchestration. Ngoại lệ chỉ áp dụng cho Wave 1 này vì người dùng giữ quyền commit/push tập trung. Các rule về dependency, controlled surface, review và verification vẫn giữ nguyên.

### 3.2 Quyền Git tập trung

Coordinator/người dùng là Git owner duy nhất:

- Xác nhận branch và baseline trước khi giao task.
- Stage và commit sau khi task qua review.
- Push branch khi muốn công bố checkpoint.
- Không stage `.codex/`, `.stitch/` hoặc file ngoài phạm vi Wave 1.

Implementation agent chỉ đọc Git state bằng `git status`, `git diff`, `git diff --check` và `git log`. Agent không được hoàn tác thay đổi mà mình không tạo ra.

### 3.3 Lockfile có một owner

`pnpm-lock.yaml` chỉ do Coordinator cập nhật tại dependency barrier. Implementation agent được sửa package manifest trong path được giao nhưng không được chạy lệnh làm thay đổi lockfile.

Trước dependency barrier, agent có thể viết test và source nhưng không được tuyên bố task pass nếu dependency chưa được cài. Tại barrier, Coordinator chạy `corepack pnpm install`, review diff của lockfile, rồi mới cho hai lane tiếp tục verification.

### 3.4 Hai lane thực thi

- **Agent A — Backend/Platform:** PH-02-T01, mở database slice của PH-13-T01 để gỡ dependency PostGIS, hoàn tất PH-02-T02..T05, rồi đóng PH-13-T01 và thực hiện PH-13-T03.
- **Agent B — Client Foundations:** PH-03-T01..T04, sau đó PH-04-T01..T04.

Agent A không sửa mobile/admin/UI. Agent B không sửa API/Prisma/OpenAPI/infrastructure/CI. Cả hai không sửa `packages/shared/**`, `packages/validators/**`, root workspace config hoặc lockfile.

### 3.5 Review với đúng hai agent

Reviewer của một task không được là implementer của task đó. Agent A review task của Agent B và ngược lại. Đây được gọi là **independent cross-review**, không gọi là fresh-context review vì hai agent cùng theo dõi Wave 1.

Coordinator thực hiện review gate cuối trên diff tổng và quyết định task được phép commit. Nếu cần fresh-context review đúng nghĩa, phải mở một review session bổ sung; review session đó không được ghi code.

## 4. Nguồn sự thật bắt buộc

Mỗi agent phải đọc trước khi nhận task:

1. `AGENTS.md`
2. `docs/product/01-vision-and-scope.md`
3. `docs/requirements/01-srs.md`
4. `docs/requirements/02-user-stories.md`
5. `docs/requirements/03-acceptance-criteria.md`
6. `docs/architecture/01-system-architecture.md`
7. `docs/data/01-database-design.md`
8. `docs/api/01-rest-api-spec.md`
9. `docs/ui/03-screen-specs.md`
10. `docs/development/05-definition-of-done.md`
11. `docs/testing/01-test-strategy.md`
12. `CONTRIBUTING.md`
13. `docs/superpowers/specs/2026-07-12-multi-agent-delivery-design.md`
14. `docs/superpowers/plans/00-master-orchestration.md`
15. Phase plan của task được giao
16. Tài liệu thiết kế này

Đối với UI task, đọc thêm `docs/ui/02-navigation-map.md`, `docs/ui/04-design-system.md`, `docs/ui/05-responsive-rules.md` và `docs/ui/06-empty-loading-error-states.md`.

## 5. Ownership matrix

| Surface                                                                                                                                                     | Writer      | Thời điểm                  | Quy tắc                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | -------------------------- | --------------------------------------------------------- |
| `apps/api/**`                                                                                                                                               | Agent A     | PH-02                      | Agent B chỉ đọc                                           |
| `apps/api/prisma/**`                                                                                                                                        | Agent A     | PH-02-T02                  | Một migration writer                                      |
| `apps/api/openapi/**`                                                                                                                                       | Agent A     | PH-02-T04                  | Khóa sau T04                                              |
| `apps/mobile/**`                                                                                                                                            | Agent B     | PH-03                      | Agent A chỉ đọc                                           |
| `apps/admin/**`                                                                                                                                             | Agent B     | PH-04                      | Chỉ bắt đầu sau PH-03 verified                            |
| `packages/ui/**`                                                                                                                                            | Agent B     | PH-04-T03                  | Không sửa `packages/shared`/`validators`                  |
| `compose.yaml`, `infra/docker/**`, `.env.example`, `infra/scripts/wait-for-db.sh`, `infra/scripts/with-compose-cleanup.sh`, `infra/scripts/test-compose.sh` | Agent A     | PH-13-T01                  | Chỉ bắt đầu sau env contract PH-02                        |
| `.github/workflows/**`, `.github/dependabot.yml`, `scripts/verify-ci.mjs`                                                                                   | Agent A     | PH-13-T03                  | Không sửa feature behavior                                |
| `pnpm-lock.yaml`                                                                                                                                            | Coordinator | Dependency barriers        | Agent không ghi                                           |
| Root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, shared config                                                                                     | Coordinator | Chỉ khi blocker được duyệt | Mặc định read-only                                        |
| Task registry, evidence ledger và tài liệu plan/spec                                                                                                        | Coordinator | Sau review                 | Agent gửi nội dung đề xuất, không tự ghi ngoài task scope |

Nếu ownership cần đổi, cả hai agent phải dừng ghi surface liên quan cho đến khi Coordinator ghi quyết định mới vào task brief.

## 6. Trình tự và điểm đồng bộ

### Stage 0 — Preflight tuần tự

Coordinator xác nhận:

```bash
git branch --show-current
git rev-parse HEAD
git status --short
```

Kết quả bắt buộc:

- Branch là `codex/wave-1-runtime-foundations`.
- HEAD chứa baseline `4339526f45db33b4f9e460a367004f2f2628d254`.
- Chỉ các path đã biết như `.codex/` và `.stitch/` có thể untracked; không được stage chúng.
- PH-01 ở trạng thái `VERIFIED`.

### Stage 1 — Runtime manifests song song

- Agent A khai báo `apps/api/package.json`, exact scripts và failing shell test nhưng chưa implement app shell hoặc chạy RED.
- Agent B khai báo `apps/mobile/package.json`, exact scripts và failing root test nhưng chưa implement root app hoặc chạy RED.
- Không agent nào cập nhật lockfile hoặc chạy install đồng thời.

### Barrier D1 — API và mobile dependency sync

Coordinator tạm dừng hai agent, review hai manifest rồi chạy:

```bash
corepack pnpm install
git diff -- pnpm-lock.yaml apps/api/package.json apps/mobile/package.json
```

Điều kiện mở barrier:

- Install exit 0.
- Lockfile chỉ chứa importer/dependency của manifest đã duyệt.
- Không có dependency floating hoặc package ngoài approved stack.
- Coordinator là người duy nhất stage/commit lockfile checkpoint.
- Sau install, Agent A chạy `pnpm --filter api --fail-if-no-match test:e2e` và Agent B chạy `pnpm --filter mobile --fail-if-no-match test`; cả hai phải thất bại vì implementation còn thiếu, không phải vì filter không match.
- Chỉ sau RED evidence hợp lệ, hai agent mới implement shell và chạy GREEN commands.

### Stage 2 — PH-02 và PH-03 song song

Hai lane chạy task theo thứ tự nội bộ. Không chạy đồng thời hai task trong cùng một lane. Mỗi task phải qua RED, GREEN, scoped verification và cross-review trước khi chuyển task tiếp theo.

PH-02-T02 cần PostgreSQL/PostGIS nhưng repository chưa có Compose baseline. Để tránh dependency vòng tròn, Agent A mở PH-13-T01 ngay sau PH-02-T01 và chỉ hoàn thành database slice gồm PostGIS service, health check, `.env.example`, `wait-for-db.sh` và compose test liên quan. Khi database slice pass, Agent A tạm giữ PH-13-T01 ở `IN_PROGRESS`, quay lại PH-02-T02 và không xây app image trước khi runtime shell tương ứng tồn tại.

### Barrier D2 — Backend contract freeze

Sau PH-02-T04, Agent A công bố:

- OpenAPI contract test pass.
- Danh sách env name chính xác cho API, DB, CORS và API docs.
- Prisma schema/migration checksum.
- Không còn contract blocker cho PH-13-T01/T03.

Agent A không được thay đổi OpenAPI hoặc env name sau barrier nếu chưa có blocker report được duyệt.

### Stage 3 — PH-04 manifest và PH-13-T01

Điều kiện:

- PH-03 đã `VERIFIED` trước khi Agent B bắt đầu PH-04.
- Database slice của PH-13-T01 đã mở PH-02-T02; PH-02-T04 đã qua review trước khi Agent A hoàn tất API/admin Dockerfile và toàn bộ infrastructure gate.

Agent B chuẩn bị `apps/admin/package.json` với `name: "web"` và `packages/ui/package.json` với `name: "@leopard/ui"`. Agent A chỉ hoàn tất Compose/Docker/env sau khi PH-04-T01 GREEN, rồi build/run smoke các API/admin image trước khi chuyển PH-13-T01 sang `IN_REVIEW`.

### Barrier D3 — Web dependency sync

Coordinator tạm dừng các lệnh package manager và chạy:

```bash
corepack pnpm install
git diff -- pnpm-lock.yaml apps/admin/package.json packages/ui/package.json
```

Sau khi lockfile được duyệt, Agent B tiếp tục test/build PH-04. Agent A có thể tiếp tục infrastructure checks không sửa lockfile.

### Stage 4 — PH-04 và PH-13-T03

Agent B hoàn tất PH-04 tuần tự. Agent A chỉ bắt đầu PH-13-T03 sau khi scripts thực tế của API/mobile/web đã tồn tại, để CI matrix không tham chiếu script giả định.

### Stage 5 — Wave gate tuần tự

Coordinator khóa quyền ghi của cả hai agent, review tổng diff và chạy toàn bộ gate ở Mục 10.

## 7. Task execution contract

Mỗi task dùng registry state chuẩn:

`READY -> IN_PROGRESS -> IN_REVIEW -> INTEGRATED -> VERIFIED`

`RED_CONFIRMED` và `GREEN_CONFIRMED` là evidence milestone bên trong `IN_PROGRESS`, không phải registry state. `BLOCKED` chỉ dùng khi thiếu dependency, contract hoặc công cụ bắt buộc. Mỗi task handoff phải cung cấp: task ID, files changed, RED evidence, GREEN evidence, remaining risks và xác nhận không sửa ngoài ownership.

### 7.1 Agent A — PH-02 Backend Core

#### PH-02-T01 — NestJS Application Shell

- **Dependency:** PH-01 verified; Barrier D1 mở trước GREEN verification.
- **Owned files:** `apps/api/package.json`, Nest/TypeScript config, `apps/api/src/main.ts`, `app.module.ts`, env schema và shell E2E test.
- **Produces:** Nest app prefix `/api/v1`, CORS allowlist, validation pipe, shutdown hooks và strict env parsing.
- **RED evidence:** Sau khi manifest/scripts và failing test đã tồn tại, Barrier D1 cài dependency; `pnpm --filter api --fail-if-no-match test:e2e` thất bại vì app shell chưa được implement.
- **GREEN evidence:** app boot được; health route vẫn 404 có chủ đích cho đến T05; `typecheck` và `build` exit 0.
- **Handoff:** Không có feature endpoint; không log request body/token/phone.

#### PH-02-T02 — Prisma and PostGIS Baseline

- **Dependency:** T01 verified; PostgreSQL 17/PostGIS 3.5 sẵn sàng.
- **Owned files:** `apps/api/prisma/**`, Prisma config, database module/service và schema test.
- **Produces:** Các model/enums/index/constraints trong database design; geography Point 4326 và additive baseline migration.
- **RED evidence:** metadata test thất bại trên database trống trước migration.
- **GREEN evidence:** migration chạy trên database sạch; schema metadata test pass; `prisma:migrate:test` exit 0.
- **Handoff:** Ghi migration checksum và các Prisma limitation được xử lý bằng SQL.

#### PH-02-T03 — Request Context, Errors and Logging

- **Dependency:** T01 verified.
- **Owned files:** `apps/api/src/common/**` và scoped tests.
- **Produces:** request ID propagation, `DomainError`, stable `ApiErrorEnvelope`, JSON log và redaction.
- **RED evidence:** tests cho request ID, 422, unknown 500 và redaction thất bại trước implementation.
- **GREEN evidence:** common tests pass; response không lộ stack/secret; log không chứa authorization, cookie, token, phone hoặc media.
- **Handoff:** Công bố exact error/filter interfaces cho các phase sau.

#### PH-02-T04 — OpenAPI Contract Foundation

- **Dependency:** T01 và canonical shared enums từ PH-01.
- **Owned files:** `apps/api/openapi/**`, docs module, contract tests và app-module wiring liên quan.
- **Produces:** OpenAPI 3.1 cho toàn bộ endpoint đã duyệt; unique operation IDs; bearer security; canonical schemas/enums.
- **RED evidence:** contract test thất bại khi document chưa tồn tại.
- **GREEN evidence:** `pnpm --filter api --fail-if-no-match test:contract` pass; Swagger chỉ bật khi `ENABLE_API_DOCS=true` và mặc định tắt ở production.
- **Handoff:** Kích hoạt Barrier D2; OpenAPI trở thành read-only cho phần còn lại của Wave 1.

#### PH-02-T05 — Health and Backend Gate

- **Dependency:** T01-T04 verified.
- **Owned files:** `apps/api/src/health/**`, health E2E test và app-module wiring.
- **Produces:** `/api/v1/health/live` không phụ thuộc DB; `/api/v1/health/ready` kiểm tra DB có timeout và trả 503 `SERVICE_NOT_READY` khi lỗi.
- **RED evidence:** health E2E thất bại trước module implementation.
- **GREEN evidence:** API lint, typecheck, unit, E2E, build, contract và migration tests đều pass.
- **Handoff:** PH-02 chỉ được `VERIFIED` khi không có endpoint nghiệp vụ ngoài health/docs-controlled exposure.

### 7.2 Agent B — PH-03 Expo Mobile Foundation

#### PH-03-T01 — Expo Runtime Shell

- **Dependency:** PH-01 verified; Barrier D1 mở trước GREEN verification.
- **Owned files:** mobile manifest/config, root Expo layout/index và smoke test.
- **Produces:** Expo SDK 57 shell, safe-area, error boundary, root provider slot và required scripts.
- **RED evidence:** Sau khi manifest/scripts và failing test đã tồn tại, Barrier D1 cài dependency; `pnpm --filter mobile --fail-if-no-match test` thất bại vì root app chưa được implement.
- **GREEN evidence:** mobile test, typecheck và web export exit 0.
- **Handoff:** Không có real login/order/tracking screen.

#### PH-03-T02 — Navigation and Role Boundary

- **Dependency:** T01 verified.
- **Owned files:** public/customer/driver route groups, role router và navigation tests.
- **Produces:** Customer/Driver home mapping; Fleet Owner/Admin về unsupported/login state; hydration guard.
- **RED evidence:** role mapping và unauthorized-flash tests thất bại trước implementation.
- **GREEN evidence:** exact route mapping pass; protected content không render trước hydration/authorization.
- **Handoff:** Navigation root được khóa sau task này.

#### PH-03-T03 — Mobile Theme and State Primitives

- **Dependency:** T01 verified; design-system docs đã đọc.
- **Owned files:** `apps/mobile/src/theme/**`, `apps/mobile/src/ui/**` và component tests.
- **Produces:** semantic tokens, Button, FormField, StatusBadge, ScreenState và EtaIndicator accessible.
- **RED evidence:** tests cho touch target, loading label, state copy và DEMO label thất bại trước implementation.
- **GREEN evidence:** component tests pass; viewport 360x800 và 390x844 không overflow; source DEMO luôn hiện “Dữ liệu mô phỏng”.
- **Handoff:** Không dùng gradient tím, glassmorphism, hero hoặc raw business rules.

#### PH-03-T04 — API and Session Client Boundary

- **Dependency:** T01-T02 verified; sử dụng contract PH-01, không chờ Auth implementation.
- **Owned files:** mobile API/query/error clients, session store, secure storage adapter và tests.
- **Produces:** typed request, bearer injection, one-refresh retry, concurrent refresh deduplication và logout khi refresh fail.
- **RED evidence:** transport/session tests thất bại trước implementation.
- **GREEN evidence:** tests/typecheck/export pass; refresh credential chỉ ở SecureStore, access token chỉ ở memory.
- **Handoff:** PH-03 verified; Agent B không sửa navigation/theme khi chuyển PH-04.

### 7.3 Agent B — PH-04 Operations Web Foundation

#### PH-04-T01 — Next.js Runtime Shell

- **Dependency:** PH-03 verified; Barrier D3 mở trước GREEN verification.
- **Owned files:** admin manifest/config, root App Router layout/page/CSS và test.
- **Produces:** Next.js shell, metadata, local font fallback, CSP-ready config và provider slot.
- **RED evidence:** root redirect test thất bại khi app chưa tồn tại.
- **GREEN evidence:** web test, typecheck và build exit 0.
- **Handoff:** Không có Fleet/Admin data page.

#### PH-04-T02 — Role Layout and Navigation

- **Dependency:** T01 verified.
- **Owned files:** auth/fleet/admin layouts, operations shell/navigation, `apps/admin/playwright.config.ts`, component test và `apps/admin/e2e/shell.spec.ts`.
- **Produces:** exact role navigation; desktop sidebar; tablet drawer có focus trap, Escape close và current-route state.
- **RED evidence:** role navigation/accessibility tests thất bại trước implementation.
- **GREEN evidence:** component tests và Playwright shell E2E pass ở 768x1024, 1024x768, 1440x900; Playwright tự start web server theo config.
- **Handoff:** Layout/navigation root khóa sau task này; middleware không thay API authorization.

#### PH-04-T03 — Web Design System

- **Dependency:** T01 verified; Barrier D3 mở.
- **Owned files:** `packages/ui/**` và component tests.
- **Produces:** tokens, Button, StatusBadge, DataTable, Pagination, FilterBar, ScreenState và MapPanel.
- **RED evidence:** focus/name/state/pagination/loading tests thất bại trước implementation.
- **GREEN evidence:** package tests/typecheck và required viewport snapshots pass; không có uncontrolled data fetching trong DataTable.
- **Handoff:** Tokens/components trở thành controlled surface cho feature phases.

#### PH-04-T04 — Web API and Session Boundary

- **Dependency:** T01-T02 verified.
- **Owned files:** server/browser API clients, API error, session/role policy và tests.
- **Produces:** typed server/browser request, httpOnly refresh-cookie boundary, 401 redirect và explicit 403 permission state.
- **RED evidence:** token exposure, error envelope, 401/403 tests thất bại trước implementation.
- **GREEN evidence:** admin lint, typecheck, unit, Playwright shell E2E và build pass; không có token trong client bundle.
- **Handoff:** PH-04 verified; backend vẫn là authorization source of truth.

### 7.4 Agent A — PH-13 Wave 1 Platform Tasks

#### PH-13-T01 — Local Infrastructure Foundation

- **Dependency:** Bắt đầu database slice sau PH-02-T01; hoàn tất toàn task sau Barrier D2 và PH-04-T01 GREEN.
- **Owned files:** Compose, API/admin Dockerfiles, `.env.example`, DB wait script và compose test.
- **Produces:** PostgreSQL 17/PostGIS 3.5 health service, local object directory, non-root multi-stage app images và demo defaults.
- **RED evidence:** `bash infra/scripts/test-compose.sh` thất bại khi Compose/Docker surfaces chưa tồn tại.
- **GREEN evidence:** database slice phải pass trước PH-02-T02; full `docker compose config`, `docker compose build api admin` và runtime/non-root infrastructure smoke exit 0 sau PH-04-T01 GREEN; `with-compose-cleanup.sh` luôn teardown và trả lại original command status; không có literal credential.
- **Handoff:** Không thêm deployment behavior hoặc provider credential thật.

#### PH-13-T03 — CI Matrix and Supply Chain Gate

- **Dependency:** PH-02, PH-03, PH-04 scripts đã tồn tại và PH-13-T01 verified.
- **Owned files:** `.github/workflows/**`, `.github/dependabot.yml`, `scripts/verify-ci.mjs`.
- **Produces:** least-privilege PR jobs cho frozen install, lint, typecheck, tests, build, contract và DB-backed integration; security/dependency checks không lộ secret.
- **RED evidence:** CI verifier thất bại trên workflow baseline thiếu matrix/security rules.
- **GREEN evidence:** `node scripts/verify-ci.mjs` và local equivalents pass; action versions/permissions/cache/artifacts đạt policy.
- **Handoff:** CI không chạy deployment trên fork PR và không yêu cầu provider credential thật.

## 8. Agent task brief và handoff

Coordinator giao đúng một task/lần theo mẫu:

```text
Task ID:
Goal:
Context: <story, acceptance criteria và source files>
Baseline HEAD:
Owned paths:
Read-only paths:
Dependencies verified:
Required RED command:
Required GREEN commands:
Expected outputs:
Forbidden changes:
Done when: <tests, build và manual evidence>
```

Agent kết thúc task bằng:

```text
Task ID:
State: IN_REVIEW | BLOCKED
Files changed:
RED command/result:
GREEN commands/results:
Manual/viewport evidence:
Contract or migration impact:
Known risks:
Ownership violations: none | <exact path and reason>
```

Không được dùng “tests pass” nếu thiếu command và exit result cụ thể.

## 9. Review protocol

### Gate 1 — Spec compliance

Cross-reviewer kiểm tra:

- Đúng task goal và owned paths.
- Không triển khai feature ngoài Wave 1.
- Interface/enum/API/data/UI copy đúng source documents.
- RED evidence thực sự chứng minh behavior chưa tồn tại.
- Mọi acceptance condition của task có test/evidence tương ứng.

### Gate 2 — Quality, security và test design

Cross-reviewer kiểm tra:

- Authorization không được quyết định ở UI.
- Secret/PII/request body không đi vào log, fixture hoặc artifact.
- Test kiểm tra observable behavior, không chỉ implementation detail.
- Error/loading/empty/permission states phù hợp foundation scope.
- Không có dependency, generated file hoặc refactor ngoài phạm vi.

Critical/Important finding phải được sửa và rerun verification trước khi Coordinator commit. Suggestion có thể ghi debt nhưng không được che requirement chưa đạt.

## 10. Verification gates

### Scoped gates

API:

```bash
pnpm --filter api --fail-if-no-match lint
pnpm --filter api --fail-if-no-match typecheck
pnpm --filter api --fail-if-no-match test
pnpm --filter api --fail-if-no-match test:e2e
pnpm --filter api --fail-if-no-match test:contract
pnpm --filter api --fail-if-no-match build
pnpm --filter api --fail-if-no-match prisma:migrate:test
```

Mobile:

```bash
pnpm --filter mobile --fail-if-no-match lint
pnpm --filter mobile --fail-if-no-match typecheck
pnpm --filter mobile --fail-if-no-match test
pnpm --filter mobile --fail-if-no-match export
```

Operations web/UI:

```bash
pnpm --filter web --fail-if-no-match lint
pnpm --filter web --fail-if-no-match typecheck
pnpm --filter web --fail-if-no-match test
pnpm --filter web --fail-if-no-match test:e2e
pnpm --filter web --fail-if-no-match build
pnpm --filter @leopard/ui --fail-if-no-match test
pnpm --filter @leopard/ui --fail-if-no-match typecheck
```

Platform:

```bash
docker compose config
bash infra/scripts/with-compose-cleanup.sh bash -lc 'docker compose up -d postgres api admin && bash infra/scripts/test-compose.sh'
node scripts/verify-ci.mjs
```

Nếu tên package/script thực tế khác phase contract, task bị `BLOCKED`; không được đổi command âm thầm chỉ để gate pass.

### Final Wave 1 gate

Coordinator chạy tuần tự khi hai agent đã dừng ghi file:

```bash
corepack pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm test:contract
pnpm build
bash infra/scripts/with-compose-cleanup.sh bash -lc 'docker compose up -d --wait postgres && pnpm --filter api --fail-if-no-match test:e2e && pnpm db:migrate:test'
pnpm --filter mobile --fail-if-no-match export
pnpm --filter web --fail-if-no-match exec playwright install chromium
pnpm --filter web --fail-if-no-match test:e2e
pnpm --filter @leopard/ui --fail-if-no-match test
pnpm --filter @leopard/ui --fail-if-no-match typecheck
docker compose config
docker compose build api admin
bash infra/scripts/with-compose-cleanup.sh bash -lc 'docker compose up -d postgres api admin && bash infra/scripts/test-compose.sh'
node scripts/verify-ci.mjs
git diff --check
git status --short
```

Nếu một root script chưa thể áp dụng vì package không khai báo task tương ứng, phải sửa task configuration hoặc ghi rõ lý do contract-level; không được bỏ qua gate mà không có blocker/remediation record.

## 11. Blocker protocol

Agent dừng ghi surface liên quan và gửi:

```text
Task:
Current HEAD:
Blocked surface:
Current owner:
Requirement/contract:
Observed evidence:
Minimal proposed change:
Consumers affected:
Migration/backward compatibility:
Exact tests required:
```

Coordinator chọn một trong ba kết quả:

1. Từ chối thay đổi và yêu cầu solution trong ownership hiện tại.
2. Tạm dừng hai lane, chuyển ownership có thời hạn và ghi quyết định.
3. Tạo remediation checkpoint tuần tự trước khi tiếp tục task.

Không agent nào được tự chọn kết quả hoặc sửa controlled surface trước khi có quyết định.

## 12. Điều kiện hoàn tất Wave 1

Wave 1 chỉ hoàn tất khi đồng thời đạt:

- PH-02, PH-03, PH-04, PH-13-T01 và PH-13-T03 ở trạng thái `VERIFIED`.
- Final Wave 1 gate exit 0 trên branch duy nhất.
- Migration chạy được trên database sạch và PostGIS indexes/constraints có evidence.
- OpenAPI contract test pass và document không drift khỏi REST spec.
- Mobile export và web build thành công.
- UI evidence bao phủ 360x800, 390x844, 768x1024, 1024x768 và 1440x900 theo client phù hợp.
- Liveness/readiness behavior đúng AC-07.
- Không có Critical/Important review finding mở.
- Không role/business feature ngoài Wave 1 được triển khai.
- Diff không chứa `.codex/`, `.stitch/`, secret, PII, unrelated refactor hoặc generated artifact ngoài lockfile được duyệt.
- Coordinator đã review và commit/push theo quyền của người dùng; implementation agent không thực hiện Git mutation.

## 13. Rủi ro và biện pháp kiểm soát

| Rủi ro                                            | Kiểm soát                                                                                        |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Hai agent ghi cùng working tree                   | Path ownership cứng, một task/lane, freeze tại barrier                                           |
| Concurrent install làm hỏng lockfile/node_modules | Chỉ Coordinator chạy install tại D1/D3 và final gate                                             |
| Package manifest merge logic không nhất quán      | Exact version pins từ phase plans; review lockfile importer diff                                 |
| PH-13 dùng env/script chưa tồn tại                | Chờ Barrier D2 và runtime scripts trước T01/T03                                                  |
| Review không thật sự fresh-context                | Gọi đúng là cross-review; Coordinator final review; mở review-only session nếu cần fresh-context |
| Agent vô tình commit/push                         | Git mutation nằm trong forbidden actions của task brief                                          |
| UI foundation trượt thành feature                 | Phase boundary và source screen specs được kiểm ở Gate 1                                         |
| API shell trượt thành business logic              | Chỉ health/docs exposure; feature endpoints bị review reject                                     |

## 14. Ảnh hưởng đến plan hiện tại

Sau khi spec này được người dùng review, `docs/superpowers/plans/2026-07-21-wave-1-two-agent-parallel-plan.md` phải được cập nhật để:

- Thay mô hình phase/task branches bằng single-branch execution cho Wave 1 này.
- Thay lệnh tạo worktree bằng preflight branch/baseline checks.
- Thêm Coordinator role và cấm Git mutation đối với implementation agent.
- Thêm dependency barriers D1/D2/D3 và lockfile ownership.
- Thêm execution contract, handoff evidence và cross-review terminology.
- Thay integration merge steps bằng checkpoint/final verification trên cùng branch.
- Giữ nguyên product scope, phase task content và final Wave 1 quality gate.
