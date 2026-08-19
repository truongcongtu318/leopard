# LEOPARD Wave 3B Execution Plan

> **For agentic workers:** Execute task-by-task with TDD. Backend and Web owners use separate worktrees and must not edit each other's owned surfaces.

**Goal:** Implement PH-10 Fleet Owner Lite and PH-11 Admin Operations on the verified Wave 3A baseline.  
**Context:** `docs/superpowers/specs/2026-08-09-wave-3-delivery-design.md`, PH-10/PH-11 plans, FR-04/FR-09, AC-05/AC-07.  
**Constraints:** Fleet Owner is read-only and never inherits Admin. Admin commands must call application services and write append-only audit atomically.  
**Done when:** PH-10/PH-11 API, UI, authorization, audit and viewport gates pass with no P0/P1 in Wave 3B scope.

> ## ⚠️ Ownership boundary — Wave 3 is backend-only (2026-08-15)
>
> Thành viên Wave 3 chỉ sở hữu **backend**. Các surface frontend và web E2E **thuộc Wave 4** và Wave 3 không được đụng vào (tránh conflict):
>
> - **PH-10-T03** (Fleet Operations Pages, `apps/admin/src/app/(fleet)/**`) → **Wave 4**
> - **PH-11-T03** (Admin Dashboard Pages, `apps/admin/src/app/(admin)/**`) → **Wave 4**
> - Web E2E / Playwright viewport gates / component + a11y web tests → **Wave 4**
>
> Wave 3 chỉ giao các task backend: PH-10-T01/T02 (policy + read APIs), PH-11-T01/T02 (query APIs + audited commands), và phần REST/socket isolation của PH-10-T04 / PH-11-T04 (bỏ phần "UI does not reveal" / "Admin UI command journeys").

## 1. Entry Gate

- [ ] Wave 3A integration SHA is recorded and contains verified PH-08/PH-09 contracts.
- [ ] Create PH-10 and PH-11 task branches from the same Wave 3A baseline.
- [ ] AuditService from Wave 3A is available and append-only.
- [ ] Tracking query service and Payment summary/query ports are exported for authorized consumers.
- [ ] Seed fixtures include two fleets, active/inactive memberships, assigned/unassigned orders, tracking, media and payment states.
- [ ] Integration Owner locks OpenAPI/shared/AppModule/seed ownership.

## 2. Task W3B-T00: Consumer Contract and Seed Preflight

**Owner:** Integration/Contract/Data Owner  
**Blocks:** PH-10-T02, PH-11-T01 and E2E gates

**RED/GREEN:**

- [ ] Add contract tests for Fleet/Admin page envelopes, bounded filters and allowlisted sort.
- [ ] Define fleet Driver/order/payment-summary projections without private fields.
- [ ] Define Admin query projection and privileged command request DTOs.
- [ ] Clarify audit timeline response if exposed to Admin detail.
- [ ] Publish deterministic seed IDs for two fleets and cross-scope attack cases.
- [ ] Keep seed cleanup restricted to manifest-owned IDs.
- [ ] Run OpenAPI/schema/seed tests.

**Commit:** `feat(platform): publish wave 3b consumer contracts`

## 3. PH-10 Fleet Owner Lane

### Task PH-10-T01: Fleet Membership Policy

**Owner:** Fleet Backend Owner  
**Depends on:** Wave 3A baseline

**Files:**

- Create `apps/api/src/fleets/fleet-membership.policy.ts`
- Create `apps/api/src/fleets/fleet-scope.repository.ts`
- Create policy specs

**RED:**

- [ ] Active OWNER membership resolves exactly one fleet scope.
- [ ] INVITED/REMOVED Owner receives 403.
- [ ] Owner with no fleet receives stable permission error.
- [ ] Wrong-fleet/unassigned order uses 404 non-disclosure where specified.
- [ ] Assigned Driver must have active DRIVER membership in same fleet.
- [ ] Client-supplied fleet ID never expands scope.

**GREEN:**

- [ ] Implement `resolveFleetScope(actor)` from server-side membership.
- [ ] Implement `assertOrderInFleet` using current active membership policy.
- [ ] Keep policy reusable by REST and socket/query consumers.

**VERIFY:**

- [ ] Full policy matrix passes with critical branches at 100%.

**Commit:** `feat(fleet): enforce active membership scope`

### Task PH-10-T02: Fleet Read APIs

**Owner:** Fleet Backend Owner  
**Depends on:** PH-10-T01, W3B-T00

**Files:**

- Create `fleets.module.ts`, `fleet-owner.controller.ts`, `fleet-owner.service.ts`
- Create fleet E2E specs
- Integration Owner owns AppModule wiring

**Endpoints:**

- `GET /fleet/profile`
- `GET /fleet/drivers`
- `GET /fleet/orders`
- `GET /fleet/orders/:id`
- `GET /fleet/orders/:id/tracking`

**RED:**

- [ ] Fleet Owner-only access.
- [ ] Server pagination, filters, date bounds, query and sort allow-list.
- [ ] Driver availability, active-order and last-known-location projection.
- [ ] Order tracking and payment summary through PH-08/PH-09 query ports.
- [ ] Two-fleet isolation for item lists, counts and detail.
- [ ] Removed Driver/order becomes invisible according to current-membership policy.
- [ ] No N+1 query regression at seed volume.

**GREEN:**

- [ ] Implement bounded select projections.
- [ ] Never return raw phone/address/provider snapshot unless explicitly contracted.
- [ ] Reuse Tracking/Payment/Order query services; no cross-module mutation.
- [ ] Reject Fleet Owner on lifecycle/payment/admin commands.

**VERIFY:**

- [ ] Fleet E2E, OpenAPI and query-count tests pass.

**Commit:** `feat(fleet): expose scoped fleet operations data`

### Task PH-10-T03: Fleet Operations Pages — **DEFERRED TO WAVE 4**

> ⚠️ Frontend task. Thuộc Wave 4 (Wave 3 = backend-only). Wave 3 không implement phần này.

**Owner:** Fleet Web Owner  
**Depends on:** PH-10-T02 stable API

**Files:**

- Fleet routes under `apps/admin/src/app/(fleet)/**`
- Fleet feature components/tests
- Do not edit shared shell/design tokens without UI owner approval

**RED:**

- [ ] Loading, empty, error, success and permission-denied states.
- [ ] URL-owned page/status/driver/date/query filters.
- [ ] Clear filters and browser navigation state.
- [ ] Server pagination and stable table columns.
- [ ] No lifecycle/payment/admin mutation actions.
- [ ] “ETA dự kiến” and “Dữ liệu mô phỏng” labels.
- [ ] Keyboard focus, overflow and responsive detail fallback.

**GREEN:**

- [ ] Build profile overview, Driver table, Order table and Order detail.
- [ ] Use `packages/ui` and operational-density rules.
- [ ] Stable map aspect with loading/error/fallback/retry.

**VERIFY:**

- [ ] Component and accessibility tests.
- [ ] Playwright at 768, 1024 and 1440 px.

**Commit:** `feat(fleet): add read-only operations dashboard`

### Task PH-10-T04: Fleet Authorization Gate

**Owner:** Fleet Security/E2E Owner  
**Depends on:** PH-10-T02, PH-10-T03

> ⚠️ Wave 3 scope (backend-only): chỉ giao các mục REST/socket isolation. Mục "Test UI does not reveal foreign IDs in cached/query state" và các UI check thuộc Wave 4 (web E2E).

- [ ] Seed two fleets and every membership state.
- [ ] Test list/count/detail/tracking/payment summary isolation.
- [ ] Test wrong-fleet IDs through REST and socket join.
- [ ] Test forbidden status/payment/admin commands.
- [ ] ~~Test UI does not reveal foreign IDs in cached/query state.~~ → Wave 4
- [ ] Run API full gates (backend).

## 4. PH-11 Admin Operations Lane

### Task PH-11-T01: Admin Query APIs

**Owner:** Admin Backend Query Owner  
**Depends on:** W3B-T00, Wave 3A Tracking/Media/Payment query ports

**Files:**

- Create `apps/api/src/admin/admin.module.ts`
- Create `admin.controller.ts`, `admin-query.service.ts`
- Create Admin query E2E specs

**Endpoints:**

- `GET /admin/dashboard`
- `GET /admin/users`
- `GET /admin/fleets`
- `GET /admin/drivers`
- `GET /admin/orders`
- Authorized order detail reuses existing Order service

**RED:**

- [ ] Explicit Admin-only access for every endpoint.
- [ ] Page bounds and invalid filter handling.
- [ ] Allowlisted sort; reject arbitrary column/raw expression.
- [ ] Status/customer/driver/date/query filters.
- [ ] Aggregate/list consistency.
- [ ] Bounded projections for media/tracking/payment state.
- [ ] Query-count regression fixture preventing N+1.

**GREEN:**

- [ ] Implement server-side filters and stable page envelope.
- [ ] Compose module query services; no direct cross-module mutation.
- [ ] Omit secrets, refresh sessions, provider credentials and raw snapshots.

**VERIFY:**

- [ ] Admin query E2E and OpenAPI tests pass at seed volume.

**Commit:** `feat(admin): expose operational query APIs`

### Task PH-11-T02: Audited Admin Commands

**Owner:** Admin Command Owner  
**Depends on:** PH-11-T01, Wave 3A AuditService and PaymentService

**Files:**

- Create `admin-command.service.ts`
- Modify Admin controller through its owner
- Create command integration tests

**Commands:**

- `PATCH /admin/users/:id/status {status,reason,clientRequestId}`
- Existing Admin order cancellation command
- Existing PH-09 payment confirmation command

**RED:**

- [ ] Explicit Admin-only role.
- [ ] Reason/note required and bounded.
- [ ] Self-disable prevention.
- [ ] Same request ID returns same result.
- [ ] Concurrent duplicates create one mutation and one audit.
- [ ] Failed command creates no mutation and no audit.
- [ ] Audit includes actor/action/target/request ID without sensitive payload.

**GREEN:**

- [ ] Orchestrate User/Order/Payment application services.
- [ ] Pass transaction client through declared command boundary.
- [ ] Append exactly one AuditLog through shared AuditService.
- [ ] Do not add generic Admin repository bypass.

**VERIFY:**

- [ ] Real-DB transaction/rollback/idempotency suite passes.

**Commit:** `feat(admin): add audited operational commands`

### Task PH-11-T03: Admin Dashboard Pages — **DEFERRED TO WAVE 4**

> ⚠️ Frontend task. Thuộc Wave 4 (Wave 3 = backend-only). Wave 3 không implement phần này.

**Owner:** Admin Web Owner  
**Depends on:** PH-11-T01, PH-11-T02 and PH-09 confirmation API

**Files:**

- Admin routes under `apps/admin/src/app/(admin)/**`
- Admin feature components/tests

**RED:**

- [ ] Dashboard/query page loading, empty, error and permission states.
- [ ] URL-owned filter/sort/page state and clear filters.
- [ ] Stable operational tables and tablet detail fallback.
- [ ] Admin command dialog requires reason/note before enable.
- [ ] Confirmation, pending, success and failure behavior.
- [ ] 401 refresh handling and 403 permission handling.
- [ ] No sensitive value rendered into markup/log.

**GREEN:**

- [ ] Build overview, Orders, Users, Fleets and Drivers pages.
- [ ] Reuse same-origin BFF and existing auth session boundary.
- [ ] Implement command dialogs without optimistic privileged mutation unless server result succeeds.
- [ ] Keep design operational; no marketing hero/gradient/glass UI.

**VERIFY:**

- [ ] Component/a11y tests.
- [ ] Playwright at 768, 1024 and 1440 px.

**Commit:** `feat(admin): build operational dashboard workflows`

### Task PH-11-T04: Audit and Operations Gate

**Owner:** Admin Security/E2E Owner  
**Depends on:** PH-11-T02, PH-11-T03

The Audit module already exists from Wave 3A. This task extends verification and authorized read projection only; it must not create a second audit implementation.

> ⚠️ Wave 3 scope (backend-only): bỏ mục "Admin UI command journeys pass end-to-end" (web E2E → Wave 4).

- [ ] Every privileged command creates exactly one audit record.
- [ ] Failed/rolled-back commands create none.
- [ ] Audit records cannot be updated/deleted through API.
- [ ] Request log correlation matches audit request ID.
- [ ] Audit metadata contains no phone, token, credential or raw provider payload.
- [ ] ~~Admin UI command journeys pass end-to-end.~~ → Wave 4
- [ ] API full gates pass (backend).

**Commit:** `test(admin): verify audited operations workflows`

## 5. Parallel Execution and Ownership

After W3B-T00:

- PH-10-T01 and PH-11-T01 may run in parallel.
- PH-10-T02 follows T01; PH-11-T02 follows Admin API/Audit dependencies.
- Fleet Web (PH-10-T03) starts after PH-10 API contract is stable — **Wave 4**.
- Admin Web (PH-11-T03) starts after PH-11 queries/commands are stable — **Wave 4**.
- PH-10-T04 and PH-11-T04 run independently before final integration (backend REST/socket isolation).

No parallel edits to:

- OpenAPI/shared contracts
- Prisma schema/migrations/seed manifest
- `apps/api/src/app.module.ts`
- Admin root layouts/design tokens
- Lockfile

## 6. Wave 3B Integration Gate

**Recommended merge order (Wave 3 backend-only; PH-10-T03 / PH-11-T03 → Wave 4):**

1. W3B-T00.
2. PH-10-T01 and PH-11-T01.
3. PH-10-T02 and PH-11-T02.
4. PH-10-T04 and PH-11-T04 (backend REST/socket isolation).
5. Integration wiring/documentation update.
6. ~~PH-10-T03 and PH-11-T03~~ → Wave 4 (frontend).

**Backend (Wave 3 scope):**

```bash
pnpm --filter api test
pnpm --filter api test:e2e
pnpm --filter api test:contract
pnpm --filter api typecheck
pnpm --filter api lint
pnpm --filter api build
```

**Operations Web (→ Wave 4, không chạy trong Wave 3):**

```bash
pnpm --filter web test
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web build
```

**Final checks (Wave 3 backend-only):**

- [ ] `git diff --check`.
- [ ] Two-fleet authorization matrix passes (REST/socket).
- [ ] Admin privileged-action/audit matrix passes (API).
- [ ] No P0/P1 in Wave 3B backend scope.
- [ ] No cross-fleet/private-data leakage.
- [ ] ~~Data persists after refresh.~~ → Wave 4 (web)
- [ ] ~~Playwright passes at 768, 1024 and 1440 px.~~ → Wave 4 (web)
- [ ] Security review covers IDOR, role escalation, filter abuse and audit integrity.
- [ ] Record final Wave 3 integration SHA and remaining deferred Wave 2/release findings.
