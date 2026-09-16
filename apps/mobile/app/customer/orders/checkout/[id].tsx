import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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
  colors,
  customerPalette,
  IconChevron,
  IconCopy,
  IconSecurityShield,
  iosContinuousCurve,
  leopardPalette,
  systemFontFamily,
  typeScale,
} from '@leopard/mobile-core';

import {
  getDefaultHttpClient,
  type CustomerHttpClient,
} from '../../../../src/features/customer/orders/adapter';

export interface OrderCheckoutProps {
  orderId?: string;
  amount?: number;
  onSuccess?: () => void;
  onBack?: () => void;
  client?: CustomerHttpClient;
}

// Polling + countdown constants (conflict-free)
const PAYMENT_EXPIRY_SECONDS = 600; // 10-minute QR validity window
const RECONCILE_MAX_TICKS = 30; // 30 ticks * 2s = 60s timeout
const RECONCILE_POLL_MS = 2000;

interface PaymentApiResponse {
  id?: string;
  orderId?: string;
  amountVnd?: number;
  status?: string;
  provider?: string;
  providerReference?: string;
  qrPayload?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  memo?: string;
  referenceLabel?: string;
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

function generateClientRequestId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // fallback below
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function formatCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const mm = Math.floor(clamped / 60);
  const ss = clamped % 60;
  return `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
}

export default function OrderCheckoutScreen({
  amount: propAmount,
  client: propClient,
  onBack,
  onSuccess,
  orderId: propOrderId,
}: OrderCheckoutProps = {}) {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    amount?: string;
    origin?: string;
    destination?: string;
    vehicleType?: string;
    vehicleName?: string;
  }>();

  const id = propOrderId || params.id || '11111111-1111-4111-8111-111111111001';
  const initialRawAmount = propAmount ?? (params.amount ? Number(params.amount) : 280000);
  const initialAmount = Number.isFinite(initialRawAmount) ? initialRawAmount : 280000;

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(PAYMENT_EXPIRY_SECONDS);
  const [isExpired, setIsExpired] = useState(false);
  const [renderExpired, setRenderExpired] = useState(false);
  const [showTimeoutBanner, setShowTimeoutBanner] = useState(false);

  const [qrPayload, setQrPayload] = useState<string>('');
  const [bankName, setBankName] = useState<string>('VietQR (Napas 24/7)');
  const [bankTitle, setBankTitle] = useState<string>('VIETQR');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('CONG TY CO PHAN LEOPARD LOGISTICS');
  const [orderReference, setOrderReference] = useState<string>(formatOrderRef(id));
  const [amount, setAmount] = useState<number>(initialAmount);
  const [isLoadingPayment, setIsLoadingPayment] = useState<boolean>(true);

  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeClient = propClient ?? getDefaultHttpClient();

  // Step 1: Create payment intent on mount
  useEffect(() => {
    let isMounted = true;
    const clientRequestId = generateClientRequestId();

    async function createPayment() {
      try {
        setIsLoadingPayment(true);
        const res = await activeClient.post<PaymentApiResponse>(
          `/orders/${id}/payments`,
          { clientRequestId },
        );

        if (!isMounted) return;

        if (res) {
          if (res.qrPayload) setQrPayload(res.qrPayload);
          if (typeof res.amountVnd === 'number' && Number.isFinite(res.amountVnd)) {
            setAmount(res.amountVnd);
          }
          if (res.bankName) {
            setBankName(res.bankName);
            setBankTitle(res.bankName.split(' ')[0].toUpperCase());
          } else if (res.provider) {
            setBankName(res.provider === 'DEMO' ? 'Ngân hàng Demo' : 'VietQR payOS (Napas 24/7)');
            setBankTitle(`${res.provider} BANK`);
          }
          if (res.accountNumber) {
            setAccountNumber(res.accountNumber);
          } else if (res.providerReference) {
            setAccountNumber(res.providerReference);
          }
          if (res.accountName) {
            setAccountName(res.accountName);
          }
          if (res.memo) {
            setOrderReference(res.memo);
          } else if (res.referenceLabel) {
            setOrderReference(res.referenceLabel);
          }
        }
      } catch {
        // Fallback gracefully on network / auth error
      } finally {
        if (isMounted) {
          setIsLoadingPayment(false);
        }
      }
    }

    createPayment();

    return () => {
      isMounted = false;
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, [id, activeClient]);

  // Step 1.5: 10-minute order expiry countdown + auto-cancel
  useEffect(() => {
    if (isExpired) return undefined;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsExpired(true);
          setRenderExpired(true);
          // Auto-cancel order on backend
          activeClient
            .post(`/orders/${id}/cancel`, {
              reason: 'Hết hạn thanh toán tự động (10 phút)',
            })
            .catch(() => {});
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [id, isExpired, activeClient]);

  // Step 2: Poll GET /orders/:id/payments during reconciliation (max 60s)
  useEffect(() => {
    if (!isReconciling) return undefined;
    let isMounted = true;
    let ticks = 0;

    async function checkStatus() {
      try {
        const payments = await activeClient.get<
          Array<{
            id?: string;
            status?: string;
            amountVnd?: number;
          }>
        >(`/orders/${id}/payments`);

        if (!isMounted) return;

        const isPaid =
          Array.isArray(payments) &&
          payments.some(
            (p) => p.status === 'PAID_MANUAL' || p.status === 'SUCCEEDED',
          );

        if (isPaid) {
          setIsReconciling(false);
          if (onSuccess) {
            onSuccess();
          } else {
            const hasExtraParams =
              params.origin ||
              params.destination ||
              params.vehicleType ||
              params.vehicleName;

            if (hasExtraParams) {
              router.replace({
                pathname: `/customer/orders/searching/${id}`,
                params: {
                  amount: params.amount,
                  origin: params.origin,
                  destination: params.destination,
                  vehicleType: params.vehicleType,
                  vehicleName: params.vehicleName,
                },
              });
            } else {
              router.replace(`/customer/orders/searching/${id}`);
            }
          }
          return;
        }

        ticks += 1;
        if (ticks >= RECONCILE_MAX_TICKS) {
          setIsReconciling(false);
          setShowTimeoutBanner(true);
        }
      } catch {
        // Safe retry on next poll tick
        ticks += 1;
        if (ticks >= RECONCILE_MAX_TICKS && isMounted) {
          setIsReconciling(false);
          setShowTimeoutBanner(true);
        }
      }
    }

    checkStatus();
    const interval = setInterval(checkStatus, RECONCILE_POLL_MS);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isReconciling, id, onSuccess, router, activeClient]);

  function handleRetryReconcile() {
    setShowTimeoutBanner(false);
    setIsReconciling(true);
  }

  async function handleCancelOrder() {
    try {
      await activeClient.post(`/orders/${id}/cancel`, {
        reason: 'Khách hàng hủy đơn từ màn thanh toán',
      });
    } catch {
      // Continue redirect even if cancel fails
    }
    router.replace('/customer/orders');
  }

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

  // ponytail: fallback dummy string avoids react-native-qrcode-svg crash before dynamic API response arrives
  const qrDisplayValue = qrPayload || `LEOPARD-ORDER-${id}`;

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
          <IconChevron color={customerPalette.textSlateDark} direction="left" size={22} />
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

          {/* Countdown pill */}
          <View
            accessibilityLabel="Thời gian còn lại để thanh toán"
            style={[
              styles.countdownPill,
              secondsRemaining <= 30 && styles.countdownPillUrgent,
              secondsRemaining > 30 &&
                secondsRemaining <= 120 &&
                styles.countdownPillWarning,
            ]}
            testID="payment-expiry-countdown"
          >
            <Text
              style={[
                styles.countdownText,
                secondsRemaining <= 30 && styles.countdownTextUrgent,
                secondsRemaining > 30 &&
                  secondsRemaining <= 120 &&
                  styles.countdownTextWarning,
              ]}
            >
              Hết hạn sau {formatCountdown(secondsRemaining)}
            </Text>
          </View>
          <View style={styles.escrowNoticeRow}>
            <IconSecurityShield color={colors.success.text} size={16} />
            <Text style={styles.escrowNoticeText}>
              Bảo chứng 100% · Hoàn cọc tức thì nếu tài xế không nhận cuốc
            </Text>
          </View>
        </View>

        {/* VietQR Dynamic Code & Bank Details */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Chuyển khoản VietQR payOS</Text>
        </View>

        <View style={styles.qrDoubleBezelOuter}>
            <View style={styles.qrDoubleBezelInner}>
              <View style={styles.napasBadgeRow}>
                <Text style={styles.napasBankTitle}>{bankTitle}</Text>
                <View style={styles.napasBadge}>
                  <Text style={styles.napasBadgeText}>NAPAS 24/7</Text>
                </View>
              </View>

              {/* QR Code Container */}
              <View style={styles.qrCodeWrapper}>
                {isLoadingPayment ? (
                  <ActivityIndicator color={customerPalette.textSlateDark} size="large" />
                ) : (
                  <QRCode
                    size={190}
                    testID="vietqr-code"
                    value={qrDisplayValue}
                  />
                )}
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
              {accountNumber ? (
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
                    <IconCopy color={customerPalette.textSlateDark} size={16} />
                    <Text style={styles.copyBtnText}>
                      {copiedField === 'accountNumber' ? 'Đã sao chép' : 'Sao chép'}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

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
                  <IconCopy color={customerPalette.textSlateDark} size={16} />
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
                  <IconCopy color={customerPalette.textSlateDark} size={16} />
                  <Text style={styles.copyBtnText}>
                    {copiedField === 'memo' ? 'Đã sao chép' : 'Sao chép'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
      </ScrollView>

      {/* Timeout banner */}
      {showTimeoutBanner && !isReconciling ? (
        <View style={styles.timeoutBanner} testID="reconcile-timeout-banner">
          <Text style={styles.timeoutTitle}>Chưa ghi nhận giao dịch</Text>
          <Text style={styles.timeoutDesc}>
            Hệ thống chưa nhận được tiền sau 60 giây. Nếu bạn đã chuyển khoản,
            ngân hàng có thể đang xử lý chậm. Hãy kiểm tra lại hoặc hủy đơn.
          </Text>
        </View>
      ) : null}

      {/* Sticky Bottom Action Dock */}
      <View style={styles.stickyBottomBar}>
        {isReconciling ? (
          <View style={styles.reconcileBox}>
            <ActivityIndicator color={customerPalette.textSlateDark} size="small" />
            <Text style={styles.reconcileText}>
              Đang đối soát tự động... Gạch nợ trong vài giây
            </Text>
          </View>
        ) : showTimeoutBanner ? (
          <View style={styles.retryRow}>
            <Pressable
              accessibilityLabel="Kiểm tra lại"
              accessibilityRole="button"
              onPress={handleRetryReconcile}
              style={({ pressed }) => [
                styles.confirmPaidBtn,
                pressed ? styles.btnPressed : null,
              ]}
            >
              <Text style={styles.confirmPaidText}>Kiểm tra lại</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Hủy đơn hàng này"
              accessibilityRole="button"
              onPress={handleCancelOrder}
              style={({ pressed }) => [
                styles.cancelOrderBtn,
                pressed ? styles.btnPressed : null,
              ]}
            >
              <Text style={styles.cancelOrderText}>Hủy đơn</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityLabel="Xác nhận đã thanh toán"
            accessibilityRole="button"
            onPress={handleConfirmPaid}
            style={({ pressed }) => [
              styles.confirmPaidBtn,
              pressed ? styles.btnPressed : null,
            ]}
          >
            <Text style={styles.confirmPaidText}>Xác nhận đã thanh toán</Text>
          </Pressable>
        )}
      </View>

      {/* Expired modal */}
      {renderExpired ? (
        <View style={styles.expiredOverlay} testID="payment-expired-modal">
          <View style={styles.expiredCard}>
            <Text style={styles.expiredTitle}>Hết hạn thanh toán</Text>
            <Text style={styles.expiredDesc}>
              Đơn hàng đã hết hạn thanh toán sau 10 phút. Đơn đã được tự động
              hủy. Vui lòng tạo đơn mới nếu bạn vẫn cần vận chuyển.
            </Text>
            <Pressable
              accessibilityLabel="Về danh sách đơn"
              accessibilityRole="button"
              onPress={() => router.replace('/customer/orders')}
              style={styles.expiredBtn}
            >
              <Text style={styles.expiredBtnText}>Về danh sách đơn</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: customerPalette.canvas,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: customerPalette.surfaceWhite,
    borderBottomWidth: 1,
    borderBottomColor: customerPalette.cardBorder,
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
    color: customerPalette.textSlateDark,
  },
  headerSubtitle: {
    fontSize: 12,
    color: customerPalette.textSubtle,
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
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: customerPalette.textSlateDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  priceLabel: {
    fontSize: 13,
    color: customerPalette.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: '600',
  },
  priceAmount: {
    fontSize: typeScale.largeTitle.fontSize,
    fontWeight: '800',
    color: customerPalette.textSlateDark,
    fontVariant: ['tabular-nums'],
    marginVertical: 6,
  },
  escrowNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: leopardPalette.ecoGreenBg,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 4,
  },
  escrowNoticeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success.text,
    marginLeft: 6,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: typeScale.subheadline.fontSize,
    fontWeight: '700',
    color: customerPalette.textSlateDark,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  qrDoubleBezelOuter: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    backgroundColor: customerPalette.surfaceWhite,
    padding: 16,
    marginBottom: 16,
    shadowColor: customerPalette.textSlateDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  qrDoubleBezelInner: {
    borderRadius: 18,
    backgroundColor: customerPalette.canvas,
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
    color: customerPalette.textSlateDark,
  },
  napasBadge: {
    backgroundColor: colors.brand.blue,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  napasBadgeText: {
    fontSize: typeScale.caption2.fontSize,
    fontWeight: '800',
    color: customerPalette.surfaceWhite,
    letterSpacing: 0.5,
  },
  qrCodeWrapper: {
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    marginVertical: 8,
    minWidth: 214,
    minHeight: 214,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrInstruction: {
    fontSize: 12,
    color: customerPalette.textSubtle,
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
    color: leopardPalette.inputPlaceholder,
    textTransform: 'uppercase',
  },
  detailValueBold: {
    fontSize: typeScale.subheadline.fontSize,
    fontWeight: '700',
    color: customerPalette.textSlateDark,
    marginTop: 2,
  },
  detailValueMono: {
    fontSize: 15,
    fontWeight: '700',
    color: customerPalette.textSlateDark,
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
    backgroundColor: colors.neutral.surfaceMuted,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: customerPalette.textSlateDark,
    marginLeft: 6,
  },
  stickyBottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.select({ ios: 16, default: 14 }),
    backgroundColor: customerPalette.surfaceWhite,
    borderTopWidth: 1,
    borderTopColor: customerPalette.cardBorder,
    shadowColor: customerPalette.textSlateDark,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmPaidBtn: {
    height: 54,
    minHeight: 54,
    borderRadius: 16,
    ...iosContinuousCurve,
    backgroundColor: customerPalette.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  confirmPaidText: {
    color: customerPalette.surfaceWhite,
    fontFamily: systemFontFamily,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  reconcileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    minHeight: 52,
    borderRadius: 16,
    ...iosContinuousCurve,
    backgroundColor: colors.warning.background,
    borderWidth: 1,
    borderColor: colors.warning.border,
    paddingHorizontal: 16,
  },
  reconcileText: {
    fontSize: typeScale.subheadline.fontSize,
    fontWeight: '600',
    color: colors.warning.text,
    marginLeft: 10,
  },
  countdownPill: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.neutral.surfaceMuted,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
    alignSelf: 'center',
  },
  countdownPillWarning: {
    backgroundColor: colors.warning.background,
    borderColor: colors.warning.border,
  },
  countdownPillUrgent: {
    backgroundColor: colors.danger.background,
    borderColor: colors.danger.border,
  },
  countdownText: {
    fontSize: 13,
    fontWeight: '700',
    color: customerPalette.textSlateDark,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.2,
  },
  countdownTextWarning: {
    color: colors.warning.text,
  },
  countdownTextUrgent: {
    color: colors.danger.text,
  },
  timeoutBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    ...iosContinuousCurve,
    backgroundColor: colors.warning.background,
    borderWidth: 1,
    borderColor: colors.warning.border,
  },
  timeoutTitle: {
    fontSize: typeScale.subheadline.fontSize,
    fontWeight: '700',
    color: colors.warning.text,
  },
  timeoutDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.warning.text,
    marginTop: 4,
  },
  retryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelOrderBtn: {
    flex: 1,
    height: 52,
    minHeight: 52,
    borderRadius: 16,
    ...iosContinuousCurve,
    backgroundColor: customerPalette.surfaceWhite,
    borderWidth: 1,
    borderColor: colors.danger.border,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  cancelOrderText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.danger.text,
  },
  expiredOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 30, 66, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  expiredCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: 24,
    ...iosContinuousCurve,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
    shadowColor: customerPalette.textSlateDark,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 8,
  },
  expiredTitle: {
    fontSize: typeScale.body.fontSize,
    fontWeight: '800',
    color: customerPalette.textSlateDark,
    textAlign: 'center',
  },
  expiredDesc: {
    fontSize: typeScale.subheadline.fontSize,
    lineHeight: 20,
    color: customerPalette.textMutedSlate,
    textAlign: 'center',
    marginTop: 10,
  },
  expiredBtn: {
    marginTop: 20,
    width: '100%',
    height: 52,
    minHeight: 52,
    borderRadius: 16,
    ...iosContinuousCurve,
    backgroundColor: customerPalette.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expiredBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: customerPalette.surfaceWhite,
  },
});
