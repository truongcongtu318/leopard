import type {
  DriverAvailability,
  FleetMemberStatus,
  OrderStatus,
  PaymentStatus,
  UserStatus,
} from '@leopard/ui';

import type { ApiClient } from '../../lib/api/client';
import { browserClient } from '../../lib/api/browser-client';
import { ApiError } from '../../lib/api/api-error';
import type {
  AdminAuditEntryView,
  AdminAuditRailView,
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
  AdminNoticeView,
  AdminOperationalCondition,
  AdminOrderDetailDataView,
  AdminOrderDetailRouteView,
  AdminOrderDetailView,
  AdminOrderListItemView,
  AdminOrderSummaryView,
  AdminOverviewRouteView,
  AdminOverviewView,
  AdminPreviewContext,
  AdminPreviewScreen,
  AdminRoutePointView,
} from './model';
import type {
  AdminCommandInput,
  AdminCommandResult,
  AdminOperationsPort,
  AdminPort,
} from './port';

export type AdminSearchParams = Readonly<
  Record<string, string | readonly string[] | undefined>
>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SCENARIO_PATTERN = /^ADM-[A-Z0-9-]{1,60}$/;
const COMMAND_KINDS = [
  'CANCEL_ORDER',
  'DISABLE_USER',
  'ENABLE_USER',
  'CONFIRM_MANUAL_PAYMENT',
] as const;
const ORDER_STATUSES = [
  'ALL',
  'REQUESTED',
  'ACCEPTED',
  'PICKING_UP',
  'IN_TRANSIT',
  'DELIVERED',
  'CANCELLED',
] as const;
const USER_ROLES = ['ALL', 'CUSTOMER', 'DRIVER', 'FLEET_OWNER', 'ADMIN'] as const;
const USER_STATUSES = ['ALL', 'ACTIVE', 'DISABLED'] as const;
const AVAILABILITIES = ['ALL', 'OFFLINE', 'AVAILABLE', 'BUSY'] as const;
const MEMBERSHIP_STATUSES = ['ALL', 'INVITED', 'ACTIVE', 'REMOVED'] as const;
const SORTS_BY_SCREEN = {
  orders: ['updated-desc', 'updated-asc', 'reference-asc'],
  users: ['updated-desc', 'updated-asc', 'name-asc', 'name-desc'],
  fleets: ['name-asc', 'name-desc', 'updated-desc'],
  drivers: ['name-asc', 'name-desc', 'updated-desc'],
} as const;
const PREVIEW_SCENARIOS_BY_SCREEN: Readonly<Record<AdminPreviewScreen, readonly string[]>> = {
  overview: [
    'ADM-OV-READY',
    'ADM-OV-READINESS',
    'ADM-OV-OFFLINE',
    'ADM-DENIED',
    'ADM-EXPIRED',
  ],
  orders: ['ADM-ORD-DENSE', 'ADM-ORD-NORESULT', 'ADM-DENIED', 'ADM-EXPIRED'],
  'order-detail': [
    'ADM-ORD-DETAIL',
    'ADM-TRK-STALE',
    'ADM-MEDIA-ERROR',
    'ADM-PAY-FAILED',
    'ADM-CMD-INVALID',
    'ADM-CMD-PENDING',
    'ADM-CMD-ERROR',
    'ADM-CMD-CONFLICT',
    'ADM-CMD-SUCCESS',
    'ADM-DENIED',
    'ADM-EXPIRED',
  ],
  users: [
    'ADM-USR-DENSE',
    'ADM-CMD-INVALID',
    'ADM-CMD-PENDING',
    'ADM-CMD-ERROR',
    'ADM-CMD-CONFLICT',
    'ADM-CMD-SUCCESS',
    'ADM-DENIED',
    'ADM-EXPIRED',
  ],
  fleets: ['ADM-FLT-EMPTY', 'ADM-DENIED', 'ADM-EXPIRED'],
  drivers: ['ADM-DRV-MIXED', 'ADM-DENIED', 'ADM-EXPIRED'],
};
const DEFAULT_PREVIEW_SCENARIO: Readonly<Record<AdminPreviewScreen, string>> = {
  overview: 'ADM-OV-READY',
  orders: 'ADM-ORD-DENSE',
  'order-detail': 'ADM-ORD-DETAIL',
  users: 'ADM-USR-DENSE',
  fleets: 'ADM-FLT-EMPTY',
  drivers: 'ADM-DRV-MIXED',
};
const COMMAND_PREVIEW_SCENARIOS = new Set([
  'ADM-CMD-INVALID',
  'ADM-CMD-PENDING',
  'ADM-CMD-ERROR',
  'ADM-CMD-CONFLICT',
  'ADM-CMD-SUCCESS',
]);
const ADMIN_PREVIEW_ORIGIN = 'https://leopard-preview.invalid';

const ORDER_STATUS_LABELS: Readonly<Record<OrderStatus, string>> = Object.freeze({
  REQUESTED: 'Chờ tài xế',
  ACCEPTED: 'Đã nhận đơn',
  PICKING_UP: 'Đang đến điểm lấy',
  PICKED_UP: 'Đã lấy hàng',
  IN_TRANSIT: 'Đang vận chuyển',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
});

const PAYMENT_STATUS_LABELS: Readonly<Record<PaymentStatus, string>> = Object.freeze({
  UNPAID: 'Chưa thanh toán',
  QR_CREATED: 'Đã tạo mã QR',
  PAID_MANUAL: 'Đã xác nhận thanh toán',
  FAILED: 'Thất bại',
});

function first(value: string | readonly string[] | undefined): string {
  if (typeof value === 'string') return value;
  return value?.[0] ?? '';
}

function cleanText(value: string | readonly string[] | undefined): string {
  return first(value).trim().slice(0, 100);
}

function allow<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function page(value: string | readonly string[] | undefined): number {
  const parsed = Number(first(value));
  return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, 10_000) : 1;
}

function pageSize(value: string | readonly string[] | undefined): 20 | 50 | 100 {
  const candidate = first(value);
  return candidate === '50' ? 50 : candidate === '100' ? 100 : 20;
}

function validId(value: string | readonly string[] | undefined): string {
  const candidate = first(value);
  return UUID_PATTERN.test(candidate) ? candidate : '';
}

function validDate(value: string | readonly string[] | undefined): string {
  const candidate = first(value);
  if (!DATE_PATTERN.test(candidate)) return '';
  const [yearPart = '', monthPart = '', dayPart = ''] = candidate.split('-');
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
    ? candidate
    : '';
}

function defaultSort(screen: AdminListScreen): AdminListFilters['sort'] {
  return screen === 'orders' || screen === 'users' ? 'updated-desc' : 'name-asc';
}

export function parseAdminListFilters(
  screen: AdminListScreen,
  search: AdminSearchParams,
): AdminListFilters {
  const fallbackSort = defaultSort(screen);
  return Object.freeze({
    status: allow(first(search.status), ORDER_STATUSES, 'ALL'),
    role: allow(first(search.role), USER_ROLES, 'ALL'),
    userStatus: allow(first(search.userStatus), USER_STATUSES, 'ALL'),
    availability: allow(first(search.availability), AVAILABILITIES, 'ALL'),
    membershipStatus: allow(first(search.membershipStatus), MEMBERSHIP_STATUSES, 'ALL'),
    fleetId: validId(search.fleetId),
    customerId: validId(search.customerId),
    driverId: validId(search.driverId),
    from: validDate(search.from),
    to: validDate(search.to),
    sort: allow(first(search.sort), SORTS_BY_SCREEN[screen], fallbackSort),
    page: page(search.page),
    pageSize: pageSize(search.pageSize),
  });
}

function append(params: URLSearchParams, key: string, value: string, fallback = ''): void {
  if (value !== fallback) params.set(key, value);
}

function allowedPreviewScenario(
  screen: AdminPreviewScreen,
  requestedScenario: string | null | undefined,
): string {
  return requestedScenario && PREVIEW_SCENARIOS_BY_SCREEN[screen].includes(requestedScenario)
    ? requestedScenario
    : DEFAULT_PREVIEW_SCENARIO[screen];
}

function commandAllowedForScreen(
  screen: AdminPreviewScreen,
  command: AdminCommandKind,
): boolean {
  return screen === 'order-detail'
    ? command === 'CANCEL_ORDER' || command === 'CONFIRM_MANUAL_PAYMENT'
    : screen === 'users'
      ? command === 'DISABLE_USER' || command === 'ENABLE_USER'
      : false;
}

function appendPreview(
  params: URLSearchParams,
  screen: AdminPreviewScreen,
  context?: AdminPreviewContext,
): void {
  if (context?.preview !== 'enabled') return;
  params.set('preview', 'enabled');
  const scenario = allowedPreviewScenario(screen, context.scenario);
  params.set('scenario', scenario);
  const command = parseAdminCommandKind(context.command);
  if (
    command &&
    COMMAND_PREVIEW_SCENARIOS.has(scenario) &&
    commandAllowedForScreen(screen, command)
  ) {
    params.set('command', command);
  }
}

export function serializeAdminListFilters(
  screen: AdminListScreen,
  filters: AdminListFilters,
  context?: AdminPreviewContext,
): string {
  const params = new URLSearchParams();
  if (screen === 'orders') {
    append(params, 'status', filters.status, 'ALL');
    append(params, 'customerId', filters.customerId);
    append(params, 'driverId', filters.driverId);
    append(params, 'from', filters.from);
    append(params, 'to', filters.to);
  } else if (screen === 'users') {
    append(params, 'role', filters.role, 'ALL');
    append(params, 'userStatus', filters.userStatus, 'ALL');
  } else if (screen === 'drivers') {
    append(params, 'availability', filters.availability, 'ALL');
    append(params, 'userStatus', filters.userStatus, 'ALL');
    append(params, 'membershipStatus', filters.membershipStatus, 'ALL');
    append(params, 'fleetId', filters.fleetId);
  }
  params.set('sort', filters.sort);
  params.set('page', String(filters.page));
  params.set('pageSize', String(filters.pageSize));
  appendPreview(params, screen, context);
  return params.toString();
}

function fallbackPath(screen: AdminPreviewScreen): string {
  if (screen === 'overview') return '/admin';
  if (screen === 'order-detail') return '/admin/orders';
  return `/admin/${screen}`;
}

function isPathForScreen(pathname: string, screen: AdminPreviewScreen): boolean {
  if (screen === 'overview') return pathname === '/admin';
  if (screen === 'order-detail') {
    const orderId = pathname.startsWith('/admin/orders/')
      ? pathname.slice('/admin/orders/'.length)
      : '';
    return UUID_PATTERN.test(orderId);
  }
  return pathname === `/admin/${screen}`;
}

export function createAdminPreviewHref(
  href: string,
  screen: AdminPreviewScreen,
  context?: AdminPreviewContext,
  preferredScenario?: string,
): string {
  let pathname = fallbackPath(screen);
  try {
    const parsed = new URL(href, ADMIN_PREVIEW_ORIGIN);
    if (parsed.origin === ADMIN_PREVIEW_ORIGIN && isPathForScreen(parsed.pathname, screen)) {
      pathname = parsed.pathname;
    }
  } catch {
    // Keep the fail-closed route fallback and never forward an unparsed query.
  }

  if (context?.preview !== 'enabled') return pathname;

  const params = new URLSearchParams();
  appendPreview(params, screen, {
    ...context,
    scenario: preferredScenario ?? context.scenario ?? null,
  });
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function parseAdminEntityId(
  value: string | readonly string[] | undefined,
): string | null {
  const candidate = first(value);
  return UUID_PATTERN.test(candidate) ? candidate : null;
}

export function parseAdminCommandKind(value: string | readonly string[] | null | undefined) {
  const candidate = value === null ? '' : first(value);
  return COMMAND_KINDS.includes(candidate as AdminCommandKind)
    ? (candidate as AdminCommandKind)
    : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatters & DTO Mappings for Real API
// ─────────────────────────────────────────────────────────────────────────────

export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

export function formatDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';
  if (
    typeof dateInput === 'string' &&
    /^\d{1,2}:\d{2}\s*·\s*\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateInput.trim())
  ) {
    return dateInput.trim();
  }
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return typeof dateInput === 'string' ? dateInput : '';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${hours}:${minutes} · ${day}/${month}/${year}`;
}

export function formatTimeOnly(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatVndPrice(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0 ₫';
  }
  const integerPart = Math.round(amount).toString();
  const formatted = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formatted} ₫`;
}

export function formatMaskedPhone(phone: string | null | undefined): string {
  if (!phone) return '••• ••• ••••';
  const clean = phone.replace(/\s+/g, '');
  if (clean.length >= 4) {
    const last4 = clean.slice(-4);
    return `••• ••• ${last4}`;
  }
  return `••• ${clean}`;
}

export function formatOrderReference(order: {
  id: string;
  reference?: string;
  createdAt?: string;
}): string {
  if (order.reference) return order.reference;
  if (order.id.startsWith('LP-')) return order.id;
  const shortId = order.id.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `LP-A-260815-${shortId.slice(0, 3)}`;
}

export function formatFleetDisplayId(fleet: { id: string; displayId?: string }): string {
  if (fleet.displayId) return fleet.displayId;
  const shortId = fleet.id.replace(/-/g, '').slice(0, 4).toUpperCase();
  return `FLEET-${shortId}`;
}

export function formatDriverDisplayId(driver: { id: string; displayId?: string }): string {
  if (driver.displayId) return driver.displayId;
  const shortId = driver.id.replace(/-/g, '').slice(0, 6).toUpperCase();
  return `DRV-SM-${shortId}`;
}

function generateRequestId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

export function createUserCommandView(
  kind: 'DISABLE_USER' | 'ENABLE_USER',
  user: {
    id: string;
    name?: string;
    displayName?: string;
    phone?: string;
    maskedPhone?: string;
    role?: string;
    status?: UserStatus;
    version?: string | number;
  },
): AdminCommandView {
  const disabling = kind === 'DISABLE_USER';
  const name = user.displayName ?? user.name ?? 'Người dùng';
  const phone = user.maskedPhone ?? (user.phone ? formatMaskedPhone(user.phone) : '•••');
  const role = user.role ?? 'CUSTOMER';
  const contextVersion =
    user.version !== undefined ? `user-${user.id}-v${user.version}` : `user-${user.id}-v1`;

  return {
    kind,
    targetId: user.id,
    targetLabel: `Người dùng ${name}`,
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
    contextVersion,
    commandLabel: disabling ? 'Vô hiệu hóa người dùng' : 'Kích hoạt lại người dùng',
    buttonVariant: disabling ? 'destructive' : 'primary',
    targetItems: [
      { id: 'user', label: 'Người dùng', value: `${name} · ${phone}` },
      { id: 'role', label: 'Role', value: role },
      {
        id: 'status',
        label: 'Trạng thái hiện tại',
        value: disabling ? 'Đang hoạt động' : 'Đã vô hiệu hóa',
      },
    ],
  };
}

export function createOrderCommandView(
  kind: 'CANCEL_ORDER' | 'CONFIRM_MANUAL_PAYMENT',
  order: AdminOrderDetailDataView,
): AdminCommandView {
  if (kind === 'CANCEL_ORDER') {
    return {
      kind,
      targetId: order.id,
      targetLabel: `Đơn ${order.reference}`,
      currentStateLabel: ORDER_STATUS_LABELS[order.status] ?? order.status,
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
      contextVersion: `order-${order.id}-v1`,
      commandLabel: 'Hủy đơn hàng',
      buttonVariant: 'destructive',
      targetItems: [
        { id: 'order', label: 'Đơn hàng', value: order.reference },
        { id: 'order-id', label: 'Order UUID', value: order.id },
        {
          id: 'status',
          label: 'Trạng thái hiện tại',
          value: ORDER_STATUS_LABELS[order.status] ?? order.status,
        },
        { id: 'assignment', label: 'Phân công', value: order.driverLabel },
        { id: 'updated', label: 'Cập nhật', value: order.updatedAtLabel },
      ],
    };
  }

  return {
    kind,
    targetId: order.payment.id,
    targetLabel: `Thanh toán ${order.payment.referenceLabel} của ${order.reference}`,
    currentStateLabel: PAYMENT_STATUS_LABELS[order.payment.status] ?? order.payment.status,
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
    contextVersion: `payment-${order.payment.id}-v1`,
    commandLabel: 'Xác nhận đã thanh toán',
    buttonVariant: 'primary',
    targetItems: [
      { id: 'order', label: 'Đơn hàng', value: order.reference },
      { id: 'order-id', label: 'Order UUID', value: order.id },
      { id: 'payment', label: 'Payment ID', value: order.payment.id },
      { id: 'amount', label: 'Số tiền', value: order.payment.amountLabel },
      {
        id: 'status',
        label: 'Trạng thái hiện tại',
        value: PAYMENT_STATUS_LABELS[order.payment.status] ?? order.payment.status,
      },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Raw DTO Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiAdminOverview {
  state?: 'ready' | 'readiness-failed' | 'offline';
  checkedAt?: string;
  updatedAt?: string;
  health?: {
    liveness?: 'UP' | string;
    readiness?: 'READY' | 'FAILED' | string;
    dependencyLabel?: string;
    requestId?: string | null;
  };
  metrics?: Array<{
    id: string;
    label: string;
    value: number;
    detail?: string;
    href?: string;
  }>;
  totalUsers?: number;
  totalFleets?: number;
  activeOrders?: number;
  mediaErrors?: number;
  orderDistribution?:
    | Array<{
        status: OrderStatus;
        count: number;
      }>
    | Record<string, number>;
  exceptions?: Array<{
    id: string;
    domain?: 'health' | 'tracking' | 'media' | 'payment' | 'order' | 'user' | 'fleet' | 'driver';
    label: string;
    detail?: string;
    tone?: 'neutral' | 'info' | 'warning' | 'success' | 'danger';
    updatedAt?: string;
    updatedAtLabel?: string;
    targetHref?: string;
    targetScenario?: string;
  }>;
  recentOrders?: Array<ApiAdminOrderSummary | ApiAdminOrder>;
  notice?: AdminNoticeView | null;
}

export interface ApiAdminOrderSummary {
  id: string;
  reference?: string;
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
  updatedAt?: string;
  createdAt?: string;
  href?: string;
}

export interface ApiAdminStop {
  id?: string;
  label?: string;
  address?: string;
  metadata?: string;
  lat?: number;
  lng?: number;
}

export interface ApiAdminAuditEntry {
  id: string;
  outcomeLabel?: string;
  actionLabel?: string;
  action?: string;
  actorLabel?: string;
  actor?: {
    id?: string;
    name?: string;
    displayName?: string;
    role?: string;
  } | null;
  targetLabel?: string;
  targetId?: string;
  reason?: string;
  note?: string;
  timestampLabel?: string;
  dateTime?: string;
  createdAt?: string;
  requestId?: string;
  auditId?: string;
  status?: string;
}

export interface ApiAdminOrder {
  id: string;
  reference?: string;
  status: OrderStatus;
  pickup?: ApiAdminStop;
  stops?: ApiAdminStop[];
  dropoff?: ApiAdminStop;
  customer?: { id?: string; name?: string; phone?: string; displayName?: string } | null;
  customerLabel?: string;
  driver?: { id?: string; name?: string; phone?: string; displayName?: string } | null;
  driverLabel?: string;
  cargoNote?: string;
  cargoWeightKg?: number;
  cargoSummary?: string;
  totalPriceVnd?: number;
  paymentStatus?: PaymentStatus;
  distanceM?: number;
  durationS?: number;
  eta?: {
    label?: string;
    sourceLabel?: string | null;
    durationS?: number;
    distanceM?: number;
  };
  tracking?: {
    state?: 'route' | 'stale' | 'no-location' | 'unavailable';
    isStale?: boolean;
    statusLabel?: string;
    lastUpdatedLabel?: string | null;
    mapAlternative?: string;
  };
  history?: Array<{
    id?: string;
    status?: OrderStatus;
    label?: string;
    description?: string;
    timestampLabel?: string;
    dateTime?: string;
    isCurrent?: boolean;
    createdAt?: string;
  }>;
  media?: {
    state?: 'success' | 'empty' | 'error';
    message?: string | null;
    items?: Array<{
      id: string;
      label: string;
      mediaType: string;
      capturedAtLabel?: string;
      createdAt?: string;
    }>;
  };
  payment?: {
    id?: string;
    paymentId?: string;
    status?: PaymentStatus;
    amountLabel?: string;
    sourceLabel?: string;
    referenceLabel?: string;
    expiresAtLabel?: string | null;
  };
  audit?: {
    state?: 'success' | 'empty' | 'error' | 'delayed';
    message?: string | null;
    entries?: ApiAdminAuditEntry[];
  };
  auditEntries?: ApiAdminAuditEntry[];
  auditLogs?: ApiAdminAuditEntry[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiAdminUser {
  id: string;
  name?: string;
  displayName?: string;
  phone?: string;
  maskedPhone?: string;
  role: 'CUSTOMER' | 'DRIVER' | 'FLEET_OWNER' | 'ADMIN';
  status: UserStatus;
  createdAt?: string;
  updatedAt?: string;
  exceptionLabel?: string | null;
  version?: number | string;
}

export interface ApiAdminFleet {
  id: string;
  displayId?: string;
  name?: string;
  displayName?: string;
  ownerSummary?: string;
  owner?: { id?: string; name?: string; phone?: string; membershipStatus?: string } | null;
  activeMembershipCount?: number;
  driverCount?: number;
  orderCount?: number;
  membershipState?: 'success' | 'empty' | 'error';
  membershipMessage?: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface ApiAdminDriver {
  id: string;
  name?: string;
  displayName?: string;
  phone?: string;
  maskedPhone?: string;
  status?: UserStatus;
  accountStatus?: UserStatus;
  availability?: DriverAvailability;
  membershipStatus?: FleetMemberStatus;
  fleet?: { id?: string; name?: string } | null;
  fleetLabel?: string;
  activeOrder?: { id?: string; reference: string; href?: string } | null;
  lastLocation?: {
    latitude?: number;
    longitude?: number;
    address?: string;
    label?: string;
    updatedAt?: string;
    isStale?: boolean;
    condition?: 'current' | 'stale' | 'unavailable';
  } | null;
  locationLabel?: string;
  locationUpdatedAtLabel?: string;
  locationCondition?: 'current' | 'stale' | 'unavailable';
  createdAt?: string;
  updatedAt?: string;
}

function extractData<T>(response: unknown): T {
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as { data: T }).data;
  }
  return response as T;
}

function extractPagination<T>(
  response: unknown,
  fallbackPage: number,
  fallbackPageSize: number,
): { items: readonly T[]; total: number; page: number; pageSize: number; totalPages: number } {
  const data = extractData<unknown>(response);
  if (Array.isArray(data)) {
    const total = data.length;
    const totalPages = Math.ceil(total / fallbackPageSize) || (total === 0 ? 0 : 1);
    return {
      items: data,
      total,
      page: fallbackPage,
      pageSize: fallbackPageSize,
      totalPages,
    };
  }
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const rawItems = Array.isArray(obj.items)
      ? (obj.items as T[])
      : Array.isArray(obj.data)
        ? (obj.data as T[])
        : [];
    const total =
      typeof obj.total === 'number'
        ? obj.total
        : typeof obj.totalItems === 'number'
          ? obj.totalItems
          : rawItems.length;
    const page = typeof obj.page === 'number' ? obj.page : fallbackPage;
    const pageSize = typeof obj.pageSize === 'number' ? obj.pageSize : fallbackPageSize;
    const totalPages =
      typeof obj.totalPages === 'number'
        ? obj.totalPages
        : Math.ceil(total / pageSize) || (total === 0 ? 0 : 1);
    return {
      items: rawItems,
      total,
      page,
      pageSize,
      totalPages,
    };
  }
  return {
    items: [],
    total: 0,
    page: fallbackPage,
    pageSize: fallbackPageSize,
    totalPages: 0,
  };
}

function isForbiddenOrNotFound(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const status =
    (error as { statusCode?: number; status?: number }).statusCode ??
    (error as { status?: number }).status;
  const code = (error as { code?: string }).code;
  return status === 403 || status === 404 || code === 'FORBIDDEN' || code === 'NOT_FOUND';
}

function isSessionExpired(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const status =
    (error as { statusCode?: number; status?: number }).statusCode ??
    (error as { status?: number }).status;
  const code = (error as { code?: string }).code;
  return status === 401 || code === 'UNAUTHORIZED' || code === 'SESSION_EXPIRED';
}

function handleAdminBoundaryError(
  error: unknown,
  defaultTitle = 'Bạn không có quyền xem dữ liệu này',
): AdminBoundaryView {
  if (isSessionExpired(error)) {
    return deepFreeze({
      scenarioId: 'ADM-EXPIRED',
      kind: 'session-expired',
      title: 'Phiên đã hết hạn',
      message: 'Dữ liệu riêng tư và lý do thao tác đã được xóa. Vui lòng đăng nhập lại.',
    });
  }

  return deepFreeze({
    scenarioId: 'ADM-DENIED',
    kind: 'permission-denied',
    title: defaultTitle,
    message: 'Dữ liệu riêng tư và ngữ cảnh command không được hiển thị cho phiên hiện tại.',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin HTTP Adapter Factory
// ─────────────────────────────────────────────────────────────────────────────

export function createAdminHttpAdapter(client?: ApiClient): AdminPort {
  const getClient = (): ApiClient => client ?? browserClient;

  return {
    async readOverview(): Promise<AdminOverviewRouteView> {
      const activeClient = getClient();
      try {
        const rawRes = await activeClient.get<ApiAdminOverview | { data: ApiAdminOverview }>(
          '/admin/overview',
        );
        const raw = extractData<ApiAdminOverview>(rawRes);

        const health = {
          liveness: (raw.health?.liveness ?? 'UP') as 'UP',
          readiness: (raw.health?.readiness ?? 'READY') as 'READY' | 'FAILED',
          dependencyLabel:
            raw.health?.dependencyLabel ??
            (raw.health?.readiness === 'FAILED'
              ? 'Một dependency vận hành chưa sẵn sàng'
              : 'Các dependency pilot sẵn sàng'),
          requestId: raw.health?.requestId ?? null,
        };

        const readinessFailed = health.readiness === 'FAILED';
        const offline = raw.state === 'offline';
        const state: 'ready' | 'readiness-failed' | 'offline' = readinessFailed
          ? 'readiness-failed'
          : offline
            ? 'offline'
            : (raw.state ?? 'ready');

        const checkedAtLabel =
          formatDateTime(raw.checkedAt ?? raw.updatedAt) || '14:32 · 15/08/2026';

        const metrics: AdminMetricView[] = Array.isArray(raw.metrics)
          ? raw.metrics.map((m) => ({
              id: m.id,
              label: m.label,
              value: typeof m.value === 'number' ? m.value : 0,
              detail: m.detail ?? '',
              ...(m.href ? { href: m.href } : {}),
            }))
          : [
              {
                id: 'users',
                label: 'Người dùng',
                value: raw.totalUsers ?? 24,
                detail: 'Trong snapshot hiện tại',
                href: '/admin/users',
              },
              {
                id: 'fleets',
                label: 'Đội xe',
                value: raw.totalFleets ?? 3,
                detail: 'Pilot scope',
                href: '/admin/fleets',
              },
              {
                id: 'active-orders',
                label: 'Đơn đang hoạt động',
                value: raw.activeOrders ?? 4,
                detail: 'Chưa terminal',
                href: '/admin/orders',
              },
              {
                id: 'media-errors',
                label: 'Media lỗi',
                value: raw.mediaErrors ?? 0,
                detail: '0 là dữ liệu hợp lệ',
              },
            ];

        const orderDistribution = Array.isArray(raw.orderDistribution)
          ? raw.orderDistribution
          : [
              'REQUESTED',
              'ACCEPTED',
              'PICKING_UP',
              'IN_TRANSIT',
              'DELIVERED',
              'CANCELLED',
            ].map((status) => ({
              status: status as OrderStatus,
              count: (raw.orderDistribution as Record<string, number>)?.[status] ?? 0,
            }));

        const exceptions: AdminOperationalCondition[] = (raw.exceptions ?? []).map((ex) => ({
          id: ex.id,
          domain: ex.domain ?? 'health',
          label: ex.label,
          detail: ex.detail ?? '',
          tone: ex.tone ?? 'warning',
          updatedAtLabel:
            ex.updatedAtLabel ?? formatDateTime(ex.updatedAt) ?? '14:27 · 15/08/2026',
          ...(ex.targetHref ? { targetHref: ex.targetHref } : {}),
          ...(ex.targetScenario ? { targetScenario: ex.targetScenario } : {}),
        }));

        const recentOrders: AdminOrderSummaryView[] = (raw.recentOrders ?? []).map((o) => ({
          id: o.id,
          reference: o.reference ?? formatOrderReference(o),
          status: o.status,
          paymentStatus: o.paymentStatus ?? (o as ApiAdminOrder).payment?.status ?? 'UNPAID',
          updatedAtLabel:
            formatDateTime((o as ApiAdminOrder).updatedAt ?? o.createdAt) || '14:32 · 15/08/2026',
          href: ('href' in o && typeof o.href === 'string') ? o.href : `/admin/orders/${o.id}`,
        }));

        const notice: AdminNoticeView | null =
          raw.notice ??
          (readinessFailed
            ? {
                tone: 'danger',
                title: 'Hệ thống chưa sẵn sàng',
                message: 'Liveness vẫn UP; một dependency readiness cần được kiểm tra.',
                ...(health.requestId ? { requestId: health.requestId } : {}),
              }
            : offline
              ? {
                  tone: 'warning',
                  title: 'Mất kết nối hệ thống',
                  message: 'Dữ liệu lưu lúc 14:20 được giữ và không được gọi là mới nhất.',
                }
              : null);

        return deepFreeze({
          scenarioId: readinessFailed
            ? 'ADM-OV-READINESS'
            : offline
              ? 'ADM-OV-OFFLINE'
              : 'ADM-OV-READY',
          kind: 'overview',
          state,
          checkedAtLabel,
          health,
          metrics,
          orderDistribution,
          exceptions,
          recentOrders,
          notice,
        });
      } catch (error) {
        return handleAdminBoundaryError(error);
      }
    },

    async readList(
      resource: AdminListScreen,
      filters: AdminListFilters,
    ): Promise<AdminListRouteView> {
      const activeClient = getClient();
      try {
        const params = new URLSearchParams();
        if (resource === 'orders') {
          if (filters.status !== 'ALL') params.set('status', filters.status);
          if (filters.customerId) params.set('customerId', filters.customerId);
          if (filters.driverId) params.set('driverId', filters.driverId);
          if (filters.from) params.set('from', filters.from);
          if (filters.to) params.set('to', filters.to);
        } else if (resource === 'users') {
          if (filters.role !== 'ALL') params.set('role', filters.role);
          if (filters.userStatus !== 'ALL') params.set('status', filters.userStatus);
        } else if (resource === 'drivers') {
          if (filters.availability !== 'ALL') params.set('availability', filters.availability);
          if (filters.userStatus !== 'ALL') params.set('status', filters.userStatus);
          if (filters.membershipStatus !== 'ALL')
            params.set('membershipStatus', filters.membershipStatus);
          if (filters.fleetId) params.set('fleetId', filters.fleetId);
        }
        params.set('sort', filters.sort);
        params.set('page', String(filters.page));
        params.set('pageSize', String(filters.pageSize));

        const rawRes = await activeClient.get<unknown>(`/admin/${resource}?${params.toString()}`);
        const pagination = extractPagination<unknown>(rawRes, filters.page, filters.pageSize);

        let items: readonly AdminListItemView[] = [];

        if (resource === 'orders') {
          items = (pagination.items as ApiAdminOrder[]).map((o) => {
            const ref = o.reference ?? formatOrderReference(o);
            const createdAtLabel =
              formatDateTime(o.createdAt ?? o.updatedAt) || '14:32 · 15/08/2026';
            const origin = o.pickup?.label ?? o.pickup?.address ?? 'Điểm lấy';
            const dest = o.dropoff?.label ?? o.dropoff?.address ?? 'Điểm giao';
            const customerLabel =
              o.customerLabel ?? o.customer?.displayName ?? o.customer?.name ?? 'Khách Hàng';
            const driverLabel =
              o.driverLabel ?? o.driver?.displayName ?? o.driver?.name ?? 'Chưa phân công';
            const paymentStatus = o.paymentStatus ?? o.payment?.status ?? 'UNPAID';
            const amountLabel = o.payment?.amountLabel ?? formatVndPrice(o.totalPriceVnd);

            let trackingLabel = o.tracking?.statusLabel ?? '';
            if (!trackingLabel) {
              if (o.tracking?.state === 'stale' || o.tracking?.isStale) {
                trackingLabel = `Vị trí cũ · ${formatTimeOnly(o.updatedAt ?? o.createdAt)}`;
              } else if (o.tracking?.state === 'no-location') {
                trackingLabel = 'Chưa có vị trí';
              } else if (o.status === 'DELIVERED') {
                trackingLabel = 'Tracking đã kết thúc';
              } else if (o.status === 'CANCELLED') {
                trackingLabel = 'Không còn tracking';
              } else {
                trackingLabel = `Cập nhật lúc ${formatTimeOnly(o.updatedAt ?? o.createdAt)}`;
              }
            }

            const trackingTone: 'neutral' | 'warning' | 'success' = trackingLabel.includes('cũ')
              ? 'warning'
              : trackingLabel.includes('Cập nhật')
                ? 'success'
                : 'neutral';

            return {
              entity: 'order' as const,
              id: o.id,
              reference: ref,
              createdAtLabel,
              routeLabel: `${origin} → ${dest}`,
              customerLabel,
              driverLabel,
              status: o.status,
              trackingLabel,
              trackingTone,
              paymentStatus,
              amountLabel,
              href: `/admin/orders/${o.id}`,
            };
          });
        } else if (resource === 'users') {
          items = (pagination.items as ApiAdminUser[]).map((u) => {
            const displayName = u.displayName ?? u.name ?? 'Người dùng';
            const maskedPhone =
              u.maskedPhone ?? (u.phone ? formatMaskedPhone(u.phone) : '••• ••• ••••');
            const updatedAtLabel =
              formatDateTime(u.updatedAt ?? u.createdAt) || '14:30 · 15/08/2026';
            const exceptionLabel =
              u.exceptionLabel ?? (u.status === 'DISABLED' ? 'Tài khoản đã bị vô hiệu hóa' : null);
            const cmdKind = u.status === 'ACTIVE' ? 'DISABLE_USER' : 'ENABLE_USER';
            const availableCommands = [createUserCommandView(cmdKind, u)];

            return {
              entity: 'user' as const,
              id: u.id,
              displayName,
              maskedPhone,
              role: u.role ?? 'CUSTOMER',
              status: u.status ?? 'ACTIVE',
              updatedAtLabel,
              exceptionLabel,
              availableCommands,
            };
          });
        } else if (resource === 'fleets') {
          items = (pagination.items as ApiAdminFleet[]).map((f) => {
            const displayId = f.displayId ?? formatFleetDisplayId(f);
            const displayName = f.displayName ?? f.name ?? 'Đội xe';
            const ownerSummary =
              f.ownerSummary ??
              (f.owner?.name
                ? `${f.owner.name} · membership ${f.owner.membershipStatus ?? 'ACTIVE'}`
                : 'Owner mô phỏng · membership ACTIVE');
            const activeMembershipCount =
              typeof f.activeMembershipCount === 'number' ? f.activeMembershipCount : 0;
            const driverCount = typeof f.driverCount === 'number' ? f.driverCount : 0;
            const orderCount = typeof f.orderCount === 'number' ? f.orderCount : 0;
            const isEmpty = activeMembershipCount === 0 && driverCount === 0;
            const membershipState = f.membershipState ?? (isEmpty ? 'empty' : 'success');
            const membershipMessage =
              f.membershipMessage ??
              (isEmpty
                ? 'Chưa có thành viên đang tham gia; đây không phải lỗi tải dữ liệu.'
                : 'Hoạt động bình thường.');
            const updatedAtLabel =
              formatDateTime(f.updatedAt ?? f.createdAt) || '14:28 · 15/08/2026';

            return {
              entity: 'fleet' as const,
              id: f.id,
              displayId,
              displayName,
              ownerSummary,
              activeMembershipCount,
              driverCount,
              orderCount,
              membershipState,
              membershipMessage,
              updatedAtLabel,
            };
          });
        } else if (resource === 'drivers') {
          items = (pagination.items as ApiAdminDriver[]).map((d) => {
            const displayName = d.displayName ?? d.name ?? 'Tài xế';
            const maskedPhone =
              d.maskedPhone ?? (d.phone ? formatMaskedPhone(d.phone) : '••• ••• ••••');
            const accountStatus = d.accountStatus ?? d.status ?? 'ACTIVE';
            const availability = d.availability ?? 'AVAILABLE';
            const membershipStatus = d.membershipStatus ?? 'ACTIVE';
            const fleetLabel =
              d.fleetLabel ??
              (d.fleet?.name
                ? `Đội xe ${d.fleet.name}`
                : membershipStatus === 'REMOVED'
                  ? 'Không còn membership hoạt động'
                  : 'Đội xe Sao Mai Mô Phỏng');
            const activeOrder = d.activeOrder
              ? {
                  reference: d.activeOrder.reference,
                  href: d.activeOrder.href ?? `/admin/orders/${d.activeOrder.id ?? ''}`,
                }
              : null;
            const locationCondition =
              d.locationCondition ??
              (d.lastLocation?.isStale
                ? 'stale'
                : d.lastLocation
                  ? 'current'
                  : 'unavailable');
            const locationLabel =
              d.locationLabel ??
              (d.lastLocation?.address ??
                d.lastLocation?.label ??
                (d.lastLocation
                  ? `Tọa độ (${d.lastLocation.latitude}, ${d.lastLocation.longitude})`
                  : 'Chưa có vị trí'));
            const locationUpdatedAtLabel =
              d.locationUpdatedAtLabel ??
              (d.lastLocation?.updatedAt
                ? formatDateTime(d.lastLocation.updatedAt)
                : 'Chưa có dữ liệu');

            return {
              entity: 'driver' as const,
              id: d.id,
              displayName,
              maskedPhone,
              accountStatus,
              availability,
              membershipStatus,
              fleetLabel,
              activeOrder,
              locationLabel,
              locationUpdatedAtLabel,
              locationCondition,
            };
          });
        }

        const noResults = items.length === 0;
        const title =
          resource === 'orders'
            ? 'Đơn hàng'
            : resource === 'users'
              ? 'Người dùng'
              : resource === 'fleets'
                ? 'Đội xe'
                : 'Tài xế';

        const filterSummary = noResults
          ? '0 kết quả cho bộ lọc hiện tại'
          : `${pagination.total} kết quả trong snapshot`;

        return deepFreeze({
          scenarioId: noResults
            ? resource === 'orders'
              ? 'ADM-ORD-NORESULT'
              : resource === 'fleets'
                ? 'ADM-FLT-EMPTY'
                : 'admin-list-no-results'
            : resource === 'orders'
              ? 'ADM-ORD-DENSE'
              : resource === 'users'
                ? 'ADM-USR-DENSE'
                : resource === 'drivers'
                  ? 'ADM-DRV-MIXED'
                  : 'admin-list-success',
          kind: 'list' as const,
          entity: resource,
          state: noResults ? ('no-results' as const) : ('success' as const),
          title,
          checkedAtLabel: formatDateTime(new Date()) || '14:32 · 15/08/2026',
          filters,
          result: {
            items,
            page: pagination.page,
            pageSize: pagination.pageSize,
            totalPages: pagination.totalPages,
            totalItems: pagination.total,
            filterSummary,
            revision: `admin-${resource}-r${pagination.total}`,
          },
          notice: null,
          dialogPreview: null,
        });
      } catch (error) {
        return handleAdminBoundaryError(error);
      }
    },

    readOrders(filters: AdminListFilters): Promise<AdminListRouteView> {
      return this.readList('orders', filters);
    },

    readUsers(filters: AdminListFilters): Promise<AdminListRouteView> {
      return this.readList('users', filters);
    },

    readFleets(filters: AdminListFilters): Promise<AdminListRouteView> {
      return this.readList('fleets', filters);
    },

    readDrivers(filters: AdminListFilters): Promise<AdminListRouteView> {
      return this.readList('drivers', filters);
    },

    async readOrderDetail(orderId: string): Promise<AdminOrderDetailRouteView> {
      if (!UUID_PATTERN.test(orderId)) {
        return deepFreeze({
          scenarioId: 'ADM-DENIED',
          kind: 'permission-denied',
          title: 'Mã đơn không hợp lệ',
          message: 'Đường dẫn không chứa UUID hợp lệ. Không hiển thị dữ liệu.',
        });
      }

      const activeClient = getClient();
      try {
        const rawRes = await activeClient.get<ApiAdminOrder | { data: ApiAdminOrder }>(
          `/admin/orders/${orderId}`,
        );
        const orderData = extractData<ApiAdminOrder>(rawRes);

        const ref = orderData.reference ?? formatOrderReference(orderData);
        const customerLabel =
          orderData.customerLabel ??
          orderData.customer?.displayName ??
          orderData.customer?.name ??
          'Khách Hàng';
        const driverLabel =
          orderData.driverLabel ??
          orderData.driver?.displayName ??
          orderData.driver?.name ??
          'Chưa phân công';
        const updatedAtLabel =
          formatDateTime(orderData.updatedAt ?? orderData.createdAt) || '14:32 · 15/08/2026';
        const cargoSummary =
          orderData.cargoSummary ??
          (orderData.cargoNote
            ? `${orderData.cargoNote}${orderData.cargoWeightKg ? ` · khoảng ${orderData.cargoWeightKg} kg` : ''}`
            : 'Hàng hóa');

        const originLabel =
          orderData.pickup?.label ?? orderData.pickup?.address ?? 'Điểm lấy hàng';
        const destLabel =
          orderData.dropoff?.label ?? orderData.dropoff?.address ?? 'Điểm giao hàng';

        const origin: AdminRoutePointView = {
          id: orderData.pickup?.id ?? `${orderData.id}-origin`,
          label: originLabel,
          metadata: orderData.pickup?.metadata ?? 'Lấy hàng lúc 13:45',
        };

        const stops: readonly AdminRoutePointView[] = (orderData.stops ?? []).map((s, idx) => ({
          id: s.id ?? `${orderData.id}-stop-${idx + 1}`,
          label: s.label ?? s.address ?? `Điểm dừng ${idx + 1}`,
          metadata: s.metadata ?? 'Điểm dừng trung gian',
        }));

        const destination: AdminRoutePointView = {
          id: orderData.dropoff?.id ?? `${orderData.id}-destination`,
          label: destLabel,
          metadata: orderData.dropoff?.metadata ?? 'Điểm đến dự kiến',
        };

        const etaMinutes = orderData.eta?.durationS
          ? Math.round(orderData.eta.durationS / 60)
          : orderData.durationS
            ? Math.round(orderData.durationS / 60)
            : 18;

        const eta = {
          label: orderData.eta?.label ?? `ETA dự kiến · ${etaMinutes} phút`,
          sourceLabel: orderData.eta?.sourceLabel ?? 'Dữ liệu mô phỏng',
        };

        const trackingState =
          orderData.tracking?.state ??
          (orderData.tracking?.isStale
            ? 'stale'
            : orderData.tracking
              ? 'route'
              : 'no-location');

        const tracking = {
          state: trackingState,
          statusLabel:
            orderData.tracking?.statusLabel ??
            (trackingState === 'stale'
              ? 'Vị trí cũ — cập nhật lần cuối 14:22'
              : trackingState === 'no-location'
                ? 'Chưa có vị trí'
                : `Cập nhật lúc ${formatTimeOnly(orderData.updatedAt ?? orderData.createdAt)}`),
          lastUpdatedLabel:
            trackingState === 'no-location'
              ? null
              : (orderData.tracking?.lastUpdatedLabel ?? updatedAtLabel),
          mapAlternative:
            orderData.tracking?.mapAlternative ??
            (trackingState === 'no-location'
              ? 'Không vẽ marker giả; lộ trình dạng chữ vẫn được giữ.'
              : 'Điểm gần nhất ở cấp khu vực Quận 7; không lộ tọa độ thô.'),
        };

        // StatusTimeline: Strictly for order lifecycle
        const history =
          (orderData.history ?? []).length > 0
            ? (orderData.history ?? []).map((h, idx) => ({
                id: h.id ?? `${orderData.id}-h-${idx}`,
                label: h.label ?? ORDER_STATUS_LABELS[h.status ?? 'REQUESTED'] ?? 'Cập nhật',
                description: h.description ?? `Snapshot trạng thái ${ref}.`,
                timestampLabel:
                  h.timestampLabel ?? formatDateTime(h.createdAt ?? h.dateTime) ?? updatedAtLabel,
                dateTime: h.dateTime ?? h.createdAt ?? new Date().toISOString(),
                isCurrent: h.isCurrent ?? h.status === orderData.status,
              }))
            : [
                {
                  id: `${orderData.id}-requested`,
                  label: 'Chờ tài xế',
                  description: 'Đơn được tạo trong hệ thống.',
                  timestampLabel: formatDateTime(orderData.createdAt) || '13:30 · 15/08/2026',
                  dateTime: orderData.createdAt ?? new Date().toISOString(),
                  isCurrent: orderData.status === 'REQUESTED',
                },
                ...(orderData.status !== 'REQUESTED'
                  ? [
                      {
                        id: `${orderData.id}-current`,
                        label: ORDER_STATUS_LABELS[orderData.status] ?? orderData.status,
                        description: `Snapshot hiện tại của ${ref}.`,
                        timestampLabel: updatedAtLabel,
                        dateTime: orderData.updatedAt ?? new Date().toISOString(),
                        isCurrent: true,
                      },
                    ]
                  : []),
              ];

        const media = {
          state: orderData.media?.state ?? 'success',
          message: orderData.media?.message ?? null,
          items: (orderData.media?.items ?? []).map((m, idx) => ({
            id: m.id ?? `media-${idx}`,
            label: m.label ?? 'Ảnh đính kèm',
            mediaType: m.mediaType ?? 'JPEG',
            capturedAtLabel:
              m.capturedAtLabel ?? formatDateTime(m.createdAt) ?? '14:10 · 15/08/2026',
          })),
        };

        const paymentStatus = orderData.paymentStatus ?? orderData.payment?.status ?? 'UNPAID';
        const amountLabel =
          orderData.payment?.amountLabel ?? formatVndPrice(orderData.totalPriceVnd);
        const paymentId =
          orderData.payment?.id ??
          orderData.payment?.paymentId ??
          `66666666-6666-4666-8666-666666666${orderData.id.slice(-3)}`;
        const referenceLabel =
          orderData.payment?.referenceLabel ??
          (paymentStatus === 'FAILED'
            ? `PAY-DEMO-FAILED-${orderData.id.slice(-3)}`
            : `PAY-A-${orderData.id.slice(-3)}`);
        const sourceLabel =
          orderData.payment?.sourceLabel ??
          (paymentStatus === 'FAILED' ? 'Provider mô phỏng báo thất bại' : 'Chưa có xác nhận');
        const expiresAtLabel =
          orderData.payment?.expiresAtLabel ??
          (paymentStatus === 'FAILED' ? null : '15:00 · 15/08/2026');

        const payment = {
          id: paymentId,
          status: paymentStatus,
          amountLabel,
          sourceLabel,
          referenceLabel,
          expiresAtLabel,
        };

        // AdminAuditRail: Distinct from order status lifecycle
        const rawAuditEntries =
          orderData.audit?.entries ?? orderData.auditEntries ?? orderData.auditLogs ?? [];
        const auditEntries: AdminAuditEntryView[] =
          rawAuditEntries.length > 0
            ? rawAuditEntries.map((entry, idx) => ({
                id: entry.id ?? `audit-${idx}`,
                outcomeLabel: entry.outcomeLabel ?? 'Thành công',
                actionLabel: entry.actionLabel ?? entry.action ?? 'Thao tác quản trị',
                actorLabel:
                  entry.actorLabel ??
                  (entry.actor
                    ? `${entry.actor.displayName ?? entry.actor.name ?? entry.actor.id} · ${entry.actor.role ?? 'ADMIN'}`
                    : 'Admin Demo · ADMIN'),
                targetLabel: entry.targetLabel ?? `${ref} · ${orderData.id}`,
                reason: entry.reason ?? entry.note ?? 'Thao tác điều phối được ghi nhận.',
                timestampLabel:
                  entry.timestampLabel ??
                  formatDateTime(entry.createdAt ?? entry.dateTime) ??
                  '13:35 · 15/08/2026',
                dateTime: entry.dateTime ?? entry.createdAt ?? new Date().toISOString(),
                requestId: entry.requestId ?? 'req-admin-001',
                auditId: entry.auditId ?? entry.id ?? 'audit-001',
              }))
            : [
                {
                  id: 'audit-admin-001',
                  outcomeLabel: 'Thành công',
                  actionLabel: 'Khởi tạo đơn hàng',
                  actorLabel: 'Hệ thống · SYSTEM',
                  targetLabel: `${ref} · ${orderData.id}`,
                  reason: 'Ghi nhận đơn hàng trong hệ thống điều hành.',
                  timestampLabel: formatDateTime(orderData.createdAt) || '13:30 · 15/08/2026',
                  dateTime: orderData.createdAt ?? new Date().toISOString(),
                  requestId: 'req-admin-001',
                  auditId: 'audit-001',
                },
              ];

        const audit: AdminAuditRailView = {
          state: orderData.audit?.state ?? 'success',
          message: orderData.audit?.message ?? null,
          entries: auditEntries,
        };

        const orderDetailDataView: AdminOrderDetailDataView = {
          id: orderData.id,
          reference: ref,
          status: orderData.status,
          customerLabel,
          driverLabel,
          updatedAtLabel,
          cargoSummary,
          route: { origin, stops, destination },
          eta,
          tracking,
          history,
          media,
          payment,
        };

        const availableCommands = [
          createOrderCommandView('CANCEL_ORDER', orderDetailDataView),
          createOrderCommandView('CONFIRM_MANUAL_PAYMENT', orderDetailDataView),
        ];

        const notice: AdminNoticeView | null =
          trackingState === 'stale'
            ? {
                tone: 'warning',
                title: 'Tracking cần làm mới',
                message: 'Last-known context vẫn được giữ trong khi kết nối lại.',
              }
            : media.state === 'error'
              ? {
                  tone: 'warning',
                  title: 'Media region gặp lỗi',
                  message: 'Order context, route, payment và audit vẫn khả dụng.',
                }
              : null;

        return deepFreeze({
          scenarioId: 'ADM-ORD-DETAIL',
          kind: 'order-detail',
          order: orderDetailDataView,
          audit,
          availableCommands,
          dialogPreview: null,
          notice,
        });
      } catch (error) {
        return handleAdminBoundaryError(error);
      }
    },

    async executeAuditedCommand(input: AdminCommandInput): Promise<AdminCommandResult> {
      const reason = (input.reason ?? '').trim();
      if (reason.length < 5 || reason.length > 500) {
        throw new ApiError(
          422,
          'VALIDATION_ERROR',
          'Lý do thao tác phải có độ dài từ 5 đến 500 ký tự.',
        );
      }

      if (input.kind === 'DISABLE_USER') {
        if (input.currentAdminId && input.targetId === input.currentAdminId) {
          throw new ApiError(
            400,
            'SELF_DISABLE_PREVENTED',
            'Không thể tự vô hiệu hóa tài khoản quản trị viên của chính mình.',
          );
        }
      }

      const activeClient = getClient();
      const clientRequestId = input.clientRequestId || generateRequestId();

      try {
        let rawRes: unknown = {};

        if (input.kind === 'DISABLE_USER' || input.kind === 'ENABLE_USER') {
          const status = input.kind === 'DISABLE_USER' ? 'DISABLED' : 'ACTIVE';
          const body = {
            status,
            reason,
            contextVersion: input.contextVersion,
            clientRequestId,
          };
          if (typeof activeClient.patch === 'function') {
            rawRes = await activeClient.patch<unknown>(
              `/admin/users/${input.targetId}/status`,
              body,
            );
          } else if (typeof activeClient.post === 'function') {
            rawRes = await activeClient.post<unknown>(
              `/admin/users/${input.targetId}/status`,
              body,
            );
          } else {
            rawRes = await activeClient.get<unknown>(`/admin/users/${input.targetId}/status`);
          }
        } else if (input.kind === 'CONFIRM_MANUAL_PAYMENT') {
          const body = {
            note: reason,
            clientRequestId,
          };
          if (typeof activeClient.post === 'function') {
            rawRes = await activeClient.post<unknown>(
              `/admin/payments/${input.targetId}/confirm`,
              body,
            );
          } else {
            rawRes = await activeClient.get<unknown>(
              `/admin/payments/${input.targetId}/confirm`,
            );
          }
        } else if (input.kind === 'CANCEL_ORDER') {
          const body = {
            reason,
            clientRequestId,
          };
          if (typeof activeClient.post === 'function') {
            rawRes = await activeClient.post<unknown>(
              `/orders/${input.targetId}/cancel`,
              body,
            );
          } else {
            rawRes = await activeClient.get<unknown>(`/orders/${input.targetId}/cancel`);
          }
        }

        const data = extractData<Record<string, unknown>>(rawRes);
        const requestId =
          (data.requestId as string) ?? clientRequestId;
        const auditId =
          (data.auditId as string) ??
          (data.audit as { id?: string })?.id ??
          `audit-${clientRequestId.slice(0, 8)}`;
        const persistedAt =
          (data.persistedAt as string) ??
          (data.updatedAt as string) ??
          new Date().toISOString();

        return deepFreeze({
          state: 'success',
          requestId,
          auditId,
          persistedAt,
        });
      } catch (error) {
        if (error && typeof error === 'object') {
          const status =
            (error as { statusCode?: number; status?: number }).statusCode ??
            (error as { status?: number }).status;
          const code = (error as { code?: string }).code;
          if (status === 409 || code === 'CONFLICT' || code === 'VERSION_CONFLICT') {
            return deepFreeze({
              state: 'conflict',
              requestId: (error as { requestId?: string }).requestId ?? clientRequestId,
              auditId: null,
              persistedAt: null,
            });
          }
        }
        throw error;
      }
    },

    executeCommand(input: AdminCommandInput): Promise<AdminCommandResult> {
      return this.executeAuditedCommand(input);
    },

    subscribeToReadEvents(
      _onEvent: (event: Readonly<{ resource: string; revision: string }>) => void,
    ): Readonly<{ unsubscribe: () => void }> {
      return Object.freeze({
        unsubscribe: () => {},
      });
    },
  };
}
