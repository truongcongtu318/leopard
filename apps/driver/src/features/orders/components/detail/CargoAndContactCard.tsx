import React from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  IconOrders,
  IconPhone,
  IconSpeedTruck,
  colors,
  driverPrimitives,
  iosContinuousCurve,
} from '@leopard/mobile-core';

export type CargoAndContactCardProps = Readonly<{
  vehicleLabel: string;
  cargoSummary: string;
  cargoWeightKg?: number | null;
  contactRoleLabel: string;
  customerContact: string;
  onChat?: () => void;
}>;

export function callPhoneNumber(contact?: string | null) {
  if (!contact) {
    Alert.alert(
      'Chưa có số điện thoại',
      'Chưa có số điện thoại thực tế cho liên hệ này. Vui lòng thử lại sau hoặc liên hệ tổng đài hỗ trợ.',
    );
    return;
  }
  const match = contact.match(/[\d+]{8,15}/);
  if (!match) {
    Alert.alert(
      'Chưa có số điện thoại',
      'Chưa có số điện thoại thực tế cho liên hệ này. Vui lòng thử lại sau hoặc liên hệ tổng đài hỗ trợ.',
    );
    return;
  }
  try {
    const res = Linking.openURL(`tel:${match[0]}`);
    if (res && typeof res.catch === 'function') {
      res.catch(() => {});
    }
  } catch {
    // Ignore linking errors in test environment or unsupported devices
  }
}

export function CargoAndContactCard({
  cargoSummary,
  cargoWeightKg,
  contactRoleLabel,
  customerContact,
  vehicleLabel,
}: CargoAndContactCardProps) {
  return (
    <View style={styles.cardContainer}>
      <Text style={styles.cardSectionTitle}>HÀNG HÓA & LIÊN HỆ</Text>

      {/* Cargo Spec Chips */}
      <View style={styles.specChipsRow}>
        <View style={styles.specChip}>
          <IconSpeedTruck color={driverPrimitives.colors.gray500} size={15} />
          <Text style={styles.specChipText}>{vehicleLabel}</Text>
        </View>

        {typeof cargoWeightKg === 'number' && cargoWeightKg > 0 ? (
          <View style={styles.specChip} testID="cargo-weight-chip">
            <IconOrders color={driverPrimitives.colors.gray500} size={15} />
            <Text style={styles.specChipText}>{cargoWeightKg} kg</Text>
          </View>
        ) : null}

        <View style={styles.specChip}>
          <IconOrders color={driverPrimitives.colors.gray500} size={15} />
          <Text numberOfLines={1} style={styles.specChipText}>
            {cargoSummary}
          </Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      {/* Customer Contact Row */}
      <View style={styles.contactRow}>
        <View style={styles.contactIconCircle}>
          <IconPhone color={driverPrimitives.colors.gray500} size={16} />
        </View>

        <View style={styles.contactInfoCol}>
          <Text style={styles.contactCaption}>{contactRoleLabel.toUpperCase()}</Text>
          <Text style={styles.contactValue}>{customerContact}</Text>
        </View>

        <Pressable
          accessibilityHint="Gọi điện thoại cho người nhận hoặc thủ kho"
          accessibilityLabel="Gọi điện thoại"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => callPhoneNumber(customerContact)}
          style={({ pressed }) => [styles.contactCallBtn, pressed ? styles.pressed : null]}
        >
          <IconPhone color={colors.neutral.surface} size={13} />
          <Text style={styles.contactCallBtnText}>Gọi</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: colors.neutral.border,
    borderRadius: 18,
    ...iosContinuousCurve,
    borderWidth: 1,
    gap: 12,
    padding: 16,
    ...driverPrimitives.shadows.sm,
  },
  cardSectionTitle: {
    color: driverPrimitives.colors.gray500,
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  specChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specChip: {
    alignItems: 'center',
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  specChipText: {
    color: driverPrimitives.colors.gray700,
    fontSize: 12,
    fontWeight: '600',
  },
  cardDivider: {
    backgroundColor: driverPrimitives.colors.gray100,
    height: 1,
    width: '100%',
  },
  contactRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  contactIconCircle: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: 20,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  contactInfoCol: {
    flex: 1,
    gap: 2,
  },
  contactCaption: {
    color: driverPrimitives.colors.gray400,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  contactValue: {
    color: driverPrimitives.colors.gray900,
    fontSize: 14,
    fontWeight: '700',
  },
  contactCallBtn: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.dark950,
    borderRadius: 9999,
    flexDirection: 'row',
    gap: 6,
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  contactCallBtnText: {
    color: colors.neutral.surface,
    fontSize: 12.5,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
});
