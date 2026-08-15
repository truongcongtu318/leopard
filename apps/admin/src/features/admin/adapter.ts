import type {
  AdminCommandKind,
  AdminListFilters,
  AdminListScreen,
  AdminPreviewContext,
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

function appendPreview(params: URLSearchParams, context?: AdminPreviewContext): void {
  if (context?.preview !== 'enabled') return;
  params.set('preview', 'enabled');
  if (context.scenario && SCENARIO_PATTERN.test(context.scenario)) {
    params.set('scenario', context.scenario);
  }
  const command = parseAdminCommandKind(context.command);
  if (command) params.set('command', command);
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
  appendPreview(params, context);
  return params.toString();
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
