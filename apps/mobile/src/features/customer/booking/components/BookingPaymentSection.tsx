import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  IconCheck,
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
  const handleSelect = (method: PaymentMethod) => {
    haptic.selection();
    onSelectMethod(method);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>Phương thức thanh toán</Text>

      <View style={styles.insetGroupedCard}>
        {/* VietQR */}
        <Pressable
          accessibilityLabel={`Phương thức VietQR, Quét mã qua mọi ứng dụng ngân hàng, Khuyên dùng${selectedMethod === 'VIETQR' ? ', đã chọn' : ''}`}
          accessibilityRole="button"
          accessibilityState={{ selected: selectedMethod === 'VIETQR' }}
          onPress={() => handleSelect('VIETQR')}
          style={({ pressed }) => [
            styles.methodRow,
            selectedMethod === 'VIETQR' && styles.methodRowSelected,
            pressed && styles.rowPressed,
          ]}
        >
          <View
            accessibilityElementsHidden={true}
            importantForAccessibility="no"
            style={styles.iconCircle}
          >
            <IconQrPayment color={customerPalette.primary} size={20} />
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
            {selectedMethod === 'VIETQR' && (
              <View style={styles.checkmarkCircle}>
                <IconCheck color="#FFFFFF" size={12} />
              </View>
            )}
          </View>
        </Pressable>

        <View style={styles.separator} />

        {/* Tiền mặt */}
        <Pressable
          accessibilityLabel={`Phương thức Tiền mặt, Thanh toán trực tiếp cho tài xế${selectedMethod === 'CASH' ? ', đã chọn' : ''}`}
          accessibilityRole="button"
          accessibilityState={{ selected: selectedMethod === 'CASH' }}
          onPress={() => handleSelect('CASH')}
          style={({ pressed }) => [
            styles.methodRow,
            selectedMethod === 'CASH' && styles.methodRowSelected,
            pressed && styles.rowPressed,
          ]}
        >
          <View
            accessibilityElementsHidden={true}
            importantForAccessibility="no"
            style={styles.iconCircle}
          >
            <IconPaymentConvenient color="#64748B" size={20} />
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
            {selectedMethod === 'CASH' && (
              <View style={styles.checkmarkCircle}>
                <IconCheck color="#FFFFFF" size={12} />
              </View>
            )}
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    ...typeScale.footnote,
    fontWeight: '600',
    color: colors.neutral.mutedText,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  insetGroupedCard: {
    marginHorizontal: spacing.md,
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
    ...iosContinuousCurve,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 64,
  },
  methodRowSelected: {
    backgroundColor: customerPalette.primaryBg,
  },
  rowPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.control,
    backgroundColor: colors.neutral.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    ...iosContinuousCurve,
  },
  methodInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  methodName: {
    ...typeScale.body,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  recommendedBadge: {
    backgroundColor: colors.warning.background,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.hairline,
    borderRadius: radius.cardSm,
    ...iosContinuousCurve,
  },
  recommendedBadgeText: {
    ...typeScale.caption2,
    fontWeight: '700',
    color: colors.warning.text,
  },
  methodDesc: {
    ...typeScale.footnote,
    color: customerPalette.textSubtle,
    marginTop: spacing.hairline,
  },
  checkmarkSlot: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkCircle: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: customerPalette.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  separator: {
    height: 0.5,
    backgroundColor: colors.neutral.border,
    marginLeft: 68,
  },
});
