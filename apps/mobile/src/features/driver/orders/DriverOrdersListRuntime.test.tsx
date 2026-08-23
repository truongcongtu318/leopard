import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';

jest.mock('./adapter', () => {
  const actual = jest.requireActual('./adapter') as object;
  return {
    ...actual,
    createDriverHttpAdapter: jest.fn(),
  };
});

import { createDriverHttpAdapter } from './adapter';
import { DriverOrdersListRuntime } from './DriverOrdersListRuntime';

async function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const view = await render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  return { ...view, client };
}

describe('DriverOrdersListRuntime', () => {
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
      expect(
        screen.getByText('Hiện chưa có đơn có thể nhận; trạng thái nhận đơn vẫn được giữ.'),
      ).toBeTruthy();
    });
    await screen.unmount();
    screen.client.clear();
  });
});
