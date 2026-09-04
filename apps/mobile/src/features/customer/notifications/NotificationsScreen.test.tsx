import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { NotificationsScreen } from './NotificationsScreen';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));

describe('NotificationsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders notification list with section headers and filter chips', async () => {
    const screen = await render(<NotificationsScreen />);

    expect(screen.getByText('Thông báo')).toBeTruthy();
    expect(screen.getByText('Hôm nay')).toBeTruthy();
    expect(screen.getByText('Trước đó')).toBeTruthy();

    // Notification items
    expect(screen.getByText('Tài xế đang giao hàng')).toBeTruthy();
    expect(screen.getByText('Thanh toán thành công')).toBeTruthy();
    expect(screen.getByText('Ưu đãi 20% cước xe tải')).toBeTruthy();
    expect(screen.getByText('Bảo trì hệ thống định kỳ')).toBeTruthy();

    // Filter chips with counts
    expect(screen.getByText(/Tất cả \(4\)/)).toBeTruthy();
    expect(screen.getByText(/Chưa đọc \(2\)/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Đọc tất cả thông báo' })).toBeTruthy();

    await screen.unmount();
  });

  it('filters by unread notifications', async () => {
    const screen = await render(<NotificationsScreen />);

    // Click 'Chưa đọc'
    const unreadChip = screen.getByLabelText('Chưa đọc');
    await fireEvent.press(unreadChip);

    expect(screen.getByText('Tài xế đang giao hàng')).toBeTruthy();
    expect(screen.getByText('Thanh toán thành công')).toBeTruthy();
    expect(screen.queryByText('Ưu đãi 20% cước xe tải')).toBeNull();
    expect(screen.queryByText('Bảo trì hệ thống định kỳ')).toBeNull();

    // Click 'Tất cả'
    const allChip = screen.getByLabelText('Tất cả');
    await fireEvent.press(allChip);

    expect(screen.getByText('Ưu đãi 20% cước xe tải')).toBeTruthy();
    expect(screen.getByText('Bảo trì hệ thống định kỳ')).toBeTruthy();

    await screen.unmount();
  });

  it('filters by topic categories (Đơn hàng, Thanh toán, Ưu đãi, Hệ thống)', async () => {
    const screen = await render(<NotificationsScreen />);

    // Filter by 'Đơn hàng'
    await fireEvent.press(screen.getByLabelText('Đơn hàng'));
    expect(screen.getByText('Tài xế đang giao hàng')).toBeTruthy();
    expect(screen.queryByText('Thanh toán thành công')).toBeNull();
    expect(screen.queryByText('Ưu đãi 20% cước xe tải')).toBeNull();

    // Filter by 'Thanh toán'
    await fireEvent.press(screen.getByLabelText('Thanh toán'));
    expect(screen.getByText('Thanh toán thành công')).toBeTruthy();
    expect(screen.queryByText('Tài xế đang giao hàng')).toBeNull();

    // Filter by 'Ưu đãi'
    await fireEvent.press(screen.getByLabelText('Ưu đãi'));
    expect(screen.getByText('Ưu đãi 20% cước xe tải')).toBeTruthy();
    expect(screen.queryByText('Thanh toán thành công')).toBeNull();

    // Filter by 'Hệ thống'
    await fireEvent.press(screen.getByLabelText('Hệ thống'));
    expect(screen.getByText('Bảo trì hệ thống định kỳ')).toBeTruthy();
    expect(screen.queryByText('Ưu đãi 20% cước xe tải')).toBeNull();

    await screen.unmount();
  });

  it('marks all notifications as read when "Đọc tất cả" is pressed', async () => {
    const screen = await render(<NotificationsScreen />);

    const markAllBtn = screen.getByRole('button', { name: 'Đọc tất cả thông báo' });
    await fireEvent.press(markAllBtn);

    // Unread count is now 0
    expect(screen.getByText(/Chưa đọc \(0\)/)).toBeTruthy();
    // 'Đọc tất cả' button is now hidden
    expect(screen.queryByRole('button', { name: 'Đọc tất cả thông báo' })).toBeNull();

    await screen.unmount();
  });

  it('handles notification press: marks item as read and navigates to order if orderId exists', async () => {
    const screen = await render(<NotificationsScreen />);

    const orderNotification = screen.getByLabelText('Tài xế đang giao hàng');
    await fireEvent.press(orderNotification);

    // Navigates to customer order detail
    expect(mockPush).toHaveBeenCalledWith('/customer/orders/ord-001');

    // Unread count decreases from 2 to 1
    expect(screen.getByText(/Chưa đọc \(1\)/)).toBeTruthy();

    await screen.unmount();
  });

  it('shows empty state when filter has no notifications and allows reset', async () => {
    const screen = await render(<NotificationsScreen />);

    // First mark all as read
    await fireEvent.press(screen.getByRole('button', { name: 'Đọc tất cả thông báo' }));

    // Now filter by 'Chưa đọc'
    await fireEvent.press(screen.getByLabelText('Chưa đọc'));

    expect(screen.getByText('Không có thông báo nào')).toBeTruthy();
    expect(screen.getByText(/Tuyệt vời! Bạn đã đọc tất cả thông báo/)).toBeTruthy();

    // Click 'Xem tất cả thông báo' to reset
    const resetBtn = screen.getByLabelText('Xem tất cả thông báo');
    await fireEvent.press(resetBtn);

    expect(screen.getByText('Tài xế đang giao hàng')).toBeTruthy();

    await screen.unmount();
  });
});
