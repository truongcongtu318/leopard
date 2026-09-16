import { describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';

import { DriverProfileScreen } from './ProfileScreen';
import type { ProfileContentView } from './model';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
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
  it('renders driver profile identity and name', async () => {
    const screen = await render(<DriverProfileScreen view={fixtureProfile} />);

    expect(screen.getByText('Hồ sơ tài xế')).toBeTruthy();
    expect(screen.getByText('Trần Văn Nam')).toBeTruthy();

    await screen.unmount();
  });

  it('does not fall back to a hardcoded name when BE name is null', async () => {
    const screen = await render(<DriverProfileScreen view={{ ...fixtureProfile, name: null }} />);

    expect(screen.queryByText('Trần Văn Nam')).toBeNull();
    expect(screen.getByText('0901 234 567')).toBeTruthy();

    await screen.unmount();
  });

  it('renders error boundary view cleanly when error occurs', async () => {
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

    await screen.unmount();
  });
});
