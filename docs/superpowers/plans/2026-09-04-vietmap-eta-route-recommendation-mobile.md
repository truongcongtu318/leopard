# Vietmap ETA + Route Recommendation (Mobile) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Customer "Tạo đơn" screen consume the backend's multi-route `/orders/estimate` response — show every returned route as a selectable card (recommended one highlighted, congestion badge per route), let the customer pick one, and create the order with that route's own `estimateToken`. Also fixes a live regression: the mobile app currently never sends `cargoWeightKg` to `/orders/estimate`, so selecting "Xe tải" (TRUCK) always fails with 400 against the already-merged backend.

**Architecture:** `CustomerEstimateView`'s `'ready'` variant changes from one flat set of price/ETA fields to `{ routes: CustomerRouteOptionView[], selectedRouteId }`. `createCustomerHttpAdapter`'s `createOrder` stops caching a single token internally and instead takes the caller-selected `estimateToken` directly — the Runtime always has one available once `estimate.kind === 'ready'`. `CustomerCreateOrderScreen`'s `EstimatePanel` renders one card per route instead of one fixed block; tapping a card is a pure local state update in the Runtime (no network call — every route in the batch was already returned by the one `/orders/estimate` call).

**Tech Stack:** React Native (Expo), TypeScript, Jest + `@testing-library/react-native`, `@leopard/shared`.

**Spec:** [docs/superpowers/specs/2026-09-04-vietmap-eta-route-recommendation-design.md](../specs/2026-09-04-vietmap-eta-route-recommendation-design.md) (§6 Mobile section — this plan implements those decisions against the actual current file contents)
**Backend contract this plan consumes (already merged):** [docs/superpowers/plans/2026-09-04-vietmap-eta-route-recommendation-backend.md](2026-09-04-vietmap-eta-route-recommendation-backend.md)

## Global Constraints

- `POST /orders/estimate` now returns `{ routes: RouteOption[] }` (not a flat object) — every route has its own `routeId`, `estimateToken`, `isRecommended`, `congestionLevel` (`'low'|'moderate'|'heavy'|'severe'|'unknown'`), plus the original price/distance/duration/source/calculatedAt fields.
- `cargoWeightKg` is **required** in the `/orders/estimate` request body when `vehicleType === 'TRUCK'` — the backend returns 400 without it. Client-side validation must catch this before the request, mirroring the existing pickup/dropoff-required pattern.
- `createOrder(form, estimateToken)` takes the token explicitly. No caching, no internal re-estimate fallback — the caller (Runtime) always has a selected route's token by the time this is called, because `create-order` is only ever the primary action while `estimate.kind === 'ready'`.
- Selecting a different route card is a **local state change only** — never issue a new `/orders/estimate` request. All routes for the current form state were already returned by the one estimate call.
- Do not touch `apps/api/**` — this plan is mobile-only, consuming an already-merged backend contract.
- Deliberate deviation from the spec's literal wording: the spec (§6) says the cargo-weight field should "appear" when TRUCK is selected. The field (`Khối lượng dự kiến (kg)`) is actually already always rendered in `CustomerCreateOrderScreen.tsx` today, for every vehicle type (it doubles as general cargo info). This plan keeps it always-visible and only makes it **required/validated** when `vehicleType === 'TRUCK'`, rather than conditionally hiding/showing the field — simpler, and avoids a layout jump when switching vehicle types. Flag this as a deviation to point out during review, not a silent scope cut.
- Follow existing patterns in the touched files: the `deepFreeze` wrapper on every returned view, the `ValidationIssue`-free but `fieldErrors`-object validation style already used for pickup/dropoff, the existing `formatVndPrice`/`formatDistance`/`formatDateTime` label helpers (reuse them, don't duplicate).

---

### Task 1: `model.ts` + `port.ts` — multi-route view types

**Files:**
- Modify: `apps/mobile/src/features/customer/orders/model.ts`
- Modify: `apps/mobile/src/features/customer/orders/port.ts`

**Interfaces:**
- Produces: `CongestionLevel`, `CustomerRouteOptionView`, and the updated `CustomerEstimateView['ready']` shape — Task 2 (`adapter.ts`) and Task 4 (`CustomerCreateOrderScreen.tsx`) both import and build/consume these types.
- Produces: `CustomerOrdersPort.createOrder(form, estimateToken: string)` — Task 2 implements it, Task 5 (`CustomerCreateOrderRuntime.tsx`) calls it.

This task has no test file of its own (pure type declarations) — it is verified by Task 2's tests failing to compile without it, then passing once Task 2's implementation lands.

- [ ] **Step 1: Update `model.ts`**

Replace the `CustomerEstimateView` type definition:

```ts
export type CustomerEstimateView =
  | Readonly<{ kind: 'none' | 'outdated' | 'expired' }>
  | Readonly<{ kind: 'loading'; source: ProviderSource }>
  | Readonly<{ kind: 'error'; message: string; source: ProviderSource }>
  | Readonly<{
      kind: 'ready';
      source: ProviderSource;
      durationSeconds: number;
      distanceLabel: string;
      priceLabel: string;
      calculatedAtLabel: string;
    }>;
```

with:

```ts
export type CongestionLevel = 'low' | 'moderate' | 'heavy' | 'severe' | 'unknown';

export type CustomerRouteOptionView = Readonly<{
  routeId: string;
  estimateToken: string;
  isRecommended: boolean;
  durationSeconds: number;
  distanceLabel: string;
  priceLabel: string;
  congestionLevel: CongestionLevel;
  congestionLabel: string;
}>;

export type CustomerEstimateView =
  | Readonly<{ kind: 'none' | 'outdated' | 'expired' }>
  | Readonly<{ kind: 'loading'; source: ProviderSource }>
  | Readonly<{ kind: 'error'; message: string; source: ProviderSource }>
  | Readonly<{
      kind: 'ready';
      source: ProviderSource;
      routes: readonly CustomerRouteOptionView[];
      selectedRouteId: string;
      calculatedAtLabel: string;
    }>;
```

(Everything else in `model.ts` — `CustomerCreateFormView`, `CustomerActionView`, etc. — is unchanged. `CustomerCreateFormView.fieldErrors` already has a `cargoWeight` key; no type change needed there.)

- [ ] **Step 2: Update `port.ts`**

Change:

```ts
export type CustomerOrdersPort = Readonly<{
  getOrdersView: (filter: CustomerOrderFilter) => Promise<CustomerListView>;
  getCreateView: () => Promise<CustomerCreateView>;
  getOrderDetailView: (orderId: string) => Promise<CustomerDetailView>;
  estimateOrder: (form: CustomerCreateFormView) => Promise<CustomerCreateView>;
  createOrder: (form: CustomerCreateFormView) => Promise<CustomerDetailView>;
  executeIntent: (intent: CustomerOrderIntent) => Promise<CustomerDetailView>;
```

to:

```ts
export type CustomerOrdersPort = Readonly<{
  getOrdersView: (filter: CustomerOrderFilter) => Promise<CustomerListView>;
  getCreateView: () => Promise<CustomerCreateView>;
  getOrderDetailView: (orderId: string) => Promise<CustomerDetailView>;
  estimateOrder: (form: CustomerCreateFormView) => Promise<CustomerCreateView>;
  createOrder: (form: CustomerCreateFormView, estimateToken: string) => Promise<CustomerDetailView>;
  executeIntent: (intent: CustomerOrderIntent) => Promise<CustomerDetailView>;
```

(The rest of the file — `CustomerMediaPickerPort` — is unchanged.)

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/features/customer/orders/model.ts apps/mobile/src/features/customer/orders/port.ts
git commit -m "feat(mobile): add multi-route estimate view types"
```

---

### Task 2: `adapter.ts` — multi-route mapping, TRUCK cargoWeightKg, token-explicit createOrder

**Files:**
- Modify: `apps/mobile/src/features/customer/orders/adapter.ts`
- Modify: `apps/mobile/src/features/customer/orders/adapter.test.ts`

**Interfaces:**
- Consumes: `CongestionLevel`, `CustomerRouteOptionView`, `CustomerOrdersPort.createOrder(form, estimateToken)` from Task 1.
- Produces: `RouteOptionApiResponse`, `OrderEstimateApiResponse = { routes: RouteOptionApiResponse[] }`, `mapRouteOptionToView`, `describeCongestionLevel` — no other task imports these directly, but they are the shape `estimateOrder()` parses from the real backend.

- [ ] **Step 1: Update the failing tests first**

In `apps/mobile/src/features/customer/orders/adapter.test.ts`, replace `mockEstimateResponse`:

```ts
const mockRouteOption = {
  routeId: 'route-0',
  estimateToken: 'token-xyz-123',
  isRecommended: true,
  polyline: 'abcxyz',
  distanceM: 18400,
  durationS: 1080,
  estimatedArrivalAt: '2026-08-15T14:48:00.000Z',
  estimatedPriceVnd: 286000,
  source: 'DEMO' as const,
  calculatedAt: '2026-08-15T14:30:00.000Z',
  isEstimate: true,
  congestionLevel: 'unknown' as const,
};

const mockEstimateResponse: OrderEstimateApiResponse = {
  routes: [mockRouteOption],
};
```

Update the `estimateOrder` describe block's success test:

```ts
    it('calls POST /orders/estimate and returns estimate-ready view on success', async () => {
      const client = createMockClient();
      client.post.mockResolvedValueOnce(mockEstimateResponse);

      const adapter = createCustomerHttpAdapter(client);
      const view = await adapter.estimateOrder(validForm);

      expect(view.kind).toBe('form');
      if (view.kind === 'form') {
        expect(view.scenarioId).toBe('C-NEW-ESTIMATE-DEMO');
        expect(view.phase).toBe('estimate-ready');
        expect(view.estimate.kind).toBe('ready');
        if (view.estimate.kind === 'ready') {
          expect(view.estimate.routes).toHaveLength(1);
          expect(view.estimate.routes[0].priceLabel).toBe('286.000 ₫');
          expect(view.estimate.routes[0].distanceLabel).toBe('18,4 km');
          expect(view.estimate.routes[0].congestionLabel).toBe('Chưa rõ giao thông');
          expect(view.estimate.selectedRouteId).toBe('route-0');
          expect(view.estimate.source).toBe('DEMO');
        }
        expect(view.actions[0].id).toBe('create-order');
        expect(view.actions[0].disabled).toBe(false);
      }
      expect(client.post).toHaveBeenCalledWith(
        '/orders/estimate',
        expect.objectContaining({
          pickup: expect.objectContaining({ address: 'Kho Quận 7' }),
          dropoff: expect.objectContaining({ address: 'Thủ Đức' }),
          vehicleType: 'VAN',
        }),
      );
    });
```

Add two new tests right after it, still inside the `estimateOrder` describe block:

```ts
    it('requires cargoWeight when vehicleType is TRUCK', async () => {
      const client = createMockClient();
      const adapter = createCustomerHttpAdapter(client);

      const truckForm: CustomerCreateFormView = {
        ...validForm,
        vehicleType: 'TRUCK',
        cargoWeight: '',
      };

      const view = await adapter.estimateOrder(truckForm);

      expect(view.kind).toBe('form');
      if (view.kind === 'form') {
        expect(view.scenarioId).toBe('C-NEW-INVALID');
        expect(view.form.fieldErrors.cargoWeight).toBe(
          'Khối lượng là bắt buộc khi chọn xe tải.',
        );
      }
      expect(client.post).not.toHaveBeenCalled();
    });

    it('sends cargoWeightKg when vehicleType is TRUCK', async () => {
      const client = createMockClient();
      client.post.mockResolvedValueOnce(mockEstimateResponse);
      const adapter = createCustomerHttpAdapter(client);

      const truckForm: CustomerCreateFormView = {
        ...validForm,
        vehicleType: 'TRUCK',
        cargoWeight: '2000',
      };

      await adapter.estimateOrder(truckForm);

      expect(client.post).toHaveBeenCalledWith(
        '/orders/estimate',
        expect.objectContaining({ vehicleType: 'TRUCK', cargoWeightKg: 2000 }),
      );
    });
```

Replace the whole `createOrder` describe block:

```ts
  describe('createOrder', () => {
    const validForm: CustomerCreateFormView = {
      pickup: 'Kho Quận 7',
      stops: [],
      dropoff: 'Thủ Đức',
      vehicleType: 'VAN',
      cargoNote: 'Thùng carton',
      cargoWeight: '50',
      fieldErrors: {},
    };

    it('calls POST /orders with the given estimateToken and returns detail content view', async () => {
      const client = createMockClient();
      client.post.mockResolvedValueOnce(mockOrderResponse);

      const adapter = createCustomerHttpAdapter(client);
      const view = await adapter.createOrder(validForm, 'token-xyz-123');

      expect(view.kind).toBe('content');
      if (view.kind === 'content') {
        expect(view.scenarioId).toBe('C-DETAIL-SUCCESS');
        expect(view.order.id).toBe(mockOrderResponse.id);
        expect(view.order.reference).toBe('LP-260815-001');
        expect(view.order.priceLabel).toBe('286.000 ₫');
      }
      expect(client.post).toHaveBeenCalledTimes(1);
      expect(client.post).toHaveBeenCalledWith(
        '/orders',
        expect.objectContaining({
          estimateToken: 'token-xyz-123',
          vehicleType: 'VAN',
          cargoNote: 'Thùng carton',
          cargoWeightKg: 50,
        }),
      );
    });

    it('returns error boundary view when route fields are incomplete', async () => {
      const client = createMockClient();
      const adapter = createCustomerHttpAdapter(client);
      const view = await adapter.createOrder({ ...validForm, pickup: '' }, 'token-xyz-123');

      expect(view.kind).toBe('error');
      if (view.kind === 'error') {
        expect(view.scenarioId).toBe('C-DETAIL-ERROR');
        expect(view.message).toContain('lộ trình không đầy đủ');
      }
      expect(client.post).not.toHaveBeenCalled();
    });

    it('returns permission-denied boundary view on 403 response', async () => {
      const client = createMockClient();
      client.post.mockRejectedValueOnce(new ApiError(403, 'FORBIDDEN', 'Access denied'));

      const adapter = createCustomerHttpAdapter(client);
      const view = await adapter.createOrder(validForm, 'token-xyz-123');

      expect(view.kind).toBe('permission-denied');
      if (view.kind === 'permission-denied') {
        expect(view.scenarioId).toBe('C-DETAIL-PERMISSION');
      }
      expect(client.post).toHaveBeenCalledTimes(1);
    });
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter mobile test -- adapter.test.ts`
Expected: FAIL — `OrderEstimateApiResponse` doesn't have a `routes` field yet, `createOrder` doesn't accept a second argument, TRUCK validation doesn't exist.

- [ ] **Step 3: Implement in `adapter.ts`**

Replace the `OrderEstimateApiResponse` interface:

```ts
export interface OrderEstimateApiResponse {
  estimateToken: string;
  polyline: string;
  distanceM: number;
  durationS: number;
  estimatedArrivalAt: string;
  estimatedPriceVnd: number;
  source: ProviderSource;
  calculatedAt: string;
  isEstimate: boolean;
}
```

with:

```ts
export interface RouteOptionApiResponse {
  routeId: string;
  estimateToken: string;
  isRecommended: boolean;
  polyline: string;
  distanceM: number;
  durationS: number;
  estimatedArrivalAt: string;
  estimatedPriceVnd: number;
  source: ProviderSource;
  calculatedAt: string;
  isEstimate: boolean;
  congestionLevel: CongestionLevel;
}

export interface OrderEstimateApiResponse {
  routes: RouteOptionApiResponse[];
}

export function describeCongestionLevel(level: CongestionLevel): string {
  switch (level) {
    case 'low':
      return 'Thông thoáng';
    case 'moderate':
      return 'Hơi đông';
    case 'heavy':
      return 'Kẹt xe';
    case 'severe':
      return 'Rất kẹt xe';
    default:
      return 'Chưa rõ giao thông';
  }
}

export function mapRouteOptionToView(route: RouteOptionApiResponse): CustomerRouteOptionView {
  return {
    routeId: route.routeId,
    estimateToken: route.estimateToken,
    isRecommended: route.isRecommended,
    durationSeconds: route.durationS,
    distanceLabel: formatDistance(route.distanceM),
    priceLabel: formatVndPrice(route.estimatedPriceVnd),
    congestionLevel: route.congestionLevel,
    congestionLabel: describeCongestionLevel(route.congestionLevel),
  };
}
```

Add `CongestionLevel` and `CustomerRouteOptionView` to the type-only import at the top of the file:

```ts
import type {
  CustomerCancelView,
  CustomerCreateFormView,
  CustomerCreateView,
  CustomerDetailContentView,
  CustomerDetailView,
  CustomerListView,
  CustomerOrderDetailDataView,
  CustomerOrderFilter,
  CustomerOrderIntent,
  CustomerOrderListItemView,
  CustomerPaymentView,
  CustomerRoutePoint,
  CustomerRouteView,
  CustomerTrackingView,
  CongestionLevel,
  CustomerRouteOptionView,
} from './model';
```

Remove the `let cachedEstimateToken: string | null = null;` line from `createCustomerHttpAdapter`.

In `estimateOrder`, replace the cargo-weight validation:

```ts
      if (
        form.cargoWeight &&
        (isNaN(Number(form.cargoWeight)) || Number(form.cargoWeight) <= 0)
      ) {
        fieldErrors.cargoWeight = 'Khối lượng phải lớn hơn 0.';
      }
```

with:

```ts
      if (form.vehicleType === 'TRUCK' && !form.cargoWeight.trim()) {
        fieldErrors.cargoWeight = 'Khối lượng là bắt buộc khi chọn xe tải.';
      } else if (
        form.cargoWeight &&
        (isNaN(Number(form.cargoWeight)) || Number(form.cargoWeight) <= 0)
      ) {
        fieldErrors.cargoWeight = 'Khối lượng phải lớn hơn 0.';
      }
```

In `estimateOrder`'s try block, add `cargoWeightKg` to the payload:

```ts
        const payload = {
          pickup: {
            type: 'PICKUP',
            address: form.pickup.trim(),
            lat: 10.7326,
            lng: 106.7168,
          },
          stops: form.stops
            .filter((s) => s.value.trim().length > 0)
            .map((s, idx) => ({
              type: 'STOP',
              address: s.value.trim(),
              lat: 10.7626 + idx * 0.01,
              lng: 106.6601 + idx * 0.01,
            })),
          dropoff: {
            type: 'DROPOFF',
            address: form.dropoff.trim(),
            lat: 10.8498,
            lng: 106.7725,
          },
          vehicleType: form.vehicleType as VehicleType,
          ...(form.vehicleType === 'TRUCK'
            ? { cargoWeightKg: Number(form.cargoWeight) }
            : {}),
        };
```

Replace the success branch (the `response`/return block right after the `activeClient.post<OrderEstimateApiResponse>` call):

```ts
        const response = await activeClient.post<OrderEstimateApiResponse>(
          '/orders/estimate',
          payload,
        );

        cachedEstimateToken = response.estimateToken;

        return deepFreeze<CustomerCreateView>({
          scenarioId:
            response.source === 'DEMO'
              ? 'C-NEW-ESTIMATE-DEMO'
              : 'C-NEW-ESTIMATE-READY',
          kind: 'form',
          phase: 'estimate-ready',
          form: {
            ...form,
            fieldErrors: {},
          },
          estimate: {
            kind: 'ready',
            source: response.source,
            durationSeconds: response.durationS,
            distanceLabel: formatDistance(response.distanceM),
            priceLabel: formatVndPrice(response.estimatedPriceVnd),
            calculatedAtLabel: formatDateTime(response.calculatedAt),
          },
          notice: null,
          actions: [
            {
              id: 'create-order',
              label: 'Tạo đơn',
              emphasis: 'primary',
              disabled: false,
            },
          ],
        });
```

with:

```ts
        const response = await activeClient.post<OrderEstimateApiResponse>(
          '/orders/estimate',
          payload,
        );

        const routes = response.routes.map(mapRouteOptionToView);
        const recommended = routes.find((r) => r.isRecommended) ?? routes[0];
        const primarySource = response.routes[0]?.source ?? 'VIETMAP';
        const primaryCalculatedAt = response.routes[0]?.calculatedAt ?? new Date().toISOString();

        return deepFreeze<CustomerCreateView>({
          scenarioId:
            primarySource === 'DEMO' ? 'C-NEW-ESTIMATE-DEMO' : 'C-NEW-ESTIMATE-READY',
          kind: 'form',
          phase: 'estimate-ready',
          form: {
            ...form,
            fieldErrors: {},
          },
          estimate: {
            kind: 'ready',
            source: primarySource,
            routes,
            selectedRouteId: recommended.routeId,
            calculatedAtLabel: formatDateTime(primaryCalculatedAt),
          },
          notice: null,
          actions: [
            {
              id: 'create-order',
              label: 'Tạo đơn',
              emphasis: 'primary',
              disabled: false,
            },
          ],
        });
```

Replace the entire `createOrder` method:

```ts
    async createOrder(
      form: CustomerCreateFormView,
      estimateToken: string,
    ): Promise<CustomerDetailView> {
      const activeClient = getClient();
      if (!form.pickup?.trim() || !form.dropoff?.trim()) {
        return deepFreeze<CustomerDetailView>({
          scenarioId: 'C-DETAIL-ERROR',
          kind: 'error',
          title: 'Không thể tạo đơn hàng',
          message: 'Thông tin lộ trình không đầy đủ.',
        });
      }

      try {
        const createPayload = {
          pickup: {
            type: 'PICKUP',
            address: form.pickup.trim(),
            lat: 10.7326,
            lng: 106.7168,
          },
          stops: form.stops
            .filter((s) => s.value.trim().length > 0)
            .map((s, idx) => ({
              type: 'STOP',
              address: s.value.trim(),
              lat: 10.7626 + idx * 0.01,
              lng: 106.6601 + idx * 0.01,
            })),
          dropoff: {
            type: 'DROPOFF',
            address: form.dropoff.trim(),
            lat: 10.8498,
            lng: 106.7725,
          },
          vehicleType: form.vehicleType as VehicleType,
          cargoNote: form.cargoNote?.trim() || undefined,
          cargoWeightKg: form.cargoWeight ? Number(form.cargoWeight) : undefined,
          estimateToken,
        };

        const response = await activeClient.post<MappedOrderResponse>(
          '/orders',
          createPayload,
        );

        return deepFreeze<CustomerDetailContentView>({
          scenarioId: 'C-DETAIL-SUCCESS',
          kind: 'content',
          notice: null,
          order: mapOrderToDetail(response),
          cancel: resolveCancelView(response),
          actions: [],
        });
      } catch (error) {
        if (isForbiddenError(error)) {
          return deepFreeze<CustomerDetailView>({
            scenarioId: 'C-DETAIL-PERMISSION',
            kind: 'permission-denied',
            title: 'Bạn không có quyền xem đơn hàng này',
            message:
              'Không hiển thị route, tài xế, tracking, media hoặc payment của đơn khác.',
          });
        }

        return deepFreeze<CustomerDetailView>({
          scenarioId: 'C-DETAIL-ERROR',
          kind: 'error',
          title: 'Không thể tạo đơn hàng',
          message:
            error instanceof Error && error.message
              ? error.message
              : 'Hãy thử lại sau.',
        });
      }
    },
```

(This drops the old internal "reuse cached token, else re-estimate" block entirely — the caller now always supplies the token.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter mobile test -- adapter.test.ts`
Expected: PASS (all tests, including the 2 new TRUCK ones and the simplified `createOrder` ones).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/customer/orders/adapter.ts apps/mobile/src/features/customer/orders/adapter.test.ts
git commit -m "feat(mobile): parse multi-route estimates and require cargoWeightKg for trucks"
```

---

### Task 3: `fixtures.ts` — preview scenarios for the new estimate shape

**Files:**
- Modify: `apps/mobile/src/features/customer/orders/fixtures.ts`

**Interfaces:**
- Consumes: `CustomerEstimateView['ready']` (Task 1). Produces fixture data consumed by `fixtures.test.ts` (unchanged, asserts scenario coverage generically — no edit needed) and by Task 4's screen tests.

- [ ] **Step 1: Update `estimateFor` in `fixtures.ts`**

Replace the `'ready'` return block inside `estimateFor`:

```ts
    return {
      kind: 'ready',
      source: scenarioId === 'C-NEW-ESTIMATE-DEMO' ? 'DEMO' : 'VIETMAP',
      durationSeconds: 1080,
      distanceLabel: '18,4 km',
      priceLabel: '286.000 ₫',
      calculatedAtLabel: '14:30 · 15/08/2026',
    };
```

with:

```ts
    return {
      kind: 'ready',
      source: scenarioId === 'C-NEW-ESTIMATE-DEMO' ? 'DEMO' : 'VIETMAP',
      routes: [
        {
          routeId: 'route-0',
          estimateToken: 'demo-estimate-token',
          isRecommended: true,
          durationSeconds: 1080,
          distanceLabel: '18,4 km',
          priceLabel: '286.000 ₫',
          congestionLevel: 'unknown',
          congestionLabel: 'Chưa rõ giao thông',
        },
      ],
      selectedRouteId: 'route-0',
      calculatedAtLabel: '14:30 · 15/08/2026',
    };
```

- [ ] **Step 2: Run the existing fixture and screen tests to verify nothing broke**

Run: `pnpm --filter mobile test -- fixtures.test.ts`
Expected: PASS (this file asserts scenario-ID coverage generically, not estimate field values, so it should be unaffected).

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/features/customer/orders/fixtures.ts
git commit -m "feat(mobile): update create-order fixtures for multi-route estimates"
```

---

### Task 4: `CustomerCreateOrderScreen.tsx` — route picker UI

**Files:**
- Modify: `apps/mobile/src/features/customer/orders/CustomerCreateOrderScreen.tsx`
- Modify: `apps/mobile/src/features/customer/orders/CustomerScreens.test.tsx`

**Interfaces:**
- Consumes: `CustomerEstimateView['ready'].routes`/`selectedRouteId`, `CustomerRouteOptionView` (Task 1), the multi-route fixture (Task 3).
- Produces: `CustomerCreateOrderScreenProps.onSelectRoute` — Task 5 (`CustomerCreateOrderRuntime.tsx`) implements and passes the handler.

- [ ] **Step 1: Write the failing test first**

In `apps/mobile/src/features/customer/orders/CustomerScreens.test.tsx`, add this test inside the `describe('CustomerCreateOrderScreen', ...)` block, right after the existing `'renders the guided route, three stops, estimate, price, ETA, and demo source'` test:

```tsx
  it('lets the customer pick a different route and reports its routeId', async () => {
    const onSelectRoute = jest.fn();
    const baseView = createCustomerCreateFixture('C-NEW-ESTIMATE-READY');
    const multiRouteView =
      baseView.kind === 'form' && baseView.estimate.kind === 'ready'
        ? {
            ...baseView,
            estimate: {
              ...baseView.estimate,
              routes: [
                ...baseView.estimate.routes,
                {
                  routeId: 'route-1',
                  estimateToken: 'demo-estimate-token-1',
                  isRecommended: false,
                  durationSeconds: 1320,
                  distanceLabel: '20,1 km',
                  priceLabel: '312.000 ₫',
                  congestionLevel: 'heavy' as const,
                  congestionLabel: 'Kẹt xe',
                },
              ],
            },
          }
        : baseView;

    const screen = await render(
      <CustomerCreateOrderScreen onSelectRoute={onSelectRoute} view={multiRouteView} />,
    );

    expect(screen.getByText('⭐ Đề xuất')).toBeTruthy();
    expect(screen.getByText('Kẹt xe')).toBeTruthy();

    await fireEvent.press(screen.getByText('312.000 ₫'));
    expect(onSelectRoute).toHaveBeenCalledWith('route-1');
    await screen.unmount();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter mobile test -- CustomerScreens.test.tsx`
Expected: FAIL — `EstimatePanel` doesn't render a route list yet, `onSelectRoute` prop doesn't exist, `'⭐ Đề xuất'`/`'Kẹt xe'` text isn't rendered.

- [ ] **Step 3: Implement in `CustomerCreateOrderScreen.tsx`**

Add `CustomerRouteOptionView` to the type-only import:

```ts
import type {
  CustomerActionView,
  CustomerCreateFormScreenView,
  CustomerCreateView,
  CustomerRouteOptionView,
} from './model';
```

Add `onSelectRoute` to the props type:

```ts
export type CustomerCreateOrderScreenProps = Readonly<{
  view: CustomerCreateView;
  onFieldChange?: (field: string, value: string) => void;
  onAddStop?: () => void;
  onRemoveStop?: (stopId: string) => void;
  onSelectVehicle?: (vehicle: 'MOTORBIKE' | 'VAN' | 'TRUCK') => void;
  onSelectRoute?: (routeId: string) => void;
  onPrimaryAction?: (actionId: string) => void;
  onRetry?: () => void;
  onBack?: () => void;
}>;
```

Add a congestion badge style map and a `RouteOptionCard` component right above `EstimatePanel`:

```tsx
const CONGESTION_BADGE_STYLE: Record<CustomerRouteOptionView['congestionLevel'], { bg: string; text: string }> = {
  low: { bg: '#DCFCE7', text: '#15803D' },
  moderate: { bg: '#FEF3C7', text: '#B45309' },
  heavy: { bg: '#FFEDD5', text: '#C2410C' },
  severe: { bg: '#FEE2E2', text: '#B91C1C' },
  unknown: { bg: '#F1F5F9', text: '#64748B' },
};

function RouteOptionCard({
  onPress,
  option,
  selected,
}: Readonly<{
  onPress?: () => void;
  option: CustomerRouteOptionView;
  selected: boolean;
}>) {
  const badge = CONGESTION_BADGE_STYLE[option.congestionLevel];
  return (
    <Pressable
      accessibilityLabel={`Tuyến ${option.priceLabel}, ${Math.round(option.durationSeconds / 60)} phút`}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.routeCard,
        selected ? styles.routeCardSelected : null,
        pressed ? styles.pressed : null,
      ]}
    >
      {option.isRecommended ? (
        <View style={styles.recommendedTag}>
          <Text style={styles.recommendedTagText}>⭐ Đề xuất</Text>
        </View>
      ) : null}
      <View style={styles.priceHeaderRow}>
        <Text style={styles.estimateRowLabel}>Giá dự kiến</Text>
        <Text style={styles.estimatePrice}>{option.priceLabel}</Text>
      </View>
      <View style={styles.metricsBadgeRow}>
        <View style={styles.metricPill}>
          <Text style={styles.metricLabel}>ETA dự kiến</Text>
          <Text style={styles.metricValue}>{Math.round(option.durationSeconds / 60)} phút</Text>
        </View>
        <View style={styles.metricPill}>
          <Text style={styles.metricLabel}>Khoảng cách</Text>
          <Text style={styles.metricValue}>{option.distanceLabel}</Text>
        </View>
      </View>
      <View style={[styles.congestionBadge, { backgroundColor: badge.bg }]}>
        <Text style={[styles.congestionBadgeText, { color: badge.text }]}>
          🚦 {option.congestionLabel}
        </Text>
      </View>
    </Pressable>
  );
}
```

Replace the `EstimatePanel` function's props and its `'ready'` branch:

```tsx
function EstimatePanel({
  onRetry,
  onSelectRoute,
  view,
}: Readonly<{
  view: CustomerCreateFormScreenView;
  onRetry?: () => void;
  onSelectRoute?: (routeId: string) => void;
}>) {
```

and replace the block:

```tsx
  if (estimate.kind === 'ready') {
    const isDemo = estimate.source === 'DEMO';
    return (
      <View style={styles.estimatePanel}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.stepBadge}>
            <Text style={styles.sectionIndex}>03</Text>
          </View>
          <Text style={styles.sectionLabel}>GIÁ & XÁC NHẬN</Text>
        </View>
        <View style={styles.estimateCardReady}>
          <View style={styles.priceHeaderRow}>
            <Text style={styles.estimateRowLabel}>Giá dự kiến</Text>
            <Text style={styles.estimatePrice}>{estimate.priceLabel}</Text>
          </View>

          <View style={styles.metricsBadgeRow}>
            <View style={styles.metricPill}>
              <Text style={styles.metricLabel}>ETA dự kiến</Text>
              <Text style={styles.metricValue}>
                {Math.round(estimate.durationSeconds / 60)} phút
              </Text>
            </View>

            <View style={styles.metricPill}>
              <Text style={styles.metricLabel}>Khoảng cách</Text>
              <Text style={styles.metricValue}>{estimate.distanceLabel}</Text>
            </View>
          </View>

          {isDemo ? (
            <View style={styles.demoBadge}>
              <Text style={styles.demoBadgeText}>Dữ liệu mô phỏng</Text>
            </View>
          ) : null}

          <Text style={styles.estimateCalcTime}>Tính lúc {estimate.calculatedAtLabel}</Text>
        </View>
      </View>
    );
  }
```

with:

```tsx
  if (estimate.kind === 'ready') {
    const isDemo = estimate.source === 'DEMO';
    return (
      <View style={styles.estimatePanel}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.stepBadge}>
            <Text style={styles.sectionIndex}>03</Text>
          </View>
          <Text style={styles.sectionLabel}>GIÁ & XÁC NHẬN</Text>
        </View>

        {isDemo ? (
          <View style={styles.demoBadge}>
            <Text style={styles.demoBadgeText}>Dữ liệu mô phỏng</Text>
          </View>
        ) : null}

        <View accessibilityRole="radiogroup" style={styles.routeList}>
          {estimate.routes.map((option) => (
            <RouteOptionCard
              key={option.routeId}
              onPress={onSelectRoute ? () => onSelectRoute(option.routeId) : undefined}
              option={option}
              selected={option.routeId === estimate.selectedRouteId}
            />
          ))}
        </View>

        <Text style={styles.estimateCalcTime}>Tính lúc {estimate.calculatedAtLabel}</Text>
      </View>
    );
  }
```

Pass `onSelectRoute` through from `CustomerCreateOrderScreen` into `EstimatePanel`. In the `CustomerCreateOrderScreen` function signature, add `onSelectRoute` to the destructured props:

```tsx
export function CustomerCreateOrderScreen({
  onAddStop,
  onBack,
  onFieldChange,
  onPrimaryAction,
  onRemoveStop,
  onRetry,
  onSelectRoute,
  onSelectVehicle,
  view,
}: CustomerCreateOrderScreenProps) {
```

and update its usage:

```tsx
          {/* 💰 Card 03: Giá & Xác Nhận (EstimatePanel) */}
          <View style={styles.card}>
            <EstimatePanel onRetry={onRetry} onSelectRoute={onSelectRoute} view={view} />
          </View>
```

Add these style entries to the `StyleSheet.create({...})` object (near the existing `estimateCardReady`/`priceHeaderRow` entries — they can replace `estimateCardReady`, which is no longer used once the block above is replaced, but leave `estimateCardReady` in place if unsure; it is simply dead style and harmless):

```ts
  routeList: {
    gap: spacing.sm,
  },
  routeCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 12,
    padding: 16,
  },
  routeCardSelected: {
    backgroundColor: '#F0F9FF',
    borderColor: '#0284C7',
  },
  recommendedTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF9C3',
    borderColor: '#FDE047',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  recommendedTagText: {
    color: '#854D0E',
    fontSize: 11,
    fontWeight: '700',
  },
  congestionBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  congestionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter mobile test -- CustomerScreens.test.tsx`
Expected: PASS (including the existing `'renders the guided route, three stops, estimate, price, ETA, and demo source'` test — it should still pass unchanged, since the single-route DEMO fixture from Task 3 renders exactly one `RouteOptionCard` with the same `'Giá dự kiến'`/`'286.000 ₫'`/`'ETA dự kiến'`/`'Dữ liệu mô phỏng'` text the test already looks for).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/customer/orders/CustomerCreateOrderScreen.tsx apps/mobile/src/features/customer/orders/CustomerScreens.test.tsx
git commit -m "feat(mobile): render selectable route cards with congestion badges"
```

---

### Task 5: `CustomerCreateOrderRuntime.tsx` — wire route selection and token-explicit order creation

**Files:**
- Modify: `apps/mobile/src/features/customer/orders/CustomerCreateOrderRuntime.tsx`

**Interfaces:**
- Consumes: `CustomerCreateOrderScreenProps.onSelectRoute` (Task 4), `CustomerOrdersPort.createOrder(form, estimateToken)` (Task 1/2).

This file has no dedicated test today (confirmed: no `CustomerCreateOrderRuntime.test.tsx` exists in this feature, matching the untested-Runtime convention already used for `CustomerOrderDetailRuntime.tsx`). Verify this task via `typecheck` and the full feature test run in Task 6 — do not introduce a new test file for it, that would be inconsistent with the existing pattern.

- [ ] **Step 1: Implement in `CustomerCreateOrderRuntime.tsx`**

Add a `handleSelectRoute` function, right after `handleSelectVehicle`:

```ts
  function handleSelectVehicle(vehicle: 'MOTORBIKE' | 'VAN' | 'TRUCK') {
    if (!currentForm) return;
    applyFormChange({ ...currentForm, vehicleType: vehicle });
  }

  function handleSelectRoute(routeId: string) {
    if (!view || view.kind !== 'form' || view.estimate.kind !== 'ready') return;
    setView({
      ...view,
      estimate: { ...view.estimate, selectedRouteId: routeId },
    });
  }
```

Replace `handlePrimaryAction`:

```ts
  async function handlePrimaryAction(actionId: string) {
    if (!currentForm) return;
    if (actionId === 'estimate-order') {
      const next = await port.estimateOrder(currentForm);
      setView(next);
      return;
    }
    if (actionId === 'create-order') {
      if (!view || view.kind !== 'form' || view.estimate.kind !== 'ready') return;
      const selected = view.estimate.routes.find(
        (route) => route.routeId === view.estimate.selectedRouteId,
      );
      if (!selected) return;
      const detail = await port.createOrder(currentForm, selected.estimateToken);
      if (detail.kind === 'content') {
        onCreated(detail.order.id);
      }
    }
  }
```

Wire `onSelectRoute` in the returned JSX:

```tsx
  return (
    <CustomerCreateOrderScreen
      onAddStop={handleAddStop}
      onFieldChange={handleFieldChange}
      onPrimaryAction={(id) => void handlePrimaryAction(id)}
      onRemoveStop={handleRemoveStop}
      onRetry={() => void port.getCreateView().then(setView)}
      onSelectRoute={handleSelectRoute}
      onSelectVehicle={handleSelectVehicle}
      view={view}
    />
  );
```

- [ ] **Step 2: Verify with typecheck**

Run: `pnpm --filter mobile typecheck`
Expected: clean (no errors in `CustomerCreateOrderRuntime.tsx`, `adapter.ts`, `port.ts`, `model.ts`, or `CustomerCreateOrderScreen.tsx`).

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/features/customer/orders/CustomerCreateOrderRuntime.tsx
git commit -m "feat(mobile): select a route locally and create orders with its own token"
```

---

### Task 6: Full verification gate

**Files:** none (verification only).

- [ ] **Step 1: Run the full customer/orders feature test suite**

Run: `pnpm --filter mobile test -- customer/orders`
Expected: all suites pass — `adapter.test.ts`, `fixtures.test.ts`, `CustomerScreens.test.tsx`, and every other test file in this directory (`CustomerOrderDetailRoute.test.tsx`, `CustomerOrdersListRuntime.test.tsx`, `media-picker-adapter.test.ts`, `tracking-socket.test.ts`) unaffected by this plan's changes. If any of these unrelated files fail because they happen to reference `CustomerEstimateView`'s old shape or `createOrder`'s old signature, fix them the same way Task 2/4 fixed their own — this is expected fallout from a shared-type change, not new scope.

- [ ] **Step 2: Full gate**

Run: `pnpm --filter mobile typecheck && pnpm --filter mobile lint && pnpm --filter mobile test`
Expected: all green. This is the final gate for the mobile slice of this feature.

- [ ] **Step 3: Manual smoke check (documented, not automated)**

Start the Expo dev server (`pnpm --filter mobile start`, or however this project's `run` skill launches it) and walk through: create-order screen → pick MOTORBIKE, fill pickup/dropoff → "Tính giá và ETA dự kiến" → confirm the estimate panel shows at least one route card with a price, and that a "⭐ Đề xuất" tag appears if the demo/backend response marks one as recommended → switch to TRUCK vehicle → confirm the cargo-weight field is now required and a non-empty value is accepted → tap "Tính giá và ETA dự kiến" again → confirm no 400 error. Note the outcome in the task's completion report; this cannot be asserted by Jest alone since it depends on the running app shell (navigation, safe-area, real network or demo backend).

- [ ] **Step 4: No commit for this task** (verification only; if Step 1 uncovers fallout requiring fixes, commit those fixes with `fix(mobile): update <file> for multi-route estimate contract`, matching the pattern already established in the backend plan's own finishing-gate fix).

---

## Not in this plan

- Real polyline rendering of multiple routes on `RealInteractiveMap`/`RouteMapSchematic` — per the design spec's §8 risk note, this was already de-scoped to "only draw the currently selected route's polyline," which requires no change beyond what this plan already does (the map component only ever received a single origin/destination/stops set, not a polyline, so it is unaffected either way — confirmed by reading `CustomerCreateOrderScreen.tsx`'s `RealInteractiveMap` usage, which passes `origin`/`destination`/`stops` labels only, no polyline prop).
- VRP/dispatch, driver-side changes — out of scope per the design spec's non-goals.
