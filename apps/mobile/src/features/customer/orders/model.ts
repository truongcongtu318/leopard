import type { OrderStatus, PaymentStatus, ProviderSource } from '@leopard/shared';

export type CustomerRoutePoint = Readonly<{
  id: string;
  label: string;
}>;

export type CustomerRouteView = Readonly<{
  origin: CustomerRoutePoint;
  stops: readonly CustomerRoutePoint[];
  destination: CustomerRoutePoint;
  distanceLabel: string;
}>;

export type CustomerActionView = Readonly<{
  id: string;
  label: string;
  emphasis: 'primary' | 'secondary' | 'destructive';
  disabled?: boolean;
  disabledReason?: string;
  isPending?: boolean;
  pendingLabel?: string;
}>;

export type CustomerOrderListItemView = Readonly<{
  id: string;
  reference: string;
  status: OrderStatus;
  route: CustomerRouteView;
  etaLabel: string;
  priceLabel: string;
  updatedAtLabel: string;
}>;

export type CustomerOrderFilter = 'ALL' | OrderStatus;

type CustomerListBoundaryView = Readonly<{
  scenarioId: string;
  kind: 'loading' | 'empty' | 'no-results' | 'error' | 'permission-denied';
  title: string;
  message: string;
}>;

export type CustomerListContentView = Readonly<{
  scenarioId: string;
  kind: 'content';
  contentState: 'success' | 'refreshing' | 'page-error' | 'offline';
  notice: string | null;
  orders: readonly CustomerOrderListItemView[];
  selectedFilter: CustomerOrderFilter;
  resultLabel: string;
  canLoadMore: boolean;
  isLoadingMore: boolean;
}>;

export type CustomerListView = CustomerListBoundaryView | CustomerListContentView;

export type CustomerCreateFormView = Readonly<{
  pickup: string;
  stops: readonly Readonly<{ id: string; value: string }>[];
  dropoff: string;
  vehicleType: 'MOTORBIKE' | 'VAN' | 'TRUCK';
  cargoNote: string;
  cargoWeight: string;
  fieldErrors: Readonly<Partial<Record<'pickup' | 'dropoff' | 'cargoWeight', string>>>;
}>;

export type CustomerEstimateView =
  | Readonly<{ kind: 'none' | 'outdated' | 'expired' }>
  | Readonly<{ kind: 'loading'; source: ProviderSource }>
  | Readonly<{ kind: 'error'; message: string; source: ProviderSource }>
  | Readonly<{
      kind: 'ready';
      source: ProviderSource;
      durationSeconds: number;
      distanceLabel: string;
      priceLabel: string;
      calculatedAtLabel: string;
    }>;

type CustomerCreateBoundaryView = Readonly<{
  scenarioId: string;
  kind: 'permission-denied';
  title: string;
  message: string;
}>;

export type CustomerCreateFormScreenView = Readonly<{
  scenarioId: string;
  kind: 'form';
  phase:
    | 'ready'
    | 'invalid'
    | 'address-loading'
    | 'address-no-results'
    | 'address-error'
    | 'estimate-loading'
    | 'estimate-error'
    | 'estimate-ready'
    | 'estimate-outdated'
    | 'estimate-expired'
    | 'media-invalid'
    | 'media-retry'
    | 'submit-pending'
    | 'submit-error'
    | 'submit-conflict'
    | 'created-media-error'
    | 'success'
    | 'offline';
  form: CustomerCreateFormView;
  estimate: CustomerEstimateView;
  notice: string | null;
  actions: readonly CustomerActionView[];
}>;

export type CustomerCreateView = CustomerCreateBoundaryView | CustomerCreateFormScreenView;

export type CustomerTrackingView =
  | Readonly<{ kind: 'no-driver'; message: string }>
  | Readonly<{ kind: 'no-location'; driverLabel: string; message: string }>
  | Readonly<{
      kind: 'fresh';
      driverLabel: string;
      lastUpdatedLabel: string;
      summary: string;
    }>
  | Readonly<{
      kind: 'stale' | 'reconnecting' | 'disconnected';
      driverLabel: string;
      lastUpdatedLabel: string;
      message: string;
      summary: string;
    }>
  | Readonly<{ kind: 'map-error'; driverLabel: string; message: string }>
  | Readonly<{ kind: 'loading'; message: string }>;

export type CustomerPaymentView = Readonly<{
  status: PaymentStatus;
  amountLabel: string;
  referenceLabel?: string;
  expiresAtLabel?: string;
  sourceLabel: string;
  qrState: 'none' | 'ready' | 'expired';
  notice: string | null;
  action: CustomerActionView | null;
}>;

export type CustomerCancelView =
  | Readonly<{ kind: 'hidden' }>
  | Readonly<{ kind: 'unavailable'; reason: string }>
  | Readonly<{
      kind: 'available' | 'pending' | 'error' | 'conflict';
      message: string;
      action: CustomerActionView;
    }>;

export type CustomerOrderDetailDataView = Readonly<{
  id: string;
  reference: string;
  status: OrderStatus;
  route: CustomerRouteView;
  priceLabel: string;
  etaDurationSeconds: number;
  etaSource: ProviderSource;
  updatedAtLabel: string;
  tracking: CustomerTrackingView;
  payment: CustomerPaymentView;
  media: Readonly<{
    kind: 'available' | 'empty' | 'error';
    label: string;
    description: string;
  }>;
  history: readonly Readonly<{
    id: string;
    status: OrderStatus;
    timestampLabel: string;
    description: string;
  }>[];
}>;

type CustomerDetailBoundaryView = Readonly<{
  scenarioId: string;
  kind: 'loading' | 'error' | 'permission-denied';
  title: string;
  message: string;
}>;

export type CustomerDetailContentView = Readonly<{
  scenarioId: string;
  kind: 'content';
  notice: string | null;
  order: CustomerOrderDetailDataView;
  cancel: CustomerCancelView;
  actions: readonly CustomerActionView[];
}>;

export type CustomerDetailView = CustomerDetailBoundaryView | CustomerDetailContentView;

export type CustomerOrderIntent = Readonly<{
  actionId: string;
  orderId?: string;
  value?: string;
}>;
