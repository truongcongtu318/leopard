import type {
  OrderStatus,
  PaymentStatus,
  ProviderSource,
  VehicleType,
} from '@leopard/shared';

import { ApiError } from '../../../api/api-error';
import type {
  AddressCandidate,
  CustomerCancelView,
  CustomerCreateFormView,
  CustomerCreateView,
  CustomerDetailContentView,
  CustomerDetailView,
  CustomerListView,
  CustomerOrderDetailDataView,
  CustomerOrderFilter,
  CustomerOrderIntent,
  CustomerOrderListItemView,
  CustomerPaymentView,
  CustomerRoutePoint,
  CustomerRouteView,
  CustomerTrackingView,
  CongestionLevel,
  CustomerRouteOptionView,
  InvoiceView,
} from './model';
import type { CustomerOrdersPort } from './port';

export function getDefaultHttpClient(): CustomerHttpClient {
  const { httpClient } = require('../../../api/http-client');
  return httpClient as CustomerHttpClient;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeRouteParam(
  value: string | readonly string[] | undefined,
): string | null {
  if (typeof value === 'string') return value;
  return value?.[0] ?? null;
}

export function parseCustomerOrderId(
  value: string | readonly string[] | undefined,
): string | null {
  const normalized = normalizeRouteParam(value);
  return normalized && UUID_PATTERN.test(normalized) ? normalized : null;
}

export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

export function formatVndPrice(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0 ₫';
  }
  const integerPart = Math.round(amount).toString();
  const formatted = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formatted} ₫`;
}

export function formatDistance(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || isNaN(meters)) {
    return '0,0 km';
  }
  const km = meters / 1000;
  return `${km.toFixed(1).replace('.', ',')} km`;
}

export function formatDateTime(
  dateInput: string | Date | null | undefined,
): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${hours}:${minutes} · ${day}/${month}/${year}`;
}

export function formatTimeOnly(
  dateInput: string | Date | null | undefined,
): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatOrderReference(order: {
  id: string;
  reference?: string;
  createdAt?: string;
}): string {
  if (order.reference) return order.reference;
  if (order.id.startsWith('LP-')) return order.id;
  const shortId = order.id.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `LP-${shortId}`;
}

export function formatPaymentReference(payment: {
  id?: string;
  paymentId?: string;
  referenceLabel?: string;
}): string {
  if (payment.referenceLabel) return payment.referenceLabel;
  const rawId = payment.paymentId ?? payment.id;
  if (!rawId) return 'LPRD-DEMO-260815-001';
  if (rawId.startsWith('LPRD-')) return rawId;
  const shortId = rawId.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `LPRD-${shortId}`;
}

export function formatStatusFilterLabel(filter: CustomerOrderFilter): string {
  switch (filter) {
    case 'REQUESTED':
      return 'Chờ tài xế';
    case 'ACCEPTED':
      return 'Đã nhận';
    case 'PICKING_UP':
      return 'Đang lấy hàng';
    case 'IN_TRANSIT':
      return 'Đang vận chuyển';
    case 'DELIVERED':
      return 'Đã giao';
    case 'CANCELLED':
      return 'Đã hủy';
    default:
      return 'Tất cả';
  }
}

export function describeStatus(status: OrderStatus): string {
  switch (status) {
    case 'REQUESTED':
      return 'Đơn đã được ghi nhận.';
    case 'ACCEPTED':
      return 'Tài xế đã nhận đơn.';
    case 'PICKING_UP':
      return 'Tài xế đang đến lấy hàng.';
    case 'IN_TRANSIT':
      return 'Hàng đang được vận chuyển.';
    case 'DELIVERED':
      return 'Đơn hàng đã được giao thành công.';
    case 'CANCELLED':
      return 'Đã nhận snapshot phản hồi với trạng thái Đã hủy.';
    default:
      return 'Trạng thái đơn hàng cập nhật.';
  }
}

export interface MappedOrderStopResponse {
  id: string;
  type: string;
  sequence: number;
  address: string;
  lat: number;
  lng: number;
}

export interface MappedOrderStatusHistoryResponse {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  actorId: string | null;
  reason: string | null;
  createdAt: string;
}

export interface MappedTrackingPointResponse {
  id: string;
  orderId: string;
  driverId: string;
  clientPointId?: string;
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
  accuracyM?: number | null;
  capturedAt: string;
  createdAt?: string;
}

export interface MappedTrackingHistoryResponse {
  orderId: string;
  points?: MappedTrackingPointResponse[];
  latestPoint?: MappedTrackingPointResponse | null;
}

export interface MappedPaymentResponse {
  id: string;
  paymentId?: string;
  orderId: string;
  provider?: string;
  status: string;
  amountVnd?: number;
  amount?: number;
  qrPayload?: string | null;
  providerSnapshot?: Record<string, unknown> | null;
  expiresAt?: string | null;
  referenceLabel?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MappedInvoiceResponse {
  id: string;
  invoiceNumber: string;
  amountVnd: number;
  vatRateVnd: number;
  totalVnd: number;
  issuedAt: string;
  emailSentAt: string | null;
  viewUrl: string;
}

export function mapInvoiceToView(invoice: MappedInvoiceResponse): InvoiceView {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    totalLabel: formatVndPrice(invoice.totalVnd),
    issuedAtLabel: formatDateTime(invoice.issuedAt),
    emailSentAt: invoice.emailSentAt,
    viewUrl: invoice.viewUrl,
  };
}

export interface PaymentQrApiResponse {
  paymentId: string;
  orderId: string;
  qrPayload?: string;
  amountVnd: number;
  status: PaymentStatus;
  provider: ProviderSource;
  expiresAt?: string;
  referenceLabel?: string;
  createdAt?: string;
}

export interface MappedOrderResponse {
  id: string;
  reference?: string;
  customerId?: string;
  driverId: string | null;
  status: string;
  routeSnapshot?: unknown;
  providerSource: string | null;
  distanceMeters: number | null;
  durationSeconds: number | null;
  priceVnd: number | null;
  etaSeconds: number | null;
  acceptedAt?: string | null;
  pickingUpAt?: string | null;
  inTransitAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  stops?: MappedOrderStopResponse[];
  statusHistory?: MappedOrderStatusHistoryResponse[];
  tracking?: MappedTrackingHistoryResponse | MappedTrackingPointResponse[];
  payment?: MappedPaymentResponse | PaymentQrApiResponse;
  media?: Array<{ id: string; type: string; createdAt: string }>;
}

export interface CustomerOrdersListApiResponse {
  items: MappedOrderResponse[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface RouteOptionApiResponse {
  routeId: string;
  estimateToken: string;
  isRecommended: boolean;
  polyline: string;
  distanceM: number;
  durationS: number;
  estimatedArrivalAt: string;
  estimatedPriceVnd: number;
  source: ProviderSource;
  calculatedAt: string;
  isEstimate: boolean;
  congestionLevel: CongestionLevel;
}

export interface OrderEstimateApiResponse {
  routes: RouteOptionApiResponse[];
}

export function describeCongestionLevel(level: CongestionLevel): string {
  switch (level) {
    case 'low':
      return 'Thông thoáng';
    case 'moderate':
      return 'Hơi đông';
    case 'heavy':
      return 'Kẹt xe';
    case 'severe':
      return 'Rất kẹt xe';
    default:
      return 'Chưa rõ giao thông';
  }
}

export function mapRouteOptionToView(route: RouteOptionApiResponse): CustomerRouteOptionView {
  return {
    routeId: route.routeId,
    estimateToken: route.estimateToken,
    isRecommended: route.isRecommended,
    durationSeconds: route.durationS,
    distanceLabel: formatDistance(route.distanceM),
    priceLabel: formatVndPrice(route.estimatedPriceVnd),
    congestionLevel: route.congestionLevel,
    congestionLabel: describeCongestionLevel(route.congestionLevel),
  };
}

export interface CustomerHttpClient {
  get<T = unknown>(path: string): Promise<T>;
  post<T = unknown>(path: string, body?: unknown): Promise<T>;
  postForm<T = unknown>(path: string, form: FormData): Promise<T>;
  put<T = unknown>(path: string, body?: unknown): Promise<T>;
  delete<T = unknown>(path: string): Promise<T>;
}

function isForbiddenError(error: unknown): boolean {
  if (ApiError.isApiError(error)) {
    return (
      error.statusCode === 403 ||
      error.code === 'FORBIDDEN' ||
      error.code === 'PERMISSION_DENIED'
    );
  }
  if (
    error &&
    typeof error === 'object' &&
    'statusCode' in error &&
    (error as { statusCode?: unknown }).statusCode === 403
  ) {
    return true;
  }
  return false;
}

export function mapOrderToListItem(
  order: MappedOrderResponse,
): CustomerOrderListItemView {
  const pickupStop = order.stops?.find(
    (s) => s.type === 'PICKUP' || s.sequence === 0,
  );
  const dropoffStop =
    order.stops?.find((s) => s.type === 'DROPOFF') ??
    order.stops?.[(order.stops?.length ?? 1) - 1];
  const intermediateStops =
    order.stops?.filter(
      (s) => s.type === 'STOP' && s !== pickupStop && s !== dropoffStop,
    ) ?? [];

  const origin: CustomerRoutePoint = {
    id: pickupStop?.id ?? 'pickup',
    label: pickupStop?.address ?? 'Điểm lấy hàng',
  };
  const destination: CustomerRoutePoint = {
    id: dropoffStop?.id ?? 'dropoff',
    label: dropoffStop?.address ?? 'Điểm giao hàng',
  };
  const stops: readonly CustomerRoutePoint[] = intermediateStops.map((s) => ({
    id: s.id,
    label: s.address,
  }));

  const distanceLabel = formatDistance(order.distanceMeters);
  const route: CustomerRouteView = {
    origin,
    stops,
    destination,
    distanceLabel,
  };

  let etaLabel: string;
  if (order.status === 'DELIVERED') {
    etaLabel = 'Đã hoàn tất';
  } else if (order.status === 'CANCELLED') {
    etaLabel = 'Đã hủy';
  } else {
    const durationSeconds = order.durationSeconds ?? order.etaSeconds ?? 0;
    const minutes = Math.max(1, Math.round(durationSeconds / 60));
    etaLabel = `${minutes} phút`;
  }

  return {
    id: order.id,
    reference: formatOrderReference(order),
    status: order.status as OrderStatus,
    route,
    etaLabel,
    priceLabel: formatVndPrice(order.priceVnd),
    updatedAtLabel: formatDateTime(order.updatedAt || order.createdAt),
  };
}

export function mapPaymentToView(
  payment?: MappedPaymentResponse | PaymentQrApiResponse | null,
  orderPriceVnd?: number | null,
  orderStatus?: OrderStatus,
): CustomerPaymentView {
  const amount =
    payment?.amountVnd ??
    (payment as { amount?: number })?.amount ??
    orderPriceVnd ??
    0;
  const amountLabel = formatVndPrice(amount);

  if (!payment) {
    if (orderStatus === 'DELIVERED') {
      return {
        status: 'PAID_MANUAL',
        amountLabel,
        sourceLabel: 'Xác nhận thủ công bởi hệ thống',
        qrState: 'none',
        notice: 'Thanh toán đã được xác nhận trong snapshot phản hồi.',
        action: null,
      };
    }
    const canCreate =
      orderStatus === 'REQUESTED' ||
      orderStatus === 'ACCEPTED' ||
      orderStatus === 'PICKING_UP' ||
      orderStatus === 'IN_TRANSIT';
    return {
      status: 'UNPAID',
      amountLabel,
      sourceLabel: 'VietQR',
      qrState: 'none',
      notice: null,
      action: canCreate
        ? {
            id: 'create-payment',
            label: 'Tạo mã QR thanh toán',
            emphasis: 'primary',
          }
        : null,
    };
  }

  const rawStatus = (payment.status || 'UNPAID') as PaymentStatus;
  const provider = (payment.provider || 'VIETQR') as ProviderSource;
  const isDemo = provider === 'DEMO';
  const sourceLabel =
    rawStatus === 'PAID_MANUAL'
      ? 'Xác nhận thủ công bởi hệ thống'
      : 'VietQR';

  const ref = formatPaymentReference(payment);

  if (rawStatus === 'PAID_MANUAL') {
    return {
      status: 'PAID_MANUAL',
      amountLabel,
      referenceLabel: ref,
      sourceLabel,
      qrState: 'none',
      notice: 'Thanh toán đã được xác nhận trong snapshot phản hồi.',
      action: null,
    };
  }

  if (rawStatus === 'FAILED') {
    return {
      status: 'FAILED',
      amountLabel,
      referenceLabel: ref,
      sourceLabel,
      qrState: 'none',
      notice: 'Chưa thể tạo thanh toán; không hiển thị chi tiết provider.',
      action: {
        id: 'retry-payment',
        label: 'Thử tạo lại mã QR',
        emphasis: 'secondary',
      },
    };
  }

  if (rawStatus === 'QR_CREATED') {
    const isExpired =
      payment.expiresAt &&
      !isNaN(new Date(payment.expiresAt).getTime()) &&
      new Date(payment.expiresAt).getTime() <= Date.now();

    if (isExpired) {
      return {
        status: 'QR_CREATED',
        amountLabel,
        referenceLabel: ref,
        expiresAtLabel: 'Đã hết hạn theo phản hồi hệ thống',
        sourceLabel,
        qrState: 'expired',
        notice: 'Mã QR đã hết hạn',
        action: {
          id: 'refresh-payment',
          label: 'Tạo mã QR mới',
          emphasis: 'secondary',
        },
      };
    }

    return {
      status: 'QR_CREATED',
      amountLabel,
      referenceLabel: ref,
      expiresAtLabel: payment.expiresAt
        ? formatDateTime(payment.expiresAt)
        : undefined,
      sourceLabel,
      qrState: 'ready',
      qrPayload: payment.qrPayload ? payment.qrPayload : undefined,
      notice: 'Mã QR đã sẵn sàng. Vui lòng quét mã VietQR để hoàn tất thanh toán.',
      action: null,
    };
  }

  return {
    status: 'UNPAID',
    amountLabel,
    referenceLabel: ref,
    sourceLabel,
    qrState: 'none',
    notice: null,
    action: {
      id: 'create-payment',
      label: 'Tạo mã QR thanh toán',
      emphasis: 'primary',
    },
  };
}

export function mapTrackingToView(
  order: MappedOrderResponse,
  trackingData?:
    | MappedTrackingHistoryResponse
    | MappedTrackingPointResponse[]
    | null,
): CustomerTrackingView {
  const status = order.status as OrderStatus;
  if (status === 'REQUESTED' || status === 'CANCELLED' || !order.driverId) {
    return { kind: 'no-driver', message: 'Chưa có tài xế nhận đơn.' };
  }

  const driverLabel = 'Tài xế Nguyễn Minh An';

  if (!trackingData) {
    const lastUpdatedLabel = formatDateTime(order.updatedAt || order.createdAt);
    const updatedTime = formatTimeOnly(order.updatedAt || order.createdAt);
    return {
      kind: 'fresh',
      driverLabel,
      lastUpdatedLabel,
      summary: `Bản đồ lộ trình; vị trí tài xế cập nhật lúc ${updatedTime}.`,
    };
  }

  let latestPoint: MappedTrackingPointResponse | null = null;
  if (Array.isArray(trackingData)) {
    if (trackingData.length > 0) {
      latestPoint = trackingData[trackingData.length - 1];
    }
  } else if (trackingData.latestPoint) {
    latestPoint = trackingData.latestPoint;
  } else if (trackingData.points && trackingData.points.length > 0) {
    latestPoint = trackingData.points[trackingData.points.length - 1];
  }

  if (!latestPoint) {
    return {
      kind: 'no-location',
      driverLabel,
      message: 'Chưa có vị trí tài xế.',
    };
  }

  const lastUpdatedLabel = formatDateTime(latestPoint.capturedAt);
  const updatedTime = formatTimeOnly(latestPoint.capturedAt);

  return {
    kind: 'fresh',
    driverLabel,
    lastUpdatedLabel,
    summary: `Bản đồ lộ trình; vị trí tài xế cập nhật lúc ${updatedTime}.`,
  };
}

export function mapOrderToDetail(
  order: MappedOrderResponse,
  trackingData?:
    | MappedTrackingHistoryResponse
    | MappedTrackingPointResponse[]
    | null,
  paymentData?: MappedPaymentResponse | PaymentQrApiResponse | null,
  invoiceData?: MappedInvoiceResponse | null,
): CustomerOrderDetailDataView {
  const pickupStop = order.stops?.find(
    (s) => s.type === 'PICKUP' || s.sequence === 0,
  );
  const dropoffStop =
    order.stops?.find((s) => s.type === 'DROPOFF') ??
    order.stops?.[(order.stops?.length ?? 1) - 1];
  const intermediateStops =
    order.stops?.filter(
      (s) => s.type === 'STOP' && s !== pickupStop && s !== dropoffStop,
    ) ?? [];

  const origin: CustomerRoutePoint = {
    id: pickupStop?.id ?? 'pickup',
    label: pickupStop?.address ?? 'Điểm lấy hàng',
    coords: pickupStop ? { lat: pickupStop.lat, lng: pickupStop.lng } : undefined,
  };
  const destination: CustomerRoutePoint = {
    id: dropoffStop?.id ?? 'dropoff',
    label: dropoffStop?.address ?? 'Điểm giao hàng',
    coords: dropoffStop ? { lat: dropoffStop.lat, lng: dropoffStop.lng } : undefined,
  };
  const stops: readonly CustomerRoutePoint[] = intermediateStops.map((s) => ({
    id: s.id,
    label: s.address,
    coords: { lat: s.lat, lng: s.lng },
  }));

  const distanceLabel = formatDistance(order.distanceMeters);
  const route: CustomerRouteView = {
    origin,
    stops,
    destination,
    distanceLabel,
  };

  const status = order.status as OrderStatus;
  const etaDurationSeconds = order.durationSeconds ?? order.etaSeconds ?? 0;
  const etaSource = (order.providerSource as ProviderSource) ?? 'VIETMAP';
  const cargo = extractCargoFromRouteSnapshot(order.routeSnapshot);

  const tracking = mapTrackingToView(order, trackingData ?? order.tracking);
  const payment = mapPaymentToView(
    paymentData ?? order.payment,
    order.priceVnd,
    status,
  );

  const cargoMedia = order.media?.find((m) => m.type === 'CARGO') ?? null;
  const media = cargoMedia
    ? {
        kind: 'available' as const,
        label: 'Ảnh hàng hóa',
        description: 'Ảnh hàng hóa đã tải lên.',
        mediaId: cargoMedia.id,
      }
    : {
        kind: 'empty' as const,
        label: 'Ảnh hàng hóa',
        description: 'Chưa có ảnh hàng hóa.',
        mediaId: null,
      };

  const history = (order.statusHistory ?? []).map((h) => ({
    id: h.id,
    status: h.toStatus as OrderStatus,
    timestampLabel: formatTimeOnly(h.createdAt),
    description: h.reason || describeStatus(h.toStatus as OrderStatus),
  }));

  if (history.length === 0) {
    history.push({
      id: `history-${order.id}`,
      status,
      timestampLabel: formatTimeOnly(order.createdAt),
      description: describeStatus(status),
    });
  }

  return {
    id: order.id,
    reference: formatOrderReference(order),
    status,
    route,
    priceLabel: formatVndPrice(order.priceVnd),
    etaDurationSeconds,
    etaSource,
    updatedAtLabel: formatDateTime(order.updatedAt || order.createdAt),
    distanceMeters: order.distanceMeters,
    cargo,
    tracking,
    payment,
    invoice: invoiceData ? mapInvoiceToView(invoiceData) : null,
    media,
    history,
  };
}

export function extractCargoFromRouteSnapshot(
  routeSnapshot: unknown,
): Readonly<{ note: string | null; weightKg: number | null }> {
  if (routeSnapshot && typeof routeSnapshot === 'object') {
    const snapshot = routeSnapshot as Record<string, unknown>;
    return {
      note: typeof snapshot.cargoNote === 'string' ? snapshot.cargoNote : null,
      weightKg: typeof snapshot.cargoWeightKg === 'number' ? snapshot.cargoWeightKg : null,
    };
  }
  return { note: null, weightKg: null };
}

export function buildConsolidatedCargoNote(form: CustomerCreateFormView): string | undefined {
  const parts: string[] = [];
  if (form.cargoName?.trim()) parts.push(`Hàng: ${form.cargoName.trim()}`);
  if (form.cargoCategory?.trim()) parts.push(`Loại: ${form.cargoCategory.trim()}`);
  if (
    form.cargoDimensions?.length ||
    form.cargoDimensions?.width ||
    form.cargoDimensions?.height
  ) {
    const d = form.cargoDimensions;
    parts.push(`Kích thước: ${d.length || '?'}x${d.width || '?'}x${d.height || '?'}cm`);
  }
  if (form.requiresLoadingSupport) parts.push('Bốc xếp: Có');
  if (form.senderInfo?.name) {
    parts.push(
      `Người gửi: ${form.senderInfo.name} (${form.senderInfo.phone})${form.senderInfo.note ? ` - ${form.senderInfo.note}` : ''}`,
    );
  }
  if (form.receiverInfo?.name) {
    parts.push(
      `Người nhận: ${form.receiverInfo.name} (${form.receiverInfo.phone})${form.receiverInfo.note ? ` - ${form.receiverInfo.note}` : ''}`,
    );
  }
  if (form.cargoNote?.trim()) {
    parts.push(form.cargoNote.trim());
  }
  return parts.length > 0 ? parts.join(' | ') : undefined;
}


export function resolveCancelView(
  order: MappedOrderResponse,
): CustomerCancelView {
  const status = order.status as OrderStatus;
  if (status === 'REQUESTED') {
    return {
      kind: 'available',
      message: 'Hủy đơn sẽ dừng yêu cầu tìm tài xế.',
      action: {
        id: 'cancel-order',
        label: 'Hủy đơn',
        emphasis: 'destructive',
      },
    };
  }
  if (
    status === 'ACCEPTED' ||
    status === 'PICKING_UP' ||
    status === 'IN_TRANSIT'
  ) {
    return {
      kind: 'unavailable',
      reason: 'Đơn đã có tài xế; quyền hủy không được hệ thống cung cấp.',
    };
  }
  return { kind: 'hidden' };
}

export function createCustomerHttpAdapter(
  client?: CustomerHttpClient,
): CustomerOrdersPort {
  const getClient = (): CustomerHttpClient => client ?? getDefaultHttpClient();

  return {
    async getOrdersView(
      filter: CustomerOrderFilter,
    ): Promise<CustomerListView> {
      const activeClient = getClient();
      try {
        const response = await activeClient.get<
          CustomerOrdersListApiResponse | MappedOrderResponse[]
        >('/orders');

        const items = Array.isArray(response)
          ? response
          : (response?.items ?? []);
        const page = Array.isArray(response) ? 1 : (response?.page ?? 1);
        const totalPages = Array.isArray(response)
          ? 1
          : (response?.totalPages ?? 1);

        if (items.length === 0) {
          return deepFreeze<CustomerListView>({
            scenarioId: 'C-LIST-EMPTY',
            kind: 'empty',
            title: 'Bạn chưa có đơn hàng nào',
            message: 'Tạo đơn đầu tiên khi bạn đã sẵn sàng gửi hàng.',
          });
        }

        const filtered =
          filter === 'ALL' ? items : items.filter((o) => o.status === filter);

        if (filtered.length === 0) {
          return deepFreeze<CustomerListView>({
            scenarioId: 'C-LIST-NO-RESULTS',
            kind: 'no-results',
            title: 'Không có đơn khớp bộ lọc',
            message: `Bộ lọc hiện tại: ${formatStatusFilterLabel(filter)}.`,
          });
        }

        return deepFreeze<CustomerListView>({
          scenarioId: 'C-LIST-SUCCESS',
          kind: 'content',
          contentState: 'success',
          notice: null,
          orders: filtered.map(mapOrderToListItem),
          selectedFilter: filter,
          resultLabel: `${filtered.length} đơn hàng`,
          canLoadMore: page < totalPages,
          isLoadingMore: false,
        });
      } catch (error) {
        if (isForbiddenError(error)) {
          return deepFreeze<CustomerListView>({
            scenarioId: 'C-LIST-PERMISSION',
            kind: 'permission-denied',
            title: 'Bạn không có quyền xem danh sách đơn này',
            message: 'Hãy quay về khu vực Customer được cấp quyền.',
          });
        }

        return deepFreeze<CustomerListView>({
          scenarioId: 'C-LIST-ERROR',
          kind: 'error',
          title: 'Không thể tải đơn hàng',
          message:
            error instanceof Error && error.message
              ? error.message
              : 'Hãy thử lại sau.',
        });
      }
    },

    async getCreateView(): Promise<CustomerCreateView> {
      return deepFreeze<CustomerCreateView>({
        scenarioId: 'C-NEW-READY',
        kind: 'form',
        phase: 'ready',
        form: {
          pickup: '',
          stops: [],
          dropoff: '',
          vehicleType: 'MOTORBIKE',
          cargoNote: '',
          cargoWeight: '',
          fieldErrors: {},
        },
        estimate: { kind: 'none' },
        notice: null,
        actions: [
          {
            id: 'estimate-order',
            label: 'Tính giá và ETA dự kiến',
            emphasis: 'primary',
            disabled: true,
            disabledReason: 'Nhập điểm lấy và điểm giao để tiếp tục',
          },
        ],
      });
    },

    async searchAddress(query: string): Promise<readonly AddressCandidate[]> {
      const trimmed = query.trim();
      if (!trimmed) return [];

      const activeClient = getClient();
      try {
        const response = await activeClient.get<{
          source: string;
          results: Array<{
            placeId: string;
            label: string;
            address?: string;
            lat: number;
            lng: number;
          }>;
        }>(`/maps/search?q=${encodeURIComponent(trimmed)}`);

        return response.results.map((result) => ({
          placeId: result.placeId,
          label: result.label,
          ...(result.address ? { address: result.address } : {}),
          coords: { lat: result.lat, lng: result.lng },
        }));
      } catch {
        return [];
      }
    },

    async estimateOrder(
      form: CustomerCreateFormView,
    ): Promise<CustomerCreateView> {
      const activeClient = getClient();
      const fieldErrors: Partial<
        Record<'pickup' | 'dropoff' | 'cargoWeight', string>
      > = {};

      if (!form.pickup || !form.pickup.trim()) {
        fieldErrors.pickup = 'Điểm lấy hàng là bắt buộc.';
      } else if (!form.pickupCoords) {
        fieldErrors.pickup = 'Chọn địa chỉ từ danh sách gợi ý.';
      }
      if (!form.dropoff || !form.dropoff.trim()) {
        fieldErrors.dropoff = 'Điểm giao hàng là bắt buộc.';
      } else if (!form.dropoffCoords) {
        fieldErrors.dropoff = 'Chọn địa chỉ từ danh sách gợi ý.';
      }
      if (form.vehicleType === 'TRUCK' && !form.cargoWeight.trim()) {
        fieldErrors.cargoWeight = 'Khối lượng là bắt buộc khi chọn xe tải.';
      } else if (
        form.cargoWeight &&
        (isNaN(Number(form.cargoWeight)) || Number(form.cargoWeight) <= 0)
      ) {
        fieldErrors.cargoWeight = 'Khối lượng phải lớn hơn 0.';
      }

      const filledStops = form.stops.filter((s) => s.value.trim().length > 0);
      const hasInvalidStop = filledStops.some((s) => !s.coords);

      if (Object.keys(fieldErrors).length > 0 || hasInvalidStop) {
        return deepFreeze<CustomerCreateView>({
          scenarioId: 'C-NEW-INVALID',
          kind: 'form',
          phase: 'invalid',
          form: {
            ...form,
            fieldErrors,
          },
          estimate: { kind: 'none' },
          notice:
            Object.keys(fieldErrors).length > 0
              ? 'Kiểm tra các trường được đánh dấu trước khi tiếp tục.'
              : 'Chọn địa chỉ điểm dừng từ danh sách gợi ý.',
          actions: [
            {
              id: 'estimate-order',
              label: 'Tính giá và ETA dự kiến',
              emphasis: 'primary',
              disabled: true,
              disabledReason: 'Nhập điểm lấy và điểm giao để tiếp tục',
            },
          ],
        });
      }

      try {
        const payload = {
          pickup: {
            type: 'PICKUP',
            address: form.pickup.trim(),
            lat: form.pickupCoords!.lat,
            lng: form.pickupCoords!.lng,
          },
          stops: filledStops.map((s) => ({
            type: 'STOP',
            address: s.value.trim(),
            lat: s.coords!.lat,
            lng: s.coords!.lng,
          })),
          dropoff: {
            type: 'DROPOFF',
            address: form.dropoff.trim(),
            lat: form.dropoffCoords!.lat,
            lng: form.dropoffCoords!.lng,
          },
          vehicleType: form.vehicleType as VehicleType,
          ...(form.vehicleType === 'TRUCK'
            ? { cargoWeightKg: Number(form.cargoWeight) }
            : {}),
        };

        const response = await activeClient.post<OrderEstimateApiResponse>(
          '/orders/estimate',
          payload,
        );

        const routes = response.routes.map(mapRouteOptionToView);
        const recommended = routes.find((r) => r.isRecommended) ?? routes[0];
        const primarySource = response.routes[0]?.source ?? 'VIETMAP';
        const primaryCalculatedAt = response.routes[0]?.calculatedAt ?? new Date().toISOString();

        return deepFreeze<CustomerCreateView>({
          scenarioId:
            primarySource === 'DEMO' ? 'C-NEW-ESTIMATE-DEMO' : 'C-NEW-ESTIMATE-READY',
          kind: 'form',
          phase: 'estimate-ready',
          form: {
            ...form,
            fieldErrors: {},
          },
          estimate: {
            kind: 'ready',
            source: primarySource,
            routes,
            selectedRouteId: recommended.routeId,
            calculatedAtLabel: formatDateTime(primaryCalculatedAt),
          },
          notice: null,
          actions: [
            {
              id: 'create-order',
              label: 'Tạo đơn',
              emphasis: 'primary',
              disabled: false,
            },
          ],
        });
      } catch (error) {
        if (isForbiddenError(error)) {
          return deepFreeze<CustomerCreateView>({
            scenarioId: 'C-NEW-PERMISSION',
            kind: 'permission-denied',
            title: 'Bạn không có quyền tạo đơn',
            message: 'Bản nháp riêng tư không được hiển thị cho role hiện tại.',
          });
        }

        return deepFreeze<CustomerCreateView>({
          scenarioId: 'C-NEW-ESTIMATE-ERROR',
          kind: 'form',
          phase: 'estimate-error',
          form: {
            ...form,
            fieldErrors: {},
          },
          estimate: {
            kind: 'error',
            source: 'VIETMAP',
            message:
              error instanceof Error && error.message
                ? error.message
                : 'Không thể tính estimate; dữ liệu form vẫn được giữ.',
          },
          notice: 'Không thể tính estimate; dữ liệu form vẫn được giữ.',
          actions: [
            {
              id: 'estimate-order',
              label: 'Tính giá và ETA dự kiến',
              emphasis: 'primary',
            },
          ],
        });
      }
    },

    async createOrder(
      form: CustomerCreateFormView,
      estimateToken: string,
    ): Promise<CustomerDetailView> {
      const activeClient = getClient();
      if (
        !form.pickup?.trim() ||
        !form.dropoff?.trim() ||
        !form.pickupCoords ||
        !form.dropoffCoords
      ) {
        return deepFreeze<CustomerDetailView>({
          scenarioId: 'C-DETAIL-ERROR',
          kind: 'error',
          title: 'Không thể tạo đơn hàng',
          message: 'Thông tin lộ trình không đầy đủ — hãy chọn địa chỉ từ danh sách gợi ý.',
        });
      }

      try {
        const createPayload = {
          pickup: {
            type: 'PICKUP',
            address: form.pickup.trim(),
            lat: form.pickupCoords.lat,
            lng: form.pickupCoords.lng,
          },
          stops: form.stops
            .filter((s) => s.value.trim().length > 0 && s.coords)
            .map((s) => ({
              type: 'STOP',
              address: s.value.trim(),
              lat: s.coords!.lat,
              lng: s.coords!.lng,
            })),
          dropoff: {
            type: 'DROPOFF',
            address: form.dropoff.trim(),
            lat: form.dropoffCoords.lat,
            lng: form.dropoffCoords.lng,
          },
          vehicleType: form.vehicleType as VehicleType,
          cargoNote: buildConsolidatedCargoNote(form) || form.cargoNote?.trim() || undefined,
          cargoWeightKg: form.cargoWeight ? Number(form.cargoWeight) : undefined,
          estimateToken,
        };

        const response = await activeClient.post<MappedOrderResponse>(
          '/orders',
          createPayload,
        );

        return deepFreeze<CustomerDetailContentView>({
          scenarioId: 'C-DETAIL-SUCCESS',
          kind: 'content',
          notice: null,
          order: mapOrderToDetail(response),
          cancel: resolveCancelView(response),
          actions: [],
        });
      } catch (error) {
        if (isForbiddenError(error)) {
          return deepFreeze<CustomerDetailView>({
            scenarioId: 'C-DETAIL-PERMISSION',
            kind: 'permission-denied',
            title: 'Bạn không có quyền xem đơn hàng này',
            message:
              'Không hiển thị route, tài xế, tracking, media hoặc payment của đơn khác.',
          });
        }

        return deepFreeze<CustomerDetailView>({
          scenarioId: 'C-DETAIL-ERROR',
          kind: 'error',
          title: 'Không thể tạo đơn hàng',
          message:
            error instanceof Error && error.message
              ? error.message
              : 'Hãy thử lại sau.',
        });
      }
    },

    async getOrderDetailView(orderId: string): Promise<CustomerDetailView> {
      const activeClient = getClient();
      const validId = parseCustomerOrderId(orderId);
      if (!validId) {
        return deepFreeze<CustomerDetailView>({
          scenarioId: 'C-DETAIL-ERROR',
          kind: 'error',
          title: 'Mã đơn không hợp lệ',
          message:
            'Liên kết đơn hàng không đúng định dạng. Hãy quay lại danh sách đơn.',
        });
      }

      try {
        const response = await activeClient.get<MappedOrderResponse>(
          `/orders/${validId}`,
        );

        let latestPayment: MappedPaymentResponse | null = null;
        try {
          const payments = await activeClient.get<MappedPaymentResponse[]>(
            `/orders/${validId}/payments`,
          );
          if (Array.isArray(payments) && payments.length > 0) {
            latestPayment =
              payments.find((p) => p.status === 'PAID_MANUAL') ??
              payments.find((p) => p.status === 'QR_CREATED') ??
              payments[0] ??
              null;
          }
        } catch {
          latestPayment = null;
        }

        let invoiceData: MappedInvoiceResponse | null = null;
        try {
          invoiceData = await activeClient.get<MappedInvoiceResponse>(
            `/invoices/order/${validId}`,
          );
        } catch {
          invoiceData = null;
        }

        return deepFreeze<CustomerDetailContentView>({
          scenarioId: 'C-DETAIL-SUCCESS',
          kind: 'content',
          notice: null,
          order: mapOrderToDetail(response, null, latestPayment, invoiceData),
          cancel: resolveCancelView(response),
          actions: [],
        });
      } catch (error) {
        if (isForbiddenError(error)) {
          return deepFreeze<CustomerDetailView>({
            scenarioId: 'C-DETAIL-PERMISSION',
            kind: 'permission-denied',
            title: 'Bạn không có quyền xem đơn hàng này',
            message:
              'Không hiển thị route, tài xế, tracking, media hoặc payment của đơn khác.',
          });
        }

        return deepFreeze<CustomerDetailView>({
          scenarioId: 'C-DETAIL-ERROR',
          kind: 'error',
          title: 'Không thể tải chi tiết đơn',
          message:
            error instanceof Error && error.message
              ? error.message
              : 'Hãy thử lại sau.',
        });
      }
    },

    async sendInvoiceEmail(
      invoiceId: string,
      orderId: string,
      email: string,
    ): Promise<CustomerDetailView> {
      const activeClient = getClient();
      const validId = parseCustomerOrderId(orderId);
      if (!validId) {
        return deepFreeze<CustomerDetailView>({
          scenarioId: 'C-DETAIL-ERROR',
          kind: 'error',
          title: 'Mã đơn không hợp lệ',
          message:
            'Liên kết đơn hàng không đúng định dạng. Hãy quay lại danh sách đơn.',
        });
      }

      try {
        await activeClient.post(`/invoices/${invoiceId}/send`, { email });
      } catch (error) {
        return deepFreeze<CustomerDetailView>({
          scenarioId: 'C-DETAIL-INVOICE-SEND-FAILED',
          kind: 'error',
          title: 'Không thể gửi email hóa đơn',
          message:
            error instanceof Error && error.message
              ? error.message
              : 'Vui lòng thử lại sau.',
        });
      }

      return this.getOrderDetailView(validId);
    },

    async getInvoiceDownloadUrl(invoiceId: string): Promise<string> {
      const { sessionStore } = require('../../../auth/session-store');
      const base = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
      const token = sessionStore.getAccessToken();
      const response = await fetch(`${base}/invoices/${invoiceId}/download`, {
        method: 'GET',
        redirect: 'manual',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const location = response.headers.get('Location');
      if (!location) {
        throw new ApiError(
          response.status,
          'INVALID_RESPONSE',
          'Không lấy được liên kết hóa đơn.',
        );
      }
      return location;
    },

    async getTrackingHistory(
      orderId: string,
    ): Promise<MappedTrackingHistoryResponse> {
      const activeClient = getClient();
      const validId = parseCustomerOrderId(orderId);
      if (!validId) {
        throw new Error('Mã đơn không hợp lệ');
      }

      return activeClient.get<MappedTrackingHistoryResponse>(
        `/orders/${validId}/tracking`,
      );
    },

    async reconcileTrackingHistory(
      orderId: string,
      currentView?: CustomerDetailView,
    ): Promise<CustomerDetailView> {
      const activeClient = getClient();
      const validId = parseCustomerOrderId(orderId);
      if (!validId) {
        return deepFreeze<CustomerDetailView>({
          scenarioId: 'C-DETAIL-ERROR',
          kind: 'error',
          title: 'Mã đơn không hợp lệ',
          message:
            'Liên kết đơn hàng không đúng định dạng. Hãy quay lại danh sách đơn.',
        });
      }

      try {
        const [orderResponse, trackingResponse] = await Promise.all([
          activeClient.get<MappedOrderResponse>(`/orders/${validId}`),
          activeClient
            .get<MappedTrackingHistoryResponse>(`/orders/${validId}/tracking`)
            .catch(() => null),
        ]);

        return deepFreeze<CustomerDetailContentView>({
          scenarioId:
            currentView && currentView.kind === 'content'
              ? currentView.scenarioId
              : 'C-DETAIL-SUCCESS',
          kind: 'content',
          notice:
            currentView && currentView.kind === 'content'
              ? currentView.notice
              : null,
          order: mapOrderToDetail(orderResponse, trackingResponse),
          cancel: resolveCancelView(orderResponse),
          actions:
            currentView && currentView.kind === 'content'
              ? currentView.actions
              : [],
        });
      } catch (error) {
        if (isForbiddenError(error)) {
          return deepFreeze<CustomerDetailView>({
            scenarioId: 'C-DETAIL-PERMISSION',
            kind: 'permission-denied',
            title: 'Bạn không có quyền xem đơn hàng này',
            message:
              'Không hiển thị route, tài xế, tracking, media hoặc payment của đơn khác.',
          });
        }

        return deepFreeze<CustomerDetailView>({
          scenarioId: 'C-DETAIL-ERROR',
          kind: 'error',
          title: 'Không thể tải tracking',
          message:
            error instanceof Error && error.message
              ? error.message
              : 'Hãy thử lại sau.',
        });
      }
    },

    async createPaymentQr(orderId: string): Promise<CustomerDetailView> {
      const activeClient = getClient();
      const validId = parseCustomerOrderId(orderId);
      if (!validId) {
        return deepFreeze<CustomerDetailView>({
          scenarioId: 'C-DETAIL-ERROR',
          kind: 'error',
          title: 'Mã đơn không hợp lệ',
          message:
            'Liên kết đơn hàng không đúng định dạng. Hãy quay lại danh sách đơn.',
        });
      }

      try {
        const clientRequestId =
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;

        const paymentResponse = await activeClient.post<PaymentQrApiResponse>(
          `/orders/${validId}/payments`,
          { clientRequestId },
        );

        const orderResponse = await activeClient.get<MappedOrderResponse>(
          `/orders/${validId}`,
        );

        return deepFreeze<CustomerDetailContentView>({
          scenarioId: 'C-DETAIL-QR-READY',
          kind: 'content',
          notice:
            paymentResponse.provider === 'DEMO'
              ? 'Mã QR thanh toán đã sẵn sàng chuyển khoản.'
              : null,
          order: mapOrderToDetail(orderResponse, null, paymentResponse),
          cancel: resolveCancelView(orderResponse),
          actions: [],
        });
      } catch (error) {
        if (isForbiddenError(error)) {
          return deepFreeze<CustomerDetailView>({
            scenarioId: 'C-DETAIL-PERMISSION',
            kind: 'permission-denied',
            title: 'Bạn không có quyền thanh toán đơn hàng này',
            message: 'Không thể tạo thanh toán cho đơn hàng khác.',
          });
        }

        return deepFreeze<CustomerDetailView>({
          scenarioId: 'C-DETAIL-PAYMENT-FAILED',
          kind: 'error',
          title: 'Chưa thể tạo thanh toán',
          message:
            error instanceof Error && error.message
              ? error.message
              : 'Chưa thể tạo thanh toán; không hiển thị chi tiết provider.',
        });
      }
    },

    async executeIntent(
      intent: CustomerOrderIntent,
    ): Promise<CustomerDetailView> {
      const activeClient = getClient();

      if (intent.actionId === 'cancel-order') {
        const validId = parseCustomerOrderId(intent.orderId);
        if (!validId) {
          return deepFreeze<CustomerDetailView>({
            scenarioId: 'C-DETAIL-ERROR',
            kind: 'error',
            title: 'Mã đơn không hợp lệ',
            message:
              'Liên kết đơn hàng không đúng định dạng. Hãy quay lại danh sách đơn.',
          });
        }

        try {
          const response = await activeClient.post<MappedOrderResponse>(
            `/orders/${validId}/cancel`,
            { reason: intent.value ?? 'Khách hàng hủy đơn' },
          );

          return deepFreeze<CustomerDetailContentView>({
            scenarioId: 'C-DETAIL-CANCEL-SUCCESS',
            kind: 'content',
            notice: 'Đã nhận snapshot phản hồi với trạng thái Đã hủy.',
            order: mapOrderToDetail(response),
            cancel: { kind: 'hidden' },
            actions: [],
          });
        } catch (error) {
          if (isForbiddenError(error)) {
            return deepFreeze<CustomerDetailView>({
              scenarioId: 'C-DETAIL-PERMISSION',
              kind: 'permission-denied',
              title: 'Bạn không có quyền xem đơn hàng này',
              message:
                'Không hiển thị route, tài xế, tracking, media hoặc payment của đơn khác.',
            });
          }

          return deepFreeze<CustomerDetailView>({
            scenarioId: 'C-DETAIL-ERROR',
            kind: 'error',
            title: 'Không thể hủy đơn',
            message:
              error instanceof Error && error.message
                ? error.message
                : 'Chưa thể hủy đơn; trạng thái hiện tại vẫn được giữ.',
          });
        }
      }

      if (
        intent.actionId === 'create-payment' ||
        intent.actionId === 'refresh-payment' ||
        intent.actionId === 'retry-payment'
      ) {
        const validId = parseCustomerOrderId(intent.orderId);
        if (!validId) {
          return deepFreeze<CustomerDetailView>({
            scenarioId: 'C-DETAIL-ERROR',
            kind: 'error',
            title: 'Mã đơn không hợp lệ',
            message:
              'Liên kết đơn hàng không đúng định dạng. Hãy quay lại danh sách đơn.',
          });
        }

        return this.createPaymentQr
          ? this.createPaymentQr(validId)
          : this.getOrderDetailView(validId);
      }

      if (intent.actionId === 'refresh-tracking') {
        const validId = parseCustomerOrderId(intent.orderId);
        if (!validId) {
          return deepFreeze<CustomerDetailView>({
            scenarioId: 'C-DETAIL-ERROR',
            kind: 'error',
            title: 'Mã đơn không hợp lệ',
            message:
              'Liên kết đơn hàng không đúng định dạng. Hãy quay lại danh sách đơn.',
          });
        }

        return this.reconcileTrackingHistory
          ? this.reconcileTrackingHistory(validId)
          : this.getOrderDetailView(validId);
      }

      if (intent.orderId) {
        return this.getOrderDetailView(intent.orderId);
      }

      return deepFreeze<CustomerDetailView>({
        scenarioId: 'C-DETAIL-ERROR',
        kind: 'error',
        title: 'Thao tác không hợp lệ',
        message: 'Thao tác không được hỗ trợ.',
      });
    },
  };
}
