import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { WithdrawalsScreen } from './WithdrawalsScreen';
import { browserClient } from '../../lib/api/browser-client';

const pendingRequest = {
  id: 'wr-1',
  driverId: 'driver-1',
  amountVnd: 500000,
  status: 'PENDING' as const,
  bankName: 'MB Bank',
  bankAccountNumber: '0987654321',
  bankAccountName: 'NGUYEN VAN A',
  createdAt: '2026-09-12T08:00:00.000Z',
};

describe('WithdrawalsScreen', () => {
  let getSpy: jest.SpiedFunction<typeof browserClient.get>;
  let postSpy: jest.SpiedFunction<typeof browserClient.post>;

  beforeEach(() => {
    jest.clearAllMocks();
    getSpy = jest.spyOn(browserClient, 'get') as jest.SpiedFunction<typeof browserClient.get>;
    postSpy = jest.spyOn(browserClient, 'post') as jest.SpiedFunction<typeof browserClient.post>;
    getSpy.mockResolvedValue([pendingRequest]);
    postSpy.mockResolvedValue({ success: true });
  });

  it('lists pending withdrawal requests with bank details', async () => {
    render(<WithdrawalsScreen />);

    await waitFor(() => expect(screen.getByText('500.000 ₫')).toBeTruthy());
    expect(screen.getByText('MB Bank')).toBeTruthy();
    expect(screen.getByText(/0987654321/)).toBeTruthy();
  });

  it('approves a request after entering a note', async () => {
    render(<WithdrawalsScreen />);
    await waitFor(() => expect(screen.getByText('500.000 ₫')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Duyệt' }));
    fireEvent.change(screen.getByLabelText('Ghi chú duyệt'), {
      target: { value: 'Đã chuyển khoản thủ công' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận duyệt' }));

    await waitFor(() =>
      expect(postSpy).toHaveBeenCalledWith(
        '/admin/withdrawals/wr-1/approve',
        expect.objectContaining({ note: 'Đã chuyển khoản thủ công' }),
      ),
    );
  });

  it('rejects a note shorter than 5 characters without calling the API', async () => {
    render(<WithdrawalsScreen />);
    await waitFor(() => expect(screen.getByText('500.000 ₫')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Duyệt' }));
    fireEvent.change(screen.getByLabelText('Ghi chú duyệt'), { target: { value: 'ok' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận duyệt' }));

    expect(postSpy).not.toHaveBeenCalled();
    expect(screen.getByText('Lý do phải từ 5 ký tự trở lên')).toBeTruthy();
  });

  it('opens VietQR modal with transfer details and allows fast-forward to approve', async () => {
    render(<WithdrawalsScreen />);
    await waitFor(() => expect(screen.getByText('500.000 ₫')).toBeTruthy());

    // Click "Mã VietQR" button
    fireEvent.click(screen.getByRole('button', { name: /Mã VietQR/i }));

    expect(screen.getByText('Mã VietQR chuyển khoản')).toBeTruthy();
    expect(screen.getByAltText('Mã VietQR chuyển khoản')).toBeTruthy();

    // Click "Đã chuyển, duyệt ngay"
    fireEvent.click(screen.getByRole('button', { name: 'Đã chuyển, duyệt ngay' }));

    // Review dialog should open with prefilled note
    await waitFor(() => expect(screen.getByText('Xác nhận duyệt rút tiền')).toBeTruthy());
    expect(screen.getByDisplayValue('Đã quét VietQR chuyển khoản')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận duyệt' }));

    await waitFor(() =>
      expect(postSpy).toHaveBeenCalledWith(
        '/admin/withdrawals/wr-1/approve',
        expect.objectContaining({ note: 'Đã quét VietQR chuyển khoản' }),
      ),
    );
  });
});
