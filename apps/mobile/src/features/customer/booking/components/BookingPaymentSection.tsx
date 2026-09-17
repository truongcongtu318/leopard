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

      <View style={styles.insetGroupedCard}>
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
          <View style={styles.checkmarkSlot}>
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
            <IconPaymentConvenient color="#64748B" size={20} />
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodName}>Tiền mặt</Text>
            <Text style={styles.methodDesc}>Thanh toán trực tiếp cho tài xế</Text>
          </View>
          <View style={styles.checkmarkSlot}>
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
    marginTop: 24,
    marginBottom: 32,
  },
  sectionHeader: {
    ...typeScale.footnote,
    fontSize: 13,
    fontWeight: '600',
    color: '#6E6E73',
    paddingHorizontal: 32,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: -0.08,
  },
  insetGroupedCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
    ...iosContinuousCurve,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 64,
  },
  methodRowSelected: {
    backgroundColor: 'rgba(11, 37, 69, 0.03)',
  },
  rowPressed: {
    opacity: 0.75,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    ...iosContinuousCurve,
  },
  methodInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  methodName: {
    ...typeScale.body,
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  recommendedBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  recommendedBadgeText: {
    ...typeScale.caption2,
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  methodDesc: {
    ...typeScale.footnote,
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
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
    borderRadius: 10,
    backgroundColor: customerPalette.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  separator: {
    height: 0.5,
    backgroundColor: '#E5E5EA',
    marginLeft: 68,
  },
});
