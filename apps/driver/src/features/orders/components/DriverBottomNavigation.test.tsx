import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { DriverBottomNavigation } from './DriverBottomNavigation';

describe('DriverBottomNavigation - Grab-Style Docked 4 Tabs', () => {
  it('renders all 4 tabs with correct accessibility labels', async () => {
    const screen = await render(<DriverBottomNavigation activeTab="home" />);

    expect(screen.getByTestId('driver-bottom-navigation')).toBeTruthy();
    expect(screen.getByLabelText('Trang chủ')).toBeTruthy();
    expect(screen.getByLabelText('Đơn')).toBeTruthy();
    expect(screen.getByLabelText('Thu nhập')).toBeTruthy();
    expect(screen.getByLabelText('Hồ sơ')).toBeTruthy();

    await screen.unmount();
  });

  it('marks the active tab as selected based on activeTab prop', async () => {
    const screen = await render(<DriverBottomNavigation activeTab="board" />);

    const homeTab = screen.getByLabelText('Trang chủ');
    const boardTab = screen.getByLabelText('Đơn');
    const earningsTab = screen.getByLabelText('Thu nhập');
    const profileTab = screen.getByLabelText('Hồ sơ');

    expect(boardTab.props.accessibilityState).toEqual({ selected: true });
    expect(homeTab.props.accessibilityState).toEqual({ selected: false });
    expect(earningsTab.props.accessibilityState).toEqual({ selected: false });
    expect(profileTab.props.accessibilityState).toEqual({ selected: false });

    await screen.unmount();
  });

  it('navigates to /orders when pressing Trang chủ from another active tab', async () => {
    const onNavigate = jest.fn();
    const onSelectTab = jest.fn();
    const screen = await render(
      <DriverBottomNavigation
        activeTab="board"
        onNavigate={onNavigate}
        onSelectTab={onSelectTab}
      />,
    );

    const homeTab = screen.getByLabelText('Trang chủ');
    await fireEvent.press(homeTab);

    expect(onSelectTab).toHaveBeenCalledWith('home');
    expect(onNavigate).toHaveBeenCalledWith('/orders');

    await screen.unmount();
  });

  it('navigates to /board, /earnings, /profile when pressing respective tabs from home', async () => {
    const onNavigate = jest.fn();
    const screen = await render(
      <DriverBottomNavigation activeTab="home" onNavigate={onNavigate} />,
    );

    await fireEvent.press(screen.getByLabelText('Đơn'));
    expect(onNavigate).toHaveBeenCalledWith('/board');

    await fireEvent.press(screen.getByLabelText('Thu nhập'));
    expect(onNavigate).toHaveBeenCalledWith('/earnings');

    await fireEvent.press(screen.getByLabelText('Hồ sơ'));
    expect(onNavigate).toHaveBeenCalledWith('/profile');

    await screen.unmount();
  });

  it('does not re-navigate when pressing the currently active tab', async () => {
    const onNavigate = jest.fn();
    const onSelectTab = jest.fn();
    const screen = await render(
      <DriverBottomNavigation
        activeTab="home"
        onNavigate={onNavigate}
        onSelectTab={onSelectTab}
      />,
    );

    await fireEvent.press(screen.getByLabelText('Trang chủ'));

    expect(onSelectTab).toHaveBeenCalledWith('home');
    expect(onNavigate).not.toHaveBeenCalled();

    await screen.unmount();
  });
});
