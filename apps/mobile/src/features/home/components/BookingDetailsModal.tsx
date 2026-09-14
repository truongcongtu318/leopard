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
  IconCamera,
  iosContinuousCurve,
  pickDeviceImage,
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
  vehicleName: string;
  vehicleDimensions?: string;
  basePrice: number;
  initialReceiverName?: string;
  initialReceiverPhone?: string;
  initialCargoImageUri?: string;
  testID?: string;
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
  vehicleName,
  vehicleDimensions,
  basePrice,
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
  const loadingFee = hasLoadingSupport ? 120000 : 0;
  const vatAmount = Math.round(safeBasePrice * 0.08);
  const vatFee = hasVatInvoice ? vatAmount : 0;
  const totalFare = safeBasePrice + loadingFee + vatFee;

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
            <View style={styles.routeBadge}>
              <View style={styles.routeBadgeDotOrigin} />
              <Text numberOfLines={1} style={styles.routeBadgeText}>
                {pickupAddress || 'Điểm lấy hàng'}
              </Text>
              <Text style={styles.routeBadgeArrow}>➔</Text>
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
                  placeholderTextColor="#94A3B8"
                  style={styles.textInput}
                  value={receiverName}
                />
                <TextInput
                  accessibilityLabel="Số điện thoại người nhận hàng"
                  keyboardType="phone-pad"
                  onChangeText={setReceiverPhone}
                  placeholder="Số điện thoại người nhận"
                  placeholderTextColor="#94A3B8"
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
                placeholderTextColor="#94A3B8"
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
                    <IconCamera color="#0B1E42" size={20} />
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
                  <Text style={styles.toggleFee}>+120.000 ₫</Text>
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
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    ...iosContinuousCurve,
    maxHeight: '90%',
    paddingTop: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 12,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
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
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    minWidth: 44,
    minHeight: 44,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
  },
  routeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  routeBadgeDotOrigin: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563EB',
  },
  routeBadgeDotDest: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
  },
  routeBadgeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  routeBadgeArrow: {
    fontSize: 11,
    color: '#94A3B8',
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
    fontSize: 13.5,
    fontWeight: '700',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  badgeRequired: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeRequiredText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B91C1C',
    letterSpacing: 0.4,
  },
  photoPickerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    gap: 12,
  },
  photoPickerBoxError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  photoPickerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPickerTextCol: {
    flex: 1,
    gap: 2,
  },
  photoPickerTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0B1E42',
  },
  photoPickerSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  imagePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  imageThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#CBD5E1',
  },
  imageInfoCol: {
    flex: 1,
    gap: 2,
  },
  imageFileName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  imageReadyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16A34A',
  },
  removePhotoBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  removePhotoBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
  },
  errorFeedbackText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
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
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0F172A',
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
    backgroundColor: '#0B1E42',
    borderWidth: 1,
    borderColor: '#0B1E42',
  },
  chipUnselected: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipText: {
    fontSize: 13,
    letterSpacing: -0.1,
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  chipTextUnselected: {
    color: '#475569',
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
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  toggleRowActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    borderColor: '#16A34A',
    backgroundColor: '#16A34A',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  toggleLabelCol: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  toggleFee: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#16A34A',
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
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  radioRowActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  radioCircleActive: {
    borderColor: '#2563EB',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563EB',
  },
  radioTextCol: {
    flex: 1,
  },
  radioTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  radioSubtitle: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.select({ ios: 28, default: 20 }),
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  confirmBtn: {
    minHeight: 48,
    height: 48,
    borderRadius: 16,
    ...iosContinuousCurve,
    backgroundColor: '#0B1E42',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    color: '#FFFFFF',
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
