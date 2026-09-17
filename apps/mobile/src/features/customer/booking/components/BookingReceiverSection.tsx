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

      <View style={styles.insetGroupedCard}>
        {/* Tên người nhận */}
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Tên người nhận</Text>
          <View style={styles.inputWrap}>
            <TextInput
              accessibilityLabel="Tên người nhận"
              onChangeText={onChangeName}
              placeholder="Họ và tên người nhận"
              placeholderTextColor="#C7C7CC"
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
              <View style={styles.contactIconCircle}>
                <IconUser color={customerPalette.primary} size={18} />
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
              placeholderTextColor="#C7C7CC"
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
  fieldRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fieldLabel: {
    ...typeScale.subheadline,
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 4,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    height: 36,
    ...typeScale.body,
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    padding: 0,
  },
  contactBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EBF2FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countryCodeBadge: {
    paddingHorizontal: 10,
    height: 34,
    backgroundColor: 'rgba(118, 118, 128, 0.12)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    ...iosContinuousCurve,
  },
  countryCodeText: {
    ...typeScale.body,
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  phoneTextInput: {
    flex: 1,
    height: 36,
    ...typeScale.body,
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    padding: 0,
    fontVariant: ['tabular-nums'],
  },
  separator: {
    height: 0.5,
    backgroundColor: '#E5E5EA',
    marginLeft: 16,
  },
  errorText: {
    ...typeScale.footnote,
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
});
