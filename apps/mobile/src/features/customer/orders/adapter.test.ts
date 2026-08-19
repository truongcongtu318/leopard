import { describe, expect, it, jest } from '@jest/globals';

import { ApiError } from '../../../api/api-error';
import {
  createCustomerHttpAdapter,
  describeStatus,
  formatDateTime,
  formatDistance,
  formatOrderReference,
  formatPaymentReference,
  formatStatusFilterLabel,
  formatTimeOnly,
  formatVndPrice,
  mapPaymentToView,
  mapTrackingToView,
  normalizeRouteParam,
  parseCustomerOrderId,
  resolveCancelView,
  type CustomerHttpClient,
  type MappedOrderResponse,
  type MappedPaymentResponse,
  type MappedTrackingHistoryResponse,
  type OrderEstimateApiResponse,
  type PaymentQrApiResponse,
} from './adapter';
import type { CustomerCreateFormView } from './model';

describe('Customer route adapter helpers', () => {
  it('normalizes scalar and array Expo Router params', () => {
    expect(normalizeRouteParam('success')).toBe('success');
    expect(normalizeRouteParam(['first', 'second'])).toBe('first');
    expect(normalizeRouteParam(undefined)).toBeNull();
  });

  it('accepts canonical UUID order IDs and rejects untrusted route input', () => {
    expect(parseCustomerOrderId('11111111-1111-4111-8111-111111111001')).toBe(
      '11111111-1111-4111-8111-111111111001',
    );
    expect(parseCustomerOrderId('../admin/orders')).toBeNull();
    expect(parseCustomerOrderId(['not-a-uuid'])).toBeNull();
  });

  it('formats Vietnamese currency with dot thousands separators', () => {
    expect(formatVndPrice(286000)).toBe('286.000 ₫');
    expect(formatVndPrice(198000)).toBe('198.000 ₫');
    expect(formatVndPrice(0)).toBe('0 ₫');
    expect(formatVndPrice(null)).toBe('0 ₫');
    expect(formatVndPrice(undefined)).toBe('0 ₫');
  });

  it('formats distance in kilometers with Vietnamese comma decimal separator', () => {
    expect(formatDistance(18400)).toBe('18,4 km');
    expect(formatDistance(500)).toBe('0,5 km');
    expect(formatDistance(0)).toBe('0,0 km');
    expect(formatDistance(null)).toBe('0,0 km');
  });

  it('formats dates, times, references, and status descriptions deterministically', () => {
    const testDate = new Date('2026-08-15T14:32:00.000Z');
    expect(formatDateTime(testDate)).toBeTruthy();
    expect(formatTimeOnly(testDate)).toBeTruthy();
    expect(formatDateTime(null)).toBe('');
    expect(formatTimeOnly(null)).toBe('');

    expect(
      formatOrderReference({ id: '11111111-1111-4111-8111-111111111001' }),
    ).toBe('LP-11111111');
    expect(
      formatOrderReference({
        id: '11111111-1111-4111-8111-111111111001',
        reference: 'LP-260815-001',
      }),
    ).toBe('LP-260815-001');

    expect(
      formatPaymentReference({ id: '11111111-1111-4111-8111-111111111001' }),
    ).toBe('LPRD-11111111');
    expect(
      formatPaymentReference({
        referenceLabel: 'LPRD-DEMO-260815-001',
      }),
    ).toBe('LPRD-DEMO-260815-001');

    expect(formatStatusFilterLabel('REQUESTED')).toBe('Chờ tài xế');
    expect(formatStatusFilterLabel('IN_TRANSIT')).toBe('Đang vận chuyển');
    expect(formatStatusFilterLabel('DELIVERED')).toBe('Đã giao');
    expect(formatStatusFilterLabel('ALL')).toBe('Tất cả');

    expect(describeStatus('REQUESTED')).toBe('Đơn đã được ghi nhận.');
    expect(describeStatus('ACCEPTED')).toBe('Tài xế đã nhận đơn.');
    expect(describeStatus('PICKING_UP')).toBe('Tài xế đang đến lấy hàng.');
    expect(describeStatus('IN_TRANSIT')).toBe('Hàng đang được vận chuyển.');
    expect(describeStatus('DELIVERED')).toBe(
      'Đơn hàng đã được giao thành công.',
    );
    expect(describeStatus('CANCELLED')).toBe(
      'Đã nhận snapshot phản hồi với trạng thái Đã hủy.',
    );
  });

  describe('mapPaymentToView', () => {
    it('maps unpaid order to create-payment action', () => {
      const view = mapPaymentToView(null, 286000, 'REQUESTED');
      expect(view.status).toBe('UNPAID');
      expect(view.amountLabel).toBe('286.000 ₫');
      expect(view.action?.id).toBe('create-payment');
    });

    it('maps delivered order to PAID_MANUAL when no payment payload', () => {
      const view = mapPaymentToView(null, 286000, 'DELIVERED');
      expect(view.status).toBe('PAID_MANUAL');
      expect(view.sourceLabel).toBe('Xác nhận thủ công bởi hệ thống');
    });

    it('maps active QR payment to ready state', () => {
      const payment: PaymentQrApiResponse = {
        paymentId: 'pmt-1',
        orderId: 'ord-1',
        amountVnd: 286000,
        status: 'QR_CREATED',
        provider: 'DEMO',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        referenceLabel: 'LPRD-DEMO-260815-001',
      };
      const view = mapPaymentToView(payment, 286000);
      expect(view.status).toBe('QR_CREATED');
      expect(view.qrState).toBe('ready');
      expect(view.referenceLabel).toBe('LPRD-DEMO-260815-001');
      expect(view.sourceLabel).toBe('VietQR mô phỏng');
      expect(view.notice).toContain('Mã QR mô phỏng');
    });

    it('maps expired QR payment to expired state with refresh action', () => {
      const payment: PaymentQrApiResponse = {
        paymentId: 'pmt-1',
        orderId: 'ord-1',
        amountVnd: 286000,
        status: 'QR_CREATED',
        provider: 'VIETQR',
        expiresAt: '2020-01-01T00:00:00.000Z',
      };
      const view = mapPaymentToView(payment, 286000);
      expect(view.status).toBe('QR_CREATED');
      expect(view.qrState).toBe('expired');
      expect(view.expiresAtLabel).toBe('Đã hết hạn theo phản hồi hệ thống');
      expect(view.action?.id).toBe('refresh-payment');
    });

    it('maps failed payment with retry action', () => {
      const payment: MappedPaymentResponse = {
        id: 'pmt-1',
        orderId: 'ord-1',
        status: 'FAILED',
        amountVnd: 286000,
      };
      const view = mapPaymentToView(payment, 286000);
      expect(view.status).toBe('FAILED');
      expect(view.action?.id).toBe('retry-payment');
    });
  });

  describe('mapTrackingToView', () => {
    const mockOrder: MappedOrderResponse = {
      id: '11111111-1111-4111-8111-111111111001',
      status: 'IN_TRANSIT',
      driverId: 'drv-1',
      providerSource: 'DEMO',
      distanceMeters: 10000,
      durationSeconds: 600,
      priceVnd: 100000,
      etaSeconds: 600,
      createdAt: '2026-08-15T14:00:00.000Z',
      updatedAt: '2026-08-15T14:30:00.000Z',
    };

    it('returns no-driver when order has no driver assigned', () => {
      const view = mapTrackingToView({ ...mockOrder, driverId: null, status: 'REQUESTED' });
      expect(view.kind).toBe('no-driver');
    });

    it('returns no-location when history is empty but driver assigned', () => {
      const view = mapTrackingToView(mockOrder, { orderId: mockOrder.id, points: [] });
      expect(view.kind).toBe('no-location');
    });

    it('returns fresh tracking view when tracking points exist', () => {
      const history: MappedTrackingHistoryResponse = {
        orderId: mockOrder.id,
        points: [
          {
            id: 'pt-1',
            orderId: mockOrder.id,
            driverId: 'drv-1',
            latitude: 10.75,
            longitude: 106.68,
            capturedAt: '2026-08-15T14:32:00.000Z',
          },
        ],
      };
      const view = mapTrackingToView(mockOrder, history);
      expect(view.kind).toBe('fresh');
      if (view.kind === 'fresh') {
        expect(view.driverLabel).toBe('Tài xế Nguyễn Minh An');
        expect(view.lastUpdatedLabel).toBeTruthy();
      }
    });
  });

  describe('resolveCancelView', () => {
    it('returns available cancel action for REQUESTED order', () => {
      const view = resolveCancelView({
        id: 'ord-1',
        status: 'REQUESTED',
        driverId: null,
        providerSource: 'DEMO',
        distanceMeters: 0,
        durationSeconds: 0,
        priceVnd: 0,
        etaSeconds: 0,
        createdAt: '',
        updatedAt: '',
      });
      expect(view.kind).toBe('available');
      if (view.kind === 'available') {
        expect(view.action.id).toBe('cancel-order');
      }
    });

    it('returns unavailable reason for assigned order', () => {
      const view = resolveCancelView({
        id: 'ord-1',
        status: 'IN_TRANSIT',
        driverId: 'drv-1',
        providerSource: 'DEMO',
        distanceMeters: 0,
        durationSeconds: 0,
        priceVnd: 0,
        etaSeconds: 0,
        createdAt: '',
        updatedAt: '',
      });
      expect(view.kind).toBe('unavailable');
    });

    it('returns hidden for delivered/cancelled order', () => {
      const view = resolveCancelView({
        id: 'ord-1',
        status: 'DELIVERED',
        driverId: 'drv-1',
        providerSource: 'DEMO',
        distanceMeters: 0,
        durationSeconds: 0,
        priceVnd: 0,
        etaSeconds: 0,
        createdAt: '',
        updatedAt: '',
      });
      expect(view.kind).toBe('hidden');
    });
  });
});

describe('createCustomerHttpAdapter', () => {
  const mockOrderResponse: MappedOrderResponse = {
    id: '11111111-1111-4111-8111-111111111001',
    reference: 'LP-260815-001',
    customerId: 'cust-1',
    driverId: 'drv-1',
    status: 'IN_TRANSIT',
    providerSource: 'DEMO',
    distanceMeters: 18400,
    durationSeconds: 1080,
    priceVnd: 286000,
    etaSeconds: 1080,
    createdAt: '2026-08-15T13:58:00.000Z',
    updatedAt: '2026-08-15T14:32:00.000Z',
    stops: [
      {
        id: 'stop-0',
        type: 'PICKUP',
        sequence: 0,
        address: 'Kho mô phỏng Quận 7',
        lat: 10.7326,
        lng: 106.7168,
      },
      {
        id: 'stop-1',
        type: 'STOP',
        sequence: 1,
        address: 'Điểm dừng Quận 4',
        lat: 10.758,
        lng: 106.702,
      },
      {
        id: 'stop-2',
        type: 'DROPOFF',
        sequence: 2,
        address: 'Trung tâm Thủ Đức',
        lat: 10.8498,
        lng: 106.7725,
      },
    ],
    statusHistory: [
      {
        id: 'hist-1',
        fromStatus: null,
        toStatus: 'REQUESTED',
        actorId: 'cust-1',
        reason: 'Khởi tạo đơn',
        createdAt: '2026-08-15T13:58:00.000Z',
      },
      {
        id: 'hist-2',
        fromStatus: 'REQUESTED',
        toStatus: 'IN_TRANSIT',
        actorId: 'drv-1',
        reason: 'Bắt đầu giao',
        createdAt: '2026-08-15T14:24:00.000Z',
      },
    ],
  };

  const mockEstimateResponse: OrderEstimateApiResponse = {
    estimateToken: 'token-xyz-123',
    polyline: 'abcxyz',
    distanceM: 18400,
    durationS: 1080,
    estimatedArrivalAt: '2026-08-15T14:48:00.000Z',
    estimatedPriceVnd: 286000,
    source: 'DEMO',
    calculatedAt: '2026-08-15T14:30:00.000Z',
    isEstimate: true,
  };

  interface MockCustomerHttpClient {
    get: jest.Mock<CustomerHttpClient['get']>;
    post: jest.Mock<CustomerHttpClient['post']>;
    put: jest.Mock<CustomerHttpClient['put']>;
    delete: jest.Mock<CustomerHttpClient['delete']>;
  }

  function createMockClient(): MockCustomerHttpClient & CustomerHttpClient {
    return {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    } as unknown as MockCustomerHttpClient & CustomerHttpClient;
  }

  describe('getOrdersView', () => {
    it('returns content view on successful response', async () => {
      const client = createMockClient();
      client.get.mockResolvedValueOnce({
        items: [mockOrderResponse],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });

      const adapter = createCustomerHttpAdapter(client);
      const view = await adapter.getOrdersView('ALL');

      expect(view.kind).toBe('content');
      if (view.kind === 'content') {
        expect(view.scenarioId).toBe('C-LIST-SUCCESS');
        expect(view.orders).toHaveLength(1);
        expect(view.orders[0].reference).toBe('LP-260815-001');
        expect(view.orders[0].priceLabel).toBe('286.000 ₫');
        expect(view.orders[0].etaLabel).toContain('phút · Dữ liệu mô phỏng');
      }
      expect(client.get).toHaveBeenCalledWith('/orders');
    });

    it('returns empty boundary view when order list is empty', async () => {
      const client = createMockClient();
      client.get.mockResolvedValueOnce({
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      });

      const adapter = createCustomerHttpAdapter(client);
      const view = await adapter.getOrdersView('ALL');

      expect(view.kind).toBe('empty');
      if (view.kind === 'empty') {
        expect(view.scenarioId).toBe('C-LIST-EMPTY');
        expect(view.title).toBe('Bạn chưa có đơn hàng nào');
      }
    });

    it('returns no-results boundary view when filter yields no items', async () => {
      const client = createMockClient();
      client.get.mockResolvedValueOnce({
        items: [mockOrderResponse],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });

      const adapter = createCustomerHttpAdapter(client);
      const view = await adapter.getOrdersView('DELIVERED');

      expect(view.kind).toBe('no-results');
      if (view.kind === 'no-results') {
        expect(view.scenarioId).toBe('C-LIST-NO-RESULTS');
        expect(view.message).toContain('Đã giao');
      }
    });

    it('returns permission-denied boundary view on 403 error', async () => {
      const client = createMockClient();
      client.get.mockRejectedValueOnce(
        new ApiError(403, 'FORBIDDEN', 'Access forbidden'),
      );

      const adapter = createCustomerHttpAdapter(client);
      const view = await adapter.getOrdersView('ALL');

      expect(view.kind).toBe('permission-denied');
      if (view.kind === 'permission-denied') {
        expect(view.scenarioId).toBe('C-LIST-PERMISSION');
        expect(view.title).toBe('Bạn không có quyền xem danh sách đơn này');
      }
    });

    it('returns error boundary view on unexpected failure', async () => {
      const client = createMockClient();
      client.get.mockRejectedValueOnce(new Error('Network offline'));

      const adapter = createCustomerHttpAdapter(client);
      const view = await adapter.getOrdersView('ALL');

      expect(view.kind).toBe('error');
      if (view.kind === 'error') {
        expect(view.scenarioId).toBe('C-LIST-ERROR');
        expect(view.message).toBe('Network offline');
      }
    });
  });

  describe('getCreateView', () => {
    it('returns initial ready create view with disabled action', async () => {
      const client = createMockClient();
      const adapter = createCustomerHttpAdapter(client);
      const view = await adapter.getCreateView();

      expect(view.kind).toBe('form');
      if (view.kind === 'form') {
        expect(view.scenarioId).toBe('C-NEW-READY');
        expect(view.phase).toBe('ready');
        expect(view.actions[0].disabled).toBe(true);
      }
    });
  });

  describe('estimateOrder', () => {
    const validForm: CustomerCreateFormView = {
      pickup: 'Kho Quận 7',
      stops: [{ id: 'stop-1', value: 'Quận 4' }],
      dropoff: 'Thủ Đức',
      vehicleType: 'VAN',
      cargoNote: 'Hàng dễ vỡ',
      cargoWeight: '120',
      fieldErrors: {},
    };

    it('returns invalid phase with field errors when required fields are missing', async () => {
      const client = createMockClient();
      const adapter = createCustomerHttpAdapter(client);

      const invalidForm: CustomerCreateFormView = {
        ...validForm,
        pickup: '',
        dropoff: '',
        cargoWeight: '-5',
      };

      const view = await adapter.estimateOrder(invalidForm);

      expect(view.kind).toBe('form');
      if (view.kind === 'form') {
        expect(view.scenarioId).toBe('C-NEW-INVALID');
        expect(view.phase).toBe('invalid');
        expect(view.form.fieldErrors.pickup).toBe('Điểm lấy hàng là bắt buộc.');
        expect(view.form.fieldErrors.dropoff).toBe('Điểm giao hàng là bắt buộc.');
        expect(view.form.fieldErrors.cargoWeight).toBe('Khối lượng phải lớn hơn 0.');
      }
      expect(client.post).not.toHaveBeenCalled();
    });

    it('calls POST /orders/estimate and returns estimate-ready view on success', async () => {
      const client = createMockClient();
      client.post.mockResolvedValueOnce(mockEstimateResponse);

      const adapter = createCustomerHttpAdapter(client);
      const view = await adapter.estimateOrder(validForm);

      expect(view.kind).toBe('form');
      if (view.kind === 'form') {
        expect(view.scenarioId).toBe('C-NEW-ESTIMATE-DEMO');
        expect(view.phase).toBe('estimate-ready');
        expect(view.estimate.kind).toBe('ready');
        if (view.estimate.kind === 'ready') {
          expect(view.estimate.priceLabel).toBe('286.000 ₫');
          expect(view.estimate.distanceLabel).toBe('18,4 km');
          expect(view.estimate.source).toBe('DEMO');
        }
        expect(view.actions[0].id).toBe('create-order');
        expect(view.actions[0].disabled).toBe(false);
      }
      expect(client.post).toHaveBeenCalledWith(
        '/orders/estimate',
        expect.objectContaining({
          pickup: expect.objectContaining({ address: 'Kho Quận 7' }),
          dropoff: expect.objectContaining({ address: 'Thủ Đức' }),
          vehicleType: 'VAN',
        }),
      );
    });

    it('returns permission-denied view on 403 estimate error', async () => {
      const client = createMockClient();
      client.post.mockRejectedValueOnce(
        new ApiError(403, 'FORBIDDEN', 'Access forbidden'),
      );

      const adapter = createCustomerHttpAdapter(client);
      const view = await adapter.estimateOrder(validForm);

      expect(view.kind).toBe('permission-denied');
      if (view.kind === 'permission-denied') {
        expect(view.scenarioId).toBe('C-NEW-PERMISSION');
      }
    });

    it('returns estimate-error view on estimate API failure', async () => {
      const client = createMockClient();
      client.post.mockRejectedValueOnce(new Error('Map service unavailable'));

      const adapter = createCustomerHttpAdapter(client);
      const view = await adapter.estimateOrder(validForm);

      expect(view.kind).toBe('form');
      if (view.kind === 'form') {
        expect(view.scenarioId).toBe('C-NEW-ESTIMATE-ERROR');
        expect(view.phase).toBe('estimate-error');
        expect(view.estimate.kind).toBe('error');
      }
    });
  });

  describe('createOrder', () => {
    const validForm: CustomerCreateFormView = {
      pickup: 'Kho Quận 7',
      stops: [],
      dropoff: 'Thủ Đức',
      vehicleType: 'VAN',
      cargoNote: 'Thùng carton',
      cargoWeight: '50',
      fieldErrors: {},
    };

    it('calls POST /orders and returns detail content view', async () => {
      const client = createMockClient();
      client.post
        .mockResolvedValueOnce(mockEstimateResponse)
        .mockResolvedValueOnce(mockOrderResponse);

      const adapter = createCustomerHttpAdapter(client);
      const view = await adapter.createOrder(validForm);

      expect(view.kind).toBe('content');
      if (view.kind === 'content') {
        expect(view.scenarioId).toBe('C-DETAIL-SUCCESS');
        expect(view.order.id).toBe(mockOrderResponse.id);
        expect(view.order.reference).toBe('LP-260815-001');
        expect(view.order.priceLabel).toBe('286.000 ₫');
      }
      expect(client.post).toHaveBeenCalledWith(
        '/orders',
        expect.objectContaining({
          estimateToken: 'token-xyz-123',
          vehicleType: 'VAN',
          cargoNote: 'Thùng carton',
          cargoWeightKg: 50,
        }),
      );
    });

    it('returns error boundary view when route fields are incomplete', async () => {
      const client = createMockClient();
      const adapter = createCustomerHttpAdapter(client);
      const view = await adapter.createOrder({
        ...validForm,
        pickup: '',
      });

      expect(view.kind).toBe('error');
      if (view.kind === 'error') {
        expect(view.scenarioId).toBe('C-DETAIL-ERROR');
        expect(view.message).toContain('lộ trình không đầy đủ');
      }
    });

    it('returns permission-denied boundary view on 403 response', async () => {
      const client = createMockClient();
      client.post
        .mockResolvedValueOnce(mockEstimateResponse)
        .mockRejectedValueOnce(new ApiError(403, 'FORBIDDEN', 'Access denied'));

      const adapter = createCustomerHttpAdapter(client);
      const view = await adapter.createOrder(validForm);

      expect(view.kind).toBe('permission-denied');
      if (view.kind === 'permission-denied') {
        expect(view.scenarioId).toBe('C-DETAIL-PERMISSION');
      }
    });
  });

  describe('getOrderDetailView', () => {
    it('returns error boundary for invalid UUID', async () => {
      const client = createMockClient();
      const adapter = createCustomerHttpAdapter(client);
      const view = await adapter.getOrderDetailView('invalid-id');

      expect(view.kind).toBe('error');
      if (view.kind === 'error') {
        expect(view.title).toBe('Mã đơn không hợp lệ');
      }
      expect(client.get).not.toHaveBeenCalled();
    });

    it('calls GET /orders/:id and returns mapped detail view', async () => {
      const client = createMockClient();
      client.get.mockResolvedValueOnce(mockOrderResponse);

      const adapter = createCustomerHttpAdapter(client);
      const view = await adapter.getOrderDetailView(mockOrderResponse.id);

      expect(view.kind).toBe('content');
      if (view.kind === 'content') {
        expect(view.scenarioId).toBe('C-DETAIL-SUCCESS');
        expect(view.order.reference).toBe('LP-260815-001');
        expect(view.order.tracking.kind).toBe('fresh');
        expect(view.order.history).toHaveLength(2);
      }
      expect(client.get).toHaveBeenCalledWith(`/orders/${mockOrderResponse.id}`);
    });

    it('returns permission-denied boundary on 403 error', async () => {
      const client = createMockClient();
      client.get.mockRejectedValueOnce(
        new ApiError(403, 'FORBIDDEN', 'Access denied'),
      );

      const adapter = createCustomerHttpAdapter(client);
      const view = await adapter.getOrderDetailView(mockOrderResponse.id);

      expect(view.kind).toBe('permission-denied');
      if (view.kind === 'permission-denied') {
        expect(view.scenarioId).toBe('C-DETAIL-PERMISSION');
      }
    });
  });

  describe('Payment endpoints and status', () => {
    const mockPaymentQrResponse: PaymentQrApiResponse = {
      paymentId: 'pmt-1',
      orderId: mockOrderResponse.id,
      amountVnd: 286000,
      status: 'QR_CREATED',
      provider: 'DEMO',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      referenceLabel: 'LPRD-DEMO-260815-001',
    };

    it('createPaymentQr calls POST /payments/qr and returns detail view with ready QR', async () => {
      const client = createMockClient();
      client.post.mockResolvedValueOnce(mockPaymentQrResponse);
      client.get.mockResolvedValueOnce(mockOrderResponse);

      const adapter = createCustomerHttpAdapter(client);
      const view = await adapter.createPaymentQr!(mockOrderResponse.id, 286000);

      expect(view.kind).toBe('content');
      if (view.kind === 'content') {
        expect(view.scenarioId).toBe('C-DETAIL-QR-READY');
        expect(view.order.payment.status).toBe('QR_CREATED');
        expect(view.order.payment.qrState).toBe('ready');
        expect(view.order.payment.referenceLabel).toBe('LPRD-DEMO-260815-001');
        expect(view.order.payment.sourceLabel).toBe('VietQR mô phỏng');
      }
      expect(client.post).toHaveBeenCalledWith('/payments/qr', {
        orderId: mockOrderResponse.id,
        amountVnd: 286000,
      });
    });

    it('createPaymentQr handles 403 permission denied', async () => {
      const client = createMockClient();
      client.post.mockRejectedValueOnce(
        new ApiError(403, 'FORBIDDEN', 'Payment denied'),
      );

      const adapter = createCustomerHttpAdapter(client);
      const view = await adapter.createPaymentQr!(mockOrderResponse.id);

      expect(view.kind).toBe('permission-denied');
    });

    it('getPaymentStatus calls GET /payments/:id and returns mapped payment view', async () => {
      const client = createMockClient();
      client.get.mockResolvedValueOnce(mockPaymentQrResponse);

      const adapter = createCustomerHttpAdapter(client);
      const view = await adapter.getPaymentStatus!('pmt-1');

      expect(view.status).toBe('QR_CREATED');
      expect(view.referenceLabel).toBe('LPRD-DEMO-260815-001');
      expect(client.get).toHaveBeenCalledWith('/payments/pmt-1');
    });
  });

  describe('Tracking history and reconciliation', () => {
    const mockTrackingResponse: MappedTrackingHistoryResponse = {
      orderId: mockOrderResponse.id,
      points: [
        {
          id: 'pt-1',
          orderId: mockOrderResponse.id,
          driverId: 'drv-1',
          latitude: 10.75,
          longitude: 106.68,
          capturedAt: '2026-08-15T14:32:00.000Z',
        },
      ],
      latestPoint: {
        id: 'pt-1',
        orderId: mockOrderResponse.id,
        driverId: 'drv-1',
        latitude: 10.75,
        longitude: 106.68,
        capturedAt: '2026-08-15T14:32:00.000Z',
      },
    };

    it('getTrackingHistory calls GET /orders/:id/tracking', async () => {
      const client = createMockClient();
      client.get.mockResolvedValueOnce(mockTrackingResponse);

      const adapter = createCustomerHttpAdapter(client);
      const res = await adapter.getTrackingHistory!(mockOrderResponse.id);

      expect(res).toEqual(mockTrackingResponse);
      expect(client.get).toHaveBeenCalledWith(
        `/orders/${mockOrderResponse.id}/tracking`,
      );
    });

    it('reconcileTrackingHistory fetches order and tracking and updates detail view', async () => {
      const client = createMockClient();
      client.get
        .mockResolvedValueOnce(mockOrderResponse)
        .mockResolvedValueOnce(mockTrackingResponse);

      const adapter = createCustomerHttpAdapter(client);
      const view = await adapter.reconcileTrackingHistory!(
        mockOrderResponse.id,
      );

      expect(view.kind).toBe('content');
      if (view.kind === 'content') {
        expect(view.order.tracking.kind).toBe('fresh');
        if (view.order.tracking.kind === 'fresh') {
          expect(view.order.tracking.driverLabel).toBe('Tài xế Nguyễn Minh An');
        }
      }
    });
  });

  describe('executeIntent', () => {
    it('cancels order on cancel-order action and returns cancel success content view', async () => {
      const client = createMockClient();
      const cancelledOrder: MappedOrderResponse = {
        ...mockOrderResponse,
        status: 'CANCELLED',
      };
      client.post.mockResolvedValueOnce(cancelledOrder);

      const adapter = createCustomerHttpAdapter(client);
      const view = await adapter.executeIntent({
        actionId: 'cancel-order',
        orderId: mockOrderResponse.id,
        value: 'Đổi ý không gửi nữa',
      });

      expect(view.kind).toBe('content');
      if (view.kind === 'content') {
        expect(view.scenarioId).toBe('C-DETAIL-CANCEL-SUCCESS');
        expect(view.notice).toBe(
          'Đã nhận snapshot phản hồi với trạng thái Đã hủy.',
        );
        expect(view.order.status).toBe('CANCELLED');
        expect(view.cancel.kind).toBe('hidden');
      }
      expect(client.post).toHaveBeenCalledWith(
        `/orders/${mockOrderResponse.id}/cancel`,
        { reason: 'Đổi ý không gửi nữa' },
      );
    });

    it('executes create-payment intent', async () => {
      const client = createMockClient();
      const mockPaymentQrResponse: PaymentQrApiResponse = {
        paymentId: 'pmt-1',
        orderId: mockOrderResponse.id,
        amountVnd: 286000,
        status: 'QR_CREATED',
        provider: 'DEMO',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      };
      client.post.mockResolvedValueOnce(mockPaymentQrResponse);
      client.get.mockResolvedValueOnce(mockOrderResponse);

      const adapter = createCustomerHttpAdapter(client);
      const view = await adapter.executeIntent({
        actionId: 'create-payment',
        orderId: mockOrderResponse.id,
      });

      expect(view.kind).toBe('content');
      expect(client.post).toHaveBeenCalledWith('/payments/qr', {
        orderId: mockOrderResponse.id,
        amountVnd: undefined,
      });
    });

    it('executes refresh-tracking intent', async () => {
      const client = createMockClient();
      client.get
        .mockResolvedValueOnce(mockOrderResponse)
        .mockResolvedValueOnce({
          orderId: mockOrderResponse.id,
          points: [],
        });

      const adapter = createCustomerHttpAdapter(client);
      const view = await adapter.executeIntent({
        actionId: 'refresh-tracking',
        orderId: mockOrderResponse.id,
      });

      expect(view.kind).toBe('content');
      expect(client.get).toHaveBeenCalledWith(
        `/orders/${mockOrderResponse.id}/tracking`,
      );
    });

    it('refreshes order on refresh-order action', async () => {
      const client = createMockClient();
      client.get.mockResolvedValueOnce(mockOrderResponse);

      const adapter = createCustomerHttpAdapter(client);
      const view = await adapter.executeIntent({
        actionId: 'refresh-order',
        orderId: mockOrderResponse.id,
      });

      expect(view.kind).toBe('content');
      expect(client.get).toHaveBeenCalledWith(
        `/orders/${mockOrderResponse.id}`,
      );
    });

    it('handles invalid order ID in cancel intent gracefully', async () => {
      const client = createMockClient();
      const adapter = createCustomerHttpAdapter(client);
      const view = await adapter.executeIntent({
        actionId: 'cancel-order',
        orderId: 'bad-id',
      });

      expect(view.kind).toBe('error');
      if (view.kind === 'error') {
        expect(view.title).toBe('Mã đơn không hợp lệ');
      }
    });

    it('handles permission-denied in cancel intent', async () => {
      const client = createMockClient();
      client.post.mockRejectedValueOnce(
        new ApiError(403, 'FORBIDDEN', 'Cannot cancel order'),
      );

      const adapter = createCustomerHttpAdapter(client);
      const view = await adapter.executeIntent({
        actionId: 'cancel-order',
        orderId: mockOrderResponse.id,
      });

      expect(view.kind).toBe('permission-denied');
      if (view.kind === 'permission-denied') {
        expect(view.scenarioId).toBe('C-DETAIL-PERMISSION');
      }
    });
  });
});
