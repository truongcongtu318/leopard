import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, waitFor } from '@testing-library/react-native';

const mockReplace = jest.fn();
const mockUseProtectedLayout = jest.fn();

jest.mock('expo-router', () => ({
  Slot: () => null,
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('./role-router', () => ({
  useProtectedLayout: (...args: unknown[]) => mockUseProtectedLayout(...args),
}));

import CustomerLayout from '../../app/customer/_layout';
import DriverLayout from '../../app/driver/_layout';

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

    const screen = await render(<CustomerLayout />);

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
      redirectTo: '/customer/orders',
    });

    await render(<DriverLayout />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/customer/orders');
    });
  });
});
