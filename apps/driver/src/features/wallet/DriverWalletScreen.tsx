import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, leopardPalette, radius, spacing, typography, Button, IconBank, IconClock, IconEye, IconEyeOff, IconOrders, IconSecurityShield, IconTrophy, IconTxPayment, IconTxTopup, IconWallet, ScreenScaffold } from '@leopard/mobile-core';

export type DriverTransaction = Readonly<{
  id: string;
  type: 'WITHDRAWAL' | 'EARNING' | 'BONUS';
  title: string;
  amount: number;
  createdAtLabel: string;
  orderReference?: string;
  statusLabel: string;
}>;

const mockDriverTransactions: readonly DriverTransaction[] = [
  {
    id: 'dtx-001',
    type: 'EARNING',
    title: 'Cước chuyến LP-260905-001 (VLXD Minh Khang)',
    amount: 408000,
    createdAtLabel: 'Hôm nay, 15:10',
    orderReference: 'LP-260905-001',
    statusLabel: 'Đã cộng ví',
  },
  {
    id: 'dtx-002',
    type: 'WITHDRAWAL',
    title: 'Rút tiền về MB Bank (0987654321)',
    amount: -2000000,
    createdAtLabel: 'Hôm nay, 08:30',
    statusLabel: 'Thành công',
  },
  {
    id: 'dtx-003',
    type: 'BONUS',
    title: 'Thưởng tuần hoàn thành 25 chuyến giao nhanh',
    amount: 500000,
    createdAtLabel: 'Hôm qua, 21:00',
    statusLabel: 'Đã nhận',
  },
  {
    id: 'dtx-004',
    type: 'EARNING',
    title: 'Cước chuyến LP-260904-009 (Chuyển phòng trọ)',
    amount: 357000,
    createdAtLabel: 'Hôm qua, 17:30',
    orderReference: 'LP-260904-009',
    statusLabel: 'Đã cộng ví',
  },
  {
    id: 'dtx-005',
    type: 'WITHDRAWAL',
    title: 'Rút tiền về MB Bank (0987654321)',
    amount: -1500000,
    createdAtLabel: '28/08/2026, 09:20',
    statusLabel: 'Thành công',
  },
];

type FilterType = 'ALL' | 'WITHDRAWAL' | 'EARNING' | 'BONUS';

const filterTabs: readonly Readonly<{ id: FilterType; label: string }>[] = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'WITHDRAWAL', label: 'Rút tiền' },
  { id: 'EARNING', label: 'Cước chuyến' },
  { id: 'BONUS', label: 'Thưởng' },
];

const withdrawalPresets = [500000, 1000000, 2000000];

const linkedBankAccounts = [
  {
    id: 'bank-mb',
    bankName: 'MB Bank',
    accountNumber: '0987 **** **68',
    holderName: 'NGUYEN VAN A',
    isDefault: true,
  },
  {
    id: 'bank-vcb',
    bankName: 'Vietcombank',
    accountNumber: '1012 **** **89',
    holderName: 'NGUYEN VAN A',
    isDefault: false,
  },
];

export function DriverWalletScreen() {
  const router = useRouter();
  const [balance, setBalance] = useState(3450000);
  const [showBalance, setShowBalance] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState('bank-mb');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('1000000');
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  const filteredTransactions = mockDriverTransactions.filter((tx) => {
    if (activeFilter === 'ALL') return true;
    return tx.type === activeFilter;
  });

  const handleConfirmWithdraw = () => {
    const num = parseInt(withdrawAmount, 10);
    if (!isNaN(num) && num > 0 && num <= balance) {
      setBalance((prev) => prev - num);
      setWithdrawSuccess(true);
      setTimeout(() => {
        setWithdrawSuccess(false);
        setShowWithdrawModal(false);
      }, 1500);
    }
  };

  const renderTransactionIcon = (type: DriverTransaction['type']) => {
    switch (type) {
      case 'WITHDRAWAL':
        return <IconTxPayment color={colors.neutral.mutedText} size={18} />;
      case 'EARNING':
        return <IconOrders color={colors.brand.background} size={18} />;
      case 'BONUS':
        return <IconTrophy color="#F59E0B" size={18} />;
    }
  };

  return (
    <ScreenScaffold
      eyebrow="DRIVER · WALLET & PAYOUT"
      headerTone="plain"
      onBack={() => router.back()}
      title="Ví tài xế"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.scrollWrap}
      >
        {/* Card Số Dư Khả Dụng - Double Bezel Styling */}
        <View style={styles.doubleBezelOuter}>
          <View style={styles.doubleBezelInner}>
            <View style={styles.balanceHeader}>
              <View style={styles.balanceHeaderLeft}>
                <View style={styles.walletIconChip}>
                  <IconWallet color="#10B981" size={18} />
                </View>
                <View>
                  <Text style={styles.balanceLabel}>Số dư khả dụng để rút</Text>
                  <View style={styles.instantBadge}>
                    <Text style={styles.instantBadgeText}>Rút tiền tức thì 24/7</Text>
                  </View>
                </View>
              </View>
              <Pressable
                accessibilityLabel={showBalance ? 'Ẩn số dư' : 'Hiện số dư'}
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setShowBalance(!showBalance)}
              >
                {showBalance ? (
                  <IconEyeOff color={colors.neutral.subtleText} size={18} />
                ) : (
                  <IconEye color={colors.neutral.subtleText} size={18} />
                )}
              </Pressable>
            </View>

            <Text style={styles.balanceAmount}>
              {showBalance ? formatCurrency(balance) : '•••••••• ₫'}
            </Text>

            <View style={styles.balanceFooter}>
              <View style={styles.balanceStat}>
                <Text style={styles.balanceStatLabel}>Đang chờ tất toán</Text>
                <Text style={styles.balanceStatValue}>{formatCurrency(350000)}</Text>
              </View>
              <View style={styles.balanceStatDivider} />
              <View style={styles.balanceStat}>
                <Text style={styles.balanceStatLabel}>Hạn mức rút 24/7</Text>
                <Text style={styles.balanceStatValue}>50.000.000 ₫/ngày</Text>
              </View>
            </View>

            <Button
              label="Rút tiền về tài khoản ngân hàng"
              onPress={() => setShowWithdrawModal(true)}
              size="driver-primary"
              variant="primary"
            />
          </View>
        </View>

        {/* Card Tài Khoản Ngân Hàng Liên Kết */}
        <View style={styles.bankSection}>
          <View style={styles.bankSectionHeader}>
            <Text style={styles.sectionLabel}>Tài khoản ngân hàng liên kết (24/7)</Text>
          </View>
          {linkedBankAccounts.map((account) => {
            const isSelected = selectedBankId === account.id;
            return (
              <Pressable
                key={account.id}
                onPress={() => setSelectedBankId(account.id)}
                style={[styles.bankCard, isSelected ? styles.bankCardSelected : null]}
              >
                <View style={styles.bankHeader}>
                  <View style={[styles.bankIconChip, isSelected ? styles.bankIconChipSelected : null]}>
                    <IconBank color={isSelected ? '#10B981' : '#0B1E42'} size={20} />
                  </View>
                  <View style={styles.bankInfo}>
                    <View style={styles.bankNameRow}>
                      <Text style={styles.bankName}>{account.bankName}</Text>
                      {account.isDefault ? (
                        <View style={styles.defaultPill}>
                          <Text style={styles.defaultPillText}>Mặc định</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.bankAccount}>{account.accountNumber} · {account.holderName}</Text>
                  </View>
                </View>
                <View style={styles.bankSecurityRow}>
                  <IconSecurityShield color="#10B981" size={14} />
                  <Text style={styles.bankSecurityText}>Liên kết Napas247 - Rút tiền tức thì</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Lịch Sử Giao Dịch */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.sectionLabel}>Lịch sử giao dịch</Text>
          </View>

          {/* Filter Chips */}
          <View style={styles.filterRow}>
            {filterTabs.map((tab) => {
              const isActive = activeFilter === tab.id;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  key={tab.id}
                  onPress={() => setActiveFilter(tab.id)}
                  style={[styles.filterChip, isActive ? styles.filterChipActive : null]}
                >
                  <Text style={[styles.filterText, isActive ? styles.filterTextActive : null]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.txList}>
            {filteredTransactions.map((item) => {
              const isPositive = item.amount > 0;
              return (
                <View key={item.id} style={styles.txCard}>
                  <View style={styles.txLeft}>
                    <View
                      style={[
                        styles.txIconChip,
                        isPositive ? styles.txIconPositive : styles.txIconNegative,
                      ]}
                    >
                      {renderTransactionIcon(item.type)}
                    </View>
                    <View style={styles.txInfo}>
                      <Text style={styles.txTitle}>{item.title}</Text>
                      <Text style={styles.txTime}>{item.createdAtLabel}</Text>
                    </View>
                  </View>
                  <View style={styles.txRight}>
                    <Text
                      style={[
                        styles.txAmount,
                        isPositive ? styles.txAmountPositive : styles.txAmountNegative,
                      ]}
                    >
                      {isPositive ? `+${formatCurrency(item.amount)}` : formatCurrency(item.amount)}
                    </Text>
                    <Text style={styles.txStatus}>{item.statusLabel}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Modal Rút Tiền */}
      <Modal
        animationType="slide"
        onRequestClose={() => setShowWithdrawModal(false)}
        transparent
        visible={showWithdrawModal}
      >
        <Pressable
          onPress={() => setShowWithdrawModal(false)}
          style={styles.modalBackdrop}
        >
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.modalSheet}>
            <View style={styles.modalDragHandle} />
            <Text style={styles.modalTitle}>Rút tiền về tài khoản ngân hàng</Text>
            <Text style={styles.modalSub}>
              Tiền sẽ được chuyển về tài khoản MB Bank · 0987 **** **68 trong vòng 5-10 phút.
            </Text>

            {withdrawSuccess ? (
              <View style={styles.successBanner}>
                <Text style={styles.successBannerText}>
                  Lệnh rút tiền đã được gửi thành công!
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.inputLabel}>Số tiền muốn rút (₫)</Text>
                <TextInput
                  keyboardType="numeric"
                  onChangeText={setWithdrawAmount}
                  placeholder="Nhập số tiền"
                  style={styles.amountInput}
                  value={withdrawAmount}
                />

                {/* Preset Chips */}
                <View style={styles.presetRow}>
                  {withdrawalPresets.map((preset) => (
                    <Pressable
                      key={preset}
                      onPress={() => setWithdrawAmount(String(preset))}
                      style={styles.presetChip}
                    >
                      <Text style={styles.presetText}>{formatCurrency(preset)}</Text>
                    </Pressable>
                  ))}
                  <Pressable
                    onPress={() => setWithdrawAmount(String(balance))}
                    style={styles.presetChip}
                  >
                    <Text style={styles.presetText}>Tất cả</Text>
                  </Pressable>
                </View>

                <View style={styles.feeInfoRow}>
                  <Text style={styles.feeLabel}>Phí rút tiền</Text>
                  <Text style={styles.feeValue}>0 ₫ (Miễn phí)</Text>
                </View>

                <View style={styles.modalBtnRow}>
                  <Button
                    label="Hủy"
                    onPress={() => setShowWithdrawModal(false)}
                    variant="secondary"
                  />
                  <Button
                    label="Xác nhận rút tiền"
                    onPress={handleConfirmWithdraw}
                    variant="primary"
                  />
                </View>
              </>
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
    minHeight: 0,
  },
  scrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.xl + 20,
  },
  container: {
    flex: 1,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  /* Double-bezel Balance Card */
  doubleBezelOuter: {
    backgroundColor: '#0B1E42', // Midnight Navy outer
    borderRadius: radius.bezelOuter,
    padding: 3,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  doubleBezelInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.bezelInner,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  balanceHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceHeaderLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  walletIconChip: {
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: radius.card,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  balanceLabel: {
    color: '#0B1E42',
    fontSize: 12.5,
    fontWeight: '700',
  },
  instantBadge: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  instantBadgeText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
  },
  balanceAmount: {
    color: '#0B1E42',
    fontSize: 32,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    marginVertical: 2,
  },
  balanceFooter: {
    borderBottomColor: colors.neutral.rowDivider,
    borderTopColor: colors.neutral.rowDivider,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.xs,
    marginBottom: spacing.xxs,
  },
  balanceStat: {
    alignItems: 'center',
    gap: 2,
  },
  balanceStatDivider: {
    backgroundColor: colors.neutral.rowDivider,
    width: 1,
  },
  balanceStatLabel: {
    color: colors.neutral.subtleText,
    fontSize: 11,
  },
  balanceStatValue: {
    color: '#0F172A',
    fontSize: 12.5,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  bankSection: {
    gap: spacing.xs,
  },
  bankSectionHeader: {
    marginVertical: 2,
  },
  bankCard: {
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.subtleBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  bankCardSelected: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  bankHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bankIconChip: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: radius.card,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  bankIconChipSelected: {
    backgroundColor: '#DCFCE7',
  },
  bankInfo: {
    flex: 1,
    gap: 2,
  },
  bankNameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  bankName: {
    color: '#0B1E42',
    fontSize: 14.5,
    fontWeight: '700',
  },
  defaultPill: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  defaultPillText: {
    color: '#10B981',
    fontSize: 10.5,
    fontWeight: '700',
  },
  bankAccount: {
    color: colors.neutral.mutedText,
    fontSize: 12.5,
  },
  bankSecurityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  bankSecurityText: {
    color: colors.success.text,
    fontSize: 11.5,
    fontWeight: '600',
  },
  historySection: {
    gap: spacing.xs,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLabel: {
    color: leopardPalette.textMutedSlate,
    fontSize: 13,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 4,
  },
  filterChip: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: radius.pill,
    flex: 1,
    paddingVertical: 6,
  },
  filterChipActive: {
    backgroundColor: colors.brand.background,
  },
  filterText: {
    color: colors.neutral.mutedText,
    fontSize: 12,
    fontWeight: '600',
  },
  filterTextActive: {
    color: colors.neutral.background,
    fontWeight: '700',
  },
  txList: {
    gap: spacing.xs,
  },
  txCard: {
    alignItems: 'center',
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.subtleBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.sm,
  },
  txLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    flex: 1,
  },
  txIconChip: {
    alignItems: 'center',
    borderRadius: radius.card,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  txIconPositive: {
    backgroundColor: colors.success.background,
  },
  txIconNegative: {
    backgroundColor: colors.neutral.surfaceMuted,
  },
  txInfo: {
    flex: 1,
    gap: 2,
  },
  txTitle: {
    color: colors.neutral.titleText,
    fontSize: 13,
    fontWeight: '600',
  },
  txTime: {
    color: colors.neutral.subtleText,
    fontSize: 11,
  },
  txRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  txAmount: {
    fontSize: 13.5,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  txAmountPositive: {
    color: colors.success.text,
  },
  txAmountNegative: {
    color: colors.neutral.titleText,
  },
  txStatus: {
    color: colors.neutral.subtleText,
    fontSize: 10.5,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.neutral.background,
    borderTopLeftRadius: radius.control,
    borderTopRightRadius: radius.control,
    gap: spacing.sm,
    maxWidth: 480,
    padding: spacing.lg,
    width: '100%',
  },
  modalDragHandle: {
    alignSelf: 'center',
    backgroundColor: colors.neutral.subtleBorder,
    borderRadius: 2,
    height: 4,
    marginBottom: spacing.xs,
    width: 40,
  },
  modalTitle: {
    color: colors.neutral.titleText,
    fontSize: 17,
    fontWeight: '800',
  },
  modalSub: {
    color: colors.neutral.mutedText,
    fontSize: 12.5,
    lineHeight: 18,
  },
  inputLabel: {
    color: colors.neutral.titleText,
    fontSize: 12,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  amountInput: {
    borderColor: colors.neutral.subtleBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    color: colors.neutral.titleText,
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 6,
  },
  presetChip: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: radius.pill,
    flex: 1,
    paddingVertical: 6,
  },
  presetText: {
    color: colors.neutral.mutedText,
    fontSize: 11.5,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  feeInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xxs,
  },
  feeLabel: {
    color: colors.neutral.subtleText,
    fontSize: 12,
  },
  feeValue: {
    color: colors.success.text,
    fontSize: 12,
    fontWeight: '700',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  successBanner: {
    alignItems: 'center',
    backgroundColor: colors.success.background,
    borderColor: colors.success.border,
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.md,
  },
  successBannerText: {
    color: colors.success.text,
    fontSize: 14,
    fontWeight: '700',
  },
});
