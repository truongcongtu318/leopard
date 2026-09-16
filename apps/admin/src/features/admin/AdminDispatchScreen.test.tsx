import { describe, expect, it } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';

import { AdminDispatchScreen } from './AdminDispatchScreen';
import { createAdminPreviewView } from './fixtures';
import type { AdminDispatchRouteView } from './model';

describe('AdminDispatchScreen (Operations Dispatch Center)', () => {
  it('renders dispatch queue with stuck orders and waiting time badges', () => {
    const view = createAdminPreviewView('dispatch', 'ADM-DSP-DENSE') as AdminDispatchRouteView;
    render(<AdminDispatchScreen view={view} />);

    expect(screen.getByText('Đơn hàng chờ điều phối')).toBeTruthy();
    expect(screen.getByText('LP-DSP-260815-01')).toBeTruthy();
    expect(screen.getByText('Chờ 18 phút')).toBeTruthy();
    expect(screen.getByText('Chờ 35 phút')).toBeTruthy();
  });

  it('renders candidate drivers with masked phone and "ETA dự kiến" label', () => {
    const view = createAdminPreviewView('dispatch', 'ADM-DSP-DENSE') as AdminDispatchRouteView;
    render(<AdminDispatchScreen view={view} />);

    expect(screen.getByText('Đề xuất tài xế phù hợp')).toBeTruthy();
    expect(screen.getByText('Nguyễn Văn Hùng')).toBeTruthy();
    expect(screen.getByText('••• 4567')).toBeTruthy();
    expect(screen.getAllByText(/ETA dự kiến/i).length).toBeGreaterThan(0);
  });

  it('opens manual reassignment modal and validates reason >= 5 chars', () => {
    const view = createAdminPreviewView('dispatch', 'ADM-DSP-DENSE') as AdminDispatchRouteView;
    render(<AdminDispatchScreen view={view} />);

    const assignBtns = screen.getAllByRole('button', { name: /Gán tài xế/i });
    expect(assignBtns.length).toBeGreaterThan(0);
    fireEvent.click(assignBtns[0]!);

    // Reassignment modal is open
    expect(screen.getByText('Xác nhận gán tài xế')).toBeTruthy();
    const reasonInput = screen.getByPlaceholderText(/Nhập lý do điều phối/i);
    const confirmBtn = screen.getByRole('button', { name: /Xác nhận điều phối/i });

    // Try submitting with invalid reason
    fireEvent.change(reasonInput, { target: { value: 'abc' } });
    expect(confirmBtn.hasAttribute('disabled')).toBe(true);

    // Valid reason
    fireEvent.change(reasonInput, {
      target: { value: 'Điều phối ưu tiên khách VIP giao gấp' },
    });
    expect(confirmBtn.hasAttribute('disabled')).toBe(false);

    fireEvent.click(confirmBtn);

    // Modal closes and success message appears
    expect(screen.getByText(/Đã điều phối thành công đơn/i)).toBeTruthy();
  });

  it('renders empty queue state for ADM-DSP-EMPTY', () => {
    const view = createAdminPreviewView('dispatch', 'ADM-DSP-EMPTY') as AdminDispatchRouteView;
    render(<AdminDispatchScreen view={view} />);

    expect(screen.getByText('Hàng đợi điều phối sạch sẽ')).toBeTruthy();
  });
});
