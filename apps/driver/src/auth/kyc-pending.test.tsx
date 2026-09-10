import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Linking } from 'react-native';

import KycPendingRoute from '../../app/(public)/kyc-pending';
import { httpClient } from '@leopard/mobile-core/src/api/http-client';
import { sessionStore } from '@leopard/mobile-core/src/auth/session-store';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
    canGoBack: () => true,
  }),
  useLocalSearchParams: () => ({
    vehicleType: 'Xe tải 1.25T',
    licensePlate: '59D-123.45',
  }),
}));

jest.mock('@leopard/mobile-core/src/api/http-client', () => ({
  httpClient: { get: jest.fn() },
}));

jest.mock('@leopard/mobile-core/src/auth/session-store', () => ({
  sessionStore: {
    clearSession: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  },
}));

describe('KycPendingRoute (Driver)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve());
  });

  it('renders hero card, vehicle summary card, refresh button, and hotline button', async () => {
    const screen = await render(<KycPendingRoute />);

    expect(screen.getByTestId('kyc-status-card')).toBeTruthy();
    expect(screen.getByText('Hồ sơ đang chờ phê duyệt')).toBeTruthy();
    expect(screen.getByText(/2–4 giờ làm việc/)).toBeTruthy();

    expect(screen.getByTestId('vehicle-summary-card')).toBeTruthy();
    expect(screen.getByText('59D-123.45')).toBeTruthy();
    expect(screen.getByText('Xe tải 1.25T')).toBeTruthy();

    expect(screen.getByTestId('btn-refresh-status')).toBeTruthy();
    expect(screen.getByTestId('btn-hotline')).toBeTruthy();

    await screen.unmount();
  });

  it('triggers phone dialer when hotline button is pressed', async () => {
    const screen = await render(<KycPendingRoute />);
    await fireEvent.press(screen.getByTestId('btn-hotline'));
    expect(Linking.openURL).toHaveBeenCalledWith('tel:19006789');
    await screen.unmount();
  });

  it('navigates to /orders when refresh status returns ACTIVE', async () => {
    (httpClient.get as jest.MockedFunction<typeof httpClient.get>).mockResolvedValueOnce({
      status: 'ACTIVE',
    });

    const screen = await render(<KycPendingRoute />);
    await fireEvent.press(screen.getByTestId('btn-refresh-status'));

    await waitFor(() => {
      expect(httpClient.get).toHaveBeenCalledWith('/driver/application');
      expect(mockReplace).toHaveBeenCalledWith('/orders');
    });

    await screen.unmount();
  });

  it('displays rejection message when refresh status returns REJECTED', async () => {
    (httpClient.get as jest.MockedFunction<typeof httpClient.get>).mockResolvedValueOnce({
      status: 'REJECTED',
      rejectionReason: 'Ảnh bằng lái xe bị mờ, không rõ số',
    });

    const screen = await render(<KycPendingRoute />);
    await fireEvent.press(screen.getByTestId('btn-refresh-status'));

    await waitFor(() => {
      expect(screen.getByTestId('kyc-refresh-message')).toBeTruthy();
      expect(screen.getByText('Ảnh bằng lái xe bị mờ, không rõ số')).toBeTruthy();
    });

    await screen.unmount();
  });

  it('clears session and navigates to login when logout is pressed', async () => {
    const screen = await render(<KycPendingRoute />);
    await fireEvent.press(screen.getByTestId('btn-logout'));

    await waitFor(() => {
      expect(sessionStore.clearSession).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/(public)/login');
    });

    await screen.unmount();
  });
});
