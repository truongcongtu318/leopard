import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';

// Mock expo-router
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockSearchParams: Record<string, string | undefined> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
  }),
  useLocalSearchParams: () => mockSearchParams,
}));

// Mock react-native-qrcode-svg
jest.mock('react-native-qrcode-svg', () => {
  const { View } = require('react-native');
  const MockQRCode = (props: any) => <View testID="vietqr-code" {...props} />;
  return {
    __esModule: true,
    default: MockQRCode,
    QRCode: MockQRCode,
  };
});

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (c: any) => c,
    },
    useSharedValue: (init: any) => ({ value: init }),
    useAnimatedStyle: (fn: any) => fn() || {},
    withSpring: (val: any) => val,
    withTiming: (val: any) => val,
    withRepeat: (val: any) => val,
    withSequence: (...vals: any[]) => vals[0],
    Easing: {
      out: () => (t: any) => t,
      cubic: (t: any) => t,
      ease: (t: any) => t,
    },
  };
});

// Import screen components
import LocationPickerScreen from '../../../../app/customer/location-picker';
import OrderSearchingScreen from '../../../../app/customer/orders/searching/[id]';
import { addressStore } from '../addresses/address-store';

describe('New Customer Screens (Task 4)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = {};
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('LocationPickerScreen (Màn 7)', () => {
    it('renders full-screen map, fixed center pin, search bar, and bottom confirmation card', async () => {
      mockSearchParams = {
        lat: '10.795000',
        lng: '106.652000',
        address: 'Kho Tân Bình, TP. Hồ Chí Minh',
      };

      const screen = await render(<LocationPickerScreen />);

      // Top bar & search
      expect(screen.getByPlaceholderText('Tìm kiếm địa chỉ, kho bãi...')).toBeTruthy();
      expect(screen.getByTestId('btn-location-back')).toBeTruthy();

      // Fixed center pin
      expect(screen.getByTestId('fixed-center-pin')).toBeTruthy();

      // Bottom floating card with address and tabular GPS coordinates
      expect(screen.getByText('Kho Tân Bình, TP. Hồ Chí Minh')).toBeTruthy();
      expect(screen.getByText(/10\.795000,\s*106\.652000/)).toBeTruthy();

      // Confirm button
      const confirmBtn = screen.getByRole('button', { name: 'Xác nhận điểm này' });
      expect(confirmBtn).toBeTruthy();

      await fireEvent.press(confirmBtn);
      expect(mockBack).toHaveBeenCalledTimes(1);

      await screen.unmount();
    });

    it('searches address and updates coordinates and detected address text', async () => {
      const screen = await render(<LocationPickerScreen />);
      const searchInput = screen.getByPlaceholderText('Tìm kiếm địa chỉ, kho bãi...');

      await fireEvent.changeText(searchInput, 'Cát Lái');

      // Click on suggestion
      const suggestion = screen.getByText('Cát Lái, TP. Hồ Chí Minh');
      expect(suggestion).toBeTruthy();
      await fireEvent.press(suggestion);

      // Card coordinates update
      expect(screen.getByText(/10\.764000,\s*106\.796000/)).toBeTruthy();

      await screen.unmount();
    });

    it('navigates back when back button is pressed', async () => {
      const screen = await render(<LocationPickerScreen />);
      const backBtn = screen.getByTestId('btn-location-back');

      await fireEvent.press(backBtn);
      expect(mockBack).toHaveBeenCalledTimes(1);

      await screen.unmount();
    });

    it('navigates to returnTo with params and saves to addressStore on confirm', async () => {
      mockSearchParams = {
        lat: '10.795000',
        lng: '106.652000',
        address: 'Kho Tân Bình, TP. Hồ Chí Minh',
        returnTo: '/customer/orders/new',
        target: 'dropoff',
      };

      const screen = await render(<LocationPickerScreen />);
      const confirmBtn = screen.getByRole('button', { name: 'Xác nhận điểm này' });
      await fireEvent.press(confirmBtn);

      expect(mockReplace).toHaveBeenCalledWith({
        pathname: '/customer/orders/new',
        params: {
          address: 'Kho Tân Bình, TP. Hồ Chí Minh',
          lat: '10.795',
          lng: '106.652',
          target: 'dropoff',
        },
      });

      const savedAddresses = addressStore.getAddresses();
      expect(savedAddresses.some((a) => a.address === 'Kho Tân Bình, TP. Hồ Chí Minh')).toBe(true);

      await screen.unmount();
    });

    it('formats autocomplete suggestions outside HCM correctly and clears search with IconClose button', async () => {
      const screen = await render(<LocationPickerScreen />);
      const searchInput = screen.getByPlaceholderText('Tìm kiếm địa chỉ, kho bãi...');

      await fireEvent.changeText(searchInput, 'Hà Nội');
      const hanoiSuggestion = screen.getByText('Hà Nội, TP. Hà Nội');
      expect(hanoiSuggestion).toBeTruthy();

      // Clear search button test
      const clearBtn = screen.getByTestId('btn-clear-search');
      expect(clearBtn).toBeTruthy();
      await fireEvent.press(clearBtn);

      expect(screen.queryByText('Hà Nội, TP. Hà Nội')).toBeNull();

      await screen.unmount();
    });
  });

  describe('OrderSearchingScreen (Màn 9: Radar Scanning)', () => {
    it('renders radar pulse, 30s countdown, and order information card', async () => {
      mockSearchParams = {
        id: '11111111-1111-4111-8111-111111111001',
        origin: 'Kho Tân Bình, TP.HCM',
        destination: 'KCN Vĩnh Lộc, Bình Chánh',
        vehicleType: 'TRUCK_1_25T',
      };

      const screen = await render(<OrderSearchingScreen />);

      // Radar scanning visual indicators
      expect(screen.getByTestId('radar-visual-container')).toBeTruthy();
      expect(screen.getByText(/Đang quét tìm xe trong bán kính 5km/)).toBeTruthy();

      // Countdown timer initialized at 30s with tabular numbers
      expect(screen.getByTestId('searching-countdown-timer')).toBeTruthy();
      expect(screen.getByText('00:30')).toBeTruthy();

      // Order info card
      expect(screen.getByText(/LP-11111111/)).toBeTruthy();
      expect(screen.getByText('Kho Tân Bình, TP.HCM')).toBeTruthy();
      expect(screen.getByText('KCN Vĩnh Lộc, Bình Chánh')).toBeTruthy();

      await screen.unmount();
    });

    it('counts down and renders tabular timer', async () => {
      mockSearchParams = { id: '11111111-1111-4111-8111-111111111001' };

      const screen = await render(<OrderSearchingScreen initialSeconds={28} />);
      expect(screen.getByText('00:28')).toBeTruthy();

      await screen.unmount();
    });

    it('handles custom initialSeconds and calculates progress bar without overflow', async () => {
      mockSearchParams = { id: '11111111-1111-4111-8111-111111111001' };

      const screen = await render(<OrderSearchingScreen initialSeconds={60} />);
      expect(screen.getByText('00:60')).toBeTruthy();

      await screen.unmount();
    });

    it('shows cancel prompt with 100% escrow refund message and handles cancellation', async () => {
      mockSearchParams = { id: '11111111-1111-4111-8111-111111111001' };

      const screen = await render(<OrderSearchingScreen />);
      const cancelBtn = screen.getByRole('button', { name: 'Hủy tìm xe' });

      await fireEvent.press(cancelBtn);

      // Confirmation dialog/modal appears with 100% escrow refund notice
      expect(screen.getByText(/Hoàn cọc 100% tức thì/)).toBeTruthy();

      const confirmCancelBtn = screen.getByRole('button', { name: 'Xác nhận hủy và hoàn tiền' });
      await fireEvent.press(confirmCancelBtn);

      // Navigates back or to orders list
      expect(mockReplace).toHaveBeenCalledWith('/customer/orders');

      await screen.unmount();
    });

    it('navigates back to orders when pressing top back button', async () => {
      mockSearchParams = { id: '11111111-1111-4111-8111-111111111001' };
      const onBack = jest.fn();

      const screen = await render(<OrderSearchingScreen onBack={onBack} />);
      const backBtn = screen.getByRole('button', { name: 'Quay lại' });
      await fireEvent.press(backBtn);

      expect(onBack).toHaveBeenCalled();
      await screen.unmount();
    });

    it('automatically navigates to tracking when driver accepts order without blocking modal', async () => {
      mockSearchParams = { id: '11111111-1111-4111-8111-111111111001' };
      const onMatched = jest.fn();

      const screen = await render(
        <OrderSearchingScreen initialMatchedDriver="Nguyễn Văn A" onMatched={onMatched} />,
      );

      // Must NOT display blocking alert modal
      expect(screen.queryByText('Tài xế đã nhận đơn!')).toBeNull();
      // Automatically triggered navigation to tracking
      expect(onMatched).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111001');

      await screen.unmount();
    });

    it('displays not found / cancelled alert modal and NOT matched modal when no driver was found', async () => {
      mockSearchParams = { id: '11111111-1111-4111-8111-111111111001' };
      const onCancelled = jest.fn();

      const screen = await render(
        <OrderSearchingScreen
          initialCancelledReason="Không tìm được tài xế phù hợp"
          onCancelled={onCancelled}
        />,
      );

      // Must NOT display "Tài xế đã nhận đơn!"
      expect(screen.queryByText('Tài xế đã nhận đơn!')).toBeNull();

      // Must display "Chưa tìm được tài xế phù hợp"
      expect(screen.getByText('Chưa tìm được tài xế phù hợp')).toBeTruthy();
      expect(screen.getByText('Không tìm được tài xế phù hợp')).toBeTruthy();
      expect(screen.getByText(/Hoàn cọc 100% tự động/)).toBeTruthy();

      // Buttons
      expect(screen.getByRole('button', { name: 'Thử tìm xe lại' })).toBeTruthy();
      const detailBtn = screen.getByRole('button', { name: 'Xem chi tiết đơn' });
      await fireEvent.press(detailBtn);

      expect(onCancelled).toHaveBeenCalledWith(
        '11111111-1111-4111-8111-111111111001',
        'Không tìm được tài xế phù hợp',
      );
      await screen.unmount();
    });

    it('navigates to booking screen when pressing retry button in cancelled modal', async () => {
      mockSearchParams = { id: '11111111-1111-4111-8111-111111111001' };

      const screen = await render(
        <OrderSearchingScreen initialCancelledReason="Không tìm được tài xế phù hợp" />,
      );

      const retryBtn = screen.getByRole('button', { name: 'Thử tìm xe lại' });
      await fireEvent.press(retryBtn);

      expect(mockReplace).toHaveBeenCalledWith('/customer/booking');
      await screen.unmount();
    });
  });
});
