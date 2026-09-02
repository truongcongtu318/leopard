import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, leopardPalette, pastelTheme, radius, spacing, typography } from '../../../theme/tokens';
import { Button } from '../../../ui/Button';
import { ScreenScaffold } from '../../../ui/ScreenScaffold';
import { StatusBadge } from '../../../ui/StatusBadge';

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
    title: 'Thanh toán cước vận chuyển',
    amount: -150000,
    createdAtLabel: 'Hôm nay, 14:32',
    orderReference: 'LP-D-260815-001',
  },
  {
    id: 'tx-002',
    type: 'TOPUP',
    title: 'Nạp tiền qua VietQR',
    amount: 500000,
    createdAtLabel: 'Hôm qua, 09:15',
  },
  {
    id: 'tx-003',
    type: 'PAYMENT',
    title: 'Thanh toán cước xe tải',
    amount: -320000,
    createdAtLabel: '20/08/2026',
    orderReference: 'LP-D-260812-004',
  },
  {
    id: 'tx-004',
    type: 'REFUND',
    title: 'Hoàn tiền chênh lệch quãng đường',
    amount: 35000,
    createdAtLabel: '18/08/2026',
    orderReference: 'LP-D-260810-002',
  },
];

export function CustomerWalletScreen() {
  const [balance, setBalance] = useState(1250000);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  const presets = [100000, 200000, 500000, 1000000];

  const [showQR, setShowQR] = useState(false);

  const handleConfirmTopup = () => {
    if (selectedPreset) {
      setShowQR(true);
    }
  };

  return (
    <ScreenScaffold
      eyebrow="CUSTOMER · WALLET & PAYMENT"
      subtitle="Quản lý số dư, phương thức thanh toán và lịch sử giao dịch."
      title="Ví & Thanh toán"
    >
      <View style={styles.container}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceEyebrow}>SỐ DƯ KHẢ DỤNG</Text>
          <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => { setShowTopupModal(!showTopupModal); setShowQR(false); }}
              style={styles.actionButton}
            >
              <Text style={styles.actionButtonText}>+ Nạp tiền</Text>
            </Pressable>
            <Pressable accessibilityRole="button" style={styles.actionButtonSecondary}>
              <Text style={styles.actionButtonSecondaryText}>Rút tiền</Text>
            </Pressable>
          </View>
        </View>

        {showTopupModal && !showQR ? (
          <View style={styles.topupCard}>
            <Text style={styles.sectionLabel}>CHỌN SỐ TIỀN NẠP NHANH</Text>
            <View style={styles.presetGrid}>
              {presets.map((amount) => (
                <Pressable
                  key={amount}
                  onPress={() => setSelectedPreset(amount)}
                  style={[
                    styles.presetItem,
                    selectedPreset === amount ? styles.presetItemSelected : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.presetText,
                      selectedPreset === amount ? styles.presetTextSelected : null,
                    ]}
                  >
                    {formatCurrency(amount)}
                  </Text>
                </Pressable>
              ))}
            </View>
            {selectedPreset ? (
              <Button
                label={`Tạo mã VietQR cho ${formatCurrency(selectedPreset)}`}
                onPress={handleConfirmTopup}
              />
            ) : null}
          </View>
        ) : null}

        {showTopupModal && showQR ? (
          <View style={styles.qrCard}>
            <Text style={styles.sectionLabel}>MÃ VIETQR</Text>
            <View style={styles.qrCodeBox}>
              <Text style={styles.qrCodeIcon}>📱</Text>
              <Text style={styles.qrCodeAmount}>{formatCurrency(selectedPreset || 0)}</Text>
            </View>
            <Text style={styles.qrInstructions}>Mở ứng dụng ngân hàng và quét mã này để hoàn tất nạp tiền.</Text>
            <Button label="Đóng" onPress={() => { setShowQR(false); setShowTopupModal(false); setBalance(prev => prev + (selectedPreset || 0)); }} variant="secondary" />
          </View>
        ) : null}

        <View style={styles.methodsCard}>
          <Text style={styles.sectionLabel}>PHƯƠNG THỨC LIÊN KẾT</Text>
          <View style={styles.methodItem}>
            <View style={styles.methodLeft}>
              <Text style={styles.methodIcon}>🏦</Text>
              <View>
                <Text style={styles.methodName}>VietQR / Chuyển khoản ngân hàng</Text>
                <Text style={styles.methodSub}>Miễn phí giao dịch</Text>
              </View>
            </View>
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>Mặc định</Text>
            </View>
          </View>
        </View>

        <View style={styles.historySection}>
          <Text style={styles.sectionLabel}>LỊCH SỬ GIAO DỊCH GẦN ĐÂY</Text>
          <FlatList
            contentContainerStyle={styles.historyList}
            data={mockTransactions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isPositive = item.amount > 0;
              return (
                <View style={styles.txRow}>
                  <View style={styles.txLeft}>
                    <Text style={styles.txIcon}>{item.type === 'TOPUP' ? '📥' : '📤'}</Text>
                    <View style={styles.txMeta}>
                      <Text numberOfLines={1} style={styles.txTitle}>
                        {item.title}
                      </Text>
                      <Text style={styles.txDate}>
                        {item.createdAtLabel} {item.orderReference ? `· ${item.orderReference}` : ''}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.txAmount, isPositive ? styles.txAmountPositive : null]}>
                    {isPositive ? '+' : ''}
                    {formatCurrency(item.amount)}
                  </Text>
                </View>
              );
            }}
          />
        </View>
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.md,
  },
  balanceCard: {
    backgroundColor: pastelTheme.greenCard.bg,
    borderColor: pastelTheme.greenCard.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  balanceEyebrow: {
    color: pastelTheme.greenCard.text,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  balanceAmount: {
    color: pastelTheme.greenCard.accent,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: pastelTheme.greenCard.accent,
    borderRadius: radius.control,
    flex: 1,
    paddingVertical: 10,
  },
  actionButtonText: {
    color: colors.brand.text,
    fontSize: 13.5,
    fontWeight: '700',
  },
  actionButtonSecondary: {
    alignItems: 'center',
    backgroundColor: leopardPalette.bgMuted,
    borderRadius: radius.control,
    flex: 1,
    paddingVertical: 10,
  },
  actionButtonSecondaryText: {
    color: pastelTheme.greenCard.accent,
    fontSize: 13.5,
    fontWeight: '700',
  },
  topupCard: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  qrCard: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    alignItems: 'center',
  },
  qrCodeBox: {
    width: 200,
    height: 200,
    backgroundColor: leopardPalette.canvas,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: leopardPalette.cardBorder,
  },
  qrCodeIcon: {
    fontSize: 64,
  },
  qrCodeAmount: {
    marginTop: spacing.sm,
    fontSize: 18,
    fontWeight: '700',
    color: leopardPalette.textSlateDark,
  },
  qrInstructions: {
    textAlign: 'center',
    color: leopardPalette.textMutedSlate,
    fontSize: 13,
  },
  sectionLabel: {
    color: leopardPalette.textMutedSlate,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  presetItem: {
    backgroundColor: leopardPalette.canvas,
    borderRadius: radius.control,
    flexBasis: '48%',
    flexGrow: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  presetItemSelected: {
    backgroundColor: pastelTheme.blueCard.bg,
    borderColor: pastelTheme.blueCard.accent,
    borderWidth: 1.5,
  },
  presetText: {
    color: leopardPalette.textSlateDark,
    fontSize: 13.5,
    fontWeight: '700',
  },
  presetTextSelected: {
    color: pastelTheme.blueCard.accent,
  },
  methodsCard: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
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
  },
  methodIcon: {
    fontSize: 20,
  },
  methodName: {
    color: leopardPalette.textSlateDark,
    fontSize: 13.5,
    fontWeight: '600',
  },
  methodSub: {
    color: leopardPalette.textMutedSlate,
    fontSize: 11.5,
  },
  defaultBadge: {
    backgroundColor: pastelTheme.blueCard.bg,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  defaultBadgeText: {
    color: pastelTheme.blueCard.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  historySection: {
    gap: spacing.xs,
  },
  historyList: {
    gap: spacing.xxs,
    paddingBottom: spacing.xl,
  },
  txRow: {
    alignItems: 'center',
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.sm,
  },
  txLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minWidth: 0,
  },
  txIcon: {
    fontSize: 16,
  },
  txMeta: {
    flex: 1,
    minWidth: 0,
  },
  txTitle: {
    color: leopardPalette.textSlateDark,
    fontSize: 13,
    fontWeight: '600',
  },
  txDate: {
    color: leopardPalette.textMutedSlate,
    fontSize: 11,
  },
  txAmount: {
    color: leopardPalette.textSlateDark,
    fontSize: 13.5,
    fontWeight: '700',
  },
  txAmountPositive: {
    color: colors.success.text,
  },
});
