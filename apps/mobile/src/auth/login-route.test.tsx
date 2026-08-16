import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';

import LoginRoute from '../../app/(public)/login';
import { httpClient } from '../api/http-client';
import { sessionStore } from './session-store';

const mockReplace = jest.fn();
const originalPreviewFlag = process.env.EXPO_PUBLIC_LEOPARD_UI_PREVIEW;

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('../api/http-client', () => ({
  httpClient: {
    post: jest.fn(),
  },
}));

jest.mock('./session-store', () => ({
  sessionStore: {
    setSession: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  },
}));

describe('LoginRoute (Mobile)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.EXPO_PUBLIC_LEOPARD_UI_PREVIEW;
  });

  afterEach(() => {
    if (originalPreviewFlag === undefined) delete process.env.EXPO_PUBLIC_LEOPARD_UI_PREVIEW;
    else process.env.EXPO_PUBLIC_LEOPARD_UI_PREVIEW = originalPreviewFlag;
  });

  it('renders LoginScreen component', async () => {
    const screen = await render(<LoginRoute />);
    expect(screen.getByRole('header', { name: 'Đăng nhập' })).toBeTruthy();
    expect(screen.getByLabelText('Số điện thoại hoặc Token')).toBeTruthy();
    await screen.unmount();
  });

  it('redirects CUSTOMER to /customer/orders upon successful login', async () => {
    (httpClient.post as jest.MockedFunction<typeof httpClient.post>).mockResolvedValueOnce({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: { id: 'usr-c', role: 'CUSTOMER' },
    });

    const screen = await render(<LoginRoute />);
    const input = screen.getByLabelText('Số điện thoại hoặc Token');
    await fireEvent.changeText(input, 'customer-token');
    await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/customer/orders');
    });

    await screen.unmount();
  });

  it('redirects DRIVER to /driver/orders upon successful login', async () => {
    (httpClient.post as jest.MockedFunction<typeof httpClient.post>).mockResolvedValueOnce({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: { id: 'usr-d', role: 'DRIVER' },
    });

    const screen = await render(<LoginRoute />);
    const input = screen.getByLabelText('Số điện thoại hoặc Token');
    await fireEvent.changeText(input, 'driver-token');
    await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/driver/orders');
    });

    await screen.unmount();
  });

  it.each([
    { destination: '/customer/orders?preview=enabled', role: 'CUSTOMER' },
    { destination: '/driver/orders?preview=enabled', role: 'DRIVER' },
  ] as const)('preserves local preview mode when $role signs in', async ({ destination, role }) => {
    process.env.EXPO_PUBLIC_LEOPARD_UI_PREVIEW = 'enabled';
    (httpClient.post as jest.MockedFunction<typeof httpClient.post>).mockResolvedValueOnce({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: { id: `usr-${role.toLowerCase()}`, role },
    });

    const screen = await render(<LoginRoute />);
    const input = screen.getByLabelText('Số điện thoại hoặc Token');
    await fireEvent.changeText(input, `${role.toLowerCase()}-token`);
    await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(destination);
    });

    await screen.unmount();
  });

  it('returns unsupported FLEET_OWNER sessions to the mobile login route', async () => {
    (httpClient.post as jest.MockedFunction<typeof httpClient.post>).mockResolvedValueOnce({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: { id: 'usr-f', role: 'FLEET_OWNER' },
    });

    const screen = await render(<LoginRoute />);
    const input = screen.getByLabelText('Số điện thoại hoặc Token');
    await fireEvent.changeText(input, 'fleet-token');
    await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(public)/login');
    });

    await screen.unmount();
  });

  it('returns unsupported ADMIN sessions to the mobile login route', async () => {
    (httpClient.post as jest.MockedFunction<typeof httpClient.post>).mockResolvedValueOnce({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: { id: 'usr-a', role: 'ADMIN' },
    });

    const screen = await render(<LoginRoute />);
    const input = screen.getByLabelText('Số điện thoại hoặc Token');
    await fireEvent.changeText(input, 'admin-token');
    await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(public)/login');
    });

    await screen.unmount();
  });
});
