import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Role } from '@leopard/shared';

import { httpClient } from '@leopard/mobile-core/src/api/http-client';
import { sessionStore } from '@leopard/mobile-core/src/auth/session-store';
import { toE164Vn } from '@leopard/mobile-core/src/auth/phone';
import { leopardPalette } from '@leopard/mobile-core/src/theme/tokens';
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

export default function VerifyOtpRoute() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ phone?: string }>();
  const phone = searchParams.phone || '';

  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(COUNTDOWN_INITIAL);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 60s countdown timer
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
        // Fallback for demo phone only when endpoint does not exist (404)
        if (statusCode === 404 && (phone.startsWith('09000000') || phone === 'customer')) {
          res = await httpClient.post<AuthResponse>('/auth/login/demo', {
            accountId: phone === 'customer' ? 'customer' : phone,
          });
        } else {
          throw err;
        }
      }

      const accessToken = res.session?.accessToken ?? '';
      const refreshToken = res.session?.refreshToken ?? '';
      await sessionStore.setSession(accessToken, refreshToken, res.user.role);

      if (res.user.role === 'CUSTOMER') {
        if (res.user.profileComplete) {
          router.replace('/customer/home');
        } else {
          router.replace('/(public)/customer-register');
        }
      } else {
        router.replace('/(public)/customer-register');
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
        {/* Header with Back Button */}
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Quay lại"
            accessibilityRole="button"
            hitSlop={8}
            onPress={handleBack}
            style={styles.backBtn}
            testID="btn-back"
          >
            <Text style={styles.backBtnText}>←</Text>
          </Pressable>
          <Text accessibilityRole="header" style={styles.headerTitle}>
            Xác nhận mã OTP
          </Text>
          <View style={styles.headerPlaceholder} />
        </View>

        {/* Content Section */}
        <View style={styles.content}>
          <Text style={styles.subline}>
            Mã xác thực gồm 6 chữ số đã được gửi tới số điện thoại{' '}
            <Text style={styles.phoneHighlight}>{formattedPhone || phone}</Text>
          </Text>

          {/* Error Banner */}
          {errorMsg ? (
            <View style={styles.errorBox} testID="otp-error-banner">
              <Text accessibilityRole="alert" style={styles.errorText}>
                {errorMsg}
              </Text>
            </View>
          ) : null}

          {/* Hidden text input for screen readers or software keyboard paste */}
          <TextInput
            accessibilityLabel="Mã OTP"
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
                  key={`cell-${index}`}
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

          {/* Resend / Countdown row */}
          <View style={styles.resendRow}>
            {countdown > 0 ? (
              <View style={styles.timerGroup}>
                <IconClock color={leopardPalette.textMutedSlate} size="sm" />
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
              <ActivityIndicator color="#F59E0B" size="small" />
              <Text style={styles.submittingText}>Đang xác thực mã OTP...</Text>
            </View>
          ) : null}
        </View>

        {/* Numeric Numpad - fixed at bottom */}
        <View style={styles.numpadContainer} testID="virtual-numpad">
          <View style={styles.numpadRow}>
            {['1', '2', '3'].map((n) => (
              <Pressable
                accessibilityLabel={`Số ${n}`}
                accessibilityRole="button"
                key={n}
                onPress={() => handleKeyPress(n)}
                style={({ pressed }) => [styles.numpadKey, pressed && styles.numpadKeyPressed]}
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
                style={({ pressed }) => [styles.numpadKey, pressed && styles.numpadKeyPressed]}
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
                style={({ pressed }) => [styles.numpadKey, pressed && styles.numpadKeyPressed]}
                testID={`numpad-${n}`}
              >
                <Text style={styles.numpadKeyText}>{n}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.numpadRow}>
            <View style={styles.numpadKeyEmpty} />
            <Pressable
              accessibilityLabel="Số 0"
              accessibilityRole="button"
              onPress={() => handleKeyPress('0')}
              style={({ pressed }) => [styles.numpadKey, pressed && styles.numpadKeyPressed]}
              testID="numpad-0"
            >
              <Text style={styles.numpadKeyText}>0</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Xóa"
              accessibilityRole="button"
              onPress={() => handleKeyPress('backspace')}
              style={({ pressed }) => [styles.numpadKey, pressed && styles.numpadKeyPressed]}
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
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0B1E42',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0B1E42',
  },
  headerPlaceholder: {
    width: 44,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
    alignItems: 'center',
    gap: 16,
  },
  subline: {
    fontSize: 14,
    lineHeight: 20,
    color: leopardPalette.textMutedSlate,
    textAlign: 'center',
  },
  phoneHighlight: {
    color: '#0B1E42',
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: '100%',
  },
  errorText: {
    color: '#B91C1C',
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
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    marginVertical: 12,
  },
  cell: {
    width: 48,
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cellFilled: {
    borderColor: '#0B1E42',
    backgroundColor: '#FFFFFF',
  },
  cellActive: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  cellError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  cellText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0B1E42',
    fontVariant: ['tabular-nums'],
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
    fontSize: 13,
    color: leopardPalette.textMutedSlate,
    fontWeight: '500',
  },
  countdownTime: {
    fontWeight: '700',
    color: '#0B1E42',
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
    fontSize: 14,
    fontWeight: '700',
    color: '#B45309',
    textDecorationLine: 'underline',
  },
  submittingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  submittingText: {
    fontSize: 13,
    color: leopardPalette.textMutedSlate,
    fontWeight: '600',
  },
  numpadContainer: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    gap: 8,
  },
  numpadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  numpadKey: {
    flex: 1,
    minHeight: 48,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numpadKeyPressed: {
    backgroundColor: '#E2E8F0',
  },
  numpadKeyEmpty: {
    flex: 1,
    minHeight: 48,
    height: 52,
  },
  numpadKeyText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0B1E42',
    fontVariant: ['tabular-nums'],
  },
  numpadKeyActionText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#64748B',
  },
});
