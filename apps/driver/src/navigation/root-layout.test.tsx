import { describe, expect, it, jest } from '@jest/globals';
import { render, within } from '@testing-library/react-native';
import React from 'react';

import RootLayout from '../../app/_layout';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>(
    'react-native-safe-area-context',
  );
  const ReactModule = require('react');
  return {
    ...actual,
    SafeAreaProvider: ({ children }: { children?: React.ReactNode }) =>
      ReactModule.createElement(
        actual.SafeAreaProvider,
        {
          initialMetrics: {
            frame: { x: 0, y: 0, width: 390, height: 844 },
            insets: { top: 0, left: 0, right: 0, bottom: 0 },
          },
        },
        children,
      ),
  };
});

jest.mock('expo-router', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return {
    Slot: () => ReactModule.createElement(View, { testID: 'mock-routed-slot' }),
  };
});

jest.mock('../features/orders/useDriverIdlePing', () => ({
  useDriverIdlePing: jest.fn(),
}));

jest.mock('./DriverDrawerContext', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return {
    DriverDrawerProvider: ({ children }: { children: React.ReactNode }) =>
      ReactModule.createElement(
        View,
        { testID: 'mock-drawer-provider-container' },
        children,
        ReactModule.createElement(View, { testID: 'mock-drawer-sentinel' }),
      ),
  };
});

describe('RootLayout composition', () => {
  it('renders both routed content and provider drawer as descendants of driver-viewport-frame and driver-safe-area', async () => {
    const screen = await render(<RootLayout />);

    const frame = screen.getByTestId('driver-viewport-frame');
    const safeArea = screen.getByTestId('driver-safe-area');

    // Both routed Slot and Drawer sentinel must be inside driver-viewport-frame
    const slotInFrame = within(frame).getByTestId('mock-routed-slot');
    const drawerInFrame = within(frame).getByTestId('mock-drawer-sentinel');
    expect(slotInFrame).toBeTruthy();
    expect(drawerInFrame).toBeTruthy();

    // Both routed Slot and Drawer sentinel must be inside driver-safe-area
    const slotInSafeArea = within(safeArea).getByTestId('mock-routed-slot');
    const drawerInSafeArea = within(safeArea).getByTestId('mock-drawer-sentinel');
    expect(slotInSafeArea).toBeTruthy();
    expect(drawerInSafeArea).toBeTruthy();

    // Exactly one safe area should exist in the root layout
    expect(screen.getAllByTestId('driver-safe-area').length).toBe(1);

    await screen.unmount();
  });
});
