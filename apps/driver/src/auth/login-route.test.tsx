import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

import DriverLoginRoute from '../../app/(public)/login';
import { httpClient, sessionStore } from '@leopard/mobile-core';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockSignInWithGoogle = jest.fn<(...args: any[]) => Promise<any>>();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('@leopard/mobile-core/src/api/http-client', () => ({
  httpClient: { post: jest.fn() },
}));

jest.mock('@leopard/mobile-core/src/auth/session-store', () => ({
  sessionStore: {
    setSession: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    clearSession: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  },
}));

jest.mock('@leopard/mobile-core/src/auth/firebase', () => ({
  isFirebaseConfigured: () => true,
  getFirebaseApp: () => ({}),
  getFirebaseAuth: () => ({}),
}));

jest.mock('@leopard/mobile-core/src/auth/firebase-auth', () => ({
  sendPhoneOtp: jest.fn(),
  signInWithGoogle: (...args: unknown[]) => mockSignInWithGoogle(...args),
  resetRecaptcha: jest.fn(),
}));

const sessionOf = (role: string) => ({
  user: {
    id: `u-${role}`,
    phone: '0900000001',
    email: null,
    name: null,
    role,
  },
  session: {
    accessToken: 'acc',
    refreshToken: 'ref',
    accessTokenExpiresAt: '2026-09-07',
    refreshTokenExpiresAt: '2026-09-14',
  },
});

async function loginWithGoogleAs(role: string) {
  (httpClient.post as jest.MockedFunction<typeof httpClient.post>).mockResolvedValueOnce(
    sessionOf(role),
  );
  const screen = await render(<DriverLoginRoute />);
  await fireEvent.press(screen.getByLabelText('Đăng nhập với Google'));
  return screen;
}

describe('DriverLoginRoute', () => {
  const originalDemoFlag = process.env.EXPO_PUBLIC_ALLOW_DEMO_AUTH;

  beforeEach(() => {
    jest.setTimeout(20000);
    jest.clearAllMocks();
    mockSignInWithGoogle.mockResolvedValue('google-id-token');
    // The route only wires the demo OTP screen when this flag is on; the
    // verify-otp case below is a demo-mode expectation.
    process.env.EXPO_PUBLIC_ALLOW_DEMO_AUTH = 'true';
  });

  afterEach(() => {
    if (originalDemoFlag === undefined) delete process.env.EXPO_PUBLIC_ALLOW_DEMO_AUTH;
    else process.env.EXPO_PUBLIC_ALLOW_DEMO_AUTH = originalDemoFlag;
  });

  it('điều hướng vào /orders khi tài khoản là DRIVER', async () => {
    const screen = await loginWithGoogleAs('DRIVER');
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/orders');
    });
    await screen.unmount();
  });

  it('hiển thị card cảnh báo khi tài khoản là CUSTOMER', async () => {
    const screen = await loginWithGoogleAs('CUSTOMER');
    await waitFor(() => {
      expect(screen.getByTestId('not-a-driver-card')).toBeTruthy();
      expect(screen.getByText('Tài khoản này chưa phải tài xế')).toBeTruthy();
    });

    await fireEvent.press(screen.getByText('Đăng ký tài xế'));
    expect(mockPush).toHaveBeenCalledWith('/(public)/driver-register');

    await fireEvent.press(screen.getByText('Đăng xuất'));
    expect(sessionStore.clearSession).toHaveBeenCalled();

    await screen.unmount();
  });

  it('chuyển hướng sang driver-register khi nhấn Đăng ký ngay ở màn login', async () => {
    const screen = await render(<DriverLoginRoute />);
    await fireEvent.press(screen.getByText('Đăng ký ngay'));
    expect(mockPush).toHaveBeenCalledWith('/(public)/driver-register');
    await screen.unmount();
  });

  it('điều hướng sang verify-otp khi nhập SĐT hợp lệ và bấm Gửi mã OTP', async () => {
    const screen = await render(<DriverLoginRoute />);
    await fireEvent.changeText(screen.getByLabelText('Số điện thoại'), '0900000002');
    await fireEvent.press(screen.getByLabelText('Gửi mã OTP'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(public)/verify-otp',
      params: { phone: '0900000002' },
    });
    await screen.unmount();
  });

  it('đăng nhập nhanh bằng Demo Driver khi allowDemo=true', async () => {
    (httpClient.post as jest.MockedFunction<typeof httpClient.post>).mockResolvedValueOnce(
      sessionOf('DRIVER'),
    );
    const screen = await render(<DriverLoginRoute />);
    expect(screen.getByText('Tài khoản demo')).toBeTruthy();
    expect(screen.getByText('Demo Driver')).toBeTruthy();
    await fireEvent.press(screen.getByText('Demo Driver'));
    await waitFor(() => {
      expect(httpClient.post).toHaveBeenCalledWith('/auth/login/demo', { accountId: 'driver' });
      expect(mockReplace).toHaveBeenCalledWith('/orders');
    });
    await screen.unmount();
  });

  it('ẩn khu vực tài khoản demo khi allowDemo=false', async () => {
    process.env.EXPO_PUBLIC_ALLOW_DEMO_AUTH = 'false';
    const screen = await render(<DriverLoginRoute />);
    expect(screen.queryByText('Tài khoản demo')).toBeNull();
    expect(screen.queryByText('Demo Driver')).toBeNull();
    await screen.unmount();
  });
});

import { DriverOtpModal } from './DriverOtpModal';

it('renders otp modal with countdown text', async () => {
  const screen = await render(
    <DriverOtpModal
      errorMsg={null}
      isSubmitting={false}
      isVerified={false}
      onChangeCode={() => {}}
      onClose={() => {}}
      onResend={() => {}}
      onVerify={() => {}}
      otpCode=""
      resendSeconds={45}
    />,
  );
  expect(screen.getByText(/Gửi lại mã sau \(45s\)/)).toBeTruthy();
  await screen.unmount();
});
