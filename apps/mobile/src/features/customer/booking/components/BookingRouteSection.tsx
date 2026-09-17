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
            <View style={styles.greenHalo}>
              <View style={styles.greenInnerDot} />
            </View>
            <View style={styles.connectorLine} />
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
          <IconChevronRight color="#C7C7CC" size={14} />
        </Pressable>

        {/* Điểm dừng trung gian (nếu có) */}
        {stops.map((stop, index) => (
          <View key={stop.id} style={styles.stopRow}>
            <View style={styles.indicatorCol}>
              <View style={styles.orangeHalo}>
                <View style={styles.orangeInnerDot} />
              </View>
              <View style={styles.connectorLine} />
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
              <View style={styles.removeStopCircle}>
                <IconClose color="#FFFFFF" size={10} />
              </View>
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
            <View style={styles.redHalo}>
              <View style={styles.redInnerSquare} />
            </View>
          </View>
          <View style={styles.addressTextCol}>
            <Text style={styles.stopTypeLabel}>ĐIỂM GIAO HÀNG</Text>
            <Text numberOfLines={1} style={styles.addressLine1}>
              {dropoffAddress || 'Chọn điểm giao hàng'}
            </Text>
          </View>
          <IconChevronRight color="#C7C7CC" size={14} />
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
              <IconPlus color={customerPalette.primary} size={15} />
              <Text style={styles.addStopBtnText}>+ Thêm điểm dừng</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Footer lộ trình */}
      <Text style={styles.routeFooter}>
        Khoảng {distanceKm.toFixed(1).replace('.', ',')} km · dự kiến {etaMinutes} phút
      </Text>

      {/* Lỗi lộ trình */}
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
    paddingHorizontal: 16,
    marginTop: -20,
    zIndex: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
    ...iosContinuousCurve,
  },
  cardError: {
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 52,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
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
  greenHalo: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(52, 199, 89, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  greenInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34C759',
  },
  orangeHalo: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 149, 0, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orangeInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF9500',
  },
  redHalo: {
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 59, 48, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  redInnerSquare: {
    width: 6,
    height: 6,
    borderRadius: 1.5,
    backgroundColor: '#FF3B30',
  },
  connectorLine: {
    width: 1.5,
    height: 28,
    backgroundColor: '#D1D1D6',
    marginVertical: 2,
  },
  addressTextCol: {
    flex: 1,
    paddingHorizontal: 8,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  stopTypeLabel: {
    ...typeScale.caption2,
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 0.4,
  },
  warehouseTag: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  warehouseTagText: {
    ...typeScale.caption2,
    fontSize: 10,
    fontWeight: '700',
    color: '#2E7D32',
  },
  addressLine1: {
    ...typeScale.body,
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  separator: {
    height: 0.5,
    backgroundColor: '#E5E5EA',
    marginLeft: 36,
  },
  addStopWrap: {
    marginTop: 2,
  },
  addStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingLeft: 36,
    minHeight: 44,
  },
  addStopBtnText: {
    ...typeScale.subheadline,
    fontSize: 14,
    fontWeight: '600',
    color: customerPalette.primary,
  },
  removeStopBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeStopCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeFooter: {
    ...typeScale.footnote,
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 8,
    paddingHorizontal: 8,
    textAlign: 'center',
  },
  errorText: {
    ...typeScale.footnote,
    fontSize: 13,
    color: '#FF3B30',
    marginTop: 4,
    paddingHorizontal: 8,
    textAlign: 'center',
  },
});
