import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react-native';
import React from 'react';

import { CustomerPreviewRoute } from './CustomerPreviewRoute';
import type { CustomerPreviewRouteProps } from './CustomerPreviewRoute';
import { createCustomerDetailFixture } from '../fixtures';
import { createCustomerPreviewView } from './catalogue';

const previousFlag = process.env.EXPO_PUBLIC_LEOPARD_UI_PREVIEW;

afterEach(() => {
  if (previousFlag === undefined) delete process.env.EXPO_PUBLIC_LEOPARD_UI_PREVIEW;
  else process.env.EXPO_PUBLIC_LEOPARD_UI_PREVIEW = previousFlag;
});

async function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const view = await render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  return { ...view, client };
}

describe('CustomerPreviewRoute', () => {
  it('fails closed to the runtime seam when the build flag is absent', async () => {
    delete process.env.EXPO_PUBLIC_LEOPARD_UI_PREVIEW;
    const loadCatalogue = jest.fn(async () => ({ createCustomerPreviewView }));
    const screen = await renderWithClient(
      <CustomerPreviewRoute
        loadCatalogue={loadCatalogue}
        localPreviewEnabled
        scenario={null}
        screen="list"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Đơn hàng của tôi')).toBeTruthy();
    });
    expect(screen.queryByText(/Bản xem trước giao diện/)).toBeNull();
    expect(screen.queryByText('Kho mô phỏng Quận 7, Thành phố Hồ Chí Minh')).toBeNull();
    expect(loadCatalogue).not.toHaveBeenCalled();
    await screen.unmount();
    screen.client.clear();
  });

  it('loads the role catalogue lazily behind both preview opt-ins', async () => {
    process.env.EXPO_PUBLIC_LEOPARD_UI_PREVIEW = 'enabled';
    const loadCatalogue = jest.fn(async () => ({ createCustomerPreviewView }));
    const screen = await renderWithClient(
      <CustomerPreviewRoute
        loadCatalogue={loadCatalogue}
        localPreviewEnabled
        scenario="C-LIST-SUCCESS"
        screen="list"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Đơn LP-260905-001')).toBeTruthy();
    });
    expect(screen.getByLabelText('LEOPARD Logistics · Phiên bản Thử nghiệm Pilot')).toBeTruthy();
    expect(loadCatalogue).toHaveBeenCalledTimes(1);
    await screen.unmount();
    screen.client.clear();
  });

  it('keeps the preview banner and shows a safe error for an invalid scenario', async () => {
    process.env.EXPO_PUBLIC_LEOPARD_UI_PREVIEW = 'enabled';
    const loadCatalogue = jest.fn(async () => ({ createCustomerPreviewView }));
    const screen = await renderWithClient(
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
    expect(screen.getByText(/LEOPARD Logistics · Phiên bản Thử nghiệm Pilot/)).toBeTruthy();
    expect(screen.queryByText('Kho VLXD Minh Khang, 88 Thoại Ngọc Hầu, P. Phú Thạnh, Tân Phú')).toBeNull();
    await screen.unmount();
    screen.client.clear();
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

    const screen = await renderWithClient(<CustomerPreviewRoute {...props} />);

    await waitFor(() => {
      expect(screen.getByText('Không thể mở scenario')).toBeTruthy();
    });
    expect(screen.queryByText('Kho mô phỏng Quận 7, Thành phố Hồ Chí Minh')).toBeNull();
    expect(loadCatalogue).toHaveBeenCalledTimes(1);
    await screen.unmount();
    screen.client.clear();
  });
});
