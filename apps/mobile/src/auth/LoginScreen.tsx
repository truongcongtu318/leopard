import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { colors, leopardPalette, spacing } from '@leopard/mobile-core';
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
  OtpPhoneHeroIcon,
  VietnamFlagIcon,
} from '../ui/icons/CoreIcons';
import { TruckLoader } from '../ui/TruckLoader';
import { AuthHeroHeader } from './AuthHeroHeader';
import { OtpSixCellInput } from './OtpSixCellInput';

/** DOM id the invisible reCAPTCHA verifier binds to (web Phone Auth). */
const RECAPTCHA_CONTAINER_ID = 'leopard-recaptcha-container';

/** Warm orange accent used on the curved hero header and its matching CTAs. */
const orange = {
  primary: '#F59E0B',
  primaryDark: '#B45309',
  soft: '#FFEDD5',
  border: '#FDBA74',
} as const;

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
  const [resendSeconds, setResendSeconds] = useState(60);
  const [isVerified, setIsVerified] = useState(false);
  const [resendSuccessMsg, setResendSuccessMsg] = useState<string | null>(null);
  const otpChallengeRef = useRef<OtpChallenge | null>(null);
  const firebaseReady = isFirebaseConfigured();

  // Real-time Resend countdown timer
  useEffect(() => {
    if (authPhase !== 'otp' || resendSeconds <= 0) return;
    const timer = setInterval(() => {
      setResendSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [authPhase, resendSeconds]);

  // Exchanges a verified Firebase idToken for a Leopard session.
  const exchangeIdToken = async (idToken: string) => {
    const res = await httpClient.post<AuthResponse>('/auth/firebase', { idToken });
    const accessToken = res.session?.accessToken ?? '';
    const refreshToken = res.session?.refreshToken ?? '';
    await sessionStore.setSession(accessToken, refreshToken, res.user.role);
    if (res.user?.profileComplete !== undefined) {
      onLoginSuccess?.(res.user?.role ?? 'CUSTOMER', res.user.profileComplete);
    } else {
      (onLoginSuccess as any)?.(res.user?.role ?? 'CUSTOMER');
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
    <View style={styles.rootContainer}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        style={styles.container}
      >
        <AuthHeroHeader
          subtitle="Nhập số điện thoại để đặt xe giao hàng ngay."
          title="Chào mừng trở lại 👋"
        />

        <View style={styles.bodyWrap}>
        <View style={styles.innerWrapper}>
          {/* ================= LOGIN FORM (flat, no card) ================= */}
          <View style={styles.formGroup}>
            <Text accessibilityRole="header" style={styles.srOnly}>
              Đăng nhập
            </Text>

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

            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Số điện thoại</Text>
                {isLikelyVnPhone(phone) ? (
                  <View style={styles.validBadge}>
                    <Text style={styles.validCheckIcon}>✓</Text>
                    <Text style={styles.validText}>Hợp lệ</Text>
                  </View>
                ) : null}
              </View>

              <View
                style={[
                  styles.customInputWrapper,
                  isInputFocused && styles.customInputWrapperFocused,
                  !isInputFocused && isLikelyVnPhone(phone) && styles.customInputWrapperValid,
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
                  editable={!isSubmitting}
                  keyboardType="phone-pad"
                  onBlur={() => setIsInputFocused(false)}
                  onChangeText={setPhone}
                  onFocus={() => setIsInputFocused(true)}
                  placeholder="Nhập số điện thoại..."
                  placeholderTextColor={leopardPalette.textSubtle}
                  style={styles.customTextInput}
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
                styles.primaryCtaBtn,
                (!isLikelyVnPhone(phone) || isSubmitting || !firebaseReady) &&
                  styles.primaryCtaBtnDisabled,
                pressed && styles.primaryCtaBtnPressed,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryCtaText}>Gửi mã OTP</Text>
              )}
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

          <Text style={styles.termsNote}>
            Bằng việc đăng nhập, bạn đồng ý với Điều khoản dịch vụ & Chính sách bảo mật của LEOPARD.
          </Text>
        </View>
        </View>
      </ScrollView>

      {/* ================= FLOATING CENTERED OTP MODAL WITH DIMMED / BLURRED BACKDROP ================= */}
      {authPhase === 'otp' && (
        <View style={styles.modalOverlay}>
          <Pressable
            accessibilityLabel="Đóng modal xác thực"
            onPress={handleChangePhone}
            style={styles.modalBackdrop}
          />

          <View style={styles.modalContentCard}>
            {/* Top Navigation Row: Back Button */}
            <View style={styles.otpHeaderRow}>
              <Pressable
                accessibilityLabel="Đổi số điện thoại"
                accessibilityRole="button"
                disabled={isSubmitting}
                hitSlop={8}
                onPress={handleChangePhone}
                style={styles.otpBackBtn}
              >
                <Text style={styles.otpBackBtnText}>← Đổi số điện thoại</Text>
              </Pressable>
            </View>

            {/* Hero Icon */}
            <View style={styles.otpHeroWrapper}>
              <View style={[styles.otpHeroBadge, isVerified && styles.otpHeroBadgeSuccess]}>
                <OtpPhoneHeroIcon isVerified={isVerified} size={50} />
              </View>
            </View>

            {/* Title & Subtitle */}
            <View style={styles.otpTitleGroup}>
              <Text style={styles.otpHeadline}>
                {isVerified ? 'Xác thực thành công! 🎉' : 'Xác nhận mã OTP'}
              </Text>
              <Text style={styles.otpSubline}>
                {isVerified
                  ? `Số điện thoại ${toE164Vn(phone)} đã được xác thực an toàn.`
                  : 'Nhập mã gồm 6 chữ số đã được gửi tới '}
                {!isVerified ? (
                  <Text style={styles.otpPhoneHighlight}>{toE164Vn(phone)}</Text>
                ) : null}
              </Text>
            </View>

            {/* 6-Digit PIN Cells Input with Auto-advance & Shake feedback */}
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

            {/* Animated Truck Loader while verifying OTP */}
            {isSubmitting ? (
              <View style={styles.submittingTruckWrap}>
                <TruckLoader showRoad={true} showText={false} size="sm" />
              </View>
            ) : null}

            {/* Error Box inside modal if error during OTP verification */}
            {errorMsg ? (
              <View style={styles.errorBox} testID="otp-error-banner">
                <Text accessibilityRole="alert" style={styles.errorText}>
                  {errorMsg}
                </Text>
              </View>
            ) : null}

            {/* Success Info Banner if verified */}
            {isVerified ? (
              <View style={styles.verifiedSuccessBox}>
                <View style={styles.verifiedDot} />
                <Text style={styles.verifiedSuccessText}>Đang chuyển hướng vào hệ thống...</Text>
              </View>
            ) : null}

            {/* Optional Resend feedback message */}
            {resendSuccessMsg ? (
              <View style={styles.infoBanner}>
                <Text style={styles.infoBannerText}>✓ {resendSuccessMsg}</Text>
              </View>
            ) : null}

            {/* Primary Submit CTA Button (Accessibility + Auto/Manual Trigger) */}
            <Pressable
              accessibilityLabel="Xác nhận mã OTP"
              accessibilityRole="button"
              accessibilityState={{
                busy: isSubmitting,
                disabled: isSubmitting || otpCode.trim().length < 6 || isVerified,
              }}
              disabled={isSubmitting || otpCode.trim().length < 6 || isVerified}
              onPress={() => void handleVerifyOtp()}
              style={({ pressed }) => [
                styles.primaryCtaBtn,
                styles.otpSubmitBtn,
                isVerified && styles.primaryCtaBtnVerified,
                (otpCode.trim().length < 6 || isSubmitting) &&
                  !isVerified &&
                  styles.primaryCtaBtnDisabled,
                pressed && styles.primaryCtaBtnPressed,
              ]}
            >
              <Text style={styles.primaryCtaText}>
                {isVerified
                  ? '✓ Đã xác thực'
                  : isSubmitting
                  ? 'Đang xác thực...'
                  : 'Xác nhận mã OTP'}
              </Text>
            </Pressable>

            {/* Rate Limiting Resend Countdown */}
            {!isVerified ? (
              <View style={styles.resendArea}>
                {resendSeconds > 0 ? (
                  <Text style={styles.resendCountdownText}>
                    Gửi lại mã sau{' '}
                    <Text style={styles.resendCountdownTime}>
                      00:{resendSeconds < 10 ? `0${resendSeconds}` : resendSeconds}
                    </Text>
                  </Text>
                ) : (
                  <Pressable
                    accessibilityLabel="Gửi lại mã OTP"
                    accessibilityRole="button"
                    disabled={isSubmitting}
                    hitSlop={8}
                    onPress={handleResendOtp}
                    style={styles.resendBtn}
                  >
                    <Text style={styles.resendActionLink}>Gửi lại mã OTP</Text>
                  </Pressable>
                )}
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
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  bodyWrap: {
    marginTop: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  innerWrapper: {
    width: '100%',
    maxWidth: 420,
    gap: spacing.md,
  },

  /* Login form group (flat on white, no card) */
  formGroup: {
    gap: spacing.sm,
  },
  srOnly: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
  },

  /* Alert / Error Banners */
  alertBox: {
    backgroundColor: leopardPalette.accentYellowBg,
    borderWidth: 1,
    borderColor: leopardPalette.accentYellowBorder,
    borderRadius: 14,
    padding: 12,
  },
  alertText: {
    color: leopardPalette.accentYellowDark,
    fontSize: 12.5,
    fontWeight: '600',
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    padding: 12,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 12.5,
    fontWeight: '600',
    lineHeight: 18,
    textAlign: 'center',
  },

  /* Phone Field */
  fieldGroup: {
    gap: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: leopardPalette.textMutedSlate,
  },
  validBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  validCheckIcon: {
    fontSize: 10,
    color: '#15803D',
    fontWeight: '800',
  },
  validText: {
    fontSize: 10.5,
    color: '#15803D',
    fontWeight: '700',
  },
  customInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: leopardPalette.inputBorder,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingLeft: 8,
    paddingRight: 6,
    height: 54,
    gap: 4,
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 2,
  },
  customInputWrapperFocused: {
    borderColor: orange.primary,
    shadowColor: orange.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  customInputWrapperValid: {
    borderColor: '#86EFAC',
  },
  countryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  countryCode: {
    fontSize: 13.5,
    fontWeight: '700',
    color: leopardPalette.textSlateDark,
  },
  countryChevron: {
    fontSize: 10,
    color: leopardPalette.textMutedSlate,
    fontWeight: '700',
    marginTop: -1,
  },
  badgeDivider: {
    width: 1,
    height: 22,
    backgroundColor: leopardPalette.cardBorder,
    marginHorizontal: 4,
  },
  customTextInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    color: leopardPalette.textSlateDark,
    fontWeight: '600',
    paddingVertical: 0,
    height: '100%',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        outlineWidth: 0,
      } as any,
    }),
  },
  clearBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearBtnText: {
    color: leopardPalette.textSubtle,
    fontSize: 13,
    fontWeight: '600',
  },

  /* Primary CTA */
  primaryCtaBtn: {
    backgroundColor: orange.primary,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: orange.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryCtaBtnDisabled: {
    backgroundColor: '#F3C989',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryCtaBtnVerified: {
    backgroundColor: '#16A34A',
    shadowColor: '#16A34A',
  },
  primaryCtaBtnPressed: {
    opacity: 0.9,
  },
  primaryCtaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  /* Divider row */
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: leopardPalette.subtleDivider,
  },
  orText: {
    fontSize: 12,
    color: leopardPalette.textSubtle,
    fontWeight: '600',
  },

  /* Google Button */
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: leopardPalette.cardBorder,
    borderRadius: 16,
    paddingVertical: 13,
  },
  googleBtnDisabled: {
    opacity: 0.5,
  },
  googleG: {
    fontSize: 15,
    fontWeight: '800',
    color: '#EA4335',
  },
  googleBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: leopardPalette.textSlateDark,
  },
  configNote: {
    fontSize: 11.5,
    color: leopardPalette.textSubtle,
    textAlign: 'center',
    fontWeight: '500',
  },
  recaptcha: {
    height: 0,
    width: 0,
    overflow: 'hidden',
  },

  /* Demo Accounts */
  demoSection: {
    gap: spacing.sm,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  demoDividerText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: leopardPalette.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  demoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  demoCard: {
    flexBasis: '48%',
    flexGrow: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 6,
    backgroundColor: '#FFFFFF',
  },
  demoCardBlue: {
    borderColor: leopardPalette.primaryBorder,
    backgroundColor: leopardPalette.primaryBg,
  },
  demoCardGreen: {
    borderColor: colors.success.border,
    backgroundColor: colors.success.background,
  },
  demoCardAmber: {
    borderColor: colors.warning.border,
    backgroundColor: colors.warning.background,
  },
  demoCardSlate: {
    borderColor: leopardPalette.cardBorder,
    backgroundColor: '#F8FAFC',
  },
  demoCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  demoRoleBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  demoRoleBadgeBlue: {
    backgroundColor: leopardPalette.primary,
  },
  demoRoleBadgeGreen: {
    backgroundColor: colors.success.text,
  },
  demoRoleBadgeAmber: {
    backgroundColor: leopardPalette.accentYellowDark,
  },
  demoRoleBadgeSlate: {
    backgroundColor: leopardPalette.textMutedSlate,
  },
  demoRoleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  demoCardDesc: {
    fontSize: 11.5,
    color: leopardPalette.textMutedSlate,
    lineHeight: 15,
  },

  /* Footer Navigation */
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 4,
  },
  registerHelper: {
    fontSize: 13,
    color: leopardPalette.textMutedSlate,
  },
  registerLink: {
    fontSize: 13,
    fontWeight: '700',
    color: orange.primaryDark,
  },
  termsNote: {
    fontSize: 10.5,
    color: leopardPalette.textSubtle,
    textAlign: 'center',
    lineHeight: 15,
    paddingHorizontal: 8,
  },

  /* Modal Overlay & Card */
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 30, 66, 0.55)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      } as any,
    }),
  },
  modalContentCard: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: leopardPalette.cardBorder,
    padding: 24,
    gap: 16,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.28,
    shadowRadius: 28,
    elevation: 16,
  },
  otpHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  otpBackBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  otpBackBtnText: {
    color: orange.primaryDark,
    fontSize: 13,
    fontWeight: '700',
  },
  otpHeroWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginBottom: 4,
  },
  otpHeroBadge: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: leopardPalette.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: orange.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  otpHeroBadgeSuccess: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    shadowColor: '#16A34A',
  },
  submittingTruckWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    marginVertical: 4,
  },
  otpTitleGroup: {
    alignItems: 'center',
    gap: 4,
    width: '100%',
    paddingHorizontal: 8,
  },
  otpHeadline: {
    color: leopardPalette.textSlateDark,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  otpSubline: {
    color: leopardPalette.textMutedSlate,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  otpPhoneHighlight: {
    color: leopardPalette.textSlateDark,
    fontWeight: '700',
  },
  otpSubmitBtn: {
    width: '100%',
  },
  verifiedSuccessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: '100%',
    justifyContent: 'center',
  },
  verifiedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  verifiedSuccessText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
  },
  infoBanner: {
    backgroundColor: leopardPalette.primaryBg,
    borderWidth: 1,
    borderColor: leopardPalette.primaryBorder,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    width: '100%',
  },
  infoBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: leopardPalette.primary,
    textAlign: 'center',
  },
  resendArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  resendCountdownText: {
    fontSize: 13,
    color: leopardPalette.textMutedSlate,
    fontWeight: '500',
  },
  resendCountdownTime: {
    fontWeight: '700',
    color: leopardPalette.textSlateDark,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  resendBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  resendActionLink: {
    fontSize: 13.5,
    fontWeight: '700',
    color: orange.primaryDark,
    textDecorationLine: 'underline',
  },
});
