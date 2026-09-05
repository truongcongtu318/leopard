import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import CustomerAddAddressScreen from '../../app/(public)/customer-address';
import { httpClient } from '../api/http-client';
import { addressStore } from '../features/customer/addresses/address-store';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
    back: mockBack,
    canGoBack: () => true,
  }),
}));

jest.mock('../api/http-client', () => ({
  httpClient: {
    get: jest.fn(),
  },
}));

describe('CustomerAddAddressScreen (customer-address route)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    addressStore.clearAll();
    (httpClient.get as any).mockResolvedValue({ results: [] });
  });

  it('renders all key components of the add new address screen', async () => {
    const screen = await render(<CustomerAddAddressScreen />);

    expect(screen.getByRole('header', { name: 'Thêm địa chỉ mới' })).toBeTruthy();
    expect(screen.getByTestId('ca-back-btn')).toBeTruthy();
    expect(screen.getByTestId('ca-label-input')).toBeTruthy();
    expect(screen.getByTestId('ca-contact-name')).toBeTruthy();
    expect(screen.getByTestId('ca-contact-phone')).toBeTruthy();
    expect(screen.getByTestId('ca-use-current-location')).toBeTruthy();
    expect(screen.getByTestId('ca-search-input')).toBeTruthy();
    expect(screen.getByTestId('ca-detail-input')).toBeTruthy();
    expect(screen.getByTestId('ca-chip-warehouse')).toBeTruthy();
    expect(screen.getByTestId('ca-chip-home')).toBeTruthy();
    expect(screen.getByTestId('ca-chip-office')).toBeTruthy();
    expect(screen.getByTestId('ca-chip-other')).toBeTruthy();
    expect(screen.getByTestId('ca-default-checkbox')).toBeTruthy();
    expect(screen.getByTestId('ca-submit-btn')).toBeTruthy();

    await screen.unmount();
  });

  it('detects location when "Sử dụng vị trí hiện tại" is pressed', async () => {
    const screen = await render(<CustomerAddAddressScreen />);

    await fireEvent.press(screen.getByTestId('ca-use-current-location'));

    await waitFor(() => {
      expect(screen.getByText(/Đã xác định vị trí/i)).toBeTruthy();
    });

    await screen.unmount();
  });

  it('allows entering custom label, contacts, detailed address and toggling category chips', async () => {
    const screen = await render(<CustomerAddAddressScreen />);

    await fireEvent.changeText(screen.getByTestId('ca-label-input'), 'Kho Tân Phú');
    await fireEvent.changeText(screen.getByTestId('ca-contact-name'), 'Nguyễn Văn Nam');
    await fireEvent.changeText(screen.getByTestId('ca-contact-phone'), '0912345678');
    await fireEvent.changeText(screen.getByTestId('ca-detail-input'), 'Kho A2 - Cổng 3');
    await fireEvent.press(screen.getByTestId('ca-chip-warehouse'));

    expect(screen.getByDisplayValue('Kho Tân Phú')).toBeTruthy();
    expect(screen.getByDisplayValue('Nguyễn Văn Nam')).toBeTruthy();
    expect(screen.getByDisplayValue('0912345678')).toBeTruthy();
    expect(screen.getByDisplayValue('Kho A2 - Cổng 3')).toBeTruthy();

    await screen.unmount();
  });

  it('saves the address with custom details and navigates back on save', async () => {
    const screen = await render(<CustomerAddAddressScreen />);

    await fireEvent.changeText(screen.getByTestId('ca-label-input'), 'Kho Quận 9');
    await fireEvent.changeText(screen.getByTestId('ca-contact-name'), 'Anh Hùng');
    await fireEvent.changeText(screen.getByTestId('ca-contact-phone'), '0988776655');
    await fireEvent.changeText(screen.getByTestId('ca-detail-input'), 'Cổng 1, Lô B');
    await fireEvent.press(screen.getByTestId('ca-chip-warehouse'));
    await fireEvent.press(screen.getByTestId('ca-submit-btn'));

    expect(mockBack).toHaveBeenCalled();

    // Verify persisted in addressStore
    const saved = addressStore.getDefaultAddress();
    expect(saved).not.toBeNull();
    expect(saved?.label).toBe('Kho Quận 9');
    expect(saved?.address).toContain('Cổng 1, Lô B');
    expect(saved?.contactName).toBe('Anh Hùng');
    expect(saved?.contactPhone).toBe('0988776655');
    expect(saved?.category).toBe('WAREHOUSE');
    expect(saved?.isDefault).toBe(true);

    await screen.unmount();
  });

  it('navigates back when back button is pressed', async () => {
    const screen = await render(<CustomerAddAddressScreen />);

    await fireEvent.press(screen.getByTestId('ca-back-btn'));

    expect(mockBack).toHaveBeenCalled();
    await screen.unmount();
  });
});
