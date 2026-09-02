import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';

const mockDriverOrderDetailRuntime = jest.fn<(props: unknown) => null>(() => null);
let mockSearchParams: Readonly<Record<string, string | readonly string[] | undefined>> = {};

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockSearchParams,
}));

jest.mock('./DriverOrderDetailRuntime', () => ({
  DriverOrderDetailRuntime: (props: unknown) => mockDriverOrderDetailRuntime(props),
}));

import DriverOrderDetailPage from '../../../../app/driver/orders/[id]';

describe('Driver order detail route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = {};
  });

  it('forwards the exact validated order ID to the runtime container', async () => {
    const orderId = '22222222-2222-4222-8222-222222222099';
    mockSearchParams = { id: orderId };

    const screen = await render(<DriverOrderDetailPage />);

    expect(mockDriverOrderDetailRuntime).toHaveBeenCalledTimes(1);
    expect(mockDriverOrderDetailRuntime.mock.calls[0]?.[0]).toEqual({
      orderId,
    });
    await screen.unmount();
  });

  it('fails closed before the runtime container for a malformed order ID', async () => {
    mockSearchParams = { id: ['not-a-uuid'] };

    const screen = await render(<DriverOrderDetailPage />);

    expect(screen.getByText('Mã đơn không hợp lệ')).toBeTruthy();
    expect(mockDriverOrderDetailRuntime).not.toHaveBeenCalled();
    await screen.unmount();
  });
});
