# VAT Invoice + Email Delivery — Design Spec

**Date:** 2026-09-05
**Status:** Awaiting review
**Scope:** Backend (NestJS) + mobile (Expo). Self-generated invoice (PDF) with
email delivery of a view/download link; provider-abstraction so a real e-invoice
provider can be added later.

## 1. Purpose

When a payment is confirmed (`PAID_MANUAL`), automatically generate a VAT-style
invoice PDF, store it, and email the customer a link to view/download it. If the
customer has no email on file, prompt them to supply one, then send. Follows the
existing provider pattern (`PaymentProvider`, `StorageProvider`) so a real
e-invoice provider can be swapped in without restructuring.

## 2. Non-goals

- Real e-invoice / General Department of Taxation registration or signing.
- PayOS/VietQR payment integration (still demo-only).
- Invoice void/cancel/credit-note lifecycle (single `VOIDED` flag only).

## 3. Current state

- `PaymentsService.confirmPayment()` ([payments.service.ts](../../apps/api/src/payments/payments.service.ts))
  transitions `UNPAID`/`QR_CREATED` → `PAID_MANUAL`, admin-only, with
  idempotency. This is the natural invoice trigger.
- Customer registration already **requires email**
  (`customer-register.tsx` `canSubmit` includes `isValidEmail`), so most customers
  have one; edge cases (Google login + phone-link before profile completion) may
  not.
- No email/mailer dependency, no PDF library, no invoice model exist today.

## 4. Design

### 4.1 Data model

```prisma
enum InvoiceStatus {
  ISSUED
  VOIDED
}

model Invoice {
  id              String        @id @default(uuid()) @db.Uuid
  orderId         String        @unique @db.Uuid
  paymentIntentId String        @unique @db.Uuid
  invoiceNumber   String        @unique        // e.g. "LP/2026/000001"
  customerName    String        @db.VarChar(120)
  customerEmail   String?       @db.VarChar(255)
  customerTaxCode String?       @db.VarChar(20)
  customerAddress String?       @db.VarChar(255)
  amountVnd       Int
  vatRateVnd      Int
  totalVnd        Int
  pdfStorageKey   String        @unique
  status          InvoiceStatus @default(ISSUED)
  emailSentAt     DateTime?     @db.Timestamptz(3)
  issuedAt        DateTime      @default(now()) @db.Timestamptz(3)
  createdAt       DateTime      @default(now()) @db.Timestamptz(3)
  updatedAt       DateTime      @default(now()) @updatedAt @db.Timestamptz(3)
  order           Order         @relation(fields: [orderId], references: [id], onDelete: Restrict)
  paymentIntent   PaymentIntent @relation(fields: [paymentIntentId], references: [id], onDelete: Restrict)

  @@index([orderId])
}
```

`Order` gains `invoice Invoice?` back-relation; `PaymentIntent` gains
`invoice Invoice?` back-relation.

### 4.2 `InvoiceProvider` (abstraction)

```typescript
export interface GeneratedInvoice {
  invoiceNumber: string;
  pdfBuffer: Buffer;
}

export abstract class InvoiceProvider {
  abstract generate(input: InvoiceInput): Promise<GeneratedInvoice>;
}
```

- **`SelfGeneratedInvoiceProvider`** — builds the PDF via `PdfService` (shared with
  the contract feature), from a fixed Vietnamese invoice template. Computes
  `vatRateVnd` (default 10% of `amountVnd`), `totalVnd = amountVnd + vatRateVnd`,
  and an internal sequential `invoiceNumber` (via an `InvoiceSequence` counter row
  or `max(invoiceNumber)` under a transaction).
- (Future) **`EInvoiceProvider`** — talks to a Vietnamese e-invoice provider and
  returns an authority-issued number/PDF; only the provider is added later.

Provider selection via env `INVOICE_PROVIDER: 'self' | 'einvoice'` (default
`self`), gated like other providers.

### 4.3 `MailProvider` (abstraction)

```typescript
export abstract class MailProvider {
  abstract sendInvoiceLink(input: {
    to: string;
    customerName: string;
    invoiceNumber: string;
    link: string;
  }): Promise<void>;
}
```

- **`ConsoleMailProvider`** — logs the link (development; no real delivery).
- **`SmtpMailProvider`** — uses `nodemailer` with `SMTP_*` config.

Selection via env `MAIL_PROVIDER: 'console' | 'smtp'` (default `console`), gated by
`ALLOW_CONSOLE_MAIL_PROVIDER` in production.

### 4.4 Generation flow (triggered from `confirmPayment`)

After a `PAID_MANUAL` transition commits, `InvoicesService.ensureInvoice(orderId,
paymentIntentId)` runs (idempotent — `orderId`/`paymentIntentId` unique):

1. Load the order (customer name/phone/email, `priceVnd`) and payment intent.
2. `InvoiceProvider.generate(...)` → PDF buffer.
3. Store via `StorageProvider` under `invoices/<id>.pdf`.
4. Create `Invoice` row with `amountVnd = priceVnd`, computed VAT + total.
5. If `customerEmail` present → `MailProvider.sendInvoiceLink(...)` and set
   `emailSentAt`. Link is `StorageProvider.createReadUrl(pdfStorageKey, ttl)`.
6. If `customerEmail` absent → leave `emailSentAt = null`; the invoice is still
   viewable in-app; a notification (see notifications spec) informs the customer
   to add an email.

Email send failure must not fail invoice issuance: the invoice is already stored;
`emailSentAt` stays null and the send can be retried via the endpoint below.

### 4.5 API

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/invoices/order/:orderId` | customer owner / admin | invoice metadata + view URL |
| GET | `/invoices/:id/download` | customer owner / admin | redirect to signed PDF URL |
| POST | `/invoices/:id/send` | customer owner / admin | `{ email }` → validate, store, send, set `emailSentAt` |

`POST /invoices/:id/send` validates email with the same rule as the mobile
register flow (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`), stores into `invoice.customerEmail`
(and `user.email` if still null), then sends. Idempotent per email.

### 4.6 Mobile

Add an invoice entry point on the order detail screen (customer): if an invoice
exists, show a "Xem hóa đơn" action opening the view/download link; if the invoice
exists but `emailSentAt` is null, prompt for an email and call
`POST /invoices/:id/send`. Reuses existing customer-order screens.

## 5. Error handling

| Code | HTTP | Meaning |
|---|---|---|
| `INVOICE_NOT_FOUND` | 404 | no invoice for order/id |
| `INVOICE_ALREADY_ISSUED` | 409 | idempotency guard (returns existing) |
| `EMAIL_INVALID` | 422 | supplied email failed validation |
| `MAIL_PROVIDER_FAILED` | 502 | SMTP send failed (invoice still valid, resend allowed) |

## 6. Testing

- Unit: `SelfGeneratedInvoiceProvider` computes VAT/total correctly and returns a
  non-empty PDF; sequential invoice number is unique under concurrency.
- Unit: `InvoicesService.ensureInvoice` idempotent (second call returns existing).
- Unit: email-absent path leaves `emailSentAt` null and issues the invoice.
- Contract: OpenAPI covers invoice endpoints.
- Mobile: order-detail invoice action + email prompt covered.

## 7. Environment

New variables (added to `env.schema.ts`):

| Variable | Values | Default | Required |
|---|---|---|---|
| `INVOICE_PROVIDER` | `self` \| `einvoice` | `self` | no |
| `MAIL_PROVIDER` | `console` \| `smtp` | `console` | no |
| `ALLOW_CONSOLE_MAIL_PROVIDER` | `true` \| `false` | `false` | only when `MAIL_PROVIDER=console` in prod |
| `SMTP_HOST` | hostname | — | when `MAIL_PROVIDER=smtp` |
| `SMTP_PORT` | int | `587` | no |
| `SMTP_USER` | string | — | when `MAIL_PROVIDER=smtp` |
| `SMTP_PASS` | string | — | when `MAIL_PROVIDER=smtp` |
| `SMTP_SECURE` | `true` \| `false` | `false` | no |
| `MAIL_FROM` | email | — | when `MAIL_PROVIDER=smtp` |

For local development, `MAIL_PROVIDER=console` is sufficient (links are logged).
For real email, set `MAIL_PROVIDER=smtp` and the `SMTP_*` + `MAIL_FROM` values.
