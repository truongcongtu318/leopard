import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';

const mockDriverPreviewRoute = jest.fn<(props: unknown) => null>(() => null);
let mockSearchParams: Readonly<Record<string, string | readonly string[] | undefined>> = {};

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockSearchParams,
}));

jest.mock('./preview/DriverPreviewRoute', () => ({
  DriverPreviewRoute: (props: unknown) => mockDriverPreviewRoute(props),
}));

import DriverOrderDetailPage from '../../../../app/driver/orders/[id]';

describe('Driver order detail route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = {};
  });

  it('forwards the exact validated order ID to the preview/runtime boundary', async () => {
    const orderId = '22222222-2222-4222-8222-222222222099';
    mockSearchParams = { id: orderId, preview: 'enabled', scenario: 'D-DETAIL-ACCEPTED' };

    const screen = await render(<DriverOrderDetailPage />);

    expect(mockDriverPreviewRoute).toHaveBeenCalledTimes(1);
    expect(mockDriverPreviewRoute.mock.calls[0]?.[0]).toMatchObject({
      localPreviewEnabled: true,
      orderId,
      scenario: 'D-DETAIL-ACCEPTED',
      screen: 'detail',
    });
    await screen.unmount();
  });

  it('fails closed before the preview boundary for a malformed order ID', async () => {
    mockSearchParams = { id: ['not-a-uuid'], preview: 'enabled' };

    const screen = await render(<DriverOrderDetailPage />);

    expect(screen.getByText('Mã đơn không hợp lệ')).toBeTruthy();
    expect(mockDriverPreviewRoute).not.toHaveBeenCalled();
    await screen.unmount();
  });
});
