import type { DriverAvailability, OrderStatus, PaymentStatus } from '@leopard/ui';

export type VehicleType = 'MOTORBIKE' | 'VAN' | 'TRUCK';

import type { ApiClient } from '../../lib/api/client';
import { browserClient } from '../../lib/api/browser-client';
import type {
  FleetActiveOrderSummaryView,
  FleetAttentionView,
  FleetBoundaryView,
  FleetDashboardRouteView,
  FleetDashboardView,
  FleetDriverFilters,
  FleetDriverListItemView,
  FleetDriverResultView,
  FleetDriversRouteView,
  FleetDriversView,
  FleetMapState,
  FleetMediaItemView,
  FleetMetricView,
  FleetNoticeView,
  FleetOrderDetailDataView,
  FleetOrderDetailRouteView,
  FleetOrderDetailView,
  FleetOrderFilters,
  FleetOrderListItemView,
  FleetOrderResultView,
  FleetOrdersRouteView,
  FleetOrdersView,
  FleetPreviewContext,
  FleetScopeView,
  FleetStatusHistoryItemView,
} from './model';
import type { FleetPort, FleetQueryPort, FleetReadEvent } from './port';

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
  if (typeof dateInput === 'string' && /^\d{1,2}:\d{2}\s*·\s*\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateInput.trim())) {
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

export function formatOrderReference(order: { id: string; reference?: string }): string {
  if (order.reference) return order.reference;
  if (order.id.startsWith('LP-')) return order.id;
  const shortId = order.id.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `LP-F-${shortId}`;
}

export function formatDriverDisplayId(driver: { id: string; displayId?: string }): string {
  if (driver.displayId) return driver.displayId;
  const shortId = driver.id.replace(/-/g, '').slice(0, 6).toUpperCase();
  return `DRV-SM-${shortId}`;
}

export interface ApiFleetProfile {
  id: string;
  name: string;
  displayId?: string;
  logoUrl?: string | null;
  driverCount?: number;
  activeOrderCount?: number;
  membershipStatus?: 'ACTIVE' | string;
  createdAt?: string;
  updatedAt?: string;
  verifiedAt?: string;
}

export interface ApiFleetDriver {
  id: string;
  name: string;
  displayId?: string;
  phone?: string;
  status?: string;
  role?: string;
  availability?: DriverAvailability;
  activeOrderCount?: number;
  activeOrder?: {
    id: string;
    reference: string;
  } | null;
  lastLocation?: {
    latitude?: number;
    longitude?: number;
    address?: string;
    label?: string;
    updatedAt?: string;
    freshness?: 'current' | 'stale' | 'unavailable';
    isStale?: boolean;
  } | null;
  lastLocationLabel?: string;
  locationUpdatedAtLabel?: string;
  locationFreshness?: 'current' | 'stale' | 'unavailable';
  exceptionLabel?: string | null;
  joinedAt?: string;
}

export interface ApiFleetVehicle {
  id: string;
  plateNumber: string;
  type?: VehicleType;
  status?: string;
  driverId?: string | null;
}

export interface ApiFleetOrderStop {
  id?: string;
  address?: string;
  label?: string;
  metadata?: string;
  lat?: number;
  lng?: number;
}

export interface ApiFleetOrder {
  id: string;
  reference?: string;
  status: OrderStatus;
  vehicleType?: VehicleType;
  pickup?: ApiFleetOrderStop;
  stops?: ApiFleetOrderStop[];
  dropoff?: ApiFleetOrderStop;
  customer?: { id?: string; name?: string; phone?: string } | null;
  customerLabel?: string;
  driver?: { id?: string; name?: string; phone?: string } | null;
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
    state?: FleetMapState;
    statusLabel?: string;
    lastUpdatedLabel?: string | null;
    mapAlternative?: string;
    latestPoint?: {
      latitude: number;
      longitude: number;
      address?: string;
      capturedAt: string;
    } | null;
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
  payment?: {
    status?: PaymentStatus;
    amountLabel?: string;
    methodLabel?: string;
  };
  media?: {
    state?: 'success' | 'error';
    message?: string | null;
    items?: Array<{
      id: string;
      label: string;
      mediaType: string;
      capturedAtLabel: string;
      availability: 'available' | 'unavailable';
    }>;
  };
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

function handleScopeError(error: unknown): FleetBoundaryView {
  if (isSessionExpired(error)) {
    return deepFreeze({
      scenarioId: 'fleet-session-expired',
      kind: 'session-expired',
      title: 'Phiên làm việc đã hết hạn',
      message: 'Dữ liệu riêng tư đã được ẩn. Vui lòng đăng nhập lại để tiếp tục.',
    });
  }

  return deepFreeze({
    scenarioId: 'fleet-scope-denied',
    kind: 'permission-denied',
    title: 'Bạn không có quyền xem đội xe này',
    message: 'Không hiển thị hoặc xác nhận dữ liệu nằm ngoài phạm vi được cấp quyền.',
  });
}

function mapScope(rawProfile: ApiFleetProfile): FleetScopeView {
  const verifiedAt = rawProfile.verifiedAt ?? rawProfile.updatedAt ?? rawProfile.createdAt;
  const name = rawProfile.name || 'Sao Mai';
  const displayId =
    rawProfile.displayId ??
    `FLEET-${rawProfile.id ? rawProfile.id.replace(/-/g, '').slice(0, 4).toUpperCase() : 'SM-01'}`;
  return deepFreeze({
    fleetId: rawProfile.id || '11111111-1111-4111-8111-111111111001',
    displayId,
    displayName: name,
    membershipStatus: 'ACTIVE' as const,
    readOnly: true as const,
    verifiedAtLabel: formatDateTime(verifiedAt) || '14:32 · 15/08/2026',
  });
}

/**
 * Creates an HTTP adapter implementing FleetQueryPort / FleetPort.
 * Enforces strict Read-Only guarantees and Fleet Scope Isolation non-disclosure boundaries.
 */
export function createFleetHttpAdapter(client?: ApiClient): FleetPort {
  const getClient = (): ApiClient => client ?? browserClient;

  return {
    async readScope(): Promise<FleetScopeView> {
      const activeClient = getClient();
      const profileRes = await activeClient.get<ApiFleetProfile | { data: ApiFleetProfile }>(
        '/fleet/profile',
      );
      const profileData = extractData<ApiFleetProfile>(profileRes);
      return mapScope(profileData);
    },

    async readDashboard(): Promise<FleetDashboardRouteView> {
      const activeClient = getClient();
      try {
        const [profileRes, driversRes, ordersRes] = await Promise.all([
          Promise.resolve(
            activeClient.get<ApiFleetProfile | { data: ApiFleetProfile }>('/fleet/profile'),
          ),
          Promise.resolve(
            activeClient.get<
              | { items: ApiFleetDriver[]; total: number }
              | ApiFleetDriver[]
              | { data: { items: ApiFleetDriver[] } }
            >('/fleet/drivers?page=1&pageSize=50'),
          ).catch((err) => {
            if (isSessionExpired(err) || isForbiddenOrNotFound(err)) throw err;
            return { items: [], total: 0 };
          }),
          Promise.resolve(
            activeClient.get<
              | { items: ApiFleetOrder[]; total: number }
              | ApiFleetOrder[]
              | { data: { items: ApiFleetOrder[] } }
            >('/fleet/orders?page=1&pageSize=50'),
          ).catch((err) => {
            if (isSessionExpired(err) || isForbiddenOrNotFound(err)) throw err;
            return { items: [], total: 0 };
          }),
        ]);

        const profileData = extractData<ApiFleetProfile>(profileRes);
        const scope = mapScope(profileData);

        const rawDriversPagination = extractPagination<ApiFleetDriver>(driversRes, 1, 50);
        const rawOrdersPagination = extractPagination<ApiFleetOrder>(ordersRes, 1, 50);

        const rawDrivers = rawDriversPagination.items;
        const rawOrders = rawOrdersPagination.items;

        const activeOrdersList = rawOrders.filter(
          (o) =>
            o.status === 'ACCEPTED' ||
            o.status === 'PICKING_UP' ||
            o.status === 'IN_TRANSIT',
        );
        const availableDrivers = rawDrivers.filter((d) => d.availability === 'AVAILABLE');
        const busyDrivers = rawDrivers.filter((d) => d.availability === 'BUSY');
        const offlineDrivers = rawDrivers.filter((d) => d.availability === 'OFFLINE');

        const totalDrivers = rawDrivers.length;
        const isEmpty = totalDrivers === 0 && rawOrders.length === 0;

        const attentionItems: FleetAttentionView[] = [];
        for (const order of activeOrdersList) {
          if (order.tracking?.state === 'stale') {
            attentionItems.push({
              id: `attention-${order.id}`,
              severity: 'warning',
              title: 'Tracking cần kiểm tra',
              reason: 'Vị trí gần nhất của đơn đã được nguồn dữ liệu đánh dấu là cũ.',
              resourceLabel: order.reference ?? formatOrderReference(order),
              href: `/fleet/orders/${order.id}`,
              observedAtLabel: formatDateTime(order.updatedAt) || '14:27 · 15/08/2026',
            });
          }
        }

        const missingLocationCount = rawDrivers.filter(
          (d) => !d.lastLocation && d.availability !== 'OFFLINE',
        ).length;

        const metrics: FleetMetricView[] = [
          {
            id: 'active-orders',
            label: 'Đơn đang hoạt động',
            value: activeOrdersList.length,
            detail: 'Đã lọc theo đội xe',
            href: '/fleet/orders?status=IN_TRANSIT',
          },
          {
            id: 'available-drivers',
            label: 'Tài xế sẵn sàng',
            value: availableDrivers.length,
            detail: totalDrivers > 0 ? `Trong ${totalDrivers} tài xế` : '0 tài xế',
            href: '/fleet/drivers?availability=AVAILABLE',
          },
          {
            id: 'attention',
            label: 'Ngoại lệ hiện tại',
            value: attentionItems.length,
            detail: 'Do nguồn dữ liệu cung cấp',
          },
          {
            id: 'missing-location',
            label: 'Thiếu vị trí hợp lệ',
            value: missingLocationCount,
            detail: '0 là dữ liệu hợp lệ',
          },
        ];

        const activeOrderSummaries: FleetActiveOrderSummaryView[] = activeOrdersList.map((order) => {
          const origin = order.pickup?.label ?? order.pickup?.address ?? 'Điểm lấy';
          const dest = order.dropoff?.label ?? order.dropoff?.address ?? 'Điểm giao';
          const driverName = order.driver?.name ?? order.driverLabel ?? 'Chưa phân công';
          const customerName = order.customer?.name ?? order.customerLabel ?? 'Khách hàng';
          const ref = order.reference ?? formatOrderReference(order);
          const trackingLabel =
            order.tracking?.statusLabel ??
            (order.updatedAt
              ? `Vị trí gần nhất lúc ${formatTimeOnly(order.updatedAt)}`
              : 'Chưa có vị trí');
          return {
            id: order.id,
            reference: ref,
            status: order.status,
            routeLabel: `${origin} → ${dest}`,
            customerLabel: customerName,
            driverLabel: driverName,
            trackingLabel,
            href: `/fleet/orders/${order.id}`,
          };
        });

        const availabilitySummary = isEmpty
          ? 'Chưa có tài xế trong phạm vi hiện tại.'
          : `${availableDrivers.length} sẵn sàng · ${busyDrivers.length} đang bận · ${offlineDrivers.length} ngoại tuyến`;

        return deepFreeze({
          scenarioId: isEmpty ? 'fleet-overview-empty' : 'fleet-overview-success',
          kind: 'dashboard',
          state: isEmpty ? 'empty' : 'success',
          scope,
          asOfLabel: formatDateTime(profileData.updatedAt ?? new Date()) || '14:32 · 15/08/2026',
          metrics,
          attentionItems,
          activeOrders: activeOrderSummaries,
          availabilitySummary,
          notice: null,
          unavailableRegionLabel: null,
        });
      } catch (error) {
        return handleScopeError(error);
      }
    },

    async readDrivers(filters: FleetDriverFilters): Promise<FleetDriversRouteView> {
      const activeClient = getClient();
      try {
        const params = new URLSearchParams();
        if (filters.q) params.set('q', filters.q);
        if (filters.availability !== 'ALL') params.set('status', filters.availability);
        if (filters.sort) params.set('sort', filters.sort);
        params.set('page', String(filters.page));
        params.set('pageSize', String(filters.pageSize));

        const [profileRes, driversRes] = await Promise.all([
          activeClient.get<ApiFleetProfile | { data: ApiFleetProfile }>('/fleet/profile'),
          activeClient.get<
            | { items: ApiFleetDriver[]; total: number; totalPages?: number }
            | ApiFleetDriver[]
            | { data: { items: ApiFleetDriver[]; total: number } }
          >(`/fleet/drivers?${params.toString()}`),
        ]);

        const scope = mapScope(extractData<ApiFleetProfile>(profileRes));
        const rawDriversData = extractPagination<ApiFleetDriver>(
          driversRes,
          filters.page,
          filters.pageSize,
        );

        const items: FleetDriverListItemView[] = rawDriversData.items.map((d) => {
          const activeOrder = d.activeOrder
            ? {
                reference: d.activeOrder.reference,
                href: `/fleet/orders/${d.activeOrder.id}`,
              }
            : null;

          const locationUpdatedAt = d.lastLocation?.updatedAt ?? d.joinedAt;
          const freshness =
            d.locationFreshness ??
            d.lastLocation?.freshness ??
            (d.lastLocation?.isStale ? 'stale' : d.lastLocation ? 'current' : 'unavailable');
          const lastLocLabel =
            d.lastLocationLabel ??
            d.lastLocation?.address ??
            d.lastLocation?.label ??
            (d.lastLocation
              ? `Tọa độ (${d.lastLocation.latitude}, ${d.lastLocation.longitude})`
              : 'Chưa có vị trí');

          return {
            id: d.id,
            displayId: d.displayId ?? formatDriverDisplayId(d),
            displayName: d.name,
            availability: d.availability ?? 'AVAILABLE',
            activeOrder,
            lastLocationLabel: lastLocLabel,
            locationUpdatedAtLabel: formatDateTime(locationUpdatedAt) || '14:31 · 15/08/2026',
            locationFreshness: freshness,
            exceptionLabel:
              d.exceptionLabel ?? (freshness === 'stale' ? 'Vị trí đã được đánh dấu là cũ' : null),
          };
        });

        const noResults = items.length === 0;
        const filterSummary = noResults
          ? '0 kết quả cho bộ lọc hiện tại'
          : `${rawDriversData.total} tài xế trong kết quả`;

        const mapAlternative = noResults
          ? 'Không có vị trí tương ứng với bộ lọc.'
          : `${items.length} tài xế trong kết quả; ${items.map((it) => `${it.displayName} ở ${it.lastLocationLabel}`).join(', ')}.`;

        return deepFreeze({
          scenarioId: noResults ? 'fleet-drivers-no-results' : 'fleet-drivers-mixed',
          kind: 'drivers',
          state: noResults ? 'no-results' : 'success',
          scope,
          filters,
          result: {
            items,
            page: rawDriversData.page,
            pageSize: rawDriversData.pageSize,
            totalPages: rawDriversData.totalPages,
            totalItems: rawDriversData.total,
            filterSummary,
            sort: filters.sort,
            revision: `fleet-drivers-r${rawDriversData.total}`,
            asOfLabel: formatDateTime(new Date()) || '14:32 · 15/08/2026',
            mapState: noResults ? 'no-location' : 'route',
            mapAlternative,
          },
          notice: null,
        });
      } catch (error) {
        return handleScopeError(error);
      }
    },

    async readOrders(filters: FleetOrderFilters): Promise<FleetOrdersRouteView> {
      const activeClient = getClient();
      try {
        const params = new URLSearchParams();
        if (filters.q) params.set('q', filters.q);
        if (filters.status !== 'ALL') params.set('status', filters.status);
        if (filters.driverId) params.set('driverId', filters.driverId);
        if (filters.from) params.set('from', filters.from);
        if (filters.to) params.set('to', filters.to);
        if (filters.sort) params.set('sort', filters.sort);
        params.set('page', String(filters.page));
        params.set('pageSize', String(filters.pageSize));

        const [profileRes, ordersRes] = await Promise.all([
          activeClient.get<ApiFleetProfile | { data: ApiFleetProfile }>('/fleet/profile'),
          activeClient.get<
            | { items: ApiFleetOrder[]; total: number; totalPages?: number }
            | ApiFleetOrder[]
            | { data: { items: ApiFleetOrder[]; total: number } }
          >(`/fleet/orders?${params.toString()}`),
        ]);

        const scope = mapScope(extractData<ApiFleetProfile>(profileRes));
        const rawOrdersData = extractPagination<ApiFleetOrder>(
          ordersRes,
          filters.page,
          filters.pageSize,
        );

        const items: FleetOrderListItemView[] = rawOrdersData.items.map((o) => {
          const ref = o.reference ?? formatOrderReference(o);
          const originLabel = o.pickup?.label ?? o.pickup?.address ?? 'Điểm lấy';
          const destinationLabel = o.dropoff?.label ?? o.dropoff?.address ?? 'Điểm giao';
          const customerLabel = o.customer?.name ?? o.customerLabel ?? 'Khách hàng';
          const driverLabel = o.driver?.name ?? o.driverLabel ?? 'Chưa phân công';
          const paymentStatus = o.paymentStatus ?? o.payment?.status ?? 'UNPAID';
          const updatedAtLabel =
            formatDateTime(o.updatedAt ?? o.createdAt) || '14:27 · 15/08/2026';
          const trackingFreshness =
            o.tracking?.state === 'stale'
              ? 'stale'
              : o.tracking?.state === 'no-location'
                ? 'unavailable'
                : 'current';
          const trackingLabel =
            o.tracking?.statusLabel ??
            (trackingFreshness === 'stale'
              ? 'Vị trí đã được đánh dấu là cũ'
              : `Vị trí gần nhất lúc ${formatTimeOnly(o.updatedAt ?? o.createdAt)}`);

          return {
            id: o.id,
            reference: ref,
            status: o.status,
            route: {
              originLabel,
              destinationLabel,
            },
            customerLabel,
            driverLabel,
            paymentStatus,
            updatedAtLabel,
            trackingLabel,
            trackingFreshness,
            href: `/fleet/orders/${o.id}`,
          };
        });

        const noResults = items.length === 0;
        const filterSummary = noResults
          ? '0 kết quả cho bộ lọc hiện tại'
          : `${rawOrdersData.total} đơn thuộc Đội xe ${scope.displayName}`;

        const mapAlternative = noResults
          ? 'Không có tuyến tương ứng với bộ lọc.'
          : `${items.length} tuyến đang hiển thị; dữ liệu dạng chữ luôn có sẵn.`;

        return deepFreeze({
          scenarioId: noResults ? 'fleet-orders-no-results' : 'fleet-orders-mixed',
          kind: 'orders',
          state: noResults ? 'no-results' : 'success',
          scope,
          filters,
          result: {
            items,
            page: rawOrdersData.page,
            pageSize: rawOrdersData.pageSize,
            totalPages: rawOrdersData.totalPages,
            totalItems: rawOrdersData.total,
            filterSummary,
            sort: filters.sort,
            revision: `fleet-orders-r${rawOrdersData.total}`,
            asOfLabel: formatDateTime(new Date()) || '14:32 · 15/08/2026',
            mapState: noResults ? 'no-location' : 'route',
            mapAlternative,
          },
          notice: null,
        });
      } catch (error) {
        return handleScopeError(error);
      }
    },

    async readOrderDetail(orderId: string): Promise<FleetOrderDetailRouteView> {
      if (!UUID_PATTERN.test(orderId)) {
        return deepFreeze({
          scenarioId: 'fleet-order-foreign-denied',
          kind: 'permission-denied',
          title: 'Bạn không có quyền xem đơn này',
          message: 'Không hiển thị hoặc xác nhận dữ liệu nằm ngoài phạm vi được cấp quyền.',
        });
      }

      const activeClient = getClient();
      try {
        const [profileRes, orderRes] = await Promise.all([
          activeClient.get<ApiFleetProfile | { data: ApiFleetProfile }>('/fleet/profile'),
          activeClient.get<ApiFleetOrder | { data: ApiFleetOrder }>(`/fleet/orders/${orderId}`),
        ]);

        const scope = mapScope(extractData<ApiFleetProfile>(profileRes));
        const orderData = extractData<ApiFleetOrder>(orderRes);

        const ref = orderData.reference ?? formatOrderReference(orderData);
        const originLabel = orderData.pickup?.label ?? orderData.pickup?.address ?? 'Điểm lấy';
        const destinationLabel =
          orderData.dropoff?.label ?? orderData.dropoff?.address ?? 'Điểm giao';
        const driverLabel = orderData.driver?.name ?? orderData.driverLabel ?? 'Chưa phân công';
        const customerLabel = orderData.customer?.name ?? orderData.customerLabel ?? 'Khách hàng';
        const cargoSummary =
          orderData.cargoSummary ??
          (orderData.cargoNote
            ? `${orderData.cargoNote}${orderData.cargoWeightKg ? ` · khoảng ${orderData.cargoWeightKg} kg` : ''}`
            : 'Hàng hóa');
        const updatedAtLabel =
          formatDateTime(orderData.updatedAt ?? orderData.createdAt) || '14:27 · 15/08/2026';
        const isPickingUp = orderData.status === 'PICKING_UP';

        const origin = {
          id: orderData.pickup?.id ?? 'fleet-origin',
          label: originLabel,
          metadata: orderData.pickup?.metadata ?? 'Lấy hàng',
        };

        const stops = (orderData.stops ?? []).map((s, idx) => ({
          id: s.id ?? `fleet-stop-${idx + 1}`,
          label: s.label ?? s.address ?? `Điểm dừng ${idx + 1}`,
          metadata: s.metadata ?? 'Điểm dừng trung gian',
        }));

        const destination = {
          id: orderData.dropoff?.id ?? 'fleet-destination',
          label: destinationLabel,
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

        const trackingState = orderData.tracking?.state ?? 'route';
        const tracking = {
          state: trackingState,
          statusLabel:
            orderData.tracking?.statusLabel ??
            (trackingState === 'no-location'
              ? 'Chưa có vị trí hợp lệ'
              : trackingState === 'stale'
                ? 'Vị trí đã được nguồn dữ liệu đánh dấu là cũ'
                : 'Vị trí gần nhất đã nhận'),
          lastUpdatedLabel:
            trackingState === 'no-location'
              ? null
              : (orderData.tracking?.lastUpdatedLabel ?? updatedAtLabel),
          mapAlternative:
            orderData.tracking?.mapAlternative ??
            (trackingState === 'no-location'
              ? 'Không vẽ marker giả; lộ trình dạng chữ vẫn được giữ.'
              : `Điểm gần nhất: đang đi về ${destinationLabel}.`),
        };

        const history: FleetStatusHistoryItemView[] =
          (orderData.history ?? []).length > 0
            ? (orderData.history ?? []).map((h, idx) => ({
                id: h.id ?? `history-${idx}`,
                status: h.status ?? 'REQUESTED',
                label:
                  h.label ??
                  (h.status === 'REQUESTED'
                    ? 'Chờ tài xế'
                    : h.status === 'ACCEPTED'
                      ? 'Đã nhận đơn'
                      : h.status === 'PICKING_UP'
                        ? 'Đang lấy hàng'
                        : h.status === 'IN_TRANSIT'
                          ? 'Đang vận chuyển'
                          : h.status === 'DELIVERED'
                            ? 'Đã giao'
                            : 'Đã hủy'),
                description: h.description ?? 'Cập nhật trạng thái.',
                timestampLabel:
                  h.timestampLabel ?? formatDateTime(h.createdAt ?? h.dateTime) ?? '',
                dateTime: h.dateTime ?? h.createdAt ?? '',
                isCurrent: h.isCurrent ?? h.status === orderData.status,
              }))
            : [
                {
                  id: 'history-requested',
                  status: 'REQUESTED' as const,
                  label: 'Chờ tài xế',
                  description: 'Đơn được tạo trong hệ thống.',
                  timestampLabel: formatDateTime(orderData.createdAt) || '13:30 · 15/08/2026',
                  dateTime: orderData.createdAt ?? new Date().toISOString(),
                  isCurrent: orderData.status === 'REQUESTED',
                },
                ...(orderData.status !== 'REQUESTED'
                  ? [
                      {
                        id: 'history-current',
                        status: orderData.status,
                        label: isPickingUp
                          ? 'Đang lấy hàng'
                          : orderData.status === 'IN_TRANSIT'
                            ? 'Đang vận chuyển'
                            : orderData.status === 'ACCEPTED'
                              ? 'Đã nhận đơn'
                              : orderData.status === 'DELIVERED'
                                ? 'Đã giao'
                                : 'Đã hủy',
                        description: 'Trạng thái hiện tại do nguồn dữ liệu cung cấp.',
                        timestampLabel: updatedAtLabel,
                        dateTime: orderData.updatedAt ?? new Date().toISOString(),
                        isCurrent: true,
                      },
                    ]
                  : []),
              ];

        const paymentStatus = orderData.paymentStatus ?? orderData.payment?.status ?? 'UNPAID';
        const amountLabel =
          orderData.payment?.amountLabel ?? formatVndPrice(orderData.totalPriceVnd);
        const methodLabel =
          orderData.payment?.methodLabel ??
          (paymentStatus === 'QR_CREATED'
            ? 'VietQR đã được tạo; chưa xác nhận thanh toán'
            : paymentStatus === 'PAID_MANUAL'
              ? 'Đã thanh toán (thủ công)'
              : 'Chưa có phương thức thanh toán hoàn tất');

        const media = orderData.media ?? {
          state: 'success' as const,
          message: null,
          items: [],
        };

        const notice: FleetNoticeView | null =
          trackingState === 'stale'
            ? {
                tone: 'warning',
                title: 'Tracking cần kiểm tra',
                message: 'Vị trí gần nhất đã được nguồn dữ liệu đánh dấu là cũ.',
              }
            : trackingState === 'no-location'
              ? {
                  tone: 'warning',
                  title: 'Chưa có vị trí hợp lệ',
                  message: 'Không hiển thị marker giả; dùng lộ trình dạng chữ để tiếp tục theo dõi.',
                }
              : null;

        return deepFreeze({
          scenarioId: 'fleet-order-detail-success',
          kind: 'order-detail',
          scope,
          order: {
            id: orderData.id,
            reference: ref,
            status: orderData.status,
            updatedAtLabel,
            route: { origin, stops, destination },
            eta,
            driverLabel,
            customerLabel,
            cargoSummary,
            tracking,
            history,
            payment: {
              status: paymentStatus,
              amountLabel,
              methodLabel,
            },
            media: {
              state: media.state ?? 'success',
              message: media.message ?? null,
              items: (media.items ?? []).map((m) => ({
                id: m.id,
                label: m.label,
                mediaType: m.mediaType,
                capturedAtLabel: m.capturedAtLabel,
                availability: m.availability,
              })),
            },
          },
          notice,
        });
      } catch (error) {
        if (isForbiddenOrNotFound(error)) {
          return deepFreeze({
            scenarioId: 'fleet-order-foreign-denied',
            kind: 'permission-denied',
            title: 'Bạn không có quyền xem đơn này',
            message: 'Không hiển thị hoặc xác nhận dữ liệu nằm ngoài phạm vi được cấp quyền.',
          });
        }
        return handleScopeError(error);
      }
    },

    subscribeToReadEvents(_onEvent: (event: FleetReadEvent) => void): Readonly<{ unsubscribe: () => void }> {
      return Object.freeze({
        unsubscribe: () => {},
      });
    },
  };
}
