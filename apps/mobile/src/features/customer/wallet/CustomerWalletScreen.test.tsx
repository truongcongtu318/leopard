import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

import type { CustomerListView } from '../orders/model';
import type { CustomerOrdersPort } from '../orders/port';
import { CustomerWalletScreen } from './CustomerWalletScreen';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));

async function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  const view = await render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  return { ...view, client };
}

describe('CustomerWalletScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockOrdersView: CustomerListView = {
    scenarioId: 'C-LIST-SUCCESS',
    kind: 'content',
    contentState: 'success',
    notice: null,
    orders: [
      {
        id: 'order-001',
        reference: 'LP-260905-001',
        status: 'IN_TRANSIT',
        route: {
          origin: { id: 'p1', label: 'Kho A' },
          stops: [],
          destination: { id: 'd1', label: 'Kho B' },
          distanceLabel: '10 km',
        },
        etaLabel: '20 phút',
        priceLabel: '480.000 ₫',
        updatedAtLabel: '14:30 · 05/09/2026',
      },
      {
        id: 'order-002',
        reference: 'LP-260905-002',
        status: 'DELIVERED',
        route: {
          origin: { id: 'p2', label: 'Kho C' },
          stops: [],
          destination: { id: 'd2', label: 'Kho D' },
          distanceLabel: '15 km',
        },
        etaLabel: 'Đã hoàn tất',
        priceLabel: '350.000 ₫',
        updatedAtLabel: '09:15 · 05/09/2026',
      },
      {
        id: 'order-003',
        reference: 'LP-260905-003',
        status: 'REQUESTED',
        route: {
          origin: { id: 'p3', label: 'Kho E' },
          stops: [],
          destination: { id: 'd3', label: 'Kho F' },
          distanceLabel: '5 km',
        },
        etaLabel: '10 phút',
        priceLabel: '120.000 ₫',
        updatedAtLabel: '16:45 · 04/09/2026',
      },
      {
        id: 'order-004',
        reference: 'LP-260905-004',
        status: 'CANCELLED',
        route: {
          origin: { id: 'p4', label: 'Kho G' },
          stops: [],
          destination: { id: 'd4', label: 'Kho H' },
          distanceLabel: '7 km',
        },
        etaLabel: 'Đã hủy',
        priceLabel: '200.000 ₫',
        updatedAtLabel: '11:20 · 04/09/2026',
      },
    ],
    selectedFilter: 'ALL',
    resultLabel: '4 đơn hàng',
    canLoadMore: false,
    isLoadingMore: false,
  };

  const mockOrdersPort: CustomerOrdersPort = {
    getOrdersView: jest.fn(async () => mockOrdersView),
    getCreateView: jest.fn(async () => ({}) as any),
    getOrderDetailView: jest.fn(async () => ({}) as any),
    searchAddress: jest.fn(async () => []),
    estimateOrder: jest.fn(async () => ({}) as any),
    createOrder: jest.fn(async () => ({}) as any),
    executeIntent: jest.fn(async () => ({}) as any),
  };

  const mockFetchPaymentsForOrder = jest.fn(async (orderId: string) => {
    if (orderId === 'order-001') {
      return [
        {
          id: 'pi-001',
          orderId: 'order-001',
          status: 'PAID_MANUAL',
          amountVnd: 480000,
        },
      ];
    }
    if (orderId === 'order-002') {
      return [
        {
          id: 'pi-002',
          orderId: 'order-002',
          status: 'SUCCEEDED',
          amountVnd: 350000,
        },
      ];
    }
    if (orderId === 'order-003') {
      return [
        {
          id: 'pi-003',
          orderId: 'order-003',
          status: 'UNPAID',
          amountVnd: 120000,
        },
      ];
    }
    if (orderId === 'order-004') {
      return [
        {
          id: 'pi-004',
          orderId: 'order-004',
          status: 'REFUNDED',
          amountVnd: 200000,
        },
      ];
    }
    return [];
  });

  it('renders real escrow card with real total, and does NOT render fake wallet elements', async () => {
    const screen = await renderWithClient(
      <CustomerWalletScreen
        fetchPaymentsForOrder={mockFetchPaymentsForOrder}
        ordersPort={mockOrdersPort}
      />,
    );

    // Header & Escrow pool card
    expect(screen.getByText('Lịch sử ký quỹ & thanh toán')).toBeTruthy();
    expect(screen.getByText('Ký quỹ an toàn')).toBeTruthy();
    expect(screen.getByText('Bảo đảm 100%')).toBeTruthy();
    expect(screen.getByText('Tổng tiền ký quỹ theo đơn')).toBeTruthy();

    // Verify fake wallet elements are GONE
    expect(screen.queryByText('Ví VietQR LEOPARD')).toBeNull();
    expect(screen.queryByText('+ Nạp tiền')).toBeNull();
    expect(screen.queryByText('Rút tiền')).toBeNull();
    expect(screen.queryByText('•••• 8839')).toBeNull();
    expect(screen.queryByText(/1\.250\.000/)).toBeNull();

    // Total escrowed: 480.000 (HELD) + 350.000 (SETTLED) = 830.000 ₫
    await waitFor(() => {
      expect(screen.getByText('830.000 ₫')).toBeTruthy();
      expect(screen.getByText('4 giao dịch đơn')).toBeTruthy();
    });

    await screen.unmount();
    screen.client.clear();
  });

  it('toggles total escrow amount visibility with eye button', async () => {
    const screen = await renderWithClient(
      <CustomerWalletScreen
        fetchPaymentsForOrder={mockFetchPaymentsForOrder}
        ordersPort={mockOrdersPort}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('830.000 ₫')).toBeTruthy();
    });

    const hideBtn = screen.getByLabelText('Ẩn số tiền');
    await fireEvent.press(hideBtn);

    await waitFor(() => {
      expect(screen.getByText('•••••••• ₫')).toBeTruthy();
      expect(screen.queryByText('830.000 ₫')).toBeNull();
    });

    const showBtn = screen.getByLabelText('Hiện số tiền');
    await fireEvent.press(showBtn);

    await waitFor(() => {
      expect(screen.getByText('830.000 ₫')).toBeTruthy();
    });

    await screen.unmount();
    screen.client.clear();
  });

  it('renders real order escrows with correct status labels', async () => {
    const screen = await renderWithClient(
      <CustomerWalletScreen
        fetchPaymentsForOrder={mockFetchPaymentsForOrder}
        ordersPort={mockOrdersPort}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('LP-260905-001')).toBeTruthy();
      expect(screen.getByText('LP-260905-002')).toBeTruthy();
      expect(screen.getByText('LP-260905-003')).toBeTruthy();
      expect(screen.getByText('LP-260905-004')).toBeTruthy();
    });

    expect(screen.getByText('ĐÃ KÝ QUỸ')).toBeTruthy();
    expect(screen.getByText('ĐÃ HOÀN TẤT')).toBeTruthy();
    expect(screen.getByText('CHỜ THANH TOÁN')).toBeTruthy();
    expect(screen.getByText('HOÀN CỌC')).toBeTruthy();

    await screen.unmount();
    screen.client.clear();
  });

  it('navigates to checkout when "Thanh toán ngay" button is pressed on unpaid escrow', async () => {
    const screen = await renderWithClient(
      <CustomerWalletScreen
        fetchPaymentsForOrder={mockFetchPaymentsForOrder}
        ordersPort={mockOrdersPort}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Thanh toán ngay cho đơn LP-260905-003')).toBeTruthy();
    });

    const payBtn = screen.getByLabelText('Thanh toán ngay cho đơn LP-260905-003');
    await fireEvent.press(payBtn);

    expect(mockPush).toHaveBeenCalledWith('/customer/orders/checkout/order-003');

    await screen.unmount();
    screen.client.clear();
  });

  it('filters escrow items by tabs', async () => {
    const screen = await renderWithClient(
      <CustomerWalletScreen
        fetchPaymentsForOrder={mockFetchPaymentsForOrder}
        ordersPort={mockOrdersPort}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('LP-260905-001')).toBeTruthy();
    });

    // Filter by Chờ thanh toán
    await fireEvent.press(screen.getByLabelText('Chờ thanh toán'));
    await waitFor(() => {
      expect(screen.getByText('LP-260905-003')).toBeTruthy();
      expect(screen.queryByText('LP-260905-001')).toBeNull();
      expect(screen.queryByText('LP-260905-002')).toBeNull();
    });

    // Filter by Đã ký quỹ
    await fireEvent.press(screen.getByLabelText('Đã ký quỹ'));
    await waitFor(() => {
      expect(screen.getByText('LP-260905-001')).toBeTruthy();
      expect(screen.queryByText('LP-260905-003')).toBeNull();
    });

    // Filter by Hoàn tất
    await fireEvent.press(screen.getByLabelText('Hoàn tất'));
    await waitFor(() => {
      expect(screen.getByText('LP-260905-002')).toBeTruthy();
      expect(screen.queryByText('LP-260905-001')).toBeNull();
    });

    // Filter by Hoàn cọc
    await fireEvent.press(screen.getByLabelText('Hoàn cọc'));
    await waitFor(() => {
      expect(screen.getByText('LP-260905-004')).toBeTruthy();
      expect(screen.queryByText('LP-260905-002')).toBeNull();
    });

    // Filter back to Tất cả
    await fireEvent.press(screen.getByLabelText('Tất cả'));
    await waitFor(() => {
      expect(screen.getByText('LP-260905-001')).toBeTruthy();
      expect(screen.getByText('LP-260905-002')).toBeTruthy();
      expect(screen.getByText('LP-260905-003')).toBeTruthy();
      expect(screen.getByText('LP-260905-004')).toBeTruthy();
    });

    await screen.unmount();
    screen.client.clear();
  });
});
