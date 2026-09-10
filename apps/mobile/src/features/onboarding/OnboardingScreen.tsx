import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { spacing, LeopardEmblem } from '@leopard/mobile-core';

const onboarding1 = require('../../../assets/brand/onboarding-1.jpg');
const onboarding2 = require('../../../assets/brand/onboarding-2.jpg');
const onboarding3 = require('../../../assets/brand/onboarding-3.jpg');

const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const SLIDE_DURATION_MS = 5000;

export type OnboardingScreenProps = Readonly<{
  onGetStarted: () => void;
  onDriverRegister?: () => void;
  onExploreGuest?: () => void;
}>;

export type OnboardingSlideData = Readonly<{
  badge: string;
  title: string;
  desc: string;
  image: any;
}>;

export const ONBOARDING_SLIDES: readonly OnboardingSlideData[] = [
  {
    badge: 'Vận chuyển hỏa tốc',
    title: 'Giao hàng đường dài & Đa dạng loại xe',
    desc: 'Điều phối tức thì các dòng xe tải từ 500kg đến 15 tấn, tối ưu lộ trình và phục vụ vận chuyển hàng hóa an toàn, đúng giờ.',
    image: onboarding1,
  },
  {
    badge: 'Bốc dỡ tận tâm',
    title: 'Đội ngũ chuyên nghiệp & Hỗ trợ bốc xếp',
    desc: 'Tài xế và phụ xe được xác minh, hỗ trợ bốc xếp hai đầu cẩn thận, dỡ hàng tận cửa và ký nhận biên bản điện tử POD an toàn.',
    image: onboarding2,
  },
  {
    badge: 'Toàn quốc 63 tỉnh thành',
    title: 'Vận tải liên tỉnh & Bảo hiểm 100%',
    desc: 'Kết nối mạng lưới chuỗi cung ứng toàn quốc với công nghệ ghép chuyến thông minh, tối ưu chi phí và cam kết bảo hiểm hàng hóa trọn gói.',
    image: onboarding3,
  },
];

function ArrowRightIcon({ size = 24, color = '#081A3C' }: { size?: number; color?: string }) {
  if (Platform.OS === 'web') {
    return (
      <svg
        fill="none"
        height={size}
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
        viewBox="0 0 24 24"
        width={size}
      >
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    );
  }
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M5 12h14M12 5l7 7-7 7"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
    </Svg>
  );
}

function FullscreenLightTint() {
  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: 'rgba(8, 26, 60, 0.35)',
          zIndex: 1,
        },
      ]}
    />
  );
}

function NavyGradientOverlay() {
  if (Platform.OS === 'web') {
    return (
      <View
        pointerEvents="none"
        style={[
          styles.navyGradientWrap,
          {
            backgroundImage:
              'linear-gradient(to top, #081A3C 0%, rgba(8, 26, 60, 0.98) 45%, rgba(8, 26, 60, 0.85) 65%, rgba(8, 26, 60, 0.40) 85%, transparent 100%)',
          } as any,
        ]}
      />
    );
  }

  return (
    <View pointerEvents="none" style={styles.navyGradientWrap}>
      <Svg height="100%" width="100%">
        <Defs>
          <LinearGradient id="bottomNavyGrad" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor="#081A3C" stopOpacity="0" />
            <Stop offset="0.25" stopColor="#081A3C" stopOpacity="0.55" />
            <Stop offset="0.55" stopColor="#081A3C" stopOpacity="0.88" />
            <Stop offset="0.85" stopColor="#081A3C" stopOpacity="0.98" />
            <Stop offset="1" stopColor="#081A3C" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect fill="url(#bottomNavyGrad)" height="100%" width="100%" x="0" y="0" />
      </Svg>
    </View>
  );
}

function TopVignetteOverlay() {
  if (Platform.OS === 'web') {
    return (
      <View
        pointerEvents="none"
        style={[
          styles.topVignetteWrap,
          {
            backgroundImage:
              'linear-gradient(to bottom, rgba(8, 26, 60, 0.70) 0%, rgba(8, 26, 60, 0.30) 60%, transparent 100%)',
          } as any,
        ]}
      />
    );
  }

  return (
    <View pointerEvents="none" style={styles.topVignetteWrap}>
      <Svg height="100%" width="100%">
        <Defs>
          <LinearGradient id="topVignetteGrad" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor="#081A3C" stopOpacity="0.70" />
            <Stop offset="0.60" stopColor="#081A3C" stopOpacity="0.30" />
            <Stop offset="1" stopColor="#081A3C" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect fill="url(#topVignetteGrad)" height="100%" width="100%" x="0" y="0" />
      </Svg>
    </View>
  );
}

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

export function OnboardingScreen({
  onDriverRegister,
  onExploreGuest,
  onGetStarted,
}: OnboardingScreenProps) {
  const reduceMotion = useReducedMotion();
  const [slide, setSlide] = useState(0);

  // Animated values for background cross-fade and zoom
  const opacities = useRef(ONBOARDING_SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;
  const scales = useRef(ONBOARDING_SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1 : 1.04))).current;
  const textAnim = useRef(new Animated.Value(1)).current;

  const onGetStartedRef = useRef(onGetStarted);
  onGetStartedRef.current = onGetStarted;

  const finish = useCallback(() => {
    onGetStartedRef.current();
  }, []);

  const handleNext = useCallback(() => {
    if (slide < ONBOARDING_SLIDES.length - 1) {
      setSlide((prev) => prev + 1);
    } else {
      finish();
    }
  }, [slide, finish]);

  const handlePrev = useCallback(() => {
    if (slide > 0) {
      setSlide((prev) => prev - 1);
    }
  }, [slide]);

  // Horizontal swipe gesture handler
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 25 && Math.abs(gestureState.dy) < 35,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -50) {
            handleNext();
          } else if (gestureState.dx > 50) {
            handlePrev();
          }
        },
      }),
    [handleNext, handlePrev],
  );

  // Auto-advance every 5 seconds (loops back or stays on last)
  useEffect(() => {
    if (reduceMotion) return;
    const timer = setInterval(() => {
      setSlide((prev) => (prev + 1) % ONBOARDING_SLIDES.length);
    }, SLIDE_DURATION_MS);
    return () => clearInterval(timer);
  }, [slide, reduceMotion]);

  // Transition animations when active slide changes
  useEffect(() => {
    if (reduceMotion) {
      opacities.forEach((anim, i) => anim.setValue(i === slide ? 1 : 0));
      scales.forEach((anim, i) => anim.setValue(1));
      textAnim.setValue(1);
      return;
    }

    const anims: Animated.CompositeAnimation[] = [];
    opacities.forEach((anim, i) => {
      anims.push(
        Animated.timing(anim, {
          toValue: i === slide ? 1 : 0,
          duration: 650,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      );
    });

    scales.forEach((anim, i) => {
      anims.push(
        Animated.timing(anim, {
          toValue: i === slide ? 1 : 1.04,
          duration: 750,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      );
    });

    // Content fade & subtle slide-up
    textAnim.setValue(0);
    anims.push(
      Animated.timing(textAnim, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    );

    Animated.parallel(anims).start();
  }, [slide, reduceMotion, opacities, scales, textAnim]);

  const activeSlide = ONBOARDING_SLIDES[slide];
  const isLastSlide = slide === ONBOARDING_SLIDES.length - 1;

  const textStyle = {
    opacity: textAnim,
    transform: [
      {
        translateY: textAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [12, 0],
        }),
      },
    ],
  };

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {/* ─── LAYER 0: ALL BACKGROUNDS & OVERLAYS (zIndex: 0) ─── */}
      <View pointerEvents="none" style={styles.backgroundLayer}>
        {/* 1. Full-Bleed Background Images Stack with Cross-Fade */}
        <View style={StyleSheet.absoluteFill}>
          {ONBOARDING_SLIDES.map((item, idx) => (
            <Animated.View
              key={idx}
              style={[
                StyleSheet.absoluteFill,
                {
                  opacity: opacities[idx],
                  transform: [{ scale: scales[idx] }],
                },
              ]}
            >
              <Image
                accessibilityRole="image"
                resizeMode="cover"
                source={item.image}
                style={styles.fullBleedImage}
              />
            </Animated.View>
          ))}
        </View>

        {/* 2. Full-bleed Light Navy Tint across ENTIRE image */}
        <FullscreenLightTint />

        {/* 3. Top Dark Vignette Overlay for Header Contrast */}
        <TopVignetteOverlay />

        {/* 4. Deep Navy Gradient Overlay at Base (darker at bottom for text contrast) */}
        <NavyGradientOverlay />
        <View style={styles.solidBottomFill} />
      </View>

      {/* ─── LAYER 1: FOREGROUND CONTENT (TOPMOST zIndex: 50) ─── */}
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <View style={styles.brandIconBox}>
              <LeopardEmblem testID="onboarding-brand-emblem" width={24} />
            </View>
            <Text style={styles.brandTitleText}>LEOPARD</Text>
          </View>

          <Pressable
            accessibilityHint="Chuyển thẳng tới màn hình đăng nhập"
            accessibilityLabel="Bỏ qua"
            accessibilityRole="button"
            hitSlop={8}
            onPress={finish}
            style={({ pressed }) => [styles.skipBtn, pressed && styles.skipBtnPressed]}
          >
            <Text style={styles.skipBtnText}>Bỏ qua ➔</Text>
          </Pressable>
        </View>

        {/* Bottom Area: Badge, Title, Description, Navigation */}
        <View style={styles.bottomSection}>
          <Animated.View style={textStyle}>
            {/* Category Badge */}
            <View style={styles.badgeContainer}>
              <View style={styles.badgeDot} />
              <Text style={styles.badgeText}>{activeSlide.badge}</Text>
            </View>

            {/* Title */}
            <Text style={styles.titleText}>{activeSlide.title}</Text>

            {/* Description */}
            <Text style={styles.descText}>{activeSlide.desc}</Text>
          </Animated.View>

          {/* Navigation Bar: Pagination Dots on Left, Circular Action CTA on Right */}
          <View style={styles.navRow}>
            {/* Pagination Dots */}
            <View style={styles.dotsContainer}>
              {ONBOARDING_SLIDES.map((_, idx) => (
                <Pressable
                  key={idx}
                  accessibilityLabel={`Chuyển tới trang ${idx + 1}`}
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => setSlide(idx)}
                  style={[
                    styles.dotBase,
                    idx === slide ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              ))}
            </View>

            {/* Circular Action Button */}
            <Pressable
              accessibilityHint={
                isLastSlide
                  ? 'Hoàn thành giới thiệu và vào ứng dụng'
                  : 'Xem tiếp trang tiếp theo'
              }
              accessibilityLabel={isLastSlide ? 'Bắt đầu ngay' : 'Trang tiếp theo'}
              accessibilityRole="button"
              onPress={handleNext}
              style={({ pressed }) => [
                styles.actionBtn,
                isLastSlide && styles.actionBtnLast,
                pressed && styles.actionBtnPressed,
              ]}
            >
              <ArrowRightIcon
                color={isLastSlide ? '#0B1E42' : '#FFFFFF'}
                size={24}
              />
            </Pressable>
          </View>

          {/* Optional Driver Partner Link */}
          {onDriverRegister && (
            <View style={styles.driverSection}>
              <Pressable
                accessibilityHint="Mở trang đăng ký tài xế"
                accessibilityLabel="Đăng ký đối tác tài xế"
                accessibilityRole="button"
                hitSlop={8}
                onPress={onDriverRegister}
                style={styles.driverTouch}
              >
                <Text style={styles.driverText}>
                  Bạn muốn hợp tác?{' '}
                  <Text style={styles.driverHighlight}>Đăng ký đối tác tài xế</Text>
                </Text>
              </Pressable>
            </View>
          )}
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
  backgroundLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
    elevation: 0,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    zIndex: 50,
    elevation: 50,
    position: 'relative',
  },
  fullBleedImage: {
    width: '100%',
    height: '100%',
  },

  // Overlays
  topVignetteWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 150,
    zIndex: 1,
  },
  navyGradientWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '72%',
    zIndex: 2,
  },
  solidBottomFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 64,
    backgroundColor: '#081A3C',
    zIndex: 2,
  },

  // Top Bar
  topBar: {
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.40)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitleText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 1.2,
  },
  skipBtn: {
    paddingHorizontal: 15,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  skipBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },

  // Bottom Section
  bottomSection: {
    zIndex: 60,
    elevation: 60,
    position: 'relative',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(2, 132, 199, 0.20)',
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.45)',
    marginBottom: 12,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#0284C7',
    marginRight: 8,
  },
  badgeText: {
    color: '#BAE6FD',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  titleText: {
    fontSize: 27,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 35,
    marginBottom: 12,
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.70)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  descText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#E2E8F0',
    lineHeight: 23,
    marginBottom: 28,
    textShadowColor: 'rgba(0, 0, 0, 0.50)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // Navigation Row
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dotBase: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 28,
    backgroundColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  dotInactive: {
    width: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },

  // Circular Action CTA Button
  actionBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0B1E42',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  actionBtnLast: {
    backgroundColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOpacity: 0.5,
  },
  actionBtnPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.9,
  },

  // Driver Register Sublink
  driverSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  driverTouch: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  driverText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.70)',
    fontWeight: '500',
  },
  driverHighlight: {
    color: '#FDE68A',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
