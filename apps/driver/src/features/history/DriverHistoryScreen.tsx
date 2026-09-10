import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  colors,
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
  ScreenScaffold,
  StatusBadge,
} from '@leopard/mobile-core';
import { useDriverDrawer } from '../navigation/DriverDrawerContext';
import { DriverMenuButton } from '../navigation/DriverMenuButton';

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
  status: 'DELIVERED' | 'CANCELLED';
  hasProof: boolean;
  signerName?: string;
  paymentMethod: string;
}>;

const mockHistory: readonly HistoryTripItem[] = [
  {
    id: 'ord-001',
    reference: 'LP-D-260815-001',
    origin: 'Kho Tân Bình, TP.HCM',
    destination: 'TP. Thủ Đức, TP.HCM',
    distanceLabel: '14.2 km',
    cargoSummary: '40 bao xi măng INSEE (2.000 kg)',
    completedAtLabel: '15/08/2026 · 14:32',
    datePeriod: 'today',
    payoutAmount: 170000,
    status: 'DELIVERED',
    hasProof: true,
    signerName: 'Thủ kho Nguyễn Văn Bình',
    paymentMethod: 'Ví tài xế',
  },
  {
    id: 'ord-002',
    reference: 'LP-D-260815-002',
    origin: 'Cảng Cát Lái, Quận 2',
    destination: 'KCN Tân Bình, Tân Phú',
    distanceLabel: '18.5 km',
    cargoSummary: 'Kiện pallet linh kiện điện tử (1.5T)',
    completedAtLabel: '15/08/2026 · 11:15',
    datePeriod: 'today',
    payoutAmount: 250000,
    status: 'DELIVERED',
    hasProof: true,
    signerName: 'Trưởng kho Lê Hoàng Long',
    paymentMethod: 'VietQR',
  },
  {
    id: 'ord-003',
    reference: 'LP-D-260814-009',
    origin: 'Chợ Đầu Mối Thủ Đức',
    destination: 'Quận 1, TP.HCM',
    distanceLabel: '12.0 km',
    cargoSummary: 'Rau củ quả Đà Lạt (800 kg)',
    completedAtLabel: '14/08/2026 · 18:20',
    datePeriod: 'week',
    payoutAmount: 0,
    status: 'CANCELLED',
    hasProof: false,
    paymentMethod: 'Hủy đơn',
  },
  {
    id: 'ord-004',
    reference: 'LP-D-260814-005',
    origin: 'Kho Tân Tạo, Bình Tân',
    destination: 'Khu dân cư Trung Sơn, Quận 8',
    distanceLabel: '9.8 km',
    cargoSummary: 'Nội thất gỗ gia dụng (1.2T)',
    completedAtLabel: '14/08/2026 · 15:45',
    datePeriod: 'week',
    payoutAmount: 140000,
    status: 'DELIVERED',
    hasProof: true,
    signerName: 'Khách hàng Trần Thu Hà',
    paymentMethod: 'Tiền mặt',
  },
];

type DateFilterType = 'ALL' | 'today' | 'week';

export function DriverHistoryScreen() {
  const router = useRouter();
  const [dateFilter, setDateFilter] = useState<DateFilterType>('ALL');
  const [selectedEpodTrip, setSelectedEpodTrip] = useState<HistoryTripItem | null>(null);
  const { openDrawer } = useDriverDrawer();

  const displayedList = mockHistory.filter((item) => {
    if (dateFilter === 'ALL') return true;
    return item.datePeriod === dateFilter;
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  return (
    <ScreenScaffold
      eyebrow="DRIVER · TRIP LOG"
      headerLeading={<DriverMenuButton onPress={openDrawer} variant="plain" />}
      headerTone="plain"
      title="Lịch sử chuyến"
    >
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
            <Text style={styles.kpiValue}>128</Text>
            <Text style={styles.kpiLabel}>Tổng chuyến</Text>
          </View>

          <View style={styles.kpiBox}>
            <View style={styles.kpiIconChip}>
              <IconTrophy color="#16A34A" size={15} />
            </View>
            <Text style={[styles.kpiValue, styles.kpiValueGreen]}>18.45tr</Text>
            <Text style={styles.kpiLabel}>Tích lũy</Text>
          </View>

          <View style={styles.kpiBox}>
            <View style={styles.kpiIconChip}>
              <IconSecurityShield color="#0B1E42" size={15} />
            </View>
            <Text style={styles.kpiValue}>98.5%</Text>
            <Text style={styles.kpiLabel}>Hoàn thành</Text>
          </View>
        </View>

        {/* 2. Date Filter Segmented Toolbar */}
        <View accessibilityRole="toolbar" style={styles.filterRow}>
          <Pressable
            accessibilityLabel="Lọc tất cả chuyến xe"
            accessibilityRole="button"
            accessibilityState={{ selected: dateFilter === 'ALL' }}
            onPress={() => setDateFilter('ALL')}
            style={[styles.filterChip, dateFilter === 'ALL' ? styles.filterChipActive : null]}
          >
            <Text style={[styles.filterText, dateFilter === 'ALL' ? styles.filterTextActive : null]}>
              Tất cả ({mockHistory.length})
            </Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Lọc chuyến hôm nay"
            accessibilityRole="button"
            accessibilityState={{ selected: dateFilter === 'today' }}
            onPress={() => setDateFilter('today')}
            style={[styles.filterChip, dateFilter === 'today' ? styles.filterChipActive : null]}
          >
            <Text style={[styles.filterText, dateFilter === 'today' ? styles.filterTextActive : null]}>
              Hôm nay
            </Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Lọc chuyến tuần này"
            accessibilityRole="button"
            accessibilityState={{ selected: dateFilter === 'week' }}
            onPress={() => setDateFilter('week')}
            style={[styles.filterChip, dateFilter === 'week' ? styles.filterChipActive : null]}
          >
            <Text style={[styles.filterText, dateFilter === 'week' ? styles.filterTextActive : null]}>
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
              <View key={item.id} style={styles.doubleBezelOuter}>
                <View style={styles.doubleBezelInner}>
                  {/* Card Header: Ref + Status + Payout Amount */}
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <View style={styles.refIconWrap}>
                        <IconSpeedTruck color={colors.brand.background} size={15} />
                      </View>
                      <View>
                        <Text style={styles.referenceText}>{item.reference}</Text>
                        <View style={styles.statusRow}>
                          <StatusBadge domain="order" status={item.status} />
                        </View>
                      </View>
                    </View>

                    <View style={styles.cardHeaderRight}>
                      <Text
                        style={[
                          styles.payoutAmountText,
                          item.payoutAmount > 0 ? styles.payoutPositive : styles.payoutZero,
                        ]}
                      >
                        {item.payoutAmount > 0 ? `+${formatCurrency(item.payoutAmount)}` : '0 ₫'}
                      </Text>
                      <Text style={styles.paymentMethodLabel}>{item.paymentMethod}</Text>
                    </View>
                  </View>

                  {/* Route Spine Box */}
                  <View style={styles.routeSpineBox}>
                    <View style={styles.routeSpineCol}>
                      <View style={styles.originDot} />
                      <View style={styles.routeConnector} />
                      <View style={styles.destSquare} />
                    </View>
                    <View style={styles.routeLabelsCol}>
                      <Text numberOfLines={1} style={styles.routeOriginText}>
                        {item.origin}
                      </Text>
                      <View style={styles.distanceEtaRow}>
                        <IconClock color={colors.brand.background} size={11} />
                        <Text style={styles.distanceEtaText}>{item.distanceLabel}</Text>
                      </View>
                      <Text numberOfLines={1} style={styles.routeDestText}>
                        {item.destination}
                      </Text>
                    </View>
                  </View>

                  {/* Cargo Summary Tag */}
                  <View style={styles.cargoPill}>
                    <Text numberOfLines={1} style={styles.cargoPillText}>
                      {item.cargoSummary}
                    </Text>
                  </View>

                  {/* Footer: Completed time, e-POD preview button */}
                  <View style={styles.cardFooter}>
                    <View style={styles.footerLeft}>
                      <Text style={styles.timeText}>{item.completedAtLabel}</Text>
                      {item.hasProof ? (
                        <Pressable
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
                      ) : null}
                    </View>

                    <Pressable
                      accessibilityLabel={`Xem chi tiết đơn ${item.reference}`}
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={() => router.push(`/driver/orders/${item.id}`)}
                      style={styles.detailLink}
                    >
                      <Text style={styles.viewDetailCta}>Chi tiết</Text>
                      <IconChevron color={leopardPalette.primary} direction="right" size={13} />
                    </Pressable>
                  </View>
                </View>
              </View>
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
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.modalSheet}>
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
                    <Text style={styles.signaturePathPreview}>✓ Đã ký điện tử xác thực</Text>
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
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scrollWrap: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xl + 20,
  },
  /* Cumulative KPI Strip */
  kpiStripRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  kpiBox: {
    alignItems: 'center',
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.cardBorder,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    gap: 3,
    paddingVertical: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
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
    color: leopardPalette.textSlateDark,
    fontSize: 14.5,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  kpiValueGreen: {
    color: '#16A34A',
  },
  kpiLabel: {
    color: leopardPalette.textMutedSlate,
    fontSize: 10,
    fontWeight: '600',
  },

  /* Filter Toolbar */
  filterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  filterChip: {
    alignItems: 'center',
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.cardBorder,
    borderRadius: radius.pill,
    borderWidth: 1,
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  filterChipActive: {
    backgroundColor: colors.brand.background,
    borderColor: colors.brand.background,
  },
  filterText: {
    color: leopardPalette.textMutedSlate,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  filterTextActive: {
    color: '#FFFFFF',
  },

  /* List Feed */
  listContent: {
    gap: spacing.sm,
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
    fontSize: 14.5,
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
    fontSize: 10.5,
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
  routeOriginText: {
    color: leopardPalette.textSlateDark,
    fontSize: 12.5,
    fontWeight: '600',
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
  routeDestText: {
    color: leopardPalette.textSlateDark,
    fontSize: 12.5,
    fontWeight: '600',
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
    fontSize: 11.5,
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
    fontSize: 11.5,
    fontVariant: ['tabular-nums'],
  },
  proofBadgeBtn: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  proofBadgeText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '700',
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
    fontSize: 11.5,
    fontVariant: ['tabular-nums'],
  },
  modalCloseBtn: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
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
    fontSize: 10.5,
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
    fontSize: 12.5,
    fontWeight: '700',
  },
  signatureCanvasPreview: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderRadius: 6,
    borderStyle: 'dashed',
    borderWidth: 1,
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
    fontSize: 11.5,
    fontWeight: '600',
  },
});
