import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';
import { Platform, StyleSheet, Text } from 'react-native';

import { DriverModalSurface } from './DriverModalSurface';

describe('DriverModalSurface', () => {
  const originalPlatformOS = Platform.OS;

  afterEach(() => {
    Platform.OS = originalPlatformOS;
    jest.restoreAllMocks();
  });

  describe('Native platform', () => {
    it('delegates to React Native Modal on native', async () => {
      Platform.OS = 'ios';
      const onRequestClose = jest.fn();

      const screen = await render(
        <DriverModalSurface
          animationType="slide"
          onRequestClose={onRequestClose}
          testID="test-modal"
          transparent={true}
          visible={true}
        >
          <Text testID="modal-content">Native Modal Content</Text>
        </DriverModalSurface>,
      );

      expect(screen.getByTestId('test-modal')).toBeTruthy();
      expect(screen.getByTestId('modal-content')).toBeTruthy();

      await screen.unmount();
    });
  });

  describe('Web platform', () => {
    it('returns null when visible is false on web', async () => {
      Platform.OS = 'web';

      const screen = await render(
        <DriverModalSurface testID="test-modal" visible={false}>
          <Text testID="modal-content">Web Modal Content</Text>
        </DriverModalSurface>,
      );

      expect(screen.queryByTestId('test-modal')).toBeNull();
      expect(screen.queryByTestId('modal-content')).toBeNull();

      await screen.unmount();
    });

    it('renders an absolute-fill layer with modal accessibility semantics when visible on web', async () => {
      Platform.OS = 'web';

      const screen = await render(
        <DriverModalSurface testID="test-modal" visible={true}>
          <Text testID="modal-content">Web Modal Content</Text>
        </DriverModalSurface>,
      );

      const surface = screen.getByTestId('test-modal');
      expect(surface).toBeTruthy();
      expect(screen.getByTestId('modal-content')).toBeTruthy();

      const surfaceStyle = StyleSheet.flatten(surface.props.style);
      expect(surfaceStyle.position).toBe('absolute');
      expect(surfaceStyle.top).toBe(0);
      expect(surfaceStyle.bottom).toBe(0);
      expect(surfaceStyle.left).toBe(0);
      expect(surfaceStyle.right).toBe(0);

      expect(surface.props.accessibilityViewIsModal).toBe(true);
      expect(surface.props['aria-modal']).toBe(true);

      await screen.unmount();
    });

    it('handles Escape key to call onRequestClose on web', async () => {
      Platform.OS = 'web';
      const onRequestClose = jest.fn();

      const listeners: Record<string, ((event: any) => void)[]> = {};
      const originalAddEventListener = (window as any).addEventListener;
      const originalRemoveEventListener = (window as any).removeEventListener;

      (window as any).addEventListener = jest.fn((type: string, listener: any) => {
        listeners[type] = listeners[type] || [];
        listeners[type].push(listener);
      });
      (window as any).removeEventListener = jest.fn((type: string, listener: any) => {
        if (listeners[type]) {
          listeners[type] = listeners[type].filter((l) => l !== listener);
        }
      });

      try {
        const screen = await render(
          <DriverModalSurface
            onRequestClose={onRequestClose}
            testID="test-modal"
            visible={true}
          >
            <Text testID="modal-content">Escape Test</Text>
          </DriverModalSurface>,
        );

        expect((window as any).addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));

        // Simulate Escape keypress
        const keydownListeners = listeners['keydown'] || [];
        expect(keydownListeners.length).toBeGreaterThan(0);
        keydownListeners[0]({ key: 'Escape' });

        expect(onRequestClose).toHaveBeenCalledTimes(1);

        await screen.unmount();
        expect((window as any).removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      } finally {
        (window as any).addEventListener = originalAddEventListener;
        (window as any).removeEventListener = originalRemoveEventListener;
      }
    });
  });
});
