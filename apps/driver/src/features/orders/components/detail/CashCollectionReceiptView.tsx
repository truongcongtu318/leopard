import React, { useState } from 'react';
import {
  Alert,
  Clipboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import {
  Button,
  IconCheck,
  IconPhone,
  IconRoute,
  IconSecurityShield,
  IconTxPayment,
  ScreenScaffold,
  SlideToAction,
  colors,
  driverHapticMatrix,
  iosContinuousCurve,
  leopardPalette,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';
import type { DriverAssignedDetailView } from '../../model';
import { formatVndPrice } from '../../adapter';
import { callPhoneNumber } from './CargoAndContactCard';

export type CashCollectionReceiptViewProps = Readonly<{
  view: DriverAssignedDetailView;
  onConfirmCashPayment?: () => void;
  isConfirmingCash?: boolean;
  onBack?: () => void;
  onOpenIncidentModal?: () => void;
}>;

export function CashCollectionReceiptView({
  view,
  onConfirmCashPayment,
  isConfirmingCash = false,
  onBack,
  onOpenIncidentModal,
}: CashCollectionReceiptViewProps) {
  const { order } = view;
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const priceLabel =
    order.priceLabel ??
    (order.priceVnd != null ? formatVndPrice(order.priceVnd) : '183.312 ₫');

  const handleCopy = (text: string, fieldName: string) => {
    driverHapticMatrix.selectionChanged();
    Clipboard.setString(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleConfirmAction = () => {
    driverHapticMatrix.actionHeavy();
    if (onConfirmCashPayment) {
      onConfirmCashPayment();
    }
  };

  const stickyFooterNode = (
    <View style={styles.footerContainer} testID="cash-collection-footer">
      {/* Nút ẩn testID cho accessibility & test tự động */}
      <Pressable
        accessibilityHint="Bấm để ghi nhận thu đủ tiền mặt từ khách hàng"
        accessibilityLabel="Xác nhận đã thu tiền mặt"
        accessibilityRole="button"
        disabled={isConfirmingCash}
        onPress={handleConfirmAction}
        style={styles.a11yHiddenButton}
        testID="btn-confirm-cash"
      >
        <Text style={styles.a11yHiddenText}>Xác nhận đã thu tiền mặt</Text>
      </Pressable>

      {/* Thanh trượt SlideToAction chuẩn Grab Driver & Apple HIG */}
      <SlideToAction
        colorVariant="brand"
        disabled={isConfirmingCash}
        label={
          isConfirmingCash
            ? 'Đang ghi nhận...'
            : 'Trượt để xác nhận'
        }
        onActionComplete={handleConfirmAction}
        testID="cash-collection-slider"
      />
    </View>
  );

  return (
    <ScreenScaffold
      headerTone="plain"
      onBack={onBack}
      stickyFooter={stickyFooterNode}
      title="Thu tiền mặt"
    >
      <View style={styles.container} testID="cash-collection-container">
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Header Reference & Status Banner */}
          <View style={styles.statusRow}>
            <View style={styles.referencePill}>
              <Text style={styles.referenceText}>Mã đơn #{order.reference}</Text>
            </View>
            <View style={styles.pendingBadge}>
              <View style={styles.pendingDot} />
              <Text style={styles.pendingBadgeText}>Chưa thu COD</Text>
            </View>
          </View>

          {/* 2. Hero Cash Amount Card (Chuẩn Grab: Số tiền cực to, nổi bật) */}
          <View style={styles.heroCashCard}>
            <View style={styles.heroIconBadge}>
              <IconTxPayment color="#D97706" size={28} />
            </View>
            <Text style={styles.heroLabel}>SỐ TIỀN CẦN THU TỪ KHÁCH</Text>
            <Text style={styles.heroAmount} testID="cash-amount-to-collect">
              {priceLabel}
            </Text>
            <View style={styles.methodPill}>
              <Text style={styles.methodPillIcon}>💵</Text>
              <Text style={styles.methodPillText}>Thanh toán tiền mặt khi giao hàng</Text>
            </View>
          </View>

          {/* 3. Fare Breakdown Bento Card (Chi tiết bảng kê cước phí) */}
          <View style={styles.bentoCard}>
            <View style={styles.bentoHeaderRow}>
              <Text style={styles.bentoTitle}>Chi tiết cước đơn hàng</Text>
              <Text style={styles.bentoSubtitle}>Đối chiếu người nhận</Text>
            </View>

            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Cước phí vận chuyển</Text>
              <Text style={styles.breakdownValue}>{priceLabel}</Text>
            </View>

            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Phụ phí bốc xếp / khác</Text>
              <Text style={styles.breakdownValueMuted}>0 ₫</Text>
            </View>

            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Tiền thu hộ hàng hoá (COD)</Text>
              <Text style={styles.breakdownValueMuted}>0 ₫</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.breakdownTotalRow}>
              <Text style={styles.breakdownTotalLabel}>TỔNG TIỀN MẶT CẦN THU</Text>
              <Text style={styles.breakdownTotalValue}>{priceLabel}</Text>
            </View>
          </View>

          {/* 4. Recipient & Contact Bento Card (Thông tin người nhận & Gọi nhanh) */}
          <View style={styles.bentoCard}>
            <View style={styles.bentoHeaderRow}>
              <Text style={styles.bentoTitle}>Người nhận hàng</Text>
              <Text style={styles.bentoSubtitle}>Điểm bàn giao</Text>
            </View>

            <View style={styles.contactRow}>
              <View style={styles.contactAvatar}>
                <Text style={styles.contactAvatarText}>
                  {(order.contactRoleLabel || 'KH')[0]?.toUpperCase()}
                </Text>
              </View>
              <View style={styles.contactInfoCol}>
                <Text style={styles.contactName} numberOfLines={1}>
                  {order.customerContact || 'Khách hàng nhận hàng'}
                </Text>
                <Text style={styles.contactRole}>
                  {order.contactRoleLabel || 'Người thanh toán'}
                </Text>
              </View>

              <Pressable
                accessibilityHint="Bấm để gọi điện cho người nhận"
                accessibilityLabel="Gọi điện thoại người nhận"
                accessibilityRole="button"
                onPress={() => {
                  driverHapticMatrix.selectionChanged();
                  callPhoneNumber(order.customerContact);
                }}
                style={({ pressed }) => [
                  styles.callButton,
                  pressed ? styles.btnPressed : null,
                ]}
                testID="btn-call-recipient"
              >
                <IconPhone color="#FFFFFF" size={16} />
                <Text style={styles.callButtonText}>Gọi ngay</Text>
              </Pressable>
            </View>

            <View style={styles.addressBox}>
              <View style={styles.addressIconWrap}>
                <IconRoute color="#2563EB" size={16} />
              </View>
              <View style={styles.addressTextCol}>
                <Text style={styles.addressLabel}>Địa chỉ giao hàng</Text>
                <Text style={styles.addressValue} numberOfLines={2}>
                  {order.route?.destination?.label || 'Điểm giao hàng'}
                </Text>
              </View>
            </View>
          </View>

          {/* 5. Quick Transfer Helper (Tiện ích chuyển khoản VietQR khi khách thiếu tiền mặt) */}
          <Pressable
            accessibilityHint="Mở mã QR ngân hàng để người nhận quét chuyển khoản nhanh"
            accessibilityLabel="Khách muốn chuyển khoản VietQR"
            accessibilityRole="button"
            onPress={() => {
              driverHapticMatrix.selectionChanged();
              setShowQrModal(true);
            }}
            style={({ pressed }) => [
              styles.qrHelperCard,
              pressed ? styles.btnPressed : null,
            ]}
            testID="btn-open-vietqr-helper"
          >
            <View style={styles.qrHelperLeft}>
              <View style={styles.qrIconWrap}>
                <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                  <Rect x="3" y="3" width="7" height="7" rx="1.5" stroke="#2563EB" strokeWidth="2" />
                  <Rect x="14" y="3" width="7" height="7" rx="1.5" stroke="#2563EB" strokeWidth="2" />
                  <Rect x="3" y="14" width="7" height="7" rx="1.5" stroke="#2563EB" strokeWidth="2" />
                  <Rect x="15" y="15" width="4" height="4" fill="#2563EB" />
                </Svg>
              </View>
              <View style={styles.qrHelperTextCol}>
                <Text style={styles.qrHelperTitle}>Khách muốn chuyển khoản?</Text>
                <Text style={styles.qrHelperSubtitle}>
                  Mở mã VietQR chuyển khoản nhanh đúng {priceLabel}
                </Text>
              </View>
            </View>
            <Text style={styles.qrHelperArrow}>➔</Text>
          </Pressable>

          {/* 6. Driver Safety Reminder Note */}
          <View style={styles.safetyNoticeCard}>
            <View style={styles.safetyIconWrap}>
              <IconSecurityShield color="#0284C7" size={18} />
            </View>
            <Text style={styles.safetyNoticeText}>
              Vui lòng đếm đủ tiền mặt hoặc kiểm tra thông báo biến động số dư tài khoản trước khi trượt xác nhận hoàn tất.
            </Text>
          </View>

          {/* 7. Báo cáo sự cố khi khách không chịu thanh toán */}
          {onOpenIncidentModal ? (
            <Pressable
              accessibilityLabel="Báo cáo sự cố thanh toán"
              accessibilityRole="button"
              onPress={() => {
                driverHapticMatrix.selectionChanged();
                onOpenIncidentModal();
              }}
              style={({ pressed }) => [
                styles.reportIncidentBtn,
                pressed ? styles.btnPressed : null,
              ]}
              testID="btn-open-incident-from-cash"
            >
              <Text style={styles.reportIncidentText}>
                ⚠️ Khách từ chối trả tiền hoặc phát sinh sự cố? Báo cáo ngay
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </View>

      {/* Modal VietQR hiển thị mã QR nhanh cho khách quét */}
      <Modal
        animationType="fade"
        onRequestClose={() => setShowQrModal(false)}
        transparent
        visible={showQrModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleWrap}>
                <Text style={styles.modalTitle}>Mã VietQR chuyển khoản</Text>
                <Text style={styles.modalSub}>Người nhận quét app ngân hàng</Text>
              </View>
              <Pressable
                onPress={() => setShowQrModal(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </Pressable>
            </View>

            {/* QR Visual Box */}
            <View style={styles.qrVisualContainer}>
              <View style={styles.qrGraphicBorder}>
                <Svg width={180} height={180} viewBox="0 0 180 180" fill="none">
                  {/* Outer Frame */}
                  <Rect x="10" y="10" width="160" height="160" rx="12" fill="#FFFFFF" />
                  {/* Position Markers */}
                  <Rect x="20" y="20" width="40" height="40" rx="6" stroke="#0B2545" strokeWidth="4" />
                  <Rect x="28" y="28" width="24" height="24" rx="3" fill="#0B2545" />

                  <Rect x="120" y="20" width="40" height="40" rx="6" stroke="#0B2545" strokeWidth="4" />
                  <Rect x="128" y="28" width="24" height="24" rx="3" fill="#0B2545" />

                  <Rect x="20" y="120" width="40" height="40" rx="6" stroke="#0B2545" strokeWidth="4" />
                  <Rect x="28" y="128" width="24" height="24" rx="3" fill="#0B2545" />

                  {/* Matrix Simulation */}
                  <Rect x="75" y="25" width="12" height="12" fill="#0B2545" />
                  <Rect x="95" y="30" width="10" height="10" fill="#0B2545" />
                  <Rect x="25" y="75" width="12" height="12" fill="#0B2545" />
                  <Rect x="45" y="85" width="10" height="10" fill="#0B2545" />
                  <Rect x="75" y="75" width="30" height="30" rx="4" fill="#F59E0B" />
                  <Rect x="125" y="75" width="12" height="12" fill="#0B2545" />
                  <Rect x="145" y="90" width="10" height="10" fill="#0B2545" />
                  <Rect x="75" y="125" width="12" height="12" fill="#0B2545" />
                  <Rect x="95" y="135" width="10" height="10" fill="#0B2545" />
                  <Rect x="125" y="125" width="20" height="20" rx="2" fill="#0B2545" />
                </Svg>
              </View>
              <Text style={styles.qrAmountBadge}>{priceLabel}</Text>
            </View>

            <View style={styles.qrBankDetails}>
              <View style={styles.bankDetailRow}>
                <Text style={styles.bankDetailLabel}>Ngân hàng:</Text>
                <Text style={styles.bankDetailValue}>MBBank (Quân Đội)</Text>
              </View>
              <View style={styles.bankDetailRow}>
                <Text style={styles.bankDetailLabel}>Số tài khoản:</Text>
                <Pressable
                  onPress={() => handleCopy('0912345678', 'account')}
                  style={styles.copyValueRow}
                >
                  <Text style={styles.bankDetailValueBold}>0912 345 678</Text>
                  <Text style={styles.copyHint}>
                    {copiedField === 'account' ? '✓ Đã sao chép' : 'Sao chép'}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.bankDetailRow}>
                <Text style={styles.bankDetailLabel}>Nội dung CK:</Text>
                <Pressable
                  onPress={() => handleCopy(order.reference, 'ref')}
                  style={styles.copyValueRow}
                >
                  <Text style={styles.bankDetailValueBold}>{order.reference}</Text>
                  <Text style={styles.copyHint}>
                    {copiedField === 'ref' ? '✓ Đã sao chép' : 'Sao chép'}
                  </Text>
                </Pressable>
              </View>
            </View>

            <Button
              label="Đóng mã QR"
              onPress={() => setShowQrModal(false)}
              size="driver-primary"
              variant="secondary"
            />
          </View>
        </View>
      </Modal>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl * 2,
    gap: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xxs,
  },
  referencePill: {
    backgroundColor: '#EEF2F6',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  referenceText: {
    color: '#334155',
    ...typeScale.caption2,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D97706',
  },
  pendingBadgeText: {
    color: '#B45309',
    ...typeScale.caption2,
    fontWeight: '700',
  },
  heroCashCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.cardLg,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: 'center',
    ...iosContinuousCurve,
    shadowColor: '#0B2545',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    gap: spacing.xxs,
  },
  heroIconBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxs,
  },
  heroLabel: {
    color: '#64748B',
    ...typeScale.caption1,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0B2545',
    fontVariant: ['tabular-nums'],
    marginVertical: 2,
    textAlign: 'center',
  },
  methodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 6,
    marginTop: 4,
  },
  methodPillIcon: {
    fontSize: 13,
  },
  methodPillText: {
    color: '#15803D',
    ...typeScale.caption1,
    fontWeight: '600',
  },
  bentoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.card,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    padding: spacing.md,
    ...iosContinuousCurve,
    shadowColor: '#0B2545',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: spacing.xs,
  },
  bentoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.xxs,
  },
  bentoTitle: {
    color: '#0F172A',
    ...typeScale.headline,
    fontWeight: '700',
  },
  bentoSubtitle: {
    color: '#94A3B8',
    ...typeScale.caption2,
    fontWeight: '500',
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  breakdownLabel: {
    color: '#475569',
    ...typeScale.subheadline,
    fontWeight: '400',
  },
  breakdownValue: {
    color: '#0F172A',
    ...typeScale.subheadline,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  breakdownValueMuted: {
    color: '#94A3B8',
    ...typeScale.subheadline,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: spacing.xxs,
  },
  breakdownTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xxs,
  },
  breakdownTotalLabel: {
    color: '#0B2545',
    ...typeScale.subheadline,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  breakdownTotalValue: {
    color: '#0B2545',
    ...typeScale.title3,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 2,
  },
  contactAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F0F4FA',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactAvatarText: {
    color: '#0B2545',
    ...typeScale.headline,
    fontWeight: '700',
  },
  contactInfoCol: {
    flex: 1,
  },
  contactName: {
    color: '#0F172A',
    ...typeScale.subheadline,
    fontWeight: '700',
  },
  contactRole: {
    color: '#64748B',
    ...typeScale.caption1,
    marginTop: 1,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16A34A',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    ...iosContinuousCurve,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  callButtonText: {
    color: '#FFFFFF',
    ...typeScale.caption1,
    fontWeight: '700',
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: spacing.xs,
    gap: spacing.xs,
    marginTop: spacing.xxs,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addressIconWrap: {
    marginTop: 2,
  },
  addressTextCol: {
    flex: 1,
  },
  addressLabel: {
    color: '#64748B',
    ...typeScale.caption2,
    fontWeight: '600',
  },
  addressValue: {
    color: '#1E293B',
    ...typeScale.footnote,
    fontWeight: '500',
    marginTop: 1,
  },
  qrHelperCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderRadius: radius.card,
    borderColor: '#BFDBFE',
    borderWidth: 1,
    padding: spacing.md,
    ...iosContinuousCurve,
  },
  qrHelperLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  qrIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrHelperTextCol: {
    flex: 1,
  },
  qrHelperTitle: {
    color: '#1E40AF',
    ...typeScale.subheadline,
    fontWeight: '700',
  },
  qrHelperSubtitle: {
    color: '#3B82F6',
    ...typeScale.caption1,
    marginTop: 1,
  },
  qrHelperArrow: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  safetyNoticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F9FF',
    borderRadius: radius.cardSm,
    borderColor: '#BAE6FD',
    borderWidth: 1,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  safetyIconWrap: {
    marginTop: 1,
  },
  safetyNoticeText: {
    flex: 1,
    color: '#0369A1',
    ...typeScale.caption1,
    lineHeight: 17,
  },
  reportIncidentBtn: {
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  reportIncidentText: {
    color: '#94A3B8',
    ...typeScale.caption2,
    fontWeight: '600',
  },
  footerContainer: {
    gap: spacing.xs,
  },
  a11yHiddenButton: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0.01,
  },
  a11yHiddenText: {
    fontSize: 1,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 37, 69, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.modal,
    padding: spacing.lg,
    ...iosContinuousCurve,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
    gap: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalHeaderTitleWrap: {
    flex: 1,
  },
  modalTitle: {
    color: '#0F172A',
    ...typeScale.headline,
    fontWeight: '700',
  },
  modalSub: {
    color: '#64748B',
    ...typeScale.caption1,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtnText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
  },
  qrVisualContainer: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  qrGraphicBorder: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
  },
  qrAmountBadge: {
    ...typeScale.title3,
    fontWeight: '800',
    color: '#0B2545',
    fontVariant: ['tabular-nums'],
  },
  qrBankDetails: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: spacing.sm,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bankDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bankDetailLabel: {
    color: '#64748B',
    ...typeScale.caption1,
  },
  bankDetailValue: {
    color: '#1E293B',
    ...typeScale.caption1,
    fontWeight: '600',
  },
  copyValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bankDetailValueBold: {
    color: '#0B2545',
    ...typeScale.caption1,
    fontWeight: '700',
  },
  copyHint: {
    color: '#2563EB',
    ...typeScale.caption2,
    fontWeight: '600',
  },
});
