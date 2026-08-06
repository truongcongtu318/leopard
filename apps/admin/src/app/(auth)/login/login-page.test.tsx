import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';

import LoginPage from './page';
import { browserClient } from '../../../lib/api/browser-client';

const mockPush = jest.fn();

const mockRouter = {
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  push: mockPush,
  replace: jest.fn(),
  prefetch: jest.fn(),
};

function renderWithRouter(ui: React.ReactNode) {
  return render(
    <AppRouterContext.Provider value={mockRouter as never}>
      {ui}
    </AppRouterContext.Provider>,
  );
}

describe('LoginPage (Admin)', () => {
  let postSpy: jest.SpiedFunction<typeof browserClient.post>;

  beforeEach(() => {
    jest.clearAllMocks();
    postSpy = jest.spyOn(browserClient, 'post') as jest.SpiedFunction<typeof browserClient.post>;
  });

  it('renders LoginForm inside LoginPage', () => {
    renderWithRouter(<LoginPage />);
    expect(screen.getByLabelText('Số điện thoại hoặc Token')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeTruthy();
  });

  it('redirects ADMIN to /admin upon successful login', async () => {
    postSpy.mockResolvedValueOnce({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: { id: 'admin-1', role: 'ADMIN' },
      expiresAt: '2026-12-31T23:59:59Z',
    });

    renderWithRouter(<LoginPage />);
    const input = screen.getByLabelText('Số điện thoại hoặc Token');
    fireEvent.change(input, { target: { value: 'admin-token' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/admin');
    });
  });

  it('redirects FLEET_OWNER to /fleet upon successful login', async () => {
    postSpy.mockResolvedValueOnce({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: { id: 'fleet-1', role: 'FLEET_OWNER' },
      expiresAt: '2026-12-31T23:59:59Z',
    });

    renderWithRouter(<LoginPage />);
    const input = screen.getByLabelText('Số điện thoại hoặc Token');
    fireEvent.change(input, { target: { value: 'fleet-token' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/fleet');
    });
  });

  it('redirects CUSTOMER to /customer/orders upon successful login', async () => {
    postSpy.mockResolvedValueOnce({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: { id: 'cust-1', role: 'CUSTOMER' },
      expiresAt: '2026-12-31T23:59:59Z',
    });

    renderWithRouter(<LoginPage />);
    const input = screen.getByLabelText('Số điện thoại hoặc Token');
    fireEvent.change(input, { target: { value: 'cust-token' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/customer/orders');
    });
  });

  it('redirects DRIVER to /driver/orders upon successful login', async () => {
    postSpy.mockResolvedValueOnce({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: { id: 'driver-1', role: 'DRIVER' },
      expiresAt: '2026-12-31T23:59:59Z',
    });

    renderWithRouter(<LoginPage />);
    const input = screen.getByLabelText('Số điện thoại hoặc Token');
    fireEvent.change(input, { target: { value: 'driver-token' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/driver/orders');
    });
  });
});
