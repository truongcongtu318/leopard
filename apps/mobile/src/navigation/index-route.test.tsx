import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockReplace = jest.fn();
let mockSessionRouterResult = {
  isHydrated: false,
  redirectTo: null as string | null,
};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

jest.mock('./role-router', () => ({
  useRootSessionRouter: () => mockSessionRouterResult,
}));

import IndexRoute from '../../app/index';

describe('Root IndexRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionRouterResult = {
      isHydrated: false,
      redirectTo: null,
    };
  });

  it('renders BrandSplashScreen while session is hydrating', async () => {
    mockSessionRouterResult = { isHydrated: false, redirectTo: null };
    const screen = await render(<IndexRoute />);

    expect(screen.getByTestId('brand-splash-screen')).toBeTruthy();
    expect(screen.getByTestId('splash-leopard-emblem')).toBeTruthy();
    expect(screen.getByTestId('splash-leopard-wordmark')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
    await screen.unmount();
  });

  it('redirects unauthenticated users to /(public)/login or onboarding when splash finishes', async () => {
    mockSessionRouterResult = { isHydrated: true, redirectTo: '/(public)/onboarding' };
    const screen = await render(<IndexRoute />);

    // Simulate splash screen tap/completion
    fireEvent.press(screen.getByHintText('Nhấn để bỏ qua màn hình chào'));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(public)/onboarding');
    });
    await screen.unmount();
  });

  it('redirects CUSTOMER users to /customer/home when splash finishes', async () => {
    mockSessionRouterResult = { isHydrated: true, redirectTo: '/customer/home' };
    const screen = await render(<IndexRoute />);

    fireEvent.press(screen.getByHintText('Nhấn để bỏ qua màn hình chào'));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/customer/home');
    });
    await screen.unmount();
  });

  it('redirects DRIVER users to /driver/orders when splash finishes', async () => {
    mockSessionRouterResult = { isHydrated: true, redirectTo: '/driver/orders' };
    const screen = await render(<IndexRoute />);

    fireEvent.press(screen.getByHintText('Nhấn để bỏ qua màn hình chào'));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/driver/orders');
    });
    await screen.unmount();
  });
});
