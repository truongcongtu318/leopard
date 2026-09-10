import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  usePathname: () => '/customer/orders',
  useRouter: () => ({ push: mockPush }),
}));

import { TabBar } from './TabBar';

describe('TabBar', () => {
  const items = [
    { id: 'orders', label: 'Đơn hàng', route: '/customer/orders' },
    { id: 'profile', label: 'Hồ sơ', route: '/customer/profile' },
  ] as const;

  it('renders a tab for every item with an accessible role', async () => {
    const rendered = await render(<TabBar items={items} />);

    expect(rendered.getByRole('tab', { name: 'Đơn hàng' })).toBeTruthy();
    expect(rendered.getByRole('tab', { name: 'Hồ sơ' })).toBeTruthy();
    await rendered.unmount();
  });

  it('marks the tab matching the current route as selected', async () => {
    const rendered = await render(<TabBar items={items} />);

    const ordersTab = rendered.getByRole('tab', { name: 'Đơn hàng' });
    expect(ordersTab.props.accessibilityState?.selected).toBe(true);
    const profileTab = rendered.getByRole('tab', { name: 'Hồ sơ' });
    expect(profileTab.props.accessibilityState?.selected).toBe(false);
    await rendered.unmount();
  });

  it('navigates to the tab route on press', async () => {
    const rendered = await render(<TabBar items={items} />);

    fireEvent.press(rendered.getByRole('tab', { name: 'Hồ sơ' }));

    expect(mockPush).toHaveBeenCalledWith('/customer/profile');
    await rendered.unmount();
  });
});
