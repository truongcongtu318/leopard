import type { DriverAvailability, OrderStatus, ProviderSource } from '@leopard/shared';

export type DriverRoutePoint = Readonly<{ id: string; label: string }>;
export type DriverRouteView = Readonly<{
  origin: DriverRoutePoint;
  stops: readonly DriverRoutePoint[];
  destination: DriverRoutePoint;
  distanceLabel: string;
  etaDurationSeconds: number;
  etaSource: ProviderSource;
}>;

export type DriverCommandView = Readonly<{
  id: string;
  orderId?: string;
  label: string;
  targetStatus?: OrderStatus;
  isPending?: boolean;
  pendingLabel?: string;
  disabled?: boolean;
  disabledReason?: string;
}>;

export type DriverAvailabilityView = Readonly<{
  status: DriverAvailability;
  action: Readonly<{
    id: string;
    label: string;
    target: DriverAvailability;
    isPending?: boolean;
    disabled?: boolean;
    disabledReason?: string;
  }> | null;
  error: string | null;
}>;

export type DriverPublicOrderView = Readonly<{
  id: string;
  reference: string;
  status: 'REQUESTED';
  publicRouteLabel: string;
  vehicleLabel: string;
  cargoSummary: string;
  etaLabel: string;
  updatedAtLabel: string;
}>;

export type DriverActiveTripView = Readonly<{
  id: string;
  reference: string;
  status: Exclude<OrderStatus, 'REQUESTED'>;
  route: DriverRouteView;
  trackingLabel: string;
  proofLabel: string | null;
}>;

type DriverListBoundaryView = Readonly<{
  scenarioId: string;
  kind: 'loading' | 'error' | 'permission-denied';
  title: string;
  message: string;
}>;

export type DriverListContentView = Readonly<{
  scenarioId: string;
  kind: 'content';
  availability: DriverAvailabilityView;
  activeTrip: DriverActiveTripView | null;
  requestedOrders: readonly DriverPublicOrderView[];
  notice: Readonly<{
    tone: 'info' | 'warning' | 'danger';
    message: string;
    actionLabel?: string;
  }> | null;
  refreshedAtLabel: string;
  isEmpty: boolean;
}>;

export type DriverListView = DriverListBoundaryView | DriverListContentView;

export type DriverTrackingView = Readonly<{
  kind:
    | 'not-started'
    | 'healthy'
    | 'stale'
    | 'offline'
    | 'reconnecting'
    | 'permission-denied'
    | 'unavailable';
  label: string;
  lastUpdatedLabel: string | null;
  queuedPointCount: number | null;
}>;

export type DriverProofView = Readonly<{
  kind:
    | 'empty'
    | 'required'
    | 'selected-local'
    | 'uploading'
    | 'persisted'
    | 'invalid-type'
    | 'too-large'
    | 'upload-retry';
  label: string;
  message: string;
  fileLabel: string | null;
}>;

export type DriverPrimaryTaskView =
  | Readonly<{ kind: 'accept'; command: DriverCommandView }>
  | Readonly<{ kind: 'advance-lifecycle'; command: DriverCommandView }>
  | Readonly<{ kind: 'upload-proof'; command: DriverCommandView }>
  | null;

type DriverPublicDetailOrder = DriverPublicOrderView;

type DriverAssignedDetailOrder = Readonly<{
  id: string;
  reference: string;
  status: Exclude<OrderStatus, 'REQUESTED'>;
  route: DriverRouteView;
  vehicleLabel: string;
  cargoSummary: string;
  customerContact: string;
  updatedAtLabel: string;
  history: readonly Readonly<{
    id: string;
    status: OrderStatus;
    timestampLabel: string;
    description: string;
  }>[];
}>;

type DriverDetailBoundaryView = Readonly<{
  scenarioId: string;
  kind: 'loading' | 'error' | 'permission-denied';
  title: string;
  message: string;
}>;

export type DriverConflictView = Readonly<{
  scenarioId: string;
  kind: 'conflict';
  title: string;
  message: string;
  recoveryLabel: string;
  activeOrderReference?: string;
}>;

export type DriverPublicDetailView = Readonly<{
  scenarioId: string;
  kind: 'content';
  accessScope: 'PUBLIC_SUMMARY';
  order: DriverPublicDetailOrder;
  tracking: DriverTrackingView;
  proof: DriverProofView;
  primaryTask: DriverPrimaryTaskView;
  offeredLifecycleCommand: DriverCommandView | null;
  notice: string | null;
}>;

export type DriverAssignedDetailView = Readonly<{
  scenarioId: string;
  kind: 'content';
  accessScope: 'ASSIGNED_FULL';
  order: DriverAssignedDetailOrder;
  tracking: DriverTrackingView;
  proof: DriverProofView;
  primaryTask: DriverPrimaryTaskView;
  offeredLifecycleCommand: DriverCommandView | null;
  notice: string | null;
}>;

export type DriverDetailContentView = DriverPublicDetailView | DriverAssignedDetailView;
export type DriverDetailView =
  | DriverDetailBoundaryView
  | DriverConflictView
  | DriverDetailContentView;
