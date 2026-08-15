import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

import { PREVIEW_BANNER_TEXT, WEB_PREVIEW_ENABLED_FLAG } from '../../preview';
import { AdminPreviewRoute, type AdminPreviewCatalogueLoader } from './AdminPreviewRoute';
import { createAdminPreviewView } from './fixtures';

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

describe('Admin guarded preview route', () => {
  it('lazy-loads Admin fixtures only after both preview flags pass', async () => {
    const loadCatalogue = jest.fn(async () => ({ createAdminPreviewView }));

    render(
      await AdminPreviewRoute({
        localFlag: WEB_PREVIEW_ENABLED_FLAG,
        scenario: 'ADM-OV-READY',
        screen: 'overview',
        loadCatalogue,
      }),
    );

    expect(loadCatalogue).toHaveBeenCalledTimes(1);
    expect(screen.getByText(PREVIEW_BANNER_TEXT)).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Tổng quan vận hành' })).toBeTruthy();
  });

  it('never imports the Admin fixture catalogue in production', async () => {
    setEnvironment('NODE_ENV', 'production');
    const loadCatalogue = jest.fn<AdminPreviewCatalogueLoader>();

    render(
      await AdminPreviewRoute({
        localFlag: WEB_PREVIEW_ENABLED_FLAG,
        scenario: 'ADM-OV-READY',
        screen: 'overview',
        loadCatalogue,
      }),
    );

    expect(loadCatalogue).not.toHaveBeenCalled();
    expect(screen.queryByText(PREVIEW_BANNER_TEXT)).toBeNull();
    expect(screen.getByText('Chưa kết nối nguồn dữ liệu')).toBeTruthy();
  });

  it('fails closed for an invalid Order detail ID before loading fixtures', async () => {
    const loadCatalogue = jest.fn<AdminPreviewCatalogueLoader>();
    render(
      await AdminPreviewRoute({
        localFlag: WEB_PREVIEW_ENABLED_FLAG,
        orderId: null,
        scenario: 'ADM-ORD-DETAIL',
        screen: 'order-detail',
        loadCatalogue,
      }),
    );
    expect(loadCatalogue).not.toHaveBeenCalled();
    expect(screen.getByText('Mã đơn không hợp lệ')).toBeTruthy();
    expect(screen.queryByText(/LP-A-/)).toBeNull();
  });

  it('maps an unsupported scenario to a safe generic preview error', async () => {
    render(
      await AdminPreviewRoute({
        localFlag: WEB_PREVIEW_ENABLED_FLAG,
        scenario: 'PRIVATE-RAW-VALUE',
        screen: 'orders',
      }),
    );
    expect(screen.getByText(PREVIEW_BANNER_TEXT)).toBeTruthy();
    expect(screen.getByText('Không thể mở scenario Admin')).toBeTruthy();
    expect(screen.queryByText('PRIVATE-RAW-VALUE')).toBeNull();
  });

  it('projects validated categorical URL state without putting raw search in the form URL', async () => {
    render(
      await AdminPreviewRoute({
        filters: {
          status: 'IN_TRANSIT',
          role: 'ALL',
          userStatus: 'ALL',
          availability: 'ALL',
          membershipStatus: 'ALL',
          fleetId: '',
          customerId: '',
          driverId: '',
          from: '2026-08-01',
          to: '2026-08-15',
          sort: 'updated-asc',
          page: 2,
          pageSize: 50,
        },
        localFlag: WEB_PREVIEW_ENABLED_FLAG,
        scenario: 'ADM-ORD-DENSE',
        screen: 'orders',
      }),
    );
    expect((screen.getByLabelText('Trạng thái') as HTMLSelectElement).value).toBe('IN_TRANSIT');
    expect(screen.getByText('Trang 2 / 2')).toBeTruthy();
    expect(screen.getByRole('searchbox').getAttribute('name')).toBeNull();
  });

  it('renders the persisted command scenario through an allow-listed command kind', async () => {
    render(
      await AdminPreviewRoute({
        commandKind: 'CONFIRM_MANUAL_PAYMENT',
        localFlag: WEB_PREVIEW_ENABLED_FLAG,
        orderId: '33333333-3333-4333-8333-333333333101',
        scenario: 'ADM-CMD-SUCCESS',
        screen: 'order-detail',
      }),
    );
    expect(screen.getByText('req-admin-demo-009')).toBeTruthy();
    expect(screen.getAllByText('Đã xác nhận thanh toán').length).toBeGreaterThan(0);
  });
});
