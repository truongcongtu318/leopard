import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  customerPalette,
  haptic,
  iosContinuousCurve,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';
import { useSafeInsets } from '../safe-insets';

export interface BookingFixedBottomBarProps {
  totalFare: number;
  isValid: boolean;
  /** False until a real routed distance produced a real fare. */
  hasFare?: boolean;
  onPressBook: () => void;
  onPressDetails: () => void;
  isLoading?: boolean;
}

export function BookingFixedBottomBar({
  totalFare,
  isValid,
  hasFare = true,
  onPressBook,
  onPressDetails,
  isLoading = false,
}: BookingFixedBottomBarProps) {
  const insets = useSafeInsets();

  const handleBook = () => {
    if (isValid && !isLoading) {
      haptic.medium();
      onPressBook();
    }
  };

  const handleDetails = () => {
    haptic.light();
    onPressDetails();
  };

  return (
    <View
      style={[
        styles.fixedContainer,
        { paddingBottom: Math.max(insets.bottom, spacing.md) },
      ]}
    >
      <View style={styles.topRow}>
        <View
          accessibilityLabel={
            hasFare ? `Tổng cước: ${totalFare.toLocaleString('vi-VN')} đồng` : 'Đang tính cước'
          }
          accessible={true}
          style={styles.fareGroup}
        >
          <Text style={styles.fareLabel}>Tổng cước:</Text>
          {/* No fare yet means the route estimate has not resolved; showing the
              base fare here would quote a price the trip may not cost. */}
          <Text style={styles.fareValue}>
            {hasFare ? `${totalFare.toLocaleString('vi-VN')} đ` : 'Đang tính…'}
          </Text>
        </View>

        <Pressable
          accessibilityLabel="Xem chi tiết cước vận chuyển"
          accessibilityRole="button"
          hitSlop={8}
          onPress={handleDetails}
          style={({ pressed }) => [styles.detailsBtn, pressed && styles.btnPressed]}
        >
          <Text style={styles.detailsBtnText}>Chi tiết ⌵</Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !isValid || isLoading }}
        disabled={!isValid || isLoading}
        onPress={handleBook}
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
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(60, 60, 67, 0.14)',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.06)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
  },
  fareGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  fareLabel: {
    ...typeScale.subheadline,
    color: customerPalette.textSubtle,
  },
  fareValue: {
    ...typeScale.title2,
    fontWeight: '700',
    color: customerPalette.textSlateDark,
    fontVariant: ['tabular-nums'],
  },
  detailsBtn: {
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    backgroundColor: customerPalette.primaryBg,
    borderRadius: radius.cardSm,
    ...iosContinuousCurve,
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  detailsBtnText: {
    ...typeScale.footnote,
    fontWeight: '600',
    color: customerPalette.primary,
  },
  ctaButton: {
    height: 52,
    backgroundColor: customerPalette.primary,
    borderRadius: radius.cardLg,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 4px 14px rgba(11, 37, 69, 0.25)',
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
    color: '#FFFFFF',
  },
  ctaTextDisabled: {
    color: '#94A3B8',
  },
});
