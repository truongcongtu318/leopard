# Media and Payment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement FR-07/FR-08 and AC-06 for secure uploads, delivery proof, payment QR and audited manual confirmation.

**Architecture:** Media metadata is persisted only after storage success; storage/payment SDKs remain behind providers. Manual payment transaction updates payment state and audit atomically.

**Tech Stack:** NestJS 11.1.28 multipart streaming, AWS S3 client 3.1085.0, local storage adapter, payOS/VietQR adapters, Prisma 7.8.0 transactions.

## Global Constraints

- Accept JPEG/PNG/WebP only, maximum 10 MB/file.
- Customer uploads cargo media for own order; assigned Driver uploads delivery proof.
- One active payment intent per order; only Admin confirms `PAID_MANUAL` with note.
- No automated bank reconciliation.

---

### Task PH-09-T01: Storage Provider and Upload Policy

**Files:**
- Create: `apps/api/src/media/providers/storage-provider.ts`, `local-storage.provider.ts`, `s3-storage.provider.ts`
- Create: `apps/api/src/media/upload-policy.ts`
- Test: `apps/api/src/media/providers/local-storage.provider.spec.ts`, `apps/api/src/media/providers/s3-storage.provider.spec.ts`, `apps/api/src/media/upload-policy.spec.ts`

**Interfaces:** `put`, `createReadUrl`, `delete`; input includes stream, size, contentType, checksum and key.

- [ ] Test MIME magic bytes, extension mismatch, 10 MB boundary, path traversal, deterministic local key and signed read URL expiry.
- [ ] Implement streaming limits and provider adapters with mocked S3 client.
- [ ] Run media unit tests; expected no full-file buffering and no real S3 calls.
- [ ] Commit `feat(media): add secure storage provider boundary`.

### Task PH-09-T02: Media REST and Delivery Proof

**Files:**
- Create: `apps/api/src/media/media.module.ts`, `media.controller.ts`, `media.service.ts`, `media.repository.ts`
- Test: `apps/api/src/media/media.e2e-spec.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:** `POST /orders/:id/media/cargo`, `POST /orders/:id/media/delivery-proof`, `GET /media/:id/url`; Media repository implements PH-06 `DeliveryProofReader`.

- [ ] Test role/ownership, invalid file, orphan cleanup on DB failure, private signed URL and proof enabling DELIVERED.
- [ ] Implement storage-first then metadata transaction with compensating delete.
- [ ] Run E2E and lifecycle regression tests.
- [ ] Commit `feat(media): upload cargo and delivery evidence`.

### Task PH-09-T03: Payment Provider Contracts

**Files:**
- Create: `apps/api/src/payments/providers/payment-provider.ts`, `demo-payment.provider.ts`, `payos.provider.ts`, `vietqr.provider.ts`
- Test: `apps/api/src/payments/providers/demo-payment.provider.spec.ts`, `apps/api/src/payments/providers/payos.provider.spec.ts`, `apps/api/src/payments/providers/vietqr.provider.spec.ts`

**Interfaces:** `createQr({orderId,amountVnd,reference,idempotencyKey}): Promise<{qrPayload,expiresAt,providerReference,source}>`.

- [ ] Test deterministic demo QR, exact amount/reference, timeout mapping, idempotency propagation and secret redaction.
- [ ] Implement adapters with mocked HTTP SDK and no automatic paid callback handling.
- [ ] Run provider contract tests.
- [ ] Commit `feat(payment): add QR provider adapters`.

### Task PH-09-T04: Payment Intent and Manual Confirmation

**Files:**
- Create: `apps/api/src/payments/payments.module.ts`, `payments.controller.ts`, `payments.service.ts`, `payments.repository.ts`
- Test: `apps/api/src/payments/payments.e2e-spec.ts`

**Interfaces:** `POST /orders/:id/payments`, `GET /orders/:id/payments`, `POST /admin/payments/:id/confirm {note,clientRequestId}`.

- [ ] Test owner/Admin create QR, one active intent, exact amount, Customer read, Admin-only confirmation, mandatory note and duplicate confirmation idempotency.
- [ ] Implement unique active intent and manual confirmation transaction with `AuditLog`.
- [ ] Run payment E2E and transaction rollback tests.
- [ ] Commit `feat(payment): add QR and audited manual confirmation`.

### Task PH-09-T05: Media and Payment Gate

**Files:**
- Test: `apps/api/test/media-payment-authorization.matrix-spec.ts`
- Modify: seed fixtures for media/payment only

**Interfaces:** Full role/ownership matrix and deterministic demo records.

- [ ] Test all role combinations, malicious uploads, provider failures, duplicate requests and no secret leakage.
- [ ] Run API lint/typecheck/test/integration/E2E/build and OpenAPI contract tests.
- [ ] Expected: all pass; filesystem/S3 cleanup assertions leave no orphan objects.
- [ ] Commit `test(payment): verify media and payment boundaries`.

## Phase Boundary Rules

- Do not serve storage objects publicly.
- Do not infer paid state from QR creation.
- Do not accept Admin confirmation without note/audit transaction.
