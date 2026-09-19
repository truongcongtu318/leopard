import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import {
  AppText,
  Badge,
  Box,
  Card,
  colors,
  control,
  customerPalette,
  haptic,
  hitSlop,
  httpClient,
  IconCheck,
  IconChevron,
  IconClose,
  IconEye,
  IconEyeOff,
  IconPlus,
  IconQrPayment,
  IconSecurityShield,
  IconTxPayment,
  IconTxRefund,
  IconTxTopup,
  IconWallet,
  iosContinuousCurve,
  layout,
  leopardElevation,
  leopardPalette,
  radius,
  ScreenScaffold,
  spacing,
  Spinner,
  typeScale,
} from '@leopard/mobile-core';
import { createCustomerHttpAdapter, formatOrderReference, formatVndPrice } from '../orders/adapter';
import type { CustomerOrderListItemView } from '../orders/model';
import type { CustomerOrdersPort } from '../orders/port';

export type EscrowStatus = 'PENDING' | 'HELD' | 'REFUNDED' | 'SETTLED' | 'FAILED';

export interface EscrowPaymentItem {
  id: string;
  orderId: string;
  orderReference: string;
  amount: number;
  status: EscrowStatus;
  statusLabel: string;
  createdAtLabel: string;
  title: string;
}

export type EscrowFilterType = 'ALL' | 'PENDING' | 'HELD' | 'SETTLED' | 'REFUNDED';

const filterTabs: readonly Readonly<{ id: EscrowFilterType; label: string }>[] = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'PENDING', label: 'Chờ thanh toán' },
  { id: 'HELD', label: 'Đã ký quỹ' },
  { id: 'SETTLED', label: 'Hoàn tất' },
  { id: 'REFUNDED', label: 'Hoàn cọc' },
];

export interface CustomerWithdrawalItem {
  id: string;
  amountVnd: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface CustomerWalletApiSummary {
  refundableBalanceVnd: number;
  totalHeldEscrowVnd: number;
  cancelledPaidAmount: number;
  pendingWithdrawalsVnd: number;
  approvedWithdrawalsVnd: number;
  withdrawalRequests: CustomerWithdrawalItem[];
}

export interface CustomerWalletScreenProps {
  ordersPort?: CustomerOrdersPort;
  fetchPaymentsForOrder?: (orderId: string) => Promise<PaymentIntentApiItem[]>;
  fetchWalletSummary?: () => Promise<CustomerWalletApiSummary>;
  requestWithdrawal?: (input: {
    amountVnd: number;
    bankName: string;
    bankAccountNumber: string;
    bankAccountName: string;
  }) => Promise<any>;
}

export interface PaymentIntentApiItem {
  id: string;
  orderId: string;
  status: string;
  amountVnd?: number;
  amount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export function CustomerWalletScreen({
  fetchPaymentsForOrder,
  fetchWalletSummary,
  ordersPort,
  requestWithdrawal,
}: CustomerWalletScreenProps = {}) {
  const router = useRouter();
  const port = useMemo(() => ordersPort ?? createCustomerHttpAdapter(), [ordersPort]);
  const [showBalance, setShowBalance] = useState(true);
  const [activeFilter, setActiveFilter] = useState<EscrowFilterType>('ALL');
  const [activeActionModal, setActiveActionModal] = useState<'withdraw' | 'policy' | null>(null);

  // Withdrawal form state
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const {
    data: walletSummary,
    refetch: refetchWallet,
  } = useQuery({
    queryKey: ['customer', 'wallet', 'summary', fetchWalletSummary],
    queryFn: async () => {
      if (fetchWalletSummary) {
        return fetchWalletSummary();
      }
      try {
        const res = await httpClient.get<CustomerWalletApiSummary>('/customer/wallet');
        return res;
      } catch {
        return null;
      }
    },
  });

  const {
    data: escrowItems = [],
    error,
    isError,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['customer', 'wallet', 'escrows'],
    queryFn: async () => {
      const listView = await port.getOrdersView('ALL');
      if (listView.kind !== 'content' || !listView.orders) {
        return [];
      }

      const orders = listView.orders;

      const itemsPerOrder = await Promise.all(
        orders.map(async (order: CustomerOrderListItemView): Promise<EscrowPaymentItem[]> => {
          let payments: PaymentIntentApiItem[] = [];
          try {
            if (fetchPaymentsForOrder) {
              payments = await fetchPaymentsForOrder(order.id);
            } else {
              const res = await httpClient.get<PaymentIntentApiItem[]>(`/orders/${order.id}/payments`);
              if (Array.isArray(res)) {
                payments = res;
              }
            }
          } catch {
            payments = [];
          }

          if (payments.length === 0) {
            const isDelivered = order.status === 'DELIVERED';
            const isCancelled = order.status === 'CANCELLED';
            const status: EscrowStatus = isDelivered ? 'SETTLED' : isCancelled ? 'REFUNDED' : 'PENDING';
            const statusLabel = isDelivered
              ? 'ĐÃ HOÀN TẤT'
              : isCancelled
                ? 'HOÀN CỌC'
                : 'CHỜ THANH TOÁN';

            const rawPrice = parseInt(order.priceLabel.replace(/\D/g, ''), 10) || 0;

            return [
              {
                id: `order-fallback-${order.id}`,
                orderId: order.id,
                orderReference: order.reference || formatOrderReference(order),
                amount: rawPrice,
                status,
                statusLabel,
                createdAtLabel: order.updatedAtLabel || 'Gần đây',
                title: `Ký quỹ đơn ${order.reference || formatOrderReference(order)}`,
              },
            ];
          }

          return payments.map((pi): EscrowPaymentItem => {
            const rawStatus = (pi.status || '').toUpperCase();
            let status: EscrowStatus = 'PENDING';
            let statusLabel = 'CHỜ THANH TOÁN';

            if (rawStatus === 'PAID_MANUAL' || rawStatus === 'SUCCEEDED' || rawStatus === 'COMPLETED') {
              if (order.status === 'DELIVERED') {
                status = 'SETTLED';
                statusLabel = 'ĐÃ HOÀN TẤT';
              } else {
                status = 'HELD';
                statusLabel = 'ĐÃ KÝ QUỸ';
              }
            } else if (rawStatus === 'REFUNDED' || order.status === 'CANCELLED') {
              status = 'REFUNDED';
              statusLabel = 'HOÀN CỌC';
            } else if (rawStatus === 'FAILED') {
              status = 'FAILED';
              statusLabel = 'THẤT BẠI';
            } else {
              status = 'PENDING';
              statusLabel = 'CHỜ THANH TOÁN';
            }

            const amount = pi.amountVnd ?? pi.amount ?? (parseInt(order.priceLabel.replace(/\D/g, ''), 10) || 0);

            return {
              id: pi.id,
              orderId: order.id,
              orderReference: order.reference || formatOrderReference(order),
              amount,
              status,
              statusLabel,
              createdAtLabel: order.updatedAtLabel || 'Gần đây',
              title: `Ký quỹ đơn ${order.reference || formatOrderReference(order)}`,
            };
          });
        }),
      );

      return itemsPerOrder.flat();
    },
  });

  const totalEscrowed = useMemo(() => {
    return escrowItems
      .filter((item) => item.status === 'HELD' || item.status === 'SETTLED')
      .reduce((sum, item) => sum + item.amount, 0);
  }, [escrowItems]);

  const refundableBalance = useMemo(() => {
    if (walletSummary && typeof walletSummary.refundableBalanceVnd === 'number') {
      return walletSummary.refundableBalanceVnd;
    }
    const cancelledPaid = escrowItems
      .filter((item) => item.status === 'REFUNDED')
      .reduce((sum, item) => sum + item.amount, 0);
    return cancelledPaid;
  }, [walletSummary, escrowItems]);

  const totalHeldEscrow = useMemo(() => {
    if (walletSummary && typeof walletSummary.totalHeldEscrowVnd === 'number') {
      return walletSummary.totalHeldEscrowVnd;
    }
    return escrowItems
      .filter((item) => item.status === 'HELD')
      .reduce((sum, item) => sum + item.amount, 0);
  }, [walletSummary, escrowItems]);

  const withdrawalRequests = walletSummary?.withdrawalRequests ?? [];

  const handleWithdrawSubmit = async () => {
    const amount = parseInt(withdrawAmount.replace(/\D/g, ''), 10);
    if (Number.isNaN(amount) || amount < 10000) {
      setWithdrawError('Số tiền rút tối thiểu là 10.000 ₫');
      return;
    }
    if (amount > refundableBalance) {
      setWithdrawError(`Số tiền rút vượt quá số dư khả dụng (${formatVndPrice(refundableBalance)})`);
      return;
    }
    if (!bankName.trim()) {
      setWithdrawError('Vui lòng nhập tên ngân hàng');
      return;
    }
    if (!bankAccountNumber.trim()) {
      setWithdrawError('Vui lòng nhập số tài khoản ngân hàng');
      return;
    }
    if (!bankAccountName.trim()) {
      setWithdrawError('Vui lòng nhập tên chủ tài khoản');
      return;
    }

    try {
      setIsSubmitting(true);
      setWithdrawError(null);
      if (requestWithdrawal) {
        await requestWithdrawal({
          amountVnd: amount,
          bankName: bankName.trim(),
          bankAccountNumber: bankAccountNumber.trim(),
          bankAccountName: bankAccountName.trim().toUpperCase(),
        });
      } else {
        await httpClient.post('/customer/wallet/withdrawals', {
          amountVnd: amount,
          bankName: bankName.trim(),
          bankAccountNumber: bankAccountNumber.trim(),
          bankAccountName: bankAccountName.trim().toUpperCase(),
        });
      }
      haptic.success();
      Alert.alert(
        'Đã gửi yêu cầu',
        'Yêu cầu rút tiền hoàn cọc của bạn đã được gửi tới Admin để đối soát và chuyển khoản.',
      );
      setActiveActionModal(null);
      setWithdrawAmount('');
      setBankName('');
      setBankAccountNumber('');
      setBankAccountName('');
      void refetchWallet();
      void refetch();
    } catch (err: any) {
      setWithdrawError(err?.message || 'Không thể gửi yêu cầu rút tiền');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (activeFilter === 'ALL') return escrowItems;
    return escrowItems.filter((item) => item.status === activeFilter);
  }, [escrowItems, activeFilter]);

  const filterCounts = useMemo<Record<EscrowFilterType, number>>(() => ({
    ALL: escrowItems.length,
    PENDING: escrowItems.filter((item) => item.status === 'PENDING').length,
    HELD: escrowItems.filter((item) => item.status === 'HELD').length,
    SETTLED: escrowItems.filter((item) => item.status === 'SETTLED').length,
    REFUNDED: escrowItems.filter((item) => item.status === 'REFUNDED').length,
  }), [escrowItems]);

  const getStatusBadgeStyle = (status: EscrowStatus) => {
    switch (status) {
      case 'HELD':
        return { bg: colors.success.background, text: colors.success.text, border: colors.success.border };
      case 'SETTLED':
        return { bg: colors.info.background, text: colors.info.text, border: colors.info.border };
      case 'PENDING':
        return { bg: colors.warning.background, text: colors.warning.text, border: colors.warning.border };
      case 'REFUNDED':
        return { bg: customerPalette.accentBg, text: customerPalette.accentText, border: customerPalette.accentBorder };
      case 'FAILED':
      default:
        return { bg: colors.danger.background, text: colors.danger.text, border: colors.danger.border };
    }
  };

  return (
    <ScreenScaffold
      hasFloatingNavBar
      onBack={() => {
        haptic.selection();
        router.back();
      }}
      subtitle="Ký quỹ an toàn LEOPARD Escrow"
      title="Lịch sử ký quỹ & thanh toán"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.scrollWrap}
      >
        {/* 1. Thẻ Bento Ký Quỹ Hoàn Cọc Chuẩn Apple Wallet (Midnight Navy #0B2545) */}
        <Card style={styles.balanceCard}>
          {/* Header thẻ: Thương hiệu & Bảo chứng an toàn */}
          <View style={styles.cardTopRow}>
            <View style={styles.cardHeaderBrand}>
              <View style={styles.walletIconCircle}>
                <IconWallet color={customerPalette.surfaceWhite} size={18} />
              </View>
              <Text style={styles.cardHeaderTitle}>Ký quỹ an toàn</Text>
            </View>
            <Badge action="success" size="sm" style={styles.securityBadge}>
              <IconSecurityShield color={colors.success.text} size={14} />
              <Badge.Text style={styles.securityBadgeText}>Bảo đảm 100%</Badge.Text>
            </Badge>
          </View>

          {/* Thân thẻ: Số dư ký quỹ có thể rút lớn */}
          <View style={styles.balanceBody}>
            <Text style={styles.balanceEyebrow}>Ký quỹ chờ hoàn (Có thể rút)</Text>
            <View style={styles.amountRow}>
              <Text style={styles.balanceAmount}>
                {showBalance ? formatVndPrice(refundableBalance) : '•••••••• ₫'}
              </Text>
              <Pressable
                accessibilityLabel={showBalance ? 'Ẩn số tiền' : 'Hiện số tiền'}
                accessibilityRole="button"
                hitSlop={hitSlop(36, control.minimumTouchHeight)}
                onPress={() => {
                  haptic.selection();
                  setShowBalance(!showBalance);
                }}
                style={({ pressed }) => [
                  styles.eyeToggleBtn,
                  pressed && styles.eyeToggleBtnPressed,
                ]}
              >
                {showBalance ? (
                  <IconEye color={customerPalette.surfaceWhite} size={18} />
                ) : (
                  <IconEyeOff color={customerPalette.surfaceWhite} size={18} />
                )}
              </Pressable>
            </View>
            <Text style={styles.subBalanceNote}>
              Đang ký quỹ chuyến chạy: {formatVndPrice(totalHeldEscrow)}
            </Text>
          </View>

          {/* Các nút hành động Capsule (Chỉ Rút tiền & Quy chế - 2 chữ mỗi nút) */}
          <View style={styles.capsuleActionsRow}>
            <Pressable
              accessibilityLabel="Rút tiền"
              accessibilityRole="button"
              onPress={() => {
                haptic.light();
                setWithdrawError(null);
                setWithdrawAmount(refundableBalance > 0 ? String(refundableBalance) : '');
                setActiveActionModal('withdraw');
              }}
              style={({ pressed }) => [
                styles.withdrawCapsuleBtnPrimary,
                pressed && styles.capsuleBtnPressed,
              ]}
            >
              <View style={styles.capsuleIconBoxPrimary}>
                <IconTxRefund color={customerPalette.primary} size={15} />
              </View>
              <Text style={styles.withdrawCapsuleTextPrimary}>Rút tiền</Text>
            </Pressable>

            <Pressable
              accessibilityLabel="Quy chế"
              accessibilityRole="button"
              onPress={() => {
                haptic.light();
                setActiveActionModal('policy');
              }}
              style={({ pressed }) => [
                styles.withdrawCapsuleBtn,
                pressed && styles.capsuleBtnPressed,
              ]}
            >
              <View style={styles.capsuleIconBoxGlass}>
                <IconSecurityShield color={customerPalette.surfaceWhite} size={15} />
              </View>
              <Text style={styles.withdrawCapsuleText}>Quy chế</Text>
            </Pressable>
          </View>

          {/* Footer thẻ: Chuyển khoản thủ công qua Admin */}
          <View style={styles.cardFooter}>
            <View style={styles.cardFooterLeft}>
              <IconQrPayment color="rgba(255, 255, 255, 0.85)" size={15} />
              <Text numberOfLines={1} style={styles.cardFooterNapas}>
                Chuyển khoản thủ công qua Admin
              </Text>
            </View>
            <View style={styles.cardFooterBadge}>
              <Text numberOfLines={1} style={styles.cardFooterNumber}>
                {escrowItems.length} giao dịch đơn
              </Text>
            </View>
          </View>
        </Card>

        {/* 2. Mục: Yêu cầu rút tiền hoàn cọc (nếu có) */}
        {withdrawalRequests.length > 0 && (
          <View style={styles.historySection}>
            <View style={styles.historyHeaderRow}>
              <Text style={styles.sectionLabel}>
                Yêu cầu rút tiền hoàn cọc ({withdrawalRequests.length})
              </Text>
            </View>
            <View style={styles.insetGroupedCard}>
              {withdrawalRequests.map((wr, idx) => {
                const isLast = idx === withdrawalRequests.length - 1;
                const isApproved = wr.status === 'APPROVED';
                const isRejected = wr.status === 'REJECTED';
                const isPending = wr.status === 'PENDING';

                const statusLabel = isApproved
                  ? 'ĐÃ HOÀN TIỀN'
                  : isRejected
                    ? 'BỊ TỪ CHỐI'
                    : 'CHỜ CHUYỂN KHOẢN';

                const badgeBg = isApproved
                  ? colors.success.background
                  : isRejected
                    ? colors.danger.background
                    : colors.warning.background;
                const badgeColor = isApproved
                  ? colors.success.text
                  : isRejected
                    ? colors.danger.text
                    : colors.warning.text;
                const badgeBorder = isApproved
                  ? colors.success.border
                  : isRejected
                    ? colors.danger.border
                    : colors.warning.border;

                return (
                  <View key={wr.id}>
                    <View style={styles.insetRowItem}>
                      <View style={styles.itemMainRow}>
                        <View style={styles.leftCol}>
                          <View style={[styles.txIconBox, { backgroundColor: customerPalette.accentBg }]}>
                            <IconTxRefund color={customerPalette.accentText} size={18} />
                          </View>
                          <View style={styles.txMeta}>
                            <Text numberOfLines={1} style={styles.txTitle}>
                              Rút về {wr.bankName ?? 'Ngân hàng'}
                            </Text>
                            <Text style={styles.txDate}>
                              STK: {wr.bankAccountNumber ?? '—'} · {wr.bankAccountName ?? '—'}
                            </Text>
                            {wr.reviewNote ? (
                              <Text style={styles.reviewNoteText}>Ghi chú: {wr.reviewNote}</Text>
                            ) : null}
                          </View>
                        </View>

                        <View style={styles.rightCol}>
                          <AppText style={[styles.txAmount, { color: colors.danger.text }]}>
                            - {formatVndPrice(wr.amountVnd)}
                          </AppText>
                          <View
                            style={[
                              styles.statusBadge,
                              { backgroundColor: badgeBg, borderColor: badgeBorder },
                            ]}
                          >
                            <Text style={[styles.statusBadgeText, { color: badgeColor }]}>
                              {statusLabel}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    {!isLast && <View style={styles.insetSeparator} />}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* 2. Lịch Sử Biến Động Số Dư: Inset Grouped List chuẩn iOS Settings */}
        <View style={styles.historySection}>
          <View style={styles.historyHeaderRow}>
            <Text style={styles.sectionLabel}>Lịch sử ký quỹ theo đơn</Text>
          </View>

          {/* Thanh lọc phân loại trạng thái ký quỹ */}
          <ScrollView
            contentContainerStyle={styles.filterTabsRow}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {filterTabs.map((tab) => {
              const active = activeFilter === tab.id;
              const count = filterCounts[tab.id];
              return (
                <Animated.View
                  key={tab.id}
                  layout={LinearTransition.springify().damping(20).stiffness(240)}
                >
                  <Pressable
                    accessibilityLabel={tab.label}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => {
                      haptic.selection();
                      setActiveFilter(tab.id);
                    }}
                    style={({ pressed }) => [
                      styles.filterChip,
                      active && styles.filterChipActive,
                      pressed && styles.filterChipPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        active && styles.filterChipTextActive,
                      ]}
                    >
                      {tab.label}
                    </Text>
                    {count > 0 ? (
                      <Badge
                        action={active ? 'info' : 'muted'}
                        size="sm"
                        style={[styles.filterBadge, active && styles.filterBadgeActive]}
                      >
                        <Badge.Text
                          style={[
                            styles.filterBadgeText,
                            active && styles.filterBadgeTextActive,
                          ]}
                        >
                          {count}
                        </Badge.Text>
                      </Badge>
                    ) : null}
                  </Pressable>
                </Animated.View>
              );
            })}
          </ScrollView>

          {/* Nội dung danh sách Inset Grouped List */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Spinner color={customerPalette.primary} size="small" />
              <Text style={styles.loadingText}>Đang tải lịch sử ký quỹ...</Text>
            </View>
          ) : isError ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Không thể tải dữ liệu</Text>
              <Text style={styles.emptySubtitle}>
                {error instanceof Error ? error.message : 'Hãy thử lại sau'}
              </Text>
              <Pressable
                accessibilityLabel="Thử lại"
                accessibilityRole="button"
                onPress={() => refetch()}
                style={styles.retryBtn}
              >
                <Text style={styles.retryBtnText}>Thử lại</Text>
              </Pressable>
            </View>
          ) : filteredItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Chưa có giao dịch ký quỹ</Text>
              <Text style={styles.emptySubtitle}>
                Các khoản ký quỹ và thanh toán sẽ xuất hiện tại đây khi bạn tạo đơn.
              </Text>
            </View>
          ) : (
            <View style={styles.insetGroupedCard}>
              {filteredItems.map((item, index) => {
                const isLast = index === filteredItems.length - 1;
                const isRefund = item.status === 'REFUNDED';
                const badgeStyle = getStatusBadgeStyle(item.status);
                const canPayNow = item.status === 'PENDING';

                return (
                  <View key={item.id} style={styles.insetRowWrap}>
                    <Pressable
                      accessibilityLabel={`${item.title}, ${formatVndPrice(item.amount)}, ${item.statusLabel}`}
                      accessibilityRole="button"
                      onPress={() => {
                        haptic.selection();
                        if (canPayNow) {
                          router.push(`/customer/orders/checkout/${item.orderId}`);
                        } else {
                          router.push(`/customer/orders/detail/${item.orderId}`);
                        }
                      }}
                      style={({ pressed }) => [
                        styles.insetRowItem,
                        pressed && styles.insetRowItemPressed,
                      ]}
                    >
                      <View style={styles.itemMainRow}>
                        {/* Cột trái (flex: 1): Icon 36x36pt + Tiêu đề + Ngày/Mã đơn */}
                        <View style={styles.leftCol}>
                          <View
                            style={[
                              styles.txIconBox,
                              isRefund ? styles.txIconBoxRefund : styles.txIconBoxPayment,
                            ]}
                          >
                            {isRefund ? (
                              <IconTxRefund color={colors.success.text} size={18} />
                            ) : (
                              <IconTxPayment color={customerPalette.primary} size={18} />
                            )}
                          </View>

                          <View style={styles.txMeta}>
                            <Text numberOfLines={1} style={styles.txTitle}>
                              {item.title}
                            </Text>
                            <View style={styles.txSubRow}>
                              <Text style={styles.txDate}>{item.createdAtLabel}</Text>
                              <View style={styles.orderRefBadge}>
                                <Text style={styles.orderRefBadgeText}>
                                  {item.orderReference}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </View>

                        {/* Cột phải (alignItems: 'flex-end'): Số tiền cước + Status Badge */}
                        <View style={styles.rightCol}>
                          <AppText style={styles.txAmount}>
                            {formatVndPrice(item.amount)}
                          </AppText>
                          <View
                            style={[
                              styles.statusBadge,
                              {
                                backgroundColor: badgeStyle.bg,
                                borderColor: badgeStyle.border,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusBadgeText,
                                { color: badgeStyle.text },
                              ]}
                            >
                              {item.statusLabel}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Hàng hành động riêng biệt bên dưới cho đơn chờ thanh toán */}
                      {canPayNow ? (
                        <View style={styles.actionRowBottom}>
                          <View style={styles.actionPromptBox}>
                            <Text style={styles.actionPromptText}>Ký quỹ để tìm tài xế</Text>
                          </View>
                          <Pressable
                            accessibilityLabel={`Thanh toán ngay cho đơn ${item.orderReference}`}
                            accessibilityRole="button"
                            hitSlop={hitSlop(28, 44)}
                            onPress={() => {
                              haptic.light();
                              router.push(`/customer/orders/checkout/${item.orderId}`);
                            }}
                            style={({ pressed }) => [
                              styles.payNowPill,
                              pressed && styles.payNowPillPressed,
                            ]}
                          >
                            <IconQrPayment color={customerPalette.surfaceWhite} size={13} />
                            <Text style={styles.payNowPillText}>Thanh toán ngay</Text>
                          </Pressable>
                        </View>
                      ) : null}
                    </Pressable>

                    {/* Hairline Inset Divider (thụt lề 56pt chuẩn iOS Settings) */}
                    {!isLast && <View style={styles.insetSeparator} />}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal Rút tiền & Quy chế hoàn cọc */}
      <Modal
        animationType="fade"
        onRequestClose={() => setActiveActionModal(null)}
        transparent={true}
        visible={Boolean(activeActionModal)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.actionModalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeaderTitle}>
                {activeActionModal === 'withdraw' ? 'Rút tiền hoàn cọc' : 'Quy chế hoàn cọc'}
              </Text>
              <Pressable
                accessibilityLabel="Đóng"
                accessibilityRole="button"
                onPress={() => setActiveActionModal(null)}
                style={styles.modalCloseBtn}
              >
                <IconClose color={customerPalette.textSlateDark} size={18} />
              </Pressable>
            </View>

            <View style={styles.modalContentBody}>
              {activeActionModal === 'withdraw' ? (
                refundableBalance <= 0 ? (
                  <>
                    <View style={[styles.modalIconWrap, styles.modalIconWrapGreen]}>
                      <IconSecurityShield color={colors.success.text} size={36} />
                    </View>
                    <Text style={styles.modalBodyTitle}>Chưa có số dư chờ hoàn</Text>
                    <Text style={styles.modalBodyDesc}>
                      Hiện tại bạn không có khoản tiền ký quỹ nào chờ hoàn. Khi đơn hàng có ký quỹ bị hủy hoặc không tìm được xe, tiền cước sẽ tự động chuyển vào số dư này để bạn rút về tài khoản ngân hàng.
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setActiveActionModal(null)}
                      style={styles.modalPrimaryBtn}
                    >
                      <Text style={styles.modalPrimaryBtnText}>Đã hiểu</Text>
                    </Pressable>
                  </>
                ) : (
                  <View style={styles.formWrap}>
                    <View style={styles.availableBalanceBox}>
                      <Text style={styles.availableBalanceLabel}>Số dư có thể rút:</Text>
                      <Text style={styles.availableBalanceValue}>{formatVndPrice(refundableBalance)}</Text>
                    </View>

                    <View style={styles.formGroup}>
                      <View style={styles.formLabelRow}>
                        <Text style={styles.formLabel}>Số tiền rút (₫)</Text>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => setWithdrawAmount(String(refundableBalance))}
                        >
                          <Text style={styles.maxAmountText}>Rút hết</Text>
                        </Pressable>
                      </View>
                      <TextInput
                        keyboardType="numeric"
                        onChangeText={setWithdrawAmount}
                        placeholder="Tối thiểu 10.000 ₫"
                        placeholderTextColor={customerPalette.textSubtle}
                        style={styles.formInput}
                        value={withdrawAmount}
                      />
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Ngân hàng thụ hưởng</Text>
                      <TextInput
                        onChangeText={setBankName}
                        placeholder="VD: Vietcombank, MB Bank, v.v."
                        placeholderTextColor={customerPalette.textSubtle}
                        style={styles.formInput}
                        value={bankName}
                      />
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Số tài khoản ngân hàng</Text>
                      <TextInput
                        keyboardType="numeric"
                        onChangeText={setBankAccountNumber}
                        placeholder="Nhập số tài khoản"
                        placeholderTextColor={customerPalette.textSubtle}
                        style={styles.formInput}
                        value={bankAccountNumber}
                      />
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Tên chủ tài khoản</Text>
                      <TextInput
                        autoCapitalize="characters"
                        onChangeText={setBankAccountName}
                        placeholder="TÊN CHỦ TÀI KHOẢN (IN HOA)"
                        placeholderTextColor={customerPalette.textSubtle}
                        style={styles.formInput}
                        value={bankAccountName}
                      />
                    </View>

                    {withdrawError ? (
                      <Text style={styles.errorBannerText}>{withdrawError}</Text>
                    ) : null}

                    <Text style={styles.withdrawNoteText}>
                      Admin sẽ kiểm tra đối soát và chuyển khoản thủ công cho bạn trong vòng 24 giờ làm việc.
                    </Text>

                    <Pressable
                      accessibilityRole="button"
                      disabled={isSubmitting}
                      onPress={handleWithdrawSubmit}
                      style={[styles.modalPrimaryBtn, isSubmitting && styles.btnDisabled]}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator color={customerPalette.surfaceWhite} size="small" />
                      ) : (
                        <Text style={styles.modalPrimaryBtnText}>Gửi yêu cầu rút tiền</Text>
                      )}
                    </Pressable>
                  </View>
                )
              ) : (
                <>
                  <View style={[styles.modalIconWrap, styles.modalIconWrapGreen]}>
                    <IconSecurityShield color={colors.success.text} size={36} />
                  </View>
                  <Text style={styles.modalBodyTitle}>Bảo đảm ký quỹ 100%</Text>
                  <Text style={styles.modalBodyDesc}>
                    1. Khách hàng thanh toán ký quỹ qua VietQR khi đặt xe để bảo đảm cước an toàn 100%.
                    {'\n'}2. Khi đơn hàng bị hủy hoặc không tìm được tài xế, toàn bộ tiền cước sẽ được hoàn trả vào 'Số dư ký quỹ chờ hoàn'.
                    {'\n'}3. Bạn bấm 'Rút tiền hoàn cọc', nhập STK để gửi yêu cầu. Admin sẽ đối soát và chuyển khoản thủ công về tài khoản của bạn.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setActiveActionModal(null)}
                    style={styles.modalPrimaryBtn}
                  >
                    <Text style={styles.modalPrimaryBtnText}>Đã hiểu</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </View>
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
    paddingTop: spacing.xs,
    paddingBottom: 110,
  },
  balanceCard: {
    backgroundColor: customerPalette.primary,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: radius.cardXl,
    ...iosContinuousCurve,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
    paddingVertical: spacing.lg,
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 8,
    position: 'relative',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  cardHeaderBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    minWidth: 0,
  },
  walletIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderTitle: {
    color: customerPalette.surfaceWhite,
    ...typeScale.subheadline,
    fontWeight: '700',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    flexShrink: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
  securityBadgeText: {
    color: customerPalette.surfaceWhite,
    ...typeScale.caption2,
    fontWeight: '700',
  },
  balanceBody: {
    gap: spacing.xxs,
    marginTop: spacing.xxs,
  },
  balanceEyebrow: {
    color: 'rgba(255, 255, 255, 0.72)',
    ...typeScale.caption1,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceAmount: {
    color: customerPalette.surfaceWhite,
    ...typeScale.largeTitle,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.6,
  },
  eyeToggleBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeToggleBtnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },
  // Capsule Buttons
  capsuleActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  topupCapsuleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.pill,
    height: 44,
    paddingHorizontal: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  topupCapsuleText: {
    color: customerPalette.primary,
    ...typeScale.subheadline,
    fontWeight: '700',
  },
  withdrawCapsuleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderColor: 'rgba(255, 255, 255, 0.28)',
    borderWidth: 1,
    borderRadius: radius.pill,
    height: 44,
    paddingHorizontal: spacing.md,
  },
  withdrawCapsuleText: {
    color: customerPalette.surfaceWhite,
    ...typeScale.subheadline,
    fontWeight: '600',
  },
  capsuleIconBoxPrimary: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(11, 37, 69, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  capsuleIconBoxGlass: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  capsuleBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.14)',
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  cardFooterLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 0,
  },
  cardFooterNapas: {
    color: 'rgba(255, 255, 255, 0.85)',
    ...typeScale.caption1,
    fontWeight: '500',
  },
  cardFooterBadge: {
    flexShrink: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: radius.cardSm,
  },
  cardFooterNumber: {
    color: customerPalette.surfaceWhite,
    ...typeScale.caption2,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  /* History Section */
  historySection: {
    gap: spacing.sm,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.hairline,
  },
  sectionLabel: {
    color: customerPalette.textSlateDark,
    ...typeScale.subheadline,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: customerPalette.surfaceWhite,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
  },
  filterChipActive: {
    backgroundColor: customerPalette.primary,
    borderColor: customerPalette.primary,
  },
  filterChipPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  filterChipText: {
    ...typeScale.footnote,
    color: customerPalette.textSubtle,
  },
  filterChipTextActive: {
    color: customerPalette.surfaceWhite,
    fontWeight: '700',
  },
  filterBadge: {
    minWidth: 20,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: colors.neutral.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxs,
    marginLeft: spacing.xs,
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  filterBadgeText: {
    ...typeScale.caption2,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: customerPalette.textMutedSlate,
  },
  filterBadgeTextActive: {
    color: customerPalette.surfaceWhite,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  loadingText: {
    ...typeScale.footnote,
    color: customerPalette.textSubtle,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    gap: spacing.xs,
  },
  emptyTitle: {
    ...typeScale.subheadline,
    fontWeight: '700',
    color: customerPalette.textSlateDark,
  },
  emptySubtitle: {
    ...typeScale.caption1,
    color: customerPalette.textSubtle,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: spacing.xs,
    minHeight: control.minimumTouchHeight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: customerPalette.primary,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnText: {
    color: customerPalette.surfaceWhite,
    ...typeScale.footnote,
    fontWeight: '600',
  },

  /* Inset Grouped List chuẩn iOS Settings */
  insetGroupedCard: {
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    overflow: 'hidden',
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  insetRowWrap: {
    backgroundColor: customerPalette.surfaceWhite,
  },
  insetRowItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  insetRowItemPressed: {
    backgroundColor: 'rgba(11, 37, 69, 0.04)',
    transform: [{ scale: 0.99 }],
    opacity: 0.96,
  },
  itemMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    width: '100%',
  },
  leftCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 0,
  },
  txIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.cardSm,
    ...iosContinuousCurve,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  txIconBoxPayment: {
    backgroundColor: 'rgba(11, 37, 69, 0.08)',
  },
  txIconBoxRefund: {
    backgroundColor: 'rgba(52, 199, 89, 0.12)',
  },
  txMeta: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  txTitle: {
    ...typeScale.subheadline,
    fontWeight: '600',
    color: customerPalette.textSlateDark,
  },
  txSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  txDate: {
    ...typeScale.caption2,
    color: customerPalette.textSubtle,
  },
  orderRefBadge: {
    backgroundColor: colors.neutral.surfaceMuted,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radius.cardSm,
  },
  orderRefBadgeText: {
    ...typeScale.caption2,
    fontWeight: '700',
    color: customerPalette.primary,
    fontVariant: ['tabular-nums'],
  },
  rightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
    flexShrink: 0,
  },
  txAmount: {
    ...typeScale.headline,
    fontWeight: '700',
    color: customerPalette.textSlateDark,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  statusBadgeText: {
    ...typeScale.caption2,
    fontWeight: '700',
  },
  actionRowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: customerPalette.cardBorder,
  },
  actionPromptBox: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  actionPromptText: {
    ...typeScale.caption2,
    color: colors.warning.text,
    fontWeight: '600',
  },
  payNowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: customerPalette.primary,
    height: 30,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    ...iosContinuousCurve,
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 2,
  },
  payNowPillPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  payNowPillText: {
    color: customerPalette.surfaceWhite,
    ...typeScale.caption2,
    fontWeight: '700',
  },
  insetSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: customerPalette.cardBorder,
    marginLeft: 56, // Thụt lề bằng chiều rộng icon 36 + gap 12 + lề
  },
  pressed: {
    opacity: 0.8,
  },

  /* Action Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 37, 69, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  actionModalCard: {
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.modal,
    ...iosContinuousCurve,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 340,
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 24,
    elevation: 10,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalHeaderTitle: {
    ...typeScale.headline,
    fontWeight: '700',
    color: customerPalette.textSlateDark,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.neutral.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContentBody: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(11, 37, 69, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  modalIconWrapGreen: {
    backgroundColor: colors.success.background,
  },
  modalBodyTitle: {
    ...typeScale.headline,
    fontWeight: '700',
    color: customerPalette.textSlateDark,
    textAlign: 'center',
  },
  modalBodyDesc: {
    ...typeScale.subheadline,
    color: customerPalette.textSubtle,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  modalPrimaryBtn: {
    width: '100%',
    height: 48,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    backgroundColor: customerPalette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryBtnText: {
    color: customerPalette.surfaceWhite,
    ...typeScale.subheadline,
    fontWeight: '700',
  },
  withdrawCapsuleBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.pill,
    height: 44,
    paddingHorizontal: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  withdrawCapsuleTextPrimary: {
    color: customerPalette.primary,
    ...typeScale.subheadline,
    fontWeight: '700',
  },
  subBalanceNote: {
    color: 'rgba(255, 255, 255, 0.75)',
    ...typeScale.caption2,
    fontWeight: '500',
    marginTop: 2,
  },
  formWrap: {
    gap: spacing.sm,
    width: '100%',
  },
  availableBalanceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: customerPalette.accentBg,
    borderColor: customerPalette.accentBorder,
    borderWidth: 1,
    borderRadius: radius.cardSm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  availableBalanceLabel: {
    ...typeScale.footnote,
    color: customerPalette.textSlateDark,
    fontWeight: '600',
  },
  availableBalanceValue: {
    ...typeScale.subheadline,
    color: customerPalette.accentText,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  formGroup: {
    gap: spacing.xxs,
  },
  formLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formLabel: {
    ...typeScale.caption1,
    color: customerPalette.textSlateDark,
    fontWeight: '600',
  },
  maxAmountText: {
    ...typeScale.caption1,
    color: customerPalette.primary,
    fontWeight: '700',
  },
  formInput: {
    height: 44,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    backgroundColor: customerPalette.canvas,
    paddingHorizontal: spacing.sm,
    ...typeScale.subheadline,
    color: customerPalette.textSlateDark,
    ...iosContinuousCurve,
  },
  errorBannerText: {
    ...typeScale.caption1,
    color: colors.danger.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  withdrawNoteText: {
    ...typeScale.caption2,
    color: customerPalette.textSubtle,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 2,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  reviewNoteText: {
    ...typeScale.caption2,
    color: colors.info.text,
    marginTop: 2,
  },
});
