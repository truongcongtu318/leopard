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

  it('toggles bốc xếp (+150k cho xe tải 1.25T) and VAT (8%), verifying price recalculation', async () => {
    const basePrice = 200000;
    const screen = await render(
      <BookingDetailsModal {...defaultProps} basePrice={basePrice} />,
    );

    // Initial totalFare = 200,000
    expect(
      screen.getByText(`XÁC NHẬN GỌI XE · ${formatVnd(200000)} ➔`),
    ).toBeTruthy();
    expect(screen.getByText('+150.000 ₫')).toBeTruthy();

    // Toggle bốc xếp (+150,000) -> 350,000
    const loadingToggle = screen.getByLabelText('Tài xế hỗ trợ bốc xếp 2 đầu');
    await fireEvent.press(loadingToggle);

    expect(
      screen.getByText(`XÁC NHẬN GỌI XE · ${formatVnd(350000)} ➔`),
    ).toBeTruthy();

    // Toggle VAT (8% of (200,000 + 150,000) = 28,000) -> 378,000
    const vatToggle = screen.getByLabelText('Xuất hóa đơn VAT điện tử (8%)');
    await fireEvent.press(vatToggle);

    expect(
      screen.getByText(`XÁC NHẬN GỌI XE · ${formatVnd(378000)} ➔`),
    ).toBeTruthy();

    // Untoggle bốc xếp -> 200,000 + 16,000 (8% VAT trên 200,000) = 216,000
    await fireEvent.press(loadingToggle);

    expect(
      screen.getByText(`XÁC NHẬN GỌI XE · ${formatVnd(216000)} ➔`),
    ).toBeTruthy();

    await screen.unmount();
  });

  it('shows stop count pill and surcharge when stops are provided', async () => {
    const screen = await render(
      <BookingDetailsModal
        {...defaultProps}
        basePrice={250000}
        stops={[
          { id: 'stop-1', address: 'Chợ An Đông, Quận 5' },
          { id: 'stop-2', address: 'Chợ Tân Định, Quận 1' },
        ]}
      />,
    );

    expect(screen.getByTestId('modal-stop-count-pill')).toBeTruthy();
    expect(screen.getByText('+2 điểm dừng')).toBeTruthy();

    expect(
      screen.getByText(`XÁC NHẬN GỌI XE · ${formatVnd(310000)} ➔`),
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

  it('blocks confirm and displays error when cargo image is missing', async () => {
    const onConfirm = jest.fn();
    const screen = await render(
      <BookingDetailsModal
        {...defaultProps}
        basePrice={300000}
        onConfirm={onConfirm}
      />,
    );

    const cta = screen.getByLabelText(
      `XÁC NHẬN GỌI XE · ${formatVnd(300000)}`,
    );
    await fireEvent.press(cta);

    expect(onConfirm).not.toHaveBeenCalled();
    expect(
      screen.getByText('Vui lòng chụp hoặc tải ảnh hàng hóa (Bắt buộc).'),
    ).toBeTruthy();

    await screen.unmount();
  });

  it('invokes onConfirm with all updated fields on CTA press when image is present', async () => {
    const onConfirm = jest.fn();
    const screen = await render(
      <BookingDetailsModal
        {...defaultProps}
        basePrice={300000}
        initialCargoImageUri="file:///test-cargo.jpg"
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

    // Enable bốc xếp (+150k for 1.25T)
    await fireEvent.press(screen.getByLabelText('Tài xế hỗ trợ bốc xếp 2 đầu'));

    // Select CASH
    await fireEvent.press(screen.getByLabelText('Tiền mặt khi nhận hàng'));

    // Base: 300,000 + Loading: 150,000 = 450,000
    const cta = screen.getByLabelText(
      `XÁC NHẬN GỌI XE · ${formatVnd(450000)}`,
    );
    await fireEvent.press(cta);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith({
      receiverName: 'Trần Thị B',
      receiverPhone: '0988776655',
      cargoCategory: 'Nội thất',
      cargoNote: 'Hàng dễ vỡ, bốc cẩn thận',
      cargoImageUri: 'file:///test-cargo.jpg',
      hasLoadingSupport: true,
      hasVatInvoice: false,
      paymentMethod: 'CASH',
      totalFare: 450000,
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

  it('uses explicitly provided loadingFee prop', async () => {
    const screen = await render(
      <BookingDetailsModal
        {...defaultProps}
        basePrice={200000}
        loadingFee={80000}
      />,
    );

    expect(screen.getByText('+80.000 ₫')).toBeTruthy();

    const loadingToggle = screen.getByLabelText('Tài xế hỗ trợ bốc xếp 2 đầu');
    await fireEvent.press(loadingToggle);

    expect(
      screen.getByText(`XÁC NHẬN GỌI XE · ${formatVnd(280000)} ➔`),
    ).toBeTruthy();

    await screen.unmount();
  });

  it.each([
    { vehicleName: 'Xe Ba Gác', expectedFee: '+60.000 ₫', feeAmount: 60000 },
    { vehicleName: 'Van 500kg', expectedFee: '+100.000 ₫', feeAmount: 100000 },
    { vehicleName: 'Xe Tải 1.25T', expectedFee: '+150.000 ₫', feeAmount: 150000 },
    { vehicleName: 'Xe Tải 2.5T', expectedFee: '+250.000 ₫', feeAmount: 250000 },
    { vehicleName: 'Xe Khác', expectedFee: '+120.000 ₫', feeAmount: 120000 },
  ])('defaults loadingFee based on vehicleName: $vehicleName -> $expectedFee', async ({ vehicleName, expectedFee, feeAmount }) => {
    const screen = await render(
      <BookingDetailsModal
        {...defaultProps}
        basePrice={200000}
        vehicleName={vehicleName}
      />,
    );

    expect(screen.getByText(expectedFee)).toBeTruthy();

    const loadingToggle = screen.getByLabelText('Tài xế hỗ trợ bốc xếp 2 đầu');
    await fireEvent.press(loadingToggle);

    expect(
      screen.getByText(`XÁC NHẬN GỌI XE · ${formatVnd(200000 + feeAmount)} ➔`),
    ).toBeTruthy();

    await screen.unmount();
  });

  it('renders Cheetah Golden Amber voucher section, applies voucher and deducts from total fare', async () => {
    const onConfirm = jest.fn();
    const screen = await render(
      <BookingDetailsModal
        {...defaultProps}
        basePrice={200000}
        initialCargoImageUri="file:///test-cargo.jpg"
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText('Cheetah voucher')).toBeTruthy();
    expect(screen.getByText('Mã khuyến mãi / Voucher')).toBeTruthy();

    // Tap quick voucher LEOPARD20K (-20,000)
    const voucherChip = screen.getByLabelText('Chọn voucher LEOPARD20K');
    await fireEvent.press(voucherChip);

    expect(screen.getByTestId('applied-voucher-card')).toBeTruthy();
    expect(screen.getByText('LEOPARD20K')).toBeTruthy();
    expect(screen.getByText(/Đã giảm 20\.000 ₫/)).toBeTruthy();

    // Base: 200,000 - Discount: 20,000 = 180,000
    expect(
      screen.getByText(`XÁC NHẬN GỌI XE · ${formatVnd(180000)} ➔`),
    ).toBeTruthy();

    // Confirm booking with voucher
    const cta = screen.getByLabelText(`XÁC NHẬN GỌI XE · ${formatVnd(180000)}`);
    await fireEvent.press(cta);

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        totalFare: 180000,
        voucherCode: 'LEOPARD20K',
        discountAmount: 20000,
      }),
    );

    await screen.unmount();
  });

  it('allows removing applied voucher and restores original total fare', async () => {
    const screen = await render(
      <BookingDetailsModal
        {...defaultProps}
        basePrice={200000}
        initialCargoImageUri="file:///test-cargo.jpg"
      />,
    );

    // Apply voucher
    await fireEvent.press(screen.getByLabelText('Chọn voucher LEOPARD50K'));
    expect(
      screen.getByText(`XÁC NHẬN GỌI XE · ${formatVnd(150000)} ➔`),
    ).toBeTruthy();

    // Remove voucher
    await fireEvent.press(screen.getByLabelText('Bỏ áp dụng voucher'));
    expect(screen.queryByTestId('applied-voucher-card')).toBeNull();
    expect(
      screen.getByText(`XÁC NHẬN GỌI XE · ${formatVnd(200000)} ➔`),
    ).toBeTruthy();

    await screen.unmount();
  });

  it('renders gesture drag handle for smooth bottom sheet pull-down', async () => {
    const screen = await render(<BookingDetailsModal {...defaultProps} />);

    expect(screen.getByTestId('modal-drag-handle-wrap')).toBeTruthy();

    await screen.unmount();
  });
});
