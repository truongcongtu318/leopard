import { describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';

import RootLayout from '../app/_layout';

let mockProviderInitializationFails = false;

jest.mock('expo-router', () => ({
  Slot: () => null,
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>(
    'react-native-safe-area-context',
  );
  const React = jest.requireActual<typeof import('react')>('react');

  return {
    ...actual,
    SafeAreaProvider: ({ children }: { children?: import('react').ReactNode }) => {
      if (mockProviderInitializationFails) {
        throw new Error('provider initialization failed');
      }

      return React.createElement(actual.SafeAreaProvider, undefined, children);
    },
  };
});

describe('root layout', () => {
  it('mounts without logging runtime diagnostics', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      const screen = await render(<RootLayout />);

      await screen.unmount();
      expect(consoleError).not.toHaveBeenCalled();
      expect(consoleWarn).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
      consoleWarn.mockRestore();
    }
  });

  it('renders a provider-independent fallback when provider initialization fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockProviderInitializationFails = true;

    try {
      const screen = await render(<RootLayout />);

      expect(screen.getByRole('alert').props.children).toBe('Ứng dụng chưa thể khởi động.');
      await screen.unmount();
    } finally {
      mockProviderInitializationFails = false;
      consoleError.mockRestore();
    }
  });
});
