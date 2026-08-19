import type {
  DriverAvailability,
  OrderStatus,
  ProviderSource,
  VehicleType,
} from '@leopard/shared';

import { ApiError } from '../../../api/api-error';
import type {
  DriverActiveTripView,
  DriverAssignedDetailView,
  DriverAvailabilityView,
  DriverCommandView,
  DriverConflictView,
  DriverDetailContentView,
  DriverDetailView,
  DriverListView,
  DriverPrimaryTaskView,
  DriverProofView,
  DriverPublicOrderView,
  DriverRoutePoint,
  DriverRouteView,
  DriverTrackingView,
} from './model';
import type { DriverOrdersPort } from './port';

function getDefaultHttpClient(): DriverHttpClient {
  const { httpClient } = require('../../../api/http-client');
  return httpClient as DriverHttpClient;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeDriverRouteParam(
  value: string | readonly string[] | undefined,
): string | null {
  if (typeof value === 'string') return value;
  return value?.[0] ?? null;
}

export function parseDriverOrderId(
  value: string | readonly string[] | undefined,
): string | null {
  const normalized = normalizeDriverRouteParam(value);
  return normalized && UUID_PATTERN.test(normalized) ? normalized : null;
}

export function extractOrderIdFromCommand(commandId: string): string | null {
  const match = commandId.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
  );
  return match ? match[0] : null;
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

export function formatDriverEtaLabel(
  seconds: number | null | undefined,
  source?: ProviderSource | string | null,
): string {
  const durationSeconds = seconds ?? 0;
  const minutes = Math.max(1, Math.round(durationSeconds / 60));
  if (source === 'DEMO') {
    return `ETA dự kiến · ${minutes} phút · Dữ liệu mô phỏng`;
  }
  return `ETA dự kiến · ${minutes} phút`;
}

export function formatVehicleLabel(
  vehicleType?: VehicleType | string | null,
): string {
  switch (vehicleType) {
    case 'MOTORBIKE':
      return 'Xe máy';
    case 'VAN':
      return 'Xe van';
    case 'TRUCK_500KG':
      return 'Xe tải 500kg';
    case 'TRUCK_1500KG':
      return 'Xe tải 1.5 tấn';
    case 'TRUCK_5000KG':
      return 'Xe tải 5 tấn';
    default:
      return 'Xe van';
  }
}

export function formatCargoSummary(order: {
  cargoNote?: string | null;
  cargoWeightKg?: number | null;
  cargoWeight?: number | null;
}): string {
  const note = order.cargoNote?.trim();
  const weight = order.cargoWeightKg ?? order.cargoWeight;

  if (note && weight) {
    return `${note} · khoảng ${weight} kg`;
  }
  if (note) {
    return note;
  }
  if (weight) {
    return `khoảng ${weight} kg`;
  }
  return 'Hàng hóa tiêu chuẩn';
}

export function formatPublicRouteLabel(
  stops?: readonly MappedDriverOrderStopResponse[],
): string {
  if (!stops || stops.length === 0) {
    return 'Lộ trình đơn hàng';
  }
  const pickupStop =
    stops.find((s) => s.type === 'PICKUP' || s.sequence === 0) ?? stops[0];
  const dropoffStop =
    stops.find((s) => s.type === 'DROPOFF') ?? stops[stops.length - 1];

  const pickupLabel = pickupStop.address;
  const dropoffLabel = dropoffStop.address;

  if (pickupLabel.startsWith('Khu vực ')) {
    return `${pickupLabel} → ${dropoffLabel}`;
  }
  return `Khu vực ${pickupLabel} → ${dropoffLabel}`;
}

export function describeDriverStatus(status: OrderStatus): string {
  switch (status) {
    case 'REQUESTED':
      return 'Đơn đã được ghi nhận.';
    case 'ACCEPTED':
      return 'Bạn đã nhận chuyến.';
    case 'PICKING_UP':
      return 'Bạn đang đi lấy hàng.';
    case 'IN_TRANSIT':
      return 'Hàng đang được vận chuyển.';
    case 'DELIVERED':
      return 'Đơn hàng đã được giao thành công.';
    case 'CANCELLED':
      return 'Đơn hàng đã bị hủy.';
    default:
      return 'Trạng thái đơn hàng cập nhật.';
  }
}

export interface MappedDriverOrderStopResponse {
  id: string;
  type: string;
  sequence: number;
  address: string;
  lat: number;
  lng: number;
}

export interface MappedDriverOrderStatusHistoryResponse {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  actorId: string | null;
  reason: string | null;
  createdAt: string;
}

export interface MappedDriverOrderResponse {
  id: string;
  reference?: string;
  customerId?: string;
  driverId: string | null;
  status: string;
  routeSnapshot?: unknown;
  providerSource?: string | null;
  distanceMeters?: number | null;
  durationSeconds?: number | null;
  priceVnd?: number | null;
  etaSeconds?: number | null;
  vehicleType?: VehicleType | string | null;
  cargoNote?: string | null;
  cargoWeightKg?: number | null;
  cargoWeight?: number | null;
  deliveryProofUrl?: string | null;
  customerContact?: string | null;
  acceptedAt?: string | null;
  pickingUpAt?: string | null;
  inTransitAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  stops?: MappedDriverOrderStopResponse[];
  statusHistory?: MappedDriverOrderStatusHistoryResponse[];
}

export interface DriverAvailableOrdersApiResponse {
  items: MappedDriverOrderResponse[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DriverActiveOrderApiResponse {
  order: MappedDriverOrderResponse | null;
}

export interface DriverAvailabilityApiResponse {
  availability: DriverAvailability;
}

export interface DriverHttpClient {
  get<T = unknown>(path: string): Promise<T>;
  post<T = unknown>(path: string, body?: unknown): Promise<T>;
  put<T = unknown>(path: string, body?: unknown): Promise<T>;
  patch<T = unknown>(path: string, body?: unknown): Promise<T>;
  delete<T = unknown>(path: string): Promise<T>;
}

export function isForbiddenError(error: unknown): boolean {
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

export function isConflictError(error: unknown): boolean {
  if (ApiError.isApiError(error)) {
    return (
      error.statusCode === 409 ||
      error.code === 'ORDER_ALREADY_ASSIGNED' ||
      error.code === 'DRIVER_BUSY' ||
      error.code === 'DRIVER_HAS_ACTIVE_ORDER' ||
      error.code === 'ORDER_INVALID_TRANSITION' ||
      error.code === 'CONFLICT'
    );
  }
  if (
    error &&
    typeof error === 'object' &&
    'statusCode' in error &&
    (error as { statusCode?: unknown }).statusCode === 409
  ) {
    return true;
  }
  return false;
}

export function mapOrderToRouteView(
  order: MappedDriverOrderResponse,
): DriverRouteView {
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

  const origin: DriverRoutePoint = {
    id: pickupStop?.id ?? 'driver-pickup',
    label: pickupStop?.address ?? 'Điểm lấy hàng',
  };
  const destination: DriverRoutePoint = {
    id: dropoffStop?.id ?? 'driver-dropoff',
    label: dropoffStop?.address ?? 'Điểm giao hàng',
  };
  const stops: readonly DriverRoutePoint[] = intermediateStops.map((s) => ({
    id: s.id,
    label: s.address,
  }));

  const distanceLabel = formatDistance(order.distanceMeters);
  const etaDurationSeconds = order.durationSeconds ?? order.etaSeconds ?? 0;
  const etaSource = (order.providerSource as ProviderSource) ?? 'DEMO';

  return {
    origin,
    stops,
    destination,
    distanceLabel,
    etaDurationSeconds,
    etaSource,
  };
}

export function mapOrderToPublicOrderView(
  order: MappedDriverOrderResponse,
): DriverPublicOrderView {
  return {
    id: order.id,
    reference: formatOrderReference(order),
    status: 'REQUESTED',
    publicRouteLabel: formatPublicRouteLabel(order.stops),
    vehicleLabel: formatVehicleLabel(order.vehicleType),
    cargoSummary: formatCargoSummary(order),
    etaLabel: formatDriverEtaLabel(
      order.durationSeconds ?? order.etaSeconds,
      order.providerSource,
    ),
    updatedAtLabel: formatDateTime(order.updatedAt || order.createdAt),
  };
}

export function mapOrderToActiveTrip(
  order: MappedDriverOrderResponse,
): DriverActiveTripView {
  const status = order.status as Exclude<OrderStatus, 'REQUESTED'>;
  const trackingLabel =
    status === 'ACCEPTED'
      ? 'Chưa bắt đầu gửi vị trí'
      : `Đang gửi vị trí · cập nhật lúc ${formatTimeOnly(order.updatedAt || order.createdAt)}`;

  const proofRequired = status === 'IN_TRANSIT' && !order.deliveryProofUrl;

  return {
    id: order.id,
    reference: formatOrderReference(order),
    status,
    route: mapOrderToRouteView(order),
    trackingLabel,
    proofLabel: proofRequired
      ? 'Cần ảnh xác nhận trước khi hoàn tất'
      : null,
  };
}

export function mapDriverTracking(
  order: MappedDriverOrderResponse,
): DriverTrackingView {
  const status = order.status as OrderStatus;
  if (status === 'ACCEPTED') {
    return {
      kind: 'not-started',
      label: 'Chưa bắt đầu gửi vị trí',
      lastUpdatedLabel: null,
      queuedPointCount: null,
    };
  }
  if (status === 'DELIVERED' || status === 'CANCELLED') {
    return {
      kind: 'unavailable',
      label: 'Tracking của chuyến đã kết thúc',
      lastUpdatedLabel: formatDateTime(order.updatedAt || order.createdAt),
      queuedPointCount: null,
    };
  }
  return {
    kind: 'healthy',
    label: 'Đang gửi vị trí',
    lastUpdatedLabel: formatDateTime(order.updatedAt || order.createdAt),
    queuedPointCount: null,
  };
}

export function mapDriverProof(
  order: MappedDriverOrderResponse,
): DriverProofView {
  const status = order.status as OrderStatus;
  if (status === 'IN_TRANSIT') {
    if (order.deliveryProofUrl) {
      return {
        kind: 'persisted',
        label: 'Ảnh xác nhận đã tải lên',
        message: 'Proof đã có trong snapshot phản hồi từ hệ thống.',
        fileLabel: order.deliveryProofUrl,
      };
    }
    return {
      kind: 'required',
      label: 'Cần ảnh xác nhận trước khi hoàn tất',
      message: 'Thêm một ảnh JPEG, PNG hoặc WebP tối đa 10 MB.',
      fileLabel: null,
    };
  }
  if (status === 'DELIVERED') {
    return {
      kind: 'persisted',
      label: 'Ảnh xác nhận đã tải lên',
      message: 'Proof read-only từ snapshot đã hoàn tất.',
      fileLabel: order.deliveryProofUrl ?? 'xac-nhan-giao-hang.jpg',
    };
  }
  return {
    kind: 'empty',
    label: 'Chưa có ảnh xác nhận',
    message: 'Proof chưa được yêu cầu ở task hiện tại.',
    fileLabel: null,
  };
}

function resolveDriverTask(
  order: MappedDriverOrderResponse,
  proof: DriverProofView,
): Readonly<{
  primaryTask: DriverPrimaryTaskView;
  offeredLifecycleCommand: DriverCommandView | null;
}> {
  const status = order.status as OrderStatus;
  if (status === 'REQUESTED') {
    const offered: DriverCommandView = {
      id: `cmd-accept-${order.id}`,
      orderId: order.id,
      label: 'Nhận đơn',
      targetStatus: 'ACCEPTED',
    };
    return {
      primaryTask: { kind: 'accept', command: offered },
      offeredLifecycleCommand: offered,
    };
  }
  if (status === 'ACCEPTED') {
    const offered: DriverCommandView = {
      id: `cmd-pickup-${order.id}`,
      orderId: order.id,
      label: 'Bắt đầu đi lấy hàng',
      targetStatus: 'PICKING_UP',
    };
    return {
      primaryTask: { kind: 'advance-lifecycle', command: offered },
      offeredLifecycleCommand: offered,
    };
  }
  if (status === 'PICKING_UP') {
    const offered: DriverCommandView = {
      id: `cmd-transit-${order.id}`,
      orderId: order.id,
      label: 'Đã lấy hàng — bắt đầu giao',
      targetStatus: 'IN_TRANSIT',
    };
    return {
      primaryTask: { kind: 'advance-lifecycle', command: offered },
      offeredLifecycleCommand: offered,
    };
  }
  if (status === 'IN_TRANSIT') {
    if (proof.kind === 'persisted') {
      const offered: DriverCommandView = {
        id: `cmd-deliver-${order.id}`,
        orderId: order.id,
        label: 'Xác nhận đã giao',
        targetStatus: 'DELIVERED',
      };
      return {
        primaryTask: { kind: 'advance-lifecycle', command: offered },
        offeredLifecycleCommand: offered,
      };
    }
    const uploadCommand: DriverCommandView = {
      id: `cmd-select-proof-${order.id}`,
      orderId: order.id,
      label: 'Thêm ảnh xác nhận giao hàng',
    };
    return {
      primaryTask: { kind: 'upload-proof', command: uploadCommand },
      offeredLifecycleCommand: null,
    };
  }
  return { primaryTask: null, offeredLifecycleCommand: null };
}

export function mapOrderToDriverDetailView(
  order: MappedDriverOrderResponse,
): DriverDetailContentView {
  const status = order.status as OrderStatus;

  if (status === 'REQUESTED') {
    const publicOrder = mapOrderToPublicOrderView(order);
    const proof: DriverProofView = {
      kind: 'empty',
      label: 'Chưa có ảnh xác nhận',
      message: 'Proof chưa được yêu cầu ở task hiện tại.',
      fileLabel: null,
    };
    const task = resolveDriverTask(order, proof);
    return {
      scenarioId: 'D-DETAIL-PUBLIC-REQUESTED',
      kind: 'content',
      accessScope: 'PUBLIC_SUMMARY',
      order: publicOrder,
      tracking: {
        kind: 'not-started',
        label: 'Tracking chỉ bắt đầu sau khi được phân công',
        lastUpdatedLabel: null,
        queuedPointCount: null,
      },
      proof,
      ...task,
      notice: null,
    };
  }

  const route = mapOrderToRouteView(order);
  const tracking = mapDriverTracking(order);
  const proof = mapDriverProof(order);
  const task = resolveDriverTask(order, proof);

  const history = (order.statusHistory ?? []).map((h) => ({
    id: h.id,
    status: h.toStatus as OrderStatus,
    timestampLabel: formatTimeOnly(h.createdAt),
    description: h.reason || describeDriverStatus(h.toStatus as OrderStatus),
  }));

  if (history.length === 0) {
    history.push({
      id: `driver-history-${order.id}`,
      status,
      timestampLabel: formatTimeOnly(order.createdAt),
      description: describeDriverStatus(status),
    });
  }

  let scenarioId = 'D-DETAIL-ACCEPTED';
  if (status === 'PICKING_UP') scenarioId = 'D-DETAIL-PICKING-UP';
  else if (status === 'IN_TRANSIT') {
    scenarioId =
      proof.kind === 'persisted' ? 'D-DETAIL-READY-DELIVER' : 'D-DETAIL-IN-TRANSIT';
  } else if (status === 'DELIVERED') scenarioId = 'D-DETAIL-TERMINAL-DELIVERED';
  else if (status === 'CANCELLED') scenarioId = 'D-DETAIL-TERMINAL-CANCELLED';

  const assignedOrder: DriverAssignedDetailView['order'] = {
    id: order.id,
    reference: formatOrderReference(order),
    status: status as Exclude<OrderStatus, 'REQUESTED'>,
    route,
    vehicleLabel: formatVehicleLabel(order.vehicleType),
    cargoSummary: formatCargoSummary(order),
    customerContact:
      order.customerContact ??
      'Số điện thoại khách hàng mô phỏng · chỉ hiện sau phân công',
    updatedAtLabel: formatDateTime(order.updatedAt || order.createdAt),
    history,
  };

  return {
    scenarioId,
    kind: 'content',
    accessScope: 'ASSIGNED_FULL',
    order: assignedOrder,
    tracking,
    proof,
    ...task,
    notice: null,
  };
}

export function createDriverHttpAdapter(
  client?: DriverHttpClient,
): DriverOrdersPort {
  const getClient = (): DriverHttpClient => client ?? getDefaultHttpClient();
  let currentAvailability: DriverAvailability = 'AVAILABLE';
  let lastActiveTripReference: string | undefined;

  return {
    async getOrdersView(): Promise<DriverListView> {
      const activeClient = getClient();
      try {
        const [activeRes, availableRes] = await Promise.all([
          activeClient.get<
            | DriverActiveOrderApiResponse
            | MappedDriverOrderResponse
            | null
          >('/driver/orders/active'),
          activeClient.get<
            | DriverAvailableOrdersApiResponse
            | MappedDriverOrderResponse[]
          >('/driver/orders/available'),
        ]);

        const rawActiveOrder =
          activeRes && 'order' in activeRes
            ? activeRes.order
            : (activeRes as MappedDriverOrderResponse | null);

        const activeTrip =
          rawActiveOrder &&
          rawActiveOrder.status !== 'REQUESTED' &&
          rawActiveOrder.status !== 'DELIVERED' &&
          rawActiveOrder.status !== 'CANCELLED'
            ? mapOrderToActiveTrip(rawActiveOrder)
            : null;

        if (activeTrip) {
          lastActiveTripReference = activeTrip.reference;
        }

        const rawAvailableItems = Array.isArray(availableRes)
          ? availableRes
          : (availableRes?.items ?? []);

        const requestedOrders: DriverPublicOrderView[] = rawAvailableItems
          .filter((o) => o.status === 'REQUESTED')
          .map(mapOrderToPublicOrderView);

        let availabilityView: DriverAvailabilityView;
        if (activeTrip) {
          currentAvailability = 'BUSY';
          availabilityView = {
            status: 'BUSY',
            action: {
              id: 'availability-busy',
              label: 'Đang bận',
              target: 'BUSY',
              disabled: true,
              disabledReason: 'Bạn đang có chuyến hoạt động',
            },
            error: null,
          };
        } else {
          if (currentAvailability === 'BUSY') {
            currentAvailability = 'AVAILABLE';
          }
          availabilityView = {
            status: currentAvailability,
            action: {
              id:
                currentAvailability === 'OFFLINE'
                  ? 'set-availability-available'
                  : 'set-availability-offline',
              label:
                currentAvailability === 'OFFLINE'
                  ? 'Bật sẵn sàng'
                  : 'Tạm dừng nhận đơn',
              target:
                currentAvailability === 'OFFLINE' ? 'AVAILABLE' : 'OFFLINE',
              isPending: false,
              disabled: false,
            },
            error: null,
          };
        }

        const isEmpty = activeTrip === null && requestedOrders.length === 0;

        if (isEmpty) {
          return deepFreeze<DriverListView>({
            scenarioId: 'D-LIST-EMPTY',
            kind: 'content',
            availability: availabilityView,
            activeTrip: null,
            requestedOrders: [],
            notice: {
              tone: 'info',
              message:
                'Hiện chưa có đơn có thể nhận; trạng thái nhận đơn vẫn được giữ.',
            },
            refreshedAtLabel: formatDateTime(new Date()),
            isEmpty: true,
          });
        }

        return deepFreeze<DriverListView>({
          scenarioId: activeTrip
            ? 'D-LIST-ACTIVE-REQUESTED'
            : 'D-LIST-REQUESTED',
          kind: 'content',
          availability: availabilityView,
          activeTrip,
          requestedOrders,
          notice: null,
          refreshedAtLabel: formatDateTime(new Date()),
          isEmpty: false,
        });
      } catch (error) {
        if (isForbiddenError(error)) {
          return deepFreeze<DriverListView>({
            scenarioId: 'D-LIST-PERMISSION',
            kind: 'permission-denied',
            title: 'Bạn không có quyền xem khu vực tài xế',
            message:
              'Không hiển thị chuyến hoặc đơn có thể nhận cho role hiện tại.',
          });
        }

        return deepFreeze<DriverListView>({
          scenarioId: 'D-LIST-ERROR',
          kind: 'error',
          title: 'Không thể tải danh sách đơn',
          message:
            error instanceof Error && error.message
              ? error.message
              : 'Hãy thử lại sau.',
        });
      }
    },

    async getOrderDetailView(orderId: string): Promise<DriverDetailView> {
      const activeClient = getClient();
      const validId = parseDriverOrderId(orderId);
      if (!validId) {
        return deepFreeze<DriverDetailView>({
          scenarioId: 'D-DETAIL-ERROR',
          kind: 'error',
          title: 'Mã đơn không hợp lệ',
          message:
            'Liên kết đơn hàng không đúng định dạng. Hãy quay lại danh sách đơn.',
        });
      }

      try {
        const response = await activeClient.get<MappedDriverOrderResponse>(
          `/orders/${validId}`,
        );

        return deepFreeze<DriverDetailView>(
          mapOrderToDriverDetailView(response),
        );
      } catch (error) {
        if (isForbiddenError(error)) {
          return deepFreeze<DriverDetailView>({
            scenarioId: 'D-DETAIL-PERMISSION',
            kind: 'permission-denied',
            title: 'Bạn không có quyền xem đơn này',
            message:
              'Route, contact, media và tracking riêng tư không được hiển thị.',
          });
        }

        return deepFreeze<DriverDetailView>({
          scenarioId: 'D-DETAIL-ERROR',
          kind: 'error',
          title: 'Không thể tải chi tiết đơn',
          message:
            error instanceof Error && error.message
              ? error.message
              : 'Hãy thử lại sau.',
        });
      }
    },

    async setAvailability(
      commandId: string,
    ): Promise<DriverAvailabilityView> {
      const activeClient = getClient();

      let target: DriverAvailability;
      if (
        commandId.includes('available') ||
        commandId === 'set-availability-available'
      ) {
        target = 'AVAILABLE';
      } else if (
        commandId.includes('offline') ||
        commandId === 'set-availability-offline'
      ) {
        target = 'OFFLINE';
      } else {
        target = currentAvailability === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE';
      }

      const previousAvailability = currentAvailability;
      // Optimistic update
      currentAvailability = target;

      try {
        const response = await activeClient.patch<DriverAvailabilityApiResponse>(
          '/driver/availability',
          { availability: target },
        );
        currentAvailability = response.availability ?? target;

        return deepFreeze<DriverAvailabilityView>({
          status: currentAvailability,
          action: {
            id:
              currentAvailability === 'OFFLINE'
                ? 'set-availability-available'
                : 'set-availability-offline',
            label:
              currentAvailability === 'OFFLINE'
                ? 'Bật sẵn sàng'
                : 'Tạm dừng nhận đơn',
            target:
              currentAvailability === 'OFFLINE' ? 'AVAILABLE' : 'OFFLINE',
            isPending: false,
            disabled: false,
          },
          error: null,
        });
      } catch {
        // Error rollback
        currentAvailability = previousAvailability;
        const statusLabel =
          previousAvailability === 'AVAILABLE' ? 'Sẵn sàng.' : 'Ngoại tuyến.';
        return deepFreeze<DriverAvailabilityView>({
          status: previousAvailability,
          action: {
            id:
              previousAvailability === 'OFFLINE'
                ? 'set-availability-available'
                : 'set-availability-offline',
            label:
              previousAvailability === 'OFFLINE'
                ? 'Bật sẵn sàng'
                : 'Tạm dừng nhận đơn',
            target:
              previousAvailability === 'OFFLINE' ? 'AVAILABLE' : 'OFFLINE',
            isPending: false,
            disabled: false,
          },
          error: `Chưa cập nhật được trạng thái nhận đơn; trạng thái đã lưu vẫn là ${statusLabel}`,
        });
      }
    },

    async acceptOrder(commandId: string): Promise<DriverDetailView> {
      const activeClient = getClient();
      const orderId =
        extractOrderIdFromCommand(commandId) ?? parseDriverOrderId(commandId);

      if (!orderId) {
        return deepFreeze<DriverDetailView>({
          scenarioId: 'D-DETAIL-ERROR',
          kind: 'error',
          title: 'Mã đơn không hợp lệ',
          message: 'Không tìm thấy mã đơn hàng hợp lệ trong lệnh nhận đơn.',
        });
      }

      try {
        const response = await activeClient.post<MappedDriverOrderResponse>(
          `/driver/orders/${orderId}/accept`,
        );

        lastActiveTripReference = formatOrderReference(response);
        currentAvailability = 'BUSY';

        return deepFreeze<DriverDetailView>(
          mapOrderToDriverDetailView(response),
        );
      } catch (error) {
        if (ApiError.isApiError(error)) {
          if (
            error.code === 'DRIVER_BUSY' ||
            error.code === 'DRIVER_HAS_ACTIVE_ORDER'
          ) {
            return deepFreeze<DriverConflictView>({
              scenarioId: 'D-DETAIL-ACTIVE-ORDER-CONFLICT',
              kind: 'conflict',
              title: 'Bạn đã có một chuyến hoạt động',
              message:
                'Không thể nhận thêm đơn khi chuyến hiện tại chưa kết thúc.',
              recoveryLabel: 'Mở chuyến đang thực hiện',
              activeOrderReference: lastActiveTripReference,
            });
          }
          if (
            error.statusCode === 409 ||
            error.code === 'ORDER_ALREADY_ASSIGNED' ||
            error.code === 'CONFLICT'
          ) {
            return deepFreeze<DriverConflictView>({
              scenarioId: 'D-DETAIL-ACCEPT-RACE',
              kind: 'conflict',
              title: 'Không thể nhận đơn',
              message: 'Tài xế khác vừa nhận đơn này.',
              recoveryLabel: 'Xem đơn còn trống',
            });
          }
          if (error.statusCode === 403 || error.code === 'FORBIDDEN') {
            return deepFreeze<DriverDetailView>({
              scenarioId: 'D-DETAIL-PERMISSION',
              kind: 'permission-denied',
              title: 'Bạn không có quyền xem đơn này',
              message:
                'Route, contact, media và tracking riêng tư không được hiển thị.',
            });
          }
        }

        if (isConflictError(error)) {
          return deepFreeze<DriverConflictView>({
            scenarioId: 'D-DETAIL-ACCEPT-RACE',
            kind: 'conflict',
            title: 'Không thể nhận đơn',
            message: 'Tài xế khác vừa nhận đơn này.',
            recoveryLabel: 'Xem đơn còn trống',
          });
        }

        if (isForbiddenError(error)) {
          return deepFreeze<DriverDetailView>({
            scenarioId: 'D-DETAIL-PERMISSION',
            kind: 'permission-denied',
            title: 'Bạn không có quyền xem đơn này',
            message:
              'Route, contact, media và tracking riêng tư không được hiển thị.',
          });
        }

        return deepFreeze<DriverDetailView>({
          scenarioId: 'D-DETAIL-ERROR',
          kind: 'error',
          title: 'Không thể nhận đơn hàng',
          message:
            error instanceof Error && error.message
              ? error.message
              : 'Hãy thử lại sau.',
        });
      }
    },

    async executeLifecycle(commandId: string): Promise<DriverDetailView> {
      const activeClient = getClient();
      const orderId =
        extractOrderIdFromCommand(commandId) ?? parseDriverOrderId(commandId);

      if (!orderId) {
        return deepFreeze<DriverDetailView>({
          scenarioId: 'D-DETAIL-ERROR',
          kind: 'error',
          title: 'Mã đơn không hợp lệ',
          message:
            'Không tìm thấy mã đơn hàng hợp lệ trong lệnh chuyển trạng thái.',
        });
      }

      let targetStatus: OrderStatus = 'PICKING_UP';
      if (commandId.includes('transit')) {
        targetStatus = 'IN_TRANSIT';
      } else if (commandId.includes('deliver')) {
        targetStatus = 'DELIVERED';
      } else if (commandId.includes('pickup')) {
        targetStatus = 'PICKING_UP';
      } else if (commandId.includes('accept')) {
        return this.acceptOrder(commandId);
      }

      try {
        const response = await activeClient.post<MappedDriverOrderResponse>(
          `/driver/orders/${orderId}/status`,
          { status: targetStatus },
        );

        if (targetStatus === 'DELIVERED') {
          currentAvailability = 'AVAILABLE';
        }

        return deepFreeze<DriverDetailView>(
          mapOrderToDriverDetailView(response),
        );
      } catch (error) {
        if (isConflictError(error)) {
          return deepFreeze<DriverConflictView>({
            scenarioId: 'D-DETAIL-INVALID-TRANSITION',
            kind: 'conflict',
            title: 'Trạng thái đơn đã thay đổi',
            message:
              'Command cũ không còn hợp lệ; không tự động thử lại transition.',
            recoveryLabel: 'Tải dữ liệu mới nhất',
          });
        }

        if (isForbiddenError(error)) {
          return deepFreeze<DriverDetailView>({
            scenarioId: 'D-DETAIL-PERMISSION',
            kind: 'permission-denied',
            title: 'Bạn không có quyền xem đơn này',
            message:
              'Route, contact, media và tracking riêng tư không được hiển thị.',
          });
        }

        return deepFreeze<DriverDetailView>({
          scenarioId: 'D-DETAIL-ERROR',
          kind: 'error',
          title: 'Không thể cập nhật trạng thái',
          message:
            error instanceof Error && error.message
              ? error.message
              : 'Hãy thử lại sau.',
        });
      }
    },
  };
}

