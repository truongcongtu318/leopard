import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, layout, radius, spacing, typography } from '@leopard/mobile-core';
import { Button } from '../../../ui/Button';
import {
  IconBank,
  IconCopy,
  IconEye,
  IconEyeOff,
  IconQrPayment,
  IconSecurityShield,
  IconTxPayment,
  IconTxRefund,
  IconTxTopup,
  IconWallet,
} from '../../../ui/icons/CoreIcons';
import { ScreenScaffold } from '../../../ui/ScreenScaffold';

export type WalletTransaction = Readonly<{
  id: string;
  type: 'TOPUP' | 'PAYMENT' | 'REFUND';
  title: string;
  amount: number;
  createdAtLabel: string;
  orderReference?: string;
}>;

const mockTransactions: readonly WalletTransaction[] = [
  {
    id: 'tx-001',
    type: 'PAYMENT',
    title: 'Thanh toán cước đơn VLXD Minh Khang',
    amount: -480000,
    createdAtLabel: 'Hôm nay, 14:30',
    orderReference: 'LP-260905-001',
  },
  {
    id: 'tx-002',
    type: 'TOPUP',
    title: 'Nạp tiền ví VietQR qua MB Bank',
    amount: 2000000,
    createdAtLabel: 'Hôm nay, 09:15',
  },
  {
    id: 'tx-003',
    type: 'PAYMENT',
    title: 'Thanh toán cước xe tải chuyển đồ',
    amount: -420000,
    createdAtLabel: 'Hôm qua, 16:45',
    orderReference: 'LP-260904-009',
  },
  {
    id: 'tx-004',
    type: 'REFUND',
    title: 'Hoàn tiền cước đơn hủy lịch xuất kho',
    amount: 350000,
    createdAtLabel: 'Hôm qua, 11:20',
    orderReference: 'LP-260904-004',
  },
  {
    id: 'tx-005',
    type: 'TOPUP',
    title: 'Nạp tiền ví qua VietinBank',
    amount: 1000000,
    createdAtLabel: '02/09/2026',
  },
];

type FilterType = 'ALL' | 'TOPUP' | 'PAYMENT' | 'REFUND';

const filterTabs: readonly Readonly<{ id: FilterType; label: string }>[] = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'TOPUP', label: 'Nạp tiền' },
  { id: 'PAYMENT', label: 'Thanh toán' },
  { id: 'REFUND', label: 'Hoàn tiền' },
];

const presets: readonly Readonly<{ amount: number; badge?: string }>[] = [
  { amount: 100000 },
  { amount: 200000, badge: 'Phổ biến' },
  { amount: 500000, badge: 'Khuyên dùng' },
  { amount: 1000000 },
];

export function CustomerWalletScreen() {
  const [balance, setBalance] = useState(1250000);
  const [showBalance, setShowBalance] = useState(true);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(200000);
  const [showQR, setShowQR] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  const handleCopy = (field: string, text: string) => {
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleConfirmTopup = () => {
    if (selectedPreset) {
      setShowQR(true);
    }
  };

  const handleCompleteTopup = () => {
    setBalance((prev) => prev + (selectedPreset || 0));
    setShowQR(false);
    setShowTopupModal(false);
  };

  const filteredTransactions = mockTransactions.filter((tx) => {
    if (activeFilter === 'ALL') return true;
    return tx.type === activeFilter;
  });

  return (
    <ScreenScaffold
      hasFloatingNavBar
      title="Ví & Thanh toán"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.scrollWrap}
      >
        {/* 💳 1. Thẻ Số Dư Cao Cấp (Luxury Fintech Virtual Card) */}
        <View style={styles.balanceCard}>
          <View style={styles.cardTopRow}>
            <View style={styles.brandPill}>
              <View style={styles.pulseDot} />
              <IconWallet color="#38BDF8" size={16} />
              <Text style={styles.brandPillText}>Ví VietQR LEOPARD</Text>
            </View>
            <View style={styles.securityBadge}>
              <IconSecurityShield color="#10B981" size={14} />
              <Text style={styles.securityBadgeText}>Bảo mật 100%</Text>
            </View>
          </View>

          <View style={styles.balanceBody}>
            <Text style={styles.balanceEyebrow}>SỐ DƯ KHẢ DỤNG</Text>
            <View style={styles.amountRow}>
              <Text style={styles.balanceAmount}>
                {showBalance ? formatCurrency(balance) : '•••••••• ₫'}
              </Text>
              <Pressable
                accessibilityLabel={showBalance ? 'Ẩn số dư' : 'Hiện số dư'}
                accessibilityRole="button"
                onPress={() => setShowBalance(!showBalance)}
                style={styles.eyeToggleBtn}
              >
                {showBalance ? (
                  <IconEye color="#94A3B8" size={20} />
                ) : (
                  <IconEyeOff color="#94A3B8" size={20} />
                )}
              </Pressable>
            </View>
          </View>

          {/* Card Meta Footer */}
          <View style={styles.cardFooter}>
            <Text style={styles.cardFooterNapas}>NAPAS 24/7 · VietQR</Text>
            <Text style={styles.cardFooterNumber}>•••• 8839</Text>
          </View>
        </View>

        {/* ⚡ 2. Quick Action Dock (3 Nút Độc Lập Chuẩn Ngón Tay Cái) */}
        <View style={styles.actionDock}>
          <Pressable
            accessibilityLabel="+ Nạp tiền"
            accessibilityRole="button"
            onPress={() => {
              setShowTopupModal(!showTopupModal);
              setShowQR(false);
            }}
            style={({ pressed }) => [
              styles.dockBtnPrimary,
              pressed ? styles.pressed : null,
            ]}
          >
            <View style={styles.dockIconBoxPrimary}>
              <IconTxTopup color="#FFFFFF" size={20} />
            </View>
            <Text style={styles.dockBtnPrimaryText}>+ Nạp tiền</Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Quét VietQR"
            accessibilityRole="button"
            onPress={() => {
              setShowTopupModal(true);
              setShowQR(true);
            }}
            style={({ pressed }) => [
              styles.dockBtnSecondary,
              pressed ? styles.pressed : null,
            ]}
          >
            <View style={styles.dockIconBoxSecondary}>
              <IconQrPayment color="#0B1E42" size={20} />
            </View>
            <Text style={styles.dockBtnSecondaryText}>Quét QR</Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Rút tiền"
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.dockBtnSecondary,
              pressed ? styles.pressed : null,
            ]}
          >
            <View style={styles.dockIconBoxMuted}>
              <IconTxPayment color="#64748B" size={20} />
            </View>
            <Text style={styles.dockBtnMutedText}>Rút tiền</Text>
          </Pressable>
        </View>

        {/* ⚡ 2. Khối Chọn Mức Nạp Nhanh (Smart Topup Presets) */}
        {showTopupModal && !showQR ? (
          <View style={styles.topupCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.sectionLabel}>CHỌN SỐ TIỀN NẠP NHANH</Text>
              <Pressable onPress={() => setShowTopupModal(false)}>
                <Text style={styles.closeLinkText}>Đóng ✕</Text>
              </Pressable>
            </View>

            <View style={styles.presetGrid}>
              {presets.map((item) => {
                const selected = selectedPreset === item.amount;
                return (
                  <Pressable
                    accessibilityLabel={formatCurrency(item.amount)}
                    accessibilityRole="button"
                    key={item.amount}
                    onPress={() => setSelectedPreset(item.amount)}
                    style={({ pressed }) => [
                      styles.presetItem,
                      selected ? styles.presetItemSelected : null,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    {item.badge ? (
                      <View style={styles.presetBadge}>
                        <Text style={styles.presetBadgeText}>{item.badge}</Text>
                      </View>
                    ) : null}
                    <Text
                      style={[
                        styles.presetText,
                        selected ? styles.presetTextSelected : null,
                      ]}
                    >
                      {formatCurrency(item.amount)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {selectedPreset ? (
              <Button
                label={`Tạo mã VietQR cho ${formatCurrency(selectedPreset)}`}
                onPress={handleConfirmTopup}
                size="driver-primary"
                variant="primary"
              />
            ) : null}
          </View>
        ) : null}

        {/* 📱 3. Khung Mã VietQR Pro (VietQR Pro Card) */}
        {showTopupModal && showQR ? (
          <View style={styles.qrCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.sectionLabel}>MÃ THANH TOÁN VIETQR PRO</Text>
              <Pressable
                onPress={() => {
                  setShowQR(false);
                  setShowTopupModal(false);
                }}
              >
                <Text style={styles.closeLinkText}>Đóng ✕</Text>
              </Pressable>
            </View>

            {/* Khung Mã QR Chuẩn Vector */}
            <View style={styles.qrCodeBox}>
              <View style={styles.qrBadgeRow}>
                <View style={styles.napasBadge}>
                  <Text style={styles.napasBadgeText}>NAPAS 24/7</Text>
                </View>
                <View style={styles.vietqrBadge}>
                  <Text style={styles.vietqrBadgeText}>VietQR</Text>
                </View>
              </View>

              <View style={styles.qrVectorWrap}>
                <IconQrPayment color="#0F172A" size={96} strokeWidth={2} />
              </View>

              <Text style={styles.qrCodeAmount}>
                {formatCurrency(selectedPreset || 200000)}
              </Text>
            </View>

            {/* Thông Tin Ngân Hàng & Sao Chép 1 Chạm */}
            <View style={styles.bankDetailCard}>
              <View style={styles.bankDetailRow}>
                <Text style={styles.bankFieldLabel}>Ngân hàng thụ hưởng</Text>
                <Text style={styles.bankFieldValue}>Vietcombank (VCB)</Text>
              </View>

              <View style={styles.bankDetailRow}>
                <Text style={styles.bankFieldLabel}>Số tài khoản</Text>
                <View style={styles.copyRow}>
                  <Text style={styles.bankFieldValueBold}>0900000001</Text>
                  <Pressable
                    accessibilityLabel="Sao chép số tài khoản"
                    accessibilityRole="button"
                    onPress={() => handleCopy('account', '0900000001')}
                    style={styles.copyBtn}
                  >
                    <IconCopy color="#0B1E42" size={14} />
                    <Text style={styles.copyBtnText}>
                      {copiedField === 'account' ? 'Đã chép ✓' : 'Sao chép'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.bankDetailRow}>
                <Text style={styles.bankFieldLabel}>Nội dung chuyển khoản</Text>
                <View style={styles.copyRow}>
                  <Text style={styles.bankFieldValueCode}>LEOPARD TOPUP 0900000001</Text>
                  <Pressable
                    accessibilityLabel="Sao chép nội dung chuyển khoản"
                    accessibilityRole="button"
                    onPress={() => handleCopy('memo', 'LEOPARD TOPUP 0900000001')}
                    style={styles.copyBtn}
                  >
                    <IconCopy color="#0B1E42" size={14} />
                    <Text style={styles.copyBtnText}>
                      {copiedField === 'memo' ? 'Đã chép ✓' : 'Sao chép'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <Text style={styles.qrInstructions}>
              Mở ứng dụng ngân hàng bất kỳ để quét mã. Tiền sẽ vào ví tự động sau 10-30 giây.
            </Text>

            <View style={styles.qrActionRow}>
              <Button
                label="Hoàn tất nạp tiền"
                onPress={handleCompleteTopup}
                size="driver-primary"
                variant="primary"
              />
              <Button
                label="Đóng"
                onPress={() => {
                  setShowQR(false);
                  setShowTopupModal(false);
                }}
                variant="secondary"
              />
            </View>
          </View>
        ) : null}

        {/* 🏦 4. Phương Thức Liên Kết */}
        <View style={styles.methodsCard}>
          <View style={styles.methodHeaderRow}>
            <Text style={styles.sectionLabel}>PHƯƠNG THỨC LIÊN KẾT</Text>
            <Text style={styles.manageLinkText}>Quản lý</Text>
          </View>
          <View style={styles.methodItem}>
            <View style={styles.methodLeft}>
              <View style={styles.methodIconBox}>
                <IconBank color="#0B1E42" size={20} />
              </View>
              <View style={styles.methodTextCol}>
                <View style={styles.methodNameRow}>
                  <Text style={styles.methodName}>VietQR / Chuyển khoản tức thì</Text>
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>Mặc định</Text>
                  </View>
                </View>
                <Text style={styles.methodSub}>Miễn phí nạp & rút tiền 24/7</Text>
              </View>
            </View>
            <Text style={styles.methodChevron}>›</Text>
          </View>
        </View>

        {/* 📜 5. Lịch Sử Giao Dịch Gần Đây & Bộ Lọc */}
        <View style={styles.historySection}>
          <View style={styles.historyHeaderRow}>
            <Text style={styles.sectionLabel}>LỊCH SỬ GIAO DỊCH GẦN ĐÂY</Text>
          </View>

          {/* Thanh lọc phân loại giao dịch */}
          <View style={styles.filterTabsRow}>
            {filterTabs.map((tab) => {
              const active = activeFilter === tab.id;
              return (
                <Pressable
                  accessibilityLabel={tab.label}
                  accessibilityRole="button"
                  key={tab.id}
                  onPress={() => setActiveFilter(tab.id)}
                  style={({ pressed }) => [
                    styles.filterChip,
                    active ? styles.filterChipActive : null,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      active ? styles.filterChipTextActive : null,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.historyList}>
            {filteredTransactions.map((item) => {
              const isPositive = item.amount > 0;
              const isRefund = item.type === 'REFUND';

              return (
                <View key={item.id} style={styles.txRow}>
                  <View style={styles.txLeft}>
                    <View
                      style={[
                        styles.txIconBox,
                        isPositive
                          ? isRefund
                            ? styles.txIconBoxRefund
                            : styles.txIconBoxTopup
                          : styles.txIconBoxPayment,
                      ]}
                    >
                      {item.type === 'TOPUP' ? (
                        <IconTxTopup color="#16A34A" size={18} />
                      ) : isRefund ? (
                        <IconTxRefund color="#D97706" size={18} />
                      ) : (
                        <IconTxPayment color="#475569" size={18} />
                      )}
                    </View>

                    <View style={styles.txMeta}>
                      <Text numberOfLines={1} style={styles.txTitle}>
                        {item.title}
                      </Text>
                      <View style={styles.txSubRow}>
                        <Text style={styles.txDate}>{item.createdAtLabel}</Text>
                        {item.orderReference ? (
                          <View style={styles.orderRefBadge}>
                            <Text style={styles.orderRefBadgeText}>
                              {item.orderReference}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.txAmount,
                      isPositive ? styles.txAmountPositive : styles.txAmountNegative,
                    ]}
                  >
                    {isPositive ? '+' : ''}
                    {formatCurrency(item.amount)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
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
    paddingBottom: layout.bottomNavClearance + 32,
  },
  balanceCard: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
    borderRadius: 22,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38BDF8',
  },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  brandPillText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  securityBadgeText: {
    color: '#10B981',
    fontSize: 11.5,
    fontWeight: '600',
  },
  balanceBody: {
    gap: 4,
  },
  balanceEyebrow: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
  eyeToggleBtn: {
    padding: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 12,
  },
  cardFooterNapas: {
    color: '#94A3B8',
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  cardFooterNumber: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  /* ⚡ Quick Action Dock */
  actionDock: {
    flexDirection: 'row',
    gap: 10,
  },
  dockBtnPrimary: {
    flex: 1.15,
    backgroundColor: '#0B1E42',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  dockIconBoxPrimary: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  dockBtnSecondary: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  dockIconBoxSecondary: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F4F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockBtnSecondaryText: {
    color: '#0F172A',
    fontSize: 12.5,
    fontWeight: '700',
  },
  dockIconBoxMuted: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockBtnMutedText: {
    color: '#64748B',
    fontSize: 12.5,
    fontWeight: '600',
  },
  topupCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeLinkText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  presetItem: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 10,
    borderWidth: 1.5,
    flexBasis: '48%',
    flexGrow: 1,
    paddingVertical: 13,
    alignItems: 'center',
    position: 'relative',
  },
  presetItemSelected: {
    backgroundColor: '#F0F4F9',
    borderColor: '#0B1E42',
  },
  presetBadge: {
    position: 'absolute',
    top: -8,
    right: 8,
    backgroundColor: '#D97706',
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  presetBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  presetText: {
    color: '#0F172A',
    fontSize: 14.5,
    fontWeight: '700',
  },
  presetTextSelected: {
    color: '#0B1E42',
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  qrCodeBox: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  qrBadgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  napasBadge: {
    backgroundColor: '#0B1E42',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  napasBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  vietqrBadge: {
    backgroundColor: '#D97706',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  vietqrBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  qrVectorWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderColor: '#E2E8F0',
    borderWidth: 1,
  },
  qrCodeAmount: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '800',
  },
  bankDetailCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  bankDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bankFieldLabel: {
    color: '#64748B',
    fontSize: 12,
  },
  bankFieldValue: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '600',
  },
  bankFieldValueBold: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
  bankFieldValueCode: {
    color: '#0B1E42',
    fontSize: 12.5,
    fontWeight: '700',
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F4F9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  copyBtnText: {
    color: '#0B1E42',
    fontSize: 11,
    fontWeight: '700',
  },
  qrInstructions: {
    color: '#64748B',
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
  },
  qrActionRow: {
    gap: 8,
  },
  sectionLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  methodsCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  methodHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  manageLinkText: {
    color: '#0B1E42',
    fontSize: 12.5,
    fontWeight: '600',
  },
  methodItem: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  methodLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    flex: 1,
  },
  methodIconBox: {
    alignItems: 'center',
    backgroundColor: '#F0F4F9',
    borderRadius: 10,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  methodTextCol: {
    flex: 1,
    gap: 2,
  },
  methodNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  methodName: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
  },
  methodSub: {
    color: '#64748B',
    fontSize: 12,
  },
  methodChevron: {
    color: '#CBD5E1',
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 6,
  },
  defaultBadge: {
    backgroundColor: '#F0F4F9',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  defaultBadgeText: {
    color: '#0B1E42',
    fontSize: 11,
    fontWeight: '700',
  },
  historySection: {
    gap: spacing.xs,
  },
  historyHeaderRow: {
    marginLeft: 4,
    marginBottom: 2,
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  filterChipText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  historyList: {
    gap: 8,
  },
  txRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  txLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    minWidth: 0,
  },
  txIconBox: {
    alignItems: 'center',
    borderRadius: 10,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  txIconBoxTopup: {
    backgroundColor: '#DCFCE7',
  },
  txIconBoxPayment: {
    backgroundColor: '#F1F5F9',
  },
  txIconBoxRefund: {
    backgroundColor: '#FEF3C7',
  },
  txMeta: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  txTitle: {
    color: '#0F172A',
    fontSize: 13.5,
    fontWeight: '600',
  },
  txSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  txDate: {
    color: '#94A3B8',
    fontSize: 11.5,
  },
  orderRefBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  orderRefBadgeText: {
    color: '#475569',
    fontSize: 10.5,
    fontWeight: '600',
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  txAmountPositive: {
    color: '#16A34A',
  },
  txAmountNegative: {
    color: '#0F172A',
  },
  pressed: {
    opacity: 0.7,
  },
});

