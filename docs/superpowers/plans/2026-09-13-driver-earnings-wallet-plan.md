# Driver Earnings & Withdrawal (Wallet) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fully-mock `DriverEarningsScreen`/`DriverWalletScreen` with a real payout view (100% of delivered-order revenue, no invented commission) and a real driver-requests/admin-approves withdrawal flow — no automated bank transfer, matching the pilot's explicit "no automated bank reconciliation" constraint.

**Architecture:** New `WithdrawalRequest` Prisma model; wallet balance is computed on demand (`SUM(delivered order priceVnd) − SUM(pending+approved withdrawal amountVnd)`), never persisted as a running ledger. Driver-facing endpoints on the existing `DriversController`; admin review on the existing `AdminController`, mirroring `AdminDriverReviewService`'s approve/reject shape exactly. Driver mobile gets a new `wallet/adapter.ts` + `DriverWalletRuntime.tsx`, and both `DriverWalletScreen.tsx` and `DriverEarningsScreen.tsx` become presentational (props-driven), matching the `DriverHistoryScreen` split done in the prior session. Admin web gets one new screen mirroring `DriverApplicationsScreen.tsx`.

**Tech Stack:** NestJS + Prisma/PostgreSQL (`apps/api`), Expo/React Native + TanStack Query (`apps/driver`), Next.js App Router (`apps/admin`), Jest for all three.

**Spec:** [docs/superpowers/specs/2026-09-13-driver-earnings-wallet-design.md](../specs/2026-09-13-driver-earnings-wallet-design.md)

## Global Constraints

- Driver payout = 100% of `Order.priceVnd` for their `DELIVERED` orders. No commission/platform-fee field or calculation anywhere.
- No tip, no bonus — remove those UI elements entirely, don't render them as zero.
- No automated bank transfer — every withdrawal is `PENDING` until an admin manually calls approve/reject; approving does not move real money, it records that the admin already transferred it manually outside the system.
- Wallet balance is **computed**, never stored. No `WalletBalance`/ledger table.
- The three "coming soon" KPI tiles (Giờ trực tuyến / OTD / Đánh giá) render a muted placeholder chip, never a fabricated number.
- `DriverBankAccountsScreen.tsx` and its "saved bank accounts" concept are out of scope — the withdrawal form takes bank name/number/holder as plain text inputs each time.
- Every new admin/driver mutation route needs role guard (`RequireRoles('ADMIN')` / `RequireRoles('DRIVER')`), a `clientRequestId` on the DTO, and an `AuditLog` entry on state changes — matching `AdminDriverReviewService`'s existing approve/reject pattern exactly (state-guard idempotency: a replay after the first success re-hits the now-changed state and returns the appropriate 409, it does not silently return the prior result — this project uses that style for admin commands, distinct from the driver-facing `clientRequestId`-lookup style used in `PaymentsService.confirmPayment`).

---

## File Structure

| File | Purpose |
|---|---|
| `apps/api/prisma/schema.prisma` [MODIFY] | `WithdrawalStatus` enum, `WithdrawalRequest` model, `User` inverse relations |
| `packages/shared/src/domain/withdrawal/withdrawal-status.ts` [NEW] | `WithdrawalStatus` literal-union, mirrors `payment-status.ts` |
| `packages/shared/src/domain/index.ts` [MODIFY] | export the new module |
| `packages/shared/src/contracts.test.ts` [MODIFY] | add `WithdrawalStatus` to the canonical-enum-values assertion |
| `apps/api/test/prisma-mock.ts` [MODIFY] | add `withdrawalRequests` Map + `prisma.withdrawalRequest` CRUD mock |
| `apps/api/src/drivers/withdrawals.repository.ts` [NEW] | `getWalletSummary`, `createWithdrawalRequest`, `findWithdrawalRequestByClientRequestId`, `findDriverWithdrawalHistory`, `findPendingWithdrawal(id)` |
| `apps/api/src/drivers/withdrawals.repository.spec.ts` [NEW] | unit tests for the above |
| `apps/api/src/drivers/dto/request-withdrawal.dto.ts` [NEW] | `RequestWithdrawalDto` |
| `apps/api/src/drivers/drivers.service.ts` [MODIFY] | `getWalletSummary`, `requestWithdrawal`, `getWithdrawalHistory` |
| `apps/api/src/drivers/drivers.controller.ts` [MODIFY] | `GET /driver/wallet`, `POST /driver/wallet/withdrawals`, `GET /driver/wallet/withdrawals` |
| `apps/api/src/drivers/drivers.module.ts` [MODIFY] | register `WithdrawalsRepository` |
| `apps/api/src/drivers/wallet.e2e-spec.ts` [NEW] | integration tests for the three driver routes |
| `apps/api/src/admin/dto/review-withdrawal.dto.ts` [NEW] | `ReviewWithdrawalDto` (note + clientRequestId) |
| `apps/api/src/admin/admin-withdrawal-review.service.ts` [NEW] | `listPending`, `approve`, `reject` — mirrors `admin-driver-review.service.ts` |
| `apps/api/src/admin/admin-withdrawal-review.service.spec.ts` [NEW] | unit tests |
| `apps/api/src/admin/admin.controller.ts` [MODIFY] | `GET /admin/withdrawals`, `POST /admin/withdrawals/:id/approve`, `POST /admin/withdrawals/:id/reject` |
| `apps/api/src/admin/admin.module.ts` [MODIFY] | register `AdminWithdrawalReviewService` |
| `apps/driver/src/features/wallet/adapter.ts` [NEW] | `getWalletSummary`, `requestWithdrawal`, `getWithdrawalHistory` |
| `apps/driver/src/features/wallet/adapter.test.ts` [NEW] | unit tests |
| `apps/driver/src/features/wallet/DriverWalletRuntime.tsx` [NEW] | React Query wiring + withdrawal mutation |
| `apps/driver/src/features/wallet/DriverWalletScreen.tsx` [MODIFY→rewrite] | presentational, props-driven |
| `apps/driver/src/features/wallet/DriverWalletScreen.test.tsx` [MODIFY→rewrite] | fixture-driven tests |
| `apps/driver/app/wallet.tsx` (or wherever the route lives — confirm path in Task 8) [MODIFY] | render `DriverWalletRuntime` instead of `DriverWalletScreen` |
| `apps/driver/src/features/earnings/DriverEarningsRuntime.tsx` [NEW] | React Query wiring |
| `apps/driver/src/features/earnings/DriverEarningsScreen.tsx` [MODIFY→rewrite] | presentational, props-driven, no fee/tip/bonus |
| `apps/driver/src/features/earnings/DriverEarningsScreen.test.tsx` [MODIFY→rewrite] | fixture-driven tests |
| `apps/driver/app/earnings.tsx` (confirm path in Task 9) [MODIFY] | render `DriverEarningsRuntime` |
| `apps/admin/src/lib/api/browser-client.ts` | (read-only reference — existing) |
| `apps/admin/src/features/admin/WithdrawalsScreen.tsx` [NEW] | mirrors `DriverApplicationsScreen.tsx` |
| `apps/admin/src/features/admin/WithdrawalsScreen.test.tsx` [NEW] | unit tests |
| `apps/admin/src/app/(admin)/admin/withdrawals/page.tsx` [NEW] | route, mirrors `driver-applications/page.tsx` |

---

## Task 1: Prisma schema + shared enum

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `packages/shared/src/domain/withdrawal/withdrawal-status.ts`
- Modify: `packages/shared/src/domain/index.ts`
- Modify: `packages/shared/src/contracts.test.ts`

**Interfaces:**
- Produces: Prisma model `WithdrawalRequest` with fields `id, driverId, amountVnd, status, bankName, bankAccountNumber, bankAccountName, clientRequestId, reviewedById, reviewedAt, reviewNote, createdAt, updatedAt`; enum `WithdrawalStatus = PENDING | APPROVED | REJECTED`. Shared package export `WithdrawalStatus: readonly ['PENDING', 'APPROVED', 'REJECTED']` + matching type.

- [ ] **Step 1: Add the enum and model to the Prisma schema**

Open `apps/api/prisma/schema.prisma`, find the `AuditLog` model (search for `model AuditLog`), and insert this immediately after its closing brace:

```prisma
enum WithdrawalStatus {
  PENDING
  APPROVED
  REJECTED
}

model WithdrawalRequest {
  id                String           @id @default(uuid()) @db.Uuid
  driverId          String           @db.Uuid
  amountVnd         Int
  status            WithdrawalStatus @default(PENDING)
  bankName          String?          @db.VarChar(120)
  bankAccountNumber String?          @db.VarChar(32)
  bankAccountName   String?          @db.VarChar(120)
  clientRequestId   String?
  reviewedById      String?          @db.Uuid
  reviewedAt        DateTime?        @db.Timestamptz(3)
  reviewNote        String?
  createdAt         DateTime         @default(now()) @db.Timestamptz(3)
  updatedAt         DateTime         @default(now()) @updatedAt @db.Timestamptz(3)
  driver            User             @relation("DriverWithdrawals", fields: [driverId], references: [id], onDelete: Restrict)
  reviewedBy        User?            @relation("WithdrawalReviewer", fields: [reviewedById], references: [id], onDelete: Restrict)

  @@index([driverId, createdAt(sort: Desc)])
  @@index([status, createdAt(sort: Desc)])
}
```

Then find the `User` model's relations block (search for `confirmedPayments     PaymentIntent[]`) and add two lines right after it, keeping the existing alignment style:

```prisma
  withdrawalRequests  WithdrawalRequest[]  @relation("DriverWithdrawals")
  reviewedWithdrawals WithdrawalRequest[]  @relation("WithdrawalReviewer")
```

- [ ] **Step 2: Generate the Prisma client (no DB connection required)**

Run: `pnpm --filter api prisma:generate`
Expected: succeeds, regenerates `@prisma/client` types to include `WithdrawalRequest`/`WithdrawalStatus`. If this environment has no reachable Postgres for `prisma migrate dev`, that's fine for this step — `generate` only reads the schema file.

- [ ] **Step 3: Create the migration (requires a reachable dev database)**

Run: `pnpm --filter api exec prisma migrate dev --name add_withdrawal_request --schema prisma/schema.prisma`
Expected: a new folder under `apps/api/prisma/migrations/` containing the `CREATE TYPE "WithdrawalStatus"` / `CREATE TABLE "WithdrawalRequest"` SQL. If no dev database is reachable in this environment, note that explicitly to the user and continue — later tasks that only touch `InMemoryPrismaService` don't need a live DB, only the final `pnpm db:migrate:test` gate does.

- [ ] **Step 4: Add the shared literal-union enum**

```ts
// packages/shared/src/domain/withdrawal/withdrawal-status.ts
export const WithdrawalStatus = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type WithdrawalStatus = (typeof WithdrawalStatus)[number];
```

- [ ] **Step 5: Export it from the domain barrel**

```ts
// packages/shared/src/domain/index.ts
export * from './order/order-status.js';
export * from './order/order-state-machine.js';
export * from './order/order.constants.js';
export * from './payment/payment-status.js';
export * from './user/user-role.js';
export * from './vehicle/vehicle-type.js';
export * from './withdrawal/withdrawal-status.js';
```

- [ ] **Step 6: Add the failing contract-drift assertion**

In `packages/shared/src/contracts.test.ts`, add `WithdrawalStatus` to the import list and to both the destructured object and its expected value:

```ts
import {
  DriverAvailability,
  FleetMemberRole,
  FleetMemberStatus,
  MediaType,
  OrderStatus,
  parsePageQuery,
  PaymentStatus,
  ProviderSource,
  Role,
  StopType,
  UserStatus,
  VehicleType,
  WithdrawalStatus,
} from './index.js';
```

```ts
    expect({
      Role,
      UserStatus,
      FleetMemberRole,
      FleetMemberStatus,
      DriverAvailability,
      OrderStatus,
      StopType,
      MediaType,
      PaymentStatus,
      ProviderSource,
      VehicleType,
      WithdrawalStatus,
    }).toEqual({
      Role: ['CUSTOMER', 'DRIVER', 'FLEET_OWNER', 'ADMIN'],
      UserStatus: ['ACTIVE', 'DISABLED'],
      FleetMemberRole: ['OWNER', 'DRIVER'],
      FleetMemberStatus: ['INVITED', 'ACTIVE', 'REMOVED'],
      DriverAvailability: ['OFFLINE', 'AVAILABLE', 'BUSY'],
      OrderStatus: [
        'REQUESTED',
        'ACCEPTED',
        'PICKING_UP',
        'IN_TRANSIT',
        'DELIVERED',
        'CANCELLED',
        'INCIDENT_CANCELLED',
        'RETURNING',
        'RETURNED',
      ],
      StopType: ['PICKUP', 'STOP', 'DROPOFF'],
      MediaType: ['CARGO', 'DELIVERY_PROOF'],
      PaymentStatus: ['UNPAID', 'QR_CREATED', 'PAID_MANUAL', 'FAILED'],
      ProviderSource: ['VIETMAP', 'DEMO', 'PAYOS', 'VIETQR', 'LOCAL', 'S3'],
      VehicleType: ['MOTORBIKE', 'VAN', 'TRUCK'],
      WithdrawalStatus: ['PENDING', 'APPROVED', 'REJECTED'],
    });
```

- [ ] **Step 7: Run the shared package tests**

Run: `pnpm --filter @leopard/shared test`
Expected: PASS, including the updated `contracts.test.ts`.

- [ ] **Step 8: Commit**

```bash
git add apps/api/prisma/schema.prisma packages/shared/src/domain/withdrawal/withdrawal-status.ts packages/shared/src/domain/index.ts packages/shared/src/contracts.test.ts apps/api/prisma/migrations
git commit -m "feat(api): add WithdrawalRequest model and shared WithdrawalStatus enum"
```

---

## Task 2: In-memory Prisma mock support for `withdrawalRequest`

**Files:**
- Modify: `apps/api/test/prisma-mock.ts`

**Interfaces:**
- Consumes: `WithdrawalRequest`, `WithdrawalStatus` types from `@prisma/client` (available after Task 1's `prisma generate`).
- Produces: `InMemoryPrismaService.withdrawalRequests: Map<string, WithdrawalRequest>`, and `prisma.withdrawalRequest.{create, findUnique, findFirst, findMany, update}` — later tasks' unit/integration tests depend on this.

- [ ] **Step 1: Add the backing Map**

In `apps/api/test/prisma-mock.ts`, add the import and the Map field next to the other ones:

```ts
import type {
  Order,
  OrderStop,
  OrderStatusHistory,
  PaymentIntent,
  User,
  DriverProfile,
  RefreshSession,
  DriverAvailability,
  OrderStatus,
  Role,
  FleetMember,
  AuditLog,
  Notification,
  DeviceToken,
  Invoice,
  InvoiceSequence,
  WithdrawalRequest,
  WithdrawalStatus,
} from '@prisma/client';
```

```ts
  public withdrawalRequests = new Map<string, WithdrawalRequest>();
```

- [ ] **Step 2: Add the `withdrawalRequest` model mock**

Add this as a new class field, following the exact placement/style convention of `orderStatusHistory` (search for `orderStatusHistory = {` and add this block right after that object's closing `};`):

```ts
  withdrawalRequest = {
    create: jest.fn(async ({ data }: { data: any }) => {
      const id = data.id ?? `wr-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const request: WithdrawalRequest = {
        id,
        driverId: data.driverId,
        amountVnd: data.amountVnd,
        status: (data.status ?? 'PENDING') as WithdrawalStatus,
        bankName: data.bankName ?? null,
        bankAccountNumber: data.bankAccountNumber ?? null,
        bankAccountName: data.bankAccountName ?? null,
        clientRequestId: data.clientRequestId ?? null,
        reviewedById: data.reviewedById ?? null,
        reviewedAt: data.reviewedAt ?? null,
        reviewNote: data.reviewNote ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.withdrawalRequests.set(id, request);
      return request;
    }),
    findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
      return this.withdrawalRequests.get(where.id) ?? null;
    }),
    findFirst: jest.fn(async ({ where }: { where?: any }) => {
      let list = Array.from(this.withdrawalRequests.values());
      if (where?.driverId) list = list.filter((r) => r.driverId === where.driverId);
      if (where?.clientRequestId) list = list.filter((r) => r.clientRequestId === where.clientRequestId);
      if (where?.status) {
        if (typeof where.status === 'string') list = list.filter((r) => r.status === where.status);
        else if (where.status.in) list = list.filter((r) => where.status.in.includes(r.status));
      }
      list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return list[0] ?? null;
    }),
    findMany: jest.fn(async ({ where, skip = 0, take }: { where?: any; skip?: number; take?: number } = {}) => {
      let list = Array.from(this.withdrawalRequests.values());
      if (where?.driverId) list = list.filter((r) => r.driverId === where.driverId);
      if (where?.status) {
        if (typeof where.status === 'string') list = list.filter((r) => r.status === where.status);
        else if (where.status.in) list = list.filter((r) => where.status.in.includes(r.status));
      }
      list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const sliced = take !== undefined ? list.slice(skip, skip + take) : list.slice(skip);
      return sliced;
    }),
    update: jest.fn(async ({ where, data }: { where: { id: string }; data: Partial<WithdrawalRequest> }) => {
      const existing = this.withdrawalRequests.get(where.id);
      if (!existing) throw new Error('WithdrawalRequest not found');
      const updated = { ...existing, ...data, updatedAt: new Date() } as WithdrawalRequest;
      this.withdrawalRequests.set(where.id, updated);
      return updated;
    }),
    count: jest.fn(async ({ where }: { where?: any } = {}) => {
      let list = Array.from(this.withdrawalRequests.values());
      if (where?.driverId) list = list.filter((r) => r.driverId === where.driverId);
      if (where?.status) {
        if (typeof where.status === 'string') list = list.filter((r) => r.status === where.status);
        else if (where.status.in) list = list.filter((r) => where.status.in.includes(r.status));
      }
      return list.length;
    }),
  };
```

- [ ] **Step 3: Run the full unit suite to confirm nothing broke**

Run: `pnpm --filter api test`
Expected: PASS, same count as before this task (this step only adds new mock surface, nothing existing calls it yet).

- [ ] **Step 4: Commit**

```bash
git add apps/api/test/prisma-mock.ts
git commit -m "test(api): add InMemoryPrismaService support for WithdrawalRequest"
```

---

## Task 3: `WithdrawalsRepository` — balance calculation + CRUD

**Files:**
- Create: `apps/api/src/drivers/withdrawals.repository.ts`
- Create: `apps/api/src/drivers/withdrawals.repository.spec.ts`

**Interfaces:**
- Consumes: `PrismaService` (or `InMemoryPrismaService` in tests via constructor injection, same pattern as `DriversRepository`).
- Produces (used by Task 4):
  - `getWalletSummary(driverId: string): Promise<{ availableBalanceVnd: number; lifetimeDeliveredVnd: number; pendingWithdrawalVnd: number; deliveredOrderCount: number }>`
  - `createWithdrawalRequest(input: { driverId: string; amountVnd: number; bankName: string; bankAccountNumber: string; bankAccountName: string; clientRequestId?: string }): Promise<WithdrawalRequest>`
  - `findWithdrawalRequestByClientRequestId(driverId: string, clientRequestId: string): Promise<WithdrawalRequest | null>`
  - `findDriverWithdrawalHistory(driverId: string, page: number, pageSize: number): Promise<{ items: WithdrawalRequest[]; total: number; page: number; pageSize: number; totalPages: number }>`

- [ ] **Step 1: Write the failing tests**

```ts
// apps/api/src/drivers/withdrawals.repository.spec.ts
import { describe, expect, it } from '@jest/globals';
import { InMemoryPrismaService } from '../../test/prisma-mock.js';
import { WithdrawalsRepository } from './withdrawals.repository.js';

describe('WithdrawalsRepository', () => {
  async function setup() {
    const prisma = new InMemoryPrismaService();
    const repo = new WithdrawalsRepository(prisma as never);
    const driver = await prisma.user.create({ data: { phone: '+84900000001', role: 'DRIVER', status: 'ACTIVE' } });
    return { prisma, repo, driverId: driver.id };
  }

  it('sums only DELIVERED orders for the given driver into lifetimeDeliveredVnd', async () => {
    const { prisma, repo, driverId } = await setup();
    await prisma.order.create({ data: { customerId: 'c1', driverId, status: 'DELIVERED', priceVnd: 100000 } });
    await prisma.order.create({ data: { customerId: 'c2', driverId, status: 'DELIVERED', priceVnd: 50000 } });
    await prisma.order.create({ data: { customerId: 'c3', driverId, status: 'IN_TRANSIT', priceVnd: 999999 } });
    await prisma.order.create({ data: { customerId: 'c4', driverId: 'other-driver', status: 'DELIVERED', priceVnd: 777777 } });

    const summary = await repo.getWalletSummary(driverId);

    expect(summary.lifetimeDeliveredVnd).toBe(150000);
    expect(summary.deliveredOrderCount).toBe(2);
  });

  it('subtracts PENDING and APPROVED withdrawals (not REJECTED) from availableBalanceVnd', async () => {
    const { prisma, repo, driverId } = await setup();
    await prisma.order.create({ data: { customerId: 'c1', driverId, status: 'DELIVERED', priceVnd: 500000 } });
    await repo.createWithdrawalRequest({
      driverId,
      amountVnd: 100000,
      bankName: 'MB Bank',
      bankAccountNumber: '0987654321',
      bankAccountName: 'NGUYEN VAN A',
    });
    const approved = await repo.createWithdrawalRequest({
      driverId,
      amountVnd: 50000,
      bankName: 'MB Bank',
      bankAccountNumber: '0987654321',
      bankAccountName: 'NGUYEN VAN A',
    });
    await prisma.withdrawalRequest.update({ where: { id: approved.id }, data: { status: 'APPROVED' } });
    const rejected = await repo.createWithdrawalRequest({
      driverId,
      amountVnd: 200000,
      bankName: 'MB Bank',
      bankAccountNumber: '0987654321',
      bankAccountName: 'NGUYEN VAN A',
    });
    await prisma.withdrawalRequest.update({ where: { id: rejected.id }, data: { status: 'REJECTED' } });

    const summary = await repo.getWalletSummary(driverId);

    expect(summary.lifetimeDeliveredVnd).toBe(500000);
    expect(summary.pendingWithdrawalVnd).toBe(100000);
    expect(summary.availableBalanceVnd).toBe(350000); // 500000 - 100000 (pending) - 50000 (approved)
  });

  it('finds an existing request by clientRequestId for idempotent replay', async () => {
    const { repo, driverId } = await setup();
    const created = await repo.createWithdrawalRequest({
      driverId,
      amountVnd: 10000,
      bankName: 'MB Bank',
      bankAccountNumber: '111',
      bankAccountName: 'A',
      clientRequestId: 'req-1',
    });

    const found = await repo.findWithdrawalRequestByClientRequestId(driverId, 'req-1');

    expect(found?.id).toBe(created.id);
  });

  it('paginates a driver\'s withdrawal history, newest first', async () => {
    const { repo, driverId } = await setup();
    await repo.createWithdrawalRequest({ driverId, amountVnd: 1000, bankName: 'A', bankAccountNumber: '1', bankAccountName: 'A' });
    await repo.createWithdrawalRequest({ driverId, amountVnd: 2000, bankName: 'A', bankAccountNumber: '1', bankAccountName: 'A' });

    const page = await repo.findDriverWithdrawalHistory(driverId, 1, 20);

    expect(page.total).toBe(2);
    expect(page.items).toHaveLength(2);
    expect(page.items[0].amountVnd).toBe(2000); // most recently created first
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter api test -- src/drivers/withdrawals.repository.spec.ts`
Expected: FAIL — `withdrawals.repository.ts` doesn't exist yet.

- [ ] **Step 3: Implement**

```ts
// apps/api/src/drivers/withdrawals.repository.ts
import { Injectable } from '@nestjs/common';
import type { WithdrawalRequest } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';

export interface WalletSummary {
  readonly availableBalanceVnd: number;
  readonly lifetimeDeliveredVnd: number;
  readonly pendingWithdrawalVnd: number;
  readonly deliveredOrderCount: number;
}

export interface CreateWithdrawalRequestInput {
  readonly driverId: string;
  readonly amountVnd: number;
  readonly bankName: string;
  readonly bankAccountNumber: string;
  readonly bankAccountName: string;
  readonly clientRequestId?: string;
}

@Injectable()
export class WithdrawalsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getWalletSummary(driverId: string): Promise<WalletSummary> {
    const [deliveredOrders, heldWithdrawals] = await Promise.all([
      this.prisma.order.findMany({
        where: { driverId, status: 'DELIVERED' },
        select: { priceVnd: true },
      }),
      this.prisma.withdrawalRequest.findMany({
        where: { driverId, status: { in: ['PENDING', 'APPROVED'] } },
      }),
    ]);

    const lifetimeDeliveredVnd = deliveredOrders.reduce(
      (sum: number, o: { priceVnd: number | null }) => sum + (o.priceVnd ?? 0),
      0,
    );
    const pendingWithdrawalVnd = heldWithdrawals
      .filter((w: WithdrawalRequest) => w.status === 'PENDING')
      .reduce((sum: number, w: WithdrawalRequest) => sum + w.amountVnd, 0);
    const heldTotalVnd = heldWithdrawals.reduce(
      (sum: number, w: WithdrawalRequest) => sum + w.amountVnd,
      0,
    );

    return {
      availableBalanceVnd: lifetimeDeliveredVnd - heldTotalVnd,
      lifetimeDeliveredVnd,
      pendingWithdrawalVnd,
      deliveredOrderCount: deliveredOrders.length,
    };
  }

  createWithdrawalRequest(input: CreateWithdrawalRequestInput): Promise<WithdrawalRequest> {
    return this.prisma.withdrawalRequest.create({
      data: {
        driverId: input.driverId,
        amountVnd: input.amountVnd,
        bankName: input.bankName,
        bankAccountNumber: input.bankAccountNumber,
        bankAccountName: input.bankAccountName,
        clientRequestId: input.clientRequestId ?? null,
      },
    });
  }

  findWithdrawalRequestByClientRequestId(
    driverId: string,
    clientRequestId: string,
  ): Promise<WithdrawalRequest | null> {
    return this.prisma.withdrawalRequest.findFirst({ where: { driverId, clientRequestId } });
  }

  async findDriverWithdrawalHistory(
    driverId: string,
    page = 1,
    pageSize = 20,
  ): Promise<{ items: WithdrawalRequest[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      this.prisma.withdrawalRequest.findMany({ where: { driverId }, skip, take: pageSize }),
      this.prisma.withdrawalRequest.count({ where: { driverId } }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 0 };
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter api test -- src/drivers/withdrawals.repository.spec.ts`
Expected: PASS, all 4 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/drivers/withdrawals.repository.ts apps/api/src/drivers/withdrawals.repository.spec.ts
git commit -m "feat(api): add WithdrawalsRepository with computed wallet balance"
```

---

## Task 4: Driver-facing wallet service + routes

**Files:**
- Create: `apps/api/src/drivers/dto/request-withdrawal.dto.ts`
- Modify: `apps/api/src/drivers/drivers.service.ts`
- Modify: `apps/api/src/drivers/drivers.controller.ts`
- Modify: `apps/api/src/drivers/drivers.module.ts`
- Create: `apps/api/src/drivers/wallet.e2e-spec.ts`

**Interfaces:**
- Consumes: `WithdrawalsRepository` from Task 3.
- Produces: `DriversService.getWalletSummary(actor)`, `.requestWithdrawal(actor, dto)`, `.getWithdrawalHistory(actor, page, pageSize)`.

- [ ] **Step 1: Write the DTO**

```ts
// apps/api/src/drivers/dto/request-withdrawal.dto.ts
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class RequestWithdrawalDto {
  @IsInt()
  @IsPositive()
  amountVnd!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  bankName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  bankAccountNumber!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  bankAccountName!: string;

  @IsOptional()
  @IsString()
  clientRequestId?: string;
}
```

- [ ] **Step 2: Write the failing e2e test**

```ts
// apps/api/src/drivers/wallet.e2e-spec.ts
/// <reference types="jest" />

import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '../app.module.js';
import { ApiExceptionFilter } from '../common/api-exception.filter.js';
import { PrismaService } from '../database/prisma.service.js';
import { TokenService } from '../auth/token.service.js';
import { RefreshSessionRepository } from '../auth/refresh-session.repository.js';
import { InMemoryPrismaService } from '../../test/prisma-mock.js';

interface AuthSessionBody {
  readonly accessToken: string;
}

describe('Driver Wallet API (E2E)', () => {
  let app: INestApplication;
  let driverSession: AuthSessionBody;
  let driverUserId: string;
  let prismaMock: InMemoryPrismaService;

  beforeEach(async () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'test',
      AUTH_DEMO_LOGIN_ENABLED: 'true',
      AUTH_ACCESS_TOKEN_SECRET: 'test-access-token-secret',
      AUTH_REFRESH_TOKEN_SECRET: 'test-refresh-token-secret',
    };
    prismaMock = new InMemoryPrismaService();

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    app.useGlobalFilters(new ApiExceptionFilter());
    app.useGlobalPipes(new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }));
    await app.init();

    const tokenService = app.get(TokenService);
    const refreshSessions = app.get(RefreshSessionRepository);
    const driver = await prismaMock.user.create({ data: { phone: '+84911112222', role: 'DRIVER', status: 'ACTIVE' } });
    driverUserId = driver.id;
    await prismaMock.driverProfile.create({ data: { userId: driver.id, availability: 'OFFLINE', vehicleType: 'MOTORBIKE' } });
    const session = await refreshSessions.create(driver.id);
    driverSession = tokenService.createAuthSession(driver, session);
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  it('returns a zeroed wallet summary for a driver with no delivered orders', async () => {
    const res = await request(app.getHttpServer())
      .get('/driver/wallet')
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .expect(200);

    expect(res.body).toEqual({
      availableBalanceVnd: 0,
      lifetimeDeliveredVnd: 0,
      pendingWithdrawalVnd: 0,
      deliveredOrderCount: 0,
    });
  });

  it('reflects delivered-order revenue in the wallet summary', async () => {
    await prismaMock.order.create({
      data: { customerId: 'c1', driverId: driverUserId, status: 'DELIVERED', priceVnd: 250000 },
    });

    const res = await request(app.getHttpServer())
      .get('/driver/wallet')
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .expect(200);

    expect(res.body.availableBalanceVnd).toBe(250000);
    expect(res.body.deliveredOrderCount).toBe(1);
  });

  it('creates a withdrawal request and reflects it as pending in the wallet summary', async () => {
    await prismaMock.order.create({
      data: { customerId: 'c1', driverId: driverUserId, status: 'DELIVERED', priceVnd: 300000 },
    });

    const createRes = await request(app.getHttpServer())
      .post('/driver/wallet/withdrawals')
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .send({
        amountVnd: 100000,
        bankName: 'MB Bank',
        bankAccountNumber: '0987654321',
        bankAccountName: 'NGUYEN VAN A',
        clientRequestId: 'req-wd-1',
      })
      .expect(201);

    expect(createRes.body.status).toBe('PENDING');

    const summaryRes = await request(app.getHttpServer())
      .get('/driver/wallet')
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .expect(200);

    expect(summaryRes.body.availableBalanceVnd).toBe(200000);
    expect(summaryRes.body.pendingWithdrawalVnd).toBe(100000);
  });

  it('rejects a withdrawal request exceeding the available balance with 409', async () => {
    await prismaMock.order.create({
      data: { customerId: 'c1', driverId: driverUserId, status: 'DELIVERED', priceVnd: 50000 },
    });

    const res = await request(app.getHttpServer())
      .post('/driver/wallet/withdrawals')
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .send({
        amountVnd: 999999,
        bankName: 'MB Bank',
        bankAccountNumber: '0987654321',
        bankAccountName: 'NGUYEN VAN A',
        clientRequestId: 'req-wd-2',
      })
      .expect(409);

    expect(res.body.code).toBe('INSUFFICIENT_BALANCE');
  });

  it('replays the same withdrawal request idempotently via clientRequestId', async () => {
    await prismaMock.order.create({
      data: { customerId: 'c1', driverId: driverUserId, status: 'DELIVERED', priceVnd: 500000 },
    });
    const body = {
      amountVnd: 100000,
      bankName: 'MB Bank',
      bankAccountNumber: '0987654321',
      bankAccountName: 'NGUYEN VAN A',
      clientRequestId: 'req-wd-idempotent',
    };

    const first = await request(app.getHttpServer())
      .post('/driver/wallet/withdrawals')
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .send(body)
      .expect(201);

    const second = await request(app.getHttpServer())
      .post('/driver/wallet/withdrawals')
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .send(body)
      .expect(201);

    expect(second.body.id).toBe(first.body.id);

    const listRes = await request(app.getHttpServer())
      .get('/driver/wallet/withdrawals')
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .expect(200);
    expect(listRes.body.items).toHaveLength(1); // no duplicate created
  });

  it('rejects Customer access to driver wallet routes with 403', async () => {
    const customer = await prismaMock.user.create({ data: { phone: '+84933334444', role: 'CUSTOMER', status: 'ACTIVE' } });
    const tokenService = app.get(TokenService);
    const refreshSessions = app.get(RefreshSessionRepository);
    const session = await refreshSessions.create(customer.id);
    const customerSession = tokenService.createAuthSession(customer, session);

    await request(app.getHttpServer())
      .get('/driver/wallet')
      .set('Authorization', `Bearer ${customerSession.accessToken}`)
      .expect(403);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm --filter api exec jest --config jest-e2e.config.cjs wallet.e2e-spec`
Expected: FAIL — routes don't exist yet.

- [ ] **Step 4: Implement the service methods**

In `apps/api/src/drivers/drivers.service.ts`, add the import and constructor param:

```ts
import { WithdrawalsRepository } from './withdrawals.repository.js';
```

```ts
  constructor(
    private readonly driversRepository: DriversRepository,
    private readonly ordersRepository: OrdersRepository,
    private readonly withdrawalsRepository: WithdrawalsRepository,
    private readonly prisma: PrismaService,
  ) {}
```

Then add these methods (anywhere after the constructor, e.g. right after `getOrderHistory`):

```ts
  async getWalletSummary(actor: AuthenticatedActor) {
    return this.withdrawalsRepository.getWalletSummary(actor.userId);
  }

  async requestWithdrawal(actor: AuthenticatedActor, dto: RequestWithdrawalDto) {
    if (dto.clientRequestId) {
      const existing = await this.withdrawalsRepository.findWithdrawalRequestByClientRequestId(
        actor.userId,
        dto.clientRequestId,
      );
      if (existing) return existing;
    }

    const summary = await this.withdrawalsRepository.getWalletSummary(actor.userId);
    if (dto.amountVnd > summary.availableBalanceVnd) {
      throw new DomainError(
        'INSUFFICIENT_BALANCE',
        409,
        `Số dư khả dụng (${summary.availableBalanceVnd.toLocaleString('vi-VN')}đ) không đủ để rút ${dto.amountVnd.toLocaleString('vi-VN')}đ`,
      );
    }

    return this.withdrawalsRepository.createWithdrawalRequest({
      driverId: actor.userId,
      amountVnd: dto.amountVnd,
      bankName: dto.bankName,
      bankAccountNumber: dto.bankAccountNumber,
      bankAccountName: dto.bankAccountName,
      clientRequestId: dto.clientRequestId,
    });
  }

  async getWithdrawalHistory(actor: AuthenticatedActor, page = 1, pageSize = 20) {
    return this.withdrawalsRepository.findDriverWithdrawalHistory(actor.userId, page, pageSize);
  }
```

Add the `RequestWithdrawalDto` type import at the top of the file:

```ts
import type { RequestWithdrawalDto } from './dto/request-withdrawal.dto.js';
```

- [ ] **Step 5: Wire the controller routes**

In `apps/api/src/drivers/drivers.controller.ts`, add the import:

```ts
import { RequestWithdrawalDto } from './dto/request-withdrawal.dto.js';
```

Add these three routes after `getOrderHistory`:

```ts
  @Get('wallet')
  @RequireRoles('DRIVER')
  getWalletSummary(@CurrentUser() actor: AuthenticatedActor) {
    return this.driversService.getWalletSummary(actor);
  }

  @Post('wallet/withdrawals')
  @RequireRoles('DRIVER')
  @HttpCode(HttpStatus.CREATED)
  requestWithdrawal(
    @CurrentUser() actor: AuthenticatedActor,
    @Body() dto: RequestWithdrawalDto,
  ) {
    return this.driversService.requestWithdrawal(actor, dto);
  }

  @Get('wallet/withdrawals')
  @RequireRoles('DRIVER')
  getWithdrawalHistory(
    @CurrentUser() actor: AuthenticatedActor,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const limitNum = pageSize ? Math.max(1, Math.min(100, parseInt(pageSize, 10) || 20)) : 20;
    return this.driversService.getWithdrawalHistory(actor, pageNum, limitNum);
  }
```

- [ ] **Step 6: Register `WithdrawalsRepository` in the module**

In `apps/api/src/drivers/drivers.module.ts`, import and add `WithdrawalsRepository` to both `providers` and (if `DriversRepository` is already exported there) `exports`:

```ts
import { WithdrawalsRepository } from './withdrawals.repository.js';
```

Add `WithdrawalsRepository` next to `DriversRepository` in the `providers: [...]` array.

- [ ] **Step 7: Run to verify it passes**

Run: `pnpm --filter api exec jest --config jest-e2e.config.cjs wallet.e2e-spec`
Expected: PASS, all 6 tests.

- [ ] **Step 8: Run the full backend suite**

Run: `pnpm --filter api test && pnpm --filter api exec jest --config jest-e2e.config.cjs --forceExit --testPathIgnorePatterns=real-db`
Expected: PASS, no regressions (this second command is slow — several minutes — due to unrelated pre-existing suites in this environment; only confirm no NEW failures versus the baseline).

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/drivers
git commit -m "feat(api): add driver wallet endpoints (summary, request withdrawal, history)"
```

---

## Task 5: Admin withdrawal review service

**Files:**
- Create: `apps/api/src/admin/dto/review-withdrawal.dto.ts`
- Create: `apps/api/src/admin/admin-withdrawal-review.service.ts`
- Create: `apps/api/src/admin/admin-withdrawal-review.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `AuditService` (existing, see `admin-driver-review.service.ts` for the exact injection pattern).
- Produces: `AdminWithdrawalReviewService.listPending(): Promise<WithdrawalSummary[]>`, `.approve(actor, id, note, clientRequestId?): Promise<void>`, `.reject(actor, id, note, clientRequestId?): Promise<void>`.

- [ ] **Step 1: Write the DTO**

```ts
// apps/api/src/admin/dto/review-withdrawal.dto.ts
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ReviewWithdrawalDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(500)
  note!: string;

  @IsOptional()
  @IsString()
  clientRequestId?: string;
}
```

- [ ] **Step 2: Write the failing unit tests**

```ts
// apps/api/src/admin/admin-withdrawal-review.service.spec.ts
import { describe, expect, it } from '@jest/globals';
import { InMemoryPrismaService } from '../../test/prisma-mock.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditRepository } from '../audit/audit.repository.js';
import { AdminWithdrawalReviewService } from './admin-withdrawal-review.service.js';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';

const adminActor: AuthenticatedActor = { userId: 'admin-1', role: 'ADMIN', sessionId: 'sess-1' };

async function setup() {
  const prisma = new InMemoryPrismaService();
  const audit = new AuditService(new AuditRepository(prisma as never));
  const service = new AdminWithdrawalReviewService(prisma as never, audit);
  const driver = await prisma.user.create({ data: { phone: '+84900000009', role: 'DRIVER', status: 'ACTIVE' } });
  const request = await prisma.withdrawalRequest.create({
    data: { driverId: driver.id, amountVnd: 100000, bankName: 'MB Bank', bankAccountNumber: '111', bankAccountName: 'A' },
  });
  return { prisma, service, driverId: driver.id, requestId: request.id };
}

describe('AdminWithdrawalReviewService', () => {
  it('lists only PENDING requests', async () => {
    const { prisma, service, driverId } = await setup();
    await prisma.withdrawalRequest.create({
      data: { driverId, amountVnd: 5000, bankName: 'X', bankAccountNumber: '2', bankAccountName: 'B', status: 'APPROVED' },
    });

    const pending = await service.listPending();

    expect(pending).toHaveLength(1);
    expect(pending[0].amountVnd).toBe(100000);
  });

  it('approves a pending request and records the reviewer + audit log', async () => {
    const { prisma, service, requestId } = await setup();

    await service.approve(adminActor, requestId, 'Đã chuyển khoản thủ công qua MB Bank');

    const updated = await prisma.withdrawalRequest.findUnique({ where: { id: requestId } });
    expect(updated?.status).toBe('APPROVED');
    expect(updated?.reviewedById).toBe('admin-1');
    expect(updated?.reviewNote).toBe('Đã chuyển khoản thủ công qua MB Bank');

    const audits = Array.from(prisma.auditLogs.values()).filter((a) => a.resourceId === requestId);
    expect(audits).toHaveLength(1);
    expect(audits[0].action).toBe('WITHDRAWAL_APPROVED');
  });

  it('rejects a pending request with a note and records it', async () => {
    const { prisma, service, requestId } = await setup();

    await service.reject(adminActor, requestId, 'Thông tin ngân hàng không khớp hồ sơ');

    const updated = await prisma.withdrawalRequest.findUnique({ where: { id: requestId } });
    expect(updated?.status).toBe('REJECTED');
    expect(updated?.reviewNote).toBe('Thông tin ngân hàng không khớp hồ sơ');
  });

  it('throws 409 when approving a request that is no longer PENDING', async () => {
    const { service, requestId } = await setup();
    await service.approve(adminActor, requestId, 'Đã chuyển khoản');

    await expect(service.approve(adminActor, requestId, 'Đã chuyển khoản lần 2')).rejects.toMatchObject({
      code: 'WITHDRAWAL_ALREADY_REVIEWED',
    });
  });

  it('rejects a review note shorter than 5 characters', async () => {
    const { service, requestId } = await setup();

    await expect(service.approve(adminActor, requestId, 'ok')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('throws 404 for an unknown withdrawal id', async () => {
    const { service } = await setup();

    await expect(service.approve(adminActor, 'does-not-exist', 'Đã chuyển khoản')).rejects.toMatchObject({
      code: 'RESOURCE_NOT_FOUND',
    });
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm --filter api test -- src/admin/admin-withdrawal-review.service.spec.ts`
Expected: FAIL — service doesn't exist.

- [ ] **Step 4: Implement**

```ts
// apps/api/src/admin/admin-withdrawal-review.service.ts
import { Injectable } from '@nestjs/common';
import type { WithdrawalRequest, WithdrawalStatus } from '@prisma/client';

import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { AuditService } from '../audit/audit.service.js';
import { DomainError } from '../common/domain-error.js';
import { PrismaService } from '../database/prisma.service.js';

export interface WithdrawalSummary {
  readonly id: string;
  readonly driverId: string;
  readonly amountVnd: number;
  readonly status: WithdrawalStatus;
  readonly bankName: string | null;
  readonly bankAccountNumber: string | null;
  readonly bankAccountName: string | null;
  readonly createdAt: string;
}

function toSummary(r: WithdrawalRequest): WithdrawalSummary {
  return {
    id: r.id,
    driverId: r.driverId,
    amountVnd: r.amountVnd,
    status: r.status,
    bankName: r.bankName,
    bankAccountNumber: r.bankAccountNumber,
    bankAccountName: r.bankAccountName,
    createdAt: r.createdAt.toISOString(),
  };
}

/** Admin review of driver withdrawal requests (approve / reject) — mirrors
 * AdminDriverReviewService's approve/reject shape exactly. */
@Injectable()
export class AdminWithdrawalReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listPending(): Promise<WithdrawalSummary[]> {
    const requests = await this.prisma.withdrawalRequest.findMany({ where: { status: 'PENDING' } });
    return requests.map(toSummary);
  }

  async approve(actor: AuthenticatedActor, id: string, note: string, clientRequestId?: string): Promise<void> {
    const trimmed = this.assertValidNote(note);
    const request = await this.requirePendingRequest(id);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.withdrawalRequest.update({
        where: { id },
        data: { status: 'APPROVED', reviewedById: actor.userId, reviewedAt: now, reviewNote: trimmed },
      });
      await this.audit.append(
        {
          actorId: actor.userId,
          action: 'WITHDRAWAL_APPROVED',
          resourceType: 'WithdrawalRequest',
          resourceId: id,
          ...(clientRequestId ? { idempotencyRequestId: clientRequestId } : {}),
          metadata: { driverId: request.driverId, amountVnd: request.amountVnd, note: trimmed },
        },
        tx,
      );
    });
  }

  async reject(actor: AuthenticatedActor, id: string, note: string, clientRequestId?: string): Promise<void> {
    const trimmed = this.assertValidNote(note);
    const request = await this.requirePendingRequest(id);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.withdrawalRequest.update({
        where: { id },
        data: { status: 'REJECTED', reviewedById: actor.userId, reviewedAt: now, reviewNote: trimmed },
      });
      await this.audit.append(
        {
          actorId: actor.userId,
          action: 'WITHDRAWAL_REJECTED',
          resourceType: 'WithdrawalRequest',
          resourceId: id,
          ...(clientRequestId ? { idempotencyRequestId: clientRequestId } : {}),
          metadata: { driverId: request.driverId, amountVnd: request.amountVnd, note: trimmed },
        },
        tx,
      );
    });
  }

  private assertValidNote(note: string): string {
    const trimmed = note.trim();
    if (trimmed.length < 5 || trimmed.length > 500) {
      throw new DomainError('VALIDATION_ERROR', 422, 'Ghi chú phải từ 5 đến 500 ký tự');
    }
    return trimmed;
  }

  private async requirePendingRequest(id: string): Promise<WithdrawalRequest> {
    const request = await this.prisma.withdrawalRequest.findUnique({ where: { id } });
    if (!request) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy yêu cầu rút tiền');
    }
    if (request.status !== 'PENDING') {
      throw new DomainError('WITHDRAWAL_ALREADY_REVIEWED', 409, 'Yêu cầu rút tiền đã được xử lý trước đó');
    }
    return request;
  }
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm --filter api test -- src/admin/admin-withdrawal-review.service.spec.ts`
Expected: PASS, all 6 tests.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/admin/dto/review-withdrawal.dto.ts apps/api/src/admin/admin-withdrawal-review.service.ts apps/api/src/admin/admin-withdrawal-review.service.spec.ts
git commit -m "feat(api): add AdminWithdrawalReviewService (approve/reject)"
```

---

## Task 6: Wire admin withdrawal routes

**Files:**
- Modify: `apps/api/src/admin/admin.controller.ts`
- Modify: `apps/api/src/admin/admin.module.ts`
- Create: `apps/api/src/admin/admin-withdrawals.e2e-spec.ts`

**Interfaces:**
- Consumes: `AdminWithdrawalReviewService` from Task 5.
- Produces: `GET /admin/withdrawals`, `POST /admin/withdrawals/:id/approve`, `POST /admin/withdrawals/:id/reject` (class already guarded `@RequireRoles('ADMIN')` at the controller level — no per-route decorator needed).

- [ ] **Step 1: Write the failing e2e test**

```ts
// apps/api/src/admin/admin-withdrawals.e2e-spec.ts
/// <reference types="jest" />

import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '../app.module.js';
import { ApiExceptionFilter } from '../common/api-exception.filter.js';
import { PrismaService } from '../database/prisma.service.js';
import { TokenService } from '../auth/token.service.js';
import { RefreshSessionRepository } from '../auth/refresh-session.repository.js';
import { InMemoryPrismaService } from '../../test/prisma-mock.js';

interface AuthSessionBody {
  readonly accessToken: string;
}

describe('Admin Withdrawal Review API (E2E)', () => {
  let app: INestApplication;
  let adminSession: AuthSessionBody;
  let driverUserId: string;
  let prismaMock: InMemoryPrismaService;

  beforeEach(async () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'test',
      AUTH_DEMO_LOGIN_ENABLED: 'true',
      AUTH_ACCESS_TOKEN_SECRET: 'test-access-token-secret',
      AUTH_REFRESH_TOKEN_SECRET: 'test-refresh-token-secret',
    };
    prismaMock = new InMemoryPrismaService();

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    app.useGlobalFilters(new ApiExceptionFilter());
    app.useGlobalPipes(new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }));
    await app.init();

    const tokenService = app.get(TokenService);
    const refreshSessions = app.get(RefreshSessionRepository);

    const admin = await prismaMock.user.create({ data: { phone: '+84900001111', role: 'ADMIN', status: 'ACTIVE' } });
    const adminSessionRecord = await refreshSessions.create(admin.id);
    adminSession = tokenService.createAuthSession(admin, adminSessionRecord);

    const driver = await prismaMock.user.create({ data: { phone: '+84900002222', role: 'DRIVER', status: 'ACTIVE' } });
    driverUserId = driver.id;
    await prismaMock.withdrawalRequest.create({
      data: { driverId: driverUserId, amountVnd: 100000, bankName: 'MB Bank', bankAccountNumber: '0987654321', bankAccountName: 'NGUYEN VAN A' },
    });
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  it('lists pending withdrawal requests', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/withdrawals')
      .set('Authorization', `Bearer ${adminSession.accessToken}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ driverId: driverUserId, amountVnd: 100000, status: 'PENDING' });
  });

  it('approves a withdrawal request with a note', async () => {
    const listRes = await request(app.getHttpServer())
      .get('/admin/withdrawals')
      .set('Authorization', `Bearer ${adminSession.accessToken}`)
      .expect(200);
    const id = listRes.body[0].id;

    await request(app.getHttpServer())
      .post(`/admin/withdrawals/${id}/approve`)
      .set('Authorization', `Bearer ${adminSession.accessToken}`)
      .send({ note: 'Đã chuyển khoản thủ công', clientRequestId: 'req-approve-1' })
      .expect(201);

    const afterRes = await request(app.getHttpServer())
      .get('/admin/withdrawals')
      .set('Authorization', `Bearer ${adminSession.accessToken}`)
      .expect(200);
    expect(afterRes.body).toHaveLength(0); // no longer PENDING
  });

  it('rejects Driver access to admin withdrawal routes with 403', async () => {
    const tokenService = app.get(TokenService);
    const refreshSessions = app.get(RefreshSessionRepository);
    const driver = await prismaMock.user.findUnique({ where: { id: driverUserId } });
    const session = await refreshSessions.create(driver!.id);
    const driverSession = tokenService.createAuthSession(driver!, session);

    await request(app.getHttpServer())
      .get('/admin/withdrawals')
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .expect(403);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter api exec jest --config jest-e2e.config.cjs admin-withdrawals.e2e-spec`
Expected: FAIL — routes don't exist.

- [ ] **Step 3: Add the routes**

In `apps/api/src/admin/admin.controller.ts`, add the import and constructor param:

```ts
import { AdminWithdrawalReviewService } from './admin-withdrawal-review.service.js';
import { ReviewWithdrawalDto } from './dto/review-withdrawal.dto.js';
```

```ts
  constructor(
    private readonly queryService: AdminQueryService,
    private readonly commandService: AdminCommandService,
    private readonly driverReviewService: AdminDriverReviewService,
    private readonly driverDocumentService: DriverDocumentService,
    private readonly withdrawalReviewService: AdminWithdrawalReviewService,
  ) {}
```

Add these routes (anywhere after the `rejectDriver` method, before the closing class brace):

```ts
  @Get('withdrawals')
  async getPendingWithdrawals() {
    return this.withdrawalReviewService.listPending();
  }

  @Post('withdrawals/:id/approve')
  async approveWithdrawal(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') id: string,
    @Body() body: ReviewWithdrawalDto,
  ) {
    await this.withdrawalReviewService.approve(actor, id, body.note, body.clientRequestId);
    return { success: true };
  }

  @Post('withdrawals/:id/reject')
  async rejectWithdrawal(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') id: string,
    @Body() body: ReviewWithdrawalDto,
  ) {
    await this.withdrawalReviewService.reject(actor, id, body.note, body.clientRequestId);
    return { success: true };
  }
```

- [ ] **Step 4: Register the service in the admin module**

In `apps/api/src/admin/admin.module.ts`, import `AdminWithdrawalReviewService` and add it to `providers: [...]`.

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm --filter api exec jest --config jest-e2e.config.cjs admin-withdrawals.e2e-spec`
Expected: PASS, all 3 tests.

- [ ] **Step 6: Run the full backend suite**

Run: `pnpm --filter api test`
Expected: PASS, no regressions.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/admin
git commit -m "feat(api): wire admin withdrawal review routes (list/approve/reject)"
```

---

## Task 7: Driver mobile — wallet adapter

**Files:**
- Create: `apps/driver/src/features/wallet/adapter.ts`
- Create: `apps/driver/src/features/wallet/adapter.test.ts`

**Interfaces:**
- Produces: `createDriverWalletHttpAdapter(client?)` returning `{ getWalletSummary(), requestWithdrawal(input), getWithdrawalHistory() }`; `WalletSummary`, `WithdrawalRequestInput`, `WithdrawalHistoryItem` types (consumed by Task 8).

- [ ] **Step 1: Write the failing tests**

```ts
// apps/driver/src/features/wallet/adapter.test.ts
import { describe, expect, it, jest } from '@jest/globals';

import { createDriverWalletHttpAdapter } from './adapter';

describe('createDriverWalletHttpAdapter', () => {
  it('maps GET /driver/wallet to a WalletSummary', async () => {
    const get = jest.fn(async () => ({
      availableBalanceVnd: 200000,
      lifetimeDeliveredVnd: 500000,
      pendingWithdrawalVnd: 100000,
      deliveredOrderCount: 5,
    }));
    const adapter = createDriverWalletHttpAdapter({ get: get as any, post: jest.fn() as any });

    const summary = await adapter.getWalletSummary();

    expect(get).toHaveBeenCalledWith('/driver/wallet');
    expect(summary.availableBalanceVnd).toBe(200000);
  });

  it('posts a withdrawal request and auto-generates a clientRequestId when none given', async () => {
    const post = jest.fn(async () => ({
      id: 'wr-1',
      status: 'PENDING',
      amountVnd: 100000,
      bankName: 'MB Bank',
      bankAccountNumber: '0987654321',
      bankAccountName: 'NGUYEN VAN A',
      createdAt: '2026-09-13T00:00:00.000Z',
    }));
    const adapter = createDriverWalletHttpAdapter({ get: jest.fn() as any, post: post as any });

    const result = await adapter.requestWithdrawal({
      amountVnd: 100000,
      bankName: 'MB Bank',
      bankAccountNumber: '0987654321',
      bankAccountName: 'NGUYEN VAN A',
    });

    expect(post).toHaveBeenCalledWith(
      '/driver/wallet/withdrawals',
      expect.objectContaining({ amountVnd: 100000, clientRequestId: expect.any(String) }),
    );
    expect(result.status).toBe('PENDING');
  });

  it('maps GET /driver/wallet/withdrawals to a list of history items', async () => {
    const get = jest.fn(async () => ({
      items: [
        {
          id: 'wr-1',
          status: 'APPROVED',
          amountVnd: 50000,
          bankName: 'MB Bank',
          bankAccountNumber: '0987654321',
          bankAccountName: 'NGUYEN VAN A',
          createdAt: '2026-09-10T00:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    }));
    const adapter = createDriverWalletHttpAdapter({ get: get as any, post: jest.fn() as any });

    const history = await adapter.getWithdrawalHistory();

    expect(get).toHaveBeenCalledWith('/driver/wallet/withdrawals?page=1&pageSize=20');
    expect(history.items[0].status).toBe('APPROVED');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter driver test -- src/features/wallet/adapter.test.ts`
Expected: FAIL — `adapter.ts` doesn't exist.

- [ ] **Step 3: Implement**

```ts
// apps/driver/src/features/wallet/adapter.ts
export interface DriverWalletHttpClient {
  get<T = unknown>(path: string): Promise<T>;
  post<T = unknown>(path: string, body?: unknown): Promise<T>;
}

export interface WalletSummary {
  availableBalanceVnd: number;
  lifetimeDeliveredVnd: number;
  pendingWithdrawalVnd: number;
  deliveredOrderCount: number;
}

export type WithdrawalStatusValue = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface WithdrawalHistoryItem {
  id: string;
  status: WithdrawalStatusValue;
  amountVnd: number;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  createdAt: string;
}

export interface WithdrawalRequestInput {
  amountVnd: number;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  clientRequestId?: string;
}

interface WithdrawalHistoryResponse {
  items: WithdrawalHistoryItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function getDefaultHttpClient(): DriverWalletHttpClient {
  const { httpClient } = require('@leopard/mobile-core');
  return httpClient as DriverWalletHttpClient;
}

function newClientRequestId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // ignore
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createDriverWalletHttpAdapter(client?: DriverWalletHttpClient) {
  const getClient = (): DriverWalletHttpClient => client ?? getDefaultHttpClient();

  return {
    async getWalletSummary(): Promise<WalletSummary> {
      return getClient().get<WalletSummary>('/driver/wallet');
    },

    async requestWithdrawal(input: WithdrawalRequestInput): Promise<WithdrawalHistoryItem> {
      return getClient().post<WithdrawalHistoryItem>('/driver/wallet/withdrawals', {
        ...input,
        clientRequestId: input.clientRequestId ?? newClientRequestId(),
      });
    },

    async getWithdrawalHistory(page = 1, pageSize = 20): Promise<WithdrawalHistoryResponse> {
      return getClient().get<WithdrawalHistoryResponse>(
        `/driver/wallet/withdrawals?page=${page}&pageSize=${pageSize}`,
      );
    },
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter driver test -- src/features/wallet/adapter.test.ts`
Expected: PASS, all 3 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/driver/src/features/wallet/adapter.ts apps/driver/src/features/wallet/adapter.test.ts
git commit -m "feat(driver): add wallet adapter (getWalletSummary, requestWithdrawal, history)"
```

---

## Task 8: Driver mobile — rewire `DriverWalletScreen`

**Files:**
- Modify: `apps/driver/src/features/wallet/DriverWalletScreen.tsx` (rewrite)
- Modify: `apps/driver/src/features/wallet/DriverWalletScreen.test.tsx` (rewrite)
- Create: `apps/driver/src/features/wallet/DriverWalletRuntime.tsx`
- Modify: the route file that currently renders `<DriverWalletScreen />` — find it first with `grep -rn "DriverWalletScreen" apps/driver/app/` (the file exists per `router.push('/driver/wallet')` calls seen elsewhere in the codebase; confirm the exact path before editing — do not guess).

**Interfaces:**
- Consumes: `createDriverWalletHttpAdapter` from Task 7.
- Produces: `DriverWalletScreenProps` (props-driven component, consumed by the route file and by `DriverWalletScreen.test.tsx`).

- [ ] **Step 1: Locate the route file**

Run: `grep -rln "DriverWalletScreen" apps/driver/app/`
Expected: one file path. Read it before editing — it currently does `import { DriverWalletScreen } from '...'; export default function ... { return <DriverWalletScreen />; }`, matching the `history.tsx` pattern already fixed in the prior session.

- [ ] **Step 2: Write the failing test for the rewritten screen**

```tsx
// apps/driver/src/features/wallet/DriverWalletScreen.test.tsx
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { DriverWalletScreen, type DriverWalletScreenProps } from './DriverWalletScreen';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

const baseProps: DriverWalletScreenProps = {
  summary: {
    availableBalanceVnd: 1450000,
    lifetimeDeliveredVnd: 3450000,
    pendingWithdrawalVnd: 300000,
    deliveredOrderCount: 12,
  },
  history: [
    {
      id: 'wr-1',
      status: 'APPROVED',
      amountVnd: 500000,
      bankName: 'MB Bank',
      bankAccountNumber: '0987654321',
      bankAccountName: 'NGUYEN VAN A',
      createdAt: '2026-09-10T08:30:00.000Z',
    },
    {
      id: 'wr-2',
      status: 'PENDING',
      amountVnd: 300000,
      bankName: 'MB Bank',
      bankAccountNumber: '0987654321',
      bankAccountName: 'NGUYEN VAN A',
      createdAt: '2026-09-12T14:32:00.000Z',
    },
  ],
  isLoading: false,
  isError: false,
  isSubmittingWithdrawal: false,
  withdrawalError: null,
  onRequestWithdrawal: jest.fn(),
  onRetry: jest.fn(),
};

describe('DriverWalletScreen', () => {
  it('renders the real available balance, not a hardcoded number', async () => {
    const screen = await render(<DriverWalletScreen {...baseProps} />);

    expect(screen.getByText('Ví tài xế')).toBeTruthy();
    expect(screen.getByText(/1.450.000/)).toBeTruthy();
    // The old fake instant-transfer claim must be gone.
    expect(screen.queryByText(/tức thì 24\/7/)).toBeNull();
    expect(screen.queryByText(/trong 60s/)).toBeNull();

    await screen.unmount();
  });

  it('does not show a saved-bank-account selector (out of scope for this pilot)', async () => {
    const screen = await render(<DriverWalletScreen {...baseProps} />);
    expect(screen.queryByText('Vietcombank')).toBeNull();
    await screen.unmount();
  });

  it('submits a withdrawal request with the entered bank details', async () => {
    const onRequestWithdrawal = jest.fn();
    const screen = await render(
      <DriverWalletScreen {...baseProps} onRequestWithdrawal={onRequestWithdrawal} />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Yêu cầu rút tiền' }));
    await fireEvent.changeText(screen.getByPlaceholderText('Nhập số tiền'), '200000');
    await fireEvent.changeText(screen.getByPlaceholderText('VD: MB Bank'), 'MB Bank');
    await fireEvent.changeText(screen.getByPlaceholderText('Nhập số tài khoản'), '0987654321');
    await fireEvent.changeText(screen.getByPlaceholderText('Nhập tên chủ tài khoản (không dấu)'), 'NGUYEN VAN A');
    await fireEvent.press(screen.getByRole('button', { name: 'Gửi yêu cầu rút tiền' }));

    expect(onRequestWithdrawal).toHaveBeenCalledWith({
      amountVnd: 200000,
      bankName: 'MB Bank',
      bankAccountNumber: '0987654321',
      bankAccountName: 'NGUYEN VAN A',
    });

    await screen.unmount();
  });

  it('shows PENDING/APPROVED/REJECTED status labels for withdrawal history rows, not always "Thành công"', async () => {
    const screen = await render(<DriverWalletScreen {...baseProps} />);
    expect(screen.getByText('Đã duyệt')).toBeTruthy(); // APPROVED row's status label
    await screen.unmount();
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm --filter driver test -- src/features/wallet/DriverWalletScreen.test.tsx`
Expected: FAIL — current `DriverWalletScreen` takes no props and has the fake copy.

- [ ] **Step 4: Rewrite `DriverWalletScreen.tsx`**

Replace the entire file. Reuse the existing file's `styles` object as-is (it's presentational-only and doesn't reference any removed data), but replace the component body, props, and the parts of JSX that reference removed/renamed data:

```tsx
// apps/driver/src/features/wallet/DriverWalletScreen.tsx (component body — keep the existing `styles` StyleSheet unchanged below it)
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, leopardPalette, radius, spacing, Button, IconTxPayment, IconWallet, ScreenScaffold, ScreenState } from '@leopard/mobile-core';
import type { WalletSummary, WithdrawalHistoryItem, WithdrawalRequestInput } from './adapter';

export type DriverWalletScreenProps = Readonly<{
  summary: WalletSummary;
  /** Withdrawal requests only — completed-order earnings have their own,
   * already-built list on DriverHistoryScreen; not duplicated here. */
  history: readonly WithdrawalHistoryItem[];
  isLoading: boolean;
  isError: boolean;
  isSubmittingWithdrawal: boolean;
  withdrawalError: string | null;
  onRequestWithdrawal: (input: WithdrawalRequestInput) => void;
  onRetry: () => void;
}>;

const STATUS_LABELS: Readonly<Record<WithdrawalHistoryItem['status'], string>> = {
  PENDING: 'Đang chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Bị từ chối',
};

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
}

export function DriverWalletScreen({
  summary,
  history,
  isLoading,
  isError,
  isSubmittingWithdrawal,
  withdrawalError,
  onRequestWithdrawal,
  onRetry,
}: DriverWalletScreenProps) {
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [amountText, setAmountText] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');

  const handleSubmit = () => {
    const amountVnd = parseInt(amountText.replace(/[^0-9]/g, ''), 10);
    if (!amountVnd || !bankName.trim() || !bankAccountNumber.trim() || !bankAccountName.trim()) return;
    onRequestWithdrawal({
      amountVnd,
      bankName: bankName.trim(),
      bankAccountNumber: bankAccountNumber.trim(),
      bankAccountName: bankAccountName.trim(),
    });
  };

  return (
    <ScreenScaffold eyebrow="DRIVER · WALLET & PAYOUT" headerTone="plain" title="Ví tài xế">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} style={styles.scrollWrap}>
        {isLoading ? <ScreenState state="loading" /> : isError ? (
          <ScreenState actionLabel="Thử lại" onAction={onRetry} state="error" />
        ) : (
          <>
            <View style={styles.doubleBezelOuter}>
              <View style={styles.doubleBezelInner}>
                <View style={styles.balanceHeader}>
                  <View style={styles.balanceHeaderLeft}>
                    <View style={styles.walletIconChip}>
                      <IconWallet color="#10B981" size={18} />
                    </View>
                    <View>
                      <Text style={styles.balanceLabel}>Số dư khả dụng để rút</Text>
                      <Text style={styles.balanceSubLabel}>Yêu cầu rút tiền — Admin xác nhận trong giờ hành chính</Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.balanceAmount}>{formatCurrency(summary.availableBalanceVnd)}</Text>

                <View style={styles.balanceFooter}>
                  <View style={styles.balanceStat}>
                    <Text style={styles.balanceStatLabel}>Đang chờ duyệt</Text>
                    <Text style={styles.balanceStatValue}>{formatCurrency(summary.pendingWithdrawalVnd)}</Text>
                  </View>
                  <View style={styles.balanceStatDivider} />
                  <View style={styles.balanceStat}>
                    <Text style={styles.balanceStatLabel}>Tổng đã kiếm</Text>
                    <Text style={styles.balanceStatValue}>{formatCurrency(summary.lifetimeDeliveredVnd)}</Text>
                  </View>
                </View>

                <Button label="Yêu cầu rút tiền" onPress={() => setShowWithdrawModal(true)} size="driver-primary" variant="primary" />
              </View>
            </View>

            <View style={styles.historySection}>
              <Text style={styles.sectionLabel}>Lịch sử yêu cầu rút tiền</Text>
              <View style={styles.txList}>
                {history.map((item) => (
                  <View key={item.id} style={styles.txCard}>
                    <View style={styles.txLeft}>
                      <View style={[styles.txIconChip, styles.txIconNegative]}>
                        <IconTxPayment color={colors.neutral.mutedText} size={18} />
                      </View>
                      <View style={styles.txInfo}>
                        <Text style={styles.txTitle}>Rút tiền về {item.bankName ?? 'ngân hàng'}</Text>
                        <Text style={styles.txTime}>{new Date(item.createdAt).toLocaleString('vi-VN')}</Text>
                      </View>
                    </View>
                    <View style={styles.txRight}>
                      <Text style={[styles.txAmount, styles.txAmountNegative]}>
                        -{formatCurrency(item.amountVnd)}
                      </Text>
                      <Text style={styles.txStatus}>{STATUS_LABELS[item.status]}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <Modal animationType="slide" onRequestClose={() => setShowWithdrawModal(false)} transparent visible={showWithdrawModal}>
        <Pressable onPress={() => setShowWithdrawModal(false)} style={styles.modalBackdrop}>
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.modalSheet}>
            <View style={styles.modalDragHandle} />
            <Text style={styles.modalTitle}>Yêu cầu rút tiền về tài khoản ngân hàng</Text>
            <Text style={styles.modalSub}>Admin sẽ xác nhận và chuyển khoản thủ công. Thời gian xử lý trong giờ hành chính.</Text>

            {withdrawalError ? <Text style={styles.errorText}>{withdrawalError}</Text> : null}

            <Text style={styles.inputLabel}>Số tiền muốn rút (₫)</Text>
            <TextInput keyboardType="numeric" onChangeText={setAmountText} placeholder="Nhập số tiền" style={styles.amountInput} value={amountText} />

            <Text style={styles.inputLabel}>Tên ngân hàng</Text>
            <TextInput onChangeText={setBankName} placeholder="VD: MB Bank" style={styles.textInput} value={bankName} />

            <Text style={styles.inputLabel}>Số tài khoản</Text>
            <TextInput keyboardType="numeric" onChangeText={setBankAccountNumber} placeholder="Nhập số tài khoản" style={styles.textInput} value={bankAccountNumber} />

            <Text style={styles.inputLabel}>Tên chủ tài khoản</Text>
            <TextInput onChangeText={setBankAccountName} placeholder="Nhập tên chủ tài khoản (không dấu)" style={styles.textInput} value={bankAccountName} />

            <View style={styles.modalBtnRow}>
              <Button label="Hủy" onPress={() => setShowWithdrawModal(false)} variant="secondary" />
              <Button
                disabled={isSubmittingWithdrawal}
                label={isSubmittingWithdrawal ? 'Đang gửi...' : 'Gửi yêu cầu rút tiền'}
                onPress={handleSubmit}
                variant="primary"
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scrollWrap: { flex: 1, minHeight: 0 },
  scrollContent: { gap: spacing.md, paddingBottom: spacing.xl + 20 },
  doubleBezelOuter: {
    backgroundColor: '#0B1E42',
    borderRadius: radius.bezelOuter,
    padding: 3,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  doubleBezelInner: { backgroundColor: '#FFFFFF', borderRadius: radius.bezelInner, borderColor: '#E2E8F0', borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  balanceHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  balanceHeaderLeft: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  walletIconChip: { alignItems: 'center', backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', borderWidth: 1, borderRadius: radius.card, height: 34, justifyContent: 'center', width: 34 },
  balanceLabel: { color: '#0B1E42', fontSize: 12.5, fontWeight: '700' },
  balanceSubLabel: { color: leopardPalette.textMutedSlate, fontSize: 10.5, marginTop: 2, maxWidth: 220 },
  balanceAmount: { color: '#0B1E42', fontSize: 32, fontWeight: '800', fontVariant: ['tabular-nums'], marginVertical: 2 },
  balanceFooter: { borderBottomColor: colors.neutral.rowDivider, borderTopColor: colors.neutral.rowDivider, borderBottomWidth: 1, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing.xs, marginBottom: spacing.xxs },
  balanceStat: { alignItems: 'center', gap: 2 },
  balanceStatDivider: { backgroundColor: colors.neutral.rowDivider, width: 1 },
  balanceStatLabel: { color: colors.neutral.subtleText, fontSize: 11 },
  balanceStatValue: { color: '#0F172A', fontSize: 12.5, fontWeight: '700', fontVariant: ['tabular-nums'] },
  historySection: { gap: spacing.xs },
  sectionLabel: { color: leopardPalette.textMutedSlate, fontSize: 13, fontWeight: '700' },
  txList: { gap: spacing.xs },
  txCard: { alignItems: 'center', backgroundColor: colors.neutral.background, borderColor: colors.neutral.subtleBorder, borderRadius: radius.card, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', padding: spacing.sm },
  txLeft: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs, flex: 1 },
  txIconChip: { alignItems: 'center', borderRadius: radius.card, height: 36, justifyContent: 'center', width: 36 },
  txIconPositive: { backgroundColor: colors.success.background },
  txIconNegative: { backgroundColor: colors.neutral.surfaceMuted },
  txInfo: { flex: 1, gap: 2 },
  txTitle: { color: colors.neutral.titleText, fontSize: 13, fontWeight: '600' },
  txTime: { color: colors.neutral.subtleText, fontSize: 11, fontVariant: ['tabular-nums'] },
  txRight: { alignItems: 'flex-end', gap: 2 },
  txAmount: { fontSize: 13.5, fontWeight: '700', fontVariant: ['tabular-nums'] },
  txAmountPositive: { color: colors.success.text },
  txAmountNegative: { color: colors.neutral.titleText },
  txStatus: { color: colors.neutral.subtleText, fontSize: 10.5 },
  modalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.6)', flex: 1, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.neutral.background, borderTopLeftRadius: radius.control, borderTopRightRadius: radius.control, gap: spacing.sm, maxWidth: 480, padding: spacing.lg, width: '100%' },
  modalDragHandle: { alignSelf: 'center', backgroundColor: colors.neutral.subtleBorder, borderRadius: 2, height: 4, marginBottom: spacing.xs, width: 40 },
  modalTitle: { color: colors.neutral.titleText, fontSize: 17, fontWeight: '800' },
  modalSub: { color: colors.neutral.mutedText, fontSize: 12.5, lineHeight: 18 },
  errorText: { color: '#DC2626', fontSize: 12.5, fontWeight: '600' },
  inputLabel: { color: colors.neutral.titleText, fontSize: 12, fontWeight: '700', marginTop: spacing.xs },
  amountInput: { borderColor: colors.neutral.subtleBorder, borderRadius: radius.card, borderWidth: 1, color: colors.neutral.titleText, fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'], paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  textInput: { borderColor: colors.neutral.subtleBorder, borderRadius: radius.card, borderWidth: 1, color: colors.neutral.titleText, fontSize: 14, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  modalBtnRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
});
```

(`IconBank` is imported but unused in this trimmed version — remove it from the import line, or keep it if used elsewhere in your final layout polish; don't leave an unused import.)

- [ ] **Step 5: Run to verify the screen test passes**

Run: `pnpm --filter driver test -- src/features/wallet/DriverWalletScreen.test.tsx`
Expected: PASS, all 4 tests.

- [ ] **Step 6: Write `DriverWalletRuntime.tsx`**

```tsx
// apps/driver/src/features/wallet/DriverWalletRuntime.tsx
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { createDriverWalletHttpAdapter } from './adapter';
import { DriverWalletScreen } from './DriverWalletScreen';

export function DriverWalletRuntime() {
  const adapter = useMemo(() => createDriverWalletHttpAdapter(), []);
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [withdrawalError, setWithdrawalError] = useState<string | null>(null);

  const summaryQuery = useQuery({
    queryKey: ['driver', 'wallet', 'summary'],
    queryFn: () => adapter.getWalletSummary(),
  });
  const historyQuery = useQuery({
    queryKey: ['driver', 'wallet', 'history'],
    queryFn: () => adapter.getWithdrawalHistory(),
  });

  const rows = historyQuery.data?.items ?? [];

  async function handleRequestWithdrawal(input: Parameters<typeof adapter.requestWithdrawal>[0]) {
    setIsSubmitting(true);
    setWithdrawalError(null);
    try {
      await adapter.requestWithdrawal(input);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['driver', 'wallet', 'summary'] }),
        queryClient.invalidateQueries({ queryKey: ['driver', 'wallet', 'history'] }),
      ]);
    } catch (error) {
      setWithdrawalError(
        error instanceof Error ? error.message : 'Không thể gửi yêu cầu rút tiền. Vui lòng thử lại.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DriverWalletScreen
      history={rows}
      isError={summaryQuery.isError || historyQuery.isError}
      isLoading={summaryQuery.isLoading || historyQuery.isLoading}
      isSubmittingWithdrawal={isSubmitting}
      onRequestWithdrawal={(input) => void handleRequestWithdrawal(input)}
      onRetry={() => {
        void summaryQuery.refetch();
        void historyQuery.refetch();
      }}
      summary={
        summaryQuery.data ?? {
          availableBalanceVnd: 0,
          lifetimeDeliveredVnd: 0,
          pendingWithdrawalVnd: 0,
          deliveredOrderCount: 0,
        }
      }
      withdrawalError={withdrawalError}
    />
  );
}
```

- [ ] **Step 7: Update the route file found in Step 1**

The route file currently looks like this (adjust the relative import path to match what Step 1 actually found):

```tsx
import { DriverWalletScreen } from '../src/features/wallet/DriverWalletScreen';

export default function DriverWalletRoute() {
  return <DriverWalletScreen />;
}
```

Change it to:

```tsx
import { DriverWalletRuntime } from '../src/features/wallet/DriverWalletRuntime';

export default function DriverWalletRoute() {
  return <DriverWalletRuntime />;
}
```

(Keep the existing default export function name as found in the file — only the import and the JSX it returns change.)

- [ ] **Step 8: Run the driver test suite and typecheck**

Run: `pnpm --filter driver test -- src/features/wallet && pnpm --filter driver typecheck`
Expected: PASS, no errors.

- [ ] **Step 9: Commit**

```bash
git add apps/driver/src/features/wallet apps/driver/app
git commit -m "feat(driver): rewire DriverWalletScreen to real wallet data and request-withdrawal flow"
```

---

## Task 9: Driver mobile — rewire `DriverEarningsScreen`

**Files:**
- Modify: `apps/driver/src/features/earnings/DriverEarningsScreen.tsx` (rewrite)
- Modify: `apps/driver/src/features/earnings/DriverEarningsScreen.test.tsx` (rewrite)
- Create: `apps/driver/src/features/earnings/DriverEarningsRuntime.tsx`
- Modify: the route file rendering `<DriverEarningsScreen />` (find via `grep -rln "DriverEarningsScreen" apps/driver/app/`, same caveat as Task 8 — read it before editing).

**Interfaces:**
- Consumes: `createDriverWalletHttpAdapter` (for balance) from Task 7, `createDriverHistoryHttpAdapter` (for the trip list + delivered count) from the prior session's `apps/driver/src/features/history/adapter.ts`.

- [ ] **Step 1: Locate the route file**

Run: `grep -rln "DriverEarningsScreen" apps/driver/app/`

- [ ] **Step 2: Write the failing test**

```tsx
// apps/driver/src/features/earnings/DriverEarningsScreen.test.tsx
import { describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';

import { DriverEarningsScreen, type DriverEarningsScreenProps } from './DriverEarningsScreen';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

const baseProps: DriverEarningsScreenProps = {
  lifetimeDeliveredVnd: 18450000,
  availableBalanceVnd: 1450000,
  deliveredOrderCount: 128,
  totalOrderCount: 130,
  isLoading: false,
  isError: false,
  onRetry: jest.fn(),
};

describe('DriverEarningsScreen', () => {
  it('renders real revenue and trip counts, with no invented commission/fee breakdown', async () => {
    const screen = await render(<DriverEarningsScreen {...baseProps} />);

    expect(screen.getByText('Thu nhập')).toBeTruthy();
    expect(screen.getByText(/18.450.000/)).toBeTruthy();
    expect(screen.getByText('128')).toBeTruthy();
    expect(screen.queryByText(/Chiết khấu nền tảng/)).toBeNull();
    expect(screen.queryByText(/Rút tiền 24\/7/)).toBeNull();

    await screen.unmount();
  });

  it('computes and shows a real completion rate from delivered/total counts', async () => {
    const screen = await render(<DriverEarningsScreen {...baseProps} />);
    expect(screen.getByText('98%')).toBeTruthy(); // round(128/130*100)
    await screen.unmount();
  });

  it('marks the not-yet-built KPIs as "Sắp ra mắt" instead of a fabricated number', async () => {
    const screen = await render(<DriverEarningsScreen {...baseProps} />);
    expect(screen.getAllByText('Sắp ra mắt').length).toBeGreaterThanOrEqual(2); // hours online + rating (OTD folded into completion rate)
    expect(screen.queryByText('99.4%')).toBeNull();
    expect(screen.queryByText('5.0')).toBeNull();
    await screen.unmount();
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm --filter driver test -- src/features/earnings/DriverEarningsScreen.test.tsx`
Expected: FAIL.

- [ ] **Step 4: Rewrite `DriverEarningsScreen.tsx`**

```tsx
// apps/driver/src/features/earnings/DriverEarningsScreen.tsx
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, leopardPalette, radius, spacing, IconClock, IconSecurityShield, IconSpeedTruck, IconStar, IconWallet, ScreenScaffold, ScreenState } from '@leopard/mobile-core';
import { useDriverDrawer } from '../navigation/DriverDrawerContext';
import { DriverMenuButton } from '../navigation/DriverMenuButton';

export type DriverEarningsScreenProps = Readonly<{
  lifetimeDeliveredVnd: number;
  availableBalanceVnd: number;
  deliveredOrderCount: number;
  totalOrderCount: number;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}>;

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
}

export function DriverEarningsScreen({
  lifetimeDeliveredVnd,
  availableBalanceVnd,
  deliveredOrderCount,
  totalOrderCount,
  isLoading,
  isError,
  onRetry,
}: DriverEarningsScreenProps) {
  const router = useRouter();
  const { openDrawer } = useDriverDrawer();
  const completionRate = totalOrderCount > 0 ? Math.round((deliveredOrderCount / totalOrderCount) * 100) : 0;

  return (
    <ScreenScaffold
      headerLeading={<DriverMenuButton onPress={openDrawer} variant="plain" />}
      headerTone="plain"
      title="Thu nhập"
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} style={styles.scrollWrap}>
        {isLoading ? <ScreenState state="loading" /> : isError ? (
          <ScreenState actionLabel="Thử lại" onAction={onRetry} state="error" />
        ) : (
          <>
            <View style={styles.doubleBezelOuter}>
              <View style={styles.doubleBezelInner}>
                <Text style={styles.financialEyebrow}>TỔNG THU NHẬP (TẤT CẢ ĐƠN ĐÃ GIAO)</Text>
                <Text style={styles.mainEarningsAmount}>{formatCurrency(lifetimeDeliveredVnd)}</Text>

                <View style={styles.walletQuickActionBox}>
                  <View style={styles.walletBalanceLeft}>
                    <View style={styles.walletIconCircle}>
                      <IconWallet color="#10B981" size={16} />
                    </View>
                    <View>
                      <Text style={styles.walletAvailLabel}>Số dư khả dụng để rút</Text>
                      <Text style={styles.walletAvailAmount}>{formatCurrency(availableBalanceVnd)}</Text>
                    </View>
                  </View>
                  <Text style={styles.walletLink} onPress={() => router.push('/driver/wallet')}>
                    Đến ví →
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.kpiGrid}>
              <View style={styles.kpiBox}>
                <View style={styles.kpiIconWrap}>
                  <IconSpeedTruck color="#10B981" size={15} />
                </View>
                <Text style={styles.kpiBoxValue}>{deliveredOrderCount}</Text>
                <Text style={styles.kpiBoxLabel}>Đã hoàn thành</Text>
              </View>

              <View style={styles.kpiBox}>
                <View style={styles.kpiIconWrap}>
                  <IconSecurityShield color="#0B1E42" size={15} />
                </View>
                <Text style={styles.kpiBoxValue}>{completionRate}%</Text>
                <Text style={styles.kpiBoxLabel}>Tỷ lệ giao thành công</Text>
              </View>

              <View style={styles.kpiBox}>
                <View style={styles.kpiIconWrap}>
                  <IconClock color="#94A3B8" size={15} />
                </View>
                <Text style={styles.kpiBoxValuePlaceholder}>Sắp ra mắt</Text>
                <Text style={styles.kpiBoxLabel}>Giờ trực tuyến</Text>
              </View>

              <View style={styles.kpiBox}>
                <View style={styles.kpiIconWrap}>
                  <IconStar color="#94A3B8" size={14} />
                </View>
                <Text style={styles.kpiBoxValuePlaceholder}>Sắp ra mắt</Text>
                <Text style={styles.kpiBoxLabel}>Đánh giá</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scrollWrap: { flex: 1 },
  scrollContent: { gap: spacing.sm, paddingBottom: spacing.xl + 20 },
  doubleBezelOuter: { backgroundColor: '#0B1E42', borderRadius: radius.bezelOuter, padding: 3, shadowColor: '#0B1E42', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  doubleBezelInner: { backgroundColor: '#FFFFFF', borderRadius: radius.bezelInner, borderColor: '#E2E8F0', borderWidth: 1, padding: spacing.md, gap: spacing.xs + 2 },
  financialEyebrow: { color: '#0B1E42', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  mainEarningsAmount: { color: '#0B1E42', fontSize: 32, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  walletQuickActionBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: 6 },
  walletBalanceLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  walletIconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  walletAvailLabel: { color: '#065F46', fontSize: 10.5, fontWeight: '600' },
  walletAvailAmount: { color: '#064E3B', fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  walletLink: { color: leopardPalette.primary, fontSize: 12.5, fontWeight: '700' },
  kpiGrid: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  kpiBox: { flex: 1, minWidth: '45%', backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderWidth: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', gap: 2, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  kpiIconWrap: { marginBottom: 2 },
  kpiBoxValue: { color: '#0F172A', fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  kpiBoxValuePlaceholder: { color: '#94A3B8', fontSize: 11.5, fontWeight: '700', fontStyle: 'italic' },
  kpiBoxLabel: { color: '#64748B', fontSize: 9.5, fontWeight: '600' },
});
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm --filter driver test -- src/features/earnings/DriverEarningsScreen.test.tsx`
Expected: PASS, all 3 tests.

- [ ] **Step 6: Write `DriverEarningsRuntime.tsx`**

```tsx
// apps/driver/src/features/earnings/DriverEarningsRuntime.tsx
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { createDriverWalletHttpAdapter } from '../wallet/adapter';
import { createDriverHistoryHttpAdapter } from '../history/adapter';
import { DriverEarningsScreen } from './DriverEarningsScreen';

export function DriverEarningsRuntime() {
  const walletAdapter = useMemo(() => createDriverWalletHttpAdapter(), []);
  const historyAdapter = useMemo(() => createDriverHistoryHttpAdapter(), []);

  const walletQuery = useQuery({
    queryKey: ['driver', 'wallet', 'summary'],
    queryFn: () => walletAdapter.getWalletSummary(),
  });
  const historyQuery = useQuery({
    queryKey: ['driver', 'order-history'],
    queryFn: () => historyAdapter.getHistory(),
  });

  const deliveredCount = (historyQuery.data?.items ?? []).filter((i) => i.status === 'DELIVERED').length;

  return (
    <DriverEarningsScreen
      availableBalanceVnd={walletQuery.data?.availableBalanceVnd ?? 0}
      deliveredOrderCount={walletQuery.data?.deliveredOrderCount ?? deliveredCount}
      isError={walletQuery.isError || historyQuery.isError}
      isLoading={walletQuery.isLoading || historyQuery.isLoading}
      lifetimeDeliveredVnd={walletQuery.data?.lifetimeDeliveredVnd ?? 0}
      onRetry={() => {
        void walletQuery.refetch();
        void historyQuery.refetch();
      }}
      totalOrderCount={historyQuery.data?.total ?? deliveredCount}
    />
  );
}
```

- [ ] **Step 7: Update the route file found in Step 1**

Same one-line swap pattern as Task 8 Step 7: change the import from `DriverEarningsScreen` to `DriverEarningsRuntime` (adjust the relative path to what Step 1 found) and render `<DriverEarningsRuntime />` instead of `<DriverEarningsScreen />`, keeping the file's existing default export function name unchanged.

- [ ] **Step 8: Run the driver suite and typecheck**

Run: `pnpm --filter driver test && pnpm --filter driver typecheck`
Expected: PASS, full suite green, no type errors.

- [ ] **Step 9: Commit**

```bash
git add apps/driver/src/features/earnings apps/driver/app
git commit -m "feat(driver): rewire DriverEarningsScreen to real revenue data, drop invented commission/tip/bonus"
```

---

## Task 10: Admin web — withdrawal review page

**Files:**
- Create: `apps/admin/src/features/admin/WithdrawalsScreen.tsx`
- Create: `apps/admin/src/features/admin/WithdrawalsScreen.test.tsx`
- Create: `apps/admin/src/app/(admin)/admin/withdrawals/page.tsx`

**Interfaces:**
- Consumes: `browserClient` (existing, from `apps/admin/src/lib/api/browser-client.ts`), `ApiError` (existing, from `apps/admin/src/lib/api/api-error.ts`), `AdminSurface` (existing, from `./AdminShared`) — the exact same three imports `DriverApplicationsScreen.tsx` uses.

- [ ] **Step 1: Write the failing test**

Mirror `DriverApplicationsScreen`'s existing test file structure — find it (`apps/admin/src/features/admin/DriverApplicationsScreen.test.tsx`, referenced in the file list at the top of this plan) and read it first to copy its exact mocking approach for `browserClient`, then write:

```tsx
// apps/admin/src/features/admin/WithdrawalsScreen.test.tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { WithdrawalsScreen } from './WithdrawalsScreen';
import { browserClient } from '../../lib/api/browser-client';

vi.mock('../../lib/api/browser-client', () => ({
  browserClient: { get: vi.fn(), post: vi.fn() },
}));

const pendingRequest = {
  id: 'wr-1',
  driverId: 'driver-1',
  amountVnd: 500000,
  status: 'PENDING',
  bankName: 'MB Bank',
  bankAccountNumber: '0987654321',
  bankAccountName: 'NGUYEN VAN A',
  createdAt: '2026-09-12T08:00:00.000Z',
};

describe('WithdrawalsScreen', () => {
  beforeEach(() => {
    vi.mocked(browserClient.get).mockResolvedValue([pendingRequest]);
    vi.mocked(browserClient.post).mockResolvedValue({ success: true });
  });

  it('lists pending withdrawal requests with bank details', async () => {
    render(<WithdrawalsScreen />);

    await waitFor(() => expect(screen.getByText('500.000 ₫')).toBeTruthy());
    expect(screen.getByText('MB Bank')).toBeTruthy();
    expect(screen.getByText(/0987654321/)).toBeTruthy();
  });

  it('approves a request after entering a note', async () => {
    render(<WithdrawalsScreen />);
    await waitFor(() => expect(screen.getByText('500.000 ₫')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Duyệt' }));
    fireEvent.change(screen.getByLabelText('Ghi chú duyệt'), {
      target: { value: 'Đã chuyển khoản thủ công' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận duyệt' }));

    await waitFor(() =>
      expect(browserClient.post).toHaveBeenCalledWith(
        '/admin/withdrawals/wr-1/approve',
        expect.objectContaining({ note: 'Đã chuyển khoản thủ công' }),
      ),
    );
  });

  it('rejects a note shorter than 5 characters without calling the API', async () => {
    render(<WithdrawalsScreen />);
    await waitFor(() => expect(screen.getByText('500.000 ₫')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Duyệt' }));
    fireEvent.change(screen.getByLabelText('Ghi chú duyệt'), { target: { value: 'ok' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận duyệt' }));

    expect(browserClient.post).not.toHaveBeenCalled();
    expect(screen.getByText('Lý do phải từ 5 ký tự trở lên')).toBeTruthy();
  });
});
```

(If `apps/admin` actually uses Jest rather than Vitest — confirm by reading `DriverApplicationsScreen.test.tsx`'s import line before writing this — swap `vi` for `jest` and the import source accordingly; do not assume.)

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- src/features/admin/WithdrawalsScreen.test.tsx`
Expected: FAIL — component doesn't exist.

- [ ] **Step 3: Implement `WithdrawalsScreen.tsx`**

```tsx
// apps/admin/src/features/admin/WithdrawalsScreen.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';

import { browserClient } from '../../lib/api/browser-client';
import { ApiError } from '../../lib/api/api-error';
import { AdminSurface } from './AdminShared';

interface WithdrawalRequestItem {
  id: string;
  driverId: string;
  amountVnd: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  createdAt: string;
}

function newRequestId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('vi-VN');
}

export function WithdrawalsScreen() {
  const [requests, setRequests] = useState<WithdrawalRequestItem[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<'approve' | 'reject' | null>(null);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoadState('loading');
    setErrorMsg(null);
    try {
      const data = await browserClient.get<WithdrawalRequestItem[]>('/admin/withdrawals');
      setRequests(data);
      setLoadState('ready');
    } catch (err) {
      setLoadState('error');
      setErrorMsg(err instanceof ApiError ? err.message : 'Không tải được danh sách yêu cầu rút tiền');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submitReview = useCallback(
    async (id: string, action: 'approve' | 'reject') => {
      if (note.trim().length < 5) {
        setErrorMsg('Lý do phải từ 5 ký tự trở lên');
        return;
      }
      setPendingId(id);
      setErrorMsg(null);
      try {
        await browserClient.post(`/admin/withdrawals/${id}/${action}`, {
          note: note.trim(),
          clientRequestId: newRequestId(),
        });
        setActiveActionId(null);
        setActiveAction(null);
        setNote('');
        await load();
      } catch (err) {
        setErrorMsg(err instanceof ApiError ? err.message : 'Xử lý yêu cầu thất bại');
      } finally {
        setPendingId(null);
      }
    },
    [load, note],
  );

  return (
    <div className="flex min-w-0 flex-col gap-lg">
      <header>
        <h1 className="text-page-title font-semibold">Yêu cầu rút tiền</h1>
        <p className="mt-xxs text-body-compact text-neutral-muted">
          Duyệt sau khi đã chuyển khoản thủ công cho tài xế, hoặc từ chối kèm lý do.
        </p>
      </header>

      {errorMsg ? (
        <p role="alert" className="rounded-control border border-neutral-border bg-neutral-surface px-sm py-xs text-body-compact text-neutral-text">
          {errorMsg}
        </p>
      ) : null}

      <AdminSurface ariaLabel="Danh sách yêu cầu rút tiền đang chờ" title="Đang chờ xử lý" description={`${requests.length} yêu cầu`}>
        {loadState === 'loading' ? (
          <p className="text-body-compact text-neutral-muted">Đang tải…</p>
        ) : loadState === 'error' ? (
          <button type="button" onClick={() => void load()} className="rounded-control border border-neutral-border px-sm py-xs text-body-compact font-semibold">
            Thử lại
          </button>
        ) : requests.length === 0 ? (
          <p className="text-body-compact text-neutral-muted">Không có yêu cầu nào đang chờ.</p>
        ) : (
          <ul className="flex flex-col gap-sm">
            {requests.map((req) => (
              <li key={req.id} className="rounded-card border border-neutral-border bg-neutral p-md">
                <div className="flex flex-wrap items-start justify-between gap-sm">
                  <dl className="grid grid-cols-2 gap-x-lg gap-y-xxs text-body-compact">
                    <dt className="text-neutral-muted">Số tiền</dt>
                    <dd className="font-semibold tabular-nums">{formatCurrency(req.amountVnd)}</dd>
                    <dt className="text-neutral-muted">Ngân hàng</dt>
                    <dd className="font-semibold">{req.bankName ?? '—'}</dd>
                    <dt className="text-neutral-muted">Số tài khoản</dt>
                    <dd className="font-semibold tabular-nums">{req.bankAccountNumber ?? '—'}</dd>
                    <dt className="text-neutral-muted">Chủ tài khoản</dt>
                    <dd className="font-semibold">{req.bankAccountName ?? '—'}</dd>
                    <dt className="text-neutral-muted">Yêu cầu lúc</dt>
                    <dd className="tabular-nums">{formatDate(req.createdAt)}</dd>
                  </dl>

                  <div className="flex flex-col gap-xs">
                    <button
                      type="button"
                      disabled={pendingId === req.id}
                      onClick={() => {
                        setActiveActionId(req.id);
                        setActiveAction('approve');
                        setNote('');
                      }}
                      className="rounded-control bg-brand px-md py-xs text-body-compact font-semibold text-white disabled:opacity-60"
                    >
                      Duyệt
                    </button>
                    <button
                      type="button"
                      disabled={pendingId === req.id}
                      onClick={() => {
                        setActiveActionId(req.id);
                        setActiveAction('reject');
                        setNote('');
                      }}
                      className="rounded-control border border-neutral-border px-md py-xs text-body-compact font-semibold disabled:opacity-60"
                    >
                      Từ chối
                    </button>
                  </div>
                </div>

                {activeActionId === req.id ? (
                  <div className="mt-sm flex flex-col gap-xs border-t border-neutral-border pt-sm">
                    <label className="text-body-compact font-semibold" htmlFor={`note-${req.id}`}>
                      {activeAction === 'approve' ? 'Ghi chú duyệt' : 'Ghi chú từ chối'}
                    </label>
                    <textarea
                      id={`note-${req.id}`}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="VD: Đã chuyển khoản thủ công qua MB Bank"
                      rows={2}
                      className="rounded-control border border-neutral-border px-sm py-xs text-body-compact"
                    />
                    <div className="flex gap-xs">
                      <button
                        type="button"
                        disabled={pendingId === req.id}
                        onClick={() => void submitReview(req.id, activeAction!)}
                        className="rounded-control bg-neutral-text px-md py-xs text-body-compact font-semibold text-white disabled:opacity-60"
                      >
                        {activeAction === 'approve' ? 'Xác nhận duyệt' : 'Xác nhận từ chối'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveActionId(null);
                          setActiveAction(null);
                          setNote('');
                        }}
                        className="rounded-control border border-neutral-border px-md py-xs text-body-compact"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </AdminSurface>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- src/features/admin/WithdrawalsScreen.test.tsx`
Expected: PASS, all 3 tests.

- [ ] **Step 5: Add the route**

```tsx
// apps/admin/src/app/(admin)/admin/withdrawals/page.tsx
import type { Metadata } from 'next';

import { WithdrawalsScreen } from '../../../../features/admin/WithdrawalsScreen';

export const metadata: Metadata = {
  title: 'Yêu cầu rút tiền — LEOPARD Operations',
};

export default function AdminWithdrawalsPage() {
  return <WithdrawalsScreen />;
}
```

Also add a nav-menu entry pointing to `/admin/withdrawals` wherever `driver-applications` is linked from the admin sidebar/nav (search `grep -rn "driver-applications" apps/admin/src` to find that nav config file and mirror the entry — read it first, don't guess the shape).

- [ ] **Step 6: Run the full admin suite and typecheck**

Run: `pnpm --filter web test && pnpm --filter web typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/admin/src/features/admin/WithdrawalsScreen.tsx apps/admin/src/features/admin/WithdrawalsScreen.test.tsx apps/admin/src/app/\(admin\)/admin/withdrawals
git commit -m "feat(admin): add withdrawal request review page (list/approve/reject)"
```

---

## Task 11: Full-repo verification gate

**Files:** none (verification only)

- [ ] **Step 1: Backend — full suite + typecheck**

```bash
pnpm --filter api test
pnpm --filter api typecheck
pnpm --filter api exec jest --config jest-e2e.config.cjs --forceExit --testPathIgnorePatterns="real-db|customer-orders|admin-command"
```
(The two excluded suites are pre-existing, unrelated timeouts in this environment per the prior session's findings — confirm they still fail the same way, not differently, if you re-include them.)

- [ ] **Step 2: Driver mobile — full suite + typecheck**

```bash
pnpm --filter driver test
pnpm --filter driver typecheck
```

- [ ] **Step 3: Admin web — full suite + typecheck**

```bash
pnpm --filter web test
pnpm --filter web typecheck
```

- [ ] **Step 4: Shared package**

```bash
pnpm --filter @leopard/shared test
```

- [ ] **Step 5: If a dev database is reachable, run the real migration gate**

```bash
pnpm --filter api db:migrate:test
```

- [ ] **Step 6: Manual smoke check (documented, not automated)**

Start the driver app and admin app dev servers, log in as a driver with at least one `DELIVERED` order (seed one if needed), open `/driver/earnings` and `/driver/wallet`, submit a withdrawal request, then log in as an admin, open `/admin/withdrawals`, approve it, and confirm the driver's wallet screen reflects the new `APPROVED` status and reduced available balance on next refresh.
