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
import { useRouter } from 'expo-router';

import { httpClient, ApiError, AuthHeroHeader, sessionStore, isLikelyVnPhone, toE164Vn, OtpSixCellInput, leopardPalette, IconPhone, IconSecurityShield, IconUser, IconOffice, OtpPhoneHeroIcon, VietnamFlagIcon, TruckLoader, IconAlertTriangle } from '@leopard/mobile-core';
import { sendPhoneOtp, resetRecaptcha, type OtpChallenge } from '@leopard/mobile-core/src/auth/firebase-auth';

const RECAPTCHA_CONTAINER_ID = 'leopard-recaptcha-register';

/** Warm orange accent matching the curved hero header used across auth screens. */
const orange = {
  primary: '#F59E0B',
  primaryDark: '#B45309',
} as const;

interface MeResponse {
  phone: string | null;
  email: string | null;
  name: string | null;
  role: string;
}

interface AuthResponse {
  user: {
    id: string;
    phone: string | null;
    email: string | null;
    name: string | null;
    role: string;
    status: string;
    profileComplete: boolean;
  };
  session: {
    accessToken: string;
    accessTokenExpiresAt: string;
    refreshToken: string;
    refreshTokenExpiresAt: string;
  };
}

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

function describeAuthError(err: unknown): string {
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
    return message || 'Thông tin xác thực không hợp lệ';
  }
  if (statusCode === 409) {
    return message || 'Số điện thoại đã được liên kết với tài khoản khác';
  }
  if (statusCode === 503 || statusCode === 0) {
    return message || 'Hệ thống xác thực tạm thời không khả dụng';
  }
  return message || 'Đã xảy ra lỗi khi xác thực';
}

export default function CustomerRegisterScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const challengeRef = useRef<OtpChallenge | null>(null);

  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [email, setEmail] = useState('');
  const [consentInsurance, setConsentInsurance] = useState(false);
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentService, setConsentService] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [consentThirdParty, setConsentThirdParty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = setInterval(() => {
      setResendSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendSeconds]);

  useEffect(() => {
    let active = true;
    if (!sessionStore.getAccessToken()) {
      return;
    }
    void (async () => {
      try {
        const me = await httpClient.get<MeResponse>('/me');
        if (!active) return;
        setPhone(me.phone);
        if (me.name) setName(me.name);
        if (me.email) setEmail(me.email);
      } catch {
        // Giữ form trống nếu prefill lỗi
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const phoneReady = Boolean(phone) || phoneVerified;
  const isPhoneValid = isLikelyVnPhone(phoneInput.trim());
  const canSendOtp = !phoneBusy && (otpSent ? true : isPhoneValid);

  const canSubmit =
    Boolean(name.trim()) &&
    isValidEmail(email) &&
    phoneReady &&
    consentTerms &&
    consentService &&
    !isSubmitting;

  const handleBack = () => {
    if (typeof router.canGoBack === 'function' && router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(public)/login');
    }
  };

  const sendOtp = async () => {
    if (phoneBusy || !phoneInput.trim() || resendSeconds > 0) return;
    if (!isLikelyVnPhone(phoneInput.trim())) {
      setErrorMsg('Số điện thoại không hợp lệ');
      return;
    }
    setPhoneBusy(true);
    setErrorMsg(null);
    try {
      const normalizedPhone = toE164Vn(phoneInput.trim());
      challengeRef.current = await sendPhoneOtp(normalizedPhone, RECAPTCHA_CONTAINER_ID);
      setOtpSent(true);
      setResendSeconds(60);
      setShowOtpModal(true);
    } catch (err) {
      resetRecaptcha();
      setErrorMsg(describeAuthError(err) || 'Không gửi được mã OTP, vui lòng thử lại');
    } finally {
      setPhoneBusy(false);
    }
  };

  const verifyOtp = async (explicitCode?: string) => {
    const codeToVerify = (typeof explicitCode === 'string' ? explicitCode : otpCode).trim();
    const challenge = challengeRef.current;
    if (phoneBusy || !challenge || codeToVerify.length < 6) return;
    setPhoneBusy(true);
    setErrorMsg(null);
    try {
      const idToken = await challenge.confirm(codeToVerify);
      const hasExistingSession = Boolean(sessionStore.getAccessToken());

      if (hasExistingSession) {
        // Luồng 1: Người dùng đã có session (ví dụ từ Google Login qua) -> link số điện thoại
        const linked = await httpClient.post<{ phone: string }>('/auth/phone/link', { idToken });
        setPhone(linked.phone);
        setPhoneVerified(true);
        setShowOtpModal(false);
      } else {
        // Luồng 2: Người dùng xác thực trực tiếp tại trang Đăng ký -> exchange Firebase token lấy session
        const authRes = await httpClient.post<AuthResponse>('/auth/firebase', { idToken });
        const accessToken = authRes.session?.accessToken ?? '';
        const refreshToken = authRes.session?.refreshToken ?? '';
        const role = (authRes.user?.role as never) ?? 'CUSTOMER';
        await sessionStore.setSession(accessToken, refreshToken, role);

        const verifiedPhone = authRes.user?.phone ?? toE164Vn(phoneInput.trim());
        setPhone(verifiedPhone);
        setPhoneVerified(true);
        setShowOtpModal(false);
        if (authRes.user?.name && !name) setName(authRes.user.name);
        if (authRes.user?.email && !email) setEmail(authRes.user.email);

        if (authRes.user?.profileComplete) {
          router.replace('/customer/home');
          return;
        }
      }
    } catch (err) {
      setErrorMsg(describeAuthError(err) || 'Xác minh số điện thoại thất bại');
    } finally {
      setPhoneBusy(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await httpClient.patch<{ role: string }>('/users/me', {
        name: name.trim(),
        email: email.trim(),
        consentTerms: true,
        consentService: true,
        consentMarketing,
        consentThirdParty,
      });
      await sessionStore.setSession(
        sessionStore.getAccessToken() ?? '',
        (await sessionStore.getRefreshToken()) ?? '',
        (res.role as never) ?? 'CUSTOMER',
      );
      router.replace('/(public)/customer-address');
    } catch (err) {
      const statusCode = (err as { statusCode?: number })?.statusCode ?? 0;
      const message = (err as { message?: string })?.message;
      if (statusCode === 401) setErrorMsg('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
      else if ((ApiError.isApiError(err) || err instanceof ApiError) && statusCode >= 400 && statusCode < 500)
        setErrorMsg(message ?? 'Thông tin chưa hợp lệ');
      else setErrorMsg(message ?? 'Đã xảy ra lỗi, vui lòng thử lại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const Consent = ({
    testID,
    checked,
    onToggle,
    label,
    required = false,
  }: {
    testID: string;
    checked: boolean;
    onToggle: () => void;
    label: string;
    required?: boolean;
  }) => (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onToggle}
      style={({ pressed }) => [styles.consentRow, pressed && styles.consentRowPressed]}
      testID={testID}
    >
      <View style={[styles.checkbox, checked && styles.checkboxOn]}>
        {checked ? <Text style={styles.checkboxTick}>✓</Text> : null}
      </View>
      <View style={styles.consentTextWrap}>
        <Text style={styles.consentText}>
          {label}
          {required ? <Text style={styles.requiredStar}> *</Text> : null}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.rootContainer}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        style={styles.container}
      >
        <AuthHeroHeader
          backTestID="cr-back-btn"
          onBack={handleBack}
          subtitle="Đăng ký để đặt xe và theo dõi hành trình dễ dàng."
          title="Tạo tài khoản mới"
        />

        <View style={styles.bodyWrap}>
        <View style={styles.innerWrapper}>
          {/* ================= ERROR BANNER ================= */}
          {errorMsg && !showOtpModal ? (
            <View style={styles.errorBox} testID="cr-error">
              <IconAlertTriangle color="#B91C1C" size={18} />
              <Text accessibilityRole="alert" style={styles.errorText}>
                {errorMsg}
              </Text>
            </View>
          ) : null}

          {/* ================= MAIN APPLICATION CARD ================= */}
          <View style={styles.card}>
            {/* Subsection: Số điện thoại */}
            <View style={styles.sectionGroup}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleWrap}>
                  <IconPhone color="#475569" size={16} strokeWidth={2} />
                  <Text style={styles.sectionTitle}>Số điện thoại</Text>
                </View>
                {phoneReady ? (
                  <View style={styles.statusPillSuccess}>
                    <Text style={styles.statusPillSuccessText}>Đã xác thực</Text>
                  </View>
                ) : (
                  <View style={styles.statusPillWarn}>
                    <Text style={styles.statusPillWarnText}>Cần xác minh</Text>
                  </View>
                )}
              </View>

              {phoneReady ? (
                <View style={[styles.inputWrap, styles.inputLocked]}>
                  <View style={styles.lockedRow}>
                    <Text style={styles.lockedText}>{phone ?? phoneInput}</Text>
                  </View>
                  <Text style={styles.lockedTag}>Đã liên kết</Text>
                </View>
              ) : (
                <View style={styles.otpFormGroup}>
                  {/* Unified single-container phone input with Login styling & embedded send button */}
                  <View
                    style={[
                      styles.phoneInputContainer,
                      focusedField === 'phone' && styles.inputFocused,
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
                      editable={!phoneVerified}
                      keyboardType="phone-pad"
                      maxLength={15}
                      onBlur={() => setFocusedField(null)}
                      onChangeText={(t) => {
                        const cleaned = t.replace(/[^\d\s+]/g, '');
                        setPhoneInput(cleaned);
                        if (otpSent) setOtpSent(false);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      onFocus={() => setFocusedField('phone')}
                      placeholder="Nhập số điện thoại..."
                      placeholderTextColor="#94A3B8"
                      style={styles.phoneTextInput}
                      testID="cr-phone-input"
                      value={phoneInput}
                    />

                    {phoneInput.length > 0 && !phoneBusy && !phoneVerified ? (
                      <Pressable
                        accessibilityLabel="Xóa số điện thoại"
                        accessibilityRole="button"
                        hitSlop={8}
                        onPress={() => {
                          setPhoneInput('');
                          if (otpSent) setOtpSent(false);
                          if (errorMsg) setErrorMsg(null);
                        }}
                        style={styles.clearBtn}
                      >
                        <Text style={styles.clearBtnText}>✕</Text>
                      </Pressable>
                    ) : null}

                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ disabled: !canSendOtp }}
                      disabled={!canSendOtp}
                      onPress={() => {
                        if (otpSent && !showOtpModal) {
                          setShowOtpModal(true);
                        } else {
                          void sendOtp();
                        }
                      }}
                      hitSlop={{ top: 4, bottom: 4 }}
                      style={({ pressed }) => [
                        styles.sendOtpBtn,
                        !canSendOtp && styles.sendOtpBtnDisabled,
                        pressed && canSendOtp && styles.pressed,
                      ]}
                      testID="cr-send-otp"
                    >
                      {phoneBusy ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.sendOtpBtnText}>
                          {otpSent ? 'Nhập OTP' : 'Gửi mã'}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </View>
            )}

            <View nativeID={RECAPTCHA_CONTAINER_ID} />
          </View>

          <View style={styles.sectionDivider} />

          {/* Subsection: Thông tin doanh nghiệp & khách hàng */}
          <View style={styles.sectionGroup}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleWrap}>
                <IconOffice color="#0B1E42" size={16} strokeWidth={2} />
                <Text style={styles.sectionTitle}>Thông tin doanh nghiệp & cá nhân</Text>
              </View>
            </View>

            <View style={styles.fieldItem}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.label}>Họ và tên người gửi</Text>
                <Text style={styles.requiredStar}>*</Text>
              </View>
              <TextInput
                accessibilityLabel="Họ và tên người gửi"
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isSubmitting}
                onBlur={() => setFocusedField(null)}
                onChangeText={setName}
                onFocus={() => setFocusedField('name')}
                placeholder="VD: Nguyễn Văn An"
                placeholderTextColor="#94A3B8"
                style={[
                  styles.input,
                  focusedField === 'name' && styles.inputFocused,
                ]}
                testID="cr-name"
                value={name}
              />
            </View>

            <View style={styles.fieldItem}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.label}>Tên công ty / Doanh nghiệp</Text>
              </View>
              <TextInput
                accessibilityLabel="Tên công ty / Doanh nghiệp"
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isSubmitting}
                onBlur={() => setFocusedField(null)}
                onChangeText={setCompanyName}
                onFocus={() => setFocusedField('companyName')}
                placeholder="VD: Công ty TNHH Logistics Vận Tải An Phát"
                placeholderTextColor="#94A3B8"
                style={[
                  styles.input,
                  focusedField === 'companyName' && styles.inputFocused,
                ]}
                testID="cr-company-name"
                value={companyName}
              />
            </View>

            <View style={styles.fieldItem}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.label}>MÃ SỐ THUẾ (MST)</Text>
              </View>
              <TextInput
                accessibilityLabel="MÃ SỐ THUẾ (MST)"
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!isSubmitting}
                keyboardType="numbers-and-punctuation"
                maxLength={14}
                onBlur={() => setFocusedField(null)}
                onChangeText={setTaxCode}
                onFocus={() => setFocusedField('taxCode')}
                placeholder="VD: 0312345678 hoặc 0312345678-001"
                placeholderTextColor="#94A3B8"
                style={[
                  styles.input,
                  styles.monoInput,
                  focusedField === 'taxCode' && styles.inputFocused,
                ]}
                testID="cr-tax-code"
                value={taxCode}
              />
            </View>

            <View style={styles.fieldItem}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.label}>EMAIL NHẬN HÓA ĐƠN VAT</Text>
                <Text style={styles.requiredStar}>*</Text>
              </View>
              <TextInput
                accessibilityLabel="EMAIL NHẬN HÓA ĐƠN VAT"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
                keyboardType="email-address"
                onBlur={() => setFocusedField(null)}
                onChangeText={setEmail}
                onFocus={() => setFocusedField('email')}
                placeholder="VD: ketoan@anphatlogistics.vn"
                placeholderTextColor="#94A3B8"
                style={[
                  styles.input,
                  focusedField === 'email' && styles.inputFocused,
                ]}
                testID="cr-email"
                value={email}
              />
            </View>
          </View>
        </View>

        {/* ================= CARD 2: CHÍNH SÁCH & ĐIỀU KHOẢN (ĐỂ RIÊNG) ================= */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleWrap}>
              <IconSecurityShield color="#475569" size={16} strokeWidth={2} />
              <Text style={styles.sectionTitle}>Điều khoản & Chính sách</Text>
            </View>
          </View>

          <View style={styles.consentList}>
            <Consent
              checked={consentTerms}
              label="Tôi đã đọc và đồng ý với Điều khoản & Chính sách của LEOPARD."
              onToggle={() => setConsentTerms((v) => !v)}
              required
              testID="cr-consent-terms"
            />
            <View style={styles.consentDivider} />
            <Consent
              checked={consentService}
              label="Cho phép LEOPARD xử lý dữ liệu cá nhân để thực hiện đơn hàng và cung cấp dịch vụ."
              onToggle={() => setConsentService((v) => !v)}
              required
              testID="cr-consent-service"
            />
            <View style={styles.consentDivider} />
            <Consent
              checked={consentInsurance}
              label="Cam kết bảo hiểm hàng hóa theo quy chuẩn vận tải LEOPARD."
              onToggle={() => setConsentInsurance((v) => !v)}
              testID="cr-consent-insurance"
            />
            <View style={styles.consentDivider} />
            <Consent
              checked={consentMarketing}
              label="Nhận thông tin ưu đãi, marketing từ LEOPARD. (Tùy chọn)"
              onToggle={() => setConsentMarketing((v) => !v)}
              testID="cr-consent-marketing"
            />
            <View style={styles.consentDivider} />
            <Consent
              checked={consentThirdParty}
              label="Cho phép chia sẻ dữ liệu cho đối tác thứ ba liên quan. (Tùy chọn)"
              onToggle={() => setConsentThirdParty((v) => !v)}
              testID="cr-consent-third"
            />
          </View>
        </View>

        {/* ================= PRIMARY ACTION BUTTON ================= */}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSubmit, busy: isSubmitting }}
          disabled={!canSubmit}
          onPress={handleSubmit}
          style={({ pressed }) => [
            styles.primaryBtn,
            !canSubmit && styles.primaryBtnDisabled,
            pressed && canSubmit && styles.pressed,
          ]}
          testID="cr-submit"
        >
          {isSubmitting ? (
            <View style={styles.btnLoadingRow}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.primaryBtnText}>Đang lưu...</Text>
            </View>
          ) : (
            <Text style={styles.primaryBtnText}>Hoàn tất</Text>
          )}
        </Pressable>

        {/* ================= DRIVER PARTNER LINK ================= */}
        <View style={styles.driverCard}>
          <Text style={styles.driverCardHelper}>Bạn muốn chạy xe cùng LEOPARD?</Text>
          <Pressable
            hitSlop={8}
            onPress={() => router.push('/(public)/driver-register')}
            style={({ pressed }) => [styles.driverLink, pressed && styles.pressed]}
          >
            <Text style={styles.driverLinkText}>Đăng ký làm tài xế đối tác →</Text>
          </Pressable>
        </View>
        </View>
        </View>
    </ScrollView>

    {/* ================= FLOATING CENTERED OTP MODAL (MATCHING LOGIN SCREEN) ================= */}
    {showOtpModal && (
      <View style={styles.modalOverlay}>
        <Pressable
          accessibilityLabel="Đóng modal xác thực"
          onPress={() => {
            if (!phoneBusy) setShowOtpModal(false);
          }}
          style={styles.modalBackdrop}
        />

        <View style={styles.modalContentCard}>
          {/* Top Navigation Row: Back Button */}
          <View style={styles.otpHeaderRow}>
            <Pressable
              accessibilityLabel="Đổi số điện thoại"
              accessibilityRole="button"
              disabled={phoneBusy}
              hitSlop={8}
              onPress={() => setShowOtpModal(false)}
              style={styles.otpBackBtn}
            >
              <Text style={styles.otpBackBtnText}>← Đổi số điện thoại</Text>
            </Pressable>
          </View>

          {/* Hero Icon with Badge */}
          <View style={styles.otpHeroWrapper}>
            <View style={[styles.otpHeroBadge, phoneVerified && styles.otpHeroBadgeSuccess]}>
              <OtpPhoneHeroIcon isVerified={phoneVerified} size={50} />
            </View>
          </View>

          {/* Title & Subtitle */}
          <View style={styles.otpTitleGroup}>
            <Text style={styles.otpHeadline}>
              {phoneVerified ? 'Xác thực thành công!' : 'Xác nhận mã OTP'}
            </Text>
            <Text style={styles.otpSubline}>
              {phoneVerified
                ? `Số điện thoại ${toE164Vn(phoneInput)} đã được xác thực an toàn.`
                : 'Nhập mã gồm 6 chữ số đã được gửi tới '}
              {!phoneVerified ? (
                <Text style={styles.otpPhoneHighlight}>{toE164Vn(phoneInput)}</Text>
              ) : null}
            </Text>
          </View>

          {/* 6-Digit PIN Cells Input with Auto-advance */}
          <OtpSixCellInput
            autoFocus
            editable={!phoneBusy && !phoneVerified}
            hasError={Boolean(errorMsg)}
            inputTestID="cr-otp-input"
            isSubmitting={phoneBusy}
            onChangeText={(text) => {
              setOtpCode(text);
              if (errorMsg) setErrorMsg(null);
            }}
            value={otpCode}
          />

          {/* Animated Truck Loader while verifying OTP */}
          {phoneBusy ? (
            <View style={styles.submittingTruckWrap}>
              <TruckLoader showRoad={true} showText={false} size="sm" />
            </View>
          ) : null}

          {/* Error Box inside modal */}
          {errorMsg ? (
            <View style={styles.modalErrorBox} testID="otp-error-banner">
              <Text accessibilityRole="alert" style={styles.modalErrorText}>
                {errorMsg}
              </Text>
            </View>
          ) : null}

          {/* Success Box inside modal */}
          {phoneVerified ? (
            <View style={styles.verifiedSuccessBox}>
              <View style={styles.verifiedDot} />
              <Text style={styles.verifiedSuccessText}>Đã xác thực thành công!</Text>
            </View>
          ) : null}

          {/* Primary Submit CTA Button */}
          <Pressable
            accessibilityLabel="Xác nhận mã OTP"
            accessibilityRole="button"
            accessibilityState={{
              busy: phoneBusy,
              disabled: phoneBusy || otpCode.trim().length < 6 || phoneVerified,
            }}
            disabled={phoneBusy || otpCode.trim().length < 6 || phoneVerified}
            onPress={() => void verifyOtp()}
            style={({ pressed }) => [
              styles.modalSubmitBtn,
              phoneVerified && styles.modalSubmitBtnVerified,
              (otpCode.trim().length < 6 || phoneBusy) &&
                !phoneVerified &&
                styles.modalSubmitBtnDisabled,
              pressed && styles.pressed,
            ]}
            testID="cr-verify-otp"
          >
            <Text style={styles.modalSubmitBtnText}>
              {phoneVerified
                ? '✓ Đã xác thực'
                : phoneBusy
                ? 'Đang xác thực...'
                : 'Xác nhận mã OTP'}
            </Text>
          </Pressable>

          {/* Rate Limiting Resend Countdown */}
          {!phoneVerified ? (
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
                  disabled={phoneBusy}
                  hitSlop={8}
                  onPress={sendOtp}
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
    backgroundColor: '#F8FAFC',
    position: 'relative',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  bodyWrap: {
    marginTop: -20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  innerWrapper: {
    width: '100%',
    maxWidth: 520,
    gap: 16,
  },

  /* Error Banner */
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errorIcon: {
    fontSize: 16,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
  },

  /* Cards */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },

  /* Dividers & Section Groups */
  sectionDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
  sectionGroup: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },

  statusPillSuccess: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  statusPillSuccessText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803D',
  },
  statusPillWarn: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  statusPillWarnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B45309',
  },

  /* Locked Phone State */
  inputWrap: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputLocked: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lockedText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  lockedTag: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },

  /* Phone Input Container (Exact Login Luxury Style) */
  otpFormGroup: {
    gap: 10,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingLeft: 8,
    paddingRight: 6,
    height: 52,
    gap: 4,
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
    color: '#0F172A',
  },
  countryChevron: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    marginTop: -1,
  },
  badgeDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
  },
  phoneTextInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    color: '#0F172A',
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
  sendOtpBtn: {
    backgroundColor: orange.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendOtpBtnDisabled: {
    backgroundColor: '#F3C989',
  },
  sendOtpBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  clearBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },

  /* Modal Overlay & Card (Matching LoginScreen luxury style) */
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
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
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
    borderColor: '#E2E8F0',
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
    color: orange.primary,
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
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0B1E42',
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
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  otpSubline: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  otpPhoneHighlight: {
    color: '#0F172A',
    fontWeight: '700',
  },
  modalSubmitBtn: {
    width: '100%',
    backgroundColor: orange.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: orange.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  modalSubmitBtnDisabled: {
    backgroundColor: '#F3C989',
    shadowOpacity: 0,
    elevation: 0,
  },
  modalSubmitBtnVerified: {
    backgroundColor: '#16A34A',
    shadowColor: '#16A34A',
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalErrorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 10,
    width: '100%',
  },
  modalErrorText: {
    color: '#B91C1C',
    fontSize: 12.5,
    fontWeight: '600',
    textAlign: 'center',
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
  resendArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  resendCountdownText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  resendCountdownTime: {
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  resendBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  resendActionLink: {
    fontSize: 13.5,
    fontWeight: '700',
    color: orange.primary,
    textDecorationLine: 'underline',
  },

  /* Form Fields */
  fieldItem: {
    gap: 6,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  requiredStar: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 14,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500',
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        outlineWidth: 0,
      } as any,
    }),
  },
  monoInput: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1.2,
    fontWeight: '600',
  },
  inputFocused: {
    borderColor: orange.primary,
    backgroundColor: '#FFFFFF',
    shadowColor: orange.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },

  /* Consents */
  consentList: {
    gap: 4,
    marginTop: 4,
  },
  consentRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  consentRowPressed: {
    backgroundColor: '#F1F5F9',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    backgroundColor: '#FFFFFF',
  },
  checkboxOn: {
    backgroundColor: orange.primary,
    borderColor: orange.primary,
  },
  checkboxTick: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  consentTextWrap: {
    flex: 1,
  },
  consentText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
  },
  consentDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 2,
  },

  /* Primary Button */
  primaryBtn: {
    backgroundColor: orange.primary,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: orange.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnDisabled: {
    backgroundColor: '#F3C989',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  btnLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pressed: {
    opacity: 0.85,
  },

  /* Driver Link Card */
  driverCard: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    marginTop: 4,
  },
  driverCardHelper: {
    fontSize: 13,
    color: '#64748B',
  },
  driverLink: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  driverLinkText: {
    color: orange.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
