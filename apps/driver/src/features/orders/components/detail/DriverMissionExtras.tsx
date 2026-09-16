import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { IconClock, StatusTimeline, colors, leopardPalette, spacing } from '@leopard/mobile-core';
import type { DriverAssignedDetailView } from '../../model';
import { MissionStepper } from './MissionStepper';
import { CargoAndContactCard } from './CargoAndContactCard';

export type DriverMissionExtrasProps = Readonly<{
  status: string;
  cargoSummary: string;
  cargoWeightKg?: number | null;
  contactRoleLabel: string;
  customerContact: string;
  vehicleLabel: string;
  history: DriverAssignedDetailView['order']['history'];
}>;

export function DriverMissionExtras({
  cargoSummary,
  cargoWeightKg,
  contactRoleLabel,
  customerContact,
  history,
  status,
  vehicleLabel,
}: DriverMissionExtrasProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityHint="Bấm để ẩn hoặc hiện tiến độ, hàng hóa, và nhật ký trạng thái"
        accessibilityLabel="Xem thêm chi tiết chuyến"
        accessibilityRole="button"
        onPress={() => setIsOpen(!isOpen)}
        style={({ pressed }) => [styles.toggleBtn, pressed ? styles.pressed : null]}
        testID="btn-toggle-mission-extras"
      >
        <View style={styles.toggleLeft}>
          <IconClock color={leopardPalette.primary} size={15} />
          <Text style={styles.toggleText}>Xem thêm chi tiết chuyến</Text>
        </View>
        <Text style={styles.toggleArrow}>{isOpen ? '▲' : '▼'}</Text>
      </Pressable>

      {isOpen ? (
        <View style={styles.content}>
          <MissionStepper status={status} />
          <CargoAndContactCard
            cargoSummary={cargoSummary}
            cargoWeightKg={cargoWeightKg}
            contactRoleLabel={contactRoleLabel}
            customerContact={customerContact}
            vehicleLabel={vehicleLabel}
          />
          {history.length > 0 ? <StatusTimeline entries={history} /> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderColor: colors.neutral.border,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  toggleBtn: {
    alignItems: 'center',
    backgroundColor: colors.neutral.canvas,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  toggleLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  toggleText: {
    color: leopardPalette.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  toggleArrow: {
    color: colors.neutral.subtleText,
    fontSize: 11,
    fontWeight: '700',
  },
  content: {
    backgroundColor: colors.neutral.surface,
    gap: spacing.sm,
    padding: 12,
  },
  pressed: {
    opacity: 0.8,
  },
});
