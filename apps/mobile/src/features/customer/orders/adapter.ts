import type { OrderStatus, PaymentStatus, ProviderSource, VehicleType } from '@leopard/shared';

import { ApiError } from '../../../api/api-error';
import type {
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
} from './model';
import type { CustomerOrdersPort } from './port';

function getDefaultHttpClient(): CustomerHttpClient {
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

export function formatDateTime(dateInput: string | Date | null | undefined): string {
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

export function formatTimeOnly(dateInput: string | Date | null | undefined): string {
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
}

export interface CustomerOrdersListApiResponse {
  items: MappedOrderResponse[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface OrderEstimateApiResponse {
  estimateToken: string;
  polyline: string;
  distanceM: number;
  durationS: number;
  estimatedArrivalAt: string;
  estimatedPriceVnd: number;
  source: ProviderSource;
  calculatedAt: string;
  isEstimate: boolean;
}

export interface CustomerHttpClient {
  get<T = unknown>(path: string): Promise<T>;
  post<T = unknown>(path: string, body?: unknown): Promise<T>;
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

export function mapOrderToListItem(order: MappedOrderResponse): CustomerOrderListItemView {
  const pickupStop = order.stops?.find((s) => s.type === 'PICKUP' || s.sequence === 0);
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
    etaLabel =
      order.providerSource === 'DEMO'
        ? `${minutes} phút · Dữ liệu mô phỏng`
        : `${minutes} phút`;
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

export function mapOrderToDetail(order: MappedOrderResponse): CustomerOrderDetailDataView {
  const pickupStop = order.stops?.find((s) => s.type === 'PICKUP' || s.sequence === 0);
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

  const status = order.status as OrderStatus;
  const etaDurationSeconds = order.durationSeconds ?? order.etaSeconds ?? 0;
  const etaSource = (order.providerSource as ProviderSource) ?? 'VIETMAP';

  let tracking: CustomerTrackingView;
  if (status === 'REQUESTED' || status === 'CANCELLED' || !order.driverId) {
    tracking = { kind: 'no-driver', message: 'Chưa có tài xế nhận đơn.' };
  } else {
    const driverLabel = 'Tài xế Nguyễn Minh An';
    const lastUpdatedLabel = formatDateTime(order.updatedAt || order.createdAt);
    const updatedTime = formatTimeOnly(order.updatedAt || order.createdAt);
    tracking = {
      kind: 'fresh',
      driverLabel,
      lastUpdatedLabel,
      summary: `Bản đồ lộ trình; vị trí tài xế cập nhật lúc ${updatedTime}.`,
    };
  }

  const payment: CustomerPaymentView = {
    status: (status === 'DELIVERED' ? 'PAID_MANUAL' : 'UNPAID') as PaymentStatus,
    amountLabel: formatVndPrice(order.priceVnd),
    sourceLabel: 'VietQR mô phỏng',
    qrState: 'none',
    notice:
      status === 'DELIVERED'
        ? 'Thanh toán đã được xác nhận trong snapshot phản hồi.'
        : null,
    action:
      status === 'REQUESTED' || status === 'ACCEPTED' || status === 'IN_TRANSIT'
        ? { id: 'create-payment', label: 'Tạo mã QR thanh toán', emphasis: 'primary' }
        : null,
  };

  const media = {
    kind: 'empty' as const,
    label: 'Ảnh hàng hóa',
    description: 'Chưa có ảnh hàng hóa.',
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
    tracking,
    payment,
    media,
    history,
  };
}

export function resolveCancelView(order: MappedOrderResponse): CustomerCancelView {
  const status = order.status as OrderStatus;
  if (status === 'REQUESTED') {
    return {
      kind: 'available',
      message: 'Hủy đơn sẽ dừng yêu cầu tìm tài xế.',
      action: { id: 'cancel-order', label: 'Hủy đơn', emphasis: 'destructive' },
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
  let cachedEstimateToken: string | null = null;

  return {
    async getOrdersView(filter: CustomerOrderFilter): Promise<CustomerListView> {
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

    async estimateOrder(form: CustomerCreateFormView): Promise<CustomerCreateView> {
      const activeClient = getClient();
      const fieldErrors: Partial<Record<'pickup' | 'dropoff' | 'cargoWeight', string>> = {};

      if (!form.pickup || !form.pickup.trim()) {
        fieldErrors.pickup = 'Điểm lấy hàng là bắt buộc.';
      }
      if (!form.dropoff || !form.dropoff.trim()) {
        fieldErrors.dropoff = 'Điểm giao hàng là bắt buộc.';
      }
      if (
        form.cargoWeight &&
        (isNaN(Number(form.cargoWeight)) || Number(form.cargoWeight) <= 0)
      ) {
        fieldErrors.cargoWeight = 'Khối lượng phải lớn hơn 0.';
      }

      if (Object.keys(fieldErrors).length > 0) {
        return deepFreeze<CustomerCreateView>({
          scenarioId: 'C-NEW-INVALID',
          kind: 'form',
          phase: 'invalid',
          form: {
            ...form,
            fieldErrors,
          },
          estimate: { kind: 'none' },
          notice: 'Kiểm tra các trường được đánh dấu trước khi tiếp tục.',
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
            lat: 10.7326,
            lng: 106.7168,
          },
          stops: form.stops
            .filter((s) => s.value.trim().length > 0)
            .map((s, idx) => ({
              type: 'STOP',
              address: s.value.trim(),
              lat: 10.7626 + idx * 0.01,
              lng: 106.6601 + idx * 0.01,
            })),
          dropoff: {
            type: 'DROPOFF',
            address: form.dropoff.trim(),
            lat: 10.8498,
            lng: 106.7725,
          },
          vehicleType: form.vehicleType as VehicleType,
        };

        const response = await activeClient.post<OrderEstimateApiResponse>(
          '/orders/estimate',
          payload,
        );

        cachedEstimateToken = response.estimateToken;

        return deepFreeze<CustomerCreateView>({
          scenarioId:
            response.source === 'DEMO'
              ? 'C-NEW-ESTIMATE-DEMO'
              : 'C-NEW-ESTIMATE-READY',
          kind: 'form',
          phase: 'estimate-ready',
          form: {
            ...form,
            fieldErrors: {},
          },
          estimate: {
            kind: 'ready',
            source: response.source,
            durationSeconds: response.durationS,
            distanceLabel: formatDistance(response.distanceM),
            priceLabel: formatVndPrice(response.estimatedPriceVnd),
            calculatedAtLabel: formatDateTime(response.calculatedAt),
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

    async createOrder(form: CustomerCreateFormView): Promise<CustomerDetailView> {
      const activeClient = getClient();
      if (!form.pickup?.trim() || !form.dropoff?.trim()) {
        return deepFreeze<CustomerDetailView>({
          scenarioId: 'C-DETAIL-ERROR',
          kind: 'error',
          title: 'Không thể tạo đơn hàng',
          message: 'Thông tin lộ trình không đầy đủ.',
        });
      }

      try {
        let token = cachedEstimateToken;
        if (!token) {
          const estimatePayload = {
            pickup: {
              type: 'PICKUP',
              address: form.pickup.trim(),
              lat: 10.7326,
              lng: 106.7168,
            },
            stops: form.stops
              .filter((s) => s.value.trim().length > 0)
              .map((s, idx) => ({
                type: 'STOP',
                address: s.value.trim(),
                lat: 10.7626 + idx * 0.01,
                lng: 106.6601 + idx * 0.01,
              })),
            dropoff: {
              type: 'DROPOFF',
              address: form.dropoff.trim(),
              lat: 10.8498,
              lng: 106.7725,
            },
            vehicleType: form.vehicleType as VehicleType,
          };
          const est = await activeClient.post<OrderEstimateApiResponse>(
            '/orders/estimate',
            estimatePayload,
          );
          token = est.estimateToken;
        }

        const createPayload = {
          pickup: {
            type: 'PICKUP',
            address: form.pickup.trim(),
            lat: 10.7326,
            lng: 106.7168,
          },
          stops: form.stops
            .filter((s) => s.value.trim().length > 0)
            .map((s, idx) => ({
              type: 'STOP',
              address: s.value.trim(),
              lat: 10.7626 + idx * 0.01,
              lng: 106.6601 + idx * 0.01,
            })),
          dropoff: {
            type: 'DROPOFF',
            address: form.dropoff.trim(),
            lat: 10.8498,
            lng: 106.7725,
          },
          vehicleType: form.vehicleType as VehicleType,
          cargoNote: form.cargoNote?.trim() || undefined,
          cargoWeightKg: form.cargoWeight ? Number(form.cargoWeight) : undefined,
          estimateToken: token,
        };

        const response = await activeClient.post<MappedOrderResponse>(
          '/orders',
          createPayload,
        );

        cachedEstimateToken = null;

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
        const response = await activeClient.get<MappedOrderResponse>(`/orders/${validId}`);

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
          title: 'Không thể tải chi tiết đơn',
          message:
            error instanceof Error && error.message
              ? error.message
              : 'Hãy thử lại sau.',
        });
      }
    },

    async executeIntent(intent: CustomerOrderIntent): Promise<CustomerDetailView> {
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

