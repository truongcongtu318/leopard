import type {
  DriverAvailability,
  OrderStatus,
  ProviderSource,
  RouteCoordinate,
  RouteEtaResponse,
  StopProgressCommandResponse,
  VehicleType,
} from '@leopard/shared';

import { ApiError, decodePolyline } from '@leopard/mobile-core';
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
  DriverRouteStopView,
  DriverStopProgressStatus,
  DriverRouteView,
  DriverTrackingView,
} from './model';
import type {
  DriverOrdersPort,
  DriverProofPort,
  DriverTrackingPort,
  ProofFileInput,
} from './port';
import { pickDeviceImage, appendFileToFormData } from '@leopard/mobile-core';

function getDefaultHttpClient(): DriverHttpClient {
  const { httpClient } = require('@leopard/mobile-core');
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
  _source?: ProviderSource | string | null,
): string {
  const durationSeconds = seconds ?? 0;
  const minutes = Math.max(1, Math.round(durationSeconds / 60));
  return `Thời gian dự kiến · ${minutes} phút`;
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

const CONTACT_ROLE_LABELS: Record<MappedDriverCurrentContact['targetRole'], string> = {
  SENDER: 'Người gửi',
  RECIPIENT: 'Người nhận',
  COMPLETED: 'Liên hệ',
  NONE: 'Liên hệ',
};

export function resolveContactRoleLabel(
  currentContact?: MappedDriverCurrentContact,
): string {
  if (!currentContact) return 'Liên hệ khách hàng';
  return CONTACT_ROLE_LABELS[currentContact.targetRole] ?? 'Liên hệ';
}

export function formatCustomerContactValue(
  currentContact: MappedDriverCurrentContact | undefined,
  fallback: string | null | undefined,
): string {
  if (currentContact?.phone) {
    return currentContact.name
      ? `${currentContact.name} · ${currentContact.phone}`
      : currentContact.phone;
  }
  if (currentContact?.name) {
    return currentContact.name;
  }
  return (
    fallback ?? 'Thông tin liên hệ khách hàng · chỉ hiện sau phân công'
  );
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
  latitude?: number;
  longitude?: number;
  contactName?: string | null;
  contactPhone?: string | null;
  note?: string | null;
  progress?: DriverStopProgressStatus;
}

export interface MappedDriverCurrentContact {
  targetRole: 'SENDER' | 'RECIPIENT' | 'COMPLETED' | 'NONE';
  name: string | null;
  phone: string | null;
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
  currentContact?: MappedDriverCurrentContact;
  acceptedAt?: string | null;
  pickingUpAt?: string | null;
  inTransitAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  stops?: MappedDriverOrderStopResponse[];
  statusHistory?: MappedDriverOrderStatusHistoryResponse[];
  media?: Array<{ id: string; type: string; createdAt: string }>;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  isCashConfirmed?: boolean | null;
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
  availability?: DriverAvailability;
}

export interface DriverAvailabilityApiResponse {
  availability: DriverAvailability;
}

export interface DriverHttpClient {
  get<T = unknown>(path: string): Promise<T>;
  post<T = unknown>(path: string, body?: unknown): Promise<T>;
  postForm<T = unknown>(path: string, form: FormData): Promise<T>;
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

  const originLat = pickupStop?.lat ?? pickupStop?.latitude;
  const originLng = pickupStop?.lng ?? pickupStop?.longitude;
  const originCoords =
    originLat != null && originLng != null ? { lat: originLat, lng: originLng } : undefined;

  const origin: DriverRoutePoint = {
    id: pickupStop?.id ?? 'driver-pickup',
    label: pickupStop?.address ?? 'Điểm lấy hàng',
    lat: originLat,
    lng: originLng,
    coords: originCoords,
  };

  const destLat = dropoffStop?.lat ?? dropoffStop?.latitude;
  const destLng = dropoffStop?.lng ?? dropoffStop?.longitude;
  const destCoords =
    destLat != null && destLng != null ? { lat: destLat, lng: destLng } : undefined;

  const destination: DriverRoutePoint = {
    id: dropoffStop?.id ?? 'driver-dropoff',
    label: dropoffStop?.address ?? 'Điểm giao hàng',
    lat: destLat,
    lng: destLng,
    coords: destCoords,
  };

  const stops: readonly DriverRouteStopView[] = intermediateStops.map(
    (s, idx) => {
      const lat = s.lat ?? s.latitude;
      const lng = s.lng ?? s.longitude;
      return {
        id: s.id,
        stopId: s.id,
        sequence: s.sequence ?? idx + 1,
        address: s.address,
        label: s.address,
        lat,
        lng,
        latitude: lat,
        longitude: lng,
        coords: lat != null && lng != null ? { lat, lng } : undefined,
        progress: s.progress ?? 'PENDING',
        contactName: s.contactName,
        contactPhone: s.contactPhone,
      };
    },
  );

  const distanceLabel = formatDistance(order.distanceMeters);
  const etaDurationSeconds = order.durationSeconds ?? order.etaSeconds ?? 0;
  const etaSource = (order.providerSource as ProviderSource) ?? 'DEMO';

  let routeCoords: readonly RouteCoordinate[] | undefined;
  const snapshot = order.routeSnapshot as Record<string, any> | undefined;
  const rawPolyline = snapshot?.polyline;
  if (typeof rawPolyline === 'string' && rawPolyline.trim()) {
    try {
      routeCoords = decodePolyline(rawPolyline.trim(), 'POLYLINE5');
    } catch {
      try {
        routeCoords = decodePolyline(rawPolyline.trim(), 'POLYLINE6');
      } catch {
        // fallback to undefined
      }
    }
  }

  return {
    origin,
    stops,
    destination,
    distanceLabel,
    etaDurationSeconds,
    etaSource,
    eta: null,
    routeCoords,
  };
}

export function mapOrderToPublicOrderView(
  order: MappedDriverOrderResponse,
): DriverPublicOrderView {
  const pickupStop =
    order.stops?.find((s) => s.type === 'PICKUP' || s.sequence === 0) ?? order.stops?.[0];
  const dropoffStop =
    order.stops?.find((s) => s.type === 'DROPOFF') ??
    order.stops?.[(order.stops?.length ?? 1) - 1];

  const pickupLocationLabel = pickupStop?.address
    ? pickupStop.address.startsWith('Khu vực ')
      ? pickupStop.address
      : `Khu vực ${pickupStop.address}`
    : 'Khu vực lấy hàng';
  const dropoffLocationLabel = dropoffStop?.address ?? 'Khu vực giao hàng';

  const priceVnd = order.priceVnd ?? null;
  const distanceLabel = order.distanceMeters ? formatDistance(order.distanceMeters) : null;

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
    priceVnd,
    priceLabel: priceVnd !== null ? formatVndPrice(priceVnd) : null,
    distanceLabel,
    pickupLocationLabel,
    dropoffLocationLabel,
    // Backend does not return driver→pickup proximity; null until a
    // location-based proximity API exists.
    pickupDistanceLabel: null,
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
    customerContact: formatCustomerContactValue(order.currentContact, order.customerContact),
    contactRoleLabel: resolveContactRoleLabel(order.currentContact),
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
  const proofMedia = order.media?.find((m) => m.type === 'DELIVERY_PROOF') ?? null;
  const deliveryProofUrl = proofMedia?.id ?? order.deliveryProofUrl ?? null;
  const pickupProofMedia = order.media?.find((m) => m.type === 'PICKUP_PROOF') ?? null;

  // PICKING_UP is its own evidence step: the cargo is only confirmed as taken
  // once a pickup photo exists, so this leg must never borrow the delivery
  // proof metadata.
  if (status === 'PICKING_UP') {
    if (pickupProofMedia) {
      return {
        kind: 'persisted',
        label: 'Ảnh xác nhận đã lấy hàng đã tải lên',
        message: 'Bằng chứng lấy hàng đã có trong snapshot phản hồi từ hệ thống.',
        fileLabel: pickupProofMedia.id,
        mediaId: pickupProofMedia.id,
      };
    }
    return {
      kind: 'required',
      label: 'Cần ảnh xác nhận đã lấy hàng',
      message: 'Chụp ảnh hàng hóa tại điểm lấy để xác nhận đã lấy thành công.',
      fileLabel: null,
      mediaId: null,
    };
  }

  if (status === 'IN_TRANSIT') {
    if (deliveryProofUrl) {
      return {
        kind: 'persisted',
        label: 'Ảnh xác nhận đã tải lên',
        message: 'Proof đã có trong snapshot phản hồi từ hệ thống.',
        fileLabel: deliveryProofUrl,
        mediaId: proofMedia?.id ?? null,
      };
    }
    return {
      kind: 'required',
      label: 'Cần ảnh xác nhận trước khi hoàn tất',
      message: 'Thêm một ảnh JPEG, PNG hoặc WebP tối đa 10 MB.',
      fileLabel: null,
      mediaId: null,
    };
  }
  if (status === 'DELIVERED') {
    return {
      kind: 'persisted',
      label: 'Ảnh xác nhận đã tải lên',
      message: 'Proof read-only từ snapshot đã hoàn tất.',
      fileLabel: deliveryProofUrl ?? 'xac-nhan-giao-hang.jpg',
      mediaId: proofMedia?.id ?? null,
    };
  }
  return {
    kind: 'empty',
    label: 'Chưa có ảnh xác nhận',
    message: 'Proof chưa được yêu cầu ở task hiện tại.',
    fileLabel: null,
    mediaId: null,
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
    if (proof.kind === 'persisted') {
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
    // No pickup photo yet: the order cannot leave the pickup point, so the
    // primary task is the capture itself rather than the status transition.
    const uploadCommand: DriverCommandView = {
      id: `cmd-select-pickup-proof-${order.id}`,
      orderId: order.id,
      label: 'Chụp ảnh xác nhận đã lấy hàng',
    };
    return {
      primaryTask: { kind: 'upload-proof', command: uploadCommand },
      offeredLifecycleCommand: null,
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
  if (status === 'RETURNING') {
    const returnCommand: DriverCommandView = {
      id: `cmd-return-${order.id}`,
      orderId: order.id,
      label: 'Xác nhận đã hoàn hàng',
      targetStatus: 'RETURNED',
    };
    return {
      primaryTask: { kind: 'advance-lifecycle', command: returnCommand },
      offeredLifecycleCommand: returnCommand,
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
  else if (status === 'INCIDENT_CANCELLED') scenarioId = 'D-DETAIL-TERMINAL-INCIDENT';
  else if (status === 'RETURNING') scenarioId = 'D-DETAIL-RETURNING';
  else if (status === 'RETURNED') scenarioId = 'D-DETAIL-TERMINAL-RETURNED';

  const terminalNotice =
    status === 'INCIDENT_CANCELLED'
      ? 'Báo cáo sự cố thành công. Đơn đã được gỡ khỏi hàng đợi của bạn — bạn có thể nhận đơn mới.'
      : status === 'RETURNING'
        ? 'Đang hoàn trả hàng về điểm gửi theo yêu cầu sự cố.'
        : status === 'RETURNED'
          ? 'Đã hoàn trả hàng về điểm gửi thành công.'
          : null;

  const routeSnapshot =
    order.routeSnapshot && typeof order.routeSnapshot === 'object'
      ? (order.routeSnapshot as Record<string, any>)
      : null;
  const paymentMethod =
    order.paymentMethod === 'CASH' || routeSnapshot?.paymentMethod === 'CASH'
      ? 'CASH'
      : (order.paymentMethod || routeSnapshot?.paymentMethod || undefined);
  const driverPayoutVnd =
    typeof routeSnapshot?.driverPayoutVnd === 'number'
      ? routeSnapshot.driverPayoutVnd
      : typeof order.priceVnd === 'number'
        ? Math.round(order.priceVnd * 0.85)
        : null;

  const assignedOrder: DriverAssignedDetailView['order'] = {
    id: order.id,
    reference: formatOrderReference(order),
    status: status as Exclude<OrderStatus, 'REQUESTED'>,
    route,
    vehicleLabel: formatVehicleLabel(order.vehicleType),
    vehicleType: (order.vehicleType as VehicleType) ?? null,
    cargoSummary: formatCargoSummary(order),
    cargoWeightKg: order.cargoWeightKg ?? order.cargoWeight ?? null,
    contactRoleLabel: resolveContactRoleLabel(order.currentContact),
    customerContact: formatCustomerContactValue(order.currentContact, order.customerContact),
    priceLabel: formatVndPrice(order.priceVnd),
    priceVnd: order.priceVnd ?? null,
    paymentMethod,
    isCashConfirmed: false,
    driverPayoutVnd,
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
    notice: terminalNotice,
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

        if (
          activeRes &&
          typeof activeRes === 'object' &&
          'availability' in activeRes &&
          (activeRes.availability === 'AVAILABLE' ||
            activeRes.availability === 'OFFLINE' ||
            activeRes.availability === 'BUSY')
        ) {
          currentAvailability = activeRes.availability;
        }

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
            if (lastActiveTripReference) {
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

            currentAvailability = 'OFFLINE';
            return deepFreeze<DriverConflictView>({
              scenarioId: 'D-DETAIL-ACTIVE-ORDER-CONFLICT',
              kind: 'conflict',
              title: 'Chưa sẵn sàng nhận đơn',
              message:
                'Bạn đang ở trạng thái ngoại tuyến hoặc chưa sẵn sàng nhận đơn. Vui lòng bật trạng thái nhận đơn để tiếp tục.',
              recoveryLabel: 'Xem danh sách đơn',
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
          if (error.code === 'VEHICLE_TYPE_MISMATCH') {
            return deepFreeze<DriverConflictView>({
              scenarioId: 'D-DETAIL-VEHICLE-MISMATCH',
              kind: 'conflict',
              title: 'Đơn không phù hợp với loại xe của bạn',
              message:
                'Đơn hàng này yêu cầu loại phương tiện khác. Danh sách sẽ được làm mới, vui lòng chọn đơn khác phù hợp với xe của bạn.',
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
      } else if (commandId.includes('return')) {
        targetStatus = 'RETURNED';
      } else if (commandId.includes('accept')) {
        return this.acceptOrder(commandId);
      }

      try {
        const response = await activeClient.post<MappedDriverOrderResponse>(
          `/driver/orders/${orderId}/status`,
          { status: targetStatus },
        );

        if (targetStatus === 'DELIVERED' || targetStatus === 'RETURNED') {
          currentAvailability = 'AVAILABLE';
        }

        return deepFreeze<DriverDetailView>(
          mapOrderToDriverDetailView(response),
        );
      } catch (error) {
        if (ApiError.isApiError(error)) {
          if (
            error.code === 'PROOF_REQUIRED' ||
            error.code === 'DELIVERY_PROOF_REQUIRED' ||
            error.code === 'PICKUP_PROOF_REQUIRED' ||
            (error.statusCode === 400 && error.message.toLowerCase().includes('proof'))
          ) {
            // Which evidence is missing depends on the leg the server refused,
            // so the recovery task must point at that same leg.
            const isPickupLeg = targetStatus === 'IN_TRANSIT';
            const requiredProof = isPickupLeg
              ? {
                  label: 'Cần ảnh xác nhận đã lấy hàng',
                  message: 'Chụp ảnh hàng hóa tại điểm lấy để xác nhận đã lấy thành công.',
                  commandLabel: 'Chụp ảnh xác nhận đã lấy hàng',
                  commandId: `cmd-select-pickup-proof-${orderId}`,
                  notice: 'Cần tải ảnh xác nhận đã lấy hàng trước khi bắt đầu giao.',
                }
              : {
                  label: 'Cần ảnh xác nhận trước khi hoàn tất',
                  message: 'Thêm một ảnh JPEG, PNG hoặc WebP tối đa 10 MB.',
                  commandLabel: 'Thêm ảnh xác nhận giao hàng',
                  commandId: `cmd-select-proof-${orderId}`,
                  notice: 'Cần tải ảnh xác nhận trước khi hoàn tất giao hàng.',
                };
            try {
              const currentOrder = await activeClient.get<MappedDriverOrderResponse>(
                `/orders/${orderId}`,
              );
              const fetchedView = mapOrderToDriverDetailView(currentOrder);
              if (fetchedView.kind === 'content' && fetchedView.accessScope === 'ASSIGNED_FULL') {
                return deepFreeze<DriverDetailView>({
                  ...fetchedView,
                  scenarioId: 'D-DETAIL-PROOF-REQUIRED',
                  proof: {
                    kind: 'required',
                    label: requiredProof.label,
                    message: requiredProof.message,
                    fileLabel: null,
                  },
                  primaryTask: {
                    kind: 'upload-proof',
                    command: {
                      id: requiredProof.commandId,
                      orderId,
                      label: requiredProof.commandLabel,
                    },
                  },
                  offeredLifecycleCommand: null,
                  notice: requiredProof.notice,
                });
              }
            } catch {
              // Fallback to minimal state preserving order ID if GET fails
            }

            return deepFreeze<DriverDetailView>({
              scenarioId: 'D-DETAIL-PROOF-REQUIRED',
              kind: 'content',
              accessScope: 'ASSIGNED_FULL',
              order: {
                id: orderId,
                reference: lastActiveTripReference ?? `LP-${orderId.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
                status: 'IN_TRANSIT',
                route: {
                  origin: { id: 'driver-pickup', label: 'Điểm lấy hàng' },
                  stops: [],
                  destination: { id: 'driver-dropoff', label: 'Điểm giao hàng' },
                  distanceLabel: '0,0 km',
                  etaDurationSeconds: 0,
                  etaSource: 'DEMO',
                },
                vehicleLabel: 'Xe van',
                cargoSummary: 'Hàng hóa tiêu chuẩn',
                contactRoleLabel: 'Liên hệ khách hàng',
                customerContact: 'Thông tin liên hệ khách hàng · chỉ hiện sau phân công',
                updatedAtLabel: formatDateTime(new Date()),
                history: [],
              },
              tracking: {
                kind: 'healthy',
                label: 'Đang gửi vị trí',
                lastUpdatedLabel: formatDateTime(new Date()),
                queuedPointCount: null,
              },
              proof: {
                kind: 'required',
                label: 'Cần ảnh xác nhận trước khi hoàn tất',
                message: 'Thêm một ảnh JPEG, PNG hoặc WebP tối đa 10 MB.',
                fileLabel: null,
              },
              primaryTask: {
                kind: 'upload-proof',
                command: {
                  id: `cmd-select-proof-${orderId}`,
                  orderId,
                  label: 'Thêm ảnh xác nhận giao hàng',
                },
              },
              offeredLifecycleCommand: null,
              notice: 'Cần tải ảnh xác nhận trước khi hoàn tất giao hàng.',
            });
          }
        }

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

    async reportIncident(
      orderId: string,
      payload: { reason: string; note?: string; evidenceMediaId?: string },
    ): Promise<DriverDetailView> {
      const activeClient = getClient();
      const validId = parseDriverOrderId(orderId);
      if (!validId) {
        return deepFreeze<DriverDetailView>({
          scenarioId: 'D-DETAIL-ERROR',
          kind: 'error',
          title: 'Mã đơn không hợp lệ',
          message: 'Không tìm thấy mã đơn hàng hợp lệ để báo cáo sự cố.',
        });
      }

      try {
        const response = await activeClient.post<MappedDriverOrderResponse>(
          `/driver/orders/${validId}/incident`,
          payload,
        );

        currentAvailability = 'AVAILABLE';

        return deepFreeze<DriverDetailView>(
          mapOrderToDriverDetailView(response),
        );
      } catch (error) {
        return deepFreeze<DriverDetailView>({
          scenarioId: 'D-DETAIL-ERROR',
          kind: 'error',
          title: 'Không thể báo cáo sự cố',
          message:
            error instanceof Error && error.message
              ? error.message
              : 'Hãy thử lại sau.',
        });
      }
    },

    async confirmCashPayment(
      orderId: string,
      clientRequestId?: string,
    ): Promise<{ success: boolean; message?: string }> {
      const activeClient = getClient();
      const validId = parseDriverOrderId(orderId);
      if (!validId) {
        throw new Error('Mã đơn hàng không hợp lệ');
      }

      const reqId =
        clientRequestId ||
        (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `req-cash-${Date.now()}-${Math.random().toString(36).slice(2)}`);

      await activeClient.post(`/driver/orders/${validId}/confirm-cash`, {
        clientRequestId: reqId,
      });

      return { success: true, message: 'Đã xác nhận thu tiền mặt thành công.' };
    },

    async declineOrder(orderId: string): Promise<void> {
      const activeClient = getClient();
      const validId = parseDriverOrderId(orderId);
      if (!validId) {
        return;
      }
      try {
        await activeClient.post(`/driver/orders/${validId}/decline`, {});
      } catch {
        // Safe fallback if order was already expired or declined
      }
    },

    async getRouteEta(orderId: string): Promise<RouteEtaResponse> {
      const activeClient = getClient();
      const validId = parseDriverOrderId(orderId);
      if (!validId) {
        throw new Error('Mã đơn hàng không hợp lệ');
      }
      const res = await activeClient.get<
        RouteEtaResponse | { data: RouteEtaResponse }
      >(`/orders/${validId}/route-eta`);
      if (res && typeof res === 'object' && 'data' in res && res.data) {
        return (res as { data: RouteEtaResponse }).data;
      }
      return res as RouteEtaResponse;
    },

    async recordStopProgress(
      orderId: string,
      stopId: string,
      payload: { step: string; clientRequestId: string; occurredAt?: string },
    ): Promise<StopProgressCommandResponse> {
      const activeClient = getClient();
      const validId = parseDriverOrderId(orderId);
      if (!validId) {
        throw new Error('Mã đơn hàng không hợp lệ');
      }
      const res = await activeClient.post<
        StopProgressCommandResponse | { data: StopProgressCommandResponse }
      >(`/orders/${validId}/stops/${stopId}/progress`, payload);
      if (res && typeof res === 'object' && 'data' in res && res.data) {
        return (res as { data: StopProgressCommandResponse }).data;
      }
      return res as StopProgressCommandResponse;
    },
  };
}

export const ALLOWED_PROOF_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const;

export const MAX_PROOF_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export interface ProofFileMetadata {
  name: string;
  mimeType: string;
  size: number;
  uri?: string;
  data?: unknown;
  file?: File | Blob;
}

export interface ProofValidationResult {
  valid: boolean;
  error?: 'INVALID_TYPE' | 'TOO_LARGE' | 'NO_FILE';
  message?: string;
  view?: DriverProofView;
}

export function validateDeliveryProofFile(
  file?: Partial<ProofFileMetadata> | null,
): ProofValidationResult {
  if (!file) {
    return {
      valid: false,
      error: 'NO_FILE',
      message: 'Chưa có tệp nào được chọn.',
      view: {
        kind: 'empty',
        label: 'Chưa có ảnh xác nhận',
        message: 'Proof chưa được yêu cầu ở task hiện tại.',
        fileLabel: null,
      },
    };
  }

  const mime = file.mimeType?.toLowerCase().trim();
  const isValidType =
    Boolean(mime) &&
    ALLOWED_PROOF_MIME_TYPES.some((allowed) => allowed === mime);

  if (!isValidType) {
    return {
      valid: false,
      error: 'INVALID_TYPE',
      message: 'Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.',
      view: {
        kind: 'invalid-type',
        label: 'Định dạng không hợp lệ',
        message: 'Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.',
        fileLabel: file.name ?? null,
      },
    };
  }

  if (typeof file.size === 'number' && file.size > MAX_PROOF_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'TOO_LARGE',
      message: 'Ảnh vượt quá kích thước 10 MB.',
      view: {
        kind: 'too-large',
        label: 'Tệp vượt quá 10 MB',
        message: 'Vui lòng chọn ảnh có dung lượng dưới 10 MB.',
        fileLabel: file.name ?? null,
      },
    };
  }

  return { valid: true };
}

export interface ProofUploadApiResponse {
  id?: string;
  mediaId?: string;
  url?: string;
  deliveryProofUrl?: string;
  orderId?: string;
  status?: string;
}

export async function uploadDeliveryProof(
  client: DriverHttpClient,
  orderId: string,
  file: ProofFileMetadata,
): Promise<DriverProofView> {
  return uploadProofForLeg(client, orderId, file, 'delivery');
}

/**
 * Uploads the pickup evidence. The API keeps this separate from the delivery
 * proof so a leg can only ever be confirmed by its own photo.
 */
export async function uploadPickupProof(
  client: DriverHttpClient,
  orderId: string,
  file: ProofFileMetadata,
): Promise<DriverProofView> {
  return uploadProofForLeg(client, orderId, file, 'pickup');
}

/** True when the command id was minted for the pickup leg. */
export function isPickupProofCommand(commandId: string): boolean {
  return commandId.includes('pickup-proof');
}

async function uploadProofForLeg(
  client: DriverHttpClient,
  orderId: string,
  file: ProofFileMetadata,
  leg: 'pickup' | 'delivery',
): Promise<DriverProofView> {
  const validOrderId = parseDriverOrderId(orderId);
  if (!validOrderId) {
    return deepFreeze<DriverProofView>({
      kind: 'upload-retry',
      label: 'Mã đơn không hợp lệ',
      message: 'Không tìm thấy mã đơn hợp lệ để tải lên ảnh xác nhận.',
      fileLabel: file.name ?? null,
    });
  }

  const validation = validateDeliveryProofFile(file);
  if (!validation.valid && validation.view) {
    return deepFreeze<DriverProofView>(validation.view);
  }

  const isPickup = leg === 'pickup';
  const fallbackFileName = isPickup ? 'xac-nhan-lay-hang.jpg' : 'xac-nhan-giao-hang.jpg';

  try {
    const form = new FormData();
    await appendFileToFormData(form, 'file', {
      uri: file.uri ?? '',
      name: file.name,
      mimeType: file.mimeType,
      file: file.file,
    });
    form.append(
      'clientRequestId',
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `req-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    );

    const response = await client.postForm<{ id: string; type?: string }>(
      `/orders/${validOrderId}/media/${isPickup ? 'pickup-proof' : 'delivery-proof'}`,
      form,
    );

    return deepFreeze<DriverProofView>({
      kind: 'persisted',
      label: isPickup
        ? 'Ảnh xác nhận đã lấy hàng đã tải lên'
        : 'Ảnh xác nhận đã tải lên',
      message: 'Proof đã có trong snapshot phản hồi từ hệ thống.',
      fileLabel: file.name || fallbackFileName,
      mediaId: response.id,
    });
  } catch {
    return deepFreeze<DriverProofView>({
      kind: 'upload-retry',
      label: 'Chưa tải được ảnh',
      message: 'Ảnh đã chọn vẫn được giữ; hãy thử lại.',
      fileLabel: file.name ?? null,
    });
  }
}

export interface DriverProofAdapterOptions {
  filePicker?: () => Promise<ProofFileMetadata | null>;
  selectedFileProvider?: () => ProofFileMetadata | null;
}

export function createDriverProofAdapter(
  client?: DriverHttpClient,
  options?: DriverProofAdapterOptions,
): DriverProofPort {
  const getClient = (): DriverHttpClient => client ?? getDefaultHttpClient();
  let locallySelectedFile: ProofFileMetadata | null = null;

  return {
    async selectProof(): Promise<ProofFileMetadata | null> {
      if (options?.filePicker) {
        const file = await options.filePicker();
        locallySelectedFile = file;
        return file;
      }
      if (options?.selectedFileProvider) {
        const file = options.selectedFileProvider();
        locallySelectedFile = file;
        return file;
      }
      const picked = await pickDeviceImage();
      if (!picked) return null;
      const file: ProofFileMetadata = {
        name: picked.name,
        mimeType: picked.mimeType,
        size: picked.size,
        uri: picked.uri,
        file: picked.file,
      };
      locallySelectedFile = file;
      return file;
    },

    async uploadProof(commandId: string, capturedFile?: ProofFileInput): Promise<DriverProofView> {
      const orderId =
        extractOrderIdFromCommand(commandId) ?? parseDriverOrderId(commandId);
      if (!orderId) {
        return deepFreeze<DriverProofView>({
          kind: 'upload-retry',
          label: 'Mã đơn không hợp lệ',
          message: 'Không tìm thấy mã đơn trong lệnh tải ảnh.',
          fileLabel: null,
        });
      }

      const file = capturedFile ?? locallySelectedFile ?? options?.selectedFileProvider?.();
      if (!file) {
        // Nothing was captured, so there is nothing to upload. Report it rather
        // than posting a fabricated placeholder file to the server.
        return deepFreeze<DriverProofView>({
          kind: 'required',
          label: 'Chưa có ảnh xác nhận',
          message: 'Hãy chụp ảnh bằng chứng trước khi tải lên.',
          fileLabel: null,
        });
      }

      const result = isPickupProofCommand(commandId)
        ? await uploadPickupProof(getClient(), orderId, file)
        : await uploadDeliveryProof(getClient(), orderId, file);
      return result;
    },
  };
}



