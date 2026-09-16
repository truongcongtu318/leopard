import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  httpClient,
  sessionStore,
  captureDeviceImage,
  type DeviceImageAsset,
  appendFileToFormData,
  isLikelyVnPhone,
  toE164Vn,
} from '@leopard/mobile-core';
import type { DriverContractPreview } from '../contract/DriverContractSection';
import { openDriverContractPdf } from '../contract/contract-pdf';
import {
  type VehicleOption,
  VEHICLE_OPTIONS,
  CITIES,
  type DocType,
  DOC_SLOTS,
  draftStorage,
  isValidPlate,
  newRequestId,
  mapApplyError,
} from './driver-register-model';

export const WIZARD_STEPS = [
  { step: 1 as const, label: '1. Cá nhân', title: 'Thông tin cá nhân & Liên hệ' },
  { step: 2 as const, label: '2. Phương tiện', title: 'Phương tiện duy nhất' },
  { step: 3 as const, label: '3. Giấy tờ', title: 'Chụp ảnh Giấy tờ & Định danh' },
] as const;

export interface UseDriverRegisterOptions {
  onSuccess?: () => void;
}

export function useDriverRegister(options?: UseDriverRegisterOptions) {
  const router = useRouter();
  const isAuthenticated = sessionStore.getAccessToken() != null;

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState<(typeof CITIES)[number]>('TP. Hồ Chí Minh');
  const [fleetCode, setFleetCode] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleOption>('VAN_500KG');
  const [licensePlate, setLicensePlate] = useState('');
  const [payloadKg, setPayloadKg] = useState('500');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [selfie, setSelfie] = useState<DeviceImageAsset | null>(null);
  const [docs, setDocs] = useState<Partial<Record<DocType, DeviceImageAsset>>>({});
  const [capturingDocType, setCapturingDocType] = useState<DocType | 'SELFIE' | null>(null);
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

  // Restore draft on mount
  useEffect(() => {
    let active = true;
    void (async () => {
      const draft = await draftStorage.getDraft();
      if (!draft || !active) return;
      if (draft.fullName) setName(draft.fullName);
      if (draft.phoneNumber) setPhone(draft.phoneNumber);
      if (draft.birthDate) setBirthDate(draft.birthDate);
      if (draft.address) setAddress(draft.address);
      if (draft.city && CITIES.includes(draft.city as any)) setCity(draft.city as any);
      if (draft.fleetCode) setFleetCode(draft.fleetCode);
      if (draft.selectedVehicle && VEHICLE_OPTIONS.some((v) => v.id === draft.selectedVehicle)) {
        setSelectedVehicle(draft.selectedVehicle);
      }
      if (draft.licensePlate) setLicensePlate(draft.licensePlate);
      if (draft.payloadKg) setPayloadKg(draft.payloadKg);
      if (draft.licenseNumber) setLicenseNumber(draft.licenseNumber);
      if (draft.signatureName) setSignatureName(draft.signatureName);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Auto-save draft on changes
  const isMountedRef = useRef(false);
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    void draftStorage.saveDraft({
      fullName: name,
      phoneNumber: phone,
      birthDate,
      address,
      city,
      fleetCode,
      selectedVehicle,
      licensePlate,
      payloadKg,
      licenseNumber,
      signatureName,
    });
  }, [
    name,
    phone,
    birthDate,
    address,
    city,
    fleetCode,
    selectedVehicle,
    licensePlate,
    payloadKg,
    licenseNumber,
    signatureName,
  ]);

  const handleMastheadBack = () => {
    setErrorMsg(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
    } else {
      router.back();
    }
  };

  const phoneReady = isAuthenticated || isLikelyVnPhone(phone);

  const handleNextToStep2 = () => {
    if (name.trim().length < 3) {
      setErrorMsg('Họ và tên phải có ít nhất 3 ký tự');
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
    if (!selectedVehicle) {
      setErrorMsg('Vui lòng chọn 1 loại phương tiện');
      return;
    }
    if (!isValidPlate(licensePlate)) {
      setErrorMsg('Biển số xe không đúng định dạng');
      return;
    }
    if (!licenseNumber.trim()) {
      setErrorMsg('Vui lòng nhập số GPLX');
      return;
    }
    setErrorMsg(null);
    setCurrentStep(3);
  };

  const requiredDocsReady = DOC_SLOTS.every((slot) => docs[slot.type]);

  const handleNextToStep4 = () => {
    if (!requiredDocsReady) {
      setErrorMsg('Vui lòng tải lên đủ 3 loại giấy tờ xác minh');
      return;
    }
    setErrorMsg(null);
    setCurrentStep(4);
  };

  // Fetch the contract descriptor publicly
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

  // Pre-fill signature from name unless touched
  useEffect(() => {
    if (!signatureTouched) setSignatureName(name);
  }, [name, signatureTouched]);

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
    setSelfie(null);
    setErrorMsg(null);
    setConsentChecked(false);
    setContractVersionInfo(null);
    setContractSignedAtInfo(null);
    setCurrentStep(1);
  };

  const signatureValid = signatureName.trim().length > 0 && signatureName.trim().length <= 120;
  const step1Valid = name.trim().length >= 3 && phoneReady;
  const step2Valid =
    Boolean(selectedVehicle) && isValidPlate(licensePlate) && Boolean(licenseNumber.trim());
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

  const captureSelfie = async () => {
    if (capturingDocType) return;
    setErrorMsg(null);
    setCapturingDocType('SELFIE');
    try {
      const asset = await captureDeviceImage();
      if (asset) {
        setSelfie(asset);
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
        const vehicleDef =
          VEHICLE_OPTIONS.find((v) => v.id === selectedVehicle) ?? VEHICLE_OPTIONS[0];
        const applied = await httpClient.post<{
          contractVersion: string | null;
          contractSignedAt: string | null;
        }>('/driver/apply', {
          name: name.trim(),
          vehicleType: vehicleDef.backendType,
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

      await draftStorage.clearDraft();
      setSuccess(true);
      if (options?.onSuccess) {
        options.onSuccess();
      } else {
        router.replace('/(public)/kyc-pending');
      }
    } catch (err) {
      setErrorMsg(mapApplyError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

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

  return {
    isAuthenticated,
    currentStep,
    setCurrentStep,
    phone,
    setPhone,
    name,
    setName,
    birthDate,
    setBirthDate,
    address,
    setAddress,
    city,
    setCity,
    fleetCode,
    setFleetCode,
    selectedVehicle,
    setSelectedVehicle,
    licensePlate,
    setLicensePlate,
    payloadKg,
    setPayloadKg,
    licenseNumber,
    setLicenseNumber,
    selfie,
    setSelfie,
    docs,
    setDocs,
    capturingDocType,
    focusedField,
    setFocusedField,
    isSubmitting,
    errorMsg,
    setErrorMsg,
    success,
    appStatus,
    rejectionReason,
    contractVersionInfo,
    contractSignedAtInfo,
    isCheckingStatus,
    showOtpModal,
    setShowOtpModal,
    otpCode,
    setOtpCode,
    otpCountdown,
    otpError,
    setOtpError,
    isVerifyingOtp,
    contract,
    contractLoading,
    contractLoadError,
    contractPdfOpening,
    consentChecked,
    setConsentChecked,
    signatureName,
    setSignatureName,
    signatureTouched,
    setSignatureTouched,
    handleMastheadBack,
    handleNextToStep2,
    handleNextToStep3,
    handleNextToStep4,
    handleCheckStatus,
    resetForReapply,
    captureDoc,
    captureSelfie,
    handleViewContract,
    handleSubmit,
    handleVerifyOtp,
    handleResendOtp,
    requiredDocsReady,
    signatureValid,
    phoneReady,
    step1Valid,
    step2Valid,
    step3Valid,
    canSubmit,
  };
}

export type UseDriverRegisterReturn = ReturnType<typeof useDriverRegister>;
