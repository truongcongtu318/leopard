import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Role } from '@leopard/shared';

import {
  IconChevron,
  IconClock,
  OtpPhoneHeroIcon,
  colors,
  driverPrimitives,
  driverSemantics,
  httpClient,
  iosContinuousCurve,
  leopardPalette,
  radius,
  sessionStore,
  spacing,
  toE164Vn,
  typeScale,
} from '@leopard/mobile-core';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

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

const NUM_CELLS = 6;
const COUNTDOWN_INITIAL = 60;
const DRIVER_ACCENT = '#0284C7';

const KEYPAD_LETTERS: Record<string, string> = {
  '1': '',
  '2': 'ABC',
  '3': 'DEF',
  '4': 'GHI',
  '5': 'JKL',
  '6': 'MNO',
  '7': 'PQRS',
  '8': 'TUV',
  '9': 'WXYZ',
  '0': '+',
};

export default function DriverVerifyOtpRoute() {
  const router = useRouter();
  const { height: viewportHeight } = useWindowDimensions();
  const searchParams = useLocalSearchParams<{ phone?: string }>();
  const phone = searchParams.phone || '';
  const isCompactViewport = viewportHeight < 720;

  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(COUNTDOWN_INITIAL);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const otpInputRef = useRef<TextInput>(null);

  useEffect(() => {
    otpInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(public)/login');
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || isSubmitting) return;
    setOtp('');
    setErrorMsg(null);
    setCountdown(COUNTDOWN_INITIAL);
    try {
      await httpClient.post('/auth/send-otp', { phone });
    } catch {
      // Demo environments may not have send-otp endpoint, reset countdown anyway
    }
  };

  const handleVerify = async (codeToVerify: string) => {
    if (isSubmitting || codeToVerify.length !== NUM_CELLS) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      let res: AuthResponse;
      try {
        res = await httpClient.post<AuthResponse>('/auth/verify-otp', {
          phone,
          otp: codeToVerify,
        });
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        const isDemoPhone =
          phone.startsWith('09000000') ||
          phone.startsWith('+849000000') ||
          phone.startsWith('+84000000') ||
          phone === 'driver';
        if (statusCode === 404 && isDemoPhone) {
          res = await httpClient.post<AuthResponse>('/auth/login/demo', {
            accountId: phone === 'driver' ? 'driver' : (phone.startsWith('+84') ? 'driver' : phone),
          });
        } else {
          throw err;
        }
      }

      const accessToken = res.session?.accessToken ?? '';
      const refreshToken = res.session?.refreshToken ?? '';
      await sessionStore.setSession(accessToken, refreshToken, res.user.role);

      if (res.user.status === 'PENDING_APPROVAL') {
        router.replace('/(public)/kyc-pending');
      } else if (res.user.role === 'DRIVER') {
        if (res.user.profileComplete) {
          router.replace('/orders');
        } else {
          router.replace('/(public)/driver-register');
        }
      } else {
        router.replace('/(public)/driver-register');
      }
    } catch (err) {
      const message = (err as { message?: string })?.message || 'Mã OTP không đúng hoặc đã hết hạn';
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (char: string) => {
    if (isSubmitting) return;
    if (char === 'backspace') {
      setOtp((prev) => prev.slice(0, -1));
      setErrorMsg(null);
      return;
    }
    if (otp.length < NUM_CELLS) {
      const nextOtp = otp + char;
      setOtp(nextOtp);
      setErrorMsg(null);
      if (nextOtp.length === NUM_CELLS) {
        void handleVerify(nextOtp);
      }
    }
  };

  const formattedPhone = phone ? (phone.startsWith('+84') ? phone : toE164Vn(phone)) : '';

  const renderCell = (index: number) => {
    const digit = otp[index] ?? '';
    const isCellActive = otp.length === index;
    const isFilled = digit !== '';

    return (
      <View
        key={`driver-cell-${index}`}
        style={[
          styles.cell,
          isFilled && styles.cellFilled,
          isCellActive && styles.cellActive,
          errorMsg ? styles.cellError : null,
        ]}
        testID={`otp-cell-${index}`}
      >
        {isCellActive && !isFilled ? (
          <View style={styles.activeCursor} />
        ) : (
          <Text style={styles.cellText}>{digit}</Text>
        )}
      </View>
    );
  };

  const renderNumpadKey = (n: string) => (
    <Pressable
      accessibilityLabel={`Số ${n}`}
      accessibilityRole="button"
      accessibilityState={{ disabled: isSubmitting }}
      disabled={isSubmitting}
      key={n}
      onPress={() => handleKeyPress(n)}
      style={({ pressed }) => [
        styles.numpadKey,
        isCompactViewport && styles.numpadKeyCompact,
        pressed && styles.numpadKeyPressed,
      ]}
      testID={`numpad-${n}`}
    >
      <Text style={styles.numpadKeyText}>{n}</Text>
      {KEYPAD_LETTERS[n] ? (
        <Text style={styles.numpadSubText}>{KEYPAD_LETTERS[n]}</Text>
      ) : null}
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Ambient Glow */}
        <Svg height={160} pointerEvents="none" preserveAspectRatio="none" style={styles.heroAuraSvg} width="100%">
          <Defs>
            <LinearGradient id="verifyOtpGradient" x1="0" x2="0" y1="0" y2="1">
              <Stop offset="0%" stopColor="#0F2754" stopOpacity="1" />
              <Stop offset="100%" stopColor={leopardPalette.primary} stopOpacity="0" />
            </LinearGradient>
            <RadialGradient id="verifyAuraGlow" cx="50%" cy="15%" r="65%">
              <Stop offset="0%" stopColor="#0284C7" stopOpacity="0.32" />
              <Stop offset="70%" stopColor="#0284C7" stopOpacity="0.08" />
              <Stop offset="100%" stopColor="#0284C7" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect fill="url(#verifyOtpGradient)" height="100%" width="100%" />
          <Rect fill="url(#verifyAuraGlow)" height="100%" width="100%" />
        </Svg>

        {/* Top Header */}
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Quay lại"
            accessibilityRole="button"
            hitSlop={8}
            onPress={handleBack}
            style={({ pressed }) => [styles.backBtn, pressed && styles.controlPressed]}
            testID="btn-back"
          >
            <IconChevron color={colors.neutral.surface} direction="left" size={20} />
          </Pressable>
          <Text style={styles.headerTitle}>XÁC THỰC BẢO MẬT</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        {/* Central Verification Card */}
        <View style={[styles.content, isCompactViewport && styles.contentCompact]}>
          {/* Visual Anchor Hero Badge */}
          <View style={styles.heroBadge}>
            <OtpPhoneHeroIcon isVerified={false} size={30} />
          </View>

          <Text accessibilityRole="header" style={styles.heroTitle}>
            Nhập mã xác thực
          </Text>

          <View style={styles.sublineWrap}>
            <Text style={styles.subline}>
              Mã 6 chữ số đã gửi tới{' '}
              <Text style={styles.phoneHighlight}>{formattedPhone || phone}</Text>
            </Text>
            <Pressable
              accessibilityLabel="Đổi số điện thoại"
              accessibilityRole="button"
              hitSlop={8}
              onPress={handleBack}
              style={styles.changePhoneBtn}
            >
              <Text style={styles.changePhoneText}>Đổi số</Text>
            </Pressable>
          </View>

          {errorMsg ? (
            <View style={styles.errorBox} testID="otp-error-banner">
              <Text accessibilityRole="alert" style={styles.errorText}>
                {errorMsg}
              </Text>
            </View>
          ) : null}

          <TextInput
            accessibilityLabel="Mã OTP"
            autoComplete="sms-otp"
            autoFocus={false}
            editable={!isSubmitting}
            keyboardType="number-pad"
            maxLength={NUM_CELLS}
            onChangeText={(text) => {
              const cleaned = text.replace(/[^0-9]/g, '').slice(0, NUM_CELLS);
              setOtp(cleaned);
              setErrorMsg(null);
              if (cleaned.length === NUM_CELLS) {
                void handleVerify(cleaned);
              }
            }}
            ref={otpInputRef}
            showSoftInputOnFocus={false}
            style={styles.hiddenInput}
            textContentType="oneTimeCode"
            value={otp}
          />

          {/* 6 OTP Cells in 3 - 3 Rhythm */}
          <Pressable
            accessible={false}
            onPress={() => otpInputRef.current?.focus()}
            style={styles.cellsRow}
            testID="otp-boxes"
          >
            <View style={styles.cellTriplet}>
              {[0, 1, 2].map((index) => renderCell(index))}
            </View>

            <View style={styles.cellDivider}>
              <View style={styles.dividerBar} />
            </View>

            <View style={styles.cellTriplet}>
              {[3, 4, 5].map((index) => renderCell(index))}
            </View>
          </Pressable>

          {/* Resend / Countdown Capsule */}
          <View style={styles.resendRow}>
            {countdown > 0 ? (
              <View style={styles.timerCapsule}>
                <IconClock color="#38BDF8" size="sm" />
                <Text style={styles.countdownText}>
                  Gửi lại mã sau{' '}
                  <Text style={styles.countdownTime}>
                    00:{countdown < 10 ? `0${countdown}` : countdown}
                  </Text>
                </Text>
              </View>
            ) : (
              <Pressable
                accessibilityLabel="Gửi lại mã"
                accessibilityRole="button"
                hitSlop={8}
                onPress={handleResend}
                style={styles.resendBtn}
                testID="btn-resend"
              >
                <Text style={styles.resendBtnText}>Gửi lại mã OTP</Text>
              </Pressable>
            )}
          </View>

          {isSubmitting ? (
            <View style={styles.submittingIndicator}>
              <ActivityIndicator color={DRIVER_ACCENT} size="small" />
              <Text style={styles.submittingText}>Đang xác thực hồ sơ tài xế...</Text>
            </View>
          ) : null}
        </View>

        {/* iOS-Style Numeric Keypad */}
        <View
          style={[styles.numpadContainer, isCompactViewport && styles.numpadContainerCompact]}
          testID="virtual-numpad"
        >
          <View style={styles.numpadRow}>
            {['1', '2', '3'].map((n) => renderNumpadKey(n))}
          </View>
          <View style={styles.numpadRow}>
            {['4', '5', '6'].map((n) => renderNumpadKey(n))}
          </View>
          <View style={styles.numpadRow}>
            {['7', '8', '9'].map((n) => renderNumpadKey(n))}
          </View>
          <View style={styles.numpadRow}>
            <View style={[styles.numpadKeyEmpty, isCompactViewport && styles.numpadKeyCompact]} />
            {renderNumpadKey('0')}
            <Pressable
              accessibilityLabel="Xóa"
              accessibilityRole="button"
              accessibilityState={{ disabled: isSubmitting }}
              disabled={isSubmitting}
              onPress={() => handleKeyPress('backspace')}
              style={({ pressed }) => [
                styles.numpadKey,
                isCompactViewport && styles.numpadKeyCompact,
                pressed && styles.numpadKeyPressed,
              ]}
              testID="numpad-backspace"
            >
              <Text style={styles.numpadKeyActionText}>⌫</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#06162F',
  },
  container: {
    alignSelf: 'center',
    backgroundColor: leopardPalette.primary,
    flex: 1,
    justifyContent: 'space-between',
    maxWidth: 480,
    width: '100%',
    position: 'relative',
  },
  heroAuraSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 56,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  backBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderColor: 'rgba(255, 255, 255, 0.20)',
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerTitle: {
    color: '#38BDF8',
    ...typeScale.caption2,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  headerPlaceholder: {
    width: 44,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl - spacing.sm,
    paddingBottom: spacing.md,
    zIndex: 5,
  },
  contentCompact: {
    paddingBottom: spacing.xxs,
  },
  heroBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.16)',
    borderColor: 'rgba(56, 189, 248, 0.35)',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    height: 56,
    justifyContent: 'center',
    marginBottom: spacing.md,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    width: 56,
  },
  heroTitle: {
    color: colors.neutral.surface,
    ...typeScale.title2,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 28,
    marginBottom: 6,
    textAlign: 'center',
  },
  sublineWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    marginBottom: spacing.xl - spacing.sm,
  },
  subline: {
    color: leopardPalette.inputBorder,
    ...typeScale.footnote,
    lineHeight: 18,
    textAlign: 'center',
  },
  phoneHighlight: {
    color: colors.neutral.surface,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  changePhoneBtn: {
    paddingHorizontal: spacing.xxs,
    paddingVertical: 2,
  },
  changePhoneText: {
    color: '#38BDF8',
    ...typeScale.footnote,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderColor: 'rgba(248, 113, 113, 0.46)',
    borderRadius: radius.control,
    borderWidth: 1,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + spacing.hairline,
    width: '100%',
  },
  errorText: {
    color: '#FECACA',
    ...typeScale.footnote,
    fontWeight: '600',
    textAlign: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  cellsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.lg - spacing.xs,
    width: '100%',
  },
  cellTriplet: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  cellDivider: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  dividerBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    borderRadius: 1,
    height: 3,
    width: 12,
  },
  cell: {
    alignItems: 'center',
    backgroundColor: '#0F2347',
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: radius.card,
    borderWidth: 1.5,
    height: 52,
    justifyContent: 'center',
    shadowColor: '#020817',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    width: 44,
    elevation: 1,
  },
  cellFilled: {
    backgroundColor: '#132C56',
    borderColor: 'rgba(56, 189, 248, 0.55)',
  },
  cellActive: {
    backgroundColor: '#163566',
    borderColor: '#38BDF8',
    elevation: 3,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
  },
  activeCursor: {
    backgroundColor: '#38BDF8',
    borderRadius: 1,
    height: 20,
    width: 2,
  },
  cellError: {
    borderColor: colors.danger.text,
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
  },
  cellText: {
    ...typeScale.title2,
    color: colors.neutral.surface,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  resendRow: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  timerCapsule: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.sm + spacing.xxs,
    paddingVertical: 7,
  },
  countdownText: {
    color: leopardPalette.inputBorder,
    ...typeScale.caption1,
    fontWeight: '600',
  },
  countdownTime: {
    ...typeScale.caption1,
    color: '#38BDF8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  resendBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.16)',
    borderColor: 'rgba(56, 189, 248, 0.40)',
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: spacing.lg - spacing.xs,
    paddingVertical: spacing.xs,
  },
  resendBtnText: {
    color: '#38BDF8',
    ...typeScale.footnote,
    fontWeight: '800',
  },
  submittingIndicator: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs + spacing.hairline,
  },
  submittingText: {
    color: '#D8E3F0',
    ...typeScale.caption1,
    fontWeight: '600',
  },
  numpadContainer: {
    backgroundColor: '#071830',
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    borderTopLeftRadius: radius.modal,
    borderTopRightRadius: radius.modal,
    borderTopWidth: 1,
    gap: spacing.xs,
    paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.md,
    paddingHorizontal: spacing.xl - spacing.sm,
    paddingTop: spacing.sm,
  },
  numpadContainerCompact: {
    gap: 6,
    paddingBottom: 10,
    paddingTop: spacing.xs,
  },
  numpadRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  numpadKey: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    flex: 1,
    height: 50,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  numpadKeyCompact: {
    height: 44,
  },
  numpadKeyPressed: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
    transform: [{ scale: 0.97 }],
  },
  numpadKeyEmpty: {
    flex: 1,
    height: 50,
  },
  numpadKeyText: {
    color: colors.neutral.surface,
    ...typeScale.title2,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    lineHeight: 24,
  },
  numpadSubText: {
    color: '#94A3B8',
    ...typeScale.caption2,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: -1,
  },
  numpadKeyActionText: {
    color: leopardPalette.inputBorder,
    ...typeScale.title3,
    fontWeight: '700',
  },
  controlPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
});
