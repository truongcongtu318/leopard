import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';

import LoginRoute from '../../app/(public)/login';
import { httpClient } from '@leopard/mobile-core/src/api/http-client';

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

const sessionOf = (role: string, profileComplete = true) => ({
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
    accessToken: 'acc',
    refreshToken: 'ref',
    accessTokenExpiresAt: '2026-09-07',
    refreshTokenExpiresAt: '2026-09-14',
  },
});

async function loginWithGoogleAs(role: string, profileComplete = true) {
  (httpClient.post as jest.MockedFunction<typeof httpClient.post>).mockResolvedValueOnce(
    sessionOf(role, profileComplete),
  );
  const screen = await render(<LoginRoute />);
  await fireEvent.press(screen.getByLabelText('Đăng nhập với Google'));
  return screen;
}

describe('LoginRoute (Mobile)', () => {
  beforeEach(() => {
    jest.setTimeout(20000);
    jest.clearAllMocks();
    mockSignInWithGoogle.mockResolvedValue('google-id-token');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the LoginScreen phone form', async () => {
    const screen = await render(<LoginRoute />);
    expect(screen.getByRole('header', { name: 'Đăng nhập' })).toBeTruthy();
    expect(screen.getByLabelText('Số điện thoại')).toBeTruthy();
    await screen.unmount();
  });

  it('navigates to customer-register when "Đăng ký ngay" is pressed', async () => {
    const screen = await render(<LoginRoute />);
    await fireEvent.press(screen.getByText('Đăng ký ngay'));
    expect(mockPush).toHaveBeenCalledWith('/(public)/customer-register');
    await screen.unmount();
  });

  it.each([
    { destination: '/customer/home', role: 'CUSTOMER' },
    { destination: '/driver/orders', role: 'DRIVER' },
  ] as const)('redirects $role to $destination after login', async ({ destination, role }) => {
    const screen = await loginWithGoogleAs(role);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(destination);
    });
    await screen.unmount();
  });

  it('routes a not-yet-onboarded user to customer-register', async () => {
    const screen = await loginWithGoogleAs('CUSTOMER', false);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(public)/customer-register');
    });
    await screen.unmount();
  });

  it('routes a driver to /driver/orders even when profileComplete is false', async () => {
    const screen = await loginWithGoogleAs('DRIVER', false);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/driver/orders');
    });
    await screen.unmount();
  });

  it.each([{ role: 'FLEET_OWNER' }, { role: 'ADMIN' }] as const)(
    'returns unsupported $role sessions to the mobile login route',
    async ({ role }) => {
      const screen = await loginWithGoogleAs(role);
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/(public)/login');
      });
      await screen.unmount();
    },
  );
});
