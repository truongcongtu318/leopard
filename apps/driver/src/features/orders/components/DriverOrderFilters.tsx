import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Badge,
  Box,
  HStack,
  IconRadarPulse,
  spacing,
  VStack,
  colors,
} from '@leopard/mobile-core';

export type DriverOrderFiltersProps = Readonly<{
  /** How many compatible orders the radar is currently offering. */
  totalCount: number;
  /** Whether the driver is already on a trip (radar is paused). */
  hasActiveTrip?: boolean;
  /** Receiving radius in km, shown as part of the single status line. */
  radiusKm?: string;
  onSimulateOffer?: () => void;
  showDebugActions?: boolean;
}>;

/**
 * Apple HIG Inset Grouped Section Header for the load board.
 *
 * Sits cleanly directly on the canvas without an unnecessary heavy card enclosure.
 * Features an active radar pulse pill and clear scannable counter.
 */
export function DriverOrderFilters({
  hasActiveTrip = false,
  onSimulateOffer,
  radiusKm = '5',
  showDebugActions = false,
  totalCount,
}: DriverOrderFiltersProps) {
  const statusLine = hasActiveTrip
    ? 'Tạm dừng nhận đơn mới trong lúc chạy chuyến'
    : totalCount > 0
      ? `${totalCount} đơn phù hợp trong bán kính ${radiusKm} km`
      : `Đang quét bán kính ${radiusKm} km`;

  return (
    <HStack style={styles.sectionHeader} testID="driver-load-board-header">
      <VStack style={styles.headerInfo}>
        <HStack style={styles.titleRow}>
          <Text accessibilityRole="header" style={styles.title}>
            Đơn có thể nhận
          </Text>
          <Badge action="success" size="sm" style={styles.radarPill}>
            <Box style={styles.radarDot} />
            <IconRadarPulse color="#16A34A" size={12} />
          </Badge>
        </HStack>
        <Text numberOfLines={1} style={styles.status}>
          {statusLine}
        </Text>
      </VStack>

      {showDebugActions && onSimulateOffer && !hasActiveTrip ? (
        <Pressable
          accessibilityHint="Mở modal đơn nổ để thử nghiệm giao diện tiếp nhận"
          accessibilityLabel="Mô phỏng nổ đơn"
          accessibilityRole="button"
          onPress={onSimulateOffer}
          style={({ pressed }) => [styles.debugBtn, pressed ? styles.pressed : null]}
        >
          <Text style={styles.debugBtnText}>Thử nổ đơn</Text>
        </Pressable>
      ) : null}
    </HStack>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    marginTop: spacing.xxs,
    paddingHorizontal: spacing.xxs,
  },
  headerInfo: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  title: {
    color: colors.neutral.text,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  radarPill: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  radarDot: {
    backgroundColor: '#16A34A',
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  status: {
    color: colors.neutral.subtleText,
    fontSize: 13,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  debugBtn: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surfaceMuted,
    borderColor: colors.neutral.border,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: 8,
  },
  debugBtnText: {
    color: colors.brand.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.8,
  },
});
