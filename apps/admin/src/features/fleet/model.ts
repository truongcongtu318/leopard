import type { DriverAvailability, OrderStatus, PaymentStatus } from '@leopard/ui';

export type FleetScopeView = Readonly<{
  fleetId: string;
  displayId: string;
  displayName: string;
  membershipStatus: 'ACTIVE';
  readOnly: true;
  verifiedAtLabel: string;
}>;

export type FleetBoundaryView = Readonly<{
  scenarioId: string;
  kind: 'scope-loading' | 'permission-denied' | 'session-expired';
  title: string;
  message: string;
}>;

export type FleetNoticeView = Readonly<{
  tone: 'info' | 'warning' | 'danger';
  title: string;
  message: string;
}>;

export type FleetMetricView = Readonly<{
  id: string;
  label: string;
  value: number;
  detail: string;
  href?: string;
}>;

export type FleetAttentionView = Readonly<{
  id: string;
  severity: 'warning' | 'danger';
  title: string;
  reason: string;
  resourceLabel: string;
  href: string;
  observedAtLabel: string;
}>;

export type FleetActiveOrderSummaryView = Readonly<{
  id: string;
  reference: string;
  status: OrderStatus;
  routeLabel: string;
  customerLabel?: string;
  driverLabel: string;
  trackingLabel: string;
  href: string;
}>;

export type FleetDashboardView = Readonly<{
  scenarioId: string;
  kind: 'dashboard';
  state: 'success' | 'empty' | 'partial-error' | 'reconnecting' | 'refresh-success';
  scope: FleetScopeView;
  asOfLabel: string;
  metrics: readonly FleetMetricView[];
  attentionItems: readonly FleetAttentionView[];
  activeOrders: readonly FleetActiveOrderSummaryView[];
  availabilitySummary: string;
  notice: FleetNoticeView | null;
  unavailableRegionLabel: string | null;
}>;

export type FleetDriverFilters = Readonly<{
  q: string;
  availability: 'ALL' | DriverAvailability;
  sort: 'name-asc' | 'name-desc' | 'availability' | 'location-updated';
  page: number;
  pageSize: 20 | 50;
}>;

export type FleetDriverListItemView = Readonly<{
  id: string;
  displayId: string;
  displayName: string;
  availability: DriverAvailability;
  activeOrder: Readonly<{
    reference: string;
    href: string;
  }> | null;
  lastLocationLabel: string;
  locationUpdatedAtLabel: string;
  locationFreshness: 'current' | 'stale' | 'unavailable';
  exceptionLabel: string | null;
}>;

export type FleetMapState = 'route' | 'stale' | 'no-location' | 'unavailable';

export type FleetDriverResultView = Readonly<{
  items: readonly FleetDriverListItemView[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  filterSummary: string;
  sort: FleetDriverFilters['sort'];
  revision: string;
  asOfLabel: string;
  mapState: FleetMapState;
  mapAlternative: string;
}>;

export type FleetDriversView = Readonly<{
  scenarioId: string;
  kind: 'drivers';
  state: 'success' | 'no-results';
  scope: FleetScopeView;
  filters: FleetDriverFilters;
  result: FleetDriverResultView;
  notice: FleetNoticeView | null;
}>;

export type FleetOrderFilters = Readonly<{
  q: string;
  status: 'ALL' | OrderStatus;
  customer: string;
  driverId: string;
  from: string;
  to: string;
  sort: 'updated-desc' | 'updated-asc' | 'reference-asc';
  page: number;
  pageSize: 20 | 50;
}>;

export type FleetRouteSummaryView = Readonly<{
  originLabel: string;
  destinationLabel: string;
}>;

export type FleetOrderListItemView = Readonly<{
  id: string;
  reference: string;
  status: OrderStatus;
  route: FleetRouteSummaryView;
  customerLabel: string;
  driverLabel: string;
  paymentStatus: PaymentStatus;
  updatedAtLabel: string;
  trackingLabel: string;
  trackingFreshness: 'current' | 'stale' | 'unavailable';
  href: string;
}>;

export type FleetOrderResultView = Readonly<{
  items: readonly FleetOrderListItemView[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  filterSummary: string;
  sort: FleetOrderFilters['sort'];
  revision: string;
  asOfLabel: string;
  mapState: FleetMapState;
  mapAlternative: string;
}>;

export type FleetOrdersView = Readonly<{
  scenarioId: string;
  kind: 'orders';
  state: 'success' | 'no-results' | 'offline' | 'conflict';
  scope: FleetScopeView;
  filters: FleetOrderFilters;
  result: FleetOrderResultView;
  notice: FleetNoticeView | null;
}>;

export type FleetStatusHistoryItemView = Readonly<{
  id: string;
  status: OrderStatus;
  label: string;
  description: string;
  timestampLabel: string;
  dateTime: string;
  isCurrent: boolean;
}>;

export type FleetMediaItemView = Readonly<{
  id: string;
  label: string;
  mediaType: string;
  capturedAtLabel: string;
  availability: 'available' | 'unavailable';
}>;

export type FleetOrderDetailDataView = Readonly<{
  id: string;
  reference: string;
  status: OrderStatus;
  updatedAtLabel: string;
  route: Readonly<{
    origin: Readonly<{ id: string; label: string; metadata: string }>;
    stops: readonly Readonly<{ id: string; label: string; metadata: string }>[];
    destination: Readonly<{ id: string; label: string; metadata: string }>;
  }>;
  eta: Readonly<{
    label: string;
    sourceLabel: string | null;
  }>;
  driverLabel: string;
  customerLabel: string;
  cargoSummary: string;
  tracking: Readonly<{
    state: FleetMapState;
    statusLabel: string;
    lastUpdatedLabel: string | null;
    mapAlternative: string;
  }>;
  history: readonly FleetStatusHistoryItemView[];
  payment: Readonly<{
    status: PaymentStatus;
    amountLabel: string;
    methodLabel: string;
  }>;
  media: Readonly<{
    state: 'success' | 'error';
    message: string | null;
    items: readonly FleetMediaItemView[];
  }>;
}>;

export type FleetOrderDetailView = Readonly<{
  scenarioId: string;
  kind: 'order-detail';
  scope: FleetScopeView;
  order: FleetOrderDetailDataView;
  notice: FleetNoticeView | null;
}>;

export type FleetDashboardRouteView = FleetBoundaryView | FleetDashboardView;
export type FleetDriversRouteView = FleetBoundaryView | FleetDriversView;
export type FleetOrdersRouteView = FleetBoundaryView | FleetOrdersView;
export type FleetOrderDetailRouteView = FleetBoundaryView | FleetOrderDetailView;
export type FleetRouteView =
  | FleetDashboardRouteView
  | FleetDriversView
  | FleetOrdersView
  | FleetOrderDetailView;

export type FleetPreviewContext = Readonly<{
  preview?: string | null;
  scenario?: string | null;
}>;
