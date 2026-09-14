import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  colors,
  haptic,
  httpClient,
  iosContinuousCurve,
  layout,
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
            // Suy diễn từ trạng thái order
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
        return { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
      case 'SETTLED':
        return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
      case 'PENDING':
        return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
      case 'REFUNDED':
        return { bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' };
      case 'FAILED':
      default:
        return { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
    }
  };

  return (
    <ScreenScaffold
      hasFloatingNavBar
      title="Lịch sử ký quỹ & thanh toán"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.scrollWrap}
      >
        {/* 1. Thẻ Tổng Ký Quỹ Thật (Escrow Pool Card) */}
        <View style={styles.balanceCard}>
          <View style={styles.cardTopRow}>
            <View style={styles.brandPill}>
              <View style={styles.pulseDot} />
              <IconWallet color="#F1F5F9" size={16} />
              <Text style={styles.brandPillText}>Ký quỹ đảm bảo LEOPARD</Text>
            </View>
            <View style={styles.securityBadge}>
              <IconSecurityShield color="#10B981" size={14} />
              <Text style={styles.securityBadgeText}>Bảo đảm 100%</Text>
            </View>
          </View>

          <View style={styles.balanceBody}>
            <Text style={styles.balanceEyebrow}>TỔNG ĐÃ KÝ QUỸ THEO ĐƠN</Text>
            <View style={styles.amountRow}>
              <Text style={styles.balanceAmount}>
                {showBalance ? formatVndPrice(totalEscrowed) : '•••••••• ₫'}
              </Text>
              <Pressable
                accessibilityLabel={showBalance ? 'Ẩn số tiền' : 'Hiện số tiền'}
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
            <Text style={styles.cardFooterNapas}>Thanh toán & Ký quỹ an toàn qua VietQR</Text>
            <Text style={styles.cardFooterNumber}>{escrowItems.length} giao dịch đơn</Text>
          </View>
        </View>

        {/* 2. Lịch Sử Ký Quỹ & Thanh Toán Thật Theo Đơn */}
        <View style={styles.historySection}>
          <View style={styles.historyHeaderRow}>
            <Text style={styles.sectionLabel}>LỊCH SỬ KÝ QUỸ THEO ĐƠN</Text>
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
                            <IconTxRefund color="#16A34A" size={18} />
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
                            style={styles.payNowBtn}
                          >
                            <IconQrPayment color="#FFFFFF" size={14} />
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
    paddingBottom: layout.bottomNavClearance + 32,
  },
  balanceCard: {
    backgroundColor: '#0B1E42',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
    shadowColor: '#0B1E42',
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
    backgroundColor: '#10B981',
  },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  brandPillText: {
    color: '#F1F5F9',
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
    fontSize: 30,
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
    letterSpacing: 0.5,
  },

  /* History Section */
  historySection: {
    gap: 12,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  sectionLabel: {
    color: '#0B1E42',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
    paddingRight: 4,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    ...iosContinuousCurve,
    backgroundColor: '#F1F5F9',
  },
  filterChipActive: {
    backgroundColor: '#0B1E42',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  filterBadge: {
    minWidth: 20,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 6,
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: '#475569',
  },
  filterBadgeTextActive: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B1E42',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0B1E42',
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  historyList: {
    gap: 10,
  },
  txRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  txMainCol: {
    gap: 10,
  },
  txTopMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  txIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIconBoxPayment: {
    backgroundColor: '#F1F5F9',
  },
  txIconBoxRefund: {
    backgroundColor: '#DCFCE7',
  },
  txMeta: {
    flex: 1,
    gap: 3,
  },
  txTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  txSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  txDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  orderRefBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  orderRefBadgeText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#475569',
    fontVariant: ['tabular-nums'],
  },
  txAmountCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  txActionRow: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  payNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0B1E42',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  payNowBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
});
