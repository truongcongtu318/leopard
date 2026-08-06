import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';

import { LoginScreen } from './LoginScreen';
import { httpClient } from '../api/http-client';
import { sessionStore } from './session-store';
import { ApiError } from '../api/api-error';

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

describe('LoginScreen (Mobile)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders header title and phone input form', async () => {
    const screen = await render(<LoginScreen />);
    expect(screen.getByRole('header', { name: 'Đăng nhập' })).toBeTruthy();
    expect(screen.getByLabelText('Số điện thoại hoặc Token')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeTruthy();
    await screen.unmount();
  });

  it('shows session expired notification banner when sessionExpired prop is true', async () => {
    const screen = await render(<LoginScreen sessionExpired={true} />);
    expect(screen.getByRole('alert').props.children).toContain('Phiên làm việc đã hết hạn');
    await screen.unmount();
  });

  it('renders demo account selection buttons when allowDemo prop is true', async () => {
    const screen = await render(<LoginScreen allowDemo={true} />);
    expect(screen.getByText('Tài khoản demo')).toBeTruthy();
    expect(screen.getByText('Demo Customer')).toBeTruthy();
    expect(screen.getByText('Demo Driver')).toBeTruthy();
    expect(screen.getByText('Demo Fleet Owner')).toBeTruthy();
    expect(screen.getByText('Demo Admin')).toBeTruthy();
    await screen.unmount();
  });

  it('extracts session tokens from res.session on firebase login', async () => {
    const mockResponse = {
      user: { id: 'u1', phone: '0901234567', role: 'CUSTOMER', status: 'ACTIVE' },
      session: { accessToken: 'acc_123', refreshToken: 'ref_123', accessTokenExpiresAt: '2026-08-07', refreshTokenExpiresAt: '2026-08-14' },
    };
    (httpClient.post as jest.MockedFunction<typeof httpClient.post>).mockResolvedValueOnce(mockResponse);

    const onLoginSuccess = jest.fn();
    const screen = await render(<LoginScreen onLoginSuccess={onLoginSuccess} />);

    const input = screen.getByLabelText('Số điện thoại hoặc Token');
    await fireEvent.changeText(input, 'firebase-id-token-123');
    await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => {
      expect(httpClient.post).toHaveBeenCalledWith('/auth/firebase', { idToken: 'firebase-id-token-123' });
      expect(sessionStore.setSession).toHaveBeenCalledWith('acc_123', 'ref_123');
      expect(onLoginSuccess).toHaveBeenCalledWith('CUSTOMER');
    });

    await screen.unmount();
  });

  it('extracts session tokens from res.session on demo login', async () => {
    const mockResponse = {
      user: { id: 'usr-customer', phone: '0900000001', role: 'CUSTOMER', status: 'ACTIVE' },
      session: { accessToken: 'demo-acc-token', refreshToken: 'demo-ref-token', accessTokenExpiresAt: '2026-08-07', refreshTokenExpiresAt: '2026-08-14' },
    };
    (httpClient.post as jest.MockedFunction<typeof httpClient.post>).mockResolvedValueOnce(mockResponse);

    const onLoginSuccess = jest.fn();
    const screen = await render(<LoginScreen allowDemo={true} onLoginSuccess={onLoginSuccess} />);

    await fireEvent.press(screen.getByText('Demo Customer'));

    await waitFor(() => {
      expect(httpClient.post).toHaveBeenCalledWith('/auth/login/demo', { accountId: 'customer' });
      expect(sessionStore.setSession).toHaveBeenCalledWith('demo-acc-token', 'demo-ref-token');
      expect(onLoginSuccess).toHaveBeenCalledWith('CUSTOMER');
    });

    await screen.unmount();
  });

  it('sends correct demo IDs matching backend DEMO_ROLES keys', async () => {
    const makeResponse = (role: string) => ({
      user: { id: `usr-${role}`, phone: '0900000000', role, status: 'ACTIVE' },
      session: { accessToken: `tok-${role}`, refreshToken: `ref-${role}`, accessTokenExpiresAt: '2026-08-07', refreshTokenExpiresAt: '2026-08-14' },
    });

    const onLoginSuccess = jest.fn();

    // Test driver demo button
    (httpClient.post as jest.MockedFunction<typeof httpClient.post>).mockResolvedValueOnce(makeResponse('DRIVER'));
    const screen = await render(<LoginScreen allowDemo={true} onLoginSuccess={onLoginSuccess} />);
    await fireEvent.press(screen.getByText('Demo Driver'));
    await waitFor(() => {
      expect(httpClient.post).toHaveBeenCalledWith('/auth/login/demo', { accountId: 'driver' });
    });
    await screen.unmount();

    // Test fleet-owner demo button
    jest.clearAllMocks();
    (httpClient.post as jest.MockedFunction<typeof httpClient.post>).mockResolvedValueOnce(makeResponse('FLEET_OWNER'));
    const screen2 = await render(<LoginScreen allowDemo={true} onLoginSuccess={onLoginSuccess} />);
    await fireEvent.press(screen2.getByText('Demo Fleet Owner'));
    await waitFor(() => {
      expect(httpClient.post).toHaveBeenCalledWith('/auth/login/demo', { accountId: 'fleet-owner' });
    });
    await screen2.unmount();

    // Test admin demo button
    jest.clearAllMocks();
    (httpClient.post as jest.MockedFunction<typeof httpClient.post>).mockResolvedValueOnce(makeResponse('ADMIN'));
    const screen3 = await render(<LoginScreen allowDemo={true} onLoginSuccess={onLoginSuccess} />);
    await fireEvent.press(screen3.getByText('Demo Admin'));
    await waitFor(() => {
      expect(httpClient.post).toHaveBeenCalledWith('/auth/login/demo', { accountId: 'admin' });
    });
    await screen3.unmount();
  });

  it('disables inputs and shows submitting state during authentication request', async () => {
    let resolvePost: (val: unknown) => void = () => {};
    const postPromise = new Promise((res) => {
      resolvePost = res;
    });

    (httpClient.post as jest.MockedFunction<typeof httpClient.post>).mockReturnValueOnce(postPromise as Promise<never>);

    const screen = await render(<LoginScreen allowDemo={true} />);

    fireEvent.press(screen.getByText('Demo Driver'));

    await waitFor(() => {
      expect(screen.getByText('Đang xử lý...')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Đang xử lý...' }).props.accessibilityState).toMatchObject({
        disabled: true,
        busy: true,
      });
    });

    resolvePost({
      user: { id: 'usr-driver', phone: '0900000000', role: 'DRIVER', status: 'ACTIVE' },
      session: { accessToken: 'token', refreshToken: 'refresh', accessTokenExpiresAt: '2026-08-07', refreshTokenExpiresAt: '2026-08-14' },
    });

    await waitFor(() => {
      expect(screen.queryByText('Đang xử lý...')).toBeNull();
    });

    await screen.unmount();
  });

  it('displays invalid credentials error on 401 / 403 API response', async () => {
    (httpClient.post as jest.MockedFunction<typeof httpClient.post>).mockRejectedValueOnce(
      new ApiError(401, 'UNAUTHORIZED', 'Mã xác thực không hợp lệ hoặc đã hết hạn'),
    );

    const screen = await render(<LoginScreen />);
    const input = screen.getByLabelText('Số điện thoại hoặc Token');
    await fireEvent.changeText(input, 'invalid-token');
    await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => {
      expect(screen.getByRole('alert').props.children).toContain('Mã xác thực không hợp lệ hoặc đã hết hạn');
    });

    await screen.unmount();
  });

  it('displays provider unavailable error on network or 503 error', async () => {
    (httpClient.post as jest.MockedFunction<typeof httpClient.post>).mockRejectedValueOnce(
      new ApiError(503, 'SERVICE_UNAVAILABLE', 'Hệ thống xác thực tạm thời không khả dụng'),
    );

    const screen = await render(<LoginScreen />);
    const input = screen.getByLabelText('Số điện thoại hoặc Token');
    await fireEvent.changeText(input, 'any-token');
    await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => {
      expect(screen.getByRole('alert').props.children).toContain('Hệ thống xác thực tạm thời không khả dụng');
    });

    await screen.unmount();
  });
});
