import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  IconCameraProof,
  IconCheck,
  IconClose,
  IconOrders,
  IconSecurityShield,
  IconSpeedTruck,
  IconTrophy,
  ScreenScaffold,
  ScreenState,
  colors,
  driverPrimitives,
  iosContinuousCurve,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';

export type HistoryTripItem = Readonly<{
  id: string;
  reference: string;
  origin: string;
  destination: string;
  distanceLabel: string;
  cargoSummary: string;
  completedAtLabel: string;
  datePeriod: 'today' | 'week' | 'month' | 'older';
  payoutAmount: number;
  status: 'DELIVERED' | 'CANCELLED';
  hasProof: boolean;
  signerName?: string;
  vehicleLabel?: string;
}>;

export type DriverHistoryScreenProps = Readonly<{
  items: readonly HistoryTripItem[];
  total: number;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onNavigate?: (route: string) => void;
}>;

export function DriverHistoryScreen({
  isError = false,
  isLoading = false,
  items,
  onNavigate,
  onRetry,
  total,
}: DriverHistoryScreenProps) {
  const router = useRouter();
  const [dateFilter, setDateFilter] = useState<'ALL' | 'today' | 'week'>('ALL');
  const [selectedEpodTrip, setSelectedEpodTrip] = useState<HistoryTripItem | null>(null);

  const deliveredItems = items.filter((item) => item.status === 'DELIVERED');
  const displayedList = deliveredItems.filter((item) => {
    if (dateFilter !== 'ALL' && item.datePeriod !== dateFilter) return false;
    return true;
  });

  const deliveredCount = items.filter((item) => item.status === 'DELIVERED').length;
  const completionRate = items.length > 0 ? Math.round((deliveredCount / items.length) * 100) : 0;
  const displayedRevenue = items
    .filter((item) => item.status === 'DELIVERED')
    .reduce((sum, item) => sum + item.payoutAmount, 0);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  const formatCompact = (val: number) =>
    val >= 1_000_000 ? `${(val / 1_000_000).toFixed(2)}tr` : formatCurrency(val);

  return (
    <ScreenScaffold
      headerTone="plain"
      onBack={() => (router.canGoBack() ? router.back() : router.push('/earnings'))}
      title="Lịch sử chuyến"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.scrollWrap}
      >
        {/* ── 1. History Cumulative Performance Bento Card ── */}
        <View style={styles.kpiCard}>
          <View style={styles.kpiCol}>
            <View style={styles.kpiIconWrap}>
              <IconSpeedTruck color={driverPrimitives.colors.gray500} size={16} />
            </View>
            <Text style={styles.kpiValue}>{total}</Text>
            <Text style={styles.kpiLabel}>Tổng chuyến</Text>
          </View>

          <View style={styles.kpiDividerVertical} />

          <View style={styles.kpiCol}>
            <View style={styles.kpiIconWrap}>
              <IconTrophy color={driverPrimitives.colors.gray500} size={16} />
            </View>
            <Text style={styles.kpiValue}>{formatCompact(displayedRevenue)}</Text>
            <Text style={styles.kpiLabel}>Doanh thu (trang đã tải)</Text>
          </View>

          <View style={styles.kpiDividerVertical} />

          <View style={styles.kpiCol}>
            <View style={styles.kpiIconWrap}>
              <IconSecurityShield color={driverPrimitives.colors.gray500} size={16} />
            </View>
            <Text style={styles.kpiValue}>{completionRate}%</Text>
            <Text style={styles.kpiLabel}>Tỷ lệ (trang đã tải)</Text>
          </View>
        </View>

        {isLoading ? (
          <ScreenState state="loading" />
        ) : isError ? (
          <ScreenState actionLabel="Thử lại" onAction={onRetry} state="error" />
        ) : null}

        {/* ── 2. Date Filter Segmented Toolbar ── */}
        <View accessibilityRole="toolbar" style={styles.segmentedControl}>
          <Pressable
            accessibilityLabel="Lọc tất cả chuyến xe"
            accessibilityRole="button"
            accessibilityState={{ selected: dateFilter === 'ALL' }}
            onPress={() => setDateFilter('ALL')}
            style={[styles.segmentBtn, dateFilter === 'ALL' ? styles.segmentBtnActive : null]}
          >
            <Text style={[styles.segmentBtnText, dateFilter === 'ALL' ? styles.segmentBtnTextActive : null]}>
              Mọi lúc
            </Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Lọc chuyến hôm nay"
            accessibilityRole="button"
            accessibilityState={{ selected: dateFilter === 'today' }}
            onPress={() => setDateFilter('today')}
            style={[styles.segmentBtn, dateFilter === 'today' ? styles.segmentBtnActive : null]}
          >
            <Text style={[styles.segmentBtnText, dateFilter === 'today' ? styles.segmentBtnTextActive : null]}>
              Hôm nay
            </Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Lọc chuyến tuần này"
            accessibilityRole="button"
            accessibilityState={{ selected: dateFilter === 'week' }}
            onPress={() => setDateFilter('week')}
            style={[styles.segmentBtn, dateFilter === 'week' ? styles.segmentBtnActive : null]}
          >
            <Text style={[styles.segmentBtnText, dateFilter === 'week' ? styles.segmentBtnTextActive : null]}>
              Tuần này
            </Text>
          </Pressable>
        </View>

        {/* ── 3. Trip Feed Cards ── */}
        {displayedList.length === 0 ? (
          <View style={styles.emptyBox}>
            <IconOrders color="#94A3B8" size={32} />
            <Text style={styles.emptyTitle}>Không có dữ liệu</Text>
            <Text style={styles.emptyMessage}>Không có chuyến nào khớp với bộ lọc ngày đã chọn.</Text>
          </View>
        ) : (
          <View style={styles.listContent}>
            {displayedList.map((item) => (
              <Pressable
                accessibilityLabel={`Chuyến xe ${item.reference}`}
                accessibilityRole="button"
                key={item.id}
                onPress={() => router.push(`/orders/${item.id}`)}
                style={({ pressed }) => [styles.tripCard, pressed ? styles.pressed : null]}
              >
                {/* Header: Reference & Payout */}
                <View style={styles.tripHeaderRow}>
                  <Text style={styles.tripReferenceText}>{item.reference}</Text>
                  <Text style={styles.tripPayoutText}>
                    {item.payoutAmount > 0 ? `+${formatCurrency(item.payoutAmount)}` : '0 ₫'}
                  </Text>
                </View>

                {/* Route */}
                <View style={styles.routeRow}>
                  <Text numberOfLines={1} style={styles.routeOriginText}>
                    {item.origin}
                  </Text>
                  <Text style={styles.routeArrowText}> → </Text>
                  <Text numberOfLines={1} style={styles.routeDestText}>
                    {item.destination}
                  </Text>
                </View>

                {/* Meta row & ePOD button */}
                <View style={styles.tripFooterRow}>
                  <View style={styles.tripMetaWrap}>
                    <Text style={styles.distanceText}>{item.distanceLabel}</Text>
                    <Text style={styles.metaDot}> · </Text>
                    <Text style={styles.timeText}>{item.completedAtLabel}</Text>
                    {item.vehicleLabel ? (
                      <>
                        <Text style={styles.metaDot}> · </Text>
                        <Text style={styles.vehicleText}>{item.vehicleLabel}</Text>
                      </>
                    ) : null}
                  </View>

                  {item.hasProof ? (
                    <Pressable
                      accessibilityLabel={`Xem ảnh e-POD của chuyến ${item.reference}`}
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={(e) => {
                        e.stopPropagation();
                        setSelectedEpodTrip(item);
                      }}
                      style={styles.proofBadgeBtn}
                      testID={`btn-view-epod-${item.id}`}
                    >
                      <IconCheck color="#059669" size={11} strokeWidth={2.5} />
                      <IconCameraProof color="#059669" size={12} />
                      <Text style={styles.proofBadgeText}>Xem e-POD</Text>
                    </Pressable>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Modal Xem e-POD & Chữ ký ── */}
      <Modal
        animationType="fade"
        onRequestClose={() => setSelectedEpodTrip(null)}
        transparent
        visible={Boolean(selectedEpodTrip)}
      >
        <Pressable onPress={() => setSelectedEpodTrip(null)} style={styles.modalBackdrop}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={styles.modalSheet}
            testID="epod-proof-modal"
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chứng từ điện tử e-POD</Text>
              <Pressable
                accessibilityLabel="Đóng"
                accessibilityRole="button"
                hitSlop={12}
                onPress={() => setSelectedEpodTrip(null)}
              >
                <IconClose color={colors.neutral.subtleText} size={20} />
              </Pressable>
            </View>

            {selectedEpodTrip && (
              <View style={styles.modalBody}>
                <View style={styles.proofImageBox}>
                  <Text style={styles.proofImageLabel}>Ảnh hạ tải tại điểm giao</Text>
                  <View style={styles.proofPlaceholderImage}>
                    <IconCameraProof color="#94A3B8" size={36} />
                    <Text style={styles.proofWatermarkText}>
                      LEOPARD e-POD · {selectedEpodTrip.reference}
                    </Text>
                  </View>
                </View>

                <View style={styles.signatureBox}>
                  <Text style={styles.proofImageLabel}>Chữ ký xác nhận nhận hàng</Text>
                  <View style={styles.signatureCanvasPreview}>
                    <Text style={styles.signaturePathPreview}>Đã ký điện tử xác thực</Text>
                  </View>
                  {selectedEpodTrip.signerName ? (
                    <Text style={styles.signerNameText}>
                      Người ký nhận: {selectedEpodTrip.signerName}
                    </Text>
                  ) : null}
                </View>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scrollWrap: {
    backgroundColor: colors.neutral.canvas,
    flex: 1,
  },
  scrollContent: {
    gap: 14,
    paddingHorizontal: 0,
    paddingVertical: 12,
    paddingBottom: 48,
  },

  /* 1. KPI Bento Card */
  kpiCard: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: colors.neutral.border,
    borderRadius: 18,
    ...iosContinuousCurve,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 8,
    ...driverPrimitives.shadows.sm,
  },
  kpiCol: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  kpiIconWrap: {
    alignItems: 'center',
    height: 20,
    justifyContent: 'center',
  },
  kpiValue: {
    color: driverPrimitives.colors.gray900,
    ...typeScale.callout,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  kpiLabel: {
    color: driverPrimitives.colors.gray500,
    ...typeScale.caption2,
    fontWeight: '500',
    textAlign: 'center',
  },
  kpiDividerVertical: {
    backgroundColor: colors.neutral.border,
    height: '100%',
    width: 1,
  },

  /* 2. Date Filter Segmented Control */
  segmentedControl: {
    backgroundColor: colors.neutral.border,
    borderRadius: radius.cardSm,
    ...iosContinuousCurve,
    flexDirection: 'row',
    gap: spacing.hairline,
    padding: spacing.hairline,
  },
  segmentBtn: {
    alignItems: 'center',
    borderRadius: radius.cardSm - 2,
    ...iosContinuousCurve,
    flex: 1,
    paddingVertical: 7,
  },
  segmentBtnActive: {
    backgroundColor: driverPrimitives.colors.white,
    ...driverPrimitives.shadows.sm,
  },
  segmentBtnText: {
    color: driverPrimitives.colors.gray500,
    ...typeScale.caption1,
    fontWeight: '500',
  },
  segmentBtnTextActive: {
    color: driverPrimitives.colors.gray900,
    fontWeight: '700',
  },

  /* 3. Trip Feed Cards */
  listContent: {
    gap: spacing.xs + 2,
  },
  tripCard: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
    ...driverPrimitives.shadows.sm,
  },
  tripHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tripReferenceText: {
    color: driverPrimitives.colors.gray500,
    ...typeScale.caption1,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  tripPayoutText: {
    color: driverPrimitives.colors.gray900,
    ...typeScale.subheadline,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  routeRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  routeOriginText: {
    color: driverPrimitives.colors.gray900,
    ...typeScale.footnote,
    fontWeight: '600',
    flexShrink: 1,
  },
  routeArrowText: {
    color: driverPrimitives.colors.gray400,
    ...typeScale.footnote,
    fontWeight: '600',
  },
  routeDestText: {
    color: driverPrimitives.colors.gray900,
    ...typeScale.footnote,
    fontWeight: '600',
    flexShrink: 1,
  },
  tripFooterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.hairline,
  },
  tripMetaWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
  },
  distanceText: {
    color: driverPrimitives.colors.gray500,
    ...typeScale.caption2,
    fontWeight: '500',
  },
  metaDot: {
    color: driverPrimitives.colors.gray300,
    ...typeScale.caption2,
  },
  timeText: {
    color: driverPrimitives.colors.gray500,
    ...typeScale.caption2,
  },
  vehicleText: {
    color: driverPrimitives.colors.gray500,
    ...typeScale.caption2,
  },
  proofBadgeBtn: {
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xxs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
  proofBadgeText: {
    color: driverPrimitives.colors.green700,
    ...typeScale.caption2,
    fontWeight: '600',
  },

  /* Empty Box */
  emptyBox: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.white,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    gap: 6,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  emptyTitle: {
    color: driverPrimitives.colors.gray900,
    ...typeScale.subheadline,
    fontWeight: '700',
    marginTop: spacing.xxs,
  },
  emptyMessage: {
    color: driverPrimitives.colors.gray500,
    ...typeScale.caption1,
    textAlign: 'center',
  },

  /* Modal */
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalSheet: {
    backgroundColor: driverPrimitives.colors.white,
    borderRadius: radius.cardXl,
    ...iosContinuousCurve,
    gap: spacing.sm + 2,
    maxWidth: 380,
    padding: spacing.md + 4,
    width: '100%',
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalTitle: {
    color: driverPrimitives.colors.gray900,
    ...typeScale.headline,
    fontWeight: '700',
  },
  modalBody: {
    gap: spacing.sm,
  },
  proofImageBox: {
    gap: spacing.xxs + 2,
  },
  proofImageLabel: {
    color: driverPrimitives.colors.gray700,
    ...typeScale.caption1,
    fontWeight: '600',
  },
  proofPlaceholderImage: {
    alignItems: 'center',
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    borderWidth: 1,
    gap: spacing.xxs + 2,
    height: 120,
    justifyContent: 'center',
  },
  proofWatermarkText: {
    color: driverPrimitives.colors.gray400,
    ...typeScale.caption2,
    fontWeight: '500',
  },
  signatureBox: {
    gap: spacing.xxs + 2,
  },
  signatureCanvasPreview: {
    alignItems: 'center',
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    borderWidth: 1,
    height: 60,
    justifyContent: 'center',
  },
  signaturePathPreview: {
    color: driverPrimitives.colors.gray500,
    ...typeScale.caption1,
    fontStyle: 'italic',
  },
  signerNameText: {
    color: driverPrimitives.colors.gray700,
    ...typeScale.caption1,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
});
