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

      <View style={styles.insetGroupedCard}>
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
            trackColor={{ false: '#E9E9EA', true: customerPalette.primary }}
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
                placeholderTextColor="#C7C7CC"
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
                placeholderTextColor="#C7C7CC"
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
                placeholderTextColor="#C7C7CC"
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
  },
  toggleTextCol: {
    flex: 1,
    paddingRight: 16,
  },
  toggleTitle: {
    ...typeScale.body,
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  toggleSubtitle: {
    ...typeScale.footnote,
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  separator: {
    height: 0.5,
    backgroundColor: '#E5E5EA',
    marginLeft: 16,
  },
  vatExpandedContainer: {
    paddingBottom: 4,
  },
  vatField: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  fieldLabel: {
    ...typeScale.subheadline,
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 4,
  },
  textInput: {
    height: 36,
    ...typeScale.body,
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    padding: 0,
  },
  errorText: {
    ...typeScale.footnote,
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 2,
  },
});
