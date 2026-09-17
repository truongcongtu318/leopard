import React, { memo } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  IconLocationPin,
  IconOrders,
  IconPhone,
  IconRoute,
  colors,
  driverJourneyTokens,
  iosContinuousCurve,
  leopardPalette,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';

export type DriverNavigationSheetProps = Readonly<{
  orderCode: string;
  address: string;
  contactName?: string;
  contactPhone?: string;
  cargoSummary?: string;
  etaLabel?: string;
  distanceLabel?: string;
  isAtPickupGeofence?: boolean;
  onConfirmArrival: () => void;
  isDarkMode?: boolean;
  ctaLabel?: string;
}>;

export const DriverNavigationSheet = memo(function DriverNavigationSheet({
  address,
  cargoSummary,
  contactName = 'Người gửi / Người nhận',
  contactPhone,
  ctaLabel = 'Tôi đã đến nơi',
  distanceLabel = '3.8 km',
  etaLabel = '12 phút',
  isAtPickupGeofence = false,
  isDarkMode = false,
  onConfirmArrival,
  orderCode,
}: DriverNavigationSheetProps) {
  const handleCall = () => {
    if (!contactPhone) return;
    const cleanPhone = contactPhone.replace(/[^\d+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {});
  };

  const handleSms = () => {
    if (!contactPhone) return;
    const cleanPhone = contactPhone.replace(/[^\d+]/g, '');
    const url = Platform.OS === 'ios' ? `sms:${cleanPhone}` : `sms:${cleanPhone}?body=`;
    Linking.openURL(url).catch(() => {});
  };

  const sheetBg = isDarkMode ? '#161F30' : '#FFFFFF';
  const textMain = isDarkMode ? '#F8FAFC' : '#0F172A';
  const textMuted = isDarkMode ? '#94A3B8' : '#64748B';
  const borderCol = isDarkMode ? '#26354A' : '#E2E8F0';
  const actionBtnBg = isDarkMode ? '#1E293B' : '#F1F5F9';
  const ctaBg = isDarkMode ? '#38BDF8' : '#0B2545';
  const ctaText = isDarkMode ? '#0B0F17' : '#FFFFFF';

  return (
    <View
      style={[styles.container, { backgroundColor: sheetBg, borderColor: borderCol }]}
      testID="driver-nav-sheet-container"
    >
      {/* Handle bar to symbolize persistent bottom sheet */}
      <View style={[styles.handleBar, { backgroundColor: isDarkMode ? '#334155' : '#CBD5E1' }]} />

      {/* Geofence Suggestion Banner */}
      {isAtPickupGeofence ? (
        <View style={styles.geofenceBanner} testID="geofence-banner">
          <View style={styles.geofenceDot} />
          <Text style={styles.geofenceText}>
            ĐÃ VÀO VÙNG ĐIỂM LẤY (Cách &lt;100m) • GỢI Ý ĐẾN NƠI
          </Text>
        </View>
      ) : null}

      {/* Order & Address Row */}
      <View style={styles.orderRow}>
        <View style={styles.orderBadge}>
          <Text style={styles.orderBadgeText}>{orderCode}</Text>
        </View>
        <Text style={[styles.etaText, { color: textMuted }]}>
          ETA: {etaLabel} ({distanceLabel})
        </Text>
      </View>

      <Text numberOfLines={2} style={[styles.addressText, { color: textMain }]}>
        {address}
      </Text>

      {cargoSummary ? (
        <Text numberOfLines={1} style={[styles.cargoText, { color: textMuted }]}>
          📦 {cargoSummary}
        </Text>
      ) : null}

      {/* Contact & Quick Actions */}
      <View style={[styles.contactCard, { backgroundColor: actionBtnBg, borderColor: borderCol }]}>
        <View style={styles.contactInfoCol}>
          <Text style={[styles.contactName, { color: textMain }]} numberOfLines={1}>
            {contactName}
          </Text>
          <Text style={[styles.contactPhone, { color: textMuted }]}>
            {contactPhone || 'Chưa cập nhật SĐT'}
          </Text>
        </View>

        <View style={styles.contactActionsRow}>
          <Pressable
            accessibilityLabel="Gọi điện cho người liên hệ"
            accessibilityRole="button"
            onPress={handleCall}
            style={({ pressed }) => [
              styles.actionBtn,
              {
                backgroundColor: isDarkMode ? '#1E242B' : '#FFFBEB',
                borderColor: isDarkMode ? '#F59E0B' : '#FDE68A',
              },
              pressed ? styles.btnPressed : null,
            ]}
            testID="btn-call-contact"
          >
            <IconPhone color={isDarkMode ? '#FBBF24' : '#D97706'} size={20} />
          </Pressable>

          <Pressable
            accessibilityLabel="Nhắn tin SMS cho người liên hệ"
            accessibilityRole="button"
            onPress={handleSms}
            style={({ pressed }) => [
              styles.actionBtn,
              {
                backgroundColor: isDarkMode ? '#1E242B' : '#F0F4FA',
                borderColor: isDarkMode ? '#38BDF8' : '#CBD9EB',
              },
              pressed ? styles.btnPressed : null,
            ]}
            testID="btn-sms-contact"
          >
            <IconOrders color={isDarkMode ? '#38BDF8' : '#0B2545'} size={20} />
          </Pressable>
        </View>
      </View>

      {/* Primary Action Button (>= 56pt) */}
      <Pressable
        accessibilityLabel={ctaLabel}
        accessibilityRole="button"
        onPress={onConfirmArrival}
        style={({ pressed }) => [
          styles.primaryCta,
          { backgroundColor: ctaBg },
          pressed ? styles.btnPressed : null,
        ]}
        testID="btn-confirm-arrival"
      >
        <Text style={[styles.primaryCtaText, { color: ctaText }]}>
          {ctaLabel}
        </Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.lg,
    width: '100%',
    ...iosContinuousCurve,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    alignSelf: 'center',
    marginVertical: spacing.xs,
  },
  geofenceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8EE',
    borderWidth: 1,
    borderColor: '#34C759',
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  geofenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
  },
  geofenceText: {
    color: '#008038',
    ...typeScale.caption1,
    fontWeight: '700',
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xxs,
  },
  orderBadge: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
  orderBadgeText: {
    color: '#D97706',
    ...typeScale.caption2,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  etaText: {
    ...typeScale.footnote,
    fontWeight: '600',
  },
  addressText: {
    ...typeScale.headline,
    fontWeight: '700',
    marginVertical: spacing.xxs,
  },
  cargoText: {
    ...typeScale.footnote,
    marginBottom: spacing.xs,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: radius.card,
    borderWidth: 1,
    marginVertical: spacing.xs,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    ...iosContinuousCurve,
    shadowColor: '#0B2545',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  contactInfoCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  contactName: {
    ...typeScale.headline,
    fontWeight: '700',
    color: '#0F172A',
  },
  contactPhone: {
    ...typeScale.footnote,
    color: '#64748B',
    marginTop: 2,
  },
  contactActionsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionBtn: {
    width: driverJourneyTokens.sizes.secondaryTouchTarget,
    height: driverJourneyTokens.sizes.secondaryTouchTarget,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryCta: {
    height: driverJourneyTokens.sizes.primaryCtaHeight,
    borderRadius: 16,
    backgroundColor: '#0B2545',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    ...iosContinuousCurve,
    shadowColor: '#0B2545',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryCtaText: {
    ...typeScale.headline,
    fontWeight: '700',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
});
