import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Alert } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, waitFor } from '@testing-library/react-native';

import type { DriverAssignedDetailView, DriverDetailView } from './model';

function withCancelledStatus(view: DriverDetailView): DriverDetailView {
  const content = view as DriverAssignedDetailView;
  return { ...content, order: { ...content.order, status: 'CANCELLED' } };
}

const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack }) }));
jest.mock('./adapter', () => ({
  createDriverHttpAdapter: jest.fn(),
  createDriverProofAdapter: jest.fn(),
}));
jest.mock('./tracking-sender', () => ({
  isTrackingEligibleStatus: () => false,
  createDriverTrackingSender: () => ({
    observeHealth: () => ({ unsubscribe: jest.fn() }),
    start: jest.fn(),
    handleOrderStatusChange: jest.fn(),
    destroy: jest.fn(),
  }),
}));

import { createDriverHttpAdapter, createDriverProofAdapter } from './adapter';
import { DriverOrderDetailRuntime } from './DriverOrderDetailRuntime';
import { createDriverDetailFixture } from './fixtures';

describe('DriverOrderDetailRuntime: reacts to a customer/admin cancellation while active', () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const orderId = '22222222-2222-4222-8222-222222222001';
  const getOrderDetailView = jest.fn<() => Promise<DriverDetailView>>();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(createDriverHttpAdapter).mockReturnValue({
      getOrderDetailView,
    } as unknown as ReturnType<typeof createDriverHttpAdapter>);
    jest.mocked(createDriverProofAdapter).mockReturnValue({
      selectProof: jest.fn(),
      uploadProof: jest.fn(),
    } as unknown as ReturnType<typeof createDriverProofAdapter>);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(async () => {
    await cleanup();
    client.clear();
    jest.restoreAllMocks();
  });

  it('alerts and navigates back when an active order flips to CANCELLED', async () => {
    getOrderDetailView.mockResolvedValueOnce(createDriverDetailFixture('D-DETAIL-IN-TRANSIT'));
    getOrderDetailView.mockResolvedValueOnce(
      withCancelledStatus(createDriverDetailFixture('D-DETAIL-IN-TRANSIT')),
    );

    render(
      <QueryClientProvider client={client}>
        <DriverOrderDetailRuntime orderId={orderId} />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(getOrderDetailView).toHaveBeenCalledTimes(1));

    await act(async () => {
      await client.refetchQueries({ queryKey: ['driver', 'order', orderId] });
    });

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith(
      'Đơn đã bị hủy',
      expect.stringContaining('hủy'),
      expect.any(Array),
    ));

    const [, , buttons] = jest.mocked(Alert.alert).mock.calls[0] as [string, string, Array<{ onPress?: () => void }>];
    buttons[0]?.onPress?.();
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('does not alert when the order was already CANCELLED on first load', async () => {
    getOrderDetailView.mockResolvedValue(
      withCancelledStatus(createDriverDetailFixture('D-DETAIL-IN-TRANSIT')),
    );

    render(
      <QueryClientProvider client={client}>
        <DriverOrderDetailRuntime orderId={orderId} />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(getOrderDetailView).toHaveBeenCalled());
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});
