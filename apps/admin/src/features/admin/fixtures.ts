import type { OrderStatus, PaymentStatus } from '@leopard/ui';

import type {
  AdminAuditEntryView,
  AdminBoundaryView,
  AdminCommandKind,
  AdminCommandView,
  AdminDialogPreviewView,
  AdminDriverListItemView,
  AdminFleetListItemView,
  AdminListFilters,
  AdminListItemView,
  AdminListRouteView,
  AdminListScreen,
  AdminListView,
  AdminOrderDetailDataView,
  AdminOrderDetailRouteView,
  AdminOrderDetailView,
  AdminOrderListItemView,
  AdminOverviewRouteView,
  AdminOverviewView,
  AdminPreviewScreen,
  AdminRouteView,
  AdminUserListItemView,
} from './model';

export const ADMIN_PREVIEW_SCENARIOS = [
  'ADM-OV-READY',
  'ADM-OV-READINESS',
  'ADM-OV-OFFLINE',
  'ADM-ORD-DENSE',
  'ADM-ORD-NORESULT',
  'ADM-ORD-DETAIL',
  'ADM-TRK-STALE',
  'ADM-MEDIA-ERROR',
  'ADM-PAY-FAILED',
  'ADM-USR-DENSE',
  'ADM-FLT-EMPTY',
  'ADM-DRV-MIXED',
  'ADM-CMD-INVALID',
  'ADM-CMD-PENDING',
  'ADM-CMD-ERROR',
  'ADM-CMD-CONFLICT',
  'ADM-CMD-SUCCESS',
  'ADM-DENIED',
  'ADM-EXPIRED',
] as const;

export type AdminPreviewScenarioId = (typeof ADMIN_PREVIEW_SCENARIOS)[number];
export type { AdminPreviewScreen } from './model';

const COMMAND_SCENARIOS = [
  'ADM-CMD-INVALID',
  'ADM-CMD-PENDING',
  'ADM-CMD-ERROR',
  'ADM-CMD-CONFLICT',
  'ADM-CMD-SUCCESS',
] as const satisfies readonly AdminPreviewScenarioId[];

const SCENARIOS_BY_SCREEN: Readonly<Record<AdminPreviewScreen, readonly AdminPreviewScenarioId[]>> = {
  overview: ['ADM-OV-READY', 'ADM-OV-READINESS', 'ADM-OV-OFFLINE', 'ADM-DENIED', 'ADM-EXPIRED'],
  orders: ['ADM-ORD-DENSE', 'ADM-ORD-NORESULT', 'ADM-DENIED', 'ADM-EXPIRED'],
  'order-detail': [
    'ADM-ORD-DETAIL',
    'ADM-TRK-STALE',
    'ADM-MEDIA-ERROR',
    'ADM-PAY-FAILED',
    ...COMMAND_SCENARIOS,
    'ADM-DENIED',
    'ADM-EXPIRED',
  ],
  users: ['ADM-USR-DENSE', ...COMMAND_SCENARIOS, 'ADM-DENIED', 'ADM-EXPIRED'],
  fleets: ['ADM-FLT-EMPTY', 'ADM-DENIED', 'ADM-EXPIRED'],
  drivers: ['ADM-DRV-MIXED', 'ADM-DENIED', 'ADM-EXPIRED'],
};

const DEFAULT_SCENARIO: Readonly<Record<AdminPreviewScreen, AdminPreviewScenarioId>> = {
  overview: 'ADM-OV-READY',
  orders: 'ADM-ORD-DENSE',
  'order-detail': 'ADM-ORD-DETAIL',
  users: 'ADM-USR-DENSE',
  fleets: 'ADM-FLT-EMPTY',
  drivers: 'ADM-DRV-MIXED',
};

const DEFAULT_ORDER_ID = '33333333-3333-4333-8333-333333333101';
const ORDER_STATUS_LABEL: Readonly<Record<OrderStatus, string>> = {
  REQUESTED: 'Chờ tài xế',
  ACCEPTED: 'Đã nhận đơn',
  PICKING_UP: 'Đang đến điểm lấy',
  PICKED_UP: 'Đã lấy hàng',
  IN_TRANSIT: 'Đang vận chuyển',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
};
const PAYMENT_STATUS_LABEL: Readonly<Record<PaymentStatus, string>> = {
  UNPAID: 'Chưa thanh toán',
  QR_CREATED: 'Đã tạo mã QR',
  PAID_MANUAL: 'Đã xác nhận thanh toán',
  FAILED: 'Thất bại',
};

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function boundary(
  scenarioId: AdminPreviewScenarioId,
  kind: AdminBoundaryView['kind'],
): AdminBoundaryView {
  return kind === 'permission-denied'
    ? {
        scenarioId,
        kind,
        title: 'Bạn không có quyền xem dữ liệu này',
        message: 'Dữ liệu riêng tư và ngữ cảnh command không được hiển thị cho phiên hiện tại.',
      }
    : {
        scenarioId,
        kind,
        title: 'Phiên đã hết hạn',
        message: 'Dữ liệu riêng tư và lý do thao tác đã được xóa. Vui lòng đăng nhập lại.',
      };
}

function command(
  kind: AdminCommandKind,
  orderContext: AdminOrderDetailDataView | null = null,
): AdminCommandView {
  const disabling = kind === 'DISABLE_USER';
  const userId =
    kind === 'ENABLE_USER'
      ? '55555555-5555-4555-8555-555555555002'
      : '55555555-5555-4555-8555-555555555001';
  const userName = disabling ? 'Nguyễn An Mô Phỏng' : 'Trần Bình Mô Phỏng';
  const maskedPhone = disabling ? '••• 1234' : '••• 5678';
  const userRole = disabling ? 'DRIVER' : 'CUSTOMER';
  if (kind === 'CANCEL_ORDER') {
    if (!orderContext) throw new TypeError('Order command requires an exact target context');
    return {
      kind,
      targetId: orderContext.id,
      targetLabel: `Đơn ${orderContext.reference}`,
      currentStateLabel: ORDER_STATUS_LABEL[orderContext.status],
      proposedStateLabel: 'Đã hủy',
      reasonPolicy: {
        label: 'Lý do hủy',
        required: true,
        minLength: 5,
        maxLength: 500,
        hint: 'Nhập từ 5 đến 500 ký tự; không đưa dữ liệu cá nhân không cần thiết.',
      },
      consequence: 'Đơn hàng sẽ không thể tiếp tục vận chuyển sau khi backend xác nhận hủy.',
      isIrreversible: true,
      contextVersion: `order-${orderContext.id}-v17`,
      commandLabel: 'Hủy đơn hàng',
      buttonVariant: 'destructive',
      targetItems: [
        { id: 'order', label: 'Đơn hàng', value: orderContext.reference },
        { id: 'order-id', label: 'Order UUID', value: orderContext.id },
        {
          id: 'status',
          label: 'Trạng thái hiện tại',
          value: ORDER_STATUS_LABEL[orderContext.status],
        },
        { id: 'assignment', label: 'Phân công', value: orderContext.driverLabel },
        { id: 'updated', label: 'Cập nhật', value: orderContext.updatedAtLabel },
      ],
    };
  }
  if (kind === 'CONFIRM_MANUAL_PAYMENT') {
    if (!orderContext) throw new TypeError('Payment command requires an exact order context');
    return {
      kind,
      targetId: orderContext.payment.id,
      targetLabel: `Thanh toán ${orderContext.payment.referenceLabel} của ${orderContext.reference}`,
      currentStateLabel: PAYMENT_STATUS_LABEL[orderContext.payment.status],
      proposedStateLabel: 'Đã xác nhận thanh toán',
      reasonPolicy: {
        label: 'Ghi chú xác nhận',
        required: true,
        minLength: 5,
        maxLength: 500,
        hint: 'Nhập từ 5 đến 500 ký tự; thao tác thủ công này phải được audit.',
      },
      consequence: 'Backend sẽ ghi nhận xác nhận thanh toán thủ công kèm audit nếu command hợp lệ.',
      isIrreversible: true,
      contextVersion: `payment-${orderContext.payment.id}-v8`,
      commandLabel: 'Xác nhận đã thanh toán',
      buttonVariant: 'primary',
      targetItems: [
        { id: 'order', label: 'Đơn hàng', value: orderContext.reference },
        { id: 'order-id', label: 'Order UUID', value: orderContext.id },
        { id: 'payment', label: 'Payment ID', value: orderContext.payment.id },
        { id: 'amount', label: 'Số tiền', value: orderContext.payment.amountLabel },
        {
          id: 'status',
          label: 'Trạng thái hiện tại',
          value: PAYMENT_STATUS_LABEL[orderContext.payment.status],
        },
      ],
    };
  }
  return {
    kind,
    targetId: userId,
    targetLabel: `Người dùng ${userName}`,
    currentStateLabel: disabling ? 'Đang hoạt động' : 'Đã vô hiệu hóa',
    proposedStateLabel: disabling ? 'Đã vô hiệu hóa' : 'Đang hoạt động',
    reasonPolicy: {
      label: disabling ? 'Lý do vô hiệu hóa' : 'Lý do kích hoạt lại',
      required: true,
      minLength: 5,
      maxLength: 500,
      hint: 'Nhập từ 5 đến 500 ký tự; nội dung sẽ đi cùng audit record.',
    },
    consequence: disabling
      ? 'Các phiên hợp lệ của người dùng sẽ không tiếp tục được phép vận hành.'
      : 'Người dùng có thể đăng nhập lại sau khi backend xác nhận trạng thái mới.',
    isIrreversible: false,
    contextVersion: 'user-v12',
    commandLabel: disabling ? 'Vô hiệu hóa người dùng' : 'Kích hoạt lại người dùng',
    buttonVariant: disabling ? 'destructive' : 'primary',
    targetItems: [
      { id: 'user', label: 'Người dùng', value: `${userName} · ${maskedPhone}` },
      { id: 'role', label: 'Role', value: userRole },
      {
        id: 'status',
        label: 'Trạng thái hiện tại',
        value: disabling ? 'Đang hoạt động' : 'Đã vô hiệu hóa',
      },
    ],
  };
}

function dialogPreview(
  scenarioId: AdminPreviewScenarioId,
  commandKind: AdminCommandKind,
): AdminDialogPreviewView | null {
  if (!COMMAND_SCENARIOS.includes(scenarioId as (typeof COMMAND_SCENARIOS)[number])) return null;
  if (scenarioId === 'ADM-CMD-INVALID') {
    return {
      commandKind,
      state: 'invalid',
      reasonValue: 'abc',
      reasonError: 'Nội dung phải có ít nhất 5 ký tự.',
      message: null,
    };
  }
  if (scenarioId === 'ADM-CMD-PENDING') {
    return {
      commandKind,
      state: 'pending',
      reasonValue: 'Xác minh vận hành bằng dữ liệu mô phỏng',
      reasonError: null,
      message: null,
    };
  }
  if (scenarioId === 'ADM-CMD-ERROR') {
    return {
      commandKind,
      state: 'error',
      reasonValue: 'Xác minh vận hành bằng dữ liệu mô phỏng',
      reasonError: null,
      message: 'Không thể hoàn tất thao tác. Mã yêu cầu req-admin-demo-007.',
    };
  }
  if (scenarioId === 'ADM-CMD-CONFLICT') {
    return {
      commandKind,
      state: 'conflict',
      reasonValue: '',
      reasonError: null,
      message: 'Target đã thay đổi; tải trạng thái canonical mới nhất trước khi tiếp tục.',
    };
  }
  return {
    commandKind,
    state: 'success',
    reasonValue: '',
    reasonError: null,
    message:
      'Scenario persisted response: trạng thái và audit receipt mô phỏng đã được trả lúc 14:35.',
  };
}

function overview(scenarioId: AdminPreviewScenarioId): AdminOverviewView {
  const readinessFailed = scenarioId === 'ADM-OV-READINESS';
  const offline = scenarioId === 'ADM-OV-OFFLINE';
  return {
    scenarioId,
    kind: 'overview',
    state: readinessFailed ? 'readiness-failed' : offline ? 'offline' : 'ready',
    checkedAtLabel: offline ? '14:20 · 15/08/2026' : '14:32 · 15/08/2026',
    health: {
      liveness: 'UP',
      readiness: readinessFailed ? 'FAILED' : 'READY',
      dependencyLabel: readinessFailed ? 'Một dependency vận hành chưa sẵn sàng' : 'Các dependency pilot sẵn sàng',
      requestId: readinessFailed ? 'req-health-demo-004' : null,
    },
    metrics: [
      { id: 'users', label: 'Người dùng', value: 24, detail: 'Trong snapshot hiện tại', href: '/admin/users' },
      { id: 'fleets', label: 'Đội xe', value: 3, detail: 'Pilot scope', href: '/admin/fleets' },
      { id: 'active-orders', label: 'Đơn đang hoạt động', value: 4, detail: 'Chưa terminal', href: '/admin/orders' },
      { id: 'media-errors', label: 'Media lỗi', value: 0, detail: '0 là dữ liệu hợp lệ' },
    ],
    orderDistribution: [
      { status: 'REQUESTED', count: 1 },
      { status: 'ACCEPTED', count: 1 },
      { status: 'PICKING_UP', count: 1 },
      { status: 'IN_TRANSIT', count: 1 },
      { status: 'DELIVERED', count: 6 },
      { status: 'CANCELLED', count: 2 },
    ],
    exceptions: [
      {
        id: 'exception-tracking',
        domain: 'tracking',
        label: 'Tracking cần kiểm tra',
        detail: 'Vị trí gần nhất đã được nguồn dữ liệu đánh dấu là cũ.',
        tone: 'warning',
        updatedAtLabel: '14:27 · 15/08/2026',
        targetHref: '/admin/orders/33333333-3333-4333-8333-333333333101',
        targetScenario: 'ADM-TRK-STALE',
      },
      {
        id: 'exception-payment',
        domain: 'payment',
        label: 'Payment thất bại',
        detail: 'Trạng thái FAILED được cung cấp cho một order pilot.',
        tone: 'danger',
        updatedAtLabel: '14:25 · 15/08/2026',
        targetHref: '/admin/orders/33333333-3333-4333-8333-333333333102',
        targetScenario: 'ADM-PAY-FAILED',
      },
    ],
    recentOrders: orderItems().slice(0, 3).map((item) => ({
      id: item.id,
      reference: item.reference,
      status: item.status,
      paymentStatus: item.paymentStatus,
      updatedAtLabel: item.createdAtLabel,
      href: item.href,
    })),
    notice: readinessFailed
      ? {
          tone: 'danger',
          title: 'Hệ thống chưa sẵn sàng',
          message: 'Liveness vẫn UP; một dependency readiness cần được kiểm tra.',
          requestId: 'req-health-demo-004',
        }
      : offline
        ? {
            tone: 'warning',
            title: 'Mất kết nối hệ thống',
            message: 'Dữ liệu lưu lúc 14:20 được giữ và không được gọi là mới nhất.',
          }
        : null,
  };
}

const defaultFilters: Readonly<Record<AdminListScreen, AdminListFilters>> = {
  orders: {
    status: 'ALL', role: 'ALL', userStatus: 'ALL', availability: 'ALL', membershipStatus: 'ALL',
    fleetId: '', customerId: '', driverId: '', from: '', to: '', sort: 'updated-desc', page: 1, pageSize: 20,
  },
  users: {
    status: 'ALL', role: 'ALL', userStatus: 'ALL', availability: 'ALL', membershipStatus: 'ALL',
    fleetId: '', customerId: '', driverId: '', from: '', to: '', sort: 'updated-desc', page: 1, pageSize: 20,
  },
  fleets: {
    status: 'ALL', role: 'ALL', userStatus: 'ALL', availability: 'ALL', membershipStatus: 'ALL',
    fleetId: '', customerId: '', driverId: '', from: '', to: '', sort: 'name-asc', page: 1, pageSize: 20,
  },
  drivers: {
    status: 'ALL', role: 'ALL', userStatus: 'ALL', availability: 'ALL', membershipStatus: 'ALL',
    fleetId: '', customerId: '', driverId: '', from: '', to: '', sort: 'name-asc', page: 1, pageSize: 20,
  },
};

function orderItems(): readonly AdminOrderListItemView[] {
  const rows: readonly [string, OrderStatus, PaymentStatus, string][] = [
    ['101', 'ACCEPTED', 'UNPAID', 'Cập nhật lúc 14:30'],
    ['102', 'REQUESTED', 'FAILED', 'Chưa có vị trí'],
    ['103', 'PICKING_UP', 'QR_CREATED', 'Vị trí cũ · 14:22'],
    ['104', 'IN_TRANSIT', 'UNPAID', 'Cập nhật lúc 14:31'],
    ['105', 'DELIVERED', 'PAID_MANUAL', 'Tracking đã kết thúc'],
    ['106', 'CANCELLED', 'UNPAID', 'Không còn tracking'],
  ];
  return rows.map(([suffix, status, paymentStatus, trackingLabel], index) => ({
    entity: 'order',
    id: `33333333-3333-4333-8333-333333333${suffix}`,
    reference: `LP-A-260815-${suffix}`,
    createdAtLabel: `14:${String(32 - index).padStart(2, '0')} · 15/08/2026`,
    routeLabel: `Điểm lấy mô phỏng Quận ${index + 1} → Điểm giao mô phỏng Thành phố Thủ Đức`,
    customerLabel: `Khách Hàng ${index + 1} Mô Phỏng`,
    driverLabel: index === 0 ? 'Chưa phân công' : `Tài xế ${index} Mô Phỏng`,
    status,
    trackingLabel,
    trackingTone: trackingLabel.includes('cũ') ? 'warning' : trackingLabel.includes('Cập nhật') ? 'success' : 'neutral',
    paymentStatus,
    amountLabel: `${420 + index * 35}.000 ₫`,
    href: `/admin/orders/33333333-3333-4333-8333-333333333${suffix}`,
  }));
}

function userItems(): readonly AdminUserListItemView[] {
  return [
    {
      entity: 'user', id: '55555555-5555-4555-8555-555555555001', displayName: 'Nguyễn An Mô Phỏng',
      maskedPhone: '••• ••• 1234', role: 'DRIVER', status: 'ACTIVE', updatedAtLabel: '14:30 · 15/08/2026',
      exceptionLabel: null, availableCommands: [command('DISABLE_USER')],
    },
    {
      entity: 'user', id: '55555555-5555-4555-8555-555555555002', displayName: 'Trần Bình Mô Phỏng',
      maskedPhone: '••• ••• 5678', role: 'CUSTOMER', status: 'DISABLED', updatedAtLabel: '13:15 · 15/08/2026',
      exceptionLabel: 'Tài khoản đã bị vô hiệu hóa', availableCommands: [command('ENABLE_USER')],
    },
  ];
}

function fleetItems(): readonly AdminFleetListItemView[] {
  return [{
    entity: 'fleet', id: '11111111-1111-4111-8111-111111111001', displayId: 'FLEET-OPS-001',
    displayName: 'Đội xe Sao Mai Mô Phỏng', ownerSummary: 'Owner mô phỏng · membership ACTIVE',
    activeMembershipCount: 0, driverCount: 0, orderCount: 0, membershipState: 'empty',
    membershipMessage: 'Chưa có thành viên đang tham gia; đây không phải lỗi tải dữ liệu.',
    updatedAtLabel: '14:28 · 15/08/2026',
  }];
}

function driverItems(): readonly AdminDriverListItemView[] {
  return [
    {
      entity: 'driver', id: '22222222-2222-4222-8222-222222222001', displayName: 'Tài xế An Mô Phỏng',
      maskedPhone: '••• ••• 1201', accountStatus: 'ACTIVE', availability: 'BUSY', membershipStatus: 'ACTIVE',
      fleetLabel: 'Đội xe Sao Mai Mô Phỏng', activeOrder: { reference: 'LP-A-260815-104', href: '/admin/orders/33333333-3333-4333-8333-333333333104' },
      locationLabel: 'Khu vực Quận 7', locationUpdatedAtLabel: '14:22 · 15/08/2026', locationCondition: 'stale',
    },
    {
      entity: 'driver', id: '22222222-2222-4222-8222-222222222002', displayName: 'Tài xế Bình Mô Phỏng',
      maskedPhone: '••• ••• 1202', accountStatus: 'ACTIVE', availability: 'AVAILABLE', membershipStatus: 'INVITED',
      fleetLabel: 'Đội xe Sao Mai Mô Phỏng', activeOrder: null, locationLabel: 'Khu vực Bình Thạnh',
      locationUpdatedAtLabel: '14:31 · 15/08/2026', locationCondition: 'current',
    },
    {
      entity: 'driver', id: '22222222-2222-4222-8222-222222222003', displayName: 'Tài xế Chi Mô Phỏng',
      maskedPhone: '••• ••• 1203', accountStatus: 'DISABLED', availability: 'OFFLINE', membershipStatus: 'REMOVED',
      fleetLabel: 'Không còn membership hoạt động', activeOrder: null, locationLabel: 'Chưa có vị trí',
      locationUpdatedAtLabel: 'Chưa có dữ liệu', locationCondition: 'unavailable',
    },
  ];
}

function listView(
  screen: AdminListScreen,
  scenarioId: AdminPreviewScenarioId,
  commandKind: AdminCommandKind | null,
): AdminListView {
  const noResults = scenarioId === 'ADM-ORD-NORESULT';
  let items: readonly AdminListItemView[];
  if (screen === 'orders') items = noResults ? [] : orderItems();
  else if (screen === 'users') items = userItems();
  else if (screen === 'fleets') items = fleetItems();
  else items = driverItems();
  const title = screen === 'orders' ? 'Đơn hàng' : screen === 'users' ? 'Người dùng' : screen === 'fleets' ? 'Đội xe' : 'Tài xế';
  const isCommandScenario = COMMAND_SCENARIOS.includes(scenarioId as (typeof COMMAND_SCENARIOS)[number]);
  const selectedCommand = isCommandScenario ? commandKind ?? 'DISABLE_USER' : null;
  if (selectedCommand && !['DISABLE_USER', 'ENABLE_USER'].includes(selectedCommand)) {
    throw new TypeError(`Unsupported Admin command for ${screen}: ${selectedCommand}`);
  }
  const success = scenarioId === 'ADM-CMD-SUCCESS';
  const selectedTargetId = selectedCommand ? command(selectedCommand).targetId : null;
  const adaptedItems =
    success && selectedCommand
      ? userItems().map((item) =>
          item.id === selectedTargetId
            ? {
                ...item,
                status: selectedCommand === 'DISABLE_USER' ? ('DISABLED' as const) : ('ACTIVE' as const),
                updatedAtLabel: '14:35 · 15/08/2026',
              }
            : item,
        )
      : items;
  return {
    scenarioId,
    kind: 'list',
    entity: screen,
    state: noResults ? 'no-results' : 'success',
    title,
    checkedAtLabel: '14:32 · 15/08/2026',
    filters: noResults ? { ...defaultFilters[screen], status: 'DELIVERED' } : { ...defaultFilters[screen] },
    result: {
      items: adaptedItems,
      page: 1,
      pageSize: 20,
      totalPages: noResults ? 0 : 1,
      totalItems: adaptedItems.length,
      filterSummary: noResults ? '0 kết quả · Trạng thái: Đã giao' : `${adaptedItems.length} kết quả trong snapshot`,
      revision: `admin-${screen}-r21`,
    },
    notice: success
      ? { tone: 'success', title: 'Đã nhận persisted response mô phỏng', message: 'Domain state và audit receipt của scenario đã được cập nhật.' }
      : null,
    dialogPreview: selectedCommand ? dialogPreview(scenarioId, selectedCommand) : null,
  };
}

function previewOrder(orderId: string | null): AdminOrderListItemView {
  const selected = orderItems().find((item) => item.id === (orderId ?? DEFAULT_ORDER_ID));
  if (!selected) throw new TypeError('Preview order is not available for this route');
  return selected;
}

function paymentIdFor(order: AdminOrderListItemView): string {
  return `66666666-6666-4666-8666-666666666${order.id.slice(-3)}`;
}

function paymentReferenceFor(order: AdminOrderListItemView): string {
  return `PAY-A-${order.id.slice(-3)}`;
}

function historyFor(order: AdminOrderListItemView): AdminOrderDetailDataView['history'] {
  const requested = {
    id: `${order.id}-requested`,
    label: 'Chờ tài xế',
    description: 'Đơn được tạo từ dữ liệu mô phỏng.',
    timestampLabel: '13:30 · 15/08/2026',
    dateTime: '2026-08-15T13:30:00+07:00',
    isCurrent: order.status === 'REQUESTED',
  };
  if (order.status === 'REQUESTED') return [requested];
  return [
    requested,
    {
      id: `${order.id}-${order.status.toLocaleLowerCase('en')}`,
      label: ORDER_STATUS_LABEL[order.status],
      description: `Snapshot hiện tại của ${order.reference}.`,
      timestampLabel: order.createdAtLabel,
      dateTime: '2026-08-15T14:32:00+07:00',
      isCurrent: true,
    },
  ];
}

function baseOrderDetail(
  scenarioId: AdminPreviewScenarioId,
  selectedOrder: AdminOrderListItemView,
): AdminOrderDetailDataView {
  const trackingStale = scenarioId === 'ADM-TRK-STALE';
  const mediaError = scenarioId === 'ADM-MEDIA-ERROR';
  const paymentFailed = scenarioId === 'ADM-PAY-FAILED';
  const [originLabel = selectedOrder.routeLabel, destinationLabel = selectedOrder.routeLabel] =
    selectedOrder.routeLabel.split(' → ');
  const trackingState = trackingStale
    ? 'stale'
    : selectedOrder.trackingLabel === 'Chưa có vị trí'
      ? 'no-location'
      : 'route';
  return {
    id: selectedOrder.id,
    reference: selectedOrder.reference,
    status: selectedOrder.status,
    customerLabel: selectedOrder.customerLabel,
    driverLabel: selectedOrder.driverLabel,
    updatedAtLabel: selectedOrder.createdAtLabel,
    cargoSummary: 'Hàng đóng thùng · khoảng 120 kg · ghi chú vận hành mô phỏng dài để kiểm tra wrap',
    route: {
      origin: { id: `${selectedOrder.id}-origin`, label: originLabel, metadata: 'Lấy hàng lúc 13:45' },
      stops: [{ id: `${selectedOrder.id}-stop`, label: 'Điểm dừng mô phỏng tại Quận 4', metadata: 'Dự kiến đi qua' }],
      destination: { id: `${selectedOrder.id}-destination`, label: destinationLabel, metadata: 'Điểm đến dự kiến' },
    },
    eta: { label: 'ETA dự kiến · 18 phút', sourceLabel: 'Dữ liệu mô phỏng' },
    tracking: {
      state: trackingState,
      statusLabel: trackingStale ? 'Vị trí cũ — cập nhật lần cuối 14:22' : selectedOrder.trackingLabel,
      lastUpdatedLabel:
        trackingState === 'no-location'
          ? null
          : trackingStale
            ? '14:22 · 15/08/2026'
            : selectedOrder.createdAtLabel,
      mapAlternative: 'Điểm gần nhất ở cấp khu vực Quận 7; không lộ tọa độ thô.',
    },
    history: historyFor(selectedOrder),
    media: {
      state: mediaError ? 'error' : 'success',
      message: mediaError ? 'Không thể tải ảnh. Hãy yêu cầu lại URL xem được phép; mã media-demo-003.' : null,
      items: mediaError ? [] : [{ id: 'media-a-001', label: 'Ảnh xác nhận mô phỏng', mediaType: 'JPEG', capturedAtLabel: '14:10 · 15/08/2026' }],
    },
    payment: {
      id: paymentIdFor(selectedOrder),
      status: paymentFailed ? 'FAILED' : selectedOrder.paymentStatus,
      amountLabel: selectedOrder.amountLabel,
      sourceLabel: paymentFailed ? 'Provider mô phỏng báo thất bại' : 'Chưa có xác nhận',
      referenceLabel: paymentFailed
        ? `PAY-DEMO-FAILED-${selectedOrder.id.slice(-3)}`
        : paymentReferenceFor(selectedOrder),
      expiresAtLabel: paymentFailed ? null : '15:00 · 15/08/2026',
    },
  };
}

function auditTarget(order: AdminOrderDetailDataView): string {
  return `${order.reference} · ${order.id}`;
}

function baseAuditEntries(order: AdminOrderDetailDataView): readonly AdminAuditEntryView[] {
  return [{
    id: 'audit-admin-001', outcomeLabel: 'Thành công', actionLabel: 'Gán tài xế cho đơn',
    actorLabel: 'Admin Demo · ADMIN', targetLabel: auditTarget(order),
    reason: 'Điều phối pilot bằng dữ liệu mô phỏng đã được sanitize.', timestampLabel: '13:35 · 15/08/2026',
    dateTime: '2026-08-15T13:35:00+07:00', requestId: 'req-admin-demo-001', auditId: 'audit-demo-001',
  }];
}

function detailView(
  scenarioId: AdminPreviewScenarioId,
  commandKind: AdminCommandKind | null,
  orderId: string | null,
): AdminOrderDetailView {
  const selectedOrder = previewOrder(orderId);
  const isCommandScenario = COMMAND_SCENARIOS.includes(scenarioId as (typeof COMMAND_SCENARIOS)[number]);
  const selectedCommand = isCommandScenario ? commandKind ?? 'CANCEL_ORDER' : null;
  if (selectedCommand && !['CANCEL_ORDER', 'CONFIRM_MANUAL_PAYMENT'].includes(selectedCommand)) {
    throw new TypeError(`Unsupported Admin command for order-detail: ${selectedCommand}`);
  }
  let order = baseOrderDetail(scenarioId, selectedOrder);
  const commands = [
    command('CANCEL_ORDER', order),
    command('CONFIRM_MANUAL_PAYMENT', order),
  ];
  let auditEntries = baseAuditEntries(order);
  if (scenarioId === 'ADM-CMD-SUCCESS' && selectedCommand) {
    order = {
      ...order,
      status: selectedCommand === 'CANCEL_ORDER' ? 'CANCELLED' : order.status,
      payment: {
        ...order.payment,
        status:
          selectedCommand === 'CONFIRM_MANUAL_PAYMENT' ? 'PAID_MANUAL' : order.payment.status,
      },
      updatedAtLabel: '14:35 · 15/08/2026',
    };
    auditEntries = [
      {
        id: 'audit-admin-009', outcomeLabel: 'Thành công',
        actionLabel: selectedCommand === 'CONFIRM_MANUAL_PAYMENT' ? 'Xác nhận thanh toán thủ công' : 'Hủy đơn hàng',
        actorLabel: 'Admin Demo · ADMIN', targetLabel: auditTarget(order),
        reason: 'Scenario persisted response với lý do mô phỏng đã sanitize.', timestampLabel: '14:35 · 15/08/2026',
        dateTime: '2026-08-15T14:35:00+07:00', requestId: 'req-admin-demo-009', auditId: 'audit-demo-009',
      },
      ...baseAuditEntries(order),
    ];
  }
  return {
    scenarioId,
    kind: 'order-detail',
    order,
    audit: { state: 'success', message: null, entries: auditEntries },
    availableCommands: commands,
    dialogPreview: selectedCommand ? dialogPreview(scenarioId, selectedCommand) : null,
    notice:
      scenarioId === 'ADM-TRK-STALE'
        ? { tone: 'warning', title: 'Tracking cần làm mới', message: 'Last-known context vẫn được giữ trong khi kết nối lại.' }
        : scenarioId === 'ADM-MEDIA-ERROR'
          ? { tone: 'warning', title: 'Media region gặp lỗi', message: 'Order context, route, payment và audit vẫn khả dụng.' }
          : null,
  };
}

function resolveScenario(
  screen: AdminPreviewScreen,
  requestedScenario: string | null,
): AdminPreviewScenarioId {
  const scenario = requestedScenario ?? DEFAULT_SCENARIO[screen];
  if (SCENARIOS_BY_SCREEN[screen].includes(scenario as AdminPreviewScenarioId)) {
    return scenario as AdminPreviewScenarioId;
  }
  throw new TypeError(`Unsupported Admin preview scenario: ${scenario}`);
}

export function createAdminPreviewView(
  screen: 'overview', requestedScenario: string | null, commandKind?: AdminCommandKind | null,
  orderId?: string | null,
): AdminOverviewRouteView;
export function createAdminPreviewView(
  screen: AdminListScreen, requestedScenario: string | null, commandKind?: AdminCommandKind | null,
  orderId?: string | null,
): AdminListRouteView;
export function createAdminPreviewView(
  screen: 'order-detail', requestedScenario: string | null, commandKind?: AdminCommandKind | null,
  orderId?: string | null,
): AdminOrderDetailRouteView;
export function createAdminPreviewView(
  screen: AdminPreviewScreen, requestedScenario: string | null, commandKind?: AdminCommandKind | null,
  orderId?: string | null,
): AdminRouteView;
export function createAdminPreviewView(
  screen: AdminPreviewScreen,
  requestedScenario: string | null,
  commandKind: AdminCommandKind | null = null,
  orderId: string | null = null,
): AdminRouteView {
  const scenarioId = resolveScenario(screen, requestedScenario);
  let view: AdminRouteView;
  if (scenarioId === 'ADM-DENIED') view = boundary(scenarioId, 'permission-denied');
  else if (scenarioId === 'ADM-EXPIRED') view = boundary(scenarioId, 'session-expired');
  else if (screen === 'overview') view = overview(scenarioId);
  else if (screen === 'order-detail') view = detailView(scenarioId, commandKind, orderId);
  else view = listView(screen, scenarioId, commandKind);
  return deepFreeze(view);
}
