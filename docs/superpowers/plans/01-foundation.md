# Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tạo pnpm monorepo cài đặt được, có shared contracts, deterministic tooling và CI gate tối thiểu để các lane phát triển tách biệt.

**Architecture:** Root chỉ điều phối workspace/Turborepo; runtime code nằm trong `apps/*`, shared framework-free code nằm trong `packages/*`. Contract tests khóa enum, error envelope và pagination trước khi domain implementation bắt đầu.

**Tech Stack:** Node.js 24 LTS, pnpm 11.11.0, TypeScript 7.0.2, Turborepo 2.10.4, Vitest 4.1.10, Zod 4.4.3.

## Global Constraints

- Phase integration branch `codex/phase-ph-01`; mỗi task dùng `codex/ph-01-tYY-<short-name>` từ task baseline được công bố.
- PH-01 là owner duy nhất của root config, lockfile và `packages/shared` trong Wave 0.
- Dùng ESM, TypeScript strict, UTC/ISO 8601, UUID, integer VND, meter và second.
- Không scaffold business module, screen hoặc provider trong phase này.

---

### Task PH-01-T01: Root Workspace

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `.npmrc`
- Create: `.nvmrc`
- Create: `.gitignore`

**Interfaces:**
- Consumes: Node.js 24 LTS and Corepack.
- Produces: root scripts `build`, `dev`, `lint`, `typecheck`, `test`, `test:e2e`, `test:contract`, `db:migrate:test`, `format:check`.

- [ ] **Step 1: Write the failing workspace smoke test**

Create `scripts/check-workspace.mjs` that reads `pnpm-workspace.yaml` and exits non-zero unless it contains `apps/*` and `packages/*`, then run:

```bash
node scripts/check-workspace.mjs
```

Expected: FAIL because `pnpm-workspace.yaml` does not exist.

- [ ] **Step 2: Create root manifests**

Use `packageManager: "pnpm@11.11.0"`, `engines.node: ">=24 <25"`, `type: "module"`; map root scripts to `turbo run`, including `test:e2e`, and map `db:migrate:test` to `pnpm --filter api prisma:migrate:test`. Configure Turbo outputs for `dist/**`, `.next/**`, `coverage/**` and mark `dev` persistent/non-cacheable.

- [ ] **Step 3: Install and verify**

```bash
corepack enable
pnpm install
node scripts/check-workspace.mjs
pnpm exec turbo --version
```

Expected: workspace check exits 0 and Turbo prints `2.10.4`.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-workspace.yaml turbo.json .npmrc .nvmrc .gitignore scripts/check-workspace.mjs pnpm-lock.yaml
git commit -m "build(workspace): initialize pnpm monorepo"
```

### Task PH-01-T02: Shared TypeScript Configuration

**Files:**
- Create: `packages/config/package.json`
- Create: `packages/config/tsconfig/base.json`
- Create: `packages/config/tsconfig/node.json`
- Create: `packages/config/tsconfig/react-native.json`
- Create: `packages/config/tsconfig/nextjs.json`
- Create: `packages/config/eslint/base.mjs`
- Create: `prettier.config.mjs`

**Interfaces:**
- Consumes: root workspace from PH-01-T01.
- Produces: strict ESM configs addressable through `@leopard/config/*`.

- [ ] **Step 1: Add a failing config fixture**

Create `packages/config/test/strict-fixture.ts` containing `const value: string = undefined;` and run TypeScript with the future base config path.

```bash
pnpm exec tsc --noEmit --project packages/config/tsconfig/base.json
```

Expected: FAIL first because config is missing; after config exists, FAIL on strict null assignment.

- [ ] **Step 2: Implement configs**

Set `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `verbatimModuleSyntax`, `target: ES2023`; use `moduleResolution: Bundler` for app configs and emit declarations for packages. Export config files through `packages/config/package.json`.

- [ ] **Step 3: Replace fixture with config tests and verify**

Delete the intentional invalid fixture. Add `packages/config/test/config.test.mjs` asserting all variants inherit `strict: true`.

```bash
node --test packages/config/test/config.test.mjs
pnpm format:check
```

Expected: all config assertions pass and formatting check exits 0.

- [ ] **Step 4: Commit**

```bash
git add packages/config prettier.config.mjs package.json pnpm-lock.yaml
git commit -m "build(config): add strict shared tooling"
```

### Task PH-01-T03: Shared Domain Contracts

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/enums.ts`
- Create: `packages/shared/src/api.ts`
- Create: `packages/shared/src/order.ts`
- Create: `packages/shared/src/auth.ts`
- Create: `packages/shared/src/index.ts`
- Test: `packages/shared/src/contracts.test.ts`

**Interfaces:**
- Consumes: types listed in `00-master-orchestration.md`.
- Produces: canonical enums from `docs/data/01-database-design.md`, `ApiErrorEnvelope`, `Page<T>`, `GeoPoint`, `RouteEstimate`, `AuthSession`.

- [ ] **Step 1: Write failing contract tests**

Assert `FleetMemberStatus` is exactly `INVITED | ACTIVE | REMOVED`, `ProviderSource` excludes Firebase identity providers, pagination serializes `{items,page,pageSize,total,totalPages}`, and `parsePageQuery({page:'2',pageSize:'20'})` rejects page size over 100.

```bash
pnpm --filter @leopard/shared test
```

Expected: FAIL because exports do not exist.

- [ ] **Step 2: Implement exact contracts**

Define `GeoPoint { latitude: number; longitude: number }`, `RouteEstimate { polyline; distanceM; durationS; estimatedArrivalAt; estimatedPriceVnd; source; calculatedAt; isEstimate }`, and `AuthSession { accessToken; accessTokenExpiresAt; refreshToken; refreshTokenExpiresAt }`. Keep functions pure and framework-free.

- [ ] **Step 3: Verify package**

```bash
pnpm --filter @leopard/shared test
pnpm --filter @leopard/shared typecheck
pnpm --filter @leopard/shared build
```

Expected: contract tests pass, declarations emit, no type errors.

- [ ] **Step 4: Commit**

```bash
git add packages/shared
git commit -m "feat(shared): define pilot domain contracts"
```

### Task PH-01-T04: Shared Validators

**Files:**
- Create: `packages/validators/package.json`
- Create: `packages/validators/tsconfig.json`
- Create: `packages/validators/src/common.ts`
- Create: `packages/validators/src/order.ts`
- Create: `packages/validators/src/index.ts`
- Test: `packages/validators/src/order.test.ts`

**Interfaces:**
- Consumes: `GeoPoint` and enums from `@leopard/shared`.
- Produces: `uuidSchema`, `isoDateSchema`, `geoPointSchema`, `pageQuerySchema`, `createOrderSchema`.

- [ ] **Step 1: Write failing validation cases**

Test valid pickup/dropoff; reject latitude outside `[-90,90]`, longitude outside `[-180,180]`, four stops, blank labels and `pageSize=101`.

```bash
pnpm --filter @leopard/validators test
```

Expected: FAIL because schemas are missing.

- [ ] **Step 2: Implement Zod schemas**

`createOrderSchema` accepts pickup, 0–3 stops, dropoff, supported vehicle type, cargo note max 1000 chars and optional media IDs max 5. Use `.strict()` on API input objects.

- [ ] **Step 3: Verify validators**

```bash
pnpm --filter @leopard/validators test
pnpm --filter @leopard/validators typecheck
```

Expected: all boundary tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/validators pnpm-lock.yaml
git commit -m "feat(validation): add shared request schemas"
```

### Task PH-01-T05: Foundation CI Gate

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `scripts/verify-foundation.mjs`
- Modify: `README.md`
- Modify: `docs/development/01-local-setup.md`

**Interfaces:**
- Consumes: all PH-01 scripts.
- Produces: CI job `quality` on pull request to `develop` and `main`.

- [ ] **Step 1: Write failing gate check**

`scripts/verify-foundation.mjs` asserts CI contains frozen install, lint, typecheck, test and build steps.

```bash
node scripts/verify-foundation.mjs
```

Expected: FAIL because workflow does not exist.

- [ ] **Step 2: Create CI and update setup docs**

Use Node 24, Corepack and `pnpm install --frozen-lockfile`; run root quality scripts. Add concurrency cancellation per PR. Do not add deployment or provider credentials.

- [ ] **Step 3: Run Foundation Gate**

```bash
node scripts/verify-foundation.mjs
pnpm lint
pnpm typecheck
pnpm test
pnpm build
git diff --check
```

Expected: every command exits 0.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml scripts/verify-foundation.mjs README.md docs/development/01-local-setup.md
git commit -m "ci: enforce foundation quality gate"
```

## Phase Boundary Rules

- Do not create `apps/api`, `apps/mobile` or `apps/admin` runtime code.
- Do not add Firebase, Vietmap, payment or storage SDKs.
- Do not alter enum values from approved docs.
- Publish the Wave 0 baseline only after a clean install from an empty `node_modules` passes all root scripts.
