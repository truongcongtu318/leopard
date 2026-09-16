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
  AdminMetricView,
  AdminOrderDetailDataView,
  AdminOrderDetailRouteView,
  AdminOrderDetailView,
  AdminOrderListItemView,
  AdminOverviewRouteView,
  AdminOverviewView,
  AdminPaymentListItemView,
  AdminInvoiceListItemView,
  AdminPromotionListItemView,
  AdminReviewListItemView,
  AdminReportListItemView,
  AdminReportDetailDataView,
  AdminReportDetailRouteView,
  AdminReportDetailView,
  AdminDispatchCandidateDriverView,
  AdminDispatchOrderItemView,
  AdminDispatchAvailableDriverView,
  AdminDispatchRouteView,
  AdminDispatchView,
  AdminNotificationsRouteView,
  AdminNotificationsView,
  AdminBroadcastLogItemView,
  AdminPricingRouteView,
  AdminPricingView,
  AdminVehiclePricingRateView,
  AdminLiveMapRouteView,
  AdminLiveMapView,
  AdminLiveMapDriverView,
  AdminLiveMapOrderView,
  AdminSettingsRouteView,
  AdminSettingsView,
  AdminProviderCardView,
  AdminSupportConversationView,
  AdminSupportMessageView,
  AdminSupportRouteView,
  AdminSupportView,
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
  'ADM-PAY-DENSE',
  'ADM-PAY-NORESULT',
  'ADM-INV-DENSE',
  'ADM-INV-NORESULT',
  'ADM-AUD-DENSE',
  'ADM-AUD-NORESULT',
  'ADM-PRM-DENSE',
  'ADM-PRM-NORESULT',
  'ADM-REV-DENSE',
  'ADM-REV-NORESULT',
  'ADM-REP-DENSE',
  'ADM-REP-NORESULT',
  'ADM-REP-DETAIL',
  'ADM-DSP-DENSE',
  'ADM-DSP-EMPTY',
  'ADM-NTF-COMPOSE',
  'ADM-NTF-EMPTY',
  'ADM-PRC-CURRENT',
  'ADM-PRC-PREVIEW',
  'ADM-MAP-LIVE',
  'ADM-MAP-SIM',
  'ADM-SET-HEALTHY',
  'ADM-SET-DEMO',
  'ADM-SUP-ACTIVE',
  'ADM-SUP-EMPTY',
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
  payments: ['ADM-PAY-DENSE', 'ADM-PAY-NORESULT', 'ADM-DENIED', 'ADM-EXPIRED'],
  invoices: ['ADM-INV-DENSE', 'ADM-INV-NORESULT', 'ADM-DENIED', 'ADM-EXPIRED'],
  audit: ['ADM-AUD-DENSE', 'ADM-AUD-NORESULT', 'ADM-DENIED', 'ADM-EXPIRED'],
  promotions: ['ADM-PRM-DENSE', 'ADM-PRM-NORESULT', 'ADM-DENIED', 'ADM-EXPIRED'],
  reviews: ['ADM-REV-DENSE', 'ADM-REV-NORESULT', 'ADM-DENIED', 'ADM-EXPIRED'],
  reports: ['ADM-REP-DENSE', 'ADM-REP-NORESULT', 'ADM-DENIED', 'ADM-EXPIRED'],
  'report-detail': ['ADM-REP-DETAIL', 'ADM-DENIED', 'ADM-EXPIRED'],
  dispatch: ['ADM-DSP-DENSE', 'ADM-DSP-EMPTY', 'ADM-DENIED', 'ADM-EXPIRED'],
  notifications: ['ADM-NTF-COMPOSE', 'ADM-NTF-EMPTY', 'ADM-DENIED', 'ADM-EXPIRED'],
  pricing: ['ADM-PRC-CURRENT', 'ADM-PRC-PREVIEW', 'ADM-DENIED', 'ADM-EXPIRED'],
  'live-map': ['ADM-MAP-LIVE', 'ADM-MAP-SIM', 'ADM-DENIED', 'ADM-EXPIRED'],
  settings: ['ADM-SET-HEALTHY', 'ADM-SET-DEMO', 'ADM-DENIED', 'ADM-EXPIRED'],
  support: ['ADM-SUP-ACTIVE', 'ADM-SUP-EMPTY', 'ADM-DENIED', 'ADM-EXPIRED'],
};

const DEFAULT_SCENARIO: Readonly<Record<AdminPreviewScreen, AdminPreviewScenarioId>> = {
  overview: 'ADM-OV-READY',
  orders: 'ADM-ORD-DENSE',
  'order-detail': 'ADM-ORD-DETAIL',
  users: 'ADM-USR-DENSE',
  fleets: 'ADM-FLT-EMPTY',
  drivers: 'ADM-DRV-MIXED',
  payments: 'ADM-PAY-DENSE',
  invoices: 'ADM-INV-DENSE',
  audit: 'ADM-AUD-DENSE',
  promotions: 'ADM-PRM-DENSE',
  reviews: 'ADM-REV-DENSE',
  reports: 'ADM-REP-DENSE',
  'report-detail': 'ADM-REP-DETAIL',
  dispatch: 'ADM-DSP-DENSE',
  notifications: 'ADM-NTF-COMPOSE',
  pricing: 'ADM-PRC-CURRENT',
  'live-map': 'ADM-MAP-LIVE',
  settings: 'ADM-SET-HEALTHY',
  support: 'ADM-SUP-ACTIVE',
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
  userOverride: { id: string; name: string; role: string; maskedPhone: string } | null = null,
  paymentOverride: {
    id: string;
    orderCode: string;
    orderId: string;
    amountLabel: string;
    status: PaymentStatus;
  } | null = null,
): AdminCommandView {
  const disabling = kind === 'DISABLE_USER';
  const userId = userOverride?.id ?? (
    kind === 'ENABLE_USER'
      ? '55555555-5555-4555-8555-555555555002'
      : '55555555-5555-4555-8555-555555555001'
  );
  const userName = userOverride?.name ?? (disabling ? 'Nguyễn An Mô Phỏng' : 'Trần Bình Mô Phỏng');
  const maskedPhone = userOverride?.maskedPhone ?? (disabling ? '••• 1234' : '••• 5678');
  const userRole = userOverride?.role ?? (disabling ? 'DRIVER' : 'CUSTOMER');
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
    if (!orderContext && !paymentOverride) {
      throw new TypeError('Payment command requires an exact order or payment context');
    }
    const paymentId = paymentOverride?.id ?? orderContext!.payment.id;
    const orderCode = paymentOverride?.orderCode ?? orderContext!.reference;
    const orderId = paymentOverride?.orderId ?? orderContext!.id;
    const amountLabel = paymentOverride?.amountLabel ?? orderContext!.payment.amountLabel;
    const status = paymentOverride?.status ?? orderContext!.payment.status;
    const targetLabel = paymentOverride
      ? `Thanh toán của đơn ${orderCode}`
      : `Thanh toán ${orderContext!.payment.referenceLabel} của ${orderContext!.reference}`;

    return {
      kind,
      targetId: paymentId,
      targetLabel,
      currentStateLabel: PAYMENT_STATUS_LABEL[status],
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
      contextVersion: `payment-${paymentId}-v8`,
      commandLabel: 'Xác nhận thanh toán thủ công',
      buttonVariant: 'primary',
      targetItems: [
        { id: 'order', label: 'Đơn hàng', value: orderCode },
        { id: 'order-id', label: 'Order UUID', value: orderId },
        { id: 'payment', label: 'Payment ID', value: paymentId },
        { id: 'amount', label: 'Số tiền', value: amountLabel },
        {
          id: 'status',
          label: 'Trạng thái hiện tại',
          value: PAYMENT_STATUS_LABEL[status],
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
      { id: 'users', label: 'Người dùng', value: 100, detail: '100 tài khoản đang quản lý', href: '/admin/users' },
      { id: 'fleets', label: 'Đội xe', value: 6, detail: '6 đội xe đang liên kết', href: '/admin/fleets' },
      { id: 'active-orders', label: 'Đơn đang hoạt động', value: 18, detail: 'Chưa terminal', href: '/admin/orders' },
      { id: 'media-errors', label: 'Media lỗi', value: 0, detail: '0 là dữ liệu hợp lệ' },
    ],
    orderDistribution: [
      { status: 'REQUESTED', count: 4 },
      { status: 'ACCEPTED', count: 5 },
      { status: 'PICKING_UP', count: 4 },
      { status: 'IN_TRANSIT', count: 5 },
      { status: 'DELIVERED', count: 18 },
      { status: 'CANCELLED', count: 3 },
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
      customerLabel: item.customerLabel,
      routeLabel: item.routeLabel,
      amountLabel: item.amountLabel,
    })),
    notice: readinessFailed
      ? {
          tone: 'danger',
          title: 'Hệ thống chưa sẵn sàng',
          message: 'Máy chủ đang trực tuyến; một dịch vụ liên kết cần được kiểm tra kết nối.',
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
  payments: {
    status: 'ALL', role: 'ALL', userStatus: 'ALL', availability: 'ALL', membershipStatus: 'ALL',
    fleetId: '', customerId: '', driverId: '', from: '', to: '', sort: 'updated-desc', page: 1, pageSize: 20,
  },
  invoices: {
    status: 'ALL', role: 'ALL', userStatus: 'ALL', availability: 'ALL', membershipStatus: 'ALL',
    fleetId: '', customerId: '', driverId: '', from: '', to: '', sort: 'updated-desc', page: 1, pageSize: 20,
    missingEmail: false,
  },
  audit: {
    status: 'ALL', role: 'ALL', userStatus: 'ALL', availability: 'ALL', membershipStatus: 'ALL',
    fleetId: '', customerId: '', driverId: '', from: '', to: '', sort: 'updated-desc', page: 1, pageSize: 20,
  },
  promotions: {
    status: 'ALL', role: 'ALL', userStatus: 'ALL', availability: 'ALL', membershipStatus: 'ALL',
    fleetId: '', customerId: '', driverId: '', from: '', to: '', sort: 'updated-desc', page: 1, pageSize: 20,
    discountType: 'ALL',
  },
  reviews: {
    status: 'ALL', role: 'ALL', userStatus: 'ALL', availability: 'ALL', membershipStatus: 'ALL',
    fleetId: '', customerId: '', driverId: '', from: '', to: '', sort: 'updated-desc', page: 1, pageSize: 20,
    rating: 'ALL',
  },
  reports: {
    status: 'ALL', role: 'ALL', userStatus: 'ALL', availability: 'ALL', membershipStatus: 'ALL',
    fleetId: '', customerId: '', driverId: '', from: '', to: '', sort: 'updated-desc', page: 1, pageSize: 20,
    category: 'ALL',
  },
};

// Neutral simulated names: no real persons (celebrities or historical
// figures) may appear in preview fixtures.
const SIMULATED_FAMILY = [
  'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô',
] as const;
const SIMULATED_MIDDLE = ['Văn', 'Thị', 'Hoàng', 'Minh', 'Thu'] as const;
const SIMULATED_GIVEN = [
  'An Mô Phỏng', 'Bình Mô Phỏng', 'Chi Mô Phỏng', 'Dũng Mô Phỏng',
  'Giang Mô Phỏng', 'Hà Mô Phỏng', 'Khang Mô Phỏng', 'Lan Mô Phỏng',
  'Nam Mô Phỏng', 'Phúc Mô Phỏng',
] as const;

const VIETNAMESE_NAMES: readonly string[] = Array.from(
  { length: 100 },
  (_, index) =>
    `${SIMULATED_FAMILY[index % SIMULATED_FAMILY.length]} ${
      SIMULATED_MIDDLE[Math.floor(index / SIMULATED_FAMILY.length) % SIMULATED_MIDDLE.length]
    } ${SIMULATED_GIVEN[Math.floor(index / (SIMULATED_FAMILY.length * SIMULATED_MIDDLE.length)) % SIMULATED_GIVEN.length]}`,
);

const DANANG_DISTRICTS = [
  'Hải Châu (Bạch Đằng)', 'Hải Châu (Trần Phú)', 'Thanh Khê (Điện Biên Phủ)', 'Thanh Khê (Hà Huy Tập)',
  'Sơn Trà (Cảng Tiên Sa)', 'Sơn Trà (Ngô Quyền)', 'Ngũ Hành Sơn (Lê Văn Hiến)', 'Ngũ Hành Sơn (Non Nước)',
  'Cẩm Lệ (Kho Cẩm Lệ)', 'Cẩm Lệ (Hòa Xuân)', 'Liên Chiểu (KCN Hòa Khánh)', 'Liên Chiểu (Nguyễn Lương Bằng)',
  'Hòa Vang (Hòa Nhơn)', 'Hòa Vang (KCN Hòa Cầm)'
];

const FLEET_NAMES = [
  'Đội xe Sao Mai Mô Phỏng',
  'Vận Tải Miền Trung Logistics',
  'Đội xe Hoàng Long Đà Nẵng',
  'Vận Tải Cảng Tiên Sa Fleet',
  'Vận Tải Sông Hàn Express',
  'Đội xe Hải Vân Trans'
];

function orderItems(): readonly AdminOrderListItemView[] {
  const baseRows: readonly [string, OrderStatus, PaymentStatus, string][] = [
    ['101', 'ACCEPTED', 'UNPAID', 'Cập nhật lúc 14:30'],
    ['102', 'REQUESTED', 'FAILED', 'Chưa có vị trí'],
    ['103', 'PICKING_UP', 'QR_CREATED', 'Vị trí cũ · 14:22'],
    ['104', 'IN_TRANSIT', 'UNPAID', 'Cập nhật lúc 14:31'],
    ['105', 'DELIVERED', 'PAID_MANUAL', 'Tracking đã kết thúc'],
    ['106', 'CANCELLED', 'UNPAID', 'Không còn tracking'],
  ];

  const extraStatuses: readonly [OrderStatus, PaymentStatus, string][] = [
    ['DELIVERED', 'PAID_MANUAL', 'Tracking đã kết thúc lúc 13:45'],
    ['IN_TRANSIT', 'QR_CREATED', 'Cập nhật GPS 2 phút trước'],
    ['DELIVERED', 'PAID_MANUAL', 'Hoàn tất lúc 12:10'],
    ['PICKING_UP', 'UNPAID', 'Tài xế đang đến kho'],
    ['ACCEPTED', 'UNPAID', 'Tài xế vừa nhận đơn'],
    ['DELIVERED', 'PAID_MANUAL', 'Giao thành công'],
    ['IN_TRANSIT', 'PAID_MANUAL', 'Đang trên đường Nguyễn Văn Linh'],
    ['REQUESTED', 'UNPAID', 'Đang tìm tài xế gần nhất'],
    ['DELIVERED', 'PAID_MANUAL', 'Đã ký nhận POD'],
    ['CANCELLED', 'UNPAID', 'Khách hàng đổi lộ trình'],
    ['DELIVERED', 'PAID_MANUAL', 'Giao thành công đúng hẹn'],
    ['IN_TRANSIT', 'QR_CREATED', 'Đang giao qua Cầu Rồng'],
    ['DELIVERED', 'PAID_MANUAL', 'Giao hoàn tất'],
    ['ACCEPTED', 'UNPAID', 'Đã gán cho xe tải 43C-882.34'],
    ['DELIVERED', 'PAID_MANUAL', 'Giao thành công'],
  ];

  const danangBaseRoutes = [
    'KCN Hòa Khánh → Cảng Tiên Sa',
    'Hải Châu → Kho Cẩm Lệ',
    'KCN Điện Ngọc → Cảng Liên Chiểu',
    'Sơn Trà → KCN Hòa Cầm',
    'Thanh Khê → Ngũ Hành Sơn',
    'Cảng Tiên Sa → KCN Hòa Khánh',
  ] as const;

  const danangBaseCustomers = [
    'Vinamilk Đà Nẵng',
    'Dược phẩm Danapha',
    'Thép Hòa Phát',
    'Dệt may 29/3',
    'Thaco Trường Hải',
    'Cao su Đà Nẵng',
  ] as const;

  const list: AdminOrderListItemView[] = baseRows.map(([suffix, status, paymentStatus, trackingLabel], index) => ({
    entity: 'order',
    id: `33333333-3333-4333-8333-333333333${suffix}`,
    reference: `LP-A-260815-${suffix}`,
    createdAtLabel: `14:${String(32 - index).padStart(2, '0')} · 15/08/2026`,
    routeLabel: danangBaseRoutes[index] ?? 'KCN Hòa Khánh → Cảng Tiên Sa',
    customerLabel: danangBaseCustomers[index] ?? `Khách Hàng ${index + 1}`,
    driverLabel: index === 1 ? 'Chưa phân công' : `Tài xế ${VIETNAMESE_NAMES[index] ?? 'Nguyễn Văn An'}`,
    status,
    trackingLabel,
    trackingTone: trackingLabel.includes('cũ') ? 'warning' : trackingLabel.includes('Cập nhật') ? 'success' : 'neutral',
    paymentStatus,
    amountLabel: `${420 + index * 35}.000 ₫`,
    href: `/admin/orders/33333333-3333-4333-8333-333333333${suffix}`,
  }));

  extraStatuses.forEach(([status, paymentStatus, trackingLabel], i) => {
    const num = 107 + i;
    const fromDistrict = DANANG_DISTRICTS[i % DANANG_DISTRICTS.length] ?? 'Hải Châu';
    const toDistrict = DANANG_DISTRICTS[(i + 7) % DANANG_DISTRICTS.length] ?? 'Cẩm Lệ';
    const customer = VIETNAMESE_NAMES[(i + 5) % VIETNAMESE_NAMES.length] ?? 'Khách Hàng';
    const driver = status === 'REQUESTED' ? 'Chưa phân công' : `Tài xế ${VIETNAMESE_NAMES[(i + 15) % VIETNAMESE_NAMES.length] ?? 'Trần Văn An'}`;
    const amount = (180 + (i * 45) % 800) * 1000;

    list.push({
      entity: 'order',
      id: `33333333-3333-4333-8333-333333333${num}`,
      reference: `LP-A-260815-${num}`,
      createdAtLabel: `${String(14 - Math.floor(i / 6)).padStart(2, '0')}:${String((55 - (i * 7) % 60 + 60) % 60).padStart(2, '0')} · 15/08/2026`,
      routeLabel: `${fromDistrict} → ${toDistrict}`,
      customerLabel: customer,
      driverLabel: driver,
      status,
      trackingLabel,
      trackingTone: trackingLabel.includes('GPS') || trackingLabel.includes('Đang') ? 'success' : 'neutral',
      paymentStatus,
      amountLabel: `${amount.toLocaleString('vi-VN')} ₫`,
      href: `/admin/orders/33333333-3333-4333-8333-333333333${num}`,
    });
  });

  return list;
}

function userItems(): readonly AdminUserListItemView[] {
  const users: AdminUserListItemView[] = [
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

  for (let i = 2; i < 100; i++) {
    const idSuffix = String(i + 1).padStart(3, '0');
    const id = `55555555-5555-4555-8555-555555555${idSuffix}`;
    const name = VIETNAMESE_NAMES[i % VIETNAMESE_NAMES.length] ?? 'Người dùng';
    const phoneSuffix = String(1000 + (i * 37) % 9000);
    const maskedPhone = `••• ••• ${phoneSuffix}`;
    
    let role: 'CUSTOMER' | 'DRIVER' | 'FLEET_OWNER' | 'ADMIN' = 'CUSTOMER';
    if (i < 25) {
      role = 'DRIVER';
    } else if (i < 33) {
      role = 'FLEET_OWNER';
    } else if (i === 99) {
      role = 'ADMIN';
    } else {
      role = 'CUSTOMER';
    }

    const isDisabled = i === 12 || i === 47 || i === 83;
    const status = isDisabled ? 'DISABLED' : 'ACTIVE';
    const hour = String(14 - Math.floor(i / 15)).padStart(2, '0');
    const minute = String((59 - (i * 3) % 60 + 60) % 60).padStart(2, '0');
    const updatedAtLabel = `${hour}:${minute} · 15/08/2026`;

    users.push({
      entity: 'user',
      id,
      displayName: name,
      maskedPhone,
      role,
      status,
      updatedAtLabel,
      exceptionLabel: isDisabled ? 'Tài khoản tạm ngưng hoạt động' : null,
      availableCommands: [
        command(isDisabled ? 'ENABLE_USER' : 'DISABLE_USER', null, {
          id,
          name,
          role,
          maskedPhone,
        }),
      ],
    });
  }

  return users;
}

function fleetItems(): readonly AdminFleetListItemView[] {
  const fleetsData = [
    { idSuffix: '001', displayId: 'FLEET-OPS-001', name: 'Đội xe Sao Mai Mô Phỏng', owner: 'Trần Văn Sơn (Chủ xe)', activeMembers: 12, drivers: 12, orders: 48, state: 'empty' as const },
    { idSuffix: '002', displayId: 'FLEET-OPS-002', name: 'Vận Tải Đông Nam Logistics', owner: 'Lê Hoàng Nam (Chủ xe)', activeMembers: 8, drivers: 8, orders: 32, state: 'success' as const },
    { idSuffix: '003', displayId: 'FLEET-OPS-003', name: 'Đội xe Hoàng Gia Express', owner: 'Phạm Quốc Cường (Chủ xe)', activeMembers: 6, drivers: 6, orders: 24, state: 'success' as const },
    { idSuffix: '004', displayId: 'FLEET-OPS-004', name: 'Giao Hàng Siêu Tốc Sài Gòn', owner: 'Đỗ Minh Vương (Chủ xe)', activeMembers: 10, drivers: 10, orders: 50, state: 'success' as const },
    { idSuffix: '005', displayId: 'FLEET-OPS-005', name: 'Vận Tải Tân Cảng Fleet', owner: 'Vũ Đình Trọng (Chủ xe)', activeMembers: 5, drivers: 5, orders: 18, state: 'success' as const },
    { idSuffix: '006', displayId: 'FLEET-OPS-006', name: 'Vận Tải Miền Nam Fleet', owner: 'Nguyễn Văn Long (Chủ xe)', activeMembers: 4, drivers: 4, orders: 14, state: 'success' as const },
  ];

  return fleetsData.map((f, index) => ({
    entity: 'fleet',
    id: `11111111-1111-4111-8111-111111111${f.idSuffix}`,
    displayId: f.displayId,
    displayName: f.name,
    ownerSummary: `${f.owner} · membership ACTIVE`,
    activeMembershipCount: index === 0 ? 0 : f.activeMembers,
    driverCount: f.drivers,
    orderCount: f.orders,
    membershipState: index === 0 ? ('empty' as const) : ('success' as const),
    membershipMessage: index === 0 ? 'Chưa có thành viên đang tham gia; đây không phải lỗi tải dữ liệu.' : `${f.activeMembers} thành viên đang hoạt động trong đội xe.`,
    updatedAtLabel: `14:${String(30 - index * 2).padStart(2, '0')} · 15/08/2026`,
  }));
}

function driverItems(): readonly AdminDriverListItemView[] {
  const baseDrivers: AdminDriverListItemView[] = [
    {
      entity: 'driver', id: '22222222-2222-4222-8222-222222222001', displayName: 'Tài xế An Mô Phỏng',
      maskedPhone: '••• ••• 1201', accountStatus: 'ACTIVE', availability: 'BUSY', membershipStatus: 'ACTIVE',
      fleetLabel: 'Đội xe Sao Mai Mô Phỏng', activeOrder: { reference: 'LP-A-260815-104', href: '/admin/orders/33333333-3333-4333-8333-333333333104' },
      locationLabel: 'Khu vực Hải Châu, Đà Nẵng', locationUpdatedAtLabel: '14:22 · 15/08/2026', locationCondition: 'stale',
    },
    {
      entity: 'driver', id: '22222222-2222-4222-8222-222222222002', displayName: 'Tài xế Bình Mô Phỏng',
      maskedPhone: '••• ••• 1202', accountStatus: 'ACTIVE', availability: 'AVAILABLE', membershipStatus: 'INVITED',
      fleetLabel: 'Đội xe Sao Mai Mô Phỏng', activeOrder: null, locationLabel: 'Khu vực Cẩm Lệ, Đà Nẵng',
      locationUpdatedAtLabel: '14:31 · 15/08/2026', locationCondition: 'current',
    },
    {
      entity: 'driver', id: '22222222-2222-4222-8222-222222222003', displayName: 'Tài xế Chi Mô Phỏng',
      maskedPhone: '••• ••• 1203', accountStatus: 'DISABLED', availability: 'OFFLINE', membershipStatus: 'REMOVED',
      fleetLabel: 'Không còn membership hoạt động', activeOrder: null, locationLabel: 'Chưa có vị trí',
      locationUpdatedAtLabel: 'Chưa có dữ liệu', locationCondition: 'unavailable',
    },
  ];

  const extraDriverNames = [
    'Đặng Văn Lâm', 'Trần Đình Trọng', 'Nguyễn Quang Hải', 'Đoàn Văn Hậu', 'Lương Xuân Trường',
    'Phan Văn Đức', 'Nguyễn Công Phượng', 'Nguyễn Tiến Linh', 'Bùi Tiến Dũng', 'Hà Đức Chinh',
    'Hồ Tấn Tài', 'Nguyễn Phong Hồng Duy', 'Vũ Văn Thanh', 'Đỗ Duy Mạnh', 'Nguyễn Tuấn Anh',
    'Phạm Đức Huy', 'Nguyễn Thành Chung', 'Bùi Hoàng Việt Anh', 'Trương Văn Thái Quý', 'Lê Văn Xuân',
    'Huỳnh Tấn Sinh', 'Trần Danh Trung', 'Nguyễn Hữu Thắng', 'Dụng Quang Nho', 'Trần Bảo Toàn',
    'Nhâm Mạnh Dũng', 'Khuất Văn Khang'
  ];

  extraDriverNames.forEach((name, i) => {
    const num = i + 4;
    const idSuffix = String(num).padStart(3, '0');
    const fleet = FLEET_NAMES[i % FLEET_NAMES.length] ?? 'Đội xe Sao Mai';
    const location = DANANG_DISTRICTS[(i * 3) % DANANG_DISTRICTS.length] ?? 'Hải Châu';
    const availabilities: ('AVAILABLE' | 'BUSY' | 'OFFLINE')[] = ['AVAILABLE', 'BUSY', 'AVAILABLE', 'OFFLINE', 'BUSY'];
    const availability = availabilities[i % availabilities.length] ?? 'AVAILABLE';
    const isBusy = availability === 'BUSY';
    const orderNum = 107 + (i % 15);

    baseDrivers.push({
      entity: 'driver',
      id: `22222222-2222-4222-8222-222222222${idSuffix}`,
      displayName: `Tài xế ${name}`,
      maskedPhone: `••• ••• ${String(3000 + i * 43)}`,
      accountStatus: 'ACTIVE',
      availability,
      membershipStatus: 'ACTIVE',
      fleetLabel: fleet,
      activeOrder: isBusy ? { reference: `LP-A-260815-${orderNum}`, href: `/admin/orders/33333333-3333-4333-8333-333333333${orderNum}` } : null,
      locationLabel: availability === 'OFFLINE' ? 'Ngoại tuyến' : location,
      locationUpdatedAtLabel: availability === 'OFFLINE' ? 'Hơn 2 giờ trước' : `14:${String(30 - (i % 25)).padStart(2, '0')} · 15/08/2026`,
      locationCondition: availability === 'OFFLINE' ? 'unavailable' : (i % 3 === 0 ? 'stale' : 'current'),
    });
  });

  return baseDrivers;
}

function paymentItems(): readonly AdminPaymentListItemView[] {
  const data: readonly [string, string, number, PaymentStatus, string, string, string | null, string | null, string | null][] = [
    ['101', 'LP-A-260815-101', 250000, 'PAID_MANUAL', 'VietQR', 'VQR-260815-8821', '14:30 · 15/08/2026', 'Admin Quản Trị', 'Xác nhận chuyển khoản Vietcombank'],
    ['102', 'LP-A-260815-102', 150000, 'UNPAID', 'VietQR', 'VQR-260815-8822', null, null, null],
    ['103', 'LP-A-260815-103', 380000, 'QR_CREATED', 'PayOS', 'POS-260815-9941', null, null, null],
    ['104', 'LP-A-260815-104', 520000, 'PAID_MANUAL', 'PayOS', 'POS-260815-9942', '14:28 · 15/08/2026', 'Admin Quản Trị', 'Xác nhận qua cổng thanh toán PayOS'],
    ['105', 'LP-A-260815-105', 180000, 'FAILED', 'VietQR', 'VQR-260815-8825', null, null, null],
    ['106', 'LP-A-260815-106', 420000, 'PAID_MANUAL', 'Tiền mặt', 'CASH-260815-106', '14:25 · 15/08/2026', 'Admin Quản Trị', 'Tài xế đã thu tiền mặt khi giao hàng'],
    ['107', 'LP-A-260815-107', 290000, 'UNPAID', 'VietQR', 'VQR-260815-8827', null, null, null],
    ['108', 'LP-A-260815-108', 650000, 'QR_CREATED', 'VietQR', 'VQR-260815-8828', null, null, null],
    ['109', 'LP-A-260815-109', 310000, 'PAID_MANUAL', 'VietQR', 'VQR-260815-8829', '14:20 · 15/08/2026', 'Admin Quản Trị', 'Xác nhận ủy nhiệm chi'],
    ['110', 'LP-A-260815-110', 890000, 'PAID_MANUAL', 'PayOS', 'POS-260815-9945', '14:18 · 15/08/2026', 'Admin Quản Trị', 'Giao dịch thành công qua PayOS'],
    ['111', 'LP-A-260815-111', 220000, 'FAILED', 'PayOS', 'POS-260815-9946', null, null, null],
    ['112', 'LP-A-260815-112', 470000, 'QR_CREATED', 'VietQR', 'VQR-260815-8832', null, null, null],
    ['113', 'LP-A-260815-113', 190000, 'PAID_MANUAL', 'Tiền mặt', 'CASH-260815-113', '14:10 · 15/08/2026', 'Admin Quản Trị', 'Tài xế bàn giao tiền mặt'],
    ['114', 'LP-A-260815-114', 340000, 'UNPAID', 'VietQR', 'VQR-260815-8834', null, null, null],
    ['115', 'LP-A-260815-115', 780000, 'PAID_MANUAL', 'VietQR', 'VQR-260815-8835', '14:05 · 15/08/2026', 'Admin Quản Trị', 'Xác nhận chuyển khoản Techcombank'],
    ['116', 'LP-A-260815-116', 560000, 'QR_CREATED', 'PayOS', 'POS-260815-9948', null, null, null],
    ['117', 'LP-A-260815-117', 1250000, 'PAID_MANUAL', 'VietQR', 'VQR-260815-8837', '13:55 · 15/08/2026', 'Admin Quản Trị', 'Hợp đồng vận tải lô hàng lớn'],
    ['118', 'LP-A-260815-118', 270000, 'UNPAID', 'VietQR', 'VQR-260815-8838', null, null, null],
    ['119', 'LP-A-260815-119', 430000, 'FAILED', 'VietQR', 'VQR-260815-8839', null, null, null],
    ['120', 'LP-A-260815-120', 360000, 'QR_CREATED', 'VietQR', 'VQR-260815-8840', null, null, null],
  ];

  return data.map(([num, orderCode, amountVnd, status, sourceLabel, referenceLabel, confirmedAtLabel, confirmedByName, confirmationNote], index) => {
    const id = `66666666-6666-4666-8666-666666666${num}`;
    const orderId = `33333333-3333-4333-8333-333333333${num}`;
    const customerName = VIETNAMESE_NAMES[index % VIETNAMESE_NAMES.length] ?? 'Khách hàng';
    const customerPhone = `+84 90 ${String(100 + index * 13).slice(-3)} ${String(1000 + index * 37).slice(-4)}`;
    const amountLabel = `${amountVnd.toLocaleString('vi-VN')} ₫`;
    const hour = String(14 - Math.floor(index / 5)).padStart(2, '0');
    const minute = String((50 - (index * 7) % 60 + 60) % 60).padStart(2, '0');
    const createdAtLabel = `${hour}:${minute} · 15/08/2026`;
    const isPending = status === 'UNPAID' || status === 'QR_CREATED';

    const availableCommands = isPending
      ? [
          command('CONFIRM_MANUAL_PAYMENT', null, null, {
            id,
            orderCode,
            orderId,
            amountLabel,
            status,
          }),
        ]
      : [];

    return {
      entity: 'payment',
      id,
      orderId,
      orderCode,
      customerName,
      customerPhone,
      amountLabel,
      amountVnd,
      status,
      statusLabel: PAYMENT_STATUS_LABEL[status] ?? status,
      sourceLabel,
      referenceLabel,
      confirmedAtLabel,
      confirmedByName,
      confirmationNote,
      createdAtLabel,
      href: `/admin/orders/${orderId}`,
      availableCommands,
    };
  });
}

function invoiceItems(): readonly AdminInvoiceListItemView[] {
  const data: [string, string, number, number, 'ISSUED' | 'VOIDED', string | null, string, string | null, boolean][] = [
    ['101', 'INV-2026-0001', 250000, 275000, 'ISSUED', 'an.nguyen@example.com', '14:30 · 15/08/2026', '14:32 · 15/08/2026', false],
    ['102', 'INV-2026-0002', 500000, 550000, 'ISSUED', null, '14:00 · 15/08/2026', null, true],
    ['103', 'INV-2026-0003', 1200000, 1320000, 'ISSUED', 'contact@mientrunglog.vn', '13:15 · 15/08/2026', '13:16 · 15/08/2026', false],
    ['104', 'INV-2026-0004', 520000, 572000, 'ISSUED', 'long.le@company.com', '14:28 · 15/08/2026', '14:30 · 15/08/2026', false],
    ['105', 'INV-2026-0005', 180000, 198000, 'VOIDED', 'cuong.pq@fastmail.com', '11:45 · 15/08/2026', '11:47 · 15/08/2026', false],
    ['106', 'INV-2026-0006', 420000, 462000, 'ISSUED', null, '14:25 · 15/08/2026', null, true],
    ['107', 'INV-2026-0007', 290000, 319000, 'ISSUED', 'khachhang.dn@gmail.com', '14:22 · 15/08/2026', '14:23 · 15/08/2026', false],
    ['108', 'INV-2026-0008', 650000, 715000, 'ISSUED', 'info@saomaigroup.vn', '14:20 · 15/08/2026', '14:21 · 15/08/2026', false],
  ];

  return data.map(([num, invoiceNumber, amountVnd, totalVnd, status, customerEmail, issuedAtLabel, emailSentAtLabel, isMissingEmail], index) => {
    const id = `77777777-7777-4777-8777-777777777${num}`;
    const orderId = `33333333-3333-4333-8333-333333333${num}`;
    const orderCode = `LP-A-260815-${num}`;
    const customerName = VIETNAMESE_NAMES[index % VIETNAMESE_NAMES.length] ?? 'Khách hàng';
    return {
      entity: 'invoice' as const,
      id,
      invoiceNumber,
      orderId,
      orderCode,
      customerName,
      customerEmail,
      amountLabel: `${amountVnd.toLocaleString('vi-VN')} ₫`,
      totalLabel: `${totalVnd.toLocaleString('vi-VN')} ₫`,
      status,
      issuedAtLabel,
      emailSentAtLabel,
      isMissingEmail,
      pdfDownloadUrl: `/api/admin/invoices/${id}/pdf`,
    };
  });
}

function auditItems(): readonly AdminAuditEntryView[] {
  return [
    {
      entity: 'audit',
      id: 'audit-log-001',
      actorId: '11111111-1111-4111-8111-111111111001',
      actorName: 'Admin Quản Trị',
      actorRole: 'ADMIN',
      action: 'USER_STATUS_UPDATE',
      resourceType: 'User',
      resourceId: '55555555-5555-4555-8555-555555555001',
      metadata: { previousStatus: 'ACTIVE', newStatus: 'DISABLED', reason: 'Tạm khóa để xác minh giấy phép lái xe' },
      createdAtLabel: '14:30 · 15/08/2026',
      outcomeLabel: 'Thành công',
      actionLabel: 'Cập nhật tài khoản',
      actorLabel: 'Admin Quản Trị · ADMIN',
      targetLabel: 'User · 55555555-5555-4555-8555-555555555001',
      reason: 'Tạm khóa để xác minh giấy phép lái xe',
      timestampLabel: '14:30 · 15/08/2026',
      dateTime: '2026-08-15T14:30:00+07:00',
      requestId: 'req-audit-001',
      auditId: 'audit-log-001',
    },
    {
      entity: 'audit',
      id: 'audit-log-002',
      actorId: '11111111-1111-4111-8111-111111111001',
      actorName: 'Admin Quản Trị',
      actorRole: 'ADMIN',
      action: 'CONFIRM_MANUAL_PAYMENT',
      resourceType: 'Payment',
      resourceId: '66666666-6666-4666-8666-666666666101',
      metadata: { amountVnd: 500000, orderCode: 'LP-A-260815-101', note: 'Đối soát sao kê ngân hàng Vietcombank' },
      createdAtLabel: '14:25 · 15/08/2026',
      outcomeLabel: 'Thành công',
      actionLabel: 'Xác nhận thanh toán',
      actorLabel: 'Admin Quản Trị · ADMIN',
      targetLabel: 'Payment · 66666666-6666-4666-8666-666666666101',
      reason: 'Đối soát sao kê ngân hàng Vietcombank',
      timestampLabel: '14:25 · 15/08/2026',
      dateTime: '2026-08-15T14:25:00+07:00',
      requestId: 'req-audit-002',
      auditId: 'audit-log-002',
    },
    {
      entity: 'audit',
      id: 'audit-log-003',
      actorId: '11111111-1111-4111-8111-111111111001',
      actorName: 'Admin Quản Trị',
      actorRole: 'ADMIN',
      action: 'CANCEL_ORDER',
      resourceType: 'Order',
      resourceId: '33333333-3333-4333-8333-333333333103',
      metadata: { reason: 'Khách hàng đổi ý địa điểm giao và đặt lại đơn mới' },
      createdAtLabel: '14:15 · 15/08/2026',
      outcomeLabel: 'Thành công',
      actionLabel: 'Hủy đơn hàng',
      actorLabel: 'Admin Quản Trị · ADMIN',
      targetLabel: 'Order · LP-A-260815-103',
      reason: 'Khách hàng đổi ý địa điểm giao và đặt lại đơn mới',
      timestampLabel: '14:15 · 15/08/2026',
      dateTime: '2026-08-15T14:15:00+07:00',
      requestId: 'req-audit-003',
      auditId: 'audit-log-003',
    },
    {
      entity: 'audit',
      id: 'audit-log-004',
      actorId: undefined,
      actorName: 'Hệ thống',
      actorRole: undefined,
      action: 'ASSIGN_DRIVER',
      resourceType: 'Order',
      resourceId: '33333333-3333-4333-8333-333333333102',
      metadata: { driverId: '22222222-2222-4222-8222-222222222001', driverName: 'Trần Văn Bình' },
      createdAtLabel: '14:00 · 15/08/2026',
      outcomeLabel: 'Thành công',
      actionLabel: 'Gán tài xế',
      actorLabel: 'Hệ thống · SYSTEM',
      targetLabel: 'Order · LP-A-260815-102',
      reason: 'Hệ thống tự động điều phối tài xế gần nhất',
      timestampLabel: '14:00 · 15/08/2026',
      dateTime: '2026-08-15T14:00:00+07:00',
      requestId: 'req-audit-004',
      auditId: 'audit-log-004',
    },
    {
      entity: 'audit',
      id: 'audit-log-005',
      actorId: '11111111-1111-4111-8111-111111111001',
      actorName: 'Admin Quản Trị',
      actorRole: 'ADMIN',
      action: 'PROMOTION_CREATED',
      resourceType: 'Promotion',
      resourceId: '77777777-7777-4777-8777-777777777001',
      metadata: { code: 'LEOPARD2026', discountPercent: 15, maxDiscountVnd: 50000 },
      createdAtLabel: '13:45 · 15/08/2026',
      outcomeLabel: 'Thành công',
      actionLabel: 'Tạo khuyến mãi',
      actorLabel: 'Admin Quản Trị · ADMIN',
      targetLabel: 'Promotion · LEOPARD2026',
      reason: 'Chiến dịch kích cầu khu vực Đà Nẵng',
      timestampLabel: '13:45 · 15/08/2026',
      dateTime: '2026-08-15T13:45:00+07:00',
      requestId: 'req-audit-005',
      auditId: 'audit-log-005',
    },
  ];
}

function promotionItems(): readonly AdminPromotionListItemView[] {
  const data: readonly [string, string, string, string, 'PERCENT' | 'FIXED', number, number | null, number, number, number, string, boolean][] = [
    ['001', 'GIAM10', 'Giảm 10% đơn hàng Đà Nẵng', 'Áp dụng cho mọi chuyến hàng nội thành', 'PERCENT', 10, 50000, 100000, 500, 142, '23:59 · 31/12/2026', true],
    ['002', 'FREESHIP', 'Miễn phí giao hàng chặng ngắn', 'Giảm tối đa 30k phí vận chuyển', 'FIXED', 30000, 30000, 150000, 1000, 685, '23:59 · 15/10/2026', true],
    ['003', 'TET2026', 'Khai xuân Giáp Ngọ 2026', 'Ưu đãi đầu năm dành cho khách hàng thân thiết', 'PERCENT', 20, 100000, 300000, 200, 200, '23:59 · 28/02/2026', false],
    ['004', 'VIP50K', 'Tri ân khách hàng VIP', 'Giảm ngay 50.000đ cho đơn hàng lớn', 'FIXED', 50000, null, 500000, 300, 88, '23:59 · 30/11/2026', true],
    ['005', 'CHAOHE2026', 'Khởi động hè sôi động', 'Khuyến mãi đặc biệt dịp hè Đà Nẵng', 'PERCENT', 15, 45000, 200000, 400, 95, '23:59 · 30/09/2026', true],
    ['006', 'DOANHNGHIEP', 'Gói logistics doanh nghiệp', 'Hỗ trợ cước vận chuyển định kỳ cho đối tác', 'PERCENT', 25, 200000, 1000000, 100, 12, '23:59 · 31/12/2026', true],
    ['007', 'APPDATA', 'Cài app nhận quà', 'Khuyến mãi cho khách hàng trải nghiệm app mới', 'FIXED', 20000, null, 50000, 2000, 1540, '23:59 · 31/08/2026', false],
  ];

  return data.map(([num, code, title, description, discountType, discountValue, maxDiscountVnd, minOrderAmountVnd, usageLimit, usageCount, expiresAtLabel, isActive]) => {
    const id = `88888888-8888-4888-8888-888888888${num}`;
    const commandView: AdminCommandView = {
      kind: 'TOGGLE_PROMOTION_STATUS',
      targetId: id,
      targetLabel: `Mã ${code}`,
      currentStateLabel: isActive ? 'Đang hoạt động' : 'Đã tạm dừng',
      proposedStateLabel: isActive ? 'Tạm dừng' : 'Kích hoạt',
      reasonPolicy: {
        label: isActive ? 'Lý do tạm dừng khuyến mãi' : 'Lý do kích hoạt khuyến mãi',
        required: true,
        minLength: 5,
        maxLength: 500,
        hint: 'Nhập từ 5 đến 500 ký tự; thao tác sẽ được ghi vào nhật ký kiểm toán.',
      },
      consequence: isActive
        ? 'Khách hàng sẽ không thể áp dụng mã khuyến mãi này cho các đơn hàng mới.'
        : 'Mã khuyến mãi sẽ có hiệu lực ngay lập tức cho các đơn hàng mới đáp ứng điều kiện.',
      isIrreversible: false,
      contextVersion: `promotion-${id}-v1`,
      commandLabel: isActive ? 'Tạm dừng' : 'Kích hoạt',
      buttonVariant: isActive ? 'destructive' : 'primary',
      targetItems: [
        { id: 'code', label: 'Mã voucher', value: code },
        { id: 'status', label: 'Trạng thái hiện tại', value: isActive ? 'Đang hoạt động' : 'Đã tạm dừng' },
      ],
    };

    return {
      entity: 'promotion',
      id,
      code,
      title,
      description,
      discountType,
      discountValue,
      maxDiscountVnd,
      minOrderAmountVnd,
      usageLimit,
      usageCount,
      expiresAtLabel,
      isActive,
      statusLabel: isActive ? 'Đang hoạt động' : 'Tạm dừng',
      availableCommands: [commandView],
    };
  });
}

function reviewItems(): readonly AdminReviewListItemView[] {
  const data: readonly [string, string, number, string, number, string, string, string, string, string][] = [
    ['001', 'LP-A-260815-101', 5, 'Tài xế rất đúng giờ, hàng hóa được đóng gói cẩn thận, thái độ chuyên nghiệp.', 20000, 'Nguyễn Văn An', '+84 90 123 4567', 'Trần Văn Bình', '+84 90 333 3333', '14:35 · 15/08/2026'],
    ['002', 'LP-A-260815-102', 5, 'Giao hàng siêu nhanh, tài xế hỗ trợ bốc xếp rất nhiệt tình.', 30000, 'Trần Thị Mai', '+84 90 234 5678', 'Lê Văn Cường', '+84 90 444 4444', '14:20 · 15/08/2026'],
    ['003', 'LP-A-260815-103', 2, 'Tài xế đi lạc đường gần 30 phút làm trễ hẹn giao hàng của khách.', 0, 'Phạm Quốc Hùng', '+84 90 345 6789', 'Phạm Văn Dũng', '+84 90 555 5555', '14:05 · 15/08/2026'],
    ['004', 'LP-A-260815-104', 4, 'Thời gian giao hàng tốt, liên hệ trước khi đến. Hài lòng.', 10000, 'Lê Thị Thu', '+84 90 456 7890', 'Hoàng Văn Em', '+84 90 666 6666', '13:50 · 15/08/2026'],
    ['005', 'LP-A-260815-105', 1, 'Thái độ tài xế không đúng mực khi giao hàng, nói năng cộc lốc.', 0, 'Đỗ Minh Tuấn', '+84 90 567 8901', 'Trần Văn Bình', '+84 90 333 3333', '13:30 · 15/08/2026'],
    ['006', 'LP-A-260815-106', 5, 'Dịch vụ uy tín, tài xế chạy xe cẩn thận không làm vỡ đồ gốm sứ.', 50000, 'Vũ Hải Đăng', '+84 90 678 9012', 'Vũ Văn Hùng', '+84 90 777 7777', '13:15 · 15/08/2026'],
    ['007', 'LP-A-260815-107', 3, 'Giao hàng tạm ổn nhưng hàng bị móp nhẹ góc hộp ngoài.', 0, 'Hoàng Kim Ngân', '+84 90 789 0123', 'Lê Văn Cường', '+84 90 444 4444', '12:45 · 15/08/2026'],
    ['008', 'LP-A-260815-108', 5, 'Tài xế giao đúng địa chỉ trong hẻm sâu, rất kiên nhẫn tìm đường.', 15000, 'Bùi Văn Phong', '+84 90 890 1234', 'Đặng Văn Khoa', '+84 90 888 8888', '12:10 · 15/08/2026'],
  ];

  return data.map(([num, orderCode, rating, comment, tipVnd, customerName, customerPhone, driverName, driverPhone, createdAtLabel]) => {
    const id = `99999999-9999-4999-8999-999999999${num}`;
    const orderId = `33333333-3333-4333-8333-333333333${num}`;
    const commandView: AdminCommandView = {
      kind: 'HIDE_REVIEW',
      targetId: id,
      targetLabel: `Đánh giá đơn ${orderCode}`,
      currentStateLabel: 'Hiển thị công khai',
      proposedStateLabel: 'Đã ẩn bởi Quản trị viên',
      reasonPolicy: {
        label: 'Lý do ẩn nhận xét',
        required: true,
        minLength: 5,
        maxLength: 500,
        hint: 'Nhập từ 5 đến 500 ký tự (ví dụ: ngôn từ phản cảm, khiếu nại sai sự thật).',
      },
      consequence: 'Nội dung nhận xét sẽ bị thay thế bằng thông báo đã ẩn và ghi nhận vào nhật ký kiểm toán.',
      isIrreversible: true,
      contextVersion: `review-${id}-v1`,
      commandLabel: 'Ẩn nhận xét',
      buttonVariant: 'destructive',
      targetItems: [
        { id: 'order', label: 'Đơn hàng', value: orderCode },
        { id: 'driver', label: 'Tài xế', value: driverName },
        { id: 'comment', label: 'Nội dung', value: comment },
      ],
    };

    return {
      entity: 'review',
      id,
      orderId,
      orderCode,
      customerName,
      customerPhone,
      driverName,
      driverPhone,
      rating,
      comment,
      tipVndLabel: tipVnd > 0 ? `${tipVnd.toLocaleString('vi-VN')} ₫` : '0 ₫',
      createdAtLabel,
      availableCommands: [commandView],
    };
  });
}

function reportItems(): readonly AdminReportListItemView[] {
  return [
    {
      entity: 'report',
      id: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
      ticketNumber: 'TK-A101',
      orderId: '11111111-1111-4111-8111-111111111111',
      orderCode: 'LP-A-260815-101',
      customerId: 'cust-1',
      customerName: 'Nguyễn Văn Khách',
      customerPhone: '+84 90 123 4567',
      customerEmail: 'khachhang1@example.com',
      driverId: 'drv-1',
      driverName: 'Lê Văn Cường',
      driverPhone: '+84 90 444 4444',
      category: 'DAMAGED_CARGO',
      categoryLabel: 'Hàng hư hỏng',
      description: 'Hàng bị vỡ góc thùng carton khi tài xế giao tới, yêu cầu bồi thường cước vận chuyển.',
      hasPhoto: true,
      photoUrls: ['https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80'],
      status: 'OPEN',
      statusLabel: 'Chờ xử lý',
      severity: 'CRITICAL',
      severityLabel: 'Nghiêm trọng',
      createdAtLabel: '14:40 · 15/08/2026',
      updatedAtLabel: '14:40 · 15/08/2026',
      href: '/admin/reports/aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
    },
    {
      entity: 'report',
      id: 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb',
      ticketNumber: 'TK-B102',
      orderId: '22222222-2222-4222-8222-222222222222',
      orderCode: 'LP-A-260815-102',
      customerId: 'cust-2',
      customerName: 'Trần Thị Doanh Nghiệp',
      customerPhone: '+84 90 888 8888',
      customerEmail: 'doanhnghiep@example.com',
      driverId: 'drv-2',
      driverName: 'Trần Văn Bình',
      driverPhone: '+84 90 333 3333',
      category: 'DRIVER_DELAY',
      categoryLabel: 'Tài xế trễ',
      description: 'Tài xế đến trễ hơn 45 phút không liên lạc được, ảnh hưởng lịch hẹn xuất kho của đối tác.',
      hasPhoto: false,
      status: 'IN_PROGRESS',
      statusLabel: 'Đang điều tra',
      severity: 'HIGH',
      severityLabel: 'Cao',
      createdAtLabel: '13:20 · 15/08/2026',
      updatedAtLabel: '14:15 · 15/08/2026',
      href: '/admin/reports/bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb',
    },
    {
      entity: 'report',
      id: 'cccccccc-3333-4333-8333-cccccccccccc',
      ticketNumber: 'TK-C103',
      orderId: '33333333-3333-4333-8333-333333333333',
      orderCode: 'LP-A-260815-103',
      customerId: 'cust-3',
      customerName: 'Phạm Quốc Hùng',
      customerPhone: '+84 90 345 6789',
      customerEmail: 'hung.pham@example.com',
      driverId: 'drv-3',
      driverName: 'Phạm Văn Dũng',
      driverPhone: '+84 90 555 5555',
      category: 'LOST_CARGO',
      categoryLabel: 'Thất lạc hàng',
      description: 'Giao thiếu 1 kiện phụ kiện linh kiện điện tử trong tổng số 5 kiện đã ký nhận bàn giao.',
      hasPhoto: true,
      photoUrls: ['https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80'],
      status: 'OPEN',
      statusLabel: 'Chờ xử lý',
      severity: 'CRITICAL',
      severityLabel: 'Nghiêm trọng',
      createdAtLabel: '11:50 · 15/08/2026',
      updatedAtLabel: '12:00 · 15/08/2026',
      href: '/admin/reports/cccccccc-3333-4333-8333-cccccccccccc',
    },
    {
      entity: 'report',
      id: 'dddddddd-4444-4444-8444-dddddddddddd',
      ticketNumber: 'TK-D104',
      orderId: null,
      orderCode: null,
      customerId: 'cust-1',
      customerName: 'Nguyễn Văn Khách',
      customerPhone: '+84 90 123 4567',
      customerEmail: 'khachhang1@example.com',
      driverId: null,
      driverName: null,
      driverPhone: null,
      category: 'GENERAL_INQUIRY',
      categoryLabel: 'Hỏi đáp chung',
      description: 'Cần xuất hóa đơn GTGT điện tử tổng hợp cuối tháng cho tài khoản công ty.',
      hasPhoto: false,
      status: 'RESOLVED',
      statusLabel: 'Đã giải quyết',
      severity: 'LOW',
      severityLabel: 'Thấp',
      createdAtLabel: '09:15 · 15/08/2026',
      updatedAtLabel: '10:30 · 15/08/2026',
      href: '/admin/reports/dddddddd-4444-4444-8444-dddddddddddd',
    },
  ];
}

function listView(
  screen: AdminListScreen,
  scenarioId: AdminPreviewScenarioId,
  commandKind: AdminCommandKind | null,
): AdminListView {
  const noResults =
    scenarioId === 'ADM-ORD-NORESULT' ||
    scenarioId === 'ADM-PAY-NORESULT' ||
    scenarioId === 'ADM-INV-NORESULT' ||
    scenarioId === 'ADM-AUD-NORESULT' ||
    scenarioId === 'ADM-PRM-NORESULT' ||
    scenarioId === 'ADM-REV-NORESULT' ||
    scenarioId === 'ADM-REP-NORESULT';
  let items: readonly AdminListItemView[];
  if (screen === 'orders') items = noResults ? [] : orderItems();
  else if (screen === 'users') items = userItems();
  else if (screen === 'fleets') items = fleetItems();
  else if (screen === 'payments') items = noResults ? [] : paymentItems();
  else if (screen === 'invoices') items = noResults ? [] : invoiceItems();
  else if (screen === 'audit') items = noResults ? [] : auditItems();
  else if (screen === 'promotions') items = noResults ? [] : promotionItems();
  else if (screen === 'reviews') items = noResults ? [] : reviewItems();
  else if (screen === 'reports') items = noResults ? [] : reportItems();
  else items = driverItems();

  const title =
    screen === 'orders'
      ? 'Đơn hàng'
      : screen === 'users'
        ? 'Người dùng'
        : screen === 'fleets'
          ? 'Đội xe'
          : screen === 'payments'
            ? 'Quản lý thanh toán'
            : screen === 'invoices'
              ? 'Quản lý hóa đơn'
              : screen === 'audit'
                ? 'Nhật ký kiểm toán'
                : screen === 'promotions'
                  ? 'Quản lý khuyến mãi'
                  : screen === 'reviews'
                    ? 'Đánh giá tài xế'
                    : screen === 'reports'
                      ? 'Hàng đợi khiếu nại'
                      : 'Tài xế';

  const isCommandScenario = COMMAND_SCENARIOS.includes(scenarioId as (typeof COMMAND_SCENARIOS)[number]);
  const selectedCommand = isCommandScenario ? commandKind ?? 'DISABLE_USER' : null;
  if (selectedCommand && !['DISABLE_USER', 'ENABLE_USER', 'CONFIRM_MANUAL_PAYMENT', 'TOGGLE_PROMOTION_STATUS', 'HIDE_REVIEW'].includes(selectedCommand)) {
    throw new TypeError(`Unsupported Admin command for ${screen}: ${selectedCommand}`);
  }
  const success = scenarioId === 'ADM-CMD-SUCCESS';
  const selectedTargetId = selectedCommand ? command(selectedCommand).targetId : null;
  const adaptedItems =
    success && selectedCommand
      ? screen === 'payments'
        ? paymentItems().map((item) =>
            item.id === selectedTargetId
              ? {
                  ...item,
                  status: 'PAID_MANUAL' as const,
                  statusLabel: 'Đã xác nhận thanh toán',
                  confirmedAtLabel: '14:35 · 15/08/2026',
                  confirmedByName: 'Admin Quản Trị',
                  confirmationNote: 'Xác nhận thanh toán thủ công trong kịch bản kiểm thử',
                  availableCommands: [],
                }
              : item,
          )
        : userItems().map((item) =>
            item.id === selectedTargetId
              ? {
                  ...item,
                  status: selectedCommand === 'DISABLE_USER' ? ('DISABLED' as const) : ('ACTIVE' as const),
                  updatedAtLabel: '14:35 · 15/08/2026',
                }
              : item,
          )
      : items;

  let metrics: readonly AdminMetricView[] | undefined = undefined;
  if (screen === 'payments') {
    const paymentList = adaptedItems.filter((i): i is AdminPaymentListItemView => i.entity === 'payment');
    const totalTransactions = paymentList.length;
    const pendingCount = paymentList.filter((i) => i.status === 'UNPAID' || i.status === 'QR_CREATED').length;
    const confirmedCount = paymentList.filter((i) => i.status === 'PAID_MANUAL').length;
    const failedCount = paymentList.filter((i) => i.status === 'FAILED').length;
    const totalRevenue = paymentList
      .filter((i) => i.status === 'PAID_MANUAL')
      .reduce((sum, i) => sum + i.amountVnd, 0);

    metrics = [
      {
        id: 'total-tx',
        label: 'Tổng giao dịch',
        value: totalTransactions,
        detail: `${totalTransactions} giao dịch ghi nhận`,
      },
      {
        id: 'pending-tx',
        label: 'Chờ xử lý',
        value: pendingCount,
        detail: 'Chưa thanh toán hoặc tạo QR',
      },
      {
        id: 'confirmed-tx',
        label: 'Đã xác nhận',
        value: confirmedCount,
        detail: 'Đã thanh toán thành công',
      },
      {
        id: 'failed-tx',
        label: 'Thất bại',
        value: failedCount,
        detail: 'Giao dịch thất bại',
      },
      {
        id: 'total-revenue',
        label: 'Doanh thu ghi nhận',
        value: '500.000 ₫',
        detail: 'Tổng tiền đã xác nhận',
      },
    ];
  }

  if (screen === 'invoices') {
    const invoiceList = adaptedItems.filter((i): i is AdminInvoiceListItemView => i.entity === 'invoice');
    const totalInvoices = invoiceList.length;
    const missingEmailCount = invoiceList.filter((i) => i.isMissingEmail).length;
    const issuedCount = invoiceList.filter((i) => i.status === 'ISSUED').length;
    const voidedCount = invoiceList.filter((i) => i.status === 'VOIDED').length;

    metrics = [
      {
        id: 'total-invoices',
        label: 'Tổng hóa đơn',
        value: totalInvoices,
        detail: `${totalInvoices} hóa đơn phát hành`,
      },
      {
        id: 'missing-email',
        label: 'Thiếu email',
        value: missingEmailCount,
        detail: 'Cần bổ sung email khách hàng',
      },
      {
        id: 'issued-invoices',
        label: 'Đã phát hành',
        value: issuedCount,
        detail: 'Hóa đơn hợp lệ',
      },
      {
        id: 'voided-invoices',
        label: 'Đã hủy',
        value: voidedCount,
        detail: 'Hóa đơn đã thu hồi / hủy',
      },
    ];
  }

  if (screen === 'promotions') {
    const promoList = adaptedItems.filter((i): i is AdminPromotionListItemView => i.entity === 'promotion');
    const totalPromotions = promoList.length;
    const activeCount = promoList.filter((p) => p.isActive).length;
    const inactiveCount = promoList.filter((p) => !p.isActive).length;
    const totalUsage = promoList.reduce((sum, p) => sum + p.usageCount, 0);

    metrics = [
      {
        id: 'total-promotions',
        label: 'Tổng mã voucher',
        value: totalPromotions,
        detail: `${totalPromotions} mã khuyến mãi trên hệ thống`,
      },
      {
        id: 'active-promotions',
        label: 'Đang hoạt động',
        value: activeCount,
        detail: 'Áp dụng cho đơn hàng mới',
      },
      {
        id: 'inactive-promotions',
        label: 'Tạm dừng',
        value: inactiveCount,
        detail: 'Đã tạm ngưng áp dụng',
      },
      {
        id: 'total-usage',
        label: 'Tổng lượt dùng',
        value: totalUsage,
        detail: 'Lượt áp dụng thành công',
      },
    ];
  }

  if (screen === 'reviews') {
    const revList = adaptedItems.filter((i): i is AdminReviewListItemView => i.entity === 'review');
    const totalReviews = revList.length;
    const averageRating =
      revList.length > 0
        ? (revList.reduce((sum, r) => sum + r.rating, 0) / revList.length).toFixed(1)
        : '0.0';
    const fiveStarCount = revList.filter((r) => r.rating === 5).length;
    const lowRatingCount = revList.filter((r) => r.rating <= 2).length;
    const totalTip = revList.reduce((sum, r) => {
      const numeric = parseInt(r.tipVndLabel.replace(/\D/g, ''), 10);
      return sum + (isNaN(numeric) ? 0 : numeric);
    }, 0);

    metrics = [
      {
        id: 'total-reviews',
        label: 'Tổng đánh giá',
        value: totalReviews,
        detail: `${totalReviews} lượt nhận xét từ khách`,
      },
      {
        id: 'average-rating',
        label: 'Điểm trung bình',
        value: `${averageRating} / 5.0`,
        detail: 'Trên thang điểm 5 sao',
      },
      {
        id: 'five-star',
        label: '5 sao xuất sắc',
        value: fiveStarCount,
        detail: 'Đánh giá chất lượng cao',
      },
      {
        id: 'low-rating',
        label: '1–2 sao cần chú ý',
        value: lowRatingCount,
        detail: 'Cần kiểm tra phản ánh dịch vụ',
      },
      {
        id: 'total-tips',
        label: 'Tổng tiền tip',
        value: `${totalTip.toLocaleString('vi-VN')} ₫`,
        detail: 'Tiền thưởng tài xế nhận được',
      },
    ];
  }

  if (screen === 'reports') {
    const repList = adaptedItems.filter((i): i is AdminReportListItemView => i.entity === 'report');
    const totalReports = repList.length;
    const openCount = repList.filter((r) => r.status === 'OPEN').length;
    const inProgressCount = repList.filter((r) => r.status === 'IN_PROGRESS').length;
    const resolvedCount = repList.filter((r) => r.status === 'RESOLVED' || r.status === 'CLOSED').length;

    metrics = [
      {
        id: 'total-reports',
        label: 'Tổng khiếu nại',
        value: totalReports,
        detail: `${totalReports} vụ việc ghi nhận`,
      },
      {
        id: 'open-reports',
        label: 'Chờ xử lý',
        value: openCount,
        detail: 'Cần tiếp nhận & phân loại',
      },
      {
        id: 'inprogress-reports',
        label: 'Đang điều tra',
        value: inProgressCount,
        detail: 'Đang xác minh tài xế/khách',
      },
      {
        id: 'resolved-reports',
        label: 'Đã giải quyết',
        value: resolvedCount,
        detail: 'Đã hoàn tất hoặc đóng',
      },
    ];
  }

  return {
    scenarioId,
    kind: 'list',
    entity: screen,
    state: noResults ? 'no-results' : 'success',
    title,
    checkedAtLabel: '14:32 · 15/08/2026',
    filters: noResults
      ? {
          ...defaultFilters[screen],
          status: screen === 'payments' ? 'PAID_MANUAL' : screen === 'invoices' ? 'VOIDED' : 'DELIVERED',
        }
      : { ...defaultFilters[screen] },
    result: {
      items: adaptedItems,
      page: 1,
      pageSize: 20,
      totalPages: noResults ? 0 : 1,
      totalItems: adaptedItems.length,
      filterSummary: noResults
        ? '0 kết quả · Trạng thái: Đã lọc'
        : `${adaptedItems.length} kết quả trong snapshot`,
      revision: `admin-${screen}-r21`,
    },
    notice: success
      ? { tone: 'success', title: 'Đã nhận persisted response mô phỏng', message: 'Domain state và audit receipt của scenario đã được cập nhật.' }
      : null,
    dialogPreview: selectedCommand ? dialogPreview(scenarioId, selectedCommand) : null,
    ...(metrics ? { metrics } : {}),
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
      mapAlternative: 'Điểm gần nhất ở cấp khu vực Hải Châu, Đà Nẵng; không lộ tọa độ thô.',
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
    entity: 'audit',
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
        entity: 'audit',
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

function reportDetailView(
  scenarioId: AdminPreviewScenarioId,
  commandKind: AdminCommandKind | null,
  reportId: string | null,
): AdminReportDetailView {
  const allReports = reportItems();
  const selectedReport = allReports.find((r) => r.id === reportId) ?? allReports[0]!;

  const orderData = selectedReport.orderId
    ? {
        id: selectedReport.orderId,
        code: selectedReport.orderCode ?? 'LP-A-260815-101',
        status: 'DELIVERED' as OrderStatus,
        statusLabel: 'Đã giao',
        priceVnd: 185000,
        priceLabel: '185.000 ₫',
        pickupAddress: '123 Đường Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM',
        dropoffAddress: '456 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM',
        incidentReason: selectedReport.category,
        incidentNote: selectedReport.description,
        incidentReportedAtLabel: selectedReport.createdAtLabel,
        paymentStatus: 'PAID_MANUAL',
        paymentStatusLabel: 'Đã xác nhận thanh toán',
        driverName: selectedReport.driverName,
        driverPhone: selectedReport.driverPhone ?? null,
        timeline: [
          { id: '1', status: 'REQUESTED', label: 'Tạo đơn', timestampLabel: '13:30 · 15/08/2026' },
          { id: '2', status: 'ACCEPTED', label: 'Tài xế nhận đơn', timestampLabel: '13:35 · 15/08/2026' },
          { id: '3', status: 'PICKED_UP', label: 'Đã lấy hàng', timestampLabel: '14:00 · 15/08/2026' },
          { id: '4', status: 'DELIVERED', label: 'Giao hàng thành công', timestampLabel: '14:35 · 15/08/2026' },
        ],
      }
    : null;

  return {
    scenarioId,
    kind: 'report-detail',
    report: {
      ticket: {
        ...selectedReport,
        photoUrls: selectedReport.hasPhoto
          ? ['https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80']
          : [],
      },
      order: orderData,
      customer: {
        id: selectedReport.customerId,
        name: selectedReport.customerName,
        phone: selectedReport.customerPhone,
        email: selectedReport.customerEmail ?? 'khachhang@example.com',
      },
      driver: selectedReport.driverId
        ? {
            id: selectedReport.driverId,
            name: selectedReport.driverName ?? 'Tài xế',
            phone: selectedReport.driverPhone ?? null,
            vehicleType: 'Xe bán tải / Van',
          }
        : null,
      internalNotes: [
        {
          id: 'note-01',
          author: 'CSKH - Nguyễn Thu Hà',
          note: 'Đã gọi điện cho khách hàng ghi nhận tình trạng thùng carton rách góc. Đang liên hệ tài xế đối soát biên bản bàn giao lúc lấy.',
          createdAtLabel: '14:45 · 15/08/2026',
        },
        {
          id: 'note-02',
          author: 'Điều phối - Trần Quốc Bảo',
          note: 'Tài xế xác nhận kiện hàng đã có vết móp trước khi lên xe nhưng quên chụp ảnh xác nhận POD khi nhận hàng.',
          createdAtLabel: '15:10 · 15/08/2026',
        },
      ],
    },
    audit: {
      state: 'success',
      message: null,
      entries: [
        {
          entity: 'audit',
          id: 'audit-rep-001',
          outcomeLabel: 'Thành công',
          actionLabel: 'Tiếp nhận khiếu nại',
          actorLabel: 'Hệ thống tự động',
          targetLabel: `${selectedReport.ticketNumber} · ${selectedReport.id}`,
          reason: 'Khách hàng gửi khiếu nại qua ứng dụng di động.',
          timestampLabel: selectedReport.createdAtLabel,
          dateTime: '2026-08-15T14:40:00+07:00',
          requestId: 'req-rep-demo-001',
          auditId: 'aud-rep-001',
        },
      ],
    },
    notice: null,
  };
}

function dispatchView(scenarioId: AdminPreviewScenarioId): AdminDispatchView {
  const isEmpty = scenarioId === 'ADM-DSP-EMPTY';
  if (isEmpty) {
    return {
      scenarioId,
      kind: 'dispatch',
      state: 'empty',
      checkedAtLabel: '14:32 · 15/08/2026',
      totalWaitingOrders: 0,
      orders: [],
      selectedOrderId: null,
      availableDrivers: [],
      notice: null,
    };
  }

  const candidateDriversVan: readonly AdminDispatchCandidateDriverView[] = [
    {
      driverId: 'drv-van-01',
      driverName: 'Nguyễn Văn Hùng',
      maskedPhone: '••• 4567',
      vehicleType: 'VAN',
      vehicleTypeLabel: 'Xe bán tải / Van',
      distanceKm: 1.8,
      distanceLabel: '1.8 km',
      etaMinutes: 6,
      etaLabel: 'ETA dự kiến: ~6 phút',
      lat: 10.7785,
      lng: 106.7022,
    },
    {
      driverId: 'drv-van-02',
      driverName: 'Trần Đình Trọng',
      maskedPhone: '••• 8899',
      vehicleType: 'VAN',
      vehicleTypeLabel: 'Xe bán tải / Van',
      distanceKm: 3.2,
      distanceLabel: '3.2 km',
      etaMinutes: 11,
      etaLabel: 'ETA dự kiến: ~11 phút',
      lat: 10.7712,
      lng: 106.6934,
    },
  ];

  const candidateDriversBike: readonly AdminDispatchCandidateDriverView[] = [
    {
      driverId: 'drv-bike-01',
      driverName: 'Lê Hoàng Nam',
      maskedPhone: '••• 1234',
      vehicleType: 'MOTORBIKE',
      vehicleTypeLabel: 'Xe máy',
      distanceKm: 0.9,
      distanceLabel: '0.9 km',
      etaMinutes: 4,
      etaLabel: 'ETA dự kiến: ~4 phút',
      lat: 10.785,
      lng: 106.695,
    },
    {
      driverId: 'drv-bike-02',
      driverName: 'Phạm Minh Tuấn',
      maskedPhone: '••• 5678',
      vehicleType: 'MOTORBIKE',
      vehicleTypeLabel: 'Xe máy',
      distanceKm: 2.1,
      distanceLabel: '2.1 km',
      etaMinutes: 8,
      etaLabel: 'ETA dự kiến: ~8 phút',
      lat: 10.789,
      lng: 106.691,
    },
  ];

  const candidateDriversTruck: readonly AdminDispatchCandidateDriverView[] = [
    {
      driverId: 'drv-truck-01',
      driverName: 'Đặng Quốc Huy',
      maskedPhone: '••• 9012',
      vehicleType: 'TRUCK',
      vehicleTypeLabel: 'Xe tải 5 tấn',
      distanceKm: 4.5,
      distanceLabel: '4.5 km',
      etaMinutes: 15,
      etaLabel: 'ETA dự kiến: ~15 phút',
      lat: 10.765,
      lng: 106.75,
    },
  ];

  const orders: readonly AdminDispatchOrderItemView[] = [
    {
      orderId: '11111111-1111-4111-8111-111111111111',
      orderCode: 'LP-DSP-260815-01',
      status: 'REQUESTED',
      vehicleType: 'VAN',
      vehicleTypeLabel: 'Xe bán tải / Van',
      pickupAddress: '123 Đường Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM',
      dropoffAddress: '456 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM',
      pickupLat: 10.7769,
      pickupLng: 106.7009,
      dropoffLat: 10.7735,
      dropoffLng: 106.7045,
      waitingMinutes: 35,
      createdAtLabel: '13:57 · 15/08/2026',
      customerName: 'Công ty TNHH Vận Tải Miền Nam',
      customerPhone: '••• 4567',
      priceVnd: 280000,
      candidateDrivers: candidateDriversVan,
    },
    {
      orderId: '22222222-2222-4222-8222-222222222222',
      orderCode: 'LP-DSP-260815-02',
      status: 'REQUESTED',
      vehicleType: 'MOTORBIKE',
      vehicleTypeLabel: 'Xe máy',
      pickupAddress: '789 Đường Hai Bà Trưng, Phường Võ Thị Sáu, Quận 3, TP.HCM',
      dropoffAddress: '101 Đường Cách Mạng Tháng 8, Phường 5, Quận 10, TP.HCM',
      pickupLat: 10.7885,
      pickupLng: 106.6932,
      dropoffLat: 10.7752,
      dropoffLng: 106.6748,
      waitingMinutes: 18,
      createdAtLabel: '14:14 · 15/08/2026',
      customerName: 'Nguyễn Văn An',
      customerPhone: '••• 8888',
      priceVnd: 65000,
      candidateDrivers: candidateDriversBike,
    },
    {
      orderId: '33333333-3333-4333-8333-333333333333',
      orderCode: 'LP-DSP-260815-03',
      status: 'REQUESTED',
      vehicleType: 'TRUCK',
      vehicleTypeLabel: 'Xe tải 5 tấn',
      pickupAddress: 'Cảng Cát Lái, Phường Cát Lái, TP. Thủ Đức, TP.HCM',
      dropoffAddress: 'Khu Công Nghiệp Tân Bình, Phường Tây Thạnh, Quận Tân Phú, TP.HCM',
      pickupLat: 10.7602,
      pickupLng: 106.7725,
      dropoffLat: 10.8164,
      dropoffLng: 106.6272,
      waitingMinutes: 8,
      createdAtLabel: '14:24 · 15/08/2026',
      customerName: 'Tổng Kho Hàng Xuất Khẩu Á Châu',
      customerPhone: '••• 9999',
      priceVnd: 1850000,
      candidateDrivers: candidateDriversTruck,
    },
  ];

  const availableDrivers: readonly AdminDispatchAvailableDriverView[] = [
    {
      driverId: 'drv-van-01',
      driverName: 'Nguyễn Văn Hùng',
      vehicleType: 'VAN',
      lat: 10.7785,
      lng: 106.7022,
      availability: 'AVAILABLE',
    },
    {
      driverId: 'drv-van-02',
      driverName: 'Trần Đình Trọng',
      vehicleType: 'VAN',
      lat: 10.7712,
      lng: 106.6934,
      availability: 'AVAILABLE',
    },
    {
      driverId: 'drv-bike-01',
      driverName: 'Lê Hoàng Nam',
      vehicleType: 'MOTORBIKE',
      lat: 10.785,
      lng: 106.695,
      availability: 'AVAILABLE',
    },
    {
      driverId: 'drv-bike-02',
      driverName: 'Phạm Minh Tuấn',
      vehicleType: 'MOTORBIKE',
      lat: 10.789,
      lng: 106.691,
      availability: 'AVAILABLE',
    },
    {
      driverId: 'drv-truck-01',
      driverName: 'Đặng Quốc Huy',
      vehicleType: 'TRUCK',
      lat: 10.765,
      lng: 106.75,
      availability: 'AVAILABLE',
    },
  ];

  return {
    scenarioId,
    kind: 'dispatch',
    state: 'ready',
    checkedAtLabel: '14:32 · 15/08/2026',
    totalWaitingOrders: 3,
    orders,
    selectedOrderId: orders[0]?.orderId ?? null,
    availableDrivers,
    notice: null,
  };
}

function notificationsView(scenarioId: AdminPreviewScenarioId): AdminNotificationsView {
  const isDense = scenarioId === 'ADM-NTF-COMPOSE';
  const broadcastLogs: readonly AdminBroadcastLogItemView[] = isDense
    ? [
        {
          id: 'ntf-001',
          audience: 'DRIVER',
          audienceLabel: 'Tài xế',
          type: 'SYSTEM',
          typeLabel: 'Hệ thống',
          title: 'Cập nhật chính sách an toàn vận chuyển mùa mưa bão',
          body: 'Yêu cầu toàn bộ đối tác tài xế trang bị bạt che hàng và tuân thủ tốc độ tối đa trong điều kiện mưa ngập tại TP.HCM.',
          sentCount: 1842,
          createdAtLabel: '09:15 · 15/08/2026',
          createdByName: 'Võ Quản Trị Viên',
        },
        {
          id: 'ntf-002',
          audience: 'CUSTOMER',
          audienceLabel: 'Khách hàng',
          type: 'PROMO',
          typeLabel: 'Khuyến mãi',
          title: 'Ưu đãi 20% đơn vận chuyển liên quận cuối tuần',
          body: 'Nhập mã LEOPARDWEEKEND nhận ngay giảm giá 20% tối đa 50.000đ cho mọi đơn xe tải và xe van.',
          sentCount: 1350,
          createdAtLabel: '18:00 · 14/08/2026',
          createdByName: 'Võ Quản Trị Viên',
        },
        {
          id: 'ntf-003',
          audience: 'ALL',
          audienceLabel: 'Tất cả',
          type: 'SYSTEM',
          typeLabel: 'Hệ thống',
          title: 'Bảo trì nâng cấp cổng thanh toán VietQR lúc 02:00 sáng',
          body: 'Hệ thống sẽ tạm gián đoạn dịch vụ tạo mã QR thanh toán tự động trong khoảng 15 phút rạng sáng ngày 16/08.',
          sentCount: 3200,
          createdAtLabel: '14:30 · 13/08/2026',
          createdByName: 'Lê Hệ Thống',
        },
        {
          id: 'ntf-004',
          audience: 'FLEET_OWNER',
          audienceLabel: 'Chủ đội xe',
          type: 'ORDER',
          typeLabel: 'Vận hành',
          title: 'Nhắc nhở đối soát chu kỳ tuần 32/2026',
          body: 'Bảng đối soát doanh thu và rút tiền đội xe đã sẵn sàng trên cổng Fleet Console.',
          sentCount: 8,
          createdAtLabel: '10:00 · 11/08/2026',
          createdByName: 'Trần Tài Chính',
        },
      ]
    : [];

  return {
    scenarioId,
    kind: 'notifications',
    state: isDense ? 'ready' : 'empty',
    checkedAtLabel: '15:00 · 15/08/2026',
    totalSentBroadcasts: broadcastLogs.length,
    totalAudienceReach: isDense ? 6400 : 0,
    audienceCounts: {
      ALL: 3200,
      CUSTOMER: 1350,
      DRIVER: 1842,
      FLEET_OWNER: 8,
    },
    broadcastLogs,
    notice: null,
  };
}

function pricingView(scenarioId: AdminPreviewScenarioId): AdminPricingView {
  const isPreview = scenarioId === 'ADM-PRC-PREVIEW';
  const vehicleRates: readonly AdminVehiclePricingRateView[] = [
    {
      vehicleType: 'MOTORBIKE',
      vehicleTypeLabel: 'Xe Máy Giao Hàng',
      baseFareVnd: isPreview ? 15000 : 12000,
      perKmVnd: isPreview ? 4000 : 3500,
      loadingFeeVnd: 0,
    },
    {
      vehicleType: 'VAN',
      vehicleTypeLabel: 'Xe Van 500kg - 1000kg',
      baseFareVnd: isPreview ? 60000 : 55000,
      perKmVnd: isPreview ? 11000 : 10000,
      loadingFeeVnd: 30000,
    },
    {
      vehicleType: 'TRUCK',
      vehicleTypeLabel: 'Xe Tải 1.5 Tấn - 2.5 Tấn',
      baseFareVnd: isPreview ? 100000 : 90000,
      perKmVnd: isPreview ? 16000 : 15000,
      loadingFeeVnd: 50000,
    },
  ];

  return {
    scenarioId,
    kind: 'pricing',
    state: 'ready',
    checkedAtLabel: '15:10 · 15/08/2026',
    minimumFareVnd: isPreview ? 15000 : 12000,
    stopSurchargeVnd: isPreview ? 3500 : 3000,
    vehicleRates,
    updatedAtLabel: '10:00 · 12/08/2026',
    updatedByName: 'Võ Quản Trị Giá',
    availableCommands: [],
    notice: isPreview
      ? {
          tone: 'info',
          title: 'Bản xem trước thay đổi cước phí',
          message: 'Đang xem trước biểu phí điều chỉnh dự kiến. Nhập lý do và bấm xác nhận để ban hành.',
        }
      : null,
  };
}

function liveMapView(scenarioId: AdminPreviewScenarioId): AdminLiveMapView {
  const isSimulationMode = scenarioId === 'ADM-MAP-SIM';
  const drivers: readonly AdminLiveMapDriverView[] = [
    {
      driverId: 'drv-live-01',
      driverName: 'Nguyễn Văn Hùng',
      phone: '+84901234567',
      maskedPhone: '••• 4567',
      vehicleType: 'VAN',
      vehicleTypeLabel: 'Xe Van 500kg',
      licensePlate: '51D-892.34',
      status: 'BUSY',
      statusLabel: 'Đang giao hàng',
      lat: 10.7769,
      lng: 106.7009,
      speedKmh: 28,
      activeOrderCode: 'LP-260815-0891',
      activeOrderId: '33333333-3333-4333-8333-333333333101',
      etaMinutesLabel: 'ETA dự kiến: ~12 phút',
      lastPingLabel: '3 giây trước',
    },
    {
      driverId: 'drv-live-02',
      driverName: 'Trần Đình Trọng',
      phone: '+84912345678',
      maskedPhone: '••• 5678',
      vehicleType: 'VAN',
      vehicleTypeLabel: 'Xe Van 1000kg',
      licensePlate: '51D-773.12',
      status: 'ONLINE',
      statusLabel: 'Sẵn sàng nhận đơn',
      lat: 10.7812,
      lng: 106.6985,
      speedKmh: 0,
      etaMinutesLabel: null,
      lastPingLabel: '5 giây trước',
    },
    {
      driverId: 'drv-live-03',
      driverName: 'Lê Hoàng Nam',
      phone: '+84987654321',
      maskedPhone: '••• 4321',
      vehicleType: 'MOTORBIKE',
      vehicleTypeLabel: 'Xe Máy',
      licensePlate: '59P1-456.78',
      status: 'BUSY',
      statusLabel: 'Đang giao hàng',
      lat: 10.7685,
      lng: 106.6842,
      speedKmh: 35,
      activeOrderCode: 'LP-260815-0742',
      activeOrderId: '33333333-3333-4333-8333-333333333102',
      etaMinutesLabel: 'ETA dự kiến: ~6 phút',
      lastPingLabel: '2 giây trước',
    },
    {
      driverId: 'drv-live-04',
      driverName: 'Đặng Quốc Huy',
      phone: '+84934567890',
      maskedPhone: '••• 7890',
      vehicleType: 'TRUCK',
      vehicleTypeLabel: 'Xe Tải 2 Tấn',
      licensePlate: '51C-445.67',
      status: 'ONLINE',
      statusLabel: 'Sẵn sàng nhận đơn',
      lat: 10.7602,
      lng: 106.7725,
      speedKmh: 0,
      etaMinutesLabel: null,
      lastPingLabel: '10 giây trước',
    },
    {
      driverId: 'drv-live-05',
      driverName: 'Hoàng Gia Bảo',
      phone: '+84945678901',
      maskedPhone: '••• 8901',
      vehicleType: 'MOTORBIKE',
      vehicleTypeLabel: 'Xe Máy',
      licensePlate: '59K2-789.01',
      status: 'OFFLINE',
      statusLabel: 'Ngoại tuyến',
      lat: 10.7512,
      lng: 106.6712,
      speedKmh: 0,
      etaMinutesLabel: null,
      lastPingLabel: '15 phút trước',
    },
  ];

  const orders: readonly AdminLiveMapOrderView[] = [
    {
      orderId: '33333333-3333-4333-8333-333333333101',
      orderCode: 'LP-260815-0891',
      status: 'IN_TRANSIT',
      statusLabel: 'Đang giao',
      customerName: 'Công Ty TNHH May Mặc Sài Gòn',
      driverName: 'Nguyễn Văn Hùng',
      vehicleType: 'VAN',
      pickupAddress: 'Kho Tân Thuận, Quận 7, TP.HCM',
      dropoffAddress: 'Tòa nhà Landmark 81, Phường 22, Quận Bình Thạnh, TP.HCM',
      pickupLat: 10.7518,
      pickupLng: 106.7214,
      dropoffLat: 10.795,
      dropoffLng: 106.7218,
      etaLabel: 'ETA dự kiến: ~12 phút',
      currentLat: 10.7769,
      currentLng: 106.7009,
    },
    {
      orderId: '33333333-3333-4333-8333-333333333102',
      orderCode: 'LP-260815-0742',
      status: 'PICKING_UP',
      statusLabel: 'Đang lấy',
      customerName: 'Nguyễn Hoàng Khang',
      driverName: 'Lê Hoàng Nam',
      vehicleType: 'MOTORBIKE',
      pickupAddress: '120 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM',
      dropoffAddress: '354 Cộng Hòa, Phường 13, Quận Tân Bình, TP.HCM',
      pickupLat: 10.7745,
      pickupLng: 106.7035,
      dropoffLat: 10.8034,
      dropoffLng: 106.6456,
      etaLabel: 'ETA dự kiến: ~6 phút',
      currentLat: 10.7685,
      currentLng: 106.6842,
    },
  ];

  return {
    scenarioId,
    kind: 'live-map',
    state: 'ready',
    checkedAtLabel: '15:20 · 15/08/2026',
    isSimulationMode,
    metrics: {
      totalOnlineDrivers: 2,
      totalBusyDrivers: 2,
      totalActiveOrders: 2,
      avgEtaMinutes: 9,
    },
    drivers,
    orders,
    notice: isSimulationMode
      ? {
          tone: 'warning',
          title: 'Chế độ mô phỏng viễn trắc',
          message: 'Dữ liệu mô phỏng: Tọa độ và trạng thái phương tiện đang chạy trên môi trường giả lập thử nghiệm.',
        }
      : null,
  };
}

function settingsView(scenarioId: AdminPreviewScenarioId): AdminSettingsView {
  const isDemoMode = scenarioId === 'ADM-SET-DEMO';
  const providers: readonly AdminProviderCardView[] = [
    {
      id: 'maps',
      name: 'Bản đồ & Định tuyến Vietmap',
      category: 'Map & Navigation Engine',
      provider: 'Vietmap Routing API v3',
      status: 'HEALTHY',
      statusLabel: 'Hoạt động bình thường',
      latencyMs: 38,
      mode: isDemoMode ? 'DEMO_SIMULATION' : 'PRODUCTION',
      modeLabel: isDemoMode ? 'Dữ liệu mô phỏng' : 'Chính thức',
      details: [
        { label: 'Cổng kết nối', value: 'https://api.vietmap.vn' },
        { label: 'Hạn mức ngày', value: '4.850 / 50.000 requests' },
        { label: 'Tỉ lệ phản hồi 200', value: '99.98%' },
      ],
    },
    {
      id: 'auth',
      name: 'Xác thực OTP Firebase Phone Auth',
      category: 'SMS Gateway / Auth',
      provider: 'Firebase Authentication SDK',
      status: 'HEALTHY',
      statusLabel: 'Hoạt động bình thường',
      latencyMs: 110,
      mode: isDemoMode ? 'DEMO_SIMULATION' : 'PRODUCTION',
      modeLabel: isDemoMode ? 'Dữ liệu mô phỏng' : 'Chính thức',
      details: [
        { label: 'Nhà cung cấp', value: 'Google Firebase Cloud' },
        { label: 'Hạn ngạch SMS', value: '128 / 1.000 SMS/ngày' },
        { label: 'Tỉ lệ phát thành công', value: '99.4%' },
      ],
    },
    {
      id: 'storage',
      name: 'Lưu trữ tài liệu & Bằng chứng S3',
      category: 'Object Storage',
      provider: 'S3-Compatible MinIO Storage',
      status: 'HEALTHY',
      statusLabel: 'Hoạt động bình thường',
      latencyMs: 45,
      mode: 'PRODUCTION',
      modeLabel: 'Chính thức',
      details: [
        { label: 'Bucket chính', value: 'leopard-pilot-media' },
        { label: 'Dung lượng đã dùng', value: '14.2 GB / 250 GB' },
        { label: 'Mã hóa lưu trữ', value: 'AES-256 Enabled' },
      ],
    },
    {
      id: 'payment',
      name: 'Cổng thanh toán tự động VietQR / payOS',
      category: 'Payment Gateway',
      provider: 'payOS Webhook v2',
      status: 'HEALTHY',
      statusLabel: 'Hoạt động bình thường',
      latencyMs: 125,
      mode: isDemoMode ? 'DEMO_SIMULATION' : 'PRODUCTION',
      modeLabel: isDemoMode ? 'Dữ liệu mô phỏng' : 'Chính thức',
      details: [
        { label: 'Webhook URL', value: 'https://api.leopard.vn/payments/webhook' },
        { label: 'Webhook Latency', value: '125 ms' },
        { label: 'Tài khoản thụ hưởng', value: 'LEOPARD LOGISTICS CORP' },
      ],
    },
  ];

  return {
    scenarioId,
    kind: 'settings',
    state: 'ready',
    checkedAtLabel: '15:25 · 15/08/2026',
    isDemoMode,
    systemInfo: {
      version: 'v0.9.4-pilot',
      environment: isDemoMode ? 'Pilot Staging (Demo Mock Enabled)' : 'Pilot Production',
      nodeEnv: 'production',
      uptimeLabel: '14 ngày 6 giờ 22 phút',
      databaseStatus: 'PostgreSQL 16 + PostGIS 3.4 (Connected)',
      cacheStatus: 'Redis Cluster 7.2 (Ready)',
    },
    providers,
    notice: isDemoMode
      ? {
          tone: 'warning',
          title: 'Cảnh báo cấu hình hệ thống',
          message: 'Dữ liệu mô phỏng: Cờ ALLOW_DEMO_PROVIDER đang được bật. Một số phản hồi API bản đồ và OTP sẽ sử dụng provider giả lập.',
        }
      : null,
  };
}

function supportView(scenarioId: AdminPreviewScenarioId): AdminSupportView {
  const isEmpty = scenarioId === 'ADM-SUP-EMPTY';

  const conversations: readonly AdminSupportConversationView[] = isEmpty
    ? []
    : [
        {
          orderId: '33333333-3333-4333-8333-333333333101',
          orderCode: 'LP-260815-0891',
          orderStatus: 'IN_TRANSIT',
          orderStatusLabel: 'Đang vận chuyển',
          customerId: 'usr-cust-01',
          customerName: 'Nguyễn Thị Mai Lan',
          customerPhone: '+84901234567',
          maskedPhone: '••• 4567',
          driverId: 'drv-live-01',
          driverName: 'Nguyễn Văn Hùng',
          driverPhone: '+84912344567',
          lastMessageSnippet: 'Bên mình có thể hỗ trợ kiểm tra thời gian giao dự kiến được không?',
          lastMessageAtLabel: '14:35 · Vừa xong',
          unreadCount: 2,
          status: 'WAITING_REPLY',
          statusLabel: 'Chờ phản hồi',
        },
        {
          orderId: '33333333-3333-4333-8333-333333333102',
          orderCode: 'LP-260815-0742',
          orderStatus: 'PICKING_UP',
          orderStatusLabel: 'Đang lấy hàng',
          customerId: 'usr-cust-02',
          customerName: 'Trần Đình Trọng',
          customerPhone: '+84902345678',
          maskedPhone: '••• 5678',
          driverId: 'drv-live-03',
          driverName: 'Lê Hoàng Nam',
          driverPhone: '+84987654321',
          lastMessageSnippet: 'Tài xế đang đến điểm lấy đúng hẹn rồi ạ!',
          lastMessageAtLabel: '14:20 · 15 phút trước',
          unreadCount: 0,
          status: 'ACTIVE',
          statusLabel: 'Đang trao đổi',
        },
        {
          orderId: '33333333-3333-4333-8333-333333333103',
          orderCode: 'LP-260815-0555',
          orderStatus: 'DELIVERED',
          orderStatusLabel: 'Đã hoàn thành',
          customerId: 'usr-cust-03',
          customerName: 'Lê Thị Thu Thảo',
          customerPhone: '+84903456789',
          maskedPhone: '••• 6789',
          driverId: 'drv-live-04',
          driverName: 'Đặng Quốc Huy',
          driverPhone: '+84934567890',
          lastMessageSnippet: 'Đơn hàng đã giao thành công và có chữ ký POD xác nhận.',
          lastMessageAtLabel: '13:10 · 1 giờ trước',
          unreadCount: 0,
          status: 'RESOLVED',
          statusLabel: 'Đã giải quyết',
        },
      ];

  const activeMessages: readonly AdminSupportMessageView[] = isEmpty
    ? []
    : [
        {
          id: 'msg-01',
          orderId: '33333333-3333-4333-8333-333333333101',
          senderId: 'usr-cust-01',
          senderName: 'Nguyễn Thị Mai Lan',
          senderRole: 'CUSTOMER',
          body: 'Chào tổng đài LEOPARD, đơn hàng của mình hiện tài xế đang đi tới đâu rồi ạ?',
          createdAtLabel: '14:30',
          isFromMe: false,
        },
        {
          id: 'msg-02',
          orderId: '33333333-3333-4333-8333-333333333101',
          senderId: 'drv-live-01',
          senderName: 'Nguyễn Văn Hùng (Tài xế)',
          senderRole: 'DRIVER',
          body: 'Em chào chị Lan, em đang di chuyển qua đoạn Cầu Sài Gòn, dự kiến tầm 12 phút nữa em tới Landmark 81 giao hàng cho chị ạ.',
          createdAtLabel: '14:32',
          isFromMe: false,
        },
        {
          id: 'msg-03',
          orderId: '33333333-3333-4333-8333-333333333101',
          senderId: 'usr-cust-01',
          senderName: 'Nguyễn Thị Mai Lan',
          senderRole: 'CUSTOMER',
          body: 'Bên mình có thể hỗ trợ kiểm tra thời gian giao dự kiến được không? Vì 15:00 mình có cuộc họp.',
          createdAtLabel: '14:35',
          isFromMe: false,
        },
      ];

  const selectedConv = conversations[0] ?? null;

  return {
    scenarioId,
    kind: 'support',
    state: 'ready',
    checkedAtLabel: '15:20 · 15/08/2026',
    metrics: {
      totalActiveChats: isEmpty ? 0 : 8,
      waitingReplyCount: isEmpty ? 0 : 3,
      avgResponseMinutes: isEmpty ? 0 : 4,
      satisfactionCsat: isEmpty ? 0 : 96,
    },
    conversations,
    selectedOrderId: selectedConv ? selectedConv.orderId : null,
    selectedConversation: selectedConv,
    activeMessages,
    notice: isEmpty
      ? {
          tone: 'info',
          title: 'Hộp thư rỗng',
          message: 'Hiện không có cuộc hội thoại hỗ trợ nào cần xử lý.',
        }
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
  screen: 'payments', requestedScenario: string | null, commandKind?: AdminCommandKind | null,
  orderId?: string | null,
): AdminListRouteView;
export function createAdminPreviewView(
  screen: 'invoices', requestedScenario: string | null, commandKind?: AdminCommandKind | null,
  orderId?: string | null,
): AdminListRouteView;
export function createAdminPreviewView(
  screen: 'audit', requestedScenario: string | null, commandKind?: AdminCommandKind | null,
  orderId?: string | null,
): AdminListRouteView;
export function createAdminPreviewView(
  screen: 'reports', requestedScenario: string | null, commandKind?: AdminCommandKind | null,
  orderId?: string | null,
): AdminListRouteView;
export function createAdminPreviewView(
  screen: AdminListScreen, requestedScenario: string | null, commandKind?: AdminCommandKind | null,
  orderId?: string | null,
): AdminListRouteView;
export function createAdminPreviewView(
  screen: 'order-detail', requestedScenario: string | null, commandKind?: AdminCommandKind | null,
  orderId?: string | null,
): AdminOrderDetailRouteView;
export function createAdminPreviewView(
  screen: 'report-detail', requestedScenario: string | null, commandKind?: AdminCommandKind | null,
  orderId?: string | null,
): AdminReportDetailRouteView;
export function createAdminPreviewView(
  screen: 'dispatch', requestedScenario: string | null, commandKind?: AdminCommandKind | null,
  orderId?: string | null,
): AdminDispatchRouteView;
export function createAdminPreviewView(
  screen: 'notifications', requestedScenario: string | null, commandKind?: AdminCommandKind | null,
  orderId?: string | null,
): AdminNotificationsRouteView;
export function createAdminPreviewView(
  screen: 'pricing', requestedScenario: string | null, commandKind?: AdminCommandKind | null,
  orderId?: string | null,
): AdminPricingRouteView;
export function createAdminPreviewView(
  screen: 'live-map', requestedScenario: string | null, commandKind?: AdminCommandKind | null,
  orderId?: string | null,
): AdminLiveMapRouteView;
export function createAdminPreviewView(
  screen: 'settings', requestedScenario: string | null, commandKind?: AdminCommandKind | null,
  orderId?: string | null,
): AdminSettingsRouteView;
export function createAdminPreviewView(
  screen: 'support', requestedScenario: string | null, commandKind?: AdminCommandKind | null,
  orderId?: string | null,
): AdminSupportRouteView;
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
  else if (screen === 'report-detail') view = reportDetailView(scenarioId, commandKind, orderId);
  else if (screen === 'dispatch') view = dispatchView(scenarioId);
  else if (screen === 'notifications') view = notificationsView(scenarioId);
  else if (screen === 'pricing') view = pricingView(scenarioId);
  else if (screen === 'live-map') view = liveMapView(scenarioId);
  else if (screen === 'settings') view = settingsView(scenarioId);
  else if (screen === 'support') view = supportView(scenarioId);
  else view = listView(screen, scenarioId, commandKind);
  return deepFreeze(view);
}
