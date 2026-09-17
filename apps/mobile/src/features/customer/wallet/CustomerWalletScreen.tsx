import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  colors,
  control,
  customerPalette,
  haptic,
  hitSlop,
  httpClient,
  iosContinuousCurve,
  layout,
  leopardElevation,
  leopardPalette,
  radius,
  spacing,
  IconCheck,
  IconChevron,
  IconEye,
  IconEyeOff,
  IconQrPayment,
  IconSecurityShield,
  IconTxPayment,
  IconTxRefund,
  IconWallet,
  ScreenScaffold,
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

export interface CustomerWalletScreenProps {
  ordersPort?: CustomerOrdersPort;
  fetchPaymentsForOrder?: (orderId: string) => Promise<PaymentIntentApiItem[]>;
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
  ordersPort,
}: CustomerWalletScreenProps = {}) {
  const router = useRouter();
  const port = useMemo(() => ordersPort ?? createCustomerHttpAdapter(), [ordersPort]);
  const [showBalance, setShowBalance] = useState(true);
  const [activeFilter, setActiveFilter] = useState<EscrowFilterType>('ALL');

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
      onBack={() => router.back()}
      title="Lịch sử ký quỹ & thanh toán"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.scrollWrap}
      >
        {/* 1. Thẻ Tổng Ký Quỹ Thật (Escrow Pool Card) */}
        <View style={styles.balanceCard}>
          <View style={styles.cardTopRow}>
            <View style={styles.cardHeaderBrand}>
              <IconWallet color={customerPalette.surfaceWhite} size={16} />
              <Text style={styles.cardHeaderTitle}>Ký quỹ an toàn</Text>
            </View>
            <View style={styles.securityBadge}>
              <IconSecurityShield color={colors.success.text} size={14} />
              <Text style={styles.securityBadgeText}>Bảo đảm 100%</Text>
            </View>
          </View>

          <View style={styles.balanceBody}>
            <Text style={styles.balanceEyebrow}>Tổng tiền ký quỹ theo đơn</Text>
            <View style={styles.amountRow}>
              <Text style={styles.balanceAmount}>
                {showBalance ? formatVndPrice(totalEscrowed) : '•••••••• ₫'}
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
          </View>

          {/* Card Meta Footer */}
          <View style={styles.cardFooter}>
            <View style={styles.cardFooterLeft}>
              <IconQrPayment color={customerPalette.surfaceWhite} size={14} />
              <Text numberOfLines={1} style={styles.cardFooterNapas}>
                Thanh toán an toàn qua VietQR
              </Text>
            </View>
            <View style={styles.cardFooterBadge}>
              <Text numberOfLines={1} style={styles.cardFooterNumber}>
                {escrowItems.length} giao dịch đơn
              </Text>
            </View>
          </View>
        </View>

        {/* 2. Lịch Sử Ký Quỹ & Thanh Toán Theo Đơn */}
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
                <Pressable
                  accessibilityLabel={tab.label}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  key={tab.id}
                  onPress={() => {
                    haptic.selection();
                    setActiveFilter(tab.id);
                  }}
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
                  {count > 0 ? (
                    <View style={[styles.filterBadge, active && styles.filterBadgeActive]}>
                      <Text
                        style={[
                          styles.filterBadgeText,
                          active && styles.filterBadgeTextActive,
                        ]}
                      >
                        {count}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={colors.brand.primary} size="small" />
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
            <View style={styles.historyList}>
              {filteredItems.map((item) => {
                const isRefund = item.status === 'REFUNDED';
                const badgeStyle = getStatusBadgeStyle(item.status);
                const canPayNow = item.status === 'PENDING';

                return (
                  <View key={item.id} style={styles.txRow}>
                    <View style={styles.txMainCol}>
                      <View style={styles.txTopMetaRow}>
                        <View
                          style={[
                            styles.txIconBox,
                            isRefund ? styles.txIconBoxRefund : styles.txIconBoxPayment,
                          ]}
                        >
                          {isRefund ? (
                            <IconTxRefund color={leopardPalette.ecoGreen} size={20} />
                          ) : (
                            <IconTxPayment color={customerPalette.textMutedSlate} size={20} />
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

                        <View style={styles.txAmountCol}>
                          <Text style={styles.txAmount}>
                            {formatVndPrice(item.amount)}
                          </Text>
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

                      {canPayNow ? (
                        <View style={styles.txActionRow}>
                          <Pressable
                            accessibilityLabel={`Thanh toán ngay cho đơn ${item.orderReference}`}
                            accessibilityRole="button"
                            onPress={() => router.push(`/customer/orders/checkout/${item.orderId}`)}
                            style={({ pressed }) => [
                              styles.payNowBtn,
                              pressed && styles.pressed,
                            ]}
                          >
                            <IconQrPayment color={customerPalette.surfaceWhite} size={16} />
                            <Text style={styles.payNowBtnText}>Thanh toán ngay</Text>
                          </Pressable>
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
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
    paddingBottom: layout.bottomNavClearance + spacing.xl,
  },
  balanceCard: {
    backgroundColor: customerPalette.primary,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: radius.cardXl,
    ...iosContinuousCurve,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
    ...leopardElevation.modal,
    position: 'relative',
    overflow: 'hidden',
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
  cardHeaderTitle: {
    color: customerPalette.surfaceWhite,
    ...typeScale.subheadline,
    fontWeight: '600',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    flexShrink: 0,
  },
  securityBadgeText: {
    color: colors.success.text,
    ...typeScale.caption2,
    fontWeight: '600',
  },
  balanceBody: {
    gap: spacing.xxs,
  },
  balanceEyebrow: {
    color: 'rgba(255, 255, 255, 0.7)',
    ...typeScale.caption2,
    fontWeight: '600',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceAmount: {
    color: customerPalette.surfaceWhite,
    ...typeScale.title1,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  eyeToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeToggleBtnPressed: {
    opacity: 0.7,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
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
    color: 'rgba(255, 255, 255, 0.7)',
    ...typeScale.caption1,
    fontWeight: '500',
  },
  cardFooterBadge: {
    flexShrink: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: radius.cardSm,
  },
  cardFooterNumber: {
    color: customerPalette.surfaceWhite,
    ...typeScale.caption2,
    fontWeight: '600',
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
    color: colors.neutral.text,
    ...typeScale.subheadline,
    fontWeight: '600',
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
    ...iosContinuousCurve,
    backgroundColor: colors.neutral.surfaceMuted,
  },
  filterChipActive: {
    backgroundColor: customerPalette.primary,
  },
  filterChipText: {
    ...typeScale.footnote,
    color: customerPalette.textSubtle,
  },
  filterChipTextActive: {
    color: customerPalette.surfaceWhite,
    fontWeight: '600',
  },
  filterBadge: {
    minWidth: 20,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: customerPalette.surfaceWhite,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxs,
    marginLeft: spacing.xs,
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterBadgeText: {
    ...typeScale.caption2,
    fontWeight: '600',
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
    fontWeight: '600',
    color: colors.neutral.text,
  },
  emptySubtitle: {
    ...typeScale.caption1,
    color: customerPalette.textSubtle,
    textAlign: 'center',
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
  historyList: {
    gap: spacing.sm,
  },
  txRow: {
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    ...leopardElevation.subtle,
  },
  txMainCol: {
    gap: spacing.sm,
  },
  txTopMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  txIconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIconBoxPayment: {
    backgroundColor: colors.neutral.surfaceMuted,
  },
  txIconBoxRefund: {
    backgroundColor: colors.success.background,
  },
  txMeta: {
    flex: 1,
    gap: spacing.xxs,
  },
  txTitle: {
    ...typeScale.subheadline,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  txSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  txDate: {
    ...typeScale.caption2,
    color: customerPalette.offlineGray,
  },
  orderRefBadge: {
    backgroundColor: colors.neutral.surfaceMuted,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.hairline,
    borderRadius: radius.cardSm,
  },
  orderRefBadgeText: {
    ...typeScale.caption2,
    fontWeight: '600',
    color: customerPalette.textMutedSlate,
    fontVariant: ['tabular-nums'],
  },
  txAmountCol: {
    alignItems: 'flex-end',
    gap: spacing.xxs,
  },
  txAmount: {
    ...typeScale.headline,
    fontWeight: '700',
    color: colors.neutral.text,
    fontVariant: ['tabular-nums'],
  },
  statusBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: radius.cardSm,
    borderWidth: 1,
  },
  statusBadgeText: {
    ...typeScale.caption2,
    fontWeight: '600',
  },
  txActionRow: {
    borderTopWidth: 1,
    borderTopColor: customerPalette.cardBorder,
    paddingTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  payNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: customerPalette.primary,
    minHeight: control.minimumTouchHeight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.control,
    ...iosContinuousCurve,
  },
  payNowBtnText: {
    color: customerPalette.surfaceWhite,
    ...typeScale.subheadline,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.8,
  },
});
