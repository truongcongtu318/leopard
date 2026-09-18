import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Badge,
  IconCheck,
  IconVehicle3Wheel,
  IconVehicleHeavyTruck,
  IconVehicleLightTruck,
  IconVehicleVan,
  colors,
  customerPalette,
  haptic,
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
  const handleSelect = (id: VehicleTypeId) => {
    haptic.selection();
    onSelectVehicle(id);
  };

  const getBadgeAction = (id: VehicleTypeId): 'info' | 'warning' | 'muted' | 'success' => {
    if (id === 'TRUCK_125T') return 'warning';
    if (id === 'BIKE_3W') return 'info';
    if (id === 'VAN_500KG') return 'muted';
    return 'warning';
  };

  const renderVehicleIcon = (id: VehicleTypeId, isSelected: boolean) => {
    const iconColor = isSelected ? customerPalette.primary : '#475569';
    switch (id) {
      case 'BIKE_3W':
        return <IconVehicle3Wheel color={iconColor} size={26} />;
      case 'VAN_500KG':
        return <IconVehicleVan color={iconColor} size={26} />;
      case 'TRUCK_125T':
        return <IconVehicleLightTruck color={iconColor} size={26} />;
      case 'TRUCK_25T':
        return <IconVehicleHeavyTruck color={iconColor} size={26} />;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>Loại xe (sắp xếp theo tải trọng)</Text>

      <View style={styles.vehicleListContainer}>
        {VEHICLE_ORDER.map((id) => {
          const rate = VEHICLE_RATES[id];
          const isSelected = selectedVehicleId === id;
          // No fare without a real routed distance. Falling back to the base
          // fare quoted a price the trip had never been measured for.
          const fare =
            typeof distanceKm === 'number' && distanceKm > 0
              ? getVehicleFare(id, distanceKm)
              : null;

          return (
            <Pressable
              accessibilityLabel={`${rate.name}, ${rate.tag}, thùng ${rate.dimensions}, tải trọng ${rate.capacityKg.toLocaleString('vi-VN')} kg${fare !== null ? `, cước ${fare.toLocaleString('vi-VN')} đồng` : ', đang tính cước'}${isSelected ? ', đã chọn' : ''}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={id}
              onPress={() => handleSelect(id)}
              style={({ pressed }) => [
                styles.vehicleCard,
                isSelected ? styles.vehicleCardSelected : styles.vehicleCardUnselected,
                pressed && styles.vehicleCardPressed,
              ]}
            >
              {/* Vehicle Silhouette Box */}
              <View
                accessibilityElementsHidden={true}
                importantForAccessibility="no"
                style={[styles.vehicleIconBox, isSelected && styles.vehicleIconBoxSelected]}
              >
                {renderVehicleIcon(id, isSelected)}
              </View>

              {/* Thông tin xe */}
              <View style={styles.vehicleInfo}>
                <View style={styles.nameTagRow}>
                  <Text style={[styles.vehicleName, isSelected && styles.vehicleNameSelected]}>
                    {rate.name}
                  </Text>
                  <Badge action={getBadgeAction(id)} size="sm" style={styles.tagBadge}>
                    <Badge.Text style={styles.tagBadgeText}>
                      {rate.tag}
                    </Badge.Text>
                  </Badge>
                </View>
                <Text numberOfLines={1} style={styles.specsText}>
                  Thùng {rate.dimensions} · {rate.capacityKg.toLocaleString('vi-VN')} kg
                </Text>
              </View>

              {/* Giá cước & Checkmark */}
              <View style={styles.rightCol}>
                <Text selectable style={[styles.priceText, isSelected && styles.priceTextSelected]}>
                  {fare !== null ? `${fare.toLocaleString('vi-VN')} đ` : 'Đang tính…'}
                </Text>
                <View
                  accessibilityElementsHidden={true}
                  importantForAccessibility="no"
                  style={styles.checkSlot}
                >
                  {isSelected ? (
                    <View style={styles.checkCircle}>
                      <IconCheck color="#FFFFFF" size={12} strokeWidth={2.5} />
                    </View>
                  ) : (
                    <View style={styles.checkCircleEmpty} />
                  )}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Footer link */}
      <Pressable
        accessibilityLabel="Xem chi tiết kích thước thùng xe"
        accessibilityRole="button"
        hitSlop={8}
        onPress={onViewDimensions}
        style={({ pressed }) => [styles.footerLinkWrap, pressed && styles.linkPressed]}
      >
        <Text style={styles.footerLinkText}>Xem kích thước thùng xe &gt;</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
  },
  sectionHeader: {
    ...typeScale.footnote,
    fontWeight: '700',
    color: colors.neutral.mutedText,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  vehicleListContainer: {
    marginHorizontal: spacing.md,
    gap: spacing.xs,
  },
  vehicleCard: {
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    minHeight: 76,
  },
  vehicleCardSelected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: customerPalette.primary,
    boxShadow: '0 4px 16px rgba(11, 37, 69, 0.08)',
  },
  vehicleCardUnselected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
  },
  vehicleCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.982 }],
  },
  vehicleIconBox: {
    width: 52,
    height: 52,
    borderRadius: radius.card,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    ...iosContinuousCurve,
  },
  vehicleIconBoxSelected: {
    backgroundColor: '#EEF4FF',
    borderColor: 'rgba(11, 37, 69, 0.12)',
  },
  vehicleInfo: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: spacing.xs,
  },
  nameTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.hairline,
  },
  vehicleName: {
    ...typeScale.headline,
    fontWeight: '600',
    color: customerPalette.textSlateDark,
  },
  vehicleNameSelected: {
    color: customerPalette.primary,
    fontWeight: '700',
  },
  tagBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
  },
  tagBadgeText: {
    ...typeScale.caption2,
    fontWeight: '600',
  },
  specsText: {
    ...typeScale.footnote,
    color: '#64748B',
  },
  rightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingLeft: spacing.xxs,
  },
  priceText: {
    ...typeScale.headline,
    fontWeight: '700',
    color: customerPalette.textSlateDark,
    fontVariant: ['tabular-nums'],
  },
  priceTextSelected: {
    color: customerPalette.primary,
  },
  checkSlot: {
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: customerPalette.primary,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 2px 6px rgba(11, 37, 69, 0.2)',
  },
  checkCircleEmpty: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  footerLinkWrap: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  linkPressed: {
    opacity: 0.65,
    transform: [{ scale: 0.985 }],
  },
  footerLinkText: {
    ...typeScale.footnote,
    fontWeight: '600',
    color: customerPalette.primary,
  },
});
