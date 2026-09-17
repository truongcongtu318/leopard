import {
  customerPalette,
  iosContinuousCurve,
  leopardPalette,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';
import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  LayoutChangeEvent,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

const leopardEmblemSource = require('../../assets/brand/leopard-emblem.png');
const leopardWordmarkSource = require('../../assets/brand/leopard-wordmark.png');

export interface DriverSplashScreenProps {
  onGetStarted?: () => void;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  testID?: string;
}

function IsometricBoxIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Top Diamond Face */}
      <Path
        d="M12 2.5L20.5 7.4L12 12.3L3.5 7.4L12 2.5Z"
        fill="#FFFFFF"
      />
      {/* Left Shaded Face */}
      <Path
        d="M3.5 7.4L12 12.3V21.5L3.5 16.6V7.4Z"
        fill="rgba(255, 255, 255, 0.88)"
      />
      {/* Right Shaded Face */}
      <Path
        d="M12 12.3L20.5 7.4V16.6L12 21.5V12.3Z"
        fill="rgba(255, 255, 255, 0.72)"
      />
      {/* Subtle inner box crease */}
      <Path
        d="M12 2.5L12 12.3M12 12.3L20.5 7.4M12 12.3L3.5 7.4"
        stroke="#D97706"
        strokeWidth={0.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TripleChevronIcon() {
  return (
    <Svg width={24} height={16} viewBox="0 0 24 16" fill="none">
      <Path
        d="M5 2.5L10 8L5 13.5"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity={0.35}
      />
      <Path
        d="M11 2.5L16 8L11 13.5"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity={0.65}
      />
      <Path
        d="M17 2.5L22 8L17 13.5"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity={0.95}
      />
    </Svg>
  );
}

interface SlideButtonProps {
  label: string;
  onAction?: () => void;
  testID?: string;
}

const THUMB_SIZE = 48;
const PADDING = 5;

function SlideToGetStarted({ label, onAction, testID = 'splash-get-started-btn' }: SlideButtonProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const panX = useRef(new Animated.Value(0)).current;
  const isTriggeredRef = useRef(false);
  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;

  const maxDrag = Math.max(0, trackWidth - THUMB_SIZE - PADDING * 2);

  const triggerAction = () => {
    if (isTriggeredRef.current) return;
    isTriggeredRef.current = true;
    try {
      Vibration.vibrate(10);
    } catch {
      // Ignore vibration error on unsupported platforms
    }
    onActionRef.current?.();
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !isTriggeredRef.current,
        onMoveShouldSetPanResponder: (_, gesture) =>
          !isTriggeredRef.current && Math.abs(gesture.dx) > 3,
        onPanResponderGrant: () => {
          panX.stopAnimation();
        },
        onPanResponderMove: (_, gesture) => {
          const clampedX = Math.max(0, Math.min(maxDrag, gesture.dx));
          panX.setValue(clampedX);
        },
        onPanResponderRelease: (_, gesture) => {
          const threshold = maxDrag * 0.55;
          if (gesture.dx >= threshold) {
            Animated.spring(panX, {
              toValue: maxDrag,
              useNativeDriver: true,
            }).start(() => {
              triggerAction();
            });
          } else {
            Animated.spring(panX, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          }
        },
      }),
    [maxDrag, panX],
  );

  const handlePress = () => {
    if (isTriggeredRef.current) return;
    triggerAction();
    Animated.timing(panX, {
      toValue: maxDrag,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== trackWidth) {
      setTrackWidth(w);
    }
  };

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onLayout={handleLayout}
      onPress={handlePress}
      style={styles.track}
      testID={testID}
    >
      {/* Center Label */}
      <View pointerEvents="none" style={styles.labelContainer}>
        <Text style={styles.btnLabel}>{label}</Text>
      </View>

      {/* Right Triple Chevron */}
      <View pointerEvents="none" style={styles.chevronContainer}>
        <TripleChevronIcon />
      </View>

      {/* Left Draggable/Sliding Thumb */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.thumb,
          {
            transform: [{ translateX: panX }],
          },
        ]}
        testID={`${testID}-thumb`}
      >
        <IsometricBoxIcon size={22} />
      </Animated.View>
    </Pressable>
  );
}

export function DriverSplashScreen({
  onGetStarted,
  title = 'Vận tải thông minh\nKết nối dễ dàng',
  subtitle = 'Theo dõi lộ trình thời gian thực, đồng hành tin cậy trên mọi chuyến đi.',
  buttonText = 'Bắt đầu ngay',
  testID = 'driver-splash-screen',
}: DriverSplashScreenProps) {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Hero image spans the upper 56% of the screen height, dissolving downwards into pure white canvas
  const heroHeight = Math.max(windowHeight * 0.56, 360);

  return (
    <View style={styles.container} testID={testID}>
      {/* Upper Hero Area with clean subtle ambient gradient and brand logo */}
      <View
        style={[styles.imageContainer, { height: heroHeight }]}
        testID="splash-river-image"
      >
        <Svg
          height="100%"
          preserveAspectRatio="none"
          style={StyleSheet.absoluteFill}
          width="100%"
        >
          <Defs>
            <LinearGradient id="heroGradient" x1="0" x2="0" y1="0" y2="1">
              <Stop offset="0%" stopColor="#F0F7FF" stopOpacity="1" />
              <Stop offset="60%" stopColor="#F8FAFC" stopOpacity="0.8" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="1" />
            </LinearGradient>
            <RadialGradient id="auraGlow" cx="50%" cy="40%" r="50%">
              <Stop offset="0%" stopColor="#0284C7" stopOpacity="0.12" />
              <Stop offset="60%" stopColor="#0284C7" stopOpacity="0.04" />
              <Stop offset="100%" stopColor="#0284C7" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect fill="url(#heroGradient)" height="100%" width="100%" />
          <Rect fill="url(#auraGlow)" height="100%" width="100%" />
        </Svg>

        {/* Central Brand Emblem and Wordmark */}
        <View style={styles.brandCenterContainer}>
          <View style={styles.emblemBox}>
            <Image
              accessibilityLabel="LEOPARD Emblem"
              accessibilityRole="image"
              resizeMode="contain"
              source={leopardEmblemSource}
              style={styles.emblemImage}
              testID="splash-leopard-emblem"
            />
          </View>
          <Image
            accessibilityLabel="LEOPARD Wordmark"
            accessibilityRole="image"
            resizeMode="contain"
            source={leopardWordmarkSource}
            style={styles.wordmarkImage}
            testID="splash-leopard-wordmark"
          />
        </View>
      </View>

      {/* Bottom Content Area */}
      <View
        style={[styles.bottomContent, { paddingBottom: Math.max(insets.bottom, 16) + spacing.xs }]}
      >
        <View style={styles.contentWrapper}>
          {/* Pagination Indicators (two muted dots + one navy/amber pill) */}
          <View style={styles.indicatorsRow} testID="splash-indicators">
            <View style={styles.inactiveDot} />
            <View style={styles.inactiveDot} />
            <View style={styles.activePill} />
          </View>

          {/* Headline */}
          <Text style={styles.title} testID="splash-title">
            {title}
          </Text>

          {/* Subtitle */}
          <Text style={styles.subtitle} testID="splash-subtitle">
            {subtitle}
          </Text>

          {/* Slider Action Button */}
          <View style={styles.buttonWrapper}>
            <SlideToGetStarted
              label={buttonText}
              onAction={onGetStarted}
              testID="splash-get-started-btn"
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  imageContainer: {
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  brandCenterContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.md,
  },
  emblemBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblemImage: {
    width: 150,
    height: 72,
  },
  wordmarkImage: {
    width: 200,
    height: 45,
    marginTop: spacing.hairline,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  bottomContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  contentWrapper: {
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.md : spacing.lg,
  },
  indicatorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  inactiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  activePill: {
    width: 24,
    height: 6,
    borderRadius: 3,
    backgroundColor: leopardPalette.primary,
  },
  title: {
    ...typeScale.largeTitle,
    color: '#0F172A',
    letterSpacing: -0.6,
    lineHeight: 38,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typeScale.subheadline,
    color: '#64748B',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  buttonWrapper: {
    width: '100%',
  },
  track: {
    height: 58,
    borderRadius: radius.pill,
    ...iosContinuousCurve,
    backgroundColor: leopardPalette.primary,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: PADDING,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: leopardPalette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },
  labelContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 60,
  },
  btnLabel: {
    color: '#FFFFFF',
    ...typeScale.callout,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  chevronContainer: {
    position: 'absolute',
    right: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: customerPalette.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: customerPalette.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
});
