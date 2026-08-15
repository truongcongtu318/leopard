import type {
  DriverActiveTripView,
  DriverAssignedDetailView,
  DriverAvailabilityView,
  DriverCommandView,
  DriverConflictView,
  DriverDetailView,
  DriverListContentView,
  DriverListView,
  DriverPrimaryTaskView,
  DriverProofView,
  DriverPublicDetailView,
  DriverPublicOrderView,
  DriverTrackingView,
} from './model';

export const DRIVER_LIST_SCENARIOS = [
  'D-LIST-LOADING',
  'D-LIST-REQUESTED',
  'D-LIST-ACTIVE-REQUESTED',
  'D-LIST-EMPTY',
  'D-LIST-ERROR',
  'D-LIST-PERMISSION',
  'D-LIST-OFFLINE',
  'D-LIST-LOCATION-DENIED',
  'D-LIST-AVAILABILITY-PENDING',
  'D-LIST-AVAILABILITY-ERROR',
] as const;

export const DRIVER_DETAIL_SCENARIOS = [
  'D-DETAIL-LOADING',
  'D-DETAIL-ERROR',
  'D-DETAIL-PERMISSION',
  'D-DETAIL-PUBLIC-REQUESTED',
  'D-DETAIL-ACCEPT-PENDING',
  'D-DETAIL-ACCEPT-RACE',
  'D-DETAIL-ACTIVE-ORDER-CONFLICT',
  'D-DETAIL-ACCEPTED',
  'D-DETAIL-PICKING-UP',
  'D-DETAIL-IN-TRANSIT',
  'D-DETAIL-PROOF-REQUIRED',
  'D-DETAIL-PROOF-SELECTED',
  'D-DETAIL-PROOF-UPLOADING',
  'D-DETAIL-PROOF-RETRY',
  'D-DETAIL-READY-DELIVER',
  'D-DETAIL-TERMINAL-DELIVERED',
  'D-DETAIL-TERMINAL-CANCELLED',
  'D-DETAIL-TRACKING-STALE',
  'D-DETAIL-RECONNECTING',
  'D-DETAIL-LOCATION-DENIED',
  'D-DETAIL-OFFLINE',
  'D-DETAIL-INVALID-TRANSITION',
] as const;

export type DriverListScenarioId = (typeof DRIVER_LIST_SCENARIOS)[number];
export type DriverDetailScenarioId = (typeof DRIVER_DETAIL_SCENARIOS)[number];

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function assignedRoute() {
  return {
    origin: { id: 'driver-pickup', label: 'Kho riêng tư mô phỏng tại Quận 7' },
    stops: [
      { id: 'driver-stop-1', label: 'Điểm dừng mô phỏng tại Quận 4' },
      { id: 'driver-stop-2', label: 'Điểm dừng mô phỏng tại Quận 3' },
      { id: 'driver-stop-3', label: 'Điểm dừng mô phỏng tại Quận 1' },
    ],
    destination: {
      id: 'driver-dropoff',
      label: 'Điểm giao riêng tư mô phỏng tại Thành phố Thủ Đức',
    },
    distanceLabel: '18,4 km',
    etaDurationSeconds: 1080,
    etaSource: 'DEMO' as const,
  };
}

function requestedOrders(): DriverPublicOrderView[] {
  return [
    {
      id: '22222222-2222-4222-8222-222222222101',
      reference: 'LP-D-260815-101',
      status: 'REQUESTED',
      publicRouteLabel: 'Khu vực Quận 7 → Thành phố Thủ Đức',
      vehicleLabel: 'Xe van',
      cargoSummary: 'Hàng đóng thùng · khoảng 120 kg',
      etaLabel: 'ETA dự kiến · 18 phút · Dữ liệu mô phỏng',
      updatedAtLabel: '14:30 · 15/08/2026',
    },
    {
      id: '22222222-2222-4222-8222-222222222102',
      reference: 'LP-D-260815-102',
      status: 'REQUESTED',
      publicRouteLabel: 'Khu vực Bình Thạnh → Quận 3',
      vehicleLabel: 'Xe máy',
      cargoSummary: 'Bưu kiện nhỏ · khoảng 8 kg',
      etaLabel: 'ETA dự kiến · 14 phút',
      updatedAtLabel: '14:28 · 15/08/2026',
    },
  ];
}

function activeTrip(proofRequired = false): DriverActiveTripView {
  return {
    id: '22222222-2222-4222-8222-222222222001',
    reference: 'LP-D-260815-001',
    status: 'IN_TRANSIT',
    route: assignedRoute(),
    trackingLabel: 'Đang gửi vị trí · cập nhật lúc 14:32',
    proofLabel: proofRequired ? 'Cần ảnh xác nhận trước khi hoàn tất' : null,
  };
}

function availabilityFor(scenarioId: DriverListScenarioId): DriverAvailabilityView {
  if (scenarioId === 'D-LIST-ACTIVE-REQUESTED') {
    return {
      status: 'BUSY',
      action: {
        id: 'availability-busy',
        label: 'Đang bận',
        target: 'BUSY',
        disabled: true,
        disabledReason: 'Bạn đang có chuyến hoạt động',
      },
      error: null,
    };
  }
  const pending = scenarioId === 'D-LIST-AVAILABILITY-PENDING';
  const blocked = scenarioId === 'D-LIST-OFFLINE';
  const currentStatus = scenarioId === 'D-LIST-EMPTY' ? 'OFFLINE' : 'AVAILABLE';
  return {
    status: currentStatus,
    action: {
      id: 'set-availability-demo',
      label: currentStatus === 'OFFLINE' ? 'Bật sẵn sàng' : 'Tạm dừng nhận đơn',
      target: currentStatus === 'OFFLINE' ? 'AVAILABLE' : 'OFFLINE',
      isPending: pending,
      disabled: blocked,
      disabledReason: blocked ? 'Cần kết nối mạng để cập nhật' : undefined,
    },
    error:
      scenarioId === 'D-LIST-AVAILABILITY-ERROR'
        ? 'Chưa cập nhật được trạng thái nhận đơn; trạng thái đã lưu vẫn là Sẵn sàng.'
        : null,
  };
}

export function createDriverListFixture(scenarioId: DriverListScenarioId): DriverListView {
  if (scenarioId === 'D-LIST-LOADING') {
    return deepFreeze({
      scenarioId,
      kind: 'loading',
      title: 'Đang tải dữ liệu chuyến',
      message: 'Availability và danh sách giữ bố cục trong khi chờ.',
    });
  }
  if (scenarioId === 'D-LIST-ERROR') {
    return deepFreeze({
      scenarioId,
      kind: 'error',
      title: 'Không thể tải danh sách đơn',
      message: 'Hãy thử lại. Mã yêu cầu mô phỏng: REQ-D-LIST-01.',
    });
  }
  if (scenarioId === 'D-LIST-PERMISSION') {
    return deepFreeze({
      scenarioId,
      kind: 'permission-denied',
      title: 'Bạn không có quyền xem khu vực tài xế',
      message: 'Không hiển thị chuyến hoặc đơn có thể nhận cho role hiện tại.',
    });
  }
  const noticeByScenario = {
    'D-LIST-OFFLINE': {
      tone: 'warning',
      message: 'Kết nối mạng: Ngoại tuyến · dữ liệu có thể đã cũ.',
      actionLabel: 'Thử kết nối lại',
    },
    'D-LIST-LOCATION-DENIED': {
      tone: 'danger',
      message: 'Chưa được phép dùng vị trí cho hành trình của chuyến.',
      actionLabel: 'Mở cài đặt vị trí',
    },
    'D-LIST-AVAILABILITY-PENDING': {
      tone: 'info',
      message: 'Đang cập nhật trạng thái nhận đơn.',
    },
    'D-LIST-AVAILABILITY-ERROR': {
      tone: 'danger',
      message: 'Cập nhật availability thất bại; không đảo trạng thái cục bộ.',
      actionLabel: 'Thử cập nhật lại',
    },
  } as const;
  const view: DriverListContentView = {
    scenarioId,
    kind: 'content',
    availability: availabilityFor(scenarioId),
    activeTrip: scenarioId === 'D-LIST-ACTIVE-REQUESTED' ? activeTrip(true) : null,
    requestedOrders: scenarioId === 'D-LIST-EMPTY' ? [] : requestedOrders(),
    notice:
      scenarioId === 'D-LIST-EMPTY'
        ? {
            tone: 'info',
            message: 'Hiện chưa có đơn có thể nhận; trạng thái nhận đơn vẫn được giữ.',
          }
        : (noticeByScenario[scenarioId as keyof typeof noticeByScenario] ?? null),
    refreshedAtLabel: '14:32 · 15/08/2026',
    isEmpty: scenarioId === 'D-LIST-EMPTY',
  };
  return deepFreeze(view);
}

function trackingFor(scenarioId: DriverDetailScenarioId): DriverTrackingView {
  switch (scenarioId) {
    case 'D-DETAIL-TRACKING-STALE':
      return {
        kind: 'stale',
        label: 'Vị trí chưa cập nhật',
        lastUpdatedLabel: '14:27 · 15/08/2026',
        queuedPointCount: null,
      };
    case 'D-DETAIL-RECONNECTING':
      return {
        kind: 'reconnecting',
        label: 'Đang kết nối lại',
        lastUpdatedLabel: '14:27 · 15/08/2026',
        queuedPointCount: null,
      };
    case 'D-DETAIL-LOCATION-DENIED':
      return {
        kind: 'permission-denied',
        label: 'Chưa được phép dùng vị trí',
        lastUpdatedLabel: '14:20 · 15/08/2026',
        queuedPointCount: null,
      };
    case 'D-DETAIL-OFFLINE':
      return {
        kind: 'offline',
        label: 'Mất kết nối · vị trí mới chưa gửi',
        lastUpdatedLabel: '14:20 · 15/08/2026',
        queuedPointCount: 3,
      };
    case 'D-DETAIL-ACCEPTED':
      return {
        kind: 'not-started',
        label: 'Chưa bắt đầu gửi vị trí',
        lastUpdatedLabel: null,
        queuedPointCount: null,
      };
    case 'D-DETAIL-TERMINAL-DELIVERED':
    case 'D-DETAIL-TERMINAL-CANCELLED':
      return {
        kind: 'unavailable',
        label: 'Tracking của chuyến đã kết thúc',
        lastUpdatedLabel: '14:32 · 15/08/2026',
        queuedPointCount: null,
      };
    default:
      return {
        kind: 'healthy',
        label: 'Đang gửi vị trí',
        lastUpdatedLabel: '14:32 · 15/08/2026',
        queuedPointCount: null,
      };
  }
}

function proofFor(scenarioId: DriverDetailScenarioId): DriverProofView {
  const proofByScenario: Readonly<Partial<Record<DriverDetailScenarioId, DriverProofView>>> = {
    'D-DETAIL-IN-TRANSIT': {
      kind: 'required',
      label: 'Cần ảnh xác nhận trước khi hoàn tất',
      message: 'Thêm một ảnh JPEG, PNG hoặc WebP tối đa 10 MB.',
      fileLabel: null,
    },
    'D-DETAIL-PROOF-REQUIRED': {
      kind: 'required',
      label: 'Cần ảnh xác nhận trước khi hoàn tất',
      message: 'Thêm một ảnh JPEG, PNG hoặc WebP tối đa 10 MB.',
      fileLabel: null,
    },
    'D-DETAIL-PROOF-SELECTED': {
      kind: 'selected-local',
      label: 'Ảnh đã chọn · chưa tải lên',
      message: 'Ảnh chỉ nằm trên thiết bị cho đến khi port xác nhận upload.',
      fileLabel: 'xac-nhan-demo.jpg',
    },
    'D-DETAIL-PROOF-UPLOADING': {
      kind: 'uploading',
      label: 'Đang tải ảnh xác nhận',
      message: 'Không gửi upload trùng trong khi chờ phản hồi.',
      fileLabel: 'xac-nhan-demo.jpg',
    },
    'D-DETAIL-PROOF-RETRY': {
      kind: 'upload-retry',
      label: 'Chưa tải được ảnh',
      message: 'Ảnh đã chọn vẫn được giữ; hãy thử lại.',
      fileLabel: 'xac-nhan-demo.jpg',
    },
    'D-DETAIL-READY-DELIVER': {
      kind: 'persisted',
      label: 'Ảnh xác nhận đã tải lên',
      message: 'Proof đã có trong snapshot phản hồi từ hệ thống.',
      fileLabel: 'proof-demo-001.jpg',
    },
    'D-DETAIL-TERMINAL-DELIVERED': {
      kind: 'persisted',
      label: 'Ảnh xác nhận đã tải lên',
      message: 'Proof read-only từ snapshot đã hoàn tất.',
      fileLabel: 'proof-demo-001.jpg',
    },
  };
  return (
    proofByScenario[scenarioId] ?? {
      kind: 'empty',
      label: 'Chưa có ảnh xác nhận',
      message: 'Proof chưa được yêu cầu ở task hiện tại.',
      fileLabel: null,
    }
  );
}

function command(
  id: string,
  label: string,
  targetStatus?: DriverCommandView['targetStatus'],
  pending = false,
): DriverCommandView {
  return {
    id,
    label,
    targetStatus,
    isPending: pending,
    pendingLabel: pending
      ? id === 'cmd-accept-demo'
        ? 'Đang nhận đơn'
        : id.includes('proof')
          ? 'Đang tải ảnh xác nhận'
          : 'Đang cập nhật trạng thái'
      : undefined,
  };
}

function taskFor(scenarioId: DriverDetailScenarioId): Readonly<{
  primaryTask: DriverPrimaryTaskView;
  offeredLifecycleCommand: DriverCommandView | null;
}> {
  if (scenarioId === 'D-DETAIL-PUBLIC-REQUESTED' || scenarioId === 'D-DETAIL-ACCEPT-PENDING') {
    const offered = command(
      'cmd-accept-demo',
      'Nhận đơn',
      'ACCEPTED',
      scenarioId === 'D-DETAIL-ACCEPT-PENDING',
    );
    return { primaryTask: { kind: 'accept', command: offered }, offeredLifecycleCommand: offered };
  }
  if (scenarioId === 'D-DETAIL-ACCEPTED') {
    const offered = command('cmd-pickup-demo', 'Bắt đầu đi lấy hàng', 'PICKING_UP');
    return {
      primaryTask: { kind: 'advance-lifecycle', command: offered },
      offeredLifecycleCommand: offered,
    };
  }
  if (scenarioId === 'D-DETAIL-PICKING-UP') {
    const offered = command('cmd-transit-demo', 'Đã lấy hàng — bắt đầu giao', 'IN_TRANSIT');
    return {
      primaryTask: { kind: 'advance-lifecycle', command: offered },
      offeredLifecycleCommand: offered,
    };
  }
  if (scenarioId === 'D-DETAIL-READY-DELIVER') {
    const offered = command('cmd-deliver-demo', 'Xác nhận đã giao', 'DELIVERED');
    return {
      primaryTask: { kind: 'advance-lifecycle', command: offered },
      offeredLifecycleCommand: offered,
    };
  }
  if (
    scenarioId === 'D-DETAIL-IN-TRANSIT' ||
    scenarioId === 'D-DETAIL-PROOF-REQUIRED' ||
    scenarioId === 'D-DETAIL-PROOF-SELECTED' ||
    scenarioId === 'D-DETAIL-PROOF-UPLOADING' ||
    scenarioId === 'D-DETAIL-PROOF-RETRY'
  ) {
    const pending = scenarioId === 'D-DETAIL-PROOF-UPLOADING';
    return {
      primaryTask: {
        kind: 'upload-proof',
        command: command(
          scenarioId === 'D-DETAIL-PROOF-RETRY' ? 'cmd-retry-proof-demo' : 'cmd-select-proof-demo',
          scenarioId === 'D-DETAIL-PROOF-RETRY' ? 'Thử tải lại ảnh' : 'Thêm ảnh xác nhận giao hàng',
          undefined,
          pending,
        ),
      },
      offeredLifecycleCommand: null,
    };
  }
  return { primaryTask: null, offeredLifecycleCommand: null };
}

function publicDetail(scenarioId: DriverDetailScenarioId): DriverPublicDetailView {
  const task = taskFor(scenarioId);
  return {
    scenarioId,
    kind: 'content',
    accessScope: 'PUBLIC_SUMMARY',
    order: requestedOrders()[0],
    tracking: {
      kind: 'not-started',
      label: 'Tracking chỉ bắt đầu sau khi được phân công',
      lastUpdatedLabel: null,
      queuedPointCount: null,
    },
    proof: proofFor(scenarioId),
    ...task,
    notice: null,
  };
}

function statusFor(
  scenarioId: DriverDetailScenarioId,
): DriverAssignedDetailView['order']['status'] {
  if (scenarioId === 'D-DETAIL-ACCEPTED') return 'ACCEPTED';
  if (scenarioId === 'D-DETAIL-PICKING-UP') return 'PICKING_UP';
  if (scenarioId === 'D-DETAIL-TERMINAL-DELIVERED') return 'DELIVERED';
  if (scenarioId === 'D-DETAIL-TERMINAL-CANCELLED') return 'CANCELLED';
  return 'IN_TRANSIT';
}

function assignedDetail(scenarioId: DriverDetailScenarioId): DriverAssignedDetailView {
  const task = taskFor(scenarioId);
  const tracking = trackingFor(scenarioId);
  return {
    scenarioId,
    kind: 'content',
    accessScope: 'ASSIGNED_FULL',
    order: {
      id: '22222222-2222-4222-8222-222222222001',
      reference: 'LP-D-260815-001',
      status: statusFor(scenarioId),
      route: assignedRoute(),
      vehicleLabel: 'Xe van',
      cargoSummary: 'Hàng đóng thùng dễ vỡ · khoảng 120 kg',
      customerContact: 'Số điện thoại khách hàng mô phỏng · chỉ hiện sau phân công',
      updatedAtLabel: '14:32 · 15/08/2026',
      history: [
        {
          id: 'driver-history-requested',
          status: 'REQUESTED',
          timestampLabel: '13:58',
          description: 'Đơn đã được ghi nhận.',
        },
        {
          id: 'driver-history-accepted',
          status: 'ACCEPTED',
          timestampLabel: '14:05',
          description: 'Bạn đã nhận chuyến.',
        },
        {
          id: 'driver-history-transit',
          status: 'IN_TRANSIT',
          timestampLabel: '14:24',
          description: 'Hàng đang được vận chuyển.',
        },
      ],
    },
    tracking,
    proof: proofFor(scenarioId),
    ...task,
    notice:
      tracking.kind === 'stale' ||
      tracking.kind === 'offline' ||
      tracking.kind === 'reconnecting' ||
      tracking.kind === 'permission-denied'
        ? tracking.label
        : null,
  };
}

function conflictFor(scenarioId: DriverDetailScenarioId): DriverConflictView {
  if (scenarioId === 'D-DETAIL-ACCEPT-RACE') {
    return {
      scenarioId,
      kind: 'conflict',
      title: 'Không thể nhận đơn',
      message: 'Tài xế khác vừa nhận đơn này.',
      recoveryLabel: 'Xem đơn còn trống',
    };
  }
  if (scenarioId === 'D-DETAIL-ACTIVE-ORDER-CONFLICT') {
    return {
      scenarioId,
      kind: 'conflict',
      title: 'Bạn đã có một chuyến hoạt động',
      message: 'Không thể nhận thêm đơn khi chuyến hiện tại chưa kết thúc.',
      recoveryLabel: 'Mở chuyến đang thực hiện',
      activeOrderReference: 'LP-D-260815-001',
    };
  }
  return {
    scenarioId,
    kind: 'conflict',
    title: 'Trạng thái đơn đã thay đổi',
    message: 'Command cũ không còn hợp lệ; không tự động thử lại transition.',
    recoveryLabel: 'Tải dữ liệu mới nhất',
  };
}

export function createDriverDetailFixture(scenarioId: DriverDetailScenarioId): DriverDetailView {
  if (scenarioId === 'D-DETAIL-LOADING') {
    return deepFreeze({
      scenarioId,
      kind: 'loading',
      title: 'Đang tải dữ liệu chuyến',
      message: 'Không hiển thị route hoặc contact giả trong khi chờ.',
    });
  }
  if (scenarioId === 'D-DETAIL-ERROR') {
    return deepFreeze({
      scenarioId,
      kind: 'error',
      title: 'Không thể tải chi tiết đơn',
      message: 'Hãy thử lại. Mã yêu cầu mô phỏng: REQ-D-DETAIL-01.',
    });
  }
  if (scenarioId === 'D-DETAIL-PERMISSION') {
    return deepFreeze({
      scenarioId,
      kind: 'permission-denied',
      title: 'Bạn không có quyền xem đơn này',
      message: 'Route, contact, media và tracking riêng tư không được hiển thị.',
    });
  }
  if (
    scenarioId === 'D-DETAIL-ACCEPT-RACE' ||
    scenarioId === 'D-DETAIL-ACTIVE-ORDER-CONFLICT' ||
    scenarioId === 'D-DETAIL-INVALID-TRANSITION'
  ) {
    return deepFreeze(conflictFor(scenarioId));
  }
  if (scenarioId === 'D-DETAIL-PUBLIC-REQUESTED' || scenarioId === 'D-DETAIL-ACCEPT-PENDING') {
    return deepFreeze(publicDetail(scenarioId));
  }
  return deepFreeze(assignedDetail(scenarioId));
}
