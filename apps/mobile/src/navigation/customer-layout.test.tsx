import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({
  Slot: () => null,
  usePathname: () => '/customer/orders',
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('./role-router', () => ({
  useProtectedLayout: () => ({ canRenderProtectedContent: true, kind: 'authorized' }),
}));

// The customer layout mounts `useNotificationsBootstrap`, which transitively
// imports the real `firebase/app` ESM package via `src/auth/firebase.ts` —
// untransformable under Jest's default config. Mock it the same way
// `src/auth/login-route.test.tsx` does, since this test isn't exercising the
// notifications/firebase flow at all.
jest.mock('@leopard/mobile-core/src/auth/firebase', () => ({
  isFirebaseConfigured: () => false,
  getFirebaseApp: () => ({}),
  getFirebaseAuth: () => ({}),
  getFirebaseWebConfig: () => ({}),
}));

import { tabBarVisibilityStore } from './tabBarVisibilityStore';

describe('Customer layout', () => {
  beforeEach(() => {
    tabBarVisibilityStore.setHidden(false);
  });

  it('renders tabs for Home, Orders, Wallet and Account', async () => {
    const { default: CustomerLayout } = require('../../app/customer/_layout');
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = await render(
      <QueryClientProvider client={queryClient}>
        <CustomerLayout />
      </QueryClientProvider>,
    );

    expect(view.getByRole('tab', { name: 'Trang chủ' })).toBeTruthy();
    expect(view.getByRole('tab', { name: 'Đơn hàng' })).toBeTruthy();
    expect(view.getByRole('tab', { name: 'Ví' })).toBeTruthy();
    expect(view.getByRole('tab', { name: 'Tài khoản' })).toBeTruthy();
    await view.unmount();
  });

  it('hides FloatingNavBar when tabBarVisibilityStore is set to hidden during booking', async () => {
    const { default: CustomerLayout } = require('../../app/customer/_layout');
    tabBarVisibilityStore.setHidden(true);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = await render(
      <QueryClientProvider client={queryClient}>
        <CustomerLayout />
      </QueryClientProvider>,
    );

    expect(view.queryByRole('tab', { name: 'Trang chủ' })).toBeNull();
    expect(view.queryByRole('tab', { name: 'Đơn hàng' })).toBeNull();
    await view.unmount();
  });
});
