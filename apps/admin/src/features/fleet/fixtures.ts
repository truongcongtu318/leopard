import type {
  FleetBoundaryView,
  FleetDashboardRouteView,
  FleetDashboardView,
  FleetDriverFilters,
  FleetDriverListItemView,
  FleetDriversRouteView,
  FleetDriversView,
  FleetOrderDetailDataView,
  FleetOrderDetailRouteView,
  FleetOrderDetailView,
  FleetOrderFilters,
  FleetOrderListItemView,
  FleetOrdersRouteView,
  FleetOrdersView,
  FleetRouteView,
  FleetScopeView,
} from './model';

export const FLEET_PREVIEW_SCENARIOS = [
  'fleet-overview-success',
  'fleet-overview-empty',
  'fleet-overview-partial-error',
  'fleet-scope-denied',
  'fleet-scope-loading',
  'fleet-drivers-mixed',
  'fleet-drivers-no-results',
  'fleet-drivers-map-unavailable',
  'fleet-orders-mixed',
  'fleet-orders-no-results',
  'fleet-orders-offline',
  'fleet-orders-conflict',
  'fleet-order-detail-success',
  'fleet-order-detail-stale-tracking',
  'fleet-order-detail-no-location',
  'fleet-order-detail-media-error',
  'fleet-order-foreign-denied',
  'fleet-session-expired',
  'fleet-reconnecting',
  'fleet-refresh-success',
] as const;

export type FleetPreviewScenarioId = (typeof FLEET_PREVIEW_SCENARIOS)[number];
export type FleetPreviewScreen = 'dashboard' | 'drivers' | 'orders' | 'order-detail';

const SCENARIOS_BY_SCREEN: Readonly<Record<FleetPreviewScreen, readonly FleetPreviewScenarioId[]>> =
  {
    dashboard: [
      'fleet-overview-success',
      'fleet-overview-empty',
      'fleet-overview-partial-error',
      'fleet-scope-denied',
      'fleet-scope-loading',
      'fleet-session-expired',
      'fleet-reconnecting',
      'fleet-refresh-success',
    ],
    drivers: [
      'fleet-scope-loading',
      'fleet-scope-denied',
      'fleet-session-expired',
      'fleet-drivers-mixed',
      'fleet-drivers-no-results',
      'fleet-drivers-map-unavailable',
    ],
    orders: [
      'fleet-scope-loading',
      'fleet-scope-denied',
      'fleet-session-expired',
      'fleet-orders-mixed',
      'fleet-orders-no-results',
      'fleet-orders-offline',
      'fleet-orders-conflict',
    ],
    'order-detail': [
      'fleet-scope-loading',
      'fleet-scope-denied',
      'fleet-session-expired',
      'fleet-order-detail-success',
      'fleet-order-detail-stale-tracking',
      'fleet-order-detail-no-location',
      'fleet-order-detail-media-error',
      'fleet-order-foreign-denied',
    ],
  };

const DEFAULT_SCENARIO: Readonly<Record<FleetPreviewScreen, FleetPreviewScenarioId>> = {
  dashboard: 'fleet-overview-success',
  drivers: 'fleet-drivers-mixed',
  orders: 'fleet-orders-mixed',
  'order-detail': 'fleet-order-detail-success',
};

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function scope(): FleetScopeView {
  return {
    fleetId: '11111111-1111-4111-8111-111111111001',
    displayId: 'FLEET-SM-01',
    displayName: 'Sao Mai',
    membershipStatus: 'ACTIVE',
    readOnly: true,
    verifiedAtLabel: '14:32 · 15/08/2026',
  };
}

function boundary(
  scenarioId: FleetPreviewScenarioId,
  kind: FleetBoundaryView['kind'],
  title: string,
  message: string,
): FleetBoundaryView {
  return { scenarioId, kind, title, message };
}

function metrics(isEmpty: boolean) {
  return [
    {
      id: 'active-orders',
      label: 'Đơn đang hoạt động',
      value: isEmpty ? 0 : 2,
      detail: 'Đã lọc theo đội xe',
      href: '/fleet/orders?status=IN_TRANSIT',
    },
    {
      id: 'available-drivers',
      label: 'Tài xế sẵn sàng',
      value: isEmpty ? 0 : 1,
      detail: 'Trong 3 tài xế',
      href: '/fleet/drivers?availability=AVAILABLE',
    },
    {
      id: 'attention',
      label: 'Ngoại lệ hiện tại',
      value: isEmpty ? 0 : 1,
      detail: 'Do nguồn dữ liệu cung cấp',
    },
    {
      id: 'missing-location',
      label: 'Thiếu vị trí hợp lệ',
      value: 0,
      detail: '0 là dữ liệu hợp lệ',
    },
  ];
}

function dashboard(scenarioId: FleetPreviewScenarioId): FleetDashboardView {
  const isEmpty = scenarioId === 'fleet-overview-empty';
  const partialError = scenarioId === 'fleet-overview-partial-error';
  const reconnecting = scenarioId === 'fleet-reconnecting';
  const refreshSuccess = scenarioId === 'fleet-refresh-success';
  return {
    scenarioId,
    kind: 'dashboard',
    state: isEmpty
      ? 'empty'
      : partialError
        ? 'partial-error'
        : reconnecting
          ? 'reconnecting'
          : refreshSuccess
            ? 'refresh-success'
            : 'success',
    scope: scope(),
    asOfLabel: '14:32 · 15/08/2026',
    metrics: metrics(isEmpty),
    attentionItems: isEmpty
      ? []
      : [
          {
            id: 'attention-stale-tracking',
            severity: 'warning',
            title: 'Tracking cần kiểm tra',
            reason: 'Vị trí gần nhất của đơn đã được nguồn dữ liệu đánh dấu là cũ.',
            resourceLabel: 'LP-F-260815-001',
            href: '/fleet/orders/33333333-3333-4333-8333-333333333001',
            observedAtLabel: '14:27 · 15/08/2026',
          },
        ],
    activeOrders: isEmpty
      ? []
      : [
          {
            id: '33333333-3333-4333-8333-333333333001',
            reference: 'LP-F-260815-001',
            status: 'IN_TRANSIT',
            routeLabel: 'Quận 7 → Thành phố Thủ Đức',
            driverLabel: 'Tài xế An Mô Phỏng',
            trackingLabel: 'Vị trí gần nhất lúc 14:27',
            href: '/fleet/orders/33333333-3333-4333-8333-333333333001',
          },
          {
            id: '33333333-3333-4333-8333-333333333002',
            reference: 'LP-F-260815-002',
            status: 'PICKING_UP',
            routeLabel: 'Bình Thạnh → Quận 3',
            driverLabel: 'Tài xế Bình Mô Phỏng',
            trackingLabel: 'Vị trí gần nhất lúc 14:31',
            href: '/fleet/orders/33333333-3333-4333-8333-333333333002',
          },
        ],
    availabilitySummary: isEmpty
      ? 'Chưa có tài xế trong phạm vi hiện tại.'
      : '1 sẵn sàng · 1 đang bận · 1 ngoại tuyến',
    notice: reconnecting
      ? {
          tone: 'info',
          title: 'Đang kết nối lại',
          message: 'Snapshot đã xác thực vẫn được giữ cho đến khi đồng bộ hoàn tất.',
        }
      : refreshSuccess
        ? {
            tone: 'info',
            title: 'Đã làm mới snapshot',
            message: 'Dữ liệu mô phỏng mới nhất đã được ghi nhận lúc 14:32.',
          }
        : null,
    unavailableRegionLabel: partialError
      ? 'Tóm tắt availability tạm thời không khả dụng; đơn đang hoạt động vẫn được giữ.'
      : null,
  };
}

const defaultDriverFilters: FleetDriverFilters = {
  q: '',
  availability: 'ALL',
  sort: 'name-asc',
  page: 1,
  pageSize: 20,
};

function driverItems(): readonly FleetDriverListItemView[] {
  return [
    {
      id: '22222222-2222-4222-8222-222222222001',
      displayId: 'DRV-SM-001',
      displayName: 'Tài xế An Mô Phỏng',
      availability: 'BUSY',
      activeOrder: {
        reference: 'LP-F-260815-001',
        href: '/fleet/orders/33333333-3333-4333-8333-333333333001',
      },
      lastLocationLabel: 'Gần cầu Kênh Tẻ, Quận 7',
      locationUpdatedAtLabel: '14:27 · 15/08/2026',
      locationFreshness: 'stale',
      exceptionLabel: 'Vị trí đã được đánh dấu là cũ',
    },
    {
      id: '22222222-2222-4222-8222-222222222002',
      displayId: 'DRV-SM-002',
      displayName: 'Tài xế Bình Mô Phỏng',
      availability: 'AVAILABLE',
      activeOrder: null,
      lastLocationLabel: 'Khu vực Bình Thạnh',
      locationUpdatedAtLabel: '14:31 · 15/08/2026',
      locationFreshness: 'current',
      exceptionLabel: null,
    },
  ];
}

function drivers(scenarioId: FleetPreviewScenarioId): FleetDriversView {
  const noResults = scenarioId === 'fleet-drivers-no-results';
  const mapUnavailable = scenarioId === 'fleet-drivers-map-unavailable';
  const items = noResults ? [] : driverItems();
  return {
    scenarioId,
    kind: 'drivers',
    state: noResults ? 'no-results' : 'success',
    scope: scope(),
    filters: noResults
      ? { ...defaultDriverFilters, q: 'Không có kết quả' }
      : { ...defaultDriverFilters },
    result: {
      items,
      page: 1,
      pageSize: 20,
      totalPages: noResults ? 0 : 1,
      totalItems: items.length,
      filterSummary: noResults ? '0 kết quả cho bộ lọc hiện tại' : '2 tài xế trong kết quả',
      sort: 'name-asc',
      revision: 'fleet-drivers-r17',
      asOfLabel: '14:32 · 15/08/2026',
      mapState: mapUnavailable ? 'unavailable' : noResults ? 'no-location' : 'route',
      mapAlternative: noResults
        ? 'Không có vị trí tương ứng với bộ lọc.'
        : '2 tài xế trong kết quả; An ở Quận 7, Bình ở Bình Thạnh.',
    },
    notice: mapUnavailable
      ? {
          tone: 'warning',
          title: 'Không thể tải vùng bản đồ',
          message: 'Danh sách và nhãn vị trí gần nhất vẫn được giữ.',
        }
      : null,
  };
}

const defaultOrderFilters: FleetOrderFilters = {
  q: '',
  status: 'ALL',
  customer: '',
  driverId: '',
  from: '',
  to: '',
  sort: 'updated-desc',
  page: 1,
  pageSize: 20,
};

function orderItems(): readonly FleetOrderListItemView[] {
  return [
    {
      id: '33333333-3333-4333-8333-333333333001',
      reference: 'LP-F-260815-001',
      status: 'IN_TRANSIT',
      route: {
        originLabel: 'Kho mô phỏng Quận 7',
        destinationLabel: 'Điểm giao mô phỏng Thành phố Thủ Đức',
      },
      customerLabel: 'Khách Hàng Lan Mô Phỏng',
      driverLabel: 'Tài xế An Mô Phỏng',
      paymentStatus: 'UNPAID',
      updatedAtLabel: '14:27 · 15/08/2026',
      trackingLabel: 'Vị trí đã được đánh dấu là cũ',
      trackingFreshness: 'stale',
      href: '/fleet/orders/33333333-3333-4333-8333-333333333001',
    },
    {
      id: '33333333-3333-4333-8333-333333333002',
      reference: 'LP-F-260815-002',
      status: 'PICKING_UP',
      route: {
        originLabel: 'Điểm lấy mô phỏng Bình Thạnh',
        destinationLabel: 'Điểm giao mô phỏng Quận 3',
      },
      customerLabel: 'Khách Hàng Minh Mô Phỏng',
      driverLabel: 'Tài xế Bình Mô Phỏng',
      paymentStatus: 'QR_CREATED',
      updatedAtLabel: '14:31 · 15/08/2026',
      trackingLabel: 'Vị trí gần nhất lúc 14:31',
      trackingFreshness: 'current',
      href: '/fleet/orders/33333333-3333-4333-8333-333333333002',
    },
  ];
}

function orders(scenarioId: FleetPreviewScenarioId): FleetOrdersView {
  const noResults = scenarioId === 'fleet-orders-no-results';
  const offline = scenarioId === 'fleet-orders-offline';
  const conflict = scenarioId === 'fleet-orders-conflict';
  const items = noResults ? [] : orderItems();
  return {
    scenarioId,
    kind: 'orders',
    state: noResults ? 'no-results' : offline ? 'offline' : conflict ? 'conflict' : 'success',
    scope: scope(),
    filters: noResults
      ? { ...defaultOrderFilters, customer: 'Không khớp' }
      : { ...defaultOrderFilters },
    result: {
      items,
      page: 1,
      pageSize: 20,
      totalPages: noResults ? 0 : 1,
      totalItems: items.length,
      filterSummary: noResults ? '0 kết quả cho bộ lọc hiện tại' : '2 đơn thuộc Đội xe Sao Mai',
      sort: 'updated-desc',
      revision: 'fleet-orders-r31',
      asOfLabel: '14:32 · 15/08/2026',
      mapState: noResults ? 'no-location' : offline ? 'stale' : 'route',
      mapAlternative: noResults
        ? 'Không có tuyến tương ứng với bộ lọc.'
        : 'Hai tuyến mô phỏng đang hiển thị; dữ liệu dạng chữ luôn có sẵn.',
    },
    notice: offline
      ? {
          tone: 'warning',
          title: 'Đang ngoại tuyến',
          message: 'Snapshot được xác thực lúc 14:32 vẫn được giữ và có thể chưa mới nhất.',
        }
      : conflict
        ? {
            tone: 'warning',
            title: 'Danh sách đã có phiên bản mới',
            message: 'Tải lại snapshot trước khi tiếp tục điều tra; không có thay đổi cục bộ.',
          }
        : null,
  };
}

function orderDetailData(scenarioId: FleetPreviewScenarioId): FleetOrderDetailDataView {
  const staleTracking = scenarioId === 'fleet-order-detail-stale-tracking';
  const noLocation = scenarioId === 'fleet-order-detail-no-location';
  const mediaError = scenarioId === 'fleet-order-detail-media-error';
  return {
    id: '33333333-3333-4333-8333-333333333001',
    reference: 'LP-F-260815-001',
    status: 'IN_TRANSIT',
    updatedAtLabel: '14:32 · 15/08/2026',
    route: {
      origin: {
        id: 'fleet-origin',
        label: 'Kho mô phỏng tại Quận 7',
        metadata: 'Lấy hàng lúc 13:45',
      },
      stops: [
        {
          id: 'fleet-stop-1',
          label: 'Điểm dừng mô phỏng tại Quận 4',
          metadata: 'Đã đi qua lúc 14:10',
        },
      ],
      destination: {
        id: 'fleet-destination',
        label: 'Điểm giao mô phỏng tại Thành phố Thủ Đức',
        metadata: 'Điểm đến dự kiến',
      },
    },
    eta: {
      label: 'ETA dự kiến · 18 phút',
      sourceLabel: 'Dữ liệu mô phỏng',
    },
    driverLabel: 'Tài xế An Mô Phỏng',
    customerLabel: 'Khách Hàng Lan Mô Phỏng',
    cargoSummary: 'Hàng đóng thùng · khoảng 120 kg · ghi chú mô phỏng',
    tracking: {
      state: noLocation ? 'no-location' : staleTracking ? 'stale' : 'route',
      statusLabel: noLocation
        ? 'Chưa có vị trí hợp lệ'
        : staleTracking
          ? 'Vị trí đã được nguồn dữ liệu đánh dấu là cũ'
          : 'Vị trí gần nhất đã nhận',
      lastUpdatedLabel: noLocation
        ? null
        : staleTracking
          ? '14:27 · 15/08/2026'
          : '14:32 · 15/08/2026',
      mapAlternative: noLocation
        ? 'Không vẽ marker giả; lộ trình dạng chữ vẫn được giữ.'
        : 'Điểm gần nhất: khu vực cầu Kênh Tẻ, đang đi về Thành phố Thủ Đức.',
    },
    history: [
      {
        id: 'history-requested',
        status: 'REQUESTED',
        label: 'Chờ tài xế',
        description: 'Đơn được tạo trong dữ liệu mô phỏng.',
        timestampLabel: '13:30 · 15/08/2026',
        dateTime: '2026-08-15T13:30:00+07:00',
        isCurrent: false,
      },
      {
        id: 'history-accepted',
        status: 'ACCEPTED',
        label: 'Đã nhận đơn',
        description: 'Tài xế An Mô Phỏng được phân công.',
        timestampLabel: '13:35 · 15/08/2026',
        dateTime: '2026-08-15T13:35:00+07:00',
        isCurrent: false,
      },
      {
        id: 'history-transit',
        status: 'IN_TRANSIT',
        label: 'Đang vận chuyển',
        description: 'Trạng thái hiện tại do nguồn dữ liệu cung cấp.',
        timestampLabel: '14:00 · 15/08/2026',
        dateTime: '2026-08-15T14:00:00+07:00',
        isCurrent: true,
      },
    ],
    payment: {
      status: 'UNPAID',
      amountLabel: '420.000 ₫',
      methodLabel: 'Chưa có phương thức thanh toán hoàn tất',
    },
    media: {
      state: mediaError ? 'error' : 'success',
      message: mediaError ? 'Không thể tải metadata media; các vùng khác vẫn khả dụng.' : null,
      items: mediaError
        ? []
        : [
            {
              id: 'media-proof-001',
              label: 'Ảnh xác nhận mô phỏng',
              mediaType: 'JPEG',
              capturedAtLabel: '14:30 · 15/08/2026',
              availability: 'available',
            },
          ],
    },
  };
}

function orderDetail(scenarioId: FleetPreviewScenarioId): FleetOrderDetailView {
  const staleTracking = scenarioId === 'fleet-order-detail-stale-tracking';
  const noLocation = scenarioId === 'fleet-order-detail-no-location';
  return {
    scenarioId,
    kind: 'order-detail',
    scope: scope(),
    order: orderDetailData(scenarioId),
    notice: staleTracking
      ? {
          tone: 'warning',
          title: 'Tracking cần kiểm tra',
          message: 'Vị trí gần nhất đã được nguồn dữ liệu đánh dấu là cũ.',
        }
      : noLocation
        ? {
            tone: 'warning',
            title: 'Chưa có vị trí hợp lệ',
            message: 'Không hiển thị marker giả; dùng lộ trình dạng chữ để tiếp tục theo dõi.',
          }
        : null,
  };
}

function resolveScenario(
  screen: FleetPreviewScreen,
  requestedScenario: string | null,
): FleetPreviewScenarioId {
  const scenario = requestedScenario ?? DEFAULT_SCENARIO[screen];
  if (SCENARIOS_BY_SCREEN[screen].includes(scenario as FleetPreviewScenarioId)) {
    return scenario as FleetPreviewScenarioId;
  }
  throw new TypeError(`Unsupported Fleet preview scenario: ${scenario}`);
}

export function createFleetPreviewView(
  screen: 'dashboard',
  requestedScenario: string | null,
): FleetDashboardRouteView;
export function createFleetPreviewView(
  screen: 'drivers',
  requestedScenario: string | null,
): FleetDriversRouteView;
export function createFleetPreviewView(
  screen: 'orders',
  requestedScenario: string | null,
): FleetOrdersRouteView;
export function createFleetPreviewView(
  screen: 'order-detail',
  requestedScenario: string | null,
): FleetOrderDetailRouteView;
export function createFleetPreviewView(
  screen: FleetPreviewScreen,
  requestedScenario: string | null,
): FleetRouteView;
export function createFleetPreviewView(
  screen: FleetPreviewScreen,
  requestedScenario: string | null,
): FleetRouteView {
  const scenarioId = resolveScenario(screen, requestedScenario);
  let view: FleetRouteView;

  if (scenarioId === 'fleet-scope-loading') {
    view = boundary(
      scenarioId,
      'scope-loading',
      'Đang xác nhận phạm vi đội xe',
      'Chưa hiển thị dữ liệu riêng tư trong khi kiểm tra membership.',
    );
  } else if (scenarioId === 'fleet-scope-denied' || scenarioId === 'fleet-order-foreign-denied') {
    view = boundary(
      scenarioId,
      'permission-denied',
      scenarioId === 'fleet-order-foreign-denied'
        ? 'Bạn không có quyền xem đơn này'
        : 'Bạn không có quyền xem đội xe này',
      'Không hiển thị hoặc xác nhận dữ liệu nằm ngoài phạm vi được cấp quyền.',
    );
  } else if (scenarioId === 'fleet-session-expired') {
    view = boundary(
      scenarioId,
      'session-expired',
      'Phiên làm việc đã hết hạn',
      'Dữ liệu riêng tư đã được ẩn. Vui lòng đăng nhập lại để tiếp tục.',
    );
  } else if (screen === 'dashboard') {
    view = dashboard(scenarioId);
  } else if (screen === 'drivers') {
    view = drivers(scenarioId);
  } else if (screen === 'orders') {
    view = orders(scenarioId);
  } else {
    view = orderDetail(scenarioId);
  }

  return deepFreeze(view);
}
