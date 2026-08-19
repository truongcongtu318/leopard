import { describe, expect, it, jest } from '@jest/globals';

import { ApiError } from '../../../api/api-error';
import {
  createCustomerHttpAdapter,
  describeStatus,
  formatDateTime,
  formatDistance,
  formatOrderReference,
  formatStatusFilterLabel,
  formatTimeOnly,
  formatVndPrice,
  normalizeRouteParam,
  parseCustomerOrderId,
  type CustomerHttpClient,
  type MappedOrderResponse,
  type OrderEstimateApiResponse,
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

    expect(formatOrderReference({ id: '11111111-1111-4111-8111-111111111001' })).toBe(
      'LP-11111111',
    );
    expect(
      formatOrderReference({
        id: '11111111-1111-4111-8111-111111111001',
        reference: 'LP-260815-001',
      }),
    ).toBe('LP-260815-001');

    expect(formatStatusFilterLabel('REQUESTED')).toBe('Chờ tài xế');
    expect(formatStatusFilterLabel('IN_TRANSIT')).toBe('Đang vận chuyển');
    expect(formatStatusFilterLabel('DELIVERED')).toBe('Đã giao');
    expect(formatStatusFilterLabel('ALL')).toBe('Tất cả');

    expect(describeStatus('REQUESTED')).toBe('Đơn đã được ghi nhận.');
    expect(describeStatus('ACCEPTED')).toBe('Tài xế đã nhận đơn.');
    expect(describeStatus('PICKING_UP')).toBe('Tài xế đang đến lấy hàng.');
    expect(describeStatus('IN_TRANSIT')).toBe('Hàng đang được vận chuyển.');
    expect(describeStatus('DELIVERED')).toBe('Đơn hàng đã được giao thành công.');
    expect(describeStatus('CANCELLED')).toBe(
      'Đã nhận snapshot phản hồi với trạng thái Đã hủy.',
    );
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
        .mockResolvedValueOnce(mockEstimateResponse) // estimateToken resolution
        .mockResolvedValueOnce(mockOrderResponse); // createOrder

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

    it('refreshes order on refresh-order action', async () => {
      const client = createMockClient();
      client.get.mockResolvedValueOnce(mockOrderResponse);

      const adapter = createCustomerHttpAdapter(client);
      const view = await adapter.executeIntent({
        actionId: 'refresh-order',
        orderId: mockOrderResponse.id,
      });

      expect(view.kind).toBe('content');
      expect(client.get).toHaveBeenCalledWith(`/orders/${mockOrderResponse.id}`);
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

