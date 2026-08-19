import type {
  CustomerCreateView,
  CustomerDetailView,
  CustomerListView,
  CustomerOrderDetailDataView,
} from '../model';
import {
  CUSTOMER_CREATE_SCENARIOS,
  CUSTOMER_DETAIL_SCENARIOS,
  CUSTOMER_LIST_SCENARIOS,
  createCustomerCreateFixture,
  createCustomerDetailFixture,
  createCustomerListFixture,
  type CustomerCreateScenarioId,
  type CustomerDetailScenarioId,
  type CustomerListScenarioId,
} from '../fixtures';

export type CustomerPreviewScreen = 'list' | 'create' | 'detail';
export type CustomerPreviewView = CustomerListView | CustomerCreateView | CustomerDetailView;

const DEFAULT_DETAIL_ORDER_ID = '11111111-1111-4111-8111-111111111001';

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function customerOrderForRoute(orderId: string) {
  const list = createCustomerListFixture('C-LIST-SUCCESS');
  if (list.kind !== 'content') throw new TypeError('Customer preview order list is unavailable');
  const order = list.orders.find((item) => item.id === orderId);
  if (!order) throw new TypeError('Customer preview order is not available');
  return order;
}

function withOrderTarget<T extends { readonly orderId?: string }>(action: T, orderId: string): T {
  return { ...action, orderId };
}

function bindCustomerDetailOrder(
  view: CustomerDetailView,
  orderId: string,
  useListSnapshot: boolean,
): CustomerDetailView {
  const listOrder = customerOrderForRoute(orderId);
  if (view.kind !== 'content') return view;

  const paymentAction = view.order.payment.action
    ? withOrderTarget(view.order.payment.action, orderId)
    : null;
  const cancel =
    view.cancel.kind === 'hidden' || view.cancel.kind === 'unavailable'
      ? view.cancel
      : { ...view.cancel, action: withOrderTarget(view.cancel.action, orderId) };
  const actions = view.actions.map((action) => withOrderTarget(action, orderId));

  let order: CustomerOrderDetailDataView = {
    ...view.order,
    id: orderId,
    reference: listOrder.reference,
    route: listOrder.route,
    priceLabel: listOrder.priceLabel,
    updatedAtLabel: listOrder.updatedAtLabel,
    payment: { ...view.order.payment, action: paymentAction },
  };

  if (useListSnapshot && listOrder.status === 'REQUESTED') {
    order = {
      ...order,
      status: listOrder.status,
      tracking: { kind: 'no-driver', message: 'Chưa có tài xế nhận đơn.' },
      history: view.order.history.slice(0, 1),
    };
  } else if (useListSnapshot && listOrder.status === 'DELIVERED') {
    order = {
      ...order,
      status: listOrder.status,
      payment: {
        ...order.payment,
        action: null,
        notice: 'Thanh toán đã được xác nhận trong snapshot phản hồi.',
        qrState: 'none',
        status: 'PAID_MANUAL',
      },
      history: [
        ...view.order.history,
        {
          id: 'history-delivered',
          status: 'DELIVERED',
          timestampLabel: '17:48',
          description: 'Đơn đã được giao.',
        },
      ],
    };
  } else if (useListSnapshot) {
    order = { ...order, status: listOrder.status };
  }

  return deepFreeze({
    ...view,
    actions,
    cancel,
    order,
  });
}

const defaults = {
  list: 'C-LIST-SUCCESS',
  create: 'C-NEW-ESTIMATE-DEMO',
  detail: 'C-DETAIL-SUCCESS',
} as const;

export function createCustomerPreviewView(
  screen: CustomerPreviewScreen,
  requestedScenario: string | null,
  orderId: string | null = null,
): CustomerPreviewView {
  const scenario = requestedScenario ?? defaults[screen];
  if (screen === 'list' && CUSTOMER_LIST_SCENARIOS.includes(scenario as CustomerListScenarioId)) {
    return createCustomerListFixture(scenario as CustomerListScenarioId);
  }
  if (
    screen === 'create' &&
    CUSTOMER_CREATE_SCENARIOS.includes(scenario as CustomerCreateScenarioId)
  ) {
    return createCustomerCreateFixture(scenario as CustomerCreateScenarioId);
  }
  if (
    screen === 'detail' &&
    CUSTOMER_DETAIL_SCENARIOS.includes(scenario as CustomerDetailScenarioId)
  ) {
    const selectedOrderId = orderId ?? DEFAULT_DETAIL_ORDER_ID;
    customerOrderForRoute(selectedOrderId);
    return bindCustomerDetailOrder(
      createCustomerDetailFixture(scenario as CustomerDetailScenarioId),
      selectedOrderId,
      requestedScenario === null || scenario === 'C-DETAIL-SUCCESS',
    );
  }
  throw new TypeError(`Unsupported Customer preview scenario: ${scenario}`);
}
