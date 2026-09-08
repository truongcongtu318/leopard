import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { NotificationsScreen } from './NotificationsScreen';
import type { NotificationItemView, NotificationsContentView } from './model';

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

const items: readonly NotificationItemView[] = [
  {
    id: 'n-001',
    type: 'order',
    title: 'Tài xế đang giao hàng',
    body: 'Đơn hàng LP-D-260815-001 đang trên đường đến điểm giao.',
    createdAt: daysAgoIso(0),
    createdAtLabel: '5 phút trước',
    isRead: false,
    orderId: 'ord-001',
  },
  {
    id: 'n-002',
    type: 'payment',
    title: 'Thanh toán thành công',
    body: 'Giao dịch 150.000 ₫ cho đơn LP-D-260815-001 đã được xác nhận qua VietQR.',
    createdAt: daysAgoIso(0),
    createdAtLabel: '30 phút trước',
    isRead: false,
    orderId: 'ord-001',
  },
  {
    id: 'n-003',
    type: 'promo',
    title: 'Ưu đãi 20% cước xe tải',
    body: 'Nhập mã LEOPARD20 để được giảm giá cho chuyến hàng liên tỉnh.',
    createdAt: daysAgoIso(2),
    createdAtLabel: '2 ngày trước',
    isRead: true,
  },
  {
    id: 'n-004',
    type: 'system',
    title: 'Bảo trì hệ thống định kỳ',
    body: 'Hệ thống sẽ bảo trì nhẹ từ 02:00 đến 03:00 ngày 25/08.',
    createdAt: daysAgoIso(3),
    createdAtLabel: '3 ngày trước',
    isRead: true,
  },
];

function makeView(overrides: Partial<NotificationsContentView> = {}): NotificationsContentView {
  return {
    scenarioId: 'CM-NOTIFICATIONS-CONTENT',
    kind: 'content',
    items,
    unreadCount: items.filter((n) => !n.isRead).length,
    canLoadMore: false,
    isLoadingMore: false,
    notice: null,
    ...overrides,
  };
}

describe('NotificationsScreen', () => {
  it('renders notification list with section headers and filter chips', async () => {
    const screen = await render(
      <NotificationsScreen
        onBack={jest.fn()}
        onLoadMore={jest.fn()}
        onMarkAllRead={jest.fn()}
        onPressItem={jest.fn()}
        view={makeView()}
      />,
    );

    expect(screen.getByText('Thông báo')).toBeTruthy();
    expect(screen.getByText('Hôm nay')).toBeTruthy();
    expect(screen.getByText('Trước đó')).toBeTruthy();
    expect(screen.getByText('Tài xế đang giao hàng')).toBeTruthy();
    expect(screen.getByText('Thanh toán thành công')).toBeTruthy();
    expect(screen.getByText('Ưu đãi 20% cước xe tải')).toBeTruthy();
    expect(screen.getByText('Bảo trì hệ thống định kỳ')).toBeTruthy();
    expect(screen.getByText(/Tất cả \(4\)/)).toBeTruthy();
    expect(screen.getByText(/Chưa đọc \(2\)/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Đọc tất cả thông báo' })).toBeTruthy();

    await screen.unmount();
  });

  it('filters by unread and back to all', async () => {
    const screen = await render(
      <NotificationsScreen
        onBack={jest.fn()}
        onLoadMore={jest.fn()}
        onMarkAllRead={jest.fn()}
        onPressItem={jest.fn()}
        view={makeView()}
      />,
    );

    await fireEvent.press(screen.getByLabelText('Chưa đọc'));
    expect(screen.getByText('Tài xế đang giao hàng')).toBeTruthy();
    expect(screen.queryByText('Ưu đãi 20% cước xe tải')).toBeNull();

    await fireEvent.press(screen.getByLabelText('Tất cả'));
    expect(screen.getByText('Ưu đãi 20% cước xe tải')).toBeTruthy();

    await screen.unmount();
  });

  it('filters by topic categories', async () => {
    const screen = await render(
      <NotificationsScreen
        onBack={jest.fn()}
        onLoadMore={jest.fn()}
        onMarkAllRead={jest.fn()}
        onPressItem={jest.fn()}
        view={makeView()}
      />,
    );

    await fireEvent.press(screen.getByLabelText('Đơn hàng'));
    expect(screen.getByText('Tài xế đang giao hàng')).toBeTruthy();
    expect(screen.queryByText('Thanh toán thành công')).toBeNull();

    await screen.unmount();
  });

  it('calls onMarkAllRead when the header action is pressed', async () => {
    const onMarkAllRead = jest.fn();
    const screen = await render(
      <NotificationsScreen
        onBack={jest.fn()}
        onLoadMore={jest.fn()}
        onMarkAllRead={onMarkAllRead}
        onPressItem={jest.fn()}
        view={makeView()}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Đọc tất cả thông báo' }));

    expect(onMarkAllRead).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });

  it('hides the mark-all button once unreadCount is 0', async () => {
    const screen = await render(
      <NotificationsScreen
        onBack={jest.fn()}
        onLoadMore={jest.fn()}
        onMarkAllRead={jest.fn()}
        onPressItem={jest.fn()}
        view={makeView({ unreadCount: 0 })}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Đọc tất cả thông báo' })).toBeNull();

    await screen.unmount();
  });

  it('calls onPressItem with the tapped notification (deep-link navigation is the runtime concern)', async () => {
    const onPressItem = jest.fn();
    const screen = await render(
      <NotificationsScreen
        onBack={jest.fn()}
        onLoadMore={jest.fn()}
        onMarkAllRead={jest.fn()}
        onPressItem={onPressItem}
        view={makeView()}
      />,
    );

    await fireEvent.press(screen.getByLabelText('Tài xế đang giao hàng'));

    expect(onPressItem).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'n-001', orderId: 'ord-001' }),
    );

    await screen.unmount();
  });

  it('shows the empty state for a filter with no matches and resets on demand', async () => {
    const screen = await render(
      <NotificationsScreen
        onBack={jest.fn()}
        onLoadMore={jest.fn()}
        onMarkAllRead={jest.fn()}
        onPressItem={jest.fn()}
        view={makeView({ unreadCount: 0, items: items.map((i) => ({ ...i, isRead: true })) })}
      />,
    );

    await fireEvent.press(screen.getByLabelText('Chưa đọc'));

    expect(screen.getByText('Không có thông báo nào')).toBeTruthy();
    expect(screen.getByText(/Tuyệt vời! Bạn đã đọc tất cả thông báo/)).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Xem tất cả thông báo'));
    expect(screen.getByText('Tài xế đang giao hàng')).toBeTruthy();

    await screen.unmount();
  });

  it('renders a load-more control when canLoadMore is true and calls onLoadMore', async () => {
    const onLoadMore = jest.fn();
    const screen = await render(
      <NotificationsScreen
        onBack={jest.fn()}
        onLoadMore={onLoadMore}
        onMarkAllRead={jest.fn()}
        onPressItem={jest.fn()}
        view={makeView({ canLoadMore: true })}
      />,
    );

    const button = screen.getByLabelText('Tải thêm thông báo');
    await fireEvent.press(button);

    expect(onLoadMore).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });

  it('shows a page-error notice banner when provided', async () => {
    const screen = await render(
      <NotificationsScreen
        onBack={jest.fn()}
        onLoadMore={jest.fn()}
        onMarkAllRead={jest.fn()}
        onPressItem={jest.fn()}
        view={makeView({ notice: 'Không thể tải thêm thông báo.' })}
      />,
    );

    expect(screen.getByText('Không thể tải thêm thông báo.')).toBeTruthy();

    await screen.unmount();
  });

  it('calls onBack when the back control is pressed', async () => {
    const onBack = jest.fn();
    const screen = await render(
      <NotificationsScreen
        onBack={onBack}
        onLoadMore={jest.fn()}
        onMarkAllRead={jest.fn()}
        onPressItem={jest.fn()}
        view={makeView()}
      />,
    );

    await fireEvent.press(screen.getByLabelText('Quay lại'));

    expect(onBack).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });
});
