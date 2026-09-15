import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconUser, radius } from '@leopard/mobile-core';

export type DriverTopHudProps = Readonly<{
  driverName?: string | null;
  vehiclePlate?: string | null;
  vehicleType?: string | null;
  isOnline: boolean;
  onToggleAvailability: () => void;
  todayEarningsLabel?: string;
  todayTripsCount?: number;
  onOpenProfile?: () => void;
  onOpenEarnings?: () => void;
  isPending?: boolean;
  disabled?: boolean;
  toggleAccessibilityLabel?: string;
  dutyTestID?: string;
}>;

export function DriverTopHud({
  driverName,
  vehiclePlate,
  isOnline,
  onToggleAvailability,
  todayEarningsLabel = '0 ₫',
  todayTripsCount,
  onOpenProfile,
  onOpenEarnings,
  isPending = false,
  disabled = false,
  toggleAccessibilityLabel,
  dutyTestID,
}: DriverTopHudProps): React.JSX.Element {
  const profileLabel = vehiclePlate?.trim() || driverName?.trim() || 'Tài xế';
  const isButtonDisabled = disabled || isPending;

  return (
    <View style={styles.container} testID="driver-top-hud">
      {/* Left Pill: Driver Profile */}
      <Pressable
        accessibilityLabel="Hồ sơ tài xế"
        accessibilityRole="button"
        onPress={onOpenProfile}
        style={({ pressed }) => [styles.pill, styles.profilePill, pressed && styles.pressed]}
        testID="driver-profile-pill"
      >
        <View style={styles.avatarWrap}>
          <IconUser color="#0B1E42" size={16} />
        </View>
        <Text numberOfLines={1} style={styles.profileText}>
          {profileLabel}
        </Text>
      </Pressable>

      {/* Center Pill: Duty Status Toggle */}
      <Pressable
        accessibilityLabel={
          toggleAccessibilityLabel ||
          (isPending
            ? 'Đang cập nhật trạng thái nhận đơn'
            : isOnline
              ? 'Chuyển sang nghỉ'
              : 'Chuyển sang trực tuyến')
        }
        accessibilityRole="button"
        accessibilityState={{ busy: isPending, disabled: isButtonDisabled }}
        disabled={isButtonDisabled}
        onPress={onToggleAvailability}
        style={({ pressed }) => [
          styles.pill,
          styles.dutyPill,
          isOnline ? styles.dutyOnline : styles.dutyOffline,
          pressed && !isButtonDisabled && styles.pressed,
        ]}
        testID={dutyTestID || 'driver-duty-toggle'}
      >
        <View
          style={[
            styles.statusDot,
            { backgroundColor: isOnline ? '#16A34A' : '#64748B' },
          ]}
          testID="driver-duty-dot"
        />
        <Text
          style={[
            styles.dutyText,
            { color: isOnline ? '#15803D' : '#475569' },
          ]}
        >
          {isOnline ? 'TRỰC TUYẾN' : 'NGHỈ'}
        </Text>
      </Pressable>

      {/* Right Pill: Daily Earnings */}
      <Pressable
        accessibilityLabel="Thu nhập hôm nay"
        accessibilityRole="button"
        onPress={onOpenEarnings}
        style={({ pressed }) => [styles.pill, styles.earningsPill, pressed && styles.pressed]}
        testID="driver-earnings-pill"
      >
        <Text style={styles.earningsAmount}>
          {todayEarningsLabel}
        </Text>
        {typeof todayTripsCount === 'number' && (
          <View style={styles.tripBadge} testID="driver-trip-count-badge">
            <Text style={styles.tripBadgeText}>{todayTripsCount}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

// ponytail: Basic layout for top HUD cockpit; upgrade path: add animated pulsing ring for online status dot when ready
const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderColor: '#E2E8F0',
    borderRadius: radius.cardXl,
    borderWidth: 1,
    elevation: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  pill: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  profilePill: {
    backgroundColor: 'rgba(15, 23, 42, 0.04)',
    gap: 6,
    maxWidth: 130,
  },
  avatarWrap: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  profileText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '600',
  },
  dutyPill: {
    gap: 6,
  },
  dutyOnline: {
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
  },
  dutyOffline: {
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
  },
  statusDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  dutyText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  earningsPill: {
    backgroundColor: 'rgba(15, 23, 42, 0.04)',
    gap: 6,
  },
  earningsAmount: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  tripBadge: {
    alignItems: 'center',
    backgroundColor: '#0B1E42',
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  tripBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  pressed: {
    opacity: 0.75,
  },
});
