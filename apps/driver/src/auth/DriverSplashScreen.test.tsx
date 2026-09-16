import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

import { DriverSplashScreen } from './DriverSplashScreen';

jest.mock('react-native-safe-area-context', () => {
  const actual =
    jest.requireActual<typeof import('react-native-safe-area-context')>(
      'react-native-safe-area-context',
    );
  return {
    ...actual,
    useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
  };
});

describe('DriverSplashScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders splash screen with splash_river image, indicators, and text hierarchy', async () => {
    const rendered = await render(<DriverSplashScreen />);

    expect(rendered.getByTestId('driver-splash-screen')).toBeTruthy();
    expect(rendered.getByTestId('splash-river-image')).toBeTruthy();
    expect(rendered.getByTestId('splash-leopard-emblem')).toBeTruthy();
    expect(rendered.getByTestId('splash-leopard-wordmark')).toBeTruthy();
    expect(rendered.getByText('DRIVER PILOT')).toBeTruthy();
    expect(rendered.getByTestId('splash-indicators')).toBeTruthy();

    const titleEl = rendered.getByTestId('splash-title');
    expect(titleEl.props.children).toContain('Vận tải thông minh');

    const subtitleEl = rendered.getByTestId('splash-subtitle');
    expect(subtitleEl.props.children).toContain('Theo dõi lộ trình thời gian thực');

    const buttonEl = rendered.getByTestId('splash-get-started-btn');
    expect(buttonEl).toBeTruthy();
    await rendered.unmount();
  });

  it('invokes onGetStarted callback when Get Started button is pressed', async () => {
    const handleGetStarted = jest.fn();
    const rendered = await render(<DriverSplashScreen onGetStarted={handleGetStarted} />);

    const buttonEl = rendered.getByTestId('splash-get-started-btn');
    await fireEvent.press(buttonEl);

    await waitFor(() => {
      expect(handleGetStarted).toHaveBeenCalledTimes(1);
    });
    await rendered.unmount();
  });

  it('supports custom title, subtitle, and button label', async () => {
    const rendered = await render(
      <DriverSplashScreen
        buttonText="Bắt đầu ngay"
        subtitle="Đồng hành cùng LEOPARD Driver"
        title="Vận chuyển thông minh"
      />,
    );

    expect(rendered.getByText('Vận chuyển thông minh')).toBeTruthy();
    expect(rendered.getByText('Đồng hành cùng LEOPARD Driver')).toBeTruthy();
    expect(rendered.getByText('Bắt đầu ngay')).toBeTruthy();
    await rendered.unmount();
  });
});
