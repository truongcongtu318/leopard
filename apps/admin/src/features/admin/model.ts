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
  | 'drivers'
  | 'payments'
  | 'invoices'
  | 'audit'
  | 'promotions'
  | 'reviews'
  | 'reports'
  | 'report-detail'
  | 'dispatch'
  | 'notifications'
  | 'pricing'
  | 'live-map'
  | 'settings'
  | 'support';

export type AdminListScreen = Exclude<
  AdminPreviewScreen,
  | 'overview'
  | 'order-detail'
  | 'report-detail'
  | 'dispatch'
  | 'notifications'
  | 'pricing'
  | 'live-map'
  | 'settings'
  | 'support'
>;

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
  value: number | string;
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
  customerLabel?: string;
  routeLabel?: string;
  amountLabel?: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
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
  status:
    | 'ALL'
    | OrderStatus
    | PaymentStatus
    | 'ISSUED'
    | 'VOIDED'
    | 'ACTIVE'
    | 'INACTIVE'
    | 'OPEN'
    | 'IN_PROGRESS'
    | 'RESOLVED'
    | 'CLOSED';
  role: 'ALL' | 'CUSTOMER' | 'DRIVER' | 'FLEET_OWNER' | 'ADMIN';
  userStatus: 'ALL' | UserStatus;
  availability: 'ALL' | DriverAvailability;
  membershipStatus: 'ALL' | FleetMemberStatus;
  fleetId: string;
  customerId: string;
  driverId: string;
  from: string;
  to: string;
  sort:
    | 'updated-desc'
    | 'updated-asc'
    | 'reference-asc'
    | 'name-asc'
    | 'name-desc'
    | 'code-asc'
    | 'rating-desc'
    | 'rating-asc';
  page: number;
  pageSize: 20 | 50 | 100;
  missingEmail?: boolean;
  actorId?: string;
  action?: string;
  targetId?: string;
  discountType?: 'ALL' | 'PERCENT' | 'FIXED';
  rating?: 'ALL' | '1' | '2' | '3' | '4' | '5';
  category?: string;
  orderId?: string;
  vehicleType?: string;
  q?: string;
}>;

export type AdminCommandKind =
  | 'CANCEL_ORDER'
  | 'DISABLE_USER'
  | 'ENABLE_USER'
  | 'CONFIRM_MANUAL_PAYMENT'
  | 'CREATE_PROMOTION'
  | 'UPDATE_PROMOTION'
  | 'TOGGLE_PROMOTION_STATUS'
  | 'HIDE_REVIEW'
  | 'RESOLVE_REPORT'
  | 'DISPATCH_MANUAL_REASSIGN'
  | 'BROADCAST_NOTIFICATION'
  | 'UPDATE_PRICING'
  | 'SEND_SUPPORT_MESSAGE';

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

export type AdminPaymentListItemView = Readonly<{
  entity: 'payment';
  id: string;
  orderId: string;
  orderCode: string;
  customerName: string;
  customerPhone: string | null;
  amountLabel: string;
  amountVnd: number;
  status: PaymentStatus;
  statusLabel: string;
  sourceLabel: string;
  referenceLabel: string;
  confirmedAtLabel: string | null;
  confirmedByName: string | null;
  confirmationNote: string | null;
  createdAtLabel: string;
  href: string;
  availableCommands: readonly AdminCommandView[];
}>;

export type AdminInvoiceListItemView = Readonly<{
  entity: 'invoice';
  id: string;
  invoiceNumber: string;
  orderId: string;
  orderCode: string;
  customerName: string;
  customerEmail: string | null;
  amountLabel: string;
  totalLabel: string;
  status: 'ISSUED' | 'VOIDED';
  issuedAtLabel: string;
  emailSentAtLabel: string | null;
  isMissingEmail: boolean;
  pdfDownloadUrl: string;
}>;

export type AdminPromotionListItemView = Readonly<{
  entity: 'promotion';
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  maxDiscountVnd: number | null;
  minOrderAmountVnd: number;
  usageLimit: number;
  usageCount: number;
  expiresAtLabel: string;
  isActive: boolean;
  statusLabel: string;
  availableCommands: readonly AdminCommandView[];
}>;

export type AdminReviewListItemView = Readonly<{
  entity: 'review';
  id: string;
  orderId: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  driverName: string;
  driverPhone: string;
  rating: number;
  comment: string;
  tipVndLabel: string;
  createdAtLabel: string;
  availableCommands: readonly AdminCommandView[];
}>;

export type AdminReportListItemView = Readonly<{
  entity: 'report';
  id: string;
  ticketNumber: string;
  orderId: string | null;
  orderCode: string | null;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail?: string | null | undefined;
  driverId: string | null;
  driverName: string | null;
  driverPhone?: string | null | undefined;
  category: string;
  categoryLabel: string;
  description: string;
  hasPhoto: boolean;
  photoUrls?: readonly string[] | undefined;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  statusLabel: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  severityLabel: string;
  createdAtLabel: string;
  updatedAtLabel: string;
  href: string;
}>;

export type AdminListItemView =
  | AdminOrderListItemView
  | AdminUserListItemView
  | AdminFleetListItemView
  | AdminDriverListItemView
  | AdminPaymentListItemView
  | AdminInvoiceListItemView
  | AdminAuditEntryView
  | AdminPromotionListItemView
  | AdminReviewListItemView
  | AdminReportListItemView;

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
  metrics?: readonly AdminMetricView[] | undefined;
}>;

export type AdminRoutePointView = Readonly<{
  id: string;
  label: string;
  metadata: string;
  lat?: number | undefined;
  lng?: number | undefined;
}>;

export type AdminAuditEntryView = Readonly<{
  entity: 'audit';
  id: string;
  actorId?: string | undefined;
  actorName?: string | undefined;
  actorRole?: string | undefined;
  action?: string | undefined;
  resourceType?: string | undefined;
  resourceId?: string | undefined;
  metadata?: Record<string, unknown> | null | undefined;
  createdAtLabel?: string | undefined;
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

export type AdminReportDetailDataView = Readonly<{
  ticket: AdminReportListItemView &
    Readonly<{
      photoUrls?: readonly string[] | undefined;
    }>;
  order: Readonly<{
    id: string;
    code: string;
    status: OrderStatus;
    statusLabel: string;
    priceVnd: number;
    priceLabel: string;
    pickupAddress: string;
    dropoffAddress: string;
    incidentReason?: string | null | undefined;
    incidentNote?: string | null | undefined;
    incidentReportedAtLabel?: string | null | undefined;
    paymentStatus?: string | null | undefined;
    paymentStatusLabel?: string | null | undefined;
    driverName?: string | null | undefined;
    driverPhone?: string | null | undefined;
    timeline?: readonly Readonly<{
      id: string;
      status: string;
      label: string;
      timestampLabel: string;
    }>[] | undefined;
  }> | null;
  customer: Readonly<{
    id: string;
    name: string;
    phone: string | null;
    email?: string | null | undefined;
  }>;
  driver: Readonly<{
    id: string;
    name: string;
    phone: string | null;
    vehicleType?: string | null | undefined;
  }> | null;
  internalNotes: readonly Readonly<{
    id: string;
    author: string;
    note: string;
    createdAtLabel: string;
  }>[];
}>;

export type AdminReportDetailView = Readonly<{
  scenarioId: string;
  kind: 'report-detail';
  report: AdminReportDetailDataView;
  audit: AdminAuditRailView;
  notice: AdminNoticeView | null;
}>;

export type AdminDispatchCandidateDriverView = Readonly<{
  driverId: string;
  driverName: string;
  maskedPhone: string;
  vehicleType: string;
  vehicleTypeLabel: string;
  distanceKm?: number | undefined;
  distanceLabel?: string | undefined;
  etaMinutes?: number | undefined;
  etaLabel: string;
  lat?: number | null | undefined;
  lng?: number | null | undefined;
}>;

export type AdminDispatchOrderItemView = Readonly<{
  orderId: string;
  orderCode: string;
  status: 'REQUESTED';
  vehicleType: string;
  vehicleTypeLabel: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupLat?: number | null | undefined;
  pickupLng?: number | null | undefined;
  dropoffLat?: number | null | undefined;
  dropoffLng?: number | null | undefined;
  waitingMinutes: number;
  createdAtLabel: string;
  customerName?: string | null | undefined;
  customerPhone?: string | null | undefined;
  priceVnd?: number | undefined;
  candidateDrivers: readonly AdminDispatchCandidateDriverView[];
}>;

export type AdminDispatchAvailableDriverView = Readonly<{
  driverId: string;
  driverName: string;
  vehicleType: string;
  lat: number;
  lng: number;
  availability: DriverAvailability;
}>;

export type AdminDispatchView = Readonly<{
  scenarioId: string;
  kind: 'dispatch';
  state: 'ready' | 'empty' | 'error';
  checkedAtLabel: string;
  totalWaitingOrders: number;
  orders: readonly AdminDispatchOrderItemView[];
  selectedOrderId: string | null;
  availableDrivers: readonly AdminDispatchAvailableDriverView[];
  notice: AdminNoticeView | null;
}>;

export type AdminOverviewRouteView = AdminBoundaryView | AdminOverviewView;
export type AdminListRouteView = AdminBoundaryView | AdminListView;
export type AdminOrderDetailRouteView = AdminBoundaryView | AdminOrderDetailView;
export type AdminReportDetailRouteView = AdminBoundaryView | AdminReportDetailView;
export type AdminDispatchRouteView = AdminBoundaryView | AdminDispatchView;

// Wave 3 Views
export type AdminBroadcastAudience = 'ALL' | 'CUSTOMER' | 'DRIVER' | 'FLEET_OWNER';
export type AdminBroadcastType = 'SYSTEM' | 'PROMO' | 'ORDER';

export type AdminBroadcastLogItemView = Readonly<{
  id: string;
  audience: AdminBroadcastAudience;
  audienceLabel: string;
  type: AdminBroadcastType;
  typeLabel: string;
  title: string;
  body: string;
  sentCount: number;
  createdAtLabel: string;
  createdByName: string;
}>;

export type AdminNotificationsView = Readonly<{
  scenarioId: string;
  kind: 'notifications';
  state: 'ready' | 'empty' | 'error';
  checkedAtLabel: string;
  totalSentBroadcasts: number;
  totalAudienceReach: number;
  audienceCounts: Readonly<{
    ALL: number;
    CUSTOMER: number;
    DRIVER: number;
    FLEET_OWNER: number;
  }>;
  broadcastLogs: readonly AdminBroadcastLogItemView[];
  notice: AdminNoticeView | null;
}>;

export type AdminNotificationsRouteView = AdminBoundaryView | AdminNotificationsView;

export type AdminVehiclePricingRateView = Readonly<{
  vehicleType: string;
  vehicleTypeLabel: string;
  baseFareVnd: number;
  perKmVnd: number;
  loadingFeeVnd: number;
}>;

export type AdminPricingView = Readonly<{
  scenarioId: string;
  kind: 'pricing';
  state: 'ready' | 'error';
  checkedAtLabel: string;
  minimumFareVnd: number;
  stopSurchargeVnd: number;
  vehicleRates: readonly AdminVehiclePricingRateView[];
  updatedAtLabel: string;
  updatedByName: string;
  availableCommands: readonly AdminCommandView[];
  notice: AdminNoticeView | null;
}>;

export type AdminPricingRouteView = AdminBoundaryView | AdminPricingView;

export type AdminLiveMapDriverView = Readonly<{
  driverId: string;
  driverName: string;
  phone: string;
  maskedPhone: string;
  vehicleType: string;
  vehicleTypeLabel: string;
  licensePlate: string;
  status: 'ONLINE' | 'BUSY' | 'OFFLINE';
  statusLabel: string;
  lat: number;
  lng: number;
  speedKmh: number;
  activeOrderCode?: string | null | undefined;
  activeOrderId?: string | null | undefined;
  etaMinutesLabel?: string | null | undefined;
  lastPingLabel: string;
}>;

export type AdminLiveMapOrderView = Readonly<{
  orderId: string;
  orderCode: string;
  status: OrderStatus;
  statusLabel: string;
  customerName: string;
  driverName?: string | null | undefined;
  vehicleType: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  etaLabel: string;
  currentLat?: number | null | undefined;
  currentLng?: number | null | undefined;
}>;

export type AdminLiveMapView = Readonly<{
  scenarioId: string;
  kind: 'live-map';
  state: 'ready' | 'error';
  checkedAtLabel: string;
  isSimulationMode: boolean;
  metrics: Readonly<{
    totalOnlineDrivers: number;
    totalBusyDrivers: number;
    totalActiveOrders: number;
    avgEtaMinutes: number;
  }>;
  drivers: readonly AdminLiveMapDriverView[];
  orders: readonly AdminLiveMapOrderView[];
  notice: AdminNoticeView | null;
}>;

export type AdminLiveMapRouteView = AdminBoundaryView | AdminLiveMapView;

export type AdminProviderHealthStatus = 'HEALTHY' | 'DEGRADED' | 'OUTAGE';

export type AdminProviderCardView = Readonly<{
  id: 'maps' | 'auth' | 'storage' | 'payment';
  name: string;
  category: string;
  provider: string;
  status: AdminProviderHealthStatus;
  statusLabel: string;
  latencyMs: number;
  mode: 'PRODUCTION' | 'DEMO_SIMULATION';
  modeLabel: string;
  details: readonly Readonly<{ label: string; value: string }>[];
}>;

export type AdminSettingsView = Readonly<{
  scenarioId: string;
  kind: 'settings';
  state: 'ready' | 'error';
  checkedAtLabel: string;
  isDemoMode: boolean;
  systemInfo: Readonly<{
    version: string;
    environment: string;
    nodeEnv: string;
    uptimeLabel: string;
    databaseStatus: string;
    cacheStatus: string;
  }>;
  providers: readonly AdminProviderCardView[];
  notice: AdminNoticeView | null;
}>;

export type AdminSettingsRouteView = AdminBoundaryView | AdminSettingsView;

export type AdminSupportMessageView = Readonly<{
  id: string;
  orderId: string;
  senderId: string;
  senderName: string;
  senderRole: 'CUSTOMER' | 'DRIVER' | 'ADMIN' | 'SYSTEM';
  body: string;
  createdAtLabel: string;
  isFromMe: boolean;
}>;

export type AdminSupportConversationView = Readonly<{
  orderId: string;
  orderCode: string;
  orderStatus: string;
  orderStatusLabel: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  maskedPhone: string;
  driverId: string | null;
  driverName: string | null;
  driverPhone: string | null;
  lastMessageSnippet: string;
  lastMessageAtLabel: string;
  unreadCount: number;
  status: 'ACTIVE' | 'WAITING_REPLY' | 'RESOLVED';
  statusLabel: string;
}>;

export type AdminSupportView = Readonly<{
  scenarioId: string;
  kind: 'support';
  state: 'ready' | 'error';
  checkedAtLabel: string;
  metrics: Readonly<{
    totalActiveChats: number;
    waitingReplyCount: number;
    avgResponseMinutes: number;
    satisfactionCsat: number;
  }>;
  conversations: readonly AdminSupportConversationView[];
  selectedOrderId: string | null;
  selectedConversation: AdminSupportConversationView | null;
  activeMessages: readonly AdminSupportMessageView[];
  notice: AdminNoticeView | null;
}>;

export type AdminSupportRouteView = AdminBoundaryView | AdminSupportView;

export type AdminRouteView =
  | AdminOverviewView
  | AdminListView
  | AdminOrderDetailView
  | AdminReportDetailView
  | AdminDispatchView
  | AdminNotificationsView
  | AdminPricingView
  | AdminLiveMapView
  | AdminSettingsView
  | AdminSupportView
  | AdminBoundaryView;

export type AdminPreviewContext = Readonly<{
  preview?: string | null;
  scenario?: string | null;
  command?: string | null;
  rawSearch?: string | null;
}>;
