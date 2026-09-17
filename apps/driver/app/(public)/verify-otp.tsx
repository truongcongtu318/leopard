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
  httpClient,
  iosContinuousCurve,
  leopardPalette,
  radius,
  sessionStore,
  spacing,
  toE164Vn,
  typeScale,
} from '@leopard/mobile-core';

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
            <IconChevron color="#0F172A" direction="left" size={20} />
          </Pressable>
          <Text accessibilityRole="header" style={styles.headerTitle}>
            Xác nhận mã OTP
          </Text>
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
              Mã xác thực gồm 6 chữ số đã được gửi tới số điện thoại{' '}
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

          {/* Resend / Countdown Row */}
          <View style={styles.resendRow}>
            {countdown > 0 ? (
              <View style={styles.timerGroup}>
                <IconClock color="#64748B" size="sm" />
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
              <ActivityIndicator color={leopardPalette.primary} size="small" />
              <Text style={styles.submittingText}>Đang xác thực mã OTP...</Text>
            </View>
          ) : null}
        </View>

        {/* Numeric Numpad - fixed at bottom */}
        <View style={styles.numpadContainer} testID="virtual-numpad">
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
            <View style={styles.numpadKeyEmpty} />
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
    backgroundColor: '#FFFFFF',
  },
  container: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    flex: 1,
    justifyContent: 'space-between',
    maxWidth: 440,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 56,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  controlPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  headerTitle: {
    color: '#0F172A',
    ...typeScale.headline,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  headerPlaceholder: {
    width: 40,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  contentCompact: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxs,
  },
  heroBadge: {
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    height: 56,
    justifyContent: 'center',
    marginBottom: spacing.sm,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    width: 56,
  },
  heroTitle: {
    color: '#0F172A',
    ...typeScale.title2,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 28,
    marginBottom: spacing.xxs,
    textAlign: 'center',
  },
  sublineWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xxs + spacing.hairline,
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  subline: {
    color: '#64748B',
    ...typeScale.subheadline,
    lineHeight: 20,
    textAlign: 'center',
  },
  phoneHighlight: {
    color: '#0F172A',
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  changePhoneBtn: {
    paddingHorizontal: spacing.xxs,
    paddingVertical: spacing.hairline,
  },
  changePhoneText: {
    color: leopardPalette.primary,
    ...typeScale.footnote,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: radius.card,
    ...iosContinuousCurve,
    borderWidth: 1,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + spacing.hairline,
    width: '100%',
  },
  errorText: {
    color: '#B91C1C',
    ...typeScale.footnote,
    fontWeight: '600',
    lineHeight: 18,
    textAlign: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  cellsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xs,
    width: '100%',
  },
  cellTriplet: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  cellDivider: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
  },
  dividerBar: {
    backgroundColor: '#CBD5E1',
    borderRadius: radius.pill,
    height: 2,
    width: 10,
  },
  cell: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: radius.card,
    ...iosContinuousCurve,
    borderWidth: 1.5,
    height: 54,
    justifyContent: 'center',
    position: 'relative',
    width: 46,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cellFilled: {
    backgroundColor: '#FFFFFF',
    borderColor: leopardPalette.primary,
  },
  cellActive: {
    backgroundColor: '#FFFFFF',
    borderColor: leopardPalette.primary,
    borderWidth: 2,
    shadowColor: leopardPalette.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  cellError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  activeCursor: {
    backgroundColor: leopardPalette.primary,
    borderRadius: 1,
    height: 22,
    width: 2,
  },
  cellText: {
    color: '#0F172A',
    ...typeScale.title2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  resendRow: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    marginTop: spacing.xxs,
  },
  timerGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs + spacing.hairline,
  },
  countdownText: {
    color: '#64748B',
    ...typeScale.footnote,
  },
  countdownTime: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#0F172A',
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  resendBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  resendBtnText: {
    color: leopardPalette.primary,
    ...typeScale.subheadline,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  submittingIndicator: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  submittingText: {
    color: '#64748B',
    ...typeScale.footnote,
    fontWeight: '600',
  },
  numpadContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.md,
    gap: spacing.xs,
  },
  numpadRow: {
    flexDirection: 'row',
    gap: spacing.xs + spacing.hairline,
    justifyContent: 'space-between',
  },
  numpadKey: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: radius.card,
    ...iosContinuousCurve,
    borderWidth: 1,
    flex: 1,
    height: 52,
    justifyContent: 'center',
  },
  numpadKeyCompact: {
    height: 46,
  },
  numpadKeyPressed: {
    backgroundColor: '#E2E8F0',
    transform: [{ scale: 0.97 }],
  },
  numpadKeyEmpty: {
    flex: 1,
    height: 52,
  },
  numpadKeyText: {
    color: '#0F172A',
    ...typeScale.title2,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  numpadSubText: {
    color: '#64748B',
    ...typeScale.caption2,
    letterSpacing: 1.2,
    marginTop: -2,
  },
  numpadKeyActionText: {
    color: '#0F172A',
    ...typeScale.title3,
    fontWeight: '600',
  },
});
