import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Role } from '@leopard/shared';

import { httpClient } from '../api/http-client';
import { colors, radius, spacing, typography } from '../theme/tokens';
import { Button } from '../ui/Button';
import { sessionStore } from './session-store';
import { isFirebaseConfigured } from './firebase';
import {
  resetRecaptcha,
  sendPhoneOtp,
  signInWithGoogle,
  type OtpChallenge,
} from './firebase-auth';
import { isLikelyVnPhone, toE164Vn } from './phone';
import {
  IconRoleAdmin,
  IconRoleCustomer,
  IconRoleDriver,
  IconRoleFleet,
  LeopardEmblem,
  LeopardMobileLogo,
} from '../ui/icons/CoreIcons';

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

const truckSource = require('../../assets/brand/truck.png');
const citySkylineSource = require('../../assets/brand/city-skyline.png');

/** DOM id the invisible reCAPTCHA verifier binds to (web Phone Auth). */
const RECAPTCHA_CONTAINER_ID = 'leopard-recaptcha-container';


export interface LoginScreenProps {
  onLoginSuccess?: (role: Role, profileComplete: boolean) => void;
  onNavigateRegister?: () => void;
  allowDemo?: boolean;
  sessionExpired?: boolean;
}

interface AuthResponse {
  user: {
    id: string;
    phone: string;
    email: string | null;
    name: string | null;
    role: Role;
    status: string;
    profileComplete: boolean;
  };
  session: {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: string;
    refreshTokenExpiresAt: string;
  };
}

/** 3D Scenic Highway & Sky Palette */
const scene = {
  canvas: '#FFFFFF',
  skyTop: '#D0E3F6',
  skyBottom: '#E8F2FB',
  cloud: 'rgba(255, 255, 255, 0.95)',

  // 3D Elevated Highway
  roadCastShadow: 'rgba(15, 23, 42, 0.16)',
  roadOverpassWall: '#546678',
  roadShoulder: '#7F91A2',
  roadHighlight: 'rgba(255, 255, 255, 0.90)',
  roadFill: '#AAB8C8',
  roadLine: '#FFFFFF',

  // Truck & Aerodynamics
  shadow: 'rgba(15, 23, 42, 0.25)',
  ink: '#0B1F3A',
  muted: '#5B6B80',
  ctaTop: '#2E6FD6',
  ctaBottom: '#1E5BB8',
  pinDrop: '#16A34A',
} as const;

const TRUCK_RATIO = 600 / 450;
const ROAD_SAMPLES = 48;
const NUM_DASHES = 7;
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

type Point = Readonly<{ x: number; y: number }>;
type Segment = Readonly<{ x: number; y: number; length: number; angle: number; t: number }>;
type StageSize = Readonly<{ width: number; height: number }>;

/** 
 * 3D Highway positioned comfortably lower in the hero stage
 * Starts at p0.y = h * 0.44 so the brand logo in the upper sky never overlaps the road or truck.
 */
function sampleMastheadRoad({ width: w, height: h }: StageSize): Point[] {
  if (w === 0 || h === 0) return [];
  const p0 = { x: -w * 0.15, y: h * 0.54 }; // starts mid-left lower, giving skyline full visibility
  const p1 = { x: w * 0.32, y: h * 0.66 };  // sweeps down through lower center
  const p2 = { x: w * 0.65, y: h * 0.78 };  // curves diagonally down-right
  const p3 = { x: w * 1.18, y: h * 0.92 };  // exits bottom-right
  const points: Point[] = [];
  for (let i = 0; i < ROAD_SAMPLES; i++) {
    const t = i / (ROAD_SAMPLES - 1);
    const mt = 1 - t;
    const x =
      mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x;
    const y =
      mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y;
    points.push({ x, y });
  }
  return points;
}



function toSegments(points: readonly Point[]): Segment[] {
  const segments: Segment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    segments.push({
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      length: Math.hypot(dx, dy) + 8,
      angle: (Math.atan2(dy, dx) * 180) / Math.PI,
      t: i / (points.length - 2),
    });
  }
  return segments;
}

const roadWidthAt = (t: number): number => 46 + t * 40;

export function LoginScreen({
  allowDemo = process.env.EXPO_PUBLIC_ALLOW_DEMO_AUTH === 'true',
  onLoginSuccess,
  onNavigateRegister,
  sessionExpired = false,
}: LoginScreenProps) {
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [authPhase, setAuthPhase] = useState<'phone' | 'otp'>('phone');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [stage, setStage] = useState<StageSize>({ width: 0, height: 0 });
  const otpChallengeRef = useRef<OtpChallenge | null>(null);
  const firebaseReady = isFirebaseConfigured();

  const reduceMotion = useReducedMotion();
  const screenEntranceAnim = useRef(new Animated.Value(0)).current;

  // Animation Controllers:
  // 1. roadScrollAnim: 0 -> 1 looping (continuous smooth highway dashed line travel)
  const roadScrollAnim = useRef(new Animated.Value(0)).current;
  // 2. cloudDrift: 0 -> 1 looping (subtle drifting clouds in sky)
  const cloudDrift = useRef(new Animated.Value(0)).current;
  // 3. suspensionBounce: subtle realistic engine vibration while truck stays in place
  const suspensionBounce = useRef(new Animated.Value(0)).current;
  // 4. windAnim & dustAnim: aerodynamic speed trails & wheel dust
  const windAnim = useRef(new Animated.Value(0)).current;
  const dustAnim = useRef(new Animated.Value(0)).current;

  const points = useMemo(() => sampleMastheadRoad(stage), [stage]);
  const segments = useMemo(() => toSegments(points), [points]);
  const ready = stage.width > 0 && stage.height > 0;

  const truckWidth = Math.max(130, Math.min(168, stage.width * 0.40 || 140));
  const truckHeight = truckWidth / TRUCK_RATIO;

  // Screen entrance animation: Smooth and slow entrance coordination
  useEffect(() => {
    if (reduceMotion) {
      screenEntranceAnim.setValue(1);
      return;
    }
    Animated.timing(screenEntranceAnim, {
      toValue: 1,
      duration: 650,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }, [reduceMotion, screenEntranceAnim]);

  // Ultra-Smooth Highway Movement Loop (Truck stationary, Road & Scenery moving)
  useEffect(() => {
    // 1. Continuous smooth road dashed lines infinite scrolling
    const roadLoop = Animated.loop(
      Animated.timing(roadScrollAnim, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    );

    // 2. Continuous cloud drift loop
    const cloudLoop = Animated.loop(
      Animated.timing(cloudDrift, {
        toValue: 1,
        duration: 18000,
        easing: Easing.linear,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    );

    // 3. Realistic subtle engine vibration (truck stays in place)
    const bounceLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(suspensionBounce, {
          toValue: 1,
          duration: 220,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(suspensionBounce, {
          toValue: 0,
          duration: 220,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
    );

    // 4. Aerodynamic wind pulse loop
    const windLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(windAnim, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(windAnim, {
          toValue: 0,
          duration: 380,
          easing: Easing.in(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
    );

    // 5. Wheel dust expansion loop
    const dustLoop = Animated.loop(
      Animated.timing(dustAnim, {
        toValue: 1,
        duration: 620,
        easing: Easing.linear,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    );

    roadLoop.start();
    cloudLoop.start();
    bounceLoop.start();
    windLoop.start();
    dustLoop.start();

    return () => {
      roadLoop.stop();
      cloudLoop.stop();
      bounceLoop.stop();
      windLoop.stop();
      dustLoop.stop();
    };
  }, [roadScrollAnim, cloudDrift, suspensionBounce, windAnim, dustAnim]);

  // Truck fixed resting position on the highway curve (t ≈ 0.44)
  const anchorPoint = useMemo(() => {
    if (points.length === 0) return { x: 0, y: 0 };
    const idx = Math.floor(points.length * 0.44);
    return points[idx] || points[0];
  }, [points]);

  const truckEntranceX = screenEntranceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-34, 0],
  });
  const truckEntranceOpacity = screenEntranceAnim.interpolate({
    inputRange: [0, 0.25, 1],
    outputRange: [0, 0.75, 1],
  });

  // Stationary Truck with gentle engine vibration + smooth entrance arrival
  const truckStyle = useMemo(() => {
    if (!anchorPoint) return null;
    const finalX = anchorPoint.x - truckWidth / 2;
    const finalY = anchorPoint.y - truckHeight * 0.80;

    const bounceY = suspensionBounce.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -1.0],
    });

    const bounceRot = suspensionBounce.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '0.25deg'],
    });

    return {
      opacity: truckEntranceOpacity,
      transform: [
        { translateX: Animated.add(finalX, truckEntranceX) },
        { translateY: Animated.add(finalY, bounceY) },
        { rotate: bounceRot },
      ],
    };
  }, [suspensionBounce, anchorPoint, truckWidth, truckHeight, truckEntranceX, truckEntranceOpacity]);

  // Stationary Contact Shadow directly beneath the truck chassis
  const shadowStyle = useMemo(() => {
    if (!anchorPoint) return null;
    const shadowW = truckWidth * 0.76;
    const finalX = anchorPoint.x - shadowW / 2 + truckWidth * 0.02;
    const finalY = anchorPoint.y - truckHeight * 0.03;

    return {
      opacity: truckEntranceOpacity,
      transform: [
        { translateX: Animated.add(finalX, truckEntranceX) },
        { translateY: finalY },
        { rotate: '27deg' },
      ],
    };
  }, [anchorPoint, truckWidth, truckHeight, truckEntranceX, truckEntranceOpacity]);

  const brandEntranceStyle = {
    opacity: screenEntranceAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
    transform: [
      {
        translateY: screenEntranceAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-16, 0],
        }),
      },
    ],
  };

  const stageEntranceStyle = {
    opacity: screenEntranceAnim.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0.65, 1] }),
    transform: [
      {
        scale: screenEntranceAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1.03, 1],
        }),
      },
    ],
  };

  const cardEntranceStyle = {
    opacity: screenEntranceAnim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.6, 1] }),
    transform: [
      {
        translateY: screenEntranceAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [42, 0],
        }),
      },
    ],
  };

  // Seamless Animated Moving Dashed Lines along the Highway Curve
  const movingDashes = useMemo(() => {
    if (points.length < 2) return [];
    const step = (points.length - 1) / NUM_DASHES;
    const dashItems = [];

    for (let d = 0; d < NUM_DASHES; d++) {
      const idxStart = Math.min(points.length - 1, Math.floor(d * step));
      const idxEnd = Math.min(points.length - 1, Math.floor((d + 1) * step));
      const ptStart = points[idxStart] || { x: 0, y: 0 };
      const ptEnd = points[idxEnd] || { x: 0, y: 0 };

      const tAvg = (idxStart + idxEnd) / (2 * (points.length - 1));
      const dx = ptEnd.x - ptStart.x;
      const dy = ptEnd.y - ptStart.y;
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

      const posX = roadScrollAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [ptStart.x, ptEnd.x],
      });
      const posY = roadScrollAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [ptStart.y - 2, ptEnd.y - 2],
      });

      const dashWidth = 12 + tAvg * 8;
      const dashHeight = 2.5 + tAvg * 1.5;

      const opacity = roadScrollAnim.interpolate({
        inputRange: [0, 0.08, 0.92, 1],
        outputRange: [d === 0 ? 0 : 0.95, 0.95, 0.95, d === NUM_DASHES - 1 ? 0 : 0.95],
      });

      dashItems.push({
        key: `mov-dash-${d}`,
        posX,
        posY,
        angle,
        dashWidth,
        dashHeight,
        opacity,
      });
    }
    return dashItems;
  }, [points, roadScrollAnim]);

  // Cloud drifting styles
  const cloud1Style = {
    transform: [
      {
        translateX: cloudDrift.interpolate({
          inputRange: [0, 1],
          outputRange: [-60, 420],
        }),
      },
    ],
  };

  const cloud2Style = {
    transform: [
      {
        translateX: cloudDrift.interpolate({
          inputRange: [0, 1],
          outputRange: [140, 620],
        }),
      },
    ],
  };

  // Drifting clouds directly beneath the brand logo
  const cloud3Style = {
    transform: [
      {
        translateX: cloudDrift.interpolate({
          inputRange: [0, 1],
          outputRange: [-80, 400],
        }),
      },
    ],
  };

  const cloud4Style = {
    transform: [
      {
        translateX: cloudDrift.interpolate({
          inputRange: [0, 1],
          outputRange: [60, 540],
        }),
      },
    ],
  };

  const cloud5Style = {
    transform: [
      {
        translateX: cloudDrift.interpolate({
          inputRange: [0, 1],
          outputRange: [-140, 340],
        }),
      },
    ],
  };


  // Aerodynamic wind speed trails
  const windStreak1Style = {
    transform: [
      {
        translateX: windAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [2, -8],
        }),
      },
      { rotate: '-22deg' },
    ],
  };

  const windStreak2Style = {
    transform: [
      {
        translateX: windAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, -10],
        }),
      },
      { rotate: '-20deg' },
    ],
  };

  // Wheel dust cloud puffs
  const dustPuffStyle = {
    transform: [
      {
        translateX: dustAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, -12],
        }),
      },
      {
        scale: dustAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.5, 1.3],
        }),
      },
    ],
    opacity: dustAnim.interpolate({
      inputRange: [0, 0.3, 0.8, 1],
      outputRange: [0.2, 0.85, 0.4, 0],
    }),
  };

  // Exchanges a verified Firebase idToken for a Leopard session.
  const exchangeIdToken = async (idToken: string) => {
    const res = await httpClient.post<AuthResponse>('/auth/firebase', { idToken });
    const accessToken = res.session?.accessToken ?? '';
    const refreshToken = res.session?.refreshToken ?? '';
    await sessionStore.setSession(accessToken, refreshToken, res.user.role);
    onLoginSuccess?.(res.user?.role ?? 'CUSTOMER', res.user?.profileComplete ?? false);
  };

  const describeAuthError = (err: unknown): string => {
    const code = (err as { code?: string })?.code;
    const rawMessage = (err as { message?: string })?.message || '';

    if (typeof code === 'string' && code.startsWith('auth/')) {
      if (code.includes('invalid-verification-code') || code.includes('code-expired')) {
        return 'Mã OTP không đúng hoặc đã hết hạn';
      }
      if (code.includes('operation-not-allowed') || rawMessage.includes('OPERATION_NOT_ALLOWED')) {
        return 'Chưa cấu hình số test (+84900000001) hoặc chưa bật SMS Region (+84) trên Firebase Console';
      }
      if (code.includes('unauthorized-domain')) {
        return 'Domain localhost chưa được thêm vào Authorized Domains trên Firebase Console';
      }
      if (code.includes('popup-blocked')) {
        return 'Trình duyệt đã chặn popup Google. Vui lòng cho phép mở popup';
      }
      if (code.includes('popup-closed-by-user')) {
        return 'Đã đóng cửa sổ đăng nhập Google';
      }
      if (code.includes('too-many-requests') || code.includes('quota-exceeded')) {
        return 'Đã vượt quá giới hạn gửi OTP. Vui lòng thử lại sau ít phút';
      }
      if (code.includes('invalid-phone-number')) {
        return 'Số điện thoại không hợp lệ';
      }
      return 'Xác thực thất bại, vui lòng thử lại';
    }

    if (rawMessage.includes('OPERATION_NOT_ALLOWED')) {
      return 'Chưa cấu hình số test (+84900000001) trên Firebase Console (Authentication > Sign-in method > Phone > Phone numbers for testing)';
    }

    const statusCode = (err as { statusCode?: number })?.statusCode ?? 0;
    const message = (err as { message?: string })?.message;
    if (statusCode === 401 || statusCode === 403) {
      return message || 'Thông tin đăng nhập không hợp lệ';
    }
    if (statusCode === 503 || statusCode === 0) {
      return message || 'Hệ thống xác thực tạm thời không khả dụng';
    }
    return message || 'Đã xảy ra lỗi khi đăng nhập';
  };

  const handleSendOtp = async () => {
    if (isSubmitting) return;
    if (!isLikelyVnPhone(phone)) {
      setErrorMsg('Số điện thoại không hợp lệ');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      otpChallengeRef.current = await sendPhoneOtp(phone, RECAPTCHA_CONTAINER_ID);
      setOtpCode('');
      setAuthPhase('otp');
    } catch (err) {
      resetRecaptcha();
      setErrorMsg(describeAuthError(err) || 'Không gửi được mã OTP, vui lòng thử lại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    const challenge = otpChallengeRef.current;
    if (isSubmitting || !challenge) return;
    if (otpCode.trim().length < 6) {
      setErrorMsg('Vui lòng nhập đủ 6 số mã OTP');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const idToken = await challenge.confirm(otpCode.trim());
      await exchangeIdToken(idToken);
    } catch (err) {
      setErrorMsg(describeAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const idToken = await signInWithGoogle();
      await exchangeIdToken(idToken);
    } catch (err) {
      setErrorMsg(describeAuthError(err) || 'Đăng nhập Google thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePhone = () => {
    resetRecaptcha();
    otpChallengeRef.current = null;
    setOtpCode('');
    setErrorMsg(null);
    setAuthPhase('phone');
  };

  const handleDemoLogin = async (accountId: string, defaultRole: Role) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await httpClient.post<AuthResponse>('/auth/login/demo', { accountId });
      const accessToken = res.session?.accessToken ?? '';
      const refreshToken = res.session?.refreshToken ?? '';
      await sessionStore.setSession(accessToken, refreshToken, res.user.role);
      const role = res.user?.role ?? defaultRole;
      onLoginSuccess?.(role, res.user?.profileComplete ?? false);
    } catch (err) {
      const statusCode = (err as { statusCode?: number })?.statusCode ?? 0;
      const message = (err as { message?: string })?.message;

      if (statusCode === 401 || statusCode === 403) {
        setErrorMsg(message || 'Tài khoản demo không hợp lệ');
      } else if (statusCode === 503 || statusCode === 0) {
        setErrorMsg(message || 'Hệ thống xác thực tạm thời không khả dụng');
      } else {
        setErrorMsg(message || 'Đã xảy ra lỗi khi đăng nhập demo');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      style={styles.scroll}
    >
      {/* ================= FULL-BLEED HERO STAGE (EDGE-TO-EDGE) ================= */}
      <View style={styles.heroSection}>
        {/* Brand Bar Floating over Sky at Top (Strictly Centered) */}
        <Animated.View style={[styles.brandFloatingBar, brandEntranceStyle]}>
          <View style={styles.brandRow}>
            <LeopardEmblem testID="login-brand-emblem" width={58} />
            <LeopardMobileLogo height={32} testID="login-brand-logo" width={146} />
          </View>
        </Animated.View>


        {/* 3D SCENIC STAGE: Sky, 3D Modern Glass Towers Skyline & Continuous Angled Highway */}
        <Animated.View
          onLayout={(e) =>
            setStage({
              width: e.nativeEvent.layout.width,
              height: e.nativeEvent.layout.height,
            })
          }
          style={[styles.scenicStageFullBleed, stageEntranceStyle]}
        >
          {/* SKY & FLOATING CLOUDS */}
          <View style={styles.skyBackground}>
            {/* Drifting Cloud 1 */}
            <Animated.View style={[styles.cloudGroup, styles.cloud1, cloud1Style]}>
              <View style={styles.cloudPuffMain} />
              <View style={styles.cloudPuffLeft} />
              <View style={styles.cloudPuffRight} />
            </Animated.View>

            {/* Drifting Cloud 2 */}
            <Animated.View style={[styles.cloudGroup, styles.cloud2, cloud2Style]}>
              <View style={[styles.cloudPuffMain, { width: 36, height: 17 }]} />
              <View style={[styles.cloudPuffLeft, { width: 24, height: 14, left: -11 }]} />
              <View style={[styles.cloudPuffRight, { width: 22, height: 13, right: -9 }]} />
            </Animated.View>
          </View>

          {/* 3D ISOMETRIC MODERN CITY (ENLARGED BEHIND HIGHWAY) */}
          <View pointerEvents="none" style={styles.skylineWrapper}>
            <Image
              source={citySkylineSource}
              resizeMode="cover"
              style={styles.skylineImage}
            />
          </View>

          {/* CLEAN SOLID OCCLUSION GROUND (PREVENTS ANY CITY GRAPHICS BELOW ROAD) */}
          <View pointerEvents="none" style={styles.cleanUnderRoadGround} />






          {/* ================= 3D ELEVATED OVERPASS HIGHWAY (Positioned lower for clear brand space) ================= */}
          {ready && (
            <View style={[StyleSheet.absoluteFill, styles.highwayContainer]}>
              {/* Layer 1: Ambient Drop Shadow */}

              {segments.map((s, i) => {
                const wdt = roadWidthAt(s.t) + 12;
                return (
                  <View
                    key={`shd-${i}`}
                    style={{
                      position: 'absolute',
                      left: s.x - s.length / 2,
                      top: s.y - wdt / 2 + 10,
                      width: s.length,
                      height: wdt,
                      borderRadius: 10,
                      backgroundColor: scene.roadCastShadow,
                      transform: [{ rotate: `${s.angle}deg` }],
                    }}
                  />
                );
              })}

              {/* Layer 2: 3D Concrete Bridge Wall */}
              {segments.map((s, i) => {
                const wdt = roadWidthAt(s.t) + 8;
                return (
                  <View
                    key={`wall-${i}`}
                    style={{
                      position: 'absolute',
                      left: s.x - s.length / 2,
                      top: s.y - wdt / 2 + 5,
                      width: s.length,
                      height: wdt,
                      borderRadius: 8,
                      backgroundColor: scene.roadOverpassWall,
                      transform: [{ rotate: `${s.angle}deg` }],
                    }}
                  />
                );
              })}

              {/* Layer 3: Road Shoulder */}
              {segments.map((s, i) => {
                const wdt = roadWidthAt(s.t) + 8;
                return (
                  <View
                    key={`sh-${i}`}
                    style={{
                      position: 'absolute',
                      left: s.x - s.length / 2,
                      top: s.y - wdt / 2,
                      width: s.length,
                      height: wdt,
                      borderRadius: 8,
                      backgroundColor: scene.roadShoulder,
                      transform: [{ rotate: `${s.angle}deg` }],
                    }}
                  />
                );
              })}

              {/* Layer 4: Upper Light Reflection Edge */}
              {segments.map((s, i) => {
                const wdt = roadWidthAt(s.t) + 8;
                return (
                  <View
                    key={`hgl-${i}`}
                    style={{
                      position: 'absolute',
                      left: s.x - s.length / 2,
                      top: s.y - wdt / 2 - 1,
                      width: s.length,
                      height: 2,
                      borderRadius: 1,
                      backgroundColor: scene.roadHighlight,
                      transform: [{ rotate: `${s.angle}deg` }],
                    }}
                  />
                );
              })}

              {/* Layer 5: Main Asphalt Surface */}
              {segments.map((s, i) => {
                const wdt = roadWidthAt(s.t);
                return (
                  <View
                    key={`rd-${i}`}
                    style={{
                      position: 'absolute',
                      left: s.x - s.length / 2,
                      top: s.y - wdt / 2,
                      width: s.length,
                      height: wdt,
                      borderRadius: 6,
                      backgroundColor: scene.roadFill,
                      transform: [{ rotate: `${s.angle}deg` }],
                    }}
                  />
                );
              })}

              {/* Layer 6: Continuous Seamlessly Moving Dashed Centre Line */}
              {movingDashes.map((d) => (
                <Animated.View
                  key={d.key}
                  style={{
                    position: 'absolute',
                    left: d.posX,
                    top: d.posY,
                    width: d.dashWidth,
                    height: d.dashHeight,
                    borderRadius: 2,
                    backgroundColor: scene.roadLine,
                    opacity: d.opacity,
                    transform: [{ rotate: `${d.angle}deg` }],
                  }}
                />
              ))}
            </View>
          )}

          {/* ================= STATIONARY TRUCK WITH DYNAMIC CRUISE & WIND ================= */}
          {ready && truckStyle && shadowStyle && (
            <>
              {/* Contact Shadow directly beneath truck */}
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.truckShadow,
                  shadowStyle,
                  { width: truckWidth * 0.76, height: 18 },
                ]}
              />

              {/* Truck in fixed spot with natural suspension micro-vibration */}
              <Animated.View
                pointerEvents="none"
                style={[styles.truckWrap, truckStyle, { width: truckWidth }]}
              >
                {/* Pure White Aerodynamic Wind Speed Streaks */}
                <Animated.View style={[styles.windStreak, styles.windStreak1, windStreak1Style]} />
                <Animated.View style={[styles.windStreak, styles.windStreak2, windStreak2Style]} />

                {/* Wheel Dust Cloud */}
                <Animated.View style={[styles.dustPuff, dustPuffStyle]} />

                {/* Truck Graphic */}
                <Image
                  resizeMode="contain"
                  source={truckSource}
                  style={{ width: truckWidth, height: truckHeight }}
                />
              </Animated.View>
            </>
          )}

          {/* Live Vietmap Navigation Telemetry Chip */}
          <View style={styles.telemetryBadge}>
            <View style={styles.telemetryDot} />
            <Text style={styles.telemetryText}>Trực tuyến · Vietmap Routing</Text>
          </View>
        </Animated.View>
      </View>

      {/* ================= HARMONIOUS CURVED BOTTOM SHEET ================= */}
      <Animated.View style={[styles.harmoniousCardBody, cardEntranceStyle]}>
        {/* Decorative Top Pill Handle */}
        <View style={styles.sheetHandle} />

        {/* Friendly Greeting Header */}
        <View style={styles.welcomeGroup}>
          <Text accessibilityRole="header" style={styles.srOnly}>
            Đăng nhập
          </Text>
          <Text style={styles.headline}>
            LEOPARD Xin chào! 👋
          </Text>
          <Text style={styles.subline}>
            Đồng hành cùng bạn trên mọi nẻo đường vận tải hàng hóa an toàn, nhanh chóng & tối ưu chi phí.
          </Text>
        </View>

        {sessionExpired ? (
          <View style={styles.alertBox} testID="session-expired-banner">
            <Text accessibilityRole="alert" style={styles.alertText}>
              Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.
            </Text>
          </View>
        ) : null}

        {errorMsg ? (
          <View style={styles.errorBox} testID="login-error-banner">
            <Text accessibilityRole="alert" style={styles.errorText}>
              {errorMsg}
            </Text>
          </View>
        ) : null}

        {/* ================= LUXURY LOGIN FORM CARD ================= */}
        <View style={styles.luxuryCard}>
          {authPhase === 'phone' ? (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>Số điện thoại</Text>

                <View
                  style={[
                    styles.customInputWrapper,
                    isInputFocused && styles.customInputWrapperFocused,
                  ]}
                >
                  <View style={styles.countryBadge}>
                    <Text style={styles.countryFlag}>🇻🇳</Text>
                    <Text style={styles.countryCode}>+84</Text>
                    <View style={styles.badgeDivider} />
                  </View>

                  <TextInput
                    accessibilityLabel="Số điện thoại"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSubmitting}
                    keyboardType="phone-pad"
                    onBlur={() => setIsInputFocused(false)}
                    onChangeText={setPhone}
                    onFocus={() => setIsInputFocused(true)}
                    placeholder="Nhập số điện thoại..."
                    placeholderTextColor="#94A3B8"
                    style={styles.customTextInput}
                    value={phone}
                  />
                </View>
              </View>

              <Pressable
                accessibilityLabel="Gửi mã OTP"
                accessibilityRole="button"
                accessibilityState={{
                  busy: isSubmitting,
                  disabled: isSubmitting || !phone.trim() || !firebaseReady,
                }}
                disabled={isSubmitting || !phone.trim() || !firebaseReady}
                onPress={handleSendOtp}
                style={({ pressed }) => [
                  styles.primaryCtaBtn,
                  (!phone.trim() || isSubmitting || !firebaseReady) &&
                  styles.primaryCtaBtnDisabled,
                  pressed && styles.primaryCtaBtnPressed,
                ]}
              >
                <View pointerEvents="none" style={styles.ctaHighlight} />
                <Text style={styles.primaryCtaText}>
                  {isSubmitting ? 'Đang gửi...' : 'Gửi mã OTP'}
                </Text>
              </Pressable>

              <View style={styles.orRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.orText}>hoặc</Text>
                <View style={styles.dividerLine} />
              </View>

              <Pressable
                accessibilityLabel="Đăng nhập với Google"
                accessibilityRole="button"
                disabled={isSubmitting || !firebaseReady}
                onPress={handleGoogleLogin}
                style={({ pressed }) => [
                  styles.googleBtn,
                  (isSubmitting || !firebaseReady) && styles.googleBtnDisabled,
                  pressed && styles.primaryCtaBtnPressed,
                ]}
              >
                <Text style={styles.googleG}>G</Text>
                <Text style={styles.googleBtnText}>Đăng nhập với Google</Text>
              </Pressable>

              {!firebaseReady ? (
                <Text style={styles.configNote}>
                  Chưa cấu hình Firebase — dùng tài khoản demo bên dưới.
                </Text>
              ) : null}
            </>
          ) : (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>
                  Nhập mã OTP gửi tới {toE164Vn(phone)}
                </Text>

                <View
                  style={[
                    styles.customInputWrapper,
                    isInputFocused && styles.customInputWrapperFocused,
                  ]}
                >
                  <TextInput
                    accessibilityLabel="Mã OTP"
                    autoFocus
                    editable={!isSubmitting}
                    keyboardType="number-pad"
                    maxLength={6}
                    onBlur={() => setIsInputFocused(false)}
                    onChangeText={setOtpCode}
                    onFocus={() => setIsInputFocused(true)}
                    placeholder="______"
                    placeholderTextColor="#94A3B8"
                    style={[styles.customTextInput, styles.otpInput]}
                    value={otpCode}
                  />
                </View>
              </View>

              <Pressable
                accessibilityLabel="Xác nhận mã OTP"
                accessibilityRole="button"
                accessibilityState={{
                  busy: isSubmitting,
                  disabled: isSubmitting || otpCode.trim().length < 6,
                }}
                disabled={isSubmitting || otpCode.trim().length < 6}
                onPress={handleVerifyOtp}
                style={({ pressed }) => [
                  styles.primaryCtaBtn,
                  (otpCode.trim().length < 6 || isSubmitting) &&
                  styles.primaryCtaBtnDisabled,
                  pressed && styles.primaryCtaBtnPressed,
                ]}
              >
                <View pointerEvents="none" style={styles.ctaHighlight} />
                <Text style={styles.primaryCtaText}>
                  {isSubmitting ? 'Đang xác nhận...' : 'Xác nhận'}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting}
                hitSlop={8}
                onPress={handleChangePhone}
                style={styles.changePhoneBtn}
              >
                <Text style={styles.changePhoneLink}>← Đổi số điện thoại</Text>
              </Pressable>
            </>
          )}

          {/* Invisible reCAPTCHA container required by Firebase web Phone Auth */}
          <View nativeID={RECAPTCHA_CONTAINER_ID} style={styles.recaptcha} />
        </View>

        {/* Demo One-Click Section */}
        {allowDemo ? (
          <View style={styles.demoSection}>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.demoDividerText}>Tài khoản demo</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.demoGrid}>
              <View style={[styles.demoCard, styles.demoCardBlue]}>
                <View style={styles.demoCardTop}>
                  <IconRoleCustomer
                    color={colors.brand.background}
                    secondaryColor={colors.brand.softBackground}
                    size={22}
                  />
                  <View style={[styles.demoRoleBadge, styles.demoRoleBadgeBlue]}>
                    <Text style={styles.demoRoleBadgeText}>Khách hàng</Text>
                  </View>
                </View>
                <Text style={styles.demoCardDesc}>Đặt đơn đa điểm, theo dõi ETA</Text>
                <Button
                  disabled={isSubmitting}
                  label="Demo Customer"
                  onPress={() => handleDemoLogin('customer', 'CUSTOMER')}
                  variant="secondary"
                />
              </View>

              <View style={[styles.demoCard, styles.demoCardGreen]}>
                <View style={styles.demoCardTop}>
                  <IconRoleDriver
                    color={colors.success.border}
                    secondaryColor={colors.success.background}
                    size={22}
                  />
                  <View style={[styles.demoRoleBadge, styles.demoRoleBadgeGreen]}>
                    <Text style={styles.demoRoleBadgeText}>Tài xế</Text>
                  </View>
                </View>
                <Text style={styles.demoCardDesc}>Nhận chuyến, định vị & tải POD</Text>
                <Button
                  disabled={isSubmitting}
                  label="Demo Driver"
                  onPress={() => handleDemoLogin('driver', 'DRIVER')}
                  variant="secondary"
                />
              </View>

              <View style={[styles.demoCard, styles.demoCardAmber]}>
                <View style={styles.demoCardTop}>
                  <IconRoleFleet
                    color={colors.warning.border}
                    secondaryColor={colors.warning.background}
                    size={22}
                  />
                  <View style={[styles.demoRoleBadge, styles.demoRoleBadgeAmber]}>
                    <Text style={styles.demoRoleBadgeText}>Đội xe</Text>
                  </View>
                </View>
                <Text style={styles.demoCardDesc}>Giám sát xe & đối tác tài xế</Text>
                <Button
                  disabled={isSubmitting}
                  label="Demo Fleet Owner"
                  onPress={() => handleDemoLogin('fleet-owner', 'FLEET_OWNER')}
                  variant="secondary"
                />
              </View>

              <View style={[styles.demoCard, styles.demoCardSlate]}>
                <View style={styles.demoCardTop}>
                  <IconRoleAdmin
                    color={colors.neutral.text}
                    secondaryColor={colors.neutral.surface}
                    size={22}
                  />
                  <View style={[styles.demoRoleBadge, styles.demoRoleBadgeSlate]}>
                    <Text style={styles.demoRoleBadgeText}>Admin</Text>
                  </View>
                </View>
                <Text style={styles.demoCardDesc}>Kiểm soát toàn hệ thống</Text>
                <Button
                  disabled={isSubmitting}
                  label="Demo Admin"
                  onPress={() => handleDemoLogin('admin', 'ADMIN')}
                  variant="secondary"
                />
              </View>
            </View>
          </View>
        ) : null}

        {/* Footer Navigation */}
        {onNavigateRegister ? (
          <View style={styles.registerRow}>
            <Text style={styles.registerHelper}>Chưa có tài khoản?</Text>
            <Pressable hitSlop={8} onPress={onNavigateRegister}>
              <Text style={styles.registerLink}>Đăng ký ngay</Text>
            </Pressable>
          </View>
        ) : null}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    backgroundColor: '#EEF3F9',
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },

  /* FULL-BLEED HERO STAGE */
  heroSection: {
    width: '100%',
    backgroundColor: scene.skyTop,
    position: 'relative',
    overflow: 'hidden',
  },
  brandFloatingBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    paddingTop: Platform.OS === 'ios' ? 14 : 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingLeft: 10,
    paddingRight: 14,
    paddingVertical: 4,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.85)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },

  scenicStageFullBleed: {
    width: '100%',
    height: 310,
    backgroundColor: scene.skyBottom,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'flex-end',
  },

  /* 3D ISOMETRIC MODERN CITY SKYLINE (COVERS ENTIRE UPPER BACKDROP ABOVE ROAD) */
  skylineWrapper: {
    position: 'absolute',
    left: 0,
    right: 10,
    top: 70,
    bottom: 50,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    opacity: 0.98,
  },
  skylineImage: {
    width: '130%',
    height: '120%',
  },

  /* Clean Solid Ground (Guarantees no city graphics bleed below the road) */
  cleanUnderRoadGround: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 95,
    backgroundColor: scene.skyBottom,
    zIndex: 2,
  },









  /* 3D Highway Layer */
  highwayContainer: {
    zIndex: 5,
  },

  /* SKY & FLOATING CLOUDS (REDUCED) */
  skyBackground: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 0,
  },
  cloudGroup: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  cloud1: {
    top: 14,
    left: 20,
    opacity: 0.85,
  },
  cloud2: {
    top: 32,
    left: 220,
    opacity: 0.80,
  },

  cloudPuffMain: {
    width: 44,
    height: 20,
    borderRadius: 12,
    backgroundColor: scene.cloud,
  },
  cloudPuffLeft: {
    position: 'absolute',
    left: -12,
    top: 3,
    width: 26,
    height: 16,
    borderRadius: 10,
    backgroundColor: scene.cloud,
  },
  cloudPuffRight: {
    position: 'absolute',
    right: -10,
    top: 4,
    width: 24,
    height: 14,
    borderRadius: 9,
    backgroundColor: scene.cloud,
  },

  /* TRUCK & SHADOW */
  truckShadow: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: scene.shadow,
    zIndex: 6,
  },
  truckWrap: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
    zIndex: 8,
  },

  windStreak: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 3,
  },
  windStreak1: {
    width: 24,
    height: 3,
    left: '6%',
    top: '18%',
  },
  windStreak2: {
    width: 18,
    height: 2.5,
    left: '12%',
    top: '30%',
  },
  dustPuff: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(203, 213, 225, 0.85)',
    borderColor: '#94A3B8',
    borderWidth: 1,
    left: '8%',
    top: '64%',
  },
  telemetryBadge: {
    position: 'absolute',
    right: 14,
    bottom: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 10,
  },
  telemetryDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: scene.pinDrop,
  },
  telemetryText: {
    fontSize: 11,
    fontWeight: '700',
    color: scene.ink,
  },

  /* ================= HARMONIOUS CURVED BOTTOM SHEET ================= */
  harmoniousCardBody: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -26,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 8,
    flex: 1,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.5)',
  },
  sheetHandle: {
    width: 38,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 4,
  },
  welcomeGroup: {
    gap: 4,
  },
  srOnly: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
  },
  headline: {
    color: scene.ink,
    fontSize: 23,
    fontWeight: '800',
    lineHeight: 29,
    letterSpacing: -0.3,
  },
  subline: {
    color: scene.muted,
    fontSize: 13,
    lineHeight: 18.5,
    fontWeight: '500',
  },

  /* Luxury Card */
  luxuryCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderRadius: 22,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
    shadowColor: 'rgba(15, 23, 42, 0.04)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 2,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: scene.ink,
  },
  customInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderRadius: radius.card,
    borderWidth: 1.5,
    paddingHorizontal: spacing.sm,
    height: 52,
  },
  customInputWrapperFocused: {
    borderColor: scene.ctaTop,
    shadowColor: scene.ctaTop,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  countryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: spacing.xs,
  },
  countryFlag: {
    fontSize: 16,
  },
  countryCode: {
    fontSize: 13.5,
    fontWeight: '700',
    color: scene.ink,
  },
  badgeDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#CBD5E1',
    marginLeft: 6,
  },
  customTextInput: {
    flex: 1,
    fontSize: 14.5,
    color: scene.ink,
    paddingHorizontal: spacing.xs,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '600',
  },

  /* Primary Gradient Button */
  primaryCtaBtn: {
    backgroundColor: scene.ctaBottom,
    height: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: scene.ctaBottom,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 16,
    elevation: 6,
  },
  ctaHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: scene.ctaTop,
    opacity: 0.55,
  },
  primaryCtaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  primaryCtaBtnDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.65,
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryCtaBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },

  /* OTP + Google + reCAPTCHA */
  otpInput: {
    letterSpacing: 8,
    fontSize: 20,
    textAlign: 'center',
  },
  orRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  orText: {
    color: scene.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CAD9EB',
  },
  googleBtnDisabled: {
    opacity: 0.6,
  },
  googleG: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4285F4',
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: scene.ink,
  },
  configNote: {
    color: scene.muted,
    fontSize: 12,
    textAlign: 'center',
  },
  changePhoneBtn: {
    alignSelf: 'center',
    paddingVertical: spacing.xs,
  },
  changePhoneLink: {
    color: scene.ctaTop,
    fontSize: 13.5,
    fontWeight: '700',
  },
  recaptcha: {
    height: 0,
    width: 0,
    overflow: 'hidden',
  },

  /* Demo Area */
  demoSection: {
    gap: spacing.sm,
    paddingTop: spacing.xxs,
  },
  dividerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dividerLine: {
    backgroundColor: '#CBD5E1',
    flex: 1,
    height: 1,
  },
  demoDividerText: {
    color: scene.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  demoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  demoCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderRadius: radius.card,
    borderWidth: 1,
    flexBasis: '48%',
    flexGrow: 1,
    gap: 4,
    minHeight: 88,
    padding: spacing.sm,
    shadowColor: 'rgba(15, 23, 42, 0.03)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 1,
  },
  demoCardBlue: {
    borderColor: '#BAE6FD',
  },
  demoCardGreen: {
    borderColor: '#BBF7D0',
  },
  demoCardAmber: {
    borderColor: '#FDE68A',
  },
  demoCardSlate: {
    borderColor: '#E2E8F0',
  },
  demoCardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  demoRoleBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  demoRoleBadgeBlue: {
    backgroundColor: colors.brand.softBackground,
  },
  demoRoleBadgeGreen: {
    backgroundColor: colors.success.background,
  },
  demoRoleBadgeAmber: {
    backgroundColor: colors.warning.background,
  },
  demoRoleBadgeSlate: {
    backgroundColor: colors.neutral.surface,
  },
  demoRoleBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  demoCardDesc: {
    color: scene.muted,
    fontSize: 11,
    lineHeight: 14,
  },

  /* Register link row */
  registerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  registerHelper: {
    ...typography.caption,
    color: scene.muted,
    fontWeight: '500',
  },
  registerLink: {
    ...typography.caption,
    color: scene.ctaTop,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  /* Alert / Error boxes */
  alertBox: {
    backgroundColor: colors.warning.background,
    borderColor: colors.warning.border,
    borderRadius: radius.control,
    borderWidth: 1,
    padding: spacing.sm,
  },
  alertText: {
    ...typography.caption,
    color: colors.warning.text,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: colors.danger.background,
    borderColor: colors.danger.border,
    borderRadius: radius.control,
    borderWidth: 1,
    padding: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger.text,
    fontWeight: '600',
  },
});
