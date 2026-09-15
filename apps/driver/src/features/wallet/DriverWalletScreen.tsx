// apps/driver/src/features/wallet/DriverWalletScreen.tsx
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, leopardPalette, radius, spacing, Button, IconBank, IconTxPayment, IconWallet, ScreenScaffold, ScreenState } from '@leopard/mobile-core';
import type { WalletSummary, WithdrawalHistoryItem, WithdrawalRequestInput } from './adapter';

export type DriverWalletScreenProps = Readonly<{
  summary: WalletSummary;
  /** Withdrawal requests only — completed-order earnings have their own,
   * already-built list on DriverHistoryScreen; not duplicated here. */
  history: readonly WithdrawalHistoryItem[];
  isLoading: boolean;
  isError: boolean;
  isSubmittingWithdrawal: boolean;
  withdrawalError: string | null;
  onRequestWithdrawal: (input: WithdrawalRequestInput) => void;
  onRetry: () => void;
}>;

const STATUS_LABELS: Readonly<Record<WithdrawalHistoryItem['status'], string>> = {
  PENDING: 'Đang chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Bị từ chối',
};

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
}

export function DriverWalletScreen({
  summary,
  history,
  isLoading,
  isError,
  isSubmittingWithdrawal,
  withdrawalError,
  onRequestWithdrawal,
  onRetry,
}: DriverWalletScreenProps) {
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [amountText, setAmountText] = useState('');
  const [bankName, setBankName] = useState(summary.bankName ?? '');
  const [bankAccountNumber, setBankAccountNumber] = useState(summary.bankAccountNumber ?? '');
  const [bankAccountName, setBankAccountName] = useState(summary.bankAccountName ?? '');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleOpenModal = () => {
    setAmountText('');
    setBankName(summary.bankName ?? '');
    setBankAccountNumber(summary.bankAccountNumber ?? '');
    setBankAccountName(summary.bankAccountName ?? '');
    setValidationError(null);
    setShowWithdrawModal(true);
  };

  const handleSubmit = () => {
    const amountVnd = parseInt(amountText.replace(/[^0-9]/g, ''), 10);
    if (!amountVnd || isNaN(amountVnd) || amountVnd <= 0) {
      setValidationError('Vui lòng nhập số tiền rút lớn hơn 0');
      return;
    }
    if (amountVnd > summary.availableBalanceVnd) {
      setValidationError(
        `Số tiền rút không được vượt quá số dư khả dụng (${formatCurrency(summary.availableBalanceVnd)})`,
      );
      return;
    }
    setValidationError(null);
    onRequestWithdrawal({
      amountVnd,
      bankName: bankName.trim(),
      bankAccountNumber: bankAccountNumber.trim(),
      bankAccountName: bankAccountName.trim(),
    });
  };

  return (
    <ScreenScaffold eyebrow="DRIVER · WALLET & PAYOUT" headerTone="plain" title="Ví tài xế">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} style={styles.scrollWrap}>
        {isLoading ? <ScreenState state="loading" /> : isError ? (
          <ScreenState actionLabel="Thử lại" onAction={onRetry} state="error" />
        ) : (
          <>
            <View testID="driver-wallet-balance-card" style={styles.doubleBezelOuter}>
              <View style={styles.doubleBezelInner}>
                <View style={styles.balanceHeader}>
                  <View style={styles.balanceHeaderLeft}>
                    <View style={styles.walletIconChip}>
                      <IconWallet color="#10B981" size={18} />
                    </View>
                    <View>
                      <Text style={styles.balanceLabel}>Số dư khả dụng để rút</Text>
                      <Text style={styles.balanceSubLabel}>Yêu cầu rút tiền — Admin xác nhận trong giờ hành chính</Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.balanceAmount}>{formatCurrency(summary.availableBalanceVnd)}</Text>

                <View style={styles.balanceFooter}>
                  <View style={styles.balanceStat}>
                    <Text style={styles.balanceStatLabel}>Đang chờ duyệt</Text>
                    <Text style={styles.balanceStatValue}>{formatCurrency(summary.pendingWithdrawalVnd)}</Text>
                  </View>
                  <View style={styles.balanceStatDivider} />
                  <View style={styles.balanceStat}>
                    <Text style={styles.balanceStatLabel}>Tổng đã kiếm</Text>
                    <Text style={styles.balanceStatValue}>{formatCurrency(summary.lifetimeDeliveredVnd)}</Text>
                  </View>
                </View>

                <Button
                  testID="btn-request-withdrawal"
                  label="Yêu cầu rút tiền"
                  onPress={handleOpenModal}
                  size="driver-primary"
                  variant="primary"
                />
              </View>
            </View>

            {/* Linked Bank Accounts Bento Card */}
            <View testID="driver-linked-bank-card" style={styles.bentoCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <View style={styles.bankIconChip}>
                    <IconBank color="#0B1E42" size={16} />
                  </View>
                  <View>
                    <Text style={styles.bentoCardTitle}>Tài khoản liên kết</Text>
                    <Text style={styles.bentoCardSub}>Nhận tiền thanh toán và rút số dư</Text>
                  </View>
                </View>
              </View>
              {summary.bankAccountNumber ? (
                <View style={styles.bankDetailRow}>
                  <View style={styles.bankInfoCol}>
                    <Text style={styles.bankNameText}>{summary.bankName ?? 'Ngân hàng'}</Text>
                    <Text style={styles.bankAccountNumText}>{summary.bankAccountNumber}</Text>
                    {summary.bankAccountName ? (
                      <Text style={styles.bankHolderText}>{summary.bankAccountName.toUpperCase()}</Text>
                    ) : null}
                  </View>
                </View>
              ) : (
                <Text style={styles.unlinkedText}>Chưa liên kết tài khoản ngân hàng</Text>
              )}
            </View>

            <View style={styles.historySection}>
              <Text style={styles.sectionLabel}>Lịch sử giao dịch</Text>
              <View style={styles.txList}>
                {history.map((item) => {
                  const isPayout = item.type === 'ORDER_PAYOUT';
                  const isFee = item.type === 'PLATFORM_FEE';
                  const badgeLabel = isPayout ? '+cước' : isFee ? '-phí sàn' : '-rút tiền';
                  const badgeStyle = isPayout ? styles.badgePayout : isFee ? styles.badgeFee : styles.badgeWithdrawal;
                  const badgeTextStyle = isPayout ? styles.badgeTextPayout : isFee ? styles.badgeTextFee : styles.badgeTextWithdrawal;
                  const amountPrefix = isPayout ? '+' : '-';
                  const amountStyle = isPayout ? styles.txAmountPositive : styles.txAmountNegative;
                  const itemTitle = item.title ?? (isPayout ? 'Cước chuyến hoàn thành' : isFee ? 'Phí sàn nền tảng' : `Rút tiền về ${item.bankName ?? 'ngân hàng'}`);

                  return (
                    <View key={item.id} style={styles.txCard}>
                      <View style={styles.txLeft}>
                        <View style={[styles.txIconChip, isPayout ? styles.txIconPositive : styles.txIconNegative]}>
                          {isPayout ? (
                            <IconWallet color="#16A34A" size={18} />
                          ) : (
                            <IconTxPayment color={colors.neutral.mutedText} size={18} />
                          )}
                        </View>
                        <View style={styles.txInfo}>
                          <View style={styles.txTitleRow}>
                            <Text style={styles.txTitle}>{itemTitle}</Text>
                            <View style={[styles.txIndicatorBadge, badgeStyle]}>
                              <Text style={[styles.txIndicatorText, badgeTextStyle]}>{badgeLabel}</Text>
                            </View>
                          </View>
                          <Text style={styles.txTime}>{new Date(item.createdAt).toLocaleString('vi-VN')}</Text>
                        </View>
                      </View>
                      <View style={styles.txRight}>
                        <Text style={[styles.txAmount, amountStyle]}>
                          {amountPrefix}{formatCurrency(item.amountVnd)}
                        </Text>
                        <Text style={styles.txStatus}>{STATUS_LABELS[item.status] ?? item.status}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <Modal animationType="slide" onRequestClose={() => setShowWithdrawModal(false)} transparent visible={showWithdrawModal}>
        <Pressable onPress={() => setShowWithdrawModal(false)} style={styles.modalBackdrop}>
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.modalSheet}>
            <View style={styles.modalDragHandle} />
            <Text style={styles.modalTitle}>Yêu cầu rút tiền về tài khoản ngân hàng</Text>
            <Text style={styles.modalSub}>Admin sẽ xác nhận và chuyển khoản thủ công. Thời gian xử lý trong giờ hành chính.</Text>

            <View style={styles.modalBalanceInfo}>
              <Text style={styles.modalBalanceLabel}>Số dư khả dụng:</Text>
              <Text style={styles.modalBalanceValue}>{formatCurrency(summary.availableBalanceVnd)}</Text>
            </View>

            {validationError || withdrawalError ? (
              <Text style={styles.errorText}>{validationError || withdrawalError}</Text>
            ) : null}

            <Text style={styles.inputLabel}>Số tiền muốn rút (₫)</Text>
            <TextInput keyboardType="numeric" onChangeText={setAmountText} placeholder="Nhập số tiền" style={styles.amountInput} value={amountText} />

            <Text style={styles.inputLabel}>Tên ngân hàng</Text>
            <TextInput onChangeText={setBankName} placeholder="VD: MB Bank" style={styles.textInput} value={bankName} />

            <Text style={styles.inputLabel}>Số tài khoản</Text>
            <TextInput keyboardType="numeric" onChangeText={setBankAccountNumber} placeholder="Nhập số tài khoản" style={styles.textInput} value={bankAccountNumber} />

            <Text style={styles.inputLabel}>Tên chủ tài khoản</Text>
            <TextInput onChangeText={setBankAccountName} placeholder="Nhập tên chủ tài khoản (không dấu)" style={styles.textInput} value={bankAccountName} />

            <View style={styles.modalBtnRow}>
              <Button label="Hủy" onPress={() => setShowWithdrawModal(false)} variant="secondary" />
              <Button
                disabled={isSubmittingWithdrawal}
                label={isSubmittingWithdrawal ? 'Đang gửi...' : 'Gửi yêu cầu rút tiền'}
                onPress={handleSubmit}
                variant="primary"
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scrollWrap: { flex: 1, minHeight: 0 },
  scrollContent: { gap: spacing.md, paddingBottom: spacing.xl + 20 },
  doubleBezelOuter: {
    backgroundColor: '#0B1E42',
    borderRadius: radius.bezelOuter,
    padding: 3,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  doubleBezelInner: { backgroundColor: '#FFFFFF', borderRadius: radius.bezelInner, borderColor: '#E2E8F0', borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  balanceHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  balanceHeaderLeft: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  walletIconChip: { alignItems: 'center', backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', borderWidth: 1, borderRadius: radius.card, height: 34, justifyContent: 'center', width: 34 },
  balanceLabel: { color: '#0B1E42', fontSize: 12.5, fontWeight: '700' },
  balanceSubLabel: { color: leopardPalette.textMutedSlate, fontSize: 10.5, marginTop: 2, maxWidth: 220 },
  balanceAmount: { color: '#0B1E42', fontSize: 32, fontWeight: '800', fontVariant: ['tabular-nums'], marginVertical: 2 },
  balanceFooter: { borderBottomColor: colors.neutral.rowDivider, borderTopColor: colors.neutral.rowDivider, borderBottomWidth: 1, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing.xs, marginBottom: spacing.xxs },
  balanceStat: { alignItems: 'center', gap: 2 },
  balanceStatDivider: { backgroundColor: colors.neutral.rowDivider, width: 1 },
  balanceStatLabel: { color: colors.neutral.subtleText, fontSize: 11 },
  balanceStatValue: { color: '#0F172A', fontSize: 12.5, fontWeight: '700', fontVariant: ['tabular-nums'] },
  bentoCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: radius.cardXl,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  cardHeaderLeft: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  bankIconChip: { alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: radius.card, height: 32, justifyContent: 'center', width: 32 },
  bentoCardTitle: { color: '#0B1E42', fontSize: 13, fontWeight: '700' },
  bentoCardSub: { color: leopardPalette.textMutedSlate, fontSize: 10.5, marginTop: 1 },
  bankDetailRow: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderRadius: radius.card, borderWidth: 1, padding: spacing.sm },
  bankInfoCol: { gap: 2 },
  bankNameText: { color: '#0B1E42', fontSize: 13, fontWeight: '700' },
  bankAccountNumText: { color: colors.neutral.text, fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  bankHolderText: { color: leopardPalette.textMutedSlate, fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  unlinkedText: { color: leopardPalette.textMutedSlate, fontSize: 12, fontStyle: 'italic' },
  historySection: { gap: spacing.xs },
  sectionLabel: { color: leopardPalette.textMutedSlate, fontSize: 13, fontWeight: '700' },
  txList: { gap: spacing.xs },
  txCard: { alignItems: 'center', backgroundColor: colors.neutral.background, borderColor: colors.neutral.subtleBorder, borderRadius: radius.card, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', padding: spacing.sm },
  txLeft: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs, flex: 1 },
  txIconChip: { alignItems: 'center', borderRadius: radius.card, height: 36, justifyContent: 'center', width: 36 },
  txIconPositive: { backgroundColor: colors.success.background },
  txIconNegative: { backgroundColor: colors.neutral.surfaceMuted },
  txInfo: { flex: 1, gap: 2 },
  txTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  txTitle: { color: colors.neutral.titleText, fontSize: 13, fontWeight: '600' },
  txIndicatorBadge: { borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 2 },
  badgePayout: { backgroundColor: '#DCFCE7' },
  badgeFee: { backgroundColor: '#FEF3C7' },
  badgeWithdrawal: { backgroundColor: '#F1F5F9' },
  txIndicatorText: { fontSize: 10, fontWeight: '700' },
  badgeTextPayout: { color: '#166534' },
  badgeTextFee: { color: '#B45309' },
  badgeTextWithdrawal: { color: '#475569' },
  txTime: { color: colors.neutral.subtleText, fontSize: 11, fontVariant: ['tabular-nums'] },
  txRight: { alignItems: 'flex-end', gap: 2 },
  txAmount: { fontSize: 13.5, fontWeight: '700', fontVariant: ['tabular-nums'] },
  txAmountPositive: { color: colors.success.text },
  txAmountNegative: { color: colors.neutral.titleText },
  txStatus: { color: colors.neutral.subtleText, fontSize: 10.5 },
  modalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.6)', flex: 1, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.neutral.background, borderTopLeftRadius: radius.control, borderTopRightRadius: radius.control, gap: spacing.sm, maxWidth: 480, padding: spacing.lg, width: '100%' },
  modalDragHandle: { alignSelf: 'center', backgroundColor: colors.neutral.subtleBorder, borderRadius: 2, height: 4, marginBottom: spacing.xs, width: 40 },
  modalTitle: { color: colors.neutral.titleText, fontSize: 17, fontWeight: '800' },
  modalSub: { color: colors.neutral.mutedText, fontSize: 12.5, lineHeight: 18 },
  errorText: { color: '#DC2626', fontSize: 12.5, fontWeight: '600' },
  modalBalanceInfo: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  modalBalanceLabel: {
    color: colors.neutral.subtleText,
    fontSize: 12,
    fontWeight: '600',
  },
  modalBalanceValue: {
    color: '#0B1E42',
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  inputLabel: { color: colors.neutral.titleText, fontSize: 12, fontWeight: '700', marginTop: spacing.xs },
  amountInput: { borderColor: colors.neutral.subtleBorder, borderRadius: radius.card, borderWidth: 1, color: colors.neutral.titleText, fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'], paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  textInput: { borderColor: colors.neutral.subtleBorder, borderRadius: radius.card, borderWidth: 1, color: colors.neutral.titleText, fontSize: 14, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  modalBtnRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
});
