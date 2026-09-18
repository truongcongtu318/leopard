import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { CancelOrderConfirmModal } from './CancelOrderConfirmModal';

describe('CancelOrderConfirmModal', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    onConfirmCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal content correctly when visible', async () => {
    const screen = await render(<CancelOrderConfirmModal {...defaultProps} />);

    expect(screen.getByText('Xác nhận hủy tìm xe?')).toBeTruthy();
    expect(screen.getByText('CHÍNH SÁCH BẢO VỆ ESCROW')).toBeTruthy();
    expect(
      screen.getByText(
        'Hoàn cọc 100% tức thì về ví hoặc tài khoản ngân hàng của bạn theo chính sách bảo vệ quyền lợi khách hàng LEOPARD.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Bạn có thể tạo lại cuốc xe mới bất kỳ lúc nào mà không phát sinh thêm phí.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Tiếp tục tìm xe')).toBeTruthy();
    expect(screen.getByText('Xác nhận hủy và hoàn tiền')).toBeTruthy();

    await screen.unmount();
  });

  it('calls onClose when "Tiếp tục tìm xe" is pressed', async () => {
    const screen = await render(<CancelOrderConfirmModal {...defaultProps} />);

    const keepSearchingBtn = screen.getByTestId('btn-keep-searching');
    await fireEvent.press(keepSearchingBtn);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });

  it('calls onConfirmCancel when "Xác nhận hủy và hoàn tiền" is pressed', async () => {
    const screen = await render(<CancelOrderConfirmModal {...defaultProps} />);

    const cancelBtn = screen.getByTestId('btn-confirm-cancel');
    await fireEvent.press(cancelBtn);

    expect(defaultProps.onConfirmCancel).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });

  it('calls onClose when backdrop is pressed', async () => {
    const screen = await render(<CancelOrderConfirmModal {...defaultProps} />);

    const backdrop = screen.getByTestId('backdrop-dismiss');
    await fireEvent.press(backdrop);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });

  it('displays loading state and disables buttons when isCancelling is true', async () => {
    const screen = await render(
      <CancelOrderConfirmModal {...defaultProps} isCancelling={true} />,
    );

    expect(screen.getByText('Đang xử lý hủy...')).toBeTruthy();

    const cancelBtn = screen.getByTestId('btn-confirm-cancel');
    await fireEvent.press(cancelBtn);
    // Button is disabled, onConfirmCancel should not be called
    expect(defaultProps.onConfirmCancel).not.toHaveBeenCalled();

    await screen.unmount();
  });
});
