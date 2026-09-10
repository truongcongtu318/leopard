import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import type { SavedAddress } from '../../customer/addresses/address-store';
import { SavedAddressPickerModal } from './SavedAddressPickerModal';

const sampleAddresses: readonly SavedAddress[] = [
  {
    id: 'addr-1',
    label: 'Kho Tân Bình',
    address: '120 Trường Chinh, Tân Bình, TP.HCM',
    isDefault: true,
    category: 'WAREHOUSE',
  },
  {
    id: 'addr-2',
    label: 'Văn phòng',
    address: '1 Nguyễn Huệ, Quận 1, TP.HCM',
    isDefault: false,
    category: 'OFFICE',
  },
];

describe('SavedAddressPickerModal', () => {
  it('renders correctly and handles address selection', async () => {
    const onClose = jest.fn();
    const onSelectAddress = jest.fn();
    const onOpenMapPicker = jest.fn();
    const onOpenSavedAddresses = jest.fn();

    const screen = await render(
      <SavedAddressPickerModal
        addressList={sampleAddresses}
        currentAddress="120 Trường Chinh, Tân Bình, TP.HCM"
        onClose={onClose}
        onOpenMapPicker={onOpenMapPicker}
        onOpenSavedAddresses={onOpenSavedAddresses}
        onSelectAddress={onSelectAddress}
        target="pickup"
        visible={true}
      />,
    );

    expect(screen.getByText('Sổ địa chỉ đã lưu')).toBeTruthy();
    expect(screen.getByText(/điểm lấy hàng/)).toBeTruthy();
    expect(screen.getByText('Kho Tân Bình')).toBeTruthy();
    expect(screen.getByText('Mặc định')).toBeTruthy();
    expect(screen.getByText('Văn phòng')).toBeTruthy();

    // Select second address
    const officeChip = screen.getByTestId('pickup-chip-addr-2');
    await fireEvent.press(officeChip);
    expect(onSelectAddress).toHaveBeenCalledWith(sampleAddresses[1]);

    // Press Map picker
    await fireEvent.press(screen.getByLabelText('Ghim vị trí trên bản đồ'));
    expect(onOpenMapPicker).toHaveBeenCalledWith('pickup');

    // Press Add new address
    await fireEvent.press(screen.getByLabelText('Thêm địa chỉ mới'));
    expect(onOpenSavedAddresses).toHaveBeenCalledTimes(1);

    // Press Close
    await fireEvent.press(screen.getByLabelText('Đóng modal sổ địa chỉ'));
    expect(onClose).toHaveBeenCalledTimes(1);

    await screen.unmount();
  }, 30000);

  it('handles deleting an address and renders empty state', async () => {
    const onDeleteAddress = jest.fn();

    const screen = await render(
      <SavedAddressPickerModal
        addressList={sampleAddresses}
        currentAddress="120 Trường Chinh, Tân Bình, TP.HCM"
        onClose={jest.fn()}
        onDeleteAddress={onDeleteAddress}
        onOpenMapPicker={jest.fn()}
        onSelectAddress={jest.fn()}
        target="pickup"
        visible={true}
      />,
    );

    const deleteBtn = screen.getByLabelText('Xóa Văn phòng');
    await fireEvent.press(deleteBtn);
    expect(onDeleteAddress).toHaveBeenCalledWith('addr-2');

    await screen.unmount();

    // Test empty state
    const emptyScreen = await render(
      <SavedAddressPickerModal
        addressList={[]}
        currentAddress=""
        onClose={jest.fn()}
        onOpenMapPicker={jest.fn()}
        onSelectAddress={jest.fn()}
        target="pickup"
        visible={true}
      />,
    );

    expect(emptyScreen.getByText('Chưa có địa chỉ nào trong sổ')).toBeTruthy();
    await emptyScreen.unmount();
  }, 30000);
});
