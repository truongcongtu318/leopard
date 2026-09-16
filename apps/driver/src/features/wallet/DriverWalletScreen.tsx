// apps/driver/src/features/wallet/DriverWalletScreen.tsx
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import {
  driverPrimitives,
  iosContinuousCurve,
  typeScale,
  Button,
  IconBank,
  IconChevronRight,
  IconTxPayment,
  IconWallet,
  NavigableMetricCard,
  ScreenState,
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

function CashIcon() {
  return (
    <View style={styles.cashIconCircle}>
      <Text style={styles.cashIconText}>$</Text>
    </View>
  );
}

function CreditIcon() {
  return (
    <View style={styles.creditIconCircle}>
      <Text style={styles.creditIconText}>G</Text>
    </View>
  );
}

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

function HelpCircleIcon({ size = 20, color = driverPrimitives.colors.gray900 }: { size?: number; color?: string }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16h-2v-2h2v2zm1.07-7.75l-.9.92C12.45 11.9 12 12.5 12 14h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"
        fill={color}
      />
    </Svg>
  );
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
    <View style={styles.screenRoot}>
      {/* ── Top Header (Image 3) ── */}
      <View style={styles.headerBar}>
        <Pressable
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => (router.canGoBack() ? router.back() : router.push('/orders'))}
          style={styles.headerActionBtn}
        >
          <BackArrowIcon />
        </Pressable>

        <Text accessibilityRole="header" style={styles.headerTitle}>
          Ví tài xế
        </Text>

        <Pressable accessibilityLabel="Trợ giúp" accessibilityRole="button" hitSlop={12} style={styles.headerActionBtn}>
          <HelpCircleIcon />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} style={styles.scrollWrap}>
        {isLoading ? (
          <ScreenState state="loading" />
        ) : isError ? (
          <ScreenState actionLabel="Thử lại" onAction={onRetry} state="error" />
        ) : (
          <>
            {/* ── Balance Card (Image 3) ── */}
            <View style={styles.walletCard} testID="driver-wallet-balance-card">
              <View style={styles.walletHeader}>
                <View style={styles.walletHeaderLeft}>
                  <CashIcon />
                  <View style={styles.walletTitleCol}>
                    <Text style={styles.balanceLabel}>Ví tiền mặt (Số dư khả dụng)</Text>
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

            {/* ── Linked Bank Accounts Card ── */}
            <View style={styles.bentoCard} testID="driver-linked-bank-card">
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <View style={styles.bankIconChip}>
                    <IconBank color={driverPrimitives.colors.gray900} size={16} />
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

            {/* ── Transaction History Section ── */}
            <View style={styles.historySection}>
              <Text style={styles.sectionHeading}>Lịch sử giao dịch</Text>
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
                            <IconWallet color={driverPrimitives.colors.green500} size={18} />
                          ) : (
                            <IconTxPayment color={driverPrimitives.colors.gray500} size={18} />
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

      {/* ── Withdrawal Modal ── */}
      <Modal animationType="slide" onRequestClose={() => setShowWithdrawModal(false)} transparent visible={showWithdrawModal}>
        <Pressable onPress={() => setShowWithdrawModal(false)} style={styles.modalBackdrop}>
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.modalSheet}>
            <View style={styles.modalDragHandle} />
            <Text style={styles.modalTitle}>Yêu cầu rút tiền</Text>
            <Text style={styles.modalSubtitle}>Số dư khả dụng: {formatCurrency(summary.availableBalanceVnd)}</Text>

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
              <Text style={styles.inputLabel}>Tên chủ tài khoản</Text>
              <TextInput
                autoCapitalize="characters"
                onChangeText={setBankAccountName}
                placeholder="Nhập tên chủ tài khoản (không dấu)"
                placeholderTextColor={driverPrimitives.colors.gray400}
                style={styles.textInput}
                value={bankAccountName}
              />
            </View>

            <View style={styles.modalActions}>
              <Button
                disabled={isSubmittingWithdrawal}
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

      <FinanceBottomBar activeTab="wallet" onNavigate={(r) => router.push(r as never)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
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
  scrollWrap: {
    backgroundColor: driverPrimitives.colors.gray50,
    flex: 1,
  },
  scrollContent: {
    gap: 14,
    padding: 16,
    paddingBottom: 88,
  },

  walletCard: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: driverPrimitives.colors.gray200,
    borderRadius: 12,
    ...iosContinuousCurve,
    borderWidth: 1,
    gap: 12,
    padding: 16,
    ...driverPrimitives.shadows.sm,
  },
  walletHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  walletHeaderLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  walletTitleCol: {
    flex: 1,
  },
  cashIconCircle: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.green500,
    borderRadius: 9999,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  cashIconText: {
    color: driverPrimitives.colors.white,
    fontSize: 18,
    fontWeight: '800',
  },
  creditIconCircle: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.green50,
    borderRadius: 9999,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  creditIconText: {
    color: driverPrimitives.colors.green500,
    fontSize: 16,
    fontWeight: '800',
  },
  balanceLabel: {
    color: driverPrimitives.colors.gray700,
    fontSize: 13.5,
    fontWeight: '600',
  },
  balanceSubLabel: {
    color: driverPrimitives.colors.gray400,
    fontSize: 11,
    marginTop: 2,
  },
  balanceAmount: {
    color: driverPrimitives.colors.gray900,
    fontSize: 30,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },

  assetList: {
    backgroundColor: '#F8FAFC',
    borderColor: driverPrimitives.colors.gray200,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  assetItem: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  assetLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  assetTitle: {
    color: driverPrimitives.colors.gray900,
    fontSize: 13.5,
    fontWeight: '600',
  },
  assetDesc: {
    color: driverPrimitives.colors.gray500,
    fontSize: 11,
  },
  assetValue: {
    color: driverPrimitives.colors.gray900,
    fontSize: 14.5,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  balanceFooter: {
    borderTopColor: driverPrimitives.colors.gray200,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
  },
  balanceStat: {
    alignItems: 'center',
    gap: 2,
  },
  balanceStatLabel: {
    color: driverPrimitives.colors.gray500,
    fontSize: 11.5,
  },
  balanceStatValue: {
    color: driverPrimitives.colors.gray900,
    fontSize: 14.5,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  balanceStatDivider: {
    backgroundColor: driverPrimitives.colors.gray200,
    width: 1,
  },

  withdrawBtn: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.dark900,
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    marginTop: 4,
  },
  withdrawBtnPressed: {
    opacity: 0.85,
  },
  withdrawBtnText: {
    color: driverPrimitives.colors.white,
    fontSize: 15,
    fontWeight: '700',
  },

  bentoCard: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: driverPrimitives.colors.gray200,
    borderRadius: 12,
    ...iosContinuousCurve,
    borderWidth: 1,
    padding: 16,
    ...driverPrimitives.shadows.sm,
  },
  cardHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  bankIconChip: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.gray100,
    borderRadius: 6,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  bentoCardTitle: {
    color: driverPrimitives.colors.gray900,
    fontSize: 14.5,
    fontWeight: '700',
  },
  bentoCardSub: {
    color: driverPrimitives.colors.gray500,
    fontSize: 11.5,
  },
  bankDetailRow: {
    marginTop: 4,
  },
  bankInfoCol: {
    gap: 2,
  },
  bankNameText: {
    color: driverPrimitives.colors.gray900,
    fontSize: 14.5,
    fontWeight: '600',
  },
  bankAccountNumText: {
    color: driverPrimitives.colors.gray900,
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
  bankHolderText: {
    color: driverPrimitives.colors.gray500,
    fontSize: 11.5,
    fontWeight: '600',
  },
  unlinkedText: {
    color: driverPrimitives.colors.gray400,
    fontSize: 13,
  },

  utilitiesSection: {
    gap: 10,
  },
  sectionHeading: {
    color: driverPrimitives.colors.gray900,
    fontSize: 15.5,
    fontWeight: '700',
  },
  utilityCard: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.white,
    borderColor: driverPrimitives.colors.gray200,
    borderRadius: 12,
    ...iosContinuousCurve,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    ...driverPrimitives.shadows.sm,
  },
  utilityIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldIconWrap: {
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 9999,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  shieldEmoji: {
    fontSize: 16,
  },
  utilityInfo: {
    flex: 1,
    gap: 3,
  },
  utilityTitle: {
    color: driverPrimitives.colors.gray900,
    fontSize: 13.5,
    fontWeight: '600',
    lineHeight: 18,
  },
  utilityLink: {
    color: driverPrimitives.colors.green500,
    fontSize: 12.5,
    fontWeight: '700',
  },

  historySection: {
    gap: 10,
  },
  txList: {
    gap: 8,
  },
  txCard: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.white,
    borderColor: driverPrimitives.colors.gray200,
    borderRadius: 10,
    ...iosContinuousCurve,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
  txLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    gap: 10,
  },
  txIconChip: {
    alignItems: 'center',
    borderRadius: 6,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  txIconPositive: {
    backgroundColor: driverPrimitives.colors.green50,
  },
  txIconNegative: {
    backgroundColor: driverPrimitives.colors.gray100,
  },
  txInfo: {
    flex: 1,
    gap: 2,
  },
  txTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  txTitle: {
    color: driverPrimitives.colors.gray900,
    fontSize: 13,
    fontWeight: '600',
  },
  txIndicatorBadge: {
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  badgePayout: {
    backgroundColor: '#DCFCE7',
  },
  badgeFee: {
    backgroundColor: '#F1F5F9',
  },
  badgeWithdrawal: {
    backgroundColor: '#FEE2E2',
  },
  txIndicatorText: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgeTextPayout: {
    color: '#15803D',
  },
  badgeTextFee: {
    color: '#475569',
  },
  badgeTextWithdrawal: {
    color: '#B91C1C',
  },
  txTime: {
    color: driverPrimitives.colors.gray400,
    fontSize: 11,
  },
  txRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  txAmountPositive: {
    color: driverPrimitives.colors.green500,
  },
  txAmountNegative: {
    color: driverPrimitives.colors.gray900,
  },
  txStatus: {
    color: driverPrimitives.colors.gray400,
    fontSize: 11,
  },

  modalBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: driverPrimitives.colors.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    gap: 12,
    padding: 20,
  },
  modalDragHandle: {
    alignSelf: 'center',
    backgroundColor: driverPrimitives.colors.gray300,
    borderRadius: 2,
    height: 4,
    marginBottom: 4,
    width: 36,
  },
  modalTitle: {
    color: driverPrimitives.colors.gray900,
    fontSize: 17,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: driverPrimitives.colors.gray500,
    fontSize: 12.5,
  },
  inputGroup: {
    gap: 5,
  },
  inputLabel: {
    color: driverPrimitives.colors.gray700,
    fontSize: 12.5,
    fontWeight: '600',
  },
  textInput: {
    borderColor: driverPrimitives.colors.gray200,
    borderRadius: 8,
    borderWidth: 1,
    color: driverPrimitives.colors.gray900,
    fontSize: 14.5,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  errorText: {
    color: driverPrimitives.colors.red500,
    fontSize: 12.5,
  },
  modalActions: {
    gap: 8,
    marginTop: 6,
  },
});
