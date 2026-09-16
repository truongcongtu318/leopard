import React, { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  colors,
  customerPalette,
  IconCamera,
  iosContinuousCurve,
  leopardPalette,
  pickDeviceImage,
  systemFontFamily,
  typeScale,
} from '@leopard/mobile-core';
import { haptic } from '@leopard/mobile-core/src/ui/haptics';

export type BookingPaymentMethod = 'VIETQR' | 'CASH';

export interface BookingDetails {
  receiverName: string;
  receiverPhone: string;
  cargoCategory: string;
  cargoNote?: string;
  cargoImageUri: string;
  hasLoadingSupport: boolean;
  hasVatInvoice: boolean;
  paymentMethod: BookingPaymentMethod;
  totalFare: number;
}

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

export const CARGO_CATEGORIES = [
  'Kiện hàng',
  'May mặc',
  'VLXD',
  'Nội thất',
  'Khác',
] as const;

export function formatVnd(val: number): string {
  const rounded = Math.round(val);
  return `${new Intl.NumberFormat('vi-VN').format(rounded)} ₫`;
}

export function BookingDetailsModal({
  visible,
  onClose,
  onConfirm,
  pickupAddress,
  dropoffAddress,
  stops = [],
  vehicleName,
  vehicleDimensions,
  basePrice,
  loadingFee: loadingFeeProp,
  initialCargoImageUri,
  initialReceiverName = '',
  initialReceiverPhone = '',
  testID = 'booking-details-modal',
}: BookingDetailsModalProps) {
  const [receiverName, setReceiverName] = useState(initialReceiverName);
  const [receiverPhone, setReceiverPhone] = useState(initialReceiverPhone);
  const [cargoCategory, setCargoCategory] = useState<string>('Kiện hàng');
  const [cargoNote, setCargoNote] = useState('');
  const [cargoImageUri, setCargoImageUri] = useState<string | null>(
    initialCargoImageUri ?? null,
  );
  const [cargoImageName, setCargoImageName] = useState<string | null>(null);
  const [cargoImageError, setCargoImageError] = useState<string | null>(null);
  const [hasLoadingSupport, setHasLoadingSupport] = useState(false);
  const [hasVatInvoice, setHasVatInvoice] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<BookingPaymentMethod>('VIETQR');

  useEffect(() => {
    if (visible) {
      if (initialReceiverName !== undefined) setReceiverName(initialReceiverName);
      if (initialReceiverPhone !== undefined) setReceiverPhone(initialReceiverPhone);
      if (initialCargoImageUri !== undefined) setCargoImageUri(initialCargoImageUri);
      setCargoImageError(null);
    }
  }, [visible, initialReceiverName, initialReceiverPhone, initialCargoImageUri]);

  const safeBasePrice = Math.max(0, basePrice || 0);
  const stopCount = stops.length;
  const stopSurcharge = stopCount * 30000;
  const unitLoadingFee = loadingFeeProp !== undefined ? loadingFeeProp : resolveDefaultLoadingFee(vehicleName);
  const loadingFee = hasLoadingSupport ? unitLoadingFee : 0;
  const vatAmount = Math.round((safeBasePrice + stopSurcharge + loadingFee) * 0.08);
  const vatFee = hasVatInvoice ? vatAmount : 0;
  const totalFare = safeBasePrice + stopSurcharge + loadingFee + vatFee;

  const handleConfirm = () => {
    if (!cargoImageUri) {
      haptic.warning();
      setCargoImageError('Vui lòng chụp hoặc tải ảnh hàng hóa (Bắt buộc).');
      return;
    }
    setCargoImageError(null);
    haptic.medium();
    onConfirm({
      receiverName: receiverName.trim(),
      receiverPhone: receiverPhone.trim(),
      cargoCategory,
      cargoNote: cargoNote.trim() ? cargoNote.trim() : undefined,
      cargoImageUri,
      hasLoadingSupport,
      hasVatInvoice,
      paymentMethod,
      totalFare,
    });
  };

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
        <View style={styles.sheetContainer}>
          <View style={styles.sheetHandle} />

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
              hitSlop={8}
              onPress={onClose}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          {/* Route Info Badge */}
          {(pickupAddress || dropoffAddress) ? (
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
                          isSelected
                            ? styles.chipTextSelected
                            : styles.chipTextUnselected,
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
                  <Text style={styles.badgeRequiredText}>BẮT BUỘC</Text>
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
                    <Text style={styles.photoPickerTitle}>
                      Chụp hoặc tải ảnh hàng hóa
                    </Text>
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

            {/* 4. Dịch vụ cộng thêm */}
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
                      <Text style={styles.checkmark}>✓</Text>
                    ) : null}
                  </View>
                  <View style={styles.toggleLabelCol}>
                    <Text style={styles.toggleTitle}>
                      Tài xế hỗ trợ bốc xếp 2 đầu
                    </Text>
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
                      <Text style={styles.checkmark}>✓</Text>
                    ) : null}
                  </View>
                  <View style={styles.toggleLabelCol}>
                    <Text style={styles.toggleTitle}>
                      Xuất hóa đơn VAT điện tử (8%)
                    </Text>
                  </View>
                  <Text style={styles.toggleFee}>
                    +{formatVnd(vatAmount)}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* 4. Hình thức thanh toán */}
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
                      paymentMethod === 'VIETQR'
                        ? styles.radioCircleActive
                        : null,
                    ]}
                  >
                    {paymentMethod === 'VIETQR' ? (
                      <View style={styles.radioDot} />
                    ) : null}
                  </View>
                  <View style={styles.radioTextCol}>
                    <Text style={styles.radioTitle}>
                      Chuyển khoản VietQR payOS
                    </Text>
                    <Text style={styles.radioSubtitle}>
                      Ký quỹ Escrow bảo vệ an toàn
                    </Text>
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
                      paymentMethod === 'CASH'
                        ? styles.radioCircleActive
                        : null,
                    ]}
                  >
                    {paymentMethod === 'CASH' ? (
                      <View style={styles.radioDot} />
                    ) : null}
                  </View>
                  <View style={styles.radioTextCol}>
                    <Text style={styles.radioTitle}>
                      Tiền mặt khi nhận hàng
                    </Text>
                    <Text style={styles.radioSubtitle}>
                      Người gửi hoặc người nhận thanh toán
                    </Text>
                  </View>
                </Pressable>
              </View>
            </View>
          </ScrollView>

          {/* Footer Primary CTA */}
          <View style={styles.footer}>
            <Pressable
              accessibilityLabel={`XÁC NHẬN GỌI XE · ${formatVnd(totalFare)}`}
              accessibilityRole="button"
              onPress={handleConfirm}
              style={({ pressed }) => [
                styles.confirmBtn,
                pressed ? styles.btnPressed : null,
              ]}
            >
              <Text style={styles.confirmBtnText}>
                XÁC NHẬN GỌI XE · {formatVnd(totalFare)} ➔
              </Text>
            </Pressable>
          </View>
        </View>
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    ...iosContinuousCurve,
    maxHeight: '90%',
    paddingTop: 8,
    shadowColor: customerPalette.textSlateDark,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 12,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutral.subtleBorder,
    alignSelf: 'center',
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTextGroup: {
    flex: 1,
    marginRight: 12,
  },
  sheetTitle: {
    fontFamily: systemFontFamily,
    fontSize: typeScale.body.fontSize,
    fontWeight: '800',
    color: customerPalette.textSlateDark,
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: customerPalette.textSubtle,
    marginTop: 2,
  },
  closeBtn: {
    minWidth: 44,
    minHeight: 44,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.neutral.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: customerPalette.textSubtle,
  },
  routeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: customerPalette.canvas,
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    gap: 6,
  },
  routeBadgeDotOrigin: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.info.text,
  },
  routeBadgeDotDest: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.danger.text,
  },
  routeBadgeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: customerPalette.textMutedSlate,
  },
  routeBadgeArrow: {
    fontSize: 11,
    color: leopardPalette.inputPlaceholder,
  },
  routeBadgeStopCountPill: {
    backgroundColor: colors.info.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  routeBadgeStopCountText: {
    fontSize: typeScale.caption2.fontSize,
    fontWeight: '700',
    color: colors.info.text,
  },
  scrollArea: {
    maxHeight: 440,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 16,
  },
  section: {
    gap: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: typeScale.footnote.fontSize,
    fontWeight: '700',
    color: customerPalette.textSlateDark,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  badgeRequired: {
    backgroundColor: colors.danger.background,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeRequiredText: {
    fontSize: typeScale.caption2.fontSize,
    fontWeight: '800',
    color: colors.danger.text,
    letterSpacing: 0.4,
  },
  photoPickerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: customerPalette.canvas,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.neutral.subtleBorder,
    gap: 12,
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
    gap: 2,
  },
  photoPickerTitle: {
    fontSize: typeScale.footnote.fontSize,
    fontWeight: '700',
    color: customerPalette.textSlateDark,
  },
  photoPickerSubtitle: {
    fontSize: 11,
    color: customerPalette.textSubtle,
  },
  imagePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    gap: 12,
  },
  imageThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.neutral.subtleBorder,
  },
  imageInfoCol: {
    flex: 1,
    gap: 2,
  },
  imageFileName: {
    fontSize: 13,
    fontWeight: '700',
    color: customerPalette.textSlateDark,
  },
  imageReadyText: {
    fontSize: 11,
    fontWeight: '600',
    color: leopardPalette.ecoGreen,
  },
  removePhotoBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.danger.background,
  },
  removePhotoBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.danger.text,
  },
  errorFeedbackText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.danger.text,
    marginTop: 2,
  },
  inputStack: {
    gap: 8,
  },
  textInput: {
    minHeight: 44,
    height: 44,
    borderRadius: 12,
    ...iosContinuousCurve,
    backgroundColor: customerPalette.canvas,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    paddingHorizontal: 14,
    fontSize: typeScale.subheadline.fontSize,
    color: customerPalette.textSlateDark,
  },
  noteInput: {
    marginTop: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
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
    fontSize: 13,
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
  toggleStack: {
    gap: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    ...iosContinuousCurve,
    backgroundColor: customerPalette.canvas,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    gap: 10,
  },
  toggleRowActive: {
    backgroundColor: leopardPalette.ecoGreenBg,
    borderColor: leopardPalette.ecoGreenBorder,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
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
  checkmark: {
    color: customerPalette.surfaceWhite,
    fontSize: 12,
    fontWeight: '800',
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
  radioStack: {
    gap: 8,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    ...iosContinuousCurve,
    backgroundColor: customerPalette.canvas,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    gap: 12,
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
    marginTop: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.select({ ios: 34, default: 20 }),
    borderTopWidth: 1,
    borderTopColor: colors.neutral.surfaceMuted,
    backgroundColor: customerPalette.surfaceWhite,
  },
  confirmBtn: {
    minHeight: 48,
    height: 48,
    borderRadius: 16,
    ...iosContinuousCurve,
    backgroundColor: customerPalette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    color: customerPalette.surfaceWhite,
    fontFamily: systemFontFamily,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
    fontVariant: ['tabular-nums'],
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
});
