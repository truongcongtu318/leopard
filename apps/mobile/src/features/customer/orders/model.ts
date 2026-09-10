import type { OrderStatus, PaymentStatus, ProviderSource } from '@leopard/shared';

export type CustomerRoutePoint = Readonly<{
  id: string;
  label: string;
  coords?: LatLng;
}>;

export type CustomerRouteView = Readonly<{
  origin: CustomerRoutePoint;
  stops: readonly CustomerRoutePoint[];
  destination: CustomerRoutePoint;
  distanceLabel: string;
}>;

export type CustomerActionView = Readonly<{
  id: string;
  orderId?: string;
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

export type LatLng = Readonly<{ lat: number; lng: number }>;

export type AddressCandidate = Readonly<{
  placeId: string;
  label: string;
  address?: string;
  coords: LatLng;
}>;

export type ContactInfo = Readonly<{
  name: string;
  phone: string;
  note?: string;
}>;

export type CargoDimensions = Readonly<{
  length?: string;
  width?: string;
  height?: string;
}>;

export type PriceBreakdown = Readonly<{
  baseFareVnd: number;
  distanceFareVnd: number;
  stopSurchargeVnd: number;
  loadingFeeVnd: number;
  totalVnd: number;
}>;

export type CustomerCreateFormView = Readonly<{
  pickup: string;
  pickupCoords?: LatLng;
  senderInfo?: ContactInfo;
  stops: readonly Readonly<{ id: string; value: string; coords?: LatLng }>[];
  dropoff: string;
  dropoffCoords?: LatLng;
  receiverInfo?: ContactInfo;
  vehicleType: 'MOTORBIKE' | 'VAN' | 'TRUCK';
  cargoName?: string;
  cargoCategory?: string;
  cargoNote: string;
  cargoWeight: string;
  cargoDimensions?: CargoDimensions;
  cargoImageUri?: string | null;
  requiresLoadingSupport?: boolean;
  paymentMethod?: 'VIETQR' | 'CASH';
  createdOrderReference?: string;
  priceBreakdown?: PriceBreakdown;
  fieldErrors: Readonly<Partial<Record<'pickup' | 'dropoff' | 'cargoWeight', string>>>;
}>;

export type CongestionLevel = 'low' | 'moderate' | 'heavy' | 'severe' | 'unknown';

export type CustomerRouteOptionView = Readonly<{
  routeId: string;
  estimateToken: string;
  isRecommended: boolean;
  durationSeconds: number;
  distanceLabel: string;
  priceLabel: string;
  congestionLevel: CongestionLevel;
  congestionLabel: string;
}>;

export type CustomerEstimateView =
  | Readonly<{ kind: 'none' | 'outdated' | 'expired' }>
  | Readonly<{ kind: 'loading'; source: ProviderSource }>
  | Readonly<{ kind: 'error'; message: string; source: ProviderSource }>
  | Readonly<{
      kind: 'ready';
      source: ProviderSource;
      routes: readonly CustomerRouteOptionView[];
      selectedRouteId: string;
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
  qrPayload?: string;
  notice: string | null;
  action: CustomerActionView | null;
}>;

export type InvoiceView = Readonly<{
  id: string;
  invoiceNumber: string;
  totalLabel: string;
  issuedAtLabel: string;
  emailSentAt: string | null;
  viewUrl: string;
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
  distanceMeters: number | null;
  cargo: Readonly<{ note: string | null; weightKg: number | null }>;
  tracking: CustomerTrackingView;
  payment: CustomerPaymentView;
  invoice: InvoiceView | null;
  media: Readonly<{
    kind: 'available' | 'empty' | 'error';
    label: string;
    description: string;
    mediaId?: string | null;
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
