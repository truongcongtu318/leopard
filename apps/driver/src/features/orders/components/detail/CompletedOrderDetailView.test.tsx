import React from 'react';
import { render } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';
import { CompletedOrderDetailView } from './CompletedOrderDetailView';
import { createDriverDetailFixture } from '../../fixtures';
import type { DriverAssignedDetailView } from '../../model';

describe('CompletedOrderDetailView', () => {
  it('renders completed order receipt without driver action controls', async () => {
    const base = createDriverDetailFixture('D-DETAIL-ACCEPTED') as DriverAssignedDetailView;
    const view: DriverAssignedDetailView = {
      ...base,
      order: {
        ...base.order,
        status: 'DELIVERED',
        reference: 'ORD-COMPLETED-999',
        priceLabel: '350.000 ₫',
      },
    };

    const screen = await render(<CompletedOrderDetailView view={view} />);

    // Shows receipt info
    expect(screen.getByText('ORD-COMPLETED-999')).toBeTruthy();
    expect(screen.getByText('350.000 ₫')).toBeTruthy();

    // Does NOT render active driving controls
    expect(screen.queryByTestId('btn-advance-leg-slide')).toBeNull();
    expect(screen.queryByTestId('btn-open-incident-modal')).toBeNull();
    expect(screen.queryByTestId('btn-capture-cargo-photo')).toBeNull();
    expect(screen.queryByTestId('btn-navigate-active-leg')).toBeNull();

    await screen.unmount();
  });

  it('renders saved e-POD photo and signature when present', async () => {
    const base = createDriverDetailFixture('D-DETAIL-ACCEPTED') as DriverAssignedDetailView;
    const view: DriverAssignedDetailView = {
      ...base,
      order: {
        ...base.order,
        status: 'DELIVERED',
        reference: 'ORD-WITH-EPOD',
      },
      proof: {
        kind: 'persisted',
        label: 'Đã lưu chứng từ',
        message: 'Chứng từ bàn giao hợp lệ',
        fileLabel: 'epod-watermark-123.jpg',
        mediaId: 'media-123',
      },
    };

    const screen = await render(<CompletedOrderDetailView view={view} />);

    expect(screen.getByTestId('epod-saved-receipt')).toBeTruthy();
    expect(screen.getByLabelText('Ảnh chụp bàn giao kiện hàng')).toBeTruthy();
    expect(screen.getByLabelText('Chữ ký người nhận hàng')).toBeTruthy();

    await screen.unmount();
  });
});
