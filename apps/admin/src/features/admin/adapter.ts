import type {
  DriverAvailability,
  FleetMemberStatus,
  OrderStatus,
  PaymentStatus,
  UserStatus,
} from '@leopard/ui';

import type {
  AdminCommandKind,
  AdminCommandView,
  AdminListFilters,
  AdminListScreen,
  AdminOrderDetailDataView,
  AdminPreviewContext,
  AdminPreviewScreen,
} from './model';

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
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return '0 ₫';
  }
  return `${Math.round(amount).toLocaleString('vi-VN')} ₫`;
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
