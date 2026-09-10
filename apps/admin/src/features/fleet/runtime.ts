import 'server-only';

import type { DriverAvailability, OrderStatus, PaymentStatus } from '@leopard/ui';

import { ApiError } from '../../lib/api/api-error';
import { operationsServerGet } from '../../lib/api/operations-server-client';
import type {
  FleetActiveOrderSummaryView,
  FleetAttentionView,
  FleetBoundaryView,
  FleetDashboardView,
  FleetDriverFilters,
  FleetDriverListItemView,
  FleetMapState,
  FleetMetricView,
  FleetOrderDetailDataView,
  FleetOrderDetailView,
  FleetOrderFilters,
  FleetOrderListItemView,
  FleetOrdersView,
  FleetDriversView,
  FleetRouteSummaryView,
  FleetRouteView,
  FleetScopeView,
} from './model';
import type { FleetPreviewScreen } from './fixtures';

/**
 * Runtime data adapters for the read-only Fleet Owner screens. Mirrors the
 * admin runtime: loaders always resolve, failures map to boundary results.
 */

// ---------------------------------------------------------------------------
// Backend DTO mirrors
// ---------------------------------------------------------------------------

interface PageEnvelope<T> {
  readonly items: T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
}

interface FleetProfileDto {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly driversCount: number;
  readonly activeOrdersCount: number;
  readonly todayRevenueVnd: number;
}

interface FleetDriverSummaryDto {
  readonly id: string;
  readonly phone: string;
  readonly status: string;
  readonly availability: string;
  readonly lastKnownAt?: string | null;
  readonly membershipStatus: string | null;
}

interface FleetOrderSummaryDto {
  readonly id: string;
  readonly code: string;
  readonly status: string;
  readonly driverName?: string;
  readonly customerPhone: string | null;
  readonly pickupLabel: string;
  readonly dropoffLabel: string;
  readonly paymentStatus: string;
  readonly priceVnd: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface MappedStopDto {
  readonly id: string;
  readonly type: string;
  readonly sequence: number;
  readonly address: string;
}

interface MappedHistoryDto {
  readonly id: string;
  readonly toStatus: string;
  readonly reason: string | null;
  readonly createdAt: string;
}

interface OrderDetailResponse {
  readonly id: string;
  readonly status: string;
  readonly providerSource: string | null;
  readonly etaSeconds: number | null;
  readonly priceVnd: number | null;
  readonly updatedAt: string;
  readonly customerPhone?: string;
  readonly driverPhone?: string | null;
  readonly stops?: readonly MappedStopDto[];
  readonly statusHistory?: readonly MappedHistoryDto[];
}

interface PaymentIntentDto {
  readonly id: string;
  readonly status: string;
  readonly amountVnd: number;
  readonly provider: string | null;
}

// ---------------------------------------------------------------------------
// Display helpers (kept aligned with the admin runtime)
// ---------------------------------------------------------------------------

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
const ORDER_STATUSES: readonly OrderStatus[] = [
  'REQUESTED',
  'ACCEPTED',
  'PICKING_UP',
  'PICKED_UP',
  'IN_TRANSIT',
  'DELIVERED',
  'CANCELLED',
];
const NON_TERMINAL_ORDER_STATUSES = ['REQUESTED', 'ACCEPTED', 'PICKING_UP', 'PICKED_UP', 'IN_TRANSIT'];
const STALE_AFTER_MINUTES = 15;

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
  day: '2-digit',
  month: '2-digit',
});

function formatDateTime(iso: string): string {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? '—' : dateTimeFormatter.format(parsed);
}

function formatVnd(amount: number): string {
  return `${amount.toLocaleString('vi-VN')} ₫`;
}

function maskPhone(phone: string | null | undefined): string {
  if (!phone || phone.length < 4) return '•••';
  return `••• ${phone.slice(-4)}`;
}

function referenceOf(orderId: string): string {
  const head = orderId.split('-')[0];
  return head ? head.toUpperCase() : orderId;
}

function toOrderStatus(raw: string): OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(raw) ? (raw as OrderStatus) : 'REQUESTED';
}

function toPaymentStatus(raw: string): PaymentStatus {
  return raw === 'QR_CREATED' || raw === 'PAID_MANUAL' || raw === 'FAILED'
    ? raw
    : 'UNPAID';
}

function toAvailability(raw: string): DriverAvailability {
  return raw === 'AVAILABLE' || raw === 'BUSY' ? raw : 'OFFLINE';
}

function minutesSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 60000;
}

function locationFreshness(lastKnownAt: string | null | undefined): 'current' | 'stale' | 'unavailable' {
  if (!lastKnownAt) return 'unavailable';
  return minutesSince(lastKnownAt) <= STALE_AFTER_MINUTES ? 'current' : 'stale';
}

function trackingFreshnessOf(updatedAtIso: string, status: OrderStatus): 'current' | 'stale' | 'unavailable' {
  if (status === 'DELIVERED' || status === 'CANCELLED') return 'unavailable';
  return minutesSince(updatedAtIso) <= STALE_AFTER_MINUTES ? 'current' : 'stale';
}

function mapAlternativeCopy(): string {
  return 'Bản đồ trực tiếp chưa có trong phạm vi pilot; danh sách dưới đây là nguồn dữ liệu chính.';
}

// ---------------------------------------------------------------------------
// Boundary mapping
// ---------------------------------------------------------------------------

export type FleetRuntimeResult =
  | { ok: true; view: FleetRouteView }
  | {
      ok: false;
      kind: 'permission-denied' | 'session-expired' | 'error';
      title: string;
      message: string;
    };

function boundaryFromError(error: unknown): FleetRuntimeResult {
  if (ApiError.isApiError(error)) {
    if (error.statusCode === 403) {
      return {
        ok: false,
        kind: 'permission-denied',
        title: 'Bạn không có quyền xem dữ liệu đội xe này',
        message:
          error.requestId
            ? `Dữ liệu ngoài phạm vi fleet của bạn. Mã theo dõi: ${error.requestId}`
            : 'Dữ liệu ngoài phạm vi fleet của bạn.',
      };
    }
    if (error.statusCode === 401) {
      return {
        ok: false,
        kind: 'session-expired',
        title: 'Phiên đã hết hạn',
        message: 'Dữ liệu riêng tư đã được xóa. Vui lòng đăng nhập lại.',
      };
    }
    return {
      ok: false,
      kind: 'error',
      title: 'Không thể tải dữ liệu',
      message: error.requestId
        ? `Máy chủ trả lời lỗi (${error.code}). Mã theo dõi: ${error.requestId}`
        : `Máy chủ trả lời lỗi (${error.code}). Vui lòng thử lại.`,
    };
  }
  return {
    ok: false,
    kind: 'error',
    title: 'Không thể tải dữ liệu',
    message: 'Hệ thống tạm thời chưa sẵn sàng. Vui lòng thử lại.',
  };
}

// ---------------------------------------------------------------------------
// Shared scope loader
// ---------------------------------------------------------------------------

async function loadScope(): Promise<
  { ok: true; scope: FleetScopeView } | FleetRuntimeResult
> {
  try {
    const profile = await operationsServerGet<FleetProfileDto>('/fleet/profile');
    const scope: FleetScopeView = {
      fleetId: profile.id,
      displayId: profile.id.slice(0, 8).toUpperCase(),
      displayName: profile.name,
      membershipStatus: 'ACTIVE',
      readOnly: true,
      verifiedAtLabel: formatDateTime(new Date().toISOString()),
    };
    return { ok: true, scope };
  } catch (error) {
    return boundaryFromError(error);
  }
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

async function loadFleetDashboard(scope: FleetScopeView): Promise<FleetRouteView> {
  const [profile, ordersPage, driversPage] = await Promise.all([
    operationsServerGet<FleetProfileDto>('/fleet/profile'),
    operationsServerGet<PageEnvelope<FleetOrderSummaryDto>>('/fleet/orders', {
      page: 1,
      pageSize: 100,
    }),
    operationsServerGet<PageEnvelope<FleetDriverSummaryDto>>('/fleet/drivers', {
      page: 1,
      pageSize: 100,
    }),
  ]);

  const activeOrders = ordersPage.items.filter((order) =>
    NON_TERMINAL_ORDER_STATUSES.includes(toOrderStatus(order.status)),
  );
  const asOf = new Date();

  const metrics: readonly FleetMetricView[] = [
    {
      id: 'drivers',
      label: 'Tài xế đang tham gia',
      value: profile.driversCount,
      detail: 'Membership ACTIVE',
    },
    {
      id: 'active-orders',
      label: 'Đơn đang hoạt động',
      value: profile.activeOrdersCount,
      detail: 'Chưa terminal',
    },
    {
      id: 'today-revenue',
      label: 'Doanh thu hôm nay',
      value: profile.todayRevenueVnd,
      detail: 'Đơn DELIVERED trong ngày',
    },
  ];

  // Attention items are derived honestly: stale live tracking on active trips.
  const attentionItems: readonly FleetAttentionView[] = activeOrders
    .filter((order) => minutesSince(order.updatedAt) > STALE_AFTER_MINUTES)
    .slice(0, 5)
    .map((order) => ({
      id: `stale-${order.id}`,
      severity: 'warning' as const,
      title: `Tracking cũ · đơn ${order.code || referenceOf(order.id)}`,
      reason: 'Đơn chưa terminal nhưng không có cập nhật mới trong khoảng 15 phút.',
      resourceLabel: order.code || referenceOf(order.id),
      href: `/fleet/orders/${order.id}`,
      observedAtLabel: formatDateTime(order.updatedAt),
    }));

  const availabilityCounts = { AVAILABLE: 0, BUSY: 0, OFFLINE: 0 };
  for (const driver of driversPage.items) {
    availabilityCounts[toAvailability(driver.availability)] += 1;
  }

  const summaryParts: string[] = [];
  if (availabilityCounts.AVAILABLE > 0) summaryParts.push(`${availabilityCounts.AVAILABLE} sẵn sàng`);
  if (availabilityCounts.BUSY > 0) summaryParts.push(`${availabilityCounts.BUSY} đang bận`);
  if (availabilityCounts.OFFLINE > 0) summaryParts.push(`${availabilityCounts.OFFLINE} ngoại tuyến`);
  const availabilitySummary =
    summaryParts.length > 0 ? summaryParts.join(' · ') : 'Chưa có tài xế trong đội xe.';

  const activeOrderViews: readonly FleetActiveOrderSummaryView[] = activeOrders.map((order) => {
    const status = toOrderStatus(order.status);
    const freshness = trackingFreshnessOf(order.updatedAt, status);
    return {
      id: order.id,
      reference: order.code || referenceOf(order.id),
      status,
      routeLabel:
        order.pickupLabel && order.dropoffLabel
          ? `${order.pickupLabel} → ${order.dropoffLabel}`
          : 'Tuyến đường chưa có điểm dừng',
      driverLabel: order.driverName ? maskPhone(order.driverName) : 'Chưa có tài xế',
      trackingLabel:
        freshness === 'current' ? 'Đang cập nhật' : freshness === 'stale' ? 'Vị trí cũ' : '—',
      href: `/fleet/orders/${order.id}`,
    };
  });

  const view: FleetDashboardView = {
    scenarioId: 'RT-FLEET-DASHBOARD',
    kind: 'dashboard',
    state: activeOrders.length === 0 ? 'empty' : 'success',
    scope,
    asOfLabel: formatDateTime(asOf.toISOString()),
    metrics,
    attentionItems,
    activeOrders: activeOrderViews,
    availabilitySummary,
    notice: null,
    unavailableRegionLabel: null,
  };
  return view;
}

// ---------------------------------------------------------------------------
// Drivers list
// ---------------------------------------------------------------------------

async function loadFleetDrivers(
  scope: FleetScopeView,
  filters: FleetDriverFilters,
): Promise<FleetRouteView> {
  const query: Record<string, string | number> = {
    page: filters.page,
    pageSize: filters.pageSize,
  };
  if (filters.q) query.q = filters.q;
  const page = await operationsServerGet<PageEnvelope<FleetDriverSummaryDto>>(
    '/fleet/drivers',
    query,
  );

  const items: readonly FleetDriverListItemView[] = page.items.map((driver) => ({
    id: driver.id,
    displayId: driver.id.slice(0, 8).toUpperCase(),
    displayName: maskPhone(driver.phone),
    availability: toAvailability(driver.availability),
    activeOrder: null,
    lastLocationLabel:
      driver.lastKnownAt && minutesSince(driver.lastKnownAt) <= STALE_AFTER_MINUTES
        ? 'Vị trí mới ghi nhận'
        : driver.lastKnownAt
          ? 'Vị trí cũ'
          : 'Chưa có vị trí',
    locationUpdatedAtLabel: driver.lastKnownAt ? formatDateTime(driver.lastKnownAt) : '—',
    locationFreshness: locationFreshness(driver.lastKnownAt),
    exceptionLabel: null,
  }));

  const filterNotes: string[] = [];
  if (filters.q) filterNotes.push(`tìm "${filters.q}"`);
  if (filters.availability !== 'ALL') {
    filterNotes.push('trạng thái chuyến được lọc sau khi tải (API pilot chưa hỗ trợ)');
  }

  const view: FleetDriversView = {
    scenarioId: 'RT-FLEET-DRIVERS',
    kind: 'drivers',
    state: page.total === 0 ? 'no-results' : 'success',
    scope,
    filters,
    result: {
      items,
      page: page.page,
      pageSize: page.pageSize,
      totalPages: page.totalPages,
      totalItems: page.total,
      filterSummary: `Tài xế: ${page.total} kết quả${filterNotes.length > 0 ? ` · ${filterNotes.join(', ')}` : ''}`,
      sort: filters.sort,
      revision: new Date().toISOString(),
      asOfLabel: formatDateTime(new Date().toISOString()),
      mapState: 'unavailable' satisfies FleetMapState,
      mapAlternative: mapAlternativeCopy(),
    },
    notice: null,
  };
  return view;
}

// ---------------------------------------------------------------------------
// Orders list
// ---------------------------------------------------------------------------

async function loadFleetOrders(
  scope: FleetScopeView,
  filters: FleetOrderFilters,
): Promise<FleetRouteView> {
  const query: Record<string, string | number> = {
    page: filters.page,
    pageSize: filters.pageSize,
  };
  if (filters.status !== 'ALL') query.status = filters.status;
  if (filters.driverId) query.driverId = filters.driverId;
  if (filters.from) query.from = filters.from;
  if (filters.to) query.to = filters.to;
  const page = await operationsServerGet<PageEnvelope<FleetOrderSummaryDto>>(
    '/fleet/orders',
    query,
  );

  const items: readonly FleetOrderListItemView[] = page.items.map((order) => {
    const status = toOrderStatus(order.status);
    const freshness = trackingFreshnessOf(order.updatedAt, status);
    const route: FleetRouteSummaryView = {
      originLabel: order.pickupLabel || 'Điểm lấy hàng chưa rõ',
      destinationLabel: order.dropoffLabel || 'Điểm giao hàng chưa rõ',
    };
    return {
      id: order.id,
      reference: order.code || referenceOf(order.id),
      status,
      route,
      customerLabel: maskPhone(order.customerPhone),
      driverLabel: order.driverName ? maskPhone(order.driverName) : 'Chưa có tài xế',
      paymentStatus: toPaymentStatus(order.paymentStatus),
      updatedAtLabel: formatDateTime(order.updatedAt),
      trackingLabel:
        freshness === 'current' ? 'Đang cập nhật' : freshness === 'stale' ? 'Vị trí cũ' : 'Đã kết thúc',
      trackingFreshness: freshness,
      href: `/fleet/orders/${order.id}`,
    };
  });

  const view: FleetOrdersView = {
    scenarioId: 'RT-FLEET-ORDERS',
    kind: 'orders',
    state: page.total === 0 ? 'no-results' : 'success',
    scope,
    filters,
    result: {
      items,
      page: page.page,
      pageSize: page.pageSize,
      totalPages: page.totalPages,
      totalItems: page.total,
      filterSummary: `Đơn hàng đội xe: ${page.total} kết quả`,
      sort: filters.sort,
      revision: new Date().toISOString(),
      asOfLabel: formatDateTime(new Date().toISOString()),
      mapState: 'unavailable' satisfies FleetMapState,
      mapAlternative: mapAlternativeCopy(),
    },
    notice: null,
  };
  return view;
}

// ---------------------------------------------------------------------------
// Order detail
// ---------------------------------------------------------------------------

async function loadFleetOrderDetail(
  scope: FleetScopeView,
  orderId: string,
): Promise<FleetRouteView> {
  const [order, payments] = await Promise.all([
    operationsServerGet<OrderDetailResponse>(`/orders/${orderId}`),
    operationsServerGet<readonly PaymentIntentDto[]>(`/orders/${orderId}/payments`).catch(
      () => [] as readonly PaymentIntentDto[],
    ),
  ]);

  const status = toOrderStatus(order.status);
  const stops = order.stops ?? [];
  const pickup = stops.find((stop) => stop.type === 'PICKUP');
  const dropoff = [...stops].reverse().find((stop) => stop.type === 'DROPOFF');
  const intermediate = stops.filter((stop) => stop.type === 'STOP');
  const latestPayment = payments[0] ?? null;

  const history = [...(order.statusHistory ?? [])]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((entry, index, all) => {
      const entryStatus = toOrderStatus(entry.toStatus);
      return {
        id: entry.id,
        status: entryStatus,
        label: ORDER_STATUS_LABEL[entryStatus],
        description: entry.reason ?? '',
        timestampLabel: formatDateTime(entry.createdAt),
        dateTime: entry.createdAt,
        isCurrent: index === all.length - 1,
      };
    });

  const freshness = trackingFreshnessOf(order.updatedAt, status);
  const etaMinutes = order.etaSeconds !== null && order.etaSeconds !== undefined
    ? Math.max(1, Math.round(order.etaSeconds / 60))
    : null;

  const dataView: FleetOrderDetailDataView = {
    id: order.id,
    reference: referenceOf(order.id),
    status,
    updatedAtLabel: formatDateTime(order.updatedAt),
    route: {
      origin: {
        id: pickup?.id ?? 'origin-missing',
        label: pickup?.address ?? 'Điểm lấy hàng chưa rõ',
        metadata: 'Điểm lấy hàng',
      },
      stops: intermediate.map((stop) => ({
        id: stop.id,
        label: stop.address,
        metadata: `Điểm dừng ${stop.sequence}`,
      })),
      destination: {
        id: dropoff?.id ?? 'destination-missing',
        label: dropoff?.address ?? 'Điểm giao hàng chưa rõ',
        metadata: 'Điểm giao hàng',
      },
    },
    eta: {
      label:
        etaMinutes !== null
          ? `ETA dự kiến · ${etaMinutes} phút`
          : 'ETA dự kiến · Chưa khả dụng',
      sourceLabel:
        order.providerSource === 'DEMO'
          ? 'Dữ liệu mô phỏng'
          : order.providerSource
            ? `Nguồn: ${order.providerSource}`
            : null,
    },
    driverLabel: order.driverPhone ? maskPhone(order.driverPhone) : 'Chưa có tài xế',
    customerLabel: maskPhone(order.customerPhone),
    cargoSummary:
      order.priceVnd !== null ? `Giá trị đơn ${formatVnd(order.priceVnd)}` : 'Giá trị đơn chưa được tính',
    tracking: {
      state: freshness === 'current' ? 'route' : freshness === 'stale' ? 'stale' : 'no-location',
      statusLabel: ORDER_STATUS_LABEL[status],
      lastUpdatedLabel: formatDateTime(order.updatedAt),
      mapAlternative: mapAlternativeCopy(),
    },
    history,
    payment: {
      status: latestPayment ? toPaymentStatus(latestPayment.status) : 'UNPAID',
      amountLabel: latestPayment
        ? formatVnd(latestPayment.amountVnd)
        : order.priceVnd !== null
          ? formatVnd(order.priceVnd)
          : '—',
      methodLabel: latestPayment?.provider ? `Nguồn: ${latestPayment.provider}` : '—',
    },
    media: {
      state: 'error',
      message: 'Danh sách media của đơn chưa có endpoint tổng hợp trong API pilot.',
      items: [],
    },
  };

  const view: FleetOrderDetailView = {
    scenarioId: 'RT-FLEET-ORDER-DETAIL',
    kind: 'order-detail',
    scope,
    order: dataView,
    notice: null,
  };
  return view;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function loadFleetRuntimeView(
  screen: FleetPreviewScreen,
  options: {
    readonly orderId?: string | null | undefined;
    readonly driverFilters?: FleetDriverFilters | undefined;
    readonly orderFilters?: FleetOrderFilters | undefined;
  } = {},
): Promise<FleetRuntimeResult> {
  let scope: FleetScopeView;
  try {
    const loaded = await loadScope();
    if (!loaded.ok) return loaded;
    if (!('scope' in loaded)) return loaded;
    scope = loaded.scope;
  } catch (error) {
    return boundaryFromError(error);
  }

  try {
    if (screen === 'dashboard') {
      return { ok: true, view: await loadFleetDashboard(scope) };
    }
    if (screen === 'drivers') {
      const filters =
        options.driverFilters ??
        ({
          q: '',
          availability: 'ALL',
          sort: 'name-asc',
          page: 1,
          pageSize: 20,
        } as const satisfies FleetDriverFilters);
      return { ok: true, view: await loadFleetDrivers(scope, filters) };
    }
    if (screen === 'orders') {
      const filters =
        options.orderFilters ??
        ({
          q: '',
          status: 'ALL',
          customer: '',
          driverId: '',
          from: '',
          to: '',
          sort: 'updated-desc',
          page: 1,
          pageSize: 20,
        } as const satisfies FleetOrderFilters);
      return { ok: true, view: await loadFleetOrders(scope, filters) };
    }

    if (!options.orderId) {
      return {
        ok: false,
        kind: 'error',
        title: 'Mã đơn không hợp lệ',
        message: 'Đường dẫn không chứa UUID hợp lệ. Không có dữ liệu đơn nào được tải.',
      };
    }
    return { ok: true, view: await loadFleetOrderDetail(scope, options.orderId) };
  } catch (error) {
    return boundaryFromError(error);
  }
}
