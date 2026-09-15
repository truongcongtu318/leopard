import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { iosContinuousCurve, IconRadarPulse } from '@leopard/mobile-core';

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
 * One compact load-board header.
 *
 * Deliberately a single row: the previous version stacked a radar scan strip and
 * a section header that both repeated the same order count, plus a settings
 * button that duplicated the map control stack.
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
    <View style={styles.row} testID="driver-load-board-header">
      <View style={styles.iconDisc}>
        <IconRadarPulse color="#0B1E42" size={16} />
      </View>

      <View style={styles.textWrap}>
        <Text accessibilityRole="header" style={styles.title}>
          Đơn có thể nhận
        </Text>
        <Text numberOfLines={1} style={styles.status}>
          {statusLine}
        </Text>
      </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(11, 30, 66, 0.08)',
    borderRadius: 16,
    ...iosContinuousCurve,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  iconDisc: {
    alignItems: 'center',
    backgroundColor: '#F0F4F9',
    borderRadius: 15,
    height: 30,
    justifyContent: 'center',
    marginRight: 10,
    width: 30,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    color: '#0B1E42',
    fontSize: 14,
    fontWeight: '800',
  },
  status: {
    color: '#64748B',
    fontSize: 11.5,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    marginTop: 1,
  },
  debugBtn: {
    alignItems: 'center',
    backgroundColor: '#F0F4F9',
    borderColor: '#CBD5E1',
    borderRadius: 10,
    ...iosContinuousCurve,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 10,
  },
  debugBtnText: {
    color: '#0B1E42',
    fontSize: 11,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});
