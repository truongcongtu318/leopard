import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, waitFor, cleanup, fireEvent, act } from '@testing-library/react-native';

// Audit expectations express desired behavior. Known failures are deliberately
// retained as regression evidence.

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));

jest.mock('@leopard/mobile-core', () => ({
  __esModule: true,
  sessionStore: {
    hydrate: jest.fn(),
    getAccessToken: jest.fn(),
    getRefreshToken: jest.fn(),
    getRole: jest.fn(),
  },
  refreshSession: jest.fn(),
}));

import { refreshSession, sessionStore } from '@leopard/mobile-core';
import DriverIndex from '../../app/index';

describe('Driver cold-start session restore audit', () => {
  const mockHydrate = sessionStore.hydrate as jest.MockedFunction<typeof sessionStore.hydrate>;
  const mockGetAccessToken = sessionStore.getAccessToken as jest.MockedFunction<typeof sessionStore.getAccessToken>;
  const mockGetRefreshToken = sessionStore.getRefreshToken as jest.MockedFunction<typeof sessionStore.getRefreshToken>;
  const mockGetRole = sessionStore.getRole as jest.MockedFunction<typeof sessionStore.getRole>;
  const mockRefreshSession = refreshSession as jest.MockedFunction<typeof refreshSession>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRole.mockReturnValue('DRIVER');
  });
  afterEach(() => {
    jest.useRealTimers();
    cleanup();
  });

  it('attempts a token refresh before treating a hydrated driver as logged out', async () => {
    mockHydrate.mockResolvedValue(true);
    mockGetAccessToken.mockReturnValue(null);
    mockGetRefreshToken.mockResolvedValue('valid-refresh-token');
    mockRefreshSession.mockResolvedValue(true);

    const screen = await render(<DriverIndex />);

    await waitFor(() => expect(mockRefreshSession).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/orders'));
    expect(mockReplace).not.toHaveBeenCalledWith('/(public)/login');
    await screen.unmount();
  });

  it('only redirects to login when there is no refresh token to recover with', async () => {
    mockHydrate.mockResolvedValue(true);
    mockGetAccessToken.mockReturnValue(null);
    mockGetRefreshToken.mockResolvedValue(null);

    const screen = await render(<DriverIndex />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(public)/login'));
    expect(mockRefreshSession).not.toHaveBeenCalled();
    await screen.unmount();
  });

  it('respects minDurationMs and allows instant bypass via Get Started button', async () => {
    mockHydrate.mockResolvedValue(true);
    mockGetAccessToken.mockReturnValue('valid-token');
    mockGetRefreshToken.mockResolvedValue(null);

    const screen = await render(<DriverIndex minDurationMs={3000} />);

    expect(screen.getByTestId('driver-splash-screen')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();

    // Tapping Get Started bypasses waiting and immediately navigates
    const buttonEl = screen.getByTestId('splash-get-started-btn');
    await fireEvent.press(buttonEl);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/orders'));
  });

  it('automatically navigates to resolved destination once minDurationMs elapses', async () => {
    jest.useFakeTimers();
    mockHydrate.mockResolvedValue(true);
    mockGetAccessToken.mockReturnValue('valid-token');
    mockGetRefreshToken.mockResolvedValue(null);

    const screen = await render(<DriverIndex minDurationMs={3500} />);

    expect(screen.getByTestId('driver-splash-screen')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();

    // Advance past the 3.5s duration
    act(() => {
      jest.advanceTimersByTime(3600);
    });

    expect(mockReplace).toHaveBeenCalledWith('/orders');
  });
});



