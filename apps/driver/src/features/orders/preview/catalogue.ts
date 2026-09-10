import type { DriverDetailView, DriverListView } from '../model';
import {
  DRIVER_DETAIL_SCENARIOS,
  DRIVER_LIST_SCENARIOS,
  createDriverDetailFixture,
  createDriverListFixture,
  type DriverDetailScenarioId,
  type DriverListScenarioId,
} from '../fixtures';

export type DriverPreviewScreen = 'list' | 'detail';
export type DriverPreviewView = DriverListView | DriverDetailView;

const ASSIGNED_ORDER_ID = '22222222-2222-4222-8222-222222222001';
const PUBLIC_DETAIL_SCENARIOS = new Set<DriverDetailScenarioId>([
  'D-DETAIL-PUBLIC-REQUESTED',
  'D-DETAIL-ACCEPT-PENDING',
  'D-DETAIL-ACCEPT-RACE',
  'D-DETAIL-ACTIVE-ORDER-CONFLICT',
  'D-DETAIL-INVALID-TRANSITION',
  'D-DETAIL-LOADING',
  'D-DETAIL-ERROR',
  'D-DETAIL-PERMISSION',
]);

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function driverOrderKind(orderId: string): 'assigned' | 'requested' {
  if (orderId === ASSIGNED_ORDER_ID) return 'assigned';
  const list = createDriverListFixture('D-LIST-ACTIVE-REQUESTED');
  if (list.kind === 'content' && list.requestedOrders.some((order) => order.id === orderId)) {
    return 'requested';
  }
  throw new TypeError('Driver preview order is not available');
}

function requestedOrderForRoute(orderId: string) {
  const list = createDriverListFixture('D-LIST-ACTIVE-REQUESTED');
  const order = list.kind === 'content'
    ? list.requestedOrders.find((item) => item.id === orderId)
    : undefined;
  if (!order) throw new TypeError('Driver preview order is not available');
  return order;
}

function bindCommandOrderId<T extends { readonly orderId?: string }>(
  command: T,
  orderId: string,
): T {
  return { ...command, orderId };
}

function bindDriverDetail(view: DriverDetailView, orderId: string): DriverDetailView {
  if (view.kind !== 'content') return view;
  const primaryTask = view.primaryTask
    ? {
        ...view.primaryTask,
        command: bindCommandOrderId(view.primaryTask.command, orderId),
      }
    : null;
  const offeredLifecycleCommand = view.offeredLifecycleCommand
    ? bindCommandOrderId(view.offeredLifecycleCommand, orderId)
    : null;

  if (view.accessScope === 'PUBLIC_SUMMARY') {
    const order = requestedOrderForRoute(orderId);
    return deepFreeze({
      ...view,
      order: { ...order, id: orderId },
      primaryTask,
      offeredLifecycleCommand,
    });
  }

  return deepFreeze({
    ...view,
    order: { ...view.order, id: orderId },
    primaryTask,
    offeredLifecycleCommand,
  });
}

const defaults = {
  list: 'D-LIST-ACTIVE-REQUESTED',
  detail: 'D-DETAIL-PROOF-REQUIRED',
} as const;

export function createDriverPreviewView(
  screen: DriverPreviewScreen,
  requestedScenario: string | null,
  orderId: string | null = null,
): DriverPreviewView {
  const selectedOrderId = screen === 'detail' ? orderId ?? ASSIGNED_ORDER_ID : null;
  const orderKind = selectedOrderId ? driverOrderKind(selectedOrderId) : null;
  const scenario =
    requestedScenario ??
    (screen === 'detail' && orderKind === 'requested'
      ? 'D-DETAIL-PUBLIC-REQUESTED'
      : defaults[screen]);
  if (screen === 'list' && DRIVER_LIST_SCENARIOS.includes(scenario as DriverListScenarioId)) {
    return createDriverListFixture(scenario as DriverListScenarioId);
  }
  if (screen === 'detail' && DRIVER_DETAIL_SCENARIOS.includes(scenario as DriverDetailScenarioId)) {
    const detailScenario = scenario as DriverDetailScenarioId;
    if (orderKind === 'requested' && !PUBLIC_DETAIL_SCENARIOS.has(detailScenario)) {
      throw new TypeError('Driver preview scenario exceeds the selected order scope');
    }
    return bindDriverDetail(
      createDriverDetailFixture(detailScenario),
      selectedOrderId ?? ASSIGNED_ORDER_ID,
    );
  }
  throw new TypeError(`Unsupported Driver preview scenario: ${scenario}`);
}
