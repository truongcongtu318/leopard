import { describe, expect, it, jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react-native';

import { AddressBookScreen } from './AddressBookScreen';
import { addressStore } from './address-store';

jest.mock('./address-store', () => ({
  addressStore: {
    getAddresses: jest.fn(),
    saveAddress: jest.fn(),
    setDefaultAddress: jest.fn(),
  },
}));

describe('AddressBookScreen', () => {
  it('renders addresses loaded from addressStore, not a hardcoded list', async () => {
    (addressStore.getAddresses as jest.Mock<any>).mockResolvedValue([
      {
        id: 'a1',
        label: 'Kho Quận 7',
        address: '123 Huỳnh Tấn Phát',
        contactName: 'Nguyễn A',
        contactPhone: '0900000001',
        isDefault: true,
        category: 'WAREHOUSE',
      },
    ]);

    render(<AddressBookScreen />);

    await waitFor(() => {
      expect(screen.getByText('Kho Quận 7')).toBeTruthy();
    });
    expect(screen.queryByText('Văn phòng đại diện')).toBeNull(); // old mock entry must be gone
  });

  it('shows an empty state when no addresses are saved', async () => {
    (addressStore.getAddresses as jest.Mock<any>).mockResolvedValue([]);

    render(<AddressBookScreen />);

    await waitFor(() => {
      expect(screen.getByText(/chưa có địa chỉ/i)).toBeTruthy();
    });
  });
});
