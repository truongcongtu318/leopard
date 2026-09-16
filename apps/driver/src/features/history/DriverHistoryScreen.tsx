import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import {
  colors,
  driverPrimitives,
  iosContinuousCurve,
  leopardPalette,
  radius,
  spacing,
  IconCameraProof,
  IconCheck,
  IconChevron,
  IconClock,
  IconClose,
  IconOrders,
  IconSecurityShield,
  IconSpeedTruck,
  IconTrophy,
  NavigableMetricCard,
  ScreenState,
  StatusBadge,
  typeScale,
} from '@leopard/mobile-core';

function BackArrowIcon({ size = 20, color = driverPrimitives.colors.gray900 }: { size?: number; color?: string }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
        fill={color}
      />
    </Svg>
  );
}

export type HistoryTripItem = Readonly<{
  id: string;
  reference: string;
  origin: string;
  destination: string;
  distanceLabel: string;
  cargoSummary: string;
  completedAtLabel: string;
  datePeriod: 'today' | 'week' | 'older';
  payoutAmount: number;
  status: 'DELIVERED' | 'CANCELLED' | 'INCIDENT_CANCELLED' | 'RETURNING' | 'RETURNED';
  hasProof: boolean;
  signerName?: string;
  vehicleLabel: string;
}>;

export type DriverHistoryScreenProps = Readonly<{
  items: readonly HistoryTripItem[];
  /** True total from the backend (not limited by the fetched page). */
  total: number;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onNavigate?: (route: string) => void;
}>;

type DateFilterType = 'ALL' | 'today' | 'week';

export function DriverHistoryScreen({
  items,
  total,
  isLoading,
  isError,
  onRetry,
  onNavigate,
}: DriverHistoryScreenProps) {
  const router = useRouter();
  const [dateFilter, setDateFilter] = useState<DateFilterType>('ALL');
  const [selectedEpodTrip, setSelectedEpodTrip] = useState<HistoryTripItem | null>(null);

  // Chỉ hiển thị các đơn đã hoàn tất/đã giao thành công (có tiền cước)
  const deliveredItems = items.filter((item) => item.status === 'DELIVERED');
  const displayedList = deliveredItems.filter((item) => {
    if (dateFilter !== 'ALL' && item.datePeriod !== dateFilter) return false;
    return true;
  });

  // These two are computed only over the currently fetched batch (not a
  // second aggregate query), so they're labeled "hiển thị" (shown) rather
  // than implying a true lifetime total — only "Tổng chuyến" below reflects
  // the real all-time count from the backend's pagination total.
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
    <View style={styles.screenContainer}>
      {/* ── Top Header Bar ── */}
      <View style={styles.headerBar}>
        <Pressable
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => (router.canGoBack() ? router.back() : router.push('/earnings'))}
          style={styles.headerActionBtn}
        >
          <BackArrowIcon />
        </Pressable>

        <Text accessibilityRole="header" style={styles.headerTitle}>
          Lịch sử chuyến
        </Text>

        <View style={styles.headerActionBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.scrollWrap}
      >
        {/* 1. History Cumulative Performance Strip */}
        <View style={styles.kpiStripRow}>
          <View style={styles.kpiBox}>
            <View style={styles.kpiIconChip}>
              <IconSpeedTruck color={leopardPalette.primary} size={15} />
            </View>
            <Text style={styles.kpiValue}>{total}</Text>
            <Text style={styles.kpiLabel}>Tổng chuyến</Text>
          </View>

          <View style={styles.kpiBox}>
            <View style={styles.kpiIconChip}>
              <IconTrophy color="#16A34A" size={15} />
            </View>
            <Text style={[styles.kpiValue, styles.kpiValueGreen]}>{formatCompact(displayedRevenue)}</Text>
            <Text style={styles.kpiLabel}>Doanh thu hiển thị</Text>
          </View>

          <View style={styles.kpiBox}>
            <View style={styles.kpiIconChip}>
              <IconSecurityShield color="#0B1E42" size={15} />
            </View>
            <Text style={styles.kpiValue}>{completionRate}%</Text>
            <Text style={styles.kpiLabel}>Tỷ lệ giao thành công</Text>
          </View>
        </View>

        {isLoading ? (
          <ScreenState state="loading" />
        ) : isError ? (
          <ScreenState actionLabel="Thử lại" onAction={onRetry} state="error" />
        ) : null}

        {/* Date Filter Toolbar (Mọi lúc / Hôm nay / Tuần này) */}
        <View accessibilityRole="toolbar" style={styles.dateFilterRow}>
          <Pressable
            accessibilityLabel="Lọc tất cả chuyến xe"
            accessibilityRole="button"
            accessibilityState={{ selected: dateFilter === 'ALL' }}
            onPress={() => setDateFilter('ALL')}
            style={[styles.dateFilterChip, dateFilter === 'ALL' ? styles.dateFilterChipActive : null]}
          >
            <Text style={[styles.dateFilterText, dateFilter === 'ALL' ? styles.dateFilterTextActive : null]}>
              Mọi lúc
            </Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Lọc chuyến hôm nay"
            accessibilityRole="button"
            accessibilityState={{ selected: dateFilter === 'today' }}
            onPress={() => setDateFilter('today')}
            style={[styles.dateFilterChip, dateFilter === 'today' ? styles.dateFilterChipActive : null]}
          >
            <Text style={[styles.dateFilterText, dateFilter === 'today' ? styles.dateFilterTextActive : null]}>
              Hôm nay
            </Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Lọc chuyến tuần này"
            accessibilityRole="button"
            accessibilityState={{ selected: dateFilter === 'week' }}
            onPress={() => setDateFilter('week')}
            style={[styles.dateFilterChip, dateFilter === 'week' ? styles.dateFilterChipActive : null]}
          >
            <Text style={[styles.dateFilterText, dateFilter === 'week' ? styles.dateFilterTextActive : null]}>
              Tuần này
            </Text>
          </Pressable>
        </View>

        {/* 3. Trip Feed with Double-Bezel Cards */}
        {displayedList.length === 0 ? (
          <View style={styles.emptyBox}>
            <IconOrders color="#94A3B8" size={32} />
            <Text style={styles.emptyTitle}>Không có dữ liệu</Text>
            <Text style={styles.emptyMessage}>Không có chuyến nào khớp với bộ lọc ngày đã chọn.</Text>
          </View>
        ) : (
          <View style={styles.listContent}>
            {displayedList.map((item) => (
              <NavigableMetricCard
                key={item.id}
                layout="row"
                title={item.reference}
                value={item.payoutAmount > 0 ? `+${formatCurrency(item.payoutAmount)}` : '0 ₫'}
                valueTone="success"
                subtitle={
                  <View style={styles.tripSubtitleWrap}>
                    <View style={styles.routeRow}>
                      <Text numberOfLines={1} style={styles.routeOriginText}>
                        {item.origin}
                      </Text>
                      <Text style={styles.routeArrowText}> → </Text>
                      <Text numberOfLines={1} style={styles.routeDestText}>
                        {item.destination}
                      </Text>
                    </View>
                    <View style={styles.tripMetaRow}>
                      <Text style={styles.distanceEtaText}>{item.distanceLabel}</Text>
                      <Text style={styles.metaDot}> · </Text>
                      <Text style={styles.timeText}>{item.completedAtLabel}</Text>
                      <Text style={styles.metaDot}> · </Text>
                      <Text style={styles.paymentMethodLabel}>{item.vehicleLabel}</Text>
                    </View>
                  </View>
                }
                footer={
                  item.hasProof ? (
                    <Pressable
                      testID={`btn-view-epod-${item.id}`}
                      accessibilityLabel={`Xem ảnh e-POD của chuyến ${item.reference}`}
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={() => setSelectedEpodTrip(item)}
                      style={styles.proofBadgeBtn}
                    >
                      <IconCheck color="#059669" size={11} strokeWidth={2.5} />
                      <IconCameraProof color="#059669" size={12} />
                      <Text style={styles.proofBadgeText}>Xem e-POD</Text>
                    </Pressable>
                  ) : null
                }
                onPress={() => router.push(`/orders/${item.id}`)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal Xem e-POD & Chữ ký */}
      <Modal
        animationType="fade"
        onRequestClose={() => setSelectedEpodTrip(null)}
        transparent
        visible={Boolean(selectedEpodTrip)}
      >
        <Pressable
          onPress={() => setSelectedEpodTrip(null)}
          style={styles.modalBackdrop}
        >
          <Pressable
            testID="epod-proof-modal"
            onPress={(e) => e.stopPropagation()}
            style={styles.modalSheet}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <IconCameraProof color={colors.brand.background} size={20} />
                <View>
                  <Text style={styles.modalTitle}>Chứng từ điện tử e-POD</Text>
                  <Text style={styles.modalSub}>{selectedEpodTrip?.reference}</Text>
                </View>
              </View>
              <Pressable
                accessibilityLabel="Đóng xem chứng từ e-POD"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setSelectedEpodTrip(null)}
                style={styles.modalCloseBtn}
              >
                <IconClose color="#64748B" size={18} />
              </Pressable>
            </View>

            {selectedEpodTrip && (
              <View style={styles.epodContent}>
                {/* Proof Photo Box with GPS Watermark */}
                <View style={styles.photoContainer}>
                  <View style={styles.photoPlaceholder}>
                    <IconCameraProof color="#38BDF8" size={36} />
                    <Text style={styles.photoPlaceholderText}>Ảnh hạ tải tại điểm giao</Text>
                  </View>
                  <View style={styles.watermarkBox}>
                    <Text style={styles.watermarkText}>GPS: 10.8231° N, 106.6297° E</Text>
                    <Text style={styles.watermarkText}>Thời gian: {selectedEpodTrip.completedAtLabel}</Text>
                    <Text style={styles.watermarkText}>Mã đơn: {selectedEpodTrip.reference}</Text>
                  </View>
                </View>

                {/* Digital Signature Card */}
                <View style={styles.signatureCard}>
                  <View style={styles.signatureHeader}>
                    <IconCheck color="#059669" size={14} strokeWidth={2.5} />
                    <Text style={styles.signatureTitle}>Chữ ký xác nhận nhận hàng</Text>
                  </View>
                  <View style={styles.signatureCanvasPreview}>
                    <IconCheck color="#059669" size={14} strokeWidth={2.5} />
                    <Text style={styles.signaturePathPreview}>Đã ký điện tử xác thực</Text>
                  </View>
                  <Text style={styles.signerNameText}>
                    Người ký nhận: {selectedEpodTrip.signerName ?? 'Thủ kho nhận hàng'}
                  </Text>
                </View>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
  </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    backgroundColor: driverPrimitives.colors.gray50,
    flex: 1,
  },
  headerBar: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.white,
    borderBottomColor: driverPrimitives.colors.gray200,
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 52,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  headerActionBtn: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerTitle: {
    color: driverPrimitives.colors.gray900,
    fontSize: 18,
    fontWeight: '700',
  },
  tripCard: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: driverPrimitives.colors.gray200,
    borderRadius: 12,
    ...iosContinuousCurve,
    borderWidth: 1,
    gap: 12,
    padding: 14,
    ...driverPrimitives.shadows.sm,
  },
  scrollWrap: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing.sm,
    padding: 16,
    paddingBottom: 40,
  },
  /* Cumulative KPI Strip */
  kpiStripRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  kpiBox: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.white,
    borderColor: driverPrimitives.colors.gray200,
    borderRadius: 12,
    ...iosContinuousCurve,
    borderWidth: 1,
    flex: 1,
    gap: 3,
    paddingVertical: 10,
    ...driverPrimitives.shadows.sm,
  },
  kpiIconChip: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  kpiValue: {
    color: driverPrimitives.colors.gray900,
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  kpiValueGreen: {
    color: driverPrimitives.colors.green500,
  },
  kpiLabel: {
    color: driverPrimitives.colors.gray500,
    fontSize: 11,
    fontWeight: '500',
  },

  /* Filter Toolbar (iOS Segmented Control Style) */
  filterRow: {
    backgroundColor: driverPrimitives.colors.gray100,
    borderRadius: 10,
    flexDirection: 'row',
    padding: 3,
  },
  filterChip: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    minHeight: 36,
    justifyContent: 'center',
    paddingVertical: 6,
  },
  filterChipActive: {
    backgroundColor: driverPrimitives.colors.white,
    ...driverPrimitives.shadows.sm,
  },
  filterText: {
    color: driverPrimitives.colors.gray500,
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  filterTextActive: {
    color: driverPrimitives.colors.gray900,
    fontWeight: '700',
  },

  /* Date Filter Toolbar */
  dateFilterRow: {
    backgroundColor: driverPrimitives.colors.gray100,
    borderRadius: 10,
    flexDirection: 'row',
    padding: 3,
  },
  dateFilterChip: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    minHeight: 36,
    justifyContent: 'center',
    paddingVertical: 6,
  },
  dateFilterChipActive: {
    backgroundColor: driverPrimitives.colors.white,
    ...driverPrimitives.shadows.sm,
  },
  dateFilterText: {
    color: driverPrimitives.colors.gray500,
    fontSize: 12,
    fontWeight: '600',
  },
  dateFilterTextActive: {
    color: driverPrimitives.colors.gray900,
    fontWeight: '700',
  },

  /* List Feed */
  listContent: {
    gap: spacing.sm,
  },
  tripSubtitleWrap: {
    gap: 3,
    marginTop: 4,
  },
  routeRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  routeOriginText: {
    color: driverPrimitives.colors.gray900,
    fontSize: 13,
    fontWeight: '600',
    maxWidth: '45%',
  },
  routeArrowText: {
    color: driverPrimitives.colors.gray400,
    fontSize: 12,
  },
  routeDestText: {
    color: driverPrimitives.colors.gray900,
    fontSize: 13,
    fontWeight: '600',
    maxWidth: '45%',
  },
  tripMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 2,
  },
  metaDot: {
    color: driverPrimitives.colors.gray400,
    fontSize: 12,
  },
  proofBadgeBtn: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  proofBadgeText: {
    color: '#15803D',
    fontSize: 11.5,
    fontWeight: '700',
  },
  /* Double-Bezel Card: 24px outer hairline, 18px inner */
  doubleBezelOuter: {
    backgroundColor: '#0B1E42',
    borderRadius: radius.bezelOuter,
    elevation: 2,
    padding: 2,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  doubleBezelInner: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: radius.bezelInner,
    borderWidth: 1,
    gap: 8,
    padding: spacing.md,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  refIconWrap: {
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  referenceText: {
    color: leopardPalette.textSlateDark,
    fontSize: typeScale.subheadline.fontSize,
    fontWeight: '700',
  },
  statusRow: {
    marginTop: 2,
  },
  cardHeaderRight: {
    alignItems: 'flex-end',
  },
  payoutAmountText: {
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  payoutPositive: {
    color: '#16A34A',
  },
  payoutZero: {
    color: leopardPalette.textMutedSlate,
  },
  paymentMethodLabel: {
    color: leopardPalette.textSubtle,
    fontSize: typeScale.caption2.fontSize,
    fontWeight: '500',
    marginTop: 1,
  },

  /* Route Spine Box */
  routeSpineBox: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  routeSpineCol: {
    alignItems: 'center',
    paddingTop: 4,
    width: 10,
  },
  originDot: {
    backgroundColor: '#16A34A',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  routeConnector: {
    backgroundColor: '#CBD5E1',
    height: 18,
    marginVertical: 2,
    width: 1.5,
  },
  destSquare: {
    backgroundColor: '#EF4444',
    borderRadius: 2,
    height: 8,
    width: 8,
  },
  routeLabelsCol: {
    flex: 1,
    gap: 2,
  },
  distanceEtaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  distanceEtaText: {
    color: colors.brand.background,
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  /* Cargo Pill */
  cargoPill: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cargoPillText: {
    color: '#475569',
    fontSize: typeScale.caption1.fontSize,
    fontWeight: '500',
  },

  /* Card Footer */
  cardFooter: {
    alignItems: 'center',
    borderTopColor: leopardPalette.subtleDivider,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
    paddingTop: 8,
  },
  footerLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  timeText: {
    color: leopardPalette.textSubtle,
    fontSize: typeScale.caption1.fontSize,
    fontVariant: ['tabular-nums'],
  },
  detailLink: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  viewDetailCta: {
    color: leopardPalette.primary,
    fontSize: 12,
    fontWeight: '700',
  },

  /* Empty Box */
  emptyBox: {
    alignItems: 'center',
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.cardBorder,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    color: leopardPalette.textSlateDark,
    fontSize: 15,
    fontWeight: '700',
  },
  emptyMessage: {
    color: leopardPalette.textMutedSlate,
    fontSize: 13,
    textAlign: 'center',
  },

  /* Modal e-POD Styles */
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.card,
    gap: spacing.md,
    maxWidth: 480,
    padding: spacing.lg,
    width: '100%',
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  modalTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  modalSub: {
    color: '#64748B',
    fontSize: typeScale.caption1.fontSize,
    fontVariant: ['tabular-nums'],
  },
  modalCloseBtn: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 22,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  epodContent: {
    gap: spacing.md,
  },
  photoContainer: {
    backgroundColor: '#0F172A',
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  photoPlaceholder: {
    alignItems: 'center',
    height: 140,
    justifyContent: 'center',
    gap: 8,
  },
  photoPlaceholderText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  watermarkBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  watermarkText: {
    color: '#38BDF8',
    fontSize: typeScale.caption2.fontSize,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  signatureCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
    padding: spacing.sm,
  },
  signatureHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  signatureTitle: {
    color: '#0F172A',
    fontSize: typeScale.footnote.fontSize,
    fontWeight: '700',
  },
  signatureCanvasPreview: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderRadius: 6,
    borderStyle: 'dashed',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    height: 48,
    justifyContent: 'center',
  },
  signaturePathPreview: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '600',
  },
  signerNameText: {
    color: '#475569',
    fontSize: typeScale.caption1.fontSize,
    fontWeight: '600',
  },
});
