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
      pointerEvents="box-none"
      style={[
        styles.dockOuterWrapper,
        { paddingBottom: Math.max(insets.bottom, spacing.xs) + spacing.xs },
      ]}
    >
      <View style={styles.floatingDock}>
        {/* Cụm thông tin giá cước & xem chi tiết */}
        <View style={styles.dockLeftSection}>
          <View style={styles.fareLabelRow}>
            <Text style={styles.fareLabel}>Tổng cước:</Text>
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

          <View
            accessibilityLabel={
              hasFare ? `Tổng cước: ${totalFare.toLocaleString('vi-VN')} đồng` : 'Đang tính cước'
            }
            accessible={true}
          >
            {/* No fare yet means the route estimate has not resolved; showing the
                base fare here would quote a price the trip may not cost. */}
            <Text selectable style={styles.fareValue}>
              {hasFare ? `${totalFare.toLocaleString('vi-VN')} đ` : 'Đang tính…'}
            </Text>
          </View>
        </View>

        {/* Nút Đặt xe CTA */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  dockOuterWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    zIndex: 100,
  },
  floatingDock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: radius.cardXl,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.95)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 74,
    boxShadow: '0 12px 32px rgba(11, 37, 69, 0.14), 0 2px 8px rgba(0, 0, 0, 0.04)',
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 12,
    ...iosContinuousCurve,
  },
  dockLeftSection: {
    flex: 1,
    marginRight: spacing.sm,
    justifyContent: 'center',
  },
  fareLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.hairline,
  },
  fareLabel: {
    ...typeScale.footnote,
    fontWeight: '500',
    color: customerPalette.textSubtle,
  },
  fareValue: {
    ...typeScale.title2,
    fontWeight: '700',
    color: customerPalette.textSlateDark,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  detailsBtn: {
    paddingVertical: 2,
    paddingHorizontal: spacing.xs,
    backgroundColor: customerPalette.primaryBg,
    borderRadius: radius.pill,
    ...iosContinuousCurve,
  },
  btnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  detailsBtnText: {
    ...typeScale.caption2,
    fontWeight: '600',
    color: customerPalette.primary,
  },
  ctaButton: {
    height: 50,
    paddingHorizontal: spacing.lg,
    backgroundColor: customerPalette.primary,
    borderRadius: radius.cardLg,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 128,
    boxShadow: '0 4px 14px rgba(11, 37, 69, 0.28)',
    ...iosContinuousCurve,
  },
  ctaButtonDisabled: {
    backgroundColor: '#E2E8F0',
    boxShadow: 'none',
  },
  ctaButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  ctaText: {
    ...typeScale.headline,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  ctaTextDisabled: {
    color: '#94A3B8',
    fontWeight: '600',
  },
});
