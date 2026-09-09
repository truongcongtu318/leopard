import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors, leopardPalette, radius, spacing, typography } from '@leopard/mobile-core';
import { ScreenScaffold } from '../../../ui/ScreenScaffold';
import { StatusBadge } from '../../../ui/StatusBadge';
import {
  IconCameraProof,
  IconClock,
  IconOrders,
  IconSecurityShield,
  IconSpeedTruck,
  IconTrophy,
} from '../../../ui/icons/CoreIcons';
import { useDriverDrawer } from '../navigation/DriverDrawerContext';
import { DriverMenuButton } from '../navigation/DriverMenuButton';

type HistoryTripItem = {
  id: string;
  reference: string;
  origin: string;
  destination: string;
  distanceLabel: string;
  cargoSummary: string;
  completedAtLabel: string;
  payoutAmount: number;
  status: 'DELIVERED' | 'CANCELLED';
  hasProof: boolean;
  paymentMethod: string;
};

const mockHistory: HistoryTripItem[] = [
  {
    id: 'ord-001',
    reference: 'LP-D-260815-001',
    origin: 'Kho Tân Bình, TP.HCM',
    destination: 'TP. Thủ Đức, TP.HCM',
    distanceLabel: '14.2 km',
    cargoSummary: '40 bao xi măng INSEE (2.000 kg)',
    completedAtLabel: '15/08/2026 · 14:32',
    payoutAmount: 170000,
    status: 'DELIVERED',
    hasProof: true,
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
    payoutAmount: 250000,
    status: 'DELIVERED',
    hasProof: true,
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
    payoutAmount: 140000,
    status: 'DELIVERED',
    hasProof: true,
    paymentMethod: 'Tiền mặt',
  },
];

export function DriverHistoryScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<'ALL' | 'DELIVERED' | 'CANCELLED'>('ALL');
  const { openDrawer } = useDriverDrawer();

  const displayedList = mockHistory.filter((item) =>
    filter === 'ALL' ? true : item.status === filter,
  );

  const deliveredCount = mockHistory.filter((h) => h.status === 'DELIVERED').length;
  const cancelledCount = mockHistory.filter((h) => h.status === 'CANCELLED').length;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  return (
    <ScreenScaffold
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

        {/* 2. Status Segmented Filter Bar */}
        <View accessibilityRole="toolbar" style={styles.filterRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setFilter('ALL')}
            style={[styles.filterChip, filter === 'ALL' ? styles.filterChipActive : null]}
          >
            <Text style={[styles.filterText, filter === 'ALL' ? styles.filterTextActive : null]}>
              Tất cả ({mockHistory.length})
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setFilter('DELIVERED')}
            style={[styles.filterChip, filter === 'DELIVERED' ? styles.filterChipActive : null]}
          >
            <Text
              style={[
                styles.filterText,
                filter === 'DELIVERED' ? styles.filterTextActive : null,
              ]}
            >
              Đã giao ({deliveredCount})
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setFilter('CANCELLED')}
            style={[styles.filterChip, filter === 'CANCELLED' ? styles.filterChipActive : null]}
          >
            <Text
              style={[
                styles.filterText,
                filter === 'CANCELLED' ? styles.filterTextActive : null,
              ]}
            >
              Đã hủy ({cancelledCount})
            </Text>
          </Pressable>
        </View>

        {/* 3. History Feed */}
        {displayedList.length === 0 ? (
          <View style={styles.emptyBox}>
            <IconOrders color="#94A3B8" size={32} />
            <Text style={styles.emptyTitle}>Không có dữ liệu</Text>
            <Text style={styles.emptyMessage}>Không có chuyến nào khớp với bộ lọc đã chọn.</Text>
          </View>
        ) : (
          <View style={styles.listContent}>
            {displayedList.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => router.push(`/driver/orders/${item.id}`)}
                style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
              >
                {/* Header: Ref + Status + Payout Amount */}
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

                {/* Visual Route Spine Box */}
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
                <View style={styles.cargoTagRow}>
                  <View style={styles.cargoPill}>
                    <Text numberOfLines={1} style={styles.cargoPillText}>
                      {item.cargoSummary}
                    </Text>
                  </View>
                </View>

                {/* Card Footer: Time, POD Badge & CTA */}
                <View style={styles.cardFooter}>
                  <View style={styles.footerLeft}>
                    <Text style={styles.timeText}>{item.completedAtLabel}</Text>
                    {item.hasProof ? (
                      <View style={styles.proofBadge}>
                        <IconCameraProof color="#166534" size={12} />
                        <Text style={styles.proofBadgeText}>✓ Có ảnh POD</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.viewDetailCta}>Xem lại ›</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
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
  pressed: {
    opacity: 0.88,
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
  },
  filterTextActive: {
    color: '#FFFFFF',
  },

  /* List Feed */
  listContent: {
    gap: spacing.sm,
  },
  card: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.cardBorder,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    padding: spacing.md,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
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
  },
  routeDestText: {
    color: leopardPalette.textSlateDark,
    fontSize: 12.5,
    fontWeight: '600',
  },

  /* Cargo Tag */
  cargoTagRow: {
    flexDirection: 'row',
  },
  cargoPill: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    flex: 1,
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
  },
  proofBadge: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 4,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  proofBadgeText: {
    color: '#166534',
    fontSize: 10.5,
    fontWeight: '700',
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
});
