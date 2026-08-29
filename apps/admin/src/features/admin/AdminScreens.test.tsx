import { describe, expect, it } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';

import { AdminListScreen } from './AdminListScreen';
import { AdminOrderDetailScreen } from './AdminOrderDetailScreen';
import { AdminOverviewScreen } from './AdminOverviewScreen';
import { createAdminPreviewView } from './fixtures';

describe('Admin static operations screens', () => {
  it('renders readiness, zero-safe metrics, exceptions and recent orders on overview', () => {
    render(<AdminOverviewScreen view={createAdminPreviewView('overview', 'ADM-OV-READY')} />);

    expect(screen.getByRole('heading', { name: 'Tổng quan vận hành' })).toBeTruthy();
    expect(screen.getByText('Liveness')).toBeTruthy();
    expect(screen.getByText('Readiness')).toBeTruthy();
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Ngoại lệ cần điều tra' })).toBeTruthy();
    expect(screen.getAllByText('LP-A-260815-101').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Bàn điều phối hiện tại').className).toContain('from-neutral-text');
    expect(screen.getByText('Tracking cần kiểm tra').closest('li')?.className).toContain(
      'rounded-xl',
    );
  });

  it('keeps operational context for readiness and offline overview scenarios', () => {
    for (const [scenario, copy] of [
      ['ADM-OV-READINESS', 'Hệ thống chưa sẵn sàng'],
      ['ADM-OV-OFFLINE', 'Mất kết nối hệ thống'],
    ] as const) {
      const rendered = render(
        <AdminOverviewScreen view={createAdminPreviewView('overview', scenario)} />,
      );
      expect(screen.getByText(copy)).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'Ngoại lệ cần điều tra' })).toBeTruthy();
      rendered.unmount();
    }
  });

  it('never mounts private descendants in permission-denied state', () => {
    render(<AdminOrderDetailScreen view={createAdminPreviewView('order-detail', 'ADM-DENIED')} />);
    expect(screen.getByText('Bạn không có quyền xem dữ liệu này')).toBeTruthy();
    expect(screen.queryByText(/LP-A-/)).toBeNull();
    expect(screen.queryByText('Audit Rail')).toBeNull();
  });

  it('renders all canonical Order states in table and responsive rows', () => {
    render(<AdminListScreen screen="orders" view={createAdminPreviewView('orders', 'ADM-ORD-DENSE')} />);

    expect(screen.getByRole('search', { name: 'Lọc đơn hàng' })).toBeTruthy();
    expect(
      screen.getByRole('searchbox', { name: /Tìm nhanh trong phiên/ }).getAttribute('name'),
    ).toBeNull();
    expect(screen.getAllByText('Chờ tài xế').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Đã nhận đơn').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Đang đến điểm lấy').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Đang vận chuyển').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Đã giao').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Đã hủy').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Kết quả đơn hàng dạng hàng responsive')).toBeTruthy();
    const filterScope = screen.getByLabelText('Phạm vi điều tra đơn hàng');
    const resultLedger = screen.getByLabelText('Sổ kết quả đơn hàng');
    expect(
      filterScope.compareDocumentPosition(resultLedger) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('keeps preview context on Order links without serializing raw PII', () => {
    render(
      <AdminListScreen
        previewContext={{
          preview: 'enabled',
          scenario: 'ADM-ORD-DENSE',
          rawSearch: '0909 123 456',
        }}
        screen="orders"
        view={createAdminPreviewView('orders', 'ADM-ORD-DENSE')}
      />,
    );

    const links = screen.getAllByRole('link', { name: 'Xem đơn LP-A-260815-104' });
    for (const link of links) {
      expect(link.getAttribute('href')).toBe(
        '/admin/orders/33333333-3333-4333-8333-333333333104?preview=enabled&scenario=ADM-ORD-DETAIL',
      );
      expect(link.getAttribute('href')).not.toContain('0909');
    }
  });

  it('keeps filter recovery visible when Orders return no results', () => {
    render(<AdminListScreen screen="orders" view={createAdminPreviewView('orders', 'ADM-ORD-NORESULT')} />);
    expect(screen.getByText('Không tìm thấy đơn hàng')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Xóa bộ lọc' })).toBeTruthy();
  });

  it('renders masked Users and only capability-provided commands', () => {
    render(<AdminListScreen screen="users" view={createAdminPreviewView('users', 'ADM-USR-DENSE')} />);

    expect(screen.getAllByText('••• ••• 1234').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Vô hiệu hóa người dùng' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Kích hoạt lại người dùng' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Xóa người dùng/ })).toBeNull();
  });

  it('uses primary treatment for non-destructive enable commands', () => {
    render(
      <AdminListScreen
        screen="users"
        view={createAdminPreviewView('users', 'ADM-CMD-INVALID', 'ENABLE_USER')}
      />,
    );

    const submit = screen.getByRole('button', { name: 'Kích hoạt lại người dùng' });
    expect(submit.className).toContain('bg-brand');
    expect(submit.className).not.toContain('bg-danger');
    expect(
      (screen.getByRole('textbox', { name: /Lý do kích hoạt lại/ }) as HTMLTextAreaElement).value,
    ).toBe('abc');
  });

  it('keeps Fleets read-only and distinguishes empty membership from an error', () => {
    render(<AdminListScreen screen="fleets" view={createAdminPreviewView('fleets', 'ADM-FLT-EMPTY')} />);
    expect(screen.getAllByText('Chưa có thành viên đang tham gia; đây không phải lỗi tải dữ liệu.').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /mời|gỡ|vô hiệu hóa/i })).toBeNull();
    expect(screen.queryByText(/Fleet đang hoạt động/i)).toBeNull();
  });

  it('keeps Driver account, availability and membership states distinct', () => {
    render(<AdminListScreen screen="drivers" view={createAdminPreviewView('drivers', 'ADM-DRV-MIXED')} />);
    expect(screen.getAllByText('Đang hoạt động').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Đang bận').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Đang tham gia').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /Xem đơn LP-A-260815-104/ }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /availability|nhận đơn|cập nhật trạng thái/i })).toBeNull();
    expect(
      screen.getByRole('columnheader', { name: 'Thành viên đội xe' }).className,
    ).toContain('hidden lg:table-cell');
  });

  it('renders the investigation workspace, demo ETA, media metadata and Audit Rail', () => {
    render(<AdminOrderDetailScreen view={createAdminPreviewView('order-detail', 'ADM-ORD-DETAIL')} />);
    expect(screen.getByRole('heading', { name: 'Đơn LP-A-260815-101' })).toBeTruthy();
    expect(screen.getByText(/ETA dự kiến/)).toBeTruthy();
    expect(screen.getByText(/Dữ liệu mô phỏng/)).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Tracking và vị trí gần nhất' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Media evidence' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Audit Rail' })).toBeTruthy();
    expect(screen.getByText('req-admin-demo-001')).toBeTruthy();
    expect(screen.queryByText(/https?:\/\//)).toBeNull();
    expect(screen.getByLabelText('Ngữ cảnh điều phối hiện tại').className).toContain(
      'bg-neutral-text',
    );
    expect(screen.getByLabelText('Audit Rail — thao tác đặc quyền').className).toContain(
      'border-l-4',
    );
  });

  it('renders stale tracking and keeps authorized investigation context', () => {
    render(<AdminOrderDetailScreen view={createAdminPreviewView('order-detail', 'ADM-TRK-STALE')} />);
    expect(screen.getByText('Tracking cần làm mới')).toBeTruthy();
    expect(screen.getByText('Dữ liệu bản đồ có thể đã cũ')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Audit Rail' })).toBeTruthy();
  });

  it('shows persisted command success and its matching audit receipt', () => {
    render(
      <AdminOrderDetailScreen
        view={createAdminPreviewView(
          'order-detail',
          'ADM-CMD-SUCCESS',
          'CONFIRM_MANUAL_PAYMENT',
        )}
      />,
    );
    expect(screen.getByRole('status').textContent).toContain('Scenario persisted response');
    expect(screen.getAllByText('Đã xác nhận thanh toán').length).toBeGreaterThan(0);
    expect(screen.getByText('req-admin-demo-009')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
