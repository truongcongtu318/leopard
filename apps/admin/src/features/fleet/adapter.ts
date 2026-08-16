import type { FleetDriverFilters, FleetOrderFilters, FleetPreviewContext } from './model';

export type FleetSearchParams = Readonly<Record<string, string | readonly string[] | undefined>>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PREVIEW_SCENARIO_PATTERN = /^[a-z0-9-]{1,80}$/;
const DRIVER_AVAILABILITIES = ['ALL', 'OFFLINE', 'AVAILABLE', 'BUSY'] as const;
const DRIVER_SORTS = ['name-asc', 'name-desc', 'availability', 'location-updated'] as const;
const ORDER_STATUSES = [
  'ALL',
  'REQUESTED',
  'ACCEPTED',
  'PICKING_UP',
  'IN_TRANSIT',
  'DELIVERED',
  'CANCELLED',
] as const;
const ORDER_SORTS = ['updated-desc', 'updated-asc', 'reference-asc'] as const;

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

function positiveInteger(value: string | readonly string[] | undefined, fallback: number): number {
  const parsed = Number(first(value));
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function pageSize(value: string | readonly string[] | undefined): 20 | 50 {
  return first(value) === '50' ? 50 : 20;
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

export function parseFleetDriverFilters(search: FleetSearchParams): FleetDriverFilters {
  return Object.freeze({
    q: cleanText(search.q),
    availability: allow(first(search.availability), DRIVER_AVAILABILITIES, 'ALL'),
    sort: allow(first(search.sort), DRIVER_SORTS, 'name-asc'),
    page: positiveInteger(search.page, 1),
    pageSize: pageSize(search.pageSize),
  });
}

export function parseFleetOrderFilters(search: FleetSearchParams): FleetOrderFilters {
  const rawDriverId = first(search.driverId);
  return Object.freeze({
    q: cleanText(search.q),
    status: allow(first(search.status), ORDER_STATUSES, 'ALL'),
    customer: cleanText(search.customer),
    driverId: UUID_PATTERN.test(rawDriverId) ? rawDriverId : '',
    from: validDate(search.from),
    to: validDate(search.to),
    sort: allow(first(search.sort), ORDER_SORTS, 'updated-desc'),
    page: positiveInteger(search.page, 1),
    pageSize: pageSize(search.pageSize),
  });
}

function appendPreviewContext(params: URLSearchParams, context?: FleetPreviewContext): void {
  if (context?.preview !== 'enabled') return;
  params.set('preview', 'enabled');
  if (context.scenario && PREVIEW_SCENARIO_PATTERN.test(context.scenario)) {
    params.set('scenario', context.scenario);
  }
}

export function serializeFleetDriverFilters(
  filters: FleetDriverFilters,
  context?: FleetPreviewContext,
): string {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  params.set('availability', filters.availability);
  params.set('sort', filters.sort);
  params.set('page', String(filters.page));
  params.set('pageSize', String(filters.pageSize));
  appendPreviewContext(params, context);
  return params.toString();
}

export function serializeFleetOrderFilters(
  filters: FleetOrderFilters,
  context?: FleetPreviewContext,
): string {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  params.set('status', filters.status);
  if (filters.customer) params.set('customer', filters.customer);
  if (filters.driverId) params.set('driverId', filters.driverId);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  params.set('sort', filters.sort);
  params.set('page', String(filters.page));
  params.set('pageSize', String(filters.pageSize));
  appendPreviewContext(params, context);
  return params.toString();
}

export function fleetPreviewHref(
  href: string,
  scenario: string,
  context?: FleetPreviewContext,
): string {
  if (context?.preview !== 'enabled') return href;
  const url = new URL(href, 'http://leopard.local');
  url.searchParams.set('preview', 'enabled');
  url.searchParams.set('scenario', scenario);
  return `${url.pathname}?${url.searchParams.toString()}${url.hash}`;
}

export function fleetOrderDetailHref(href: string, context?: FleetPreviewContext): string {
  return fleetPreviewHref(href, 'fleet-order-detail-success', context);
}

export function parseFleetOrderId(value: string | readonly string[] | undefined): string | null {
  const candidate = first(value);
  return UUID_PATTERN.test(candidate) ? candidate : null;
}

// Wave 3 handoff will add validated REST/Socket DTO mappings behind FleetQueryPort.
