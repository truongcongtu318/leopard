# Driver Earnings & Withdrawal (Wallet) — Design Spec

**Date:** 2026-09-13
**Status:** Awaiting review
**Scope:** Backend (NestJS) + driver mobile (Expo) + admin web (Next.js) — replaces the fully mock `DriverEarningsScreen` with a real, pilot-appropriate payout/withdrawal flow.

## 1. Purpose

`apps/driver/src/features/earnings/DriverEarningsScreen.tsx` currently renders 100% invented data: a 10% platform-fee breakdown, tip/bonus amounts, an hourly rate, an OTD (on-time-delivery) rate, a star rating, a wallet balance, and a "Rút tiền 24/7" (24/7 instant withdrawal) flow that fakes a bank transfer with a `setTimeout`. None of this is backed by any domain model — there is no payout, commission, wallet, tip, bonus, or rating concept anywhere in `apps/api/prisma/schema.prisma`.

This spec defines the smallest real domain model and flow that:
1. Shows the driver their actual completed-order revenue (no invented commission split).
2. Lets a driver request a withdrawal.
3. Lets an admin manually approve/reject it — consistent with the project's stated pilot constraint that **automated bank reconciliation is out of scope** (`CLAUDE.md` → Out of Scope), and consistent with the existing manual-confirmation pattern already used for `PaymentIntent` (`PaymentsService.confirmPayment`).

## 2. Non-goals

- No commission/platform-fee split — driver payout equals 100% of `Order.priceVnd` for their `DELIVERED` orders this pilot. (User decision.)
- No tip or bonus concept — removed from the UI entirely rather than shown as fake zeros. (User decision.)
- No automated bank transfer, no payment-provider payout API, no bank reconciliation.
- No online-hours tracking, on-time-delivery rate, or star-rating system — these KPI tiles are kept in the UI but rendered as an explicit "Sắp ra mắt" (coming soon) placeholder rather than fabricated numbers. (User decision.) Building the underlying attendance/rating systems is separate future work, not part of this spec.
- No persisted wallet-balance ledger — balance is computed on demand from `Order` + `WithdrawalRequest`, not materialized. (User decision — appropriate at pilot volume; a ledger table is a clean future upgrade if/when reconciliation performance requires it.)
- No customer-facing changes.

## 3. Current state (context)

- `Order.priceVnd` (int, nullable) already exists and is the settled price for a completed order.
- `apps/api/src/orders/orders.repository.ts` already has `findDriverOrderHistory(driverId, page, pageSize)` (added in the prior session) returning the driver's terminal-status orders — this spec's balance calculation reuses the same `DELIVERED`-filtered query shape rather than duplicating it.
- `PaymentsService.confirmPayment` (`apps/api/src/payments/payments.service.ts:94`) is the pattern to mirror for admin-side manual confirmation: role check, note validation (5–500 chars), idempotency via `clientRequestId`, a status-transition guard, and a DB transaction.
- The admin web app (`apps/admin`) already has list/detail pages for orders and users (e.g. `apps/admin/src/app/(admin)/admin/users/page.tsx`) whose table + action-button pattern this spec's withdrawal review page follows.
- `apps/driver/src/features/history/` (adapter + Runtime + Screen split, added in the prior session) is the direct structural template for this feature's driver-side code.

## 4. Design

### 4.1 Data model

New enum + model in `apps/api/prisma/schema.prisma`:

```prisma
enum WithdrawalStatus {
  PENDING
  APPROVED
  REJECTED
}

model WithdrawalRequest {
  id                String            @id @default(uuid()) @db.Uuid
  driverId          String            @db.Uuid
  amountVnd         Int
  status            WithdrawalStatus  @default(PENDING)
  bankName          String?           @db.VarChar(120)
  bankAccountNumber String?           @db.VarChar(32)
  bankAccountName   String?           @db.VarChar(120)
  clientRequestId   String?
  reviewedById      String?           @db.Uuid
  reviewedAt        DateTime?         @db.Timestamptz(3)
  reviewNote        String?
  createdAt         DateTime          @default(now()) @db.Timestamptz(3)
  updatedAt         DateTime          @default(now()) @updatedAt @db.Timestamptz(3)
  driver            User              @relation("DriverWithdrawals", fields: [driverId], references: [id], onDelete: Restrict)
  reviewedBy        User?             @relation("WithdrawalReviewer", fields: [reviewedById], references: [id], onDelete: Restrict)

  @@index([driverId, createdAt(sort: Desc)])
  @@index([status, createdAt(sort: Desc)])
}
```

`User` gains the two inverse relations (`withdrawalRequests WithdrawalRequest[] @relation("DriverWithdrawals")`, `reviewedWithdrawals WithdrawalRequest[] @relation("WithdrawalReviewer")`), following the exact pattern of the existing `confirmedPayments`/`PaymentConfirmer` pair.

`amountVnd` is a request snapshot, not a running ledger entry — no other schema changes. `bankName`/`bankAccountNumber`/`bankAccountName` are captured per-request (a driver could change bank details between requests); there is no separate "linked bank account" model in this pilot.

### 4.2 Wallet balance — computed, not stored

```
availableBalanceVnd =
    SUM(priceVnd) over the driver's DELIVERED orders
  − SUM(amountVnd) over the driver's WithdrawalRequest rows with status IN (PENDING, APPROVED)
```

`PENDING` is included in the subtraction (not just `APPROVED`) so a driver cannot submit two withdrawal requests that together exceed their real balance while the first is still awaiting admin review. A `REJECTED` request releases its amount back (excluded from the sum).

This is a single new repository method, `DriversRepository.getWalletSummary(driverId)`, implemented as two aggregate queries (`prisma.order.aggregate` with `_sum: { priceVnd: true }`, `prisma.withdrawalRequest.aggregate` with a `status: { in: [...] }` filter) — no raw SQL needed, unlike the geo-distance work from the prior session.

### 4.3 Backend API

All driver routes under the existing `@Controller('driver')` in `drivers.controller.ts`, guarded by the existing `RequireRoles('DRIVER')` pattern.

**`GET /driver/wallet`** — returns:
```json
{
  "availableBalanceVnd": 1450000,
  "lifetimeDeliveredVnd": 18450000,
  "pendingWithdrawalVnd": 300000,
  "deliveredOrderCount": 128
}
```

**`POST /driver/wallet/withdrawals`** — body `{ amountVnd, bankName, bankAccountNumber, bankAccountName, clientRequestId }`. Validates:
- `amountVnd > 0` and `amountVnd <= availableBalanceVnd` at request time (re-checked inside the transaction to close the race between two concurrent requests) → `422 WITHDRAWAL_AMOUNT_INVALID` / `409 INSUFFICIENT_BALANCE`.
- `clientRequestId` idempotency: replay with the same id returns the existing request rather than creating a duplicate (mirrors `PaymentsService.confirmPayment`'s `findByConfirmationRequestId` check).
- Bank fields required (non-empty) — `422 VALIDATION_ERROR` otherwise.

**`GET /driver/wallet/withdrawals`** — paginated list of the driver's own requests (for a simple "Lịch sử rút tiền" list), reusing the `page`/`pageSize` query-param parsing already established in `drivers.controller.ts`.

Admin routes, new `apps/api/src/admin/withdrawals/` sub-module (mirrors the existing `apps/admin` module boundary conventions) registered under the existing admin controller area:

**`GET /admin/withdrawals?status=PENDING`** — paginated list across all drivers, for the review queue.

**`POST /admin/withdrawals/:id/approve`** and **`POST /admin/withdrawals/:id/reject`** — body `{ note, clientRequestId }`. Both require `ADMIN` role, both validate `note` 5–500 chars (identical rule to `confirmPayment`), both are idempotent via `clientRequestId`, both run inside a transaction that re-checks `status === 'PENDING'` (`409 WITHDRAWAL_ALREADY_REVIEWED` otherwise) and writes `reviewedById`/`reviewedAt`/`reviewNote`. Approve does not move real money — it is the admin's record that they completed the transfer manually outside the system; reject releases the held amount back to the driver's computed balance.

An `AuditLog` row (`action: 'WITHDRAWAL_APPROVED' | 'WITHDRAWAL_REJECTED'`) is written for both, matching the existing `ORDER_CANCELLED_BY_ADMIN` / incident-report audit trail pattern from the prior session.

### 4.4 Driver mobile app

New `apps/driver/src/features/wallet/` module (separate from the pre-existing `apps/driver/src/features/wallet/bank-accounts.test.tsx`/`DriverWalletScreen.tsx` files that already exist in the repo — **implementation must first read those existing files**, since a wallet screen and bank-accounts concept may already be partially wired; this spec assumes they are presentational/mock like `DriverEarningsScreen` was, but that must be confirmed, not assumed, before writing the plan's tasks in detail):

Confirmed by reading the existing code (not assumed): `DriverWalletScreen.tsx` and `DriverBankAccountsScreen.tsx` already exist and are **fully mock** — same situation as `DriverEarningsScreen` was — local `useState` balance, hardcoded linked bank accounts, a fake "60s instant transfer" claim, `setTimeout`-based fake success. `DriverWalletScreen` already has the right shape for this feature (balance card, withdraw modal, transaction history with `EARNING`/`WITHDRAWAL`/`BONUS` types) — this spec **rewires that existing screen** rather than building new UI inside Earnings, since `DriverEarningsScreen`'s wallet box already does `router.push('/driver/wallet')`.

**`DriverBankAccountsScreen.tsx` (saved/linked bank accounts) is out of scope for this pilot** — a persisted "saved bank account" model is a second, independent domain decision the user hasn't made, and isn't needed for the core request→approve flow. The withdrawal request form collects bank name / account number / account holder inline, each time. (A future spec can add saved accounts as a pure UX convenience once the core flow is validated.) Whether the now-unused `DriverBankAccountsScreen.tsx` route is left as-is or removed is a planning-time call, not a blocker.

New `apps/driver/src/features/wallet/adapter.ts` (no adapter exists yet — only the two mock screen files do):
- `getWalletSummary()` → `GET /driver/wallet`.
- `requestWithdrawal(input)` → `POST /driver/wallet/withdrawals`, following the `createDriverHistoryHttpAdapter` shape (client-injectable, `require('@leopard/mobile-core')` default).
- `getWithdrawalHistory()` → `GET /driver/wallet/withdrawals`, mapped into the existing `DriverTransaction` shape (`WITHDRAWAL` rows); `EARNING` rows come from delivered-order data — exact merge strategy is a planning-time detail, not a product decision.

New `DriverWalletRuntime.tsx` — fetches via React Query, owns the withdrawal-request mutation and its pending/error state, passes real props into the rewritten `DriverWalletScreen`.

Rewritten `DriverWalletScreen.tsx` (presentational, props-driven like `DriverHistoryScreen.tsx`):
- Balance card: real `availableBalanceVnd`; drop the fake "Rút tiền tức thì 24/7 (về tài khoản trong 60s)" and "Hạn mức rút 24/7" claims — replace with honest copy such as "Yêu cầu rút tiền — Admin xác nhận trong giờ hành chính".
- Remove the bank-account selector (no saved accounts, per above) — the withdraw modal collects bank name / number / holder name as plain text inputs instead.
- Transaction history: `EARNING` rows from delivered orders, `WITHDRAWAL` rows from `WithdrawalRequest` with `statusLabel` reflecting `PENDING`/`APPROVED`/`REJECTED` (not always "Thành công"); **no `BONUS` rows** (removed, no such concept — see §2).
- Withdraw modal: on submit, shows "Đã gửi yêu cầu, chờ admin duyệt" rather than the fake success animation; remove the "Phí rút tiền: 0đ (Miễn phí)" line (no fee model to claim zero of).

Rewritten `DriverEarningsScreen.tsx` (presentational, props-driven, navigation to `/driver/wallet` unchanged):
- Financial card: real `Cước ròng` = lifetime delivered revenue (no fee breakdown rows — those implied a commission that doesn't exist).
- KPI grid: "Tổng chuyến" and "Tỷ lệ giao thành công" wired the same way as `DriverHistoryScreen` (real, from wallet/history data); "Giờ trực tuyến", "OTD", "Đánh giá" rendered as a muted "Sắp ra mắt" chip, not a number.
- Trip feed section: reuse `DriverHistoryScreen`'s already-real data rather than maintaining a second parallel list — the plan should evaluate linking to History instead of duplicating the list (YAGNI check during planning, not decided here).

### 4.5 Admin web app

New page under `apps/admin/src/app/(admin)/admin/withdrawals/` (mirrors `admin/users`'s existing route+page+model structure): a table of `PENDING` requests (driver name/phone, amount, bank details, requested-at) with Approve/Reject row actions opening a small note-entry dialog, matching whatever confirm-dialog component the existing payment-confirmation admin UI already uses (implementation must locate and reuse it, not build a new one).

### 4.6 Error handling

| Code | HTTP | When |
|---|---|---|
| `WITHDRAWAL_AMOUNT_INVALID` | 422 | `amountVnd <= 0` |
| `INSUFFICIENT_BALANCE` | 409 | `amountVnd` exceeds computed available balance (checked twice: pre-transaction and inside it) |
| `VALIDATION_ERROR` | 422 | missing/empty bank fields, or admin note outside 5–500 chars |
| `WITHDRAWAL_ALREADY_REVIEWED` | 409 | approve/reject called on a request no longer `PENDING` |
| `RESOURCE_NOT_FOUND` | 404 | withdrawal id doesn't exist, or belongs to a different driver (driver-side GET-by-id, if added) |
| `FORBIDDEN` | 403 | non-admin hitting admin routes, or a driver hitting another driver's data |

### 4.7 Testing

- Backend: unit tests for the balance-computation repository method (delivered sum, pending/approved subtraction, rejected exclusion); integration tests for the full request → approve and request → reject flows (mirroring `report-order-incident.integration-spec.ts`'s structure), the insufficient-balance rejection, the idempotent-replay case, and the concurrent-double-request race (two requests summing over balance, second one rejected).
- Driver mobile: adapter test (mirrors `history/adapter.test.ts`), Runtime test for the withdrawal mutation's pending/error states, Screen test for the "Sắp ra mắt" KPI placeholders and the request-form validation.
- Admin web: page test for the approve/reject actions and the idempotency-safe double-click guard.

## 5. Open items for the implementation plan (not decided here)

- Exact reuse-vs-duplicate call on the Earnings trip list vs. History screen (§4.4).
- Exact admin confirm-dialog component to reuse in §4.5 — must be located before task breakdown.
- Whether to delete the now-fully-superseded `DriverBankAccountsScreen.tsx`/`bank-accounts.test.tsx` or leave them unrouted (§4.4).

These are implementation-detail questions properly resolved by reading code during planning, not product decisions — flagged here so the plan's author checks them rather than assuming.
