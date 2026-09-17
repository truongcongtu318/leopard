import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { haptic } from '@leopard/mobile-core';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  usePathname: () => '/customer/orders',
  useRouter: () => ({ push: mockPush }),
}));
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (c: any) => c,
    },
    useSharedValue: (init: any) => ({ value: init }),
    useAnimatedStyle: (fn: any) => fn() || {},
    withSpring: (val: any) => val,
    withTiming: (val: any) => val,
  };
});

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

    await fireEvent.press(rendered.getByRole('tab', { name: 'Hồ sơ' }));

    expect(mockPush).toHaveBeenCalledWith('/customer/profile');
    await rendered.unmount();
  });

  it('triggers haptic feedback when tab is pressed', async () => {
    const hapticSpy = jest.spyOn(haptic, 'selection');

    const rendered = await render(<TabBar items={items} />);
    await fireEvent.press(rendered.getByRole('tab', { name: 'Hồ sơ' }));

    expect(hapticSpy).toHaveBeenCalledTimes(1);
    hapticSpy.mockRestore();
    await rendered.unmount();
  });

  it('renders floating capsule glass container with 1px border and pill shape', async () => {
    const rendered = await render(<TabBar items={items} />);
    const capsule = rendered.getByTestId('tab-bar-capsule');
    expect(capsule).toBeTruthy();

    const flatStyle = [capsule.props.style].flat().reduce((acc: any, cur: any) => ({ ...acc, ...cur }), {});
    expect(flatStyle.borderWidth).toBe(1);
    expect(flatStyle.borderRadius).toBe(9999);
    expect(flatStyle.borderColor).toBe('rgba(255, 255, 255, 0.65)');

    await rendered.unmount();
  });

  it('renders unread badge dot when item hasUnread or badgeCount', async () => {
    const itemsWithBadge = [
      { id: 'orders', label: 'Đơn hàng', route: '/customer/orders', hasUnread: true },
      { id: 'profile', label: 'Hồ sơ', route: '/customer/profile', badgeCount: 3 },
    ] as const;

    const rendered = await render(<TabBar items={itemsWithBadge} />);
    const unreadDots = rendered.getAllByTestId('tab-unread-dot');
    expect(unreadDots.length).toBe(2);

    await rendered.unmount();
  });
});
