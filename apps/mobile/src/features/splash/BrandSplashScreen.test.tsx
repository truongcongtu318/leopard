import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { AccessibilityInfo } from 'react-native';

import { BrandSplashScreen } from './BrandSplashScreen';

describe('BrandSplashScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders emblem and wordmark elements centered correctly', async () => {
    const screen = await render(<BrandSplashScreen />);

    expect(screen.getByTestId('brand-splash-screen')).toBeTruthy();
    expect(screen.getByTestId('splash-leopard-emblem')).toBeTruthy();
    expect(screen.getByTestId('splash-leopard-wordmark')).toBeTruthy();
    await screen.unmount();
  });

  it('calls onFinish when tapped by the user to skip', async () => {
    const mockFinish = jest.fn();
    const screen = await render(<BrandSplashScreen onFinish={mockFinish} />);

    const button = screen.getByHintText('Nhấn để bỏ qua màn hình chào');
    await fireEvent.press(button);

    expect(mockFinish).toHaveBeenCalledTimes(1);
    await screen.unmount();
  });

  it('respects reduceMotion accessibility setting', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true as any);
    const mockFinish = jest.fn();

    const screen = await render(<BrandSplashScreen onFinish={mockFinish} />);

    expect(screen.getByTestId('splash-leopard-emblem')).toBeTruthy();
    expect(screen.getByTestId('splash-leopard-wordmark')).toBeTruthy();
    await screen.unmount();
  });
});
