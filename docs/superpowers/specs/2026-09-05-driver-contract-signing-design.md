# Driver Contract Signing — Design Spec

**Date:** 2026-09-05
**Status:** Awaiting review
**Scope:** Backend (NestJS) + mobile (Expo) extension of the existing driver onboarding flow.

## 1. Purpose

Add a contract-signing step to driver onboarding so that when a customer applies
to become a driver (`POST /driver/apply`), they must first read and agree to a
driver contract. The agreement is recorded with a contract version, a timestamp,
the signer's name, and an uploaded signature image. The signature is **stored
only** at this stage — no electronic-signature verification (no OTP / CA / eSign
provider) is performed. The signature and the generated contract PDF serve as the
basis of evidence for the admin review step.

## 2. Non-goals

- No OTP / certificate-authority / third-party eSign verification.
- No contract lifecycle management (renewal, termination, amendments).
- No fleet-owner or admin contract variants — a single driver contract template.

## 3. Current flow (context)

`DriverApplicationService.apply()` ([driver-application.service.ts](../../apps/api/src/drivers/driver-application.service.ts))
already: validates the actor (customer or previously-rejected driver), rejects
already-active / already-pending drivers, then in a transaction sets the user to
`DRIVER`/`PENDING_APPROVAL` and upserts a `DriverProfile`. Admin later approves
or rejects. There is currently **no** contract step.

## 4. Design

### 4.1 Data model

New Prisma model `DriverContract`:

```prisma
model DriverContract {
  id                 String        @id @default(uuid()) @db.Uuid
  driverProfileId    String        @db.Uuid
  version            String        @db.VarChar(32)   // e.g. "v1"
  pdfStorageKey      String        @unique
  signatureStorageKey String?      @unique           // null = typed-name signature only
  signedByName       String        @db.VarChar(120)
  signedAt           DateTime      @db.Timestamptz(3)
  ipAddress          String?       @db.VarChar(64)
  createdAt          DateTime      @default(now()) @db.Timestamptz(3)
  driverProfile      DriverProfile @relation(fields: [driverProfileId], references: [id], onDelete: Cascade)

  @@index([driverProfileId, version])
  @@unique([driverProfileId, version])
}
```

`DriverProfile` gains two nullable audit columns:

```prisma
contractVersion  String?   @db.VarChar(32)
contractSignedAt DateTime? @db.Timestamptz(3)
```

### 4.2 Shared services

- **`PdfService`** (new, in a small `pdf/` module) — renders an HTML contract
  template to a PDF `Buffer` using `pdfkit`. Reused later by the invoice feature.
  Pure + unit-tested; takes structured fields, returns `Buffer`.
- **`StorageProvider`** (existing) — stores the contract PDF and signature image;
  `createReadUrl` produces view/download links with TTL.

### 4.3 Contract template

A single built-in template, parameterized with the driver's name, phone, vehicle
type, license plate, license number, and the contract version. Stored as a
versioned constant (`CONTRACT_VERSION = 'v1'`). Content is Vietnamese, covering:
parties, service terms, payment terms, obligations, termination, dispute
resolution. Full legal wording is a content task completed during implementation;
the spec only fixes the data contract (fields above).

### 4.4 API changes

**`GET /driver/contract`** — returns the current contract version and a
view/download URL to the (unsigned, template) contract PDF, so the driver can read
before agreeing. Response:

```json
{ "version": "v1", "pdfUrl": "https://…/files/contracts/template/v1.pdf" }
```

**`POST /driver/apply`** — `ApplyDriverDto` gains two fields:

```typescript
contractAccepted: boolean;      // must be true
signature?: string;             // base64 data-URI (image/png) OR a typed name string
```

Backend behaviour, all inside the existing transaction's flow:

1. Validate `contractAccepted === true`, else `422 CONTRACT_NOT_ACCEPTED`.
2. If `signature` is a data-URI: validate magic bytes (reuse
   `detectImageMime` / `isAllowedImageMime` from `media/image-validation.ts`),
   size ≤ 10MB, store via `StorageProvider` under
   `contracts/<profileId>/signature/<uuid>.<ext>`.
3. Render the contract PDF via `PdfService` with the driver's fields + signature
   (embed the signature image if present, else render the typed name).
4. Create `DriverContract` + update `DriverProfile.contractVersion/contractSignedAt`.
5. Then proceed with the existing role/status transition to `PENDING_APPROVAL`.

If the `DriverContract` upsert fails, the transaction rolls back (signature file
is best-effort cleaned up, mirroring `DriverDocumentService.uploadDocument`).

**`GET /driver/application`** — response gains `contractVersion` and
`contractSignedAt` so the pending screen can reflect the signed contract.

**`GET /admin/drivers/:id/contract`** — returns the signed contract PDF + signature
URL(s) for admin review.

### 4.5 Re-application / idempotency

A previously-rejected driver re-applying signs a new contract (new version row is
upserted; the `@@unique([driverProfileId, version])` guard keeps one contract per
version, and re-apply overwrites the signature for the same version).

### 4.6 Mobile

Extend `driver-register.tsx` (and its `DriverKycRuntime`/`adapter`): before
submitting `driver/apply`, show a contract review step (fetch `/driver/contract`,
render the PDF link), a consent checkbox, and a signature capture (typed name at
minimum; optional drawn signature image). The `driver/apply` payload then includes
`contractAccepted: true` and `signature`. Update
`driver-register-route.test.tsx` accordingly.

## 5. Error handling

| Code | HTTP | Meaning |
|---|---|---|
| `CONTRACT_NOT_ACCEPTED` | 422 | `contractAccepted` missing/false |
| `SIGNATURE_INVALID` | 422 | signature data-URI failed magic-byte/size validation |
| `DRIVER_PROFILE_REQUIRED` | 409 | (existing) apply before profile exists |

## 6. Testing

- Unit: `PdfService` returns a non-empty PDF buffer for given fields.
- Unit: `apply()` rejects `contractAccepted:false`; stores signature; writes
  `DriverContract` + profile columns; rolls back on failure.
- Contract test: `POST /driver/apply` OpenAPI contract includes the new fields.
- Mobile: `driver-register-route.test.tsx` covers the consent gate + signature
  inclusion in the apply payload.

## 7. Environment

No new environment variables are required for this feature. `StorageProvider`
already resolves `local`/`s3` via existing `STORAGE_PROVIDER`.
