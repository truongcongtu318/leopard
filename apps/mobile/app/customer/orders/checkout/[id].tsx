import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Clipboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import {
  AppText,
  Button,
  colors,
  customerPalette,
  haptic,
  IconBank,
  IconCopy,
  IconPaymentConvenient,
  IconQrPayment,
  IconReceipt,
  IconSecurityShield,
  IconWallet,
  iosContinuousCurve,
  leopardPalette,
  radius,
  ScreenScaffold,
  spacing,
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

type PaymentMethodType = 'vietqr' | 'wallet' | 'cash';

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

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('vietqr');
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
    haptic.selection();
    setShowTimeoutBanner(false);
    setIsReconciling(true);
  }

  async function handleCancelOrder() {
    haptic.warning();
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
    haptic.light();
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
    haptic.selection();
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const handleConfirmPaid = () => {
    haptic.medium();
    setIsReconciling(true);
  };

  // Fallback dummy string avoids react-native-qrcode-svg crash before dynamic API response arrives
  const qrDisplayValue = qrPayload || `LEOPARD-ORDER-${id}`;

  // Calculated breakdown amounts
  const baseShippingFee = Math.round(amount * 0.85);
  const handlingFee = Math.max(0, amount - baseShippingFee);

  const paymentMethods: Array<{
    id: PaymentMethodType;
    title: string;
    subtitle: string;
    badge?: string;
    icon: (selected: boolean) => React.ReactNode;
  }> = [
    {
      id: 'vietqr',
      title: 'Chuyển khoản VietQR',
      subtitle: 'Napas 24/7 · Xác thực tự động tức thì',
      badge: 'Khuyên dùng',
      icon: (selected) => (
        <IconQrPayment
          color={selected ? customerPalette.primary : customerPalette.textSlateDark}
          size={22}
        />
      ),
    },
    {
      id: 'wallet',
      title: 'Ví LEOPARD Escrow',
      subtitle: 'Khả dụng: 1.250.000 ₫ · Trừ trực tiếp',
      badge: 'Bảo chứng',
      icon: (selected) => (
        <IconWallet
          color={selected ? customerPalette.primary : customerPalette.textSlateDark}
          size={22}
        />
      ),
    },
    {
      id: 'cash',
      title: 'Tiền mặt khi nhận hàng',
      subtitle: 'Thanh toán trực tiếp cho tài xế COD',
      icon: (selected) => (
        <IconPaymentConvenient
          color={selected ? customerPalette.primary : customerPalette.textSlateDark}
          size={22}
        />
      ),
    },
  ];

  return (
    <ScreenScaffold
      onBack={handleBack}
      subtitle="Ký quỹ bảo vệ chuyến đi LEOPARD Escrow"
      title="Xác nhận & Thanh toán"
      stickyFooter={
        <View style={styles.stickyFooterContainer}>
          {/* Timeout banner */}
          {showTimeoutBanner && !isReconciling ? (
            <View style={styles.timeoutBanner} testID="reconcile-timeout-banner">
              <AppText style={styles.timeoutTitle} variant="subheadline">
                Chưa ghi nhận giao dịch
              </AppText>
              <AppText style={styles.timeoutDesc} variant="footnote">
                Hệ thống chưa nhận được tiền sau 60 giây. Nếu bạn đã chuyển khoản,
                ngân hàng có thể đang xử lý chậm. Hãy kiểm tra lại hoặc hủy đơn.
              </AppText>
            </View>
          ) : null}

          {/* Sticky Bottom Actions */}
          {isReconciling ? (
            <View style={styles.reconcileBox}>
              <ActivityIndicator color={colors.warning.text} size="small" />
              <AppText style={styles.reconcileText} variant="subheadline">
                Đang đối soát tự động... Gạch nợ trong vài giây
              </AppText>
            </View>
          ) : showTimeoutBanner ? (
            <View style={styles.retryRow}>
              <View style={styles.flexOne}>
                <Button
                  label="Kiểm tra lại"
                  onPress={handleRetryReconcile}
                  size="large"
                  variant="prominent"
                />
              </View>
              <View style={styles.flexOne}>
                <Button
                  label="Hủy đơn"
                  onPress={handleCancelOrder}
                  size="large"
                  variant="destructive"
                />
              </View>
            </View>
          ) : (
            <Button
              label="Xác nhận đã thanh toán"
              onPress={handleConfirmPaid}
              size="large"
              variant="prominent"
            />
          )}
        </View>
      }
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        {/* Price Hero Section */}
        <View style={styles.priceCard}>
          <AppText style={styles.priceLabel} variant="footnote">
            TỔNG TIỀN KÝ QUỸ (ESCROW)
          </AppText>
          <AppText style={styles.priceAmount} variant="largeTitle">
            {formatVnd(amount)}
          </AppText>

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
            <AppText
              style={[
                styles.countdownText,
                secondsRemaining <= 30 && styles.countdownTextUrgent,
                secondsRemaining > 30 &&
                  secondsRemaining <= 120 &&
                  styles.countdownTextWarning,
              ]}
              variant="footnote"
            >
              Hết hạn sau {formatCountdown(secondsRemaining)}
            </AppText>
          </View>

          <View style={styles.escrowNoticeRow}>
            <IconSecurityShield color={colors.success.text} size={16} />
            <AppText style={styles.escrowNoticeText} variant="caption1">
              Bảo chứng 100% · Hoàn cọc tức thì nếu tài xế không nhận cuốc
            </AppText>
          </View>
        </View>

        {/* Payment Methods Selector */}
        <View style={styles.sectionHeader}>
          <AppText style={styles.sectionTitle} variant="subheadline">
            PHƯƠNG THỨC THANH TOÁN
          </AppText>
        </View>

        <View style={styles.methodsCard}>
          {paymentMethods.map((method, index) => {
            const isSelected = paymentMethod === method.id;
            const isLast = index === paymentMethods.length - 1;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={method.id}
                onPress={() => {
                  haptic.selection();
                  setPaymentMethod(method.id);
                }}
                style={({ pressed }) => [
                  styles.methodRow,
                  isSelected && styles.methodRowSelected,
                  !isLast && styles.methodRowDivider,
                  pressed && styles.methodRowPressed,
                ]}
              >
                <View
                  style={[
                    styles.methodIconBox,
                    isSelected && styles.methodIconBoxSelected,
                  ]}
                >
                  {method.icon(isSelected)}
                </View>

                <View style={styles.methodInfo}>
                  <View style={styles.methodTitleRow}>
                    <AppText
                      style={[
                        styles.methodTitle,
                        isSelected && styles.methodTitleSelected,
                      ]}
                      variant="subheadline"
                    >
                      {method.title}
                    </AppText>
                    {method.badge ? (
                      <View
                        style={[
                          styles.methodBadge,
                          isSelected && styles.methodBadgeSelected,
                        ]}
                      >
                        <AppText
                          style={[
                            styles.methodBadgeText,
                            isSelected && styles.methodBadgeTextSelected,
                          ]}
                          variant="caption2"
                        >
                          {method.badge}
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                  <AppText style={styles.methodSubtitle} variant="caption1">
                    {method.subtitle}
                  </AppText>
                </View>

                {/* Radio Indicator */}
                <View
                  style={[
                    styles.radioCircle,
                    isSelected && styles.radioCircleSelected,
                  ]}
                >
                  {isSelected && <View style={styles.radioDot} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* VietQR Dynamic Code & Bank Details Table */}
        <View style={styles.sectionHeader}>
          <AppText style={styles.sectionTitle} variant="subheadline">
            CHUYỂN KHOẢN VIETQR PAYOS
          </AppText>
        </View>

        <View style={styles.qrDoubleBezelOuter}>
          <View style={styles.qrDoubleBezelInner}>
            <View style={styles.napasBadgeRow}>
              <View style={styles.bankTitleBox}>
                <IconBank color={customerPalette.primary} size={18} />
                <AppText style={styles.napasBankTitle} variant="subheadline">
                  {bankTitle}
                </AppText>
              </View>
              <View style={styles.napasBadge}>
                <AppText style={styles.napasBadgeText} variant="caption2">
                  NAPAS 24/7
                </AppText>
              </View>
            </View>

            {/* QR Code Container */}
            <View style={styles.qrCodeWrapper}>
              {isLoadingPayment ? (
                <ActivityIndicator color={customerPalette.primary} size="large" />
              ) : (
                <QRCode
                  size={190}
                  testID="vietqr-code"
                  value={qrDisplayValue}
                />
              )}
            </View>

            <AppText style={styles.qrInstruction} variant="caption1">
              Sử dụng ứng dụng ngân hàng bất kỳ để quét mã thanh toán tức thì
            </AppText>
          </View>

          {/* Bank Transfer Details Table */}
          <View style={styles.bankDetailsTable}>
            {/* Bank Name */}
            <View style={styles.bankDetailRow}>
              <AppText style={styles.detailLabel} variant="caption2">
                Ngân hàng thụ hưởng
              </AppText>
              <AppText style={styles.detailValueBold} variant="subheadline">
                {bankName}
              </AppText>
            </View>

            {/* Account Number */}
            {accountNumber ? (
              <View style={styles.bankDetailRow}>
                <View style={styles.flexOne}>
                  <AppText style={styles.detailLabel} variant="caption2">
                    Số tài khoản
                  </AppText>
                  <AppText style={styles.detailValueMono} variant="headline">
                    {accountNumber}
                  </AppText>
                </View>
                <Pressable
                  accessibilityLabel="Sao chép số tài khoản"
                  accessibilityRole="button"
                  onPress={() => handleCopy('accountNumber', accountNumber)}
                  style={({ pressed }) => [
                    styles.copyBtn,
                    pressed && styles.copyBtnPressed,
                  ]}
                >
                  <IconCopy color={customerPalette.textSlateDark} size={15} />
                  <AppText style={styles.copyBtnText} variant="caption1">
                    {copiedField === 'accountNumber' ? 'Đã sao chép' : 'Sao chép'}
                  </AppText>
                </Pressable>
              </View>
            ) : null}

            {/* Account Name */}
            <View style={styles.bankDetailRow}>
              <View style={styles.flexOne}>
                <AppText style={styles.detailLabel} variant="caption2">
                  Chủ tài khoản
                </AppText>
                <AppText numberOfLines={1} style={styles.detailValueBold} variant="subheadline">
                  {accountName}
                </AppText>
              </View>
              <Pressable
                accessibilityLabel="Sao chép tên chủ tài khoản"
                accessibilityRole="button"
                onPress={() => handleCopy('accountName', accountName)}
                style={({ pressed }) => [
                  styles.copyBtn,
                  pressed && styles.copyBtnPressed,
                ]}
              >
                <IconCopy color={customerPalette.textSlateDark} size={15} />
                <AppText style={styles.copyBtnText} variant="caption1">
                  {copiedField === 'accountName' ? 'Đã sao chép' : 'Sao chép'}
                </AppText>
              </Pressable>
            </View>

            {/* Payment Memo */}
            <View style={styles.bankDetailRow}>
              <View style={styles.flexOne}>
                <AppText style={styles.detailLabel} variant="caption2">
                  Nội dung chuyển khoản
                </AppText>
                <AppText style={styles.detailValueMono} variant="headline">
                  {orderReference}
                </AppText>
              </View>
              <Pressable
                accessibilityLabel="Sao chép nội dung chuyển khoản"
                accessibilityRole="button"
                onPress={() => handleCopy('memo', orderReference)}
                style={({ pressed }) => [
                  styles.copyBtn,
                  pressed && styles.copyBtnPressed,
                ]}
              >
                <IconCopy color={customerPalette.textSlateDark} size={15} />
                <AppText style={styles.copyBtnText} variant="caption1">
                  {copiedField === 'memo' ? 'Đã sao chép' : 'Sao chép'}
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Fare Breakdown Card */}
        <View style={styles.sectionHeader}>
          <AppText style={styles.sectionTitle} variant="subheadline">
            CHI TIẾT CƯỚC & KÝ QUỸ
          </AppText>
        </View>

        <View style={styles.breakdownCard}>
          <View style={styles.breakdownHeaderRow}>
            <IconReceipt color={customerPalette.primary} size={18} />
            <AppText style={styles.breakdownHeaderText} variant="subheadline">
              Bảng kê cước tạm tính
            </AppText>
          </View>

          <View style={styles.breakdownItemRow}>
            <AppText style={styles.breakdownItemLabel} variant="footnote">
              Cước vận chuyển cơ bản
            </AppText>
            <AppText style={styles.breakdownItemValue} variant="footnote">
              {formatVnd(baseShippingFee)}
            </AppText>
          </View>

          <View style={styles.breakdownItemRow}>
            <AppText style={styles.breakdownItemLabel} variant="footnote">
              Phụ phí bốc dỡ & xếp hàng
            </AppText>
            <AppText style={styles.breakdownItemValue} variant="footnote">
              {formatVnd(handlingFee)}
            </AppText>
          </View>

          <View style={styles.breakdownItemRow}>
            <AppText style={styles.breakdownItemLabel} variant="footnote">
              Bảo hiểm ký quỹ Escrow
            </AppText>
            <AppText style={styles.breakdownFreeTag} variant="footnote">
              Miễn phí
            </AppText>
          </View>

          <View style={styles.breakdownDivider} />

          <View style={styles.breakdownTotalRow}>
            <AppText style={styles.breakdownTotalLabel} variant="subheadline">
              Tổng thanh toán
            </AppText>
            <AppText style={styles.breakdownTotalValue} variant="headline">
              {formatVnd(amount)}
            </AppText>
          </View>
        </View>
      </ScrollView>

      {/* Expired Modal */}
      {renderExpired ? (
        <View style={styles.expiredOverlay} testID="payment-expired-modal">
          <View style={styles.expiredCard}>
            <View style={styles.expiredIconRing}>
              <IconSecurityShield color={colors.danger.text} size={32} />
            </View>
            <AppText style={styles.expiredTitle} variant="headline">
              Hết hạn thanh toán
            </AppText>
            <AppText style={styles.expiredDesc} variant="subheadline">
              Đơn hàng đã hết hạn thanh toán sau 10 phút. Đơn đã được tự động
              hủy. Vui lòng tạo đơn mới nếu bạn vẫn cần vận chuyển.
            </AppText>
            <View style={styles.expiredBtnWrap}>
              <Button
                label="Về danh sách đơn"
                onPress={() => router.replace('/customer/orders')}
                size="large"
                variant="prominent"
              />
            </View>
          </View>
        </View>
      ) : null}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  priceCard: {
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  priceLabel: {
    color: customerPalette.textSubtle,
    letterSpacing: 0.6,
    fontWeight: '700',
  },
  priceAmount: {
    color: customerPalette.primary,
    fontVariant: ['tabular-nums'],
    marginVertical: spacing.xxs,
    letterSpacing: -0.5,
  },
  escrowNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: leopardPalette.ecoGreenBg,
    borderRadius: radius.cardSm,
    ...iosContinuousCurve,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
  escrowNoticeText: {
    fontWeight: '600',
    color: colors.success.text,
    marginLeft: spacing.xs,
  },
  sectionHeader: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xxs,
  },
  sectionTitle: {
    fontWeight: '700',
    color: customerPalette.textSubtle,
    letterSpacing: 0.4,
  },
  // Methods selection
  methodsCard: {
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  methodRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: customerPalette.cardBorder,
  },
  methodRowSelected: {
    backgroundColor: 'rgba(11, 37, 69, 0.03)',
  },
  methodRowPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  methodIconBox: {
    width: 42,
    height: 42,
    borderRadius: radius.cardSm,
    ...iosContinuousCurve,
    backgroundColor: customerPalette.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  methodIconBoxSelected: {
    backgroundColor: 'rgba(11, 37, 69, 0.08)',
  },
  methodInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  methodTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  methodTitle: {
    fontWeight: '600',
    color: customerPalette.textSlateDark,
  },
  methodTitleSelected: {
    color: customerPalette.primary,
    fontWeight: '700',
  },
  methodSubtitle: {
    color: customerPalette.textSubtle,
    marginTop: 2,
  },
  methodBadge: {
    backgroundColor: customerPalette.canvas,
    borderRadius: radius.cardSm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  methodBadgeSelected: {
    backgroundColor: customerPalette.accent,
  },
  methodBadgeText: {
    fontWeight: '600',
    color: customerPalette.textSubtle,
  },
  methodBadgeTextSelected: {
    color: customerPalette.surfaceWhite,
    fontWeight: '700',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: customerPalette.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: customerPalette.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: customerPalette.primary,
  },
  // Double Bezel VietQR
  qrDoubleBezelOuter: {
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    backgroundColor: customerPalette.surfaceWhite,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  qrDoubleBezelInner: {
    borderRadius: radius.card,
    ...iosContinuousCurve,
    backgroundColor: customerPalette.canvas,
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.04)',
    padding: spacing.md,
    alignItems: 'center',
  },
  napasBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: spacing.sm,
  },
  bankTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  napasBankTitle: {
    fontWeight: '700',
    color: customerPalette.primary,
  },
  napasBadge: {
    backgroundColor: colors.brand.blue,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  napasBadgeText: {
    fontWeight: '700',
    color: customerPalette.surfaceWhite,
    letterSpacing: 0.5,
  },
  qrCodeWrapper: {
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    padding: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    marginVertical: spacing.xs,
    minWidth: 214,
    minHeight: 214,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrInstruction: {
    color: customerPalette.textSubtle,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 16,
  },
  bankDetailsTable: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  bankDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xxs,
  },
  flexOne: {
    flex: 1,
  },
  detailLabel: {
    color: customerPalette.textSubtle,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  detailValueBold: {
    fontWeight: '700',
    color: customerPalette.textSlateDark,
    marginTop: 2,
  },
  detailValueMono: {
    fontWeight: '700',
    color: customerPalette.primary,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
    letterSpacing: -0.3,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.cardSm,
    ...iosContinuousCurve,
    backgroundColor: colors.neutral.surfaceMuted,
    borderWidth: 1,
    borderColor: customerPalette.cardBorder,
  },
  copyBtnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  copyBtnText: {
    fontWeight: '600',
    color: customerPalette.primary,
    marginLeft: spacing.xxs,
  },
  // Breakdown Card
  breakdownCard: {
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  breakdownHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: customerPalette.cardBorder,
  },
  breakdownHeaderText: {
    fontWeight: '700',
    color: customerPalette.primary,
  },
  breakdownItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xxs,
  },
  breakdownItemLabel: {
    color: customerPalette.textSubtle,
  },
  breakdownItemValue: {
    color: customerPalette.textSlateDark,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  breakdownFreeTag: {
    color: colors.success.text,
    fontWeight: '700',
  },
  breakdownDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: customerPalette.cardBorder,
    marginVertical: spacing.xs,
  },
  breakdownTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xxs,
  },
  breakdownTotalLabel: {
    fontWeight: '700',
    color: customerPalette.primary,
  },
  breakdownTotalValue: {
    fontWeight: '800',
    color: customerPalette.primary,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  // Sticky footer & banner
  stickyFooterContainer: {
    width: '100%',
    gap: spacing.xs,
  },
  reconcileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    minHeight: 52,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    backgroundColor: colors.warning.background,
    borderWidth: 1,
    borderColor: colors.warning.border,
    paddingHorizontal: spacing.md,
  },
  reconcileText: {
    fontWeight: '600',
    color: colors.warning.text,
    marginLeft: spacing.xs,
  },
  countdownPill: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    backgroundColor: colors.warning.background,
    borderWidth: 1,
    borderColor: colors.warning.border,
  },
  timeoutTitle: {
    fontWeight: '700',
    color: colors.warning.text,
  },
  timeoutDesc: {
    lineHeight: 18,
    color: colors.warning.text,
    marginTop: spacing.xxs,
  },
  retryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  // Expired Modal
  expiredOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 37, 69, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    zIndex: 999,
  },
  expiredCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.modal,
    ...iosContinuousCurve,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 8,
  },
  expiredIconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.danger.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  expiredTitle: {
    fontWeight: '700',
    color: customerPalette.textSlateDark,
    textAlign: 'center',
  },
  expiredDesc: {
    lineHeight: 20,
    color: customerPalette.textSubtle,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  expiredBtnWrap: {
    marginTop: spacing.lg,
    width: '100%',
  },
});
