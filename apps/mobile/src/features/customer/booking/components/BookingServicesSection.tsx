import React from 'react';
import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import {
  colors,
  customerPalette,
  haptic,
  iosContinuousCurve,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';

export interface BookingServicesSectionProps {
  hasLoadingSupport: boolean;
  hasVatInvoice: boolean;
  onToggleLoading: (value: boolean) => void;
  onToggleVat: (value: boolean) => void;
  vatCompany?: string;
  vatTaxId?: string;
  vatEmail?: string;
  onChangeVatField: (field: 'vatCompany' | 'vatTaxId' | 'vatEmail', value: string) => void;
  vatErrors?: {
    company?: string;
    taxId?: string;
    email?: string;
  };
}

export function BookingServicesSection({
  hasLoadingSupport,
  hasVatInvoice,
  onToggleLoading,
  onToggleVat,
  vatCompany = '',
  vatTaxId = '',
  vatEmail = '',
  onChangeVatField,
  vatErrors,
}: BookingServicesSectionProps) {
  const handleToggleLoading = (val: boolean) => {
    haptic.selection();
    onToggleLoading(val);
  };

  const handleToggleVat = (val: boolean) => {
    haptic.selection();
    onToggleVat(val);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>Dịch vụ thêm</Text>

      <View style={styles.insetGroupedCard}>
        {/* Toggle Bốc xếp - iOS Settings row (44pt) */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleTextCol}>
            <Text style={styles.toggleTitle}>Tài xế hỗ trợ bốc xếp</Text>
            <Text style={styles.toggleSubtitle}>+150.000 đ</Text>
          </View>
          <Switch
            accessibilityLabel="Tài xế hỗ trợ bốc xếp"
            onValueChange={handleToggleLoading}
            thumbColor="#FFFFFF"
            trackColor={{ false: '#E9E9EA', true: customerPalette.primary }}
            value={hasLoadingSupport}
          />
        </View>

        <View style={styles.separator} />

        {/* Toggle VAT - iOS Settings row (44pt) */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleTextCol}>
            <Text style={styles.toggleTitle}>Xuất hóa đơn VAT</Text>
            <Text style={styles.toggleSubtitle}>Phụ thu 8%</Text>
          </View>
          <Switch
            accessibilityLabel="Xuất hóa đơn VAT"
            onValueChange={handleToggleVat}
            thumbColor="#FFFFFF"
            trackColor={{ false: '#E9E9EA', true: customerPalette.primary }}
            value={hasVatInvoice}
          />
        </View>

        {/* VAT Expanded Form */}
        {hasVatInvoice && (
          <View style={styles.vatExpandedContainer}>
            <View style={styles.separator} />

            {/* Tên công ty */}
            <View style={styles.vatField}>
              <Text style={styles.fieldLabel}>Tên công ty</Text>
              <TextInput
                accessibilityLabel="Tên công ty"
                onChangeText={(text) => onChangeVatField('vatCompany', text)}
                placeholder="Tên công ty đầy đủ"
                placeholderTextColor={customerPalette.offlineGray}
                style={styles.textInput}
                value={vatCompany}
              />
              {vatErrors?.company && (
                <Text style={styles.errorText}>{vatErrors.company}</Text>
              )}
            </View>

            <View style={styles.separator} />

            {/* Mã số thuế */}
            <View style={styles.vatField}>
              <Text style={styles.fieldLabel}>Mã số thuế</Text>
              <TextInput
                accessibilityLabel="Mã số thuế"
                keyboardType="number-pad"
                onChangeText={(text) => onChangeVatField('vatTaxId', text)}
                placeholder="Mã số thuế doanh nghiệp"
                placeholderTextColor={customerPalette.offlineGray}
                style={styles.textInput}
                value={vatTaxId}
              />
              {vatErrors?.taxId && (
                <Text style={styles.errorText}>{vatErrors.taxId}</Text>
              )}
            </View>

            <View style={styles.separator} />

            {/* Email nhận hóa đơn */}
            <View style={styles.vatField}>
              <Text style={styles.fieldLabel}>Email nhận hóa đơn điện tử</Text>
              <TextInput
                accessibilityLabel="Email nhận hóa đơn điện tử"
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={(text) => onChangeVatField('vatEmail', text)}
                placeholder="ketoan@congty.com"
                placeholderTextColor={customerPalette.offlineGray}
                style={styles.textInput}
                value={vatEmail}
              />
              {vatErrors?.email && (
                <Text style={styles.errorText}>{vatErrors.email}</Text>
              )}
            </View>
          </View>
        )}
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs + 2,
    minHeight: 44,
    height: 48,
  },
  toggleTextCol: {
    flex: 1,
    paddingRight: spacing.sm,
    justifyContent: 'center',
  },
  toggleTitle: {
    ...typeScale.subheadline,
    fontWeight: '500',
    color: colors.neutral.text,
  },
  toggleSubtitle: {
    ...typeScale.caption2,
    color: customerPalette.textSubtle,
    marginTop: 1,
  },
  separator: {
    height: 0.5,
    backgroundColor: colors.neutral.border,
    marginLeft: spacing.md,
  },
  vatExpandedContainer: {
    paddingBottom: spacing.xxs,
  },
  vatField: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs + 2,
  },
  fieldLabel: {
    ...typeScale.caption2,
    fontWeight: '600',
    color: customerPalette.textSubtle,
    marginBottom: 2,
  },
  textInput: {
    height: 38,
    ...typeScale.subheadline,
    fontWeight: '500',
    color: colors.neutral.text,
    padding: 0,
  },
  errorText: {
    ...typeScale.caption2,
    color: colors.danger.text,
    marginTop: 2,
  },
});
