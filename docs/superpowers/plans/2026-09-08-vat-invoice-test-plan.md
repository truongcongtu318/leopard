# VAT Invoice + Email — Test Plan

> **Status:** DRAFT — not yet executed. Written after the feature was implemented
> untested (see `docs/superpowers/handoffs/2026-09-08-vat-invoice-execution-continuation-prompt.md`
> and the design/plan it links). This document only plans coverage; it does not
> add any test code.

## Scope of what exists to test

- Backend: `apps/api/src/invoices/*` (provider, mail provider, repository,
  service, controller, module), `PdfService.renderInvoice` +
  `render-invoice-pdf.ts`, `PaymentsService.confirmPayment`'s three call sites
  of `dispatchInvoiceIssuance`, `NotificationTriggers.notifyInvoiceEmailMissing`,
  `env.schema.ts`'s new `INVOICE_PROVIDER`/`MAIL_PROVIDER`/SMTP vars.
- Mobile: `model.ts` (`InvoiceView`), `adapter.ts` (`mapInvoiceToView`, invoice
  fetch in `getOrderDetailView`, `sendInvoiceEmail`), `CustomerOrderDetailScreen.tsx`
  (`InvoiceSection`), `CustomerOrderDetailRuntime.tsx` (`handleOpenInvoice`,
  `handleSendInvoiceEmail`).

## Test levels and where each lives

Mirrors the codebase's existing convention: plain-mock unit specs
(`*.spec.ts`, `new Service(mocks)`, no `Test.createTestingModule`) for
business logic, `*.e2e-spec.ts` (real `AppModule` + supertest + real DB) for
HTTP contract and cross-module wiring, and an opt-in
`test/real-db-race-*` style suite for genuine concurrency. Mobile mirrors
`adapter.test.ts` / `CustomerScreens.test.tsx`.

---

## 1. Backend unit specs (fast, mocked, run in every CI build)

### 1.1 `src/invoices/invoice.provider.spec.ts` (new)

Model after `src/drivers/driver-contract.service.spec.ts`'s `createMocks()`
pattern — mock `PdfService.renderInvoice` only.

- `SelfGeneratedInvoiceProvider.generate`:
  - VAT boundary values: `amountVnd = 0` → `vatRateVnd = 0`, `totalVnd = 0`.
  - `amountVnd = 1` → `vatRateVnd = Math.round(0.1) = 0` (rounds down) — pins
    the exact rounding rule so a future refactor can't silently switch to
    `Math.ceil`/`Math.floor` without a failing test.
  - `amountVnd = 5` → `vatRateVnd = Math.round(0.5) = 1` — the round-half-up
    boundary, since JS `Math.round` rounds `.5` up for positive numbers.
  - A representative real fare (e.g. `480_000`) → exact expected
    `vatRateVnd`/`totalVnd`, asserted as integers (`Number.isInteger`).
  - Rejects negative `amountVnd` and non-integer `amountVnd` (e.g. `100.5`)
    by throwing, without calling `pdf.renderInvoice`.
  - Calls `pdf.renderInvoice` with the computed `vatRateVnd`/`totalVnd` and a
    single line item equal to `amountVnd` — asserts the exact shape passed
    (this is the contract the PDF template relies on).
  - Returns the buffer `pdf.renderInvoice` resolves with, unchanged.
- `EInvoiceProvider.generate` rejects with a clear, non-generic error message
  (asserts the placeholder never silently no-ops).

### 1.2 `src/invoices/mail.provider.spec.ts` (new)

- `ConsoleMailProvider.sendInvoiceLink`: resolves without throwing; asserts
  the logged message does **not** contain the recipient email or the link
  (spy on `Logger.prototype.log` or inject a test logger) — this is the
  "no secret-bearing logs" requirement from the plan, and is exactly the
  kind of regression a refactor could silently introduce.
- `SmtpMailProvider.sendInvoiceLink`: mock `nodemailer.createTransport` to
  return `{ sendMail: jest.fn() }` (via `jest.mock('nodemailer')`), assert
  `sendMail` is called once with `to`/`from`/`subject` containing the
  invoice number and the link in the body text; a `sendMail` rejection
  propagates (caller — `InvoicesService` — is responsible for catching it,
  not this class).

### 1.3 `src/invoices/invoices.repository.spec.ts` (new)

- `reserveNextInvoiceNumber`: mock a `tx.invoiceSequence.upsert` that
  returns `{ year, lastValue: 1 }` then `{ year, lastValue: 2 }` on
  successive calls — assert the formatted numbers are
  `LP/<year>/000001` and `LP/<year>/000002` (exact zero-padding, exact
  separator). Also assert `lastValue = 1_000_000` formats as
  `LP/<year>/1000000` (no truncation past 6 digits, per the plan's "grows
  gracefully" note in the code comment).
- `create`/`findByOrderId`/`findByPaymentIntentId`/`findById`/`setEmailSent`:
  thin pass-through — one smoke test each confirming the right Prisma
  delegate method and `where`/`data` shape is called, matching the style of
  existing thin-repository tests (e.g. `payments.service.spec.ts`'s `repo.*`
  mocks — a repository-level spec isn't standard elsewhere in this codebase,
  so consider folding these into 1.4's service-level mocks instead of a
  separate file if time is tight; the sequence-number test above is the one
  genuinely worth its own spec).

### 1.4 `src/invoices/invoices.service.spec.ts` (new — the most important file)

Model after `payments.service.spec.ts`: `new InvoicesService(invoicesRepo,
prisma, storage, invoiceProvider, mailProvider, ordersRepo)` with every
dependency a plain `jest.fn()` object, no `Test.createTestingModule`.

`ensureInvoice(orderId, paymentIntentId)`:

- Returns the existing row immediately (no provider/storage/repo.create
  calls) when `invoicesRepo.findByOrderId` already returns one — the core
  idempotency guarantee.
- Throws `RESOURCE_NOT_FOUND` when the order is missing, when the payment
  intent is missing, or when `paymentIntent.orderId !== orderId` (guards
  against a caller passing mismatched IDs).
- Throws `VALIDATION_ERROR` (422) when the payment intent exists but is not
  `PAID_MANUAL` (e.g. still `QR_CREATED`) — asserts no storage/repo writes
  happened.
- Happy path: reserves a number, calls `invoiceProvider.generate` with
  `amountVnd` taken from `paymentIntent.amountVnd` (**not** from
  `order.priceVnd`) — assert by making the two values differ in the mock
  and checking which one reaches the provider. Uploads via `storage.put` to
  a `invoices/<uuid>.pdf` key, then `invoicesRepo.create` with that exact
  key, then (customer has an email) sends via `mailProvider` and returns a
  row with `emailSentAt` set.
- Email-absent path: `customer.email` is `null` → `mailProvider.sendInvoiceLink`
  is never called, returned invoice has `emailSentAt: null`, and the method
  still resolves (invoice issuance is not blocked by a missing email).
- Auto-email failure: `mailProvider.sendInvoiceLink` rejects →
  `ensureInvoice` still resolves with the created invoice, `emailSentAt`
  stays `null` (mirrors the design's "email send failure must not fail
  invoice issuance").
- Race lost: `invoicesRepo.create` rejects with a mocked
  `Prisma.PrismaClientKnownRequestError` (`code: 'P2002'`) →
  `invoicesRepo.findByOrderId` (called again) returns a different row than
  the one just built → assert `storage.delete` was called with the losing
  upload's key, and the method returns the **existing** (winning) row, not
  the caller's own.
- Non-unique-constraint failure from `invoicesRepo.create` (e.g. a generic
  DB error) → rethrows, and `storage.delete` is still called for cleanup
  (the "best-effort delete on any persistence failure" rule, not just P2002).

`ensureInvoiceForPayment` (the `InvoiceIssuancePort` implementation):

- Never throws even when `ensureInvoice` throws — resolves `null` instead
  (assert with a rejecting mock chain).
- Returns `{ invoiceId, needsEmailPrompt: true }` when the resolved
  invoice's `emailSentAt` is `null`, `needsEmailPrompt: false` otherwise.

`getForOrder`:

- 404s (via `assertOwnerOrAdmin`) for a caller who is neither the order's
  customer nor `ADMIN` — assert the error code is the generic
  `RESOURCE_NOT_FOUND`, never a distinguishing 403 (non-disclosing).
- Returns the existing invoice's view without calling
  `ensureInvoiceForPayment` when one already exists.
- Retry-on-read: no invoice exists, but a `PAID_MANUAL` payment intent does
  → calls `ensureInvoiceForPayment` and returns the resulting view.
- No invoice and no `PAID_MANUAL` intent → 404.

`sendEmail`:

- Success: calls `mailProvider.sendInvoiceLink` with a freshly created read
  URL, then `invoicesRepo.setEmailSent` with the given email, returns the
  updated view.
- SMTP failure: `mailProvider.sendInvoiceLink` rejects → throws
  `DomainError('MAIL_PROVIDER_FAILED', 502, ...)`, and `invoicesRepo.setEmailSent`
  is **never called** (the invoice must stay exactly as it was, not partially
  updated).
- `backfillCustomerEmail`: fills `User.email` only when it was `null`
  (assert `prisma.user.update` called); never called (or its result ignored)
  when the user already has an email; a thrown error inside it (simulate
  `prisma.user.update` rejecting, e.g. a unique-email collision) is
  swallowed and does not propagate out of `sendEmail` — the caller still
  gets back a successful `InvoiceView`.
- Ownership: identical 404-non-disclosing behavior as `getForOrder` for
  `getDownloadUrl` and `sendEmail` on an invoice belonging to another
  customer.

### 1.5 `src/payments/payments.service.spec.ts` (extend existing file)

The existing file constructs `new PaymentsService(repo, provider, prisma,
ordersRepo, auditService, notificationTriggers)` — **6 args**, now **7**
(`invoiceIssuancePort` was added). It currently passes with `undefined` for
the missing 7th arg only because every call is wrapped in
`dispatchInvoiceIssuance`'s try/catch. Add an explicit mock instead of
relying on that accident:

```ts
invoiceIssuancePort = { ensureInvoiceForPayment: jest.fn().mockResolvedValue(null) };
service = new PaymentsService(repo, provider, prisma, ordersRepo, auditService, notificationTriggers, invoiceIssuancePort);
```

New cases:

- `confirmPayment` (immediate, first-time confirmation): after the
  transaction commits, `invoiceIssuancePort.ensureInvoiceForPayment` is
  called exactly once with `(intent.orderId, intent.id)`.
- A confirmation replayed via `confirmationRequestId` (existing idempotency
  path) **also** calls `ensureInvoiceForPayment` again — this is the
  Phase 0 "retry-on-replay" contract, and it's easy to regress by "cleaning
  up" the early-return branch later.
- A confirmation replayed via the `intent.status === 'PAID_MANUAL'`
  short-circuit **also** calls `ensureInvoiceForPayment` again.
- `invoiceIssuancePort.ensureInvoiceForPayment` returning
  `{ needsEmailPrompt: true }` triggers
  `notificationTriggers.notifyInvoiceEmailMissing` with the order's
  `customerId`; returning `{ needsEmailPrompt: false }` or `null` does not.
- `invoiceIssuancePort.ensureInvoiceForPayment` rejecting (not just
  returning `null`) still lets `confirmPayment` resolve successfully with
  the updated intent — this is the "must never fail a payment confirmation"
  guarantee and deserves its own explicit test rather than relying on the
  try/catch being exercised incidentally by other tests.

### 1.6 `src/notifications/notification-triggers.service.spec.ts` (extend, if it exists — check first)

- `notifyInvoiceEmailMissing` creates exactly one `SYSTEM` notification for
  the given `customerId` with `data.orderId` set.
- A `notificationsService.create` rejection is logged and swallowed, never
  thrown.

### 1.7 `src/config/env.schema.spec.ts` (extend existing file)

The production fixture was already patched during implementation to include
`MAIL_PROVIDER: 'smtp'` + SMTP vars (otherwise the whole suite fails — this
was caught once already; don't let it regress). Add:

- `MAIL_PROVIDER: 'smtp'` with any of `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS`/
  `MAIL_FROM` missing → throws (extend the existing `it.each([...])`
  "fails fast when %s is missing" table with these four names, reusing the
  `validProductionEnv` fixture).
- Production config with `MAIL_PROVIDER` unset (defaults to `console`) and
  `ALLOW_CONSOLE_MAIL_PROVIDER` unset → throws (mirrors the
  `ALLOW_DEMO_PAYMENT_PROVIDER` test already present).
- Production config with `MAIL_PROVIDER: 'console'` and
  `ALLOW_CONSOLE_MAIL_PROVIDER: 'true'` → accepted.
- `INVOICE_PROVIDER: 'einvoice'` parses fine at the env layer (env schema
  doesn't reject it — the runtime rejection lives in `EInvoiceProvider`,
  already covered by 1.1).

---

## 2. Backend HTTP/integration coverage

### 2.1 `src/invoices/invoices.e2e-spec.ts` (new)

Follow `src/drivers/driver-contract.e2e-spec.ts`'s structure exactly —
**must** pass `moduleFixture.createNestApplication({ bodyParser: false })`
explicitly (the known pre-existing body-parser-hang issue for any e2e spec
that omits this; not this feature's bug to fix, just don't reintroduce it).

Seed: one customer with an email, one customer without, one admin, one
order per customer with a `PaymentIntent` driven to `PAID_MANUAL` via the
real `POST /admin/payments/:id/confirm` endpoint (so the invoice is issued
through the real integration path, not by hand-inserting a row).

- `GET /invoices/order/:orderId` as the owning customer → `200` with
  `invoiceNumber`, `totalVnd`, `viewUrl` (well-formed URL), and
  `emailSentAt` set (since this customer has an email).
- Same endpoint for the customer without an email → `emailSentAt: null`.
- Same endpoint as a *different* customer → `404` (not `403`) — assert the
  error code is `RESOURCE_NOT_FOUND` and the body doesn't leak
  `invoiceNumber`/`pdfStorageKey`.
- Same endpoint as `ADMIN` → `200` (admin can read any invoice).
- `GET /invoices/:id/download` → HTTP `302` with a `Location` header;
  cross-customer access → `404`.
- `POST /invoices/:id/send` with a syntactically invalid email (e.g.
  `"not-an-email"`) → `422` (this app's `ApiExceptionFilter` remaps the
  global `ValidationPipe`'s rejection to 422, not the framework's 400
  default — confirmed against real HTTP wiring), before ever reaching the
  service.
- `POST /invoices/:id/send` with a valid email → `200`, `emailSentAt`
  updated; a second call with a different valid email → `200` again,
  `emailSentAt` updated to the new send (resend is allowed, not blocked).
- Order with no `PAID_MANUAL` payment yet → `GET /invoices/order/:orderId`
  → `404` (nothing to retry-issue).
- Concurrent duplicate: fire two parallel
  `POST /admin/payments/:id/confirm` calls with different
  `clientRequestId`s but for a payment that's already `PAID_MANUAL` from a
  third call that just landed (simulate with `Promise.all`) → assert via
  `GET /invoices/order/:orderId` that exactly one invoice exists and its
  `invoiceNumber` never changes across the calls.

### 2.2 Extend `src/payments/payments.e2e-spec.ts`

- After `POST /admin/payments/:id/confirm`, `GET /invoices/order/:orderId`
  returns a real invoice within the same test run (cross-module wiring
  smoke test — catches a broken `InvoicesModule` import/export that unit
  mocks can't).

---

## 3. Real-DB concurrency test (opt-in, not run by default CI)

### 3.1 `test/real-db-race-condition.integration-spec.ts` (extend) or a new sibling file

Gated the same way as the existing suite
(`LEOPARD_REAL_DB_RACE_TEST=true` + the disposable database name check in
`test/real-db-race-gate.ts` — do not weaken that gate).

- Fire N (e.g. 20) parallel `POST /admin/payments/:id/confirm` calls for N
  **different** orders, each already `UNPAID`/`QR_CREATED` with distinct
  `PaymentIntent`s, all in the same calendar year. Assert:
  - Exactly N `Invoice` rows are created (no duplicates, no dropped ones).
  - All N `invoiceNumber`s are unique.
  - `InvoiceSequence.lastValue` for that year equals exactly N above its
    starting value (no gaps from a failed reservation, no double-increment
    from a lost race) — this is the test that actually exercises the
    "atomic UPSERT, not `max(invoiceNumber)`" guarantee end-to-end against
    real Postgres, which a mocked unit test cannot prove.
  - No orphaned PDF objects left in local storage for orders whose
    confirmation ultimately succeeded (every succeeding confirmation's
    upload has a matching `Invoice.pdfStorageKey`).

---

## 4. Mobile

### 4.1 `src/features/customer/orders/adapter.test.ts` (extend existing file)

- `mapInvoiceToView`: formats `totalVnd` via `formatVndPrice` and `issuedAt`
  via `formatDateTime`, passes through `emailSentAt`/`viewUrl`/`id`/
  `invoiceNumber` unchanged.
- `mapOrderToDetail(..., invoiceData)`: `invoice: null` when `invoiceData`
  is `undefined`/`null`; `invoice: mapInvoiceToView(invoiceData)` when
  provided.
- `getOrderDetailView`: mock `activeClient.get` so
  `/invoices/order/:orderId` resolves → returned view's `order.invoice` is
  non-null; mock it to reject (404) → `order.invoice` is `null` and the
  overall call still succeeds (mirrors the existing "payments fetch
  failure still returns a content view" test already in this file for
  `latestPayment`).
- `sendInvoiceEmail`: valid orderId + successful `POST /invoices/:id/send`
  → calls `getOrderDetailView` again and returns its result; invalid
  orderId → returns the `C-DETAIL-ERROR` boundary view without ever
  calling `activeClient.post`; `activeClient.post` rejecting → returns a
  `kind: 'error'` view (`C-DETAIL-INVOICE-SEND-FAILED`) without throwing.

### 4.2 `src/features/customer/orders/CustomerScreens.test.tsx` (extend existing `describe('CustomerOrderDetailScreen', ...)`)

Follow the existing tests' pattern (render via
`CustomerOrderDetailScreen`, fixture-driven view, assert on
`getByText`/callback spies):

- `order.invoice: null` → no "Hóa đơn" section rendered at all.
- `order.invoice` present with `emailSentAt` set → renders invoice number/
  total/issued-at, "Xem hóa đơn" button calls `onOpenInvoice` with the
  exact `viewUrl`, and no email input is rendered.
- `order.invoice` present with `emailSentAt: null` → renders the email
  input + "Gửi email hóa đơn" button; typing an invalid email and pressing
  the button shows a validation message and does **not** call
  `onSendInvoiceEmail`; typing a valid email calls
  `onSendInvoiceEmail(invoice.id, email)` exactly once.

### 4.3 `src/features/customer/orders/CustomerOrderDetailRoute.test.tsx` or `CustomerOrderDetailRuntime` coverage

Check whether `CustomerOrderDetailRuntime.tsx` already has a dedicated test
file before adding one (its current test coverage appears to live in
`CustomerOrderDetailRoute.test.tsx` — confirm at execution time). Add:

- `handleOpenInvoice` calls `Linking.openURL` with the given URL and
  swallows a rejection (mock `Linking.openURL` to reject, assert no
  unhandled rejection/crash).
- `handleSendInvoiceEmail` calls `port.sendInvoiceEmail(invoiceId, orderId,
  email)` and writes the result into the query cache via
  `queryClient.setQueryData`; a port without `sendInvoiceEmail` defined
  (defensive optional-chaining branch) is a no-op, not a crash.

### 4.4 `src/features/customer/orders/fixtures.test.ts` (extend if it asserts fixture shape)

- Every `detailOrder(...)` fixture scenario includes `invoice` (currently
  hardcoded to `null` — if a future scenario needs a populated invoice for
  Storybook/demo purposes, add a fixture case and assert its shape matches
  `InvoiceView`).

---

## Execution order (suggested)

1. Backend unit specs (1.1–1.7) — fastest feedback, no DB/app bootstrap.
2. Mobile unit/component tests (4.1–4.4) — independent of backend, can run
   in parallel with step 1.
3. Backend e2e specs (2.1–2.2) — needs a real Postgres + the
   `bodyParser: false` discipline.
4. Real-DB race suite (3.1) — opt-in, run manually or in a dedicated CI job,
   not on every commit (matches how the existing
   `real-db-race-condition.integration-spec.ts` is already gated).

## Explicitly out of scope for this plan

- Load/performance testing of PDF rendering or SMTP throughput.
- Testing the real `nodemailer` SMTP transport against a live mail server
  (the handoff already flags `apps/api/.env` as seeded with **real** Gmail
  SMTP credentials — never point any automated test at it; `SmtpMailProvider`
  tests must mock `nodemailer.createTransport`, never call it for real).
- `EInvoiceProvider` behavioral tests beyond "it throws" — there is no real
  provider to test against yet.
