import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  IconCheck,
  IconPaymentConvenient,
  IconQrPayment,
  customerPalette,
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
  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>PHƯƠNG THỨC THANH TOÁN</Text>

      <View style={styles.groupedCard}>
        {/* VietQR */}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: selectedMethod === 'VIETQR' }}
          onPress={() => onSelectMethod('VIETQR')}
          style={({ pressed }) => [
            styles.methodRow,
            selectedMethod === 'VIETQR' && styles.methodRowSelected,
            pressed && styles.rowPressed,
          ]}
        >
          <View style={styles.iconCircle}>
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
          {selectedMethod === 'VIETQR' && (
            <IconCheck color={customerPalette.primary} size={18} />
          )}
        </Pressable>

        <View style={styles.separator} />

        {/* Tiền mặt */}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: selectedMethod === 'CASH' }}
          onPress={() => onSelectMethod('CASH')}
          style={({ pressed }) => [
            styles.methodRow,
            selectedMethod === 'CASH' && styles.methodRowSelected,
            pressed && styles.rowPressed,
          ]}
        >
          <View style={styles.iconCircle}>
            <IconPaymentConvenient color={customerPalette.textSecondary} size={20} />
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodName}>Tiền mặt</Text>
            <Text style={styles.methodDesc}>Thanh toán trực tiếp cho tài xế</Text>
          </View>
          {selectedMethod === 'CASH' && (
            <IconCheck color={customerPalette.primary} size={18} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    ...typeScale.footnote,
    fontWeight: '600',
    color: customerPalette.textSecondary,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.card,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    ...iosContinuousCurve,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    minHeight: 56,
  },
  methodRowSelected: {
    backgroundColor: '#F8FAFC',
  },
  rowPressed: {
    opacity: 0.75,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
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
    color: customerPalette.textPrimary,
  },
  recommendedBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  recommendedBadgeText: {
    ...typeScale.caption2,
    fontWeight: '700',
    color: '#D97706',
  },
  methodDesc: {
    ...typeScale.footnote,
    color: customerPalette.textSecondary,
    marginTop: 2,
  },
  separator: {
    height: 0.5,
    backgroundColor: '#E2E8F0',
    marginLeft: 56,
  },
});
