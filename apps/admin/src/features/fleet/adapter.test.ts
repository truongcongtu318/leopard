import { describe, expect, it, jest } from '@jest/globals';

import type { ApiClient } from '../../lib/api/client';
import { ApiError } from '../../lib/api/api-error';
import {
  createFleetHttpAdapter,
  deepFreeze,
  fleetOrderDetailHref,
  fleetPreviewHref,
  formatDateTime,
  formatDriverDisplayId,
  formatOrderReference,
  formatTimeOnly,
  formatVndPrice,
  parseFleetDriverFilters,
  parseFleetOrderFilters,
  parseFleetOrderId,
  serializeFleetDriverFilters,
  serializeFleetOrderFilters,
} from './adapter';
import type { FleetBoundaryView, FleetDashboardView, FleetDriversView, FleetOrderDetailView, FleetOrdersView } from './model';

function createMockClient(): {
  client: ApiClient;
  getMock: jest.Mock<(path: string) => Promise<unknown>>;
} {
  const getMock = jest.fn<(path: string) => Promise<unknown>>();
  return {
    client: {
      get: getMock as unknown as <T = unknown>(path: string) => Promise<T>,
    },
    getMock,
  };
}

describe('Fleet URL boundary', () => {
  it('allow-lists Driver filters and clamps pagination', () => {
    expect(
      parseFleetDriverFilters({
        q: ['  Tài xế mô phỏng  ', 'ignored'],
        availability: 'ROOT',
        sort: 'availability',
        page: '-2',
        pageSize: '999',
      }),
    ).toEqual({
      q: 'Tài xế mô phỏng',
      availability: 'ALL',
      sort: 'availability',
      page: 1,
      pageSize: 20,
    });
  });

  it('validates Order filters without reflecting unsafe values', () => {
    expect(
      parseFleetOrderFilters({
        q: '<script>alert(1)</script>',
        status: 'IN_TRANSIT',
        customer: '  Khách mô phỏng  ',
        driverId: 'not-a-uuid',
        from: '2026-02-31',
        to: '2026-08-15',
        sort: 'updated-asc',
        page: '3',
        pageSize: '50',
      }),
    ).toEqual({
      q: '<script>alert(1)</script>',
      status: 'IN_TRANSIT',
      customer: 'Khách mô phỏng',
      driverId: '',
      from: '',
      to: '2026-08-15',
      sort: 'updated-asc',
      page: 3,
      pageSize: 50,
    });
  });

  it('serializes canonical filters and preserves only explicit preview context', () => {
    const driverQuery = serializeFleetDriverFilters(
      {
        q: 'An',
        availability: 'AVAILABLE',
        sort: 'name-desc',
        page: 2,
        pageSize: 50,
      },
      { preview: 'enabled', scenario: 'fleet-drivers-mixed' },
    );
    const orderQuery = serializeFleetOrderFilters(
      {
        q: 'LP-001',
        status: 'ALL',
        customer: '',
        driverId: '',
        from: '',
        to: '',
        sort: 'updated-desc',
        page: 1,
        pageSize: 20,
      },
      { preview: 'enabled', scenario: 'fleet-orders-mixed' },
    );

    expect(driverQuery).toBe(
      'q=An&availability=AVAILABLE&sort=name-desc&page=2&pageSize=50&preview=enabled&scenario=fleet-drivers-mixed',
    );
    expect(orderQuery).toBe(
      'q=LP-001&status=ALL&sort=updated-desc&page=1&pageSize=20&preview=enabled&scenario=fleet-orders-mixed',
    );
  });

  it('adds preview context without corrupting existing query or hash state', () => {
    expect(
      fleetPreviewHref(
        '/fleet/orders/33333333-3333-4333-8333-333333333001?tab=tracking#history',
        'fleet-order-detail-success',
        { preview: 'enabled', scenario: 'fleet-orders-mixed' },
      ),
    ).toBe(
      '/fleet/orders/33333333-3333-4333-8333-333333333001?tab=tracking&preview=enabled&scenario=fleet-order-detail-success#history',
    );
  });

  it('accepts only canonical UUID route identifiers', () => {
    expect(parseFleetOrderId('33333333-3333-4333-8333-333333333001')).toBe(
      '33333333-3333-4333-8333-333333333001',
    );
    expect(parseFleetOrderId(['bad', '33333333-3333-4333-8333-333333333001'])).toBeNull();
    expect(parseFleetOrderId('../admin')).toBeNull();
  });

  it('uses safe defaults for missing, duplicate and invalid preview values', () => {
    expect(parseFleetDriverFilters({})).toEqual({
      q: '',
      availability: 'ALL',
      sort: 'name-asc',
      page: 1,
      pageSize: 20,
    });
    expect(parseFleetOrderFilters({ from: ['2026-08-15'], to: ['bad'] })).toMatchObject({
      from: '2026-08-15',
      to: '',
      status: 'ALL',
      sort: 'updated-desc',
    });
    expect(
      serializeFleetDriverFilters(
        { q: '', availability: 'ALL', sort: 'name-asc', page: 1, pageSize: 20 },
        { preview: 'enabled', scenario: '../unsafe' },
      ),
    ).toBe('availability=ALL&sort=name-asc&page=1&pageSize=20&preview=enabled');
    expect(
      serializeFleetOrderFilters({
        q: '',
        status: 'ALL',
        customer: '',
        driverId: '',
        from: '',
        to: '',
        sort: 'updated-desc',
        page: 1,
        pageSize: 20,
      }),
    ).not.toContain('preview');
  });
});

describe('Formatters and Utility Helpers', () => {
  it('formats VND prices correctly', () => {
    expect(formatVndPrice(420000)).toBe('420.000 ₫');
    expect(formatVndPrice(0)).toBe('0 ₫');
    expect(formatVndPrice(null)).toBe('0 ₫');
    expect(formatVndPrice(undefined)).toBe('0 ₫');
  });

  it('formats dates and time labels', () => {
    const formatted = formatDateTime('14:32 · 15/08/2026');
    expect(formatted).toBe('14:32 · 15/08/2026');
    expect(formatDateTime(null)).toBe('');
    expect(formatTimeOnly(null)).toBe('');
  });

  it('formats order reference and driver display ID', () => {
    expect(formatOrderReference({ id: '33333333-3333-4333-8333-333333333001', reference: 'LP-F-260815-001' })).toBe('LP-F-260815-001');
    expect(formatOrderReference({ id: '33333333-3333-4333-8333-333333333001' })).toBe('LP-F-33333333');
    expect(formatDriverDisplayId({ id: '22222222-2222-4222-8222-222222222001', displayId: 'DRV-SM-001' })).toBe('DRV-SM-001');
    expect(formatDriverDisplayId({ id: '22222222-2222-4222-8222-222222222001' })).toBe('DRV-SM-222222');
  });

  it('deepFreezes nested objects', () => {
    const obj = { a: { b: 1 }, c: [2, 3] };
    const frozen = deepFreeze(obj);
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.a)).toBe(true);
    expect(Object.isFrozen(frozen.c)).toBe(true);
  });
});

describe('createFleetHttpAdapter - Queries and Scope Isolation', () => {
  const mockProfile = {
    id: '11111111-1111-4111-8111-111111111001',
    name: 'Sao Mai',
    displayId: 'FLEET-SM-01',
    verifiedAt: '2026-08-15T07:32:00.000Z',
    createdAt: '2026-08-15T07:00:00.000Z',
    updatedAt: '2026-08-15T07:32:00.000Z',
  };

  const mockDrivers = [
    {
      id: '22222222-2222-4222-8222-222222222001',
      name: 'Tài xế An Mô Phỏng',
      displayId: 'DRV-SM-001',
      availability: 'BUSY' as const,
      activeOrder: {
        id: '33333333-3333-4333-8333-333333333001',
        reference: 'LP-F-260815-001',
      },
      lastLocation: {
        address: 'Gần cầu Kênh Tẻ, Quận 7',
        isStale: true,
        updatedAt: '2026-08-15T07:27:00.000Z',
      },
    },
    {
      id: '22222222-2222-4222-8222-222222222002',
      name: 'Tài xế Bình Mô Phỏng',
      displayId: 'DRV-SM-002',
      availability: 'AVAILABLE' as const,
      activeOrder: null,
      lastLocation: {
        address: 'Khu vực Bình Thạnh',
        isStale: false,
        updatedAt: '2026-08-15T07:31:00.000Z',
      },
    },
  ];

  const mockOrders = [
    {
      id: '33333333-3333-4333-8333-333333333001',
      reference: 'LP-F-260815-001',
      status: 'IN_TRANSIT' as const,
      pickup: {
        id: 'pickup-1',
        label: 'Kho mô phỏng Quận 7',
        address: 'Quận 7',
      },
      stops: [
        {
          id: 'stop-1',
          label: 'Điểm dừng mô phỏng tại Quận 4',
          metadata: 'Đã đi qua lúc 14:10',
        },
      ],
      dropoff: {
        id: 'dropoff-1',
        label: 'Điểm giao mô phỏng Thành phố Thủ Đức',
        address: 'Thành phố Thủ Đức',
      },
      customer: {
        id: 'cust-1',
        name: 'Khách Hàng Lan Mô Phỏng',
      },
      driver: {
        id: '22222222-2222-4222-8222-222222222001',
        name: 'Tài xế An Mô Phỏng',
      },
      cargoNote: 'Hàng đóng thùng',
      cargoWeightKg: 120,
      totalPriceVnd: 420000,
      paymentStatus: 'UNPAID' as const,
      tracking: {
        state: 'stale' as const,
        statusLabel: 'Vị trí đã được nguồn dữ liệu đánh dấu là cũ',
        lastUpdatedLabel: '14:27 · 15/08/2026',
      },
      createdAt: '2026-08-15T06:30:00.000Z',
      updatedAt: '2026-08-15T07:27:00.000Z',
    },
  ];

  it('implements readScope with verified active FleetScopeView', async () => {
    const { client, getMock } = createMockClient();
    getMock.mockResolvedValueOnce(mockProfile);

    const adapter = createFleetHttpAdapter(client);
    const scope = await adapter.readScope();

    expect(getMock).toHaveBeenCalledWith('/fleet/profile');
    expect(scope).toEqual({
      fleetId: '11111111-1111-4111-8111-111111111001',
      displayId: 'FLEET-SM-01',
      displayName: 'Sao Mai',
      membershipStatus: 'ACTIVE',
      readOnly: true,
      verifiedAtLabel: expect.any(String),
    });
    expect(Object.isFrozen(scope)).toBe(true);
  });

  it('implements readDashboard with metrics, attention items, and active orders', async () => {
    const { client, getMock } = createMockClient();
    getMock
      .mockResolvedValueOnce(mockProfile)
      .mockResolvedValueOnce({ items: mockDrivers, total: 2 })
      .mockResolvedValueOnce({ items: mockOrders, total: 1 });

    const adapter = createFleetHttpAdapter(client);
    const view = (await adapter.readDashboard()) as FleetDashboardView;

    expect(view.kind).toBe('dashboard');
    expect(view.state).toBe('success');
    expect(view.scope.displayName).toBe('Sao Mai');
    expect(view.metrics).toHaveLength(4);
    expect(view.metrics.find((m) => m.id === 'active-orders')?.value).toBe(1);
    expect(view.metrics.find((m) => m.id === 'available-drivers')?.value).toBe(1);
    expect(view.metrics.find((m) => m.id === 'attention')?.value).toBe(1);
    expect(view.attentionItems).toHaveLength(1);
    expect(view.attentionItems[0]?.resourceLabel).toBe('LP-F-260815-001');
    expect(view.activeOrders).toHaveLength(1);
    expect(view.activeOrders[0]?.reference).toBe('LP-F-260815-001');
    expect(view.availabilitySummary).toContain('1 sẵn sàng · 1 đang bận');
    expect(Object.isFrozen(view)).toBe(true);
  });

  it('handles empty dashboard state gracefully', async () => {
    const { client, getMock } = createMockClient();
    getMock
      .mockResolvedValueOnce(mockProfile)
      .mockResolvedValueOnce({ items: [], total: 0 })
      .mockResolvedValueOnce({ items: [], total: 0 });

    const adapter = createFleetHttpAdapter(client);
    const view = (await adapter.readDashboard()) as FleetDashboardView;

    expect(view.kind).toBe('dashboard');
    expect(view.state).toBe('empty');
    expect(view.activeOrders).toEqual([]);
    expect(view.attentionItems).toEqual([]);
    expect(view.availabilitySummary).toBe('Chưa có tài xế trong phạm vi hiện tại.');
  });

  it('maps session-expired boundary on 401 in readDashboard', async () => {
    const { client, getMock } = createMockClient();
    getMock.mockRejectedValueOnce(new ApiError(401, 'UNAUTHORIZED', 'Session expired'));

    const adapter = createFleetHttpAdapter(client);
    const view = (await adapter.readDashboard()) as FleetBoundaryView;

    expect(view.kind).toBe('session-expired');
    expect(view.scenarioId).toBe('fleet-session-expired');
    expect(view.title).toBe('Phiên làm việc đã hết hạn');
  });

  it('maps permission-denied boundary on 403 in readDashboard', async () => {
    const { client, getMock } = createMockClient();
    getMock.mockRejectedValueOnce(new ApiError(403, 'FORBIDDEN', 'Access denied'));

    const adapter = createFleetHttpAdapter(client);
    const view = (await adapter.readDashboard()) as FleetBoundaryView;

    expect(view.kind).toBe('permission-denied');
    expect(view.scenarioId).toBe('fleet-scope-denied');
    expect(view.title).toBe('Bạn không có quyền xem đội xe này');
  });

  it('implements readDrivers with query filtering and pagination', async () => {
    const { client, getMock } = createMockClient();
    getMock
      .mockResolvedValueOnce(mockProfile)
      .mockResolvedValueOnce({ items: mockDrivers, total: 2, page: 1, pageSize: 20, totalPages: 1 });

    const adapter = createFleetHttpAdapter(client);
    const view = (await adapter.readDrivers({
      q: 'An',
      availability: 'BUSY',
      sort: 'name-asc',
      page: 1,
      pageSize: 20,
    })) as FleetDriversView;

    expect(getMock).toHaveBeenCalledWith(expect.stringContaining('/fleet/drivers?q=An&status=BUSY&sort=name-asc&page=1&pageSize=20'));
    expect(view.kind).toBe('drivers');
    expect(view.state).toBe('success');
    expect(view.result.items).toHaveLength(2);
    expect(view.result.items[0]?.displayName).toBe('Tài xế An Mô Phỏng');
    expect(view.result.items[0]?.exceptionLabel).toBe('Vị trí đã được đánh dấu là cũ');
    expect(view.result.items[0]?.activeOrder?.reference).toBe('LP-F-260815-001');
    expect(view.result.items[1]?.displayName).toBe('Tài xế Bình Mô Phỏng');
    expect(view.result.items[1]?.activeOrder).toBeNull();
  });

  it('handles no-results state in readDrivers', async () => {
    const { client, getMock } = createMockClient();
    getMock
      .mockResolvedValueOnce(mockProfile)
      .mockResolvedValueOnce({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });

    const adapter = createFleetHttpAdapter(client);
    const view = (await adapter.readDrivers({
      q: 'NonExistent',
      availability: 'ALL',
      sort: 'name-asc',
      page: 1,
      pageSize: 20,
    })) as FleetDriversView;

    expect(view.kind).toBe('drivers');
    expect(view.state).toBe('no-results');
    expect(view.result.items).toEqual([]);
    expect(view.result.mapState).toBe('no-location');
    expect(view.result.filterSummary).toBe('0 kết quả cho bộ lọc hiện tại');
  });

  it('implements readOrders with query filtering and mapping', async () => {
    const { client, getMock } = createMockClient();
    getMock
      .mockResolvedValueOnce(mockProfile)
      .mockResolvedValueOnce({ items: mockOrders, total: 1, page: 1, pageSize: 20, totalPages: 1 });

    const adapter = createFleetHttpAdapter(client);
    const view = (await adapter.readOrders({
      q: 'LP-F',
      status: 'IN_TRANSIT',
      customer: '',
      driverId: '22222222-2222-4222-8222-222222222001',
      from: '2026-08-15',
      to: '2026-08-16',
      sort: 'updated-desc',
      page: 1,
      pageSize: 20,
    })) as FleetOrdersView;

    expect(getMock).toHaveBeenCalledWith(expect.stringContaining('/fleet/orders?q=LP-F&status=IN_TRANSIT&driverId=22222222-2222-4222-8222-222222222001&from=2026-08-15&to=2026-08-16&sort=updated-desc&page=1&pageSize=20'));
    expect(view.kind).toBe('orders');
    expect(view.state).toBe('success');
    expect(view.result.items).toHaveLength(1);
    expect(view.result.items[0]?.reference).toBe('LP-F-260815-001');
    expect(view.result.items[0]?.route.originLabel).toBe('Kho mô phỏng Quận 7');
    expect(view.result.items[0]?.route.destinationLabel).toBe('Điểm giao mô phỏng Thành phố Thủ Đức');
  });

  it('implements readOrderDetail with full routes, eta, history, tracking and media', async () => {
    const { client, getMock } = createMockClient();
    getMock
      .mockResolvedValueOnce(mockProfile)
      .mockResolvedValueOnce(mockOrders[0]);

    const adapter = createFleetHttpAdapter(client);
    const view = (await adapter.readOrderDetail('33333333-3333-4333-8333-333333333001')) as FleetOrderDetailView;

    expect(view.kind).toBe('order-detail');
    expect(view.order.id).toBe('33333333-3333-4333-8333-333333333001');
    expect(view.order.reference).toBe('LP-F-260815-001');
    expect(view.order.route.origin.label).toBe('Kho mô phỏng Quận 7');
    expect(view.order.route.stops).toHaveLength(1);
    expect(view.order.route.destination.label).toBe('Điểm giao mô phỏng Thành phố Thủ Đức');
    expect(view.order.payment.amountLabel).toBe('420.000 ₫');
    expect(view.order.payment.status).toBe('UNPAID');
    expect(view.order.history.length).toBeGreaterThan(0);
    expect(view.notice?.tone).toBe('warning');
    expect(view.notice?.title).toBe('Tracking cần kiểm tra');
  });

  it('strictly enforces Fleet Scope non-disclosure boundary when attempting to access foreign orders (403/404)', async () => {
    const { client, getMock } = createMockClient();
    getMock
      .mockResolvedValueOnce(mockProfile)
      .mockRejectedValueOnce(new ApiError(404, 'NOT_FOUND', 'Order not found or not belonging to fleet'));

    const adapter = createFleetHttpAdapter(client);
    const view = (await adapter.readOrderDetail('99999999-9999-4999-8999-999999999999')) as FleetBoundaryView;

    expect(view.kind).toBe('permission-denied');
    expect(view.scenarioId).toBe('fleet-order-foreign-denied');
    expect(view.title).toBe('Bạn không có quyền xem đơn này');
    expect(view.message).toBe('Không hiển thị hoặc xác nhận dữ liệu nằm ngoài phạm vi được cấp quyền.');
  });

  it('rejects invalid order UUIDs without calling backend', async () => {
    const { client, getMock } = createMockClient();

    const adapter = createFleetHttpAdapter(client);
    const view = (await adapter.readOrderDetail('invalid-order-id')) as FleetBoundaryView;

    expect(getMock).not.toHaveBeenCalled();
    expect(view.kind).toBe('permission-denied');
    expect(view.scenarioId).toBe('fleet-order-foreign-denied');
    expect(view.title).toBe('Bạn không có quyền xem đơn này');
  });

  it('provides subscribeToReadEvents returning clean unsubscribe', () => {
    const { client } = createMockClient();
    const adapter = createFleetHttpAdapter(client);
    const sub = adapter.subscribeToReadEvents(() => {});
    expect(typeof sub.unsubscribe).toBe('function');
    expect(() => sub.unsubscribe()).not.toThrow();
  });

  it('ensures strict Read-Only guarantees with no write mutation methods', () => {
    const { client } = createMockClient();
    const adapter = createFleetHttpAdapter(client);

    const portKeys = Object.keys(adapter);
    expect(portKeys).toContain('readScope');
    expect(portKeys).toContain('readDashboard');
    expect(portKeys).toContain('readDrivers');
    expect(portKeys).toContain('readOrders');
    expect(portKeys).toContain('readOrderDetail');
    expect(portKeys).toContain('subscribeToReadEvents');

    // Forbidden mutations must not exist on the port
    const forbiddenMutations = [
      'createOrder',
      'cancelOrder',
      'acceptOrder',
      'updateStatus',
      'confirmPayment',
      'inviteDriver',
      'removeDriver',
      'uploadMedia',
      'updatePricing',
    ];

    for (const forbidden of forbiddenMutations) {
      expect((adapter as Record<string, unknown>)[forbidden]).toBeUndefined();
    }
  });
});
