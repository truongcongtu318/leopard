import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import { IconChevron } from '../icons/svg-icons';

export interface SlideToActionProps {
  label: string;
  onActionComplete: () => void;
  colorVariant?: 'brand' | 'success' | 'warning';
  disabled?: boolean;
  resetKey?: unknown;
  testID?: string;
  style?: any;
}

const VARIANTS = {
  brand: {
    trackBg: '#0B1E42',
    textColor: '#FFFFFF',
    thumbBg: '#FFFFFF',
    iconColor: '#0B1E42',
  },
  success: {
    trackBg: '#16A34A',
    textColor: '#FFFFFF',
    thumbBg: '#FFFFFF',
    iconColor: '#16A34A',
  },
  warning: {
    trackBg: '#D97706',
    textColor: '#FFFFFF',
    thumbBg: '#FFFFFF',
    iconColor: '#D97706',
  },
  disabled: {
    trackBg: '#E2E8F0',
    textColor: '#94A3B8',
    thumbBg: '#CBD5E1',
    iconColor: '#94A3B8',
  },
} as const;

const THUMB_SIZE = 48;
const PADDING = 4;
const DEFAULT_TRACK_WIDTH = 300;

export function SlideToAction({
  label,
  onActionComplete,
  colorVariant = 'brand',
  disabled = false,
  resetKey,
  testID = 'slide-action',
  style,
}: SlideToActionProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const panX = useRef(new Animated.Value(0)).current;
  const isCompletedRef = useRef(false);
  const onActionCompleteRef = useRef(onActionComplete);
  onActionCompleteRef.current = onActionComplete;

  const prevResetKeyRef = useRef(resetKey);
  useEffect(() => {
    if (prevResetKeyRef.current !== resetKey) {
      prevResetKeyRef.current = resetKey;
      isCompletedRef.current = false;
      Animated.spring(panX, { toValue: 0, useNativeDriver: true }).start();
    }
  }, [resetKey, panX]);

  useEffect(() => {
    return () => {
      panX.stopAnimation();
    };
  }, [panX]);

  const effectiveWidth = trackWidth || DEFAULT_TRACK_WIDTH;
  const maxDrag = Math.max(0, effectiveWidth - THUMB_SIZE - PADDING * 2);

  // ponytail: dynamic track fill bar skipped; add when progressive gradient track requested
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled && !isCompletedRef.current,
        onMoveShouldSetPanResponder: (_, gesture) =>
          !disabled && !isCompletedRef.current && Math.abs(gesture.dx) > 3,
        onPanResponderGrant: () => {
          panX.stopAnimation();
        },
        onPanResponderMove: (_, gesture) => {
          const clampedX = Math.max(0, Math.min(maxDrag, gesture.dx));
          panX.setValue(clampedX);
        },
        onPanResponderRelease: (_, gesture) => {
          const threshold = maxDrag * 0.75;
          if (gesture.dx >= threshold) {
            isCompletedRef.current = true;
            Animated.spring(panX, {
              toValue: maxDrag,
              useNativeDriver: true,
            }).start(() => {
              try {
                Vibration.vibrate(10);
              } catch {
                // Ignore if unavailable in environment
              }
              onActionCompleteRef.current();
            });
          } else {
            Animated.spring(panX, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          }
        },
      }),
    [disabled, maxDrag, panX]
  );

  const variantStyle = disabled
    ? VARIANTS.disabled
    : VARIANTS[colorVariant] || VARIANTS.brand;

  const handleLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && width !== trackWidth) {
      setTrackWidth(width);
    }
  };

  return (
    <View
      testID={testID}
      accessible={true}
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      accessibilityActions={[{ name: 'activate', label }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'activate' && !disabled) {
          onActionComplete();
        }
      }}
      onLayout={handleLayout}
      style={[
        styles.track,
        { backgroundColor: variantStyle.trackBg },
        style,
      ]}
    >
      <View style={styles.labelContainer} pointerEvents="none">
        <Text
          testID={`${testID}-label`}
          style={[styles.label, { color: variantStyle.textColor }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>

      <Animated.View
        {...panResponder.panHandlers}
        testID={`${testID}-thumb`}
        accessible={true}
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        style={[
          styles.thumb,
          {
            backgroundColor: variantStyle.thumbBg,
            transform: [{ translateX: panX }],
          },
        ]}
      >
        <IconChevron
          direction="right"
          size={20}
          color={variantStyle.iconColor}
          testID={`${testID}-chevron`}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 56,
    borderRadius: 9999,
    padding: PADDING,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  labelContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 56,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
});
