import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import { CashCollectionReceiptView } from './CashCollectionReceiptView';
import { createDriverDetailFixture } from '../../fixtures';
import type { DriverAssignedDetailView } from '../../model';

describe('CashCollectionReceiptView', () => {
  const createTestView = (): DriverAssignedDetailView => {
    const base = createDriverDetailFixture('D-DETAIL-TERMINAL-DELIVERED') as DriverAssignedDetailView;
    return {
      ...base,
      order: {
        ...base.order,
        status: 'DELIVERED',
        reference: 'LP-15908976',
        priceLabel: '183.312 ₫',
        priceVnd: 183312,
        paymentMethod: 'CASH',
        paymentStatus: 'PENDING',
        isCashConfirmed: false,
        customerContact: 'Khách hàng: Anh Minh Khang · 0912 345 678',
      },
    };
  };

  it('renders cash collection hero amount, reference and breakdown', async () => {
    const view = createTestView();
    await render(<CashCollectionReceiptView view={view} />);

    // Container & Hero amount
    expect(screen.getByTestId('cash-collection-container')).toBeTruthy();
    expect(screen.getByTestId('cash-amount-to-collect')).toBeTruthy();
    expect(screen.getAllByText('183.312 ₫').length).toBeGreaterThanOrEqual(1);

    // Order reference & Pending badge
    expect(screen.getByText('Mã đơn #LP-15908976')).toBeTruthy();
    expect(screen.getByText('Chưa thu COD')).toBeTruthy();

    // Fare breakdown & Contact
    expect(screen.getByText('Chi tiết cước đơn hàng')).toBeTruthy();
    expect(screen.getByText('TỔNG TIỀN MẶT CẦN THU')).toBeTruthy();
    expect(screen.getByText('Khách hàng: Anh Minh Khang · 0912 345 678')).toBeTruthy();
    expect(screen.getByTestId('btn-call-recipient')).toBeTruthy();
  });

  it('triggers onConfirmCashPayment when confirm button is pressed', async () => {
    const view = createTestView();
    const onConfirm = jest.fn();

    await render(
      <CashCollectionReceiptView
        onConfirmCashPayment={onConfirm}
        view={view}
      />,
    );

    const confirmBtn = screen.getByTestId('btn-confirm-cash');
    expect(confirmBtn).toBeTruthy();
    fireEvent.press(confirmBtn);

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('opens and closes VietQR quick modal', async () => {
    const view = createTestView();
    await render(<CashCollectionReceiptView view={view} />);

    const openQrBtn = screen.getByTestId('btn-open-vietqr-helper');
    expect(openQrBtn).toBeTruthy();
    fireEvent.press(openQrBtn);

    await waitFor(() => {
      expect(screen.getByText('Mã VietQR chuyển khoản')).toBeTruthy();
      expect(screen.getByText('MBBank (Quân Đội)')).toBeTruthy();
    });

    const closeBtn = screen.getByText('Đóng mã QR');
    fireEvent.press(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText('Mã VietQR chuyển khoản')).toBeNull();
    });
  });

  it('triggers onOpenIncidentModal when reporting issue', async () => {
    const view = createTestView();
    const onOpenIncidentModal = jest.fn();

    await render(
      <CashCollectionReceiptView
        onOpenIncidentModal={onOpenIncidentModal}
        view={view}
      />,
    );

    const reportBtn = screen.getByTestId('btn-open-incident-from-cash');
    expect(reportBtn).toBeTruthy();
    fireEvent.press(reportBtn);

    expect(onOpenIncidentModal).toHaveBeenCalledTimes(1);
  });
});
