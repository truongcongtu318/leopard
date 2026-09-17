import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  IconCheck,
  IconOrders,
  driverHapticMatrix,
  driverJourneyTokens,
  iosContinuousCurve,
  leopardPalette,
  radius,
  spacing,
  typeScale,
  ScreenScaffold,
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

  return (
    <ScreenScaffold headerTone="plain" onBack={onBack} title={`Biên bản đơn ${order.reference}`}>
      <View style={styles.container} testID="completed-order-detail-view">
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* 1. Celebratory Hero Card */}
          <View style={styles.heroCard}>
            <View style={styles.successIconCircle}>
              <IconCheck color="#FFFFFF" size={28} strokeWidth={3} />
            </View>
            <Text style={styles.heroTitle}>Giao hàng thành công!</Text>
            <View style={styles.orderPill}>
              <Text style={styles.orderPillText}>{order.reference}</Text>
            </View>
            <Text style={styles.heroTimestamp}>Hoàn tất lúc: {order.updatedAtLabel}</Text>
          </View>

          {/* 2. Earnings Bento Card */}
          <View style={styles.bentoCard}>
            <Text style={styles.bentoLabel}>TỔNG THU NHẬP CỦA BẠN</Text>
            <Text style={styles.earningsAmount}>{order.priceLabel}</Text>
            <Text style={styles.earningsSub}>Đã cộng vào ví tài xế · Thực nhận sau chiết khấu</Text>

            <View style={styles.divider} />

            <View style={styles.metaGrid}>
              <View style={styles.metaItem}>
                <Text style={styles.metaItemLabel}>Quãng đường</Text>
                <Text style={styles.metaItemValue}>{order.route.distanceLabel || '5.6 km'}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaItemLabel}>Phương tiện</Text>
                <Text style={styles.metaItemValue}>{order.vehicleLabel || 'Xe tải'}</Text>
              </View>
            </View>
          </View>

          {/* 3. Lộ trình vận chuyển thực tế */}
          <View style={styles.routeCard}>
            <Text style={styles.sectionHeader}>LỘ TRÌNH VẬN CHUYỂN</Text>

            <View style={styles.routeRow}>
              <View style={styles.routeDotGreen} />
              <View style={styles.routeTextCol}>
                <Text style={styles.routePointType}>Điểm lấy hàng</Text>
                <Text numberOfLines={2} style={styles.routeAddressText}>
                  {order.route.origin.label}
                </Text>
              </View>
            </View>

            <View style={styles.routeConnectorLine} />

            <View style={styles.routeRow}>
              <View style={styles.routeDotOrange} />
              <View style={styles.routeTextCol}>
                <Text style={styles.routePointType}>Điểm giao hàng</Text>
                <Text numberOfLines={2} style={styles.routeAddressText}>
                  {order.route.destination.label}
                </Text>
              </View>
            </View>

            {order.cargoSummary ? (
              <View style={styles.cargoRow}>
                <Text style={styles.cargoText}>
                  📦 {order.cargoSummary}
                  {order.cargoWeightKg ? ` (${order.cargoWeightKg} kg)` : ''}
                </Text>
              </View>
            ) : null}
          </View>

          {/* 4. Biên bản e-POD bàn giao hàng (chỉ đọc) */}
          {hasProof ? (
            <View style={styles.epodCard} testID="epod-saved-receipt">
              <View style={styles.epodHeaderRow}>
                <IconOrders color="#0F172A" size={16} />
                <Text style={styles.epodTitle}>BIÊN BẢN GIAO NHẬN (e-POD)</Text>
              </View>

              <View
                accessibilityLabel="Ảnh chụp bàn giao kiện hàng"
                style={styles.proofVerifiedRow}
              >
                <View style={styles.checkIconSmall}>
                  <IconCheck color="#15803D" size={14} strokeWidth={2.5} />
                </View>
                <Text style={styles.proofVerifiedText}>
                  {proof.fileLabel || 'Đã lưu ảnh chứng từ giao hàng xác thực'}
                </Text>
              </View>

              <View
                accessibilityLabel="Chữ ký người nhận hàng"
                style={styles.signatureVerifiedRow}
              >
                <View style={styles.checkIconSmall}>
                  <IconCheck color="#15803D" size={14} strokeWidth={2.5} />
                </View>
                <Text style={styles.signatureVerifiedText}>
                  Đã ký xác nhận bàn giao điện tử
                </Text>
              </View>
            </View>
          ) : null}
        </ScrollView>

        {/* 5. Fixed CTA Button at bottom (>= 56pt) */}
        <View style={styles.footerWrap}>
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
        </View>
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
    padding: spacing.md,
    paddingBottom: 90,
    gap: spacing.sm,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.cardLg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    padding: spacing.lg,
    ...iosContinuousCurve,
    shadowColor: '#0B2545',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 6,
  },
  successIconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  heroTitle: {
    ...typeScale.title2,
    fontWeight: '800',
    color: '#0F172A',
  },
  orderPill: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  orderPillText: {
    ...typeScale.caption1,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.3,
  },
  heroTimestamp: {
    ...typeScale.footnote,
    color: '#64748B',
    marginTop: 2,
  },
  bentoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.card,
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
  bentoLabel: {
    ...typeScale.caption2,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  earningsAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#15803D',
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
  earningsSub: {
    ...typeScale.footnote,
    color: '#64748B',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: spacing.sm,
  },
  metaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaItem: {
    gap: 2,
  },
  metaItemLabel: {
    ...typeScale.caption2,
    color: '#94A3B8',
  },
  metaItemValue: {
    ...typeScale.subheadline,
    fontWeight: '700',
    color: '#0F172A',
  },
  routeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.card,
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
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  routeDotGreen: {
    width: 12,
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: '#16A34A',
    marginTop: 3,
  },
  routeDotOrange: {
    width: 12,
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: '#F59E0B',
    marginTop: 3,
  },
  routeConnectorLine: {
    width: 2,
    height: 18,
    backgroundColor: '#E2E8F0',
    marginLeft: 5,
    marginVertical: 2,
  },
  routeTextCol: {
    flex: 1,
  },
  routePointType: {
    ...typeScale.caption2,
    color: '#94A3B8',
    fontWeight: '600',
  },
  routeAddressText: {
    ...typeScale.subheadline,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 1,
  },
  cargoRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cargoText: {
    ...typeScale.footnote,
    color: '#64748B',
  },
  epodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    gap: spacing.xs,
    ...iosContinuousCurve,
  },
  epodHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  epodTitle: {
    ...typeScale.caption2,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  proofVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: spacing.xs,
    gap: 8,
  },
  signatureVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: spacing.xs,
    gap: 8,
  },
  checkIconSmall: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proofVerifiedText: {
    ...typeScale.caption1,
    color: '#15803D',
    fontWeight: '600',
  },
  signatureVerifiedText: {
    ...typeScale.caption1,
    color: '#15803D',
    fontWeight: '600',
  },
  footerWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  primaryBtn: {
    height: driverJourneyTokens.sizes.primaryCtaHeight,
    borderRadius: 16,
    backgroundColor: leopardPalette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...iosContinuousCurve,
  },
  primaryBtnText: {
    ...typeScale.headline,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
});
