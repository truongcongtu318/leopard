import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  colors,
  iosContinuousCurve,
  leopardPalette,
  spacing,
} from '@leopard/mobile-core';

const leopardEmblemSource = require('../../../assets/brand/leopard-emblem.png');
const leopardWordmarkSource = require('../../../assets/brand/leopard-wordmark.png');

// Intrinsic pixel ratios of the brand PNGs
const EMBLEM_RATIO = 678 / 324;
const WORDMARK_RATIO = 911 / 205;

// Native driver is unsupported on react-native-web; gate it to avoid warnings.
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

export type BrandSplashScreenProps = Readonly<{
  onFinish?: () => void;
  minDurationMs?: number;
  testID?: string;
}>;

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((value) => {
        if (mounted) setReduced(Boolean(value));
      })
      .catch(() => {
        /* default to motion-on */
      });
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (value) =>
      setReduced(Boolean(value)),
    );
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);
  return reduced;
}

export function BrandSplashScreen({
  onFinish,
  minDurationMs: _minDurationMs,
  testID = 'brand-splash-screen',
}: BrandSplashScreenProps) {
  const { width: screenWidth } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const isFinishedRef = useRef(false);

  // Animated values
  const logoScale = useRef(new Animated.Value(0.92)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  // Exit animation
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const containerScale = useRef(new Animated.Value(1)).current;

  // Sizing original brand PNG logo
  const isSmallScreen = screenWidth < 380;
  const emblemWidth = isSmallScreen ? 180 : 220;
  const emblemHeight = Math.round(emblemWidth / EMBLEM_RATIO);

  const wordmarkHeight = isSmallScreen ? 60 : 74;
  const wordmarkWidth = Math.round(wordmarkHeight * WORDMARK_RATIO);

  const handleFinish = useMemo(() => {
    return () => {
      if (isFinishedRef.current) return;
      isFinishedRef.current = true;
      onFinish?.();
    };
  }, [onFinish]);

  useEffect(() => {
    if (reduceMotion) {
      logoOpacity.setValue(1);
      logoScale.setValue(1);

      const timer = setTimeout(handleFinish, 1400);
      return () => clearTimeout(timer);
    }

    // Clean Apple Spring Entrance & Exit
    const anim = Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          damping: 18,
          stiffness: 220,
          mass: 0.8,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),

      // Hold
      Animated.delay(1200),

      // Clean Fade Exit
      Animated.parallel([
        Animated.timing(containerOpacity, {
          toValue: 0,
          duration: 350,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(containerScale, {
          toValue: 0.96,
          duration: 350,
          easing: Easing.out(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
    ]);

    anim.start(({ finished }) => {
      if (finished) {
        handleFinish();
      }
    });

    return () => {
      anim.stop();
    };
  }, [
    reduceMotion,
    handleFinish,
    logoOpacity,
    logoScale,
    containerOpacity,
    containerScale,
  ]);

  return (
    <View style={styles.container} testID={testID}>
      <SafeAreaView style={styles.safeArea}>
        <Pressable
          accessibilityHint="Nhấn để bỏ qua màn hình chào"
          accessibilityLabel="Màn hình chào LEOPARD"
          accessibilityRole="button"
          onPress={handleFinish}
          style={styles.pressableContainer}
        >
          <Animated.View
            style={[
              styles.contentContainer,
              {
                opacity: containerOpacity,
                transform: [{ scale: containerScale }],
              },
            ]}
          >
            {/* Center Brand Group: Original Logo + Original Wordmark on Pure White Canvas */}
            <Animated.View
              style={[
                styles.brandGroup,
                {
                  opacity: logoOpacity,
                  transform: [{ scale: logoScale }],
                },
              ]}
            >
              {/* Original Emblem PNG */}
              <View style={styles.emblemWrapper}>
                <Image
                  accessibilityLabel="LEOPARD Emblem"
                  accessibilityRole="image"
                  resizeMode="contain"
                  source={leopardEmblemSource}
                  style={{ width: emblemWidth, height: emblemHeight }}
                  testID="splash-leopard-emblem"
                />
              </View>

              {/* Original Wordmark PNG (Tách bạch rõ ràng trên nền trắng, cực kỳ sắc nét) */}
              <View style={styles.wordmarkWrapper}>
                <Image
                  accessibilityLabel="LEOPARD Wordmark"
                  accessibilityRole="image"
                  resizeMode="contain"
                  source={leopardWordmarkSource}
                  style={{ width: wordmarkWidth, height: wordmarkHeight }}
                  testID="splash-leopard-wordmark"
                />
              </View>
            </Animated.View>
          </Animated.View>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Nền trắng tinh khôi chuẩn Apple, giúp màu xanh navy & chữ gốc của logo nổi bật 100%
  },
  safeArea: {
    flex: 1,
  },
  pressableContainer: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  brandGroup: {
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -15 }],
  },
  emblemWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmarkWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
  },
});