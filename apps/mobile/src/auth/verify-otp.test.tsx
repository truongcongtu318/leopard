import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import React from 'react';

import VerifyOtpRoute from '../../app/(public)/verify-otp';
import { httpClient } from '@leopard/mobile-core/src/api/http-client';
import { sessionStore } from '@leopard/mobile-core/src/auth/session-store';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockSearchParams: { phone?: string } = { phone: '0900000001' };

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
    canGoBack: () => true,
  }),
  useLocalSearchParams: () => mockSearchParams,
}));

jest.mock('@leopard/mobile-core/src/api/http-client', () => ({
  httpClient: { post: jest.fn() },
}));

jest.mock('@leopard/mobile-core/src/auth/session-store', () => ({
  sessionStore: {
    setSession: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  },
}));

const authResponse = (role = 'CUSTOMER', profileComplete = true) => ({
  user: {
    id: `u-${role}`,
    phone: '0900000001',
    email: null,
    name: null,
    role,
    status: 'ACTIVE',
    profileComplete,
  },
  session: {
    accessToken: 'test-acc',
    refreshToken: 'test-ref',
    accessTokenExpiresAt: '2026-09-12T00:00:00Z',
    refreshTokenExpiresAt: '2026-09-19T00:00:00Z',
  },
});

describe('VerifyOtpRoute (Mobile Customer)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = { phone: '0900000001' };
    jest.useRealTimers();
  });

  it('renders header with back button, phone number, 6 OTP boxes, 60s countdown, and numpad', async () => {
    const screen = await render(<VerifyOtpRoute />);

    expect(screen.getByTestId('btn-back')).toBeTruthy();
    expect(screen.getByText(/(\+84900000001|0900000001)/)).toBeTruthy();
    expect(screen.getByTestId('otp-boxes')).toBeTruthy();
    expect(screen.getByText(/Gửi lại mã sau/)).toBeTruthy();

    // Verify virtual numpad buttons 0-9 and backspace
    for (let i = 0; i <= 9; i++) {
      expect(screen.getByTestId(`numpad-${i}`)).toBeTruthy();
    }
    expect(screen.getByTestId('numpad-backspace')).toBeTruthy();

    await screen.unmount();
  });

  it('navigates back when back button is pressed', async () => {
    const screen = await render(<VerifyOtpRoute />);
    await fireEvent.press(screen.getByTestId('btn-back'));
    expect(mockBack).toHaveBeenCalled();
    await screen.unmount();
  });

  it('updates OTP boxes when tapping virtual numpad keys', async () => {
    const screen = await render(<VerifyOtpRoute />);

    await fireEvent.press(screen.getByTestId('numpad-1'));
    await fireEvent.press(screen.getByTestId('numpad-2'));
    await fireEvent.press(screen.getByTestId('numpad-3'));

    expect(screen.getByTestId('otp-cell-0')).toHaveTextContent('1');
    expect(screen.getByTestId('otp-cell-1')).toHaveTextContent('2');
    expect(screen.getByTestId('otp-cell-2')).toHaveTextContent('3');

    // Test backspace
    await fireEvent.press(screen.getByTestId('numpad-backspace'));
    expect(screen.getByTestId('otp-cell-2')).toHaveTextContent('');

    await screen.unmount();
  });

  it('automatically verifies OTP upon entering 6 digits and navigates to /customer/home for complete profile', async () => {
    (httpClient.post as jest.MockedFunction<typeof httpClient.post>).mockResolvedValueOnce(
      authResponse('CUSTOMER', true),
    );

    const screen = await render(<VerifyOtpRoute />);

    // Tap 1, 2, 3, 4, 5, 6
    for (const digit of ['1', '2', '3', '4', '5', '6']) {
      await fireEvent.press(screen.getByTestId(`numpad-${digit}`));
    }

    await waitFor(() => {
      expect(httpClient.post).toHaveBeenCalledWith('/auth/verify-otp', {
        phone: '0900000001',
        otp: '123456',
      });
      expect(sessionStore.setSession).toHaveBeenCalledWith('test-acc', 'test-ref', 'CUSTOMER');
      expect(mockReplace).toHaveBeenCalledWith('/customer/home');
    });

    await screen.unmount();
  });

  it('navigates to /(public)/customer-register if profileComplete is false', async () => {
    (httpClient.post as jest.MockedFunction<typeof httpClient.post>).mockResolvedValueOnce(
      authResponse('CUSTOMER', false),
    );

    const screen = await render(<VerifyOtpRoute />);

    for (const digit of ['6', '5', '4', '3', '2', '1']) {
      await fireEvent.press(screen.getByTestId(`numpad-${digit}`));
    }

    await waitFor(() => {
      expect(httpClient.post).toHaveBeenCalledWith('/auth/verify-otp', {
        phone: '0900000001',
        otp: '654321',
      });
      expect(mockReplace).toHaveBeenCalledWith('/(public)/customer-register');
    });

    await screen.unmount();
  });

  it('displays error banner when verification fails', async () => {
    (httpClient.post as jest.MockedFunction<typeof httpClient.post>).mockRejectedValueOnce({
      statusCode: 400,
      message: 'Mã OTP không đúng hoặc đã hết hạn',
    });

    const screen = await render(<VerifyOtpRoute />);

    for (const digit of ['1', '1', '1', '1', '1', '1']) {
      await fireEvent.press(screen.getByTestId(`numpad-${digit}`));
    }

    await waitFor(() => {
      expect(screen.getByTestId('otp-error-banner')).toBeTruthy();
      expect(screen.getByText('Mã OTP không đúng hoặc đã hết hạn')).toBeTruthy();
    });

    await screen.unmount();
  });
});
