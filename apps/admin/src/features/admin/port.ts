import type {
  AdminCommandKind,
  AdminListFilters,
  AdminListRouteView,
  AdminListScreen,
  AdminOrderDetailRouteView,
  AdminOverviewRouteView,
} from './model';

export const ADMIN_OPERATIONS_CAPABILITIES = Object.freeze([
  'readOverview',
  'readOrders',
  'readOrderDetail',
  'readUsers',
  'readFleets',
  'readDrivers',
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
  readList: (resource: AdminListScreen, filters: AdminListFilters) => Promise<AdminListRouteView>;
  executeAuditedCommand: (input: AdminCommandInput) => Promise<AdminCommandResult>;
  executeCommand: (input: AdminCommandInput) => Promise<AdminCommandResult>;
  subscribeToReadEvents: (
    onEvent: (event: Readonly<{ resource: string; revision: string }>) => void,
  ) => Readonly<{ unsubscribe: () => void }>;
}>;

export type AdminOperationsPort = AdminPort;
