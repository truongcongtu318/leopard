import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { MapAddressPickerModal } from './MapAddressPickerModal';

describe('MapAddressPickerModal', () => {
  it('renders correctly and handles confirming address and location coordinates', async () => {
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
        showContactFields={false}
      />,
    );

    expect(screen.getByText('Ghim điểm lấy hàng')).toBeTruthy();
    expect(screen.getByText('Lấy hàng tại')).toBeTruthy();
    expect(screen.getByDisplayValue('120 Trường Chinh, Quận Tân Bình')).toBeTruthy();

    // Type a different address
    const addressInput = screen.getByLabelText('Địa chỉ lấy hàng');
    await fireEvent.changeText(addressInput, 'KCN Vĩnh Lộc, Bình Chánh');

    // Confirm
    await fireEvent.press(screen.getByLabelText('Lưu thông tin vị trí'));
    expect(onConfirm).toHaveBeenCalledWith(
      'KCN Vĩnh Lộc, Bình Chánh',
      expect.objectContaining({
        coords: expect.any(Object),
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
    expect(screen.getByDisplayValue('Tân bình, TP. Hồ Chí Minh')).toBeTruthy();

    await screen.unmount();
  }, 30000);

  it('displays map location suggestions when input is focused', async () => {
    const screen = await render(
      <MapAddressPickerModal
        defaultFallbackAddress="Kho Tân Bình, TP. Hồ Chí Minh"
        initialAddress="Kho Tân Bình"
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        target="pickup"
        visible={true}
      />,
    );

    const addressInput = screen.getByLabelText('Địa chỉ lấy hàng');
    await fireEvent(addressInput, 'focus');

    // Should display map suggestions
    expect(await screen.findByText('GỢI Ý TỪ BẢN ĐỒ')).toBeTruthy();
    expect(screen.getByText('Kho tân bình')).toBeTruthy();

    await screen.unmount();
  }, 30000);

  it('renders clean dropoff map picker without redundant contact inputs', async () => {
    const onConfirm = jest.fn();
    const screen = await render(
      <MapAddressPickerModal
        defaultFallbackAddress="Kho Tân Bình, TP. Hồ Chí Minh"
        initialAddress="500 Lê Trọng Tấn, Tây Thạnh"
        onClose={jest.fn()}
        onConfirm={onConfirm}
        target="dropoff"
        visible={true}
        showContactFields={false}
      />,
    );

    expect(screen.getByText('Ghim điểm giao hàng')).toBeTruthy();
    expect(screen.queryByText('THÔNG TIN NGƯỜI NHẬN')).toBeNull();
    expect(screen.queryByLabelText('Tôi là người nhận')).toBeNull();

    await fireEvent.press(screen.getByLabelText('Lưu thông tin vị trí'));
    expect(onConfirm).toHaveBeenCalledWith(
      '500 Lê Trọng Tấn, Tây Thạnh',
      expect.objectContaining({
        coords: expect.any(Object),
      }),
    );

    await screen.unmount();
  }, 30000);

  it('explains a blocked GPS lookup instead of silently keeping the old address', async () => {
    const originalGeolocation = (globalThis.navigator as { geolocation?: unknown } | undefined)
      ?.geolocation;
    Object.defineProperty(globalThis.navigator, 'geolocation', {
      configurable: true,
      value: {
        // Mirrors the browser shape: the error codes live on the geolocation
        // object itself, so the component can read `err.PERMISSION_DENIED`.
        PERMISSION_DENIED: 1,
        getCurrentPosition: (
          _success: unknown,
          error: (err: { code: number; message: string }) => void,
        ) => error({ code: 1, message: 'Only secure origins are allowed' }),
      },
    });

    try {
      const screen = await render(
        <MapAddressPickerModal
          defaultFallbackAddress="Kho Tân Bình, TP. Hồ Chí Minh"
          initialAddress="120 Trường Chinh, Quận Tân Bình"
          onClose={jest.fn()}
          onConfirm={jest.fn()}
          target="pickup"
          visible={true}
        />,
      );

      // Clearing the field brings up the quick suggestions, which include the
      // "use my current position" entry.
      const addressInput = screen.getByLabelText('Địa chỉ lấy hàng');
      await fireEvent(addressInput, 'focus');
      await fireEvent.changeText(addressInput, '');
      await fireEvent.press(
        await screen.findByLabelText('Chọn Vị trí hiện tại của bạn', {}, { timeout: 5000 }),
      );

      expect(await screen.findByTestId('gps-location-notice')).toBeTruthy();
      expect(await screen.findByText(/Trình duyệt chặn quyền vị trí/)).toBeTruthy();
      // The previous address is restored, so nothing looks like a GPS result.
      expect(screen.getByDisplayValue('120 Trường Chinh, Quận Tân Bình')).toBeTruthy();

      await screen.unmount();
    } finally {
      Object.defineProperty(globalThis.navigator, 'geolocation', {
        configurable: true,
        value: originalGeolocation,
      });
    }
  }, 30000);
});
