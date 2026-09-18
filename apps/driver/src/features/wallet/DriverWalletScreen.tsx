// apps/driver/src/features/wallet/DriverWalletScreen.tsx
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  Badge,
  Box,
  Button,
  Card,
  Divider,
  HStack,
  IconBank,
  IconChevronRight,
  IconSupport247,
  IconTxPayment,
  IconWallet,
  NavigableMetricCard,
  ScreenScaffold,
  ScreenState,
  VStack,
  colors,
  driverPrimitives,
  iosContinuousCurve,
  radius,
  spacing,
  typeScale,
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
  onTopupWallet?: (amountVnd: number) => Promise<any>;
  isSubmittingTopup?: boolean;
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
  onTopupWallet,
  isSubmittingTopup,
  summary,
  withdrawalError,
}: DriverWalletScreenProps) {
  const router = useRouter();
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupQrData, setTopupQrData] = useState<any>(null);
  const [topupAmount, setTopupAmount] = useState<number>(100000);
  const [customTopupText, setCustomTopupText] = useState('');
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
      headerTone="plain"
      onBack={() => (router.canGoBack() ? router.back() : router.push('/orders'))}
      stickyFooterBleed
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
            <Card style={styles.walletCard} testID="driver-wallet-balance-card">
              <HStack style={styles.walletHeader}>
                <HStack style={styles.walletHeaderLeft}>
                  <Box style={styles.walletIconBox}>
                    <IconWallet color={driverPrimitives.colors.gray700} size={20} />
                  </Box>
                  <VStack style={styles.walletTitleCol}>
                    <Text style={styles.balanceLabel}>Ví tiền mặt (Số dư khả dụng)</Text>
                    <Text style={styles.balanceSubLabel}>
                      Yêu cầu rút tiền — Admin xác nhận trong giờ hành chính
                    </Text>
                  </VStack>
                </HStack>
              </HStack>

              <Text style={styles.balanceAmount}>{formatCurrency(summary.availableBalanceVnd)}</Text>

              <HStack style={styles.balanceFooter}>
                <VStack style={styles.balanceStat}>
                  <Text style={styles.balanceStatLabel}>Đang chờ duyệt</Text>
                  <Text style={styles.balanceStatValue}>
                    {formatCurrency(summary.pendingWithdrawalVnd)}
                  </Text>
                </VStack>
                <Divider orientation="vertical" style={styles.balanceStatDivider} />
                <VStack style={styles.balanceStat}>
                  <Text style={styles.balanceStatLabel}>Tổng đã kiếm</Text>
                  <Text style={styles.balanceStatValue}>
                    {formatCurrency(summary.lifetimeDeliveredVnd)}
                  </Text>
                </VStack>
              </HStack>

              <HStack style={{ gap: 8, marginTop: 12 }}>
                <Pressable
                  accessibilityLabel="Nạp tiền ví"
                  accessibilityRole="button"
                  onPress={() => {
                    setTopupQrData(null);
                    setShowTopupModal(true);
                  }}
                  style={({ pressed }) => [styles.topupBtn, pressed ? styles.withdrawBtnPressed : null]}
                  testID="btn-topup-wallet"
                >
                  <Text style={styles.topupBtnText}>Nạp tiền ví</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel="Yêu cầu rút tiền"
                  accessibilityRole="button"
                  onPress={handleOpenModal}
                  style={({ pressed }) => [styles.withdrawBtn, pressed ? styles.withdrawBtnPressed : null, { flex: 1 }]}
                  testID="btn-request-withdrawal"
                >
                  <Text style={styles.withdrawBtnText}>Yêu cầu rút tiền</Text>
                </Pressable>
              </HStack>
            </Card>

            {/* ── 2. Linked Bank Account Card (Apple Inset Grouped) ── */}
            <Pressable
              accessibilityHint="Mở trang chỉnh sửa và quản lý tài khoản thụ hưởng"
              accessibilityLabel="Quản lý tài khoản ngân hàng thụ hưởng"
              accessibilityRole="button"
              onPress={() => router.push('/wallet/bank-accounts')}
            >
              <Card style={styles.bentoCard} testID="driver-linked-bank-card">
                <HStack style={styles.cardHeaderRow}>
                  <HStack style={styles.cardHeaderLeft}>
                    <Box style={styles.bankIconChip}>
                      <IconBank color={driverPrimitives.colors.gray700} size={18} />
                    </Box>
                    <VStack>
                      <Text style={styles.bentoCardTitle}>Tài khoản liên kết</Text>
                      <Text style={styles.bentoCardSub}>Nhận tiền thanh toán và rút số dư</Text>
                    </VStack>
                  </HStack>
                  <IconChevronRight color={driverPrimitives.colors.gray400} size={16} />
                </HStack>

                {summary.bankAccountNumber ? (
                  <HStack style={styles.bankDetailRow}>
                    <VStack style={styles.bankInfoCol}>
                      <Text style={styles.bankNameText}>{summary.bankName ?? 'Ngân hàng'}</Text>
                      <Text style={styles.bankAccountNumText}>{summary.bankAccountNumber}</Text>
                      {summary.bankAccountName ? (
                        <Text style={styles.bankHolderText}>{summary.bankAccountName.toUpperCase()}</Text>
                      ) : null}
                    </VStack>
                  </HStack>
                ) : (
                  <Text style={styles.unlinkedText}>Chưa liên kết tài khoản ngân hàng</Text>
                )}
              </Card>
            </Pressable>

            {/* ── 3. Transaction History Section ── */}
            <VStack style={styles.historySection}>
              <Text style={styles.sectionHeading}>Lịch sử giao dịch</Text>

              {history.length === 0 ? (
                <Card style={styles.emptyHistoryCard}>
                  <Text style={styles.emptyHistoryText}>Chưa có giao dịch rút tiền nào</Text>
                </Card>
              ) : (
                <Card style={styles.txGroupCard}>
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
                        <HStack style={styles.txItemRow}>
                          <HStack style={styles.txLeft}>
                            <Box style={styles.txIconChip}>
                              {isPayout ? (
                                <IconWallet color={driverPrimitives.colors.gray700} size={18} />
                              ) : (
                                <IconTxPayment color={driverPrimitives.colors.gray700} size={18} />
                              )}
                            </Box>
                            <VStack style={styles.txInfo}>
                              <HStack style={styles.txTitleRow}>
                                <Text style={styles.txTitle}>{itemTitle}</Text>
                                <Badge action={isPayout ? 'success' : 'muted'} size="sm" style={styles.txIndicatorBadge}>
                                  <Badge.Text style={styles.txIndicatorText}>{badgeLabel}</Badge.Text>
                                </Badge>
                              </HStack>
                              <Text style={styles.txTime}>
                                {new Date(item.createdAt).toLocaleString('vi-VN')}
                              </Text>
                            </VStack>
                          </HStack>

                          <VStack style={styles.txRight}>
                            <Text style={styles.txAmount}>
                              {amountPrefix}
                              {formatCurrency(item.amountVnd)}
                            </Text>
                            <Text style={styles.txStatus}>
                              {STATUS_LABELS[item.status] ?? item.status}
                            </Text>
                          </VStack>
                        </HStack>
                        {index < history.length - 1 ? <Divider style={styles.txDivider} /> : null}
                      </React.Fragment>
                    );
                  })}
                </Card>
              )}
            </VStack>
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

      {/* ── Top-up Modal (payOS VietQR) ── */}
      <Modal
        animationType="slide"
        onRequestClose={() => setShowTopupModal(false)}
        transparent
        visible={showTopupModal}
      >
        <Pressable onPress={() => setShowTopupModal(false)} style={styles.modalBackdrop}>
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.modalSheet}>
            <View style={styles.modalDragHandle} />
            <Text style={styles.modalTitle}>Nạp tiền vào ví tài xế</Text>
            <Text style={styles.modalSubtitle}>
              Cổng thanh toán tự động VietQR payOS
            </Text>

            {!topupQrData ? (
              <>
                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Chọn số tiền nạp</Text>
                <HStack style={{ gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  {[50000, 100000, 200000, 500000].map((amt) => (
                    <Pressable
                      key={amt}
                      onPress={() => {
                        setTopupAmount(amt);
                        setCustomTopupText('');
                      }}
                      style={[
                        styles.topupPill,
                        topupAmount === amt && !customTopupText ? styles.topupPillActive : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.topupPillText,
                          topupAmount === amt && !customTopupText ? styles.topupPillTextActive : null,
                        ]}
                      >
                        {formatCurrency(amt)}
                      </Text>
                    </Pressable>
                  ))}
                </HStack>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Hoặc nhập số tiền khác (tối thiểu 50.000 ₫)</Text>
                  <TextInput
                    keyboardType="numeric"
                    onChangeText={(t) => {
                      setCustomTopupText(t);
                      const parsed = parseInt(t.replace(/\D/g, ''), 10);
                      if (!Number.isNaN(parsed)) setTopupAmount(parsed);
                    }}
                    placeholder="VD: 150000"
                    placeholderTextColor={driverPrimitives.colors.gray400}
                    style={styles.textInput}
                    value={customTopupText}
                  />
                </View>

                <View style={styles.modalActionButtons}>
                  <Button
                    disabled={isSubmittingTopup || topupAmount < 50000}
                    isLoading={isSubmittingTopup}
                    label={isSubmittingTopup ? 'Đang tạo mã...' : `Nạp ${formatCurrency(topupAmount)}`}
                    onPress={async () => {
                      if (onTopupWallet) {
                        const res = await onTopupWallet(topupAmount);
                        if (res?.qrPayload) setTopupQrData(res);
                      }
                    }}
                    size="driver-primary"
                    variant="primary"
                  />
                  <Button
                    disabled={isSubmittingTopup}
                    label="Hủy"
                    onPress={() => setShowTopupModal(false)}
                    size="driver-primary"
                    variant="secondary"
                  />
                </View>
              </>
            ) : (
              <VStack style={{ alignItems: 'center', gap: 16, paddingVertical: 12 }}>
                <Text style={{ ...typeScale.headline, color: '#059669', textAlign: 'center' }}>
                  Quét mã VietQR để nạp tiền
                </Text>
                <Text style={{ ...typeScale.subheadline, color: driverPrimitives.colors.gray700 }}>
                  Số tiền: {formatCurrency(topupQrData.amountVnd)}
                </Text>
                <View
                  style={{
                    backgroundColor: '#fff',
                    padding: 16,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ ...typeScale.caption1, color: driverPrimitives.colors.gray500, marginBottom: 8 }}>
                    Chuyển khoản chính xác số tiền bên trên
                  </Text>
                  <Text style={{ ...typeScale.caption2, color: driverPrimitives.colors.gray400, textAlign: 'center' }}>
                    Hệ thống sẽ tự động gạch nợ và cộng số dư ví sau vài giây
                  </Text>
                </View>
                <Button
                  label="Đã hoàn tất chuyển khoản"
                  onPress={() => {
                    setShowTopupModal(false);
                    setTopupQrData(null);
                    onRetry();
                  }}
                  size="driver-primary"
                  variant="primary"
                />
              </VStack>
            )}
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
    backgroundColor: colors.neutral.canvas,
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
    borderColor: colors.neutral.border,
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
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
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
    ...typeScale.subheadline,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  balanceSubLabel: {
    color: colors.neutral.mutedText,
    ...typeScale.caption2,
    lineHeight: 16,
  },
  balanceAmount: {
    color: driverPrimitives.colors.gray900,
    ...typeScale.title1,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  balanceFooter: {
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: spacing.xs,
  },
  balanceStat: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.hairline,
  },
  balanceStatLabel: {
    color: colors.neutral.mutedText,
    ...typeScale.caption2,
  },
  balanceStatValue: {
    color: driverPrimitives.colors.gray900,
    ...typeScale.footnote,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  balanceStatDivider: {
    backgroundColor: colors.neutral.border,
    height: '100%',
    width: 1,
  },
  withdrawBtn: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.dark950,
    borderRadius: radius.card,
    ...iosContinuousCurve,
    height: 48,
    justifyContent: 'center',
    marginTop: spacing.hairline,
  },
  withdrawBtnPressed: {
    opacity: 0.85,
  },
  withdrawBtnText: {
    color: driverPrimitives.colors.white,
    ...typeScale.callout,
    fontWeight: '600',
  },

  topupBtn: {
    alignItems: 'center',
    backgroundColor: '#059669',
    borderRadius: radius.control,
    ...iosContinuousCurve,
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  topupBtnText: {
    color: driverPrimitives.colors.white,
    ...typeScale.callout,
    fontWeight: '600',
  },
  topupPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  topupPillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  topupPillText: {
    ...typeScale.footnote,
    color: driverPrimitives.colors.gray700,
    fontWeight: '600',
  },
  topupPillTextActive: {
    color: '#059669',
  },

  /* Linked Bank Account Card */
  bentoCard: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardXl,
    ...iosContinuousCurve,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
    ...driverPrimitives.shadows.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs + 2,
  },
  bankIconChip: {
    alignItems: 'center',
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardSm,
    ...iosContinuousCurve,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  bentoCardTitle: {
    color: driverPrimitives.colors.gray900,
    ...typeScale.subheadline,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  bentoCardSub: {
    color: colors.neutral.mutedText,
    ...typeScale.caption2,
  },
  bankDetailRow: {
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    borderWidth: 1,
    padding: spacing.sm,
  },
  bankInfoCol: {
    gap: spacing.hairline + 1,
  },
  bankNameText: {
    color: colors.neutral.mutedText,
    ...typeScale.caption1,
    fontWeight: '600',
  },
  bankAccountNumText: {
    color: driverPrimitives.colors.gray900,
    ...typeScale.headline,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  bankHolderText: {
    color: driverPrimitives.colors.gray700,
    ...typeScale.caption1,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  unlinkedText: {
    color: colors.neutral.mutedText,
    ...typeScale.footnote,
    paddingVertical: spacing.xxs,
  },

  /* Transaction History */
  historySection: {
    gap: spacing.xs,
  },
  sectionHeading: {
    color: driverPrimitives.colors.gray900,
    ...typeScale.footnote,
    fontWeight: '600',
    letterSpacing: -0.2,
    paddingHorizontal: spacing.xxs,
  },
  emptyHistoryCard: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.white,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardXl,
    ...iosContinuousCurve,
    borderWidth: 1,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  emptyHistoryText: {
    color: colors.neutral.mutedText,
    ...typeScale.footnote,
  },
  txGroupCard: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardXl,
    ...iosContinuousCurve,
    borderWidth: 1,
    overflow: 'hidden',
    ...driverPrimitives.shadows.sm,
  },
  txItemRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 1,
  },
  txLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs + 2,
    flex: 1,
  },
  txIconChip: {
    alignItems: 'center',
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardSm - 2,
    ...iosContinuousCurve,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  txInfo: {
    flex: 1,
    gap: spacing.hairline,
  },
  txTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  txTitle: {
    color: driverPrimitives.colors.gray900,
    ...typeScale.footnote,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  txIndicatorBadge: {
    backgroundColor: colors.neutral.surfaceMuted,
    borderColor: colors.neutral.border,
    borderRadius: spacing.xxs,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  txIndicatorText: {
    color: colors.neutral.mutedText,
    ...typeScale.caption2,
    fontWeight: '600',
  },
  txTime: {
    color: colors.neutral.mutedText,
    ...typeScale.caption2,
  },
  txRight: {
    alignItems: 'flex-end',
    gap: spacing.hairline,
    paddingLeft: spacing.xs,
  },
  txAmount: {
    color: driverPrimitives.colors.gray900,
    ...typeScale.subheadline,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  txStatus: {
    color: colors.neutral.mutedText,
    ...typeScale.caption2,
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
    borderTopLeftRadius: radius.modal,
    borderTopRightRadius: radius.modal,
    ...iosContinuousCurve,
    gap: spacing.sm,
    maxHeight: '90%',
    padding: spacing.md + 4,
    paddingBottom: spacing.xl + 4,
  },
  modalDragHandle: {
    alignSelf: 'center',
    backgroundColor: driverPrimitives.colors.gray300,
    borderRadius: spacing.hairline + 1,
    height: 4,
    marginBottom: spacing.xxs,
    width: 36,
  },
  modalTitle: {
    color: driverPrimitives.colors.gray900,
    ...typeScale.title3,
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    color: colors.neutral.mutedText,
    ...typeScale.footnote,
    marginBottom: spacing.xxs,
  },
  errorText: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: radius.cardSm - 2,
    borderWidth: 1,
    color: driverPrimitives.colors.red600,
    ...typeScale.caption1,
    padding: spacing.xs,
  },
  inputGroup: {
    gap: spacing.xxs,
  },
  inputLabel: {
    color: driverPrimitives.colors.gray700,
    ...typeScale.caption1,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardSm,
    ...iosContinuousCurve,
    borderWidth: 1,
    color: driverPrimitives.colors.gray900,
    ...typeScale.footnote,
    height: 44,
    paddingHorizontal: spacing.sm,
  },
  modalActionButtons: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
});
