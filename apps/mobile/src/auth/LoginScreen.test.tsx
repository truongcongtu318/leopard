import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';

import { LoginScreen } from './LoginScreen';
import { httpClient } from '../api/http-client';
import { sessionStore } from './session-store';
import { ApiError } from '../api/api-error';

jest.mock('../api/http-client', () => ({
  httpClient: { post: jest.fn() },
}));

jest.mock('./session-store', () => ({
  sessionStore: {
    setSession: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  },
}));

jest.mock('./firebase', () => ({
  isFirebaseConfigured: () => true,
  getFirebaseApp: () => ({}),
  getFirebaseAuth: () => ({}),
}));

const mockSendPhoneOtp = jest.fn<(...args: any[]) => Promise<any>>();
const mockSignInWithGoogle = jest.fn<(...args: any[]) => Promise<any>>();
const mockConfirm = jest.fn<(...args: any[]) => Promise<any>>();


jest.mock('./firebase-auth', () => ({
  sendPhoneOtp: (...args: unknown[]) => mockSendPhoneOtp(...args),
  signInWithGoogle: (...args: unknown[]) => mockSignInWithGoogle(...args),
  resetRecaptcha: jest.fn(),
}));

const sessionOf = (role: string) => ({
  user: { id: `u-${role}`, phone: '0900000001', role, status: 'ACTIVE' },
  session: {
    accessToken: 'acc_123',
    refreshToken: 'ref_123',
    accessTokenExpiresAt: '2026-09-07',
    refreshTokenExpiresAt: '2026-09-14',
  },
});

describe('LoginScreen (Mobile web auth)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirm.mockResolvedValue('phone-id-token');
    mockSendPhoneOtp.mockResolvedValue({ confirm: mockConfirm });
    mockSignInWithGoogle.mockResolvedValue('google-id-token');
  });

  it('renders the phone form with OTP and Google actions', async () => {
    const screen = await render(<LoginScreen />);
    expect(screen.getByRole('header', { name: 'Đăng nhập' })).toBeTruthy();
    expect(screen.getByLabelText('Số điện thoại')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Gửi mã OTP' })).toBeTruthy();
    expect(screen.getByLabelText('Đăng nhập với Google')).toBeTruthy();
    await screen.unmount();
  });

  it('shows the session expired banner when sessionExpired is true', async () => {
    const screen = await render(<LoginScreen sessionExpired />);
    expect(screen.getByRole('alert').props.children).toContain(
      'Phiên làm việc đã hết hạn',
    );
    await screen.unmount();
  });

  it('renders demo account buttons when allowDemo is true', async () => {
    const screen = await render(<LoginScreen allowDemo />);
    expect(screen.getByText('Tài khoản demo')).toBeTruthy();
    expect(screen.getByText('Demo Customer')).toBeTruthy();
    expect(screen.getByText('Demo Driver')).toBeTruthy();
    await screen.unmount();
  });

  it('exchanges a Google idToken for a session', async () => {
    (httpClient.post as jest.MockedFunction<typeof httpClient.post>).mockResolvedValueOnce(
      sessionOf('CUSTOMER'),
    );
    const onLoginSuccess = jest.fn();
    const screen = await render(<LoginScreen onLoginSuccess={onLoginSuccess} />);

    await fireEvent.press(screen.getByLabelText('Đăng nhập với Google'));

    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalled();
      expect(httpClient.post).toHaveBeenCalledWith('/auth/firebase', {
        idToken: 'google-id-token',
      });
      expect(sessionStore.setSession).toHaveBeenCalledWith('acc_123', 'ref_123', 'CUSTOMER');
      expect(onLoginSuccess).toHaveBeenCalledWith('CUSTOMER');
    });
    await screen.unmount();
  });

  it('runs the phone -> OTP flow and exchanges the confirmed idToken', async () => {
    (httpClient.post as jest.MockedFunction<typeof httpClient.post>).mockResolvedValueOnce(
      sessionOf('CUSTOMER'),
    );
    const onLoginSuccess = jest.fn();
    const screen = await render(<LoginScreen onLoginSuccess={onLoginSuccess} />);

    await fireEvent.changeText(screen.getByLabelText('Số điện thoại'), '0900000001');
    await fireEvent.press(screen.getByRole('button', { name: 'Gửi mã OTP' }));

    await waitFor(() => {
      expect(mockSendPhoneOtp).toHaveBeenCalledWith(
        '0900000001',
        'leopard-recaptcha-container',
      );
      expect(screen.getByLabelText('Mã OTP')).toBeTruthy();
    });

    await fireEvent.changeText(screen.getByLabelText('Mã OTP'), '123456');
    await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận mã OTP' }));

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith('123456');
      expect(httpClient.post).toHaveBeenCalledWith('/auth/firebase', {
        idToken: 'phone-id-token',
      });
      expect(onLoginSuccess).toHaveBeenCalledWith('CUSTOMER');
    });
    await screen.unmount();
  });

  it('rejects an invalid phone number before calling Firebase', async () => {
    const screen = await render(<LoginScreen />);
    await fireEvent.changeText(screen.getByLabelText('Số điện thoại'), '123');
    await fireEvent.press(screen.getByRole('button', { name: 'Gửi mã OTP' }));

    await waitFor(() => {
      expect(screen.getByRole('alert').props.children).toContain(
        'Số điện thoại không hợp lệ',
      );
    });
    expect(mockSendPhoneOtp).not.toHaveBeenCalled();
    await screen.unmount();
  });

  it('exchanges session tokens on demo login', async () => {
    (httpClient.post as jest.MockedFunction<typeof httpClient.post>).mockResolvedValueOnce(
      sessionOf('CUSTOMER'),
    );
    const onLoginSuccess = jest.fn();
    const screen = await render(<LoginScreen allowDemo onLoginSuccess={onLoginSuccess} />);

    await fireEvent.press(screen.getByText('Demo Customer'));

    await waitFor(() => {
      expect(httpClient.post).toHaveBeenCalledWith('/auth/login/demo', {
        accountId: 'customer',
      });
      expect(onLoginSuccess).toHaveBeenCalledWith('CUSTOMER');
    });
    await screen.unmount();
  });

  it('shows an error when the backend rejects the Google idToken', async () => {
    (httpClient.post as jest.MockedFunction<typeof httpClient.post>).mockRejectedValueOnce(
      new ApiError(401, 'INVALID_PROVIDER_TOKEN', 'Provider token is invalid'),
    );
    const screen = await render(<LoginScreen />);

    await fireEvent.press(screen.getByLabelText('Đăng nhập với Google'));

    await waitFor(() => {
      expect(screen.getByRole('alert').props.children).toContain(
        'Provider token is invalid',
      );
    });
    await screen.unmount();
  });
});
