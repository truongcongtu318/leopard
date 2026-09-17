import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  IconChevronRight,
  customerPalette,
  iosContinuousCurve,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';
import { useSafeInsets } from '../safe-insets';

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
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(60, 60, 67, 0.15)',
    paddingHorizontal: 20,
    paddingTop: 12,
    boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.06)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
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
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  detailsBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
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
    boxShadow: '0 4px 12px rgba(11, 37, 69, 0.28)',
    ...iosContinuousCurve,
  },
  ctaButtonDisabled: {
    backgroundColor: '#CBD5E1',
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
