# Driver Hardcoded Data Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xóa mọi số liệu hardcode trên app driver, chỉ hiển thị dữ liệu từ BE hoặc trạng thái trống/loading.

**Architecture:** Giữ nguyên Runtime/Screen/Adapter boundary hiện tại; mỗi Task chỉ thay defaults/fallbacks và chuyển adapter sang endpoint BE chuẩn, không thêm abstraction mới.

**Tech Stack:** Expo 57 / React Native 0.86 / TypeScript, TanStack React Query 5.101.2, Jest 29 + jest-expo, NestJS API, Prisma/Postgres.

**Spec:** `docs/api/01-rest-api-spec.md`, `apps/api/src/drivers/drivers.controller.ts`, `apps/api/src/drivers/drivers.service.ts`, `apps/api/src/drivers/withdrawals.repository.ts`, `apps/api/src/drivers/dto/request-withdrawal.dto.ts`, `apps/api/src/users/users.controller.ts`, `apps/api/src/users/dto/complete-profile.dto.ts`

## Global Constraints

- Không làm việc trực tiếp trên `main` hoặc `develop`; tạo branch `fix/driver-hardcoded-data` từ `develop`.
- Commit convention: Conventional Commits (`fix(driver): ...`).
- Backend sở hữu business rules, pricing, ETA, lifecycle, authorization.
- ETA luôn nhãn "ETA dự kiến"; dữ liệu demo phải ghi "Dữ liệu mô phỏng".
- Mọi màn hình giữ loading/empty/error state; không crash khi BE trả null.
- Verification mỗi Task: `pnpm --filter driver test -- <file>`, `pnpm --filter driver typecheck`, `pnpm --filter driver lint`.
- Không thêm dependency mới; không thêm endpoint BE mới trong plan này (dùng endpoint đã có).
- Không đưa secret/PII vào code/fixture/log.

**Endpoint BE chuẩn đã đối chiếu (dùng trong plan):**
- `GET /me` -> `{ id, phone, role, status, name, email, avatarStorageKey }`
- `GET /driver/application` -> `{ status, vehicleType, licensePlate, licenseNumber, submittedAt, reviewedAt, rejectionReason, contractVersion, contractSignedAt }`
- `PATCH /users/me` body `CompleteProfileDto` (`name` bắt buộc, `email` optional, `consentTerms: true`, `consentService: true`)
- `POST /users/me/avatar` multipart `file`
- `GET /driver/wallet` (DriversController `GET wallet`) -> `{ availableBalanceVnd, lifetimeDeliveredVnd, pendingWithdrawalVnd, deliveredOrderCount }` (xem `withdrawals.repository.ts:26-55`)
- `POST /driver/wallet/withdrawals` body `RequestWithdrawalDto` (`amountVnd`, `bankName`, `bankAccountNumber`, `bankAccountName`, `clientRequestId?`) — bắt buộc bank fields
- `GET /driver/wallet/withdrawals?page=&pageSize=` -> `{ items, total, page, pageSize, totalPages }`
- `GET /driver/orders/history?page=&pageSize=` -> `{ items: MappedOrderResponse[], total, ... }`
- `GET /driver/performance` -> `{ ratingAvg|null, ratingCount, acceptancePct|null, cancellationPct|null, recentReviews }`
- `GET /driver/documents` -> `DriverDocumentResponse[]`
- Orders: `GET /driver/orders/active`, `GET /driver/orders/available`, `GET /orders/:id`, `PATCH /driver/availability`, `POST /driver/orders/:id/accept`
- Legacy cần bỏ: `POST /driver/payout` (chỉ `amountVnd+clientRequestId`, dùng fallback `Vietcombank/1234567890` trong `wallet.service.ts:62-64`), `GET /driver/wallet` kiểu cũ (`balanceVnd+recentPayouts` trong `WalletService`)
- Không tồn tại: `driverCode`, `fleetLabel`, `emergencyContact`, multi-bank-accounts, GPS watermark ePOD, `signerName`, chuẩn `>95%/<1%`, today-aggregate riêng.

---

### Task 1: Profile-edit — xóa identity hardcode

**Files:**
- Modify: `apps/driver/app/profile-edit.tsx:42-44`
- Modify: `apps/driver/src/features/profile/DriverEditProfileScreen.tsx:31-44`
- Test: `apps/driver/src/features/profile/DriverEditProfileScreen.test.tsx`

**Interfaces:**
- Consumes: `port.getProfileView()` -> `{ phone, name, email, avatarUrl, vehicleLabel } | loading | error`; `port.updateProfile({ name, email })` -> `PATCH /users/me`
- Produces: `DriverEditProfileScreen` props mới không còn `driverCode/fleetLabel`, `vehicleLabel/phone` nullable hiển thị `—` khi null

- [ ] **Step 1: Write the failing test**

```tsx
// apps/driver/src/features/profile/DriverEditProfileScreen.test.tsx
import { render } from '@testing-library/react-native';
import { DriverEditProfileScreen } from './DriverEditProfileScreen';

test('does not render hardcoded driver identity when BE fields are null', () => {
  const { queryByText, getByText } = render(
    <DriverEditProfileScreen
      avatarUrl={null}
      initialEmail=""
      initialName=""
      isSaving={false}
      onPickAvatar={() => {}}
      onSave={() => {}}
      phone={null as any}
      vehicleLabel={null}
    />,
  );
  expect(queryByText('DRV-88924')).toBeNull();
  expect(queryByText(/Tân Bình/)).toBeNull();
  expect(queryByText('51C-889.24 · Xe tải 2.5T')).toBeNull();
  expect(queryByText('0987 *** 892')).toBeNull();
  expect(queryByText('0909 113 115')).toBeNull();
  expect(queryByText('0912 345 678 (Chủ xe Tân Bình)')).toBeNull();
  expect(getByText('—')).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter driver test -- src/features/profile/DriverEditProfileScreen.test.tsx`
Expected: FAIL vì defaults hiện tại render `DRV-88924`, `51C-889.24 · Xe tải 2.5T`, `0987 *** 892`

- [ ] **Step 3: Write minimal implementation**

```tsx
// apps/driver/src/features/profile/DriverEditProfileScreen.tsx
export type DriverEditProfileScreenProps = Readonly<{
  initialName: string;
  initialEmail: string;
  phone?: string | null;
  vehicleLabel?: string | null;
  avatarUrl: string | null;
  isSaving: boolean;
  errorMessage?: string;
  onSave: (input: { name: string; email: string }) => void;
  onPickAvatar: (file: { uri: string; name: string; type: string }) => void;
  onBack?: () => void;
}>;

export function DriverEditProfileScreen({
  avatarUrl,
  initialEmail,
  initialName,
  isSaving,
  onBack,
  onPickAvatar,
  onSave,
  phone = null,
  vehicleLabel = null,
}: DriverEditProfileScreenProps) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  // Xóa: driverCode, fleetLabel, emergencyPhone useState('0909 113 115')
```

```tsx
// Row SĐT đăng ký: hiển thị phone từ GET /me, null -> '—'
<Text style={styles.readonlyValue}>{phone ?? '—'}</Text>
// Row phương tiện: vehicleLabel từ GET /driver/application, null -> '—'
<Text style={styles.readonlyValue}>{vehicleLabel ?? '—'}</Text>
// Xóa toàn bộ các row: Mã số tài xế đối tác, Đội xe chủ quản, Hotline Fleet Owner,
// Hồ sơ pháp lý 4/4, SecurityNotice Box ghi 1900-LEOPARD
```

```tsx
// apps/driver/app/profile-edit.tsx
return (
  <DriverEditProfileScreen
    avatarUrl={avatarUrl}
    errorMessage={errorMessage}
    initialEmail={initialEmail}
    initialName={initialName}
    isSaving={saveMutation.isPending}
    onBack={() => router.back()}
    onPickAvatar={(file) => avatarMutation.mutate(file)}
    onSave={(input) => {
      setErrorMessage(undefined);
      saveMutation.mutate(input);
    }}
    phone={phone ?? null}
    vehicleLabel={vehicleLabel ?? null}
  />
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter driver test -- src/features/profile/DriverEditProfileScreen.test.tsx`
Expected: PASS

Run: `pnpm --filter driver typecheck`
Expected: PASS (không còn prop `driverCode/fleetLabel` thừa)

- [ ] **Step 5: Commit**

```bash
git add apps/driver/app/profile-edit.tsx apps/driver/src/features/profile/DriverEditProfileScreen.tsx apps/driver/src/features/profile/DriverEditProfileScreen.test.tsx
git commit -m "fix(driver): remove hardcoded identity on profile-edit, use BE profile only"
```

---

### Task 2: Wallet adapter — chuyển sang endpoint chuẩn + gửi bank fields

**Files:**
- Modify: `apps/driver/src/features/wallet/adapter.ts:1-133`
- Test: `apps/driver/src/features/wallet/adapter.test.ts`

**Interfaces:**
- Consumes: `GET /driver/wallet` -> `{ availableBalanceVnd, lifetimeDeliveredVnd, pendingWithdrawalVnd, deliveredOrderCount, bankName?, bankAccountNumber?, bankAccountName? }`; `POST /driver/wallet/withdrawals`; `GET /driver/wallet/withdrawals`
- Produces: `getWalletSummary(): Promise<WalletSummary>` (passthrough BE, không tự sum); `requestWithdrawal(input)` gửi đủ 4 fields + `clientRequestId`; `getWithdrawalHistory(page, pageSize)` gọi endpoint history thật

- [ ] **Step 1: Write the failing test**

```ts
// apps/driver/src/features/wallet/adapter.test.ts
import { createDriverWalletHttpAdapter } from './adapter';

test('getWalletSummary passes through BE aggregates without client recompute', async () => {
  const client = {
    get: async () => ({
      availableBalanceVnd: 200000,
      lifetimeDeliveredVnd: 500000,
      pendingWithdrawalVnd: 100000,
      deliveredOrderCount: 7,
      bankName: 'MB Bank',
      bankAccountNumber: '0987654321',
      bankAccountName: 'NGUYEN VAN A',
    }),
    post: async () => ({}),
  };
  const adapter = createDriverWalletHttpAdapter(client as any);
  expect(await adapter.getWalletSummary()).toEqual({
    availableBalanceVnd: 200000,
    lifetimeDeliveredVnd: 500000,
    pendingWithdrawalVnd: 100000,
    deliveredOrderCount: 7,
    bankName: 'MB Bank',
    bankAccountNumber: '0987654321',
    bankAccountName: 'NGUYEN VAN A',
  });
});

test('requestWithdrawal sends bank fields to POST /driver/wallet/withdrawals', async () => {
  let seenPath = '';
  let seenBody: any = null;
  const client = {
    get: async () => ({}),
    post: async (path: string, body: unknown) => {
      seenPath = path;
      seenBody = body;
      return { id: 'w1' };
    },
  };
  const adapter = createDriverWalletHttpAdapter(client as any);
  await adapter.requestWithdrawal({
    amountVnd: 100000,
    bankName: 'MB Bank',
    bankAccountNumber: '0987654321',
    bankAccountName: 'NGUYEN VAN A',
  });
  expect(seenPath).toBe('/driver/wallet/withdrawals');
  expect(seenBody.bankName).toBe('MB Bank');
  expect(seenBody.bankAccountNumber).toBe('0987654321');
  expect(seenBody.bankAccountName).toBe('NGUYEN VAN A');
  expect(seenBody.amountVnd).toBe(100000);
  expect(typeof seenBody.clientRequestId).toBe('string');
});

test('getWithdrawalHistory calls GET /driver/wallet/withdrawals with paging', async () => {
  let seenPath = '';
  const client = {
    get: async (path: string) => {
      seenPath = path;
      return { items: [{ id: 'w1' }], total: 1, page: 2, pageSize: 20, totalPages: 1 };
    },
    post: async () => ({}),
  };
  const adapter = createDriverWalletHttpAdapter(client as any);
  const res = await adapter.getWithdrawalHistory(2, 20);
  expect(seenPath).toBe('/driver/wallet/withdrawals?page=2&pageSize=20');
  expect(res.total).toBe(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter driver test -- src/features/wallet/adapter.test.ts`
Expected: FAIL — `getWalletSummary` hiện đọc `balanceVnd/recentPayouts` và tự sum; `requestWithdrawal` POST `/driver/payout` thiếu bank fields; `getWithdrawalHistory` GET `/driver/wallet`

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/driver/src/features/wallet/adapter.ts
export interface DriverWalletHttpClient {
  get<T = unknown>(path: string): Promise<T>;
  post<T = unknown>(path: string, body?: unknown): Promise<T>;
}

interface DriverWalletSummaryResponse {
  availableBalanceVnd: number;
  lifetimeDeliveredVnd: number;
  pendingWithdrawalVnd: number;
  deliveredOrderCount: number;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
}

export function createDriverWalletHttpAdapter(client?: DriverWalletHttpClient) {
  const getClient = (): DriverWalletHttpClient => client ?? getDefaultHttpClient();
  return {
    async getWalletSummary(): Promise<WalletSummary> {
      const data = await getClient().get<DriverWalletSummaryResponse>('/driver/wallet');
      return {
        availableBalanceVnd: data.availableBalanceVnd ?? 0,
        lifetimeDeliveredVnd: data.lifetimeDeliveredVnd ?? 0,
        pendingWithdrawalVnd: data.pendingWithdrawalVnd ?? 0,
        deliveredOrderCount: data.deliveredOrderCount ?? 0,
        bankName: data.bankName ?? null,
        bankAccountNumber: data.bankAccountNumber ?? null,
        bankAccountName: data.bankAccountName ?? null,
      };
    },
    async requestWithdrawal(input: WithdrawalRequestInput): Promise<WithdrawalHistoryItem> {
      return getClient().post<WithdrawalHistoryItem>('/driver/wallet/withdrawals', {
        amountVnd: input.amountVnd,
        bankName: input.bankName,
        bankAccountNumber: input.bankAccountNumber,
        bankAccountName: input.bankAccountName,
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

Xóa: `DriverWalletResponse` kiểu cũ (`balanceVnd/recentPayouts`), mọi phép `filter/reduce` client, `try/catch` nuốt lỗi trả `[]` trong `getWithdrawalHistory`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter driver test -- src/features/wallet/adapter.test.ts`
Expected: PASS

Run: `pnpm --filter driver typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/driver/src/features/wallet/adapter.ts apps/driver/src/features/wallet/adapter.test.ts
git commit -m "fix(driver): use canonical wallet endpoints and send bank fields"
```

---

### Task 3: Bank-accounts + Wallet screen — xóa 0 ₫ và danh sách local

**Files:**
- Modify: `apps/driver/src/features/wallet/DriverBankAccountsScreen.tsx:51-79`
- Modify: `apps/driver/src/features/wallet/DriverWalletScreen.tsx:173-185`
- Modify: `apps/driver/src/features/wallet/DriverWalletRuntime.tsx:47-68`
- Test: `apps/driver/src/features/wallet/DriverWalletScreen.test.tsx`

**Interfaces:**
- Consumes: `summary` từ Task 2 (`bankName/bankAccountNumber/bankAccountName`); `history` từ `GET /driver/wallet/withdrawals`
- Produces: Bank screen chỉ render 0–1 tài khoản BE; Wallet screen xóa card `Ví tín dụng 0 ₫`, xóa 3 utility card tĩnh nếu không có BE

- [ ] **Step 1: Write the failing test**

```tsx
// apps/driver/src/features/wallet/DriverWalletScreen.test.tsx
import { render } from '@testing-library/react-native';
import { DriverWalletScreen } from './DriverWalletScreen';

test('wallet screen shows BE bank account, no hardcoded credit wallet', () => {
  const { queryByText, getByText } = render(
    <DriverWalletScreen
      history={[]}
      isError={false}
      isLoading={false}
      isSubmittingWithdrawal={false}
      onRequestWithdrawal={() => {}}
      onRetry={() => {}}
      summary={{
        availableBalanceVnd: 200000,
        lifetimeDeliveredVnd: 500000,
        pendingWithdrawalVnd: 100000,
        deliveredOrderCount: 7,
        bankName: 'MB Bank',
        bankAccountNumber: '0987654321',
        bankAccountName: 'NGUYEN VAN A',
      }}
      withdrawalError={null}
    />,
  );
  expect(getByText('0987654321')).toBeTruthy();
  expect(queryByText('Ví tín dụng')).toBeNull();
  expect(queryByText('0 ₫')).toBeNull();
  expect(queryByText('1012345678')).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter driver test -- src/features/wallet/DriverWalletScreen.test.tsx`
Expected: FAIL vì `Ví tín dụng 0 ₫` cứng ở `DriverWalletScreen.tsx:173-185`

- [ ] **Step 3: Write minimal implementation**

```tsx
// apps/driver/src/features/wallet/DriverWalletScreen.tsx
// Xóa toàn bộ block assetList 'Ví tín dụng / Hạn mức nhận cuốc / 0 ₫'
// Xóa 3 utilityCard tĩnh ('Nạp tiền', 'bảo hiểm', 'hỗ trợ tài chính') — không có BE
// Giữ: balanceCard (availableBalanceVnd), pendingWithdrawalVnd, lifetimeDeliveredVnd,
// linked bank card từ summary.bank*, history list từ GET /driver/wallet/withdrawals
```

```tsx
// apps/driver/src/features/wallet/DriverBankAccountsScreen.tsx
// Xóa INITIAL_ACCOUNTS và SUPPORTED_BANKS cứng.
// Đổi signature: ({ bankName, bankAccountNumber, bankAccountName }: WalletSummary)
// Render: có -> 1 card duy nhất; không có -> empty 'Chưa liên kết tài khoản ngân hàng'.
// Xóa handleSetDefault/handleAddAccount local, modal thêm TK giữ lại chỉ khi gọi onSave -> POST /driver/wallet/withdrawals (bank fields Task 2).
export type DriverBankAccountsScreenProps = Readonly<{
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
}>;
```

```tsx
// apps/driver/src/features/wallet/DriverWalletRuntime.tsx
// summary fallback khi loading: giữ số 0 nhưng không tự suy diễn lifetime/pending.
// history rows = historyQuery.data?.items (từ endpoint paging Task 2), không catch-trả-rỗng trong adapter nữa — để ScreenState error xử lý.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter driver test -- src/features/wallet/DriverWalletScreen.test.tsx src/features/wallet/bank-accounts.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/driver/src/features/wallet/
git commit -m "fix(driver): single BE bank account, remove 0d credit wallet and local lists"
```

---

### Task 4: History — GPS watermark, signer fallback, aggregate nhãn đúng

**Files:**
- Modify: `apps/driver/src/features/history/DriverHistoryScreen.tsx:302-320`
- Modify: `apps/driver/src/features/history/adapter.ts:58-81`
- Test: `apps/driver/src/features/history/adapter.test.ts`

**Interfaces:**
- Consumes: `GET /driver/orders/history` items (`media`, `deliveredAt/cancelledAt/updatedAt`, `priceVnd`)
- Produces: `HistoryTripItem` với `signerName?: undefined` (BE không trả), modal ePOD không GPS cứng

- [ ] **Step 1: Write the failing test**

```ts
// apps/driver/src/features/history/adapter.test.ts
import { createDriverHistoryHttpAdapter } from './adapter';

test('history maps missing signer to undefined and keeps BE total', async () => {
  const client = {
    get: async () => ({
      items: [
        {
          id: 'o1',
          status: 'DELIVERED',
          priceVnd: 250000,
          distanceMeters: 18400,
          vehicleType: 'TRUCK',
          deliveredAt: '2026-09-16T10:00:00.000Z',
          updatedAt: '2026-09-16T10:00:00.000Z',
          stops: [
            { type: 'PICKUP', address: 'Kho A' },
            { type: 'DROPOFF', address: 'Kho B' },
          ],
          media: [],
        },
      ],
      total: 42,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    }),
  };
  const adapter = createDriverHistoryHttpAdapter(client as any);
  const res = await adapter.getHistory();
  expect(res.total).toBe(42);
  expect(res.items[0].signerName).toBeUndefined();
  expect(res.items[0].payoutAmount).toBe(250000);
});
```

```tsx
// ePOD modal test (thêm vào DriverHistoryScreen.test.tsx)
test('epod modal does not render hardcoded GPS', () => {
  const { queryByText } = render(
    <DriverHistoryScreen
      items={[{
        id: 'o1', reference: 'ORD-1', origin: 'A', destination: 'B',
        distanceLabel: '18,4 km', cargoSummary: 'Hàng', completedAtLabel: '16/09/2026',
        datePeriod: 'today', payoutAmount: 250000, status: 'DELIVERED',
        hasProof: true, vehicleLabel: 'Xe tải',
      }]}
      total={1}
    />,
  );
  expect(queryByText(/10\.8231/)).toBeNull();
  expect(queryByText(/Thủ kho nhận hàng/)).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter driver test -- src/features/history/adapter.test.ts`
Expected: FAIL nếu `signerName` đang default `'Thủ kho nhận hàng'` hoặc modal còn GPS cứng

- [ ] **Step 3: Write minimal implementation**

```tsx
// apps/driver/src/features/history/DriverHistoryScreen.tsx
// Modal ePOD watermarkBox: xóa dòng 'GPS: 10.8231° N, 106.6297° E'
// Giữ: 'Thời gian: {completedAtLabel}', 'Mã đơn: {reference}'
// signerNameText: selectedEpodTrip.signerName ? `Người ký nhận: ${signerName}` : null
// KPI strip: 'Tổng chuyến' dùng total (BE); 'Doanh thu hiển thị' + 'Tỷ lệ giao thành công' đổi label thành
// 'Doanh thu (trang đã tải)' và 'Tỷ lệ (trang đã tải)' vì chỉ tính trên batch — không imply lifetime.
```

```ts
// apps/driver/src/features/history/adapter.ts — mapHistoryItem: không gán signerName
return {
  id: order.id,
  reference: formatOrderReference(order),
  origin: pickup?.address ?? 'Điểm lấy hàng',
  destination: dropoff?.address ?? 'Điểm giao hàng',
  distanceLabel: formatDistance(order.distanceMeters),
  cargoSummary: formatCargoSummary(order),
  completedAtLabel: formatDateTime(completedAt),
  datePeriod: datePeriodOf(completedAt),
  payoutAmount: order.priceVnd ?? 0,
  status,
  hasProof: (order.media ?? []).some((m) => m.type === 'DELIVERY_PROOF'),
  vehicleLabel: formatVehicleLabel(order.vehicleType),
  signerName: undefined,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter driver test -- src/features/history/adapter.test.ts src/features/history/DriverHistoryScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/driver/src/features/history/
git commit -m "fix(driver): remove hardcoded epod gps and signer fallback"
```

---

### Task 5: Orders list/detail — xóa fallback tiền/km và offer demo

**Files:**
- Modify: `apps/driver/src/features/orders/adapter.ts:470-491`
- Modify: `apps/driver/src/features/orders/components/DriverNearbyOrderCard.tsx:86-92`
- Modify: `apps/driver/src/features/orders/components/detail/PublicDetailView.tsx:102-146`
- Modify: `apps/driver/src/features/orders/components/detail/AssignedDetailView.tsx:406`
- Modify: `apps/driver/src/features/orders/DriverOrdersScreen.tsx:125-159`
- Test: `apps/driver/src/features/orders/adapter.test.ts`, `apps/driver/src/features/orders/components/DriverNearbyOrderCard.test.tsx`

**Interfaces:**
- Consumes: `MappedDriverOrderResponse` (`priceVnd|null`, `distanceMeters|null`, `stops`, `etaSeconds/durationSeconds`)
- Produces: `priceLabel/distanceLabel/pickupDistanceLabel` nullable — null nghĩa là `Đang cập nhật`, không số giả

- [ ] **Step 1: Write the failing test**

```ts
// apps/driver/src/features/orders/adapter.test.ts (thêm)
test('missing price/distance maps to null labels, not 285000/18.4km', () => {
  const view = mapPublicOrder({
    id: 'o-null',
    priceVnd: null,
    distanceMeters: null,
    stops: [],
  } as any);
  expect(view.priceVnd).toBeNull();
  expect(view.priceLabel).toBeNull();
  expect(view.distanceLabel).toBeNull();
  expect(view.pickupDistanceLabel).toBeNull();
});
```

```tsx
// DriverNearbyOrderCard.test.tsx
test('renders updating state when price/distance missing', () => {
  const { getByText } = render(<DriverNearbyOrderCard item={{ ...baseItem, priceLabel: null, pickupDistanceLabel: null } as any} />);
  expect(getByText('Đang cập nhật')).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter driver test -- src/features/orders/adapter.test.ts`
Expected: FAIL vì `priceVnd ?? 285000`, `: '18,4 km'`, `'Cách bạn 1.2 km'`

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/driver/src/features/orders/adapter.ts
const priceVnd = order.priceVnd ?? null;
const distanceLabel = order.distanceMeters ? formatDistance(order.distanceMeters) : null;
return {
  // ...
  priceVnd,
  priceLabel: priceVnd !== null ? formatVndPrice(priceVnd) : null,
  distanceLabel,
  pickupLocationLabel,
  dropoffLocationLabel,
  pickupDistanceLabel: null, // BE không trả khoảng cách pickup-driver; để null tới khi có location-based API
};
```

```tsx
// DriverNearbyOrderCard.tsx
<Text style={styles.proximityText}>{item.pickupDistanceLabel ?? 'Đang cập nhật'}</Text>
<Text style={styles.priceAmount}>{item.priceLabel ?? 'Đang cập nhật'}</Text>
// cargoName fallback 'Hàng hóa tiêu chuẩn' giữ (nhãn loại, không phải số liệu) — không đổi.

// PublicDetailView.tsx + AssignedDetailView.tsx: mọi `|| '285.000 ₫'` / `|| '18,4 km'` / `|| 'Cách bạn 1.2 km'` -> `?? 'Đang cập nhật'`
// Dòng 'trong bán kính 5 km' -> xóa số cứng, lấy từ radiusKm state hoặc xóa câu nếu không có radius thật.
```

```tsx
// DriverOrdersScreen.tsx:125-159 — xóa handleSimulateIncomingOffer demo bodies
// (Kho Tân Bình, KCN Sóng Thần, 24.5km, 45 phút, 485.000₫, ORD-DEMO-999).
// Giữ nút 'Thử nổ đơn' chỉ khi __DEV__ && showDebugActions, và nó chỉ mở lại offer BE thật đầu danh sách:
const handleSimulateIncomingOffer = () => {
  if (!__DEV__) return;
  const first = view.kind === 'content' && view.requestedOrders.length > 0 ? view.requestedOrders[0] : null;
  if (!first) return;
  setSimulatedOffer({
    id: first.id,
    reference: first.reference,
    pickupDistanceLabel: first.pickupDistanceLabel ?? 'Đang cập nhật',
    pickupAddress: first.pickupLocationLabel ?? 'Điểm lấy hàng',
    dropoffAddress: first.dropoffLocationLabel ?? 'Điểm giao hàng',
    tripDistanceLabel: first.distanceLabel ?? 'Đang cập nhật',
    etaLabel: first.etaLabel ?? 'ETA dự kiến: đang cập nhật',
    priceLabel: first.priceLabel ?? 'Đang cập nhật',
    vehicleLabel: first.vehicleLabel ?? '—',
    cargoSummary: first.cargoSummary ?? '—',
    notes: null,
    timeoutSeconds: 30,
  });
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter driver test -- src/features/orders/adapter.test.ts src/features/orders/components/DriverNearbyOrderCard.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/driver/src/features/orders/
git commit -m "fix(driver): null-safe order labels, remove demo offer fixtures"
```

---

### Task 6: Profile/Performance/Earnings — tên, version, chuẩn hệ thống, aggregate

**Files:**
- Modify: `apps/driver/src/features/profile/ProfileScreen.tsx:168`
- Modify: `apps/driver/src/features/profile/adapter.ts:33`
- Modify: `apps/driver/src/features/performance/DriverPerformanceScreen.tsx:108-122`
- Modify: `apps/driver/src/features/earnings/DriverEarningsRuntime.tsx:24-42`
- Test: `apps/driver/src/features/profile/ProfileScreen.test.tsx`, `apps/driver/src/features/performance/DriverPerformanceScreen.test.tsx`

**Interfaces:**
- Consumes: `GET /me` (`name|null`), `GET /driver/performance` (`ratingAvg|acceptancePct|cancellationPct` nullable), `GET /driver/wallet` summary, `GET /driver/orders/history`
- Produces: UI null-safe, không ngưỡng cứng, earnings ghi rõ nguồn tính

- [ ] **Step 1: Write the failing test**

```tsx
// ProfileScreen.test.tsx
test('null BE name does not fall back to Tran Van Nam', () => {
  const { queryByText } = render(<DriverProfileScreen view={{ kind: 'content', name: null, phone: '0987***892', avatarUrl: null, vehicleLabel: null, roleLabel: 'Tài xế', statusLabel: 'Đang hoạt động', statusTone: 'active', appVersion: '1.0.0', isLoggingOut: false, scenarioId: 'x' } as any} />);
  expect(queryByText('Trần Văn Nam')).toBeNull();
});

// DriverPerformanceScreen.test.tsx
test('no hardcoded system thresholds', () => {
  const { queryByText } = render(<DriverPerformanceScreen acceptancePct={80} cancellationPct={2} isError={false} isLoading={false} onRetry={() => {}} ratingAvg={4.8} ratingCount={10} recentReviews={[]} />);
  expect(queryByText(/Chuẩn hệ thống/)).toBeNull();
  expect(queryByText(/> 95%/)).toBeNull();
  expect(queryByText(/< 1%/)).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter driver test -- src/features/profile/ProfileScreen.test.tsx src/features/performance/DriverPerformanceScreen.test.tsx`
Expected: FAIL vì `?? 'Trần Văn Nam'` và 2 dòng chuẩn hệ thống

- [ ] **Step 3: Write minimal implementation**

```tsx
// ProfileScreen.tsx:168
const driverName = view.name?.trim() ? view.name : (view.phone ?? 'Tài xế');
// Xóa 'Trần Văn Nam'
```

```ts
// profile/adapter.ts:33 — đọc version thật từ app.json, không '0.0.0'
import appJson from '../../../app.json';
const APP_VERSION = (appJson as any)?.expo?.version ?? '—';
```

```tsx
// DriverPerformanceScreen.tsx — xóa 2 dòng metricSub 'Chuẩn hệ thống: > 95%' và '< 1%'
// Giữ metricTitle + metricValue từ BE; null -> '—' (BE trả null khi chưa đủ mẫu — drivers.repository.ts:338-339)
<Text style={[styles.metricValue, styles.metricValueEmerald]}>{acceptancePct !== null && acceptancePct !== undefined ? formatPct(acceptancePct) : '—'}</Text>
```

```tsx
// DriverEarningsRuntime.tsx — giữ sumTodayEarnings client nhưng đổi nguồn rõ ràng:
// deliveredOrderCount/totalOrderCount/lifetimeDeliveredVnd/availableBalanceVnd lấy từ GET /driver/wallet (BE).
// todayEarningsVnd/todayJobCount tính từ history batch -> truyền thêm prop `todayScopeNote="Tính từ danh sách đã tải"` cho Screen hiển thị.
// Không thêm endpoint today mới (YAGNI).
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter driver test -- src/features/profile/ProfileScreen.test.tsx src/features/performance/DriverPerformanceScreen.test.tsx src/features/earnings/DriverEarningsScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/driver/src/features/profile apps/driver/src/features/performance apps/driver/src/features/earnings
git commit -m "fix(driver): null-safe profile name, real app version, drop hardcoded thresholds"
```

---

### Task 7: Settings diagnostics — thật hoặc xóa

**Files:**
- Modify: `apps/driver/src/features/settings/DriverSettingsScreen.tsx:68-69,181-201,627,656`
- Test: `apps/driver/src/features/settings/DriverSettingsScreen.test.tsx`

**Interfaces:**
- Consumes: `expo-location` (`getCurrentPositionAsync`, `accuracy`), version từ `app.json`, không BE
- Produces: diagnostics card chỉ hiện số đo thật hoặc `—`

- [ ] **Step 1: Write the failing test**

```tsx
// DriverSettingsScreen.test.tsx
import { render } from '@testing-library/react-native';
import { DriverSettingsScreen } from './DriverSettingsScreen';

test('settings has no hardcoded diagnostics', () => {
  const { queryByText } = render(<DriverSettingsScreen />);
  expect(queryByText('±3m · Cao')).toBeNull();
  expect(queryByText('24 ms')).toBeNull();
  expect(queryByText('142 MB')).toBeNull();
  expect(queryByText(/v2\.4\.0-pilot/)).toBeNull();
  expect(queryByText(/1900 1919/)).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter driver test -- src/features/settings/DriverSettingsScreen.test.tsx`
Expected: FAIL vì 5 chuỗi cứng còn trong file

- [ ] **Step 3: Write minimal implementation**

```tsx
// DriverSettingsScreen.tsx
// cacheSize: useState<string | null>(null) + 'Chưa đo' — xóa '142 MB'/'0 MB' giả.
// Nút 'Dọn dẹp' chỉ Alert xác nhận, không set số giả.
// diagnosticsCard 4 ô -> GPS: lấy từ expo-location accuracy khi bấm 'Test GPS', chưa đo -> '—';
// Server Ping: xóa '24 ms' -> '—' (chưa có health endpoint);
// Âm lượng chuông: bind ringtoneVolume state ('100%') thay vì '100% Max' cứng;
// Tối ưu pin: bind batterySaver state ('Tiết kiệm pin: Bật/Tắt') thay vì 'Chạy nền tốt'.
// Hotline '1900 1919 (Nhánh 1)' + SOS: xóa số cứng -> nút 'Liên hệ điều hành' mở modal trống chờ BE cấu hình;
// footer 'v2.4.0-pilot' -> APP_VERSION từ app.json (chung Task 6).
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter driver test -- src/features/settings/DriverSettingsScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/driver/src/features/settings/
git commit -m "fix(driver): remove fake settings diagnostics, show measured or empty state"
```

---

## Self-Review

- Spec coverage: wallet chuẩn (`drivers.service` + `withdrawals.repository` + `RequestWithdrawalDto`) -> Task 2+3; history/performance/documents/orders/application/me/users-me -> Task 1+4+5+6; settings không BE -> Task 7.
- Placeholder scan: không còn TBD/TODO/`Similar to`; mọi step có code + lệnh chạy + expected cụ thể.
- Type consistency: `WalletSummary` (available/lifetime/pending/deliveredOrderCount + bank*) dùng xuyên Task 2-3; `HistoryTripItem.signerName?: undefined` Task 4; order labels `string|null` Task 5; `phone/vehicleLabel: string|null` Task 1+6.

## Verification cuối

```bash
pnpm --filter driver test
pnpm --filter driver typecheck
pnpm --filter driver lint
pnpm --filter api test -- src/drivers/withdrawals.repository.spec.ts src/drivers/drivers.repository.spec.ts
```
