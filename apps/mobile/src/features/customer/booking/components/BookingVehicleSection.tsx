import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  IconCheck,
  IconVehicle3Wheel,
  IconVehicleHeavyTruck,
  IconVehicleLightTruck,
  IconVehicleVan,
  customerPalette,
  iosContinuousCurve,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';
import { VEHICLE_RATES, type VehicleTypeId } from '../booking-pricing';

export interface BookingVehicleSectionProps {
  selectedVehicleId: VehicleTypeId;
  onSelectVehicle: (vehicleId: VehicleTypeId) => void;
  onViewDimensions?: () => void;
}

const VEHICLE_ORDER: VehicleTypeId[] = ['BIKE_3W', 'VAN_500KG', 'TRUCK_125T', 'TRUCK_25T'];

export function BookingVehicleSection({
  selectedVehicleId,
  onSelectVehicle,
  onViewDimensions,
}: BookingVehicleSectionProps) {
  const renderVehicleIcon = (id: VehicleTypeId) => {
    switch (id) {
      case 'BIKE_3W':
        return <IconVehicle3Wheel color={customerPalette.primary} size={32} />;
      case 'VAN_500KG':
        return <IconVehicleVan color={customerPalette.primary} size={32} />;
      case 'TRUCK_125T':
        return <IconVehicleLightTruck color={customerPalette.primary} size={32} />;
      case 'TRUCK_25T':
        return <IconVehicleHeavyTruck color={customerPalette.primary} size={32} />;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>LOẠI XE (SẮP XẾP THEO TẢI TRỌNG)</Text>

      <View style={styles.groupedCard}>
        {VEHICLE_ORDER.map((id, index) => {
          const rate = VEHICLE_RATES[id];
          const isSelected = selectedVehicleId === id;

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
                {/* Minh họa xe 56pt */}
                <View style={[styles.vehicleIconBox, isSelected && styles.vehicleIconBoxSelected]}>
                  {renderVehicleIcon(id)}
                </View>

                {/* Thông tin xe */}
                <View style={styles.vehicleInfo}>
                  <View style={styles.nameTagRow}>
                    <Text style={styles.vehicleName}>{rate.name}</Text>
                    <View style={styles.tagBadge}>
                      <Text style={styles.tagBadgeText}>{rate.tag}</Text>
                    </View>
                  </View>
                  <Text numberOfLines={1} style={styles.specsText}>
                    Thùng {rate.dimensions} · {rate.capacityKg.toLocaleString('vi-VN')} kg
                  </Text>
                  <Text style={styles.etaText}>Tài xế đến trong ~{rate.etaMinutes} phút</Text>
                </View>

                {/* Giá cước & Checkmark */}
                <View style={styles.priceCol}>
                  <Text style={[styles.priceText, isSelected && styles.priceTextSelected]}>
                    {rate.baseFareVnd.toLocaleString('vi-VN')} đ
                  </Text>
                  {isSelected ? (
                    <View style={styles.checkmarkWrapper}>
                      <IconCheck color={customerPalette.primary} size={16} />
                    </View>
                  ) : (
                    <View style={styles.checkmarkPlaceholder} />
                  )}
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
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  sectionHeader: {
    ...typeScale.footnote,
    fontWeight: '600',
    color: customerPalette.textMutedSlate,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.card,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    ...iosContinuousCurve,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    minHeight: 76,
    backgroundColor: '#FFFFFF',
  },
  vehicleRowSelected: {
    backgroundColor: '#F4F7FB',
  },
  rowPressed: {
    opacity: 0.8,
  },
  vehicleIconBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
  },
  vehicleIconBoxSelected: {
    backgroundColor: '#EBF2FA',
    borderColor: customerPalette.primary,
  },
  vehicleInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  vehicleName: {
    ...typeScale.headline,
    fontWeight: '600',
    color: customerPalette.textSlateDark,
  },
  tagBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  tagBadgeText: {
    ...typeScale.caption2,
    fontWeight: '600',
    color: customerPalette.textMutedSlate,
  },
  specsText: {
    ...typeScale.footnote,
    color: customerPalette.textMutedSlate,
  },
  etaText: {
    ...typeScale.caption1,
    color: '#64748B',
    marginTop: 2,
  },
  priceCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  priceText: {
    ...typeScale.subheadline,
    fontWeight: '600',
    color: customerPalette.textSlateDark,
  },
  priceTextSelected: {
    color: customerPalette.primary,
    fontWeight: '700',
  },
  checkmarkWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  checkmarkPlaceholder: {
    width: 24,
    height: 24,
    marginTop: 4,
  },
  separator: {
    height: 0.5,
    backgroundColor: '#E2E8F0',
    marginLeft: 76,
  },
  footerLinkWrap: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    marginTop: 4,
  },
  footerLinkText: {
    ...typeScale.subheadline,
    fontWeight: '500',
    color: customerPalette.primary,
  },
});
