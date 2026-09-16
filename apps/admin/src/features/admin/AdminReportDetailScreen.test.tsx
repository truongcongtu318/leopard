import { describe, expect, it } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';

import { AdminReportDetailScreen } from './AdminReportDetailScreen';
import { createAdminPreviewView } from './fixtures';
import type { AdminReportDetailRouteView } from './model';

describe('AdminReportDetailScreen (Case Workspace)', () => {
  it('renders 2-column Bento workspace with complaint context and customer info', () => {
    const view = createAdminPreviewView(
      'report-detail',
      'ADM-REP-DETAIL',
      null,
      'rep-001',
    ) as AdminReportDetailRouteView;
    render(<AdminReportDetailScreen view={view} />);

    expect(screen.getByText('Mã vé khiếu nại')).toBeTruthy();
    expect(screen.getAllByText('TK-A101').length).toBeGreaterThan(0);
    expect(screen.getByText('Thông tin khách hàng phản ánh')).toBeTruthy();
    expect(screen.getByText('Nguyễn Văn Khách')).toBeTruthy();
  });

  it('renders related order context with route and assigned driver', () => {
    const view = createAdminPreviewView(
      'report-detail',
      'ADM-REP-DETAIL',
      null,
      'rep-001',
    ) as AdminReportDetailRouteView;
    render(<AdminReportDetailScreen view={view} />);

    expect(screen.getByText('Ngữ cảnh đơn hàng liên quan')).toBeTruthy();
    expect(screen.getByText('LP-A-260815-101')).toBeTruthy();
    expect(screen.getByText('Tài xế giao hàng:')).toBeTruthy();
    expect(screen.getByText('Lê Văn Cường')).toBeTruthy();
  });

  it('allows adding internal investigation notes', () => {
    const view = createAdminPreviewView(
      'report-detail',
      'ADM-REP-DETAIL',
      null,
      'rep-001',
    ) as AdminReportDetailRouteView;
    render(<AdminReportDetailScreen view={view} />);

    const noteInput = screen.getByPlaceholderText(
      'Thêm ghi chú điều tra nội bộ (chỉ hiển thị cho điều phối & CSKH)...',
    );
    const submitBtn = screen.getByRole('button', { name: /Gửi ghi chú/i });

    fireEvent.change(noteInput, { target: { value: 'Đã gọi điện xác minh với kho hoàn tất' } });
    fireEvent.click(submitBtn);

    expect(screen.getByText('Đã gọi điện xác minh với kho hoàn tất')).toBeTruthy();
  });

  it('validates resolution note minimum length (>= 5 characters)', () => {
    const view = createAdminPreviewView(
      'report-detail',
      'ADM-REP-DETAIL',
      null,
      'rep-001',
    ) as AdminReportDetailRouteView;
    render(<AdminReportDetailScreen view={view} />);

    const textarea = screen.getByPlaceholderText(/Mô tả hướng xử lý/i);
    const resolveBtn = screen.getByRole('button', {
      name: /Xác nhận giải quyết khiếu nại/i,
    });

    // Enter less than 5 characters
    fireEvent.change(textarea, { target: { value: 'ok' } });
    expect(resolveBtn.hasAttribute('disabled')).toBe(true);

    // Enter valid >= 5 characters
    fireEvent.change(textarea, {
      target: { value: 'Đã hoàn 50.000đ bồi thường cho khách hàng' },
    });
    expect(resolveBtn.hasAttribute('disabled')).toBe(false);

    fireEvent.click(resolveBtn);
    expect(screen.getByText(/Đã chuyển trạng thái khiếu nại thành "Đã giải quyết"/i)).toBeTruthy();
  });
});
