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
  routeStepperComponent?: React.ReactNode;
}>;

export function DriverMissionExtras({
  cargoSummary,
  cargoWeightKg,
  contactRoleLabel,
  customerContact,
  history,
  routeStepperComponent,
  status,
  vehicleLabel,
}: DriverMissionExtrasProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isTerminal = status === 'DELIVERED' || status === 'RETURNED';

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityHint="Bấm để xem lộ trình chi tiết và thông tin hàng hóa"
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
          {routeStepperComponent ? (
            <View style={styles.routeSection}>
              {routeStepperComponent}
            </View>
          ) : null}

          <MissionStepper status={status} />

          <CargoAndContactCard
            cargoSummary={cargoSummary}
            cargoWeightKg={cargoWeightKg}
            contactRoleLabel={contactRoleLabel}
            customerContact={customerContact}
            vehicleLabel={vehicleLabel}
          />

          {isTerminal && history.length > 0 ? (
            <StatusTimeline entries={history} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.border,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#0B2545',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  toggleBtn: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    height: 48,
  },
  toggleLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  toggleText: {
    color: leopardPalette.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  toggleArrow: {
    color: leopardPalette.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  content: {
    backgroundColor: colors.neutral.surface,
    borderTopColor: colors.neutral.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  routeSection: {
    marginBottom: spacing.xs,
  },
  pressed: {
    opacity: 0.8,
  },
});
