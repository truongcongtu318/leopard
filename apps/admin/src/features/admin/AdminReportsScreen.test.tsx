import { describe, expect, it } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';

import { AdminReportsScreen } from './AdminReportsScreen';
import { createAdminPreviewView } from './fixtures';
import type { AdminListRouteView } from './model';

describe('AdminReportsScreen (Complaint Queue & Quick Drawer)', () => {
  it('renders 4 KPI metric cards with accurate counts', () => {
    const view = createAdminPreviewView('reports', 'ADM-REP-DENSE') as AdminListRouteView;
    render(<AdminReportsScreen view={view} />);

    expect(screen.getByText('Tổng khiếu nại')).toBeTruthy();
    expect(screen.getAllByText('Chờ tiếp nhận').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Đang điều tra').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Đã giải quyết').length).toBeGreaterThan(0);
  });

  it('renders complaint table with tickets, severity badges and customer info', () => {
    const view = createAdminPreviewView('reports', 'ADM-REP-DENSE') as AdminListRouteView;
    render(<AdminReportsScreen view={view} />);

    expect(screen.getByText('TK-A101')).toBeTruthy();
    expect(screen.getByText('TK-B102')).toBeTruthy();
    expect(screen.getAllByText('Nguyễn Văn Khách').length).toBeGreaterThan(0);
    expect(screen.getByText('Trần Thị Doanh Nghiệp')).toBeTruthy();
  });

  it('opens Quick Drawer on table row click and displays detailed summary', () => {
    const view = createAdminPreviewView('reports', 'ADM-REP-DENSE') as AdminListRouteView;
    render(<AdminReportsScreen view={view} />);

    // Click on row for TK-A101
    const row = screen.getByText('TK-A101').closest('tr');
    expect(row).toBeTruthy();
    fireEvent.click(row!);

    // Quick Drawer appears
    expect(screen.getByText('Tóm tắt khiếu nại')).toBeTruthy();
    expect(screen.getByText('Thông tin khách hàng')).toBeTruthy();
    expect(screen.getByText('Xem không gian xử lý đầy đủ')).toBeTruthy();

    const fullWorkspaceLink = screen.getByRole('link', {
      name: /Xem không gian xử lý đầy đủ/i,
    });
    expect(fullWorkspaceLink.getAttribute('href')).toContain(
      '/admin/reports/aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
    );

    // Close button dismisses Quick Drawer
    const closeBtn = screen.getByLabelText('Đóng bảng tóm tắt');
    fireEvent.click(closeBtn);
    expect(screen.queryByText('Tóm tắt khiếu nại')).toBeNull();
  });

  it('filters complaints by search query', () => {
    const view = createAdminPreviewView('reports', 'ADM-REP-DENSE') as AdminListRouteView;
    render(<AdminReportsScreen view={view} />);

    const searchInput = screen.getByPlaceholderText(
      'Tìm theo mã vé, mã đơn, tên khách hàng, số điện thoại...',
    );
    fireEvent.change(searchInput, { target: { value: 'TK-A101' } });

    expect(screen.getByText('TK-A101')).toBeTruthy();
    expect(screen.queryByText('TK-B102')).toBeNull();
  });

  it('renders empty state gracefully for ADM-REP-NORESULT', () => {
    const view = createAdminPreviewView('reports', 'ADM-REP-NORESULT') as AdminListRouteView;
    render(<AdminReportsScreen view={view} />);

    expect(screen.getByText('Không tìm thấy khiếu nại nào')).toBeTruthy();
  });
});
