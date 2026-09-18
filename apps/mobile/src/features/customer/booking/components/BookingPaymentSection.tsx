import React, { useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  IconCheck,
  IconChevronRight,
  IconPaymentConvenient,
  IconQrPayment,
  colors,
  customerPalette,
  haptic,
  iosContinuousCurve,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';
import type { PaymentMethod } from '../booking-schema';

export interface BookingPaymentSectionProps {
  selectedMethod: PaymentMethod;
  onSelectMethod: (method: PaymentMethod) => void;
}

export function BookingPaymentSection({
  selectedMethod,
  onSelectMethod,
}: BookingPaymentSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggleExpand = () => {
    haptic.light();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((prev) => !prev);
  };

  const handleSelect = (method: PaymentMethod) => {
    haptic.selection();
    onSelectMethod(method);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(false);
  };

  const isVietQr = selectedMethod === 'VIETQR';

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>Phương thức thanh toán</Text>

      <View style={styles.insetGroupedCard}>
        {!isExpanded ? (
          /* Trạng thái thu gọn: 1 hàng tóm tắt có nút "Đổi >" */
          <Pressable
            accessibilityHint="Chạm để đổi phương thức thanh toán"
            accessibilityLabel={`Phương thức thanh toán hiện tại: ${isVietQr ? 'VietQR' : 'Tiền mặt'}`}
            accessibilityRole="button"
            onPress={handleToggleExpand}
            style={({ pressed }) => [styles.summaryRow, pressed && styles.rowPressed]}
          >
            <View
              accessibilityElementsHidden={true}
              importantForAccessibility="no"
              style={styles.summaryIconBox}
            >
              {isVietQr ? (
                <IconQrPayment color={customerPalette.primary} size={18} />
              ) : (
                <IconPaymentConvenient color="#64748B" size={18} />
              )}
            </View>
            <View style={styles.summaryInfo}>
              <View style={styles.summaryNameRow}>
                <Text style={styles.summaryMethodName}>
                  {isVietQr ? 'VietQR' : 'Tiền mặt'}
                </Text>
                {isVietQr && (
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedBadgeText}>Khuyên dùng</Text>
                  </View>
                )}
              </View>
              <Text style={styles.summaryDesc}>
                {isVietQr
                  ? 'Quét mã qua mọi ứng dụng ngân hàng'
                  : 'Thanh toán trực tiếp cho tài xế'}
              </Text>
            </View>
            <View style={styles.changeActionWrap}>
              <Text style={styles.changeText}>Đổi</Text>
              <IconChevronRight
                color={customerPalette.primary}
                size={13}
              />
            </View>
          </Pressable>
        ) : (
          /* Trạng thái mở rộng: Cho phép chọn VietQR hoặc Tiền mặt trực tiếp */
          <View style={styles.expandedContainer}>
            {/* Lựa chọn VietQR */}
            <Pressable
              accessibilityLabel={`Phương thức VietQR, Quét mã qua mọi ứng dụng ngân hàng${isVietQr ? ', đã chọn' : ''}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isVietQr }}
              onPress={() => handleSelect('VIETQR')}
              style={({ pressed }) => [
                styles.methodOptionRow,
                isVietQr && styles.methodRowSelected,
                pressed && styles.rowPressed,
              ]}
            >
              <View
                accessibilityElementsHidden={true}
                importantForAccessibility="no"
                style={styles.summaryIconBox}
              >
                <IconQrPayment color={customerPalette.primary} size={18} />
              </View>
              <View style={styles.methodInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.methodName}>VietQR</Text>
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedBadgeText}>Khuyên dùng</Text>
                  </View>
                </View>
                <Text style={styles.methodDesc}>Quét mã qua mọi ứng dụng ngân hàng</Text>
              </View>
              <View
                accessibilityElementsHidden={true}
                importantForAccessibility="no"
                style={styles.checkmarkSlot}
              >
                {isVietQr ? (
                  <View style={styles.checkmarkCircle}>
                    <IconCheck color="#FFFFFF" size={11} strokeWidth={2.5} />
                  </View>
                ) : (
                  <View style={styles.emptyCheckmarkCircle} />
                )}
              </View>
            </Pressable>

            <View style={styles.separator} />

            {/* Lựa chọn Tiền mặt */}
            <Pressable
              accessibilityLabel={`Phương thức Tiền mặt, Thanh toán trực tiếp cho tài xế${!isVietQr ? ', đã chọn' : ''}`}
              accessibilityRole="button"
              accessibilityState={{ selected: !isVietQr }}
              onPress={() => handleSelect('CASH')}
              style={({ pressed }) => [
                styles.methodOptionRow,
                !isVietQr && styles.methodRowSelected,
                pressed && styles.rowPressed,
              ]}
            >
              <View
                accessibilityElementsHidden={true}
                importantForAccessibility="no"
                style={styles.summaryIconBox}
              >
                <IconPaymentConvenient color="#64748B" size={18} />
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodName}>Tiền mặt</Text>
                <Text style={styles.methodDesc}>Thanh toán trực tiếp cho tài xế</Text>
              </View>
              <View
                accessibilityElementsHidden={true}
                importantForAccessibility="no"
                style={styles.checkmarkSlot}
              >
                {!isVietQr ? (
                  <View style={styles.checkmarkCircle}>
                    <IconCheck color="#FFFFFF" size={11} strokeWidth={2.5} />
                  </View>
                ) : (
                  <View style={styles.emptyCheckmarkCircle} />
                )}
              </View>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    ...typeScale.footnote,
    fontWeight: '700',
    color: colors.neutral.mutedText,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xxs + 2,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  insetGroupedCard: {
    marginHorizontal: spacing.md,
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
    ...iosContinuousCurve,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: 52,
    height: 52,
  },
  rowPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  summaryIconBox: {
    width: 34,
    height: 34,
    borderRadius: radius.cardSm,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#EDF2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    ...iosContinuousCurve,
  },
  summaryInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  summaryNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs + 2,
  },
  summaryMethodName: {
    ...typeScale.subheadline,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  summaryDesc: {
    ...typeScale.caption2,
    color: customerPalette.textSubtle,
    marginTop: 1,
  },
  changeActionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: spacing.xs,
  },
  changeText: {
    ...typeScale.caption1,
    fontWeight: '600',
    color: customerPalette.primary,
  },
  expandedContainer: {
    backgroundColor: '#FFFFFF',
  },
  methodOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: 52,
    height: 52,
  },
  methodRowSelected: {
    backgroundColor: 'rgba(11, 37, 69, 0.03)',
  },
  methodInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs + 2,
  },
  methodName: {
    ...typeScale.subheadline,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  recommendedBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    paddingHorizontal: spacing.xxs + 2,
    paddingVertical: 1,
    borderRadius: radius.pill,
    ...iosContinuousCurve,
  },
  recommendedBadgeText: {
    ...typeScale.caption2,
    fontWeight: '700',
    color: '#B45309',
    fontSize: 10,
    lineHeight: 12,
  },
  methodDesc: {
    ...typeScale.caption2,
    color: customerPalette.textSubtle,
    marginTop: 1,
  },
  checkmarkSlot: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkCircle: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: customerPalette.primary,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(11, 37, 69, 0.2)',
  },
  emptyCheckmarkCircle: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  separator: {
    height: 0.5,
    backgroundColor: '#E2E8F0',
    marginLeft: 58,
  },
});
