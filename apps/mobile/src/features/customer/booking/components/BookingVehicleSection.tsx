import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  IconCheck,
  IconVehicle3Wheel,
  IconVehicleHeavyTruck,
  IconVehicleLightTruck,
  IconVehicleVan,
  colors,
  customerPalette,
  iosContinuousCurve,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';
import { VEHICLE_RATES, getVehicleFare, type VehicleTypeId } from '../booking-pricing';

export interface BookingVehicleSectionProps {
  selectedVehicleId: VehicleTypeId;
  onSelectVehicle: (vehicleId: VehicleTypeId) => void;
  onViewDimensions?: () => void;
  distanceKm?: number;
}

const VEHICLE_ORDER: VehicleTypeId[] = ['BIKE_3W', 'VAN_500KG', 'TRUCK_125T', 'TRUCK_25T'];

export function BookingVehicleSection({
  selectedVehicleId,
  onSelectVehicle,
  onViewDimensions,
  distanceKm,
}: BookingVehicleSectionProps) {
  const renderVehicleIcon = (id: VehicleTypeId, isSelected: boolean) => {
    const iconColor = isSelected ? customerPalette.primary : '#475569';
    switch (id) {
      case 'BIKE_3W':
        return <IconVehicle3Wheel color={iconColor} size={28} />;
      case 'VAN_500KG':
        return <IconVehicleVan color={iconColor} size={28} />;
      case 'TRUCK_125T':
        return <IconVehicleLightTruck color={iconColor} size={28} />;
      case 'TRUCK_25T':
        return <IconVehicleHeavyTruck color={iconColor} size={28} />;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>LOẠI XE (SẮP XẾP THEO TẢI TRỌNG)</Text>

      <View style={styles.insetGroupedCard}>
        {VEHICLE_ORDER.map((id, index) => {
          const rate = VEHICLE_RATES[id];
          const isSelected = selectedVehicleId === id;
          const fare = distanceKm ? getVehicleFare(id, distanceKm) : rate.baseFareVnd;

          return (
            <React.Fragment key={id}>
              {index > 0 && <View style={styles.separator} />}
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => onSelectVehicle(id)}
                style={({ pressed }) => [
                  styles.vehicleRow,
                  isSelected && styles.vehicleRowSelected,
                  pressed && styles.rowPressed,
                ]}
              >
                {/* Vehicle Silhouette Box */}
                <View style={[styles.vehicleIconBox, isSelected && styles.vehicleIconBoxSelected]}>
                  {renderVehicleIcon(id, isSelected)}
                </View>

                {/* Thông tin xe */}
                <View style={styles.vehicleInfo}>
                  <View style={styles.nameTagRow}>
                    <Text style={[styles.vehicleName, isSelected && styles.vehicleNameSelected]}>
                      {rate.name}
                    </Text>
                    <View style={[styles.tagBadge, isSelected && styles.tagBadgeSelected]}>
                      <Text style={[styles.tagBadgeText, isSelected && styles.tagBadgeTextSelected]}>
                        {rate.tag}
                      </Text>
                    </View>
                  </View>
                  <Text numberOfLines={1} style={styles.specsText}>
                    Thùng {rate.dimensions} · {rate.capacityKg.toLocaleString('vi-VN')} kg
                  </Text>
                  <Text style={styles.etaText}>Tài xế đến trong ~{rate.etaMinutes} phút</Text>
                </View>

                {/* Giá cước & Checkmark thẳng hàng */}
                <View style={styles.rightCol}>
                  <Text style={[styles.priceText, isSelected && styles.priceTextSelected]}>
                    {fare.toLocaleString('vi-VN')} đ
                  </Text>
                  <View style={styles.checkSlot}>
                    {isSelected ? <IconCheck color={customerPalette.primary} size={18} /> : null}
                  </View>
                </View>
              </Pressable>
            </React.Fragment>
          );
        })}
      </View>

      {/* Footer link */}
      <Pressable
        accessibilityRole="button"
        hitSlop={8}
        onPress={onViewDimensions}
        style={styles.footerLinkWrap}
      >
        <Text style={styles.footerLinkText}>Xem kích thước thùng xe &gt;</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
  },
  sectionHeader: {
    ...typeScale.footnote,
    fontWeight: '600',
    color: colors.neutral.mutedText,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  insetGroupedCard: {
    marginHorizontal: spacing.md,
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.cardLg,
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
    ...iosContinuousCurve,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 76,
    backgroundColor: customerPalette.surfaceWhite,
  },
  vehicleRowSelected: {
    backgroundColor: customerPalette.primaryBg,
  },
  rowPressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  vehicleIconBox: {
    width: 52,
    height: 48,
    borderRadius: radius.cardSm,
    backgroundColor: colors.neutral.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    ...iosContinuousCurve,
  },
  vehicleIconBoxSelected: {
    backgroundColor: customerPalette.primaryBg,
  },
  vehicleInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.hairline,
  },
  vehicleName: {
    ...typeScale.headline,
    color: colors.neutral.text,
  },
  vehicleNameSelected: {
    color: customerPalette.primary,
  },
  tagBadge: {
    backgroundColor: colors.neutral.surfaceMuted,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.hairline,
    borderRadius: radius.cardSm,
  },
  tagBadgeSelected: {
    backgroundColor: customerPalette.primaryBg,
  },
  tagBadgeText: {
    ...typeScale.caption2,
    fontWeight: '600',
    color: customerPalette.textMutedSlate,
  },
  tagBadgeTextSelected: {
    color: customerPalette.primary,
  },
  specsText: {
    ...typeScale.footnote,
    color: customerPalette.textMutedSlate,
  },
  etaText: {
    ...typeScale.caption1,
    color: customerPalette.textSubtle,
    marginTop: spacing.hairline,
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    marginLeft: spacing.xs,
  },
  priceText: {
    ...typeScale.subheadline,
    fontWeight: '600',
    color: colors.neutral.text,
    fontVariant: ['tabular-nums'],
  },
  priceTextSelected: {
    color: customerPalette.primary,
    fontWeight: '700',
  },
  checkSlot: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  separator: {
    height: 0.5,
    backgroundColor: colors.neutral.border,
    marginLeft: 80,
  },
  footerLinkWrap: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  footerLinkText: {
    ...typeScale.subheadline,
    fontWeight: '500',
    color: customerPalette.primary,
  },
});
