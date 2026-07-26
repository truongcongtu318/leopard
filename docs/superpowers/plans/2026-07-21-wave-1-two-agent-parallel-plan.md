# Wave 1 Two-Agent Runtime Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn thành PH-02 Backend Core, PH-03 Expo Foundation, PH-04 Operations Web Foundation, PH-13-T01 Local Infrastructure và PH-13-T03 CI Matrix bằng hai implementation agent trên một branch duy nhất.

**Architecture:** Agent A sở hữu API, data và platform; Agent B sở hữu mobile, operations web và UI package. Hai agent dùng chung working tree nhưng không commit/push, chỉ ghi vào path được cấp; Coordinator sở hữu Git, root lockfile, task ledger và các dependency barrier.

**Tech Stack:** Node.js 24, pnpm 11.11.0 workspace, NestJS 11, Prisma 7, PostgreSQL 17/PostGIS 3.5, Expo SDK 57, React Native 0.86, Next.js 16, React 19, Tailwind CSS 4, Docker Compose và GitHub Actions.

## Global Constraints

- Design source: `docs/superpowers/specs/2026-07-22-wave-1-two-agent-execution-design.md`.
- Branch duy nhất: `codex/wave-1-runtime-foundations`.
- Baseline bắt buộc là descendant của `4339526f45db33b4f9e460a367004f2f2628d254`.
- Implementation agent không chạy Git mutation gồm commit, push, pull, merge, rebase, switch, checkout, reset hoặc clean.
- Coordinator/người dùng là người duy nhất stage, commit, push, cập nhật `pnpm-lock.yaml` và task ledger.
- Agent A chỉ ghi `apps/api/**`, PH-13 infrastructure/CI paths được giao; Agent B chỉ ghi `apps/mobile/**`, `apps/admin/**`, `packages/ui/**`.
- `packages/shared/**`, `packages/validators/**`, root workspace config và source-of-truth docs là read-only nếu chưa có blocker decision.
- Không triển khai feature ngoài foundation: Auth, Order, Map/ETA, Tracking, Media, Payment, Fleet/Admin data pages đều ngoài Wave 1.
- API sở hữu authorization, lifecycle, pricing và provider orchestration; client foundation không chứa business rule.
- Demo provider không random; provider credential thật không được yêu cầu trong local/CI.
- Mobile kiểm tra 360x800 và 390x844; web kiểm tra 768x1024, 1024x768 và 1440x900.
- UI không dùng gradient tím, glassmorphism, decorative hero, fake marketing card hoặc raw color ngoài token.
- Mỗi task phải có RED evidence, GREEN evidence, independent cross-review và Coordinator approval trước khi được commit.

---

## 1. Mandatory Reading

Mỗi agent phải đọc trước task đầu tiên:

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
14. `docs/superpowers/specs/2026-07-22-wave-1-two-agent-execution-design.md`
15. `docs/superpowers/plans/00-master-orchestration.md`
16. Phase plan của task được giao
17. Plan này

UI tasks đọc thêm navigation, design-system, responsive và screen-state docs trong `docs/ui/`.

## 2. Operating Model

### Roles

| Role           | Trách nhiệm                                                                                             | Không được làm                                        |
| -------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Coordinator    | Giao một task/lần, khóa ownership, chạy install barrier, stage/commit/push, cập nhật ledger, final gate | Không sửa feature âm thầm để làm gate pass            |
| Agent A        | PH-02-T01..T05, database slice/full PH-13-T01, PH-13-T03                                                | Không sửa mobile/admin/UI/shared/lockfile             |
| Agent B        | PH-03-T01..T04 rồi PH-04-T01..T04                                                                       | Không sửa API/Prisma/OpenAPI/infra/CI/shared/lockfile |
| Cross-reviewer | Agent không implement task kiểm spec, quality, security và tests                                        | Không commit/push hoặc mở rộng scope                  |

Với đúng hai agent, review được gọi là `independent cross-review`, không gọi là fresh-context review. Nếu có review-only session thứ ba, session đó không được ghi implementation.

### Task state and evidence

```text
NOT_STARTED -> READY -> IN_PROGRESS -> IN_REVIEW -> INTEGRATED -> VERIFIED
                              \-> BLOCKED
```

`RED_CONFIRMED` và `GREEN_CONFIRMED` là evidence milestone bên trong `IN_PROGRESS`, không phải registry state. Một task chỉ `VERIFIED` sau khi Coordinator xác nhận review findings Critical/Important đã đóng và scoped commands pass.

### Task brief

Coordinator phải gửi đủ nội dung sau trước khi agent ghi file:

```text
Task ID: <exact task id>
Goal: <one behavior boundary>
Context: <story, acceptance criteria và source files>
Baseline HEAD: <current SHA>
Owned paths: <exact paths>
Read-only paths: <controlled surfaces>
Dependencies verified: <task IDs/barrier IDs>
Required RED command: <exact command>
Required GREEN commands: <exact commands>
Forbidden changes: <exact scope exclusions>
Done when: <tests, build và manual evidence>
```

### Task handoff

Agent trả về:

```text
Task ID: <exact task id>
State: IN_REVIEW | BLOCKED
Files changed: <exact list>
RED command/result: <command, failure reason>
GREEN commands/results: <commands, exit results>
Manual/viewport evidence: <evidence or not-applicable reason>
Contract or migration impact: <exact impact>
Known risks: <specific risks or none>
Ownership violations: none | <exact path and reason>
```

---

## 3. Coordinator Preflight

### Task C-00: Lock the Wave 1 baseline and workspace

**Files:**

- Read: repository and Git state
- Do not stage: `.codex/**`, `.stitch/**`

**Produces:** verified branch, baseline ancestry, dependency readiness and ownership ledger.

- [ ] **Step 1: Verify branch and baseline ancestry**

Run:

```bash
git branch --show-current
git merge-base --is-ancestor 4339526f45db33b4f9e460a367004f2f2628d254 HEAD
git status --short
```

Expected: branch is `codex/wave-1-runtime-foundations`; ancestry command exits 0; no tracked modification exists before the approved spec/plan edits.

- [ ] **Step 2: Verify Foundation gate**

Run:

```bash
corepack pnpm install --frozen-lockfile
node scripts/verify-foundation.mjs
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Expected: every command exits 0 before Wave 1 runtime code begins.

- [ ] **Step 3: Register path ownership**

Record:

```text
Agent A: apps/api/**, compose.yaml, infra/docker/**, infra/scripts/{wait-for-db.sh,test-compose.sh}, .env.example, .github/**, scripts/verify-ci.mjs
Agent B: apps/mobile/**, apps/admin/**, packages/ui/**
Coordinator: pnpm-lock.yaml, root workspace files, plan/spec/ledger, Git state
```

Expected: no path has two writers.

---

## 4. Parallel Start and Dependency Barrier D1

### Task PH-02-T01: NestJS Application Shell — Agent A

**Files:**

- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/nest-cli.json`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/src/config/env.schema.ts`
- Test: `apps/api/src/app.e2e-spec.ts`

**Interfaces:**

- Consumes: `@leopard/shared`, `@leopard/validators`.
- Produces: Nest application prefix `/api/v1`, strict env parsing, CORS allowlist, global validation and shutdown hooks.

- [ ] **Step 1: Create the API manifest and exact scripts without application implementation**

Required scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`, `test:contract`, `prisma:migrate:test`. Do not create `main.ts` or `app.module.ts` yet.

- [ ] **Step 2: Write the failing shell E2E test**

Test imports the not-yet-implemented application bootstrap and proves a request can reach the app after implementation. It must not expect T05 health behavior to pass.

- [ ] **Step 3: Stop at Barrier D1 before running RED**

Handoff manifest, scripts and failing test to Coordinator. Dependency installation is required before the RED command can be meaningful. Do not modify `pnpm-lock.yaml`.

### Task PH-03-T01: Expo Runtime Shell — Agent B

**Files:**

- Create: `apps/mobile/package.json`
- Create: `apps/mobile/app.json`
- Create: `apps/mobile/tsconfig.json`
- Create: `apps/mobile/babel.config.js`
- Create: `apps/mobile/app/_layout.tsx`
- Create: `apps/mobile/app/index.tsx`
- Test: `apps/mobile/src/smoke.test.tsx`

**Interfaces:**

- Produces: Expo SDK 57 root shell, safe-area/error boundary, provider slot and scripts `start`, `android`, `ios`, `test`, `test:e2e`, `lint`, `typecheck`, `export`.

- [ ] **Step 1: Create the mobile manifest and exact scripts without root implementation**

Declare scripts `start`, `android`, `ios`, `test`, `test:e2e`, `lint`, `typecheck`, `export`. Do not create the root layout/index yet.

- [ ] **Step 2: Write the failing root render test**

Test imports the not-yet-implemented root route and will assert it mounts without console errors. It must not introduce a real login/order screen.

- [ ] **Step 3: Stop at Barrier D1 before running RED**

Handoff manifest, scripts and failing test to Coordinator. Dependency installation is required before the RED command can be meaningful. Do not modify `pnpm-lock.yaml`.

### Task C-D1: Synchronize API and mobile dependencies — Coordinator

**Files:**

- Modify: `pnpm-lock.yaml`
- Review: `apps/api/package.json`, `apps/mobile/package.json`

- [ ] **Step 1: Freeze both agents' package-manager activity**

Expected: neither agent runs pnpm install while D1 is active.

- [ ] **Step 2: Review exact dependency versions**

Expected: versions match phase plans; no `latest`, wildcard or unapproved framework.

- [ ] **Step 3: Generate the lockfile once**

Run:

```bash
corepack pnpm install
git diff -- pnpm-lock.yaml apps/api/package.json apps/mobile/package.json
```

Expected: install exits 0; lockfile changes only add approved API/mobile importers and dependencies.

- [ ] **Step 4: Run meaningful RED verification with package matching enforced**

Agent A runs:

```bash
pnpm --filter api --fail-if-no-match test:e2e
```

Expected: non-zero because the E2E test imports the missing application bootstrap; output must not say “No projects matched”.

Agent B runs:

```bash
pnpm --filter mobile --fail-if-no-match test
```

Expected: non-zero because the smoke test imports the missing root app; output must not say “No projects matched”.

- [ ] **Step 5: Implement the two minimal runtime shells in parallel**

Agent A creates Nest bootstrap/module/env configuration without feature controllers. Agent B creates Expo identity `com.leopard.pilot`, Router root, safe area and error boundary without real feature screens.

- [ ] **Step 6: Complete T01 GREEN verification**

Agent A runs:

```bash
pnpm --filter api --fail-if-no-match test:e2e
pnpm --filter api --fail-if-no-match typecheck
pnpm --filter api --fail-if-no-match build
```

Expected: all exit 0; health remains unimplemented until T05.

Agent B runs:

```bash
pnpm --filter mobile --fail-if-no-match test
pnpm --filter mobile --fail-if-no-match typecheck
pnpm --filter mobile --fail-if-no-match export
```

Expected: all exit 0.

- [ ] **Step 7: Cross-review and Coordinator checkpoint**

Agent B reviews PH-02-T01; Agent A reviews PH-03-T01. After both tasks are GREEN and reviewed, Coordinator stages only the two runtime shells plus lockfile and creates the D1 checkpoint. Agents do not commit.

Checkpoint commit summary:

```text
build(runtime): scaffold API and mobile foundations
```

---

## 5. Agent A Lane — Backend Core and Database Bootstrap

### Task PH-13-T01A: Database slice for Local Infrastructure — Agent A

This is the first slice of PH-13-T01 and remains `IN_PROGRESS` until application Dockerfiles are completed later. It runs now because PH-02-T02 requires PostGIS and the repository has no database Compose baseline.

**Files:**

- Create/Modify: `compose.yaml` for PostgreSQL/PostGIS service only
- Create: `.env.example` with API/DB/demo-provider names known after PH-02-T01
- Create: `infra/scripts/wait-for-db.sh`
- Create: `infra/scripts/with-compose-cleanup.sh`
- Create/Modify: `infra/scripts/test-compose.sh` for database checks

**Produces:** PostgreSQL 17/PostGIS 3.5 local service with health check and no literal credential.

- [ ] **Step 1: Write database Compose checks**

Checks must detect missing PostGIS image/version, missing health check and committed real credential. `with-compose-cleanup.sh` must execute its argument command, capture its exit status, always run `docker compose down`, then exit with the captured status; tests must prove a deliberate command failure remains non-zero and leaves no running Compose service.

- [ ] **Step 2: Run RED verification**

Run:

```bash
bash infra/scripts/test-compose.sh
```

Expected: non-zero because `compose.yaml`/PostGIS service is absent and the new checks detect it.

- [ ] **Step 3: Implement the database slice**

Use environment interpolation and demo-safe local defaults; leave real-provider credential values blank in `.env.example`.

`infra/scripts/with-compose-cleanup.sh` must implement this exact status policy:

```bash
#!/usr/bin/env bash
set -u

command_status=0
"$@" || command_status=$?

cleanup_status=0
docker compose down || cleanup_status=$?

if ((command_status != 0)); then
  exit "$command_status"
fi

exit "$cleanup_status"
```

This returns the original command failure; when the command succeeds, a cleanup failure becomes the returned failure.

- [ ] **Step 4: Run GREEN verification**

Run:

```bash
docker compose config
bash infra/scripts/with-compose-cleanup.sh bash -lc 'docker compose up -d --wait postgres && bash infra/scripts/test-compose.sh'
```

Expected: config/test exit 0, PostgreSQL reports healthy with PostGIS available, and the wrapper leaves no running Compose service. A deliberately failing wrapped command must return its original non-zero status after cleanup.

- [ ] **Step 5: Cross-review database readiness**

Agent B reviews only the database slice and Coordinator records its GREEN evidence. PH-13-T01 remains `IN_PROGRESS`; these infrastructure files are not committed until PH-13-T01B completes and the canonical task is `VERIFIED`.

### Task PH-02-T02: Prisma and PostGIS Baseline — Agent A

**Files:**

- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma.config.ts`
- Create: `apps/api/prisma/migrations/0001_baseline/migration.sql`
- Create: `apps/api/src/database/prisma.service.ts`
- Create: `apps/api/src/database/database.module.ts`
- Test: `apps/api/test/database-schema.spec.ts`

**Interfaces:**

- Produces: canonical pilot entities/enums/indexes/constraints from `docs/data/01-database-design.md`.

- [ ] **Step 1: Write metadata tests**

Tests cover required tables, PostGIS extension, geography points, GiST indexes, active-driver order constraint, FleetMember membership indexes, tracking deduplication and active payment-intent uniqueness.

- [ ] **Step 2: Run RED verification against the empty test database**

Run:

```bash
pnpm --filter api --fail-if-no-match prisma:migrate:test
```

Expected: FAIL because schema/migration is absent.

- [ ] **Step 3: Implement Prisma schema and baseline SQL migration**

Use UUID, timestamptz, integer VND/meter/second, `geography(Point,4326)` and JSONB only for provider/audit snapshots.

- [ ] **Step 4: Run GREEN verification**

Run:

```bash
bash infra/scripts/with-compose-cleanup.sh bash -lc 'docker compose up -d --wait postgres && pnpm --filter api --fail-if-no-match prisma:migrate:test && pnpm --filter api --fail-if-no-match test -- database-schema && pnpm --filter api --fail-if-no-match typecheck'
```

Expected: migration applies to a clean database and metadata tests pass.

- [ ] **Step 5: Cross-review and handoff**

Agent B reviews schema against data docs. Agent A reports migration checksum. Suggested Coordinator commit:

```text
feat(data): add pilot database baseline
```

### Task PH-02-T03: Request Context, Errors and Logging — Agent A

**Files:**

- Create: `apps/api/src/common/request-context.middleware.ts`
- Create: `apps/api/src/common/api-exception.filter.ts`
- Create: `apps/api/src/common/domain-error.ts`
- Create: `apps/api/src/common/logger.service.ts`
- Test: `apps/api/src/common/api-exception.filter.spec.ts`

**Interfaces:**

- Produces: `DomainError(code, status, message, details?)`, request context and `ApiErrorEnvelope`.

- [ ] **Step 1: Write failing behavior tests**

Cover generated/preserved `x-request-id`, validation 422, safe unknown 500, structured log fields and redaction for authorization/cookie/token/phone.

- [ ] **Step 2: Run RED verification**

```bash
pnpm --filter api --fail-if-no-match test -- common
```

Expected: FAIL because common pipeline is absent.

- [ ] **Step 3: Implement minimal common pipeline**

Use AsyncLocalStorage for request context. Never log request bodies, media content, tokens or phone numbers.

- [ ] **Step 4: Run GREEN verification**

```bash
pnpm --filter api --fail-if-no-match test -- common
pnpm --filter api --fail-if-no-match typecheck
pnpm --filter api --fail-if-no-match lint
```

Expected: all pass; no secret or stack in 500 responses.

- [ ] **Step 5: Cross-review and checkpoint**

Suggested Coordinator commit:

```text
feat(api): standardize errors and request logs
```

### Task PH-02-T04: OpenAPI Contract Foundation — Agent A

**Files:**

- Create: `apps/api/openapi/openapi.yaml`
- Create: `apps/api/test/openapi-contract.spec.ts`
- Create: `apps/api/src/docs/docs.module.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**

- Produces: OpenAPI 3.1 paths/schemas/security for the approved REST API; exact canonical enums.

- [ ] **Step 1: Write contract tests**

Tests validate OpenAPI 3.1 syntax, unique operation IDs, private-path bearer security, public exceptions and exact enums.

- [ ] **Step 2: Run RED verification**

```bash
pnpm --filter api --fail-if-no-match test:contract
```

Expected: FAIL because OpenAPI document is absent.

- [ ] **Step 3: Define the complete approved contract**

Include auth, orders/estimate, maps, Driver, Fleet, media/payment, Admin and health. Swagger exposure requires `ENABLE_API_DOCS=true` and is off in production by default.

- [ ] **Step 4: Run GREEN verification**

```bash
pnpm --filter api --fail-if-no-match test:contract
pnpm --filter api --fail-if-no-match typecheck
pnpm --filter api --fail-if-no-match build
```

Expected: all pass.

- [ ] **Step 5: Freeze Barrier D2**

Agent B cross-reviews REST spec coverage. Coordinator records exact env names, OpenAPI checksum and Prisma migration checksum. After D2, agents treat OpenAPI/env names as read-only.

Suggested commit:

```text
docs(api): establish OpenAPI contract baseline
```

### Task PH-02-T05: Health and Backend Gate — Agent A

**Files:**

- Create: `apps/api/src/health/health.module.ts`
- Create: `apps/api/src/health/health.controller.ts`
- Create: `apps/api/src/health/health.service.ts`
- Test: `apps/api/src/health/health.e2e-spec.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**

- Produces: `GET /api/v1/health/live`, `GET /api/v1/health/ready`.

- [ ] **Step 1: Write health E2E tests**

Test liveness without DB query; readiness 200 on `SELECT 1`; readiness 503 with `SERVICE_NOT_READY` when DB fails or times out.

- [ ] **Step 2: Run RED verification**

```bash
pnpm --filter api --fail-if-no-match test:e2e -- health
```

Expected: FAIL because HealthModule is absent.

- [ ] **Step 3: Implement health module**

Keep liveness process-only and readiness DB-aware with bounded timeout.

- [ ] **Step 4: Run PH-02 GREEN gate**

```bash
bash infra/scripts/with-compose-cleanup.sh bash -lc 'docker compose up -d --wait postgres && pnpm --filter api --fail-if-no-match lint && pnpm --filter api --fail-if-no-match typecheck && pnpm --filter api --fail-if-no-match test && pnpm --filter api --fail-if-no-match test:e2e && pnpm --filter api --fail-if-no-match test:contract && pnpm --filter api --fail-if-no-match build && pnpm --filter api --fail-if-no-match prisma:migrate:test'
```

Expected: all commands exit 0.

- [ ] **Step 5: Cross-review and verify PH-02**

Agent B verifies no feature endpoints beyond health/docs-controlled exposure. Suggested Coordinator commit:

```text
feat(health): add liveness and readiness checks
```

---

## 6. Agent B Lane — Mobile Foundation

### Task PH-03-T02: Navigation and Role Boundary — Agent B

**Files:**

- Create: `apps/mobile/app/(public)/login.tsx`
- Create: `apps/mobile/app/(customer)/_layout.tsx`
- Create: `apps/mobile/app/(customer)/orders/index.tsx`
- Create: `apps/mobile/app/(driver)/_layout.tsx`
- Create: `apps/mobile/app/(driver)/orders/index.tsx`
- Create: `apps/mobile/src/navigation/role-router.ts`
- Test: `apps/mobile/src/navigation/role-router.test.ts`

**Interfaces:**

- Produces: `getMobileHome(role)` mapping Customer/Driver routes and unsupported operations roles.

- [ ] **Step 1: Write role mapping and hydration tests**
- [ ] **Step 2: Run `pnpm --filter mobile --fail-if-no-match test -- role-router`; expect FAIL**
- [ ] **Step 3: Implement route groups and guard without protected-screen flash**
- [ ] **Step 4: Run scoped tests, mobile typecheck and export; expect PASS**
- [ ] **Step 5: Agent A cross-reviews role boundary; Coordinator checkpoints `feat(mobile): add role-aware navigation shell`**

### Task PH-03-T03: Mobile Theme and State Primitives — Agent B

**Files:**

- Create: `apps/mobile/src/theme/tokens.ts`
- Create: `apps/mobile/src/ui/Button.tsx`
- Create: `apps/mobile/src/ui/FormField.tsx`
- Create: `apps/mobile/src/ui/StatusBadge.tsx`
- Create: `apps/mobile/src/ui/ScreenState.tsx`
- Create: `apps/mobile/src/ui/EtaIndicator.tsx`
- Test: `apps/mobile/src/ui/primitives.test.tsx`

**Interfaces:**

- Produces: semantic tokens and accessible primitives; `EtaIndicator` always labels DEMO data.

- [ ] **Step 1: Write tests for 44x44 target, loading/disabled copy, badge text, screen states and DEMO label**
- [ ] **Step 2: Run `pnpm --filter mobile --fail-if-no-match test -- primitives`; expect FAIL**
- [ ] **Step 3: Implement exact spacing 4/8/12/16/24/32, radius 6 and semantic colors**
- [ ] **Step 4: Run tests and viewport checks at 360x800 and 390x844; expect no overflow/layout shift**
- [ ] **Step 5: Agent A cross-reviews UI rules; Coordinator checkpoints `feat(mobile): add accessible design primitives`**

### Task PH-03-T04: API and Session Client Boundary — Agent B

**Files:**

- Create: `apps/mobile/src/api/http-client.ts`
- Create: `apps/mobile/src/api/query-client.ts`
- Create: `apps/mobile/src/api/api-error.ts`
- Create: `apps/mobile/src/auth/session-store.ts`
- Create: `apps/mobile/src/auth/secure-session-storage.ts`
- Test: `apps/mobile/src/api/http-client.test.ts`
- Test: `apps/mobile/src/auth/session-store.test.ts`

**Interfaces:**

- Produces: typed request, one refresh retry, concurrent refresh deduplication, session hydration/logout.

- [ ] **Step 1: Write tests for bearer, request ID, retry/deduplication, error envelope and refresh failure logout**
- [ ] **Step 2: Run scoped API/auth tests; expect FAIL**
- [ ] **Step 3: Implement transport using `EXPO_PUBLIC_API_URL`, SecureStore refresh credential and memory-only access token**
- [ ] **Step 4: Run mobile `lint`, `typecheck`, `test`, `export` with `pnpm --filter mobile --fail-if-no-match <script>`; expect all exit 0**
- [ ] **Step 5: Agent A cross-reviews token handling; Coordinator checkpoints `feat(mobile): add typed API session boundary` and marks PH-03 VERIFIED**

---

## 7. Web Dependency Barrier D3

### Task PH-04-T01A: Prepare Operations Web manifests — Agent B

**Files:**

- Create: `apps/admin/package.json`
- Create: `packages/ui/package.json`
- Create: `apps/admin/next.config.ts`
- Create: `apps/admin/tsconfig.json`

- [ ] **Step 1: Add exact package names, scripts and pinned dependencies from PH-04**

`apps/admin/package.json` must use `"name": "web"`; `packages/ui/package.json` must use `"name": "@leopard/ui"`. Both names are locked because verification uses exact pnpm filters.

- [ ] **Step 2: Do not install or edit lockfile; hand manifests to Coordinator**

### Task C-D3: Synchronize web/UI dependencies — Coordinator

- [ ] **Step 1: Freeze package-manager activity**
- [ ] **Step 2: Review manifests against approved Next/React/Tailwind/UI stack**
- [ ] **Step 3: Run dependency sync**

```bash
corepack pnpm install
git diff -- pnpm-lock.yaml apps/admin/package.json packages/ui/package.json
```

Expected: install exits 0; only approved web/UI importers and dependencies are added.

- [ ] **Step 4: Unfreeze Agent B after lockfile review**

---

## 8. Agent B Lane — Operations Web Foundation

### Task PH-04-T01: Next.js Runtime Shell — Agent B

**Files:**

- Complete: `apps/admin/package.json`, config
- Create: `apps/admin/src/app/layout.tsx`
- Create: `apps/admin/src/app/page.tsx`
- Create: `apps/admin/src/app/globals.css`
- Test: `apps/admin/src/app/page.test.tsx`

- [ ] **Step 1: Write unauthenticated root redirect test**
- [ ] **Step 2: Run `pnpm --filter web --fail-if-no-match test`; expect FAIL**
- [ ] **Step 3: Implement App Router shell, metadata, local font fallback and provider slot**
- [ ] **Step 4: Run `pnpm --filter web --fail-if-no-match test`, `typecheck`, `build`; expect all exit 0**
- [ ] **Step 5: Agent A cross-reviews foundation-only scope; Coordinator checkpoints `build(admin): scaffold operations web`**

### Task PH-04-T02: Role Layout and Navigation — Agent B

**Files:**

- Create: `apps/admin/src/app/(auth)/login/page.tsx`
- Create: `apps/admin/src/app/(fleet)/fleet/layout.tsx`
- Create: `apps/admin/src/app/(admin)/admin/layout.tsx`
- Create: `apps/admin/src/components/shell/OperationsShell.tsx`
- Create: `apps/admin/src/components/shell/RoleNavigation.tsx`
- Create: `apps/admin/playwright.config.ts`
- Test: `apps/admin/e2e/shell.spec.ts`
- Test: `apps/admin/src/components/shell/RoleNavigation.test.tsx`

- [ ] **Step 1: Write exact role navigation and permission tests**
- [ ] **Step 2: Run `pnpm --filter web --fail-if-no-match test -- RoleNavigation`; expect FAIL**
- [ ] **Step 3: Implement desktop sidebar/tablet drawer with focus trap, Escape close and current route**
- [ ] **Step 4: Install Playwright Chromium, then run component and shell E2E tests**

```bash
pnpm --filter web --fail-if-no-match exec playwright install chromium
pnpm --filter web --fail-if-no-match test -- RoleNavigation
pnpm --filter web --fail-if-no-match test:e2e
```

Expected: component tests pass; Playwright starts the configured web server and checks 768x1024, 1024x768 and 1440x900 without overflow or navigation accessibility failure.

- [ ] **Step 5: Agent A cross-reviews role policy; Coordinator checkpoints `feat(admin): add role-scoped operations shell`**

### Task PH-04-T03: Web Design System — Agent B

**Files:**

- Create: `packages/ui/src/tokens.css`
- Create: `packages/ui/src/Button.tsx`
- Create: `packages/ui/src/StatusBadge.tsx`
- Create: `packages/ui/src/DataTable.tsx`
- Create: `packages/ui/src/Pagination.tsx`
- Create: `packages/ui/src/FilterBar.tsx`
- Create: `packages/ui/src/ScreenState.tsx`
- Create: `packages/ui/src/MapPanel.tsx`
- Test: `packages/ui/src/components.test.tsx`

- [ ] **Step 1: Write focus/name/state/loading/pagination tests**
- [ ] **Step 2: Run `pnpm --filter @leopard/ui --fail-if-no-match test`; expect FAIL**
- [ ] **Step 3: Implement design-system tokens/primitives; DataTable remains controlled and never fetches**
- [ ] **Step 4: Run `pnpm --filter @leopard/ui --fail-if-no-match test` and `typecheck`; expect PASS**
- [ ] **Step 5: Agent A cross-reviews accessibility/states; Coordinator checkpoints `feat(ui): add operations design system`**

### Task PH-04-T04: Web API and Session Boundary — Agent B

**Files:**

- Create: `apps/admin/src/lib/api/server-client.ts`
- Create: `apps/admin/src/lib/api/browser-client.ts`
- Create: `apps/admin/src/lib/api/api-error.ts`
- Create: `apps/admin/src/lib/auth/session.ts`
- Create: `apps/admin/src/lib/auth/role-policy.ts`
- Test: `apps/admin/src/lib/api/client.test.ts`
- Test: `apps/admin/src/lib/auth/role-policy.test.ts`

- [ ] **Step 1: Write bearer/session, no-token-exposure, envelope, 401 and 403 tests**
- [ ] **Step 2: Run `pnpm --filter web --fail-if-no-match test -- client role-policy`; expect FAIL**
- [ ] **Step 3: Implement same-origin BFF/session boundary; keep authorization in API**
- [ ] **Step 4: Run web `lint`, `typecheck`, `test`, `test:e2e`, `build` with `pnpm --filter web --fail-if-no-match <script>`; expect all exit 0**
- [ ] **Step 5: Agent A cross-reviews security; Coordinator checkpoints `feat(admin): add secure API session boundary` and marks PH-04 VERIFIED**

---

## 9. Agent A Lane — Complete Platform Foundation

### Task PH-13-T01B: Complete Local Infrastructure Foundation — Agent A

**Files:**

- Create: `infra/docker/api.Dockerfile`
- Create: `infra/docker/admin.Dockerfile`
- Modify: `compose.yaml`
- Modify: `infra/scripts/test-compose.sh`
- Verify: `.env.example`, `infra/scripts/wait-for-db.sh`, `infra/scripts/with-compose-cleanup.sh`

**Dependency:** Barrier D2, PH-02-T05 GREEN and PH-04-T01 GREEN. This closes PH-13-T01 started in T01A.

- [ ] **Step 1: Extend infrastructure tests for non-root users, multi-stage builds and literal-secret detection**
- [ ] **Step 2: Run `bash infra/scripts/test-compose.sh`; expect FAIL before Dockerfiles/services exist**
- [ ] **Step 3: Implement app Dockerfiles and Compose services without deployment behavior**
- [ ] **Step 4: Build and smoke the app images, then clean up**

```bash
docker compose config
docker compose build api admin
bash infra/scripts/with-compose-cleanup.sh bash -lc 'docker compose up -d postgres api admin && bash infra/scripts/test-compose.sh'
```

Expected: images build; API health and admin root smoke pass; runtime users are non-root; no literal credential exists; the wrapper always cleans up and returns the original smoke exit status.

- [ ] **Step 5: Agent B cross-reviews runtime/env alignment; Coordinator checkpoints `build(infra): complete local pilot runtime` and marks PH-13-T01 VERIFIED**

### Task PH-13-T03: CI Matrix and Supply Chain Gate — Agent A

**Files:**

- Modify: `.github/workflows/ci.yml`
- Create: `.github/workflows/security.yml`
- Create: `.github/dependabot.yml`
- Create: `scripts/verify-ci.mjs`

**Dependency:** Actual API/mobile/web/UI scripts exist; PH-13-T01 verified.

- [ ] **Step 1: Write CI verifier first**

Verifier checks pinned action majors, least permissions, frozen lockfile, Node 24, no secret interpolation into artifacts, DB service for integration and no deployment on fork PR.

- [ ] **Step 2: Run RED verification**

```bash
node scripts/verify-ci.mjs
```

Expected: FAIL because baseline CI lacks Wave 1 matrix/security requirements.

- [ ] **Step 3: Implement CI/security/dependabot configuration**

PR jobs cover install, lint, typecheck, unit/integration, contract and build. Real provider credentials remain optional and unused by deterministic tests.

- [ ] **Step 4: Run GREEN verification**

```bash
node scripts/verify-ci.mjs
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Expected: all commands exit 0.

- [ ] **Step 5: Agent B cross-reviews workflow and supply-chain policy**

Suggested Coordinator commit:

```text
ci: expand pilot quality and security gates
```

---

## 10. Review Gates

### Gate R1: Spec compliance

For every task, cross-reviewer must verify:

- [ ] Goal and exact owned paths match this plan and phase plan.
- [ ] No feature outside Wave 1 was added.
- [ ] Public names, enums, endpoint paths and UI copy match source documents.
- [ ] RED evidence proves the behavior was absent.
- [ ] GREEN evidence covers every task output.
- [ ] No controlled surface changed without Coordinator decision.

### Gate R2: Quality, security and test design

- [ ] Tests assert observable behavior, including failure paths.
- [ ] API owns authorization and business decisions.
- [ ] Token, cookie, phone, request body, media, secret and stack are not leaked.
- [ ] UI covers loading/error/permission primitives and required responsive constraints.
- [ ] No unrelated dependency, refactor, generated artifact or source-doc change exists.
- [ ] Critical/Important findings are fixed and commands rerun before `VERIFIED`.

---

## 11. Blocker Handling

Agent must stop writing the blocked surface and send:

```text
Task: <task id>
Current HEAD: <sha>
Blocked surface: <exact path/type/signature>
Current owner: <role>
Requirement/contract: <FR/AC/NFR or plan section>
Observed evidence: <command/error>
Minimal proposed change: <specific change>
Consumers affected: <task IDs>
Migration/backward compatibility: none | additive | breaking
Exact tests required: <files/commands>
```

Coordinator chooses exactly one action:

1. Reject and require a solution within current ownership.
2. Freeze both agents and transfer ownership for one named change.
3. Create a sequential remediation checkpoint before resuming.

An agent cannot resolve a controlled-surface blocker by itself.

---

## 12. Final Wave 1 Gate

### Task C-FINAL: Freeze writers and verify the single branch

**Files:**

- Review: all Wave 1 changes
- Modify only if approved remediation is required

- [ ] **Step 1: Stop both implementation agents from writing**

Expected: working tree is stable during final verification.

- [ ] **Step 2: Regenerate and validate lockfile state**

Run:

```bash
corepack pnpm install
corepack pnpm install --frozen-lockfile
git diff -- pnpm-lock.yaml
```

Expected: frozen install exits 0; any first-command lockfile diff is reviewed and owned only by Coordinator.

- [ ] **Step 3: Run root quality gates**

```bash
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
```

Expected: all commands exit 0; the wrapper preserves DB-test failures and always cleans up; API E2E uses PostGIS, mobile uses deterministic unit/export checks without requiring a device, and web shell E2E uses Playwright Chromium with its configured web server. Full mobile Maestro journeys remain in PH-12 because Wave 1 has no feature flow or device runner.

- [ ] **Step 4: Run platform gates**

```bash
docker compose config
docker compose build api admin
bash infra/scripts/with-compose-cleanup.sh bash -lc 'docker compose up -d postgres api admin && bash infra/scripts/test-compose.sh'
node scripts/verify-ci.mjs
git diff --check
git status --short
```

Expected: images build; API/admin runtime and non-root smoke pass; the wrapper returns the original smoke status after cleanup; CI checks exit 0; status contains only intended Wave 1 files and approved documentation edits.

- [ ] **Step 5: Verify manual UI evidence**

Expected evidence:

```text
Mobile: 360x800, 390x844 — no horizontal overflow, protected-screen flash or clipped 44x44 controls
Web: 768x1024, 1024x768, 1440x900 — navigation usable, focus visible, no accidental page overflow
ETA DEMO: “Dữ liệu mô phỏng” visible next to “ETA dự kiến”
```

- [ ] **Step 6: Run final scope/security review**

Confirm:

- No Auth/Order/Map/Tracking/Media/Payment/Fleet/Admin feature behavior was implemented.
- No private data is accessible outside role/ownership boundaries introduced by foundation shells.
- No secret, PII, unrelated refactor, `.codex/**` or `.stitch/**` is staged.
- OpenAPI, migration, health, mobile export, web build, infrastructure and CI evidence are recorded.
- No Critical/Important finding remains open.

- [ ] **Step 7: Coordinator commits and pushes**

Implementation agents do not run this step. Coordinator chooses atomic checkpoint commits or a final aggregate commit, then pushes only the approved branch:

```bash
git push -u origin codex/wave-1-runtime-foundations
```

Expected: remote branch contains the reviewed Wave 1 result; `develop` and `main` remain unchanged.

---

## 13. Wave 1 Exit Criteria

- [ ] PH-02-T01..T05 are `VERIFIED`.
- [ ] PH-03-T01..T04 are `VERIFIED`.
- [ ] PH-04-T01..T04 are `VERIFIED`.
- [ ] PH-13-T01 and PH-13-T03 are `VERIFIED`.
- [ ] All D1/D2/D3 barrier decisions and lockfile diffs have Coordinator evidence.
- [ ] API contract and migration checks pass.
- [ ] Liveness/readiness meet AC-07.
- [ ] Mobile export and web build pass at required viewports.
- [ ] Compose/CI verification passes without real provider credentials.
- [ ] Root final gate exits 0.
- [ ] No Critical/Important review finding remains.
- [ ] Only Coordinator performed commit/push.
- [ ] Wave 2 remains unopened until this complete checklist is verified.

## 14. Daily Sync

Each agent reports without mutating Git:

```text
Lane: Agent A Backend/Platform | Agent B Client Foundations
Current task: <exact ID>
Status: NOT_STARTED | READY | IN_PROGRESS | IN_REVIEW | INTEGRATED | VERIFIED | BLOCKED
Evidence milestone: NONE | RED_CONFIRMED | GREEN_CONFIRMED
Current HEAD observed: <sha>
Verification run: <command/result>
Files owned today: <exact paths>
Files changed: <exact paths>
Blockers/contract requests: <none or report>
```
