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
  stopCount?: number;
  hasLoadingSupport?: boolean;
  hasVatInvoice?: boolean;
}

const VEHICLE_ORDER: VehicleTypeId[] = ['BIKE_3W', 'VAN_500KG', 'TRUCK_125T', 'TRUCK_25T'];

export function BookingVehicleSection({
  selectedVehicleId,
  onSelectVehicle,
  onViewDimensions,
  distanceKm,
  stopCount,
  hasLoadingSupport,
  hasVatInvoice,
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
        return <IconVehicle3Wheel color={iconColor} size={22} />;
      case 'VAN_500KG':
        return <IconVehicleVan color={iconColor} size={22} />;
      case 'TRUCK_125T':
        return <IconVehicleLightTruck color={iconColor} size={22} />;
      case 'TRUCK_25T':
        return <IconVehicleHeavyTruck color={iconColor} size={22} />;
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
              ? getVehicleFare(id, distanceKm, { stopCount, hasLoadingSupport, hasVatInvoice })
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
              {/* Vehicle Silhouette Box: 40x40 squircle */}
              <View
                accessibilityElementsHidden={true}
                importantForAccessibility="no"
                style={[styles.vehicleIconBox, isSelected && styles.vehicleIconBoxSelected]}
              >
                {renderVehicleIcon(id, isSelected)}
              </View>

              {/* Thông tin xe: 2 dòng gọn gàng */}
              <View style={styles.vehicleInfo}>
                <View style={styles.nameTagRow}>
                  <Text numberOfLines={1} style={[styles.vehicleName, isSelected && styles.vehicleNameSelected]}>
                    {rate.name}
                  </Text>
                  <Badge action={getBadgeAction(id)} size="sm" style={styles.tagBadge}>
                    <Badge.Text style={styles.tagBadgeText}>
                      {rate.tag}
                    </Badge.Text>
                  </Badge>
                </View>
                <Text numberOfLines={1} style={styles.specsText}>
                  {rate.dimensions} · {rate.capacityKg.toLocaleString('vi-VN')} kg
                </Text>
              </View>

              {/* Giá cước & Checkmark: căn phải sắc nét */}
              <View style={styles.rightCol}>
                {fare !== null ? (
                  <Text selectable style={[styles.priceText, isSelected && styles.priceTextSelected]}>
                    {`${fare.toLocaleString('vi-VN')} đ`}
                  </Text>
                ) : null}
                <View
                  accessibilityElementsHidden={true}
                  importantForAccessibility="no"
                  style={styles.checkSlot}
                >
                  {isSelected ? (
                    <View style={styles.checkCircle}>
                      <IconCheck color="#FFFFFF" size={11} strokeWidth={2.5} />
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
    marginTop: spacing.sm,
  },
  sectionHeader: {
    ...typeScale.footnote,
    fontWeight: '700',
    color: colors.neutral.mutedText,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xxs + 2,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  vehicleListContainer: {
    marginHorizontal: spacing.md,
    gap: spacing.xs,
  },
  vehicleCard: {
    borderRadius: radius.card,
    ...iosContinuousCurve,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    minHeight: 62,
    height: 62,
  },
  vehicleCardSelected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: customerPalette.primary,
    boxShadow: '0 3px 12px rgba(11, 37, 69, 0.08)',
  },
  vehicleCardUnselected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
  },
  vehicleCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  vehicleIconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.cardSm,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs + 2,
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
    gap: spacing.xxs + 2,
    marginBottom: 1,
  },
  vehicleName: {
    ...typeScale.subheadline,
    fontWeight: '600',
    color: customerPalette.textSlateDark,
  },
  vehicleNameSelected: {
    color: customerPalette.primary,
    fontWeight: '700',
  },
  tagBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xxs + 2,
    paddingVertical: 1,
  },
  tagBadgeText: {
    ...typeScale.caption2,
    fontWeight: '600',
    fontSize: 10,
    lineHeight: 12,
  },
  specsText: {
    ...typeScale.caption1,
    color: '#64748B',
  },
  rightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
    paddingLeft: spacing.xxs,
  },
  priceText: {
    ...typeScale.subheadline,
    fontWeight: '700',
    color: customerPalette.textSlateDark,
    fontVariant: ['tabular-nums'],
  },
  priceTextSelected: {
    color: customerPalette.primary,
  },
  checkSlot: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: customerPalette.primary,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 2px 5px rgba(11, 37, 69, 0.2)',
  },
  checkCircleEmpty: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  footerLinkWrap: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  linkPressed: {
    opacity: 0.65,
    transform: [{ scale: 0.985 }],
  },
  footerLinkText: {
    ...typeScale.caption1,
    fontWeight: '600',
    color: customerPalette.primary,
  },
});
