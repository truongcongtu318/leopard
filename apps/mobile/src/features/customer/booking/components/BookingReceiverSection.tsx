import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  IconUser,
  customerPalette,
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

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>NGƯỜI NHẬN</Text>

      <View style={styles.groupedCard}>
        {/* Tên người nhận */}
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Tên người nhận</Text>
          <View style={styles.inputWrap}>
            <TextInput
              accessibilityLabel="Tên người nhận"
              onChangeText={onChangeName}
              placeholder="Họ và tên người nhận"
              placeholderTextColor={customerPalette.textMutedSlate}
              style={styles.textInput}
              value={receiverName}
            />
            <Pressable
              accessibilityLabel="Mở danh bạ"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onOpenContacts}
              style={styles.contactBtn}
            >
              <IconUser color={customerPalette.primary} size={20} />
            </Pressable>
          </View>
        </View>

        {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}

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
              placeholderTextColor={customerPalette.textMutedSlate}
              style={styles.phoneTextInput}
              value={receiverPhone}
            />
          </View>
        </View>

        {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
      </View>
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
    paddingHorizontal: spacing.md,
    ...iosContinuousCurve,
  },
  fieldRow: {
    paddingVertical: spacing.sm,
  },
  fieldLabel: {
    ...typeScale.subheadline,
    fontWeight: '500',
    color: customerPalette.textMutedSlate,
    marginBottom: 4,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    height: 40,
    ...typeScale.body,
    color: customerPalette.textSlateDark,
    padding: 0,
  },
  contactBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  countryCodeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: '#F1F5F9',
    borderRadius: radius.control,
    minHeight: 38,
    justifyContent: 'center',
    alignItems: 'center',
    ...iosContinuousCurve,
  },
  countryCodeText: {
    ...typeScale.body,
    fontWeight: '600',
    color: customerPalette.textSlateDark,
  },
  phoneTextInput: {
    flex: 1,
    height: 40,
    ...typeScale.body,
    color: customerPalette.textSlateDark,
    padding: 0,
  },
  separator: {
    height: 0.5,
    backgroundColor: '#E2E8F0',
  },
  errorText: {
    ...typeScale.footnote,
    color: '#FF3B30',
    paddingBottom: spacing.xs,
  },
});
