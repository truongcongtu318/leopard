import React from 'react';
import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import {
  customerPalette,
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
  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>DỊCH VỤ THÊM</Text>

      <View style={styles.groupedCard}>
        {/* Toggle Bốc xếp */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleTextCol}>
            <Text style={styles.toggleTitle}>Tài xế hỗ trợ bốc xếp</Text>
            <Text style={styles.toggleSubtitle}>+150.000 đ</Text>
          </View>
          <Switch
            accessibilityLabel="Tài xế hỗ trợ bốc xếp"
            onValueChange={onToggleLoading}
            thumbColor="#FFFFFF"
            trackColor={{ false: '#E2E8F0', true: customerPalette.primary }}
            value={hasLoadingSupport}
          />
        </View>

        <View style={styles.separator} />

        {/* Toggle VAT */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleTextCol}>
            <Text style={styles.toggleTitle}>Xuất hóa đơn VAT</Text>
            <Text style={styles.toggleSubtitle}>Phụ thu 8%</Text>
          </View>
          <Switch
            accessibilityLabel="Xuất hóa đơn VAT"
            onValueChange={onToggleVat}
            thumbColor="#FFFFFF"
            trackColor={{ false: '#E2E8F0', true: customerPalette.primary }}
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
                placeholderTextColor={customerPalette.textMutedSlate}
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
                placeholderTextColor={customerPalette.textMutedSlate}
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
                placeholderTextColor={customerPalette.textMutedSlate}
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  toggleTextCol: {
    flex: 1,
  },
  toggleTitle: {
    ...typeScale.body,
    fontWeight: '500',
    color: customerPalette.textSlateDark,
  },
  toggleSubtitle: {
    ...typeScale.footnote,
    color: customerPalette.textMutedSlate,
    marginTop: 2,
  },
  separator: {
    height: 0.5,
    backgroundColor: '#E2E8F0',
  },
  vatExpandedContainer: {
    paddingBottom: spacing.sm,
  },
  vatField: {
    paddingVertical: spacing.sm,
  },
  fieldLabel: {
    ...typeScale.subheadline,
    fontWeight: '500',
    color: customerPalette.textMutedSlate,
    marginBottom: 4,
  },
  textInput: {
    height: 40,
    ...typeScale.body,
    color: customerPalette.textSlateDark,
    padding: 0,
  },
  errorText: {
    ...typeScale.footnote,
    color: '#FF3B30',
    marginTop: 2,
  },
});
