# Driver Wallet & Bank-Account Backend Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xóa trùng `GET /driver/wallet`, bổ sung bank fields vào summary, thêm endpoint cập nhật tài khoản ngân hàng.

**Architecture:** Giữ canonical `DriversController` + `WithdrawalsRepository` làm nguồn duy nhất; xóa legacy `WalletController`/`WalletService`/`PayoutRequest`; bank fields đọc/ghi trên `DriverProfile` (cột đã có sẵn, không migration).

**Tech Stack:** NestJS, Prisma/Postgres, Jest (`pnpm --filter api test -- <file>`), `pnpm --filter api typecheck/lint`.

**Spec:** `docs/api/01-rest-api-spec.md` (verify + bổ sung wallet/bank section trong Task 4); mobile consumer: `apps/driver/src/features/wallet/adapter.ts` (đã tương thích cả 2 shape, xóa fallback sau Task 1).

## Global Constraints

- Không làm việc trực tiếp trên `main`/`develop`; worktree hiện tại: `.worktrees/fix-driver-hardcoded-data`, nhánh `fix/driver-hardcoded-data`.
- Conventional Commits `fix(api): ...`; một task = một commit.
- Backend sở hữu business rules/pricing/lifecycle/authorization; kiểm tra role + ownership.
- Không thêm dependency mới; không migration mới (cột `DriverProfile.bankName/bankAccountNumber/bankAccountName` đã tồn tại).
- Mỗi task: TDD (test đỏ → code → test xanh), chạy đúng lệnh trong step, không claim pass khi chưa chạy.
- Không secret/PII trong code/fixture/log.

---

## File Map

- Xóa: `apps/api/src/drivers/wallet.controller.ts`, `apps/api/src/drivers/wallet.service.ts`, `apps/api/src/drivers/wallet.service.spec.ts`, `apps/api/src/drivers/dto/request-payout.dto.ts`
- Sửa: `apps/api/src/drivers/drivers.module.ts` (bỏ import/provider/controller legacy)
- Sửa: `apps/api/src/drivers/withdrawals.repository.ts` (summary + bank fields, `updateBankAccount`)
- Sửa: `apps/api/src/drivers/withdrawals.repository.spec.ts` (test summary bank + update)
- Sửa: `apps/api/src/drivers/drivers.service.ts` (thêm `updateBankAccount`)
- Mới: `apps/api/src/drivers/dto/update-bank-account.dto.ts` + `apps/api/src/drivers/drivers-bank.e2e-spec.ts`
- Sửa: `apps/api/src/drivers/drivers.controller.ts` (`PATCH wallet/bank`, cleanup route legacy nếu còn)
- Sửa: `apps/api/src/drivers/wallet.e2e-spec.ts` (assert shape mới + 404 legacy `POST /driver/payout`)
- Sửa: `docs/api/01-rest-api-spec.md` (ghi đúng 3 endpoint wallet + bank)

---

### Task 1: Xóa legacy wallet (trùng route + fallback bank giả)

**Files:**
- Delete: `apps/api/src/drivers/wallet.controller.ts`
- Delete: `apps/api/src/drivers/wallet.service.ts`
- Delete: `apps/api/src/drivers/wallet.service.spec.ts`
- Delete: `apps/api/src/drivers/dto/request-payout.dto.ts`
- Modify: `apps/api/src/drivers/drivers.module.ts:13,20,24,31,51` (bỏ `WalletController` import + khỏi `controllers`, bỏ `WalletService` import + khỏi `providers`/`exports`)
- Test: `apps/api/src/drivers/wallet.e2e-spec.ts` (thêm 2 test, chạy bằng `pnpm --filter api test -- src/drivers/wallet.e2e-spec.ts`)

**Interfaces:**
- Consumes: `DriversController` (`GET wallet`, `POST/GET wallet/withdrawals`), `WithdrawalsRepository.getWalletSummary`
- Produces: `GET /driver/wallet` duy nhất → canonical summary; `POST /driver/payout` → 404; `GET /driver/wallet` không còn field `balanceVnd`/`recentPayouts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/drivers/wallet.e2e-spec.ts — append inside describe('Driver Wallet API (E2E)')
it('returns the canonical summary shape, not the legacy balanceVnd shape', async () => {
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

it('returns 404 for the removed legacy POST /driver/payout', async () => {
  await request(app.getHttpServer())
    .post('/driver/payout')
    .set('Authorization', `Bearer ${driverSession.accessToken}`)
    .send({ amountVnd: 100000, clientRequestId: 'legacy-1' })
    .expect(404);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api test -- src/drivers/wallet.e2e-spec.ts`
Expected: FAIL — `GET /driver/wallet` trả legacy `{balanceVnd, recentPayouts}` (WalletController đăng ký trước nên thắng); `POST /driver/payout` trả 201 thay vì 404.

- [ ] **Step 3: Write minimal implementation**

```bash
git rm apps/api/src/drivers/wallet.controller.ts apps/api/src/drivers/wallet.service.ts apps/api/src/drivers/wallet.service.spec.ts apps/api/src/drivers/dto/request-payout.dto.ts
```

```ts
// apps/api/src/drivers/drivers.module.ts
import { DriversController } from './drivers.controller.js';
// (xóa dòng: import { WalletController } from './wallet.controller.js';)
// (xóa dòng: import { WalletService } from './wallet.service.js';)

@Module({
  imports: [AuthModule, DatabaseModule, OrdersModule, MediaModule, PdfModule],
  controllers: [DriversController], // xóa WalletController
  providers: [
    AccountStatusCache,
    DriversService,
    // ...giữ nguyên các provider khác, xóa dòng WalletService,
  ],
  exports: [
    DriversService,
    DriversRepository,
    WithdrawalsRepository,
    DriverDocumentService,
    DriverContractService,
    // xóa dòng WalletService,
  ],
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter api test -- src/drivers/wallet.e2e-spec.ts`
Expected: PASS (giữ nguyên cả file e2e cũ — các test summary/withdrawals hiện tại phải xanh với canonical route).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/drivers/drivers.module.ts apps/api/src/drivers/wallet.e2e-spec.ts
git commit -m "fix(api): remove legacy wallet controller shadowing canonical summary"
```

---

### Task 2: Summary kèm bank fields + updateBankAccount trong repository

**Files:**
- Modify: `apps/api/src/drivers/withdrawals.repository.ts:6-55` (mở rộng `WalletSummary`, đọc profile, thêm `updateBankAccount`)
- Test: `apps/api/src/drivers/withdrawals.repository.spec.ts`

**Interfaces:**
- Consumes: `PrismaService` (`order.findMany`, `withdrawalRequest.findMany`, `driverProfile.findUnique/update` — mock `InMemoryPrismaService` trong `apps/api/test/prisma-mock.ts` đã hỗ trợ cả 3)
- Produces: `WalletSummary { availableBalanceVnd, lifetimeDeliveredVnd, pendingWithdrawalVnd, deliveredOrderCount, bankName: string|null, bankAccountNumber: string|null, bankAccountName: string|null }`; `updateBankAccount(driverId, {bankName, bankAccountNumber, bankAccountName})` → `DriverProfile`

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/drivers/withdrawals.repository.spec.ts — append inside describe('WithdrawalsRepository')
it('includes the linked bank account from DriverProfile in the wallet summary', async () => {
  const { prisma, repo, driverId } = await setup();
  await prisma.order.create({ data: { customerId: 'c1', driverId, status: 'DELIVERED', priceVnd: 100000 } });
  await prisma.driverProfile.create({
    data: {
      userId: driverId,
      availability: 'OFFLINE',
      vehicleType: 'MOTORBIKE',
      bankName: 'MB Bank',
      bankAccountNumber: '0987654321',
      bankAccountName: 'NGUYEN VAN A',
    },
  });

  const summary = await repo.getWalletSummary(driverId);

  expect(summary.bankName).toBe('MB Bank');
  expect(summary.bankAccountNumber).toBe('0987654321');
  expect(summary.bankAccountName).toBe('NGUYEN VAN A');
});

it('returns null bank fields when no bank account is linked', async () => {
  const { repo, driverId } = await setup();

  const summary = await repo.getWalletSummary(driverId);

  expect(summary.bankName).toBeNull();
  expect(summary.bankAccountNumber).toBeNull();
  expect(summary.bankAccountName).toBeNull();
});

it('updates the linked bank account on DriverProfile', async () => {
  const { prisma, repo, driverId } = await setup();
  await prisma.driverProfile.create({
    data: { userId: driverId, availability: 'OFFLINE', vehicleType: 'MOTORBIKE' },
  });

  const updated = await repo.updateBankAccount(driverId, {
    bankName: 'Vietcombank',
    bankAccountNumber: '1012345678',
    bankAccountName: 'NGUYEN VAN A',
  });

  expect(updated.bankName).toBe('Vietcombank');
  expect(updated.bankAccountNumber).toBe('1012345678');
  expect(updated.bankAccountName).toBe('NGUYEN VAN A');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api test -- src/drivers/withdrawals.repository.spec.ts`
Expected: FAIL — `summary.bankName` undefined (interface chưa có field); `repo.updateBankAccount is not a function`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/api/src/drivers/withdrawals.repository.ts
export interface WalletSummary {
  readonly availableBalanceVnd: number;
  readonly lifetimeDeliveredVnd: number;
  readonly pendingWithdrawalVnd: number;
  readonly deliveredOrderCount: number;
  readonly bankName: string | null;
  readonly bankAccountNumber: string | null;
  readonly bankAccountName: string | null;
}

export interface UpdateBankAccountInput {
  readonly bankName: string;
  readonly bankAccountNumber: string;
  readonly bankAccountName: string;
}

async getWalletSummary(driverId: string): Promise<WalletSummary> {
  const [deliveredOrders, heldWithdrawals, profile] = await Promise.all([
    this.prisma.order.findMany({
      where: { driverId, status: 'DELIVERED' },
      select: { priceVnd: true },
    }),
    this.prisma.withdrawalRequest.findMany({
      where: { driverId, status: { in: ['PENDING', 'APPROVED'] } },
    }),
    // Cột bankName/bankAccountNumber/bankAccountName đã có trên DriverProfile
    // (schema.prisma:287-289) — không migration mới.
    this.prisma.driverProfile.findUnique({
      where: { userId: driverId },
      select: { bankName: true, bankAccountNumber: true, bankAccountName: true },
    }),
  ]);

  // ... giữ nguyên phần reduce hiện tại ...
  return {
    availableBalanceVnd: lifetimeDeliveredVnd - heldTotalVnd,
    lifetimeDeliveredVnd,
    pendingWithdrawalVnd,
    deliveredOrderCount: deliveredOrders.length,
    bankName: profile?.bankName ?? null,
    bankAccountNumber: profile?.bankAccountNumber ?? null,
    bankAccountName: profile?.bankAccountName ?? null,
  };
}

async updateBankAccount(driverId: string, input: UpdateBankAccountInput) {
  return this.prisma.driverProfile.update({
    where: { userId: driverId },
    data: {
      bankName: input.bankName,
      bankAccountNumber: input.bankAccountNumber,
      bankAccountName: input.bankAccountName,
    },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter api test -- src/drivers/withdrawals.repository.spec.ts`
Expected: PASS 7/7 (4 test cũ + 3 test mới). Lưu ý: mock `driverProfile.create` trong `prisma-mock.ts:311-324` không persist bank fields — test dùng object spread nên vẫn pass; nếu fail, truyền bank fields qua `update` sau `create` thay vì sửa mock.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/drivers/withdrawals.repository.ts apps/api/src/drivers/withdrawals.repository.spec.ts
git commit -m "fix(api): include linked bank account in wallet summary"
```

---

### Task 3: `PATCH /driver/wallet/bank` — DTO + service + route + e2e

**Files:**
- Create: `apps/api/src/drivers/dto/update-bank-account.dto.ts`
- Modify: `apps/api/src/drivers/drivers.service.ts:148-174` (thêm `updateBankAccount` ngay sau `requestWithdrawal`)
- Modify: `apps/api/src/drivers/drivers.controller.ts` (thêm route sau `GET wallet/withdrawals`, trước `POST orders/:id/accept`)
- Test: `apps/api/src/drivers/drivers-bank.e2e-spec.ts` (file mới, copy setup `wallet.e2e-spec.ts:26-53`)

**Interfaces:**
- Consumes: `WithdrawalsRepository.updateBankAccount` (Task 2), `RequireRoles('DRIVER')` (pattern như route wallet hiện tại)
- Produces: `PATCH /driver/wallet/bank` nhận `{bankName, bankAccountNumber, bankAccountName}` → 200 + profile đã cập nhật; CUSTOMER → 403; thiếu field → 400; mobile gọi endpoint này cho màn liên kết bank

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/drivers/drivers-bank.e2e-spec.ts
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

describe('Driver Bank Account API (E2E)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeEach(async () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'test',
      AUTH_DEMO_LOGIN_ENABLED: 'true',
      AUTH_ACCESS_TOKEN_SECRET: 'test-access-token-secret',
      AUTH_REFRESH_TOKEN_SECRET: 'test-refresh-token-secret',
    };
    const prismaMock = new InMemoryPrismaService();
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
    const driver = await prismaMock.user.create({ data: { phone: '+84911113333', role: 'DRIVER', status: 'ACTIVE' } });
    await prismaMock.driverProfile.create({ data: { userId: driver.id, availability: 'OFFLINE', vehicleType: 'MOTORBIKE' } });
    const session = await refreshSessions.create(driver.id);
    accessToken = tokenService.createAuthSession(driver, session).accessToken;
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  it('updates the linked bank account and reflects it in the wallet summary', async () => {
    await request(app.getHttpServer())
      .patch('/driver/wallet/bank')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        bankName: 'MB Bank',
        bankAccountNumber: '0987654321',
        bankAccountName: 'NGUYEN VAN A',
      })
      .expect(200);

    const summary = await request(app.getHttpServer())
      .get('/driver/wallet')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(summary.body.bankName).toBe('MB Bank');
    expect(summary.body.bankAccountNumber).toBe('0987654321');
    expect(summary.body.bankAccountName).toBe('NGUYEN VAN A');
  });

  it('rejects a bank update with a missing account number via 400', async () => {
    await request(app.getHttpServer())
      .patch('/driver/wallet/bank')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ bankName: 'MB Bank', bankAccountName: 'NGUYEN VAN A' })
      .expect(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api test -- src/drivers/drivers-bank.e2e-spec.ts`
Expected: FAIL — 404 (route chưa tồn tại).

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/api/src/drivers/dto/update-bank-account.dto.ts
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateBankAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  bankName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  bankAccountNumber!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  bankAccountName!: string;
}
```

```ts
// apps/api/src/drivers/drivers.service.ts — thêm sau requestWithdrawal (dòng 174)
async updateBankAccount(actor: AuthenticatedActor, dto: UpdateBankAccountDto) {
  return this.withdrawalsRepository.updateBankAccount(actor.userId, {
    bankName: dto.bankName.trim(),
    bankAccountNumber: dto.bankAccountNumber.trim(),
    bankAccountName: dto.bankAccountName.trim().toUpperCase(),
  });
}
```

```ts
// apps/api/src/drivers/drivers.controller.ts — import + route
import { Patch } from '@nestjs/common'; // kiểm tra đã có (dòng 1-16): có Patch
import { UpdateBankAccountDto } from './dto/update-bank-account.dto.js';

@Patch('wallet/bank')
@RequireRoles('DRIVER')
updateBankAccount(
  @CurrentUser() actor: AuthenticatedActor,
  @Body() dto: UpdateBankAccountDto,
) {
  return this.driversService.updateBankAccount(actor, dto);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter api test -- src/drivers/drivers-bank.e2e-spec.ts`
Expected: PASS 2/2.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/drivers/dto/update-bank-account.dto.ts apps/api/src/drivers/drivers.service.ts apps/api/src/drivers/drivers.controller.ts apps/api/src/drivers/drivers-bank.e2e-spec.ts
git commit -m "feat(api): add PATCH driver wallet bank account endpoint"
```

---

### Task 4: Docs + full gate + dọn fallback mobile

**Files:**
- Modify: `docs/api/01-rest-api-spec.md` (section wallet/driver — ghi đúng 3 endpoint + bank shape)
- Modify: `apps/driver/src/features/wallet/adapter.ts` (xóa legacy `balanceVnd/recentPayouts` fallback đã thêm tạm trong Task 2 mobile)
- Test: full gate (lệnh dưới)

**Interfaces:**
- Consumes: kết quả Task 1-3
- Produces: spec khớp implementation; mobile đọc đúng 1 shape canonical; gate xanh

- [ ] **Step 1: Cập nhật REST spec**

Mở `docs/api/01-rest-api-spec.md`, tìm section driver wallet (grep `wallet`): xóa mọi dòng `GET /driver/wallet → {balanceVnd, recentPayouts}` và `POST /driver/payout`; thay bằng:

```markdown
- `GET /driver/wallet` (DRIVER) → `{ availableBalanceVnd, lifetimeDeliveredVnd, pendingWithdrawalVnd, deliveredOrderCount, bankName: string|null, bankAccountNumber: string|null, bankAccountName: string|null }`
- `POST /driver/wallet/withdrawals` (DRIVER) body `{ amountVnd, bankName, bankAccountNumber, bankAccountName, clientRequestId? }` → 201 withdrawal (idempotent theo clientRequestId, 409 INSUFFICIENT_BALANCE)
- `GET /driver/wallet/withdrawals?page=&pageSize=` (DRIVER) → `{ items, total, page, pageSize, totalPages }`
- `PATCH /driver/wallet/bank` (DRIVER) body `{ bankName, bankAccountNumber, bankAccountName }` → 200 profile đã cập nhật
```

- [ ] **Step 2: Xóa fallback legacy trong mobile adapter**

Trong `apps/driver/src/features/wallet/adapter.ts`: xóa fields `balanceVnd`/`recentPayouts` khỏi `DriverWalletSummaryResponse`, xóa khối `pendingFromRecent/approvedFromRecent`, `getWalletSummary` chỉ đọc 4 aggregate + 3 bank fields (BE giờ trả đúng 1 shape). Xóa test `getWalletSummary falls back to legacy balanceVnd+recentPayouts shape` trong `adapter.test.ts` (BE không còn trả shape đó).

- [ ] **Step 3: Chạy full gate**

```bash
pnpm --filter api test -- src/drivers/ src/admin/admin-withdrawals.e2e-spec.ts src/admin/admin-withdrawal-review.service.spec.ts src/orders/update-order-status.service.spec.ts
pnpm --filter api typecheck
pnpm --filter api lint
```

Expected: tất cả PASS; `typecheck`/`lint` không lỗi mới. Nếu `admin-withdrawals` fail vì thiếu legacy route — đọc lỗi, admin flow dùng `WithdrawalRequest` (không qua WalletService) nên phải xanh; chỉ sửa test admin nếu nó assert legacy shape đã xóa.

- [ ] **Step 4: Chạy lại mobile wallet tests sau khi xóa fallback**

Run: `pnpm --filter driver test -- src/features/wallet/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/api/01-rest-api-spec.md apps/driver/src/features/wallet/adapter.ts apps/driver/src/features/wallet/adapter.test.ts
git commit -m "docs(api): document canonical wallet and bank endpoints, drop mobile legacy fallback"
```

---

## Self-Review

- Spec coverage: trùng route (Task 1) → mobile đọc sai shape; summary thiếu bank (Task 2) → màn bank trống; không endpoint cập nhật bank (Task 3) → driver không liên kết được; docs + gate (Task 4).
- Placeholder scan: không TBD/TODO; mọi step có code + lệnh + expected cụ thể; tên file/dòng chính xác theo code đã đọc (controller/service/repository/DTO/mock/spec).
- Type consistency: `WalletSummary` (+3 bank fields `string|null`) dùng xuyên Task 1-3; `UpdateBankAccountInput` (repository) vs `UpdateBankAccountDto` (controller) phân biệt rõ; mobile `WalletSummary` khớp sau Task 4 Step 2.
