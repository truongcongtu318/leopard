import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';

const mockCustomerOrderDetailRuntime = jest.fn<(props: unknown) => null>(() => null);
let mockSearchParams: Readonly<Record<string, string | readonly string[] | undefined>> = {};

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockSearchParams,
}));

jest.mock('./CustomerOrderDetailRuntime', () => ({
  CustomerOrderDetailRuntime: (props: unknown) => mockCustomerOrderDetailRuntime(props),
}));

import CustomerOrderDetailPage from '../../../../app/customer/orders/[id]';

describe('Customer order detail route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = {};
  });

  it('forwards the exact validated order ID to the runtime container', async () => {
    const orderId = '11111111-1111-4111-8111-111111111099';
    mockSearchParams = { id: orderId };

    const screen = await render(<CustomerOrderDetailPage />);

    expect(mockCustomerOrderDetailRuntime).toHaveBeenCalledTimes(1);
    expect(mockCustomerOrderDetailRuntime.mock.calls[0]?.[0]).toEqual({
      orderId,
    });
    await screen.unmount();
  });

  it('fails closed before the runtime container for a malformed order ID', async () => {
    mockSearchParams = { id: '../admin/orders' };

    const screen = await render(<CustomerOrderDetailPage />);

    expect(screen.getByText('Mã đơn không hợp lệ')).toBeTruthy();
    expect(mockCustomerOrderDetailRuntime).not.toHaveBeenCalled();
    await screen.unmount();
  });
});
