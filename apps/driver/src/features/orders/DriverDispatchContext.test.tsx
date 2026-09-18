import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';

const mockPush = jest.fn();
let mockCurrentPath = '/earnings';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockCurrentPath,
}));

jest.mock('@leopard/mobile-core', () => {
  const actual = jest.requireActual('@leopard/mobile-core') as any;
  return {
    ...actual,
    sessionStore: {
      ...actual.sessionStore,
      isAuthenticated: jest.fn(() => true),
      getRole: jest.fn(() => 'DRIVER'),
      getAccessToken: jest.fn(() => 'mock-token'),
      subscribe: jest.fn(() => () => {}),
    },
  };
});

import { DriverDispatchProvider, useDriverDispatch } from './DriverDispatchContext';
import type { IncomingDispatchOffer } from './IncomingDispatchModal';

const SAMPLE_OFFER: IncomingDispatchOffer = {
  id: '11111111-1111-4111-8111-111111111001',
  reference: 'LP-11111111',
  pickupDistanceLabel: 'Cách bạn 0,2 km',
  pickupAddress: 'Kho Tân Bình, TP.HCM',
  dropoffAddress: 'Quận 1, TP.HCM',
  tripDistanceLabel: '10,0 km',
  etaLabel: 'ETA dự kiến · 20 phút',
  priceLabel: '150.000 ₫',
  vehicleLabel: 'Xe tải 1.25T',
  cargoSummary: 'Thiết bị điện tử',
  timeoutSeconds: 25,
};

function TestConsumer() {
  const dispatch = useDriverDispatch();
  if (!dispatch) return <Text testID="no-dispatch">No dispatch</Text>;
  return (
    <>
      <Text testID="has-offer">{dispatch.offer ? dispatch.offer.reference : 'none'}</Text>
      <TouchableOpacity
        testID="btn-simulate-offer"
        onPress={() => dispatch.setOffer(SAMPLE_OFFER)}
      >
        <Text>Simulate</Text>
      </TouchableOpacity>
      {dispatch.offer ? (
        <TouchableOpacity
          testID="btn-accept"
          onPress={() => void dispatch.acceptOffer(dispatch.offer!.id)}
        >
          <Text>Accept</Text>
        </TouchableOpacity>
      ) : null}
    </>
  );
}

describe('DriverDispatchContext', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentPath = '/earnings';
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('provides dispatch context and renders IncomingDispatchModal on non-orders screen when offer arrives', async () => {
    let capturedOnOffer: ((offer: IncomingDispatchOffer) => void) | null = null;
    const mockListener = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      isConnected: jest.fn(() => true),
    };
    const listenerFactory = jest.fn((options: { onOffer: (offer: IncomingDispatchOffer) => void }) => {
      capturedOnOffer = options.onOffer;
      return mockListener as any;
    });

    const mockAdapter = {
      getOrdersView: jest.fn(),
      getOrderDetailView: jest.fn(),
      setAvailability: jest.fn(),
      acceptOrder: jest.fn(async () => ({ kind: 'content' as const })),
      executeLifecycle: jest.fn(),
    };

    const screen = await render(
      <QueryClientProvider client={queryClient}>
        <DriverDispatchProvider adapter={mockAdapter as any} enabled={true} listenerFactory={listenerFactory}>
          <TestConsumer />
        </DriverDispatchProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('has-offer').props.children).toBe('none');
    expect(listenerFactory).toHaveBeenCalled();
    expect(capturedOnOffer).toBeTruthy();

    // Trigger offer
    await act(async () => {
      capturedOnOffer!(SAMPLE_OFFER);
    });

    await waitFor(() => {
      expect(screen.getByText('LP-11111111')).toBeTruthy();
      // On /earnings, global modal is rendered
      expect(screen.getByText(/Kho Tân Bình, TP\.HCM/)).toBeTruthy();
      expect(screen.getByText('150.000 ₫')).toBeTruthy();
    });

    // Accept offer
    const acceptBtn = screen.getByTestId('btn-accept');
    await act(async () => {
      fireEvent.press(acceptBtn);
    });

    await waitFor(() => {
      expect(mockAdapter.acceptOrder).toHaveBeenCalledWith(SAMPLE_OFFER.id);
      expect(mockPush).toHaveBeenCalledWith(`/orders/${SAMPLE_OFFER.id}`);
      expect(screen.getByText('none')).toBeTruthy();
    });
    await screen.unmount();
  });

  it('does not render duplicate global modal when on /orders screen (orders screen renders its own)', async () => {
    mockCurrentPath = '/orders';
    let capturedOnOffer: ((offer: IncomingDispatchOffer) => void) | null = null;
    const mockListener = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      isConnected: jest.fn(() => true),
    };
    const listenerFactory = jest.fn((options: { onOffer: (offer: IncomingDispatchOffer) => void }) => {
      capturedOnOffer = options.onOffer;
      return mockListener as any;
    });

    const screen = await render(
      <QueryClientProvider client={queryClient}>
        <DriverDispatchProvider enabled={true} listenerFactory={listenerFactory}>
          <TestConsumer />
        </DriverDispatchProvider>
      </QueryClientProvider>,
    );

    await act(async () => {
      capturedOnOffer!(SAMPLE_OFFER);
    });

    await waitFor(() => {
      expect(screen.getByText('LP-11111111')).toBeTruthy();
    });

    // Since mockCurrentPath is /orders, the provider suppresses its global modal
    expect(screen.queryByTestId('incoming-dispatch-modal')).toBeNull();
    await screen.unmount();
  });

  it('calls port.declineOrder when declineOffer is invoked', async () => {
    let capturedOnOffer: ((offer: IncomingDispatchOffer) => void) | null = null;
    const mockListener = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      isConnected: jest.fn(() => true),
    };
    const listenerFactory = jest.fn((options: { onOffer: (offer: IncomingDispatchOffer) => void }) => {
      capturedOnOffer = options.onOffer;
      return mockListener as any;
    });

    const mockAdapter = {
      getOrdersView: jest.fn(),
      getOrderDetailView: jest.fn(),
      setAvailability: jest.fn(),
      acceptOrder: jest.fn(),
      executeLifecycle: jest.fn(),
      declineOrder: jest.fn(async () => {}),
    };

    const screen = await render(
      <QueryClientProvider client={queryClient}>
        <DriverDispatchProvider
          adapter={mockAdapter as any}
          enabled={true}
          listenerFactory={listenerFactory}
        >
          <TestConsumer />
        </DriverDispatchProvider>
      </QueryClientProvider>,
    );

    await act(async () => {
      capturedOnOffer!(SAMPLE_OFFER);
    });

    await waitFor(() => {
      expect(screen.getByTestId('incoming-dispatch-modal')).toBeTruthy();
    });

    const declineBtn = screen.getByText('Bỏ qua');
    await act(async () => {
      fireEvent.press(declineBtn);
    });

    await waitFor(() => {
      expect(mockAdapter.declineOrder).toHaveBeenCalledWith(SAMPLE_OFFER.id);
      expect(screen.queryByTestId('incoming-dispatch-modal')).toBeNull();
    });

    await screen.unmount();
  });
});
