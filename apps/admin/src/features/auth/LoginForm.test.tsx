import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

import { LoginForm } from './LoginForm';
import { browserClient } from '../../lib/api/browser-client';
import { getSession, clearSession } from '../../lib/auth/session';
import { ApiError } from '../../lib/api/api-error';

describe('LoginForm (Admin)', () => {
  let postSpy: jest.SpiedFunction<typeof browserClient.post>;

  beforeEach(async () => {
    jest.clearAllMocks();
    await clearSession();
    postSpy = jest.spyOn(browserClient, 'post') as jest.SpiedFunction<typeof browserClient.post>;
  });

  it('renders input field and submit button', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText('Số điện thoại hoặc Token')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeTruthy();
  });

  it('renders session expired alert banner when sessionExpired prop is true', () => {
    render(<LoginForm sessionExpired={true} />);
    expect(screen.getByRole('alert').textContent).toContain('Phiên làm việc đã hết hạn');
  });

  it('renders demo account options when allowDemo prop is true', () => {
    render(<LoginForm allowDemo={true} />);
    expect(screen.getByText('Tài khoản demo')).toBeTruthy();
    expect(screen.getByText('Demo Admin')).toBeTruthy();
    expect(screen.getByText('Demo Fleet Owner')).toBeTruthy();
  });

  it('authenticates via demo account and invokes setSession and onSuccess', async () => {
    postSpy.mockResolvedValueOnce({
      accessToken: 'demo-acc-token',
      refreshToken: 'demo-ref-token',
      user: { id: 'usr-admin-1', role: 'ADMIN' },
      expiresAt: '2026-12-31T23:59:59Z',
    });

    const onSuccess = jest.fn();
    render(<LoginForm allowDemo={true} onSuccess={onSuccess} />);

    fireEvent.click(screen.getByText('Demo Admin'));

    await waitFor(async () => {
      expect(postSpy).toHaveBeenCalledWith('/auth/login/demo', { accountId: 'demo-admin' });
      const session = await getSession();
      expect(session).toEqual({
        userId: 'usr-admin-1',
        role: 'ADMIN',
        expiresAt: '2026-12-31T23:59:59Z',
      });
      expect(onSuccess).toHaveBeenCalledWith('ADMIN');
    });
  });

  it('authenticates via phone/firebase token and invokes setSession and onSuccess', async () => {
    postSpy.mockResolvedValueOnce({
      accessToken: 'admin-token',
      refreshToken: 'admin-refresh',
      user: { id: 'usr-fleet-1', role: 'FLEET_OWNER' },
      expiresAt: '2026-12-31T23:59:59Z',
    });

    const onSuccess = jest.fn();
    render(<LoginForm onSuccess={onSuccess} />);

    const input = screen.getByLabelText('Số điện thoại hoặc Token');
    fireEvent.change(input, { target: { value: 'firebase-admin-id-token' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(async () => {
      expect(postSpy).toHaveBeenCalledWith('/auth/firebase', { idToken: 'firebase-admin-id-token' });
      const session = await getSession();
      expect(session).toEqual({
        userId: 'usr-fleet-1',
        role: 'FLEET_OWNER',
        expiresAt: '2026-12-31T23:59:59Z',
      });
      expect(onSuccess).toHaveBeenCalledWith('FLEET_OWNER');
    });
  });

  it('disables inputs and displays submitting state during request', async () => {
    let resolvePost: (val: unknown) => void = () => {};
    const postPromise = new Promise((res) => {
      resolvePost = res;
    });

    postSpy.mockReturnValueOnce(postPromise as Promise<never>);

    render(<LoginForm allowDemo={true} />);

    fireEvent.click(screen.getByText('Demo Admin'));

    await waitFor(() => {
      const button = screen.getByRole('button', { name: 'Đang xử lý...' }) as HTMLButtonElement;
      const input = screen.getByLabelText('Số điện thoại hoặc Token') as HTMLInputElement;
      expect(button.disabled).toBe(true);
      expect(input.disabled).toBe(true);
    });

    resolvePost({
      accessToken: 'acc',
      refreshToken: 'ref',
      user: { id: 'usr-admin-1', role: 'ADMIN' },
      expiresAt: '2026-12-31T23:59:59Z',
    });

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Đang xử lý...' })).toBeNull();
    });
  });

  it('displays invalid credentials error message on 401/403 response', async () => {
    postSpy.mockRejectedValueOnce(
      new ApiError(401, 'UNAUTHORIZED', 'Mã xác thực không hợp lệ'),
    );

    render(<LoginForm />);
    const input = screen.getByLabelText('Số điện thoại hoặc Token');
    fireEvent.change(input, { target: { value: 'invalid-id-token' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('Mã xác thực không hợp lệ');
    });
  });

  it('displays provider unavailable error on 503 or network error', async () => {
    postSpy.mockRejectedValueOnce(
      new ApiError(503, 'SERVICE_UNAVAILABLE', 'Hệ thống xác thực tạm thời không khả dụng'),
    );

    render(<LoginForm />);
    const input = screen.getByLabelText('Số điện thoại hoặc Token');
    fireEvent.change(input, { target: { value: 'any-token' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('Hệ thống xác thực tạm thời không khả dụng');
    });
  });
});
