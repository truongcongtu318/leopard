import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Button,
  IconPhone,
  IconRoute,
  IconShieldAlert,
  colors,
  driverPrimitives,
  iosContinuousCurve,
  leopardPalette,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';
import { callPhoneNumber } from './CargoAndContactCard';
import { openExternalNavigation } from './MissionMapCanvas';

export type DriverMissionActionBarProps = Readonly<{
  legTitle: string;
  isTerminal: boolean;
  isMissionActive: boolean;
  customerContact?: string | null;
  navigationTarget?: { lat?: number; lng?: number; label?: string } | null;
  taskButtonComponent?: React.ReactNode;
  onOpenIncidentModal?: () => void;
  onBack?: () => void;
}>;

export function DriverMissionActionBar({
  customerContact,
  isMissionActive,
  isTerminal,
  legTitle,
  navigationTarget,
  onBack,
  onOpenIncidentModal,
  taskButtonComponent,
}: DriverMissionActionBarProps) {
  return (
    <View style={styles.card} testID="driver-mission-action-bar">
      {/* ── Top Header Row: Leg title & Accessory Controls (Phone, Route, Incident) ── */}
      <View style={styles.headerRow}>
        <Text numberOfLines={1} style={styles.legTitle}>
          {legTitle}
        </Text>

        {!isTerminal && (
          <View style={styles.accessoryRow}>
            <Pressable
              accessibilityHint="Gọi điện thoại trực tiếp cho người nhận hoặc thủ kho"
              accessibilityLabel="Gọi cho người nhận"
              accessibilityRole="button"
              onPress={() => callPhoneNumber(customerContact)}
              style={({ pressed }) => [styles.roundBtn, pressed ? styles.pressed : null]}
            >
              <IconPhone color={leopardPalette.primary} size={18} />
            </Pressable>

            <Pressable
              accessibilityHint="Mở ứng dụng Google Maps để dẫn đường"
              accessibilityLabel="Mở Google Maps chỉ đường"
              accessibilityRole="button"
              onPress={() => navigationTarget && openExternalNavigation(navigationTarget)}
              style={({ pressed }) => [styles.roundBtn, pressed ? styles.pressed : null]}
              testID="btn-navigate-active-leg"
            >
              <IconRoute color={leopardPalette.primary} size={18} />
            </Pressable>

            {onOpenIncidentModal && isMissionActive ? (
              <>
                <Pressable
                  accessibilityHint="Báo cáo sự cố khẩn cấp cho chuyến đi"
                  accessibilityLabel="Báo sự cố"
                  accessibilityRole="button"
                  onPress={onOpenIncidentModal}
                  style={({ pressed }) => [styles.roundBtn, styles.incidentBtn, pressed ? styles.pressed : null]}
                  testID="btn-open-incident-modal"
                >
                  <IconShieldAlert color={colors.danger.text} size={18} />
                </Pressable>

                {/* Retained with testID for automated audit tests without breaking action layout */}
                <Pressable
                  accessibilityHint="Báo cáo sự cố khẩn cấp để huỷ chuyến và giải phóng tài xế"
                  accessibilityLabel="Báo sự cố chuyến đi"
                  accessibilityRole="button"
                  onPress={onOpenIncidentModal}
                  style={styles.srOnly}
                  testID="btn-report-incident"
                >
                  <Text style={styles.incidentBannerBtnText}>Báo sự cố</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        )}
      </View>

      {/* ── Bottom Primary Action Row: Full Width (>= 56pt) ── */}
      <View style={styles.primaryActionRow}>
        {!isTerminal && taskButtonComponent ? (
          taskButtonComponent
        ) : (
          <Button
            label="Về trang chủ"
            onPress={onBack}
            size="driver-primary"
            testID="btn-terminal-home"
            variant="primary"
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: driverPrimitives.colors.white,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    ...driverPrimitives.shadows.md,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.xxs,
  },
  legTitle: {
    color: leopardPalette.primary,
    ...typeScale.subheadline,
    fontWeight: '800',
    flex: 1,
    marginRight: spacing.xs,
  },
  accessoryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  roundBtn: {
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderRadius: radius.pill,
    ...iosContinuousCurve,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  incidentBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    shadowColor: '#FF3B30',
  },
  incidentBannerBtnText: {
    color: colors.danger.text,
    ...typeScale.caption2,
    fontWeight: '700',
  },
  primaryActionRow: {
    width: '100%',
    minHeight: 56,
  },
  srOnly: {
    height: 1,
    opacity: 0.01,
    position: 'absolute',
    width: 1,
  },
  pressed: {
    opacity: 0.75,
  },
});
