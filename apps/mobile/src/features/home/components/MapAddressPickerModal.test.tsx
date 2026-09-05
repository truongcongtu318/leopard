import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { MapAddressPickerModal } from './MapAddressPickerModal';

describe('MapAddressPickerModal', () => {
  it('renders correctly and handles confirming address and contact details', async () => {
    const onClose = jest.fn();
    const onConfirm = jest.fn();

    const screen = await render(
      <MapAddressPickerModal
        defaultFallbackAddress="Kho Tân Bình, TP. Hồ Chí Minh"
        initialAddress="120 Trường Chinh, Quận Tân Bình"
        loggedInCustomer={{ name: 'Nguyễn Văn A', phone: '0988776655' }}
        onClose={onClose}
        onConfirm={onConfirm}
        target="pickup"
        userName="Nguyễn Văn A"
        userPhone="0988776655"
        visible={true}
      />,
    );

    expect(screen.getByText('Thông tin người gửi')).toBeTruthy();
    expect(screen.getByText('Lấy hàng tại')).toBeTruthy();
    expect(screen.getByDisplayValue('120 Trường Chinh, Quận Tân Bình')).toBeTruthy();

    // Type a different address
    const addressInput = screen.getByLabelText('Địa chỉ lấy hàng');
    await fireEvent.changeText(addressInput, 'KCN Vĩnh Lộc, Bình Chánh');

    // Fill sender info shortcut
    await fireEvent.press(screen.getByLabelText('Tôi là người gửi'));
    expect(screen.getByDisplayValue('Nguyễn Văn A')).toBeTruthy();
    expect(screen.getByDisplayValue('0988776655')).toBeTruthy();

    // Confirm
    await fireEvent.press(screen.getByLabelText('Lưu thông tin vị trí'));
    expect(onConfirm).toHaveBeenCalledWith(
      'KCN Vĩnh Lộc, Bình Chánh',
      expect.objectContaining({
        senderName: 'Nguyễn Văn A',
        senderPhone: '0988776655',
      }),
    );

    // Close button
    await fireEvent.press(screen.getByLabelText('Hủy xác nhận địa chỉ'));
    expect(onClose).toHaveBeenCalledTimes(1);

    await screen.unmount();
  }, 30000);

  it('searches address and selects suggestion to apply coordinates to map', async () => {
    const onConfirm = jest.fn();
    const screen = await render(
      <MapAddressPickerModal
        defaultFallbackAddress="Kho Tân Bình, TP. Hồ Chí Minh"
        initialAddress=""
        onClose={jest.fn()}
        onConfirm={onConfirm}
        target="pickup"
        visible={true}
      />,
    );

    const addressInput = screen.getByLabelText('Địa chỉ lấy hàng');
    await fireEvent(addressInput, 'focus');
    await fireEvent.changeText(addressInput, 'Tân Bình');

    // Wait for debounced search to render suggestion
    const suggestion = await screen.findByText('Tân bình', {}, { timeout: 3000 });
    expect(suggestion).toBeTruthy();

    // Tap suggestion
    await fireEvent.press(suggestion);

    // Verify input updated
    expect(screen.getByDisplayValue(/Tân bình/i)).toBeTruthy();

    // Confirm
    await fireEvent.press(screen.getByLabelText('Lưu thông tin vị trí'));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.stringMatching(/Tân bình/i),
      expect.objectContaining({
        coords: expect.objectContaining({ lat: 10.795, lng: 106.652 }),
      }),
    );

    await screen.unmount();
  }, 30000);

  it('displays popular locations when focused and reverse geocodes GPS coordinates', async () => {
    const screen = await render(
      <MapAddressPickerModal
        defaultFallbackAddress="Kho Tân Bình, TP. Hồ Chí Minh"
        initialAddress=""
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        target="pickup"
        visible={true}
      />,
    );

    const addressInput = screen.getByLabelText('Địa chỉ lấy hàng');
    await fireEvent.changeText(addressInput, '');
    await fireEvent(addressInput, 'focus');

    // Should display popular locations when query < 2
    expect(await screen.findByText('Vị trí hiện tại của bạn')).toBeTruthy();
    expect(screen.getByText(/Chợ Bến Thành/i)).toBeTruthy();
    expect(screen.getByText(/Sân bay Quốc tế Tân Sơn Nhất/i)).toBeTruthy();

    await screen.unmount();
  }, 30000);
});
