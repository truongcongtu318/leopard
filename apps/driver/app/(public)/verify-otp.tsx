import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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

import { IconChevron } from '@leopard/mobile-core';
import { httpClient } from '@leopard/mobile-core/src/api/http-client';
import { sessionStore } from '@leopard/mobile-core/src/auth/session-store';
import { toE164Vn } from '@leopard/mobile-core/src/auth/phone';
import { IconClock } from '@leopard/mobile-core/src/icons/svg-icons';

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
const DRIVER_ACCENT = '#F97316';
const driverHeroBg = require('../../assets/brand/driver-hero-bg.jpg');

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
      // ponytail: demo environments may not have send-otp endpoint, reset countdown anyway
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
        if (statusCode === 404 && (phone.startsWith('09000000') || phone === 'driver')) {
          res = await httpClient.post<AuthResponse>('/auth/login/demo', {
            accountId: phone === 'driver' ? 'driver' : phone,
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={[styles.heroSection, isCompactViewport && styles.heroSectionCompact]}>
          <Image
            accessibilityIgnoresInvertColors
            accessibilityLabel="Xe tải LEOPARD trên cung đường núi"
            resizeMode="cover"
            source={driverHeroBg}
            style={styles.heroImage}
          />
          <View accessible={false} aria-hidden style={styles.heroOverlay} />

          <View style={styles.header}>
            <Pressable
              accessibilityLabel="Quay lại"
              accessibilityRole="button"
              hitSlop={8}
              onPress={handleBack}
              style={({ pressed }) => [styles.backBtn, pressed && styles.controlPressed]}
              testID="btn-back"
            >
              <IconChevron color="#FFFFFF" direction="left" size={20} />
            </Pressable>
            <Text style={styles.headerTitle}>BẢO MẬT 2 LỚP</Text>
            <View style={styles.headerPlaceholder} />
          </View>

          <View style={styles.heroCopy}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>6</Text>
            </View>
            <View style={styles.heroTextBlock}>
              <Text accessibilityRole="header" style={styles.heroTitle}>
                Nhập mã xác thực
              </Text>
              <Text style={styles.subline}>
                Mã OTP đã gửi tới{' '}
                <Text style={styles.phoneHighlight}>{formattedPhone || phone}</Text>
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.content, isCompactViewport && styles.contentCompact]}>
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
            style={styles.hiddenInput}
            textContentType="oneTimeCode"
            value={otp}
          />

          {/* 6 OTP Cells */}
          <View style={styles.cellsRow} testID="otp-boxes">
            {Array.from({ length: NUM_CELLS }).map((_, index) => {
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
                  <Text style={styles.cellText}>{digit}</Text>
                </View>
              );
            })}
          </View>

          {/* Resend / Countdown */}
          <View style={styles.resendRow}>
            {countdown > 0 ? (
              <View style={styles.timerGroup}>
                <IconClock color="#9FB0C7" size="sm" />
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
                <Text style={styles.resendBtnText}>Gửi lại mã</Text>
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

        {/* Numpad */}
        <View
          style={[styles.numpadContainer, isCompactViewport && styles.numpadContainerCompact]}
          testID="virtual-numpad"
        >
          <View style={styles.numpadRow}>
            {['1', '2', '3'].map((n) => (
              <Pressable
                accessibilityLabel={`Số ${n}`}
                accessibilityRole="button"
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
              </Pressable>
            ))}
          </View>
          <View style={styles.numpadRow}>
            {['4', '5', '6'].map((n) => (
              <Pressable
                accessibilityLabel={`Số ${n}`}
                accessibilityRole="button"
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
              </Pressable>
            ))}
          </View>
          <View style={styles.numpadRow}>
            {['7', '8', '9'].map((n) => (
              <Pressable
                accessibilityLabel={`Số ${n}`}
                accessibilityRole="button"
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
              </Pressable>
            ))}
          </View>
          <View style={styles.numpadRow}>
            <View style={[styles.numpadKeyEmpty, isCompactViewport && styles.numpadKeyCompact]} />
            <Pressable
              accessibilityLabel="Số 0"
              accessibilityRole="button"
              onPress={() => handleKeyPress('0')}
              style={({ pressed }) => [
                styles.numpadKey,
                isCompactViewport && styles.numpadKeyCompact,
                pressed && styles.numpadKeyPressed,
              ]}
              testID="numpad-0"
            >
              <Text style={styles.numpadKeyText}>0</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Xóa"
              accessibilityRole="button"
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
    backgroundColor: '#0B1E42',
    flex: 1,
    justifyContent: 'space-between',
    maxWidth: 480,
    width: '100%',
  },
  heroSection: {
    height: 220,
    overflow: 'hidden',
    position: 'relative',
  },
  heroSectionCompact: {
    height: 180,
  },
  heroImage: {
    height: '100%',
    width: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(6, 22, 47, 0.52)',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 56,
    justifyContent: 'space-between',
    left: 0,
    paddingHorizontal: 16,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  backBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(11, 30, 66, 0.68)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 14,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerTitle: {
    color: '#FDBA74',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  headerPlaceholder: {
    width: 44,
  },
  heroCopy: {
    alignItems: 'center',
    bottom: 24,
    flexDirection: 'row',
    gap: 13,
    left: 22,
    position: 'absolute',
    right: 22,
  },
  stepBadge: {
    alignItems: 'center',
    backgroundColor: '#F97316',
    borderColor: 'rgba(255, 255, 255, 0.45)',
    borderRadius: 16,
    borderWidth: 1,
    height: 50,
    justifyContent: 'center',
    shadowColor: '#020817',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    width: 50,
  },
  stepBadgeText: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '900',
    lineHeight: 24,
  },
  heroTextBlock: {
    flex: 1,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 30,
  },
  content: {
    alignItems: 'center',
    backgroundColor: '#0B1E42',
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  contentCompact: {
    gap: 4,
    paddingTop: 10,
  },
  subline: {
    color: '#D8E3F0',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  phoneHighlight: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderColor: 'rgba(248, 113, 113, 0.46)',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: '100%',
  },
  errorText: {
    color: '#FECACA',
    fontSize: 13,
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
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginVertical: 8,
    width: '100%',
  },
  cell: {
    alignItems: 'center',
    backgroundColor: '#142B50',
    borderColor: '#40597B',
    borderRadius: 13,
    borderWidth: 1.5,
    flex: 1,
    height: 54,
    justifyContent: 'center',
    maxWidth: 48,
    minWidth: 0,
    shadowColor: '#020817',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 1,
  },
  cellFilled: {
    backgroundColor: '#1A365F',
    borderColor: '#8EA2BA',
  },
  cellActive: {
    backgroundColor: '#1A365F',
    borderColor: DRIVER_ACCENT,
    shadowColor: DRIVER_ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.38,
    shadowRadius: 6,
    elevation: 3,
  },
  cellError: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
  },
  cellText: {
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    fontSize: 22,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  resendRow: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countdownText: {
    color: '#9FB0C7',
    fontSize: 12,
    fontWeight: '500',
  },
  countdownTime: {
    color: '#FDBA74',
    fontVariant: ['tabular-nums'],
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  resendBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendBtnText: {
    color: '#FDBA74',
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  submittingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  submittingText: {
    color: '#D8E3F0',
    fontSize: 12,
    fontWeight: '600',
  },
  numpadContainer: {
    backgroundColor: '#071A35',
    borderTopColor: 'rgba(255, 255, 255, 0.09)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    gap: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  numpadContainerCompact: {
    gap: 6,
    paddingBottom: 10,
    paddingTop: 10,
  },
  numpadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  numpadKey: {
    alignItems: 'center',
    backgroundColor: '#142B50',
    borderColor: '#314A6B',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    height: 52,
    justifyContent: 'center',
    minHeight: 48,
  },
  numpadKeyCompact: {
    height: 46,
    minHeight: 44,
  },
  numpadKeyPressed: {
    backgroundColor: '#F97316',
    borderColor: '#FDBA74',
    transform: [{ scale: 0.97 }],
  },
  numpadKeyEmpty: {
    flex: 1,
    minHeight: 48,
    height: 52,
  },
  numpadKeyText: {
    color: '#F8FAFC',
    fontVariant: ['tabular-nums'],
    fontSize: 22,
    fontWeight: '700',
  },
  numpadKeyActionText: {
    color: '#B8C8D9',
    fontSize: 21,
    fontWeight: '700',
  },
  controlPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
});
