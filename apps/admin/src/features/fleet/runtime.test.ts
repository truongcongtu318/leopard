import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// NOTE: the SWC-based transform in this repo does NOT hoist jest.mock calls,
// so this suite avoids static imports of anything under test. The mock fns are
// created up front, registered via jest.mock, and './runtime' is imported
// dynamically in beforeEach so it picks the mocked client from the registry.
jest.mock('server-only', () => ({}), { virtual: true });

const mockedApiGet = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock('../../lib/api/operations-server-client', () => ({
  operationsServerGet: (...args: unknown[]) => mockedApiGet(...args),
}));

import { ApiError } from '../../lib/api/api-error';
import type {
  FleetDriverFilters,
  FleetOrderFilters,
  FleetRouteView,
} from './model';

type RuntimeModule = typeof import('./runtime');
type LoadFleetRuntimeView = RuntimeModule['loadFleetRuntimeView'];

let loadFleetRuntimeView: LoadFleetRuntimeView;

const SCOPE = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  name: 'Đội xe Sao Mai',
  createdAt: '2026-01-01T00:00:00.000Z',
  driversCount: 2,
  activeOrdersCount: 1,
  todayRevenueVnd: 250000,
};

function defaultDriverFilters(): FleetDriverFilters {
  return { q: '', availability: 'ALL', sort: 'name-asc', page: 1, pageSize: 20 };
}

function defaultOrderFilters(): FleetOrderFilters {
  return {
    q: '',
    status: 'ALL',
    customer: '',
    driverId: '',
    from: '',
    to: '',
    sort: 'updated-desc',
    page: 1,
    pageSize: 20,
  };
}

beforeEach(async () => {
  mockedApiGet.mockReset();
  ({ loadFleetRuntimeView } = await import('./runtime'));
});

describe('loadFleetRuntimeView – scope', () => {
  it('maps a 403 on /fleet/profile to a permission-denied boundary', async () => {
    mockedApiGet.mockRejectedValue(new ApiError(403, 'FORBIDDEN', 'Không thuộc fleet'));

    const result = await loadFleetRuntimeView('dashboard');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe('permission-denied');
  });

  it('maps a 401 on /fleet/profile to a session-expired boundary', async () => {
    mockedApiGet.mockRejectedValue(new ApiError(401, 'UNAUTHORIZED', 'Token hết hạn'));

    const result = await loadFleetRuntimeView('dashboard');

    expect(result).toMatchObject({ ok: false, kind: 'session-expired' });
  });
});

describe('loadFleetRuntimeView – dashboard', () => {
  function setupDashboard() {
    mockedApiGet.mockImplementation(async (...args: unknown[]) => {
      const path = args[0] as string;
      if (path === '/fleet/profile') return SCOPE;
      if (path === '/fleet/orders') {
        return {
          items: [
            {
              id: '44444444-4444-4444-8444-444444444100',
              code: 'CAFEBE',
              status: 'IN_TRANSIT',
              driverName: '+849090001111',
              customerPhone: '+849070002222',
              pickupLabel: 'Kho Quận 7',
              dropoffLabel: 'Thủ Đức',
              paymentStatus: 'QR_CREATED',
              priceVnd: 150000,
              createdAt: '2026-08-01T01:00:00.000Z',
              // Fresh update → active + no stale attention item.
              updatedAt: new Date().toISOString(),
            },
          ],
          total: 1,
          page: 1,
          pageSize: 100,
          totalPages: 1,
        };
      }
      if (path === '/fleet/drivers') {
        return {
          items: [
            {
              id: 'dddddddd-1111-4111-8111-111111111111',
              phone: '+849090001111',
              status: 'ACTIVE',
              availability: 'AVAILABLE',
              lastKnownAt: new Date().toISOString(),
              membershipStatus: 'ACTIVE',
            },
            {
              id: 'dddddddd-2222-4222-8222-222222222222',
              phone: '+849090002222',
              status: 'ACTIVE',
              availability: 'OFFLINE',
              lastKnownAt: null,
              membershipStatus: 'ACTIVE',
            },
          ],
          total: 2,
          page: 1,
          pageSize: 100,
          totalPages: 1,
        };
      }
      throw new Error(`unexpected path ${path}`);
    });
  }

  it('builds metrics, availability summary and honest active orders', async () => {
    setupDashboard();

    const result = await loadFleetRuntimeView('dashboard');

    expect(result.ok).toBe(true);
    const view = (result as { ok: true; view: FleetRouteView }).view;
    expect(view.kind).toBe('dashboard');
    if (view.kind !== 'dashboard') return;
    expect(view.scope.displayName).toBe('Đội xe Sao Mai');
    expect(view.scope.readOnly).toBe(true);

    const metricById = new Map(view.metrics.map((metric) => [metric.id, metric.value]));
    expect(metricById.get('drivers')).toBe(2);
    expect(metricById.get('active-orders')).toBe(1);
    expect(metricById.get('today-revenue')).toBe(250000);

    expect(view.availabilitySummary).toContain('1 sẵn sàng');
    expect(view.availabilitySummary).toContain('1 ngoại tuyến');

    expect(view.activeOrders).toHaveLength(1);
    expect(view.activeOrders[0]).toMatchObject({
      reference: 'CAFEBE',
      status: 'IN_TRANSIT',
      driverLabel: '••• 1111',
    });

    // Fresh updates → no stale-tracking attention items.
    expect(view.attentionItems).toHaveLength(0);
  });

  it('flags stale live tracking on non-terminal orders as attention items', async () => {
    setupDashboard();
    // Rewrite the order payload with an old updatedAt.
    mockedApiGet.mockImplementation(async (...args: unknown[]) => {
      const path = args[0] as string;
      if (path === '/fleet/profile') return SCOPE;
      if (path === '/fleet/orders') {
        return {
          items: [
            {
              id: '44444444-4444-4444-8444-444444444100',
              code: 'CAFEBE',
              status: 'IN_TRANSIT',
              driverName: '+849090001111',
              customerPhone: '+849070002222',
              pickupLabel: 'Kho Quận 7',
              dropoffLabel: 'Thủ Đức',
              paymentStatus: 'QR_CREATED',
              priceVnd: 150000,
              createdAt: '2026-08-01T01:00:00.000Z',
              updatedAt: '2026-08-01T02:00:00.000Z',
            },
          ],
          total: 1,
          page: 1,
          pageSize: 100,
          totalPages: 1,
        };
      }
      return { items: [], total: 0, page: 1, pageSize: 100, totalPages: 0 };
    });

    const result = await loadFleetRuntimeView('dashboard');

    expect(result.ok).toBe(true);
    const view = (result as { ok: true; view: FleetRouteView }).view;
    if (view.kind !== 'dashboard') return;
    expect(view.attentionItems).toHaveLength(1);
    expect(view.attentionItems[0]?.severity).toBe('warning');
  });
});

describe('loadFleetRuntimeView – orders list', () => {
  it('passes filters through and maps rows with masked parties', async () => {
    let capturedQuery: Record<string, unknown> | undefined;
    mockedApiGet.mockImplementation(async (...args: unknown[]) => {
      const path = args[0] as string;
      capturedQuery = args[1] as Record<string, unknown> | undefined;
      if (path === '/fleet/profile') return SCOPE;
      return {
        items: [
          {
            id: '44444444-4444-4444-8444-444444444200',
            code: '',
            status: 'DELIVERED',
            driverName: '+849090001111',
            customerPhone: '+849070002222',
            pickupLabel: 'Kho Quận 7',
            dropoffLabel: 'Thủ Đức',
            paymentStatus: 'PAID_MANUAL',
            priceVnd: 90000,
            createdAt: '2026-08-01T01:00:00.000Z',
            updatedAt: '2026-08-01T05:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      };
    });

    const result = await loadFleetRuntimeView('orders', {
      orderFilters: { ...defaultOrderFilters(), status: 'DELIVERED' },
    });

    expect(capturedQuery).toMatchObject({ status: 'DELIVERED', page: 1 });
    expect(result.ok).toBe(true);
    const view = (result as { ok: true; view: FleetRouteView }).view;
    if (view.kind !== 'orders') return;
    const row = view.result.items[0];
    expect(row?.reference).not.toBe('');
    expect(row?.driverLabel).not.toContain('+849090001111');
    expect(row?.trackingFreshness).toBe('unavailable'); // terminal order
    expect(row?.paymentStatus).toBe('PAID_MANUAL');
  });
});

describe('loadFleetRuntimeView – order detail', () => {
  const ORDER_ID = '44444444-4444-4444-8444-444444444300';

  it('builds route spine, chronological history and labelled demo ETA', async () => {
    mockedApiGet.mockImplementation(async (...args: unknown[]) => {
      const path = args[0] as string;
      if (path === '/fleet/profile') return SCOPE;
      if (path === `/orders/${ORDER_ID}`) {
        return {
          id: ORDER_ID,
          status: 'IN_TRANSIT',
          providerSource: 'DEMO',
          etaSeconds: 600,
          priceVnd: 150000,
          updatedAt: new Date().toISOString(),
          customerPhone: '+849070002222',
          driverPhone: '+849090001111',
          stops: [
            { id: 's1', type: 'PICKUP', sequence: 1, address: 'Kho Quận 7' },
            { id: 's3', type: 'DROPOFF', sequence: 2, address: 'TP. Thủ Đức' },
          ],
          statusHistory: [
            {
              id: 'h2',
              toStatus: 'IN_TRANSIT',
              reason: null,
              createdAt: '2026-08-01T02:00:00.000Z',
            },
            {
              id: 'h1',
              toStatus: 'REQUESTED',
              reason: null,
              createdAt: '2026-08-01T00:30:00.000Z',
            },
          ],
        };
      }
      if (path === `/orders/${ORDER_ID}/payments`) {
        return [
          {
            id: 'pay-9',
            orderId: ORDER_ID,
            status: 'QR_CREATED',
            amountVnd: 150000,
            provider: 'PAYOS',
          },
        ];
      }
      throw new Error(`unexpected path ${path}`);
    });

    const result = await loadFleetRuntimeView('order-detail', { orderId: ORDER_ID });

    expect(result.ok).toBe(true);
    const view = (result as { ok: true; view: FleetRouteView }).view;
    if (view.kind !== 'order-detail') return;
    expect(view.order.route.origin.label).toBe('Kho Quận 7');
    expect(view.order.route.destination.label).toBe('TP. Thủ Đức');
    expect(view.order.history[0]?.label).toBe('Chờ tài xế');
    expect(view.order.history.at(-1)?.isCurrent).toBe(true);
    expect(view.order.eta.sourceLabel).toBe('Dữ liệu mô phỏng');
    expect(view.order.payment.status).toBe('QR_CREATED');
    expect(view.order.tracking.state).toBe('route');
  });

  it('fails closed for an invalid order id before any screen renders data', async () => {
    const result = await loadFleetRuntimeView('order-detail', { orderId: null });

    expect(result).toMatchObject({ ok: false, kind: 'error' });
  });
});
