import React from 'react';
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
  radius,
  spacing,
  VietnamFlagIcon,
  OtpSixCellInput,
  IconCamera,
  IconCheck,
  toE164Vn,
  typeScale,
  iosContinuousCurve,
} from '@leopard/mobile-core';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import {
  DriverContractSection,
} from '../contract/DriverContractSection';
import {
  VEHICLE_OPTIONS,
  CITIES,
  DOC_SLOTS,
  formatSignedAt,
} from './driver-register-model';
import { WIZARD_STEPS, type UseDriverRegisterReturn } from './useDriverRegister';
import { scene } from './driver-register-scene';

export interface DriverRegisterViewProps {
  registration: UseDriverRegisterReturn;
  onDone?: () => void;
}

export function DriverRegisterView({ registration, onDone }: DriverRegisterViewProps) {
  const router = useRouter();

  const {
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
    step1Valid,
    step2Valid,
    step3Valid,
    canSubmit,
  } = registration as any;

  const selectedVehicleDef =
    VEHICLE_OPTIONS.find((v) => v.id === selectedVehicle) ?? VEHICLE_OPTIONS[0];

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
        <Svg
          height={140}
          pointerEvents="none"
          preserveAspectRatio="none"
          style={styles.heroAuraSvg}
          width="100%"
        >
          <Defs>
            <LinearGradient id="registerAuraGradient" x1="0" x2="0" y1="0" y2="1">
              <Stop offset="0%" stopColor="#0F2754" stopOpacity={1} />
              <Stop offset="100%" stopColor="#0B1E42" stopOpacity={0} />
            </LinearGradient>
            <RadialGradient id="registerAuraGlow" cx="50%" cy="20%" r="60%">
              <Stop offset="0%" stopColor="#0284C7" stopOpacity={0.25} />
              <Stop offset="70%" stopColor="#0284C7" stopOpacity={0.06} />
              <Stop offset="100%" stopColor="#0284C7" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect fill="url(#registerAuraGradient)" height="100%" width="100%" />
          <Rect fill="url(#registerAuraGlow)" height="100%" width="100%" />
        </Svg>

        <View style={styles.topRow}>
          <Pressable
            hitSlop={8}
            onPress={handleMastheadBack}
            style={({ pressed }) => [styles.backBtn, pressed ? styles.controlPressed : null]}
          >
            <Text style={styles.backBtnText}>
              {currentStep > 1 ? '← Quay lại' : '← Về trang trước'}
            </Text>
          </Pressable>
        </View>
        <Text accessibilityRole="header" style={styles.headline}>
          Đăng ký tài xế đối tác
        </Text>
        <Text style={styles.subline}>
          Hoàn tất hồ sơ 3 bước để LEOPARD xét duyệt và bắt đầu nhận đơn.
        </Text>
      </View>

      {/* Progress Stepper on top showing: 1. Cá nhân ➔ 2. Phương tiện ➔ 3. Giấy tờ */}
      {!success ? (
        <View style={styles.stepperWrap} testID="driver-register-stepper">
          <View style={styles.stepperBarBg}>
            <View
              style={[
                styles.stepperBarFill,
                { width: `${Math.min(100, (currentStep / 3) * 100)}%` },
              ]}
            />
          </View>
          <View style={styles.stepperSegments}>
            {WIZARD_STEPS.map((s, idx) => {
              const isActive = currentStep === s.step;
              const isPassed = currentStep > s.step;
              return (
                <React.Fragment key={s.step}>
                  <Pressable
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
                        isActive ? styles.stepCircleActive : null,
                        isPassed ? styles.stepCirclePassed : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.stepCircleText,
                          (isActive || isPassed) ? styles.stepCircleTextActive : null,
                          isPassed ? styles.stepCircleTextPassed : null,
                        ]}
                      >
                        {isPassed ? '✓' : s.step}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.stepLabel,
                        isActive ? styles.stepLabelActive : null,
                        isPassed ? styles.stepLabelPassed : null,
                      ]}
                    >
                      {s.label}
                    </Text>
                  </Pressable>
                  {idx < WIZARD_STEPS.length - 1 ? (
                    <Text style={styles.stepperArrow}>➔</Text>
                  ) : null}
                </React.Fragment>
              );
            })}
          </View>
          <View style={styles.stepHeadlineRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>
                {currentStep <= 3 ? `Bước ${currentStep}/3` : 'Bước 4/4'}
              </Text>
            </View>
            <Text style={styles.stepTitleText}>
              {currentStep <= 3
                ? WIZARD_STEPS[currentStep - 1].title
                : 'Hợp đồng điện tử & Ký số'}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.body}>
        {success ? (
          <View style={[styles.card, styles.successCard]} testID="register-success">
            {appStatus === 'ACTIVE' ? (
              <>
                <Text style={styles.successIcon}>✅</Text>
                <Text style={styles.successTitle}>Hồ sơ đã được duyệt!</Text>
                <Text style={styles.successText}>Bạn có thể bắt đầu nhận đơn ngay bây giờ.</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    if (onDone) {
                      onDone();
                    } else {
                      router.replace('/orders');
                    }
                  }}
                  style={({ pressed }) => [styles.primaryBtn, pressed ? styles.pressed : null]}
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
                {contractVersionInfo ? (
                  contractSignedAtInfo ? (
                    <Text style={styles.contractMetaText}>
                      Đã ký hợp đồng phiên bản {contractVersionInfo} lúc{' '}
                      {formatSignedAt(contractSignedAtInfo)}
                    </Text>
                  ) : null
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  onPress={resetForReapply}
                  style={({ pressed }) => [styles.primaryBtn, pressed ? styles.pressed : null]}
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
                {contractVersionInfo ? (
                  contractSignedAtInfo ? (
                    <Text style={styles.contractMetaText}>
                      Đã ký hợp đồng phiên bản {contractVersionInfo} lúc{' '}
                      {formatSignedAt(contractSignedAtInfo)}
                    </Text>
                  ) : null
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  disabled={isCheckingStatus}
                  onPress={handleCheckStatus}
                  style={({ pressed }) => [styles.primaryBtn, pressed ? styles.pressed : null]}
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

            {/* Bước 1: Thông tin cá nhân */}
            {currentStep === 1 ? (
              <>
                <View style={styles.card}>
                  <Text style={styles.sectionLabel}>THÔNG TIN CÁ NHÂN & LIÊN HỆ</Text>

                  <View style={styles.field}>
                    <Text style={styles.inputLabel}>Họ và tên</Text>
                    <View
                      style={[
                        styles.inputWrap,
                        focusedField === 'name' ? styles.inputWrapFocused : null,
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
                        focusedField === 'phone' ? styles.inputWrapFocused : null,
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
                    <Text style={styles.inputLabel}>Ngày sinh</Text>
                    <View
                      style={[
                        styles.inputWrap,
                        focusedField === 'birthDate' ? styles.inputWrapFocused : null,
                      ]}
                    >
                      <TextInput
                        accessibilityLabel="Ngày sinh"
                        editable={!isSubmitting}
                        onBlur={() => setFocusedField(null)}
                        onChangeText={setBirthDate}
                        onFocus={() => setFocusedField('birthDate')}
                        placeholder="DD/MM/YYYY"
                        placeholderTextColor="#64748B"
                        style={styles.input}
                        value={birthDate}
                      />
                    </View>
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.inputLabel}>Địa chỉ cư trú</Text>
                    <View
                      style={[
                        styles.inputWrap,
                        focusedField === 'address' ? styles.inputWrapFocused : null,
                      ]}
                    >
                      <TextInput
                        accessibilityLabel="Địa chỉ cư trú"
                        editable={!isSubmitting}
                        onBlur={() => setFocusedField(null)}
                        onChangeText={setAddress}
                        onFocus={() => setFocusedField('address')}
                        placeholder="Số nhà, tên đường, phường/xã..."
                        placeholderTextColor="#64748B"
                        style={styles.input}
                        value={address}
                      />
                    </View>
                  </View>

                  {/* Ảnh chân dung tài xế (Selfie rõ mặt) */}
                  <View style={styles.field}>
                    <Text style={styles.inputLabel}>Ảnh chân dung tài xế (Selfie rõ mặt)</Text>
                    {selfie ? (
                      <View style={styles.selfieContainer}>
                        <Image
                          accessibilityLabel="Ảnh chân dung tài xế đã chụp"
                          source={{ uri: selfie.uri }}
                          style={styles.selfieThumb}
                        />
                        <View style={styles.docActionRow}>
                          <Pressable
                            accessibilityLabel="Chụp lại ảnh chân dung"
                            accessibilityRole="button"
                            disabled={isSubmitting}
                            onPress={() => void captureSelfie()}
                            style={[styles.docBtn, styles.docBtnDone]}
                          >
                            <IconCamera color="#4ADE80" secondaryColor="transparent" size={18} />
                            <Text style={[styles.docBtnText, styles.docBtnTextDone]}>
                              Chụp lại
                            </Text>
                          </Pressable>
                          <Pressable
                            accessibilityLabel="Xóa ảnh chân dung"
                            accessibilityRole="button"
                            disabled={isSubmitting}
                            onPress={() => setSelfie(null)}
                            style={styles.deleteDocBtn}
                          >
                            <Text style={styles.deleteDocBtnText}>Xóa</Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <Pressable
                        accessibilityLabel="Chụp ảnh chân dung"
                        accessibilityRole="button"
                        disabled={isSubmitting}
                        onPress={() => void captureSelfie()}
                        style={styles.docBtn}
                      >
                        <IconCamera color="#FFFFFF" secondaryColor="transparent" size={18} />
                        <Text style={styles.docBtnText}>Chụp ảnh chân dung</Text>
                      </Pressable>
                    )}
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
                            style={[styles.chip, active ? styles.chipActive : null]}
                          >
                            <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
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
                        focusedField === 'fleet' ? styles.inputWrapFocused : null,
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
                  </View>
                </View>

                <Pressable
                  accessibilityLabel="Tiếp tục sang bước phương tiện"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !step1Valid }}
                  disabled={!step1Valid}
                  onPress={handleNextToStep2}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    !step1Valid ? styles.primaryBtnDisabled : null,
                    pressed ? styles.pressed : null,
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
            ) : null}

            {/* Bước 2: Phương tiện duy nhất */}
            {currentStep === 2 ? (
              <>
                <View style={styles.card}>
                  <Text style={styles.sectionLabel}>PHƯƠNG TIỆN DUY NHẤT & GPLX</Text>

                  <View style={styles.field}>
                    <Text style={styles.inputLabel}>Chọn đúng 1 loại phương tiện</Text>
                    <View style={styles.vehicleGrid}>
                      {VEHICLE_OPTIONS.map((opt) => {
                        const isSelected = selectedVehicle === opt.id;
                        return (
                          <Pressable
                            key={opt.id}
                            accessibilityLabel={opt.label}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: isSelected }}
                            onPress={() => {
                              setSelectedVehicle(opt.id);
                              setPayloadKg(String(opt.defaultPayloadKg));
                            }}
                            style={[
                              styles.vehicleCard,
                              isSelected ? styles.vehicleCardSelected : null,
                            ]}
                          >
                            <View style={styles.vehicleCardHeader}>
                              <Text
                                style={[
                                  styles.vehicleCardTitle,
                                  isSelected ? styles.vehicleCardTitleSelected : null,
                                ]}
                              >
                                {opt.label}
                              </Text>
                              <View
                                style={[
                                  styles.radioCircle,
                                  isSelected ? styles.radioCircleSelected : null,
                                ]}
                              >
                                {isSelected ? <View style={styles.radioDot} /> : null}
                              </View>
                            </View>
                            <Text
                              style={[
                                styles.vehicleCardSub,
                                isSelected ? styles.vehicleCardSubSelected : null,
                              ]}
                            >
                              {opt.subLabel}
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
                        focusedField === 'plate' ? styles.inputWrapFocused : null,
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
                    <Text style={styles.fieldHint}>
                      Định dạng chuẩn: 59D-123.45, 29H-123.45...
                    </Text>
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.inputLabel}>Tải trọng đăng kiểm (kg)</Text>
                    <View
                      style={[
                        styles.inputWrap,
                        focusedField === 'payload' ? styles.inputWrapFocused : null,
                      ]}
                    >
                      <TextInput
                        accessibilityLabel="Tải trọng đăng kiểm"
                        editable={!isSubmitting}
                        keyboardType="numeric"
                        onBlur={() => setFocusedField(null)}
                        onChangeText={setPayloadKg}
                        onFocus={() => setFocusedField('payload')}
                        placeholder="VD: 500"
                        placeholderTextColor="#64748B"
                        style={styles.input}
                        value={payloadKg}
                      />
                    </View>
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.inputLabel}>Số GPLX (giấy phép lái xe)</Text>
                    <View
                      style={[
                        styles.inputWrap,
                        focusedField === 'gplx' ? styles.inputWrapFocused : null,
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
                    accessibilityState={{ disabled: !step2Valid }}
                    disabled={!step2Valid}
                    onPress={handleNextToStep3}
                    style={({ pressed }) => [
                      styles.primaryNavBtn,
                      !step2Valid ? styles.primaryBtnDisabled : null,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <View pointerEvents="none" style={styles.btnGloss} />
                    <Text style={styles.primaryBtnText}>Tiếp tục sang chụp giấy tờ →</Text>
                  </Pressable>
                </View>
              </>
            ) : null}

            {/* Bước 3: Chụp ảnh Giấy tờ & Định danh */}
            {currentStep === 3 ? (
              <>
                <View style={styles.kycGuideCard}>
                  <View style={styles.kycGuideIcon}>
                    <IconCamera color="#38BDF8" secondaryColor="#0F2347" size={22} />
                  </View>
                  <View style={styles.kycGuideCopy}>
                    <Text style={styles.kycGuideTitle}>Chụp đủ 4 góc, không lóa và rõ chữ</Text>
                    <Text style={styles.kycGuideText}>
                      CCCD, GPLX (mặt trước + sau) và Cà vẹt xe / Đăng kiểm. Kiểm tra ảnh trước khi tiếp tục.
                    </Text>
                  </View>
                </View>

                <View style={styles.kycList}>
                  {DOC_SLOTS.map((slot) => {
                    const asset = docs[slot.type];
                    return (
                      <View key={slot.type} style={styles.docSlot}>
                        <View style={styles.docTopRow}>
                          <View style={[styles.docStatusIcon, asset ? styles.docStatusIconDone : null]}>
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
                          <View style={[styles.docStatusPill, asset ? styles.docStatusPillDone : null]}>
                            <Text style={[styles.docStatusText, asset ? styles.docStatusTextDone : null]}>
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

                        {asset ? (
                          <View style={styles.docActionRow}>
                            <Pressable
                              accessibilityLabel={`Chụp lại ${slot.label}`}
                              accessibilityRole="button"
                              disabled={isSubmitting || capturingDocType !== null}
                              onPress={() => void captureDoc(slot.type)}
                              style={[styles.docBtn, styles.docBtnHalf, styles.docBtnDone]}
                            >
                              <IconCamera color="#4ADE80" secondaryColor="transparent" size={18} />
                              <Text style={[styles.docBtnText, styles.docBtnTextDone]}>
                                {capturingDocType === slot.type ? 'Đang mở camera…' : 'Chụp lại'}
                              </Text>
                            </Pressable>
                            <Pressable
                              accessibilityLabel={`Xóa ${slot.label}`}
                              accessibilityRole="button"
                              disabled={isSubmitting}
                              onPress={() => {
                                setDocs((prev: any) => {
                                  const next = { ...prev };
                                  delete next[slot.type];
                                  return next;
                                });
                              }}
                              style={styles.deleteDocBtn}
                            >
                              <Text style={styles.deleteDocBtnText}>Xóa</Text>
                            </Pressable>
                          </View>
                        ) : (
                          <Pressable
                            accessibilityLabel={`Chụp ảnh ${slot.label}`}
                            accessibilityRole="button"
                            disabled={isSubmitting || capturingDocType !== null}
                            onPress={() => void captureDoc(slot.type)}
                            style={styles.docBtn}
                          >
                            <IconCamera color="#FFFFFF" secondaryColor="transparent" size={18} />
                            <Text style={styles.docBtnText}>
                              {capturingDocType === slot.type ? 'Đang mở camera…' : 'Chụp ảnh'}
                            </Text>
                          </Pressable>
                        )}
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
                    accessibilityState={{ disabled: !step3Valid }}
                    disabled={!step3Valid}
                    onPress={handleNextToStep4}
                    style={({ pressed }) => [
                      styles.primaryNavBtn,
                      !step3Valid ? styles.primaryBtnDisabled : null,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <View pointerEvents="none" style={styles.btnGloss} />
                    <Text style={styles.primaryBtnText}>Tiếp tục xem hợp đồng →</Text>
                  </Pressable>
                </View>
              </>
            ) : null}

            {/* Bước 4: Hợp đồng điện tử & Ký nộp */}
            {currentStep === 4 ? (
              <>
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
                  {birthDate ? (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Ngày sinh:</Text>
                      <Text style={styles.summaryValue}>{birthDate}</Text>
                    </View>
                  ) : null}
                  {address ? (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Địa chỉ:</Text>
                      <Text style={styles.summaryValue}>{address}</Text>
                    </View>
                  ) : null}
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Khu vực & Đội xe:</Text>
                    <Text style={styles.summaryValue}>
                      {city} {fleetCode ? `(${fleetCode})` : ''}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Phương tiện:</Text>
                    <Text style={styles.summaryValue}>
                      {selectedVehicleDef.label} ({payloadKg} kg) • {licensePlate}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Giấy tờ KYC:</Text>
                    <Text style={[styles.summaryValue, { color: scene.successLight }]}>
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
                  onToggleConsent={() => setConsentChecked((v: boolean) => !v)}
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
                      !canSubmit ? styles.primaryBtnDisabled : null,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <View pointerEvents="none" style={styles.btnGloss} />
                    <Text style={styles.primaryBtnText}>
                      {isSubmitting ? 'Đang gửi hồ sơ...' : 'Ký & Gửi hồ sơ'}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </>
        )}
      </View>

      {/* In-flow Phone Verification Modal (Xác thực OTP tức thời) */}
      {showOtpModal ? (
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
                <Text style={[styles.resendText, otpCountdown > 0 ? styles.resendDisabledText : null]}>
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
                  (otpCode.length < 6 || isVerifyingOtp) ? styles.confirmBtnDisabled : null,
                ]}
              >
                <Text style={styles.confirmBtnText}>Xác nhận & Nộp</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    backgroundColor: scene.canvasDark,
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
    ...iosContinuousCurve,
  },
  backBtnText: { color: '#FFFFFF', fontSize: typeScale.footnote.fontSize, fontWeight: '700' },
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
    ...iosContinuousCurve,
  },
  sectionLabel: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  field: { gap: spacing.xs },
  inputLabel: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  fieldHint: { color: '#94A3B8', fontSize: typeScale.caption1.fontSize, marginTop: 2, lineHeight: 16 },
  inputWrap: {
    backgroundColor: '#132B52',
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 14,
    borderWidth: 1.5,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 12,
    ...iosContinuousCurve,
  },
  inputWrapFocused: {
    borderColor: scene.inputFocusBorder,
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
    fontSize: typeScale.footnote.fontSize,
    fontWeight: '700',
  },
  phoneInput: {
    flex: 1,
    paddingLeft: 10,
  },
  input: {
    color: '#FFFFFF',
    fontSize: typeScale.subheadline.fontSize,
    fontWeight: '600',
    padding: 0,
  },
  chipWrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    ...iosContinuousCurve,
  },
  chipActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
    borderColor: '#38BDF8',
  },
  chipText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  vehicleGrid: {
    gap: 10,
  },
  vehicleCard: {
    backgroundColor: '#132B52',
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    gap: 4,
    ...iosContinuousCurve,
  },
  vehicleCardSelected: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  vehicleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleCardTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  vehicleCardTitleSelected: {
    color: '#38BDF8',
  },
  vehicleCardSub: {
    color: '#94A3B8',
    fontSize: typeScale.footnote.fontSize,
  },
  vehicleCardSubSelected: {
    color: '#CBD5E1',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: '#38BDF8',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#38BDF8',
  },
  selfieContainer: {
    gap: 10,
  },
  selfieThumb: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    ...iosContinuousCurve,
  },
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
    ...iosContinuousCurve,
  },
  primaryBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  btnGloss: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  pressed: {
    opacity: 0.88,
  },
  loginRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  loginHelper: {
    color: '#94A3B8',
    fontSize: 13,
  },
  loginLink: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  stepperWrap: {
    backgroundColor: '#0B1E42',
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomWidth: 1,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  stepperBarBg: {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 4,
    height: 4,
    overflow: 'hidden',
  },
  stepperBarFill: {
    backgroundColor: '#38BDF8',
    height: '100%',
  },
  stepperSegments: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    gap: 6,
  },
  stepperArrow: {
    color: 'rgba(255, 255, 255, 0.25)',
    fontSize: typeScale.subheadline.fontSize,
    fontWeight: '700',
    marginBottom: 16,
  },
  stepCircle: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.20)',
    borderRadius: 14,
    borderWidth: 1.5,
    height: 28,
    justifyContent: 'center',
    width: 28,
    ...iosContinuousCurve,
  },
  stepCircleActive: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  stepCirclePassed: {
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    borderColor: '#4ADE80',
  },
  stepCircleText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  stepCircleTextActive: {
    color: '#0B1E42',
    fontWeight: '800',
  },
  stepCircleTextPassed: {
    color: '#4ADE80',
  },
  stepLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  stepLabelActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  stepLabelPassed: {
    color: '#CBD5E1',
  },
  stepHeadlineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  stepBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.35)',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    ...iosContinuousCurve,
  },
  stepBadgeText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
  },
  stepTitleText: {
    color: '#FFFFFF',
    fontSize: typeScale.footnote.fontSize,
    fontWeight: '700',
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
    ...iosContinuousCurve,
  },
  outlineNavBtnText: {
    color: '#CBD5E1',
    fontSize: typeScale.subheadline.fontSize,
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
    ...iosContinuousCurve,
  },
  kycGuideCard: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: spacing.md,
    alignItems: 'center',
    ...iosContinuousCurve,
  },
  kycGuideIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    ...iosContinuousCurve,
  },
  kycGuideCopy: { flex: 1, gap: 2 },
  kycGuideTitle: { color: '#FFFFFF', fontSize: typeScale.footnote.fontSize, fontWeight: '700' },
  kycGuideText: { color: '#CBD5E1', fontSize: 12, lineHeight: 17 },
  kycList: { gap: spacing.md },
  docSlot: {
    backgroundColor: '#0F2347',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    padding: spacing.md,
    ...iosContinuousCurve,
  },
  docTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  docStatusIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    ...iosContinuousCurve,
  },
  docStatusIconDone: {
    backgroundColor: 'rgba(74, 222, 128, 0.18)',
  },
  docStatusNumber: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  docInfo: { flex: 1, gap: 2 },
  docLabel: { color: '#FFFFFF', fontSize: typeScale.footnote.fontSize, fontWeight: '700' },
  docHint: { color: '#94A3B8', fontSize: typeScale.caption1.fontSize },
  docStatusPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    ...iosContinuousCurve,
  },
  docStatusPillDone: {
    backgroundColor: 'rgba(74, 222, 128, 0.16)',
  },
  docStatusText: { color: '#94A3B8', fontSize: 11, fontWeight: '700' },
  docStatusTextDone: { color: '#4ADE80' },
  docThumb: {
    height: 140,
    width: '100%',
    borderRadius: 10,
    backgroundColor: '#132B52',
    ...iosContinuousCurve,
  },
  docActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  docBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 12,
    borderWidth: 1,
    height: 42,
    ...iosContinuousCurve,
  },
  docBtnHalf: {
    flex: 1,
  },
  docBtnDone: {
    borderColor: 'rgba(74, 222, 128, 0.35)',
    backgroundColor: 'rgba(74, 222, 128, 0.12)',
  },
  docBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  docBtnTextDone: {
    color: '#4ADE80',
  },
  deleteDocBtn: {
    width: 60,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.35)',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    ...iosContinuousCurve,
  },
  deleteDocBtnText: {
    color: '#F87171',
    fontSize: 13,
    fontWeight: '700',
  },
  summaryCard: {
    backgroundColor: '#0F2347',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.md,
    gap: 8,
    ...iosContinuousCurve,
  },
  summaryTitle: {
    color: '#38BDF8',
    fontSize: typeScale.caption1.fontSize,
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
  summaryLabel: { color: '#CBD5E1', fontSize: 13, fontWeight: '500' },
  summaryValue: { color: '#FFFFFF', fontSize: typeScale.footnote.fontSize, fontWeight: '700' },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderColor: 'rgba(248, 113, 113, 0.46)',
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.md,
    ...iosContinuousCurve,
  },
  errorText: {
    color: '#FECACA',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  successCard: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  successIcon: { fontSize: 48 },
  successTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  successText: {
    color: '#CBD5E1',
    fontSize: typeScale.subheadline.fontSize,
    lineHeight: 20,
    textAlign: 'center',
  },
  contractMetaText: {
    color: '#38BDF8',
    fontSize: typeScale.footnote.fontSize,
    fontWeight: '600',
    textAlign: 'center',
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
    ...iosContinuousCurve,
  },
  otpTitle: {
    color: '#FFFFFF',
    fontSize: typeScale.title3.fontSize,
    fontWeight: '800',
    textAlign: 'center',
  },
  otpSubtitle: {
    color: '#CBD5E1',
    fontSize: typeScale.footnote.fontSize,
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
    ...iosContinuousCurve,
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
    fontSize: typeScale.footnote.fontSize,
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
    ...iosContinuousCurve,
  },
  cancelBtnText: {
    color: '#CBD5E1',
    fontSize: typeScale.subheadline.fontSize,
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
    ...iosContinuousCurve,
  },
  confirmBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: typeScale.subheadline.fontSize,
    fontWeight: '700',
  },
  controlPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
});
