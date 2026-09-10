import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

import { PREVIEW_BANNER_TEXT, WEB_PREVIEW_ENABLED_FLAG } from '../../preview';
import { FleetPreviewRoute, type FleetPreviewCatalogueLoader } from './FleetPreviewRoute';
import { createFleetPreviewView } from './fixtures';

const originalNodeEnv = process.env.NODE_ENV;
const originalServerFlag = process.env.LEOPARD_UI_PREVIEW;

function setEnvironment(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

beforeEach(() => {
  setEnvironment('NODE_ENV', 'test');
  setEnvironment('LEOPARD_UI_PREVIEW', WEB_PREVIEW_ENABLED_FLAG);
});

afterEach(() => {
  setEnvironment('NODE_ENV', originalNodeEnv);
  setEnvironment('LEOPARD_UI_PREVIEW', originalServerFlag);
});

describe('Fleet guarded preview route', () => {
  it('lazy-loads fixtures only after both preview flags pass', async () => {
    const loadCatalogue = jest.fn(async () => ({ createFleetPreviewView }));

    render(
      await FleetPreviewRoute({
        localFlag: WEB_PREVIEW_ENABLED_FLAG,
        scenario: 'fleet-overview-success',
        screen: 'dashboard',
        loadCatalogue,
      }),
    );

    expect(loadCatalogue).toHaveBeenCalledTimes(1);
    expect(screen.getByText(PREVIEW_BANNER_TEXT)).toBeTruthy();
    expect(screen.getByLabelText('Phạm vi truy cập đội xe')).toBeTruthy();
  });

  it('never imports the fixture catalogue on the runtime path', async () => {
    setEnvironment('NODE_ENV', 'production');
    const loadCatalogue = jest.fn<FleetPreviewCatalogueLoader>();

    render(
      await FleetPreviewRoute({
        localFlag: WEB_PREVIEW_ENABLED_FLAG,
        scenario: 'fleet-overview-success',
        screen: 'dashboard',
        loadCatalogue,
      }),
    );

    expect(loadCatalogue).not.toHaveBeenCalled();
    expect(screen.queryByText(PREVIEW_BANNER_TEXT)).toBeNull();
    // Runtime path is live: without a valid fleet session the API layer fails
    // closed into a boundary state instead of rendering fixtures.
    expect(
      screen.getByText(/Không thể tải dữ liệu|Phiên đã hết hạn|Bạn không có quyền/),
    ).toBeTruthy();
  });

  it('fails closed for an invalid detail route before loading fixtures', async () => {
    const loadCatalogue = jest.fn<FleetPreviewCatalogueLoader>();

    render(
      await FleetPreviewRoute({
        localFlag: WEB_PREVIEW_ENABLED_FLAG,
        orderId: null,
        scenario: 'fleet-order-detail-success',
        screen: 'order-detail',
        loadCatalogue,
      }),
    );

    expect(loadCatalogue).not.toHaveBeenCalled();
    expect(screen.getByText('Mã đơn không hợp lệ')).toBeTruthy();
    expect(screen.queryByText(/Sao Mai/)).toBeNull();
  });

  it('converts an unsupported scenario into a safe preview error', async () => {
    const loadCatalogue = jest.fn(async () => ({ createFleetPreviewView }));

    render(
      await FleetPreviewRoute({
        localFlag: WEB_PREVIEW_ENABLED_FLAG,
        scenario: 'unknown-private-value',
        screen: 'orders',
        loadCatalogue,
      }),
    );

    expect(screen.getByText(PREVIEW_BANNER_TEXT)).toBeTruthy();
    expect(screen.getByText('Không thể mở scenario Fleet')).toBeTruthy();
    expect(screen.queryByText('unknown-private-value')).toBeNull();
  });

  it('projects validated URL filter state without mutating the source fixture', async () => {
    render(
      await FleetPreviewRoute({
        driverFilters: {
          q: 'An',
          availability: 'BUSY',
          sort: 'location-updated',
          page: 2,
          pageSize: 50,
        },
        localFlag: WEB_PREVIEW_ENABLED_FLAG,
        scenario: 'fleet-drivers-mixed',
        screen: 'drivers',
      }),
    );
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('An');
    expect(screen.getByText('Trang 2 / 2')).toBeTruthy();
  });

  it('renders the Orders and detail compositions through the same guard', async () => {
    const orderView = await FleetPreviewRoute({
      localFlag: WEB_PREVIEW_ENABLED_FLAG,
      orderFilters: {
        q: 'LP-F',
        status: 'IN_TRANSIT',
        customer: '',
        driverId: '',
        from: '',
        to: '',
        sort: 'updated-asc',
        page: 1,
        pageSize: 20,
      },
      scenario: 'fleet-orders-mixed',
      screen: 'orders',
    });
    const { unmount } = render(orderView);
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('LP-F');
    unmount();

    render(
      await FleetPreviewRoute({
        localFlag: WEB_PREVIEW_ENABLED_FLAG,
        orderId: '33333333-3333-4333-8333-333333333001',
        scenario: 'fleet-order-detail-success',
        screen: 'order-detail',
      }),
    );
    expect(screen.getByRole('heading', { name: 'Đơn LP-F-260815-001' })).toBeTruthy();
  });

  it('binds preview detail data to the validated route order ID', async () => {
    render(
      await FleetPreviewRoute({
        localFlag: WEB_PREVIEW_ENABLED_FLAG,
        orderId: '33333333-3333-4333-8333-333333333002',
        scenario: 'fleet-order-detail-success',
        screen: 'order-detail',
      }),
    );

    expect(screen.getByRole('heading', { name: 'Đơn LP-F-260815-002' })).toBeTruthy();
    expect(screen.getAllByText('Tài xế Bình Mô Phỏng').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Điểm giao mô phỏng Quận 3').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Tài xế An Mô Phỏng được phân công/)).toBeNull();
    expect(screen.queryByText('LP-F-260815-001')).toBeNull();
  });

  it('fails closed when a valid UUID is outside the Fleet preview scope', async () => {
    render(
      await FleetPreviewRoute({
        localFlag: WEB_PREVIEW_ENABLED_FLAG,
        orderId: '33333333-3333-4333-8333-333333333099',
        scenario: 'fleet-order-detail-success',
        screen: 'order-detail',
      }),
    );

    expect(screen.getByText('Bạn không có quyền xem đơn này')).toBeTruthy();
    expect(screen.queryByText(/LP-F-260815-/)).toBeNull();
  });
});
