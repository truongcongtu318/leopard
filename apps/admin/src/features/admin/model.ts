import type {
  CommandDialogState,
  DriverAvailability,
  FleetMemberStatus,
  OrderStatus,
  PaymentStatus,
  UserStatus,
} from '@leopard/ui';

export type AdminPreviewScreen =
  | 'overview'
  | 'orders'
  | 'order-detail'
  | 'users'
  | 'fleets'
  | 'drivers';

export type AdminListScreen = Exclude<AdminPreviewScreen, 'overview' | 'order-detail'>;

export type AdminBoundaryView = Readonly<{
  scenarioId: string;
  kind: 'permission-denied' | 'session-expired' | 'loading' | 'error';
  title: string;
  message: string;
}>;

export type AdminNoticeView = Readonly<{
  tone: 'info' | 'warning' | 'danger' | 'success';
  title: string;
  message: string;
  requestId?: string;
}>;

export type AdminOperationalCondition = Readonly<{
  id: string;
  domain: 'health' | 'tracking' | 'media' | 'payment' | 'order' | 'user' | 'fleet' | 'driver';
  label: string;
  detail: string;
  tone: 'neutral' | 'info' | 'warning' | 'success' | 'danger';
  updatedAtLabel: string;
  targetHref?: string;
  targetScenario?: string;
}>;

export type AdminMetricView = Readonly<{
  id: string;
  label: string;
  value: number;
  detail: string;
  href?: string;
}>;

export type AdminOrderSummaryView = Readonly<{
  id: string;
  reference: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  updatedAtLabel: string;
  href: string;
}>;

export type AdminOverviewView = Readonly<{
  scenarioId: string;
  kind: 'overview';
  state: 'ready' | 'readiness-failed' | 'offline';
  checkedAtLabel: string;
  health: Readonly<{
    liveness: 'UP';
    readiness: 'READY' | 'FAILED';
    dependencyLabel: string;
    requestId: string | null;
  }>;
  metrics: readonly AdminMetricView[];
  orderDistribution: readonly Readonly<{
    status: OrderStatus;
    count: number;
  }>[];
  exceptions: readonly AdminOperationalCondition[];
  recentOrders: readonly AdminOrderSummaryView[];
  notice: AdminNoticeView | null;
}>;

export type AdminListFilters = Readonly<{
  status: 'ALL' | OrderStatus;
  role: 'ALL' | 'CUSTOMER' | 'DRIVER' | 'FLEET_OWNER' | 'ADMIN';
  userStatus: 'ALL' | UserStatus;
  availability: 'ALL' | DriverAvailability;
  membershipStatus: 'ALL' | FleetMemberStatus;
  fleetId: string;
  customerId: string;
  driverId: string;
  from: string;
  to: string;
  sort: 'updated-desc' | 'updated-asc' | 'reference-asc' | 'name-asc' | 'name-desc';
  page: number;
  pageSize: 20 | 50 | 100;
}>;

export type AdminCommandKind =
  | 'CANCEL_ORDER'
  | 'DISABLE_USER'
  | 'ENABLE_USER'
  | 'CONFIRM_MANUAL_PAYMENT';

export type AdminCommandView = Readonly<{
  kind: AdminCommandKind;
  targetId: string;
  targetLabel: string;
  currentStateLabel: string;
  proposedStateLabel: string;
  reasonPolicy: Readonly<{
    label: string;
    required: boolean;
    minLength: number;
    maxLength: number;
    hint: string;
  }>;
  consequence: string;
  isIrreversible: boolean;
  contextVersion: string;
  commandLabel: string;
  buttonVariant: 'primary' | 'destructive';
  targetItems: readonly Readonly<{
    id: string;
    label: string;
    value: string;
  }>[];
}>;

export type AdminDialogPreviewView = Readonly<{
  commandKind: AdminCommandKind;
  state: CommandDialogState;
  reasonValue: string;
  reasonError: string | null;
  message: string | null;
}>;

export type AdminOrderListItemView = Readonly<{
  entity: 'order';
  id: string;
  reference: string;
  createdAtLabel: string;
  routeLabel: string;
  customerLabel: string;
  driverLabel: string;
  status: OrderStatus;
  trackingLabel: string;
  trackingTone: 'neutral' | 'warning' | 'success';
  paymentStatus: PaymentStatus;
  amountLabel: string;
  href: string;
}>;

export type AdminUserListItemView = Readonly<{
  entity: 'user';
  id: string;
  displayName: string;
  maskedPhone: string;
  role: 'CUSTOMER' | 'DRIVER' | 'FLEET_OWNER' | 'ADMIN';
  status: UserStatus;
  updatedAtLabel: string;
  exceptionLabel: string | null;
  availableCommands: readonly AdminCommandView[];
}>;

export type AdminFleetListItemView = Readonly<{
  entity: 'fleet';
  id: string;
  displayId: string;
  displayName: string;
  ownerSummary: string;
  activeMembershipCount: number;
  driverCount: number;
  orderCount: number;
  membershipState: 'success' | 'empty' | 'error';
  membershipMessage: string;
  updatedAtLabel: string;
}>;

export type AdminDriverListItemView = Readonly<{
  entity: 'driver';
  id: string;
  displayName: string;
  maskedPhone: string;
  accountStatus: UserStatus;
  availability: DriverAvailability;
  membershipStatus: FleetMemberStatus;
  fleetLabel: string;
  activeOrder: Readonly<{ reference: string; href: string }> | null;
  locationLabel: string;
  locationUpdatedAtLabel: string;
  locationCondition: 'current' | 'stale' | 'unavailable';
}>;

export type AdminListItemView =
  | AdminOrderListItemView
  | AdminUserListItemView
  | AdminFleetListItemView
  | AdminDriverListItemView;

export type AdminListView = Readonly<{
  scenarioId: string;
  kind: 'list';
  entity: AdminListScreen;
  state: 'success' | 'no-results';
  title: string;
  checkedAtLabel: string;
  filters: AdminListFilters;
  result: Readonly<{
    items: readonly AdminListItemView[];
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    filterSummary: string;
    revision: string;
  }>;
  notice: AdminNoticeView | null;
  dialogPreview: AdminDialogPreviewView | null;
}>;

export type AdminRoutePointView = Readonly<{
  id: string;
  label: string;
  metadata: string;
}>;

export type AdminAuditEntryView = Readonly<{
  id: string;
  outcomeLabel: string;
  actionLabel: string;
  actorLabel: string;
  targetLabel: string;
  reason: string;
  timestampLabel: string;
  dateTime: string;
  requestId: string;
  auditId: string;
}>;

export type AdminAuditRailView = Readonly<{
  state: 'success' | 'empty' | 'error' | 'delayed';
  message: string | null;
  entries: readonly AdminAuditEntryView[];
}>;

export type AdminOrderDetailDataView = Readonly<{
  id: string;
  reference: string;
  status: OrderStatus;
  customerLabel: string;
  driverLabel: string;
  updatedAtLabel: string;
  cargoSummary: string;
  route: Readonly<{
    origin: AdminRoutePointView;
    stops: readonly AdminRoutePointView[];
    destination: AdminRoutePointView;
  }>;
  eta: Readonly<{ label: string; sourceLabel: string }>;
  tracking: Readonly<{
    state: 'route' | 'stale' | 'no-location' | 'unavailable';
    statusLabel: string;
    lastUpdatedLabel: string | null;
    mapAlternative: string;
  }>;
  history: readonly Readonly<{
    id: string;
    label: string;
    description: string;
    timestampLabel: string;
    dateTime: string;
    isCurrent: boolean;
  }>[];
  media: Readonly<{
    state: 'success' | 'empty' | 'error';
    message: string | null;
    items: readonly Readonly<{
      id: string;
      label: string;
      mediaType: string;
      capturedAtLabel: string;
    }>[];
  }>;
  payment: Readonly<{
    id: string;
    status: PaymentStatus;
    amountLabel: string;
    sourceLabel: string;
    referenceLabel: string;
    expiresAtLabel: string | null;
  }>;
}>;

export type AdminOrderDetailView = Readonly<{
  scenarioId: string;
  kind: 'order-detail';
  order: AdminOrderDetailDataView;
  audit: AdminAuditRailView;
  availableCommands: readonly AdminCommandView[];
  dialogPreview: AdminDialogPreviewView | null;
  notice: AdminNoticeView | null;
}>;

export type AdminOverviewRouteView = AdminBoundaryView | AdminOverviewView;
export type AdminListRouteView = AdminBoundaryView | AdminListView;
export type AdminOrderDetailRouteView = AdminBoundaryView | AdminOrderDetailView;
export type AdminRouteView = AdminOverviewView | AdminListView | AdminOrderDetailView | AdminBoundaryView;

export type AdminPreviewContext = Readonly<{
  preview?: string | null;
  scenario?: string | null;
  command?: string | null;
  rawSearch?: string | null;
}>;
