import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  IconCheck,
  IconOrders,
  IconRoute,
  IconSecurityShield,
  IconSpeedTruck,
  ScreenScaffold,
  driverHapticMatrix,
  driverJourneyTokens,
  iosContinuousCurve,
  leopardPalette,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';
import type { DriverAssignedDetailView } from '../../model';

export type CompletedOrderDetailViewProps = Readonly<{
  view: DriverAssignedDetailView;
  onBack?: () => void;
}>;

export function CompletedOrderDetailView({ onBack, view }: CompletedOrderDetailViewProps) {
  const { order, proof } = view;
  const hasProof = Boolean(
    proof && (proof.kind === 'persisted' || proof.fileLabel || proof.mediaId),
  );

  const handleGoHome = () => {
    driverHapticMatrix.actionHeavy();
    if (onBack) onBack();
  };

  const stickyFooterNode = (
    <Pressable
      accessibilityLabel="Về trang chủ, sẵn sàng nhận đơn"
      accessibilityRole="button"
      onPress={handleGoHome}
      style={({ pressed }) => [
        styles.primaryBtn,
        pressed ? styles.btnPressed : null,
      ]}
    >
      <Text style={styles.primaryBtnText}>Về trang chủ, sẵn sàng nhận đơn</Text>
    </Pressable>
  );

  return (
    <ScreenScaffold
      headerTone="plain"
      onBack={onBack}
      stickyFooter={stickyFooterNode}
      title={`Biên bản đơn ${order.reference}`}
    >
      <View style={styles.container} testID="completed-order-detail-view">
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Celebratory Hero Card */}
          <View style={styles.heroCard}>
            <View style={styles.successIconOuter}>
              <View style={styles.successIconInner}>
                <IconCheck color="#FFFFFF" size={20} strokeWidth={3} />
              </View>
            </View>
            <Text style={styles.heroTitle}>Giao hàng thành công!</Text>
            <View style={styles.orderPill}>
              <Text style={styles.orderPillText}>{order.reference}</Text>
            </View>
            <Text style={styles.heroTimestamp}>Hoàn tất lúc: {order.updatedAtLabel}</Text>
          </View>

          {/* 2. Earnings Bento Card */}
          <View style={styles.bentoCard}>
            <View style={styles.bentoHeaderRow}>
              <Text style={styles.bentoLabel}>TỔNG THU NHẬP CỦA BẠN</Text>
              <View style={styles.settledBadge}>
                <Text style={styles.settledBadgeText}>Đã cộng ví</Text>
              </View>
            </View>

            <Text style={styles.earningsAmount}>{order.priceLabel || '0 ₫'}</Text>
            <Text style={styles.earningsSub}>
              Đã cộng vào ví tài xế · Thực nhận sau chiết khấu
            </Text>

            <View style={styles.divider} />

            <View style={styles.metaGrid}>
              <View style={styles.metaItem}>
                <View style={styles.metaItemHeader}>
                  <IconRoute color="#2563EB" size={14} />
                  <Text style={styles.metaItemLabel}>Quãng đường</Text>
                </View>
                <Text style={styles.metaItemValue}>
                  {order.route.distanceLabel || '5.6 km'}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <View style={styles.metaItemHeader}>
                  <IconSpeedTruck color="#0B2545" size={14} />
                  <Text style={styles.metaItemLabel}>Phương tiện</Text>
                </View>
                <Text style={styles.metaItemValue}>{order.vehicleLabel || 'Xe tải'}</Text>
              </View>
            </View>
          </View>

          {/* 3. Lộ trình vận chuyển thực tế */}
          <View style={styles.routeCard}>
            <Text style={styles.sectionHeader}>LỘ TRÌNH VẬN CHUYỂN</Text>

            <View style={styles.routeContainer}>
              {/* Pickup Leg */}
              <View style={styles.routeRow}>
                <View style={styles.indicatorCol}>
                  <View style={styles.dotRingGreen}>
                    <View style={styles.dotCoreGreen} />
                  </View>
                  <View style={styles.connectorLine} />
                </View>
                <View style={styles.routeTextCol}>
                  <Text style={styles.routePointTypeGreen}>Điểm lấy hàng</Text>
                  <Text numberOfLines={2} style={styles.routeAddressText}>
                    {order.route.origin.label}
                  </Text>
                </View>
              </View>

              {/* Dropoff Leg */}
              <View style={styles.routeRow}>
                <View style={styles.indicatorCol}>
                  <View style={styles.dotRingAmber}>
                    <View style={styles.dotCoreAmber} />
                  </View>
                </View>
                <View style={styles.routeTextCol}>
                  <Text style={styles.routePointTypeAmber}>Điểm giao hàng</Text>
                  <Text numberOfLines={2} style={styles.routeAddressText}>
                    {order.route.destination.label}
                  </Text>
                </View>
              </View>
            </View>

            {order.cargoSummary ? (
              <View style={styles.cargoRow}>
                <IconOrders color="#64748B" size={15} />
                <Text style={styles.cargoText}>
                  Kiện hàng: {order.cargoSummary}
                  {order.cargoWeightKg ? ` · ${order.cargoWeightKg} kg` : ''}
                </Text>
              </View>
            ) : null}
          </View>

          {/* 4. Biên bản e-POD bàn giao hàng (chỉ đọc) */}
          {hasProof ? (
            <View style={styles.epodCard} testID="epod-saved-receipt">
              <View style={styles.epodHeaderRow}>
                <View style={styles.epodTitleGroup}>
                  <IconSecurityShield color="#0B2545" size={16} />
                  <Text style={styles.epodTitle}>BIÊN BẢN GIAO NHẬN (e-POD)</Text>
                </View>
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedBadgeText}>Đã xác thực</Text>
                </View>
              </View>

              <View
                accessibilityLabel="Ảnh chụp bàn giao kiện hàng"
                style={styles.proofVerifiedRow}
              >
                <View style={styles.checkIconSmall}>
                  <IconCheck color="#15803D" size={13} strokeWidth={2.5} />
                </View>
                <View style={styles.proofTextCol}>
                  <Text style={styles.proofItemLabel}>Ảnh chứng từ bàn giao</Text>
                  <Text numberOfLines={1} style={styles.proofVerifiedText}>
                    {proof.fileLabel || 'Đã lưu ảnh chứng từ giao hàng xác thực'}
                  </Text>
                </View>
              </View>

              <View
                accessibilityLabel="Chữ ký người nhận hàng"
                style={styles.signatureVerifiedRow}
              >
                <View style={styles.checkIconSmall}>
                  <IconCheck color="#15803D" size={13} strokeWidth={2.5} />
                </View>
                <View style={styles.proofTextCol}>
                  <Text style={styles.proofItemLabel}>Xác nhận người nhận</Text>
                  <Text numberOfLines={1} style={styles.signatureVerifiedText}>
                    Đã ký xác nhận bàn giao điện tử
                  </Text>
                </View>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.cardLg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    ...iosContinuousCurve,
    shadowColor: '#0B2545',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: spacing.xs,
  },
  successIconOuter: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxs,
  },
  successIconInner: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  heroTitle: {
    ...typeScale.title2,
    fontWeight: '700',
    color: '#0F172A',
  },
  orderPill: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    ...iosContinuousCurve,
  },
  orderPillText: {
    ...typeScale.caption1,
    fontWeight: '700',
    color: '#D97706',
    letterSpacing: 0.3,
  },
  heroTimestamp: {
    ...typeScale.footnote,
    color: '#64748B',
  },
  bentoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.cardLg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    ...iosContinuousCurve,
    shadowColor: '#0B2545',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  bentoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bentoLabel: {
    ...typeScale.caption2,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  settledBadge: {
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    ...iosContinuousCurve,
  },
  settledBadgeText: {
    ...typeScale.caption2,
    fontWeight: '700',
    color: '#15803D',
  },
  earningsAmount: {
    ...typeScale.largeTitle,
    fontWeight: '700',
    color: '#15803D',
    fontVariant: ['tabular-nums'],
    marginTop: spacing.xxs,
  },
  earningsSub: {
    ...typeScale.footnote,
    color: '#64748B',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: spacing.md,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metaItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: radius.control,
    padding: spacing.sm,
    gap: spacing.xxs,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...iosContinuousCurve,
  },
  metaItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  metaItemLabel: {
    ...typeScale.caption2,
    color: '#64748B',
    fontWeight: '500',
  },
  metaItemValue: {
    ...typeScale.subheadline,
    fontWeight: '700',
    color: '#0F172A',
  },
  routeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.cardLg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    ...iosContinuousCurve,
    shadowColor: '#0B2545',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: {
    ...typeScale.caption2,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  routeContainer: {
    gap: spacing.xxs,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  indicatorCol: {
    alignItems: 'center',
    width: 20,
  },
  dotRingGreen: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCoreGreen: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: '#16A34A',
  },
  dotRingAmber: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCoreAmber: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: '#F59E0B',
  },
  connectorLine: {
    width: 2,
    flex: 1,
    minHeight: 24,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },
  routeTextCol: {
    flex: 1,
    paddingBottom: spacing.sm,
  },
  routePointTypeGreen: {
    ...typeScale.caption2,
    color: '#16A34A',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  routePointTypeAmber: {
    ...typeScale.caption2,
    color: '#D97706',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  routeAddressText: {
    ...typeScale.subheadline,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 2,
    lineHeight: 20,
  },
  cargoRow: {
    marginTop: spacing.xs,
    padding: spacing.sm,
    backgroundColor: '#F8FAFC',
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    ...iosContinuousCurve,
  },
  cargoText: {
    ...typeScale.footnote,
    color: '#475569',
    fontWeight: '500',
  },
  epodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.cardLg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    gap: spacing.sm,
    ...iosContinuousCurve,
    shadowColor: '#0B2545',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  epodHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xxs,
  },
  epodTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  epodTitle: {
    ...typeScale.caption2,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  verifiedBadge: {
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    ...iosContinuousCurve,
  },
  verifiedBadgeText: {
    ...typeScale.caption2,
    fontWeight: '700',
    color: '#15803D',
  },
  proofVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
    borderWidth: 1,
    borderRadius: radius.cardSm,
    padding: spacing.sm,
    gap: spacing.sm,
    ...iosContinuousCurve,
  },
  signatureVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
    borderWidth: 1,
    borderRadius: radius.cardSm,
    padding: spacing.sm,
    gap: spacing.sm,
    ...iosContinuousCurve,
  },
  checkIconSmall: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proofTextCol: {
    flex: 1,
    gap: 1,
  },
  proofItemLabel: {
    ...typeScale.caption2,
    color: '#15803D',
    fontWeight: '700',
  },
  proofVerifiedText: {
    ...typeScale.caption1,
    color: '#166534',
    fontWeight: '600',
  },
  signatureVerifiedText: {
    ...typeScale.caption1,
    color: '#166534',
    fontWeight: '600',
  },
  primaryBtn: {
    height: driverJourneyTokens.sizes.primaryCtaHeight,
    width: '100%',
    borderRadius: radius.cardLg,
    backgroundColor: leopardPalette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...iosContinuousCurve,
    shadowColor: '#0B2545',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnText: {
    ...typeScale.headline,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
});

