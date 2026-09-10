import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockReplace = jest.fn();
const mockUseProtectedLayout = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/customer/home',
  Slot: () => null,
}));

jest.mock('./role-router', () => ({
  useProtectedLayout: (...args: unknown[]) => mockUseProtectedLayout(...args),
}));

// CustomerLayout renders NotificationsRuntime, which unconditionally
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

  it('redirects an unsupported role session to login', async () => {
    mockUseProtectedLayout.mockReturnValue({
      canRenderProtectedContent: false,
      kind: 'denied',
      reason: 'unsupported-mobile-role',
      redirectTo: '/(public)/login',
    });

    await renderWithQueryClient(<CustomerLayout />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(public)/login');
    });
  });
});
