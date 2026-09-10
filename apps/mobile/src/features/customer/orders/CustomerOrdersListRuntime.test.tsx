import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';

jest.mock('./adapter', () => {
  const actual = jest.requireActual('./adapter') as object;
  return {
    ...actual,
    createCustomerHttpAdapter: jest.fn(),
  };
});

import { createCustomerHttpAdapter } from './adapter';
import { CustomerOrdersListRuntime } from './CustomerOrdersListRuntime';

async function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const view = await render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  return { ...view, client };
}

describe('CustomerOrdersListRuntime', () => {
  it('renders the resolved view from the adapter', async () => {
    (createCustomerHttpAdapter as jest.Mock<any>).mockReturnValue({
      getOrdersView: jest.fn(async () => ({
        scenarioId: 'C-LIST-EMPTY',
        kind: 'empty',
        title: 'Bạn chưa có đơn hàng nào',
        message: 'Tạo đơn đầu tiên khi bạn đã sẵn sàng gửi hàng.',
      })),
    });

    const screen = await renderWithClient(
      <CustomerOrdersListRuntime onCreate={jest.fn()} onOpenOrder={jest.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByText('Bạn chưa có đơn hàng nào')).toBeTruthy();
    });
    await screen.unmount();
    screen.client.clear();
  });
});
