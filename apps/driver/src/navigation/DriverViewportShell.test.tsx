import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions } from 'react-native';

import {
  DRIVER_PHONE_FRAME,
  DriverViewportShell,
  resolveDriverViewportMode,
} from './DriverViewportShell';

describe('DriverViewportShell', () => {
  describe('Constants', () => {
    it('defines the required frame constants from spec', () => {
      expect(DRIVER_PHONE_FRAME).toEqual({
        compactWebBreakpoint: 480,
        framedWebBreakpoint: 768,
        maxWidth: 430,
        maxHeight: 932,
        outerInset: 16,
      });
    });
  });

  describe('resolveDriverViewportMode', () => {
    it('always returns native when platform is native regardless of width', () => {
      expect(resolveDriverViewportMode('native', 360)).toBe('native');
      expect(resolveDriverViewportMode('native', 768)).toBe('native');
      expect(resolveDriverViewportMode('native', 1440)).toBe('native');
    });

    it('returns edge-to-edge-web for web width < 480', () => {
      expect(resolveDriverViewportMode('web', 360)).toBe('edge-to-edge-web');
      expect(resolveDriverViewportMode('web', 430)).toBe('edge-to-edge-web');
      expect(resolveDriverViewportMode('web', 479)).toBe('edge-to-edge-web');
    });

    it('returns centered-web for web width 480 to 767', () => {
      expect(resolveDriverViewportMode('web', 480)).toBe('centered-web');
      expect(resolveDriverViewportMode('web', 600)).toBe('centered-web');
      expect(resolveDriverViewportMode('web', 767)).toBe('centered-web');
    });

    it('returns framed-web for web width >= 768', () => {
      expect(resolveDriverViewportMode('web', 768)).toBe('framed-web');
      expect(resolveDriverViewportMode('web', 1024)).toBe('framed-web');
      expect(resolveDriverViewportMode('web', 1440)).toBe('framed-web');
    });
  });

  describe('Rendered shell presentation', () => {
    const originalPlatformOS = Platform.OS;

    afterEach(() => {
      Platform.OS = originalPlatformOS;
      jest.restoreAllMocks();
    });

    it('renders native mode without decorative border, radius, shadow or maxWidth', async () => {
      Platform.OS = 'ios';

      const screen = await render(
        <DriverViewportShell>
          <Text testID="child-content">Native Driver Content</Text>
        </DriverViewportShell>,
      );

      const canvas = screen.getByTestId('driver-viewport-canvas');
      const frame = screen.getByTestId('driver-viewport-frame');
      const safeArea = screen.getByTestId('driver-safe-area');
      const child = screen.getByTestId('child-content');

      expect(canvas).toBeTruthy();
      expect(frame).toBeTruthy();
      expect(safeArea).toBeTruthy();
      expect(child).toBeTruthy();

      const frameStyle = StyleSheet.flatten(frame.props.style);
      expect(frameStyle.maxWidth).toBeUndefined();
      expect(frameStyle.borderRadius).toBeUndefined();
      expect(frameStyle.borderWidth).toBeUndefined();

      // Only one safe area
      expect(screen.getAllByTestId('driver-safe-area').length).toBe(1);

      await screen.unmount();
    });

    it('renders edge-to-edge-web at 390x844 without decorative frame chrome', async () => {
      Platform.OS = 'web';
      jest.spyOn(require('react-native'), 'useWindowDimensions').mockReturnValue({
        width: 390,
        height: 844,
        scale: 1,
        fontScale: 1,
      });

      const screen = await render(
        <DriverViewportShell>
          <Text testID="child-content">Mobile Web Content</Text>
        </DriverViewportShell>,
      );

      const frame = screen.getByTestId('driver-viewport-frame');
      const frameStyle = StyleSheet.flatten(frame.props.style);

      expect(frameStyle.maxWidth).toBeUndefined();
      expect(frameStyle.borderRadius).toBeUndefined();
      expect(frameStyle.borderWidth).toBeUndefined();

      await screen.unmount();
    });

    it('renders centered-web at 600x900 with maxWidth 430 but no border or shadow', async () => {
      Platform.OS = 'web';
      jest.spyOn(require('react-native'), 'useWindowDimensions').mockReturnValue({
        width: 600,
        height: 900,
        scale: 1,
        fontScale: 1,
      });

      const screen = await render(
        <DriverViewportShell>
          <Text testID="child-content">Centered Web Content</Text>
        </DriverViewportShell>,
      );

      const frame = screen.getByTestId('driver-viewport-frame');
      const frameStyle = StyleSheet.flatten(frame.props.style);

      expect(frameStyle.maxWidth).toBe(430);
      expect(frameStyle.borderRadius).toBeUndefined();
      expect(frameStyle.borderWidth).toBeUndefined();

      await screen.unmount();
    });

    it('renders framed-web at 1440x900 with maxWidth 430, computed height <= 868, radius 28, and border/shadow', async () => {
      Platform.OS = 'web';
      jest.spyOn(require('react-native'), 'useWindowDimensions').mockReturnValue({
        width: 1440,
        height: 900,
        scale: 1,
        fontScale: 1,
      });

      const screen = await render(
        <DriverViewportShell>
          <Text testID="child-content">Laptop Web Content</Text>
        </DriverViewportShell>,
      );

      const canvas = screen.getByTestId('driver-viewport-canvas');
      const frame = screen.getByTestId('driver-viewport-frame');

      const canvasStyle = StyleSheet.flatten(canvas.props.style);
      expect(canvasStyle.justifyContent).toBe('center');
      expect(canvasStyle.alignItems).toBe('center');

      const frameStyle = StyleSheet.flatten(frame.props.style);
      expect(frameStyle.maxWidth).toBe(430);
      // Height capped at min(932, 900 - 32) = 868
      expect(frameStyle.height).toBeLessThanOrEqual(868);
      expect(frameStyle.borderRadius).toBe(28);
      expect(frameStyle.borderWidth).toBeGreaterThan(0);
      expect(frameStyle.overflow).toBe('hidden');

      await screen.unmount();
    });

    it('renders framed-web at 768x1024 with width <= 430 and height <= 932', async () => {
      Platform.OS = 'web';
      jest.spyOn(require('react-native'), 'useWindowDimensions').mockReturnValue({
        width: 768,
        height: 1024,
        scale: 1,
        fontScale: 1,
      });

      const screen = await render(
        <DriverViewportShell>
          <Text testID="child-content">Tablet Web Content</Text>
        </DriverViewportShell>,
      );

      const frame = screen.getByTestId('driver-viewport-frame');
      const frameStyle = StyleSheet.flatten(frame.props.style);

      expect(frameStyle.maxWidth).toBe(430);
      // Height min(932, 1024 - 32) = 932
      expect(frameStyle.height).toBeLessThanOrEqual(932);
      expect(frameStyle.borderRadius).toBe(28);

      await screen.unmount();
    });

    it('updates presentation on window resize without remounting the child component', async () => {
      Platform.OS = 'web';
      let mockDimensions = { width: 1440, height: 900, scale: 1, fontScale: 1 };
      jest.spyOn(require('react-native'), 'useWindowDimensions').mockImplementation(() => mockDimensions);

      let mountCount = 0;
      function StatefulChild() {
        React.useEffect(() => {
          mountCount += 1;
        }, []);
        return <Text testID="child-content">Child</Text>;
      }

      const screen = await render(
        <DriverViewportShell>
          <StatefulChild />
        </DriverViewportShell>,
      );

      expect(mountCount).toBe(1);
      const frame1 = screen.getByTestId('driver-viewport-frame');
      expect(StyleSheet.flatten(frame1.props.style).maxWidth).toBe(430);

      // Resize down to 390 width
      mockDimensions = { width: 390, height: 844, scale: 1, fontScale: 1 };
      await screen.rerender(
        <DriverViewportShell>
          <StatefulChild />
        </DriverViewportShell>,
      );

      expect(mountCount).toBe(1); // Child did NOT remount
      const frame2 = screen.getByTestId('driver-viewport-frame');
      expect(StyleSheet.flatten(frame2.props.style).maxWidth).toBeUndefined();

      await screen.unmount();
    });
  });
});
