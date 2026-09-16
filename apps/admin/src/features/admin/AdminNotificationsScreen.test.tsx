import { describe, expect, it } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';

import { AdminNotificationsScreen } from './AdminNotificationsScreen';
import { createAdminPreviewView } from './fixtures';
import type { AdminNotificationsRouteView } from './model';

describe('AdminNotificationsScreen (Broadcast Push Console)', () => {
  it('renders 4 KPI metrics and compose form with audience options', () => {
    const view = createAdminPreviewView('notifications', 'ADM-NTF-COMPOSE') as AdminNotificationsRouteView;
    render(<AdminNotificationsScreen view={view} />);

    expect(screen.getByText('Tổng Broadcast')).toBeTruthy();
    expect(screen.getByText('Lượt Tiếp Cận')).toBeTruthy();
    expect(screen.getByText('Đội Ngũ Tài Xế')).toBeTruthy();
    expect(screen.getByText('Khách Hàng')).toBeTruthy();
    expect(screen.getByText('Soạn Thảo Thông Báo')).toBeTruthy();
    expect(screen.getByText('Nhóm đối tượng nhận thông báo')).toBeTruthy();
  });

  it('updates live push notification preview as user types', () => {
    const view = createAdminPreviewView('notifications', 'ADM-NTF-COMPOSE') as AdminNotificationsRouteView;
    render(<AdminNotificationsScreen view={view} />);

    const titleInput = screen.getByPlaceholderText(/Cập nhật chính sách an toàn mùa mưa/i);
    const bodyInput = screen.getByPlaceholderText(/Nhập nội dung push notification/i);

    fireEvent.change(titleInput, { target: { value: 'Khuyến mãi đặc biệt 50%' } });
    fireEvent.change(bodyInput, { target: { value: 'Nhập mã BANMAI nhận ngay ưu đãi vận chuyển!' } });

    expect(screen.getAllByText('Khuyến mãi đặc biệt 50%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Nhập mã BANMAI nhận ngay ưu đãi vận chuyển!').length).toBeGreaterThan(0);
  });

  it('opens confirmation modal and executes simulated broadcast', () => {
    const view = createAdminPreviewView('notifications', 'ADM-NTF-COMPOSE') as AdminNotificationsRouteView;
    render(<AdminNotificationsScreen view={view} />);

    const titleInput = screen.getByPlaceholderText(/Cập nhật chính sách an toàn mùa mưa/i);
    const bodyInput = screen.getByPlaceholderText(/Nhập nội dung push notification/i);

    fireEvent.change(titleInput, { target: { value: 'Thông báo bảo trì hệ thống định kỳ' } });
    fireEvent.change(bodyInput, { target: { value: 'Hệ thống sẽ bảo trì trong 15 phút từ 02:00 sáng ngày mai.' } });

    const submitBtn = screen.getByRole('button', { name: /Xem trước & Xác nhận phát sóng/i });
    fireEvent.click(submitBtn);

    // Modal is open
    expect(screen.getByText('Xác Nhận Phát Sóng Broadcast')).toBeTruthy();

    const confirmBtn = screen.getByRole('button', { name: /Xác nhận & Phát sóng/i });
    fireEvent.click(confirmBtn);

    // Success notice appears
    expect(screen.getByText(/Đã phát sóng thông báo thành công/i)).toBeTruthy();
  });

  it('renders empty broadcast history state for ADM-NTF-EMPTY', () => {
    const view = createAdminPreviewView('notifications', 'ADM-NTF-EMPTY') as AdminNotificationsRouteView;
    render(<AdminNotificationsScreen view={view} />);

    expect(screen.getByText('Không tìm thấy thông báo broadcast nào phù hợp.')).toBeTruthy();
  });
});
