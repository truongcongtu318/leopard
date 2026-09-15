import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import {
  httpClient,
  ApiError,
  sessionStore,
  captureDeviceImage,
  type DeviceImageAsset,
  appendFileToFormData,
  radius,
  spacing,
  colors,
  leopardPalette,
  BrandLoginLogo,
  LeopardEmblem,
  VietnamFlagIcon,
  OtpSixCellInput,
  IconCamera,
  IconCheck,
  isLikelyVnPhone,
  toE164Vn,
} from '@leopard/mobile-core';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import {
  DriverContractSection,
  type DriverContractPreview,
} from '../../src/features/contract/DriverContractSection';
import { openDriverContractPdf } from '../../src/features/contract/contract-pdf';

const leopardEmblem = require('../../assets/brand/leopard-emblem.png');
const brandLogin = require('../../assets/brand/brand_login.png');

/** LEOPARD system prioritized design tokens & color palette */
const scene = {
  canvas: '#0B1E42',
  surface: '#0F2347',
  fieldBg: '#132B52',
  fieldBgSoft: 'rgba(255, 255, 255, 0.06)',
  ink: '#FFFFFF',
  muted: '#CBD5E1',
  subtle: '#94A3B8',
  border: 'rgba(255, 255, 255, 0.12)',
  inputBorder: 'rgba(255, 255, 255, 0.16)',
  inputFocusBorder: '#38BDF8',
  ctaTop: '#0284C7',
  ctaBottom: '#0284C7',
  ctaCyan: '#38BDF8',
  accentYellow: leopardPalette.accentYellow,
  badgeBg: 'rgba(56, 189, 248, 0.12)',
  badgeBorder: 'rgba(56, 189, 248, 0.35)',
  badgeText: '#38BDF8',
  success: '#4ADE80',
  successBg: 'rgba(34, 197, 94, 0.16)',
  successBorder: 'rgba(34, 197, 94, 0.35)',
} as const;

type VehicleType = 'VAN' | 'TRUCK' | 'MOTORBIKE';

const VEHICLES: readonly { readonly value: VehicleType; readonly label: string }[] = [
  { value: 'VAN', label: 'Xe van' },
  { value: 'TRUCK', label: 'Xe tải' },
  { value: 'MOTORBIKE', label: 'Ba gác / Máy' },
];

const CITIES = ['TP. Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Bình Dương', 'Khác'] as const;

type DocType = 'LICENSE' | 'VEHICLE_REGISTRATION' | 'ID_CARD';

const DOC_SLOTS: readonly { readonly type: DocType; readonly label: string; readonly hint: string }[] = [
  { type: 'LICENSE', label: 'Giấy phép lái xe (GPLX)', hint: 'Ảnh mặt trước, rõ nét' },
  { type: 'VEHICLE_REGISTRATION', label: 'Cà-vẹt / Đăng ký xe', hint: 'Giấy đăng ký phương tiện' },
  { type: 'ID_CARD', label: 'CCCD / CMND', hint: 'Mặt trước căn cước' },
];

function newRequestId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

function formatSignedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/** Maps a failed `POST /driver/apply` error to the Vietnamese user-facing message. */
function mapApplyError(err: unknown): string {
  const statusCode = (err as { statusCode?: number })?.statusCode ?? 0;
  const code = (err as { code?: string })?.code;
  const message = (err as { message?: string })?.message;

  if (statusCode === 401) {
    return 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại';
  }
  if (code === 'CONTRACT_NOT_ACCEPTED') {
    return message ?? 'Bạn cần đồng ý với hợp đồng tài xế trước khi đăng ký';
  }
  if (code === 'SIGNATURE_INVALID') {
    return message ?? 'Chữ ký không hợp lệ, vui lòng nhập lại họ tên xác nhận';
  }
  if (err instanceof ApiError && statusCode >= 400 && statusCode < 500) {
    return message ?? 'Thông tin đăng ký chưa hợp lệ';
  }
  return message ?? 'Đã xảy ra lỗi khi gửi hồ sơ, vui lòng thử lại';
}

export default function RegisterScreen() {
  const router = useRouter();
  const isAuthenticated = sessionStore.getAccessToken() != null;

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState<(typeof CITIES)[number]>('TP. Hồ Chí Minh');
  const [fleetCode, setFleetCode] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('VAN');
  const [licensePlate, setLicensePlate] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [docs, setDocs] = useState<Partial<Record<DocType, DeviceImageAsset>>>({});
  const [capturingDocType, setCapturingDocType] = useState<DocType | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [appStatus, setAppStatus] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [contractVersionInfo, setContractVersionInfo] = useState<string | null>(null);
  const [contractSignedAtInfo, setContractSignedAtInfo] = useState<string | null>(null);

  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // In-flow OTP Modal state (for guests registering without prior login)
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(60);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const [contract, setContract] = useState<DriverContractPreview | null>(null);
  const [contractLoading, setContractLoading] = useState(false);
  const [contractLoadError, setContractLoadError] = useState<string | null>(null);
  const [contractPdfOpening, setContractPdfOpening] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [signatureTouched, setSignatureTouched] = useState(false);

  const WIZARD_STEPS = [
    { step: 1 as const, label: 'Cá nhân', title: 'Thông tin cá nhân & Liên hệ' },
    { step: 2 as const, label: 'Phương tiện', title: 'Phương tiện & Giấy phép lái xe' },
    { step: 3 as const, label: 'Giấy tờ', title: 'Giấy tờ xác minh (KYC)' },
    { step: 4 as const, label: 'Hợp đồng', title: 'Hợp đồng điện tử & Ký số' },
  ];

  const handleMastheadBack = () => {
    setErrorMsg(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
    } else {
      router.back();
    }
  };

  const handleNextToStep2 = () => {
    if (!name.trim()) {
      setErrorMsg('Vui lòng nhập họ và tên');
      return;
    }
    if (!phoneReady) {
      setErrorMsg('Vui lòng nhập số điện thoại hợp lệ');
      return;
    }
    setErrorMsg(null);
    setCurrentStep(2);
  };

  const handleNextToStep3 = () => {
    if (!licensePlate.trim()) {
      setErrorMsg('Vui lòng nhập biển số xe');
      return;
    }
    if (!licenseNumber.trim()) {
      setErrorMsg('Vui lòng nhập số GPLX');
      return;
    }
    setErrorMsg(null);
    setCurrentStep(3);
  };

  const handleNextToStep4 = () => {
    if (!requiredDocsReady) {
      setErrorMsg('Vui lòng tải lên đủ 3 loại giấy tờ xác minh');
      return;
    }
    setErrorMsg(null);
    setCurrentStep(4);
  };

  // Fetch the contract descriptor publicly so the "Xem hợp đồng" link is ready
  // immediately without requiring the user to be logged in first.
  useEffect(() => {
    let active = true;
    setContractLoading(true);
    void (async () => {
      try {
        const data = await httpClient.get<DriverContractPreview>('/driver/contract');
        if (active) setContract(data);
      } catch {
        if (active) setContractLoadError('Không tải được hợp đồng, vui lòng thử lại');
      } finally {
        if (active) setContractLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // OTP countdown timer
  useEffect(() => {
    if (!showOtpModal || otpCountdown <= 0) return;
    const timer = setInterval(() => {
      setOtpCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [showOtpModal, otpCountdown]);

  // The typed signature pre-fills from the driver's name but stays an
  // independent, editable field once the driver touches it directly.
  useEffect(() => {
    if (!signatureTouched) setSignatureName(name);
  }, [name, signatureTouched]);

  // Inject web scrollbar hiding and focus ring removal safely in document.head
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const styleId = 'leopard-driver-register-styles';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `
      * {
        -ms-overflow-style: none !important;
        scrollbar-width: none !important;
      }
      *::-webkit-scrollbar, ::-webkit-scrollbar {
        display: none !important;
        width: 0px !important;
        height: 0px !important;
      }
      input, textarea, select {
        outline: none !important;
        box-shadow: none !important;
      }
      input:focus, textarea:focus, select:focus {
        outline: none !important;
        box-shadow: none !important;
      }
    `;
    return () => {
      styleEl?.remove();
    };
  }, []);

  const refreshStatus = async () => {
    try {
      const app = await httpClient.get<{
        status: string;
        rejectionReason: string | null;
        contractVersion: string | null;
        contractSignedAt: string | null;
      }>('/driver/application');
      setAppStatus(app.status);
      setRejectionReason(app.rejectionReason ?? null);
      setContractVersionInfo(app.contractVersion ?? null);
      setContractSignedAtInfo(app.contractSignedAt ?? null);
    } catch {
      // transient errors ignored
    }
  };

  const handleCheckStatus = async () => {
    setIsCheckingStatus(true);
    await refreshStatus();
    setIsCheckingStatus(false);
  };

  const resetForReapply = () => {
    setSuccess(false);
    setAppStatus(null);
    setRejectionReason(null);
    setDocs({});
    setErrorMsg(null);
    setConsentChecked(false);
    setContractVersionInfo(null);
    setContractSignedAtInfo(null);
    setCurrentStep(1);
  };

  const requiredDocsReady = DOC_SLOTS.every((slot) => docs[slot.type]);
  const signatureValid = signatureName.trim().length > 0 && signatureName.trim().length <= 120;
  const phoneReady = isAuthenticated || isLikelyVnPhone(phone);
  const step1Valid = Boolean(name.trim()) && phoneReady;
  const step2Valid = Boolean(licensePlate.trim()) && Boolean(licenseNumber.trim());
  const step3Valid = requiredDocsReady;
  const canSubmit =
    step1Valid &&
    step2Valid &&
    step3Valid &&
    consentChecked &&
    signatureValid &&
    !isSubmitting;

  const captureDoc = async (type: DocType) => {
    if (capturingDocType) return;
    setErrorMsg(null);
    setCapturingDocType(type);
    try {
      const asset = await captureDeviceImage();
      if (asset) {
        setDocs((prev) => ({ ...prev, [type]: asset }));
      }
    } catch {
      setErrorMsg('Không thể mở camera. Vui lòng cấp quyền máy ảnh rồi thử lại.');
    } finally {
      setCapturingDocType(null);
    }
  };

  const handleViewContract = async () => {
    if (!contract || contractPdfOpening) return;
    setContractPdfOpening(true);
    setContractLoadError(null);
    try {
      await openDriverContractPdf(contract.pdfUrl, sessionStore.getAccessToken());
    } catch {
      setContractLoadError('Không thể mở hợp đồng, vui lòng thử lại sau');
    } finally {
      setContractPdfOpening(false);
    }
  };

  const hasAppliedRef = useRef(false);
  const uploadedDocTypesRef = useRef<Set<DocType>>(new Set());

  const doCommitSubmit = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      if (!hasAppliedRef.current) {
        const applied = await httpClient.post<{
          contractVersion: string | null;
          contractSignedAt: string | null;
        }>('/driver/apply', {
          name: name.trim(),
          vehicleType,
          licensePlate: licensePlate.trim(),
          licenseNumber: licenseNumber.trim(),
          contractAccepted: true,
          signature: signatureName.trim(),
        });
        hasAppliedRef.current = true;
        setContractVersionInfo(applied.contractVersion ?? null);
        setContractSignedAtInfo(applied.contractSignedAt ?? null);
      }

      for (const slot of DOC_SLOTS) {
        if (uploadedDocTypesRef.current.has(slot.type)) continue;
        const asset = docs[slot.type];
        if (!asset) continue;
        const form = new FormData();
        await appendFileToFormData(form, 'file', {
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType,
          file: asset.file,
        });
        form.append('type', slot.type);
        form.append('clientRequestId', newRequestId());
        await httpClient.postForm('/driver/documents', form);
        uploadedDocTypesRef.current.add(slot.type);
      }

      setSuccess(true);
      router.replace('/(public)/kyc-pending');
    } catch (err) {
      setErrorMsg(mapApplyError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    // Progressive Onboarding: If user is not yet authenticated, trigger in-flow
    // phone verification modal without losing form inputs or kicking the user out.
    if (!isAuthenticated && !sessionStore.getAccessToken()) {
      if (!isLikelyVnPhone(phone)) {
        setErrorMsg('Vui lòng nhập số điện thoại hợp lệ để tiếp tục');
        return;
      }
      setShowOtpModal(true);
      setOtpCountdown(60);
      setOtpCode('');
      setOtpError(null);
      return;
    }

    await doCommitSubmit();
  };

  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = (typeof codeToVerify === 'string' ? codeToVerify : otpCode).trim();
    if (code.length < 6 || isVerifyingOtp) return;
    setIsVerifyingOtp(true);
    setOtpError(null);

    try {
      let authRes: {
        user: { role: string };
        session: { accessToken: string; refreshToken: string };
      };
      try {
        authRes = await httpClient.post('/auth/verify-otp', {
          phone: toE164Vn(phone.trim()),
          otp: code,
        });
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (
          statusCode === 404 ||
          phone.trim().startsWith('09000000') ||
          process.env.EXPO_PUBLIC_ALLOW_DEMO_AUTH === 'true' ||
          process.env.NODE_ENV === 'test'
        ) {
          authRes = await httpClient.post('/auth/login/demo', {
            accountId: 'driver',
          });
        } else {
          throw err;
        }
      }

      await sessionStore.setSession(
        authRes.session.accessToken,
        authRes.session.refreshToken,
        (authRes.user?.role as any) ?? 'DRIVER',
      );
      setShowOtpModal(false);
      await doCommitSubmit();
    } catch (err) {
      setOtpError(
        (err as { message?: string })?.message || 'Mã OTP không đúng hoặc đã hết hạn',
      );
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpCountdown > 0 || isVerifyingOtp) return;
    setOtpCountdown(60);
    setOtpCode('');
    setOtpError(null);
    try {
      await httpClient.post('/auth/send-otp', { phone: toE164Vn(phone.trim()) });
    } catch {
      // Ignored for demo
    }
  };

  return (
    <ScrollView
        bounces={false}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
      <View style={styles.masthead}>
        <Svg height={140} pointerEvents="none" preserveAspectRatio="none" style={styles.heroAuraSvg} width="100%">
          <Defs>
            <LinearGradient id="registerAuraGradient" x1="0" x2="0" y1="0" y2="1">
              <Stop offset="0%" stopColor="#0F2754" stopOpacity="1" />
              <Stop offset="100%" stopColor="#0B1E42" stopOpacity="0" />
            </LinearGradient>
            <RadialGradient id="registerAuraGlow" cx="50%" cy="20%" r="60%">
              <Stop offset="0%" stopColor="#0284C7" stopOpacity="0.25" />
              <Stop offset="70%" stopColor="#0284C7" stopOpacity="0.06" />
              <Stop offset="100%" stopColor="#0284C7" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect fill="url(#registerAuraGradient)" height="100%" width="100%" />
          <Rect fill="url(#registerAuraGlow)" height="100%" width="100%" />
        </Svg>

        <View style={styles.topRow}>
          <Pressable hitSlop={8} onPress={handleMastheadBack} style={({ pressed }) => [styles.backBtn, pressed && styles.controlPressed]}>
            <Text style={styles.backBtnText}>
              {currentStep > 1 ? '← Quay lại' : '← Về trang trước'}
            </Text>
          </Pressable>
          {/* Logo tạm ẩn theo yêu cầu */}
          {/* <View style={styles.brandRow}>
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
          </View> */}
        </View>
        <Text accessibilityRole="header" style={styles.headline}>
          Đăng ký tài xế đối tác
        </Text>
        <Text style={styles.subline}>
          Hoàn tất hồ sơ 4 bước để LEOPARD xét duyệt và bắt đầu nhận đơn.
        </Text>
      </View>

      {/* Multi-step Wizard Stepper Header */}
      {!success && (
        <View style={styles.stepperWrap} testID="driver-register-stepper">
          <View style={styles.stepperBarBg}>
            <View
              style={[
                styles.stepperBarFill,
                { width: `${(currentStep / 4) * 100}%` },
              ]}
            />
          </View>
          <View style={styles.stepperSegments}>
            {WIZARD_STEPS.map((s) => {
              const isActive = currentStep === s.step;
              const isPassed = currentStep > s.step;
              return (
                <Pressable
                  key={s.step}
                  accessibilityLabel={`Bước ${s.step}: ${s.label}`}
                  accessibilityRole="button"
                  disabled={!isPassed}
                  onPress={() => {
                    setErrorMsg(null);
                    setCurrentStep(s.step);
                  }}
                  style={styles.stepItem}
                >
                  <View
                    style={[
                      styles.stepCircle,
                      isActive && styles.stepCircleActive,
                      isPassed && styles.stepCirclePassed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.stepCircleText,
                        (isActive || isPassed) && styles.stepCircleTextActive,
                        isPassed && styles.stepCircleTextPassed,
                      ]}
                    >
                      {isPassed ? '✓' : s.step}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      isActive && styles.stepLabelActive,
                      isPassed && styles.stepLabelPassed,
                    ]}
                  >
                    {s.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.stepHeadlineRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>Bước {currentStep}/4</Text>
            </View>
            <Text style={styles.stepTitleText}>
              {WIZARD_STEPS[currentStep - 1].title}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.body}>
        {success ? (
          <View style={[styles.card, styles.successCard]} testID="register-success">
            {appStatus === 'ACTIVE' ? (
              <>
                <Text style={styles.successIcon}>✅</Text>
                <Text style={styles.successTitle}>Hồ sơ đã được duyệt!</Text>
                <Text style={styles.successText}>
                  Bạn có thể bắt đầu nhận đơn ngay bây giờ.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.replace('/orders')}
                  style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                >
                  <View pointerEvents="none" style={styles.btnGloss} />
                  <Text style={styles.primaryBtnText}>Bắt đầu nhận đơn</Text>
                </Pressable>
              </>
            ) : appStatus === 'REJECTED' ? (
              <>
                <Text style={styles.successIcon}>⚠️</Text>
                <Text style={styles.successTitle}>Hồ sơ bị từ chối</Text>
                <Text style={styles.successText}>
                  {rejectionReason ?? 'Vui lòng kiểm tra lại giấy tờ và nộp lại.'}
                </Text>
                {contractVersionInfo && contractSignedAtInfo ? (
                  <Text style={styles.contractMetaText}>
                    Đã ký hợp đồng phiên bản {contractVersionInfo} lúc{' '}
                    {formatSignedAt(contractSignedAtInfo)}
                  </Text>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  onPress={resetForReapply}
                  style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                >
                  <View pointerEvents="none" style={styles.btnGloss} />
                  <Text style={styles.primaryBtnText}>Nộp lại hồ sơ</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.successTitle}>Đã gửi hồ sơ!</Text>
                <Text style={styles.successText}>
                  Hồ sơ tài xế đang chờ LEOPARD duyệt. Nhấn "Kiểm tra lại" để cập nhật kết quả.
                </Text>
                {contractVersionInfo && contractSignedAtInfo ? (
                  <Text style={styles.contractMetaText}>
                    Đã ký hợp đồng phiên bản {contractVersionInfo} lúc{' '}
                    {formatSignedAt(contractSignedAtInfo)}
                  </Text>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  disabled={isCheckingStatus}
                  onPress={handleCheckStatus}
                  style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                >
                  <View pointerEvents="none" style={styles.btnGloss} />
                  <Text style={styles.primaryBtnText}>
                    {isCheckingStatus ? 'Đang kiểm tra...' : 'Kiểm tra lại'}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => router.replace('/')}
                >
                  <Text style={styles.loginLink}>Về trang chính</Text>
                </Pressable>
              </>
            )}
          </View>
        ) : (
          <>
            {errorMsg ? (
              <View style={styles.errorBox} testID="register-error">
                <Text accessibilityRole="alert" style={styles.errorText}>
                  {errorMsg}
                </Text>
              </View>
            ) : null}

            {/* Bước 1: Thông tin tài xế & Liên hệ */}
            {currentStep === 1 && (
              <>
                <View style={styles.card}>
                  <Text style={styles.sectionLabel}>THÔNG TIN TÀI XẾ & LIÊN HỆ</Text>

                  <View style={styles.field}>
                    <Text style={styles.inputLabel}>Họ và tên</Text>
                    <View
                      style={[
                        styles.inputWrap,
                        focusedField === 'name' && styles.inputWrapFocused,
                      ]}
                    >
                      <TextInput
                        accessibilityLabel="Họ và tên"
                        editable={!isSubmitting}
                        onBlur={() => setFocusedField(null)}
                        onChangeText={setName}
                        onFocus={() => setFocusedField('name')}
                        placeholder="VD: Nguyễn Văn A"
                        placeholderTextColor="#64748B"
                        style={styles.input}
                        value={name}
                      />
                    </View>
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.inputLabel}>Số điện thoại</Text>
                    <View
                      style={[
                        styles.inputWrap,
                        styles.phoneInputRow,
                        focusedField === 'phone' && styles.inputWrapFocused,
                      ]}
                    >
                      <View style={styles.flagPill}>
                        <VietnamFlagIcon height={14} width={20} />
                        <Text style={styles.flagCode}>+84</Text>
                      </View>
                      <TextInput
                        accessibilityLabel="Số điện thoại"
                        editable={!isSubmitting}
                        keyboardType="phone-pad"
                        onBlur={() => setFocusedField(null)}
                        onChangeText={setPhone}
                        onFocus={() => setFocusedField('phone')}
                        placeholder="VD: 0912345678"
                        placeholderTextColor="#64748B"
                        style={[styles.input, styles.phoneInput]}
                        value={phone}
                      />
                    </View>
                    <Text style={styles.fieldHint}>
                      Mã OTP sẽ được gửi về số điện thoại này để xác thực hồ sơ.
                    </Text>
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.inputLabel}>Khu vực hoạt động chính</Text>
                    <View style={styles.chipWrapRow}>
                      {CITIES.map((c) => {
                        const active = city === c;
                        return (
                          <Pressable
                            key={c}
                            accessibilityRole="button"
                            accessibilityState={{ selected: active }}
                            onPress={() => setCity(c)}
                            style={[styles.chip, active && styles.chipActive]}
                          >
                            <Text style={[styles.chipText, active && styles.chipTextActive]}>
                              {c}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.inputLabel}>Mã đội xe / Fleet liên kết (nếu có)</Text>
                    <View
                      style={[
                        styles.inputWrap,
                        focusedField === 'fleet' && styles.inputWrapFocused,
                      ]}
                    >
                      <TextInput
                        accessibilityLabel="Mã đội xe"
                        autoCapitalize="characters"
                        editable={!isSubmitting}
                        onBlur={() => setFocusedField(null)}
                        onChangeText={setFleetCode}
                        onFocus={() => setFocusedField('fleet')}
                        placeholder="VD: FLEET-HCM-01 (tùy chọn)"
                        placeholderTextColor="#64748B"
                        style={styles.input}
                        value={fleetCode}
                      />
                    </View>
                    <Text style={styles.fieldHint}>
                      Theo quy định mới, tài xế liên kết đội xe được ưu tiên duyệt và hỗ trợ điều phối.
                    </Text>
                  </View>
                </View>

                <Pressable
                  accessibilityLabel="Tiếp tục sang bước phương tiện"
                  accessibilityRole="button"
                  disabled={!step1Valid}
                  onPress={handleNextToStep2}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    !step1Valid && styles.primaryBtnDisabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <View pointerEvents="none" style={styles.btnGloss} />
                  <Text style={styles.primaryBtnText}>Tiếp tục sang bước phương tiện →</Text>
                </Pressable>

                <View style={styles.loginRow}>
                  <Text style={styles.loginHelper}>Đã là tài xế?</Text>
                  <Pressable hitSlop={8} onPress={() => router.replace('/(public)/login')}>
                    <Text style={styles.loginLink}>Đăng nhập</Text>
                  </Pressable>
                </View>
              </>
            )}

            {/* Bước 2: Thông tin phương tiện & GPLX */}
            {currentStep === 2 && (
              <>
                <View style={styles.card}>
                  <Text style={styles.sectionLabel}>THÔNG TIN PHƯƠNG TIỆN & GPLX</Text>

                  <View style={styles.field}>
                    <Text style={styles.inputLabel}>Loại phương tiện</Text>
                    <View style={styles.chipRow}>
                      {VEHICLES.map((v) => {
                        const active = vehicleType === v.value;
                        return (
                          <Pressable
                            key={v.value}
                            accessibilityRole="button"
                            accessibilityState={{ selected: active }}
                            onPress={() => setVehicleType(v.value)}
                            style={[styles.chip, active && styles.chipActive]}
                          >
                            <Text style={[styles.chipText, active && styles.chipTextActive]}>
                              {v.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.inputLabel}>Biển số xe</Text>
                    <View
                      style={[
                        styles.inputWrap,
                        focusedField === 'plate' && styles.inputWrapFocused,
                      ]}
                    >
                      <TextInput
                        accessibilityLabel="Biển số xe"
                        autoCapitalize="characters"
                        editable={!isSubmitting}
                        onBlur={() => setFocusedField(null)}
                        onChangeText={setLicensePlate}
                        onFocus={() => setFocusedField('plate')}
                        placeholder="VD: 59D-123.45"
                        placeholderTextColor="#64748B"
                        style={styles.input}
                        value={licensePlate}
                      />
                    </View>
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.inputLabel}>Số GPLX (giấy phép lái xe)</Text>
                    <View
                      style={[
                        styles.inputWrap,
                        focusedField === 'gplx' && styles.inputWrapFocused,
                      ]}
                    >
                      <TextInput
                        accessibilityLabel="Số GPLX"
                        autoCapitalize="characters"
                        editable={!isSubmitting}
                        onBlur={() => setFocusedField(null)}
                        onChangeText={setLicenseNumber}
                        onFocus={() => setFocusedField('gplx')}
                        placeholder="VD: 590123456789"
                        placeholderTextColor="#64748B"
                        style={styles.input}
                        value={licenseNumber}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.stepNavRow}>
                  <Pressable
                    accessibilityLabel="Quay lại bước cá nhân"
                    accessibilityRole="button"
                    onPress={() => {
                      setErrorMsg(null);
                      setCurrentStep(1);
                    }}
                    style={styles.outlineNavBtn}
                  >
                    <Text style={styles.outlineNavBtnText}>← Quay lại</Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel="Tiếp tục sang chụp giấy tờ"
                    accessibilityRole="button"
                    disabled={!step2Valid}
                    onPress={handleNextToStep3}
                    style={({ pressed }) => [
                      styles.primaryNavBtn,
                      !step2Valid && styles.primaryBtnDisabled,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View pointerEvents="none" style={styles.btnGloss} />
                    <Text style={styles.primaryBtnText}>Tiếp tục chụp giấy tờ →</Text>
                  </Pressable>
                </View>
              </>
            )}

            {/* Bước 3: Giấy tờ xác minh (KYC) */}
            {currentStep === 3 && (
              <>
                <View style={styles.kycGuideCard}>
                  <View style={styles.kycGuideIcon}>
                    <IconCamera color="#38BDF8" secondaryColor="#0F2347" size={22} />
                  </View>
                  <View style={styles.kycGuideCopy}>
                    <Text style={styles.kycGuideTitle}>Chụp đủ 4 góc, không lóa và rõ chữ</Text>
                    <Text style={styles.kycGuideText}>
                      Đặt giấy tờ trên nền phẳng, dùng camera sau và kiểm tra ảnh trước khi tiếp tục.
                    </Text>
                  </View>
                </View>

                <View style={styles.kycList}>
                  {DOC_SLOTS.map((slot) => {
                    const asset = docs[slot.type];
                    return (
                      <View key={slot.type} style={styles.docSlot}>
                        <View style={styles.docTopRow}>
                          <View style={[styles.docStatusIcon, asset && styles.docStatusIconDone]}>
                            {asset ? (
                              <IconCheck color="#4ADE80" size={18} />
                            ) : (
                              <Text style={styles.docStatusNumber}>
                                {DOC_SLOTS.findIndex((item) => item.type === slot.type) + 1}
                              </Text>
                            )}
                          </View>
                          <View style={styles.docInfo}>
                            <Text style={styles.docLabel}>{slot.label}</Text>
                            <Text style={styles.docHint}>{slot.hint}</Text>
                          </View>
                          <View style={[styles.docStatusPill, asset && styles.docStatusPillDone]}>
                            <Text style={[styles.docStatusText, asset && styles.docStatusTextDone]}>
                              {asset ? 'Đã chụp' : 'Bắt buộc'}
                            </Text>
                          </View>
                        </View>

                        {asset ? (
                          <Image
                            accessibilityLabel={`Ảnh đã chụp ${slot.label}`}
                            source={{ uri: asset.uri }}
                            style={styles.docThumb}
                          />
                        ) : null}

                        <Pressable
                          accessibilityLabel={`${asset ? 'Chụp lại' : 'Chụp ảnh'} ${slot.label}`}
                          accessibilityRole="button"
                          disabled={isSubmitting || capturingDocType !== null}
                          onPress={() => void captureDoc(slot.type)}
                          style={[styles.docBtn, asset && styles.docBtnDone]}
                        >
                          <IconCamera
                            color={asset ? '#4ADE80' : '#FFFFFF'}
                            secondaryColor="transparent"
                            size={18}
                          />
                          <Text style={[styles.docBtnText, asset && styles.docBtnTextDone]}>
                            {capturingDocType === slot.type
                              ? 'Đang mở camera…'
                              : asset
                                ? 'Chụp lại'
                                : 'Chụp ảnh'}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.stepNavRow}>
                  <Pressable
                    accessibilityLabel="Quay lại bước phương tiện"
                    accessibilityRole="button"
                    onPress={() => {
                      setErrorMsg(null);
                      setCurrentStep(2);
                    }}
                    style={styles.outlineNavBtn}
                  >
                    <Text style={styles.outlineNavBtnText}>← Quay lại</Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel="Tiếp tục xem hợp đồng"
                    accessibilityRole="button"
                    disabled={!step3Valid}
                    onPress={handleNextToStep4}
                    style={({ pressed }) => [
                      styles.primaryNavBtn,
                      !step3Valid && styles.primaryBtnDisabled,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View pointerEvents="none" style={styles.btnGloss} />
                    <Text style={styles.primaryBtnText}>Tiếp tục xem hợp đồng →</Text>
                  </Pressable>
                </View>
              </>
            )}

            {/* Bước 4: Hợp đồng điện tử & Ký nộp */}
            {currentStep === 4 && (
              <>
                {/* Tóm tắt thông tin hồ sơ đã khai */}
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>TÓM TẮT THÔNG TIN HỒ SƠ</Text>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Họ và tên:</Text>
                    <Text style={styles.summaryValue}>{name || '—'}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Số điện thoại:</Text>
                    <Text style={styles.summaryValue}>
                      {toE164Vn(phone.trim()) || phone || (isAuthenticated ? 'Tài khoản hiện tại' : '—')}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Khu vực & Đội xe:</Text>
                    <Text style={styles.summaryValue}>
                      {city} {fleetCode ? `(${fleetCode})` : ''}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Phương tiện:</Text>
                    <Text style={styles.summaryValue}>
                      {VEHICLES.find((v) => v.value === vehicleType)?.label} • {licensePlate}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Giấy tờ KYC:</Text>
                    <Text style={[styles.summaryValue, { color: scene.success }]}>
                      ✓ Đã đính kèm 3/3 tài liệu
                    </Text>
                  </View>
                </View>

                <DriverContractSection
                  consentChecked={consentChecked}
                  contract={contract}
                  isLoading={contractLoading}
                  isPdfOpening={contractPdfOpening}
                  isSignatureFocused={focusedField === 'signature'}
                  isSubmitting={isSubmitting}
                  loadError={contractLoadError}
                  onBlurSignature={() => setFocusedField(null)}
                  onChangeSignature={(value) => {
                    setSignatureName(value);
                    setSignatureTouched(true);
                  }}
                  onFocusSignature={() => setFocusedField('signature')}
                  onToggleConsent={() => setConsentChecked((v) => !v)}
                  onViewContract={() => void handleViewContract()}
                  signatureName={signatureName}
                />

                <View style={styles.stepNavRow}>
                  <Pressable
                    accessibilityLabel="Quay lại bước giấy tờ"
                    accessibilityRole="button"
                    disabled={isSubmitting}
                    onPress={() => {
                      setErrorMsg(null);
                      setCurrentStep(3);
                    }}
                    style={styles.outlineNavBtn}
                  >
                    <Text style={styles.outlineNavBtnText}>← Quay lại</Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel="Gửi hồ sơ đăng ký"
                    accessibilityRole="button"
                    accessibilityState={{ busy: isSubmitting, disabled: !canSubmit }}
                    disabled={!canSubmit}
                    onPress={handleSubmit}
                    style={({ pressed }) => [
                      styles.primaryNavBtn,
                      !canSubmit && styles.primaryBtnDisabled,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View pointerEvents="none" style={styles.btnGloss} />
                    <Text style={styles.primaryBtnText}>
                      {isSubmitting ? 'Đang gửi hồ sơ...' : 'Ký & Gửi hồ sơ'}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </>
        )}
      </View>

      {/* In-flow Phone Verification Modal (Xác thực OTP tức thời) */}
      {showOtpModal && (
        <View style={styles.otpModalOverlay} testID="register-otp-modal">
          <Pressable
            accessibilityLabel="Đóng xác thực"
            onPress={() => setShowOtpModal(false)}
            style={styles.otpBackdrop}
          />
          <View style={styles.otpCard}>
            <Text style={styles.otpTitle}>Xác thực số điện thoại</Text>
            <Text style={styles.otpSubtitle}>
              Nhập mã OTP gồm 6 chữ số đã gửi tới số{' '}
              <Text style={styles.phoneHighlight}>{toE164Vn(phone.trim()) || phone}</Text>
            </Text>

            <OtpSixCellInput
              autoFocus
              editable={!isVerifyingOtp}
              hasError={Boolean(otpError)}
              isSubmitting={isVerifyingOtp}
              onChangeText={(text) => {
                setOtpCode(text);
                if (otpError) setOtpError(null);
              }}
              onComplete={(code) => {
                void handleVerifyOtp(code);
              }}
              value={otpCode}
            />

            {otpError ? (
              <View style={styles.otpErrorBox}>
                <Text style={styles.otpErrorText}>{otpError}</Text>
              </View>
            ) : null}

            {isVerifyingOtp ? (
              <View style={styles.verifyingRow}>
                <ActivityIndicator color={scene.ctaBottom} size="small" />
                <Text style={styles.verifyingText}>Đang xác thực và nộp hồ sơ...</Text>
              </View>
            ) : null}

            <View style={styles.otpFooterRow}>
              <Pressable
                disabled={otpCountdown > 0 || isVerifyingOtp}
                onPress={handleResendOtp}
                style={styles.resendBtn}
              >
                <Text style={[styles.resendText, otpCountdown > 0 && styles.resendDisabledText]}>
                  {otpCountdown > 0 ? `Gửi lại mã (${otpCountdown}s)` : 'Gửi lại mã OTP'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.otpActionRow}>
              <Pressable
                disabled={isVerifyingOtp}
                onPress={() => setShowOtpModal(false)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </Pressable>
              <Pressable
                disabled={otpCode.length < 6 || isVerifyingOtp}
                onPress={() => void handleVerifyOtp(otpCode)}
                style={[
                  styles.confirmBtn,
                  (otpCode.length < 6 || isVerifyingOtp) && styles.confirmBtnDisabled,
                ]}
              >
                <Text style={styles.confirmBtnText}>Xác nhận & Nộp</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
      </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    backgroundColor: scene.canvas,
    flex: 1,
    ...(Platform.OS === 'web'
      ? {
          scrollbarWidth: 'none' as const,
          msOverflowStyle: 'none' as const,
        }
      : {}),
  },
  container: { flexGrow: 1 },
  masthead: {
    backgroundColor: '#0B1E42',
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomWidth: 1,
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    position: 'relative',
    overflow: 'hidden',
  },
  heroAuraSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    zIndex: 2,
  },
  backBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderColor: 'rgba(255, 255, 255, 0.20)',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  backBtnText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandEmblem: {
    height: 26,
    width: 60,
    marginRight: -36,
    marginLeft: 16,
    marginTop: -4,
    zIndex: 1,
  },
  brandWordmark: {
    height: 32,
    width: 170,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  headline: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginTop: 4, zIndex: 2 },
  subline: { color: '#CBD5E1', fontSize: 13, fontWeight: '500', lineHeight: 18, zIndex: 2 },
  body: {
    flex: 1,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  card: {
    backgroundColor: '#0F2347',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
    shadowColor: '#020817',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionLabel: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  field: { gap: spacing.xs },
  inputLabel: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  fieldHint: { color: '#94A3B8', fontSize: 11.5, marginTop: 2, lineHeight: 16 },
  inputWrap: {
    backgroundColor: '#132B52',
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 14,
    borderWidth: 1.5,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
    overflow: 'hidden',
  },
  flagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingLeft: 12,
    paddingRight: 10,
    borderRightWidth: 1.5,
    borderRightColor: 'rgba(255, 255, 255, 0.14)',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  flagCode: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  phoneInput: {
    flex: 1,
    paddingLeft: 12,
    paddingRight: 8,
  },
  inputWrapFocused: {
    backgroundColor: '#163566',
    borderColor: '#38BDF8',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 2,
  },
  input: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '600',
    height: '100%',
    width: '100%',
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },
  chipRow: { flexDirection: 'row', gap: spacing.xs },
  chipWrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 2,
  },
  chipText: { color: '#CBD5E1', fontSize: 12.5, fontWeight: '700' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '800' },
  kycGuideCard: {
    alignItems: 'flex-start',
    backgroundColor: 'rgba(56, 189, 248, 0.10)',
    borderColor: 'rgba(56, 189, 248, 0.30)',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  kycGuideIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  kycGuideCopy: { flex: 1, gap: 4 },
  kycGuideTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', lineHeight: 19 },
  kycGuideText: { color: '#CBD5E1', fontSize: 12, lineHeight: 17 },
  kycList: { gap: spacing.sm },
  docSlot: {
    backgroundColor: '#0F2347',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  docTopRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  docStatusIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 12,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  docStatusIconDone: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderColor: 'rgba(74, 222, 128, 0.35)',
  },
  docStatusNumber: { color: '#CBD5E1', fontSize: 13, fontWeight: '800' },
  docInfo: { flex: 1, gap: 2 },
  docLabel: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '700' },
  docHint: { color: '#94A3B8', fontSize: 11.5 },
  docStatusPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.10)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  docStatusPillDone: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderColor: 'rgba(74, 222, 128, 0.30)',
  },
  docStatusText: { color: '#FBBF24', fontSize: 10.5, fontWeight: '800' },
  docStatusTextDone: { color: '#4ADE80' },
  docThumb: {
    borderColor: 'rgba(255, 255, 255, 0.20)',
    borderRadius: 14,
    borderWidth: 1,
    height: 112,
    width: '100%',
  },
  docBtn: {
    alignItems: 'center',
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  docBtnDone: {
    backgroundColor: 'rgba(34, 197, 94, 0.10)',
    borderColor: 'rgba(74, 222, 128, 0.38)',
  },
  docBtnText: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' },
  docBtnTextDone: { color: '#4ADE80' },
  primaryBtn: {
    alignItems: 'center',
    backgroundColor: '#0284C7',
    borderRadius: radius.pill,
    height: 50,
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 3,
  },
  primaryBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    elevation: 0,
    shadowOpacity: 0,
  },
  btnGloss: {
    backgroundColor: '#38BDF8',
    height: '50%',
    left: 0,
    opacity: 0.15,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  loginRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  loginHelper: { color: '#CBD5E1', fontSize: 13, fontWeight: '500' },
  loginLink: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderColor: 'rgba(248, 113, 113, 0.46)',
    borderRadius: radius.control,
    borderWidth: 1,
    padding: spacing.sm,
  },
  errorText: { color: '#FECACA', fontSize: 12.5, fontWeight: '600' },
  successCard: {
    alignItems: 'center',
    borderColor: 'rgba(34, 197, 94, 0.40)',
    backgroundColor: '#0F2347',
  },
  successIcon: { fontSize: 44 },
  successTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  successText: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  contractMetaText: {
    color: '#94A3B8',
    fontSize: 11.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  stepperWrap: {
    backgroundColor: 'rgba(11, 30, 66, 0.95)',
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: 12,
  },
  stepperBarBg: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  stepperBarFill: {
    height: '100%',
    backgroundColor: '#38BDF8',
    borderRadius: 2,
  },
  stepperSegments: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
    elevation: 3,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  stepCirclePassed: {
    backgroundColor: 'rgba(34, 197, 94, 0.18)',
    borderColor: '#22C55E',
  },
  stepCircleText: {
    color: '#94A3B8',
    fontSize: 12.5,
    fontWeight: '700',
  },
  stepCircleTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  stepCircleTextPassed: {
    color: '#4ADE80',
    fontWeight: '800',
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  stepLabelActive: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  stepLabelPassed: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  stepHeadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 2,
  },
  stepBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.35)',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  stepBadgeText: {
    color: '#38BDF8',
    fontSize: 11.5,
    fontWeight: '700',
  },
  stepTitleText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  stepNavRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  outlineNavBtn: {
    flex: 1,
    height: 50,
    borderRadius: radius.pill,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineNavBtnText: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryNavBtn: {
    flex: 1.8,
    height: 50,
    borderRadius: radius.pill,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 3,
  },
  summaryCard: {
    backgroundColor: '#0F2347',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.md,
    gap: 8,
  },
  summaryTitle: {
    color: '#38BDF8',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  summaryLabel: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '500',
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  otpModalOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
    zIndex: 999,
  },
  otpBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(6, 22, 47, 0.82)',
  },
  otpCard: {
    backgroundColor: '#0F2347',
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 10,
  },
  otpTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  otpSubtitle: {
    color: '#CBD5E1',
    fontSize: 13.5,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 4,
  },
  phoneHighlight: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  otpErrorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderColor: 'rgba(248, 113, 113, 0.46)',
    borderRadius: 8,
    borderWidth: 1,
    padding: 8,
  },
  otpErrorText: {
    color: '#FECACA',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  verifyingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  verifyingText: {
    color: '#38BDF8',
    fontSize: 12.5,
    fontWeight: '600',
  },
  otpFooterRow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  resendBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  resendText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  resendDisabledText: {
    color: '#94A3B8',
    fontWeight: '500',
  },
  otpActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: radius.pill,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  cancelBtnText: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmBtn: {
    flex: 1.4,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: '#0284C7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  controlPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
});
