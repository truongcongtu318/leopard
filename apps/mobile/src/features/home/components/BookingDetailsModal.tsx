import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { z } from 'zod';

import {
  IconCamera,
  IconCheck,
  IconClose,
  IconTag,
  colors,
  control,
  customerPalette,
  haptic,
  iosContinuousCurve,
  leopardPalette,
  pastelTheme,
  pickDeviceImage,
  radius,
  spacing,
  systemFontFamily,
  typeScale,
} from '@leopard/mobile-core';

export type BookingPaymentMethod = 'VIETQR' | 'CASH';

export const CARGO_CATEGORIES = [
  'Kiện hàng',
  'May mặc',
  'VLXD',
  'Nội thất',
  'Khác',
] as const;

// ── Zod Schema: Pilot Freight Logistics Scope Only ──────────────────

export const bookingDetailsSchema = z
  .object({
    receiverName: z.string().trim().max(100).default(''),
    receiverPhone: z.string().trim().max(20).default(''),
    cargoCategory: z.enum(['Kiện hàng', 'May mặc', 'VLXD', 'Nội thất', 'Khác']),
    cargoNote: z.string().trim().max(1000).optional(),
    cargoImageUri: z
      .string({
        message: 'Vui lòng chụp hoặc tải ảnh hàng hóa (Bắt buộc).',
      })
      .min(1, 'Vui lòng chụp hoặc tải ảnh hàng hóa (Bắt buộc).'),
    hasLoadingSupport: z.boolean().default(false),
    hasVatInvoice: z.boolean().default(false),
    paymentMethod: z.enum(['VIETQR', 'CASH']).default('VIETQR'),
    totalFare: z.number().nonnegative(),
    voucherCode: z.string().trim().max(50).optional(),
    discountAmount: z.number().nonnegative().optional(),
  })
  .strict();

export type BookingDetails = z.infer<typeof bookingDetailsSchema>;

export interface BookingDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (details: BookingDetails) => void;
  pickupAddress: string;
  dropoffAddress: string;
  stops?: readonly { id: string; address: string }[];
  vehicleName: string;
  vehicleDimensions?: string;
  basePrice: number;
  loadingFee?: number;
  initialReceiverName?: string;
  initialReceiverPhone?: string;
  initialCargoImageUri?: string;
  testID?: string;
}

// Phí bốc xếp theo business model — khớp PricingService backend:
// Ba gác 60k · Van 100k · Tải 1.25T 150k · Tải 2.5T 250k.
export function resolveDefaultLoadingFee(vehicleName: string): number {
  if (vehicleName.includes('2.5')) return 250000;
  if (vehicleName.includes('1.25') || vehicleName.toLowerCase().includes('tải')) return 150000;
  if (vehicleName.toLowerCase().includes('van')) return 100000;
  if (vehicleName.toLowerCase().includes('gác') || vehicleName.toLowerCase().includes('bike')) return 60000;
  return 120000;
}

export function formatVnd(val: number): string {
  const rounded = Math.round(val);
  return `${new Intl.NumberFormat('vi-VN').format(rounded)} ₫`;
}

// Preset Pilot Vouchers (Cheetah Golden Amber #F59E0B)
export const PRESET_VOUCHERS = [
  { code: 'LEOPARD20K', label: 'Giảm 20k', discount: 20000 },
  { code: 'LEOPARD50K', label: 'Giảm 50k', discount: 50000 },
  { code: 'FREESHIP', label: 'Freeship 30k', discount: 30000 },
] as const;

export function BookingDetailsModal({
  basePrice,
  dropoffAddress,
  initialCargoImageUri,
  initialReceiverName = '',
  initialReceiverPhone = '',
  loadingFee: loadingFeeProp,
  onClose,
  onConfirm,
  pickupAddress,
  stops = [],
  testID = 'booking-details-modal',
  vehicleDimensions,
  vehicleName,
  visible,
}: BookingDetailsModalProps) {
  const [receiverName, setReceiverName] = useState(initialReceiverName);
  const [receiverPhone, setReceiverPhone] = useState(initialReceiverPhone);
  const [cargoCategory, setCargoCategory] = useState<typeof CARGO_CATEGORIES[number]>('Kiện hàng');
  const [cargoNote, setCargoNote] = useState('');
  const [cargoImageUri, setCargoImageUri] = useState<string | null>(initialCargoImageUri ?? null);
  const [cargoImageName, setCargoImageName] = useState<string | null>(null);
  const [cargoImageError, setCargoImageError] = useState<string | null>(null);
  const [hasLoadingSupport, setHasLoadingSupport] = useState(false);
  const [hasVatInvoice, setHasVatInvoice] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<BookingPaymentMethod>('VIETQR');

  // Voucher state: Cheetah Golden Amber (#F59E0B)
  const [voucherInput, setVoucherInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<{ code: string; discount: number } | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);

  // Smooth Gesture Bottom Sheet Dismissal
  const dragY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      dragY.setValue(0);
      if (initialReceiverName !== undefined) setReceiverName(initialReceiverName);
      if (initialReceiverPhone !== undefined) setReceiverPhone(initialReceiverPhone);
      if (initialCargoImageUri !== undefined) setCargoImageUri(initialCargoImageUri);
      setCargoImageError(null);
      setVoucherError(null);
    }
  }, [visible, initialReceiverName, initialReceiverPhone, initialCargoImageUri, dragY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 8,
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            dragY.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 100 || gestureState.vy > 0.6) {
            haptic.light();
            Animated.timing(dragY, {
              toValue: 600,
              duration: 200,
              useNativeDriver: true,
            }).start(() => {
              onClose();
              dragY.setValue(0);
            });
          } else {
            Animated.spring(dragY, {
              toValue: 0,
              damping: 20,
              stiffness: 240,
              useNativeDriver: true,
            }).start();
          }
        },
      }),
    [onClose, dragY],
  );

  const safeBasePrice = Math.max(0, basePrice || 0);
  const stopCount = stops.length;
  const stopSurcharge = stopCount * 30000;
  const unitLoadingFee =
    loadingFeeProp !== undefined ? loadingFeeProp : resolveDefaultLoadingFee(vehicleName);
  const loadingFee = hasLoadingSupport ? unitLoadingFee : 0;
  const vatAmount = Math.round((safeBasePrice + stopSurcharge + loadingFee) * 0.08);
  const vatFee = hasVatInvoice ? vatAmount : 0;
  const discountAmount = appliedVoucher ? appliedVoucher.discount : 0;
  const totalFare = Math.max(0, safeBasePrice + stopSurcharge + loadingFee + vatFee - discountAmount);

  const handleApplyVoucher = useCallback((codeToApply?: string) => {
    const targetCode = (codeToApply || voucherInput).trim().toUpperCase();
    if (!targetCode) return;

    const matched = PRESET_VOUCHERS.find((v) => v.code === targetCode);
    if (matched) {
      haptic.success();
      setAppliedVoucher({ code: matched.code, discount: matched.discount });
      setVoucherInput('');
      setVoucherError(null);
    } else {
      haptic.warning();
      setVoucherError('Mã voucher không hợp lệ hoặc đã hết lượt dùng.');
    }
  }, [voucherInput]);

  const handleRemoveVoucher = useCallback(() => {
    haptic.light();
    setAppliedVoucher(null);
    setVoucherError(null);
  }, []);

  const handleConfirm = useCallback(() => {
    // Validate rigorously using Zod schema
    const rawPayload = {
      receiverName: receiverName.trim(),
      receiverPhone: receiverPhone.trim(),
      cargoCategory,
      cargoNote: cargoNote.trim() ? cargoNote.trim() : undefined,
      cargoImageUri: cargoImageUri || '',
      hasLoadingSupport,
      hasVatInvoice,
      paymentMethod,
      totalFare,
      ...(appliedVoucher
        ? { voucherCode: appliedVoucher.code, discountAmount: appliedVoucher.discount }
        : {}),
    };

    const validation = bookingDetailsSchema.safeParse(rawPayload);

    if (!validation.success) {
      haptic.warning();
      const firstIssue = validation.error.issues[0];
      if (firstIssue.path.includes('cargoImageUri')) {
        setCargoImageError('Vui lòng chụp hoặc tải ảnh hàng hóa (Bắt buộc).');
      } else {
        setCargoImageError(firstIssue.message);
      }
      return;
    }

    setCargoImageError(null);
    haptic.medium();
    onConfirm(validation.data);
  }, [
    receiverName,
    receiverPhone,
    cargoCategory,
    cargoNote,
    cargoImageUri,
    hasLoadingSupport,
    hasVatInvoice,
    paymentMethod,
    totalFare,
    appliedVoucher,
    onConfirm,
  ]);

  const subtitle = vehicleDimensions
    ? `${vehicleName} • ${vehicleDimensions}`
    : vehicleName;

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      testID={testID}
      transparent
      visible={visible}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          accessibilityLabel="Đóng chi tiết chuyến hàng"
          onPress={onClose}
          style={styles.modalBackdrop}
        />

        <Animated.View
          style={[styles.sheetContainer, { transform: [{ translateY: dragY }] }]}
        >
          {/* Gesture Drag Handle (minHeight >= 44pt touch zone) */}
          <View {...panResponder.panHandlers} style={styles.handleWrap} testID="modal-drag-handle-wrap">
            <View style={styles.sheetHandle} />
          </View>

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTextGroup}>
              <Text style={styles.sheetTitle}>Chi tiết chuyến hàng</Text>
              <Text numberOfLines={1} style={styles.sheetSubtitle}>
                {subtitle}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Đóng modal chi tiết"
              hitSlop={spacing.xs}
              onPress={onClose}
              style={styles.closeBtn}
            >
              <IconClose color={customerPalette.textSubtle} size={16} />
            </Pressable>
          </View>

          {/* Route Info Badge */}
          {pickupAddress || dropoffAddress ? (
            <View style={styles.routeBadge} testID="modal-route-badge">
              <View style={styles.routeBadgeDotOrigin} />
              <Text numberOfLines={1} style={styles.routeBadgeText}>
                {pickupAddress || 'Điểm lấy hàng'}
              </Text>
              {stopCount > 0 ? (
                <View style={styles.routeBadgeStopCountPill} testID="modal-stop-count-pill">
                  <Text style={styles.routeBadgeStopCountText}>
                    {`+${stopCount} điểm dừng`}
                  </Text>
                </View>
              ) : (
                <Text style={styles.routeBadgeArrow}>➔</Text>
              )}
              <View style={styles.routeBadgeDotDest} />
              <Text numberOfLines={1} style={styles.routeBadgeText}>
                {dropoffAddress || 'Điểm giao hàng'}
              </Text>
            </View>
          ) : null}

          {/* Scrollable Form Content */}
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.scrollArea}
          >
            {/* 1. Người nhận hàng */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Người nhận hàng</Text>
              <View style={styles.inputStack}>
                <TextInput
                  accessibilityLabel="Tên người nhận hàng"
                  onChangeText={setReceiverName}
                  placeholder="Tên người nhận"
                  placeholderTextColor={leopardPalette.inputPlaceholder}
                  style={styles.textInput}
                  value={receiverName}
                />
                <TextInput
                  accessibilityLabel="Số điện thoại người nhận hàng"
                  keyboardType="phone-pad"
                  onChangeText={setReceiverPhone}
                  placeholder="Số điện thoại người nhận"
                  placeholderTextColor={leopardPalette.inputPlaceholder}
                  style={styles.textInput}
                  value={receiverPhone}
                />
              </View>
            </View>

            {/* 2. Hàng hóa */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Hàng hóa</Text>
              <View style={styles.chipsRow}>
                {CARGO_CATEGORIES.map((cat) => {
                  const isSelected = cargoCategory === cat;
                  return (
                    <Pressable
                      accessibilityLabel={cat}
                      accessibilityRole="button"
                      key={cat}
                      onPress={() => {
                        haptic.selection();
                        setCargoCategory(cat);
                      }}
                      style={[
                        styles.chip,
                        isSelected ? styles.chipSelected : styles.chipUnselected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isSelected ? styles.chipTextSelected : styles.chipTextUnselected,
                        ]}
                      >
                        {cat}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <TextInput
                accessibilityLabel="Ghi chú cho tài xế"
                onChangeText={setCargoNote}
                placeholder="Ghi chú cho tài xế (VD: Hàng dễ vỡ, tầng 3...)"
                placeholderTextColor={leopardPalette.inputPlaceholder}
                style={[styles.textInput, styles.noteInput]}
                value={cargoNote}
              />
            </View>

            {/* 3. Ảnh chụp hàng hóa (Bắt buộc) */}
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>Ảnh chụp hàng hóa</Text>
                <View style={styles.badgeRequired}>
                  <Text style={styles.badgeRequiredText}>Bắt buộc</Text>
                </View>
              </View>
              {cargoImageUri ? (
                <View style={styles.imagePreviewRow}>
                  <Image
                    accessibilityLabel="Ảnh hàng hóa đã chọn"
                    source={{ uri: cargoImageUri }}
                    style={styles.imageThumbnail}
                  />
                  <View style={styles.imageInfoCol}>
                    <Text numberOfLines={1} style={styles.imageFileName}>
                      {cargoImageName || 'Ảnh chụp hàng hóa'}
                    </Text>
                    <Text style={styles.imageReadyText}>Đã sẵn sàng tải lên</Text>
                  </View>
                  <Pressable
                    accessibilityLabel="Xóa ảnh"
                    accessibilityRole="button"
                    onPress={() => {
                      haptic.light();
                      setCargoImageUri(null);
                      setCargoImageName(null);
                    }}
                    style={styles.removePhotoBtn}
                    testID="btn-remove-cargo-image"
                  >
                    <Text style={styles.removePhotoBtnText}>✕ Xóa</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  accessibilityLabel="Chụp hoặc chọn ảnh hàng hóa"
                  accessibilityRole="button"
                  onPress={async () => {
                    haptic.selection();
                    try {
                      const file = await pickDeviceImage();
                      if (file) {
                        setCargoImageUri(file.uri);
                        setCargoImageName(file.name);
                        setCargoImageError(null);
                      }
                    } catch {
                      // ignore
                    }
                  }}
                  style={[
                    styles.photoPickerBox,
                    cargoImageError ? styles.photoPickerBoxError : null,
                  ]}
                  testID="btn-pick-cargo-image"
                >
                  <View style={styles.photoPickerIconCircle}>
                    <IconCamera color={customerPalette.textSlateDark} size={20} />
                  </View>
                  <View style={styles.photoPickerTextCol}>
                    <Text style={styles.photoPickerTitle}>Chụp hoặc tải ảnh hàng hóa</Text>
                    <Text style={styles.photoPickerSubtitle}>
                      Tài xế đối chiếu kích thước trước khi nhận chuyến
                    </Text>
                  </View>
                </Pressable>
              )}
              {cargoImageError ? (
                <Text style={styles.errorFeedbackText}>{cargoImageError}</Text>
              ) : null}
            </View>

            {/* 4. Voucher Cheetah Golden Amber (#F59E0B) */}
            <View style={styles.section}>
              <View style={styles.voucherSectionHeader}>
                <View style={styles.voucherTitleRow}>
                  <IconTag color={customerPalette.accent} size={16} />
                  <Text style={styles.sectionTitle}>Mã khuyến mãi / Voucher</Text>
                </View>
                <View style={styles.voucherTagAmber}>
                  <Text style={styles.voucherTagAmberText}>Cheetah voucher</Text>
                </View>
              </View>

              {appliedVoucher ? (
                <View style={styles.appliedVoucherCard} testID="applied-voucher-card">
                  <View style={styles.appliedVoucherLeft}>
                    <View style={styles.appliedVoucherDot} />
                    <View>
                      <Text style={styles.appliedVoucherCode}>{appliedVoucher.code}</Text>
                      <Text style={styles.appliedVoucherDesc}>
                        Đã giảm {formatVnd(appliedVoucher.discount)} vào cước chuyến
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    accessibilityLabel="Bỏ áp dụng voucher"
                    accessibilityRole="button"
                    hitSlop={spacing.xs}
                    onPress={handleRemoveVoucher}
                    style={styles.removeVoucherBtn}
                    testID="btn-remove-voucher"
                  >
                    <IconClose color={customerPalette.accent} size={14} />
                  </Pressable>
                </View>
              ) : (
                <View style={styles.voucherInputContainer}>
                  <View style={styles.voucherInputRow}>
                    <TextInput
                      accessibilityLabel="Nhập mã khuyến mãi"
                      autoCapitalize="characters"
                      onChangeText={(t) => {
                        setVoucherInput(t);
                        if (voucherError) setVoucherError(null);
                      }}
                      placeholder="Nhập mã voucher (VD: LEOPARD20K)"
                      placeholderTextColor={leopardPalette.inputPlaceholder}
                      style={styles.voucherTextInput}
                      value={voucherInput}
                    />
                    <Pressable
                      accessibilityLabel="Áp dụng mã khuyến mãi"
                      accessibilityRole="button"
                      onPress={() => handleApplyVoucher()}
                      style={({ pressed }) => [
                        styles.applyVoucherBtn,
                        pressed ? styles.applyVoucherBtnPressed : null,
                      ]}
                      testID="btn-apply-voucher"
                    >
                      <Text style={styles.applyVoucherBtnText}>Áp dụng</Text>
                    </Pressable>
                  </View>

                  {/* Preset Quick Chips */}
                  <View style={styles.quickVoucherRow}>
                    {PRESET_VOUCHERS.map((v) => (
                      <Pressable
                        accessibilityLabel={`Chọn voucher ${v.code}`}
                        accessibilityRole="button"
                        key={v.code}
                        onPress={() => handleApplyVoucher(v.code)}
                        style={({ pressed }) => [
                          styles.quickVoucherChip,
                          pressed ? styles.quickVoucherChipPressed : null,
                        ]}
                      >
                        <Text style={styles.quickVoucherChipText}>
                          {v.code} · {v.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  {voucherError ? (
                    <Text style={styles.voucherErrorText}>{voucherError}</Text>
                  ) : null}
                </View>
              )}
            </View>

            {/* 5. Dịch vụ cộng thêm */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Dịch vụ cộng thêm</Text>
              <View style={styles.toggleStack}>
                {/* Bốc xếp */}
                <Pressable
                  accessibilityLabel="Tài xế hỗ trợ bốc xếp 2 đầu"
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: hasLoadingSupport }}
                  onPress={() => {
                    haptic.selection();
                    setHasLoadingSupport((prev) => !prev);
                  }}
                  style={[
                    styles.toggleRow,
                    hasLoadingSupport ? styles.toggleRowActive : null,
                  ]}
                >
                  <View
                    style={[
                      styles.checkbox,
                      hasLoadingSupport ? styles.checkboxActive : null,
                    ]}
                  >
                    {hasLoadingSupport ? (
                      <IconCheck color={customerPalette.surfaceWhite} size={14} strokeWidth={2.5} />
                    ) : null}
                  </View>
                  <View style={styles.toggleLabelCol}>
                    <Text style={styles.toggleTitle}>Tài xế hỗ trợ bốc xếp 2 đầu</Text>
                  </View>
                  <Text style={styles.toggleFee}>+{formatVnd(unitLoadingFee)}</Text>
                </Pressable>

                {/* VAT */}
                <Pressable
                  accessibilityLabel="Xuất hóa đơn VAT điện tử (8%)"
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: hasVatInvoice }}
                  onPress={() => {
                    haptic.selection();
                    setHasVatInvoice((prev) => !prev);
                  }}
                  style={[
                    styles.toggleRow,
                    hasVatInvoice ? styles.toggleRowActive : null,
                  ]}
                >
                  <View
                    style={[
                      styles.checkbox,
                      hasVatInvoice ? styles.checkboxActive : null,
                    ]}
                  >
                    {hasVatInvoice ? (
                      <IconCheck color={customerPalette.surfaceWhite} size={14} strokeWidth={2.5} />
                    ) : null}
                  </View>
                  <View style={styles.toggleLabelCol}>
                    <Text style={styles.toggleTitle}>Xuất hóa đơn VAT điện tử (8%)</Text>
                  </View>
                  <Text style={styles.toggleFee}>+{formatVnd(vatAmount)}</Text>
                </Pressable>
              </View>
            </View>

            {/* 6. Hình thức thanh toán */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Hình thức thanh toán</Text>
              <View style={styles.radioStack}>
                {/* VietQR */}
                <Pressable
                  accessibilityLabel="Chuyển khoản VietQR payOS"
                  accessibilityRole="radio"
                  accessibilityState={{ checked: paymentMethod === 'VIETQR' }}
                  onPress={() => {
                    haptic.selection();
                    setPaymentMethod('VIETQR');
                  }}
                  style={[
                    styles.radioRow,
                    paymentMethod === 'VIETQR' ? styles.radioRowActive : null,
                  ]}
                >
                  <View
                    style={[
                      styles.radioCircle,
                      paymentMethod === 'VIETQR' ? styles.radioCircleActive : null,
                    ]}
                  >
                    {paymentMethod === 'VIETQR' ? (
                      <View style={styles.radioDot} />
                    ) : null}
                  </View>
                  <View style={styles.radioTextCol}>
                    <Text style={styles.radioTitle}>Chuyển khoản VietQR payOS</Text>
                    <Text style={styles.radioSubtitle}>Ký quỹ Escrow bảo vệ an toàn</Text>
                  </View>
                </Pressable>

                {/* Tiền mặt */}
                <Pressable
                  accessibilityLabel="Tiền mặt khi nhận hàng"
                  accessibilityRole="radio"
                  accessibilityState={{ checked: paymentMethod === 'CASH' }}
                  onPress={() => {
                    haptic.selection();
                    setPaymentMethod('CASH');
                  }}
                  style={[
                    styles.radioRow,
                    paymentMethod === 'CASH' ? styles.radioRowActive : null,
                  ]}
                >
                  <View
                    style={[
                      styles.radioCircle,
                      paymentMethod === 'CASH' ? styles.radioCircleActive : null,
                    ]}
                  >
                    {paymentMethod === 'CASH' ? (
                      <View style={styles.radioDot} />
                    ) : null}
                  </View>
                  <View style={styles.radioTextCol}>
                    <Text style={styles.radioTitle}>Tiền mặt khi nhận hàng</Text>
                    <Text style={styles.radioSubtitle}>Người gửi hoặc người nhận thanh toán</Text>
                  </View>
                </Pressable>
              </View>
            </View>
          </ScrollView>

          {/* Footer Primary CTA: Midnight Navy (#0B2545) */}
          <View style={styles.footer}>
            <Pressable
              accessibilityLabel={`XÁC NHẬN GỌI XE · ${formatVnd(totalFare)}`}
              accessibilityRole="button"
              onPress={handleConfirm}
              style={({ pressed }) => [
                styles.confirmBtn,
                pressed ? styles.btnPressed : null,
              ]}
              testID="btn-confirm-booking-details"
            >
              <Text style={styles.confirmBtnText}>
                XÁC NHẬN GỌI XE · {formatVnd(totalFare)} ➔
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    ...Platform.select({
      web: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9998,
      } as any,
    }),
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  sheetContainer: {
    position: 'relative',
    zIndex: 2,
    backgroundColor: customerPalette.surfaceWhite,
    borderTopLeftRadius: radius.modal,
    borderTopRightRadius: radius.modal,
    ...iosContinuousCurve,
    maxHeight: '90%',
    shadowColor: customerPalette.textSlateDark,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 12,
  },
  handleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxs,
  },
  sheetHandle: {
    width: 44,
    height: 4,
    borderRadius: spacing.hairline,
    backgroundColor: colors.neutral.subtleBorder,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  headerTextGroup: {
    flex: 1,
    marginRight: spacing.sm,
  },
  sheetTitle: {
    ...typeScale.headline,
    fontWeight: '800',
    color: customerPalette.textSlateDark,
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    ...typeScale.footnote,
    fontWeight: '600',
    color: customerPalette.textSubtle,
    marginTop: spacing.hairline,
  },
  closeBtn: {
    minWidth: 44,
    minHeight: 44,
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.neutral.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: customerPalette.canvas,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    gap: spacing.xxs,
  },
  routeBadgeDotOrigin: {
    width: spacing.xs,
    height: spacing.xs,
    borderRadius: spacing.xxs,
    backgroundColor: colors.info.text,
  },
  routeBadgeDotDest: {
    width: spacing.xs,
    height: spacing.xs,
    borderRadius: spacing.xxs,
    backgroundColor: colors.danger.text,
  },
  routeBadgeText: {
    flex: 1,
    ...typeScale.caption1,
    fontWeight: '600',
    color: customerPalette.textMutedSlate,
  },
  routeBadgeArrow: {
    ...typeScale.caption2,
    color: leopardPalette.inputPlaceholder,
  },
  routeBadgeStopCountPill: {
    backgroundColor: colors.info.background,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.hairline,
    borderRadius: radius.cardSm,
  },
  routeBadgeStopCountText: {
    ...typeScale.caption2,
    fontWeight: '700',
    color: colors.info.text,
  },
  scrollArea: {
    maxHeight: 460,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sectionTitle: {
    ...typeScale.footnote,
    fontWeight: '700',
    color: customerPalette.textSlateDark,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  badgeRequired: {
    backgroundColor: colors.danger.background,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.hairline,
    borderRadius: radius.cardSm,
  },
  badgeRequiredText: {
    ...typeScale.caption2,
    fontWeight: '800',
    color: colors.danger.text,
    letterSpacing: 0.4,
  },
  photoPickerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: customerPalette.canvas,
    borderRadius: radius.card,
    ...iosContinuousCurve,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.neutral.subtleBorder,
    gap: spacing.sm,
  },
  photoPickerBoxError: {
    borderColor: colors.danger.text,
    backgroundColor: colors.danger.background,
  },
  photoPickerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: customerPalette.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPickerTextCol: {
    flex: 1,
    gap: spacing.hairline,
  },
  photoPickerTitle: {
    ...typeScale.footnote,
    fontWeight: '700',
    color: customerPalette.textSlateDark,
  },
  photoPickerSubtitle: {
    ...typeScale.caption2,
    color: customerPalette.textSubtle,
  },
  imagePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xs,
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: radius.card,
    ...iosContinuousCurve,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    gap: spacing.sm,
  },
  imageThumbnail: {
    width: 48,
    height: 48,
    borderRadius: radius.cardSm,
    backgroundColor: colors.neutral.subtleBorder,
  },
  imageInfoCol: {
    flex: 1,
    gap: spacing.hairline,
  },
  imageFileName: {
    ...typeScale.footnote,
    fontWeight: '700',
    color: customerPalette.textSlateDark,
  },
  imageReadyText: {
    ...typeScale.caption2,
    fontWeight: '600',
    color: leopardPalette.ecoGreen,
  },
  removePhotoBtn: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: radius.cardSm,
    backgroundColor: colors.danger.background,
  },
  removePhotoBtnText: {
    ...typeScale.caption1,
    fontWeight: '700',
    color: colors.danger.text,
  },
  errorFeedbackText: {
    ...typeScale.caption1,
    fontWeight: '600',
    color: colors.danger.text,
    marginTop: spacing.hairline,
  },
  inputStack: {
    gap: spacing.xs,
  },
  textInput: {
    minHeight: 44,
    height: 44,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    backgroundColor: customerPalette.canvas,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    paddingHorizontal: spacing.sm,
    fontSize: typeScale.subheadline.fontSize,
    color: customerPalette.textSlateDark,
  },
  noteInput: {
    marginTop: spacing.hairline,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    ...iosContinuousCurve,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: customerPalette.primary,
    borderWidth: 1,
    borderColor: customerPalette.primary,
  },
  chipUnselected: {
    backgroundColor: customerPalette.canvas,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
  },
  chipText: {
    ...typeScale.footnote,
    letterSpacing: -0.1,
  },
  chipTextSelected: {
    color: customerPalette.surfaceWhite,
    fontWeight: '700',
  },
  chipTextUnselected: {
    color: customerPalette.textMutedSlate,
    fontWeight: '600',
  },

  // ── Voucher Cheetah Golden Amber (#F59E0B) Styles ────────────────
  voucherSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voucherTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  voucherTagAmber: {
    backgroundColor: '#FEF3C7',
    borderColor: customerPalette.accent,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.hairline,
  },
  voucherTagAmberText: {
    ...typeScale.caption2,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.5,
  },
  appliedVoucherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBEB',
    borderColor: customerPalette.accent,
    borderWidth: 1.5,
    borderRadius: radius.card,
    ...iosContinuousCurve,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  appliedVoucherLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  appliedVoucherDot: {
    width: spacing.xs,
    height: spacing.xs,
    borderRadius: spacing.xxs,
    backgroundColor: customerPalette.accent,
  },
  appliedVoucherCode: {
    ...typeScale.subheadline,
    fontWeight: '800',
    color: '#92400E',
    fontVariant: ['tabular-nums'],
  },
  appliedVoucherDesc: {
    ...typeScale.caption2,
    fontWeight: '600',
    color: '#B45309',
    marginTop: spacing.hairline,
  },
  removeVoucherBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voucherInputContainer: {
    gap: spacing.xs,
  },
  voucherInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  voucherTextInput: {
    flex: 1,
    minHeight: 44,
    height: 44,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    backgroundColor: customerPalette.canvas,
    borderWidth: 1,
    borderColor: customerPalette.accent,
    paddingHorizontal: spacing.sm,
    fontSize: typeScale.subheadline.fontSize,
    color: customerPalette.textSlateDark,
    fontWeight: '600',
  },
  applyVoucherBtn: {
    minHeight: 44,
    height: 44,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    backgroundColor: customerPalette.accent,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: customerPalette.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  applyVoucherBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  applyVoucherBtnText: {
    ...typeScale.footnote,
    fontWeight: '800',
    color: customerPalette.surfaceWhite,
  },
  quickVoucherRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  quickVoucherChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderColor: customerPalette.accent,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.hairline,
  },
  quickVoucherChipPressed: {
    opacity: 0.75,
  },
  quickVoucherChipText: {
    ...typeScale.caption2,
    fontWeight: '700',
    color: '#92400E',
    fontVariant: ['tabular-nums'],
  },
  voucherErrorText: {
    ...typeScale.caption2,
    fontWeight: '600',
    color: colors.danger.text,
  },

  // ── Dịch vụ cộng thêm ─────────────────────────────────────────────
  toggleStack: {
    gap: spacing.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.card,
    ...iosContinuousCurve,
    backgroundColor: customerPalette.canvas,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    gap: spacing.xs,
  },
  toggleRowActive: {
    backgroundColor: leopardPalette.ecoGreenBg,
    borderColor: leopardPalette.ecoGreenBorder,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.cardSm,
    borderWidth: 1.5,
    borderColor: leopardPalette.inputPlaceholder,
    backgroundColor: customerPalette.surfaceWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    borderColor: leopardPalette.ecoGreen,
    backgroundColor: leopardPalette.ecoGreen,
  },
  toggleLabelCol: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: typeScale.footnote.fontSize,
    fontWeight: '600',
    color: customerPalette.textSlateDark,
  },
  toggleFee: {
    fontSize: typeScale.footnote.fontSize,
    fontWeight: '700',
    color: leopardPalette.ecoGreen,
    fontVariant: ['tabular-nums'],
  },

  // ── Hình thức thanh toán ──────────────────────────────────────────
  radioStack: {
    gap: spacing.xs,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.card,
    ...iosContinuousCurve,
    backgroundColor: customerPalette.canvas,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    gap: spacing.sm,
  },
  radioRowActive: {
    backgroundColor: colors.info.background,
    borderColor: colors.info.border,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: leopardPalette.inputPlaceholder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: customerPalette.surfaceWhite,
  },
  radioCircleActive: {
    borderColor: colors.info.text,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.info.text,
  },
  radioTextCol: {
    flex: 1,
  },
  radioTitle: {
    fontSize: typeScale.footnote.fontSize,
    fontWeight: '700',
    color: customerPalette.textSlateDark,
  },
  radioSubtitle: {
    fontSize: typeScale.caption1.fontSize,
    fontWeight: '500',
    color: customerPalette.textSubtle,
    marginTop: spacing.hairline,
  },

  // ── Footer CTA: Midnight Navy (#0B2545) ───────────────────────────
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: Platform.select({ ios: 34, default: spacing.md }),
    borderTopWidth: 1,
    borderTopColor: colors.neutral.surfaceMuted,
    backgroundColor: customerPalette.surfaceWhite,
  },
  confirmBtn: {
    minHeight: 52,
    height: 52,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    backgroundColor: customerPalette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 4,
  },
  confirmBtnText: {
    color: customerPalette.surfaceWhite,
    ...typeScale.headline,
    fontWeight: '800',
    letterSpacing: 0.2,
    fontVariant: ['tabular-nums'],
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
});
