import type {
  AdminCommandKind,
  AdminListFilters,
  AdminListRouteView,
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
}>;

export type AdminCommandResult = Readonly<{
  state: 'success' | 'conflict';
  requestId: string;
  auditId: string | null;
  persistedAt: string | null;
}>;

export type AdminOperationsPort = Readonly<{
  readOverview: () => Promise<AdminOverviewRouteView>;
  readOrders: (filters: AdminListFilters) => Promise<AdminListRouteView>;
  readOrderDetail: (orderId: string) => Promise<AdminOrderDetailRouteView>;
  readUsers: (filters: AdminListFilters) => Promise<AdminListRouteView>;
  readFleets: (filters: AdminListFilters) => Promise<AdminListRouteView>;
  readDrivers: (filters: AdminListFilters) => Promise<AdminListRouteView>;
  executeAuditedCommand: (input: AdminCommandInput) => Promise<AdminCommandResult>;
  subscribeToReadEvents: (
    onEvent: (event: Readonly<{ resource: string; revision: string }>) => void,
  ) => Readonly<{ unsubscribe: () => void }>;
}>;

// Wave 4 defines presentation ports only. Wave 3 owns authorization, transactions,
// idempotency, persisted outcomes, audit writes and realtime reconciliation.
