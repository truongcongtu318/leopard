import { describe, expect, it } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';

import { AdminPricingScreen } from './AdminPricingScreen';
import { createAdminPreviewView } from './fixtures';
import type { AdminPricingRouteView } from './model';

describe('AdminPricingScreen (Dynamic Pricing Table Editor)', () => {
  it('renders current pricing config with vehicle rates and surcharges', () => {
    const view = createAdminPreviewView('pricing', 'ADM-PRC-CURRENT') as AdminPricingRouteView;
    render(<AdminPricingScreen view={view} />);

    expect(screen.getByText('Biểu Phí Đang Áp Dụng')).toBeTruthy();
    expect(screen.getByText('Cước Tối Thiểu / Chuyến')).toBeTruthy();
    expect(screen.getByText('Phụ Phí Thêm Điểm Dừng')).toBeTruthy();
    expect(screen.getByText('Xe Máy Giao Hàng')).toBeTruthy();
    expect(screen.getByText('Xe Van 500kg - 1000kg')).toBeTruthy();
    expect(screen.getByText('Xe Tải 1.5 Tấn - 2.5 Tấn')).toBeTruthy();
  });

  it('enters draft editing mode and allows modifying rates', () => {
    const view = createAdminPreviewView('pricing', 'ADM-PRC-CURRENT') as AdminPricingRouteView;
    render(<AdminPricingScreen view={view} />);

    const editBtn = screen.getByRole('button', { name: /Điều chỉnh biểu phí/i });
    fireEvent.click(editBtn);

    // Editing mode controls appear
    expect(screen.getByRole('button', { name: /Hủy bỏ/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Xem trước chênh lệch & Ban hành/i })).toBeTruthy();
  });

  it('opens diffs preview modal and requires reason >= 5 chars to publish', () => {
    const view = createAdminPreviewView('pricing', 'ADM-PRC-CURRENT') as AdminPricingRouteView;
    render(<AdminPricingScreen view={view} />);

    const editBtn = screen.getByRole('button', { name: /Điều chỉnh biểu phí/i });
    fireEvent.click(editBtn);

    // Modify a rate
    const inputs = screen.getAllByDisplayValue('12000');
    expect(inputs.length).toBeGreaterThan(0);
    fireEvent.change(inputs[0]!, { target: { value: '14000' } });

    const previewDiffBtn = screen.getByRole('button', { name: /Xem trước chênh lệch & Ban hành/i });
    fireEvent.click(previewDiffBtn);

    // Diff modal opens
    expect(screen.getByText('Bản Xem Trước Chênh Lệch Biểu Phí')).toBeTruthy();

    const reasonInput = screen.getByPlaceholderText(/Điều chỉnh theo biến động giá xăng dầu/i);
    const publishBtn = screen.getByRole('button', { name: /Xác nhận & Ban hành biểu phí/i });

    // Invalid reason (< 5 chars)
    fireEvent.change(reasonInput, { target: { value: 'test' } });
    expect(publishBtn.hasAttribute('disabled')).toBe(true);

    // Valid reason
    fireEvent.change(reasonInput, { target: { value: 'Điều chỉnh cước theo giá xăng dầu tăng quý 3' } });
    expect(publishBtn.hasAttribute('disabled')).toBe(false);

    fireEvent.click(publishBtn);

    // Success notice appears
    expect(screen.getByText(/Đã lưu và áp dụng biểu phí cước vận hành mới/i)).toBeTruthy();
  });

  it('renders preview scenario ADM-PRC-PREVIEW with info notice', () => {
    const view = createAdminPreviewView('pricing', 'ADM-PRC-PREVIEW') as AdminPricingRouteView;
    render(<AdminPricingScreen view={view} />);

    expect(screen.getByText('Bản xem trước thay đổi cước phí')).toBeTruthy();
  });
});
