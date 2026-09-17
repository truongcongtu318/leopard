import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Alert } from 'react-native';

jest.mock('./adapter', () => {
  const actual = jest.requireActual('./adapter') as object;
  return {
    ...actual,
    createDriverHttpAdapter: jest.fn(),
  };
});

const mockUseDispatchOffer = jest.fn();
jest.mock('./useDispatchOffer', () => ({
  useDispatchOffer: (...args: unknown[]) => mockUseDispatchOffer(...args),
}));

import { createDriverHttpAdapter } from './adapter';
import { DriverOrdersListRuntime } from './DriverOrdersListRuntime';

async function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const view = await render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  return { ...view, client };
}

const CONTENT_VIEW = {
  scenarioId: 'D-LIST-EMPTY',
  kind: 'content' as const,
  availability: {
    status: 'AVAILABLE' as const,
    action: { id: 'set-availability-offline', label: 'Tắt sẵn sàng', target: 'OFFLINE' as const },
    error: null,
  },
  activeTrip: null,
  requestedOrders: [],
  notice: null,
  refreshedAtLabel: '00:00 · 01/01/2026',
  isEmpty: true,
};

const SAMPLE_OFFER = {
  id: '11111111-1111-4111-8111-111111111001',
  reference: 'LP-11111111',
  pickupDistanceLabel: 'Cách bạn 0,2 km',
  pickupAddress: 'Kho Sao Mai, Q.7',
  dropoffAddress: 'Thủ Đức',
  tripDistanceLabel: '12,0 km',
  etaLabel: 'ETA dự kiến · 25 phút',
  priceLabel: '68.000 ₫',
  vehicleLabel: 'Xe máy',
  cargoSummary: 'Hàng dễ vỡ',
  timeoutSeconds: 25,
};

describe('DriverOrdersListRuntime', () => {
  beforeEach(() => {
    mockUseDispatchOffer.mockReturnValue({ offer: null, declineOffer: jest.fn() });
  });

  it('renders the resolved view from the adapter', async () => {
    (createDriverHttpAdapter as jest.Mock<any>).mockReturnValue({
      getOrdersView: jest.fn(async () => ({
        scenarioId: 'D-LIST-EMPTY',
        kind: 'content',
        availability: {
          status: 'OFFLINE',
          action: { id: 'set-availability-available', label: 'Bật sẵn sàng', target: 'AVAILABLE' },
          error: null,
        },
        activeTrip: null,
        requestedOrders: [],
        notice: { tone: 'info', message: 'Hiện chưa có đơn có thể nhận; trạng thái nhận đơn vẫn được giữ.' },
        refreshedAtLabel: '00:00 · 01/01/2026',
        isEmpty: true,
      })),
    });

    const screen = await renderWithClient(<DriverOrdersListRuntime onOpenOrder={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('driver-load-board-sheet')).toBeTruthy();
      expect(screen.getByTestId('driver-connection-toggle')).toBeTruthy();
    });
    await screen.unmount();
    screen.client.clear();
  }, 15000);

  it('shows an incoming dispatch offer and accepts it via POST /driver/orders/:id/accept', async () => {
    const declineOffer = jest.fn();
    const acceptOrder = jest.fn(async () => ({ kind: 'content' }));
    mockUseDispatchOffer.mockReturnValue({ offer: SAMPLE_OFFER, declineOffer });
    (createDriverHttpAdapter as jest.Mock<any>).mockReturnValue({
      getOrdersView: jest.fn(async () => CONTENT_VIEW),
      acceptOrder,
    });

    const screen = await renderWithClient(<DriverOrdersListRuntime onOpenOrder={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('68.000 ₫')).toBeTruthy();
    });

    await fireEvent(screen.getByTestId('dispatch-slide-action'), 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });

    await waitFor(() => {
      expect(acceptOrder).toHaveBeenCalledWith(SAMPLE_OFFER.id);
    });
    expect(declineOffer).toHaveBeenCalledTimes(1);

    await screen.unmount();
    screen.client.clear();
  }, 15000);

  it('navigates to the order detail screen after a successful accept', async () => {
    const declineOffer = jest.fn();
    const acceptOrder = jest.fn(async () => ({ kind: 'content' }));
    const onOpenOrder = jest.fn();
    mockUseDispatchOffer.mockReturnValue({ offer: SAMPLE_OFFER, declineOffer });
    (createDriverHttpAdapter as jest.Mock<any>).mockReturnValue({
      getOrdersView: jest.fn(async () => CONTENT_VIEW),
      acceptOrder,
    });

    const screen = await renderWithClient(<DriverOrdersListRuntime onOpenOrder={onOpenOrder} />);

    await waitFor(() => {
      expect(screen.getByText('68.000 ₫')).toBeTruthy();
    });

    await fireEvent(screen.getByTestId('dispatch-slide-action'), 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });

    await waitFor(() => {
      expect(onOpenOrder).toHaveBeenCalledWith(SAMPLE_OFFER.id);
    });

    await screen.unmount();
    screen.client.clear();
  }, 15000);

  it('shows an alert with the conflict message instead of silently dropping it', async () => {
    const declineOffer = jest.fn();
    const acceptOrder = jest.fn(async () => ({
      kind: 'conflict',
      title: 'Đơn không phù hợp với loại xe của bạn',
      message: 'Đơn hàng này yêu cầu loại phương tiện khác.',
      recoveryLabel: 'Xem đơn còn trống',
    }));
    const onOpenOrder = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockUseDispatchOffer.mockReturnValue({ offer: SAMPLE_OFFER, declineOffer });
    (createDriverHttpAdapter as jest.Mock<any>).mockReturnValue({
      getOrdersView: jest.fn(async () => CONTENT_VIEW),
      acceptOrder,
    });

    const screen = await renderWithClient(<DriverOrdersListRuntime onOpenOrder={onOpenOrder} />);

    await waitFor(() => {
      expect(screen.getByText('68.000 ₫')).toBeTruthy();
    });

    await fireEvent(screen.getByTestId('dispatch-slide-action'), 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Đơn không phù hợp với loại xe của bạn',
        'Đơn hàng này yêu cầu loại phương tiện khác.',
      );
    });
    expect(onOpenOrder).not.toHaveBeenCalled();

    alertSpy.mockRestore();
    await screen.unmount();
    screen.client.clear();
  }, 15000);

  it('refetches when focusKey increments on return from navigation', async () => {
    const getOrdersView = jest.fn(async () => CONTENT_VIEW);
    (createDriverHttpAdapter as jest.Mock<any>).mockReturnValue({
      getOrdersView,
    });

    const screen = await renderWithClient(
      <DriverOrdersListRuntime focusKey={1} onOpenOrder={jest.fn()} />,
    );

    await waitFor(() => {
      expect(getOrdersView).toHaveBeenCalledTimes(1);
    });

    screen.rerender(
      <QueryClientProvider client={screen.client}>
        <DriverOrdersListRuntime focusKey={2} onOpenOrder={jest.fn()} />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(getOrdersView).toHaveBeenCalledTimes(2);
    });

    await screen.unmount();
    screen.client.clear();
  });
});
