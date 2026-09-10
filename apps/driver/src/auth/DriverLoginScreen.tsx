import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Role } from '@leopard/shared';

import { httpClient } from '@leopard/mobile-core/src/api/http-client';
import { sessionStore } from '@leopard/mobile-core';
import { isFirebaseConfigured } from '@leopard/mobile-core/src/auth/firebase';
import {
  resetRecaptcha,
  sendPhoneOtp,
  signInWithGoogle,
  type OtpChallenge,
} from '@leopard/mobile-core/src/auth/firebase-auth';
import { isLikelyVnPhone, toE164Vn } from '@leopard/mobile-core';
import { OtpSixCellInput } from '@leopard/mobile-core';
import { TruckLoader } from '@leopard/mobile-core';

const driverHeroBg = require('../../assets/brand/driver-hero-bg.jpg');
const leopardEmblem = require('../../assets/brand/leopard-emblem.png');

const RECAPTCHA_CONTAINER_ID = 'leopard-driver-recaptcha-container';

export interface DriverLoginScreenProps {
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

export function DriverLoginScreen({
  allowDemo = process.env.EXPO_PUBLIC_ALLOW_DEMO_AUTH === 'true',
  onLoginSuccess,
  onNavigateRegister,
  sessionExpired = false,
}: DriverLoginScreenProps) {
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [authPhase, setAuthPhase] = useState<'phone' | 'otp'>('phone');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(60);
  const [isVerified, setIsVerified] = useState(false);
  const [resendSuccessMsg, setResendSuccessMsg] = useState<string | null>(null);
  const otpChallengeRef = useRef<OtpChallenge | null>(null);
  const firebaseReady = isFirebaseConfigured();

  useEffect(() => {
    if (authPhase !== 'otp' || resendSeconds <= 0) return;
    const timer = setInterval(() => {
      setResendSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [authPhase, resendSeconds]);

  const exchangeIdToken = async (idToken: string) => {
    const res = await httpClient.post<AuthResponse>('/auth/firebase', { idToken });
    const accessToken = res.session?.accessToken ?? '';
    const refreshToken = res.session?.refreshToken ?? '';
    await sessionStore.setSession(accessToken, refreshToken, res.user.role);
    if (res.user?.profileComplete !== undefined) {
      onLoginSuccess?.(res.user?.role ?? 'DRIVER', res.user.profileComplete);
    } else {
      (onLoginSuccess as any)?.(res.user?.role ?? 'DRIVER');
    }
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
      return 'Chưa cấu hình số test (+84900000001) trên Firebase Console';
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
    setResendSuccessMsg(null);
    try {
      otpChallengeRef.current = await sendPhoneOtp(phone, RECAPTCHA_CONTAINER_ID);
      setOtpCode('');
      setResendSeconds(60);
      setIsVerified(false);
      setAuthPhase('otp');
    } catch (err) {
      resetRecaptcha();
      setErrorMsg(describeAuthError(err) || 'Không gửi được mã OTP, vui lòng thử lại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (isSubmitting || resendSeconds > 0) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    setResendSuccessMsg(null);
    try {
      otpChallengeRef.current = await sendPhoneOtp(phone, RECAPTCHA_CONTAINER_ID);
      setResendSeconds(60);
      setOtpCode('');
      setResendSuccessMsg('Đã gửi lại mã OTP mới');
    } catch (err) {
      resetRecaptcha();
      setErrorMsg(describeAuthError(err) || 'Không gửi lại được mã OTP, vui lòng thử lại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (explicitCode?: string) => {
    const codeToVerify = (typeof explicitCode === 'string' ? explicitCode : otpCode).trim();
    const challenge = otpChallengeRef.current;
    if (isSubmitting || !challenge) return;
    if (codeToVerify.length < 6) {
      setErrorMsg('Vui lòng nhập đủ 6 số mã OTP');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setResendSuccessMsg(null);
    try {
      const idToken = await challenge.confirm(codeToVerify);
      setIsVerified(true);
      await exchangeIdToken(idToken);
    } catch (err) {
      setIsVerified(false);
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
    setResendSuccessMsg(null);
    setIsVerified(false);
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
      if (res.user?.profileComplete !== undefined) {
        onLoginSuccess?.(role, res.user.profileComplete);
      } else {
        (onLoginSuccess as any)?.(role);
      }
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
    <View style={styles.rootContainer} testID="driver-login-screen">
      <ImageBackground
        resizeMode="cover"
        source={driverHeroBg}
        style={StyleSheet.absoluteFill}
      >
        <View style={styles.darkBackdrop} />
        <View style={styles.topVignette} />
      </ImageBackground>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardWrap}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          style={styles.scrollView}
        >
          {/* Top Brand Block */}
          <View style={styles.headerBlock}>
            <View style={styles.emblemBadge}>
              <Image
                accessibilityLabel="LEOPARD Emblem"
                resizeMode="contain"
                source={leopardEmblem}
                style={styles.emblemImage}
              />
            </View>
            <View style={styles.headerTitles}>
              <View style={styles.tagWrap}>
                <Text style={styles.driverTagText}>CỔNG TÀI XẾ</Text>
              </View>
              <Text accessibilityRole="header" style={styles.mainTitle}>
                Đăng Nhập Tài Xế
              </Text>
              <Text style={styles.subTitle}>
                Kết nối vận tải tải trọng lớn • Quản lý đơn hàng & lộ trình
              </Text>
            </View>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            {sessionExpired ? (
              <View style={styles.alertBox} testID="session-expired-banner">
                <Text accessibilityRole="alert" style={styles.alertText}>
                  Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.
                </Text>
              </View>
            ) : null}

            {errorMsg && authPhase === 'phone' ? (
              <View style={styles.errorBox} testID="login-error-banner">
                <Text accessibilityRole="alert" style={styles.errorText}>
                  {errorMsg}
                </Text>
              </View>
            ) : null}

            <View style={styles.fieldSection}>
              <Text style={styles.fieldLabel}>Số điện thoại tài xế</Text>
              <View
                style={[
                  styles.inputRow,
                  isInputFocused && styles.inputRowFocused,
                  !isInputFocused && isLikelyVnPhone(phone) && styles.inputRowValid,
                ]}
              >
                <View style={styles.countryPill}>
                  <Text style={styles.flagIcon}>🇻🇳</Text>
                  <Text style={styles.countryCodeText}>+84</Text>
                </View>
                <View style={styles.inputDivider} />
                <TextInput
                  accessibilityLabel="Số điện thoại"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isSubmitting}
                  keyboardType="phone-pad"
                  onBlur={() => setIsInputFocused(false)}
                  onChangeText={setPhone}
                  onFocus={() => setIsInputFocused(true)}
                  placeholder="09xx xxx xxx"
                  placeholderTextColor="#64748B"
                  style={styles.textInput}
                  value={phone}
                />
                {phone.length > 0 && !isSubmitting ? (
                  <Pressable
                    accessibilityLabel="Xóa số điện thoại"
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => setPhone('')}
                    style={styles.clearBtn}
                  >
                    <Text style={styles.clearBtnText}>✕</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            {/* Primary Action Button */}
            <Pressable
              accessibilityLabel="Gửi mã OTP"
              accessibilityRole="button"
              accessibilityState={{
                busy: isSubmitting,
                disabled: isSubmitting || !isLikelyVnPhone(phone) || !firebaseReady,
              }}
              disabled={isSubmitting || !isLikelyVnPhone(phone) || !firebaseReady}
              onPress={handleSendOtp}
              style={({ pressed }) => [
                styles.primaryBtn,
                (!isLikelyVnPhone(phone) || isSubmitting || !firebaseReady) &&
                  styles.primaryBtnDisabled,
                pressed && styles.pressed,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#0B1929" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Gửi mã OTP qua SMS</Text>
              )}
            </Pressable>

            {/* Divider */}
            <View style={styles.orSection}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>HOẶC TIẾP TỤC VỚI</Text>
              <View style={styles.orLine} />
            </View>

            {/* Google Sign-in */}
            <Pressable
              accessibilityLabel="Đăng nhập với Google"
              accessibilityRole="button"
              disabled={isSubmitting || !firebaseReady}
              onPress={handleGoogleLogin}
              style={({ pressed }) => [
                styles.googleBtn,
                (isSubmitting || !firebaseReady) && styles.btnDisabled,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.googleIconWrap}>
                <Text style={styles.googleG}>G</Text>
              </View>
              <Text style={styles.googleBtnText}>Đăng nhập với Google</Text>
            </Pressable>

            {!firebaseReady ? (
              <Text style={styles.firebaseNote}>
                Chế độ giả lập (Demo mode khả dụng bên dưới)
              </Text>
            ) : null}

            <View nativeID={RECAPTCHA_CONTAINER_ID} style={styles.recaptcha} />

            {/* Demo Quick Logins */}
            {allowDemo ? (
              <View style={styles.demoArea}>
                <View style={styles.orSection}>
                  <View style={styles.orLine} />
                  <Text style={styles.orText}>TÀI KHOẢN THỬ NGHIỆM</Text>
                  <View style={styles.orLine} />
                </View>

                <View style={styles.demoRow}>
                  <Pressable
                    disabled={isSubmitting}
                    onPress={() => handleDemoLogin('driver', 'DRIVER')}
                    style={({ pressed }) => [styles.demoBtnPrimary, pressed && styles.pressed]}
                  >
                    <Text style={styles.demoBtnPrimaryIcon}>🚚</Text>
                    <View>
                      <Text style={styles.demoBtnPrimaryTitle}>Tài xế (Driver)</Text>
                      <Text style={styles.demoBtnPrimarySubtitle}>Nhận chuyến & định vị</Text>
                    </View>
                  </Pressable>

                  <Pressable
                    disabled={isSubmitting}
                    onPress={() => handleDemoLogin('customer', 'CUSTOMER')}
                    style={({ pressed }) => [styles.demoBtnSecondary, pressed && styles.pressed]}
                  >
                    <Text style={styles.demoBtnSecIcon}>👤</Text>
                    <View>
                      <Text style={styles.demoBtnSecTitle}>Khách hàng</Text>
                      <Text style={styles.demoBtnSecSubtitle}>Test cảnh báo vai trò</Text>
                    </View>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {/* Registration link */}
            {onNavigateRegister ? (
              <View style={styles.footerLinkRow}>
                <Text style={styles.footerPrompt}>Bạn là tài xế mới?</Text>
                <Pressable hitSlop={8} onPress={onNavigateRegister}>
                  <Text style={styles.footerLinkAction}>Đăng ký ngay</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* OTP Modal Overlay */}
      {authPhase === 'otp' && (
        <View style={styles.otpModalOverlay}>
          <Pressable
            accessibilityLabel="Đóng modal xác thực"
            onPress={handleChangePhone}
            style={styles.otpBackdrop}
          />

          <View style={styles.otpModalCard}>
            <View style={styles.otpHeaderNav}>
              <Pressable
                accessibilityLabel="Đổi số điện thoại"
                accessibilityRole="button"
                disabled={isSubmitting}
                hitSlop={8}
                onPress={handleChangePhone}
                style={styles.otpNavBack}
              >
                <Text style={styles.otpNavBackText}>← Quay lại</Text>
              </Pressable>
              <Text style={styles.otpNavStatus}>Bảo mật 2 lớp</Text>
            </View>

            <View style={styles.otpCenterHero}>
              <View style={[styles.otpBadge, isVerified && styles.otpBadgeSuccess]}>
                <Text style={styles.otpBadgeIcon}>{isVerified ? '✓' : '📲'}</Text>
              </View>
              <Text style={styles.otpModalTitle}>
                {isVerified ? 'Xác thực thành công!' : 'Nhập mã xác nhận OTP'}
              </Text>
              <Text style={styles.otpModalDesc}>
                {isVerified
                  ? `Số điện thoại ${toE164Vn(phone)} đã được xác minh.`
                  : 'Nhập mã 6 chữ số đã gửi tới số điện thoại '}
                {!isVerified ? (
                  <Text style={styles.phoneHighlight}>{toE164Vn(phone)}</Text>
                ) : null}
              </Text>
            </View>

            <OtpSixCellInput
              autoFocus
              editable={!isSubmitting && !isVerified}
              hasError={Boolean(errorMsg)}
              isSubmitting={isSubmitting}
              onChangeText={(text) => {
                setOtpCode(text);
                if (errorMsg) setErrorMsg(null);
                if (resendSuccessMsg) setResendSuccessMsg(null);
              }}
              onComplete={(code) => {
                void handleVerifyOtp(code);
              }}
              value={otpCode}
            />

            {isSubmitting ? (
              <View style={styles.verifyingWrap}>
                <TruckLoader showRoad={true} showText={false} size="sm" />
                <Text style={styles.verifyingText}>Đang xác nhận mã OTP...</Text>
              </View>
            ) : null}

            {errorMsg ? (
              <View style={styles.otpErrorBox} testID="otp-error-banner">
                <Text accessibilityRole="alert" style={styles.otpErrorText}>
                  {errorMsg}
                </Text>
              </View>
            ) : null}

            {resendSuccessMsg ? (
              <View style={styles.otpSuccessBox}>
                <Text style={styles.otpSuccessText}>✓ {resendSuccessMsg}</Text>
              </View>
            ) : null}

            {!isVerified ? (
              <View style={styles.otpFooter}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting || resendSeconds > 0}
                  onPress={handleResendOtp}
                  style={styles.resendBtn}
                >
                  <Text
                    style={[
                      styles.resendBtnText,
                      resendSeconds > 0 && styles.resendBtnDisabledText,
                    ]}
                  >
                    {resendSeconds > 0 ? `Gửi lại mã sau (${resendSeconds}s)` : 'Gửi lại mã OTP'}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#070D17',
  },
  darkBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(7, 13, 23, 0.85)',
  },
  topVignette: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(11, 25, 41, 0.40)',
  },
  keyboardWrap: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 44 : 32,
    paddingBottom: 40,
    justifyContent: 'center',
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  headerBlock: {
    alignItems: 'center',
    marginBottom: 28,
  },
  emblemBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(15, 23, 42, 0.90)',
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 16,
  },
  emblemImage: {
    width: 48,
    height: 48,
  },
  headerTitles: {
    alignItems: 'center',
  },
  tagWrap: {
    backgroundColor: 'rgba(56, 189, 248, 0.14)',
    borderColor: '#38BDF8',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 3,
    marginBottom: 8,
  },
  driverTagText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  subTitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderColor: 'rgba(51, 65, 85, 0.8)',
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  alertBox: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    borderColor: 'rgba(234, 179, 8, 0.4)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  alertText: {
    color: '#FACC15',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#F87171',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  fieldSection: {
    marginBottom: 20,
  },
  fieldLabel: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.75)',
    borderColor: 'rgba(71, 85, 105, 0.6)',
    borderWidth: 1.5,
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 12,
  },
  inputRowFocused: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
  },
  inputRowValid: {
    borderColor: 'rgba(56, 189, 248, 0.6)',
  },
  countryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 6,
  },
  flagIcon: {
    fontSize: 16,
  },
  countryCodeText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '700',
  },
  inputDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(71, 85, 105, 0.6)',
    marginHorizontal: 8,
  },
  textInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 6,
  },
  clearBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryBtn: {
    backgroundColor: '#38BDF8',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryBtnDisabled: {
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryBtnText: {
    color: '#070D17',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  orSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 12,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(71, 85, 105, 0.4)',
  },
  orText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.75)',
    borderColor: 'rgba(71, 85, 105, 0.8)',
    borderWidth: 1.5,
    borderRadius: 14,
    height: 48,
    gap: 10,
  },
  googleIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: {
    color: '#EA4335',
    fontWeight: '900',
    fontSize: 13,
  },
  googleBtnText: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  firebaseNote: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  recaptcha: {
    width: 0,
    height: 0,
  },
  demoArea: {
    marginTop: 4,
  },
  demoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  demoBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.35)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  demoBtnPrimaryIcon: {
    fontSize: 20,
  },
  demoBtnPrimaryTitle: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  demoBtnPrimarySubtitle: {
    color: '#94A3B8',
    fontSize: 10,
  },
  demoBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(51, 65, 85, 0.25)',
    borderColor: 'rgba(71, 85, 105, 0.35)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  demoBtnSecIcon: {
    fontSize: 20,
  },
  demoBtnSecTitle: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '700',
  },
  demoBtnSecSubtitle: {
    color: '#64748B',
    fontSize: 10,
  },
  footerLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(51, 65, 85, 0.4)',
  },
  footerPrompt: {
    color: '#94A3B8',
    fontSize: 13,
  },
  footerLinkAction: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  otpModalOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  otpBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(7, 13, 23, 0.88)',
  },
  otpModalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#0F172A',
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  otpHeaderNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  otpNavBack: {
    paddingVertical: 4,
  },
  otpNavBackText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  otpNavStatus: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  otpCenterHero: {
    alignItems: 'center',
    marginBottom: 20,
  },
  otpBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  otpBadgeSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: '#22C55E',
  },
  otpBadgeIcon: {
    fontSize: 26,
  },
  otpModalTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  otpModalDesc: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  phoneHighlight: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  verifyingWrap: {
    alignItems: 'center',
    marginVertical: 12,
    gap: 8,
  },
  verifyingText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  otpErrorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
  },
  otpErrorText: {
    color: '#F87171',
    fontSize: 13,
    textAlign: 'center',
  },
  otpSuccessBox: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.4)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
  },
  otpSuccessText: {
    color: '#4ADE80',
    fontSize: 13,
    textAlign: 'center',
  },
  otpFooter: {
    marginTop: 18,
    alignItems: 'center',
  },
  resendBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  resendBtnText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  resendBtnDisabledText: {
    color: '#64748B',
  },
});

