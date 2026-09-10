import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn() }),
}));

jest.mock('./adapter', () => {
  const actual = jest.requireActual('./adapter') as object;
  return {
    ...actual,
    createCustomerNotificationsHttpAdapter: jest.fn(),
  };
});

import { createCustomerNotificationsHttpAdapter } from './adapter';
import { NotificationsRuntime } from './NotificationsRuntime';
import type { NotificationItemView, NotificationsListPage } from './model';

const orderItem: NotificationItemView = {
  id: 'n-001',
  type: 'order',
  title: 'Tài xế đang giao hàng',
  body: 'Đơn hàng đang trên đường.',
  createdAt: new Date().toISOString(),
  createdAtLabel: '14:32 · 15/08/2026',
  isRead: false,
  orderId: 'ord-001',
};

const systemItem: NotificationItemView = {
  id: 'n-002',
  type: 'system',
  title: 'Bảo trì hệ thống',
  body: 'Hệ thống bảo trì.',
  createdAt: new Date().toISOString(),
  createdAtLabel: '10:00 · 14/08/2026',
  isRead: true,
};

async function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const view = await render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  return { ...view, client };
}

function mockPort(overrides: Record<string, unknown> = {}) {
  const port = {
    getListPage: jest.fn(
      async (): Promise<NotificationsListPage> => ({
        items: [orderItem, systemItem],
        page: 1,
        totalPages: 1,
      }),
    ),
    getUnreadCount: jest.fn(async () => 1),
    markRead: jest.fn(async () => undefined),
    markAllRead: jest.fn(async () => undefined),
    registerDeviceToken: jest.fn(async () => undefined),
    removeDeviceToken: jest.fn(async () => undefined),
    ...overrides,
  };
  (createCustomerNotificationsHttpAdapter as jest.Mock<any>).mockReturnValue(port);
  return port;
}

describe('NotificationsRuntime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a loading state while the first page is in flight', async () => {
    let resolveList: (value: NotificationsListPage) => void = () => {};
    mockPort({
      getListPage: jest.fn(
        () =>
          new Promise<NotificationsListPage>((resolve) => {
            resolveList = resolve;
          }),
      ),
    });

    const screen = await renderWithClient(<NotificationsRuntime />);

    expect(screen.getByTestId('screen-state-panel')).toBeTruthy();

    resolveList({ items: [], page: 1, totalPages: 1 });
    await screen.unmount();
    screen.client.clear();
  });

  it('shows an error state with a retry action when the list fails to load', async () => {
    mockPort({
      getListPage: jest.fn(async () => {
        throw new Error('network down');
      }),
    });

    const screen = await renderWithClient(<NotificationsRuntime />);

    await waitFor(() => {
      expect(screen.getByText('Không thể tải dữ liệu')).toBeTruthy();
    });

    await screen.unmount();
    screen.client.clear();
  });

  it('renders the resolved list with unread count from the adapter', async () => {
    mockPort();

    const screen = await renderWithClient(<NotificationsRuntime />);

    await waitFor(() => {
      expect(screen.getByText('Tài xế đang giao hàng')).toBeTruthy();
    });
    expect(screen.getByText(/Chưa đọc \(1\)/)).toBeTruthy();

    await screen.unmount();
    screen.client.clear();
  });

  it('keeps the already-rendered list and shows a notice when a load-more fetch fails', async () => {
    mockPort({
      getListPage: jest.fn(async (page: number): Promise<NotificationsListPage> => {
        if (page === 1) {
          return { items: [orderItem, systemItem], page: 1, totalPages: 2 };
        }
        throw new Error('load more failed');
      }),
    });

    const screen = await renderWithClient(<NotificationsRuntime />);

    await waitFor(() => {
      expect(screen.getByText('Tài xế đang giao hàng')).toBeTruthy();
    });

    await fireEvent.press(screen.getByLabelText('Tải thêm thông báo'));

    await waitFor(() => {
      expect(screen.getByText('Không thể tải thêm thông báo.')).toBeTruthy();
    });

    // The already-rendered list must still be visible — a load-more failure must not
    // replace it with the full-page error/retry screen.
    expect(screen.getByText('Tài xế đang giao hàng')).toBeTruthy();
    expect(screen.getByText('Bảo trì hệ thống')).toBeTruthy();
    expect(screen.queryByText('Không thể tải dữ liệu')).toBeNull();
    // The retry affordance is the load-more button itself, still present since
    // `hasNextPage` is unaffected by the failed fetch.
    expect(screen.getByLabelText('Tải thêm thông báo')).toBeTruthy();

    await screen.unmount();
    screen.client.clear();
  });

  it('marks a notification read and navigates to its order on press', async () => {
    const port = mockPort();

    const screen = await renderWithClient(<NotificationsRuntime />);

    await waitFor(() => {
      expect(screen.getByText('Tài xế đang giao hàng')).toBeTruthy();
    });

    await fireEvent.press(screen.getByLabelText('Tài xế đang giao hàng'));

    expect(port.markRead).toHaveBeenCalledWith('n-001');
    expect(mockPush).toHaveBeenCalledWith('/customer/orders/ord-001');

    await screen.unmount();
    screen.client.clear();
  });

  it('does not call markRead for an already-read item, but still navigates', async () => {
    const port = mockPort({
      getListPage: jest.fn(async () => ({
        items: [{ ...orderItem, isRead: true }],
        page: 1,
        totalPages: 1,
      })),
    });

    const screen = await renderWithClient(<NotificationsRuntime />);

    await waitFor(() => {
      expect(screen.getByText('Tài xế đang giao hàng')).toBeTruthy();
    });

    await fireEvent.press(screen.getByLabelText('Tài xế đang giao hàng'));

    expect(port.markRead).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/customer/orders/ord-001');

    await screen.unmount();
    screen.client.clear();
  });

  it('rolls back the optimistic read state when markRead fails', async () => {
    const port = mockPort({
      markRead: jest.fn(async () => {
        throw new Error('failed');
      }),
    });

    const screen = await renderWithClient(<NotificationsRuntime />);

    await waitFor(() => {
      expect(screen.getByText('Tài xế đang giao hàng')).toBeTruthy();
    });

    await fireEvent.press(screen.getByLabelText('Tài xế đang giao hàng'));

    await waitFor(() => {
      expect(port.markRead).toHaveBeenCalled();
    });
    // Rollback + refetch restores the original (still-unread) count.
    await waitFor(() => {
      expect(screen.getByText(/Chưa đọc \(1\)/)).toBeTruthy();
    });

    await screen.unmount();
    screen.client.clear();
  });

  it('marks all notifications read when the header action is pressed', async () => {
    const port = mockPort();

    const screen = await renderWithClient(<NotificationsRuntime />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Đọc tất cả thông báo' })).toBeTruthy();
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Đọc tất cả thông báo' }));

    expect(port.markAllRead).toHaveBeenCalledTimes(1);

    await screen.unmount();
    screen.client.clear();
  });

  it('calls back navigation via ScreenScaffold when the loading gate is showing', async () => {
    let resolveList: (value: NotificationsListPage) => void = () => {};
    mockPort({
      getListPage: jest.fn(
        () =>
          new Promise<NotificationsListPage>((resolve) => {
            resolveList = resolve;
          }),
      ),
    });

    const screen = await renderWithClient(<NotificationsRuntime />);

    await fireEvent.press(screen.getByLabelText('Quay lại'));
    expect(mockBack).toHaveBeenCalledTimes(1);

    resolveList({ items: [], page: 1, totalPages: 1 });
    await screen.unmount();
    screen.client.clear();
  });
});
