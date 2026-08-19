import type {
  FleetDashboardRouteView,
  FleetDriverFilters,
  FleetDriversRouteView,
  FleetOrderDetailRouteView,
  FleetOrderFilters,
  FleetOrdersRouteView,
  FleetScopeView,
} from './model';

export const FLEET_QUERY_CAPABILITIES = Object.freeze([
  'readScope',
  'readDashboard',
  'readDrivers',
  'readOrders',
  'readOrderDetail',
  'subscribeToReadEvents',
] as const);

export type FleetReadEvent = Readonly<{
  resource: 'dashboard' | 'driver-list' | 'order-list' | 'order-detail';
  revision: string;
}>;

export type FleetQueryPort = Readonly<{
  readScope: () => Promise<FleetScopeView>;
  readDashboard: () => Promise<FleetDashboardRouteView>;
  readDrivers: (filters: FleetDriverFilters) => Promise<FleetDriversRouteView>;
  readOrders: (filters: FleetOrderFilters) => Promise<FleetOrdersRouteView>;
  readOrderDetail: (orderId: string) => Promise<FleetOrderDetailRouteView>;
  subscribeToReadEvents: (
    onEvent: (event: FleetReadEvent) => void,
  ) => Readonly<{ unsubscribe: () => void }>;
}>;

// Wave 4 intentionally has no mutation port. Wave 3 will implement these reads
// behind server-side role + active FleetMember ownership checks.
export type FleetPort = FleetQueryPort;
