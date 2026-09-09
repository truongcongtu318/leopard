import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors, leopardPalette, radius, spacing, typography } from '../../../theme/tokens';
import { Button } from '../../../ui/Button';
import { ScreenScaffold } from '../../../ui/ScreenScaffold';
import {
  IconBank,
  IconClock,
  IconClose,
  IconEarnings,
  IconOrders,
  IconSecurityShield,
  IconSpeedTruck,
  IconStar,
  IconTrophy,
  IconWallet,
} from '../../../ui/icons/CoreIcons';
import { useDriverDrawer } from '../navigation/DriverDrawerContext';
import { DriverMenuButton } from '../navigation/DriverMenuButton';

type EarningsTrip = {
  id: string;
  reference: string;
  routeLabel: string;
  paymentMethod: 'VIETQR' | 'CASH';
  completedAt: string;
  fare: number;
  tip: number;
  bonus: number;
  total: number;
};

const mockTrips: EarningsTrip[] = [
  {
    id: 't-1',
    reference: 'LP-D-260815-001',
    routeLabel: 'Kho Tân Bình → Cát Lái, TP. Thủ Đức',
    paymentMethod: 'VIETQR',
    completedAt: '14:32',
    fare: 150000,
    tip: 20000,
    bonus: 0,
    total: 170000,
  },
  {
    id: 't-2',
    reference: 'LP-D-260815-002',
    routeLabel: 'Cảng Cát Lái → KCN Tân Bình',
    paymentMethod: 'VIETQR',
    completedAt: '11:15',
    fare: 220000,
    tip: 0,
    bonus: 30000,
    total: 250000,
  },
  {
    id: 't-3',
    reference: 'LP-D-260815-003',
    routeLabel: 'Chợ Đầu Mối Thủ Đức → Quận 1',
    paymentMethod: 'CASH',
    completedAt: '09:40',
    fare: 120000,
    tip: 20000,
    bonus: 0,
    total: 140000,
  },
  {
    id: 't-4',
    reference: 'LP-D-260815-004',
    routeLabel: 'Kho Tân Tạo → Quận 8',
    paymentMethod: 'VIETQR',
    completedAt: '08:10',
    fare: 60000,
    tip: 0,
    bonus: 0,
    total: 60000,
  },
];

const PERIOD_METRICS = {
  today: {
    total: 620000,
    fare: 550000,
    tip: 40000,
    bonus: 30000,
    trips: 4,
    hours: '5.5h',
    growth: '+18% so với hôm qua',
    hourlyRate: '112.700 ₫/h',
  },
  week: {
    total: 3850000,
    fare: 3350000,
    tip: 280000,
    bonus: 220000,
    trips: 26,
    hours: '34.0h',
    growth: '+12% so với tuần trước',
    hourlyRate: '113.200 ₫/h',
  },
  month: {
    total: 16420000,
    fare: 14190000,
    tip: 1250000,
    bonus: 980000,
    trips: 112,
    hours: '145.0h',
    growth: '+24% so với tháng trước',
    hourlyRate: '113.240 ₫/h',
  },
};

export function DriverEarningsScreen() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const { openDrawer } = useDriverDrawer();
  const router = useRouter();

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  const metrics = PERIOD_METRICS[period];
  const availableBalance = 1450000;

  const handleConfirmWithdraw = () => {
    setWithdrawSuccess(true);
    setTimeout(() => {
      setWithdrawSuccess(false);
      setShowWithdrawModal(false);
    }, 1800);
  };

  return (
    <ScreenScaffold
      headerLeading={<DriverMenuButton onPress={openDrawer} variant="plain" />}
      headerRight={
        <Pressable
          accessibilityHint="Mở ví tài xế để nạp hoặc rút tiền"
          accessibilityLabel={`Ví tài xế: ${formatCurrency(availableBalance)}`}
          accessibilityRole="button"
          onPress={() => router.push('/driver/wallet')}
          style={({ pressed }) => [styles.headerWalletChip, pressed ? styles.pressed : null]}
        >
          <IconWallet color={leopardPalette.primary} size={15} />
          <Text style={styles.headerWalletChipText}>Ví 1.450k</Text>
        </Pressable>
      }
      headerTone="plain"
      title="Thu nhập"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.scrollWrap}
      >
        {/* 1. Segmented Period Filter Bar (Compact & Sleek) */}
        <View accessibilityRole="toolbar" style={styles.periodRow}>
          <Pressable
            accessibilityLabel="Xem thu nhập hôm nay"
            accessibilityRole="button"
            accessibilityState={{ selected: period === 'today' }}
            onPress={() => setPeriod('today')}
            style={[styles.periodChip, period === 'today' ? styles.periodChipActive : null]}
          >
            <Text style={[styles.periodText, period === 'today' ? styles.periodTextActive : null]}>
              Hôm nay
            </Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Xem thu nhập tuần này"
            accessibilityRole="button"
            accessibilityState={{ selected: period === 'week' }}
            onPress={() => setPeriod('week')}
            style={[styles.periodChip, period === 'week' ? styles.periodChipActive : null]}
          >
            <Text style={[styles.periodText, period === 'week' ? styles.periodTextActive : null]}>
              Tuần này
            </Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Xem thu nhập tháng này"
            accessibilityRole="button"
            accessibilityState={{ selected: period === 'month' }}
            onPress={() => setPeriod('month')}
            style={[styles.periodChip, period === 'month' ? styles.periodChipActive : null]}
          >
            <Text style={[styles.periodText, period === 'month' ? styles.periodTextActive : null]}>
              Tháng này
            </Text>
          </Pressable>
        </View>

        {/* 2. Executive Financial & Wallet Card (Centerpiece) */}
        <View style={styles.executiveFinancialCard}>
          <View style={styles.financialTopRow}>
            <Text style={styles.financialEyebrow}>
              THỰC NHẬN ({period === 'today' ? 'HÔM NAY' : period === 'week' ? 'TUẦN NÀY' : 'THÁNG NÀY'})
            </Text>
            <View style={styles.growthBadge}>
              <Text style={styles.growthBadgeText}>▲ {metrics.growth}</Text>
            </View>
          </View>

          <Text style={styles.mainEarningsAmount}>{formatCurrency(metrics.total)}</Text>

          {/* Revenue Component Stacked Track */}
          <View style={styles.revenueStackTrack}>
            <View style={[styles.stackSegmentFare, { flex: metrics.fare }]} />
            <View style={[styles.stackSegmentTip, { flex: metrics.tip || 1 }]} />
            <View style={[styles.stackSegmentBonus, { flex: metrics.bonus || 1 }]} />
          </View>

          {/* Revenue 3-Part Legend */}
          <View style={styles.revenueLegendRow}>
            <View style={styles.legendItem}>
              <View style={styles.legendDotFare} />
              <Text style={styles.legendLabel}>Cước: </Text>
              <Text style={styles.legendValue}>{formatCurrency(metrics.fare)}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.legendDotTip} />
              <Text style={styles.legendLabel}>Tip: </Text>
              <Text style={styles.legendValue}>+{formatCurrency(metrics.tip)}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.legendDotBonus} />
              <Text style={styles.legendLabel}>Thưởng: </Text>
              <Text style={styles.legendValue}>+{formatCurrency(metrics.bonus)}</Text>
            </View>
          </View>

          {/* Instant Cash-out & Wallet Action Box */}
          <View style={styles.walletQuickActionBox}>
            <View style={styles.walletBalanceLeft}>
              <View style={styles.walletIconCircle}>
                <IconWallet color={leopardPalette.primary} size={16} />
              </View>
              <View>
                <Text style={styles.walletAvailLabel}>Ví tài xế khả dụng</Text>
                <Text style={styles.walletAvailAmount}>{formatCurrency(availableBalance)}</Text>
              </View>
            </View>

            <Pressable
              accessibilityLabel="Rút tiền nhanh về tài khoản ngân hàng"
              accessibilityRole="button"
              onPress={() => setShowWithdrawModal(true)}
              style={({ pressed }) => [styles.withdrawActionBtn, pressed ? styles.pressed : null]}
            >
              <IconBank color="#FFFFFF" size={14} />
              <Text style={styles.withdrawActionBtnText}>Rút tiền</Text>
            </Pressable>
          </View>
        </View>

        {/* 3. Operational Performance KPI Grid */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiBox}>
            <View style={styles.kpiIconWrap}>
              <IconSpeedTruck color={leopardPalette.primary} size={15} />
            </View>
            <Text style={styles.kpiBoxValue}>{metrics.trips} cuốc</Text>
            <Text style={styles.kpiBoxLabel}>Hoàn thành</Text>
          </View>

          <View style={styles.kpiBox}>
            <View style={styles.kpiIconWrap}>
              <IconClock color="#0EA5E9" size={15} />
            </View>
            <Text style={styles.kpiBoxValue}>{metrics.hours}</Text>
            <Text style={styles.kpiBoxLabel}>Trực tuyến</Text>
          </View>

          <View style={styles.kpiBox}>
            <View style={styles.kpiIconWrap}>
              <IconStar color="#F59E0B" fill="#F59E0B" size={14} />
            </View>
            <Text style={styles.kpiBoxValue}>5.0 ★</Text>
            <Text style={styles.kpiBoxLabel}>Đánh giá</Text>
          </View>

          <View style={styles.kpiBox}>
            <View style={styles.kpiIconWrap}>
              <IconTrophy color="#16A34A" size={15} />
            </View>
            <Text style={styles.kpiBoxValue}>{metrics.hourlyRate.replace(' ₫/h', 'k')}</Text>
            <Text style={styles.kpiBoxLabel}>Hiệu suất/h</Text>
          </View>
        </View>

        {/* 4. Completed Trips List Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Chuyến đã hoàn tất ({mockTrips.length})</Text>
          <Text style={styles.sectionSubtitle}>Cập nhật thời gian thực</Text>
        </View>

        {/* 5. Completed Trips Feed */}
        <View style={styles.tripList}>
          {mockTrips.map((item) => (
            <View key={item.id} style={styles.tripCard}>
              <View style={styles.tripCardTop}>
                <View style={styles.tripIdRow}>
                  <View style={styles.tripIconCircle}>
                    <IconSpeedTruck color={leopardPalette.primary} size={15} />
                  </View>
                  <View>
                    <Text style={styles.tripRefText}>{item.reference}</Text>
                    <Text style={styles.tripTimeText}>Hoàn tất lúc {item.completedAt}</Text>
                  </View>
                </View>
                <Text style={styles.tripPayoutText}>+{formatCurrency(item.total)}</Text>
              </View>

              <Text numberOfLines={1} style={styles.tripRouteLabel}>
                {item.routeLabel}
              </Text>

              <View style={styles.tripCardFooter}>
                <View style={styles.tripChipsRow}>
                  <View style={styles.tripFareChip}>
                    <Text style={styles.tripFareChipText}>Cước: {formatCurrency(item.fare)}</Text>
                  </View>
                  {item.tip > 0 ? (
                    <View style={styles.tripTipChip}>
                      <Text style={styles.tripTipChipText}>Tip: +{formatCurrency(item.tip)}</Text>
                    </View>
                  ) : null}
                  {item.bonus > 0 ? (
                    <View style={styles.tripBonusChip}>
                      <Text style={styles.tripBonusChipText}>Thưởng: +{formatCurrency(item.bonus)}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.paymentMethodTag}>
                  {item.paymentMethod === 'VIETQR' ? 'VietQR' : 'Tiền mặt'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* 6. Fast Cash-Out Modal */}
        <Modal
          animationType="fade"
          onRequestClose={() => setShowWithdrawModal(false)}
          transparent
          visible={showWithdrawModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <IconBank color={leopardPalette.primary} size={20} />
                  <Text style={styles.modalTitle}>Rút tiền về tài khoản</Text>
                </View>
                <Pressable
                  accessibilityLabel="Đóng cửa sổ rút tiền"
                  accessibilityRole="button"
                  onPress={() => setShowWithdrawModal(false)}
                  style={styles.modalCloseBtn}
                >
                  <IconClose color="#64748B" size={18} />
                </Pressable>
              </View>

              {withdrawSuccess ? (
                <View style={styles.modalSuccessBox}>
                  <View style={styles.successIconCircle}>
                    <IconSecurityShield color="#16A34A" size={28} />
                  </View>
                  <Text style={styles.successTitle}>Lệnh rút tiền thành công!</Text>
                  <Text style={styles.successSub}>
                    Hệ thống đang chuyển {formatCurrency(availableBalance)} về tài khoản MB Bank của bạn.
                  </Text>
                </View>
              ) : (
                <View style={styles.modalBody}>
                  <View style={styles.modalAccountCard}>
                    <Text style={styles.modalAccountLabel}>Tài khoản thụ hưởng đã liên kết</Text>
                    <Text style={styles.modalAccountBank}>MB Bank · Chi nhánh TP.HCM</Text>
                    <Text style={styles.modalAccountNumber}>0987654321 · NGUYEN VAN TUAN</Text>
                  </View>

                  <View style={styles.modalAmountBox}>
                    <Text style={styles.modalAmountLabel}>Số tiền rút khả dụng:</Text>
                    <Text style={styles.modalAmountValue}>{formatCurrency(availableBalance)}</Text>
                  </View>

                  <View style={styles.modalActionButtons}>
                    <Button
                      label="Xác nhận rút tiền"
                      onPress={handleConfirmWithdraw}
                      variant="primary"
                    />
                    <Button
                      label="Đến trang quản lý ví"
                      onPress={() => {
                        setShowWithdrawModal(false);
                        router.push('/driver/wallet');
                      }}
                      variant="secondary"
                    />
                  </View>
                </View>
              )}
            </View>
          </View>
        </Modal>
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
  container: {
    flex: 1,
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  pressed: {
    opacity: 0.85,
  },

  /* Header Wallet Chip */
  headerWalletChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  headerWalletChipText: {
    color: leopardPalette.primary,
    fontSize: 12,
    fontWeight: '700',
  },

  /* Period Filter Strip */
  periodRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: radius.pill,
    padding: 3,
    gap: 4,
  },
  periodChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  periodChipActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  periodText: {
    color: '#64748B',
    fontSize: 12.5,
    fontWeight: '600',
  },
  periodTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },

  /* Executive Financial Card */
  executiveFinancialCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.xs + 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  financialTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  financialEyebrow: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  growthBadge: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  growthBadgeText: {
    color: '#16A34A',
    fontSize: 10.5,
    fontWeight: '700',
  },
  mainEarningsAmount: {
    color: '#0F172A',
    fontSize: 32,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },

  /* Stacked Revenue Track */
  revenueStackTrack: {
    flexDirection: 'row',
    height: 7,
    borderRadius: 3.5,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    marginTop: 2,
  },
  stackSegmentFare: {
    backgroundColor: leopardPalette.primary,
  },
  stackSegmentTip: {
    backgroundColor: '#16A34A',
  },
  stackSegmentBonus: {
    backgroundColor: '#F59E0B',
  },

  /* Revenue Legend */
  revenueLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDotFare: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: leopardPalette.primary,
  },
  legendDotTip: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#16A34A',
  },
  legendDotBonus: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#F59E0B',
  },
  legendLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
  legendValue: {
    color: '#0F172A',
    fontSize: 11.5,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  /* Wallet Quick Action Box */
  walletQuickActionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
  },
  walletBalanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  walletIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletAvailLabel: {
    color: '#64748B',
    fontSize: 10.5,
    fontWeight: '500',
  },
  walletAvailAmount: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  withdrawActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: leopardPalette.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  withdrawActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  /* Operational Performance KPI Grid */
  kpiGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  kpiBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  kpiIconWrap: {
    marginBottom: 2,
  },
  kpiBoxValue: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  kpiBoxLabel: {
    color: '#64748B',
    fontSize: 9.5,
    fontWeight: '600',
  },

  /* Section Title */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 4,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 13.5,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: '#94A3B8',
    fontSize: 10.5,
    fontWeight: '500',
  },

  /* Completed Trips Feed */
  tripList: {
    gap: spacing.xs,
  },
  tripCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.md,
    gap: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  tripCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tripIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tripIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripRefText: {
    color: '#0F172A',
    fontSize: 13.5,
    fontWeight: '700',
  },
  tripTimeText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  tripPayoutText: {
    color: '#16A34A',
    fontSize: 15.5,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  tripRouteLabel: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  tripCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopColor: '#F1F5F9',
    borderTopWidth: 1,
    paddingTop: 6,
    marginTop: 2,
  },
  tripChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tripFareChip: {
    backgroundColor: '#F8FAFC',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tripFareChipText: {
    color: '#475569',
    fontSize: 10.5,
    fontWeight: '600',
  },
  tripTipChip: {
    backgroundColor: '#F0FDF4',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tripTipChipText: {
    color: '#16A34A',
    fontSize: 10.5,
    fontWeight: '700',
  },
  tripBonusChip: {
    backgroundColor: '#FEF3C7',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tripBonusChipText: {
    color: '#B45309',
    fontSize: 10.5,
    fontWeight: '700',
  },
  paymentMethodTag: {
    color: '#64748B',
    fontSize: 10.5,
    fontWeight: '600',
  },

  /* Cash-out Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.md,
    gap: spacing.md,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomColor: '#F1F5F9',
    borderBottomWidth: 1,
    paddingBottom: spacing.sm,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    gap: spacing.sm,
  },
  modalAccountCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.sm,
    gap: 2,
  },
  modalAccountLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  modalAccountBank: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  modalAccountNumber: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '500',
  },
  modalAmountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.sm,
  },
  modalAmountLabel: {
    color: '#0369A1',
    fontSize: 12,
    fontWeight: '600',
  },
  modalAmountValue: {
    color: leopardPalette.primary,
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  modalActionButtons: {
    gap: 8,
    marginTop: 4,
  },
  modalSuccessBox: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: 8,
  },
  successIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '800',
  },
  successSub: {
    color: '#475569',
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing.md,
  },
});
