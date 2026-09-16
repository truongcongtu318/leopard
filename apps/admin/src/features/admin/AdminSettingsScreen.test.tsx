import { describe, expect, it } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';

import { AdminSettingsScreen } from './AdminSettingsScreen';
import { createAdminPreviewView } from './fixtures';
import type { AdminSettingsRouteView } from './model';

describe('AdminSettingsScreen (System & Providers Health Console)', () => {
  it('renders system info and 4 core provider integration cards', () => {
    const view = createAdminPreviewView('settings', 'ADM-SET-HEALTHY') as AdminSettingsRouteView;
    render(<AdminSettingsScreen view={view} />);

    expect(screen.getByText('Phiên Bản')).toBeTruthy();
    expect(screen.getByText('v0.9.4-pilot')).toBeTruthy();
    expect(screen.getByText('Cơ Sở Dữ Liệu')).toBeTruthy();
    expect(screen.getByText('Bộ Đệm Realtime')).toBeTruthy();
    expect(screen.getByText('Bản đồ & Định tuyến Vietmap')).toBeTruthy();
    expect(screen.getByText('Xác thực OTP Firebase Phone Auth')).toBeTruthy();
    expect(screen.getByText('Lưu trữ tài liệu & Bằng chứng S3')).toBeTruthy();
    expect(screen.getByText('Cổng thanh toán tự động VietQR / payOS')).toBeTruthy();
  });

  it('triggers ping check and displays latency result', () => {
    const view = createAdminPreviewView('settings', 'ADM-SET-HEALTHY') as AdminSettingsRouteView;
    render(<AdminSettingsScreen view={view} />);

    const pingBtn = screen.getByRole('button', { name: /Kiểm tra kết nối tức thời/i });
    fireEvent.click(pingBtn);

    expect(screen.getByText(/Đã kiểm tra kết nối/i)).toBeTruthy();
  });

  it('renders simulation badge and notice for ADM-SET-DEMO', () => {
    const view = createAdminPreviewView('settings', 'ADM-SET-DEMO') as AdminSettingsRouteView;
    render(<AdminSettingsScreen view={view} />);

    expect(screen.getAllByText(/Dữ liệu mô phỏng/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Cảnh báo cấu hình hệ thống')).toBeTruthy();
  });
});
