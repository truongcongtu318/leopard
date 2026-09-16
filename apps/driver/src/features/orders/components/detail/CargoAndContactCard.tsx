import React from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  IconOrders,
  IconPhone,
  IconSpeedTruck,
  spacing,
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
  vehicleLabel,
  cargoSummary,
  cargoWeightKg,
  contactRoleLabel,
  customerContact,
  onChat,
}: CargoAndContactCardProps) {
  return (
    <View style={styles.cargoContactCard}>
      <Text style={styles.cardSectionTitle}>HÀNG HÓA & LIÊN HỆ</Text>

      {/* Cargo Spec Chips */}
      <View style={styles.specChipsRow}>
        <View style={styles.specChip}>
          <IconSpeedTruck color="#0B1E42" size={14} />
          <Text style={styles.specChipText}>{vehicleLabel}</Text>
        </View>
        {typeof cargoWeightKg === 'number' && cargoWeightKg > 0 ? (
          <View style={styles.specChip} testID="cargo-weight-chip">
            <IconOrders color="#0B1E42" size={14} />
            <Text style={styles.specChipText}>{cargoWeightKg} kg</Text>
          </View>
        ) : null}
        <View style={styles.specChip}>
          <IconOrders color="#0B1E42" size={14} />
          <Text numberOfLines={1} style={styles.specChipText}>
            {cargoSummary}
          </Text>
        </View>
      </View>

      {/* Customer Contact Card */}
      <View style={styles.contactCardRow}>
        <View style={styles.contactIconChip}>
          <IconPhone color="#0B1E42" size={16} />
        </View>
        <View style={styles.contactTextColumn}>
          <Text style={styles.contactCaption}>{contactRoleLabel.toUpperCase()}</Text>
          <Text style={styles.contactValue}>{customerContact}</Text>
        </View>
        <Pressable
          accessibilityHint="Gọi điện thoại cho người nhận hoặc thủ kho"
          accessibilityLabel="Gọi điện thoại"
          accessibilityRole="button"
          onPress={() => callPhoneNumber(customerContact)}
          style={({ pressed }) => [styles.contactCallBtn, pressed ? styles.pressed : null]}
        >
          <IconPhone color="#FFFFFF" size={14} />
          <Text style={styles.contactCallBtnText}>Gọi</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cargoContactCard: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  cardSectionTitle: {
    color: '#0B1E42',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  specChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specChip: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  specChipText: {
    color: '#0B1E42',
    fontSize: 12,
    fontWeight: '700',
  },
  contactCardRow: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  contactIconChip: {
    alignItems: 'center',
    backgroundColor: '#EEF2F6',
    borderRadius: 20,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  contactTextColumn: {
    flex: 1,
    gap: 2,
  },
  contactCaption: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  contactValue: {
    color: '#0B1E42',
    fontSize: 13,
    fontWeight: '700',
  },
  contactCallBtn: {
    alignItems: 'center',
    backgroundColor: '#0B1E42',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  contactCallBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.75,
  },
});
