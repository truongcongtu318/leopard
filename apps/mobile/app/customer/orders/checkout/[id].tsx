import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Clipboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  IconCheck,
  IconChevron,
  IconCopy,
  IconQrPayment,
  IconSecurityShield,
  IconWallet,
} from '@leopard/mobile-core';

export interface OrderCheckoutProps {
  orderId?: string;
  amount?: number;
  onSuccess?: () => void;
  onBack?: () => void;
}

function formatVnd(val: number): string {
  return new Intl.NumberFormat('vi-VN').format(val) + ' ₫';
}

function formatOrderRef(id: string): string {
  if (!id) return 'LP-2026-0001';
  if (id.startsWith('LP-')) return id;
  const clean = id.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `LP-${clean}`;
}

export default function OrderCheckoutScreen({
  amount: propAmount,
  onBack,
  onSuccess,
  orderId: propOrderId,
}: OrderCheckoutProps = {}) {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    amount?: string;
  }>();

  const id = propOrderId || params.id || '11111111-1111-4111-8111-111111111001';
  const rawAmount = propAmount ?? (params.amount ? Number(params.amount) : 280000);
  const amount = Number.isFinite(rawAmount) ? rawAmount : 280000;

  const [paymentMethod, setPaymentMethod] = useState<'vietqr' | 'wallet'>('vietqr');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);

  const bankName = 'MB Bank (Ngân hàng Quân Đội)';
  const accountNumber = '0383188888';
  const accountName = 'CONG TY CO PHAN LEOPARD LOGISTICS';
  const orderReference = formatOrderRef(id);

  const cleanRef = orderReference.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const qrPayload = `00020101021238540010A000000727012600069704220112${accountNumber}0208QRIBFTTA520400005303704540${amount}5802VN62${cleanRef.length.toString().padStart(2, '0')}${cleanRef}6304ABCD`;

  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleCopy = (field: string, text: string) => {
    setCopiedField(field);
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text).catch(() => {});
      } else if (Clipboard && typeof Clipboard.setString === 'function') {
        Clipboard.setString(text);
      }
    } catch {
      // safe fallback if clipboard unavailable
    }
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const handleConfirmPaid = () => {
    setIsReconciling(true);
  };

  useEffect(() => {
    if (!isReconciling) return undefined;
    const timer = setTimeout(() => {
      setIsReconciling(false);
      if (onSuccess) {
        onSuccess();
      } else {
        router.replace(`/customer/orders/searching/${id}`);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [isReconciling, id, onSuccess, router]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <Pressable
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
          onPress={handleBack}
          style={styles.backBtn}
        >
          <IconChevron color="#0B1E42" direction="left" size={22} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Thanh toán VietQR & Ký quỹ</Text>
          <Text style={styles.headerSubtitle}>
            Ký quỹ bảo vệ chuyến đi LEOPARD Escrow
          </Text>
        </View>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Price Hero Section */}
        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>Tổng tiền ký quỹ (Escrow)</Text>
          <Text style={styles.priceAmount}>{formatVnd(amount)}</Text>
          <View style={styles.escrowNoticeRow}>
            <IconSecurityShield color="#10B981" size={16} />
            <Text style={styles.escrowNoticeText}>
              Bảo chứng 100% · Hoàn cọc tức thì nếu tài xế không nhận cuốc
            </Text>
          </View>
        </View>

        {/* Payment Method Selector */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
        </View>

        <View style={styles.methodSelectorWrap}>
          {/* VietQR Option */}
          <Pressable
            accessibilityLabel="Chọn thanh toán VietQR payOS"
            accessibilityRole="button"
            onPress={() => setPaymentMethod('vietqr')}
            style={[
              styles.methodOptionCard,
              paymentMethod === 'vietqr' && styles.methodOptionActive,
            ]}
          >
            <View style={styles.methodLeftWrap}>
              <View style={styles.methodIconBox}>
                <IconQrPayment color="#0B1E42" size={20} />
              </View>
              <View>
                <Text style={styles.methodTitle}>VietQR payOS (Napas 24/7)</Text>
                <Text style={styles.methodDesc}>Quét mã QR tự động qua app ngân hàng</Text>
              </View>
            </View>
            <View
              style={[
                styles.radioOuter,
                paymentMethod === 'vietqr' && styles.radioOuterActive,
              ]}
            >
              {paymentMethod === 'vietqr' && <View style={styles.radioInner} />}
            </View>
          </Pressable>

          {/* Business Wallet Option */}
          <Pressable
            accessibilityLabel="Chọn thanh toán Ví doanh nghiệp"
            accessibilityRole="button"
            onPress={() => setPaymentMethod('wallet')}
            style={[
              styles.methodOptionCard,
              paymentMethod === 'wallet' && styles.methodOptionActive,
            ]}
            testID="payment-method-wallet"
          >
            <View style={styles.methodLeftWrap}>
              <View style={styles.methodIconBox}>
                <IconWallet color="#0B1E42" size={20} />
              </View>
              <View>
                <Text style={styles.methodTitle}>Ví doanh nghiệp (B2B Credit)</Text>
                <Text style={styles.methodDesc}>Hạn mức công nợ doanh nghiệp</Text>
              </View>
            </View>
            <View
              style={[
                styles.radioOuter,
                paymentMethod === 'wallet' && styles.radioOuterActive,
              ]}
            >
              {paymentMethod === 'wallet' && <View style={styles.radioInner} />}
            </View>
          </Pressable>
        </View>

        {paymentMethod === 'wallet' ? (
          /* Business Wallet Details */
          <View style={styles.walletDetailsCard}>
            <View style={styles.walletInfoRow}>
              <Text style={styles.walletLabel}>Hạn mức khả dụng</Text>
              <Text style={styles.walletLimitValue}>50.000.000 ₫</Text>
            </View>
            <Text style={styles.walletNoteText}>
              Khoản tiền {formatVnd(amount)} sẽ được trừ trực tiếp vào hạn mức công
              nợ tháng này của doanh nghiệp.
            </Text>
          </View>
        ) : (
          /* VietQR Dynamic Code & Bank Details */
          <View style={styles.qrDoubleBezelOuter}>
            <View style={styles.qrDoubleBezelInner}>
              <View style={styles.napasBadgeRow}>
                <Text style={styles.napasBankTitle}>MB BANK</Text>
                <View style={styles.napasBadge}>
                  <Text style={styles.napasBadgeText}>NAPAS 24/7</Text>
                </View>
              </View>

              {/* QR Code Container */}
              <View style={styles.qrCodeWrapper}>
                <QRCode
                  size={190}
                  testID="vietqr-code"
                  value={qrPayload}
                />
              </View>

              <Text style={styles.qrInstruction}>
                Sử dụng ứng dụng ngân hàng bất kỳ để quét mã thanh toán tức thì
              </Text>
            </View>

            {/* Bank Transfer Details Table */}
            <View style={styles.bankDetailsTable}>
              {/* Bank Name */}
              <View style={styles.bankDetailRow}>
                <Text style={styles.detailLabel}>Ngân hàng thụ hưởng</Text>
                <Text style={styles.detailValueBold}>{bankName}</Text>
              </View>

              {/* Account Number */}
              <View style={styles.bankDetailRow}>
                <View>
                  <Text style={styles.detailLabel}>Số tài khoản</Text>
                  <Text style={styles.detailValueMono}>{accountNumber}</Text>
                </View>
                <Pressable
                  accessibilityLabel="Sao chép số tài khoản"
                  accessibilityRole="button"
                  onPress={() => handleCopy('accountNumber', accountNumber)}
                  style={styles.copyBtn}
                >
                  <IconCopy color="#0B1E42" size={16} />
                  <Text style={styles.copyBtnText}>
                    {copiedField === 'accountNumber' ? 'Đã sao chép' : 'Sao chép'}
                  </Text>
                </Pressable>
              </View>

              {/* Account Name */}
              <View style={styles.bankDetailRow}>
                <View style={styles.flexOne}>
                  <Text style={styles.detailLabel}>Chủ tài khoản</Text>
                  <Text numberOfLines={1} style={styles.detailValueBold}>
                    {accountName}
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="Sao chép tên chủ tài khoản"
                  accessibilityRole="button"
                  onPress={() => handleCopy('accountName', accountName)}
                  style={styles.copyBtn}
                >
                  <IconCopy color="#0B1E42" size={16} />
                  <Text style={styles.copyBtnText}>
                    {copiedField === 'accountName' ? 'Đã sao chép' : 'Sao chép'}
                  </Text>
                </Pressable>
              </View>

              {/* Payment Memo */}
              <View style={styles.bankDetailRow}>
                <View>
                  <Text style={styles.detailLabel}>Nội dung chuyển khoản</Text>
                  <Text style={styles.detailValueMono}>{orderReference}</Text>
                </View>
                <Pressable
                  accessibilityLabel="Sao chép nội dung chuyển khoản"
                  accessibilityRole="button"
                  onPress={() => handleCopy('memo', orderReference)}
                  style={styles.copyBtn}
                >
                  <IconCopy color="#0B1E42" size={16} />
                  <Text style={styles.copyBtnText}>
                    {copiedField === 'memo' ? 'Đã sao chép' : 'Sao chép'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* Action Button */}
        <View style={styles.bottomActionWrap}>
          {isReconciling ? (
            <View style={styles.reconcileBox}>
              <ActivityIndicator color="#0B1E42" size="small" />
              <Text style={styles.reconcileText}>
                Đang đối soát tự động... Gạch nợ trong 3 giây
              </Text>
            </View>
          ) : (
            <Pressable
              accessibilityLabel="Xác nhận đã thanh toán"
              accessibilityRole="button"
              onPress={handleConfirmPaid}
              style={styles.confirmPaidBtn}
            >
              <Text style={styles.confirmPaidText}>Xác nhận đã thanh toán</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ponytail: basic simulated auto-reconciliation; add payOS webhook websocket push when backend gateway connected.
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B1E42',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  headerPlaceholder: {
    width: 44,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  priceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  priceLabel: {
    fontSize: 13,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: '600',
  },
  priceAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0B1E42',
    fontVariant: ['tabular-nums'],
    marginVertical: 6,
  },
  escrowNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 4,
  },
  escrowNoticeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
    marginLeft: 6,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B1E42',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  methodSelectorWrap: {
    gap: 10,
    marginBottom: 16,
  },
  methodOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  methodOptionActive: {
    borderColor: '#0B1E42',
    backgroundColor: '#F8FAFC',
  },
  methodLeftWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B1E42',
  },
  methodDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  radioOuterActive: {
    borderColor: '#0B1E42',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0B1E42',
  },
  walletDetailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    padding: 16,
    marginBottom: 16,
  },
  walletInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  walletLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  walletLimitValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
    fontVariant: ['tabular-nums'],
  },
  walletNoteText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  qrDoubleBezelOuter: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  qrDoubleBezelInner: {
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.04)',
    padding: 16,
    alignItems: 'center',
  },
  napasBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  napasBankTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0B1E42',
  },
  napasBadge: {
    backgroundColor: '#1E40AF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  napasBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  qrCodeWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    marginVertical: 8,
  },
  qrInstruction: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
  bankDetailsTable: {
    marginTop: 14,
    gap: 12,
  },
  bankDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  flexOne: {
    flex: 1,
    marginRight: 8,
  },
  detailLabel: {
    fontSize: 11,
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  detailValueBold: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B1E42',
    marginTop: 2,
  },
  detailValueMono: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0B1E42',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0B1E42',
    marginLeft: 6,
  },
  bottomActionWrap: {
    marginTop: 8,
    marginBottom: 24,
  },
  confirmPaidBtn: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#0B1E42',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  confirmPaidText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  reconcileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 16,
  },
  reconcileText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginLeft: 10,
  },
});
