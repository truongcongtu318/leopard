# Business Model and Pricing Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển đổi mô hình LEOPARD sang 2-Sided Marketplace (Customer ⇄ Driver + Admin), phân hóa giá 4 loại xe (Ba gác, Van 500kg, Tải 1.25T, Tải 2.5T) dựa trên `cargoWeightKg` mà không sửa enum DB, cập nhật bảng giá thực tế, đồng bộ phụ phí bốc xếp và VAT, bổ sung hoa hồng sàn 15%.

**Architecture:** Giữ nguyên enum `VehicleType` = `['MOTORBIKE', 'VAN', 'TRUCK']` (Zero DB migration). Dùng ngưỡng `cargoWeightKg > 1250` trong `PricingService` để phân hóa xe tải 1.25T và 2.5T. Mở rộng `VehiclePricingRate` hỗ trợ `loadingFeeVnd`. Bổ sung `hasLoadingSupport` và `hasVatInvoice` vào DTO và `PricingService`. `Order` lưu breakdown cước phí vào `routeSnapshot`.

**Tech Stack:** NestJS, Prisma, PostgreSQL, Zod, React Native Expo, Jest.

**Spec:** `docs/product/01-vision-and-scope.md`, `docs/product/05-out-of-scope.md`, `docs/Hop_Dong_LEOPARD_MVP.md`

## Global Constraints

- Tiền tệ lưu số nguyên VND (`integer`, không float/double).
- Backend là single source of truth về giá; không tin cậy giá client gửi.
- Token `estimateToken` HMAC-SHA256 TTL 10 phút bảo vệ toàn vẹn toạ độ, cờ bốc xếp, VAT, khối lượng hàng.
- Database transaction bắt buộc cho đổi trạng thái đơn và xác nhận thanh toán.
- Giữ nguyên enum DB hiện tại: không chạy Prisma migration cho `VehicleType`.

---

### Task 1: Nâng cấp PricingService phân hóa 4 loại xe và phụ phí bốc xếp/VAT

**Files:**
- Modify: `apps/api/src/maps/domain/pricing.service.ts`
- Modify: `apps/api/src/config/env.schema.ts`
- Test: `apps/api/src/maps/domain/pricing.service.spec.ts`

**Interfaces:**
- Consumes: `PRICING_VEHICLE_RATES_JSON`, `PRICING_MINIMUM_FARE_VND`, `PRICING_STOP_SURCHARGE_VND`.
- Produces: `PricingQuote` mở rộng gồm `amountVnd`, `baseFareVnd`, `distanceFareVnd`, `stopFareVnd`, `loadingFeeVnd`, `vatFeeVnd`, `platformFeeVnd`, `driverPayoutVnd`.

- [ ] **Step 1: Viết test failing cho phân hóa tải trọng xe tải và phụ phí**

Mở `apps/api/src/maps/domain/pricing.service.spec.ts`:
```ts
it('differentiates 1.25T and 2.5T truck rates based on cargoWeightKg', () => {
  const service = new PricingService({
    minimumFareVnd: 50_000,
    stopSurchargeVnd: 30_000,
    vehicleRates: {
      MOTORBIKE: { baseFareVnd: 70_000, perKmVnd: 10_000, loadingFeeVnd: 60_000 },
      VAN: { baseFareVnd: 130_000, perKmVnd: 14_000, loadingFeeVnd: 100_000 },
      TRUCK: { baseFareVnd: 200_000, perKmVnd: 18_000, loadingFeeVnd: 150_000 },
    },
  });

  // Test tải 1.25T (cargoWeightKg <= 1250):
  const quote125T = service.quote({
    vehicleType: 'TRUCK',
    cargoWeightKg: 1250,
    distanceMeters: 10_000,
    stopCount: 1,
    hasLoadingSupport: true,
  });
  // base 200k + distance 180k + stop 30k = 410k + loading 150k = 560_000 ₫
  expect(quote125T.baseFareVnd).toBe(200_000);
  expect(quote125T.loadingFeeVnd).toBe(150_000);
  expect(quote125T.amountVnd).toBe(560_000);

  // Test tải 2.5T (cargoWeightKg > 1250):
  const quote25T = service.quote({
    vehicleType: 'TRUCK',
    cargoWeightKg: 2500,
    distanceMeters: 10_000,
    stopCount: 1,
    hasLoadingSupport: true,
  });
  // Xe 2.5T tự động áp mức cước cao: base 320k, 22k/km, loading 250k
  // base 320k + distance 220k + stop 30k = 570k + loading 250k = 820_000 ₫
  expect(quote25T.baseFareVnd).toBe(320_000);
  expect(quote25T.loadingFeeVnd).toBe(250_000);
  expect(quote25T.amountVnd).toBe(820_000);
});
```

- [ ] **Step 2: Chạy test xác nhận thất bại**

Run: `pnpm --filter api test -- src/maps/domain/pricing.service.spec.ts`
Expected: FAIL

- [ ] **Step 3: Triển khai logic tính cước mới**

Cập nhật `apps/api/src/maps/domain/pricing.service.ts`:
```ts
export interface PricingQuoteInput {
  vehicleType: string;
  distanceMeters: number;
  stopCount: number;
  cargoWeightKg?: number;
  hasLoadingSupport?: boolean;
  hasVatInvoice?: boolean;
}

// Trong hàm quote:
const isHeavyTruck = vehicleType === 'TRUCK' && (input.cargoWeightKg ?? 0) > 1250;
const baseFareVnd = isHeavyTruck ? 320_000 : rate.baseFareVnd;
const perKmVnd = isHeavyTruck ? 22_000 : rate.perKmVnd;
const defaultLoadingFee = isHeavyTruck ? 250_000 : (rate.loadingFeeVnd ?? 150_000);

const distanceFareVnd = Math.round((distanceMeters * perKmVnd) / 1_000);
const stopFareVnd = stopCount * this.config.stopSurchargeVnd;
const transportFareVnd = Math.max(baseFareVnd + distanceFareVnd + stopFareVnd, this.config.minimumFareVnd);
const loadingFeeVnd = input.hasLoadingSupport ? defaultLoadingFee : 0;
const subtotalVnd = transportFareVnd + loadingFeeVnd;
const vatFeeVnd = input.hasVatInvoice ? Math.round(subtotalVnd * 0.08) : 0;
const amountVnd = subtotalVnd + vatFeeVnd;

const platformFeeVnd = Math.round(transportFareVnd * 0.15);
const driverPayoutVnd = (transportFareVnd - platformFeeVnd) + loadingFeeVnd;
```

Cập nhật `apps/api/src/config/env.schema.ts` cho phép `loadingFeeVnd: nonNegativeIntegerSchema.optional()` trong schema JSON rate.

- [ ] **Step 4: Chạy test xác nhận pass**

Run: `pnpm --filter api test -- src/maps/domain/pricing.service.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit task**

```bash
git add apps/api/src/maps/domain/pricing.service.ts apps/api/src/maps/domain/pricing.service.spec.ts apps/api/src/config/env.schema.ts
git commit -m "feat(pricing): support weight-based heavy truck rate, loading fee, and vat"
```

---

### Task 2: Đồng bộ HMAC EstimateToken và REST API `/orders/estimate`

**Files:**
- Modify: `apps/api/src/maps/domain/estimate-token.service.ts`
- Modify: `apps/api/src/maps/maps.service.ts`
- Test: `apps/api/src/maps/domain/estimate-token.service.spec.ts`

**Interfaces:**
- Consumes: `PricingQuote` từ Task 1
- Produces: `estimateToken` ràng buộc HMAC cả `hasLoadingSupport`, `hasVatInvoice`, `cargoWeightKg`

- [ ] **Step 1: Viết test failing cho việc phát hiện gian lận cờ bốc xếp**

Mở `apps/api/src/maps/domain/estimate-token.service.spec.ts`:
```ts
it('rejects verification if client tampered with loading support or vat flags', () => {
  const token = service.issue({
    routeInput: { ...sampleInput, hasLoadingSupport: false, hasVatInvoice: false },
    estimate: sampleEstimate,
    quote: sampleQuote,
    routeId: 'route-0',
  });
  expect(() => {
    service.verify(token, { ...sampleInput, hasLoadingSupport: true, hasVatInvoice: false });
  }).toThrow(EstimateMismatchError);
});
```

- [ ] **Step 2: Chạy test xác nhận thất bại**

Run: `pnpm --filter api test -- src/maps/domain/estimate-token.service.spec.ts`
Expected: FAIL

- [ ] **Step 3: Cập nhật `estimate-token.service.ts`**

1. Trong `normalizeRouteInput()`:
   ```ts
   hasLoadingSupport: Boolean(input.hasLoadingSupport),
   hasVatInvoice: Boolean(input.hasVatInvoice),
   ```
2. Trong `verify()`: So khớp 2 cờ này giữa input yêu cầu và payload đã ký.
3. Trong `maps.service.ts`: Truyền `cargoWeightKg`, `hasLoadingSupport`, `hasVatInvoice` vào `pricingService.quote()`.

- [ ] **Step 4: Chạy test xác nhận pass**

Run: `pnpm --filter api test -- src/maps/domain/estimate-token.service.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit task**

```bash
git add apps/api/src/maps/domain/estimate-token.service.ts apps/api/src/maps/domain/estimate-token.service.spec.ts apps/api/src/maps/maps.service.ts
git commit -m "feat(maps): bind loading support and vat flags into signed estimate token"
```

---

### Task 3: Lưu chi tiết cước phí vào Order & Khấu trừ Payout Driver

**Files:**
- Modify: `apps/api/src/orders/dto/create-order.dto.ts`
- Modify: `apps/api/src/orders/orders.service.ts`
- Test: `apps/api/src/orders/customer-orders.e2e-spec.ts`

- [ ] **Step 1: Viết test failing cho việc tạo đơn có bốc xếp và VAT**

Mở `apps/api/src/orders/customer-orders.e2e-spec.ts`, kiểm tra `order.priceVnd` khớp tổng tiền quote và `routeSnapshot` lưu đầy đủ breakdown.

- [ ] **Step 2: Chạy test xác nhận thất bại**

Run: `pnpm --filter api test:e2e -- src/orders/customer-orders.e2e-spec.ts`
Expected: FAIL

- [ ] **Step 3: Triển khai lưu trữ breakdown**

1. Trong `create-order.dto.ts`: Thêm `hasLoadingSupport?: boolean;` và `hasVatInvoice?: boolean;`.
2. Trong `orders.service.ts`: Gán `priceVnd = verifiedEstimate.estimatedPriceVnd`, lưu chi tiết `{ baseFareVnd, loadingFeeVnd, vatFeeVnd, platformFeeVnd, driverPayoutVnd }` vào `routeSnapshot`.

- [ ] **Step 4: Chạy test xác nhận pass**

Run: `pnpm --filter api test:e2e -- src/orders/customer-orders.e2e-spec.ts`
Expected: PASS

- [ ] **Step 5: Commit task**

```bash
git add apps/api/src/orders/dto/create-order.dto.ts apps/api/src/orders/orders.service.ts
git commit -m "feat(orders): persist pricing breakdown and driver payout in order snapshot"
```

---

### Task 3B: Cho phép Tài xế xác nhận thu tiền mặt (Driver Cash Collection)

**Files:**
- Modify: `apps/api/src/payments/payments.service.ts`
- Modify: `apps/api/src/payments/payments.controller.ts`
- Test: `apps/api/src/payments/payments.service.spec.ts`

**Interfaces:**
- Method: `POST /driver/orders/:id/confirm-cash` (hoặc mở rộng `confirmPayment` cho phép Assigned Driver của đơn).
- Logic:
  1. Kiểm tra actor.role === 'DRIVER'.
  2. Kiểm tra tài xế có đang được gán (assigned) cho đơn `orderId` đó hay không.
  3. Tìm active `PaymentIntent` (hoặc tự tạo `PaymentIntent` nếu chưa có).
  4. Cập nhật trạng thái intent sang `PAID_MANUAL` với note: `Tài xế [name/phone] đã thu tiền mặt [amount] ₫`.
  5. Phát event thông báo và trigger hóa đơn GTGT.

- [ ] **Step 1: Viết test failing cho Driver confirm tiền mặt**

```ts
it('allows assigned driver to confirm cash payment on their active order', async () => {
  const driverActor = { userId: 'driver-1', role: 'DRIVER' as const };
  const res = await service.confirmCashPayment(driverActor, 'order-1', 'req-cash-1');
  expect(res.status).toBe('PAID_MANUAL');
  expect(res.confirmationNote).toContain('Tài xế đã thu tiền mặt');
});
```

- [ ] **Step 2: Chạy test xác nhận thất bại**

Run: `pnpm --filter api test -- src/payments/payments.service.spec.ts`
Expected: FAIL

- [ ] **Step 3: Triển khai logic trong `payments.service.ts` & `payments.controller.ts`**

Cho phép `confirmCashPayment` kiểm tra assignment của Driver trước khi chuyển `PAID_MANUAL`.

- [ ] **Step 4: Chạy test xác nhận pass**

Run: `pnpm --filter api test -- src/payments/payments.service.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit task**

```bash
git add apps/api/src/payments/payments.service.ts apps/api/src/payments/payments.controller.ts
git commit -m "feat(payments): allow assigned driver to confirm cash payment"
```

---

### Task 4: Cập nhật Bảng giá Vận hành Thực tế vào Môi trường `.env`

**Files:**
- Modify: `.env.example`
- Modify: `compose.yaml`

- [ ] **Step 1: Cập nhật cấu hình giá thực tế**

Cập nhật `.env.example`:
```bash
PRICING_MINIMUM_FARE_VND=70000
PRICING_STOP_SURCHARGE_VND=30000
PRICING_VEHICLE_RATES_JSON={"MOTORBIKE":{"baseFareVnd":70000,"perKmVnd":10000,"loadingFeeVnd":60000},"VAN":{"baseFareVnd":130000,"perKmVnd":14000,"loadingFeeVnd":100000},"TRUCK":{"baseFareVnd":200000,"perKmVnd":18000,"loadingFeeVnd":150000}}
```

- [ ] **Step 2: Chạy kiểm tra test suite backend**

Run: `pnpm --filter api test`
Expected: PASS

- [ ] **Step 3: Commit task**

```bash
git add .env.example compose.yaml
git commit -m "chore(config): update realistic logistics pricing rates"
```

---

### Task 5: Đồng bộ Mobile App Adapter & Phí bốc xếp động theo xe

**Files:**
- Modify: `apps/mobile/src/features/home/components/BookingDetailsModal.tsx`
- Modify: `apps/mobile/src/features/customer/orders/adapter.ts`
- Modify: `apps/mobile/src/features/home/HomeDashboardScreen.tsx`
- Test: `apps/mobile/src/features/home/components/BookingDetailsModal.test.tsx`

- [ ] **Step 1: Viết test failing cho modal bốc xếp**

Kiểm tra modal hiển thị phí bốc xếp tương ứng khi truyền loại xe (Ba gác: 60k, Van: 100k, Tải 1.25T: 150k, Tải 2.5T: 250k).

- [ ] **Step 2: Chạy test xác nhận thất bại**

Run: `pnpm --filter mobile test -- src/features/home/components/BookingDetailsModal.test.tsx`
Expected: FAIL

- [ ] **Step 3: Triển khai trên Mobile**

1. `HomeDashboardScreen.tsx`: Khi chọn xe, gán sẵn tải trọng:
   - `BIKE_3W`: Gửi `MOTORBIKE`
   - `VAN_500KG`: Gửi `VAN`
   - `TRUCK_125T`: Gửi `TRUCK` kèm `cargoWeightKg: 1250`
   - `TRUCK_25T`: Gửi `TRUCK` kèm `cargoWeightKg: 2500`
2. `BookingDetailsModal.tsx`: Đọc đúng phí bốc xếp theo xe đã chọn.
3. `adapter.ts`: Gửi cờ `hasLoadingSupport` và `hasVatInvoice` trong payload `POST /orders/estimate` và `POST /orders`.

- [ ] **Step 4: Chạy test xác nhận pass**

Run: `pnpm --filter mobile test -- src/features/home/components/BookingDetailsModal.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit task**

```bash
git add apps/mobile/src/features/home/components/BookingDetailsModal.tsx apps/mobile/src/features/customer/orders/adapter.ts apps/mobile/src/features/home/HomeDashboardScreen.tsx
git commit -m "feat(mobile): map fleet matrix to weight limits and dynamic loading fees"
```

---

### Task 6: Tinh gọn mô hình 2-Sided (Loại bỏ Fleet Owner khỏi luồng điều phối)

**Files:**
- Modify: `docs/product/05-out-of-scope.md`
- Modify: `apps/api/src/orders/orders.repository.ts`

- [ ] **Step 1: Đánh dấu FLEET_OWNER vào mục Out of scope**

Ghi nhận mô hình pilot tập trung Customer ⇄ Driver có Admin trực tiếp quản trị.

- [ ] **Step 2: Kiểm tra test điều phối tài xế tự do**

Run: `pnpm --filter api test:e2e -- src/orders/order-lifecycle.e2e-spec.ts`
Expected: PASS

- [ ] **Step 3: Commit task**

```bash
git add docs/product/05-out-of-scope.md apps/api/src/orders/orders.repository.ts
git commit -m "refactor(core): streamline dispatch to 2-sided marketplace model"
```

---

### Task 7: Luồng Số dư ví & Rút tiền tài xế về Ngân hàng (Driver Wallet & Payout)

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/drivers/wallet.service.ts`
- Create: `apps/api/src/drivers/wallet.controller.ts`
- Modify: `apps/driver/src/features/wallet/DriverWalletScreen.tsx`
- Modify: `apps/driver/src/features/earnings/DriverEarningsScreen.tsx`
- Modify: `apps/admin/src/features/admin/AdminOverviewScreen.tsx`
- Test: `apps/api/src/drivers/wallet.service.spec.ts`

**Interfaces:**
- `GET /api/v1/driver/wallet` ➔ `{ balanceVnd: number, bankInfo: { name, account, holder }, history: PayoutRequest[] }`
- `POST /api/v1/driver/payout` ➔ `{ amountVnd: number }` (Tạo lệnh rút tiền PENDING, trừ tạm thời balanceVnd)
- `POST /api/v1/admin/payouts/:id/approve` ➔ Admin xác nhận đã chuyển khoản thành công qua ngân hàng.

- [ ] **Step 1: Cập nhật Prisma Schema**

Thêm vào `DriverProfile`:
```prisma
balanceVnd         Int               @default(0)
bankName           String?           @db.VarChar(100)
bankAccountNumber  String?           @db.VarChar(50)
bankAccountName    String?           @db.VarChar(120)
payoutRequests     PayoutRequest[]
```

Tạo model `PayoutRequest`:
```prisma
enum PayoutStatus {
  PENDING
  APPROVED
  REJECTED
}

model PayoutRequest {
  id              String        @id @default(uuid()) @db.Uuid
  driverProfileId String        @db.Uuid
  amountVnd       Int
  status          PayoutStatus  @default(PENDING)
  bankName        String        @db.VarChar(100)
  bankAccountNumber String      @db.VarChar(50)
  bankAccountName String        @db.VarChar(120)
  processedAt     DateTime?     @db.Timestamptz(3)
  processedById   String?       @db.Uuid
  createdAt       DateTime      @default(now()) @db.Timestamptz(3)
  updatedAt       DateTime      @default(now()) @updatedAt @db.Timestamptz(3)
  driverProfile   DriverProfile @relation(fields: [driverProfileId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 2: Viết test failing cho WalletService**

Test tạo lệnh rút tiền, kiểm tra số dư khả dụng, từ chối nếu số dư không đủ.

- [ ] **Step 3: Triển khai WalletService & WalletController**

1. Tự động cộng tiền vào `DriverProfile.balanceVnd` khi đơn chuyển `DELIVERED`:
   `cộng tiền = driverPayoutVnd` (từ `routeSnapshot`).
2. Khi tài xế yêu cầu rút tiền: Kiểm tra `balanceVnd >= amountVnd`, trừ `balanceVnd`, tạo record `PayoutRequest` trạng thái `PENDING`.
3. Khi Admin bấm duyệt `approve`: Đổi trạng thái sang `APPROVED`. Nếu từ chối `reject`: hoàn lại `balanceVnd` cho tài xế.

- [ ] **Step 4: Nối API lên Mobile Driver (`DriverWalletScreen.tsx`)**

Thay thế mock data bằng gọi API `GET /driver/wallet` và gửi `POST /driver/payout`.

- [ ] **Step 5: Run tests & Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/src/drivers/ apps/driver/src/features/wallet/
git commit -m "feat(wallet): implement driver ledger balance and bank payout request flow"
```
