import React, { type PropsWithChildren } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@leopard/mobile-core';
import { DriverMapDirectorProvider } from './DriverMapDirectorContext';
import { DriverPersistentWorldMap } from './DriverPersistentWorldMap';

export const DRIVER_PHONE_FRAME = {
  compactWebBreakpoint: 480,
  framedWebBreakpoint: 768,
  maxWidth: 430,
  maxHeight: 932,
  outerInset: 16,
  // A real device's screen corner curvature, not a content-card radius — kept
  // as its own constant so tightening `radius.cardXl` for cards elsewhere
  // doesn't flatten this device bezel too.
  cornerRadius: 28,
} as const;

export type DriverViewportMode = 'native' | 'edge-to-edge-web' | 'centered-web' | 'framed-web';

export function resolveDriverViewportMode(
  platform: 'web' | 'native',
  width: number,
): DriverViewportMode {
  if (platform !== 'web') {
    return 'native';
  }
  if (width < DRIVER_PHONE_FRAME.compactWebBreakpoint) {
    return 'edge-to-edge-web';
  }
  if (width < DRIVER_PHONE_FRAME.framedWebBreakpoint) {
    return 'centered-web';
  }
  return 'framed-web';
}

export function DriverViewportShell({ children }: PropsWithChildren): React.JSX.Element {
  const { width, height } = useWindowDimensions();
  const platform = Platform.OS === 'web' ? 'web' : 'native';
  const mode = resolveDriverViewportMode(platform, width);

  let content: React.JSX.Element;

  if (mode === 'native') {
    content = (
      <View style={styles.nativeCanvas} testID="driver-viewport-canvas">
        <View style={styles.nativeFrame} testID="driver-viewport-frame">
          <DriverPersistentWorldMap />
          <SafeAreaView edges={['top', 'right', 'bottom', 'left']} pointerEvents="box-none" style={styles.safeArea} testID="driver-safe-area">
            {children}
          </SafeAreaView>
        </View>
      </View>
    );
  } else if (mode === 'edge-to-edge-web') {
    content = (
      <View style={styles.edgeToEdgeCanvas} testID="driver-viewport-canvas">
        <View style={styles.edgeToEdgeFrame} testID="driver-viewport-frame">
          <DriverPersistentWorldMap />
          <SafeAreaView edges={['top', 'right', 'bottom', 'left']} pointerEvents="box-none" style={styles.safeArea} testID="driver-safe-area">
            {children}
          </SafeAreaView>
        </View>
      </View>
    );
  } else if (mode === 'centered-web') {
    content = (
      <View style={styles.centeredCanvas} testID="driver-viewport-canvas">
        <View style={styles.centeredFrame} testID="driver-viewport-frame">
          <DriverPersistentWorldMap />
          <SafeAreaView edges={['top', 'right', 'bottom', 'left']} pointerEvents="box-none" style={styles.safeArea} testID="driver-safe-area">
            {children}
          </SafeAreaView>
        </View>
      </View>
    );
  } else {
    // framed-web
    const framedHeight = Math.min(
      DRIVER_PHONE_FRAME.maxHeight,
      Math.max(0, height - DRIVER_PHONE_FRAME.outerInset * 2),
    );

    content = (
      <View style={styles.framedCanvas} testID="driver-viewport-canvas">
        <View
          style={[styles.framedFrame, { height: framedHeight }]}
          testID="driver-viewport-frame"
        >
          <DriverPersistentWorldMap />
          <SafeAreaView edges={['top', 'right', 'bottom', 'left']} pointerEvents="box-none" style={styles.safeArea} testID="driver-safe-area">
            {children}
          </SafeAreaView>
        </View>
      </View>
    );
  }

  return (
    <DriverMapDirectorProvider>
      {content}
    </DriverMapDirectorProvider>
  );
}

const styles = StyleSheet.create({
  nativeCanvas: {
    flex: 1,
  },
  nativeFrame: {
    flex: 1,
  },
  edgeToEdgeCanvas: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: colors.neutral.surface,
  },
  edgeToEdgeFrame: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  centeredCanvas: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    backgroundColor: colors.neutral.canvas,
  },
  centeredFrame: {
    flex: 1,
    width: '100%',
    maxWidth: DRIVER_PHONE_FRAME.maxWidth,
    height: '100%',
    backgroundColor: colors.neutral.surface,
  },
  framedCanvas: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.surfaceMuted,
    padding: DRIVER_PHONE_FRAME.outerInset,
  },
  framedFrame: {
    width: '100%',
    maxWidth: DRIVER_PHONE_FRAME.maxWidth,
    backgroundColor: colors.neutral.surface,
    borderRadius: DRIVER_PHONE_FRAME.cornerRadius,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
