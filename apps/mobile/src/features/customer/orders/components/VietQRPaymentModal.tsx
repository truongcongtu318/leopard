import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { colors, radius, spacing, typography } from '../../../../theme/tokens';
import { Button } from '../../../../ui/Button';
import { IconCopy, IconQrPayment, IconSecurityShield } from '../../../../ui/icons/CoreIcons';

export type VietQRPaymentModalProps = Readonly<{
  visible: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
  amount: number;
  amountLabel?: string;
  orderReference?: string;
  qrPayload?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
}>;

function formatVnd(val: number): string {
  return new Intl.NumberFormat('vi-VN').format(val) + ' ₫';
}

export function VietQRPaymentModal({
  accountName = 'CONG TY CO PHAN LEOPARD LOGISTICS',
  accountNumber = '0383188888',
  amount,
  amountLabel,
  bankName = 'MB Bank (Ngân hàng Quân Đội)',
  onClose,
  onPaymentSuccess,
  orderReference = 'LP-2026-00123',
  qrPayload,
  visible,
}: VietQRPaymentModalProps) {
  const [isSuccess, setIsSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(900); // 15:00 minutes

  const finalAmountLabel = amountLabel || formatVnd(amount);
  const cleanRef = orderReference.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const effectivePayload =
    qrPayload ||
    `00020101021238540010A000000727012600069704220112${accountNumber}0208QRIBFTTA520400005303704540${amount}5802VN62${cleanRef.length.toString().padStart(2, '0')}${cleanRef}6304ABCD`;

  // Countdown timer
  useEffect(() => {
    if (!visible || isSuccess) return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [visible, isSuccess]);

  // Reset states when modal opens
  useEffect(() => {
    if (visible) {
      setIsSuccess(false);
      setRemainingSeconds(900);
      setCopiedField(null);
    }
  }, [visible]);

  const onPaymentSuccessRef = useRef(onPaymentSuccess);
  useEffect(() => {
    onPaymentSuccessRef.current = onPaymentSuccess;
  }, [onPaymentSuccess]);

  // Auto transition to onPaymentSuccess after 1.5s in success state
  useEffect(() => {
    if (!isSuccess) return;
    const timer = setTimeout(() => {
      onPaymentSuccessRef.current();
    }, 1600);
    return () => clearTimeout(timer);
  }, [isSuccess]);

  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const handleCopy = (field: string, text: string) => {
    setCopiedField(field);
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const handleConfirmPaid = () => {
    setIsSuccess(true);
  };

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <Modal animationType="fade" transparent visible={visible}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <View style={styles.headerIconBox}>
                <IconQrPayment color="#0B1E42" size={20} />
              </View>
              <View>
                <Text style={styles.modalTitle}>
                  {isSuccess ? 'Thanh toán thành công' : 'Thanh toán VietQR'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {isSuccess
                    ? 'Đang chuẩn bị điều phối tài xế...'
                    : 'Quét mã qua app ngân hàng hoặc ví điện tử'}
                </Text>
              </View>
            </View>
            {!isSuccess ? (
              <Pressable
                accessibilityLabel="Đóng modal thanh toán"
                accessibilityRole="button"
                onPress={onClose}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            ) : null}
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {isSuccess ? (
              /* ========================================================= */
              /* 🎉 TRẠNG THÁI CHÚC MỪNG THANH TOÁN THÀNH CÔNG */
              /* ========================================================= */
              <View style={styles.successWrapper}>
                <View style={styles.successCircleOuter}>
                  <View style={styles.successCircleInner}>
                    <Text style={styles.successCheckIcon}>✓</Text>
                  </View>
                </View>

                <Text style={styles.successHeading}>Thanh toán thành công!</Text>
                <Text style={styles.successAmount}>{finalAmountLabel}</Text>

                <View style={styles.successDetailBox}>
                  <Text style={styles.successDetailRow}>
                    Mã đơn hàng: <Text style={styles.boldText}>{orderReference}</Text>
                  </Text>
                  <Text style={styles.successDetailRow}>
                    Phương thức: <Text style={styles.boldText}>VietQR (Napas 24/7)</Text>
                  </Text>
                </View>

                <View style={styles.autoAdvanceRow}>
                  <View style={styles.pulseIndicator} />
                  <Text style={styles.autoAdvanceText}>
                    Đang chuyển sang màn hình tìm tài xế...
                  </Text>
                </View>

                <Button
                  label="Tiếp tục ngay ➔"
                  onPress={onPaymentSuccess}
                  size="driver-primary"
                  variant="primary"
                />
              </View>
            ) : (
              /* ========================================================= */
              /* 💳 TRẠNG THÁI QUÉT MÃ QR & THÔNG TIN CHUYỂN KHOẢN */
              /* ========================================================= */
              <View style={styles.qrFlowWrapper}>
                {/* QR Code Container */}
                <View style={styles.qrCodeCard}>
                  <View style={styles.qrBankRow}>
                    <Text style={styles.qrBankName}>{bankName}</Text>
                    <View style={styles.napasBadge}>
                      <Text style={styles.napasBadgeText}>NAPAS 24/7</Text>
                    </View>
                  </View>

                  <View accessibilityLabel="Mã QR thanh toán VietQR" style={styles.qrCodeBox}>
                    <QRCode size={180} value={effectivePayload} />
                  </View>

                  <Text style={styles.qrHint}>
                    Mở app ngân hàng bất kỳ để quét mã tự động điền số tiền và nội dung
                  </Text>
                </View>

                {/* Countdown & Status */}
                <View style={styles.timerRow}>
                  <Text style={styles.timerLabel}>Giữ mã thanh toán:</Text>
                  <Text style={styles.timerClock}>{timeFormatted}</Text>
                </View>

                {/* Transfer Information Table */}
                <View style={styles.infoTableCard}>
                  <Text style={styles.infoTableTitle}>HOẶC CHUYỂN KHOẢN THỦ CÔNG</Text>

                  {/* STK */}
                  <View style={styles.infoRow}>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Số tài khoản</Text>
                      <Text style={styles.infoValHighlight}>{accountNumber}</Text>
                    </View>
                    <Pressable
                      accessibilityLabel="Sao chép số tài khoản"
                      accessibilityRole="button"
                      onPress={() => handleCopy('accountNumber', accountNumber)}
                      style={[
                        styles.copyBtn,
                        copiedField === 'accountNumber' && styles.copyBtnSuccess,
                      ]}
                    >
                      <IconCopy
                        color={copiedField === 'accountNumber' ? '#16A34A' : '#0B1E42'}
                        size={14}
                      />
                      <Text
                        style={[
                          styles.copyBtnText,
                          copiedField === 'accountNumber' && styles.copyBtnTextSuccess,
                        ]}
                      >
                        {copiedField === 'accountNumber' ? 'Đã chép' : 'Sao chép'}
                      </Text>
                    </Pressable>
                  </View>

                  {/* Chủ TK */}
                  <View style={styles.infoRowDivider} />
                  <View style={styles.infoRow}>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Chủ tài khoản</Text>
                      <Text style={styles.infoVal}>{accountName}</Text>
                    </View>
                  </View>

                  {/* Số tiền */}
                  <View style={styles.infoRowDivider} />
                  <View style={styles.infoRow}>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Số tiền chính xác</Text>
                      <Text style={styles.infoValPrice}>{finalAmountLabel}</Text>
                    </View>
                    <Pressable
                      accessibilityLabel="Sao chép số tiền"
                      accessibilityRole="button"
                      onPress={() => handleCopy('amount', String(amount))}
                      style={[
                        styles.copyBtn,
                        copiedField === 'amount' && styles.copyBtnSuccess,
                      ]}
                    >
                      <IconCopy
                        color={copiedField === 'amount' ? '#16A34A' : '#0B1E42'}
                        size={14}
                      />
                      <Text
                        style={[
                          styles.copyBtnText,
                          copiedField === 'amount' && styles.copyBtnTextSuccess,
                        ]}
                      >
                        {copiedField === 'amount' ? 'Đã chép' : 'Sao chép'}
                      </Text>
                    </Pressable>
                  </View>

                  {/* Nội dung */}
                  <View style={styles.infoRowDivider} />
                  <View style={styles.infoRow}>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Nội dung chuyển khoản</Text>
                      <Text style={styles.infoValHighlight}>{cleanRef}</Text>
                    </View>
                    <Pressable
                      accessibilityLabel="Sao chép nội dung chuyển khoản"
                      accessibilityRole="button"
                      onPress={() => handleCopy('reference', cleanRef)}
                      style={[
                        styles.copyBtn,
                        copiedField === 'reference' && styles.copyBtnSuccess,
                      ]}
                    >
                      <IconCopy
                        color={copiedField === 'reference' ? '#16A34A' : '#0B1E42'}
                        size={14}
                      />
                      <Text
                        style={[
                          styles.copyBtnText,
                          copiedField === 'reference' && styles.copyBtnTextSuccess,
                        ]}
                      >
                        {copiedField === 'reference' ? 'Đã chép' : 'Sao chép'}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Safety notice */}
                <View style={styles.trustBanner}>
                  <IconSecurityShield color="#16A34A" size={16} />
                  <Text style={styles.trustBannerText}>
                    Hệ thống tự động xác nhận trong vòng 5–15 giây sau khi ngân hàng xử lý thành công.
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.btnStack}>
                  <Button
                    label="Tôi đã chuyển khoản ➔"
                    onPress={handleConfirmPaid}
                    size="driver-primary"
                    variant="primary"
                  />
                  <Pressable
                    accessibilityLabel="Thanh toán sau hoặc đóng"
                    accessibilityRole="button"
                    onPress={onClose}
                    style={styles.btnLater}
                  >
                    <Text style={styles.btnLaterText}>Để sau / Đóng</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0F4F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  qrFlowWrapper: {
    gap: 12,
  },
  qrCodeCard: {
    backgroundColor: '#F0F4F9',
    borderColor: '#CBD5E1',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 10,
  },
  qrBankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
  },
  qrBankName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#061226',
  },
  napasBadge: {
    backgroundColor: '#0B1E42',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  napasBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  qrCodeBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  qrHint: {
    fontSize: 11.5,
    color: '#0C4A6E',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 10,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  timerLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  timerClock: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  infoTableCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  infoTableTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  infoCol: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  infoValHighlight: {
    fontSize: 14,
    fontWeight: '800',
    color: '#061226',
    letterSpacing: 0.5,
  },
  infoValPrice: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0B1E42',
  },
  infoRowDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F4F9',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  copyBtnSuccess: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  copyBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0B1E42',
  },
  copyBtnTextSuccess: {
    color: '#16A34A',
  },
  trustBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  trustBannerText: {
    fontSize: 11.5,
    color: '#166534',
    flex: 1,
    lineHeight: 16,
  },
  btnStack: {
    gap: 8,
    marginTop: 4,
  },
  btnLater: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  btnLaterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  /* Success Styles */
  successWrapper: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 14,
  },
  successCircleOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCircleInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCheckIcon: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
  },
  successHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  successAmount: {
    fontSize: 24,
    fontWeight: '900',
    color: '#16A34A',
  },
  successDetailBox: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    width: '100%',
    gap: 6,
  },
  successDetailRow: {
    fontSize: 13,
    color: '#475569',
  },
  boldText: {
    fontWeight: '700',
    color: '#0F172A',
  },
  autoAdvanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  pulseIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0B1E42',
  },
  autoAdvanceText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0B1E42',
  },
});
