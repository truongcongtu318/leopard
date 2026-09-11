import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';

import VerifyOtpRoute from '../../app/(public)/verify-otp';
import { httpClient } from '@leopard/mobile-core/src/api/http-client';
import { sessionStore } from '@leopard/mobile-core/src/auth/session-store';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockSearchParams: { phone?: string } = { phone: '0900000002' };

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

const authResponse = (role = 'DRIVER', profileComplete = true) => ({
  user: {
    id: `u-${role}`,
    phone: '0900000002',
    email: null,
    name: null,
    role,
    status: 'ACTIVE',
    profileComplete,
  },
  session: {
    accessToken: 'test-driver-acc',
    refreshToken: 'test-driver-ref',
    accessTokenExpiresAt: '2026-09-12T00:00:00Z',
    refreshTokenExpiresAt: '2026-09-19T00:00:00Z',
  },
});

describe('VerifyOtpRoute (Driver)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = { phone: '0900000002' };
  });

  it('renders header, phone, 6 OTP boxes, timer, and numpad', async () => {
    const screen = await render(<VerifyOtpRoute />);

    expect(screen.getByTestId('btn-back')).toBeTruthy();
    expect(screen.getByText(/(\+84900000002|0900000002)/)).toBeTruthy();
    expect(screen.getByTestId('otp-boxes')).toBeTruthy();
    expect(screen.getByText(/Gửi lại mã sau/)).toBeTruthy();

    for (let i = 0; i <= 9; i++) {
      expect(screen.getByTestId(`numpad-${i}`)).toBeTruthy();
    }
    expect(screen.getByTestId('numpad-backspace')).toBeTruthy();

    await screen.unmount();
  });

  it('updates OTP cells when numpad digits are pressed and backspace deletes digit', async () => {
    const screen = await render(<VerifyOtpRoute />);

    await fireEvent.press(screen.getByTestId('numpad-9'));
    await fireEvent.press(screen.getByTestId('numpad-8'));

    expect(screen.getByTestId('otp-cell-0')).toHaveTextContent('9');
    expect(screen.getByTestId('otp-cell-1')).toHaveTextContent('8');

    await fireEvent.press(screen.getByTestId('numpad-backspace'));
    expect(screen.getByTestId('otp-cell-1')).toHaveTextContent('');

    await screen.unmount();
  });

  it('verifies OTP and navigates to /orders when role is DRIVER and profile is complete', async () => {
    (httpClient.post as jest.MockedFunction<typeof httpClient.post>).mockResolvedValueOnce(
      authResponse('DRIVER', true),
    );

    const screen = await render(<VerifyOtpRoute />);

    for (const digit of ['1', '2', '3', '4', '5', '6']) {
      await fireEvent.press(screen.getByTestId(`numpad-${digit}`));
    }

    await waitFor(() => {
      expect(httpClient.post).toHaveBeenCalledWith('/auth/verify-otp', {
        phone: '0900000002',
        otp: '123456',
      });
      expect(sessionStore.setSession).toHaveBeenCalledWith(
        'test-driver-acc',
        'test-driver-ref',
        'DRIVER',
      );
      expect(mockReplace).toHaveBeenCalledWith('/orders');
    });

    await screen.unmount();
  });

  it('navigates to /(public)/driver-register if role is DRIVER and profileComplete is false', async () => {
    (httpClient.post as jest.MockedFunction<typeof httpClient.post>).mockResolvedValueOnce(
      authResponse('DRIVER', false),
    );

    const screen = await render(<VerifyOtpRoute />);

    for (const digit of ['1', '2', '3', '4', '5', '6']) {
      await fireEvent.press(screen.getByTestId(`numpad-${digit}`));
    }

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(public)/driver-register');
    });

    await screen.unmount();
  });

  it('navigates to /(public)/kyc-pending if user status is PENDING_APPROVAL', async () => {
    (httpClient.post as jest.MockedFunction<typeof httpClient.post>).mockResolvedValueOnce({
      ...authResponse('DRIVER', true),
      user: {
        ...authResponse('DRIVER', true).user,
        status: 'PENDING_APPROVAL',
      },
    });

    const screen = await render(<VerifyOtpRoute />);

    for (const digit of ['1', '2', '3', '4', '5', '6']) {
      await fireEvent.press(screen.getByTestId(`numpad-${digit}`));
    }

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(public)/kyc-pending');
    });

    await screen.unmount();
  });

  it('shows error banner on verification failure', async () => {
    (httpClient.post as jest.MockedFunction<typeof httpClient.post>).mockRejectedValueOnce({
      statusCode: 401,
      message: 'Mã xác thực không hợp lệ',
    });

    const screen = await render(<VerifyOtpRoute />);

    for (const digit of ['9', '9', '9', '9', '9', '9']) {
      await fireEvent.press(screen.getByTestId(`numpad-${digit}`));
    }

    await waitFor(() => {
      expect(screen.getByTestId('otp-error-banner')).toBeTruthy();
      expect(screen.getByText('Mã xác thực không hợp lệ')).toBeTruthy();
    });

    await screen.unmount();
  });
});
