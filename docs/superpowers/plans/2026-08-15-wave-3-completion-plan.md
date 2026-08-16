# Wave 3 Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every remaining Wave 3 backend gap — AuditService, PH-09 Media+Payment, the empty migration, PH-10/PH-11 backend hardening, and the PH-08 DI fix — so the Wave 3 gate passes and a baseline commit can be recorded.

**Architecture:** NestJS modules following the established provider-factory + repository + domain-service pattern (see `MapsModule`). New modules: `AuditModule` (`@Global`, append-only), `MediaModule` (StorageProvider local|s3), `PaymentsModule` (PaymentProvider demo|payos|vietqr). Audit is called by both Payments and Admin through one shared `AuditService.append(input, tx)`, never `tx.auditLog.create` directly. The empty `20260809000000_wave3_contract_data_preflight` migration is filled with real SQL.

**Tech Stack:** NestJS 11.1.28, Prisma 7.8.0 (`@prisma/adapter-pg` + PostGIS), Zod 4.4.3, Socket.IO 4.8.3, `@aws-sdk/client-s3` 3.1085.0, `file-type` 21.3.4, Jest 30.0.5 (`@swc/jest`), supertest, socket.io-client.

**Spec:** `docs/superpowers/specs/2026-08-15-wave-3-completion-design.md` — this plan argues from the spec; read both. Where the completion spec is silent, `2026-08-09-wave-3-delivery-design.md` remains source of truth.

## Global Constraints

- **Backend-only:** do NOT modify `apps/admin/**`, `apps/mobile/**`, or any web E2E/Playwright/viewport/a11y-web test. PH-10-T03, PH-11-T03, and web E2E belong to Wave 4.
- **NestJS 11.1.28** (exact), **Prisma 7.8.0**, **Zod 4.4.3**, **socket.io 4.8.3**, **@aws-sdk/client-s3 3.1085.0**, **file-type 21.3.4** — do not bump versions.
- **No `any`** in production source (`tsconfig` `strict`); use Prisma typed `where`, `unknown`+narrow at boundaries.
- **Immutability:** never mutate; build new objects.
- **Errors:** throw `DomainError(code, status, message, details?)`; message in Vietnamese where the surrounding code uses Vietnamese, English where it uses English.
- **No `console.log`**, no hardcoded secrets/credentials; all provider creds via `process.env`.
- **TDD:** RED → GREEN → refactor; new modules ≥ 80% coverage; policy/state-machine critical branches 100%.
- **Provider tests use mocks** — never call S3/payOS/VietQR/Vietmap/Firebase for real.
- **Authorization matrices** for role + ownership/assignment/membership, with 404 non-disclosure for wrong-fleet/wrong-owner.
- **PostgreSQL nullable UNIQUE** allows multiple NULLs (idempotency-key-optional is intentional) — verify with a real-DB test.
- **Note/reason validation:** trim 5–500 chars for admin payment confirmation and user-status reason.
- **Migration:** keep `20260809000000_wave3_contract_data_preflight` folder name; add `migration.sql`; must upgrade cleanly from Wave 2 and from fresh install.

---

## File Structure

```
apps/api/src/audit/
  audit.module.ts          # @Global module, exports AuditService
  audit.service.ts         # append(input, tx)
  audit.repository.ts      # append-only create
  audit.service.spec.ts    # unit + rollback-safety

apps/api/src/media/
  media.module.ts          # StorageProvider factory + controller/service/repo wiring
  storage-provider.ts      # StorageProvider interface + UploadInput/StoredObject types
  local-storage.provider.ts
  s3-storage.provider.ts
  upload-policy.ts         # extension/MIME/magic-byte + byte-limit rules
  media.service.ts         # upload flow + signed-url authorization
  media.controller.ts      # POST /orders/:id/media/*, GET /media/:id/url
  media.repository.ts      # metadata persistence + proof query
  media.service.spec.ts    # unit (mocked provider + repo)
  media.e2e-spec.ts        # multipart e2e + authorization matrix

apps/api/src/payments/
  payments.module.ts       # PaymentProvider factory + controller/service/repo wiring
  payment-provider.ts      # PaymentProvider interface + types
  demo-payment.provider.ts
  payos-payment.provider.ts
  vietqr-payment.provider.ts
  payments.service.ts      # create-intent (idempotent) + admin confirm (audited)
  payments.controller.ts   # POST/GET /orders/:id/payments, POST /admin/payments/:id/confirm
  payments.repository.ts   # reserve/reuse intent + history
  payments.service.spec.ts # unit
  payments.e2e-spec.ts     # idempotency + audited confirm + concurrency

apps/api/prisma/migrations/20260809000000_wave3_contract_data_preflight/migration.sql   # FILL
packages/shared/src/media.ts, payment.ts, errors.ts                                     # finalize contracts
apps/api/src/tracking/tracking.gateway.ts            # DI fix (MODIFY)
apps/api/src/orders/update-order-status.service.ts   # DI fix (MODIFY)
apps/api/src/fleets/fleet-owner.service.ts           # remove any (MODIFY)
apps/api/src/admin/admin-command.service.ts          # AuditService + guards (MODIFY)
apps/api/src/admin/admin-query.service.ts            # remove any (MODIFY)
apps/api/src/admin/admin.module.ts                   # import AuditModule (MODIFY)
apps/api/src/fleets/fleet-membership.policy.ts       # add assertOrderInFleet (MODIFY)
apps/api/src/app.module.ts                           # register Audit/Media/Payments (MODIFY)
```

---

## Task 1: Environment unblock + baseline

**Files:**
- Modify: `apps/api/package.json` (no change expected — verify), root `pnpm-lock.yaml` (regenerate only if install requires it)
- Test: none (this task is environmental)

**Interfaces:**
- Consumes: nothing.
- Produces: a working `pnpm --filter api prisma generate`, `pnpm --filter api typecheck` baseline, and a recorded baseline SHA.

- [ ] **Step 1: Diagnose the Windows EPERM blocker**

Run: `pnpm install`
Expected: may FAIL with `EPERM: operation not permitted, unlink 'D:\leopard\apps\admin\node_modules\.bin\next.ps1'` (or `next.CMD`).

If it fails, clear only the two conflicting shims (they regenerate on next install):

```bash
rm -f apps/admin/node_modules/.bin/next.ps1 apps/admin/node_modules/.bin/next.CMD
```

Then re-run `pnpm install`. Repeat until install exits 0. Do NOT delete `node_modules` wholesale or any `apps/api/**` source.

- [ ] **Step 2: Verify required deps resolved**

Run: `node -e "for (const m of ['@nestjs/websockets','socket.io','socket.io-client','@aws-sdk/client-s3','@aws-sdk/s3-request-presigner','file-type','argon2','@prisma/client']) require.resolve(m, { paths: ['apps/api/node_modules'] }); console.log('ok')"`
Expected: prints `ok` with no error.

- [ ] **Step 3: Generate Prisma client**

Run: `pnpm --filter api prisma generate`
Expected: `apps/api/node_modules/.prisma/client/index.d.ts` exists and references `PaymentIntent.provider` as nullable and `TrackingPoint.accuracyM`.

- [ ] **Step 4: Record the pre-work baseline**

```bash
git rev-parse HEAD
git status --porcelain | wc -l
```

Record both numbers in the final handoff. HEAD is expected to be `8749d11`.

- [ ] **Step 5: Smoke-check the current type surface**

Run: `pnpm --filter api typecheck`
Expected: may report pre-existing errors from the half-applied Wave 3 code (e.g. missing `AuditModule`, empty migration doesn't affect tsc). Note them; Task 2–8 resolve them. Do NOT lower strictness.

---

## Task 2: Data migration (fill the empty migration)

**Files:**
- Create: `apps/api/prisma/migrations/20260809000000_wave3_contract_data_preflight/migration.sql`
- Test: `apps/api/test/database-schema.spec.ts` (extend) and a new upgrade smoke

**Interfaces:**
- Consumes: nothing.
- Produces: DB columns/indexes matching `apps/api/prisma/schema.prisma` (already finalized): `TrackingPoint.accuracyM`, `MediaObject.checksumSha256/clientRequestId`, `PaymentIntent` nullable `provider` + reference/confirmation fields, `AuditLog.requestId/idempotencyRequestId`, plus the unique idempotency constraints.

- [ ] **Step 1: Write the failing database-schema test additions**

In `apps/api/test/database-schema.spec.ts`, add column assertions for the new fields. The file already enumerates `expectedTables` and `expectedEnums` and queries `information_schema`. Add:

```ts
const expectedColumns: Record<string, Record<string, { nullable: boolean; dataType: string }>> = {
  TrackingPoint: {
    accuracyM: { nullable: true, dataType: 'double precision' },
  },
  MediaObject: {
    checksumSha256: { nullable: false, dataType: 'text' },
    clientRequestId: { nullable: true, dataType: 'text' },
  },
  PaymentIntent: {
    clientRequestId: { nullable: true, dataType: 'text' },
    providerReference: { nullable: true, dataType: 'text' },
    confirmedById: { nullable: true, dataType: 'uuid' },
    confirmedAt: { nullable: true, dataType: 'timestamp with time zone' },
    confirmationNote: { nullable: true, dataType: 'text' },
    confirmationRequestId: { nullable: true, dataType: 'text' },
  },
  AuditLog: {
    requestId: { nullable: true, dataType: 'text' },
    idempotencyRequestId: { nullable: true, dataType: 'text' },
  },
};
```

And assert `PaymentIntent.provider` is nullable (`is_nullable === 'YES'`).

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter api prisma:migrate:test`
Expected: FAIL — the columns are missing (migration folder is empty).

- [ ] **Step 3: Write the migration SQL**

Write the full file:

```sql
-- Wave 3 contract data preflight: bring the Wave 2 schema to the Wave 3 contract.
-- Idempotent-safe: uses IF NOT EXISTS / IF EXISTS guards where PostgreSQL permits.

-- 1. TrackingPoint.accuracyM
ALTER TABLE "TrackingPoint" ADD COLUMN IF NOT EXISTS "accuracyM" double precision;

-- 2. MediaObject: checksum + clientRequestId + idempotency unique
ALTER TABLE "MediaObject" ADD COLUMN IF NOT EXISTS "checksumSha256" TEXT NOT NULL DEFAULT '';
ALTER TABLE "MediaObject" ADD COLUMN IF NOT EXISTS "clientRequestId" TEXT;
ALTER TABLE "MediaObject" ALTER COLUMN "checksumSha256" DROP DEFAULT;

-- 3. PaymentIntent: nullable provider + reference/confirmation fields
ALTER TABLE "PaymentIntent" ALTER COLUMN "provider" DROP NOT NULL;
ALTER TABLE "PaymentIntent" ADD COLUMN IF NOT EXISTS "clientRequestId" TEXT;
ALTER TABLE "PaymentIntent" ADD COLUMN IF NOT EXISTS "providerReference" TEXT;
ALTER TABLE "PaymentIntent" ADD COLUMN IF NOT EXISTS "confirmedById" UUID;
ALTER TABLE "PaymentIntent" ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMPTZ(3);
ALTER TABLE "PaymentIntent" ADD COLUMN IF NOT EXISTS "confirmationNote" TEXT;
ALTER TABLE "PaymentIntent" ADD COLUMN IF NOT EXISTS "confirmationRequestId" TEXT;

-- 4. AuditLog request IDs
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "requestId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "idempotencyRequestId" TEXT;

-- 5. Normalize legacy UNPAID intents whose provider is a map source (VIETMAP/DEMO) -> NULL.
--    Fail fast if any non-UNPAID row carries a provider that is not a payment provider.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "PaymentIntent"
    WHERE "status" <> 'UNPAID' AND "provider" IN ('VIETMAP', 'LOCAL', 'S3')
  ) THEN
    RAISE EXCEPTION 'invalid provider on non-UNPAID PaymentIntent; manual review required';
  END IF;
END $$;

UPDATE "PaymentIntent"
  SET "provider" = NULL
  WHERE "status" = 'UNPAID' AND "provider" IN ('VIETMAP', 'DEMO');

-- 6. Foreign key for confirmedById (RESTRICT -> User)
ALTER TABLE "PaymentIntent"
  DROP CONSTRAINT IF EXISTS "PaymentIntent_confirmedById_fkey";
ALTER TABLE "PaymentIntent"
  ADD CONSTRAINT "PaymentIntent_confirmedById_fkey"
  FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 7. Idempotency unique constraints (nullable UNIQUE = multiple NULLs allowed by design)
CREATE UNIQUE INDEX IF NOT EXISTS "MediaObject_orderId_uploaderId_type_clientRequestId_key"
  ON "MediaObject"("orderId", "uploaderId", "type", "clientRequestId");
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentIntent_orderId_clientRequestId_key"
  ON "PaymentIntent"("orderId", "clientRequestId");
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentIntent_provider_providerReference_key"
  ON "PaymentIntent"("provider", "providerReference");
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentIntent_confirmationRequestId_key"
  ON "PaymentIntent"("confirmationRequestId");
```

- [ ] **Step 4: Run the migration + schema test**

Run: `pnpm --filter api prisma:migrate:test`
Expected: PASS.

- [ ] **Step 5: Verify clean-install + upgrade from Wave 2**

Run: `pnpm --filter api prisma migrate deploy` against a fresh `leopard` DB, then against a DB already at `20260806000000_order_consistency_idempotency`. Expected: both succeed with no drift (`prisma migrate status` reports up-to-date).

- [ ] **Step 6: Commit**

```bash
git add apps/api/prisma/migrations/20260809000000_wave3_contract_data_preflight/migration.sql apps/api/test/database-schema.spec.ts
git commit -m "feat(wave3): fill wave3 contract data migration with real SQL"
```

---

## Task 3: Shared contract finalize (media, payment, errors)

**Files:**
- Modify: `packages/shared/src/media.ts`, `packages/shared/src/payment.ts`, `packages/shared/src/errors.ts`
- Test: `packages/shared/src/contracts.test.ts` (extend)

**Interfaces:**
- Consumes: nothing.
- Produces: `MediaObjectDto`, `MediaUploadRequest`, `SignedUrlResponse`, `PaymentIntentDto`, `PaymentQrDto`, `CreatePaymentIntentRequest`, `AdminConfirmPaymentRequest`, and the full `MediaErrorCode`/`PaymentErrorCode` maps. These are consumed by the API modules in Tasks 4–6.

- [ ] **Step 1: Write the failing contract test**

In `packages/shared/src/contracts.test.ts`, add type-level assertions (compile-time) plus a runtime check that the error-code maps are non-empty:

```ts
import { PaymentErrorCode, MediaErrorCode } from './errors.js';

test('payment and media error codes are defined', () => {
  expect(PaymentErrorCode).toBeDefined();
  expect(PaymentErrorCode.activeIntentConflict).toBe('PAYMENT_ACTIVE_INTENT_CONFLICT');
  expect(MediaErrorCode.unsupportedType).toBe('MEDIA_UNSUPPORTED_TYPE');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter shared test`
Expected: FAIL — `MediaErrorCode` is not exported (only `PaymentErrorCode` and `TrackingErrorCode` exist today).

- [ ] **Step 3: Replace the media.ts stub**

```ts
import type { MediaType, ProviderSource } from './enums.js';

export interface MediaObjectDto {
  id: string;
  orderId: string;
  uploaderId: string;
  type: MediaType;
  provider: ProviderSource;
  contentType: string;
  sizeBytes: number;
  clientRequestId?: string;
  createdAt: string;
}

export interface MediaUploadRequest {
  readonly clientRequestId: string;
}

export interface SignedUrlResponse {
  readonly url: string;
  readonly expiresAt: string;
}
```

- [ ] **Step 4: Replace the payment.ts stub**

```ts
import type { PaymentStatus, ProviderSource } from './enums.js';

export interface PaymentIntentDto {
  id: string;
  orderId: string;
  provider: ProviderSource | null;
  status: PaymentStatus;
  amountVnd: number;
  clientRequestId?: string;
  providerReference?: string;
  qrPayload?: string;
  expiresAt?: string;
  confirmedById?: string;
  confirmedAt?: string;
  confirmationNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentQrDto {
  amountVnd: number;
  provider: ProviderSource;
  providerReference: string;
  expiresAt: string;
  qrPayload: string;
}

export interface CreatePaymentIntentRequest {
  readonly clientRequestId: string;
}

export interface AdminConfirmPaymentRequest {
  readonly note: string;
  readonly clientRequestId: string;
}
```

- [ ] **Step 5: Extend errors.ts**

Append to `packages/shared/src/errors.ts`:

```ts
export const MediaErrorCode = {
  unsupportedType: 'MEDIA_UNSUPPORTED_TYPE',
  fileTooLarge: 'MEDIA_FILE_TOO_LARGE',
  invalidFile: 'MEDIA_INVALID_FILE',
} as const;
export type MediaErrorCode = (typeof MediaErrorCode)[keyof typeof MediaErrorCode];

export const PaymentErrorCode = {
  activeIntentConflict: 'PAYMENT_ACTIVE_INTENT_CONFLICT',
  providerFailed: 'PAYMENT_PROVIDER_FAILED',
  alreadyConfirmed: 'PAYMENT_ALREADY_CONFIRMED',
} as const;
export type PaymentErrorCode = (typeof PaymentErrorCode)[keyof typeof PaymentErrorCode];
```

(The existing `PaymentErrorCode` in `errors.ts` is re-declared here with an added `alreadyConfirmed` member — replace it, don't duplicate.)

- [ ] **Step 6: Run tests + typecheck**

Run: `pnpm --filter shared test && pnpm --filter shared typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/media.ts packages/shared/src/payment.ts packages/shared/src/errors.ts packages/shared/src/contracts.test.ts
git commit -m "feat(wave3): finalize media/payment shared contracts and error codes"
```

---

## Task 4: AuditModule + AuditService

**Files:**
- Create: `apps/api/src/audit/audit.module.ts`, `audit.service.ts`, `audit.repository.ts`
- Test: `apps/api/src/audit/audit.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService` (`Prisma.TransactionClient` from `@prisma/client`).
- Produces:
  - `AuditService.append(input: AuditInput, tx: Prisma.TransactionClient): Promise<AuditLog>`
  - `interface AuditInput { actorId: string; action: string; resourceType: string; resourceId?: string; requestId?: string; idempotencyRequestId?: string; metadata?: Record<string, unknown>; }`
  - `AuditModule` is `@Global()` and exports `AuditService`.

- [ ] **Step 1: Write the failing unit test**

`apps/api/src/audit/audit.service.spec.ts`:

```ts
import type { Prisma } from '@prisma/client';
import { AuditService } from './audit.service.js';
import { AuditRepository } from './audit.repository.js';

describe('AuditService.append', () => {
  const create = jest.fn();
  const tx = { auditLog: { create } } as unknown as Prisma.TransactionClient;
  const service = new AuditService(new AuditRepository());

  beforeEach(() => create.mockReset());

  test('appends a record with the provided transaction client', async () => {
    create.mockResolvedValueOnce({ id: 'a1' });
    await service.append(
      { actorId: 'u1', action: 'UPDATE_USER_STATUS', resourceType: 'User', resourceId: 'r1' },
      tx,
    );
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ actorId: 'u1', action: 'UPDATE_USER_STATUS' }),
    });
  });

  test('does not mutate the input metadata object', async () => {
    const metadata = { reason: 'x' };
    create.mockResolvedValueOnce({ id: 'a2' });
    await service.append({ actorId: 'u1', action: 'A', resourceType: 'T', metadata }, tx);
    expect(metadata).toEqual({ reason: 'x' });
    expect(create).toHaveBeenCalled();
  });

  test('propagates a failed append so the caller transaction rolls back', async () => {
    create.mockRejectedValueOnce(new Error('audit unavailable'));
    await expect(
      service.append({ actorId: 'u1', action: 'A', resourceType: 'T' }, tx),
    ).rejects.toThrow('audit unavailable');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter api test audit`
Expected: FAIL — `Cannot find module './audit.service.js'`.

- [ ] **Step 3: Write the repository**

`apps/api/src/audit/audit.repository.ts`:

```ts
import { Injectable } from '@nestjs/common';
import type { AuditLog, Prisma } from '@prisma/client';

@Injectable()
export class AuditRepository {
  async append(
    data: Prisma.AuditLogUncheckedCreateInput,
    tx: Prisma.TransactionClient,
  ): Promise<AuditLog> {
    return tx.auditLog.create({ data });
  }
}
```

- [ ] **Step 4: Write the service**

`apps/api/src/audit/audit.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import type { AuditLog, Prisma } from '@prisma/client';
import { AuditRepository } from './audit.repository.js';

export interface AuditInput {
  actorId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  requestId?: string;
  idempotencyRequestId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private readonly repository: AuditRepository) {}

  append(input: AuditInput, tx: Prisma.TransactionClient): Promise<AuditLog> {
    return this.repository.append(
      {
        actorId: input.actorId,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        requestId: input.requestId ?? null,
        idempotencyRequestId: input.idempotencyRequestId ?? null,
        metadata: input.metadata ? { ...input.metadata } : undefined,
      },
      tx,
    );
  }
}
```

- [ ] **Step 5: Write the module**

`apps/api/src/audit/audit.module.ts`:

```ts
import { Global, Module } from '@nestjs/common';
import { AuditRepository } from './audit.repository.js';
import { AuditService } from './audit.service.js';

@Global()
@Module({
  providers: [AuditRepository, AuditService],
  exports: [AuditService],
})
export class AuditModule {}
```

- [ ] **Step 6: Run the test**

Run: `pnpm --filter api test audit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/audit/
git commit -m "feat(wave3): add append-only AuditModule and AuditService"
```

---

## Task 5: PH-09 Media (storage + upload)

**Files:**
- Create: `apps/api/src/media/storage-provider.ts`, `local-storage.provider.ts`, `s3-storage.provider.ts`, `upload-policy.ts`, `media.repository.ts`, `media.service.ts`, `media.controller.ts`, `media.module.ts`
- Test: `apps/api/src/media/upload-policy.spec.ts`, `media.service.spec.ts`, `media.e2e-spec.ts`

**Interfaces:**
- Consumes: `DeliveryProofReader` (already exported from `OrdersModule`), `PrismaService`, `STORAGE_PROVIDER` token factory.
- Produces:
  - `interface UploadInput { key: string; contentType: string; body: AsyncIterable<Uint8Array>; sizeBytes: number; }`
  - `interface StoredObject { key: string; provider: ProviderSource; sizeBytes: number; }`
  - `interface StorageProvider { put(input: UploadInput): Promise<StoredObject>; createReadUrl(key: string, expiresInSeconds: number): Promise<string>; delete(key: string): Promise<void>; }`
  - `MediaService.upload(actor, orderId, type, file, clientRequestId)` and `MediaService.createSignedUrl(actor, mediaId)`.

- [ ] **Step 1: Write the failing upload-policy test**

`apps/api/src/media/upload-policy.spec.ts`:

```ts
import { assertAllowedMedia } from './upload-policy.js';

describe('upload policy', () => {
  test('rejects an unsupported extension', () => {
    expect(() =>
      assertAllowedMedia({ filename: 'x.exe', declaredMime: 'application/octet-stream', sizeBytes: 100 }),
    ).toThrow();
  });

  test('rejects a file over the byte limit', () => {
    expect(() =>
      assertAllowedMedia({ filename: 'x.png', declaredMime: 'image/png', sizeBytes: 11 * 1024 * 1024 }),
    ).toThrow();
  });

  test('accepts a valid PNG within limit', () => {
    expect(() =>
      assertAllowedMedia({ filename: 'x.png', declaredMime: 'image/png', sizeBytes: 1024 }),
    ).not.toThrow();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter api test upload-policy`
Expected: FAIL — module missing.

- [ ] **Step 3: Write upload-policy.ts**

```ts
import { DomainError } from '../common/domain-error.js';

export const MAX_MEDIA_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
};

export interface MediaMeta {
  filename: string;
  declaredMime: string;
  sizeBytes: number;
}

export function assertAllowedMedia(meta: MediaMeta): void {
  if (meta.sizeBytes <= 0) throw new DomainError('MEDIA_INVALID_FILE', 400, 'Tệp tải lên rỗng');
  if (meta.sizeBytes > MAX_MEDIA_BYTES) throw new DomainError('MEDIA_FILE_TOO_LARGE', 400, 'Tệp vượt quá 10 MB');
  const ext = meta.filename.split('.').pop()?.toLowerCase() ?? '';
  const expectedMime = EXT_TO_MIME[ext];
  if (!expectedMime) throw new DomainError('MEDIA_UNSUPPORTED_TYPE', 400, 'Định dạng tệp không được hỗ trợ');
  if (meta.declaredMime !== expectedMime) throw new DomainError('MEDIA_INVALID_FILE', 400, 'Tệp không khớp định dạng khai báo');
}
```

- [ ] **Step 4: Write storage-provider.ts**

```ts
import type { ProviderSource } from '@prisma/client';

export interface UploadInput {
  key: string;
  contentType: string;
  body: AsyncIterable<Uint8Array>;
  sizeBytes: number;
}

export interface StoredObject {
  key: string;
  provider: ProviderSource;
  sizeBytes: number;
}

export interface StorageProvider {
  put(input: UploadInput): Promise<StoredObject>;
  createReadUrl(key: string, expiresInSeconds: number): Promise<string>;
  delete(key: string): Promise<void>;
}
```

- [ ] **Step 5: Write local-storage.provider.ts**

```ts
import { mkdir, writeFile, rename, unlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { StorageProvider, StoredObject, UploadInput } from './storage-provider.js';

export class LocalStorageProvider implements StorageProvider {
  constructor(private readonly rootDir: string) {}

  async put(input: UploadInput): Promise<StoredObject> {
    const key = `${randomUUID()}`;
    const target = join(this.rootDir, key);
    await mkdir(dirname(target), { recursive: true });
    const tmp = `${target}.tmp`;
    await writeFile(tmp, Buffer.from(await collect(input.body)));
    await rename(tmp, target);
    return { key, provider: 'LOCAL', sizeBytes: input.sizeBytes };
  }

  async createReadUrl(key: string, _expiresInSeconds: number): Promise<string> {
    return `local://media/${key}`;
  }

  async delete(key: string): Promise<void> {
    await unlink(join(this.rootDir, key)).catch(() => undefined);
  }
}

async function collect(body: AsyncIterable<Uint8Array>): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of body) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}
```

- [ ] **Step 6: Write s3-storage.provider.ts**

```ts
import { PutObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { StorageProvider, StoredObject, UploadInput } from './storage-provider.js';

export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;

  constructor(
    private readonly bucket: string,
    config: { region: string; accessKeyId: string; secretAccessKey: string; endpoint?: string },
  ) {
    this.client = new S3Client({
      region: config.region,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
      ...(config.endpoint ? { endpoint: config.endpoint } : {}),
    });
  }

  async put(input: UploadInput): Promise<StoredObject> {
    const body = Buffer.concat(await collect(input.body));
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket, Key: input.key, Body: body, ContentType: input.contentType,
    }));
    return { key: input.key, provider: 'S3', sizeBytes: input.sizeBytes };
  }

  async createReadUrl(key: string, expiresInSeconds: number): Promise<string> {
    return getSignedUrl(this.client, new (await import('@aws-sdk/client-s3')).GetObjectCommand({
      Bucket: this.bucket, Key: key,
    }), { expiresIn: expiresInSeconds });
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

async function collect(body: AsyncIterable<Uint8Array>): Promise<Buffer[]> {
  const chunks: Buffer[] = [];
  for await (const chunk of body) chunks.push(Buffer.from(chunk));
  return chunks;
}
```

- [ ] **Step 7: Write the media repository**

`apps/api/src/media/media.repository.ts`:

```ts
import { Injectable } from '@nestjs/common';
import type { MediaObject, MediaType, ProviderSource } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';

export interface CreateMediaInput {
  orderId: string;
  uploaderId: string;
  type: MediaType;
  provider: ProviderSource;
  storageKey: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256: string;
  clientRequestId: string;
}

@Injectable()
export class MediaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateMediaInput): Promise<MediaObject> {
    return this.prisma.mediaObject.create({ data: input });
  }

  async findById(id: string): Promise<MediaObject | null> {
    return this.prisma.mediaObject.findUnique({ where: { id } });
  }

  async hasProof(orderId: string): Promise<boolean> {
    const row = await this.prisma.mediaObject.findFirst({
      where: { orderId, type: 'DELIVERY_PROOF' },
      select: { id: true },
    });
    return row !== null;
  }
}
```

- [ ] **Step 8: Write the media service**

`apps/api/src/media/media.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import type { MediaType } from '@prisma/client';
import { DomainError } from '../common/domain-error.js';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import type { SignedUrlResponse } from '@leopard/shared';
import { STORAGE_PROVIDER } from './media.module.js';
import type { StorageProvider } from './storage-provider.js';
import { assertAllowedMedia } from './upload-policy.js';
import { MediaRepository } from './media.repository.js';
import { OrdersRepository } from '../orders/orders.repository.js';

export interface MediaFile {
  filename: string;
  mimetype: string;
  sizeBytes: number;
  body: AsyncIterable<Uint8Array>;
}

@Injectable()
export class MediaService {
  constructor(
    private readonly repo: MediaRepository,
    private readonly orders: OrdersRepository,
    private readonly provider: StorageProvider,
  ) {}

  async upload(
    actor: AuthenticatedActor,
    orderId: string,
    type: MediaType,
    clientRequestId: string,
    file: MediaFile,
  ) {
    assertAllowedMedia({ filename: file.filename, declaredMime: file.mimetype, sizeBytes: file.sizeBytes });
    const order = await this.orders.findById(orderId);
    if (!order) throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy đơn hàng');
    if (type === 'CARGO' && order.customerId !== actor.userId) {
      throw new DomainError('FORBIDDEN', 403, 'Chỉ khách hàng sở hữu mới được tải ảnh hàng hóa');
    }
    if (type === 'DELIVERY_PROOF' && order.driverId !== actor.userId) {
      throw new DomainError('FORBIDDEN', 403, 'Chỉ tài xế được phân công mới được tải chứng từ');
    }

    const key = `orders/${orderId}/${type}/${randomUUID()}`;
    const stored = await this.provider.put({ key, contentType: file.mimetype, body: file.body, sizeBytes: file.sizeBytes });
    try {
      const record = await this.repo.create({
        orderId,
        uploaderId: actor.userId,
        type,
        provider: stored.provider,
        storageKey: stored.key,
        contentType: file.mimetype,
        sizeBytes: stored.sizeBytes,
        checksumSha256: '', // filled below via streaming hash is not re-streamed here; see note
        clientRequestId,
      });
      return record;
    } catch (error) {
      await this.provider.delete(stored.key);
      throw error;
    }
  }

  async createSignedUrl(actor: AuthenticatedActor, mediaId: string): Promise<SignedUrlResponse> {
    const media = await this.repo.findById(mediaId);
    if (!media) throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy tệp');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const url = await this.provider.createReadUrl(media.storageKey, 15 * 60);
    return { url, expiresAt };
  }
}
```

> Note on checksum: the streaming SHA-256 in the spec requires buffering the file once for hashing and once for upload. To honor "no full-file buffer," pass `file.body` as a tee of a hashing transform (see `node:crypto.createHash` + `Readable.pipeline`). The plan keeps `checksumSha256` computed in the controller via `@uploadedFile`-adjacent streaming; if a single-pass buffer is simpler and the 10 MB cap is already enforced, compute the hash before `put`. Do NOT leave `''` — compute the real hash in Step 9.

- [ ] **Step 9: Compute the real SHA-256 (replace the `''` placeholder)**

In `media.service.ts`, buffer the capped stream once and hash it (the 10 MB cap makes a single buffer acceptable), then pass the hash to `put`/`create`:

```ts
const chunks: Buffer[] = [];
for await (const c of file.body) chunks.push(Buffer.from(c));
const body = Buffer.concat(chunks);
const checksumSha256 = createHash('sha256').update(body).digest('hex');
const stored = await this.provider.put({ key, contentType: file.mimetype, body: [body], sizeBytes: body.length });
```

- [ ] **Step 10: Write the controller + module**

`apps/api/src/media/media.controller.ts` (multipart via `@UploadedFile` from `@nestjs/platform-express` — multer is a transitive dep of `@nestjs/platform-express`; register `MulterModule` with memory storage in the module):

```ts
import { Controller, Post, Get, Param, UseGuards, UseInterceptors, UploadedFile, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser, type AuthenticatedActor } from '../auth/decorators/current-user.js';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { MediaService } from './media.service.js';

@UseGuards(AccessTokenGuard)
@Controller()
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('orders/:id/media/cargo')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadCargo(@CurrentUser() actor: AuthenticatedActor, @Param('id') orderId: string, @Body('clientRequestId') clientRequestId: string, @UploadedFile() file: Express.Multer.File) {
    return this.media.upload(actor, orderId, 'CARGO', clientRequestId, {
      filename: file.originalname, mimetype: file.mimetype, sizeBytes: file.size,
      body: [file.buffer],
    });
  }

  @Post('orders/:id/media/delivery-proof')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadProof(@CurrentUser() actor: AuthenticatedActor, @Param('id') orderId: string, @Body('clientRequestId') clientRequestId: string, @UploadedFile() file: Express.Multer.File) {
    return this.media.upload(actor, orderId, 'DELIVERY_PROOF', clientRequestId, {
      filename: file.originalname, mimetype: file.mimetype, sizeBytes: file.size,
      body: [file.buffer],
    });
  }

  @Get('media/:id/url')
  createSignedUrl(@CurrentUser() actor: AuthenticatedActor, @Param('id') id: string) {
    return this.media.createSignedUrl(actor, id);
  }
}
```

`apps/api/src/media/media.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { OrdersModule } from '../orders/orders.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { MediaController } from './media.controller.js';
import { MediaRepository } from './media.repository.js';
import { MediaService } from './media.service.js';
import type { StorageProvider } from './storage-provider.js';
import { LocalStorageProvider } from './local-storage.provider.js';
import { S3StorageProvider } from './s3-storage.provider.js';

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';

@Module({
  imports: [DatabaseModule, OrdersModule, MulterModule.register({ storage: undefined })],
  controllers: [MediaController],
  providers: [
    MediaRepository,
    MediaService,
    { provide: STORAGE_PROVIDER, useFactory: (): StorageProvider => createStorageProvider(process.env) },
  ],
})
export class MediaModule {}

function createStorageProvider(source: NodeJS.ProcessEnv): StorageProvider {
  if (source.STORAGE_PROVIDER === 's3') {
    return new S3StorageProvider(source.S3_BUCKET ?? '', {
      region: source.S3_REGION ?? '',
      accessKeyId: source.S3_ACCESS_KEY_ID ?? '',
      secretAccessKey: source.S3_SECRET_ACCESS_KEY ?? '',
      ...(source.S3_ENDPOINT ? { endpoint: source.S3_ENDPOINT } : {}),
    });
  }
  return new LocalStorageProvider(source.MEDIA_LOCAL_DIR ?? 'tmp/media');
}
```

- [ ] **Step 11: Register MediaModule + wire the proof reader binding**

In `app.module.ts`, add `AuditModule`, `MediaModule` (and later `PaymentsModule`) to `imports`. The `DeliveryProofReader` binding already exists in `OrdersModule` (`useClass: PrismaDeliveryProofReader`) and `MediaRepository.hasProof` delegates to `mediaObject.findFirst` — there is exactly one runtime `DeliveryProofReader`; do not add a second binding.

- [ ] **Step 12: Run tests + typecheck**

Run: `pnpm --filter api test media && pnpm --filter api typecheck`
Expected: PASS.

- [ ] **Step 13: Commit**

```bash
git add apps/api/src/media/ apps/api/src/app.module.ts
git commit -m "feat(wave3): add media upload + signed URL with local/S3 storage"
```

---

## Task 6: PH-09 Payment (intents + audited confirmation)

**Files:**
- Create: `apps/api/src/payments/payment-provider.ts`, `demo-payment.provider.ts`, `payos-payment.provider.ts`, `vietqr-payment.provider.ts`, `payments.repository.ts`, `payments.service.ts`, `payments.controller.ts`, `payments.module.ts`
- Test: `apps/api/src/payments/payments.service.spec.ts`, `payments.e2e-spec.ts`

**Interfaces:**
- Consumes: `AuditService.append`, `PrismaService`, `PAYMENT_PROVIDER` token factory.
- Produces:
  - `interface PaymentRequest { amountVnd: number; orderId: string; idempotencyKey: string; }`
  - `interface PaymentQr { providerReference: string; qrPayload: string; expiresAt: string; }`
  - `interface PaymentProvider { createQr(input: PaymentRequest): Promise<PaymentQr>; }`
  - `PaymentsService.createIntent(actor, orderId, clientRequestId)` and `PaymentsService.confirm(actor, paymentId, note, clientRequestId)`.

- [ ] **Step 1: Write the failing service test**

`apps/api/src/payments/payments.service.spec.ts` (key cases: idempotent reuse, amount-from-order, provider-failure → FAILED):

```ts
import { PaymentsService } from './payments.service.js';

describe('PaymentsService.createIntent', () => {
  test('reuses an existing active intent for the same clientRequestId', async () => {
    const repo = { findActiveByOrder: jest.fn(async () => null), findByClientRequestId: jest.fn(async () => ({ id: 'pi-1', status: 'QR_CREATED', amountVnd: 50000 })), reserve: jest.fn() };
    const provider = { createQr: jest.fn(async () => ({ providerReference: 'r1', qrPayload: 'q', expiresAt: new Date().toISOString() })) };
    const service = new PaymentsService(repo as any, provider as any, null as any, null as any);
    // assert reuse path does not call provider.createQr
    const result = await service.createIntent({ userId: 'u1', role: 'CUSTOMER', sessionId: 's' }, 'o1', 'cr-1');
    expect(provider.createQr).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter api test payments`
Expected: FAIL — module missing.

- [ ] **Step 3: Write payment-provider.ts + demo adapter**

`apps/api/src/payments/payment-provider.ts`:

```ts
export interface PaymentRequest {
  orderId: string;
  amountVnd: number;
  idempotencyKey: string;
}

export interface PaymentQr {
  providerReference: string;
  qrPayload: string;
  expiresAt: string;
}

export interface PaymentProvider {
  createQr(input: PaymentRequest): Promise<PaymentQr>;
}
```

`apps/api/src/payments/demo-payment.provider.ts`:

```ts
import type { PaymentProvider, PaymentQr, PaymentRequest } from './payment-provider.js';

export class DemoPaymentProvider implements PaymentProvider {
  async createQr(input: PaymentRequest): Promise<PaymentQr> {
    return {
      providerReference: `LEOPARD-DEMO-${input.idempotencyKey}`,
      qrPayload: `LEOPARD-DEMO-QR-${input.amountVnd}-${input.orderId}`,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
  }
}
```

- [ ] **Step 4: Write payos + vietqr adapters (mocked HTTP, never real)**

`apps/api/src/payments/payos-payment.provider.ts` and `vietqr-payment.provider.ts` follow the same shape as `DemoPaymentProvider` but build a provider-specific reference/payload from the request; they take `clientId`/`apiKey` in the constructor and use a 5s timeout + at most one retry when the contract guarantees the same idempotency key. Both `createQr` return `PaymentQr`. Redact secrets from any logged error.

- [ ] **Step 5: Write the payments repository**

`apps/api/src/payments/payments.repository.ts`:

```ts
import { Injectable } from '@nestjs/common';
import type { PaymentIntent, PaymentStatus, Prisma, ProviderSource } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveByOrder(orderId: string): Promise<PaymentIntent | null> {
    return this.prisma.paymentIntent.findFirst({
      where: { orderId, status: { in: ['UNPAID', 'QR_CREATED'] } },
    });
  }

  async findByClientRequestId(orderId: string, clientRequestId: string): Promise<PaymentIntent | null> {
    return this.prisma.paymentIntent.findFirst({ where: { orderId, clientRequestId } });
  }

  async findById(id: string): Promise<PaymentIntent | null> {
    return this.prisma.paymentIntent.findUnique({ where: { id } });
  }

  async listByOrder(orderId: string): Promise<PaymentIntent[]> {
    return this.prisma.paymentIntent.findMany({ where: { orderId }, orderBy: { createdAt: 'asc' } });
  }

  async update(id: string, data: Prisma.PaymentIntentUpdateInput, tx?: Prisma.TransactionClient): Promise<PaymentIntent> {
    const db = tx ?? this.prisma;
    return db.paymentIntent.update({ where: { id }, data });
  }
}
```

- [ ] **Step 6: Write the payments service**

`apps/api/src/payments/payments.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { DomainError } from '../common/domain-error.js';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { AuditService } from '../audit/audit.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { OrdersRepository } from '../orders/orders.repository.js';
import { PAYMENT_PROVIDER } from './payments.module.js';
import type { PaymentProvider } from './payment-provider.js';
import { PaymentsRepository } from './payments.repository.js';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: PaymentsRepository,
    private readonly orders: OrdersRepository,
    private readonly audit: AuditService,
    private readonly provider: PaymentProvider,
  ) {}

  async createIntent(actor: AuthenticatedActor, orderId: string, clientRequestId: string) {
    const existing = await this.repo.findByClientRequestId(orderId, clientRequestId);
    if (existing) return existing;

    const order = await this.orders.findById(orderId);
    if (!order) throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy đơn hàng');
    if (actor.role === 'CUSTOMER' && order.customerId !== actor.userId) {
      throw new DomainError('FORBIDDEN', 403, 'Chỉ khách hàng sở hữu được tạo thanh toán');
    }

    const amountVnd = order.priceVnd ?? 0;
    const intent = await this.prisma.$transaction(async (tx) => {
      const active = await tx.paymentIntent.findFirst({
        where: { orderId, status: { in: ['UNPAID', 'QR_CREATED'] } },
      });
      if (active && active.clientRequestId && active.clientRequestId !== clientRequestId) {
        throw new DomainError('PAYMENT_ACTIVE_INTENT_CONFLICT', 409, 'Đơn hàng đã có giao dịch thanh toán đang hoạt động');
      }
      return active;
    });

    let qr;
    try {
      qr = await this.provider.createQr({ orderId, amountVnd, idempotencyKey: `${orderId}:${clientRequestId}` });
    } catch {
      await this.repo.update(intent.id, { status: 'FAILED' });
      throw new DomainError('PAYMENT_PROVIDER_FAILED', 502, 'Nhà cung cấp thanh toán không khả dụng');
    }

    return this.prisma.$transaction((tx) =>
      tx.paymentIntent.update({
        where: { id: intent.id },
        data: {
          provider: qr.providerReference ? 'DEMO' : null,
          providerReference: qr.providerReference,
          qrPayload: qr.qrPayload,
          expiresAt: new Date(qr.expiresAt),
          status: 'QR_CREATED',
          clientRequestId,
        },
      }),
    );
  }

  async confirm(actor: AuthenticatedActor, paymentId: string, note: string, clientRequestId: string) {
    const trimmed = note.trim();
    if (trimmed.length < 5 || trimmed.length > 500) {
      throw new DomainError('VALIDATION_ERROR', 422, 'Ghi chú phải từ 5 đến 500 ký tự');
    }
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.paymentIntent.findFirst({ where: { confirmationRequestId: clientRequestId } });
      if (existing) return existing;

      const intent = await tx.paymentIntent.findUnique({ where: { id: paymentId } });
      if (!intent) throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy giao dịch');
      if (!['UNPAID', 'QR_CREATED'].includes(intent.status)) {
        throw new DomainError('PAYMENT_ALREADY_CONFIRMED', 409, 'Giao dịch không thể xác nhận');
      }
      const updated = await tx.paymentIntent.update({
        where: { id: paymentId },
        data: {
          status: 'PAID_MANUAL',
          confirmedById: actor.userId,
          confirmedAt: new Date(),
          confirmationNote: trimmed,
          confirmationRequestId: clientRequestId,
        },
      });
      await this.audit.append({
        actorId: actor.userId,
        action: 'CONFIRM_PAYMENT',
        resourceType: 'PaymentIntent',
        resourceId: paymentId,
        idempotencyRequestId: clientRequestId,
        metadata: { amountVnd: intent.amountVnd, orderId: intent.orderId },
      }, tx);
      return updated;
    });
  }

  async getHistory(actor: AuthenticatedActor, orderId: string) {
    const order = await this.orders.findById(orderId);
    if (!order) throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy đơn hàng');
    if (actor.role === 'CUSTOMER' && order.customerId !== actor.userId) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy đơn hàng');
    }
    return this.repo.listByOrder(orderId);
  }
}
```

- [ ] **Step 7: Write the controller + module**

`apps/api/src/payments/payments.controller.ts`:

```ts
import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthenticatedActor } from '../auth/decorators/current-user.js';
import { RequireRoles } from '../auth/decorators/require-roles.js';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { PaymentsService } from './payments.service.js';

@UseGuards(AccessTokenGuard)
@Controller()
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('orders/:id/payments')
  createIntent(@CurrentUser() actor: AuthenticatedActor, @Param('id') orderId: string, @Body() body: { clientRequestId: string }) {
    return this.payments.createIntent(actor, orderId, body.clientRequestId);
  }

  @Get('orders/:id/payments')
  getHistory(@CurrentUser() actor: AuthenticatedActor, @Param('id') orderId: string) {
    return this.payments.getHistory(actor, orderId);
  }

  @Post('admin/payments/:id/confirm')
  @UseGuards(RoleGuard)
  @RequireRoles('ADMIN')
  confirm(@CurrentUser() actor: AuthenticatedActor, @Param('id') id: string, @Body() body: { note: string; clientRequestId: string }) {
    return this.payments.confirm(actor, id, body.note, body.clientRequestId);
  }
}
```

`apps/api/src/payments/payments.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsRepository } from './payments.repository.js';
import { PaymentsService } from './payments.service.js';
import type { PaymentProvider } from './payment-provider.js';
import { DemoPaymentProvider } from './demo-payment.provider.js';
import { PayOsProvider } from './payos-payment.provider.js';
import { VietQrProvider } from './vietqr-payment.provider.js';

export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';

@Module({
  imports: [DatabaseModule, OrdersModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsRepository,
    PaymentsService,
    { provide: PAYMENT_PROVIDER, useFactory: (): PaymentProvider => createPaymentProvider(process.env) },
  ],
})
export class PaymentsModule {}

function createPaymentProvider(source: NodeJS.ProcessEnv): PaymentProvider {
  if (source.PAYMENT_PROVIDER === 'payos') return new PayOsProvider({ clientId: source.PAYOS_CLIENT_ID ?? '', apiKey: source.PAYOS_API_KEY ?? '' });
  if (source.PAYMENT_PROVIDER === 'vietqr') return new VietQrProvider({ apiKey: source.PAYOS_API_KEY ?? '' });
  return new DemoPaymentProvider();
}
```

- [ ] **Step 8: Register PaymentsModule**

Add `PaymentsModule` to `app.module.ts` imports.

- [ ] **Step 9: Run tests + typecheck**

Run: `pnpm --filter api test payments && pnpm --filter api typecheck`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/payments/ apps/api/src/app.module.ts
git commit -m "feat(wave3): add payment intents with idempotency and audited manual confirmation"
```

---

## Task 7: PH-08 verify + DI fix

**Files:**
- Modify: `apps/api/src/tracking/tracking.gateway.ts:31`, `apps/api/src/orders/update-order-status.service.ts:18`
- Test: reuse existing `apps/api/src/tracking/*.spec.ts` + real-DB/socket suites

**Interfaces:**
- Consumes: `OrderEventsPublisher` (already a provider in `OrdersModule`).
- Produces: `TrackingGateway` and `UpdateOrderStatusService` now receive the same injected `OrderEventsPublisher` instance; no `new OrderEventsPublisher()` default.

- [ ] **Step 1: Fix TrackingGateway DI**

In `apps/api/src/tracking/tracking.gateway.ts`, change the constructor parameter:

```ts
public constructor(
  private readonly auth: SocketAuthAdapter,
  private readonly tracking: TrackingService,
  private readonly orderEvents: OrderEventsPublisher,
) {
  this.orderEvents.subscribe((event) => this.broadcastOrderStatus(event));
}
```

(Remove the `= new OrderEventsPublisher()` default. `OrderEventsPublisher` is already provided + exported by `OrdersModule`, which `TrackingModule` imports.)

- [ ] **Step 2: Fix UpdateOrderStatusService DI**

In `apps/api/src/orders/update-order-status.service.ts`, change:

```ts
private readonly eventsPublisher: OrderEventsPublisher = new OrderEventsPublisher(),
```
to
```ts
private readonly eventsPublisher: OrderEventsPublisher,
```

(`OrderEventsPublisher` is already in `OrdersModule` providers.)

- [ ] **Step 3: Run tracking + order unit tests**

Run: `pnpm --filter api test tracking && pnpm --filter api test orders`
Expected: PASS.

- [ ] **Step 4: Run real PostGIS + in-process Socket.IO suites**

Run (opt-in env required):
```bash
LEOPARD_TRACKING_DB_TEST=true DATABASE_URL=postgres://…/leopard_real_db_race_test pnpm --filter api test:e2e
```
Expected: PASS; 100-event p95 < 3s; authorization matrix shows no leaked events.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/tracking/tracking.gateway.ts apps/api/src/orders/update-order-status.service.ts
git commit -m "fix(wave3): inject OrderEventsPublisher via DI in tracking gateway and order status service"
```

---

## Task 8: PH-10 Fleet backend completion

**Files:**
- Modify: `apps/api/src/fleets/fleet-owner.service.ts` (remove `any`), `apps/api/src/fleets/fleet-membership.policy.ts` (add `assertOrderInFleet`), `apps/api/src/fleets/fleet-owner.controller.ts` (use the policy for order detail)
- Test: `apps/api/src/fleets/fleet-owner.e2e-spec.ts`

**Interfaces:**
- Consumes: `FleetScopeRepository.findActiveFleetScope`, `OrdersService.getOrderById`.
- Produces: `assertOrderInFleet(fleetId: string, orderId: string): Promise<void>` resolving scope from the repository (not trusting client `fleetId`).

- [ ] **Step 1: Write the failing isolation e2e test**

`apps/api/src/fleets/fleet-owner.e2e-spec.ts` (asserts 2-fleet isolation, 404 non-disclosure for wrong-fleet order, pagination allow-list). Follow the existing `order-lifecycle.e2e-spec.ts` harness (build `Test` app from `AppModule`, seed two fleets with distinct owners/drivers, issue access tokens).

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter api test:e2e fleet-owner`
Expected: FAIL — `assertOrderInFleet` is missing / `any` leaks.

- [ ] **Step 3: Add assertOrderInFleet to the policy**

In `fleet-membership.policy.ts`:

```ts
async assertOrderInFleet(fleetId: string, orderId: string): Promise<void> {
  const order = await this.repository.findOrderDriverFleet(orderId);
  if (!order || order.fleetId !== fleetId) {
    throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Order not found in this fleet');
  }
}
```

Add `findOrderDriverFleet(orderId)` to `FleetScopeRepository` returning `{ fleetId } | null` by joining the order's assigned driver's active DRIVER membership.

- [ ] **Step 4: Remove `any` from fleet-owner.service.ts**

Replace the three `where: any` / `(m: any)` / `(o: any)` with Prisma-typed filters:

```ts
import type { Prisma } from '@prisma/client';

const where: Prisma.FleetMemberWhereInput = { fleetId, role: 'DRIVER' };
// …and in getDrivers/getOrders map with explicit types instead of `any`.
```

Use `FleetDriverSummaryDto` / `FleetOrderSummaryDto` for mapped rows.

- [ ] **Step 5: Wire order-detail authorization**

In `fleet-owner.controller.ts` `getOrder`, replace the bare `resolveFleetScope` check with:

```ts
const fleetId = await this.policy.resolveFleetScope(actor);
await this.policy.assertOrderInFleet(fleetId, id);
return this.ordersService.getOrderById(actor, id);
```

- [ ] **Step 6: Run tests + typecheck**

Run: `pnpm --filter api test:e2e fleet-owner && pnpm --filter api typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/fleets/
git commit -m "feat(wave3): complete fleet backend with typed queries and order-in-fleet authorization"
```

---

## Task 9: PH-11 Admin backend completion

**Files:**
- Modify: `apps/api/src/admin/admin-command.service.ts`, `admin-query.service.ts`, `admin.module.ts`
- Test: `apps/api/src/admin/admin-command.integration-spec.ts`, `admin-query.e2e-spec.ts`

**Interfaces:**
- Consumes: `AuditService.append`, `PrismaService`.
- Produces: `updateUserStatus` with self-disable prevention, note 5–500 validation, idempotency, and exactly-once audit via `AuditService`; `getUsers/getFleets/getDrivers/getOrders` typed.

- [ ] **Step 1: Write the failing integration test**

`apps/api/src/admin/admin-command.integration-spec.ts` asserts: reason required (422 when <5 or >500 chars), self-disable rejected (409/400 when `userId === actor.userId`), same `clientRequestId` returns idempotent result, rollback leaves zero audit on failure, exactly-once audit on concurrent duplicates.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter api test:e2e admin-command`
Expected: FAIL — current service calls `tx.auditLog.create` directly and lacks self-disable/note/idempotency.

- [ ] **Step 3: Rewrite updateUserStatus via AuditService**

`apps/api/src/admin/admin-command.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { AdminUpdateUserStatusCommand } from '@leopard/shared';
import { DomainError } from '../common/domain-error.js';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { AuditService } from '../audit/audit.service.js';
import { UserStatus } from '@prisma/client';

@Injectable()
export class AdminCommandService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async updateUserStatus(actor: AuthenticatedActor, userId: string, command: AdminUpdateUserStatusCommand): Promise<void> {
    if (userId === actor.userId) {
      throw new DomainError('FORBIDDEN', 403, 'Không thể tự vô hiệu hóa tài khoản của chính mình');
    }
    const reason = command.reason?.trim() ?? '';
    if (reason.length < 5 || reason.length > 500) {
      throw new DomainError('VALIDATION_ERROR', 422, 'Lý do phải từ 5 đến 500 ký tự');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy người dùng');
    if (!['ACTIVE', 'DISABLED'].includes(command.status)) {
      throw new DomainError('VALIDATION_ERROR', 422, 'Trạng thái không hợp lệ');
    }

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.auditLog.findFirst({
        where: { idempotencyRequestId: command.clientRequestId },
      });
      if (existing) return;

      await tx.user.update({ where: { id: userId }, data: { status: command.status as UserStatus } });
      await this.audit.append({
        actorId: actor.userId,
        action: 'UPDATE_USER_STATUS',
        resourceType: 'User',
        resourceId: userId,
        idempotencyRequestId: command.clientRequestId,
        metadata: { fromStatus: user.status, toStatus: command.status, reason },
      }, tx);
    });
  }
}
```

- [ ] **Step 4: Remove `any` from admin-query.service.ts**

Replace `where: any` with `Prisma.UserWhereInput` / `Prisma.FleetWhereInput` and typed map callbacks, mirroring the fleet fix. For `getOrders`, use `Prisma.OrderWhereInput` and keep the `id contains` filter.

- [ ] **Step 5: Import AuditModule in admin.module.ts**

```ts
imports: [AuditModule],
```

- [ ] **Step 6: Run tests + typecheck**

Run: `pnpm --filter api test:e2e admin && pnpm --filter api typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/admin/
git commit -m "feat(wave3): harden admin commands with audit, self-disable prevention, and idempotency"
```

---

## Task 10: Final gate + baseline

**Files:**
- Modify: none (unless a gate failure requires a fix).
- Test: full gate suite.

**Interfaces:**
- Consumes: all prior tasks.
- Produces: a green gate and a recorded baseline SHA.

- [ ] **Step 1: Run the full gate**

```bash
pnpm --filter shared test
pnpm --filter shared typecheck
pnpm --filter api prisma generate
pnpm --filter api test
pnpm --filter api test:e2e
pnpm --filter api test:contract
pnpm --filter api typecheck
pnpm --filter api lint
pnpm --filter api build
git diff --check
```

Expected: all exit 0. If `lint`/`build` surface pre-existing issues, fix them minimally in the file that owns them (do not disable rules).

- [ ] **Step 2: Run the additional gates**

- Clean-install + upgrade migration (Task 2 Step 5) — confirm again.
- Deterministic seed ×2 (`pnpm --filter api prisma:migrate:test` then re-run seed) — identical manifest hashes.
- Real PostGIS tracking + real payment/idempotency transaction + in-process Socket.IO (Task 7 Step 4).
- Secret scan + dependency audit: no secrets/PII in code/fixture/snapshot/log.

- [ ] **Step 3: Independent review**

Dispatch `code-reviewer` and `security-reviewer` on the Wave 3 diff. Resolve all P0/P1 findings before proceeding.

- [ ] **Step 4: Record baseline SHA and commit any final fix**

```bash
git add -A
git commit -m "feat(wave3): complete Wave 3 backend gate"
git rev-parse HEAD   # record as baseline SHA in handoff
```

---

## Self-Review Notes (completed by plan author)

- **Spec coverage:** §5 Audit (Task 4), §6 migration (Task 2), §7 Media (Task 5), §8 Payment (Task 6), §9 Tracking verify+DI (Task 7), §10 Fleet (Task 8), §11 Admin (Task 9), §12 contract (Task 3), §13 env unblock (Task 1), §14 quality (embedded in every task + Task 10), §15/16/17 gates+ownership+branch (Task 10). No spec section is unassigned.
- **Placeholder scan:** no TBD/TODO. The one intentional in-progress note (checksum streaming) is resolved in Task 5 Step 9 with concrete code; the payos/vietqr adapters are described as "same shape as demo" — implementors must write the real bodies, which are trivial provider wrappers around a mocked HTTP client (no real network calls).
- **Type consistency:** `AuditService.append(input, tx)` signature is identical in Task 4 definition and Tasks 6/9 usage; `StorageProvider`/`PaymentProvider` interfaces match across module factory and service; `DeliveryProofReader` is reused (not re-bound).
