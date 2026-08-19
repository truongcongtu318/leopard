import { describe, expect, it, jest } from '@jest/globals';

import type { ApiClient } from '../../lib/api/client';
import { ApiError } from '../../lib/api/api-error';
import {
  createAdminHttpAdapter,
  createAdminPreviewHref,
  createOrderCommandView,
  createUserCommandView,
  deepFreeze,
  formatDateTime,
  formatDriverDisplayId,
  formatFleetDisplayId,
  formatMaskedPhone,
  formatOrderReference,
  formatTimeOnly,
  formatVndPrice,
  parseAdminCommandKind,
  parseAdminEntityId,
  parseAdminListFilters,
  serializeAdminListFilters,
} from './adapter';
import type {
  AdminBoundaryView,
  AdminDriverListItemView,
  AdminFleetListItemView,
  AdminListView,
  AdminOrderDetailView,
  AdminOrderListItemView,
  AdminOverviewView,
  AdminUserListItemView,
} from './model';

function createMockClient(): {
  client: ApiClient;
  getMock: jest.Mock<(path: string) => Promise<unknown>>;
  postMock: jest.Mock<(path: string, body?: unknown) => Promise<unknown>>;
  patchMock: jest.Mock<(path: string, body?: unknown) => Promise<unknown>>;
} {
  const getMock = jest.fn<(path: string) => Promise<unknown>>();
  const postMock = jest.fn<(path: string, body?: unknown) => Promise<unknown>>();
  const patchMock = jest.fn<(path: string, body?: unknown) => Promise<unknown>>();

  return {
    client: {
      get: getMock as unknown as <T = unknown>(path: string) => Promise<T>,
      post: postMock as unknown as <T = unknown>(path: string, body?: unknown) => Promise<T>,
      patch: patchMock as unknown as <T = unknown>(path: string, body?: unknown) => Promise<T>,
    },
    getMock,
    postMock,
    patchMock,
  };
}

describe('Admin URL and privacy boundary', () => {
  it('allow-lists Order filters and validates dates, IDs and pagination', () => {
    expect(
      parseAdminListFilters('orders', {
        q: '0909 123 456',
        status: 'IN_TRANSIT',
        customerId: '44444444-4444-4444-8444-444444444001',
        driverId: 'not-a-uuid',
        from: '2026-08-01',
        to: '2026-02-31',
        sort: 'updated-asc',
        page: '-1',
        pageSize: '100',
      }),
    ).toEqual({
      status: 'IN_TRANSIT',
      role: 'ALL',
      userStatus: 'ALL',
      availability: 'ALL',
      membershipStatus: 'ALL',
      fleetId: '',
      customerId: '44444444-4444-4444-8444-444444444001',
      driverId: '',
      from: '2026-08-01',
      to: '',
      sort: 'updated-asc',
      page: 1,
      pageSize: 100,
    });
  });

  it('drops raw search and unrelated fields from serialized URLs', () => {
    const query = serializeAdminListFilters(
      'users',
      {
        status: 'ALL',
        role: 'DRIVER',
        userStatus: 'DISABLED',
        availability: 'ALL',
        membershipStatus: 'ALL',
        fleetId: '',
        customerId: '',
        driverId: '',
        from: '',
        to: '',
        sort: 'updated-desc',
        page: 2,
        pageSize: 50,
      },
      {
        preview: 'enabled',
        scenario: 'ADM-USR-DENSE',
        rawSearch: '0909 123 456',
      },
    );

    expect(query).toBe(
      'role=DRIVER&userStatus=DISABLED&sort=updated-desc&page=2&pageSize=50&preview=enabled&scenario=ADM-USR-DENSE',
    );
    expect(query).not.toContain('0909');
    expect(query).not.toContain('rawSearch');
  });

  it('keeps only allow-listed preview context on navigation links', () => {
    const orderId = '33333333-3333-4333-8333-333333333104';

    expect(
      createAdminPreviewHref(
        `/admin/orders/${orderId}?q=0909123456&token=private-demo`,
        'order-detail',
        {
          preview: 'enabled',
          scenario: 'ADM-ORD-DENSE',
          command: 'CANCEL_ORDER',
          rawSearch: '0909 123 456',
        },
      ),
    ).toBe(`/admin/orders/${orderId}?preview=enabled&scenario=ADM-ORD-DETAIL`);

    expect(
      createAdminPreviewHref(`/admin/orders/${orderId}`, 'order-detail', {
        preview: 'enabled',
        scenario: 'ADM-CMD-INVALID',
        command: 'CANCEL_ORDER',
      }),
    ).toBe(
      `/admin/orders/${orderId}?preview=enabled&scenario=ADM-CMD-INVALID&command=CANCEL_ORDER`,
    );

    expect(
      createAdminPreviewHref('/admin/orders', 'orders', {
        preview: 'enabled',
        scenario: 'ADM-ORD-DENSE',
        rawSearch: 'customer@example.test',
      }),
    ).toBe('/admin/orders?preview=enabled&scenario=ADM-ORD-DENSE');
  });

  it('uses per-screen defaults for invalid or missing values', () => {
    expect(
      parseAdminListFilters('drivers', { availability: 'ROOT', sort: 'revenue' }),
    ).toMatchObject({
      availability: 'ALL',
      sort: 'name-asc',
      page: 1,
      pageSize: 20,
    });
    expect(parseAdminListFilters('fleets', {})).toMatchObject({ sort: 'name-asc' });
    expect(parseAdminListFilters('users', { role: 'ADMIN', userStatus: 'ACTIVE' })).toMatchObject({
      role: 'ADMIN',
      userStatus: 'ACTIVE',
    });
  });

  it('accepts only canonical UUIDs and command kinds', () => {
    expect(parseAdminEntityId('33333333-3333-4333-8333-333333333001')).toBe(
      '33333333-3333-4333-8333-333333333001',
    );
    expect(parseAdminEntityId(['bad', '33333333-3333-4333-8333-333333333001'])).toBeNull();
    expect(parseAdminCommandKind('CONFIRM_MANUAL_PAYMENT')).toBe('CONFIRM_MANUAL_PAYMENT');
    expect(parseAdminCommandKind('DELETE_FLEET')).toBeNull();
  });
});

describe('Formatters and Utility Helpers', () => {
  it('formats VND prices correctly', () => {
    expect(formatVndPrice(420000)).toBe('420.000 ₫');
    expect(formatVndPrice(0)).toBe('0 ₫');
    expect(formatVndPrice(null)).toBe('0 ₫');
    expect(formatVndPrice(undefined)).toBe('0 ₫');
  });

  it('formats masked phone numbers safely', () => {
    expect(formatMaskedPhone('0909123456')).toBe('••• ••• 3456');
    expect(formatMaskedPhone(null)).toBe('••• ••• ••••');
    expect(formatMaskedPhone('')).toBe('••• ••• ••••');
    expect(formatMaskedPhone('123')).toBe('••• 123');
  });

  it('formats dates and time labels', () => {
    expect(formatDateTime('14:32 · 15/08/2026')).toBe('14:32 · 15/08/2026');
    expect(formatDateTime(null)).toBe('');
    expect(formatTimeOnly(null)).toBe('');
    expect(formatTimeOnly('invalid-date')).toBe('');
  });

  it('formats order reference, fleet display ID, and driver display ID', () => {
    expect(
      formatOrderReference({
        id: '33333333-3333-4333-8333-333333333101',
        reference: 'LP-A-260815-101',
      }),
    ).toBe('LP-A-260815-101');
    expect(
      formatOrderReference({
        id: '33333333-3333-4333-8333-333333333101',
      }),
    ).toBe('LP-A-260815-333');
    expect(
      formatFleetDisplayId({
        id: '11111111-1111-4111-8111-111111111001',
        displayId: 'FLEET-OPS-001',
      }),
    ).toBe('FLEET-OPS-001');
    expect(
      formatFleetDisplayId({
        id: '11111111-1111-4111-8111-111111111001',
      }),
    ).toBe('FLEET-1111');
    expect(
      formatDriverDisplayId({
        id: '22222222-2222-4222-8222-222222222001',
        displayId: 'DRV-SM-001',
      }),
    ).toBe('DRV-SM-001');
    expect(
      formatDriverDisplayId({
        id: '22222222-2222-4222-8222-222222222001',
      }),
    ).toBe('DRV-SM-222222');
  });

  it('deepFreezes nested objects and arrays', () => {
    const obj = { a: { b: 1 }, c: [{ d: 2 }, 3] };
    const frozen = deepFreeze(obj);
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.a)).toBe(true);
    expect(Object.isFrozen(frozen.c)).toBe(true);
    expect(Object.isFrozen(frozen.c[0])).toBe(true);
  });

  it('builds valid createUserCommandView schemas with reason policies', () => {
    const disableCmd = createUserCommandView('DISABLE_USER', {
      id: '55555555-5555-4555-8555-555555555001',
      displayName: 'Nguyễn An',
      role: 'DRIVER',
      status: 'ACTIVE',
      phone: '0909123456',
    });

    expect(disableCmd.kind).toBe('DISABLE_USER');
    expect(disableCmd.buttonVariant).toBe('destructive');
    expect(disableCmd.reasonPolicy.required).toBe(true);
    expect(disableCmd.reasonPolicy.minLength).toBe(5);
    expect(disableCmd.reasonPolicy.maxLength).toBe(500);
    expect(disableCmd.targetItems).toHaveLength(3);

    const enableCmd = createUserCommandView('ENABLE_USER', {
      id: '55555555-5555-4555-8555-555555555002',
      displayName: 'Trần Bình',
      role: 'CUSTOMER',
      status: 'DISABLED',
      phone: '0909567890',
    });

    expect(enableCmd.kind).toBe('ENABLE_USER');
    expect(enableCmd.buttonVariant).toBe('primary');
  });
});

describe('createAdminHttpAdapter - Queries and Read Operations', () => {
  const mockOverviewData = {
    state: 'ready' as const,
    checkedAt: '2026-08-15T07:32:00.000Z',
    health: {
      liveness: 'UP',
      readiness: 'READY',
      dependencyLabel: 'Các dependency pilot sẵn sàng',
      requestId: null,
    },
    metrics: [
      { id: 'users', label: 'Người dùng', value: 24, detail: 'Trong snapshot hiện tại', href: '/admin/users' },
      { id: 'fleets', label: 'Đội xe', value: 3, detail: 'Pilot scope', href: '/admin/fleets' },
      { id: 'active-orders', label: 'Đơn đang hoạt động', value: 4, detail: 'Chưa terminal', href: '/admin/orders' },
      { id: 'media-errors', label: 'Media lỗi', value: 0, detail: '0 là dữ liệu hợp lệ' },
    ],
    orderDistribution: [
      { status: 'REQUESTED' as const, count: 1 },
      { status: 'ACCEPTED' as const, count: 1 },
      { status: 'PICKING_UP' as const, count: 1 },
      { status: 'IN_TRANSIT' as const, count: 1 },
      { status: 'DELIVERED' as const, count: 6 },
      { status: 'CANCELLED' as const, count: 2 },
    ],
    exceptions: [
      {
        id: 'exception-tracking',
        domain: 'tracking' as const,
        label: 'Tracking cần kiểm tra',
        detail: 'Vị trí gần nhất đã được nguồn dữ liệu đánh dấu là cũ.',
        tone: 'warning' as const,
        updatedAt: '2026-08-15T07:27:00.000Z',
        targetHref: '/admin/orders/33333333-3333-4333-8333-333333333101',
      },
    ],
    recentOrders: [
      {
        id: '33333333-3333-4333-8333-333333333101',
        reference: 'LP-A-260815-101',
        status: 'ACCEPTED' as const,
        paymentStatus: 'UNPAID' as const,
        createdAt: '2026-08-15T07:30:00.000Z',
      },
    ],
  };

  const mockUsers = [
    {
      id: '55555555-5555-4555-8555-555555555001',
      name: 'Nguyễn An',
      phone: '0909123456',
      role: 'DRIVER' as const,
      status: 'ACTIVE' as const,
      updatedAt: '2026-08-15T07:30:00.000Z',
    },
    {
      id: '55555555-5555-4555-8555-555555555002',
      name: 'Trần Bình',
      phone: '0909567890',
      role: 'CUSTOMER' as const,
      status: 'DISABLED' as const,
      updatedAt: '2026-08-15T06:15:00.000Z',
    },
  ];

  const mockFleets = [
    {
      id: '11111111-1111-4111-8111-111111111001',
      displayId: 'FLEET-OPS-001',
      name: 'Đội xe Sao Mai',
      ownerSummary: 'Owner mô phỏng · membership ACTIVE',
      activeMembershipCount: 2,
      driverCount: 5,
      orderCount: 12,
      updatedAt: '2026-08-15T07:28:00.000Z',
    },
  ];

  const mockDrivers = [
    {
      id: '22222222-2222-4222-8222-222222222001',
      name: 'Tài xế An',
      phone: '0909121201',
      accountStatus: 'ACTIVE' as const,
      availability: 'BUSY' as const,
      membershipStatus: 'ACTIVE' as const,
      fleet: { name: 'Sao Mai' },
      activeOrder: {
        id: '33333333-3333-4333-8333-333333333104',
        reference: 'LP-A-260815-104',
      },
      lastLocation: {
        address: 'Khu vực Quận 7',
        isStale: true,
        updatedAt: '2026-08-15T07:22:00.000Z',
      },
    },
  ];

  const mockOrders = [
    {
      id: '33333333-3333-4333-8333-333333333101',
      reference: 'LP-A-260815-101',
      status: 'ACCEPTED' as const,
      pickup: { label: 'Quận 1' },
      dropoff: { label: 'Thủ Đức' },
      customer: { name: 'Khách Hàng 1' },
      driver: { name: 'Tài xế 1' },
      totalPriceVnd: 420000,
      paymentStatus: 'UNPAID' as const,
      createdAt: '2026-08-15T07:30:00.000Z',
      updatedAt: '2026-08-15T07:30:00.000Z',
      tracking: {
        state: 'route' as const,
        statusLabel: 'Cập nhật lúc 14:30',
      },
    },
  ];

  const mockOrderDetail = {
    id: '33333333-3333-4333-8333-333333333101',
    reference: 'LP-A-260815-101',
    status: 'ACCEPTED' as const,
    customer: { name: 'Khách Hàng Lan', displayName: 'Khách Hàng Lan' },
    driver: { name: 'Tài xế An', displayName: 'Tài xế An' },
    cargoNote: 'Hàng đóng thùng',
    cargoWeightKg: 120,
    totalPriceVnd: 420000,
    paymentStatus: 'UNPAID' as const,
    pickup: { id: 'pickup-1', label: 'Kho Quận 7', address: 'Quận 7' },
    stops: [{ id: 'stop-1', label: 'Điểm dừng Quận 4' }],
    dropoff: { id: 'dropoff-1', label: 'Kho Thủ Đức', address: 'Thủ Đức' },
    eta: { label: 'ETA dự kiến · 18 phút', sourceLabel: 'Dữ liệu mô phỏng' },
    tracking: {
      state: 'stale' as const,
      isStale: true,
      statusLabel: 'Vị trí cũ — cập nhật lần cuối 14:22',
      lastUpdatedLabel: '14:22 · 15/08/2026',
    },
    history: [
      {
        id: 'h-1',
        status: 'REQUESTED' as const,
        label: 'Chờ tài xế',
        description: 'Đơn được tạo trong hệ thống.',
        timestampLabel: '13:30 · 15/08/2026',
        dateTime: '2026-08-15T06:30:00.000Z',
        isCurrent: false,
      },
      {
        id: 'h-2',
        status: 'ACCEPTED' as const,
        label: 'Đã nhận đơn',
        description: 'Tài xế đã nhận đơn.',
        timestampLabel: '14:30 · 15/08/2026',
        dateTime: '2026-08-15T07:30:00.000Z',
        isCurrent: true,
      },
    ],
    media: {
      state: 'success' as const,
      items: [
        {
          id: 'media-1',
          label: 'Ảnh kiện hàng',
          mediaType: 'JPEG',
          createdAt: '2026-08-15T07:10:00.000Z',
        },
      ],
    },
    payment: {
      id: '66666666-6666-4666-8666-666666666101',
      status: 'UNPAID' as const,
      amountLabel: '420.000 ₫',
      sourceLabel: 'Chưa có xác nhận',
      referenceLabel: 'PAY-A-101',
      expiresAtLabel: '15:00 · 15/08/2026',
    },
    audit: {
      state: 'success' as const,
      entries: [
        {
          id: 'audit-001',
          outcomeLabel: 'Thành công',
          actionLabel: 'Gán tài xế cho đơn',
          actorLabel: 'Admin Demo · ADMIN',
          targetLabel: 'LP-A-260815-101 · 33333333-3333-4333-8333-333333333101',
          reason: 'Điều phối theo yêu cầu vận hành.',
          timestampLabel: '13:35 · 15/08/2026',
          dateTime: '2026-08-15T06:35:00.000Z',
          requestId: 'req-admin-001',
          auditId: 'audit-demo-001',
        },
      ],
    },
    createdAt: '2026-08-15T06:30:00.000Z',
    updatedAt: '2026-08-15T07:30:00.000Z',
  };

  it('implements readOverview mapping real GET /admin/overview', async () => {
    const { client, getMock } = createMockClient();
    getMock.mockResolvedValueOnce(mockOverviewData);

    const adapter = createAdminHttpAdapter(client);
    const view = (await adapter.readOverview()) as AdminOverviewView;

    expect(getMock).toHaveBeenCalledWith('/admin/overview');
    expect(view.kind).toBe('overview');
    expect(view.state).toBe('ready');
    expect(view.metrics).toHaveLength(4);
    expect(view.orderDistribution).toHaveLength(6);
    expect(view.exceptions).toHaveLength(1);
    expect(view.recentOrders).toHaveLength(1);
    expect(Object.isFrozen(view)).toBe(true);
  });

  it('maps readiness failure and offline states in readOverview', async () => {
    const { client, getMock } = createMockClient();
    getMock.mockResolvedValueOnce({
      ...mockOverviewData,
      state: 'readiness-failed',
      health: {
        liveness: 'UP',
        readiness: 'FAILED',
        dependencyLabel: 'Dependency payment gặp sự cố',
        requestId: 'req-err-001',
      },
    });

    const adapter = createAdminHttpAdapter(client);
    const view = (await adapter.readOverview()) as AdminOverviewView;

    expect(view.state).toBe('readiness-failed');
    expect(view.scenarioId).toBe('ADM-OV-READINESS');
    expect(view.notice?.tone).toBe('danger');
    expect(view.notice?.requestId).toBe('req-err-001');
  });

  it('maps 401 and 403 errors to boundaries in readOverview', async () => {
    const { client, getMock } = createMockClient();
    getMock.mockRejectedValueOnce(new ApiError(401, 'UNAUTHORIZED', 'Session expired'));

    const adapter = createAdminHttpAdapter(client);
    const view401 = (await adapter.readOverview()) as AdminBoundaryView;

    expect(view401.kind).toBe('session-expired');
    expect(view401.scenarioId).toBe('ADM-EXPIRED');

    getMock.mockRejectedValueOnce(new ApiError(403, 'FORBIDDEN', 'Access denied'));
    const view403 = (await adapter.readOverview()) as AdminBoundaryView;

    expect(view403.kind).toBe('permission-denied');
    expect(view403.scenarioId).toBe('ADM-DENIED');
  });

  it('implements readOrders / readList(orders) with filter serialization and data mapping', async () => {
    const { client, getMock } = createMockClient();
    getMock.mockResolvedValueOnce({ items: mockOrders, total: 1, page: 1, pageSize: 20, totalPages: 1 });

    const adapter = createAdminHttpAdapter(client);
    const filters = parseAdminListFilters('orders', { status: 'ACCEPTED', sort: 'updated-desc' });
    const view = (await adapter.readOrders(filters)) as AdminListView;

    expect(getMock).toHaveBeenCalledWith(expect.stringContaining('/admin/orders?status=ACCEPTED&sort=updated-desc&page=1&pageSize=20'));
    expect(view.kind).toBe('list');
    expect(view.entity).toBe('orders');
    expect(view.state).toBe('success');
    expect(view.result.items).toHaveLength(1);
    expect(view.result.items[0]?.entity).toBe('order');
    expect((view.result.items[0] as AdminOrderListItemView).reference).toBe('LP-A-260815-101');
  });

  it('handles empty / no-results in readOrders', async () => {
    const { client, getMock } = createMockClient();
    getMock.mockResolvedValueOnce({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });

    const adapter = createAdminHttpAdapter(client);
    const filters = parseAdminListFilters('orders', { status: 'DELIVERED' });
    const view = (await adapter.readOrders(filters)) as AdminListView;

    expect(view.state).toBe('no-results');
    expect(view.scenarioId).toBe('ADM-ORD-NORESULT');
    expect(view.result.items).toEqual([]);
  });

  it('implements readUsers / readList(users) mapping available commands for ACTIVE and DISABLED users', async () => {
    const { client, getMock } = createMockClient();
    getMock.mockResolvedValueOnce({ items: mockUsers, total: 2, page: 1, pageSize: 20, totalPages: 1 });

    const adapter = createAdminHttpAdapter(client);
    const filters = parseAdminListFilters('users', {});
    const view = (await adapter.readUsers(filters)) as AdminListView;

    expect(getMock).toHaveBeenCalledWith(expect.stringContaining('/admin/users?'));
    expect(view.result.items).toHaveLength(2);

    const user1 = view.result.items[0] as AdminUserListItemView;
    expect(user1.status).toBe('ACTIVE');
    expect(user1.availableCommands[0]?.kind).toBe('DISABLE_USER');

    const user2 = view.result.items[1] as AdminUserListItemView;
    expect(user2.status).toBe('DISABLED');
    expect(user2.exceptionLabel).toBe('Tài khoản đã bị vô hiệu hóa');
    expect(user2.availableCommands[0]?.kind).toBe('ENABLE_USER');
  });

  it('implements readFleets / readList(fleets) mapping metrics and membership summaries', async () => {
    const { client, getMock } = createMockClient();
    getMock.mockResolvedValueOnce({ items: mockFleets, total: 1, page: 1, pageSize: 20, totalPages: 1 });

    const adapter = createAdminHttpAdapter(client);
    const filters = parseAdminListFilters('fleets', {});
    const view = (await adapter.readFleets(filters)) as AdminListView;

    expect(getMock).toHaveBeenCalledWith(expect.stringContaining('/admin/fleets?'));
    expect(view.result.items).toHaveLength(1);
    const fleet = view.result.items[0] as AdminFleetListItemView;
    expect(fleet.displayName).toBe('Đội xe Sao Mai');
    expect(fleet.driverCount).toBe(5);
  });

  it('implements readDrivers / readList(drivers) mapping active orders and location conditions', async () => {
    const { client, getMock } = createMockClient();
    getMock.mockResolvedValueOnce({ items: mockDrivers, total: 1, page: 1, pageSize: 20, totalPages: 1 });

    const adapter = createAdminHttpAdapter(client);
    const filters = parseAdminListFilters('drivers', { availability: 'BUSY' });
    const view = (await adapter.readDrivers(filters)) as AdminListView;

    expect(getMock).toHaveBeenCalledWith(expect.stringContaining('/admin/drivers?availability=BUSY'));
    expect(view.result.items).toHaveLength(1);
    const driver = view.result.items[0] as AdminDriverListItemView;
    expect(driver.availability).toBe('BUSY');
    expect(driver.activeOrder?.reference).toBe('LP-A-260815-104');
    expect(driver.locationCondition).toBe('stale');
  });

  it('implements readOrderDetail with full separation between StatusTimeline and AdminAuditRail', async () => {
    const { client, getMock } = createMockClient();
    getMock.mockResolvedValueOnce(mockOrderDetail);

    const adapter = createAdminHttpAdapter(client);
    const view = (await adapter.readOrderDetail('33333333-3333-4333-8333-333333333101')) as AdminOrderDetailView;

    expect(getMock).toHaveBeenCalledWith('/admin/orders/33333333-3333-4333-8333-333333333101');
    expect(view.kind).toBe('order-detail');
    expect(view.order.reference).toBe('LP-A-260815-101');
    expect(view.order.route.origin.label).toBe('Kho Quận 7');
    expect(view.order.route.stops).toHaveLength(1);
    expect(view.order.route.destination.label).toBe('Kho Thủ Đức');

    // Status timeline contains operational lifecycle transitions
    expect(view.order.history).toHaveLength(2);
    expect(view.order.history[0]?.label).toBe('Chờ tài xế');
    expect(view.order.history[1]?.label).toBe('Đã nhận đơn');

    // AdminAuditRail contains privileged admin operations
    expect(view.audit.state).toBe('success');
    expect(view.audit.entries).toHaveLength(1);
    expect(view.audit.entries[0]?.actionLabel).toBe('Gán tài xế cho đơn');
    expect(view.audit.entries[0]?.actorLabel).toBe('Admin Demo · ADMIN');
    expect(view.audit.entries[0]?.reason).toBe('Điều phối theo yêu cầu vận hành.');

    // Available commands on order detail
    expect(view.availableCommands).toHaveLength(2);
    expect(view.availableCommands.map((c) => c.kind)).toContain('CANCEL_ORDER');
    expect(view.availableCommands.map((c) => c.kind)).toContain('CONFIRM_MANUAL_PAYMENT');
  });

  it('rejects invalid order UUIDs in readOrderDetail without calling backend', async () => {
    const { client, getMock } = createMockClient();

    const adapter = createAdminHttpAdapter(client);
    const view = (await adapter.readOrderDetail('invalid-order-id')) as AdminBoundaryView;

    expect(getMock).not.toHaveBeenCalled();
    expect(view.kind).toBe('permission-denied');
    expect(view.title).toBe('Mã đơn không hợp lệ');
  });
});

describe('createAdminHttpAdapter - Audited Command Execution', () => {
  it('enforces note/reason length requirements (5 to 500 characters)', async () => {
    const { client, patchMock } = createMockClient();
    const adapter = createAdminHttpAdapter(client);

    await expect(
      adapter.executeAuditedCommand({
        kind: 'DISABLE_USER',
        targetId: '55555555-5555-4555-8555-555555555001',
        reason: 'abc', // < 5 chars
        contextVersion: 'user-v1',
      }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      statusCode: 422,
      code: 'VALIDATION_ERROR',
    });

    expect(patchMock).not.toHaveBeenCalled();
  });

  it('prevents admin self-disable', async () => {
    const { client, patchMock } = createMockClient();
    const adapter = createAdminHttpAdapter(client);

    const adminUserId = '55555555-5555-4555-8555-555555555099';

    await expect(
      adapter.executeAuditedCommand({
        kind: 'DISABLE_USER',
        targetId: adminUserId,
        currentAdminId: adminUserId,
        reason: 'Vô hiệu hóa tài khoản quản trị viên',
        contextVersion: 'user-v1',
      }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      statusCode: 400,
      code: 'SELF_DISABLE_PREVENTED',
    });

    expect(patchMock).not.toHaveBeenCalled();
  });

  it('executes DISABLE_USER via PATCH /admin/users/:id/status with audit logging payload', async () => {
    const { client, patchMock } = createMockClient();
    patchMock.mockResolvedValueOnce({
      data: {
        requestId: 'req-disable-001',
        auditId: 'audit-usr-001',
        persistedAt: '2026-08-15T07:35:00.000Z',
      },
    });

    const adapter = createAdminHttpAdapter(client);
    const result = await adapter.executeAuditedCommand({
      kind: 'DISABLE_USER',
      targetId: '55555555-5555-4555-8555-555555555001',
      currentAdminId: '55555555-5555-4555-8555-555555555099',
      reason: 'Vi phạm chính sách an toàn tài xế trong đợt pilot.',
      contextVersion: 'user-55555555-v12',
      clientRequestId: 'client-req-001',
    });

    expect(patchMock).toHaveBeenCalledWith(
      '/admin/users/55555555-5555-4555-8555-555555555001/status',
      {
        status: 'DISABLED',
        reason: 'Vi phạm chính sách an toàn tài xế trong đợt pilot.',
        contextVersion: 'user-55555555-v12',
        clientRequestId: 'client-req-001',
      },
    );

    expect(result).toEqual({
      state: 'success',
      requestId: 'req-disable-001',
      auditId: 'audit-usr-001',
      persistedAt: '2026-08-15T07:35:00.000Z',
    });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('executes CONFIRM_MANUAL_PAYMENT via POST /admin/payments/:id/confirm', async () => {
    const { client, postMock } = createMockClient();
    postMock.mockResolvedValueOnce({
      data: {
        requestId: 'req-pay-001',
        auditId: 'audit-pay-001',
        persistedAt: '2026-08-15T07:36:00.000Z',
      },
    });

    const adapter = createAdminHttpAdapter(client);
    const result = await adapter.executeAuditedCommand({
      kind: 'CONFIRM_MANUAL_PAYMENT',
      targetId: '66666666-6666-4666-8666-666666666101',
      reason: 'Đã nhận chuyển khoản qua VietQR sao kê mã ref PAY-101.',
      contextVersion: 'payment-v1',
      clientRequestId: 'client-req-pay-001',
    });

    expect(postMock).toHaveBeenCalledWith(
      '/admin/payments/66666666-6666-4666-8666-666666666101/confirm',
      {
        note: 'Đã nhận chuyển khoản qua VietQR sao kê mã ref PAY-101.',
        clientRequestId: 'client-req-pay-001',
      },
    );

    expect(result.state).toBe('success');
    expect(result.auditId).toBe('audit-pay-001');
  });

  it('executes CANCEL_ORDER via POST /orders/:id/cancel', async () => {
    const { client, postMock } = createMockClient();
    postMock.mockResolvedValueOnce({
      data: {
        requestId: 'req-cancel-001',
        auditId: 'audit-ord-001',
      },
    });

    const adapter = createAdminHttpAdapter(client);
    const result = await adapter.executeAuditedCommand({
      kind: 'CANCEL_ORDER',
      targetId: '33333333-3333-4333-8333-333333333101',
      reason: 'Khách hàng liên hệ hotline yêu cầu hủy do trùng đơn.',
      contextVersion: 'order-v1',
    });

    expect(postMock).toHaveBeenCalledWith(
      '/orders/33333333-3333-4333-8333-333333333101/cancel',
      expect.objectContaining({
        reason: 'Khách hàng liên hệ hotline yêu cầu hủy do trùng đơn.',
      }),
    );

    expect(result.state).toBe('success');
  });

  it('handles 409 conflict responses gracefully', async () => {
    const { client, patchMock } = createMockClient();
    patchMock.mockRejectedValueOnce(
      new ApiError(409, 'CONFLICT', 'Version mismatch', 'req-conflict-001'),
    );

    const adapter = createAdminHttpAdapter(client);
    const result = await adapter.executeAuditedCommand({
      kind: 'DISABLE_USER',
      targetId: '55555555-5555-4555-8555-555555555001',
      reason: 'Vô hiệu hóa tài khoản người dùng',
      contextVersion: 'user-stale-v1',
      clientRequestId: 'req-c-1',
    });

    expect(result.state).toBe('conflict');
    expect(result.auditId).toBeNull();
    expect(result.persistedAt).toBeNull();
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('provides subscribeToReadEvents with clean unsubscribe', () => {
    const { client } = createMockClient();
    const adapter = createAdminHttpAdapter(client);
    const sub = adapter.subscribeToReadEvents(() => {});
    expect(typeof sub.unsubscribe).toBe('function');
    expect(() => sub.unsubscribe()).not.toThrow();
  });
});

