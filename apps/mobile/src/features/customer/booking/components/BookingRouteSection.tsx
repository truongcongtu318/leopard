import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  IconChevronRight,
  IconClose,
  IconPlus,
  customerPalette,
  iosContinuousCurve,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';
import type { RouteStop } from '../booking-schema';

export interface BookingRouteSectionProps {
  pickupAddress: string;
  dropoffAddress: string;
  stops: RouteStop[];
  distanceKm: number;
  etaMinutes: number;
  onPressPickup?: () => void;
  onPressDropoff?: () => void;
  onAddStop: () => void;
  onRemoveStop: (stopId: string) => void;
  routeError?: string;
}

export function BookingRouteSection({
  pickupAddress,
  dropoffAddress,
  stops,
  distanceKm,
  etaMinutes,
  onPressPickup,
  onPressDropoff,
  onAddStop,
  onRemoveStop,
  routeError,
}: BookingRouteSectionProps) {
  const isIdentical =
    pickupAddress.trim().length > 0 &&
    pickupAddress.trim().toLowerCase() === dropoffAddress.trim().toLowerCase();

  return (
    <View style={styles.container}>
      <View style={[styles.card, (routeError || isIdentical) && styles.cardError]}>
        {/* Điểm lấy hàng */}
        <Pressable
          accessibilityRole="button"
          onPress={onPressPickup}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
          <View style={styles.indicatorCol}>
            <View style={styles.greenCircleDot} />
            <View style={styles.dottedLine} />
          </View>
          <View style={styles.addressTextCol}>
            <View style={styles.tagRow}>
              <Text style={styles.stopTypeLabel}>ĐIỂM LẤY HÀNG</Text>
              <View style={styles.warehouseTag}>
                <Text style={styles.warehouseTagText}>Kho</Text>
              </View>
            </View>
            <Text numberOfLines={1} style={styles.addressLine1}>
              {pickupAddress || 'Chọn điểm lấy hàng'}
            </Text>
          </View>
          <IconChevronRight color={customerPalette.textSecondary} size={16} />
        </Pressable>

        {/* Điểm dừng trung gian (nếu có) */}
        {stops.map((stop, index) => (
          <View key={stop.id} style={styles.stopRow}>
            <View style={styles.indicatorCol}>
              <View style={styles.orangeCircleDot} />
              <View style={styles.dottedLine} />
            </View>
            <View style={styles.addressTextCol}>
              <Text style={styles.stopTypeLabel}>ĐIỂM DỪNG {index + 1}</Text>
              <Text numberOfLines={1} style={styles.addressLine1}>
                {stop.address}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={`Xóa điểm dừng ${index + 1}`}
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => onRemoveStop(stop.id)}
              style={styles.removeStopBtn}
            >
              <IconClose color="#FF3B30" size={16} />
            </Pressable>
          </View>
        ))}

        {/* Điểm giao hàng */}
        <Pressable
          accessibilityRole="button"
          onPress={onPressDropoff}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
          <View style={styles.indicatorCol}>
            <View style={styles.redSquareDot} />
          </View>
          <View style={styles.addressTextCol}>
            <Text style={styles.stopTypeLabel}>ĐIỂM GIAO HÀNG</Text>
            <Text numberOfLines={1} style={styles.addressLine1}>
              {dropoffAddress || 'Chọn điểm giao hàng'}
            </Text>
          </View>
          <IconChevronRight color={customerPalette.textSecondary} size={16} />
        </Pressable>

        {/* Hàng "+ Thêm điểm dừng" */}
        {stops.length < 3 && (
          <View style={styles.addStopWrap}>
            <View style={styles.separator} />
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={onAddStop}
              style={({ pressed }) => [styles.addStopBtn, pressed && styles.rowPressed]}
            >
              <IconPlus color={customerPalette.primary} size={16} />
              <Text style={styles.addStopBtnText}>+ Thêm điểm dừng</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Thông tin cự ly & thời gian dự kiến */}
      <Text style={styles.routeFooter}>
        Khoảng {distanceKm.toFixed(1).replace('.', ',')} km · dự kiến {etaMinutes} phút
      </Text>

      {/* Lỗi lộ trình nếu trùng nhau */}
      {(routeError || isIdentical) && (
        <Text style={styles.errorText}>
          {routeError || 'Điểm giao hàng không được trùng với điểm lấy hàng'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    marginTop: -16,
    zIndex: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.card,
    padding: spacing.sm,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    ...iosContinuousCurve,
  },
  cardError: {
    borderColor: '#FF3B30',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    minHeight: 52,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    minHeight: 48,
  },
  rowPressed: {
    opacity: 0.7,
  },
  indicatorCol: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greenCircleDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34C759',
  },
  orangeCircleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF9500',
  },
  redSquareDot: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#FF3B30',
  },
  dottedLine: {
    width: 1.5,
    height: 32,
    backgroundColor: '#CBD5E1',
    marginVertical: 2,
  },
  addressTextCol: {
    flex: 1,
    paddingHorizontal: spacing.xs,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  stopTypeLabel: {
    ...typeScale.caption2,
    fontWeight: '700',
    color: customerPalette.textSecondary,
    letterSpacing: 0.5,
  },
  warehouseTag: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  warehouseTagText: {
    ...typeScale.caption2,
    fontWeight: '600',
    color: '#2E7D32',
  },
  addressLine1: {
    ...typeScale.body,
    fontWeight: '500',
    color: customerPalette.textPrimary,
  },
  separator: {
    height: 0.5,
    backgroundColor: '#E2E8F0',
    marginVertical: spacing.xs,
  },
  addStopWrap: {
    marginTop: 2,
  },
  addStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    minHeight: 44,
  },
  addStopBtnText: {
    ...typeScale.subheadline,
    fontWeight: '600',
    color: customerPalette.primary,
  },
  removeStopBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeFooter: {
    ...typeScale.footnote,
    color: customerPalette.textSecondary,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  errorText: {
    ...typeScale.footnote,
    color: '#FF3B30',
    marginTop: 4,
    paddingHorizontal: spacing.xs,
  },
});
