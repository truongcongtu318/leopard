import 'server-only';

import type {
  DriverAvailability,
  FleetMemberStatus,
  OrderStatus,
  PaymentStatus,
  UserStatus,
} from '@leopard/ui';

import { ApiError } from '../../lib/api/api-error';
import {
  operationsServerGet,
  publicServerGet,
} from '../../lib/api/operations-server-client';
import type {
  AdminBoundaryView,
  AdminCommandKind,
  AdminCommandView,
  AdminListFilters,
  AdminListItemView,
  AdminListView,
  AdminListScreen,
  AdminOrderDetailDataView,
  AdminRoutePointView,
  AdminOrderDetailView,
  AdminOrderSummaryView,
  AdminOverviewView,
  AdminPreviewScreen,
  AdminRouteView,
} from './model';

/**
 * Runtime data adapters: map Leopard API responses onto the operations view
 * models rendered by the admin screens. Every loader returns a view; failures
 * are mapped to boundary views instead of throwing into the route tree.
 */

// ---------------------------------------------------------------------------
// Backend DTO mirrors (the web app deliberately avoids depending on @leopard/shared)
// ---------------------------------------------------------------------------

interface PageEnvelope<T> {
  readonly items: T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
}

interface AdminDashboardDto {
  readonly totalUsers: number;
  readonly totalOrders: number;
  readonly activeFleets: number;
  readonly revenueVnd: number;
}

interface OrderSummaryDto {
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

interface UserSummaryDto {
  readonly id: string;
  readonly phone: string;
  readonly role: string;
  readonly status: string;
  readonly createdAt: string;
}

interface FleetSummaryDto {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly driversCount: number;
  readonly activeOrdersCount: number;
}

interface DriverSummaryDto {
  readonly id: string;
  readonly phone: string;
  readonly status: string;
  readonly availability: string;
  readonly lastKnownAt?: string | null;
  readonly membershipStatus: string | null;
  readonly fleetName: string | null;
}

interface MappedStopDto {
  readonly id: string;
  readonly type: string;
  readonly sequence: number;
  readonly address: string;
}

interface MappedHistoryDto {
  readonly id: string;
  readonly fromStatus: string | null;
  readonly toStatus: string;
  readonly reason: string | null;
  readonly createdAt: string;
}

interface OrderDetailResponse {
  readonly id: string;
  readonly customerId: string;
  readonly driverId: string | null;
  readonly status: string;
  readonly providerSource: string | null;
  readonly priceVnd: number | null;
  readonly etaSeconds: number | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly customerPhone?: string;
  readonly driverPhone?: string | null;
  readonly stops?: readonly MappedStopDto[];
  readonly statusHistory?: readonly MappedHistoryDto[];
}

interface PaymentIntentDto {
  readonly id: string;
  readonly orderId: string;
  readonly status: string;
  readonly amountVnd: number;
  readonly provider: string | null;
  readonly providerReference: string | null;
  readonly expiresAt: string | null;
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

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
const PAYMENT_STATUSES: readonly PaymentStatus[] = ['UNPAID', 'QR_CREATED', 'PAID_MANUAL', 'FAILED'];
const USER_ROLES = ['CUSTOMER', 'DRIVER', 'FLEET_OWNER', 'ADMIN'] as const;

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
const ROLE_LABEL: Readonly<Record<(typeof USER_ROLES)[number], string>> = {
  CUSTOMER: 'Khách hàng',
  DRIVER: 'Tài xế',
  FLEET_OWNER: 'Chủ đội xe',
  ADMIN: 'Quản trị viên',
};

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
  return (PAYMENT_STATUSES as readonly string[]).includes(raw) ? (raw as PaymentStatus) : 'UNPAID';
}

function toUserStatus(raw: string): UserStatus {
  return raw === 'DISABLED' ? 'DISABLED' : 'ACTIVE';
}

function toAvailability(raw: string): DriverAvailability {
  return raw === 'AVAILABLE' || raw === 'BUSY' ? raw : 'OFFLINE';
}

function toMembershipStatus(raw: string | null): FleetMemberStatus | null {
  if (raw === 'INVITED' || raw === 'ACTIVE' || raw === 'REMOVED') return raw;
  return null;
}

// ---------------------------------------------------------------------------
// Boundary mapping
// ---------------------------------------------------------------------------

const SCENARIO_PREFIX = 'RT-ADM';

function boundary(
  suffix: string,
  kind: AdminBoundaryView['kind'],
  title: string,
  message: string,
): AdminBoundaryView {
  return { scenarioId: `${SCENARIO_PREFIX}-${suffix}`, kind, title, message };
}

export function adminBoundaryFromError(error: unknown, suffix: string): AdminBoundaryView {
  if (ApiError.isApiError(error)) {
    if (error.statusCode === 403) {
      return boundary(
        suffix,
        'permission-denied',
        'Bạn không có quyền xem dữ liệu này',
        'Dữ liệu riêng tư không được hiển thị cho vai trò hiện tại.',
      );
    }
    if (error.statusCode === 401) {
      return boundary(
        suffix,
        'session-expired',
        'Phiên đã hết hạn',
        'Dữ liệu riêng tư đã được xóa. Vui lòng đăng nhập lại.',
      );
    }
    return boundary(
      suffix,
      'error',
      'Không thể tải dữ liệu',
      error.requestId
        ? `Máy chủ trả lời lỗi (${error.code}). Mã theo dõi: ${error.requestId}`
        : `Máy chủ trả lời lỗi (${error.code}). Vui lòng thử lại.`,
    );
  }
  return boundary(suffix, 'error', 'Không thể tải dữ liệu', 'Hệ thống tạm thời chưa sẵn sàng. Vui lòng thử lại.');
}

// ---------------------------------------------------------------------------
// Command factory
// ---------------------------------------------------------------------------

function userStatusCommand(params: {
  kind: Extract<AdminCommandKind, 'DISABLE_USER' | 'ENABLE_USER'>;
  userId: string;
  role: string;
  maskedPhone: string;
}): AdminCommandView {
  const disabling = params.kind === 'DISABLE_USER';
  const roleLabel =
    params.role in ROLE_LABEL ? ROLE_LABEL[params.role as keyof typeof ROLE_LABEL] : params.role;
  return {
    kind: params.kind,
    targetId: params.userId,
    targetLabel: `Người dùng ${params.maskedPhone}`,
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
    contextVersion: `user-${params.userId}`,
    commandLabel: disabling ? 'Vô hiệu hóa người dùng' : 'Kích hoạt lại người dùng',
    buttonVariant: disabling ? 'destructive' : 'primary',
    targetItems: [
      { id: 'user', label: 'Người dùng', value: params.maskedPhone },
      { id: 'role', label: 'Role', value: roleLabel },
      {
        id: 'status',
        label: 'Trạng thái hiện tại',
        value: disabling ? 'Đang hoạt động' : 'Đã vô hiệu hóa',
      },
    ],
  };
}

function cancelOrderCommand(order: AdminOrderDetailDataView): AdminCommandView {
  return {
    kind: 'CANCEL_ORDER',
    targetId: order.id,
    targetLabel: `Đơn ${order.reference}`,
    currentStateLabel: ORDER_STATUS_LABEL[order.status],
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
    contextVersion: `order-${order.id}`,
    commandLabel: 'Hủy đơn hàng',
    buttonVariant: 'destructive',
    targetItems: [
      { id: 'order', label: 'Đơn hàng', value: order.reference },
      { id: 'order-id', label: 'Order UUID', value: order.id },
      { id: 'status', label: 'Trạng thái hiện tại', value: ORDER_STATUS_LABEL[order.status] },
      { id: 'assignment', label: 'Phân công', value: order.driverLabel },
      { id: 'updated', label: 'Cập nhật', value: order.updatedAtLabel },
    ],
  };
}

function confirmPaymentCommand(
  order: AdminOrderDetailDataView,
  paymentId: string,
): AdminCommandView {
  return {
    kind: 'CONFIRM_MANUAL_PAYMENT',
    targetId: paymentId,
    targetLabel: `Thanh toán của đơn ${order.reference}`,
    currentStateLabel: PAYMENT_STATUS_LABEL[order.payment.status],
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
    contextVersion: `payment-${paymentId}`,
    commandLabel: 'Xác nhận đã thanh toán',
    buttonVariant: 'primary',
    targetItems: [
      { id: 'order', label: 'Đơn hàng', value: order.reference },
      { id: 'order-id', label: 'Order UUID', value: order.id },
      { id: 'payment', label: 'Payment ID', value: paymentId },
      { id: 'amount', label: 'Số tiền', value: order.payment.amountLabel },
      { id: 'status', label: 'Trạng thái hiện tại', value: PAYMENT_STATUS_LABEL[order.payment.status] },
    ],
  };
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

async function loadDistribution(): Promise<
  readonly { status: OrderStatus; count: number }[]
> {
  // Backend OrderStatus enum has no PICKED_UP transition in the pilot.
  const statuses: readonly OrderStatus[] = [
    'REQUESTED',
    'ACCEPTED',
    'PICKING_UP',
    'IN_TRANSIT',
    'DELIVERED',
    'CANCELLED',
  ];
  return Promise.all(
    statuses.map(async (status) => {
      const page = await operationsServerGet<PageEnvelope<OrderSummaryDto>>('/admin/orders', {
        status,
        page: 1,
        pageSize: 1,
      });
      return { status, count: page.total };
    }),
  );
}

async function loadAdminRuntimeOverview(): Promise<AdminRouteView> {
  try {
    const [dashboard, liveness, readiness] = await Promise.all([
      operationsServerGet<AdminDashboardDto>('/admin/dashboard'),
      publicServerGet<{ status?: string }>('/health/live'),
      publicServerGet<{ status?: string; database?: string }>('/health/ready'),
    ]);
    const [distribution, recentOrdersPage] = await Promise.all([
      loadDistribution(),
      operationsServerGet<PageEnvelope<OrderSummaryDto>>('/admin/orders', {
        page: 1,
        pageSize: 8,
      }),
    ]);

    const state: AdminOverviewView['state'] = !liveness.ok
      ? 'offline'
      : !readiness.ok || readiness.body?.status !== 'ready'
        ? 'readiness-failed'
        : 'ready';
    const dependencyLabel = !readiness.ok
      ? 'Không thể kiểm tra readiness hiện tại.'
      : readiness.body?.status === 'ready'
        ? `Database ${readiness.body.database ?? 'đã kết nối'}`
        : 'Một dependency đang lỗi, dữ liệu có thể cũ.';

    const checkedAt = new Date();
    const metrics: AdminOverviewView['metrics'] = [
      {
        id: 'users',
        label: 'Người dùng',
        value: dashboard.totalUsers,
        detail: `${dashboard.totalOrders} đơn đã tạo`,
        href: '/admin/users',
      },
      {
        id: 'fleets',
        label: 'Đội xe',
        value: dashboard.activeFleets,
        detail: 'Đội xe đang hoạt động',
        href: '/admin/fleets',
      },
      {
        id: 'active-orders',
        label: 'Đơn đang hoạt động',
        value: distribution
          .filter((item) => NON_TERMINAL_ORDER_STATUSES.includes(item.status))
          .reduce((sum, item) => sum + item.count, 0),
        detail: 'Chưa terminal',
        href: '/admin/orders',
      },
      {
        id: 'revenue',
        label: 'Doanh thu đã giao',
        value: dashboard.revenueVnd,
        detail: 'Tổng giá trị đơn DELIVERED',
      },
    ];

    const exceptions =
      state === 'offline'
        ? [
            {
              id: 'health-liveness',
              domain: 'health' as const,
              label: 'Mất kết nối với API',
              detail: 'Liveness probe thất bại; số liệu bên dưới là lần tải thành công gần nhất.',
              tone: 'danger' as const,
              updatedAtLabel: formatDateTime(checkedAt.toISOString()),
            },
          ]
        : state === 'readiness-failed'
          ? [
              {
                id: 'health-readiness',
                domain: 'health' as const,
                label: 'Readiness chưa đạt',
                detail: dependencyLabel,
                tone: 'warning' as const,
                updatedAtLabel: formatDateTime(checkedAt.toISOString()),
              },
            ]
          : [];

    const recentOrders: readonly AdminOrderSummaryView[] = recentOrdersPage.items.map((order) => ({
      id: order.id,
      reference: order.code || referenceOf(order.id),
      status: toOrderStatus(order.status),
      paymentStatus: toPaymentStatus(order.paymentStatus),
      updatedAtLabel: formatDateTime(order.updatedAt),
      href: `/admin/orders/${order.id}`,
    }));

    const view: AdminOverviewView = {
      scenarioId: `${SCENARIO_PREFIX}-OVERVIEW`,
      kind: 'overview',
      state,
      checkedAtLabel: formatDateTime(checkedAt.toISOString()),
      health: {
        liveness: 'UP',
        readiness: state === 'ready' ? 'READY' : 'FAILED',
        dependencyLabel,
        requestId: null,
      },
      metrics,
      orderDistribution: distribution.map((item) => ({
        status: item.status,
        count: item.count,
      })),
      exceptions,
      recentOrders,
      notice: null,
    };
    return view;
  } catch (error) {
    console.error('[runtime:overview] load failed:', error);
    return adminBoundaryFromError(error, 'OVERVIEW');
  }
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

function listQueryFromFilters(filters: AdminListFilters): Record<string, string | number> {
  const query: Record<string, string | number> = {
    page: filters.page,
    pageSize: filters.pageSize,
  };
  if (filters.from) query.from = filters.from;
  if (filters.to) query.to = filters.to;
  return query;
}

function describeFilters(prefix: string, filters: AdminListFilters, total: number): string {
  const parts: string[] = [];
  if (filters.status !== 'ALL') parts.push(`trạng thái ${ORDER_STATUS_LABEL[filters.status]}`);
  if (filters.role !== 'ALL') parts.push(`vai trò ${ROLE_LABEL[filters.role]}`);
  if (filters.userStatus !== 'ALL') parts.push(`trạng thái tài khoản ${filters.userStatus === 'ACTIVE' ? 'đang hoạt động' : 'đã vô hiệu hóa'}`);
  if (filters.availability !== 'ALL') parts.push(`chuyển động ${filters.availability}`);
  if (filters.driverId) parts.push('lọc theo tài xế');
  const filterNote = parts.length > 0 ? ` · bộ lọc: ${parts.join(', ')}` : '';
  return `${prefix}: ${total} kết quả${filterNote}`;
}

function trackingSignal(updatedAtIso: string, status: OrderStatus): {
  label: string;
  tone: 'neutral' | 'warning' | 'success';
} {
  if (status === 'DELIVERED' || status === 'CANCELLED') {
    return { label: 'Đã kết thúc', tone: 'neutral' };
  }
  const minutesSinceUpdate = (Date.now() - new Date(updatedAtIso).getTime()) / 60000;
  return Number.isFinite(minutesSinceUpdate) && minutesSinceUpdate <= 15
    ? { label: 'Đang cập nhật', tone: 'success' }
    : { label: 'Vị trí cũ', tone: 'warning' };
}

async function loadUsersList(filters: AdminListFilters): Promise<AdminRouteView> {
  try {
    const query = listQueryFromFilters(filters);
    if (filters.role !== 'ALL') query.role = filters.role;
    if (filters.userStatus !== 'ALL') query.status = filters.userStatus;
    const page = await operationsServerGet<PageEnvelope<UserSummaryDto>>('/admin/users', query);

    const items: readonly AdminListItemView[] = page.items.map((user) => ({
      entity: 'user' as const,
      id: user.id,
      displayName: maskPhone(user.phone),
      maskedPhone: maskPhone(user.phone),
      role: (USER_ROLES as readonly string[]).includes(user.role)
        ? (user.role as (typeof USER_ROLES)[number])
        : 'CUSTOMER',
      status: toUserStatus(user.status),
      updatedAtLabel: formatDateTime(user.createdAt),
      exceptionLabel: null,
      availableCommands: [
        userStatusCommand({
          kind: user.status === 'DISABLED' ? 'ENABLE_USER' : 'DISABLE_USER',
          userId: user.id,
          role: user.role,
          maskedPhone: maskPhone(user.phone),
        }),
      ],
    }));

    const view: AdminListView = {
      scenarioId: `${SCENARIO_PREFIX}-USERS`,
      kind: 'list',
      entity: 'users',
      state: page.total === 0 ? 'no-results' : 'success',
      title: 'Người dùng',
      checkedAtLabel: formatDateTime(new Date().toISOString()),
      filters,
      result: {
        items,
        page: page.page,
        pageSize: page.pageSize,
        totalPages: page.totalPages,
        totalItems: page.total,
        filterSummary: describeFilters('Người dùng', filters, page.total),
        revision: new Date().toISOString(),
      },
      notice: null,
      dialogPreview: null,
    };
    return view;
  } catch (error) {
    return adminBoundaryFromError(error, 'USERS');
  }
}

async function loadFleetsList(filters: AdminListFilters): Promise<AdminRouteView> {
  try {
    const page = await operationsServerGet<PageEnvelope<FleetSummaryDto>>(
      '/admin/fleets',
      listQueryFromFilters(filters),
    );

    const items: readonly AdminListItemView[] = page.items.map((fleet) => ({
      entity: 'fleet' as const,
      id: fleet.id,
      displayId: fleet.id.slice(0, 8).toUpperCase(),
      displayName: fleet.name,
      ownerSummary: 'Chủ đội xe hiển thị qua membership trong pilot',
      activeMembershipCount: fleet.driversCount,
      driverCount: fleet.driversCount,
      orderCount: fleet.activeOrdersCount,
      membershipState: fleet.driversCount > 0 ? ('success' as const) : ('empty' as const),
      membershipMessage:
        fleet.driversCount > 0
          ? `${fleet.driversCount} tài xế đang tham gia`
          : 'Chưa có tài xế nào đang tham gia đội xe.',
      updatedAtLabel: formatDateTime(fleet.createdAt),
    }));

    const view: AdminListView = {
      scenarioId: `${SCENARIO_PREFIX}-FLEETS`,
      kind: 'list',
      entity: 'fleets',
      state: page.total === 0 ? 'no-results' : 'success',
      title: 'Đội xe',
      checkedAtLabel: formatDateTime(new Date().toISOString()),
      filters,
      result: {
        items,
        page: page.page,
        pageSize: page.pageSize,
        totalPages: page.totalPages,
        totalItems: page.total,
        filterSummary: describeFilters('Đội xe', filters, page.total),
        revision: new Date().toISOString(),
      },
      notice: null,
      dialogPreview: null,
    };
    return view;
  } catch (error) {
    return adminBoundaryFromError(error, 'FLEETS');
  }
}

async function loadDriversList(filters: AdminListFilters): Promise<AdminRouteView> {
  try {
    const query = listQueryFromFilters(filters);
    if (filters.userStatus !== 'ALL') query.status = filters.userStatus;
    const page = await operationsServerGet<PageEnvelope<DriverSummaryDto>>(
      '/admin/drivers',
      query,
    );

    const items: readonly AdminListItemView[] = page.items.map((driver) => {
      const membership = toMembershipStatus(driver.membershipStatus);
      return {
        entity: 'driver' as const,
        id: driver.id,
        displayName: maskPhone(driver.phone),
        maskedPhone: maskPhone(driver.phone),
        accountStatus: toUserStatus(driver.status),
        availability: toAvailability(driver.availability),
        membershipStatus: membership ?? ('REMOVED' as FleetMemberStatus),
        fleetLabel: driver.fleetName ?? 'Chưa thuộc đội xe',
        activeOrder: null,
        locationLabel:
          driver.lastKnownAt && Date.now() - new Date(driver.lastKnownAt).getTime() < 15 * 60000
            ? 'Vị trí mới ghi nhận'
            : driver.lastKnownAt
              ? 'Vị trí cũ'
              : 'Chưa có vị trí',
        locationUpdatedAtLabel: driver.lastKnownAt ? formatDateTime(driver.lastKnownAt) : '—',
        locationCondition:
          driver.lastKnownAt && Date.now() - new Date(driver.lastKnownAt).getTime() < 15 * 60000
            ? ('current' as const)
            : driver.lastKnownAt
              ? ('stale' as const)
              : ('unavailable' as const),
      };
    });

    const view: AdminListView = {
      scenarioId: `${SCENARIO_PREFIX}-DRIVERS`,
      kind: 'list',
      entity: 'drivers',
      state: page.total === 0 ? 'no-results' : 'success',
      title: 'Tài xế',
      checkedAtLabel: formatDateTime(new Date().toISOString()),
      filters,
      result: {
        items,
        page: page.page,
        pageSize: page.pageSize,
        totalPages: page.totalPages,
        totalItems: page.total,
        filterSummary: describeFilters('Tài xế', filters, page.total),
        revision: new Date().toISOString(),
      },
      notice: null,
      dialogPreview: null,
    };
    return view;
  } catch (error) {
    return adminBoundaryFromError(error, 'DRIVERS');
  }
}

async function loadOrdersList(filters: AdminListFilters): Promise<AdminRouteView> {
  try {
    const query = listQueryFromFilters(filters);
    if (filters.status !== 'ALL') query.status = filters.status;
    if (filters.driverId) query.driverId = filters.driverId;
    const page = await operationsServerGet<PageEnvelope<OrderSummaryDto>>(
      '/admin/orders',
      query,
    );

    const items: readonly AdminListItemView[] = page.items.map((order) => {
      const status = toOrderStatus(order.status);
      const signal = trackingSignal(order.updatedAt, status);
      return {
        entity: 'order' as const,
        id: order.id,
        reference: order.code || referenceOf(order.id),
        createdAtLabel: formatDateTime(order.createdAt),
        routeLabel:
          order.pickupLabel && order.dropoffLabel
            ? `${order.pickupLabel} → ${order.dropoffLabel}`
            : order.pickupLabel || order.dropoffLabel || 'Tuyến đường chưa có điểm dừng',
        customerLabel: maskPhone(order.customerPhone),
        driverLabel: order.driverName ? maskPhone(order.driverName) : 'Chưa có tài xế',
        status,
        trackingLabel: signal.label,
        trackingTone: signal.tone,
        paymentStatus: toPaymentStatus(order.paymentStatus),
        amountLabel: formatVnd(order.priceVnd),
        href: `/admin/orders/${order.id}`,
      };
    });

    const view: AdminListView = {
      scenarioId: `${SCENARIO_PREFIX}-ORDERS`,
      kind: 'list',
      entity: 'orders',
      state: page.total === 0 ? 'no-results' : 'success',
      title: 'Đơn hàng',
      checkedAtLabel: formatDateTime(new Date().toISOString()),
      filters,
      result: {
        items,
        page: page.page,
        pageSize: page.pageSize,
        totalPages: page.totalPages,
        totalItems: page.total,
        filterSummary: describeFilters('Đơn hàng', filters, page.total),
        revision: new Date().toISOString(),
      },
      notice: null,
      dialogPreview: null,
    };
    return view;
  } catch (error) {
    return adminBoundaryFromError(error, 'ORDERS');
  }
}

// ---------------------------------------------------------------------------
// Order detail
// ---------------------------------------------------------------------------

function routePoints(stops: readonly MappedStopDto[]): {
  origin: AdminRoutePointView;
  intermediate: readonly AdminRoutePointView[];
  destination: AdminRoutePointView;
} {
  const pickup = stops.find((stop) => stop.type === 'PICKUP');
  const dropoff = [...stops].reverse().find((stop) => stop.type === 'DROPOFF');
  const intermediate = stops.filter((stop) => stop.type === 'STOP');
  const fallback = pickup ?? dropoff ?? null;
  return {
    origin: {
      id: pickup?.id ?? 'origin-missing',
      label: pickup?.address ?? fallback?.address ?? 'Điểm lấy hàng chưa rõ',
      metadata: 'Điểm lấy hàng',
    },
    intermediate: intermediate.map((stop) => ({
      id: stop.id,
      label: stop.address,
      metadata: `Điểm dừng ${stop.sequence}`,
    })),
    destination: {
      id: dropoff?.id ?? 'destination-missing',
      label: dropoff?.address ?? fallback?.address ?? 'Điểm giao hàng chưa rõ',
      metadata: 'Điểm giao hàng',
    },
  };
}

function etaView(
  etaSeconds: number | null,
  providerSource: string | null,
): AdminOrderDetailDataView['eta'] {
  if (providerSource === 'DEMO') {
    const minutes = etaSeconds !== null ? Math.max(1, Math.round(etaSeconds / 60)) : null;
    return {
      label: minutes !== null ? `ETA dự kiến · ${minutes} phút` : 'ETA dự kiến · Chưa khả dụng',
      sourceLabel: 'Dữ liệu mô phỏng',
    };
  }
  const minutes = etaSeconds !== null ? Math.max(1, Math.round(etaSeconds / 60)) : null;
  return {
    label: minutes !== null ? `ETA dự kiến · ${minutes} phút` : 'ETA dự kiến · Chưa khả dụng',
    sourceLabel: providerSource ? `Nguồn: ${providerSource}` : 'Nguồn chưa xác định',
  };
}

async function loadOrderDetail(orderId: string): Promise<AdminRouteView> {
  try {
    const [order, payments] = await Promise.all([
      operationsServerGet<OrderDetailResponse>(`/orders/${orderId}`),
      operationsServerGet<readonly PaymentIntentDto[]>(`/orders/${orderId}/payments`).catch(
        () => [] as readonly PaymentIntentDto[],
      ),
    ]);

    const status = toOrderStatus(order.status);
    const route = routePoints(order.stops ?? []);
    const latestPayment = payments[0] ?? null;
    const paymentStatus = latestPayment
      ? toPaymentStatus(latestPayment.status)
      : toPaymentStatus('UNPAID');

    const history = [...(order.statusHistory ?? [])]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((entry, index, all) => ({
        id: entry.id,
        label: ORDER_STATUS_LABEL[toOrderStatus(entry.toStatus)],
        description: entry.reason ?? '',
        timestampLabel: formatDateTime(entry.createdAt),
        dateTime: entry.createdAt,
        isCurrent: index === all.length - 1,
      }));

    const trackingFreshness = trackingSignal(order.updatedAt, status);
    const dataView: AdminOrderDetailDataView = {
      id: order.id,
      reference: referenceOf(order.id),
      status,
      customerLabel: maskPhone(order.customerPhone),
      driverLabel: order.driverPhone ? maskPhone(order.driverPhone) : 'Chưa có tài xế',
      updatedAtLabel: formatDateTime(order.updatedAt),
      cargoSummary:
        order.priceVnd !== null
          ? `Giá trị đơn ${formatVnd(order.priceVnd)}`
          : 'Giá trị đơn chưa được tính',
      route: {
        origin: route.origin,
        stops: route.intermediate,
        destination: route.destination,
      },
      eta: etaView(order.etaSeconds, order.providerSource),
      tracking: {
        state:
          trackingFreshness.tone === 'neutral'
            ? 'no-location'
            : trackingFreshness.tone === 'warning'
              ? 'stale'
              : 'route',
        statusLabel: trackingFreshness.label,
        lastUpdatedLabel: formatDateTime(order.updatedAt),
        mapAlternative:
          'Sơ đồ tuyến dưới đây thể hiện thứ tự điểm dừng; bản đồ trực tiếp chưa có trong phạm vi pilot.',
      },
      history,
      media: {
        state: 'empty',
        message: 'Danh sách media của đơn chưa có endpoint tổng hợp trong API pilot.',
        items: [],
      },
      payment: {
        id: latestPayment?.id ?? '',
        status: paymentStatus,
        amountLabel: latestPayment ? formatVnd(latestPayment.amountVnd) : '—',
        sourceLabel: latestPayment?.provider ? `Nguồn: ${latestPayment.provider}` : '—',
        referenceLabel: latestPayment?.providerReference ?? '—',
        expiresAtLabel: latestPayment?.expiresAt ? formatDateTime(latestPayment.expiresAt) : null,
      },
    };

    const availableCommands: readonly AdminCommandView[] = [
      ...(NON_TERMINAL_ORDER_STATUSES.includes(status) &&
      status !== 'REQUESTED'
        ? [cancelOrderCommand(dataView)]
        : []),
      ...(latestPayment && latestPayment.status !== 'PAID_MANUAL'
        ? [confirmPaymentCommand(dataView, latestPayment.id)]
        : []),
    ];

    const view: AdminOrderDetailView = {
      scenarioId: `${SCENARIO_PREFIX}-ORDER-DETAIL`,
      kind: 'order-detail',
      order: dataView,
      audit: {
        state: 'empty',
        message: 'Audit rail cần endpoint audit riêng; chưa có trong API pilot.',
        entries: [],
      },
      availableCommands,
      dialogPreview: null,
      notice: null,
    };
    return view;
  } catch (error) {
    return adminBoundaryFromError(error, 'ORDER-DETAIL');
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function loadAdminRuntimeView(
  screen: AdminPreviewScreen,
  options: {
    readonly orderId?: string | null | undefined;
    readonly filters?: AdminListFilters | undefined;
  } = {},
): Promise<AdminRouteView> {
  if (screen === 'overview') return loadAdminRuntimeOverview();
  if (screen === 'order-detail') {
    if (!options.orderId) {
      return boundary(
        'ORDER-DETAIL',
        'error',
        'Mã đơn không hợp lệ',
        'Đường dẫn không chứa UUID hợp lệ. Không có dữ liệu đơn nào được tải.',
      );
    }
    return loadOrderDetail(options.orderId);
  }
  const filters =
    options.filters ??
    ({
      status: 'ALL',
      role: 'ALL',
      userStatus: 'ALL',
      availability: 'ALL',
      membershipStatus: 'ALL',
      fleetId: '',
      customerId: '',
      driverId: '',
      from: '',
      to: '',
      sort: 'updated-desc',
      page: 1,
      pageSize: 20,
    } as const satisfies AdminListFilters);
  if (screen === 'users') return loadUsersList(filters);
  if (screen === 'fleets') return loadFleetsList(filters);
  if (screen === 'drivers') return loadDriversList(filters);
  return loadOrdersList(filters);
}
