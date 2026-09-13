import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import {
  BookingDetailsModal,
  formatVnd,
  type BookingDetails,
} from './BookingDetailsModal';

describe('BookingDetailsModal', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    pickupAddress: '120 Trường Chinh, Tân Bình, TP.HCM',
    dropoffAddress: '1 Nguyễn Huệ, Quận 1, TP.HCM',
    vehicleName: 'Xe tải 1.25 Tấn',
    vehicleDimensions: '3.1 x 1.6 x 1.7m',
    basePrice: 250000,
  };

  it('renders vehicle name, vehicle dimensions, and initial base price on CTA', async () => {
    const screen = await render(<BookingDetailsModal {...defaultProps} />);

    expect(screen.getByText('Chi tiết chuyến hàng')).toBeTruthy();
    expect(screen.getByText('Xe tải 1.25 Tấn • 3.1 x 1.6 x 1.7m')).toBeTruthy();
    expect(screen.getByText('120 Trường Chinh, Tân Bình, TP.HCM')).toBeTruthy();
    expect(screen.getByText('1 Nguyễn Huệ, Quận 1, TP.HCM')).toBeTruthy();

    // Base price = 250,000 -> formatted: 250.000 ₫
    expect(
      screen.getByText(`XÁC NHẬN GỌI XE · ${formatVnd(250000)} ➔`),
    ).toBeTruthy();

    await screen.unmount();
  });

  it('prefills receiver name and phone when provided', async () => {
    const screen = await render(
      <BookingDetailsModal
        {...defaultProps}
        initialReceiverName="Nguyễn Văn A"
        initialReceiverPhone="0901234567"
      />,
    );

    const nameInput = screen.getByLabelText('Tên người nhận hàng');
    const phoneInput = screen.getByLabelText('Số điện thoại người nhận hàng');

    expect(nameInput.props.value).toBe('Nguyễn Văn A');
    expect(phoneInput.props.value).toBe('0901234567');

    await screen.unmount();
  });

  it('toggles bốc xếp (+120k) and VAT (8%), verifying price recalculation', async () => {
    const basePrice = 200000;
    const screen = await render(
      <BookingDetailsModal {...defaultProps} basePrice={basePrice} />,
    );

    // Initial totalFare = 200,000
    expect(
      screen.getByText(`XÁC NHẬN GỌI XE · ${formatVnd(200000)} ➔`),
    ).toBeTruthy();

    // Toggle bốc xếp (+120,000) -> 320,000
    const loadingToggle = screen.getByLabelText('Tài xế hỗ trợ bốc xếp 2 đầu');
    await fireEvent.press(loadingToggle);

    expect(
      screen.getByText(`XÁC NHẬN GỌI XE · ${formatVnd(320000)} ➔`),
    ).toBeTruthy();

    // Toggle VAT (8% of 200,000 = 16,000) -> 336,000
    const vatToggle = screen.getByLabelText('Xuất hóa đơn VAT điện tử (8%)');
    await fireEvent.press(vatToggle);

    expect(
      screen.getByText(`XÁC NHẬN GỌI XE · ${formatVnd(336000)} ➔`),
    ).toBeTruthy();

    // Untoggle bốc xếp -> 200,000 + 16,000 = 216,000
    await fireEvent.press(loadingToggle);

    expect(
      screen.getByText(`XÁC NHẬN GỌI XE · ${formatVnd(216000)} ➔`),
    ).toBeTruthy();

    await screen.unmount();
  });

  it('toggles payment method from VIETQR to CASH', async () => {
    const screen = await render(<BookingDetailsModal {...defaultProps} />);

    const vietqrRadio = screen.getByLabelText('Chuyển khoản VietQR payOS');
    const cashRadio = screen.getByLabelText('Tiền mặt khi nhận hàng');

    expect(vietqrRadio.props.accessibilityState.checked).toBe(true);
    expect(cashRadio.props.accessibilityState.checked).toBe(false);

    await fireEvent.press(cashRadio);

    expect(vietqrRadio.props.accessibilityState.checked).toBe(false);
    expect(cashRadio.props.accessibilityState.checked).toBe(true);

    await screen.unmount();
  });

  it('invokes onConfirm with all updated fields on CTA press', async () => {
    const onConfirm = jest.fn();
    const screen = await render(
      <BookingDetailsModal
        {...defaultProps}
        basePrice={300000}
        onConfirm={onConfirm}
      />,
    );

    // Edit receiver details
    const nameInput = screen.getByLabelText('Tên người nhận hàng');
    const phoneInput = screen.getByLabelText('Số điện thoại người nhận hàng');
    await fireEvent.changeText(nameInput, 'Trần Thị B');
    await fireEvent.changeText(phoneInput, '0988776655');

    // Select category chip: 'Nội thất'
    const furnitureChip = screen.getByLabelText('Nội thất');
    await fireEvent.press(furnitureChip);

    // Enter cargo note
    const noteInput = screen.getByLabelText('Ghi chú cho tài xế');
    await fireEvent.changeText(noteInput, 'Hàng dễ vỡ, bốc cẩn thận');

    // Enable bốc xếp (+120k)
    await fireEvent.press(screen.getByLabelText('Tài xế hỗ trợ bốc xếp 2 đầu'));

    // Select CASH
    await fireEvent.press(screen.getByLabelText('Tiền mặt khi nhận hàng'));

    // Base: 300,000 + Loading: 120,000 = 420,000
    const cta = screen.getByLabelText(
      `XÁC NHẬN GỌI XE · ${formatVnd(420000)}`,
    );
    await fireEvent.press(cta);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith({
      receiverName: 'Trần Thị B',
      receiverPhone: '0988776655',
      cargoCategory: 'Nội thất',
      cargoNote: 'Hàng dễ vỡ, bốc cẩn thận',
      hasLoadingSupport: true,
      hasVatInvoice: false,
      paymentMethod: 'CASH',
      totalFare: 420000,
    } satisfies BookingDetails);

    await screen.unmount();
  });

  it('invokes onClose on close button and backdrop press', async () => {
    const onClose = jest.fn();
    const screen = await render(
      <BookingDetailsModal {...defaultProps} onClose={onClose} />,
    );

    const closeBtn = screen.getByLabelText('Đóng modal chi tiết');
    await fireEvent.press(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    const backdrop = screen.getByLabelText('Đóng chi tiết chuyến hàng');
    await fireEvent.press(backdrop);
    expect(onClose).toHaveBeenCalledTimes(2);

    await screen.unmount();
  });
});
