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

import { colors, spacing } from '../../theme/tokens';

const leopardEmblemSource = require('../../../assets/brand/leopard-emblem.png');
const leopardWordmarkSource = require('../../../assets/brand/leopard-wordmark.png');

// Intrinsic pixel ratios of the brand PNGs
const EMBLEM_RATIO = 1099 / 591;
const WORDMARK_RATIO = 1464 / 241;

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
  const emblemOpacity = useRef(new Animated.Value(0)).current;
  const emblemScale = useRef(new Animated.Value(0.82)).current;
  const emblemTranslateY = useRef(new Animated.Value(0)).current;

  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkTranslateY = useRef(new Animated.Value(18)).current;
  const wordmarkScale = useRef(new Animated.Value(0.94)).current;

  const haloScale = useRef(new Animated.Value(0.7)).current;
  const haloOpacity = useRef(new Animated.Value(0)).current;

  const containerOpacity = useRef(new Animated.Value(1)).current;
  const containerScale = useRef(new Animated.Value(1)).current;

  // Responsive sizing for large center presence
  const isSmallScreen = screenWidth < 380;
  const emblemWidth = isSmallScreen ? 128 : 156;
  const emblemHeight = Math.round(emblemWidth / EMBLEM_RATIO);

  const wordmarkHeight = isSmallScreen ? 28 : 34;
  const wordmarkWidth = Math.round(wordmarkHeight * WORDMARK_RATIO);

  // Optical upward offset to ensure the combined logo+name stays perfectly balanced vertically
  const targetEmblemOffsetY = isSmallScreen ? -16 : -20;

  const handleFinish = useMemo(() => {
    return () => {
      if (isFinishedRef.current) return;
      isFinishedRef.current = true;
      onFinish?.();
    };
  }, [onFinish]);

  useEffect(() => {
    if (reduceMotion) {
      emblemOpacity.setValue(1);
      emblemScale.setValue(1);
      emblemTranslateY.setValue(targetEmblemOffsetY);
      wordmarkOpacity.setValue(1);
      wordmarkTranslateY.setValue(0);
      wordmarkScale.setValue(1);

      const timer = setTimeout(handleFinish, 1800);
      return () => clearTimeout(timer);
    }

    // Smooth, slow, and generous animation sequence:
    // Phase 1 (0 -> 950ms): Large Emblem blooms slowly and majestically in dead center
    // Phase 2 (950 -> 1550ms): Generous 600ms hold so user clearly sees the logo
    // Phase 3 (1550 -> 2550ms): Emblem floats up slightly & Wordmark reveals smoothly close underneath (1000ms)
    // Phase 4 (2550 -> 3950ms): Long 1400ms hold to showcase the full brand lockup
    // Phase 5 (3950 -> 4650ms): Wordmark retracts & Emblem returns center with smooth cross-fade exit
    const anim = Animated.sequence([
      // --- Phase 1: Center Emblem Bloom (Slow & Smooth) ---
      Animated.parallel([
        Animated.timing(emblemOpacity, {
          toValue: 1,
          duration: 850,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(emblemScale, {
          toValue: 1,
          duration: 950,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(haloOpacity, {
          toValue: 0.75,
          duration: 900,
          easing: Easing.out(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(haloScale, {
          toValue: 1.15,
          duration: 950,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),

      // --- Phase 2: Generous pause to admire center logo (600ms) ---
      Animated.delay(600),

      // --- Phase 3: Float Logo Up & Reveal Wordmark Below (Chậm rãi, sát nhau) ---
      Animated.parallel([
        Animated.timing(emblemTranslateY, {
          toValue: targetEmblemOffsetY,
          duration: 1000,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(wordmarkOpacity, {
          toValue: 1,
          duration: 900,
          delay: 150,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(wordmarkTranslateY, {
          toValue: 0,
          duration: 1000,
          delay: 100,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(wordmarkScale, {
          toValue: 1,
          duration: 1000,
          delay: 100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(haloOpacity, {
          toValue: 0.95,
          duration: 900,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),

      // --- Phase 4: Generous Brand Hold (1400ms) ---
      Animated.delay(1400),

      // --- Phase 5: Contraction ("Thu lại") & Smooth Dissolve into Onboarding ---
      Animated.parallel([
        // Wordmark smoothly folds down and fades
        Animated.timing(wordmarkOpacity, {
          toValue: 0,
          duration: 480,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(wordmarkTranslateY, {
          toValue: 14,
          duration: 500,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(wordmarkScale, {
          toValue: 0.94,
          duration: 480,
          easing: Easing.in(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        // Emblem descends back smoothly to center
        Animated.timing(emblemTranslateY, {
          toValue: 0,
          duration: 580,
          easing: Easing.bezier(0.25, 1, 0.5, 1),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        // Container fades out and zooms gently for seamless transition
        Animated.timing(containerOpacity, {
          toValue: 0,
          duration: 620,
          delay: 150,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(containerScale, {
          toValue: 1.04,
          duration: 620,
          delay: 150,
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
    targetEmblemOffsetY,
    handleFinish,
    emblemOpacity,
    emblemScale,
    emblemTranslateY,
    wordmarkOpacity,
    wordmarkTranslateY,
    wordmarkScale,
    haloScale,
    haloOpacity,
    containerOpacity,
    containerScale,
  ]);

  return (
    <SafeAreaView style={styles.safeArea} testID={testID}>
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
          {/* Ambient Glow Aura */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ambientHalo,
              {
                opacity: haloOpacity,
                transform: [{ scale: haloScale }],
              },
            ]}
          />

          {/* Central Vertical Stack: Logo on top, Wordmark close below, perfectly centered */}
          <View style={styles.centerStack}>
            {/* Emblem (Starts large in dead center, floats up smoothly) */}
            <Animated.View
              style={[
                styles.emblemWrapper,
                {
                  opacity: emblemOpacity,
                  transform: [
                    { translateY: emblemTranslateY },
                    { scale: emblemScale },
                  ],
                },
              ]}
            >
              <Image
                accessibilityLabel="LEOPARD Emblem"
                accessibilityRole="image"
                resizeMode="contain"
                source={leopardEmblemSource}
                style={{ width: emblemWidth, height: emblemHeight }}
                testID="splash-leopard-emblem"
              />
            </Animated.View>

            {/* Wordmark (Reveals smoothly and closely directly underneath the emblem) */}
            <Animated.View
              style={[
                styles.wordmarkWrapper,
                {
                  opacity: wordmarkOpacity,
                  transform: [
                    { translateY: wordmarkTranslateY },
                    { scale: wordmarkScale },
                  ],
                },
              ]}
            >
              <Image
                accessibilityLabel="LEOPARD Wordmark"
                accessibilityRole="image"
                resizeMode="contain"
                source={leopardWordmarkSource}
                style={{ width: wordmarkWidth, height: wordmarkHeight }}
                testID="splash-leopard-wordmark"
              />
            </Animated.View>
          </View>
        </Animated.View>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.canvas,
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
  ambientHalo: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.16)',
  },
  centerStack: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  emblemWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmarkWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4, // Khoảng cách sát lại gần logo hơn theo yêu cầu
  },
});
