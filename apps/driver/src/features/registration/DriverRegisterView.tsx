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
  BrandLoginLogo,
  IconCamera,
  IconCheck,
  IconChevron,
  IconShieldAlert,
  toE164Vn,
  typeScale,
  iosContinuousCurve,
  leopardPalette,
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
  } = registration;

  const selectedVehicleDef =
    VEHICLE_OPTIONS.find((v) => v.id === selectedVehicle) ?? VEHICLE_OPTIONS[0];

  return (
    <View style={styles.screenWrap}>
      {/* Apple Navigation Top Bar (Sticky) */}
      <View style={styles.topNavigation}>
        <Pressable
          accessibilityLabel={currentStep > 1 ? 'Quay lại' : 'Đăng nhập'}
          accessibilityRole="button"
          hitSlop={8}
          onPress={handleMastheadBack}
          style={({ pressed }) => [styles.backBtn, pressed && styles.controlPressed]}
          testID="btn-back"
        >
          <IconChevron color="#0F172A" direction="left" size={24} />
        </Pressable>
        <BrandLoginLogo height={32} />
        <View style={styles.navRightBox}>
          {!success ? (
            <Text style={styles.stepCounterText}>
              {currentStep <= 3 ? `${currentStep} / 3` : '4 / 4'}
            </Text>
          ) : (
            <View style={styles.navPlaceholder} />
          )}
        </View>
      </View>

      {/* Progress Stepper Bar (Sticky under Top Bar) */}
      {!success ? (
        <View style={styles.stepperWrap} testID="driver-register-stepper">
          <View style={styles.stepperBarsRow}>
            {WIZARD_STEPS.map((s) => {
              const isActive = currentStep === s.step;
              const isPassed = currentStep > s.step;
              return (
                <View
                  key={`bar-${s.step}`}
                  style={[
                    styles.stepperBar,
                    isPassed
                      ? styles.stepperBarPassed
                      : isActive
                      ? styles.stepperBarActive
                      : null,
                  ]}
                />
              );
            })}
          </View>
          <View style={styles.stepperLabelsRow}>
            {WIZARD_STEPS.map((s) => {
              const isActive = currentStep === s.step;
              const isPassed = currentStep > s.step;
              return (
                <Pressable
                  accessibilityLabel={`Bước ${s.step}: ${s.label}`}
                  accessibilityRole="button"
                  disabled={!isPassed}
                  key={s.step}
                  onPress={() => {
                    setErrorMsg(null);
                    setCurrentStep(s.step);
                  }}
                  style={styles.stepLabelBtn}
                >
                  <Text
                    style={[
                      styles.stepLabelText,
                      isActive ? styles.stepLabelTextActive : null,
                      isPassed ? styles.stepLabelTextPassed : null,
                    ]}
                  >
                    {s.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Scrollable Form Body */}
      <ScrollView
        bounces={false}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        {/* Title Section (Dynamic per step, Apple Large Title) */}
        {!success ? (
          <View style={styles.titleSection}>
            <Text accessibilityRole="header" style={styles.largeTitle}>
              {currentStep === 1
                ? 'Thông tin cá nhân'
                : currentStep === 2
                ? 'Phương tiện & GPLX'
                : currentStep === 3
                ? 'Giấy tờ xác minh'
                : 'Hợp đồng & Ký số'}
            </Text>
            <Text style={styles.largeSubtitle}>
              {currentStep === 1
                ? 'Nhập họ tên và số điện thoại để đăng ký đối tác.'
                : currentStep === 2
                ? 'Chọn loại xe hoạt động và nhập thông tin đăng kiểm.'
                : currentStep === 3
                ? 'Chụp ảnh giấy tờ bản gốc rõ nét để được xét duyệt.'
                : 'Xem lại hợp đồng hợp tác và ký xác nhận điện tử.'}
            </Text>
          </View>
        ) : null}

      <View style={styles.body}>
        {success ? (
          <View style={[styles.card, styles.successCard]} testID="register-success">
            {appStatus === 'ACTIVE' ? (
              <>
                <View style={styles.successIconBadge}>
                  <IconCheck color={scene.successLight} size={36} strokeWidth="bold" />
                </View>
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
                <View style={styles.warningIconBadge}>
                  <IconShieldAlert color={scene.warning} size={36} strokeWidth="bold" />
                </View>
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
                <View style={styles.successIconBadge}>
                  <IconCheck color={scene.ctaCyan} size={36} strokeWidth="bold" />
                </View>
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
                        placeholderTextColor={scene.placeholder}
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
                        placeholderTextColor={scene.placeholder}
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
                        placeholderTextColor={scene.placeholder}
                        style={[styles.input, styles.dateInput]}
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
                        placeholderTextColor={scene.placeholder}
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
                            style={[styles.docBtn, styles.docBtnHalf, styles.docBtnDone]}
                          >
                            <IconCamera color="#334155" secondaryColor="transparent" size={18} />
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
                        <IconCamera color={scene.ink} secondaryColor="transparent" size={18} />
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
                        placeholderTextColor={scene.placeholder}
                        style={styles.input}
                        value={fleetCode}
                      />
                    </View>
                  </View>
                </View>

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
                        placeholderTextColor={scene.placeholder}
                        style={[styles.input, styles.licensePlateInput]}
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
                        placeholderTextColor={scene.placeholder}
                        style={[styles.input, styles.tabularNumberInput]}
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
                        placeholderTextColor={scene.placeholder}
                        style={[styles.input, styles.tabularNumberInput]}
                        value={licenseNumber}
                      />
                    </View>
                  </View>
                </View>
              </>
            ) : null}

            {/* Bước 3: Chụp ảnh Giấy tờ & Định danh */}
            {currentStep === 3 ? (
              <>
                <View style={styles.kycGuideCard}>
                  <View style={styles.kycGuideIcon}>
                    <IconCamera color={scene.ctaCyan} secondaryColor={scene.surfaceDark} size={22} />
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
                              <IconCheck color={scene.successLight} size={18} />
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
                              <IconCamera color="#334155" secondaryColor="transparent" size={18} />
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
                            <IconCamera color={scene.ink} secondaryColor="transparent" size={18} />
                            <Text style={styles.docBtnText}>
                              {capturingDocType === slot.type ? 'Đang mở camera…' : 'Chụp ảnh'}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    );
                  })}
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
                    <Text style={[styles.summaryValue, styles.tabularText]}>
                      {toE164Vn(phone.trim()) || phone || (isAuthenticated ? 'Tài khoản hiện tại' : '—')}
                    </Text>
                  </View>
                  {birthDate ? (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Ngày sinh:</Text>
                      <Text style={[styles.summaryValue, styles.tabularText]}>{birthDate}</Text>
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
              </>
            ) : null}
          </>
        )}
      </View>
    </ScrollView>

    {/* Apple Sticky Bottom Action Bar */}
    {!success ? (
      <View style={styles.stickyBottomBar}>
        {currentStep === 1 ? (
          <Pressable
            accessibilityLabel="Tiếp tục sang bước phương tiện"
            accessibilityRole="button"
            accessibilityState={{ disabled: !step1Valid }}
            disabled={!step1Valid}
            onPress={handleNextToStep2}
            style={({ pressed }) => [
              styles.primaryBtn,
              !step1Valid ? styles.primaryBtnDisabled : null,
              pressed && step1Valid ? styles.pressed : null,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.primaryBtnText,
                !step1Valid ? styles.primaryBtnDisabledText : null,
              ]}
            >
              Tiếp tục
            </Text>
          </Pressable>
        ) : currentStep === 2 ? (
          <View style={styles.stepNavRow}>
            <Pressable
              accessibilityLabel="Quay lại bước cá nhân"
              accessibilityRole="button"
              onPress={() => {
                setErrorMsg(null);
                setCurrentStep(1);
              }}
              style={({ pressed }) => [styles.outlineNavBtn, pressed && styles.controlPressed]}
            >
              <Text numberOfLines={1} style={styles.outlineNavBtnText}>Quay lại</Text>
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
                pressed && step2Valid ? styles.pressed : null,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.primaryBtnText,
                  !step2Valid ? styles.primaryBtnDisabledText : null,
                ]}
              >
                Tiếp tục
              </Text>
            </Pressable>
          </View>
        ) : currentStep === 3 ? (
          <View style={styles.stepNavRow}>
            <Pressable
              accessibilityLabel="Quay lại bước phương tiện"
              accessibilityRole="button"
              onPress={() => {
                setErrorMsg(null);
                setCurrentStep(2);
              }}
              style={({ pressed }) => [styles.outlineNavBtn, pressed && styles.controlPressed]}
            >
              <Text numberOfLines={1} style={styles.outlineNavBtnText}>Quay lại</Text>
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
                pressed && step3Valid ? styles.pressed : null,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.primaryBtnText,
                  !step3Valid ? styles.primaryBtnDisabledText : null,
                ]}
              >
                Tiếp tục
              </Text>
            </Pressable>
          </View>
        ) : currentStep === 4 ? (
          <View style={styles.stepNavRow}>
            <Pressable
              accessibilityLabel="Quay lại bước giấy tờ"
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={() => {
                setErrorMsg(null);
                setCurrentStep(3);
              }}
              style={({ pressed }) => [styles.outlineNavBtn, pressed && styles.controlPressed]}
            >
              <Text numberOfLines={1} style={styles.outlineNavBtnText}>Quay lại</Text>
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
                pressed && canSubmit ? styles.pressed : null,
              ]}
            >
              {isSubmitting ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text numberOfLines={1} style={styles.primaryBtnText}>Đang gửi...</Text>
                </View>
              ) : (
                <Text
                  numberOfLines={1}
                  style={[
                    styles.primaryBtnText,
                    !canSubmit ? styles.primaryBtnDisabledText : null,
                  ]}
                >
                  Ký & Gửi hồ sơ
                </Text>
              )}
            </Pressable>
          </View>
        ) : null}
      </View>
    ) : null}

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
  </View>
);
}

const styles = StyleSheet.create({
  screenWrap: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    ...(Platform.OS === 'web' ? { minHeight: '100dvh' as any } : {}),
  },
  scroll: {
    backgroundColor: '#F8FAFC',
    flex: 1,
    ...(Platform.OS === 'web'
      ? {
          scrollbarWidth: 'none' as const,
          msOverflowStyle: 'none' as const,
        }
      : {}),
  },
  container: {
    flexGrow: 1,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#F8FAFC',
  },
  /* Apple Navigation Top Bar */
  topNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.select({ ios: spacing.md, default: spacing.lg }),
    paddingBottom: spacing.xs,
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  navRightBox: {
    width: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  stepCounterText: {
    color: '#64748B',
    ...typeScale.caption1,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  navPlaceholder: {
    width: 44,
  },

  /* Apple HIG Large Title Area */
  titleSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    backgroundColor: '#FFFFFF',
  },
  largeTitle: {
    color: '#0F172A',
    ...typeScale.title1,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  largeSubtitle: {
    color: '#64748B',
    ...typeScale.subheadline,
    lineHeight: 20,
    marginTop: spacing.xxs,
  },

  /* Apple 3-Segment Progress Stepper */
  stepperWrap: {
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#E2E8F0',
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    paddingTop: spacing.xxs,
    gap: spacing.xs,
  },
  stepperBarsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  stepperBar: {
    flex: 1,
    height: 3,
    backgroundColor: '#E2E8F0',
    borderRadius: radius.pill,
  },
  stepperBarActive: {
    backgroundColor: leopardPalette.primary,
  },
  stepperBarPassed: {
    backgroundColor: '#15803D',
  },
  stepperLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepLabelBtn: {
    paddingVertical: 2,
  },
  stepLabelText: {
    color: '#94A3B8',
    ...typeScale.caption2,
    fontWeight: '600',
  },
  stepLabelTextActive: {
    color: leopardPalette.primary,
    fontWeight: '700',
  },
  stepLabelTextPassed: {
    color: '#15803D',
    fontWeight: '600',
  },
  body: {
    flex: 1,
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    ...iosContinuousCurve,
  },
  sectionLabel: {
    color: '#64748B',
    ...typeScale.caption2,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  field: { gap: spacing.xxs },
  inputLabel: {
    color: '#334155',
    ...typeScale.subheadline,
    fontWeight: '600',
  },
  fieldHint: { color: '#94A3B8', ...typeScale.caption2, marginTop: 2 },
  inputWrap: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: radius.control,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    ...iosContinuousCurve,
  },
  inputWrapFocused: {
    borderColor: leopardPalette.primary,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
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
    gap: spacing.xxs,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    height: '100%',
    backgroundColor: '#F1F5F9',
  },
  flagCode: {
    color: '#0F172A',
    ...typeScale.subheadline,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  phoneInput: {
    flex: 1,
    paddingLeft: spacing.xs,
    fontVariant: ['tabular-nums'],
  },
  dateInput: {
    fontVariant: ['tabular-nums'],
  },
  licensePlateInput: {
    fontVariant: ['tabular-nums'],
  },
  tabularNumberInput: {
    fontVariant: ['tabular-nums'],
  },
  tabularText: {
    fontVariant: ['tabular-nums'],
  },
  input: {
    color: '#0F172A',
    ...typeScale.subheadline,
    fontWeight: '500',
    padding: 0,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        outlineWidth: 0,
      } as any,
    }),
  },
  chipWrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + spacing.hairline,
    ...iosContinuousCurve,
  },
  chipActive: {
    backgroundColor: 'rgba(11, 37, 69, 0.08)',
    borderColor: leopardPalette.primary,
  },
  chipText: {
    color: '#64748B',
    ...typeScale.subheadline,
    fontWeight: '500',
  },
  chipTextActive: {
    color: leopardPalette.primary,
    fontWeight: '600',
  },
  vehicleGrid: {
    gap: spacing.xs,
  },
  vehicleCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: radius.control,
    borderWidth: 1,
    padding: spacing.sm,
    gap: spacing.xxs,
    ...iosContinuousCurve,
  },
  vehicleCardSelected: {
    borderColor: leopardPalette.primary,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
    shadowColor: leopardPalette.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  vehicleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleCardTitle: {
    color: '#0F172A',
    ...typeScale.subheadline,
    fontWeight: '600',
  },
  vehicleCardTitleSelected: {
    color: leopardPalette.primary,
    fontWeight: '700',
  },
  vehicleCardSub: {
    color: '#64748B',
    ...typeScale.caption1,
  },
  vehicleCardSubSelected: {
    color: leopardPalette.primary,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  radioCircleSelected: {
    borderColor: leopardPalette.primary,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: leopardPalette.primary,
  },
  selfieContainer: {
    gap: spacing.xs,
  },
  selfieThumb: {
    width: 100,
    height: 100,
    borderRadius: radius.control,
    borderWidth: 1.5,
    borderColor: leopardPalette.primary,
    ...iosContinuousCurve,
  },
  primaryBtn: {
    alignItems: 'center',
    backgroundColor: leopardPalette.primary,
    borderRadius: radius.cardLg,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    shadowColor: leopardPalette.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 3,
    ...iosContinuousCurve,
  },
  primaryBtnDisabled: {
    backgroundColor: '#E2E8F0',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryBtnDisabledText: {
    color: '#94A3B8',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    ...typeScale.subheadline,
    fontWeight: '700',
    textAlign: 'center',
  },
  stickyBottomBar: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: Platform.select({ ios: spacing.lg, default: spacing.sm }),
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 20,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnGloss: {
    display: 'none',
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  loginRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  loginHelper: {
    color: '#64748B',
    ...typeScale.footnote,
  },
  loginLink: {
    color: leopardPalette.primary,
    ...typeScale.footnote,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  stepNavRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    width: '100%',
  },
  outlineNavBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.cardLg,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    ...iosContinuousCurve,
  },
  outlineNavBtnText: {
    color: '#0F172A',
    ...typeScale.subheadline,
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryNavBtn: {
    flex: 2,
    height: 48,
    borderRadius: radius.cardLg,
    backgroundColor: leopardPalette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    shadowColor: leopardPalette.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
    ...iosContinuousCurve,
  },
  kycGuideCard: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    alignItems: 'center',
    ...iosContinuousCurve,
  },
  kycGuideIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    ...iosContinuousCurve,
  },
  kycGuideCopy: { flex: 1, gap: 2 },
  kycGuideTitle: { color: '#0F172A', ...typeScale.subheadline, fontWeight: '700' },
  kycGuideText: { color: '#64748B', ...typeScale.caption1, lineHeight: 16 },
  kycList: { gap: spacing.sm },
  docSlot: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    ...iosContinuousCurve,
  },
  docTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  docStatusIcon: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    ...iosContinuousCurve,
  },
  docStatusIconDone: {
    backgroundColor: '#F0FDF4',
  },
  docStatusNumber: {
    color: '#64748B',
    ...typeScale.caption2,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  docInfo: { flex: 1, gap: 1 },
  docLabel: { color: '#0F172A', ...typeScale.subheadline, fontWeight: '600' },
  docHint: { color: '#94A3B8', ...typeScale.caption2 },
  docStatusPill: {
    backgroundColor: '#F1F5F9',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    ...iosContinuousCurve,
  },
  docStatusPillDone: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
  },
  docStatusText: { color: '#64748B', ...typeScale.caption2, fontWeight: '600' },
  docStatusTextDone: { color: '#15803D', fontWeight: '700' },
  docThumb: {
    height: 120,
    width: '100%',
    borderRadius: radius.control,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...iosContinuousCurve,
  },
  docActionRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  docBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: radius.control,
    borderWidth: 1,
    height: 44,
    ...iosContinuousCurve,
  },
  docBtnHalf: {
    flex: 1,
  },
  docBtnDone: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  docBtnText: {
    color: '#0F172A',
    ...typeScale.subheadline,
    fontWeight: '600',
  },
  docBtnTextDone: {
    color: '#0F172A',
    fontWeight: '600',
  },
  deleteDocBtn: {
    minWidth: 68,
    height: 44,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    ...iosContinuousCurve,
  },
  deleteDocBtnText: {
    color: '#DC2626',
    ...typeScale.subheadline,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xxs,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    ...iosContinuousCurve,
  },
  summaryTitle: {
    color: '#64748B',
    ...typeScale.caption2,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xxs,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  summaryLabel: { color: '#64748B', ...typeScale.footnote },
  summaryValue: { color: '#0F172A', ...typeScale.footnote, fontWeight: '600' },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.md,
    ...iosContinuousCurve,
  },
  errorText: {
    color: '#DC2626',
    ...typeScale.footnote,
    fontWeight: '600',
    lineHeight: 18,
  },
  successCard: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  successIconBadge: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    ...iosContinuousCurve,
  },
  warningIconBadge: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    ...iosContinuousCurve,
  },
  successTitle: {
    color: '#0F172A',
    ...typeScale.title2,
    fontWeight: '700',
    textAlign: 'center',
  },
  successText: {
    color: '#64748B',
    ...typeScale.subheadline,
    textAlign: 'center',
  },
  contractMetaText: {
    color: leopardPalette.primary,
    ...typeScale.footnote,
    fontWeight: '600',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
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
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  otpCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: radius.modal,
    borderWidth: 1,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
    ...iosContinuousCurve,
  },
  otpTitle: {
    color: '#0F172A',
    ...typeScale.title3,
    fontWeight: '700',
    textAlign: 'center',
  },
  otpSubtitle: {
    color: '#64748B',
    ...typeScale.footnote,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 4,
  },
  phoneHighlight: {
    color: '#0F172A',
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  otpErrorBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: radius.control,
    borderWidth: 1,
    padding: 8,
    ...iosContinuousCurve,
  },
  otpErrorText: {
    color: '#DC2626',
    ...typeScale.caption1,
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
    color: leopardPalette.primary,
    ...typeScale.footnote,
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
    color: leopardPalette.primary,
    ...typeScale.footnote,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  resendDisabledText: {
    color: '#94A3B8',
  },
  otpActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.cardLg,
    borderColor: '#E2E8F0',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    ...iosContinuousCurve,
  },
  cancelBtnText: {
    color: '#0F172A',
    ...typeScale.subheadline,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1.4,
    height: 48,
    borderRadius: radius.cardLg,
    backgroundColor: leopardPalette.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: leopardPalette.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
    ...iosContinuousCurve,
  },
  confirmBtnDisabled: {
    backgroundColor: '#E2E8F0',
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    ...typeScale.subheadline,
    fontWeight: '700',
  },
  controlPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
});
