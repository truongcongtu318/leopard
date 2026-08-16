import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { render, waitFor } from '@testing-library/react-native';

import { CustomerPreviewRoute } from './CustomerPreviewRoute';
import type { CustomerPreviewRouteProps } from './CustomerPreviewRoute';
import { createCustomerDetailFixture } from '../fixtures';
import { createCustomerPreviewView } from './catalogue';

const previousFlag = process.env.EXPO_PUBLIC_LEOPARD_UI_PREVIEW;

afterEach(() => {
  if (previousFlag === undefined) delete process.env.EXPO_PUBLIC_LEOPARD_UI_PREVIEW;
  else process.env.EXPO_PUBLIC_LEOPARD_UI_PREVIEW = previousFlag;
});

describe('CustomerPreviewRoute', () => {
  it('fails closed to the runtime seam when the build flag is absent', async () => {
    delete process.env.EXPO_PUBLIC_LEOPARD_UI_PREVIEW;
    const loadCatalogue = jest.fn(async () => ({ createCustomerPreviewView }));
    const screen = await render(
      <CustomerPreviewRoute
        loadCatalogue={loadCatalogue}
        localPreviewEnabled
        scenario={null}
        screen="list"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Chưa kết nối nguồn dữ liệu')).toBeTruthy();
    });
    expect(screen.queryByText(/Bản xem trước giao diện/)).toBeNull();
    expect(screen.queryByText('Kho mô phỏng Quận 7, Thành phố Hồ Chí Minh')).toBeNull();
    expect(loadCatalogue).not.toHaveBeenCalled();
    await screen.unmount();
  });

  it('loads the role catalogue lazily behind both preview opt-ins', async () => {
    process.env.EXPO_PUBLIC_LEOPARD_UI_PREVIEW = 'enabled';
    const loadCatalogue = jest.fn(async () => ({ createCustomerPreviewView }));
    const screen = await render(
      <CustomerPreviewRoute
        loadCatalogue={loadCatalogue}
        localPreviewEnabled
        scenario="C-LIST-SUCCESS"
        screen="list"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Đơn LP-260815-001')).toBeTruthy();
    });
    expect(screen.getByLabelText('Bản xem trước giao diện — dữ liệu mô phỏng')).toBeTruthy();
    expect(loadCatalogue).toHaveBeenCalledTimes(1);
    await screen.unmount();
  });

  it('keeps the preview banner and shows a safe error for an invalid scenario', async () => {
    process.env.EXPO_PUBLIC_LEOPARD_UI_PREVIEW = 'enabled';
    const loadCatalogue = jest.fn(async () => ({ createCustomerPreviewView }));
    const screen = await render(
      <CustomerPreviewRoute
        loadCatalogue={loadCatalogue}
        localPreviewEnabled
        scenario="C-DETAIL-SUCCESS"
        screen="list"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Không thể mở scenario')).toBeTruthy();
    });
    expect(screen.getByText(/Bản xem trước giao diện/)).toBeTruthy();
    expect(screen.queryByText('Kho mô phỏng Quận 7, Thành phố Hồ Chí Minh')).toBeNull();
    await screen.unmount();
  });

  it('fails closed when a detail catalogue returns a fixture for another order ID', async () => {
    process.env.EXPO_PUBLIC_LEOPARD_UI_PREVIEW = 'enabled';
    const routeOrderId = '11111111-1111-4111-8111-111111111099';
    const loadCatalogue = jest.fn(async () => ({
      createCustomerPreviewView: () => createCustomerDetailFixture('C-DETAIL-SUCCESS'),
    }));
    const props = {
      loadCatalogue,
      localPreviewEnabled: true,
      orderId: routeOrderId,
      scenario: 'C-DETAIL-SUCCESS',
      screen: 'detail',
    } as CustomerPreviewRouteProps;

    const screen = await render(<CustomerPreviewRoute {...props} />);

    await waitFor(() => {
      expect(screen.getByText('Không thể mở scenario')).toBeTruthy();
    });
    expect(screen.queryByText('Kho mô phỏng Quận 7, Thành phố Hồ Chí Minh')).toBeNull();
    expect(loadCatalogue).toHaveBeenCalledTimes(1);
    await screen.unmount();
  });
});
