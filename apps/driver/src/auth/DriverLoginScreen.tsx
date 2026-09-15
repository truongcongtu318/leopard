import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { styles } from './DriverLoginScreen.styles';
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
import { isLikelyVnPhone, toE164Vn, VietnamFlagIcon } from '@leopard/mobile-core';
import { hitSlop, IconCheck, IconClose, iconSize } from '@leopard/mobile-core';
import { OtpSixCellInput } from '@leopard/mobile-core';
import { TruckLoader } from '@leopard/mobile-core';
import { OtpPhoneHeroIcon } from '@leopard/mobile-core';

const leopardEmblem = require('../../assets/brand/leopard-emblem.png');
const brandLogin = require('../../assets/brand/brand_login.png');

const RECAPTCHA_CONTAINER_ID = 'leopard-driver-recaptcha-container';

export function formatVietnamPhone(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`;
}

export interface DriverLoginScreenProps {
  onLoginSuccess?: (role: Role, profileComplete: boolean) => void;
  onNavigateRegister?: () => void;
  onNavigateOtp?: (phone: string) => void;
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
  onNavigateOtp,
  sessionExpired = false,
}: DriverLoginScreenProps) {
  const insets = useContext(SafeAreaInsetsContext);
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
    const cleanPhone = phone.replace(/\D/g, '');
    if (!isLikelyVnPhone(cleanPhone)) {
      setErrorMsg('Số điện thoại không hợp lệ');
      return;
    }

    if (onNavigateOtp) {
      onNavigateOtp(cleanPhone);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setResendSuccessMsg(null);
    try {
      otpChallengeRef.current = await sendPhoneOtp(cleanPhone, RECAPTCHA_CONTAINER_ID);
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
      const cleanPhone = phone.replace(/\D/g, '');
      otpChallengeRef.current = await sendPhoneOtp(cleanPhone, RECAPTCHA_CONTAINER_ID);
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

  const cleanPhone = phone.replace(/\D/g, '');
  const isPhoneValid = isLikelyVnPhone(cleanPhone);
  const isBtnDisabled =
    isSubmitting ||
    !isPhoneValid ||
    (!firebaseReady && !allowDemo && !onNavigateOtp);

  return (
    <View style={styles.rootContainer} testID="driver-login-screen">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardWrap}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(insets?.bottom ?? 0, 24) + 12,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          style={styles.scrollView}
        >
          <View style={styles.heroSection} testID="driver-login-hero-image">
            <Svg height="100%" pointerEvents="none" preserveAspectRatio="none" style={styles.heroAuraSvg} width="100%">
              <Defs>
                <LinearGradient id="driverLoginGradient" x1="0" x2="0" y1="0" y2="1">
                  <Stop offset="0%" stopColor="#0F2754" stopOpacity="1" />
                  <Stop offset="65%" stopColor="#0B1E42" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#0B1E42" stopOpacity="1" />
                </LinearGradient>
                <RadialGradient id="loginAuraGlow" cx="50%" cy="32%" r="48%">
                  <Stop offset="0%" stopColor="#0284C7" stopOpacity="0.28" />
                  <Stop offset="70%" stopColor="#0284C7" stopOpacity="0.06" />
                  <Stop offset="100%" stopColor="#0284C7" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Rect fill="url(#driverLoginGradient)" height="100%" width="100%" />
              <Rect fill="url(#loginAuraGlow)" height="100%" width="100%" />
            </Svg>

            <View style={[styles.brandHeader, { paddingTop: Math.max(insets?.top ?? 0, 18) }]}>
              <View style={styles.brandRow}>
                <Image
                  accessibilityLabel="LEOPARD Logo"
                  resizeMode="contain"
                  source={leopardEmblem}
                  style={styles.brandEmblem}
                />
                <Image
                  accessibilityLabel="LEOPARD"
                  resizeMode="contain"
                  source={brandLogin}
                  style={styles.brandWordmark}
                />
              </View>
              <View style={styles.driverBadge}>
                <View style={styles.driverBadgeDot} />
                <Text style={styles.driverBadgeText}>DRIVER PILOT</Text>
              </View>
            </View>

            <View style={styles.heroCopy}>
              <Text accessibilityRole="header" style={styles.mainTitle}>
                Chào mừng bác tài
              </Text>
              <Text style={styles.subTitle}>Đăng nhập để nhận đơn và điều hướng chuyến đi.</Text>
            </View>
          </View>

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
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>Số điện thoại tài xế</Text>
                {isPhoneValid ? (
                  <View style={styles.validBadge}>
                    <IconCheck color="#15803D" size={iconSize.xs} />
                    <Text style={styles.validText}>Hợp lệ</Text>
                  </View>
                ) : null}
              </View>

              <View
                style={[
                  styles.inputRow,
                  isInputFocused && styles.inputRowFocused,
                  !isInputFocused && isPhoneValid && styles.inputRowValid,
                ]}
              >
                <View style={styles.countryBadge}>
                  <VietnamFlagIcon height={15} width={22} />
                  <Text style={styles.countryCode}>+84</Text>
                  <Text style={styles.countryChevron}>▾</Text>
                </View>
                <View style={styles.badgeDivider} />
                <TextInput
                  accessibilityLabel="Số điện thoại"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  editable={!isSubmitting}
                  keyboardType="phone-pad"
                  onBlur={() => setIsInputFocused(false)}
                  onChangeText={(text) => {
                    const formatted = formatVietnamPhone(text);
                    setPhone(formatted);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  onFocus={() => setIsInputFocused(true)}
                  placeholder="0912 345 678"
                  placeholderTextColor="#94A3B8"
                  style={styles.textInput}
                  value={phone}
                />
                {phone.length > 0 && !isSubmitting ? (
                  <Pressable
                    accessibilityLabel="Xóa số điện thoại"
                    accessibilityRole="button"
                    hitSlop={hitSlop(iconSize.sm)}
                    onPress={() => setPhone('')}
                    style={styles.clearBtn}
                  >
                    <IconClose color="#94A3B8" size={iconSize.sm} />
                  </Pressable>
                ) : null}
              </View>
              <Text style={styles.fieldHint}>Mã xác thực được gửi qua SMS.</Text>
            </View>

            {/* Primary Action Button */}
            <Pressable
              accessibilityLabel="Gửi mã OTP"
              accessibilityRole="button"
              accessibilityState={{
                busy: isSubmitting,
                disabled: isBtnDisabled,
              }}
              disabled={isBtnDisabled}
              onPress={handleSendOtp}
              style={({ pressed }) => [
                styles.primaryBtn,
                isBtnDisabled && styles.primaryBtnDisabled,
                pressed && !isBtnDisabled && styles.pressed,
              ]}
            >
              {isSubmitting ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.primaryBtnText}>Đang xử lý…</Text>
                </View>
              ) : (
                <Text
                  style={[
                    styles.primaryBtnText,
                    isBtnDisabled && styles.primaryBtnDisabledText,
                  ]}
                >
                  Nhận mã OTP
                </Text>
              )}
            </Pressable>

            {/* Divider */}
            <View style={styles.orSection}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>hoặc</Text>
              <View style={styles.orLine} />
            </View>

            {/* Google Sign-in */}
            <Pressable
              accessibilityLabel="Đăng nhập với Google"
              accessibilityRole="button"
              accessibilityState={{ disabled: isSubmitting || !firebaseReady }}
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
                Đăng nhập Google hiện chưa khả dụng trên thiết bị này.
              </Text>
            ) : null}

            <View nativeID={RECAPTCHA_CONTAINER_ID} style={styles.recaptcha} />

            {/* Registration link */}
            {onNavigateRegister ? (
              <View style={styles.footerLinkRow}>
                <Text style={styles.footerPrompt}>Bạn là tài xế mới?</Text>
                <Pressable
                  accessibilityRole="button"
                  style={styles.registerAction}
                  onPress={onNavigateRegister}
                >
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
                <OtpPhoneHeroIcon isVerified={isVerified} size={36} />
              </View>
              <Text style={styles.otpModalTitle}>
                {isVerified ? 'Xác thực thành công' : 'Nhập mã xác nhận OTP'}
              </Text>
              <Text style={styles.otpModalDesc}>
                {isVerified
                  ? `Số điện thoại ${toE164Vn(phone)} đã được xác minh.`
                  : 'Nhập mã 6 chữ số đã gửi tới số điện thoại '}
                {!isVerified ? <Text style={styles.phoneHighlight}>{toE164Vn(phone)}</Text> : null}
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
              <View
                accessibilityLiveRegion="polite"
                accessibilityRole="alert"
                style={styles.otpSuccessBox}
              >
                <IconCheck color="#167A3A" size={iconSize.sm} />
                <Text style={styles.otpSuccessText}>{resendSuccessMsg}</Text>
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
