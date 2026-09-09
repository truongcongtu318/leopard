import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { leopardElevation, leopardPalette, leopardRadius, spacing, typography } from '@leopard/mobile-core';
import { IconVehicle3Wheel, IconVehicleHeavyTruck, IconVehicleLightTruck } from './icons/CoreIcons';

export type VehicleCategory = '3_WHEEL_BIKE' | 'LIGHT_TRUCK' | 'HEAVY_TRUCK';

export type VehicleOption = Readonly<{
  id: VehicleCategory;
  name: string;
  vietnameseName: string;
  capacity: string;
  dimensions: string;
  idealFor: string;
  icon?: string;
  badge?: string;
  estimatedPrice: string;
}>;

export type VehicleSelectCardProps = Readonly<{
  vehicle: VehicleOption;
  selected: boolean;
  onSelect: (id: VehicleCategory) => void;
}>;

function renderVehicleIcon(id: VehicleCategory, selected: boolean) {
  const color = selected ? leopardPalette.primary : leopardPalette.textMutedSlate;
  if (id === '3_WHEEL_BIKE') {
    return <IconVehicle3Wheel color={color} size={26} />;
  }
  if (id === 'LIGHT_TRUCK') {
    return <IconVehicleLightTruck color={color} size={26} />;
  }
  return <IconVehicleHeavyTruck color={color} size={26} />;
}

function VehicleSelectCardComponent({ onSelect, selected, vehicle }: VehicleSelectCardProps) {
  return (
    <Pressable
      accessibilityLabel={`${vehicle.vietnameseName}, tải trọng ${vehicle.capacity}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={() => onSelect(vehicle.id)}
      style={({ pressed }) => [
        styles.card,
        selected ? styles.cardSelected : styles.cardUnselected,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.headerRow}>
        <View style={[styles.iconContainer, selected ? styles.iconContainerSelected : null]}>
          {renderVehicleIcon(vehicle.id, selected)}
        </View>
        {vehicle.badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{vehicle.badge}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.content}>
        <Text numberOfLines={1} style={[styles.title, selected ? styles.titleSelected : null]}>
          {vehicle.vietnameseName}
        </Text>
        <Text style={styles.capacityText}>Tải trọng: {vehicle.capacity}</Text>
        <Text numberOfLines={1} style={styles.idealForText}>
          {vehicle.idealFor}
        </Text>
      </View>

      <View style={styles.footerRow}>
        <Text style={[styles.priceText, selected ? styles.priceTextSelected : null]}>
          {vehicle.estimatedPrice}
        </Text>
        <View style={[styles.radioOuter, selected ? styles.radioOuterSelected : null]}>
          {selected ? <View style={styles.radioInner} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

export const VehicleSelectCard = React.memo(VehicleSelectCardComponent);

const styles = StyleSheet.create({
  card: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderRadius: leopardRadius.lg,
    borderWidth: 1,
    flex: 1,
    minHeight: 156,
    padding: spacing.md,
    justifyContent: 'space-between',
    ...leopardElevation.subtle,
  },
  cardUnselected: {
    borderColor: leopardPalette.cardBorder,
  },
  cardSelected: {
    borderColor: leopardPalette.primary,
    backgroundColor: leopardPalette.primaryBg,
  },
  pressed: {
    opacity: 0.85,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: leopardRadius.md,
    backgroundColor: leopardPalette.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: leopardPalette.cardBorder,
  },
  iconContainerSelected: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.primaryBorder,
  },
  badge: {
    backgroundColor: leopardPalette.accentYellowBg,
    borderColor: leopardPalette.accentYellowSoft,
    borderWidth: 1,
    borderRadius: leopardRadius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#92400E',
    fontSize: 11,
    fontWeight: '600',
  },
  content: {
    gap: 2,
    marginVertical: spacing.xs,
  },
  title: {
    ...typography.label,
    color: leopardPalette.textSlateDark,
    fontSize: 15,
    fontWeight: '600',
  },
  titleSelected: {
    color: leopardPalette.primary,
  },
  capacityText: {
    color: leopardPalette.textMutedSlate,
    fontSize: 12,
    fontWeight: '500',
  },
  idealForText: {
    color: leopardPalette.textSubtle,
    fontSize: 11,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: leopardPalette.cardBorder,
  },
  priceText: {
    color: leopardPalette.textSlateDark,
    fontSize: 14,
    fontWeight: '700',
  },
  priceTextSelected: {
    color: leopardPalette.primary,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: leopardRadius.pill,
    borderWidth: 1.5,
    borderColor: leopardPalette.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: leopardPalette.primary,
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: leopardRadius.pill,
    backgroundColor: leopardPalette.primary,
  },
});
