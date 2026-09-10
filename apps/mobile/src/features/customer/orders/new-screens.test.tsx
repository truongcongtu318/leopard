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

// Import screen components
import LocationPickerScreen from '../../../../app/customer/location-picker';
import OrderSearchingScreen from '../../../../app/customer/orders/searching/[id]';
import OrderCheckoutScreen from '../../../../app/customer/orders/checkout/[id]';
import CustomerCreateOrderPage from '../../../../app/customer/orders/new';

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
  });

  describe('OrderCheckoutScreen (Màn 10: VietQR Payment & Escrow)', () => {
    it('renders VietQR payment screen with price, QR code, bank transfer info, and method selector', async () => {
      mockSearchParams = {
        id: '11111111-1111-4111-8111-111111111001',
        amount: '280000',
      };

      const screen = await render(<OrderCheckoutScreen />);

      // Order price in bold tabular nums
      expect(screen.getByText('280.000 ₫')).toBeTruthy();

      // QR Code
      expect(screen.getByTestId('vietqr-code')).toBeTruthy();

      // Bank transfer details
      expect(screen.getByText('MB Bank (Ngân hàng Quân Đội)')).toBeTruthy();
      expect(screen.getByText('0383188888')).toBeTruthy();
      expect(screen.getByText('CONG TY CO PHAN LEOPARD LOGISTICS')).toBeTruthy();
      expect(screen.getByText(/LP-11111111/)).toBeTruthy();

      // Payment method selector
      expect(screen.getByText('VietQR payOS (Napas 24/7)')).toBeTruthy();
      expect(screen.getByText('Ví doanh nghiệp (B2B Credit)')).toBeTruthy();

      await screen.unmount();
    });

    it('switches payment method to Ví doanh nghiệp and allows payment', async () => {
      mockSearchParams = {
        id: '11111111-1111-4111-8111-111111111001',
        amount: '280000',
      };

      const screen = await render(<OrderCheckoutScreen />);

      const walletMethodBtn = screen.getByTestId('payment-method-wallet');
      await fireEvent.press(walletMethodBtn);

      expect(screen.getByText(/Hạn mức khả dụng/)).toBeTruthy();

      await screen.unmount();
    });

    it('handles confirm payment action and navigates to searching route', async () => {
      jest.useFakeTimers();
      const orderId = '11111111-1111-4111-8111-111111111001';
      mockSearchParams = { id: orderId, amount: '280000' };

      const screen = await render(<OrderCheckoutScreen />);

      const confirmPaidBtn = screen.getByRole('button', { name: 'Xác nhận đã thanh toán' });
      await fireEvent.press(confirmPaidBtn);

      // Success notification or simulation step
      expect(screen.getByText(/Đang đối soát tự động/)).toBeTruthy();

      act(() => {
        jest.advanceTimersByTime(4000);
      });

      expect(mockReplace).toHaveBeenCalledWith(`/customer/orders/searching/${orderId}`);

      await screen.unmount();
      jest.useRealTimers();
    });
  });

  describe('CustomerCreateOrderPage route (new.tsx)', () => {
    it('routes onCreated to checkout screen', () => {
      const element = CustomerCreateOrderPage();
      expect(element).toBeDefined();
      expect(element.props.onCreated).toBeDefined();

      element.props.onCreated('test-order-123');
      expect(mockReplace).toHaveBeenCalledWith('/customer/orders/checkout/test-order-123');
    });
  });
});
