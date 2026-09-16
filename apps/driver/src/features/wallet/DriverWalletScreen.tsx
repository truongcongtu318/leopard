// apps/driver/src/features/wallet/DriverWalletScreen.tsx
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  driverPrimitives,
  iosContinuousCurve,
  Button,
  IconBank,
  IconChevronRight,
  IconTxPayment,
  IconWallet,
  NavigableMetricCard,
  ScreenState,
  ScreenScaffold,
  IconSupport247,
} from '@leopard/mobile-core';
import { FinanceBottomBar } from '../finance/FinanceBottomBar';
import type { WalletSummary, WithdrawalHistoryItem, WithdrawalRequestInput } from './adapter';

export type DriverWalletScreenProps = Readonly<{
  summary: WalletSummary;
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
  history,
  isError,
  isLoading,
  isSubmittingWithdrawal,
  onRetry,
  onRequestWithdrawal,
  summary,
  withdrawalError,
}: DriverWalletScreenProps) {
  const router = useRouter();
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
    <ScreenScaffold
      headerRight={
        <Pressable
          accessibilityLabel="Trợ giúp"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.push('/chat')}
          style={styles.headerActionBtn}
        >
          <IconSupport247 color={driverPrimitives.colors.gray700} size={20} />
        </Pressable>
      }
      headerTone="plain"
      onBack={() => (router.canGoBack() ? router.back() : router.push('/orders'))}
      stickyFooter={
        <FinanceBottomBar activeTab="wallet" onNavigate={(r) => router.push(r as never)} />
      }
      title="Ví tài xế"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.scrollWrap}
      >
        {isLoading ? (
          <ScreenState state="loading" />
        ) : isError ? (
          <ScreenState actionLabel="Thử lại" onAction={onRetry} state="error" />
        ) : (
          <>
            {/* ── 1. Balance Bento Card (Apple White Minimal) ── */}
            <View style={styles.walletCard} testID="driver-wallet-balance-card">
              <View style={styles.walletHeader}>
                <View style={styles.walletHeaderLeft}>
                  <View style={styles.walletIconBox}>
                    <IconWallet color={driverPrimitives.colors.gray700} size={20} />
                  </View>
                  <View style={styles.walletTitleCol}>
                    <Text style={styles.balanceLabel}>Ví tiền mặt (Số dư khả dụng)</Text>
                    <Text style={styles.balanceSubLabel}>
                      Yêu cầu rút tiền — Admin xác nhận trong giờ hành chính
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.balanceAmount}>{formatCurrency(summary.availableBalanceVnd)}</Text>

              <View style={styles.balanceFooter}>
                <View style={styles.balanceStat}>
                  <Text style={styles.balanceStatLabel}>Đang chờ duyệt</Text>
                  <Text style={styles.balanceStatValue}>
                    {formatCurrency(summary.pendingWithdrawalVnd)}
                  </Text>
                </View>
                <View style={styles.balanceStatDivider} />
                <View style={styles.balanceStat}>
                  <Text style={styles.balanceStatLabel}>Tổng đã kiếm</Text>
                  <Text style={styles.balanceStatValue}>
                    {formatCurrency(summary.lifetimeDeliveredVnd)}
                  </Text>
                </View>
              </View>

              <Pressable
                accessibilityLabel="Yêu cầu rút tiền"
                accessibilityRole="button"
                onPress={handleOpenModal}
                style={({ pressed }) => [styles.withdrawBtn, pressed ? styles.withdrawBtnPressed : null]}
                testID="btn-request-withdrawal"
              >
                <Text style={styles.withdrawBtnText}>Yêu cầu rút tiền</Text>
              </Pressable>
            </View>

            {/* ── 2. Linked Bank Account Card (Apple Inset Grouped) ── */}
            <View style={styles.bentoCard} testID="driver-linked-bank-card">
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <View style={styles.bankIconChip}>
                    <IconBank color={driverPrimitives.colors.gray700} size={18} />
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

            {/* ── 3. Transaction History Section ── */}
            <View style={styles.historySection}>
              <Text style={styles.sectionHeading}>Lịch sử giao dịch</Text>

              {history.length === 0 ? (
                <View style={styles.emptyHistoryCard}>
                  <Text style={styles.emptyHistoryText}>Chưa có giao dịch rút tiền nào</Text>
                </View>
              ) : (
                <View style={styles.txGroupCard}>
                  {history.map((item, index) => {
                    const isPayout = item.type === 'ORDER_PAYOUT';
                    const isFee = item.type === 'PLATFORM_FEE';
                    const badgeLabel = isPayout ? '+cước' : isFee ? '-phí sàn' : '-rút tiền';
                    const amountPrefix = isPayout ? '+' : '-';
                    const itemTitle =
                      item.title ??
                      (isPayout
                        ? 'Cước chuyến hoàn thành'
                        : isFee
                        ? 'Phí sàn nền tảng'
                        : `Rút tiền về ${item.bankName ?? 'ngân hàng'}`);

                    return (
                      <React.Fragment key={item.id}>
                        <View style={styles.txItemRow}>
                          <View style={styles.txLeft}>
                            <View style={styles.txIconChip}>
                              {isPayout ? (
                                <IconWallet color={driverPrimitives.colors.gray700} size={18} />
                              ) : (
                                <IconTxPayment color={driverPrimitives.colors.gray700} size={18} />
                              )}
                            </View>
                            <View style={styles.txInfo}>
                              <View style={styles.txTitleRow}>
                                <Text style={styles.txTitle}>{itemTitle}</Text>
                                <View style={styles.txIndicatorBadge}>
                                  <Text style={styles.txIndicatorText}>{badgeLabel}</Text>
                                </View>
                              </View>
                              <Text style={styles.txTime}>
                                {new Date(item.createdAt).toLocaleString('vi-VN')}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.txRight}>
                            <Text style={styles.txAmount}>
                              {amountPrefix}
                              {formatCurrency(item.amountVnd)}
                            </Text>
                            <Text style={styles.txStatus}>
                              {STATUS_LABELS[item.status] ?? item.status}
                            </Text>
                          </View>
                        </View>
                        {index < history.length - 1 ? <View style={styles.txDivider} /> : null}
                      </React.Fragment>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Withdrawal Modal ── */}
      <Modal
        animationType="slide"
        onRequestClose={() => setShowWithdrawModal(false)}
        transparent
        visible={showWithdrawModal}
      >
        <Pressable onPress={() => setShowWithdrawModal(false)} style={styles.modalBackdrop}>
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.modalSheet}>
            <View style={styles.modalDragHandle} />
            <Text style={styles.modalTitle}>Yêu cầu rút tiền</Text>
            <Text style={styles.modalSubtitle}>
              Số dư khả dụng: {formatCurrency(summary.availableBalanceVnd)}
            </Text>

            {validationError ? <Text style={styles.errorText}>{validationError}</Text> : null}
            {withdrawalError ? <Text style={styles.errorText}>{withdrawalError}</Text> : null}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Số tiền rút (₫)</Text>
              <TextInput
                keyboardType="numeric"
                onChangeText={setAmountText}
                placeholder="Nhập số tiền"
                placeholderTextColor={driverPrimitives.colors.gray400}
                style={styles.textInput}
                value={amountText}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Ngân hàng thụ hưởng</Text>
              <TextInput
                onChangeText={setBankName}
                placeholder="VD: MB Bank"
                placeholderTextColor={driverPrimitives.colors.gray400}
                style={styles.textInput}
                value={bankName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Số tài khoản</Text>
              <TextInput
                keyboardType="numeric"
                onChangeText={setBankAccountNumber}
                placeholder="Nhập số tài khoản"
                placeholderTextColor={driverPrimitives.colors.gray400}
                style={styles.textInput}
                value={bankAccountNumber}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tên chủ tài khoản (viết hoa không dấu)</Text>
              <TextInput
                autoCapitalize="characters"
                onChangeText={setBankAccountName}
                placeholder="Nhập tên chủ tài khoản (không dấu)"
                placeholderTextColor={driverPrimitives.colors.gray400}
                style={styles.textInput}
                value={bankAccountName}
              />
            </View>

            <View style={styles.modalActionButtons}>
              <Button
                disabled={isSubmittingWithdrawal}
                isLoading={isSubmittingWithdrawal}
                label={isSubmittingWithdrawal ? 'Đang gửi...' : 'Gửi yêu cầu rút tiền'}
                onPress={handleSubmit}
                size="driver-primary"
                variant="primary"
              />
              <Button
                disabled={isSubmittingWithdrawal}
                label="Hủy"
                onPress={() => setShowWithdrawModal(false)}
                size="driver-primary"
                variant="secondary"
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  headerActionBtn: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  scrollWrap: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  scrollContent: {
    gap: 16,
    paddingHorizontal: 0,
    paddingVertical: 12,
    paddingBottom: 48,
  },

  /* Balance Card */
  walletCard: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    ...iosContinuousCurve,
    borderWidth: 1,
    gap: 14,
    padding: 16,
    ...driverPrimitives.shadows.sm,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  walletHeaderLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    flex: 1,
  },
  walletIconBox: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 10,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  walletTitleCol: {
    flex: 1,
    gap: 2,
  },
  balanceLabel: {
    color: driverPrimitives.colors.gray900,
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  balanceSubLabel: {
    color: driverPrimitives.colors.gray500,
    fontSize: 11.5,
    lineHeight: 16,
  },
  balanceAmount: {
    color: driverPrimitives.colors.gray900,
    fontSize: 32,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  balanceFooter: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  balanceStat: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  balanceStatLabel: {
    color: driverPrimitives.colors.gray500,
    fontSize: 11.5,
    fontWeight: '500',
  },
  balanceStatValue: {
    color: driverPrimitives.colors.gray900,
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  balanceStatDivider: {
    backgroundColor: '#E2E8F0',
    height: '100%',
    width: 1,
  },
  withdrawBtn: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.dark950,
    borderRadius: 14,
    ...iosContinuousCurve,
    height: 48,
    justifyContent: 'center',
    marginTop: 2,
  },
  withdrawBtnPressed: {
    opacity: 0.85,
  },
  withdrawBtnText: {
    color: driverPrimitives.colors.white,
    fontSize: 15,
    fontWeight: '700',
  },

  /* Linked Bank Account Card */
  bentoCard: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    ...iosContinuousCurve,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    ...driverPrimitives.shadows.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  bankIconChip: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 10,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  bentoCardTitle: {
    color: driverPrimitives.colors.gray900,
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  bentoCardSub: {
    color: driverPrimitives.colors.gray500,
    fontSize: 11.5,
  },
  bankDetailRow: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  bankInfoCol: {
    gap: 3,
  },
  bankNameText: {
    color: driverPrimitives.colors.gray500,
    fontSize: 12,
    fontWeight: '600',
  },
  bankAccountNumText: {
    color: driverPrimitives.colors.gray900,
    fontSize: 17,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  bankHolderText: {
    color: driverPrimitives.colors.gray700,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  unlinkedText: {
    color: driverPrimitives.colors.gray400,
    fontSize: 13,
    paddingVertical: 4,
  },

  /* Transaction History */
  historySection: {
    gap: 8,
  },
  sectionHeading: {
    color: driverPrimitives.colors.gray900,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
    paddingHorizontal: 4,
  },
  emptyHistoryCard: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyHistoryText: {
    color: driverPrimitives.colors.gray400,
    fontSize: 13,
    fontWeight: '500',
  },
  txGroupCard: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    ...iosContinuousCurve,
    borderWidth: 1,
    overflow: 'hidden',
    ...driverPrimitives.shadows.sm,
  },
  txItemRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  txLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    flex: 1,
  },
  txIconChip: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  txInfo: {
    flex: 1,
    gap: 2,
  },
  txTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  txTitle: {
    color: driverPrimitives.colors.gray900,
    fontSize: 13.5,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  txIndicatorBadge: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  txIndicatorText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '600',
  },
  txTime: {
    color: driverPrimitives.colors.gray400,
    fontSize: 11,
  },
  txRight: {
    alignItems: 'flex-end',
    gap: 2,
    paddingLeft: 8,
  },
  txAmount: {
    color: driverPrimitives.colors.gray900,
    fontSize: 14.5,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  txStatus: {
    color: driverPrimitives.colors.gray500,
    fontSize: 11,
    fontWeight: '500',
  },
  txDivider: {
    backgroundColor: driverPrimitives.colors.gray100,
    height: 1,
    marginLeft: 58,
  },

  /* Modal Sheet */
  modalBackdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: driverPrimitives.colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 12,
    maxHeight: '90%',
    padding: 20,
    paddingBottom: 36,
  },
  modalDragHandle: {
    alignSelf: 'center',
    backgroundColor: driverPrimitives.colors.gray300,
    borderRadius: 3,
    height: 4,
    marginBottom: 4,
    width: 36,
  },
  modalTitle: {
    color: driverPrimitives.colors.gray900,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    color: driverPrimitives.colors.gray500,
    fontSize: 13,
    marginBottom: 4,
  },
  errorText: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: 8,
    borderWidth: 1,
    color: driverPrimitives.colors.red600,
    fontSize: 12,
    fontWeight: '500',
    padding: 8,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    color: driverPrimitives.colors.gray700,
    fontSize: 12,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 10,
    borderWidth: 1,
    color: driverPrimitives.colors.gray900,
    fontSize: 14,
    fontWeight: '500',
    height: 44,
    paddingHorizontal: 12,
  },
  modalActionButtons: {
    gap: 8,
    marginTop: 8,
  },
});
