# LEOPARD UI/UX Design System — Standalone Implementation Plan

> **Version:** Revised / consolidated  
> **Date:** 2026-08-08  
> **Source spec:** `docs/superpowers/specs/2026-08-08-leopard-ui-ux-design.md`  
> **Supersedes:** previous `docs/superpowers/plans/14-ui-ux-standalone.md`  
> **Review inputs applied:** `14-ui-ux-standalone-changes.md` + architecture corrections agreed during review  
> **Execution style:** task-by-task, TDD-first, small commits, no silent scope expansion

---

## 0. Goal

Xây dựng toàn bộ UI/UX cho hệ thống **LEOPARD** theo hướng độc lập tương đối với tiến độ backend:

1. Design system core.
2. Brand foundation.
3. Domain contract dùng chung.
4. Standalone/demo data layer.
5. Platform-native primitives.
6. Core P0 flows cho Customer, Driver, Admin.
7. Full expansion cho các màn P1/P2.
8. Dark mode.
9. Illustration Đông Sơn Đương Đại.
10. Accessibility + visual regression + quality audit.

UI phải có thể chạy bằng **Demo Provider** khi API/provider thật chưa sẵn sàng, nhưng không được để mock contract trở thành một bản domain model khác với production.

---

# 1. Architecture

## 1.1 Monorepo responsibility map

```text
packages/
├── shared/
│   ├── domain/
│   │   ├── order/
│   │   ├── user/
│   │   ├── payment/
│   │   └── vehicle/
│   ├── auth/
│   ├── constants/
│   └── contracts/
│
├── brand/
│   ├── logo/
│   ├── app-icon/
│   └── index.ts
│
├── ui/
│   ├── tokens.css
│   ├── components/
│   ├── patterns/
│   ├── illustrations/
│   └── index.ts
│
└── testkit/
    ├── fixtures/
    ├── factories/
    └── index.ts

apps/
├── mobile/
│   ├── app/
│   └── src/
│       ├── theme/
│       ├── ui/
│       ├── features/
│       ├── data/
│       ├── hooks/
│       └── mocks/
│
└── admin/
    └── src/
        ├── app/
        ├── components/
        ├── features/
        ├── data/
        ├── hooks/
        └── mocks/
```

## 1.2 Responsibility rules

- `packages/shared/` là **source of truth cho domain enums, state machine, constants, contracts thuần TypeScript**.
- `packages/brand/` là **source of truth cho logo/mark/lockup được duyệt**.
- `packages/ui/` là **web design system**; không chứa business state machine, mock business data, API implementation.
- `packages/testkit/` chứa fixtures/factories dùng trong test/demo.
- Mobile không import React DOM component từ `packages/ui/`.
- Web không import React Native component từ `apps/mobile/`.
- Repository/API provider implementation nằm trong từng app.
- Không hardcode secret, credential, PII thật.
- Mock/demo data phải dùng cùng enum/type từ `@leopard/shared`.

---

# 2. Frozen Domain Decisions

Các quyết định dưới đây phải được khóa trước khi triển khai screen để tránh mỗi module dùng một vocabulary khác nhau.

## 2.1 Canonical roles

```ts
export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  DRIVER = 'DRIVER',
  FLEET_OWNER = 'FLEET_OWNER',
  ADMIN = 'ADMIN',
}
```

### Permission rule

**Không dùng hierarchy tuyến tính kiểu:**

```text
ADMIN > FLEET_OWNER > DRIVER > CUSTOMER
```

Các role là các capability set khác nhau, không phải cấp bậc kế thừa.

UI access sử dụng một trong hai pattern:

```ts
useRoleAccess({
  allowedRoles: [UserRole.ADMIN, UserRole.FLEET_OWNER],
})
```

hoặc capability:

```ts
can('order.read')
can('order.accept')
can('fleet.driver.read')
can('user.manage')
```

Backend vẫn là source of truth cuối cùng cho authorization/ownership.

---

## 2.2 Canonical order status

```ts
export enum OrderStatus {
  REQUESTED = 'REQUESTED',
  ACCEPTED = 'ACCEPTED',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}
```

Không dùng đồng thời `PENDING`, `PICKING_UP`, `PICKED_UP` cho cùng một ý nghĩa.

### Order state machine

```text
REQUESTED
├── ACCEPTED
└── CANCELLED

ACCEPTED
└── PICKED_UP

PICKED_UP
└── IN_TRANSIT

IN_TRANSIT
└── DELIVERED
```

State machine phải nằm trong:

```text
packages/shared/src/domain/order/
```

UI chỉ đọc `allowedTransitions`; không tự invent transition.

---

## 2.3 Intermediate stop limit

```ts
export const MAX_INTERMEDIATE_STOPS = 3
```

Customer có:
- pickup
- tối đa 3 intermediate stops
- dropoff

Không hardcode `3` trực tiếp trong screen.

---

## 2.4 Required shared enums/constants

Tối thiểu:

```text
UserRole
OrderStatus
PaymentStatus
VehicleType
DriverAvailability
NotificationType

MAX_INTERMEDIATE_STOPS
ESTIMATE_TOKEN_TTL_MS
```

---

# 3. Design Direction

## 3.1 Brand character

- 40% Industrial
- 35% Modern SaaS
- 25% Văn hóa Việt Nam / Đông Sơn

## 3.2 Visual principles

1. Mobile-first cho Customer và Driver.
2. Data-dense nhưng dễ scan.
3. Light mode mặc định.
4. Dark mode optional.
5. Semantic color luôn đi kèm text/icon.
6. Shared token values giữa web/mobile.
7. Đông Sơn dùng có chủ đích, không biến UI thành trang trí văn hóa.
8. Không gradient tím.
9. Không glassmorphism.
10. Không decorative hero.
11. Không marketing card pattern trong operational screens.

---

# 4. Tech Stack

## Web

- Next.js 16
- React 19
- Tailwind CSS 4
- `@leopard/ui`
- Playwright cho visual/browser smoke test
- Testing Library + Jest/Vitest theo repo hiện tại

## Mobile

- Expo SDK 57
- React Native 0.86
- StyleSheet
- Reanimated
- React Native Testing Library
- Expo Router

## Shared

- TypeScript
- Zod cho contract validation
- TanStack Query nếu repo đang sử dụng
- MSW cho web mock HTTP khi phù hợp

---

# 5. Global Constraints

- Branch: `codex/ui-ux-standalone` từ branch nền đã thống nhất.
- Mỗi task: **brief → RED → implement → GREEN → verify → report → commit**.
- Mỗi component/screen P0 phải có test cho critical states.
- Touch target mobile `>= 44×44`.
- Desktop controls `>= 40px`.
- WCAG AA.
- `prefers-reduced-motion`.
- Không horizontal overflow ở `360px`.
- Viewports bắt buộc:
  - `360×800`
  - `390×844`
  - `768×1024`
  - `1024×768`
  - `1440×900`
- Text người dùng nhìn thấy ưu tiên tiếng Việt.
- Technical identifiers giữ English.
- Không thêm chức năng ngoài scope chỉ vì UI “có vẻ cần”.
- Fleet Owner UI được triển khai theo plan nhưng phải tách khỏi core acceptance nếu scope MVP cuối không yêu cầu.
- Không để UI mock trở thành logic production.

---

# 6. Data Provider Strategy

Standalone không có nghĩa screen gọi mock trực tiếp.

## 6.1 Repository contract

Ví dụ:

```ts
export interface OrderRepository {
  list(params: OrderListParams): Promise<OrderSummary[]>
  getById(id: string): Promise<OrderDetail>
  create(input: CreateOrderInput): Promise<OrderDetail>
  cancel(id: string): Promise<void>
}
```

## 6.2 Runtime implementations

```text
Screen
  ↓
Feature Query Hook
  ↓
Repository interface
  ├── ApiOrderRepository
  └── DemoOrderRepository
```

Các repository cần thiết tối thiểu:

```text
AuthRepository
OrderRepository
DriverRepository
UserRepository
FleetRepository
NotificationRepository
EstimateRepository
PaymentRepository
```

## 6.3 Offline MVP policy

MVP chọn policy an toàn:

- Query/read: có thể hiển thị cached data.
- Mutation khi offline: **disable**, không queue business mutation.
- Hiển thị banner offline.
- Khi online lại: retry/refetch.
- Phân biệt:
  - offline + cache
  - offline + no cache
  - reconnecting
  - online

---

# 7. Testing Strategy

## 7.1 Unit / component

- Render.
- State.
- Interaction.
- A11y.
- Domain mapping.

## 7.2 Screen tests

Mỗi screen quan trọng có representative tests, không cần copy toàn bộ implementation vào plan.

Pattern:

```tsx
test('shows loading state', () => {
  render(<Screen />)
  expect(screen.getByTestId('loading-state')).toBeTruthy()
})

test('shows empty state', () => {
  mockEmpty()
  render(<Screen />)
  expect(screen.getByText(/chưa có/i)).toBeTruthy()
})
```

## 7.3 Implementation skeleton

Plan chỉ cung cấp skeleton:

```tsx
export function ExampleScreen() {
  const query = useExampleQuery()

  if (query.isLoading) return <LoadingState />
  if (query.isError) return <ErrorState />
  if (!query.data?.length) return <EmptyState />

  return <SuccessView data={query.data} />
}
```

Không đưa implementation giả quá chi tiết vào plan.

---

# 8. Phase 1 — Foundation

> **Mục tiêu:** sau Phase 1, domain contract, brand, token, font, shared components, provider contracts, fixture/demo data, navigation shell và visual harness đã sẵn sàng.

---

## UI-01-T01 — Web Token Migration

**Files**
- Update: `packages/ui/src/tokens.css`
- Test: `packages/ui/src/tokens.test.ts`

**Changes**
- Brand `#0F766E`
- Brand soft
- Neutral border
- Semantic colors
- Dark mode values
- Spacing 48/64
- Card/modal/drawer shadows
- Pill radius
- Motion tokens
- Font variables

### RED

```ts
expect(tokens['--color-brand']).toBe('#0F766E')
expect(tokens['--spacing-3xl']).toBe('3rem')
expect(tokens['--spacing-4xl']).toBe('4rem')
expect(tokens['--radius-pill']).toBe('9999px')
```

### Implement

Cập nhật token file, không thay đổi component business logic.

### Verify

```text
pnpm test tokens
pnpm typecheck
```

**Commit**  
`feat(ui): migrate web tokens to Nhiet Doi Xanh`

---

## UI-01-T02 — Mobile Token Migration

**Files**
- Update: `apps/mobile/src/theme/tokens.ts`
- Test: token test hiện có hoặc tạo mới

### RED

```ts
expect(tokens.colors.brand).toBe('#0F766E')
expect(tokens.spacing).toContain(48)
expect(tokens.spacing).toContain(64)
expect(tokens.motion).toBeDefined()
```

### Implement

Đồng bộ token values với web.

### Verify

- test
- typecheck
- không break consumer

**Commit**  
`feat(mobile): sync design tokens with web`

---

## UI-01-DOMAIN — Freeze Domain Contracts

**Files**
- Create/update:
  - `packages/shared/src/domain/order/order-status.ts`
  - `packages/shared/src/domain/order/order-state-machine.ts`
  - `packages/shared/src/domain/order/order.constants.ts`
  - `packages/shared/src/domain/user/user-role.ts`
  - `packages/shared/src/domain/payment/payment-status.ts`
  - `packages/shared/src/domain/vehicle/vehicle-type.ts`

### RED

```ts
expect(MAX_INTERMEDIATE_STOPS).toBe(3)
expect(canTransition(OrderStatus.REQUESTED, OrderStatus.ACCEPTED)).toBe(true)
expect(canTransition(OrderStatus.ACCEPTED, OrderStatus.DELIVERED)).toBe(false)
```

### Implement

- Canonical enum.
- Pure state machine.
- Không React hook trong shared domain.

### Verify

- shared tests
- grep repo không còn duplicate enum đáng kể

**Commit**  
`refactor(shared): centralize ui domain contracts`

---

## UI-01-FONT — Font Setup Web & Mobile

### Web

Ưu tiên framework font loading, tránh runtime CSS `@import` nếu stack hiện tại hỗ trợ.

- Crimson Pro: headings
- Be Vietnam Pro: body
- JetBrains Mono: code/IDs

### Mobile

Load font thật trước khi render app bằng Expo-compatible font loader.

**Files**
- Update web root layout
- Update mobile root layout
- Update token font family mapping
- Add font loading test/smoke

### RED

```ts
expect(theme.fontFamily.heading).toBeDefined()
expect(theme.fontFamily.body).toBeDefined()
expect(theme.fontFamily.mono).toBeDefined()
```

### Acceptance

- Font ready trước app content.
- Có fallback.
- Không phụ thuộc comment “sau này cài font”.

**Commit**  
`feat(ui): configure leopard typography across platforms`

---

## UI-01-BRAND — Brand Asset Foundation

> Không tự tạo logo final bằng code. Dùng master SVG đã được stakeholder duyệt. Nếu chưa duyệt, dùng temporary neutral placeholder được gắn rõ `TEMP`.

**Create**
```text
packages/brand/
├── logo/
│   ├── leopard-mark.svg
│   ├── leopard-lockup.svg
│   ├── leopard-mark-white.svg
│   └── leopard-mark-mono.svg
├── app-icon/
└── index.ts
```

### RED

```ts
expect(brandAssets.mark).toBeDefined()
expect(brandAssets.lockup).toBeDefined()
```

### Rules

- Không duplicate SVG trong từng app.
- Không redraw logo trong screen.
- Có full-color + mono + inverse.
- Không dùng raster khi SVG phù hợp.

**Commit**  
`feat(brand): establish leopard brand asset package`

---

## UI-01-T03 — Dong Son SVG Pattern Library

**Create**
- `pattern-sun.tsx`
- `pattern-wave.tsx`
- `pattern-star.tsx`
- `pattern-rice.tsx`
- `index.ts`

### RED

```tsx
render(<PatternSun width={48} height={48} />)
expect(screen.getByTestId('pattern-sun')).toBeTruthy()
```

### Constraints

- SVG inline.
- Không external `<image>`.
- Geometric.
- Flat.
- Responsive.
- Works light/dark.

**Commit**  
`feat(ui): add Dong Son pattern library`

---

## UI-01-T04 — Form Components

**Web files**
- `Input.tsx`
- `Select.tsx`
- `Textarea.tsx`

### RED

```tsx
render(<Input label="Họ tên" error="Bắt buộc" />)
expect(screen.getByLabelText('Họ tên')).toBeTruthy()
expect(screen.getByText('Bắt buộc')).toBeTruthy()
```

### Implement

- label/hint/error
- disabled
- focus visible
- >= 40px desktop

**Commit**  
`feat(ui): add form primitives`

---

## UI-01-T05 — Domain Display Components

**Web**
- `OrderTimeline`
- `RouteSummary`
- `PaymentStatus`

### RED

```tsx
render(<OrderTimeline steps={steps} />)
expect(screen.getByText('Đã giao hàng')).toBeTruthy()
```

### Rules

- Props use types từ `@leopard/shared`.
- Không tự định nghĩa `OrderStatus`.
- DEMO source có label rõ.

**Commit**  
`feat(ui): add order domain display components`

---

## UI-01-T06 — Overlay Components

- Dialog
- Toast
- Alert

### RED

```tsx
render(<Dialog open title="Xác nhận" onClose={onClose}>...</Dialog>)
fireEvent.keyDown(document, { key: 'Escape' })
expect(onClose).toHaveBeenCalled()
```

### Acceptance

- focus handling
- Escape
- aria modal
- reduced motion

**Commit**  
`feat(ui): add dialog toast and alert`

---

## UI-01-PLACEHOLDER — Placeholder Illustration Set

Tạo trước Phase 2 để không reference illustration chưa tồn tại.

**Create**
- `packages/ui/src/illustrations/PlaceholderEmpty.tsx`
- `PlaceholderError.tsx`
- `PlaceholderOffline.tsx`

### RED

```tsx
render(<PlaceholderEmpty aria-label="Không có dữ liệu" />)
expect(screen.getByLabelText('Không có dữ liệu')).toBeTruthy()
```

### Rule

Đây là placeholder geometric, không được gọi là final Đông Sơn illustration.

**Commit**  
`feat(ui): add temporary state illustrations`

---

## UI-01-DATA — Repository Contracts & Provider Selection

**Shared contracts**
- Auth
- Order
- Driver
- User
- Fleet
- Notification
- Estimate
- Payment

**Per-app**
- provider selector
- API implementation skeleton
- Demo implementation skeleton

### RED

```ts
const repo = createOrderRepository({ mode: 'demo' })
expect(repo.list).toBeTypeOf('function')
```

### Implementation skeleton

```ts
export function createOrderRepository(config: DataConfig): OrderRepository {
  return config.mode === 'demo'
    ? new DemoOrderRepository()
    : new ApiOrderRepository(config)
}
```

**Commit**  
`feat(data): add frontend repository abstraction`

---

## UI-01-MOCK — Test Fixtures & Demo Data

**Create**
```text
packages/testkit/
├── fixtures/
├── factories/
└── index.ts
```

### Fixtures

- orders đủ canonical statuses
- customer
- driver
- fleet owner
- admin
- fleets
- notifications
- valid/expired estimate token
- payment states

### RED

```ts
expect(fixtures.orders.some(o => o.status === OrderStatus.REQUESTED)).toBe(true)
expect(fixtures.orders.some(o => o.status === OrderStatus.PICKED_UP)).toBe(true)
```

### Rules

- Không có `PICKING_UP`.
- Không có `PENDING`.
- Types import từ shared.

**Commit**  
`feat(testkit): add leopard demo fixtures`

---

## UI-01-SHELL — App Shell & Navigation

### Mobile

```text
(public)
└── login

(customer)
├── orders
├── orders/new
├── notifications
└── profile

(driver)
├── overview
├── orders
└── profile
```

### Web

```text
(admin)
├── dashboard
├── orders
├── users
├── fleets
└── settings

(fleet)
├── dashboard
├── drivers
├── orders
└── reports
```

### RED

```tsx
expect(resolveHomeRoute(UserRole.CUSTOMER)).toBe('/customer/orders')
expect(resolveHomeRoute(UserRole.DRIVER)).toBe('/driver')
```

### Acceptance

- role default route
- unauthorized redirect
- 404
- session expired route
- mobile safe area
- active nav state
- back behavior
- order detail deep link

**Commit**  
`feat(nav): establish leopard app shells`

---

## UI-01-T07 — UI Hooks

**Do not place business rules here.**

Hooks:
- `useEstimateToken`
- `useRoleAccess`
- `useSessionRefresh`

Optional:
- `useOrderState` chỉ là thin wrapper quanh shared pure function.

### RED

```ts
expect(renderHook(() =>
  useRoleAccess({ allowedRoles: [UserRole.ADMIN], userRole: UserRole.DRIVER })
).result.current.hasAccess).toBe(false)
```

### Important

Không dùng role hierarchy.

**Commit**  
`feat(ui): add frontend access and session hooks`

---

## UI-01-OFFLINE — Connectivity & Offline Read Policy

**Mobile/Web**
- Connectivity context/hook
- Query integration
- Cached read behavior
- Mutation disabled offline

### RED

```tsx
mockOfflineWithCachedData()
render(<CustomerOrdersScreen />)
expect(screen.getByText('Đang offline')).toBeTruthy()
expect(screen.getByText(/Đơn hàng/)).toBeTruthy()
```

### Acceptance

- offline + cached
- offline + empty
- reconnecting
- auto refetch on reconnect
- no queued delivery mutation in MVP

**Commit**  
`feat(data): add offline read and reconnect policy`

---

## UI-01-T08 — Component Audit & Polish

Update existing:
- Button
- StatusBadge
- ScreenState
- DataTable
- FilterBar
- Pagination
- MapPanel

### Rules

- ScreenState dùng placeholder illustration.
- Final illustrations chỉ thay ở Phase 3.
- StatusBadge maps canonical enum.
- Motion respects reduced motion.

**Commit**  
`feat(ui): polish core components`

---

## UI-01-VISUAL — Visual Regression Harness

### Web

Playwright screenshot baselines cho P0 shells/components.

### Mobile

Screen smoke screenshots cho P0 khi infra cho phép; nếu CI chưa hỗ trợ, ghi manual device capture checklist.

### Baseline targets

- Customer Orders
- Create Order
- Order Detail
- Driver Overview
- Driver Delivery
- Admin Dashboard
- Admin Orders

**Commit**  
`test(ui): add visual regression harness`

---

# 9. Phase 2 — P0 Prototype Screens

> **Order:** native foundation trước, sau đó screen.

---

## Sub-phase A — Platform Native Components

---

## UI-02-T01 — Mobile-Native Components

**Create**
- BottomSheet
- SwipeableRow
- AvailabilityToggle
- ActiveOrderBanner
- PullToRefresh
- QuickActionFab

### RED

```tsx
test('availability toggle invokes onToggle', () => {
  const onToggle = jest.fn()
  render(<AvailabilityToggle isOnline={false} onToggle={onToggle} />)
  fireEvent.press(screen.getByRole('switch'))
  expect(onToggle).toHaveBeenCalled()
})
```

### Implementation skeleton

```tsx
export function AvailabilityToggle(props: Props) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: props.isOnline }}
      onPress={props.onToggle}
    />
  )
}
```

### Verify

- gesture smooth
- a11y label
- 44px target

**Commit**  
`feat(mobile): add native interaction primitives`

---

## UI-02-T02 — Web-Native Components

**Create**
- CommandPalette
- ColumnResize
- BulkActionBar
- DateRangePicker
- ExportButton

### RED

```tsx
test('opens command palette on Ctrl+K', () => {
  render(<CommandPalette items={items} />)
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
  expect(screen.getByRole('dialog')).toBeTruthy()
})
```

### Implementation skeleton

```tsx
export function BulkActionBar({ selectedCount, actions }: Props) {
  if (!selectedCount) return null
  return <div role="toolbar">{/* actions */}</div>
}
```

**Commit**  
`feat(admin): add web interaction primitives`

---

## Sub-phase B — Mobile P0 Screens

---

## UI-02-T03 — Customer Orders List

**Route**  
`apps/mobile/app/(customer)/orders/index.tsx`

**Features**
- Tất cả / Đang xử lý / Hoàn thành
- OrderCard
- Route summary
- Vehicle
- Distance
- Price
- Swipe action
- FAB
- 5 states

### RED

```tsx
test('renders three skeleton cards while loading', () => {
  mockOrdersLoading()
  render(<CustomerOrdersScreen />)
  expect(screen.getAllByTestId('order-skeleton')).toHaveLength(3)
})

test('filters processing orders', () => {
  render(<CustomerOrdersScreen />)
  fireEvent.press(screen.getByText('Đang xử lý'))
  expect(screen.getByText(/Đang xử lý/)).toBeTruthy()
})
```

### Implementation skeleton

```tsx
export function CustomerOrdersScreen() {
  const query = useOrdersQuery()
  const [filter, setFilter] = useState<OrderFilter>('all')

  if (query.isLoading) return <OrdersSkeleton />
  if (query.isError) return <OrdersError />
  if (!query.data?.length) return <OrdersEmpty />

  return <OrdersSuccess orders={query.data} filter={filter} />
}
```

**Commit**  
`feat(mobile): implement customer order list`

---

## UI-02-T04 — Customer Create Order

**Route**  
`apps/mobile/app/(customer)/orders/new.tsx`

**Features**
- Vietmap autocomplete adapter
- pickup
- max 3 intermediate stops
- dropoff
- vehicle selector
- cargo notes
- ETA/price
- estimate token gate
- demo label
- offline mutation disabled

### RED

```tsx
test('does not allow more than three intermediate stops', () => {
  render(<CreateOrderScreen />)
  addThreeStops()
  expect(screen.getByText('Thêm điểm dừng')).toBeDisabled()
})

test('submit is disabled without valid estimate token', () => {
  mockEstimateToken(null)
  render(<CreateOrderScreen />)
  expect(screen.getByText('Đặt đơn')).toBeDisabled()
})
```

### Implementation skeleton

```tsx
const canAddStop = fields.length < MAX_INTERMEDIATE_STOPS
const canSubmit = formState.isValid && estimate.isValid && isOnline
```

**Commit**  
`feat(mobile): implement create order flow`

---

## UI-02-T05 — Customer Order Detail + Tracking

**Route**  
`apps/mobile/app/(customer)/orders/[id].tsx`

**Features**
- canonical timeline
- MapPanel placeholder/adapter
- route
- driver info after accepted
- payment
- cancel only REQUESTED
- permission denied
- session expired

### RED

```tsx
test('shows cancel only for requested order', () => {
  mockOrder({ status: OrderStatus.REQUESTED })
  render(<OrderDetailScreen />)
  expect(screen.getByText('Hủy đơn')).toBeTruthy()
})

test('shows map when in transit', () => {
  mockOrder({ status: OrderStatus.IN_TRANSIT })
  render(<OrderDetailScreen />)
  expect(screen.getByTestId('tracking-map')).toBeTruthy()
})
```

### Implementation skeleton

```tsx
const canCancel = order.status === OrderStatus.REQUESTED
const showDriver = order.status !== OrderStatus.REQUESTED
```

**Commit**  
`feat(mobile): implement customer order detail`

---

## UI-02-T06 — Driver Overview

**Features**
- ONLINE/OFFLINE
- KPI
- active order
- available orders
- swipe accept
- empty/loading/error/offline

### RED

```tsx
test('shows active order banner when driver has active order', () => {
  mockDriverOverview({ activeOrder: fixtures.orders.accepted })
  render(<DriverOverviewScreen />)
  expect(screen.getByText('Tiếp tục giao')).toBeTruthy()
})
```

### Implementation skeleton

```tsx
return (
  <>
    <AvailabilityToggle ... />
    {activeOrder && <ActiveOrderBanner ... />}
    <AvailableOrdersList ... />
  </>
)
```

**Commit**  
`feat(mobile): implement driver overview`

---

## UI-02-T07 — Driver Active Delivery

**Route**  
`apps/mobile/app/(driver)/orders/[id].tsx`

### State-driven CTA

```text
ACCEPTED   -> Đã lấy hàng
PICKED_UP  -> Bắt đầu giao
IN_TRANSIT -> Đã giao hàng
```

### RED

```tsx
test.each([
  [OrderStatus.ACCEPTED, 'Đã lấy hàng'],
  [OrderStatus.PICKED_UP, 'Bắt đầu giao'],
  [OrderStatus.IN_TRANSIT, 'Đã giao hàng'],
])('renders correct CTA', (status, label) => {
  mockOrder({ status })
  render(<DriverDeliveryScreen />)
  expect(screen.getByText(label)).toBeTruthy()
})
```

### Implementation skeleton

```tsx
const action = getDeliveryAction(order.status)
```

### Acceptance

- delivery proof required before DELIVERED
- offline disables mutation CTA
- phone masked
- sticky bottom safe area

**Commit**  
`feat(mobile): implement active delivery screen`

---

## Sub-phase C — Web P0 Screens

---

## UI-02-T08 — Admin Dashboard

**Features**
- KPI
- recent orders
- alerts
- status breakdown
- 5 states
- responsive

### RED

```tsx
test('renders recent orders', async () => {
  mockAdminDashboard()
  render(<AdminDashboard />)
  expect(await screen.findByText(fixtures.orders[0].id)).toBeTruthy()
})
```

### Implementation skeleton

```tsx
export function AdminDashboard() {
  const dashboard = useAdminDashboardQuery()
  return <DashboardState query={dashboard} />
}
```

**Commit**  
`feat(admin): implement admin dashboard`

---

## UI-02-T09 — Admin Orders

**Features**
- columns
- filters
- sort
- bulk actions
- detail panel
- server pagination

### RED

```tsx
test('shows bulk toolbar after selecting rows', () => {
  render(<AdminOrdersPage />)
  selectFirstOrder()
  expect(screen.getByRole('toolbar')).toBeTruthy()
})
```

### Implementation skeleton

```tsx
const query = useAdminOrdersQuery({ filters, sort, page })
```

**Commit**  
`feat(admin): implement admin order management`

---

## Sub-phase D — Auth / Splash

---

## UI-02-T10 — Login + Onboarding + Splash

**Features**
- approved LEOPARD brand asset
- PatternSun / PatternRice
- 3 onboarding slides
- Firebase OTP adapter or demo account selector
- first launch logic

### RED

```tsx
test('renders three onboarding pages on first launch', () => {
  mockFirstLaunch(true)
  render(<AuthEntry />)
  expect(screen.getAllByTestId('onboarding-slide')).toHaveLength(3)
})
```

### Implementation skeleton

```tsx
if (!fontsReady) return <SplashFallback />
if (firstLaunch) return <OnboardingSlides />
return <LoginScreen />
```

### Rule

Không tự vẽ một logo khác với `@leopard/brand`.

**Commit**  
`feat(mobile): implement splash onboarding and login`

---

# 10. Phase 3 — Full Expansion

---

## UI-03-T01 — Customer Notifications

### RED

```tsx
test('marks unread notification visually', () => {
  render(<NotificationList items={fixtures.notifications} />)
  expect(screen.getAllByTestId('unread-indicator').length).toBeGreaterThan(0)
})
```

### Skeleton

```tsx
const query = useNotificationsQuery()
return <NotificationState query={query} />
```

**Commit**  
`feat(mobile): implement customer notifications`

---

## UI-03-T02 — Customer Profile

### RED

```tsx
test('logs out after confirmation', () => {
  render(<CustomerProfile />)
  fireEvent.press(screen.getByText('Đăng xuất'))
  confirmDialog()
  expect(mockLogout).toHaveBeenCalled()
})
```

### Skeleton

```tsx
return <ProfileLayout user={session.user} sections={sections} />
```

**Commit**  
`feat(mobile): implement customer profile`

---

## UI-03-T03 — Driver Order History

### RED

```tsx
test('supports paginated history loading', async () => {
  render(<DriverOrderHistory />)
  triggerEndReached()
  expect(mockNextPage).toHaveBeenCalled()
})
```

### Skeleton

```tsx
const history = useInfiniteDriverOrdersQuery()
```

**Commit**  
`feat(mobile): implement driver order history`

---

## UI-03-T04 — Driver Profile

### RED

```tsx
test('renders rating and vehicle type', () => {
  render(<DriverProfile driver={fixtures.driver} />)
  expect(screen.getByText(/đánh giá/i)).toBeTruthy()
})
```

### Skeleton

```tsx
return <DriverProfileView driver={driver} stats={stats} />
```

**Commit**  
`feat(mobile): implement driver profile`

---

## UI-03-T05 — Rating + Delivery Proof

### RED

```tsx
test('rating submit is disabled until a star is selected', () => {
  render(<RatingForm />)
  expect(screen.getByText('Gửi đánh giá')).toBeDisabled()
})

test('delivery proof accepts camera or gallery source', () => {
  render(<DeliveryProof />)
  expect(screen.getByText('Chụp ảnh')).toBeTruthy()
  expect(screen.getByText('Chọn từ thư viện')).toBeTruthy()
})
```

### Skeleton

```tsx
const canSubmit = rating >= 1
```

**Commit**  
`feat(mobile): implement rating and delivery proof`

---

## UI-03-T06 — Fleet Owner Web

**Pages**
- dashboard
- drivers
- orders
- reports

### RED

```tsx
test('fleet dashboard only renders fleet-scoped data', async () => {
  mockFleetDashboard()
  render(<FleetDashboard />)
  expect(await screen.findByText(fixtures.fleets[0].name)).toBeTruthy()
})
```

### Skeleton

```tsx
const dashboard = useFleetDashboardQuery(currentFleetId)
```

### Important

UI filter không thay thế backend ownership check.

**Commit**  
`feat(admin): implement fleet owner workspace`

---

## UI-03-T07 — Admin Users + Fleets + Settings

### RED

```tsx
test('filters users by role', () => {
  render(<UserTable users={fixtures.users} />)
  selectRole(UserRole.DRIVER)
  expect(screen.getAllByTestId('user-row')).toHaveLength(expectedDriverCount)
})
```

### Skeleton

```tsx
const users = useAdminUsersQuery(filters)
```

**Commit**  
`feat(admin): implement admin users fleets and settings`

---

## UI-03-T08 — Dark Mode

### RED

```tsx
test('persists theme preference', () => {
  render(<ThemeToggle />)
  fireEvent.click(screen.getByRole('switch'))
  expect(localStorage.getItem('theme')).toBe('dark')
})
```

### Skeleton

```tsx
const theme = useTheme()
```

### Acceptance

- system default
- user override
- persistence
- semantic colors intact
- brand assets inverse variant

**Commit**  
`feat(ui): implement dark mode`

---

## UI-03-T09 — Final Đông Sơn Illustrations

**Create**
- EmptyOrders
- EmptyNotifications
- EmptyDrivers
- ErrorGeneral
- PermissionDenied
- NoConnection

### RED

```tsx
test('illustration is inline svg and accessible', () => {
  render(<EmptyOrders aria-label="Chưa có đơn hàng" />)
  expect(screen.getByLabelText('Chưa có đơn hàng')).toBeTruthy()
})
```

### Skeleton

```tsx
export function EmptyOrders(props: IllustrationProps) {
  return <svg viewBox="0 0 288 192" role="img" {...props}>{/* geometry */}</svg>
}
```

### Mandatory final step

Search and replace all `Placeholder*` usage ở Phase 1/2 bằng final illustration phù hợp.

**Commit**  
`feat(ui): add final Dong Son state illustrations`

---

## UI-03-T10 — Accessibility Audit

### Checklist

- 4.5:1 body contrast
- 3:1 large text/UI
- focus visible
- logical tab order
- no unexpected focus trap
- aria-live status
- linked form labels
- sortable table announcement
- row selection accessible
- touch target
- reduced motion
- no overflow 360px

### RED

Audit report phải có ít nhất một machine-readable output hoặc test failure trước khi fix nếu vấn đề tồn tại.

### Implement

Fix in place.

### Verify

- automated a11y tests
- manual keyboard walk
- mobile screen reader smoke for P0
- final viewport checks

**Commit**  
`fix(a11y): resolve leopard accessibility findings`

---

## UI-03-T11 — Final Visual Regression & Cross-Platform Polish

### Targets

- all P0
- dark/light
- 5 required viewport sizes where applicable
- offline banner
- empty/error
- long Vietnamese text
- high-density admin tables

### RED

Run baseline diff and capture all differences.

### Implement

Only fix unintended regressions; intentional changes update baselines with review note.

**Commit**  
`test(ui): finalize visual regression baselines`

---

# 11. Quality Gates Per Screen

Trước khi đánh dấu complete:

- [ ] loading
- [ ] empty
- [ ] error
- [ ] success
- [ ] offline
- [ ] permission denied nếu route có role restriction
- [ ] session expired nếu có authenticated mutation
- [ ] mobile touch target >= 44×44
- [ ] desktop control >= 40px
- [ ] WCAG AA
- [ ] reduced motion
- [ ] no horizontal overflow 360px
- [ ] Vietnamese text checked
- [ ] canonical `OrderStatus`
- [ ] no direct business enum duplication
- [ ] no direct mock fixture import trong production screen
- [ ] screen uses repository/query layer
- [ ] offline mutation policy respected
- [ ] visual smoke screenshot captured cho P0
- [ ] dark mode checked nếu Phase 3 đã hoàn tất

---

# 12. Definition of Done Per Task

Một task chỉ DONE khi:

1. Test đỏ trước implement hoặc có failure chứng minh thiếu behavior.
2. Implementation đúng architecture.
3. Test xanh.
4. Typecheck xanh.
5. Lint xanh.
6. Không duplicate domain enum/constant.
7. Không thêm secret/PII.
8. Có manual visual check nếu task có UI.
9. Có report ngắn:
   - files changed
   - behavior added
   - tests run
   - known limitation
10. Conventional commit.

---

# 13. Dependency Graph

```text
PHASE 1 — FOUNDATION

T01 Web Tokens ──────────┐
T02 Mobile Tokens ───────┤
DOMAIN Contracts ────────┼────────┐
FONT Setup ──────────────┤        │
BRAND Assets ────────────┤        │
T03 Patterns ────────────┤        │
T04 Forms ───────────────┤        │
T05 Domain Displays ─────┤        │
T06 Overlays ────────────┤        │
PLACEHOLDER Illustr. ────┤        │
DATA Repositories ───────┤        │
MOCK/Testkit ────────────┤        │
SHELL Navigation ────────┤        │
T07 UI Hooks ────────────┤        │
OFFLINE Policy ──────────┤        │
T08 Audit/Polish ────────┤        │
VISUAL Harness ──────────┘        │
                                  ▼
PHASE 2 — P0

Native Mobile Components
Native Web Components
        │
        ├── Customer Orders
        ├── Customer Create Order
        ├── Customer Order Detail
        ├── Driver Overview
        ├── Driver Delivery
        ├── Admin Dashboard
        ├── Admin Orders
        └── Auth/Splash
                 │
                 ▼
PHASE 3 — EXPANSION

Customer Notifications/Profile
Driver History/Profile
Rating/Delivery Proof
Fleet Workspace
Admin Users/Fleets/Settings
Dark Mode
Final Dong Son Illustrations
Accessibility Audit
Final Visual Regression
```

---

# 14. Phase Boundary Rules

## Phase 1

- Không implement full screen business flow.
- Được tạo shell/demo harness.
- Domain contract phải freeze trước screen.
- Mock phải import domain type thật.
- Không dùng final illustration nếu chưa được duyệt.

## Phase 2

- P0 only.
- Native components tồn tại trước screen dùng chúng.
- Không thêm P1/P2 vì “tiện tay”.
- Backend chưa có thì dùng Demo Provider, không đổi screen contract.

## Phase 3

- Remaining screens.
- Final illustration.
- Dark mode.
- A11y.
- Visual regression.
- Scope creep cần Change Request riêng.

---

# 15. Explicit Non-Goals

Không tự động thêm trong standalone UI plan:

- AI ETA production.
- OR-Tools production.
- Truck-routing chuyên sâu.
- Bank reconciliation.
- MoMo/VNPay.
- Native store release.
- Enterprise SLA.
- Background delivery mutation queue.
- Production-grade fleet analytics ngoài scope.
- New actor/role ngoài canonical roles.

---

# 16. Recommended Execution Order

```text
01 Web Tokens
02 Mobile Tokens
03 Domain Freeze
04 Font
05 Brand Assets
06 Patterns
07 Form Components
08 Domain Display Components
09 Overlay Components
10 Placeholder Illustrations
11 Repository Contracts
12 Testkit / Demo Fixtures
13 App Shell / Navigation
14 UI Hooks
15 Offline Policy
16 Component Audit
17 Visual Harness

18 Mobile Native Components
19 Web Native Components
20 Customer Orders
21 Customer Create Order
22 Customer Order Detail
23 Driver Overview
24 Driver Delivery
25 Admin Dashboard
26 Admin Orders
27 Auth/Splash

28 Customer Notifications
29 Customer Profile
30 Driver History
31 Driver Profile
32 Rating + Delivery Proof
33 Fleet Workspace
34 Admin Users/Fleets/Settings
35 Dark Mode
36 Final Dong Son Illustrations
37 Accessibility Audit
38 Final Visual Regression
```

---

# 17. Final Acceptance — UI/UX Standalone

Plan được xem là hoàn thành khi:

- [ ] Customer P0 flow chạy end-to-end với Demo Provider.
- [ ] Driver P0 flow chạy end-to-end với Demo Provider.
- [ ] Admin P0 dashboard/orders chạy bằng Demo Provider.
- [ ] Domain enum không duplicate.
- [ ] `MAX_INTERMEDIATE_STOPS = 3` được dùng xuyên suốt.
- [ ] Role access không dùng hierarchy tuyến tính.
- [ ] Order transition source nằm trong `@leopard/shared`.
- [ ] Mock fixtures nằm ngoài `packages/ui`.
- [ ] Screen không import fixture trực tiếp ở production path.
- [ ] Có Data Repository abstraction.
- [ ] Có offline read policy.
- [ ] Brand asset package dùng chung.
- [ ] Font load thật ở web/mobile.
- [ ] Placeholder illustration đã được thay bằng final artwork ở Phase 3.
- [ ] Dark mode hoạt động.
- [ ] WCAG AA core flow pass.
- [ ] Visual regression baseline P0 hoàn tất.
- [ ] Không có horizontal overflow ở viewport bắt buộc.
- [ ] Không có secret/PII hardcode.
- [ ] Tất cả P0 screen có loading/empty/error/success/offline.
- [ ] Codebase đủ ổn định để chuyển từ Demo Provider sang API Provider mà không rewrite screen architecture.

---

# 18. Notes for Agentic Workers

1. Đọc task hiện tại, không triển khai task sau trước dependency.
2. Không sửa domain contract trong screen.
3. Nếu backend contract chưa rõ, giữ repository interface + Demo Provider; không invent endpoint production.
4. Nếu asset logo final chưa được duyệt, giữ placeholder có nhãn `TEMP`; không tạo logo giả làm final.
5. Nếu test snippet không khớp hoàn toàn repo test stack, giữ nguyên behavior/acceptance và điều chỉnh syntax theo test framework hiện hữu.
6. Khi có xung đột giữa plan và canonical domain contract đã freeze, canonical domain thắng.
7. Khi có xung đột giữa mock và production type, production/shared type thắng.
8. Không thêm scope ngoài MVP để “hoàn thiện UI”.
