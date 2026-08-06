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

  it('handles demo login flow and triggers sessionStore and onLoginSuccess', async () => {
    (httpClient.post as jest.MockedFunction<typeof httpClient.post>).mockResolvedValueOnce({
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      user: { id: 'usr-customer', role: 'CUSTOMER' },
    });

    const onLoginSuccess = jest.fn();
    const screen = await render(<LoginScreen allowDemo={true} onLoginSuccess={onLoginSuccess} />);

    await fireEvent.press(screen.getByText('Demo Customer'));

    await waitFor(() => {
      expect(httpClient.post).toHaveBeenCalledWith('/auth/login/demo', { accountId: 'demo-customer' });
      expect(sessionStore.setSession).toHaveBeenCalledWith('test-access-token', 'test-refresh-token');
      expect(onLoginSuccess).toHaveBeenCalledWith('CUSTOMER');
    });

    await screen.unmount();
  });

  it('handles phone token login flow successfully', async () => {
    (httpClient.post as jest.MockedFunction<typeof httpClient.post>).mockResolvedValueOnce({
      accessToken: 'firebase-access-token',
      refreshToken: 'firebase-refresh-token',
      user: { id: 'usr-driver', role: 'DRIVER' },
    });

    const onLoginSuccess = jest.fn();
    const screen = await render(<LoginScreen onLoginSuccess={onLoginSuccess} />);

    const input = screen.getByLabelText('Số điện thoại hoặc Token');
    await fireEvent.changeText(input, 'firebase-id-token-123');
    await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => {
      expect(httpClient.post).toHaveBeenCalledWith('/auth/firebase', { idToken: 'firebase-id-token-123' });
      expect(sessionStore.setSession).toHaveBeenCalledWith('firebase-access-token', 'firebase-refresh-token');
      expect(onLoginSuccess).toHaveBeenCalledWith('DRIVER');
    });

    await screen.unmount();
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
      accessToken: 'token',
      refreshToken: 'refresh',
      user: { id: 'usr-driver', role: 'DRIVER' },
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
