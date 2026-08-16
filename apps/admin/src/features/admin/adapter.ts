import type {
  AdminCommandKind,
  AdminListFilters,
  AdminListScreen,
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

function first(value: string | readonly string[] | undefined): string {
  if (typeof value === 'string') return value;
  return value?.[0] ?? '';
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

// Wave 3 handoff will map validated REST/Socket DTOs behind AdminOperationsPort.
