import { describe, expect, it } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { customerQueryKeys } from '@leopard/mobile-core';

import { useActiveOrdersCount, ACTIVE_ORDER_STATUSES } from './useActiveOrdersCount';

describe('useActiveOrdersCount', () => {
  it('identifies all active statuses correctly', () => {
    expect(ACTIVE_ORDER_STATUSES).toEqual([
      'REQUESTED',
      'ACCEPTED',
      'PICKING_UP',
      'IN_TRANSIT',
      'RETURNING',
    ]);
  });

  it('returns 0 when there are no active orders', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(customerQueryKeys.orderList('ALL'), {
      kind: 'content',
      orders: [
        { id: 'ord-1', status: 'DELIVERED' },
        { id: 'ord-2', status: 'CANCELLED' },
      ],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = await renderHook(() => useActiveOrdersCount(true), { wrapper });
    expect(result.current).toBe(0);
  });

  it('counts only active orders in cache', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(customerQueryKeys.orderList('ALL'), {
      kind: 'content',
      orders: [
        { id: 'ord-1', status: 'REQUESTED' },
        { id: 'ord-2', status: 'PICKING_UP' },
        { id: 'ord-3', status: 'IN_TRANSIT' },
        { id: 'ord-4', status: 'DELIVERED' },
        { id: 'ord-5', status: 'CANCELLED' },
      ],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = await renderHook(() => useActiveOrdersCount(true), { wrapper });
    expect(result.current).toBe(3);
  });
});
