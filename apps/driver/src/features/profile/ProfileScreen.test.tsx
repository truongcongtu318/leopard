import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { DriverProfileScreen } from './ProfileScreen';
import type { ProfileContentView } from './model';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}));

const fixtureProfile: ProfileContentView = {
  scenarioId: 'DP-01',
  kind: 'content',
  phone: '0901234567',
  name: 'Trần Văn Nam',
  email: 'nam.tran@leopard.vn',
  avatarUrl: null,
  vehicleLabel: '51C-123.45 · Xe tải 2.5T',
  roleLabel: 'Tài xế đối tác',
  statusLabel: 'Đang hoạt động',
  statusTone: 'active',
  appVersion: '2.4.0',
  isLoggingOut: false,
};

describe('DriverProfileScreen', () => {
  it('renders driver profile with bottom navigation dock', async () => {
    const screen = await render(<DriverProfileScreen view={fixtureProfile} />);

    expect(screen.getByText('Hồ sơ tài xế')).toBeTruthy();
    expect(screen.getByText('Trần Văn Nam')).toBeTruthy();
    expect(screen.getByTestId('driver-bottom-navigation')).toBeTruthy();

    const profileTab = screen.getByLabelText(/Hồ sơ|Tôi/);
    expect(profileTab.props.accessibilityState).toEqual({ selected: true });

    await screen.unmount();
  });

  it('renders bottom navigation even in error boundary view so driver is not trapped', async () => {
    const screen = await render(
      <DriverProfileScreen
        view={{
          kind: 'error',
          message: 'Không thể tải hồ sơ',
          scenarioId: 'DP-ERR',
          title: 'Lỗi tải hồ sơ',
        }}
      />,
    );

    expect(screen.getByText('Lỗi tải hồ sơ')).toBeTruthy();
    expect(screen.getByTestId('driver-bottom-navigation')).toBeTruthy();

    await screen.unmount();
  });

  it('navigates to /orders when pressing Trang chủ tab', async () => {
    const onNavigate = jest.fn();
    const screen = await render(
      <DriverProfileScreen onNavigate={onNavigate} view={fixtureProfile} />,
    );

    const homeTab = screen.getByLabelText('Trang chủ');
    await fireEvent.press(homeTab);

    expect(onNavigate).toHaveBeenCalledWith('/orders');

    await screen.unmount();
  });
});
