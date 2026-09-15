import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandLoginLogo, IconBell, IconUser, iosContinuousCurve } from '@leopard/mobile-core';

/**
 * Apple HIG / Liquid Glass floating top bar.
 *
 * Mirrors the Customer home top bar so both apps read as one product:
 * translucent white surface, continuous-corner squircle, backdrop blur on web.
 * The Driver variant adds the registered vehicle plate as the identity subtitle.
 */
export type DriverGlassTopbarProps = Readonly<{
  driverName?: string | null;
  vehiclePlate?: string | null;
  vehicleType?: string | null;
  greeting?: string;
  pendingOfferCount?: number;
  onOpenProfile?: () => void;
  onOpenNotifications?: () => void;
}>;

export function DriverGlassTopbar({
  driverName,
  greeting = 'Chào bác tài',
  onOpenNotifications,
  onOpenProfile,
  pendingOfferCount = 0,
  vehiclePlate,
  vehicleType,
}: DriverGlassTopbarProps): React.JSX.Element {
  const displayName = driverName?.trim() || 'Tài xế LEOPARD';
  const vehicleParts = [vehiclePlate?.trim(), vehicleType?.trim()].filter(
    (part): part is string => Boolean(part),
  );
  const vehicleLine =
    vehicleParts.length > 0 ? vehicleParts.join(' · ') : 'Chưa cập nhật phương tiện';

  return (
    <View style={styles.container} testID="driver-glass-topbar">
      <View style={styles.identity}>
        <View style={styles.logoPill}>
          <BrandLoginLogo height={20} />
        </View>
        <View style={styles.textWrap}>
          <Text numberOfLines={1} style={styles.greeting}>
            {greeting},{' '}
            <Text style={styles.driverName}>{displayName}</Text>
          </Text>
          <Text numberOfLines={1} style={styles.vehicleLine}>
            {vehicleLine}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        {onOpenNotifications ? (
          <Pressable
            accessibilityLabel={
              pendingOfferCount > 0
                ? `Thông báo, ${pendingOfferCount} đơn chờ nhận`
                : 'Thông báo'
            }
            accessibilityRole="button"
            onPress={onOpenNotifications}
            style={({ pressed }) => [styles.iconBtn, pressed ? styles.pressed : null]}
            testID="driver-topbar-notifications"
          >
            <IconBell color="#0B1E42" size={18} />
            {pendingOfferCount > 0 ? (
              <View style={styles.badgePill}>
                <Text style={styles.badgePillText}>{pendingOfferCount}</Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}

        {onOpenProfile ? (
          <Pressable
            accessibilityLabel="Hồ sơ tài xế"
            accessibilityRole="button"
            onPress={onOpenProfile}
            style={({ pressed }) => [styles.iconBtn, pressed ? styles.pressed : null]}
            testID="driver-topbar-profile"
          >
            <IconUser color="#0B1E42" size={18} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: 'rgba(11, 30, 66, 0.08)',
    borderRadius: 20,
    ...iosContinuousCurve,
    borderWidth: 1,
    elevation: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    ...Platform.select({
      web: { backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' } as object,
    }),
  },
  identity: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    marginRight: 10,
  },
  logoPill: {
    borderRightColor: 'rgba(11, 30, 66, 0.08)',
    borderRightWidth: 1,
    marginRight: 10,
    paddingRight: 10,
  },
  textWrap: {
    flex: 1,
  },
  greeting: {
    color: '#0B1E42',
    fontSize: 12,
    fontWeight: '700',
  },
  driverName: {
    fontWeight: '800',
  },
  vehicleLine: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    marginTop: 1,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
    position: 'relative',
    width: 44,
  },
  badgePill: {
    alignItems: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 8,
    height: 16,
    justifyContent: 'center',
    minWidth: 16,
    paddingHorizontal: 4,
    position: 'absolute',
    right: -2,
    top: -2,
  },
  badgePillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  pressed: {
    opacity: 0.8,
  },
});
