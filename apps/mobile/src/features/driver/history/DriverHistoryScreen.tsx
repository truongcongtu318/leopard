import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors, radius, spacing, typography } from '../../../theme/tokens';
import { ScreenScaffold } from '../../../ui/ScreenScaffold';
import { StatusBadge } from '../../../ui/StatusBadge';
import { IconCameraProof } from '../../../ui/icons/CoreIcons';

type HistoryTripItem = {
  id: string;
  reference: string;
  origin: string;
  destination: string;
  completedAtLabel: string;
  payoutAmount: number;
  status: 'DELIVERED' | 'CANCELLED';
  hasProof: boolean;
};

const mockHistory: HistoryTripItem[] = [
  {
    id: 'ord-001',
    reference: 'LP-D-260815-001',
    origin: 'Kho Quận 7',
    destination: 'TP. Thủ Đức',
    completedAtLabel: '15/08/2026 14:32',
    payoutAmount: 170000,
    status: 'DELIVERED',
    hasProof: true,
  },
  {
    id: 'ord-002',
    reference: 'LP-D-260815-002',
    origin: 'Cảng Cát Lái',
    destination: 'KCN Tân Bình',
    completedAtLabel: '15/08/2026 11:15',
    payoutAmount: 250000,
    status: 'DELIVERED',
    hasProof: true,
  },
  {
    id: 'ord-003',
    reference: 'LP-D-260814-009',
    origin: 'Chợ Đầu Mối Thủ Đức',
    destination: 'Quận 1',
    completedAtLabel: '14/08/2026 18:20',
    payoutAmount: 0,
    status: 'CANCELLED',
    hasProof: false,
  },
  {
    id: 'ord-004',
    reference: 'LP-D-260814-005',
    origin: 'Kho Tân Tạo, Bình Tân',
    destination: 'Quận 8',
    completedAtLabel: '14/08/2026 15:45',
    payoutAmount: 140000,
    status: 'DELIVERED',
    hasProof: true,
  },
];

export function DriverHistoryScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<'ALL' | 'DELIVERED' | 'CANCELLED'>('ALL');

  const displayedList = mockHistory.filter((item) =>
    filter === 'ALL' ? true : item.status === filter,
  );

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  return (
    <ScreenScaffold
      eyebrow="DRIVER · TRIP ARCHIVE"
      headerTone="ink"
      subtitle="Lịch sử toàn bộ các chuyến hàng đã tiếp nhận và thực hiện."
      title="Lịch sử chuyến"
    >
      <View style={styles.container}>
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
              Đã giao ({mockHistory.filter((h) => h.status === 'DELIVERED').length})
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
              Đã hủy ({mockHistory.filter((h) => h.status === 'CANCELLED').length})
            </Text>
          </Pressable>
        </View>

        <FlatList
          contentContainerStyle={styles.listContent}
          data={displayedList}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Không có dữ liệu</Text>
              <Text style={styles.emptyMessage}>Không có chuyến nào khớp với bộ lọc đã chọn.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/driver/orders/${item.id}`)}
              style={styles.card}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.referenceText}>{item.reference}</Text>
                <StatusBadge domain="order" status={item.status} />
              </View>

              <View style={styles.routeBox}>
                <View style={styles.routeCol}>
                  <Text style={styles.routeLabel}>TỪ</Text>
                  <Text numberOfLines={1} style={styles.routeAddress}>
                    {item.origin}
                  </Text>
                </View>
                <Text style={styles.routeArrow}>→</Text>
                <View style={[styles.routeCol, { alignItems: 'flex-end' }]}>
                  <Text style={styles.routeLabel}>ĐẾN</Text>
                  <Text numberOfLines={1} style={[styles.routeAddress, { textAlign: 'right' }]}>
                    {item.destination}
                  </Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.footerLeft}>
                  <Text style={styles.timeText}>{item.completedAtLabel}</Text>
                  {item.hasProof ? (
                    <View style={styles.proofBadge}>
                      <IconCameraProof color={colors.success.text} size={12} />
                      <Text style={styles.proofBadgeText}>Đã nộp POD</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.payoutText}>
                  {item.payoutAmount > 0 ? formatCurrency(item.payoutAmount) : '—'}
                </Text>
              </View>
            </Pressable>
          )}
        />
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  filterChip: {
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: radius.pill,
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.brand.background,
  },
  filterText: {
    color: colors.neutral.mutedText,
    fontSize: 12.5,
    fontWeight: '700',
  },
  filterTextActive: {
    color: colors.neutral.background,
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.subtleBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  referenceText: {
    color: colors.neutral.titleText,
    fontSize: 15,
    fontWeight: '700',
  },
  routeBox: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: radius.control,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  routeCol: {
    flex: 1,
    minWidth: 0,
  },
  routeLabel: {
    color: colors.neutral.subtleText,
    fontSize: 10,
    fontWeight: '700',
  },
  routeAddress: {
    color: colors.neutral.text,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  routeArrow: {
    color: colors.neutral.subtleText,
    fontSize: 14,
    paddingHorizontal: 8,
  },
  cardFooter: {
    alignItems: 'center',
    borderTopColor: colors.neutral.rowDivider,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  footerLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  timeText: {
    color: colors.neutral.subtleText,
    fontSize: 11.5,
  },
  proofBadge: {
    alignItems: 'center',
    backgroundColor: colors.success.background,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  proofBadgeText: {
    color: colors.success.text,
    fontSize: 11,
    fontWeight: '700',
  },
  payoutText: {
    color: colors.brand.background,
    fontSize: 15,
    fontWeight: '800',
  },
  emptyBox: {
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.subtleBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 4,
    padding: spacing.lg,
    textAlign: 'center',
  },
  emptyTitle: {
    color: colors.neutral.titleText,
    fontSize: 15,
    fontWeight: '700',
  },
  emptyMessage: {
    color: colors.neutral.mutedText,
    fontSize: 13,
  },
});
