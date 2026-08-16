import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';

const mockCustomerPreviewRoute = jest.fn<(props: unknown) => null>(() => null);
let mockSearchParams: Readonly<Record<string, string | readonly string[] | undefined>> = {};

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockSearchParams,
}));

jest.mock('./preview/CustomerPreviewRoute', () => ({
  CustomerPreviewRoute: (props: unknown) => mockCustomerPreviewRoute(props),
}));

import CustomerOrderDetailPage from '../../../../app/customer/orders/[id]';

describe('Customer order detail route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = {};
  });

  it('forwards the exact validated order ID to the preview/runtime boundary', async () => {
    const orderId = '11111111-1111-4111-8111-111111111099';
    mockSearchParams = { id: orderId, preview: 'enabled', scenario: 'C-DETAIL-SUCCESS' };

    const screen = await render(<CustomerOrderDetailPage />);

    expect(mockCustomerPreviewRoute).toHaveBeenCalledTimes(1);
    expect(mockCustomerPreviewRoute.mock.calls[0]?.[0]).toMatchObject({
      localPreviewEnabled: true,
      orderId,
      scenario: 'C-DETAIL-SUCCESS',
      screen: 'detail',
    });
    await screen.unmount();
  });

  it('fails closed before the preview boundary for a malformed order ID', async () => {
    mockSearchParams = { id: '../admin/orders', preview: 'enabled' };

    const screen = await render(<CustomerOrderDetailPage />);

    expect(screen.getByText('Mã đơn không hợp lệ')).toBeTruthy();
    expect(mockCustomerPreviewRoute).not.toHaveBeenCalled();
    await screen.unmount();
  });
});
