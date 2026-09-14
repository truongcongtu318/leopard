import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
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

import OrderCheckoutScreen from '../../../../app/customer/orders/checkout/[id]';

describe('OrderCheckoutScreen (Real API & Polling)', () => {
  const orderId = '11111111-1111-4111-8111-111111111001';

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = { id: orderId, amount: '280000' };
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls POST /orders/:id/payments on mount and displays dynamic QR and bank info from response', async () => {
    const mockPost = jest.fn<any>().mockResolvedValue({
      id: 'pmt-intent-001',
      orderId,
      amountVnd: 280000,
      status: 'QR_CREATED',
      provider: 'PAYOS',
      providerReference: 'PAYOS-REF-999',
      qrPayload: '00020101021238540010A0000007270126REALPAYOSQRPAYLOAD',
      bankName: 'Techcombank (TCB)',
      accountNumber: '190388889999',
      accountName: 'CONG TY CO PHAN LEOPARD LOGISTICS',
      memo: 'LP-11111111',
    });

    const mockGet = jest.fn<any>().mockResolvedValue([
      {
        id: 'pmt-intent-001',
        orderId,
        status: 'QR_CREATED',
        amountVnd: 280000,
      },
    ]);

    const mockClient = {
      get: mockGet,
      post: mockPost,
      postForm: jest.fn<any>(),
      put: jest.fn<any>(),
      patch: jest.fn<any>(),
      delete: jest.fn<any>(),
    };

    const screen = await render(
      <OrderCheckoutScreen client={mockClient as any} orderId={orderId} />,
    );

    // Assert API called on mount with clientRequestId
    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        `/orders/${orderId}/payments`,
        expect.objectContaining({
          clientRequestId: expect.any(String),
        }),
      );
    });

    // QR Code must receive dynamic qrPayload from API
    await waitFor(() => {
      const qrElement = screen.getByTestId('vietqr-code');
      expect(qrElement.props.value).toBe(
        '00020101021238540010A0000007270126REALPAYOSQRPAYLOAD',
      );
    });

    // Bank details from API response, not hardcoded MB Bank
    expect(screen.getByText('Techcombank (TCB)')).toBeTruthy();
    expect(screen.getByText('190388889999')).toBeTruthy();
    expect(screen.getByText('CONG TY CO PHAN LEOPARD LOGISTICS')).toBeTruthy();
    expect(screen.getByText('LP-11111111')).toBeTruthy();

    await screen.unmount();
  });

  it('polls GET /orders/:id/payments and redirects to searching screen when status becomes PAID_MANUAL', async () => {
    jest.useFakeTimers();

    const mockPost = jest.fn<any>().mockResolvedValue({
      id: 'pmt-intent-001',
      orderId,
      amountVnd: 280000,
      status: 'QR_CREATED',
      provider: 'PAYOS',
      qrPayload: '00020101021238540010A0000007270126REALPAYOSQRPAYLOAD',
    });

    let pollCount = 0;
    const mockGet = jest.fn<any>().mockImplementation(async (path: string) => {
      if (path === `/orders/${orderId}/payments`) {
        pollCount++;
        if (pollCount >= 2) {
          return [
            {
              id: 'pmt-intent-001',
              orderId,
              status: 'PAID_MANUAL',
              amountVnd: 280000,
            },
          ];
        }
        return [
          {
            id: 'pmt-intent-001',
            orderId,
            status: 'QR_CREATED',
            amountVnd: 280000,
          },
        ];
      }
      return [];
    });

    const mockClient = {
      get: mockGet,
      post: mockPost,
      postForm: jest.fn<any>(),
      put: jest.fn<any>(),
      patch: jest.fn<any>(),
      delete: jest.fn<any>(),
    };

    const screen = await render(
      <OrderCheckoutScreen client={mockClient as any} orderId={orderId} />,
    );

    const confirmPaidBtn = screen.getByRole('button', {
      name: 'Xác nhận đã thanh toán',
    });
    await fireEvent.press(confirmPaidBtn);

    expect(screen.getByText(/Đang đối soát tự động/)).toBeTruthy();

    // Advance timer to trigger polling
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    expect(mockGet).toHaveBeenCalledWith(`/orders/${orderId}/payments`);
    expect(mockReplace).toHaveBeenCalledWith(
      `/customer/orders/searching/${orderId}`,
    );

    await screen.unmount();
    jest.useRealTimers();
  });

  it('displays countdown timer and auto-cancels order when 10 minutes expire', async () => {
    jest.useFakeTimers();

    const mockPost = jest.fn<any>().mockResolvedValue({
      id: 'pmt-intent-001',
      orderId,
      amountVnd: 280000,
      status: 'QR_CREATED',
      qrPayload: 'PAYOS-QR-COUNTDOWN',
    });

    const mockClient = {
      get: jest.fn<any>().mockResolvedValue([]),
      post: mockPost,
      postForm: jest.fn<any>(),
      put: jest.fn<any>(),
      patch: jest.fn<any>(),
      delete: jest.fn<any>(),
    };

    const screen = await render(
      <OrderCheckoutScreen client={mockClient as any} orderId={orderId} />,
    );

    // Initial 10-minute countdown badge
    expect(screen.getByText(/10:00|09:59/)).toBeTruthy();

    // Advance 600 seconds (10 minutes)
    await act(async () => {
      jest.advanceTimersByTime(600_000);
    });

    // Should call cancel API
    expect(mockPost).toHaveBeenCalledWith(
      `/orders/${orderId}/cancel`,
      expect.objectContaining({
        reason: expect.stringMatching(/hết hạn/i),
      }),
    );

    // Shows expiry alert/modal
    expect(screen.getByTestId('payment-expired-modal')).toBeTruthy();
    expect(screen.getAllByText(/Hết hạn thanh toán/i).length).toBeGreaterThanOrEqual(1);

    await screen.unmount();
    jest.useRealTimers();
  });

  it('times out reconciliation after 60s and displays retry and cancel buttons', async () => {
    jest.useFakeTimers();

    const mockPost = jest.fn<any>().mockResolvedValue({
      id: 'pmt-intent-001',
      orderId,
      amountVnd: 280000,
      status: 'QR_CREATED',
      qrPayload: 'PAYOS-QR-TIMEOUT',
    });

    // Never returns paid status
    const mockGet = jest.fn<any>().mockResolvedValue([
      { id: 'pmt-intent-001', status: 'QR_CREATED', amountVnd: 280000 },
    ]);

    const mockClient = {
      get: mockGet,
      post: mockPost,
      postForm: jest.fn<any>(),
      put: jest.fn<any>(),
      patch: jest.fn<any>(),
      delete: jest.fn<any>(),
    };

    const screen = await render(
      <OrderCheckoutScreen client={mockClient as any} orderId={orderId} />,
    );

    const confirmPaidBtn = screen.getByRole('button', {
      name: 'Xác nhận đã thanh toán',
    });
    await fireEvent.press(confirmPaidBtn);

    expect(screen.getByText(/Đang đối soát/)).toBeTruthy();

    // Advance 60s (30 ticks)
    await act(async () => {
      jest.advanceTimersByTime(61_000);
    });

    // Reconciliation timed out
    expect(screen.getByText(/Chưa ghi nhận giao dịch/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Kiểm tra lại/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Hủy đơn/i })).toBeTruthy();

    await screen.unmount();
    jest.useRealTimers();
  });
});
