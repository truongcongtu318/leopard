import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  IconUser,
  colors,
  customerPalette,
  haptic,
  iosContinuousCurve,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';
import { formatVietnamPhoneNumber } from '../phone-formatter';

export interface BookingReceiverSectionProps {
  receiverName: string;
  receiverPhone: string;
  onChangeName: (name: string) => void;
  onChangePhone: (phone: string) => void;
  onOpenContacts?: () => void;
  nameError?: string;
  phoneError?: string;
}

export function BookingReceiverSection({
  receiverName,
  receiverPhone,
  onChangeName,
  onChangePhone,
  onOpenContacts,
  nameError,
  phoneError,
}: BookingReceiverSectionProps) {
  const handlePhoneChange = (text: string) => {
    const formatted = formatVietnamPhoneNumber(text);
    onChangePhone(formatted.display);
  };

  const handleOpenContacts = () => {
    haptic.light();
    if (onOpenContacts) onOpenContacts();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>Người nhận</Text>

      <View style={styles.insetGroupedCard}>
        {/* Tên người nhận */}
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Tên người nhận</Text>
          <View style={styles.inputWrap}>
            <TextInput
              accessibilityLabel="Tên người nhận"
              onChangeText={onChangeName}
              placeholder="Họ và tên người nhận"
              placeholderTextColor={customerPalette.offlineGray}
              style={styles.textInput}
              value={receiverName}
            />
            <Pressable
              accessibilityHint="Mở danh bạ điện thoại để chọn người nhận"
              accessibilityLabel="Mở danh bạ"
              accessibilityRole="button"
              hitSlop={8}
              onPress={handleOpenContacts}
              style={({ pressed }) => [styles.contactBtn, pressed && styles.btnPressed]}
            >
              <View
                accessibilityElementsHidden={true}
                importantForAccessibility="no"
                style={styles.contactIconCircle}
              >
                <IconUser color={customerPalette.primary} size={15} />
              </View>
            </Pressable>
          </View>
          {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
        </View>

        <View style={styles.separator} />

        {/* Số điện thoại */}
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Số điện thoại</Text>
          <View style={styles.phoneInputRow}>
            <View style={styles.countryCodeBadge}>
              <Text style={styles.countryCodeText}>+84</Text>
            </View>
            <TextInput
              accessibilityLabel="Số điện thoại"
              keyboardType="number-pad"
              onChangeText={handlePhoneChange}
              placeholder="90 000 0001"
              placeholderTextColor={customerPalette.offlineGray}
              style={styles.phoneTextInput}
              value={receiverPhone}
            />
          </View>
          {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm + 2,
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
  insetGroupedCard: {
    marginHorizontal: spacing.md,
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
    ...iosContinuousCurve,
  },
  fieldRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  fieldLabel: {
    ...typeScale.caption2,
    fontWeight: '600',
    color: customerPalette.textSubtle,
    marginBottom: 2,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
  },
  textInput: {
    flex: 1,
    height: 42,
    ...typeScale.subheadline,
    fontWeight: '500',
    color: colors.neutral.text,
    padding: 0,
  },
  contactBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  contactIconCircle: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: customerPalette.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 42,
  },
  countryCodeBadge: {
    paddingHorizontal: spacing.xs,
    height: 30,
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: radius.cardSm,
    justifyContent: 'center',
    alignItems: 'center',
    ...iosContinuousCurve,
  },
  countryCodeText: {
    ...typeScale.caption1,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  phoneTextInput: {
    flex: 1,
    height: 42,
    ...typeScale.subheadline,
    fontWeight: '500',
    color: colors.neutral.text,
    padding: 0,
    fontVariant: ['tabular-nums'],
  },
  separator: {
    height: 0.5,
    backgroundColor: colors.neutral.border,
    marginLeft: spacing.md,
  },
  errorText: {
    ...typeScale.caption2,
    color: colors.danger.text,
    marginTop: 2,
  },
});
