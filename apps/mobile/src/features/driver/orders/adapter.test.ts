import { describe, expect, it, jest } from '@jest/globals';

import { ApiError } from '../../../api/api-error';
import {
  createDriverHttpAdapter,
  deepFreeze,
  describeDriverStatus,
  extractOrderIdFromCommand,
  formatCargoSummary,
  formatDateTime,
  formatDistance,
  formatDriverEtaLabel,
  formatOrderReference,
  formatPublicRouteLabel,
  formatTimeOnly,
  formatVehicleLabel,
  formatVndPrice,
  isConflictError,
  isForbiddenError,
  mapDriverProof,
  mapDriverTracking,
  mapOrderToActiveTrip,
  mapOrderToDriverDetailView,
  mapOrderToPublicOrderView,
  mapOrderToRouteView,
  normalizeDriverRouteParam,
  parseDriverOrderId,
  type DriverHttpClient,
  type MappedDriverOrderResponse,
} from './adapter';

describe('Driver route and string adapter helpers', () => {
  it('normalizes Expo Router params without trusting repeated values', () => {
    expect(normalizeDriverRouteParam('enabled')).toBe('enabled');
    expect(normalizeDriverRouteParam(['first', 'second'])).toBe('first');
    expect(normalizeDriverRouteParam(undefined)).toBeNull();
  });

  it('accepts canonical UUID IDs and rejects malformed deep links', () => {
    expect(parseDriverOrderId('22222222-2222-4222-8222-222222222001')).toBe(
      '22222222-2222-4222-8222-222222222001',
    );
    expect(parseDriverOrderId('../customer/orders')).toBeNull();
    expect(parseDriverOrderId('not-a-uuid')).toBeNull();
  });

  it('extracts order ID UUID from command IDs', () => {
    expect(
      extractOrderIdFromCommand('cmd-accept-22222222-2222-4222-8222-222222222001'),
    ).toBe('22222222-2222-4222-8222-222222222001');
    expect(
      extractOrderIdFromCommand('cmd-pickup-22222222-2222-4222-8222-222222222001'),
    ).toBe('22222222-2222-4222-8222-222222222001');
    expect(extractOrderIdFromCommand('cmd-accept-demo')).toBeNull();
  });

  it('deep freezes data structures', () => {
    const obj = { nested: { val: 42 } };
    deepFreeze(obj);
    expect(Object.isFrozen(obj)).toBe(true);
    expect(Object.isFrozen(obj.nested)).toBe(true);
  });

  it('formats Vietnamese currency with dot separators', () => {
    expect(formatVndPrice(286000)).toBe('286.000 ₫');
    expect(formatVndPrice(0)).toBe('0 ₫');
    expect(formatVndPrice(null)).toBe('0 ₫');
    expect(formatVndPrice(undefined)).toBe('0 ₫');
  });

  it('formats distance in kilometers with comma decimal separator', () => {
    expect(formatDistance(18400)).toBe('18,4 km');
    expect(formatDistance(500)).toBe('0,5 km');
    expect(formatDistance(0)).toBe('0,0 km');
    expect(formatDistance(null)).toBe('0,0 km');
  });

  it('formats dates and times deterministically', () => {
    const testDate = new Date('2026-08-15T14:32:00.000Z');
    expect(formatDateTime(testDate)).toBeTruthy();
    expect(formatTimeOnly(testDate)).toBeTruthy();
    expect(formatDateTime(null)).toBe('');
    expect(formatTimeOnly(null)).toBe('');
  });

  it('formats order reference consistently', () => {
    expect(
      formatOrderReference({ id: '22222222-2222-4222-8222-222222222001' }),
    ).toBe('LP-22222222');
    expect(
      formatOrderReference({
        id: '22222222-2222-4222-8222-222222222001',
        reference: 'LP-D-260815-001',
      }),
    ).toBe('LP-D-260815-001');
  });

  it('formats ETA label with DEMO tagging when appropriate', () => {
    expect(formatDriverEtaLabel(1080, 'DEMO')).toBe(
      'ETA dự kiến · 18 phút · Dữ liệu mô phỏng',
    );
    expect(formatDriverEtaLabel(840, 'VIETMAP')).toBe('ETA dự kiến · 14 phút');
    expect(formatDriverEtaLabel(null, null)).toBe('ETA dự kiến · 1 phút');
  });

  it('formats vehicle label for all vehicle types', () => {
    expect(formatVehicleLabel('MOTORBIKE')).toBe('Xe máy');
    expect(formatVehicleLabel('VAN')).toBe('Xe van');
    expect(formatVehicleLabel('TRUCK_500KG')).toBe('Xe tải 500kg');
    expect(formatVehicleLabel('TRUCK_1500KG')).toBe('Xe tải 1.5 tấn');
    expect(formatVehicleLabel('TRUCK_5000KG')).toBe('Xe tải 5 tấn');
    expect(formatVehicleLabel(undefined)).toBe('Xe van');
  });

  it('formats cargo summary properly', () => {
    expect(
      formatCargoSummary({ cargoNote: 'Hàng đóng thùng', cargoWeightKg: 120 }),
    ).toBe('Hàng đóng thùng · khoảng 120 kg');
    expect(formatCargoSummary({ cargoNote: 'Bưu kiện nhỏ' })).toBe('Bưu kiện nhỏ');
    expect(formatCargoSummary({ cargoWeightKg: 15 })).toBe('khoảng 15 kg');
    expect(formatCargoSummary({})).toBe('Hàng hóa tiêu chuẩn');
  });

  it('formats public route label with Area prefix', () => {
    const stops = [
      { id: 's1', type: 'PICKUP', sequence: 0, address: 'Quận 7', lat: 10, lng: 106 },
      { id: 's2', type: 'DROPOFF', sequence: 1, address: 'Thủ Đức', lat: 10.8, lng: 106.7 },
    ];
    expect(formatPublicRouteLabel(stops)).toBe('Khu vực Quận 7 → Thủ Đức');
    expect(formatPublicRouteLabel([])).toBe('Lộ trình đơn hàng');
  });

  it('describes driver statuses accurately', () => {
    expect(describeDriverStatus('REQUESTED')).toBe('Đơn đã được ghi nhận.');
    expect(describeDriverStatus('ACCEPTED')).toBe('Bạn đã nhận chuyến.');
    expect(describeDriverStatus('PICKING_UP')).toBe('Bạn đang đi lấy hàng.');
    expect(describeDriverStatus('IN_TRANSIT')).toBe('Hàng đang được vận chuyển.');
    expect(describeDriverStatus('DELIVERED')).toBe('Đơn hàng đã được giao thành công.');
    expect(describeDriverStatus('CANCELLED')).toBe('Đơn hàng đã bị hủy.');
  });

  it('detects 403 forbidden and 409 conflict errors', () => {
    expect(isForbiddenError(new ApiError(403, 'FORBIDDEN', 'Forbidden'))).toBe(true);
    expect(isForbiddenError(new Error('Generic'))).toBe(false);

    expect(
      isConflictError(new ApiError(409, 'ORDER_ALREADY_ASSIGNED', 'Taken')),
    ).toBe(true);
    expect(isConflictError(new ApiError(409, 'DRIVER_BUSY', 'Busy'))).toBe(true);
    expect(isConflictError(new Error('Generic'))).toBe(false);
  });
});

describe('Driver mappers', () => {
  const sampleOrder: MappedDriverOrderResponse = {
    id: '22222222-2222-4222-8222-222222222001',
    reference: 'LP-D-260815-001',
    status: 'IN_TRANSIT',
    driverId: 'drv-1',
    providerSource: 'DEMO',
    distanceMeters: 18400,
    durationSeconds: 1080,
    vehicleType: 'VAN',
    cargoNote: 'Hàng đóng thùng',
    cargoWeightKg: 120,
    createdAt: '2026-08-15T13:58:00.000Z',
    updatedAt: '2026-08-15T14:32:00.000Z',
    stops: [
      { id: 'stop-0', type: 'PICKUP', sequence: 0, address: 'Kho Quận 7', lat: 10.73, lng: 106.71 },
      { id: 'stop-1', type: 'STOP', sequence: 1, address: 'Quận 4', lat: 10.75, lng: 106.70 },
      { id: 'stop-2', type: 'DROPOFF', sequence: 2, address: 'Thủ Đức', lat: 10.84, lng: 106.77 },
    ],
    statusHistory: [
      { id: 'h1', fromStatus: null, toStatus: 'REQUESTED', actorId: 'cust-1', reason: null, createdAt: '2026-08-15T13:58:00.000Z' },
      { id: 'h2', fromStatus: 'REQUESTED', toStatus: 'ACCEPTED', actorId: 'drv-1', reason: null, createdAt: '2026-08-15T14:05:00.000Z' },
      { id: 'h3', fromStatus: 'ACCEPTED', toStatus: 'IN_TRANSIT', actorId: 'drv-1', reason: null, createdAt: '2026-08-15T14:24:00.000Z' },
    ],
  };

  it('maps order to route view', () => {
    const route = mapOrderToRouteView(sampleOrder);
    expect(route.origin.label).toBe('Kho Quận 7');
    expect(route.destination.label).toBe('Thủ Đức');
    expect(route.stops).toHaveLength(1);
    expect(route.stops[0].label).toBe('Quận 4');
    expect(route.distanceLabel).toBe('18,4 km');
    expect(route.etaDurationSeconds).toBe(1080);
    expect(route.etaSource).toBe('DEMO');
  });

  it('maps order to public order view', () => {
    const publicOrder = mapOrderToPublicOrderView({
      ...sampleOrder,
      status: 'REQUESTED',
    });
    expect(publicOrder.id).toBe(sampleOrder.id);
    expect(publicOrder.reference).toBe('LP-D-260815-001');
    expect(publicOrder.status).toBe('REQUESTED');
    expect(publicOrder.publicRouteLabel).toBe('Khu vực Kho Quận 7 → Thủ Đức');
    expect(publicOrder.vehicleLabel).toBe('Xe van');
    expect(publicOrder.cargoSummary).toBe('Hàng đóng thùng · khoảng 120 kg');
    expect(publicOrder.etaLabel).toContain('18 phút · Dữ liệu mô phỏng');
  });

  it('maps order to active trip view with proof requirement indicator', () => {
    const activeTripNoProof = mapOrderToActiveTrip(sampleOrder);
    expect(activeTripNoProof.id).toBe(sampleOrder.id);
    expect(activeTripNoProof.status).toBe('IN_TRANSIT');
    expect(activeTripNoProof.trackingLabel).toContain('Đang gửi vị trí');
    expect(activeTripNoProof.proofLabel).toBe('Cần ảnh xác nhận trước khi hoàn tất');

    const activeTripWithProof = mapOrderToActiveTrip({
      ...sampleOrder,
      deliveryProofUrl: 'https://storage/proof.jpg',
    });
    expect(activeTripWithProof.proofLabel).toBeNull();
  });

  it('maps driver tracking view according to lifecycle state', () => {
    const acceptedTracking = mapDriverTracking({ ...sampleOrder, status: 'ACCEPTED' });
    expect(acceptedTracking.kind).toBe('not-started');

    const inTransitTracking = mapDriverTracking({ ...sampleOrder, status: 'IN_TRANSIT' });
    expect(inTransitTracking.kind).toBe('healthy');

    const deliveredTracking = mapDriverTracking({ ...sampleOrder, status: 'DELIVERED' });
    expect(deliveredTracking.kind).toBe('unavailable');
  });

  it('maps driver proof view according to lifecycle and proof upload', () => {
    const requestedProof = mapDriverProof({ ...sampleOrder, status: 'REQUESTED' });
    expect(requestedProof.kind).toBe('empty');

    const inTransitNoProof = mapDriverProof({ ...sampleOrder, status: 'IN_TRANSIT' });
    expect(inTransitNoProof.kind).toBe('required');

    const inTransitWithProof = mapDriverProof({
      ...sampleOrder,
      status: 'IN_TRANSIT',
      deliveryProofUrl: 'proof-demo.jpg',
    });
    expect(inTransitWithProof.kind).toBe('persisted');
    expect(inTransitWithProof.fileLabel).toBe('proof-demo.jpg');

    const deliveredProof = mapDriverProof({ ...sampleOrder, status: 'DELIVERED' });
    expect(deliveredProof.kind).toBe('persisted');
  });

  it('maps order to driver detail view for REQUESTED public order', () => {
    const view = mapOrderToDriverDetailView({ ...sampleOrder, status: 'REQUESTED' });
    expect(view.kind).toBe('content');
    expect(view.accessScope).toBe('PUBLIC_SUMMARY');
    expect(view.scenarioId).toBe('D-DETAIL-PUBLIC-REQUESTED');
    expect(view.primaryTask?.kind).toBe('accept');
    expect(view.primaryTask?.command.id).toBe(`cmd-accept-${sampleOrder.id}`);
  });

  it('maps order to driver detail view for assigned order legs', () => {
    const acceptedView = mapOrderToDriverDetailView({ ...sampleOrder, status: 'ACCEPTED' });
    expect(acceptedView.accessScope).toBe('ASSIGNED_FULL');
    expect(acceptedView.scenarioId).toBe('D-DETAIL-ACCEPTED');
    expect(acceptedView.primaryTask?.kind).toBe('advance-lifecycle');
    expect(acceptedView.primaryTask?.command.targetStatus).toBe('PICKING_UP');

    const pickingUpView = mapOrderToDriverDetailView({ ...sampleOrder, status: 'PICKING_UP' });
    expect(pickingUpView.scenarioId).toBe('D-DETAIL-PICKING-UP');
    expect(pickingUpView.primaryTask?.command.targetStatus).toBe('IN_TRANSIT');

    const inTransitNoProofView = mapOrderToDriverDetailView({ ...sampleOrder, status: 'IN_TRANSIT' });
    expect(inTransitNoProofView.scenarioId).toBe('D-DETAIL-IN-TRANSIT');
    expect(inTransitNoProofView.primaryTask?.kind).toBe('upload-proof');

    const inTransitWithProofView = mapOrderToDriverDetailView({
      ...sampleOrder,
      status: 'IN_TRANSIT',
      deliveryProofUrl: 'proof.jpg',
    });
    expect(inTransitWithProofView.scenarioId).toBe('D-DETAIL-READY-DELIVER');
    expect(inTransitWithProofView.primaryTask?.command.targetStatus).toBe('DELIVERED');

    const deliveredView = mapOrderToDriverDetailView({ ...sampleOrder, status: 'DELIVERED' });
    expect(deliveredView.scenarioId).toBe('D-DETAIL-TERMINAL-DELIVERED');
    expect(deliveredView.primaryTask).toBeNull();
  });
});

describe('createDriverHttpAdapter', () => {
  interface MockDriverHttpClient {
    get: jest.Mock<DriverHttpClient['get']>;
    post: jest.Mock<DriverHttpClient['post']>;
    put: jest.Mock<DriverHttpClient['put']>;
    patch: jest.Mock<DriverHttpClient['patch']>;
    delete: jest.Mock<DriverHttpClient['delete']>;
  }

  function createMockClient(): MockDriverHttpClient & DriverHttpClient {
    return {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    } as unknown as MockDriverHttpClient & DriverHttpClient;
  }

  const sampleOrder: MappedDriverOrderResponse = {
    id: '22222222-2222-4222-8222-222222222001',
    reference: 'LP-D-260815-001',
    status: 'IN_TRANSIT',
    driverId: 'drv-1',
    providerSource: 'DEMO',
    distanceMeters: 18400,
    durationSeconds: 1080,
    vehicleType: 'VAN',
    cargoNote: 'Hàng đóng thùng',
    cargoWeightKg: 120,
    createdAt: '2026-08-15T13:58:00.000Z',
    updatedAt: '2026-08-15T14:32:00.000Z',
    stops: [
      { id: 'stop-0', type: 'PICKUP', sequence: 0, address: 'Kho Quận 7', lat: 10.73, lng: 106.71 },
      { id: 'stop-1', type: 'DROPOFF', sequence: 1, address: 'Thủ Đức', lat: 10.84, lng: 106.77 },
    ],
  };

  const sampleRequestedOrder: MappedDriverOrderResponse = {
    id: '22222222-2222-4222-8222-222222222101',
    reference: 'LP-D-260815-101',
    status: 'REQUESTED',
    driverId: null,
    providerSource: 'DEMO',
    distanceMeters: 10000,
    durationSeconds: 600,
    vehicleType: 'VAN',
    cargoNote: 'Hàng tiêu chuẩn',
    cargoWeightKg: 50,
    createdAt: '2026-08-15T14:00:00.000Z',
    updatedAt: '2026-08-15T14:30:00.000Z',
    stops: [
      { id: 'stop-0', type: 'PICKUP', sequence: 0, address: 'Bình Thạnh', lat: 10.8, lng: 106.69 },
      { id: 'stop-1', type: 'DROPOFF', sequence: 1, address: 'Quận 1', lat: 10.77, lng: 106.70 },
    ],
  };

  describe('getOrdersView', () => {
    it('returns content view with requested orders and AVAILABLE shift status when no active trip', async () => {
      const client = createMockClient();
      client.get
        .mockResolvedValueOnce({ order: null }) // GET /driver/orders/active
        .mockResolvedValueOnce({
          items: [sampleRequestedOrder],
          total: 1,
          page: 1,
          pageSize: 20,
          totalPages: 1,
        }); // GET /driver/orders/available

      const adapter = createDriverHttpAdapter(client);
      const view = await adapter.getOrdersView();

      expect(view.kind).toBe('content');
      if (view.kind === 'content') {
        expect(view.scenarioId).toBe('D-LIST-REQUESTED');
        expect(view.availability.status).toBe('AVAILABLE');
        expect(view.availability.action?.target).toBe('OFFLINE');
        expect(view.activeTrip).toBeNull();
        expect(view.requestedOrders).toHaveLength(1);
        expect(view.requestedOrders[0].reference).toBe('LP-D-260815-101');
      }
      expect(client.get).toHaveBeenCalledWith('/driver/orders/active');
      expect(client.get).toHaveBeenCalledWith('/driver/orders/available');
    });

    it('returns content view with active trip and BUSY shift status when driver is on active trip', async () => {
      const client = createMockClient();
      client.get
        .mockResolvedValueOnce({ order: sampleOrder })
        .mockResolvedValueOnce({ items: [sampleRequestedOrder], total: 1, page: 1, pageSize: 20, totalPages: 1 });

      const adapter = createDriverHttpAdapter(client);
      const view = await adapter.getOrdersView();

      expect(view.kind).toBe('content');
      if (view.kind === 'content') {
        expect(view.scenarioId).toBe('D-LIST-ACTIVE-REQUESTED');
        expect(view.availability.status).toBe('BUSY');
        expect(view.availability.action?.disabled).toBe(true);
        expect(view.availability.action?.disabledReason).toBe('Bạn đang có chuyến hoạt động');
        expect(view.activeTrip?.reference).toBe('LP-D-260815-001');
        expect(view.requestedOrders).toHaveLength(1);
      }
    });

    it('returns empty boundary view when no active trip and no available orders', async () => {
      const client = createMockClient();
      client.get
        .mockResolvedValueOnce({ order: null })
        .mockResolvedValueOnce({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });

      const adapter = createDriverHttpAdapter(client);
      const view = await adapter.getOrdersView();

      expect(view.kind).toBe('content');
      if (view.kind === 'content') {
        expect(view.scenarioId).toBe('D-LIST-EMPTY');
        expect(view.isEmpty).toBe(true);
        expect(view.activeTrip).toBeNull();
        expect(view.requestedOrders).toHaveLength(0);
        expect(view.notice?.tone).toBe('info');
      }
    });

    it('returns permission-denied boundary view on 403 error', async () => {
      const client = createMockClient();
      client.get.mockRejectedValueOnce(
        new ApiError(403, 'FORBIDDEN', 'Access forbidden'),
      );

      const adapter = createDriverHttpAdapter(client);
      const view = await adapter.getOrdersView();

      expect(view.kind).toBe('permission-denied');
      if (view.kind === 'permission-denied') {
        expect(view.scenarioId).toBe('D-LIST-PERMISSION');
        expect(view.title).toBe('Bạn không có quyền xem khu vực tài xế');
      }
    });

    it('returns error boundary view on unexpected error', async () => {
      const client = createMockClient();
      client.get.mockRejectedValueOnce(new Error('Network offline'));

      const adapter = createDriverHttpAdapter(client);
      const view = await adapter.getOrdersView();

      expect(view.kind).toBe('error');
      if (view.kind === 'error') {
        expect(view.scenarioId).toBe('D-LIST-ERROR');
        expect(view.message).toBe('Network offline');
      }
    });
  });

  describe('getOrderDetailView', () => {
    it('returns error boundary for invalid UUID', async () => {
      const client = createMockClient();
      const adapter = createDriverHttpAdapter(client);
      const view = await adapter.getOrderDetailView('not-a-uuid');

      expect(view.kind).toBe('error');
      if (view.kind === 'error') {
        expect(view.title).toBe('Mã đơn không hợp lệ');
      }
      expect(client.get).not.toHaveBeenCalled();
    });

    it('calls GET /orders/:id and returns mapped public summary view for REQUESTED order', async () => {
      const client = createMockClient();
      client.get.mockResolvedValueOnce(sampleRequestedOrder);

      const adapter = createDriverHttpAdapter(client);
      const view = await adapter.getOrderDetailView(sampleRequestedOrder.id);

      expect(view.kind).toBe('content');
      if (view.kind === 'content') {
        expect(view.accessScope).toBe('PUBLIC_SUMMARY');
        expect(view.scenarioId).toBe('D-DETAIL-PUBLIC-REQUESTED');
        expect(view.primaryTask?.kind).toBe('accept');
      }
      expect(client.get).toHaveBeenCalledWith(`/orders/${sampleRequestedOrder.id}`);
    });

    it('calls GET /orders/:id and returns mapped assigned detail view for assigned order', async () => {
      const client = createMockClient();
      client.get.mockResolvedValueOnce(sampleOrder);

      const adapter = createDriverHttpAdapter(client);
      const view = await adapter.getOrderDetailView(sampleOrder.id);

      expect(view.kind).toBe('content');
      if (view.kind === 'content') {
        expect(view.accessScope).toBe('ASSIGNED_FULL');
        expect(view.order.reference).toBe('LP-D-260815-001');
        expect(view.tracking.kind).toBe('healthy');
      }
    });

    it('returns permission-denied boundary on 403 error', async () => {
      const client = createMockClient();
      client.get.mockRejectedValueOnce(
        new ApiError(403, 'FORBIDDEN', 'Access denied'),
      );

      const adapter = createDriverHttpAdapter(client);
      const view = await adapter.getOrderDetailView(sampleOrder.id);

      expect(view.kind).toBe('permission-denied');
      if (view.kind === 'permission-denied') {
        expect(view.scenarioId).toBe('D-DETAIL-PERMISSION');
      }
    });
  });

  describe('setAvailability', () => {
    it('calls PATCH /driver/availability with OFFLINE when AVAILABLE and updates state', async () => {
      const client = createMockClient();
      client.patch.mockResolvedValueOnce({ availability: 'OFFLINE' });

      const adapter = createDriverHttpAdapter(client);
      const result = await adapter.setAvailability('set-availability-offline');

      expect(result.status).toBe('OFFLINE');
      expect(result.action?.target).toBe('AVAILABLE');
      expect(result.action?.label).toBe('Bật sẵn sàng');
      expect(result.error).toBeNull();
      expect(client.patch).toHaveBeenCalledWith('/driver/availability', {
        availability: 'OFFLINE',
      });
    });

    it('calls PATCH /driver/availability with AVAILABLE when OFFLINE', async () => {
      const client = createMockClient();
      client.patch
        .mockResolvedValueOnce({ availability: 'OFFLINE' })
        .mockResolvedValueOnce({ availability: 'AVAILABLE' });

      const adapter = createDriverHttpAdapter(client);
      await adapter.setAvailability('set-availability-offline');
      const result = await adapter.setAvailability('set-availability-available');

      expect(result.status).toBe('AVAILABLE');
      expect(result.action?.target).toBe('OFFLINE');
      expect(result.action?.label).toBe('Tạm dừng nhận đơn');
      expect(result.error).toBeNull();
    });

    it('rolls back state and provides error message when API call fails', async () => {
      const client = createMockClient();
      client.patch.mockRejectedValueOnce(new Error('Network error'));

      const adapter = createDriverHttpAdapter(client);
      const result = await adapter.setAvailability('set-availability-offline');

      expect(result.status).toBe('AVAILABLE');
      expect(result.error).toContain('Chưa cập nhật được trạng thái nhận đơn');
      expect(result.error).toContain('Sẵn sàng.');
    });
  });

  describe('acceptOrder', () => {
    it('calls POST /driver/orders/:id/accept and returns assigned detail view', async () => {
      const client = createMockClient();
      const acceptedResponse: MappedDriverOrderResponse = {
        ...sampleRequestedOrder,
        status: 'ACCEPTED',
        driverId: 'drv-1',
      };
      client.post.mockResolvedValueOnce(acceptedResponse);

      const adapter = createDriverHttpAdapter(client);
      const view = await adapter.acceptOrder(
        `cmd-accept-${sampleRequestedOrder.id}`,
      );

      expect(view.kind).toBe('content');
      if (view.kind === 'content') {
        expect(view.scenarioId).toBe('D-DETAIL-ACCEPTED');
        expect(view.accessScope).toBe('ASSIGNED_FULL');
        expect(view.primaryTask?.kind).toBe('advance-lifecycle');
        expect(view.primaryTask?.command.targetStatus).toBe('PICKING_UP');
      }
      expect(client.post).toHaveBeenCalledWith(
        `/driver/orders/${sampleRequestedOrder.id}/accept`,
      );
    });

    it('maps 409 ORDER_ALREADY_ASSIGNED race condition to D-DETAIL-ACCEPT-RACE conflict view', async () => {
      const client = createMockClient();
      client.post.mockRejectedValueOnce(
        new ApiError(
          409,
          'ORDER_ALREADY_ASSIGNED',
          'Đơn hàng đã có tài xế khác tiếp nhận',
        ),
      );

      const adapter = createDriverHttpAdapter(client);
      const view = await adapter.acceptOrder(
        `cmd-accept-${sampleRequestedOrder.id}`,
      );

      expect(view.kind).toBe('conflict');
      if (view.kind === 'conflict') {
        expect(view.scenarioId).toBe('D-DETAIL-ACCEPT-RACE');
        expect(view.title).toBe('Không thể nhận đơn');
        expect(view.message).toBe('Tài xế khác vừa nhận đơn này.');
        expect(view.recoveryLabel).toBe('Xem đơn còn trống');
      }
    });

    it('maps 409 DRIVER_BUSY conflict to D-DETAIL-ACTIVE-ORDER-CONFLICT view', async () => {
      const client = createMockClient();
      // First, establish active trip reference
      client.get
        .mockResolvedValueOnce({ order: sampleOrder })
        .mockResolvedValueOnce({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });
      const adapter = createDriverHttpAdapter(client);
      await adapter.getOrdersView();

      client.post.mockRejectedValueOnce(
        new ApiError(
          409,
          'DRIVER_BUSY',
          'Lái xe không ở trạng thái sẵn sàng để nhận đơn',
        ),
      );

      const view = await adapter.acceptOrder(
        `cmd-accept-${sampleRequestedOrder.id}`,
      );

      expect(view.kind).toBe('conflict');
      if (view.kind === 'conflict') {
        expect(view.scenarioId).toBe('D-DETAIL-ACTIVE-ORDER-CONFLICT');
        expect(view.title).toBe('Bạn đã có một chuyến hoạt động');
        expect(view.recoveryLabel).toBe('Mở chuyến đang thực hiện');
        expect(view.activeOrderReference).toBe('LP-D-260815-001');
      }
    });

    it('returns permission-denied boundary on 403 error', async () => {
      const client = createMockClient();
      client.post.mockRejectedValueOnce(
        new ApiError(403, 'FORBIDDEN', 'Access denied'),
      );

      const adapter = createDriverHttpAdapter(client);
      const view = await adapter.acceptOrder(
        `cmd-accept-${sampleRequestedOrder.id}`,
      );

      expect(view.kind).toBe('permission-denied');
      if (view.kind === 'permission-denied') {
        expect(view.scenarioId).toBe('D-DETAIL-PERMISSION');
      }
    });

    it('returns error boundary when command has no valid UUID', async () => {
      const client = createMockClient();
      const adapter = createDriverHttpAdapter(client);
      const view = await adapter.acceptOrder('cmd-accept-invalid');

      expect(view.kind).toBe('error');
      if (view.kind === 'error') {
        expect(view.title).toBe('Mã đơn không hợp lệ');
      }
      expect(client.post).not.toHaveBeenCalled();
    });
  });

  describe('executeLifecycle', () => {
    it('executes PICKING_UP transition on cmd-pickup', async () => {
      const client = createMockClient();
      const pickingUpResponse: MappedDriverOrderResponse = {
        ...sampleOrder,
        status: 'PICKING_UP',
      };
      client.post.mockResolvedValueOnce(pickingUpResponse);

      const adapter = createDriverHttpAdapter(client);
      const view = await adapter.executeLifecycle(`cmd-pickup-${sampleOrder.id}`);

      expect(view.kind).toBe('content');
      if (view.kind === 'content') {
        expect(view.scenarioId).toBe('D-DETAIL-PICKING-UP');
        expect(view.primaryTask?.command.targetStatus).toBe('IN_TRANSIT');
      }
      expect(client.post).toHaveBeenCalledWith(
        `/driver/orders/${sampleOrder.id}/status`,
        { status: 'PICKING_UP' },
      );
    });

    it('executes IN_TRANSIT transition on cmd-transit', async () => {
      const client = createMockClient();
      const inTransitResponse: MappedDriverOrderResponse = {
        ...sampleOrder,
        status: 'IN_TRANSIT',
      };
      client.post.mockResolvedValueOnce(inTransitResponse);

      const adapter = createDriverHttpAdapter(client);
      const view = await adapter.executeLifecycle(`cmd-transit-${sampleOrder.id}`);

      expect(view.kind).toBe('content');
      if (view.kind === 'content') {
        expect(view.scenarioId).toBe('D-DETAIL-IN-TRANSIT');
      }
      expect(client.post).toHaveBeenCalledWith(
        `/driver/orders/${sampleOrder.id}/status`,
        { status: 'IN_TRANSIT' },
      );
    });

    it('executes DELIVERED transition on cmd-deliver and resets availability', async () => {
      const client = createMockClient();
      const deliveredResponse: MappedDriverOrderResponse = {
        ...sampleOrder,
        status: 'DELIVERED',
      };
      client.post.mockResolvedValueOnce(deliveredResponse);

      const adapter = createDriverHttpAdapter(client);
      const view = await adapter.executeLifecycle(`cmd-deliver-${sampleOrder.id}`);

      expect(view.kind).toBe('content');
      if (view.kind === 'content') {
        expect(view.scenarioId).toBe('D-DETAIL-TERMINAL-DELIVERED');
        expect(view.primaryTask).toBeNull();
      }
      expect(client.post).toHaveBeenCalledWith(
        `/driver/orders/${sampleOrder.id}/status`,
        { status: 'DELIVERED' },
      );
    });

    it('maps 409 invalid transition to D-DETAIL-INVALID-TRANSITION conflict view', async () => {
      const client = createMockClient();
      client.post.mockRejectedValueOnce(
        new ApiError(
          409,
          'ORDER_INVALID_TRANSITION',
          'Trạng thái đơn hàng đã thay đổi.',
        ),
      );

      const adapter = createDriverHttpAdapter(client);
      const view = await adapter.executeLifecycle(`cmd-pickup-${sampleOrder.id}`);

      expect(view.kind).toBe('conflict');
      if (view.kind === 'conflict') {
        expect(view.scenarioId).toBe('D-DETAIL-INVALID-TRANSITION');
        expect(view.title).toBe('Trạng thái đơn đã thay đổi');
        expect(view.recoveryLabel).toBe('Tải dữ liệu mới nhất');
      }
    });

    it('delegates to acceptOrder if command is cmd-accept', async () => {
      const client = createMockClient();
      client.post.mockResolvedValueOnce({
        ...sampleRequestedOrder,
        status: 'ACCEPTED',
        driverId: 'drv-1',
      });

      const adapter = createDriverHttpAdapter(client);
      const view = await adapter.executeLifecycle(
        `cmd-accept-${sampleRequestedOrder.id}`,
      );

      expect(view.kind).toBe('content');
      if (view.kind === 'content') {
        expect(view.scenarioId).toBe('D-DETAIL-ACCEPTED');
      }
      expect(client.post).toHaveBeenCalledWith(
        `/driver/orders/${sampleRequestedOrder.id}/accept`,
      );
    });
  });
});

