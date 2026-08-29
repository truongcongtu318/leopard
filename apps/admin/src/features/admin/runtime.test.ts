import { describe, expect, it, jest, beforeEach } from '@jest/globals';

// NOTE: the SWC-based transform in this repo does NOT hoist jest.mock calls,
// so this suite avoids static imports of anything under test. The mock fns are
// created up front, registered via jest.mock, and './runtime' is imported
// dynamically in beforeEach so it picks the mocked client from the registry.
jest.mock('server-only', () => ({}), { virtual: true });

const mockedApiGet = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockedPublicGet = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock('../../lib/api/operations-server-client', () => ({
  operationsServerGet: (...args: unknown[]) => mockedApiGet(...args),
  publicServerGet: (...args: unknown[]) => mockedPublicGet(...args),
}));

import { ApiError } from '../../lib/api/api-error';
import type { AdminListFilters } from './model';

type RuntimeModule = typeof import('./runtime');
type LoadAdminRuntimeView = RuntimeModule['loadAdminRuntimeView'];

let loadAdminRuntimeView: LoadAdminRuntimeView;

async function run(
  ...args: Parameters<LoadAdminRuntimeView>
): Promise<ReturnType<LoadAdminRuntimeView>> {
  return loadAdminRuntimeView(...args);
}

const DEFAULT_FILTERS: AdminListFilters = {
  status: 'ALL',
  role: 'ALL',
  userStatus: 'ALL',
  availability: 'ALL',
  membershipStatus: 'ALL',
  fleetId: '',
  customerId: '',
  driverId: '',
  from: '',
  to: '',
  sort: 'updated-desc',
  page: 1,
  pageSize: 20,
};

function emptyPage<T>(items: T[]) {
  return { items, total: items.length, page: 1, pageSize: 20, totalPages: 1 };
}

beforeEach(async () => {
  mockedApiGet.mockReset();
  mockedPublicGet.mockReset();
  ({ loadAdminRuntimeView } = await import('./runtime'));
});

describe('loadAdminRuntimeView – overview', () => {
  it('maps the admin dashboard, health probes and per-status totals into an overview view', async () => {
    mockedApiGet.mockImplementation(async (...args: unknown[]) => {
      const path = args[0] as string;
      const query = args[1] as Record<string, unknown> | undefined;
      if (path === '/admin/dashboard') {
        return { totalUsers: 100, totalOrders: 42, activeFleets: 6, revenueVnd: 1250000 };
      }
      const statusTotals: Record<string, number> = {
        REQUESTED: 4,
        ACCEPTED: 5,
        PICKING_UP: 4,
        IN_TRANSIT: 5,
        DELIVERED: 18,
        CANCELLED: 3,
      };
      if (query && typeof query.status === 'string') {
        return {
          items: [],
          total: statusTotals[query.status] ?? 0,
          page: 1,
          pageSize: 1,
          totalPages: 1,
        };
      }
      return emptyPage([
        {
          id: '33333333-3333-4333-8333-333333333101',
          code: 'ABCDEF',
          status: 'IN_TRANSIT',
          driverName: '+849090001111',
          customerPhone: '+849070002222',
          pickupLabel: 'Kho Quận 7',
          dropoffLabel: 'Thủ Đức',
          paymentStatus: 'QR_CREATED',
          priceVnd: 150000,
          createdAt: '2026-08-01T01:00:00.000Z',
          updatedAt: new Date().toISOString(),
        },
      ]);
    });
    mockedPublicGet.mockImplementation(async (...args: unknown[]) => {
      const path = args[0] as string;
      if (path === '/health/live') return { ok: true, status: 200, body: { status: 'ok' } };
      return { ok: true, status: 200, body: { status: 'ready', database: 'connected' } };
    });

    const view = await run('overview');

    expect(view.kind).toBe('overview');
    if (view.kind !== 'overview') return;
    expect(view.state).toBe('ready');
    expect(view.health.readiness).toBe('READY');

    const activeOrdersMetric = view.metrics.find((metric) => metric.id === 'active-orders');
    expect(activeOrdersMetric?.value).toBe(18); // 4+5+4+5 non-terminal

    expect(view.orderDistribution).toHaveLength(6);
    expect(view.orderDistribution.find((entry) => entry.status === 'DELIVERED')?.count).toBe(18);

    expect(view.recentOrders).toHaveLength(1);
    expect(view.recentOrders[0]).toMatchObject({
      reference: 'ABCDEF',
      status: 'IN_TRANSIT',
      paymentStatus: 'QR_CREATED',
      href: '/admin/orders/33333333-3333-4333-8333-333333333101',
    });
    expect(view.exceptions).toHaveLength(0);
  });

  it('reports offline with a danger exception when the liveness probe fails', async () => {
    mockedApiGet.mockImplementation(async (...args: unknown[]) => {
      const path = args[0] as string;
      const query = args[1] as Record<string, unknown> | undefined;
      if (path === '/admin/dashboard') {
        return { totalUsers: 1, totalOrders: 0, activeFleets: 0, revenueVnd: 0 };
      }
      if (query && typeof query.status === 'string') {
        return { items: [], total: 0, page: 1, pageSize: 1, totalPages: 0 };
      }
      return emptyPage([]);
    });
    mockedPublicGet.mockImplementation(async (...args: unknown[]) => {
      const path = args[0] as string;
      if (path === '/health/live') return { ok: false, status: 0, body: null };
      return { ok: false, status: 503, body: null };
    });

    const view = await run('overview');

    expect(view.kind).toBe('overview');
    if (view.kind !== 'overview') return;
    expect(view.state).toBe('offline');
    expect(view.health.readiness).toBe('FAILED');
    expect(view.exceptions[0]?.tone).toBe('danger');
  });
});

describe('loadAdminRuntimeView – users list', () => {
  it('masks phones and attaches a disable command for ACTIVE accounts', async () => {
    let capturedQuery: Record<string, unknown> | undefined;
    mockedApiGet.mockImplementation(async (...args: unknown[]) => {
      const path = args[0] as string;
      const query = args[1] as Record<string, unknown> | undefined;
      capturedQuery = query;
      return emptyPage([
        {
          id: '55555555-5555-4555-8555-555555555001',
          phone: '+8490123456789',
          role: 'DRIVER',
          status: 'ACTIVE',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ]);
    });

    const view = await run('users', { filters: DEFAULT_FILTERS });

    expect(capturedQuery).toMatchObject({ page: 1, pageSize: 20 });
    expect(view.kind).toBe('list');
    if (view.kind !== 'list') return;
    const row = view.result.items[0];
    expect(row?.entity).toBe('user');
    if (row?.entity !== 'user') return;
    expect(row.maskedPhone).not.toContain('+8490123456789');
    expect(row.maskedPhone.endsWith('6789')).toBe(true);
    expect(row.availableCommands[0]?.kind).toBe('DISABLE_USER');
    expect(row.availableCommands[0]?.isIrreversible).toBe(false);
  });

  it('maps a 403 from the API to a permission-denied boundary', async () => {
    mockedApiGet.mockRejectedValue(
      new ApiError(403, 'FORBIDDEN', 'Không có quyền truy cập'),
    );

    const view = await run('users', { filters: DEFAULT_FILTERS });

    expect(view).toMatchObject({ kind: 'permission-denied' });
  });

  it('passes role and account-status filters through to the API query', async () => {
    let capturedQuery: Record<string, unknown> | undefined;
    mockedApiGet.mockImplementation(async (...args: unknown[]) => {
      const path = args[0] as string;
      const query = args[1] as Record<string, unknown> | undefined;
      capturedQuery = query;
      return emptyPage([]);
    });

    await run('users', {
      filters: { ...DEFAULT_FILTERS, role: 'DRIVER', userStatus: 'DISABLED' },
    });

    expect(capturedQuery).toMatchObject({ role: 'DRIVER', status: 'DISABLED' });
  });
});

describe('loadAdminRuntimeView – orders list', () => {
  it('joins route labels, masks parties and marks stale tracking honestly', async () => {
    let capturedPath: string | undefined;
    mockedApiGet.mockImplementation(async (...args: unknown[]) => {
      const path = args[0] as string;
      capturedPath = String(path);
      return emptyPage([
        {
          id: '44444444-4444-4444-8444-444444444100',
          code: '',
          status: 'ACCEPTED',
          driverName: '+849090001111',
          customerPhone: '+849070002222',
          pickupLabel: 'Kho Quận 7',
          dropoffLabel: 'Thủ Đức',
          paymentStatus: 'PAID_MANUAL',
          priceVnd: 90000,
          createdAt: '2026-07-31T23:00:00.000Z',
          updatedAt: '2026-07-31T23:10:00.000Z',
        },
      ]);
    });

    const view = await run('orders', { filters: DEFAULT_FILTERS });

    expect(capturedPath).toBe('/admin/orders');
    expect(view.kind).toBe('list');
    if (view.kind !== 'list') return;
    const row = view.result.items[0];
    if (row?.entity !== 'order') return;
    expect(row.reference).not.toBe('');
    expect(row.routeLabel).toBe('Kho Quận 7 → Thủ Đức');
    expect(row.driverLabel).not.toContain('+849090001111');
    expect(row.customerLabel).not.toContain('+849070002222');
    expect(row.trackingTone).toBe('warning'); // updated long ago relative to now
    expect(row.paymentStatus).toBe('PAID_MANUAL');
  });
});

describe('loadAdminRuntimeView – order detail', () => {
  const ORDER_ID = '33333333-3333-4333-8333-333333333101';

  function setupDetail(overrides: Partial<Record<string, unknown>> = {}) {
    mockedApiGet.mockImplementation(async (...args: unknown[]) => {
      const path = args[0] as string;
      if (path === `/orders/${ORDER_ID}`) {
        return {
          id: ORDER_ID,
          customerId: '22222222-2222-4222-8222-222222222201',
          driverId: null,
          status: 'IN_TRANSIT',
          providerSource: 'DEMO',
          priceVnd: 150000,
          etaSeconds: 1200,
          createdAt: '2026-08-01T01:00:00.000Z',
          updatedAt: new Date().toISOString(),
          customerPhone: '+849070002222',
          driverPhone: null,
          stops: [
            { id: 's1', type: 'PICKUP', sequence: 1, address: 'Kho Quận 7' },
            { id: 's2', type: 'STOP', sequence: 2, address: 'Ngã tư Ba Tháng Hai' },
            { id: 's3', type: 'DROPOFF', sequence: 3, address: 'TP. Thủ Đức' },
          ],
          statusHistory: [
            {
              id: 'h2',
              fromStatus: null,
              toStatus: 'IN_TRANSIT',
              reason: null,
              createdAt: '2026-08-01T02:00:00.000Z',
            },
            {
              id: 'h1',
              fromStatus: null,
              toStatus: 'REQUESTED',
              reason: null,
              createdAt: '2026-08-01T00:30:00.000Z',
            },
          ],
          ...overrides,
        };
      }
      if (path === `/orders/${ORDER_ID}/payments`) {
        return [
          {
            id: 'pay-1',
            orderId: ORDER_ID,
            status: 'UNPAID',
            amountVnd: 150000,
            provider: 'PAYOS',
            providerReference: 'PR-0001',
            expiresAt: null,
          },
        ];
      }
      throw new Error(`unexpected path ${path}`);
    });
  }

  it('builds route spine points, chronological history and labelled ETA', async () => {
    setupDetail();

    const view = await run('order-detail', { orderId: ORDER_ID });

    expect(view.kind).toBe('order-detail');
    if (view.kind !== 'order-detail') return;
    expect(view.order.reference).not.toBe(ORDER_ID);
    expect(view.order.route.origin.label).toBe('Kho Quận 7');
    expect(view.order.route.stops[0]?.label).toBe('Ngã tư Ba Tháng Hai');
    expect(view.order.route.destination.label).toBe('TP. Thủ Đức');

    // History must be chronological with the latest entry marked current.
    expect(view.order.history[0]?.label).toBe('Chờ tài xế');
    expect(view.order.history.at(-1)?.isCurrent).toBe(true);
    expect(view.order.history.at(-1)?.label).toBe('Đang vận chuyển');

    // DEMO provider source must be explicitly labelled as simulated data.
    expect(view.order.eta.sourceLabel).toBe('Dữ liệu mô phỏng');
    expect(view.order.eta.label).toContain('ETA dự kiến');

    // Driver missing → honest copy instead of a fake assignment.
    expect(view.order.driverLabel).toBe('Chưa có tài xế');
  });

  it('offers cancel and manual-payment commands based on real lifecycle state', async () => {
    setupDetail();

    const view = await run('order-detail', { orderId: ORDER_ID });

    if (view.kind !== 'order-detail') throw new Error('expected order-detail view');
    const kinds = view.availableCommands.map((command) => command.kind);
    expect(kinds).toContain('CANCEL_ORDER');
    expect(kinds).toContain('CONFIRM_MANUAL_PAYMENT');

    const cancelCommand = view.availableCommands.find(
      (command) => command.kind === 'CANCEL_ORDER',
    );
    expect(cancelCommand?.targetId).toBe(ORDER_ID);
    expect(cancelCommand?.isIrreversible).toBe(true);
    const confirmCommand = view.availableCommands.find(
      (command) => command.kind === 'CONFIRM_MANUAL_PAYMENT',
    );
    expect(confirmCommand?.targetId).toBe('pay-1');
  });

  it('returns a session-expired boundary when the API answers 401', async () => {
    mockedApiGet.mockRejectedValue(new ApiError(401, 'UNAUTHORIZED', 'Token hết hạn'));

    const view = await run('order-detail', { orderId: ORDER_ID });

    expect(view).toMatchObject({ kind: 'session-expired' });
  });
});
