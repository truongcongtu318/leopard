# Driver Wallet Top-up & 20% Platform Fee Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai tính năng nạp tiền ví tài xế qua VietQR payOS và áp dụng phí sàn 20% vào công thức tính số dư ví tài xế.

**Architecture:** Mở rộng Prisma schema với model `DriverDeposit`, bổ sung endpoint `POST /driver/wallet/topup`, mở rộng `PaymentWebhookService` để xử lý webhook payOS cho cả nạp ví và đơn hàng, cập nhật repository tính toán ví `WithdrawalsRepository`, và bổ sung UI Nạp tiền ví trên App Driver.

**Tech Stack:** NestJS, Prisma ORM, PostgreSQL, `@payos/node`, React Native Expo Router, React Query.

**Spec:** `docs/superpowers/specs/2026-09-18-driver-wallet-topup-design.md`

## Global Constraints
- Phí sàn cố định: 20% (`PLATFORM_COMMISSION_RATE = 0.2`).
- Nạp tiền tối thiểu: 50.000 VNĐ.
- Tuyệt đối tuân thủ Database Transaction và Idempotency (`clientRequestId`).

---

### Task 1: Prisma Schema & Migration cho DriverDeposit

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create migration: `apps/api/prisma/migrations/20260918110000_add_driver_deposit/migration.sql`

- [ ] **Step 1: Cập nhật schema.prisma**
Thêm enum `DepositStatus` và model `DriverDeposit`, quan hệ trong model `User`.
- [ ] **Step 2: Tạo migration SQL và generate Prisma Client**
Chạy `pnpm --filter api prisma generate` và áp dụng migration.
- [ ] **Step 3: Commit migration**

---

### Task 2: Cập nhật công thức tính ví trong WithdrawalsRepository

**Files:**
- Modify: `apps/api/src/drivers/withdrawals.repository.ts`
- Test: `apps/api/src/drivers/withdrawals.repository.spec.ts`

- [ ] **Step 1: Viết test cho công thức tính ví mới (20% phí sàn cho đơn CASH, 80% cho đơn VIETQR, cộng tiền nạp COMPLETED)**
- [ ] **Step 2: Cập nhật logic `getWalletSummary` trong `WithdrawalsRepository`**
- [ ] **Step 3: Chạy test repository để đảm bảo pass 100%**
- [ ] **Step 4: Commit**

---

### Task 3: Thêm Endpoint Nạp tiền Ví `POST /driver/wallet/topup` & Webhook payOS

**Files:**
- Create: `apps/api/src/drivers/dto/topup-wallet.dto.ts`
- Modify: `apps/api/src/drivers/drivers.service.ts`
- Modify: `apps/api/src/drivers/drivers.controller.ts`
- Modify: `apps/api/src/payments/payment-webhook.service.ts`
- Test: `apps/api/src/payments/payment-webhook.service.spec.ts`

- [ ] **Step 1: Viết DTO và test service nạp tiền ví**
- [ ] **Step 2: Triển khai endpoint tạo QR nạp ví gọi `PayOsPaymentProvider`**
- [ ] **Step 3: Mở rộng `PaymentWebhookService` để nhận biết nạp ví và chuyển trạng thái `COMPLETED`**
- [ ] **Step 4: Chạy test unit và E2E**
- [ ] **Step 5: Commit**

---

### Task 4: Giao diện Nạp tiền ví trên App Driver

**Files:**
- Modify: `apps/driver/src/features/wallet/DriverWalletScreen.tsx`
- Modify: `apps/driver/src/features/wallet/DriverWalletRuntime.tsx`
- Modify: `apps/driver/src/features/wallet/adapter.ts`
- Test: `apps/driver/src/features/wallet/DriverWalletScreen.test.tsx`

- [ ] **Step 1: Thêm phương thức `topupWallet` vào adapter**
- [ ] **Step 2: Thiết kế UI nút "Nạp tiền ví", modal chọn mệnh giá (50k, 100k, 200k, 500k) và hiển thị VietQR payOS**
- [ ] **Step 3: Cập nhật test UI đảm bảo tương tác mượt mà**
- [ ] **Step 4: Commit**
