import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { styles } from './DriverLoginScreen.styles';
import type { Role } from '@leopard/shared';

import { httpClient } from '@leopard/mobile-core/src/api/http-client';
import {
  colors,
  leopardPalette,
  sessionStore,
  typeScale,
  BrandLoginLogo,
  Button,
  IconCheck,
  IconClose,
  IconRoleAdmin,
  IconRoleCustomer,
  IconRoleDriver,
  VietnamFlagIcon,
  hitSlop,
  iconSize,
  isLikelyVnPhone,
} from '@leopard/mobile-core';
import { isFirebaseConfigured } from '@leopard/mobile-core/src/auth/firebase';
import {
  resetRecaptcha,
  sendPhoneOtp,
  signInWithGoogle,
  type OtpChallenge,
} from '@leopard/mobile-core/src/auth/firebase-auth';
import { DriverOtpModal } from './DriverOtpModal';

function GoogleMark() {
  return (
    <Svg height={18} viewBox="0 0 24 24" width={18} style={styles.googleMark}>
      <Path
        d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.5h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.1.1 3.5 2.7.2.1c2.2-2 3.6-5 3.6-8.9z"
        fill="#4285F4"
      />
      <Path
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5l-.1.1-3.5 2.7v.1C3.5 21.3 7.4 24 12 24z"
        fill="#34A853"
      />
      <Path
        d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-.1-.1-3.5-2.7-.1.1C.6 8.6 0 10.2 0 12s.6 3.4 1.5 4.9l3.7-2.5z"
        fill="#FBBC05"
      />
      <Path
        d="M12 4.6c1.8 0 3 .8 3.7 1.4l3.3-3.2.1-.1C17.9 1.1 15.2 0 12 0 7.4 0 3.5 2.7 1.5 6.9l3.7 2.7c1-2.9 3.7-5 6.8-5z"
        fill="#EA4335"
      />
    </Svg>
  );
}

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

  const handleChangePhone = useCallback(() => {
    resetRecaptcha();
    otpChallengeRef.current = null;
    setOtpCode('');
    setErrorMsg(null);
    setResendSuccessMsg(null);
    setIsVerified(false);
    setAuthPhase('phone');
  }, []);

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
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
        >
          {/* Top Brand & Header Section */}
          <View style={styles.heroSection} testID="driver-login-hero-image">
            <View style={styles.brandHeader}>
              <BrandLoginLogo height={32} />
            </View>

            <View style={styles.heroCopy}>
              <Text accessibilityRole="header" style={styles.mainTitle}>
                Chào mừng bác tài
              </Text>
              <Text style={styles.subTitle}>
                Đăng nhập để nhận đơn và điều hướng chuyến đi.
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

            {errorMsg !== null && authPhase === 'phone' ? (
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
                  isInputFocused ? styles.inputRowFocused : null,
                  !isInputFocused && isPhoneValid ? styles.inputRowValid : null,
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
                isBtnDisabled ? styles.primaryBtnDisabled : null,
                pressed && !isBtnDisabled ? styles.pressed : null,
              ]}
            >
              {isSubmitting ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={colors.neutral.surface} size="small" />
                  <Text style={styles.primaryBtnText}>Đang xử lý…</Text>
                </View>
              ) : (
                <Text
                  style={[
                    styles.primaryBtnText,
                    isBtnDisabled ? styles.primaryBtnDisabledText : null,
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
                isSubmitting || !firebaseReady ? styles.btnDisabled : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <View style={styles.googleIconWrap}>
                <GoogleMark />
              </View>
              <Text style={styles.googleBtnText}>Đăng nhập với Google</Text>
            </Pressable>

            {!firebaseReady ? (
              <Text style={styles.firebaseNote}>
                Đăng nhập Google hiện chưa khả dụng trên thiết bị này.
              </Text>
            ) : null}

            {/* Demo One-Click Section */}
            {allowDemo ? (
              <View style={styles.demoSection}>
                <View style={styles.dividerRow}>
                  <View style={styles.orLine} />
                  <Text style={styles.demoDividerText}>Tài khoản demo</Text>
                  <View style={styles.orLine} />
                </View>

                <View style={styles.demoGrid}>
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
                    <Text style={styles.demoCardDesc}>Thử đăng nhập tài khoản khách hàng</Text>
                    <Button
                      disabled={isSubmitting}
                      label="Demo Customer"
                      onPress={() => handleDemoLogin('customer', 'CUSTOMER')}
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

            <Text style={styles.termsNote}>
              Bằng việc đăng nhập, bạn đồng ý với Điều khoản dịch vụ & Chính sách bảo mật của LEOPARD.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* OTP Modal Overlay */}
      {authPhase === 'otp' ? (
        <DriverOtpModal
          errorMsg={errorMsg}
          isSubmitting={isSubmitting}
          isVerified={isVerified}
          onChangeCode={(code) => {
            setOtpCode(code);
            if (errorMsg) setErrorMsg(null);
            if (resendSuccessMsg) setResendSuccessMsg(null);
          }}
          onClose={handleChangePhone}
          onResend={() => {
            void handleResendOtp();
          }}
          onVerify={(code) => {
            void handleVerifyOtp(code);
          }}
          otpCode={otpCode}
          phone={phone}
          resendSeconds={resendSeconds}
          resendSuccessMsg={resendSuccessMsg}
        />
      ) : null}
    </View>
  );
}
