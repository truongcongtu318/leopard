import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
  return (
    <View style={styles.fixedContainer}>
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
          style={styles.detailsBtn}
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 0.5,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  fareGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  fareLabel: {
    ...typeScale.subheadline,
    color: customerPalette.textSecondary,
  },
  fareValue: {
    ...typeScale.title2,
    fontWeight: '700',
    color: customerPalette.textPrimary,
  },
  detailsBtn: {
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.xs,
  },
  detailsBtnText: {
    ...typeScale.subheadline,
    fontWeight: '500',
    color: customerPalette.primary,
  },
  ctaButton: {
    height: 50,
    backgroundColor: customerPalette.primary,
    borderRadius: radius.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...iosContinuousCurve,
  },
  ctaButtonDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.5,
  },
  ctaButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  ctaText: {
    ...typeScale.headline,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  ctaTextDisabled: {
    color: '#E2E8F0',
  },
});
