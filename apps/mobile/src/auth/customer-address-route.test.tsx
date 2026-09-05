import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import CustomerAddressSetupScreen from '../../app/(public)/customer-address';
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

describe('CustomerAddressSetupScreen', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await addressStore.clearAll();
    (httpClient.get as any).mockResolvedValue({ results: [] });
  });

  it('renders all key components of the address setup screen', async () => {
    const screen = await render(<CustomerAddressSetupScreen />);

    expect(screen.getByRole('header', { name: 'Thiết lập địa chỉ' })).toBeTruthy();
    expect(screen.getByTestId('ca-back-btn')).toBeTruthy();
    expect(screen.getByTestId('ca-use-current-location')).toBeTruthy();
    expect(screen.getByTestId('ca-search-input')).toBeTruthy();
    expect(screen.getByTestId('ca-detail-input')).toBeTruthy();
    expect(screen.getByTestId('ca-chip-warehouse')).toBeTruthy();
    expect(screen.getByTestId('ca-chip-home')).toBeTruthy();
    expect(screen.getByTestId('ca-chip-office')).toBeTruthy();
    expect(screen.getByTestId('ca-chip-other')).toBeTruthy();
    expect(screen.getByTestId('ca-default-checkbox')).toBeTruthy();
    expect(screen.getByTestId('ca-submit-btn')).toBeTruthy();
    expect(screen.getByTestId('ca-skip-btn')).toBeTruthy();

    await screen.unmount();
  });

  it('detects location when "Sử dụng vị trí hiện tại" is pressed', async () => {
    const screen = await render(<CustomerAddressSetupScreen />);

    await fireEvent.press(screen.getByTestId('ca-use-current-location'));

    await waitFor(() => {
      expect(screen.getByText(/Đã xác định vị trí/i)).toBeTruthy();
    });

    await screen.unmount();
  });

  it('allows entering detailed address and toggling category chips', async () => {
    const screen = await render(<CustomerAddressSetupScreen />);

    await fireEvent.changeText(screen.getByTestId('ca-detail-input'), 'Kho A2 - Cổng 3');
    await fireEvent.press(screen.getByTestId('ca-chip-home'));

    expect(screen.getByDisplayValue('Kho A2 - Cổng 3')).toBeTruthy();

    await screen.unmount();
  });

  it('saves the address and redirects to /customer/home on confirm', async () => {
    const screen = await render(<CustomerAddressSetupScreen />);

    await fireEvent.changeText(screen.getByTestId('ca-detail-input'), 'Kho A1');
    await fireEvent.press(screen.getByTestId('ca-chip-warehouse'));
    await fireEvent.press(screen.getByTestId('ca-submit-btn'));

    expect(mockReplace).toHaveBeenCalledWith('/customer/home');

    // Verify persisted in addressStore
    const saved = await addressStore.getDefaultAddress();
    expect(saved).not.toBeNull();
    expect(saved?.label).toBe('Kho hàng');
    expect(saved?.address).toContain('Kho A1');
    expect(saved?.isDefault).toBe(true);

    await screen.unmount();
  });

  it('skips address setup and redirects to /customer/home when skip is pressed', async () => {
    const screen = await render(<CustomerAddressSetupScreen />);

    await fireEvent.press(screen.getByTestId('ca-skip-btn'));

    expect(mockReplace).toHaveBeenCalledWith('/customer/home');
    await screen.unmount();
  });

  it('navigates back when back button is pressed', async () => {
    const screen = await render(<CustomerAddressSetupScreen />);

    await fireEvent.press(screen.getByTestId('ca-back-btn'));

    expect(mockBack).toHaveBeenCalled();
    await screen.unmount();
  });
});
