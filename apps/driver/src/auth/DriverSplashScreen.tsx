import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
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
        fill="rgba(255, 255, 255, 0.84)"
      />
      {/* Right Shaded Face */}
      <Path
        d="M12 12.3L20.5 7.4V16.6L12 21.5V12.3Z"
        fill="rgba(255, 255, 255, 0.68)"
      />
      {/* Subtle inner box crease */}
      <Path
        d="M12 2.5L12 12.3M12 12.3L20.5 7.4M12 12.3L3.5 7.4"
        stroke="#F97316"
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
        stroke="#64748B"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity={0.35}
      />
      <Path
        d="M11 2.5L16 8L11 13.5"
        stroke="#64748B"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity={0.65}
      />
      <Path
        d="M17 2.5L22 8L17 13.5"
        stroke="#64748B"
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

  // Hero image spans the upper 58% of the screen height, seamlessly dissolving downwards
  const heroHeight = Math.max(windowHeight * 0.58, 380);

  return (
    <View style={styles.container} testID={testID}>
      {/* Upper Hero Area with clean SVG aura and brand logo */}
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
              <Stop offset="0%" stopColor="#0F2754" stopOpacity="1" />
              <Stop offset="55%" stopColor="#0B1E42" stopOpacity="1" />
              <Stop offset="85%" stopColor="#0B1E42" stopOpacity="0.95" />
              <Stop offset="100%" stopColor="#0B1E42" stopOpacity="1" />
            </LinearGradient>
            <RadialGradient id="auraGlow" cx="50%" cy="45%" r="45%">
              <Stop offset="0%" stopColor="#0284C7" stopOpacity="0.28" />
              <Stop offset="60%" stopColor="#0284C7" stopOpacity="0.08" />
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
          <View style={styles.driverBadge}>
            <View style={styles.driverBadgeDot} />
            <Text style={styles.driverBadgeText}>DRIVER PILOT</Text>
          </View>
        </View>
      </View>

      {/* Bottom Content Area */}
      <SafeAreaView edges={['bottom']} style={styles.bottomContent}>
        <View style={styles.contentWrapper}>
          {/* Pagination Indicators (two muted dots + one orange pill) */}
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
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1E42',
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
    paddingBottom: 20,
  },
  emblemBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblemImage: {
    width: 140,
    height: 67,
  },
  wordmarkImage: {
    width: 190,
    height: 43,
    marginTop: 2,
  },
  driverBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 6,
    marginTop: 14,
  },
  driverBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38BDF8',
  },
  driverBadgeText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
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
    paddingHorizontal: 28,
    paddingBottom: Platform.OS === 'ios' ? 16 : 28,
  },
  indicatorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 20,
  },
  inactiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94A3B8',
    opacity: 0.85,
  },
  activePill: {
    width: 24,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F97316',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 40,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#CBD5E1',
    lineHeight: 22,
    marginBottom: 34,
  },
  buttonWrapper: {
    width: '100%',
  },
  track: {
    height: 60,
    borderRadius: 30,
    backgroundColor: '#12274E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    padding: PADDING,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#050F24',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
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
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  chevronContainer: {
    position: 'absolute',
    right: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 5,
  },
});
