import type {
  CustomerActionView,
  CustomerCancelView,
  CustomerCreateFormScreenView,
  CustomerCreateView,
  CustomerDetailContentView,
  CustomerDetailView,
  CustomerEstimateView,
  CustomerListContentView,
  CustomerListView,
  CustomerOrderDetailDataView,
  CustomerOrderListItemView,
  CustomerPaymentView,
  CustomerTrackingView,
} from './model';

export const CUSTOMER_LIST_SCENARIOS = [
  'C-LIST-LOADING',
  'C-LIST-SUCCESS',
  'C-LIST-EMPTY',
  'C-LIST-NO-RESULTS',
  'C-LIST-ERROR',
  'C-LIST-REFRESHING',
  'C-LIST-PAGE-ERROR',
  'C-LIST-OFFLINE',
  'C-LIST-PERMISSION',
] as const;

export const CUSTOMER_CREATE_SCENARIOS = [
  'C-NEW-READY',
  'C-NEW-INVALID',
  'C-NEW-ADDRESS-LOADING',
  'C-NEW-ADDRESS-NO-RESULTS',
  'C-NEW-ADDRESS-ERROR',
  'C-NEW-ESTIMATE-LOADING',
  'C-NEW-ESTIMATE-ERROR',
  'C-NEW-ESTIMATE-READY',
  'C-NEW-ESTIMATE-DEMO',
  'C-NEW-ESTIMATE-OUTDATED',
  'C-NEW-ESTIMATE-EXPIRED',
  'C-NEW-MEDIA-INVALID',
  'C-NEW-MEDIA-RETRY',
  'C-NEW-SUBMIT-PENDING',
  'C-NEW-SUBMIT-ERROR',
  'C-NEW-SUBMIT-CONFLICT',
  'C-NEW-CREATED-MEDIA-ERROR',
  'C-NEW-SUCCESS',
  'C-NEW-OFFLINE',
  'C-NEW-PERMISSION',
] as const;

export const CUSTOMER_DETAIL_SCENARIOS = [
  'C-DETAIL-LOADING',
  'C-DETAIL-SUCCESS',
  'C-DETAIL-ERROR',
  'C-DETAIL-PERMISSION',
  'C-DETAIL-NO-DRIVER',
  'C-DETAIL-NO-LOCATION',
  'C-DETAIL-TRACKING-FRESH',
  'C-DETAIL-TRACKING-STALE',
  'C-DETAIL-TRACKING-RECONNECT',
  'C-DETAIL-TRACKING-DISCONNECTED',
  'C-DETAIL-MAP-ERROR',
  'C-DETAIL-PAYMENT-UNPAID',
  'C-DETAIL-PAYMENT-PENDING',
  'C-DETAIL-QR-READY',
  'C-DETAIL-QR-EXPIRED',
  'C-DETAIL-PAYMENT-PAID',
  'C-DETAIL-PAYMENT-FAILED',
  'C-DETAIL-PAYMENT-CONFLICT',
  'C-DETAIL-MEDIA-EMPTY',
  'C-DETAIL-MEDIA-ERROR',
  'C-DETAIL-CANCEL-AVAILABLE',
  'C-DETAIL-CANCEL-UNAVAILABLE',
  'C-DETAIL-CANCEL-PENDING',
  'C-DETAIL-CANCEL-ERROR',
  'C-DETAIL-CANCEL-CONFLICT',
  'C-DETAIL-CANCEL-SUCCESS',
  'C-DETAIL-OFFLINE',
] as const;

export type CustomerListScenarioId = (typeof CUSTOMER_LIST_SCENARIOS)[number];
export type CustomerCreateScenarioId = (typeof CUSTOMER_CREATE_SCENARIOS)[number];
export type CustomerDetailScenarioId = (typeof CUSTOMER_DETAIL_SCENARIOS)[number];

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function route() {
  return {
    origin: { id: 'pickup-vlxd', label: 'Kho Tổng VLXD Minh Khang, Tân Phú' },
    stops: [
      { id: 'stop-cm-1', label: 'Công trình Nhà phố 45, Quận 3' },
      { id: 'stop-cm-2', label: 'Đại lý phân phối gạch Catalan, Quận 10' },
      { id: 'stop-cm-3', label: 'Cửa hàng vật tư điện nước, Quận 4' },
    ],
    destination: {
      id: 'dropoff-nhabe',
      label: 'Công trình Biệt thự Kim Long, Nhà Bè',
    },
    distanceLabel: '14,8 km',
  } as const;
}

function listOrders(): CustomerOrderListItemView[] {
  return [
    {
      id: '11111111-1111-4111-8111-111111111001',
      reference: 'LP-260905-001',
      status: 'IN_TRANSIT',
      route: route(),
      etaLabel: '18 phút',
      priceLabel: '480.000 ₫',
      updatedAtLabel: '14:32 · 05/09/2026',
    },
    {
      id: '11111111-1111-4111-8111-111111111002',
      reference: 'LP-260905-002',
      status: 'REQUESTED',
      route: { ...route(), stops: [] },
      etaLabel: '25 phút',
      priceLabel: '350.000 ₫',
      updatedAtLabel: '13:05 · 05/09/2026',
    },
    {
      id: '11111111-1111-4111-8111-111111111003',
      reference: 'LP-260904-009',
      status: 'DELIVERED',
      route: { ...route(), stops: route().stops.slice(0, 1) },
      etaLabel: 'Đã hoàn tất',
      priceLabel: '420.000 ₫',
      updatedAtLabel: '17:48 · 04/09/2026',
    },
  ];
}

export function createCustomerListFixture(scenarioId: CustomerListScenarioId): CustomerListView {
  const boundaryCopy = {
    'C-LIST-LOADING': {
      kind: 'loading',
      title: 'Đang tải đơn hàng',
      message: 'Bố cục danh sách được giữ ổn định trong khi chờ dữ liệu.',
    },
    'C-LIST-EMPTY': {
      kind: 'empty',
      title: 'Bạn chưa có đơn hàng nào',
      message: 'Tạo đơn đầu tiên khi bạn đã sẵn sàng gửi hàng.',
    },
    'C-LIST-NO-RESULTS': {
      kind: 'no-results',
      title: 'Không có đơn khớp bộ lọc',
      message: 'Bộ lọc hiện tại: Đang vận chuyển.',
    },
    'C-LIST-ERROR': {
      kind: 'error',
      title: 'Không thể tải đơn hàng',
      message: 'Hãy thử lại. Mã yêu cầu: REQ-C-LIST-01.',
    },
    'C-LIST-PERMISSION': {
      kind: 'permission-denied',
      title: 'Bạn không có quyền xem danh sách đơn này',
      message: 'Hãy quay về khu vực Customer được cấp quyền.',
    },
  } as const;
  const boundary = boundaryCopy[scenarioId as keyof typeof boundaryCopy];
  if (boundary) return deepFreeze({ scenarioId, ...boundary });

  const contentByScenario = {
    'C-LIST-SUCCESS': { contentState: 'success', notice: null },
    'C-LIST-REFRESHING': {
      contentState: 'refreshing',
      notice: 'Đang làm mới danh sách; nội dung hiện tại vẫn được giữ.',
    },
    'C-LIST-PAGE-ERROR': {
      contentState: 'page-error',
      notice: 'Chưa tải được trang tiếp theo. Các đơn hiện có vẫn được giữ.',
    },
    'C-LIST-OFFLINE': {
      contentState: 'offline',
      notice: 'Đang ngoại tuyến · dữ liệu cập nhật lần cuối lúc 14:32.',
    },
  } as const;
  const content = contentByScenario[scenarioId as keyof typeof contentByScenario];
  const view: CustomerListContentView = {
    scenarioId,
    kind: 'content',
    contentState: content.contentState,
    notice: content.notice,
    orders: listOrders(),
    selectedFilter: 'ALL',
    resultLabel: '3 đơn hàng',
    canLoadMore: true,
    isLoadingMore: scenarioId === 'C-LIST-REFRESHING',
  };
  return deepFreeze(view);
}

function createForm(scenarioId: CustomerCreateScenarioId) {
  const empty = scenarioId === 'C-NEW-READY';
  const invalid = scenarioId === 'C-NEW-INVALID';
  return {
    pickup: empty ? '' : 'Kho Tổng VLXD Minh Khang - 182 Lê Trọng Tấn, Tân Phú',
    stops: [
      { id: 'draft-stop-1', value: 'Công trình Nhà phố 45 - 280 CMT8, Quận 3' },
      { id: 'draft-stop-2', value: 'Đại lý phân phối gạch Catalan, Quận 10' },
      { id: 'draft-stop-3', value: 'Cửa hàng vật tư điện nước, Quận 4' },
    ],
    dropoff: empty ? '' : 'Công trình Biệt thự Kim Long - Nguyễn Hữu Thọ, Nhà Bè',
    vehicleType: 'VAN' as const,
    cargoNote: '40 bao xi măng INSEE và 15 thùng gạch men Catalan; tài xế hỗ trợ bốc xếp.',
    cargoWeight: invalid ? '-2' : '120',
    fieldErrors: invalid
      ? {
          pickup: 'Điểm lấy hàng là bắt buộc.',
          cargoWeight: 'Khối lượng phải lớn hơn 0.',
        }
      : {},
  };
}

function estimateFor(scenarioId: CustomerCreateScenarioId): CustomerEstimateView {
  if (scenarioId === 'C-NEW-ESTIMATE-LOADING') return { kind: 'loading', source: 'VIETMAP' };
  if (scenarioId === 'C-NEW-ESTIMATE-ERROR') {
    return { kind: 'error', source: 'VIETMAP', message: 'Chưa thể tính giá và thời gian giao dự kiến.' };
  }
  if (scenarioId === 'C-NEW-ESTIMATE-OUTDATED') return { kind: 'outdated' };
  if (scenarioId === 'C-NEW-ESTIMATE-EXPIRED') return { kind: 'expired' };
  if (
    scenarioId === 'C-NEW-ESTIMATE-READY' ||
    scenarioId === 'C-NEW-ESTIMATE-DEMO' ||
    scenarioId === 'C-NEW-SUBMIT-PENDING' ||
    scenarioId === 'C-NEW-SUBMIT-ERROR' ||
    scenarioId === 'C-NEW-SUBMIT-CONFLICT' ||
    scenarioId === 'C-NEW-CREATED-MEDIA-ERROR' ||
    scenarioId === 'C-NEW-SUCCESS'
  ) {
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
  }
  return { kind: 'none' };
}

const createNotice: Readonly<Partial<Record<CustomerCreateScenarioId, string>>> = {
  'C-NEW-INVALID': 'Kiểm tra các trường được đánh dấu trước khi tiếp tục.',
  'C-NEW-ADDRESS-LOADING': 'Đang tìm địa điểm phù hợp.',
  'C-NEW-ADDRESS-NO-RESULTS': 'Không tìm thấy địa điểm phù hợp; nội dung đã nhập được giữ lại.',
  'C-NEW-ADDRESS-ERROR': 'Dịch vụ địa điểm chưa khả dụng; hãy thử tìm lại.',
  'C-NEW-ESTIMATE-LOADING': 'Đang tính giá và thời gian dự kiến.',
  'C-NEW-ESTIMATE-ERROR': 'Không thể tính estimate; dữ liệu form vẫn được giữ.',
  'C-NEW-ESTIMATE-OUTDATED': 'Lộ trình đã thay đổi; estimate cũ không còn dùng để tạo đơn.',
  'C-NEW-ESTIMATE-EXPIRED': 'Estimate đã hết hiệu lực theo phản hồi hệ thống.',
  'C-NEW-MEDIA-INVALID': 'Chỉ nhận JPEG, PNG hoặc WebP tối đa 10 MB.',
  'C-NEW-MEDIA-RETRY': 'Chưa tải được ảnh; tệp đã chọn vẫn được giữ để thử lại.',
  'C-NEW-SUBMIT-PENDING': 'Yêu cầu tạo đơn đang chờ phản hồi; không gửi lại.',
  'C-NEW-SUBMIT-ERROR': 'Chưa thể tạo đơn; bản nháp không nhạy cảm vẫn được giữ.',
  'C-NEW-SUBMIT-CONFLICT': 'Estimate đã thay đổi trên hệ thống; hãy tính lại trước khi tạo đơn.',
  'C-NEW-CREATED-MEDIA-ERROR':
    'Đơn đã được phản hồi nhưng ảnh hàng hóa chưa tải lên; không tạo lại đơn.',
  'C-NEW-SUCCESS': 'Đơn hàng đã được tạo thành công trên hệ thống.',
  'C-NEW-OFFLINE': 'Đang ngoại tuyến; chưa thể tính estimate hoặc tạo đơn.',
};

function createPhase(scenarioId: CustomerCreateScenarioId): CustomerCreateFormScreenView['phase'] {
  const phases: Record<
    Exclude<CustomerCreateScenarioId, 'C-NEW-PERMISSION'>,
    CustomerCreateFormScreenView['phase']
  > = {
    'C-NEW-READY': 'ready',
    'C-NEW-INVALID': 'invalid',
    'C-NEW-ADDRESS-LOADING': 'address-loading',
    'C-NEW-ADDRESS-NO-RESULTS': 'address-no-results',
    'C-NEW-ADDRESS-ERROR': 'address-error',
    'C-NEW-ESTIMATE-LOADING': 'estimate-loading',
    'C-NEW-ESTIMATE-ERROR': 'estimate-error',
    'C-NEW-ESTIMATE-READY': 'estimate-ready',
    'C-NEW-ESTIMATE-DEMO': 'estimate-ready',
    'C-NEW-ESTIMATE-OUTDATED': 'estimate-outdated',
    'C-NEW-ESTIMATE-EXPIRED': 'estimate-expired',
    'C-NEW-MEDIA-INVALID': 'media-invalid',
    'C-NEW-MEDIA-RETRY': 'media-retry',
    'C-NEW-SUBMIT-PENDING': 'submit-pending',
    'C-NEW-SUBMIT-ERROR': 'submit-error',
    'C-NEW-SUBMIT-CONFLICT': 'submit-conflict',
    'C-NEW-CREATED-MEDIA-ERROR': 'created-media-error',
    'C-NEW-SUCCESS': 'success',
    'C-NEW-OFFLINE': 'offline',
  };
  return phases[scenarioId as Exclude<CustomerCreateScenarioId, 'C-NEW-PERMISSION'>];
}

function createPrimaryAction(
  scenarioId: Exclude<CustomerCreateScenarioId, 'C-NEW-PERMISSION'>,
  estimate: CustomerEstimateView,
): CustomerActionView {
  if (scenarioId === 'C-NEW-SUCCESS') {
    return {
      id: 'view-created-order',
      label: 'Xem chi tiết đơn',
      emphasis: 'primary',
    };
  }
  if (scenarioId === 'C-NEW-CREATED-MEDIA-ERROR') {
    return {
      id: 'retry-cargo-media',
      label: 'Thử tải lại ảnh',
      emphasis: 'primary',
    };
  }
  if (scenarioId === 'C-NEW-SUBMIT-CONFLICT') {
    return {
      id: 'refresh-estimate',
      label: 'Tính lại cước phí và thời gian giao',
      emphasis: 'primary',
    };
  }
  const submitting = scenarioId === 'C-NEW-SUBMIT-PENDING';
  const canCreate = estimate.kind === 'ready';
  const label = canCreate ? 'Tạo đơn' : 'Tính cước phí và thời gian giao';
  const disabled = scenarioId === 'C-NEW-READY' || scenarioId === 'C-NEW-OFFLINE';
  return {
    id: canCreate ? 'create-order' : 'estimate-order',
    label,
    emphasis: 'primary',
    disabled,
    disabledReason: disabled
      ? scenarioId === 'C-NEW-OFFLINE'
        ? 'Cần kết nối mạng để tiếp tục'
        : 'Nhập điểm lấy và điểm giao để tiếp tục'
      : undefined,
    isPending: submitting,
    pendingLabel: submitting ? 'Đang tạo đơn' : undefined,
  };
}

export function createCustomerCreateFixture(
  scenarioId: CustomerCreateScenarioId,
): CustomerCreateView {
  if (scenarioId === 'C-NEW-PERMISSION') {
    return deepFreeze({
      scenarioId,
      kind: 'permission-denied',
      title: 'Bạn không có quyền tạo đơn',
      message: 'Bản nháp riêng tư không được hiển thị cho role hiện tại.',
    });
  }
  const estimate = estimateFor(scenarioId);
  const view: CustomerCreateFormScreenView = {
    scenarioId,
    kind: 'form',
    phase: createPhase(scenarioId),
    form: createForm(scenarioId),
    estimate,
    notice: createNotice[scenarioId] ?? null,
    actions: [createPrimaryAction(scenarioId, estimate)],
  };
  return deepFreeze(view);
}

function defaultTracking(): CustomerTrackingView {
  return {
    kind: 'fresh',
    driverLabel: 'Tài xế Trần Đình Trọng',
    lastUpdatedLabel: '14:32 · 05/09/2026',
    summary: 'Bản đồ lộ trình; vị trí tài xế cập nhật lúc 14:32.',
  };
}

function trackingFor(scenarioId: CustomerDetailScenarioId): CustomerTrackingView {
  switch (scenarioId) {
    case 'C-DETAIL-LOADING':
      return { kind: 'loading', message: 'Đang tải bản đồ và vị trí tài xế.' };
    case 'C-DETAIL-NO-DRIVER':
    case 'C-DETAIL-CANCEL-AVAILABLE':
    case 'C-DETAIL-CANCEL-PENDING':
    case 'C-DETAIL-CANCEL-ERROR':
      return { kind: 'no-driver', message: 'Chưa có tài xế nhận đơn.' };
    case 'C-DETAIL-NO-LOCATION':
      return {
        kind: 'no-location',
        driverLabel: 'Tài xế Trần Đình Trọng',
        message: 'Chưa có vị trí tài xế.',
      };
    case 'C-DETAIL-TRACKING-STALE':
      return {
        kind: 'stale',
        driverLabel: 'Tài xế Trần Đình Trọng',
        lastUpdatedLabel: '14:12 · 05/09/2026',
        message: 'Vị trí chưa cập nhật; đang hiển thị điểm gần nhất.',
        summary: 'Bản đồ lộ trình với vị trí gần nhất lúc 14:12.',
      };
    case 'C-DETAIL-TRACKING-RECONNECT':
      return {
        kind: 'reconnecting',
        driverLabel: 'Tài xế Trần Đình Trọng',
        lastUpdatedLabel: '14:27 · 05/09/2026',
        message: 'Đang kết nối lại với thiết bị tài xế.',
        summary: 'Bản đồ lộ trình đang kết nối lại.',
      };
    case 'C-DETAIL-TRACKING-DISCONNECTED':
    case 'C-DETAIL-OFFLINE':
      return {
        kind: 'disconnected',
        driverLabel: 'Tài xế Trần Đình Trọng',
        lastUpdatedLabel: '14:20 · 05/09/2026',
        message: 'Mất kết nối; vị trí mới chưa được nhận.',
        summary: 'Bản đồ lộ trình dùng vị trí gần nhất lúc 14:20.',
      };
    case 'C-DETAIL-MAP-ERROR':
      return {
        kind: 'map-error',
        driverLabel: 'Tài xế Trần Đình Trọng',
        message: 'Bản đồ chưa khả dụng; lộ trình dạng danh sách vẫn dùng được.',
      };
    default:
      return defaultTracking();
  }
}

function paymentFor(scenarioId: CustomerDetailScenarioId): CustomerPaymentView {
  const base = {
    status: 'UNPAID' as const,
    amountLabel: '480.000 ₫',
    sourceLabel: 'Chuyển khoản VietQR',
    qrState: 'none' as const,
    notice: null,
    action: null,
  };
  switch (scenarioId) {
    case 'C-DETAIL-PAYMENT-UNPAID':
      return {
        ...base,
        action: { id: 'create-payment', label: 'Tạo mã QR thanh toán', emphasis: 'primary' },
      };
    case 'C-DETAIL-PAYMENT-PENDING':
      return {
        ...base,
        notice: 'Đang tạo mã QR; không gửi yêu cầu trùng.',
        action: {
          id: 'create-payment',
          label: 'Tạo mã QR thanh toán',
          emphasis: 'primary',
          isPending: true,
          pendingLabel: 'Đang tạo mã QR',
        },
      };
    case 'C-DETAIL-QR-READY':
      return {
        ...base,
        status: 'QR_CREATED',
        referenceLabel: 'LP260905001',
        expiresAtLabel: '15:00 · 05/09/2026',
        qrState: 'ready',
        qrPayload: '00020101021238540010A00000072701260006970422011209876543210208QRIBFTTA52045999530370454064800005802VN62150811LP2609050016304E8A2',
        notice: 'Vui lòng quét mã VietQR bằng ứng dụng ngân hàng để hoàn tất thanh toán.',
      };
    case 'C-DETAIL-QR-EXPIRED':
      return {
        ...base,
        status: 'QR_CREATED',
        referenceLabel: 'LP260905001-EXP',
        expiresAtLabel: 'Đã hết hạn theo phản hồi hệ thống',
        qrState: 'expired',
        notice: 'Mã QR đã hết hạn. Vui lòng tạo mã QR mới để thanh toán.',
        action: { id: 'refresh-payment', label: 'Tạo mã QR mới', emphasis: 'secondary' },
      };
    case 'C-DETAIL-PAYMENT-PAID':
      return {
        ...base,
        status: 'PAID_MANUAL',
        sourceLabel: 'MB Bank · Chuyển khoản VietQR',
        notice: 'Thanh toán thành công. Đã xuất hóa đơn điện tử cho đơn hàng.',
      };
    case 'C-DETAIL-PAYMENT-FAILED':
      return {
        ...base,
        status: 'FAILED',
        notice: 'Giao dịch chưa thành công hoặc quá hạn. Vui lòng thử tạo lại mã QR.',
        action: { id: 'retry-payment', label: 'Thử tạo lại mã QR', emphasis: 'secondary' },
      };
    case 'C-DETAIL-PAYMENT-CONFLICT':
      return {
        ...base,
        status: 'QR_CREATED',
        referenceLabel: 'LP260905001',
        expiresAtLabel: '15:10 · 05/09/2026',
        qrState: 'ready',
        qrPayload: '00020101021238540010A00000072701260006970422011209876543210208QRIBFTTA52045999530370454064800005802VN62150811LP2609050016304E8A2',
        notice: 'Đang có một mã QR thanh toán còn hiệu lực cho đơn hàng này.',
      };
    default:
      return base;
  }
}

function cancelFor(scenarioId: CustomerDetailScenarioId): CustomerCancelView {
  switch (scenarioId) {
    case 'C-DETAIL-CANCEL-AVAILABLE':
      return {
        kind: 'available',
        message: 'Hủy đơn sẽ dừng yêu cầu tìm tài xế.',
        action: { id: 'cancel-order', label: 'Hủy đơn', emphasis: 'destructive' },
      };
    case 'C-DETAIL-CANCEL-PENDING':
      return {
        kind: 'pending',
        message: 'Đang gửi yêu cầu hủy; không gửi lại.',
        action: {
          id: 'cancel-order',
          label: 'Hủy đơn',
          emphasis: 'destructive',
          isPending: true,
          pendingLabel: 'Đang hủy đơn',
        },
      };
    case 'C-DETAIL-CANCEL-ERROR':
      return {
        kind: 'error',
        message: 'Chưa thể hủy đơn; trạng thái hiện tại vẫn được giữ.',
        action: { id: 'cancel-order', label: 'Thử hủy lại', emphasis: 'destructive' },
      };
    case 'C-DETAIL-CANCEL-CONFLICT':
      return {
        kind: 'conflict',
        message: 'Trạng thái đơn đã thay đổi; hãy tải dữ liệu mới nhất.',
        action: { id: 'refresh-order', label: 'Tải dữ liệu mới nhất', emphasis: 'secondary' },
      };
    case 'C-DETAIL-CANCEL-UNAVAILABLE':
    case 'C-DETAIL-SUCCESS':
      return {
        kind: 'unavailable',
        reason: 'Đơn đã có tài xế; quyền hủy không được hệ thống cung cấp.',
      };
    default:
      return { kind: 'hidden' };
  }
}

function detailOrder(scenarioId: CustomerDetailScenarioId): CustomerOrderDetailDataView {
  const mediaKind =
    scenarioId === 'C-DETAIL-MEDIA-EMPTY'
      ? 'empty'
      : scenarioId === 'C-DETAIL-MEDIA-ERROR'
        ? 'error'
        : 'available';
  return {
    id: '11111111-1111-4111-8111-111111111001',
    reference: 'LP-260905-001',
    status:
      scenarioId === 'C-DETAIL-CANCEL-SUCCESS'
        ? 'CANCELLED'
        : scenarioId === 'C-DETAIL-CANCEL-AVAILABLE' ||
            scenarioId === 'C-DETAIL-CANCEL-PENDING' ||
            scenarioId === 'C-DETAIL-CANCEL-ERROR'
          ? 'REQUESTED'
          : scenarioId === 'C-DETAIL-CANCEL-CONFLICT'
            ? 'ACCEPTED'
            : 'IN_TRANSIT',
    route: route(),
    priceLabel: '480.000 ₫',
    etaDurationSeconds: 1620,
    etaSource: 'DEMO',
    updatedAtLabel: '14:32 · 05/09/2026',
    distanceMeters: 14800,
    cargo: { note: '40 bao xi măng INSEE & 15 hộp gạch Catalan', weightKg: 2100 },
    tracking: trackingFor(scenarioId),
    payment: paymentFor(scenarioId),
    invoice: null,
    media: {
      kind: mediaKind,
      label: 'Ảnh hàng hóa',
      description:
        mediaKind === 'empty'
          ? 'Chưa có ảnh hàng hóa.'
          : mediaKind === 'error'
            ? 'Chưa tải được ảnh; vui lòng kiểm tra kết nối mạng.'
            : '2 ảnh chụp biên nhận lúc nhận hàng · JPEG.',
    },
    history: [
      {
        id: 'history-requested',
        status: 'REQUESTED',
        timestampLabel: '13:45',
        description: 'Đơn đã tạo và sẵn sàng điều phối.',
      },
      {
        id: 'history-accepted',
        status: 'ACCEPTED',
        timestampLabel: '13:52',
        description: 'Tài xế Nguyễn Văn Hùng (59C-882.14) đã nhận đơn.',
      },
      {
        id: 'history-transit',
        status: 'IN_TRANSIT',
        timestampLabel: '14:15',
        description: 'Tài xế đã nhận hàng và đang trên đường giao.',
      },
    ],
  };
}

const detailNotice: Readonly<Partial<Record<CustomerDetailScenarioId, string>>> = {
  'C-DETAIL-NO-DRIVER': 'Chưa có tài xế nhận đơn.',
  'C-DETAIL-NO-LOCATION': 'Tài xế đã nhận đơn nhưng chưa có vị trí.',
  'C-DETAIL-TRACKING-STALE': 'Vị trí chưa cập nhật; đang hiển thị điểm gần nhất.',
  'C-DETAIL-TRACKING-RECONNECT': 'Đang kết nối lại với nguồn tracking.',
  'C-DETAIL-TRACKING-DISCONNECTED': 'Mất kết nối; vị trí mới chưa được nhận.',
  'C-DETAIL-MAP-ERROR': 'Bản đồ chưa khả dụng; Route Spine vẫn là nguồn thay thế.',
  'C-DETAIL-CANCEL-SUCCESS': 'Đã nhận snapshot phản hồi với trạng thái Đã hủy.',
  'C-DETAIL-OFFLINE': 'Đang ngoại tuyến · dữ liệu cập nhật lần cuối lúc 14:32.',
};

export function createCustomerDetailFixture(
  scenarioId: CustomerDetailScenarioId,
): CustomerDetailView {
  if (scenarioId === 'C-DETAIL-LOADING') {
    return deepFreeze({
      scenarioId,
      kind: 'loading',
      title: 'Đang tải chi tiết đơn',
      message: 'Không hiển thị dữ liệu riêng tư giả trong lúc chờ.',
    });
  }
  if (scenarioId === 'C-DETAIL-ERROR') {
    return deepFreeze({
      scenarioId,
      kind: 'error',
      title: 'Không thể tải chi tiết đơn',
      message: 'Hãy thử lại. Mã yêu cầu: REQ-C-DETAIL-01.',
    });
  }
  if (scenarioId === 'C-DETAIL-PERMISSION') {
    return deepFreeze({
      scenarioId,
      kind: 'permission-denied',
      title: 'Bạn không có quyền xem đơn hàng này',
      message: 'Không hiển thị route, tài xế, tracking, media hoặc payment của đơn khác.',
    });
  }
  const cancel = cancelFor(scenarioId);
  const actions: CustomerActionView[] = [];
  const view: CustomerDetailContentView = {
    scenarioId,
    kind: 'content',
    notice: detailNotice[scenarioId] ?? null,
    order: detailOrder(scenarioId),
    cancel,
    actions,
  };
  return deepFreeze(view);
}
