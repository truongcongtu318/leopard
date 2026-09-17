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
      <Text numberOfLines={1} style={styles.legTitle}>
        {legTitle}
      </Text>

      <View style={styles.row}>
        {!isTerminal && (
          <>
            <Pressable
              accessibilityHint="Gọi điện thoại trực tiếp cho người nhận hoặc thủ kho"
              accessibilityLabel="Gọi cho người nhận"
              accessibilityRole="button"
              onPress={() => callPhoneNumber(customerContact)}
              style={({ pressed }) => [styles.roundBtn, pressed ? styles.pressed : null]}
            >
              <IconPhone color={leopardPalette.primary} size={20} />
            </Pressable>

            <Pressable
              accessibilityHint="Mở ứng dụng Google Maps để dẫn đường"
              accessibilityLabel="Mở Google Maps chỉ đường"
              accessibilityRole="button"
              onPress={() => navigationTarget && openExternalNavigation(navigationTarget)}
              style={({ pressed }) => [styles.roundBtn, pressed ? styles.pressed : null]}
              testID="btn-navigate-active-leg"
            >
              <IconRoute color={leopardPalette.primary} size={20} />
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
                  <IconShieldAlert color={colors.danger.text} size={20} />
                </Pressable>

                <Pressable
                  accessibilityHint="Báo cáo sự cố khẩn cấp để huỷ chuyến và giải phóng tài xế"
                  accessibilityLabel="Báo sự cố chuyến đi"
                  accessibilityRole="button"
                  onPress={onOpenIncidentModal}
                  style={({ pressed }) => [styles.incidentBannerBtn, pressed ? styles.pressed : null]}
                  testID="btn-report-incident"
                >
                  <Text style={styles.incidentBannerBtnText}>Báo sự cố</Text>
                </Pressable>
              </>
            ) : null}
          </>
        )}

        <View style={styles.primaryBtnWrap}>
          {!isTerminal && taskButtonComponent ? (
            taskButtonComponent
          ) : (
            <Button label="Về trang chủ" onPress={onBack} size="driver-primary" testID="btn-terminal-home" variant="primary" />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: driverPrimitives.colors.white,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    gap: spacing.xs,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    ...driverPrimitives.shadows.md,
  },
  legTitle: {
    color: colors.neutral.text,
    ...typeScale.footnote,
    fontWeight: '700',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  roundBtn: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.border,
    borderRadius: radius.pill,
    ...iosContinuousCurve,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
    ...driverPrimitives.shadows.sm,
  },
  incidentBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  incidentBannerBtn: {
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
    borderRadius: radius.control,
    ...iosContinuousCurve,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    height: 48,
  },
  incidentBannerBtnText: {
    color: colors.danger.text,
    ...typeScale.caption2,
    fontWeight: '700',
  },
  primaryBtnWrap: {
    flex: 1,
  },
  pressed: {
    opacity: 0.75,
  },
});
