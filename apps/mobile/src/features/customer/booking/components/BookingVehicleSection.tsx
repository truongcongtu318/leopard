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
  const renderVehicleIcon = (id: VehicleTypeId, isSelected: boolean) => {
    const iconColor = isSelected ? customerPalette.primary : '#475569';
    switch (id) {
      case 'BIKE_3W':
        return <IconVehicle3Wheel color={iconColor} size={30} />;
      case 'VAN_500KG':
        return <IconVehicleVan color={iconColor} size={30} />;
      case 'TRUCK_125T':
        return <IconVehicleLightTruck color={iconColor} size={30} />;
      case 'TRUCK_25T':
        return <IconVehicleHeavyTruck color={iconColor} size={30} />;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>LOẠI XE (SẮP XẾP THEO TẢI TRỌNG)</Text>

      <View style={styles.insetGroupedCard}>
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
                {/* Vehicle Thumbnail Box */}
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

                {/* Giá cước & Checkmark */}
                <View style={styles.priceCol}>
                  <Text style={[styles.priceText, isSelected && styles.priceTextSelected]}>
                    {rate.baseFareVnd.toLocaleString('vi-VN')} đ
                  </Text>
                  <View style={styles.checkmarkSlot}>
                    {isSelected ? (
                      <View style={styles.checkmarkCircle}>
                        <IconCheck color="#FFFFFF" size={12} />
                      </View>
                    ) : null}
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
    marginTop: 24,
  },
  sectionHeader: {
    ...typeScale.footnote,
    fontSize: 13,
    fontWeight: '600',
    color: '#6E6E73',
    paddingHorizontal: 32,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: -0.08,
  },
  insetGroupedCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
    ...iosContinuousCurve,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 74,
    backgroundColor: '#FFFFFF',
  },
  vehicleRowSelected: {
    backgroundColor: 'rgba(11, 37, 69, 0.03)',
  },
  rowPressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  vehicleIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    ...iosContinuousCurve,
  },
  vehicleIconBoxSelected: {
    backgroundColor: '#EBF2FA',
  },
  vehicleInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  vehicleName: {
    ...typeScale.headline,
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  vehicleNameSelected: {
    color: customerPalette.primary,
  },
  tagBadge: {
    backgroundColor: 'rgba(118, 118, 128, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  tagBadgeSelected: {
    backgroundColor: '#EBF2FA',
  },
  tagBadgeText: {
    ...typeScale.caption2,
    fontSize: 11,
    fontWeight: '600',
    color: '#6E6E73',
  },
  tagBadgeTextSelected: {
    color: customerPalette.primary,
  },
  specsText: {
    ...typeScale.footnote,
    fontSize: 13,
    color: '#8E8E93',
  },
  etaText: {
    ...typeScale.caption1,
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  priceCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 8,
  },
  priceText: {
    ...typeScale.subheadline,
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    fontVariant: ['tabular-nums'],
  },
  priceTextSelected: {
    color: customerPalette.primary,
    fontWeight: '700',
  },
  checkmarkSlot: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  checkmarkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: customerPalette.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  separator: {
    height: 0.5,
    backgroundColor: '#E5E5EA',
    marginLeft: 76,
  },
  footerLinkWrap: {
    paddingVertical: 8,
    paddingHorizontal: 32,
    marginTop: 2,
  },
  footerLinkText: {
    ...typeScale.subheadline,
    fontSize: 14,
    fontWeight: '500',
    color: customerPalette.primary,
  },
});
