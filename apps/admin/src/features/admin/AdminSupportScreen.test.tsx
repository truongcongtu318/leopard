import { describe, expect, it } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';

import { AdminSupportScreen } from './AdminSupportScreen';
import { createAdminPreviewView } from './fixtures';
import type { AdminSupportRouteView } from './model';

describe('AdminSupportScreen (Customer Care & Live Support Console)', () => {
  it('renders 4 KPI metrics strip and support conversation threads', () => {
    const view = createAdminPreviewView('support', 'ADM-SUP-ACTIVE') as AdminSupportRouteView;
    render(<AdminSupportScreen view={view} />);

    expect(screen.getByText('Hội Thoại Đang Mở')).toBeTruthy();
    expect(screen.getByText('Cần Phản Hồi Gấp')).toBeTruthy();
    expect(screen.getByText('Thời Gian Phản Hồi TB')).toBeTruthy();
    expect(screen.getByText('Tỉ Lệ Hài Lòng CSAT')).toBeTruthy();
    expect(screen.getAllByText('Nguyễn Thị Mai Lan').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Trần Đình Trọng').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lê Thị Thu Thảo').length).toBeGreaterThan(0);
  });

  it('selects a different conversation thread and updates context', () => {
    const view = createAdminPreviewView('support', 'ADM-SUP-ACTIVE') as AdminSupportRouteView;
    render(<AdminSupportScreen view={view} />);

    const convButtons = screen.getAllByRole('button', { name: /Trần Đình Trọng/i });
    expect(convButtons[0]).toBeDefined();
    fireEvent.click(convButtons[0]!);

    expect(screen.getAllByText('Trần Đình Trọng').length).toBeGreaterThan(0);
  });

  it('allows typing and sending a support reply message', () => {
    const view = createAdminPreviewView('support', 'ADM-SUP-ACTIVE') as AdminSupportRouteView;
    render(<AdminSupportScreen view={view} />);

    const textarea = screen.getByPlaceholderText(/Nhập nội dung phản hồi/i);
    fireEvent.change(textarea, { target: { value: 'Bộ phận hỗ trợ đang kiểm tra cùng tài xế.' } });

    const sendBtn = screen.getByRole('button', { name: /Gửi phản hồi CSKH/i });
    fireEvent.click(sendBtn);

    expect(screen.getByText('Bộ phận hỗ trợ đang kiểm tra cùng tài xế.')).toBeTruthy();
    expect(screen.getByText(/Đã gửi phản hồi hỗ trợ/i)).toBeTruthy();
  });

  it('renders empty mailbox state for ADM-SUP-EMPTY', () => {
    const view = createAdminPreviewView('support', 'ADM-SUP-EMPTY') as AdminSupportRouteView;
    render(<AdminSupportScreen view={view} />);

    expect(screen.getByText('Không tìm thấy cuộc hội thoại nào phù hợp.')).toBeTruthy();
    expect(screen.getByText('Chọn cuộc hội thoại')).toBeTruthy();
  });
});
