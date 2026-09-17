import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeInsets } from '../safe-insets';

import {
  customerPalette,
  iosContinuousCurve,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';

export interface BookingFixedBottomBarProps {
  totalFare: number;
  isValid: boolean;
  onPressBook: () => void;
  onPressDetails: () => void;
  isLoading?: boolean;
}

export function BookingFixedBottomBar({
  totalFare,
  isValid,
  onPressBook,
  onPressDetails,
  isLoading = false,
}: BookingFixedBottomBarProps) {
  const insets = useSafeInsets();

  return (
    <View
      style={[
        styles.fixedContainer,
        { paddingBottom: Math.max(insets.bottom, 16) },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.fareGroup}>
          <Text style={styles.fareLabel}>Tổng cước:</Text>
          <Text style={styles.fareValue}>
            {totalFare.toLocaleString('vi-VN')} đ
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={onPressDetails}
          style={({ pressed }) => [styles.detailsBtn, pressed && styles.btnPressed]}
        >
          <Text style={styles.detailsBtnText}>Chi tiết ⌵</Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !isValid || isLoading }}
        disabled={!isValid || isLoading}
        onPress={isValid && !isLoading ? onPressBook : undefined}
        style={({ pressed }) => [
          styles.ctaButton,
          !isValid && styles.ctaButtonDisabled,
          pressed && isValid && styles.ctaButtonPressed,
        ]}
      >
        <Text style={[styles.ctaText, !isValid && styles.ctaTextDisabled]}>
          {isLoading ? 'Đang tạo đơn...' : 'Đặt xe'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fixedContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(60, 60, 67, 0.18)',
    paddingHorizontal: 20,
    paddingTop: 12,
    boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.05)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  fareGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  fareLabel: {
    ...typeScale.subheadline,
    fontSize: 14,
    color: '#8E8E93',
  },
  fareValue: {
    ...typeScale.title2,
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    fontVariant: ['tabular-nums'],
  },
  detailsBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#EBF2FA',
    borderRadius: 12,
    ...iosContinuousCurve,
  },
  btnPressed: {
    opacity: 0.7,
  },
  detailsBtnText: {
    ...typeScale.footnote,
    fontSize: 13,
    fontWeight: '600',
    color: customerPalette.primary,
  },
  ctaButton: {
    height: 52,
    backgroundColor: customerPalette.primary,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(11, 37, 69, 0.25)',
    ...iosContinuousCurve,
  },
  ctaButtonDisabled: {
    backgroundColor: '#E2E8F0',
    boxShadow: 'none',
  },
  ctaButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  ctaText: {
    ...typeScale.headline,
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  ctaTextDisabled: {
    color: '#94A3B8',
  },
});
