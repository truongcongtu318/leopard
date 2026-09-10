import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockReplace = jest.fn();
const mockUseProtectedLayout = jest.fn();

jest.mock('expo-router', () => ({
  Slot: () => null,
  usePathname: () => '/customer/orders',
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('./role-router', () => ({
  useProtectedLayout: (...args: unknown[]) => mockUseProtectedLayout(...args),
}));

// CustomerLayout mounts `useNotificationsBootstrap`, which transitively
// imports the real `firebase/app` ESM package via `src/auth/firebase.ts` —
// untransformable under Jest's default config. Mock it the same way
// `src/auth/login-route.test.tsx` does; this suite only exercises the
// redirect-on-denied path, not the notifications/firebase flow.
jest.mock('@leopard/mobile-core/src/auth/firebase', () => ({
  isFirebaseConfigured: () => false,
  getFirebaseApp: () => ({}),
  getFirebaseAuth: () => ({}),
  getFirebaseWebConfig: () => ({}),
}));

import CustomerLayout from '../../app/customer/_layout';
import DriverLayout from '../../app/driver/_layout';

function renderWithQueryClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('mobile protected layouts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects unauthenticated customer sessions instead of rendering a protected slot', async () => {
    mockUseProtectedLayout.mockReturnValue({
      canRenderProtectedContent: false,
      kind: 'denied',
      reason: 'unauthenticated',
      redirectTo: '/(public)/login',
    });

    const screen = await renderWithQueryClient(<CustomerLayout />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(public)/login');
    });
    expect(screen.queryByText('Đang kiểm tra phiên và quyền truy cập.')).toBeNull();
  });

  it('redirects a role-mismatched driver session to its role home', async () => {
    mockUseProtectedLayout.mockReturnValue({
      canRenderProtectedContent: false,
      kind: 'denied',
      reason: 'role-mismatch',
      redirectTo: '/customer/home',
    });

    await renderWithQueryClient(<DriverLayout />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/customer/home');
    });
  });
});
