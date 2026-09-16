import type {
  AdminCommandKind,
  AdminDispatchRouteView,
  AdminListFilters,
  AdminListRouteView,
  AdminListScreen,
  AdminLiveMapRouteView,
  AdminNotificationsRouteView,
  AdminOrderDetailRouteView,
  AdminOverviewRouteView,
  AdminPricingRouteView,
  AdminReportDetailRouteView,
  AdminRouteView,
  AdminSettingsRouteView,
  AdminSupportRouteView,
} from './model';

export const ADMIN_OPERATIONS_CAPABILITIES = Object.freeze([
  'readOverview',
  'readOrders',
  'readOrderDetail',
  'readUsers',
  'readFleets',
  'readDrivers',
  'readPayments',
  'readInvoices',
  'readAudit',
  'readPromotions',
  'readReviews',
  'readReports',
  'readReportDetail',
  'readDispatch',
  'readNotifications',
  'readPricing',
  'readLiveMap',
  'readSettings',
  'readSupport',
  'executeAuditedCommand',
  'subscribeToReadEvents',
] as const);

export type AdminCommandInput = Readonly<{
  kind: AdminCommandKind;
  targetId: string;
  reason: string;
  contextVersion: string;
  clientRequestId?: string;
  currentAdminId?: string;
}>;

export type AdminCommandResult = Readonly<{
  state: 'success' | 'conflict';
  requestId: string;
  auditId: string | null;
  persistedAt: string | null;
}>;

export type AdminPort = Readonly<{
  readOverview: () => Promise<AdminOverviewRouteView>;
  readOrders: (filters: AdminListFilters) => Promise<AdminListRouteView>;
  readOrderDetail: (orderId: string) => Promise<AdminOrderDetailRouteView>;
  readUsers: (filters: AdminListFilters) => Promise<AdminListRouteView>;
  readFleets: (filters: AdminListFilters) => Promise<AdminListRouteView>;
  readDrivers: (filters: AdminListFilters) => Promise<AdminListRouteView>;
  readPayments: (filters: AdminListFilters) => Promise<AdminListRouteView>;
  readInvoices: (filters: AdminListFilters) => Promise<AdminListRouteView>;
  readAudit: (filters: AdminListFilters) => Promise<AdminListRouteView>;
  readPromotions: (filters: AdminListFilters) => Promise<AdminListRouteView>;
  readReviews: (filters: AdminListFilters) => Promise<AdminListRouteView>;
  readReports: (filters: AdminListFilters) => Promise<AdminListRouteView>;
  readReportDetail: (reportId: string) => Promise<AdminReportDetailRouteView>;
  readDispatch: (filters?: AdminListFilters) => Promise<AdminDispatchRouteView>;
  readNotifications: (filters?: AdminListFilters) => Promise<AdminNotificationsRouteView>;
  readPricing: () => Promise<AdminPricingRouteView>;
  readLiveMap: (filters?: AdminListFilters) => Promise<AdminLiveMapRouteView>;
  readSettings: () => Promise<AdminSettingsRouteView>;
  readSupport: (filters?: AdminListFilters) => Promise<AdminSupportRouteView>;
  readList: (resource: AdminListScreen, filters: AdminListFilters) => Promise<AdminListRouteView>;
  executeAuditedCommand: (input: AdminCommandInput) => Promise<AdminCommandResult>;
  executeCommand: (input: AdminCommandInput) => Promise<AdminCommandResult>;
  subscribeToReadEvents: (
    onEvent: (event: Readonly<{ resource: string; revision: string }>) => void,
  ) => Readonly<{ unsubscribe: () => void }>;
}>;

export type AdminOperationsPort = AdminPort;
