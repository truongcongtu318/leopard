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
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
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
import { isLikelyVnPhone, toE164Vn } from '@leopard/mobile-core';
import { OtpSixCellInput } from '@leopard/mobile-core';
import { TruckLoader } from '@leopard/mobile-core';
import { VietnamFlagIcon, IconRoleDriver, OtpPhoneHeroIcon } from '@leopard/mobile-core';
import { IconTruck } from '@leopard/mobile-core/src/icons/svg-icons';

const leopardEmblem = require('../../assets/brand/leopard-emblem.png');
const brandLogin = require('../../assets/brand/brand_login.png');
const driverHeroBg = require('../../../mobile/assets/brand/driver-hero-bg.jpg');

const RECAPTCHA_CONTAINER_ID = 'leopard-driver-recaptcha-container';

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
    if (!isLikelyVnPhone(phone)) {
      setErrorMsg('Số điện thoại không hợp lệ');
      return;
    }

    if (onNavigateOtp) {
      onNavigateOtp(phone);
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardWrap}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(insets?.bottom ?? 0, 12),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          style={styles.scrollView}
        >
          <View style={styles.heroSection}>
            <Image
              accessibilityIgnoresInvertColors
              accessibilityLabel="Xe tải LEOPARD trên cung đường núi"
              resizeMode="cover"
              source={driverHeroBg}
              style={styles.heroImage}
              testID="driver-login-hero-image"
            />
            <View
              accessible={false}
              aria-hidden
              style={styles.heroGradient}
            >
              <Svg height="100%" pointerEvents="none" preserveAspectRatio="none" width="100%">
                <Defs>
                  <LinearGradient id="driverLoginGradient" x1="0" x2="0" y1="0" y2="1">
                    <Stop offset="0%" stopColor="#06162F" stopOpacity="0.38" />
                    <Stop offset="48%" stopColor="#0B1E42" stopOpacity="0.16" />
                    <Stop offset="76%" stopColor="#0B1E42" stopOpacity="0.5" />
                    <Stop offset="100%" stopColor="#0B1E42" stopOpacity="0.92" />
                  </LinearGradient>
                </Defs>
                <Rect fill="url(#driverLoginGradient)" height="100%" width="100%" />
              </Svg>
            </View>

            <View style={[styles.brandHeader, { top: Math.max(insets?.top ?? 0, 14) }]}>
              <View style={styles.cardBrandRow}>
                <Image
                  accessibilityLabel="LEOPARD Emblem"
                  resizeMode="contain"
                  source={leopardEmblem}
                  style={styles.cardEmblemImage}
                />
                <Image
                  accessibilityLabel="LEOPARD"
                  resizeMode="contain"
                  source={brandLogin}
                  style={styles.cardBrandNameImage}
                />
              </View>
              <View style={styles.driverLabel}>
                <Text style={styles.driverLabelText}>DRIVER</Text>
              </View>
            </View>

            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>ĐỒNG HÀNH TRÊN MỌI HÀNH TRÌNH</Text>
              <Text accessibilityRole="header" style={styles.mainTitle}>
                Chào mừng bác tài
              </Text>
              <Text style={styles.subTitle}>Đăng nhập để nhận đơn và theo dõi chuyến đi.</Text>
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
              <Text style={styles.fieldLabel}>Số điện thoại tài xế</Text>
              <View
                style={[
                  styles.inputRow,
                  isInputFocused && styles.inputRowFocused,
                  !isInputFocused && isLikelyVnPhone(phone) && styles.inputRowValid,
                ]}
              >
                <View style={styles.countryPill}>
                  <VietnamFlagIcon height={15} width={22} />
                  <Text style={styles.countryCodeText}>+84</Text>
                </View>
                <View style={styles.inputDivider} />
                <TextInput
                  accessibilityLabel="Số điện thoại"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  editable={!isSubmitting}
                  keyboardType="phone-pad"
                  onBlur={() => setIsInputFocused(false)}
                  onChangeText={setPhone}
                  onFocus={() => setIsInputFocused(true)}
                  placeholder="Nhập số điện thoại"
                  placeholderTextColor="#91A3BB"
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
              <Text style={styles.fieldHint}>Mã xác thực được gửi qua SMS.</Text>
            </View>

            {/* Primary Action Button */}
            <Pressable
              accessibilityLabel="Gửi mã OTP"
              accessibilityRole="button"
              accessibilityState={{
                busy: isSubmitting,
                disabled:
                  isSubmitting ||
                  !isLikelyVnPhone(phone) ||
                  (!firebaseReady && !allowDemo && !onNavigateOtp),
              }}
              disabled={
                isSubmitting ||
                !isLikelyVnPhone(phone) ||
                (!firebaseReady && !allowDemo && !onNavigateOtp)
              }
              onPress={handleSendOtp}
              style={({ pressed }) => [
                styles.primaryBtn,
                (isSubmitting ||
                  !isLikelyVnPhone(phone) ||
                  (!firebaseReady && !allowDemo && !onNavigateOtp)) &&
                  styles.primaryBtnDisabled,
                pressed && styles.pressed,
              ]}
            >
              {isSubmitting ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.primaryBtnText}>Đang xử lý…</Text>
                </View>
              ) : (
                <Text style={styles.primaryBtnText}>Nhận mã OTP</Text>
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
                {allowDemo
                  ? 'Dữ liệu mô phỏng · Chọn tài khoản thử nghiệm bên dưới.'
                  : 'Đăng nhập Google hiện chưa khả dụng.'}
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
                    <IconTruck color="#102A43" size="sm" />
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
                    <IconRoleDriver color="#2E6FD6" secondaryColor="#EFF6FF" size={20} />
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
