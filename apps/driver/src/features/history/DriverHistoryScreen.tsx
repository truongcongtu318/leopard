import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  Badge,
  Box,
  Card,
  Divider,
  HStack,
  IconCameraProof,
  IconCheck,
  IconClose,
  IconOrders,
  IconSecurityShield,
  IconSpeedTruck,
  IconTrophy,
  ScreenScaffold,
  ScreenState,
  VStack,
  colors,
  driverPrimitives,
  iosContinuousCurve,
  leopardPalette,
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
              <IconSpeedTruck color="#93C5FD" size={16} />
            </View>
            <Text style={styles.kpiValue}>{total}</Text>
            <Text style={styles.kpiLabel}>Tổng chuyến</Text>
          </View>

          <View style={styles.kpiDividerVertical} />

          <View style={styles.kpiCol}>
            <View style={styles.kpiIconWrap}>
              <IconTrophy color={leopardPalette.accentYellow} size={16} />
            </View>
            <Text style={styles.kpiValue}>{formatCompact(displayedRevenue)}</Text>
            <Text style={styles.kpiLabel}>Doanh thu (trang đã tải)</Text>
          </View>

          <View style={styles.kpiDividerVertical} />

          <View style={styles.kpiCol}>
            <View style={styles.kpiIconWrap}>
              <IconSecurityShield color="#34D399" size={16} />
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
        <HStack accessibilityRole="toolbar" style={styles.segmentedControl}>
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
        </HStack>

        {/* ── 3. Trip Feed Cards ── */}
        {displayedList.length === 0 ? (
          <VStack style={styles.emptyBox}>
            <IconOrders color="#94A3B8" size={32} />
            <Text style={styles.emptyTitle}>Không có dữ liệu</Text>
            <Text style={styles.emptyMessage}>Không có chuyến nào khớp với bộ lọc ngày đã chọn.</Text>
          </VStack>
        ) : (
          <VStack space="sm" style={styles.listContent}>
            {displayedList.map((item) => (
              <Card key={item.id} style={styles.tripCard}>
                <Pressable
                  accessibilityLabel={`Chuyến xe ${item.reference}`}
                  accessibilityRole="button"
                  onPress={() => router.push(`/orders/${item.id}`)}
                  style={({ pressed }) => (pressed ? styles.pressed : null)}
                >
                  {/* Header: Reference & Payout */}
                  <HStack style={styles.tripHeaderRow}>
                    <Badge action="muted" size="sm" style={styles.tripReferenceBadge}>
                      <Badge.Text style={styles.tripReferenceText}>{item.reference}</Badge.Text>
                    </Badge>
                    <Text style={styles.tripPayoutText}>
                      {item.payoutAmount > 0 ? `+${formatCurrency(item.payoutAmount)}` : '0 ₫'}
                    </Text>
                  </HStack>

                  {/* Route */}
                  <HStack style={styles.routeRow}>
                    <Text numberOfLines={1} style={styles.routeOriginText}>
                      {item.origin}
                    </Text>
                    <Text style={styles.routeArrowText}> → </Text>
                    <Text numberOfLines={1} style={styles.routeDestText}>
                      {item.destination}
                    </Text>
                  </HStack>

                  {/* Meta row & ePOD button */}
                  <HStack style={styles.tripFooterRow}>
                    <HStack style={styles.tripMetaWrap}>
                      <Text style={styles.distanceText}>{item.distanceLabel}</Text>
                      <Text style={styles.metaDot}> · </Text>
                      <Text style={styles.timeText}>{item.completedAtLabel}</Text>
                      {item.vehicleLabel ? (
                        <>
                          <Text style={styles.metaDot}> · </Text>
                          <Text style={styles.vehicleText}>{item.vehicleLabel}</Text>
                        </>
                      ) : null}
                    </HStack>

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
                  </HStack>
                </Pressable>
              </Card>
            ))}
          </VStack>
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

  /* 1. KPI Bento Card (Midnight Navy Brand Hero) */
  kpiCard: {
    backgroundColor: colors.brand.primary,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: radius.cardXl,
    ...iosContinuousCurve,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 5,
  },
  kpiCol: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.xxs,
  },
  kpiIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: radius.pill,
    height: 28,
    justifyContent: 'center',
    marginBottom: spacing.hairline,
    width: 28,
  },
  kpiValue: {
    color: '#FFFFFF',
    ...typeScale.headline,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  kpiLabel: {
    color: 'rgba(255, 255, 255, 0.72)',
    ...typeScale.caption2,
    textAlign: 'center',
  },
  kpiDividerVertical: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    height: '65%',
    width: 1,
    alignSelf: 'center',
  },

  /* 2. Date Filter Segmented Control */
  segmentedControl: {
    backgroundColor: colors.neutral.surfaceMuted,
    borderColor: colors.neutral.border,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.hairline,
    padding: 3,
  },
  segmentBtn: {
    alignItems: 'center',
    borderRadius: radius.control - 3,
    ...iosContinuousCurve,
    flex: 1,
    paddingVertical: spacing.xs + 1,
  },
  segmentBtnActive: {
    backgroundColor: colors.brand.primary,
    ...driverPrimitives.shadows.sm,
  },
  segmentBtnText: {
    color: colors.neutral.mutedText,
    ...typeScale.caption1,
    fontWeight: '500',
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
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
    gap: spacing.xs + 2,
    padding: spacing.md,
    ...driverPrimitives.shadows.sm,
  },
  tripHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tripReferenceBadge: {
    backgroundColor: 'rgba(11, 37, 69, 0.05)',
    borderColor: 'rgba(11, 37, 69, 0.08)',
    borderRadius: radius.cardSm - 4,
    ...iosContinuousCurve,
    borderWidth: 1,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  tripReferenceText: {
    color: colors.brand.primary,
    ...typeScale.caption1,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  tripPayoutText: {
    color: driverPrimitives.colors.green700,
    ...typeScale.subheadline,
    fontWeight: '700',
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
    color: colors.brand.accent,
    ...typeScale.footnote,
    fontWeight: '700',
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
    color: colors.neutral.mutedText,
    ...typeScale.caption2,
  },
  metaDot: {
    color: driverPrimitives.colors.gray300,
    ...typeScale.caption2,
  },
  timeText: {
    color: colors.neutral.mutedText,
    ...typeScale.caption2,
  },
  vehicleText: {
    color: colors.neutral.mutedText,
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
    fontWeight: '600',
    marginTop: spacing.xxs,
  },
  emptyMessage: {
    color: colors.neutral.mutedText,
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
    color: colors.neutral.mutedText,
    ...typeScale.caption2,
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
