import { describe, expect, it } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';

import { AdminLiveMapScreen } from './AdminLiveMapScreen';
import { createAdminPreviewView } from './fixtures';
import type { AdminLiveMapRouteView } from './model';

describe('AdminLiveMapScreen (Realtime Spatial Fleet Console)', () => {
  it('renders 4 KPI metrics strip and live telemetry panel', () => {
    const view = createAdminPreviewView('live-map', 'ADM-MAP-LIVE') as AdminLiveMapRouteView;
    render(<AdminLiveMapScreen view={view} />);

    expect(screen.getByText('Tài Xế Trực Tuyến')).toBeTruthy();
    expect(screen.getByText('Đang Giao Hàng')).toBeTruthy();
    expect(screen.getByText('Đơn Đang Vận Chuyển')).toBeTruthy();
    expect(screen.getByText('ETA Dự Kiến Trung Bình')).toBeTruthy();
    expect(screen.getByText('Thông Tin Viễn Trắc')).toBeTruthy();
    expect(screen.getAllByText('Nguyễn Văn Hùng').length).toBeGreaterThan(0);
    expect(screen.getByText('••• 4567 · 51D-892.34')).toBeTruthy();
  });

  it('allows toggling dark and light map modes', () => {
    const view = createAdminPreviewView('live-map', 'ADM-MAP-LIVE') as AdminLiveMapRouteView;
    render(<AdminLiveMapScreen view={view} />);

    const modeBtn = screen.getByRole('button', { name: /Bản đồ sáng/i });
    expect(modeBtn).toBeTruthy();

    fireEvent.click(modeBtn);
    expect(screen.getByRole('button', { name: /Bản đồ tối/i })).toBeTruthy();
  });

  it('selects another driver and updates telemetry card', () => {
    const view = createAdminPreviewView('live-map', 'ADM-MAP-LIVE') as AdminLiveMapRouteView;
    render(<AdminLiveMapScreen view={view} />);

    const driverButtons = screen.getAllByRole('button', { name: /Trần Đình Trọng/i });
    expect(driverButtons[0]).toBeDefined();
    fireEvent.click(driverButtons[0]!);

    expect(screen.getByText('••• 5678 · 51D-773.12')).toBeTruthy();
  });

  it('renders simulation badge and notice for ADM-MAP-SIM', () => {
    const view = createAdminPreviewView('live-map', 'ADM-MAP-SIM') as AdminLiveMapRouteView;
    render(<AdminLiveMapScreen view={view} />);

    expect(screen.getAllByText(/Dữ liệu mô phỏng/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Chế độ mô phỏng viễn trắc')).toBeTruthy();
  });
});
