import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { render, waitFor } from '@testing-library/react-native';

import { DriverPreviewRoute } from './DriverPreviewRoute';
import type { DriverPreviewRouteProps } from './DriverPreviewRoute';
import { createDriverDetailFixture } from '../fixtures';
import { createDriverPreviewView } from './catalogue';

const previousFlag = process.env.EXPO_PUBLIC_LEOPARD_UI_PREVIEW;

afterEach(() => {
  if (previousFlag === undefined) delete process.env.EXPO_PUBLIC_LEOPARD_UI_PREVIEW;
  else process.env.EXPO_PUBLIC_LEOPARD_UI_PREVIEW = previousFlag;
});

describe('DriverPreviewRoute', () => {
  it('does not load Driver fixtures when either preview opt-in is missing', async () => {
    delete process.env.EXPO_PUBLIC_LEOPARD_UI_PREVIEW;
    const loadCatalogue = jest.fn(async () => ({ createDriverPreviewView }));
    const screen = await render(
      <DriverPreviewRoute
        loadCatalogue={loadCatalogue}
        localPreviewEnabled
        scenario={null}
        screen="list"
      />,
    );
    await waitFor(() => expect(screen.getByText('Chưa kết nối nguồn dữ liệu')).toBeTruthy());
    expect(loadCatalogue).not.toHaveBeenCalled();
    expect(screen.queryByText('Kho riêng tư mô phỏng tại Quận 7')).toBeNull();
    await screen.unmount();
  });

  it('renders the action-first fixture behind the guarded composition banner', async () => {
    process.env.EXPO_PUBLIC_LEOPARD_UI_PREVIEW = 'enabled';
    const loadCatalogue = jest.fn(async () => ({ createDriverPreviewView }));
    const screen = await render(
      <DriverPreviewRoute
        loadCatalogue={loadCatalogue}
        localPreviewEnabled
        scenario="D-DETAIL-PROOF-REQUIRED"
        screen="detail"
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('Cần ảnh xác nhận trước khi hoàn tất')).toBeTruthy();
    });
    expect(screen.getByLabelText('Bản xem trước giao diện — dữ liệu mô phỏng')).toBeTruthy();
    expect(loadCatalogue).toHaveBeenCalledTimes(1);
    await screen.unmount();
  });

  it('shows a privacy-safe error for an invalid scenario', async () => {
    process.env.EXPO_PUBLIC_LEOPARD_UI_PREVIEW = 'enabled';
    const loadCatalogue = jest.fn(async () => ({ createDriverPreviewView }));
    const screen = await render(
      <DriverPreviewRoute
        loadCatalogue={loadCatalogue}
        localPreviewEnabled
        scenario="D-LIST-REQUESTED"
        screen="detail"
      />,
    );
    await waitFor(() => expect(screen.getByText('Không thể mở scenario')).toBeTruthy());
    expect(screen.queryByText('Kho riêng tư mô phỏng tại Quận 7')).toBeNull();
    await screen.unmount();
  });

  it('fails closed when a detail catalogue returns a fixture for another order ID', async () => {
    process.env.EXPO_PUBLIC_LEOPARD_UI_PREVIEW = 'enabled';
    const routeOrderId = '22222222-2222-4222-8222-222222222099';
    const loadCatalogue = jest.fn(async () => ({
      createDriverPreviewView: () => createDriverDetailFixture('D-DETAIL-PROOF-REQUIRED'),
    }));
    const props = {
      loadCatalogue,
      localPreviewEnabled: true,
      orderId: routeOrderId,
      scenario: 'D-DETAIL-PROOF-REQUIRED',
      screen: 'detail',
    } as DriverPreviewRouteProps;

    const screen = await render(<DriverPreviewRoute {...props} />);

    await waitFor(() => {
      expect(screen.getByText('Không thể mở scenario')).toBeTruthy();
    });
    expect(screen.queryByText('Kho riêng tư mô phỏng tại Quận 7')).toBeNull();
    expect(loadCatalogue).toHaveBeenCalledTimes(1);
    await screen.unmount();
  });
});
