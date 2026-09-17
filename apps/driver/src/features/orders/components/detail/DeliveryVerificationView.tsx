import React, { memo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  IconCamera,
  IconShieldAlert,
  driverHapticMatrix,
  driverJourneyTokens,
  iosContinuousCurve,
  leopardPalette,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';

export type DeliveryVerificationType = 'PREPAID' | 'COD' | 'FAILURE';

export type DeliveryVerificationViewProps = Readonly<{
  orderCode?: string;
  type: DeliveryVerificationType;
  expectedAmount?: number;
  photos: string[];
  onCapturePhoto: () => void;
  onCompleteDelivery: (data: { collectedAmount?: number; photos: string[]; notes?: string }) => void;
  onReportFailure?: (data: { reason: string; photos: string[]; notes?: string }) => void;
  onSwitchToFailure?: () => void;
  onCancel?: () => void;
}>;

const FAILURE_REASONS = [
  'Không liên lạc được người nhận (Đã gọi 3 cuộc)',
  'Người nhận từ chối nhận hàng',
  'Sai địa chỉ giao hàng / Địa chỉ ảo',
  'Lý do bất khả kháng khác',
];

function formatVndNumber(val: number): string {
  return Math.round(val).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export const DeliveryVerificationView = memo(function DeliveryVerificationView({
  expectedAmount = 520000,
  onCancel,
  onCapturePhoto,
  onCompleteDelivery,
  onReportFailure,
  onSwitchToFailure,
  orderCode = '#LP-8921',
  photos = [],
  type,
}: DeliveryVerificationViewProps) {
  const [inputAmountStr, setInputAmountStr] = useState(() =>
    type === 'COD' ? formatVndNumber(expectedAmount) : '',
  );
  const [selectedFailureReason, setSelectedFailureReason] = useState(FAILURE_REASONS[0]);
  const [notes, setNotes] = useState('');

  const parsedAmount = parseInt(inputAmountStr.replace(/[^\d]/g, ''), 10) || 0;
  const isMismatched = type === 'COD' && parsedAmount !== expectedAmount;
  const hasPhoto = photos.length > 0;

  const handleQuickTapExactAmount = () => {
    setInputAmountStr(formatVndNumber(expectedAmount));
    driverHapticMatrix.swipeThreshold();
  };

  const handleComplete = () => {
    if (!hasPhoto) return;
    driverHapticMatrix.swipeSuccess();
    onCompleteDelivery({
      collectedAmount: type === 'COD' ? parsedAmount : undefined,
      photos,
      notes,
    });
  };

  const handleFailure = () => {
    if (!hasPhoto || !onReportFailure) return;
    driverHapticMatrix.errorAlert();
    onReportFailure({
      reason: selectedFailureReason,
      photos,
      notes,
    });
  };

  if (type === 'FAILURE') {
    return (
      <View style={styles.container} testID="delivery-failure-view">
        <View style={styles.topBar}>
          <Text style={[styles.topBarTitle, { color: '#FF3B30' }]}>
            BÁO CÁO GIAO THẤT BẠI
          </Text>
          <Text style={styles.topBarBadge}>{orderCode}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionLabel}>CHỌN LÝ DO CHÍNH XÁC</Text>
          <View style={styles.reasonsList}>
            {FAILURE_REASONS.map((r) => {
              const isSelected = selectedFailureReason === r;
              return (
                <Pressable
                  key={r}
                  accessibilityRole="radio"
                  onPress={() => setSelectedFailureReason(r)}
                  style={[styles.radioItem, isSelected ? styles.radioItemActive : null]}
                  testID={`radio-reason-${r.slice(0, 10)}`}
                >
                  <View style={[styles.radioOuter, isSelected ? styles.radioOuterActive : null]}>
                    {isSelected ? <View style={styles.radioInner} /> : null}
                  </View>
                  <Text style={[styles.radioText, isSelected ? styles.radioTextActive : null]}>
                    {r}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>
            BẰNG CHỨNG XÁC THỰC (BẮT BUỘC)
          </Text>
          {hasPhoto ? (
            <View style={styles.capturedPhotoWrapper}>
              <Image source={{ uri: photos[0] }} style={styles.capturedImage} />
              <Pressable onPress={onCapturePhoto} style={styles.retakeBtn}>
                <Text style={styles.retakeBtnText}>🔄 Chụp lại</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={onCapturePhoto}
              style={styles.capturePlaceholder}
              testID="btn-capture-failure-proof"
            >
              <IconCamera color="#FF3B30" size={32} />
              <Text style={[styles.capturePrompt, { color: '#FF3B30' }]}>
                + Chụp ảnh bằng chứng
              </Text>
              <Text style={styles.captureSubprompt}>
                Chụp ảnh nhà kho đóng cửa hoặc màn hình lịch sử 3 cuộc gọi
              </Text>
            </Pressable>
          )}

          <View style={styles.warningBox}>
            <IconShieldAlert color="#F59E0B" size={20} />
            <Text style={styles.warningText}>
              Kiện hàng sẽ được chuyển sang quy trình hoàn trả về điểm lấy hàng ban đầu.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footerContainer}>
          <Pressable
            accessibilityRole="button"
            disabled={!hasPhoto}
            onPress={handleFailure}
            style={({ pressed }) => [
              styles.primaryCta,
              styles.primaryCtaDanger,
              !hasPhoto ? styles.primaryCtaDisabled : null,
              pressed && hasPhoto ? styles.btnPressed : null,
            ]}
            testID="btn-confirm-failure"
          >
            <Text style={styles.primaryCtaText}>
              {hasPhoto ? 'Xác nhận không giao được' : 'Bắt buộc chụp 1 ảnh'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Branch COD or Prepaid
  return (
    <View style={styles.container} testID="delivery-verification-view">
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>XÁC NHẬN GIAO HÀNG</Text>
        <Text style={styles.topBarBadge}>{orderCode}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {type === 'COD' ? (
          <>
            {/* COD Amount Banner */}
            <View style={styles.codCard} testID="cod-banner-card">
              <Text style={styles.codBadgeText}>HÌNH THỨC: THU TIỀN MẶT (COD)</Text>
              <Text style={styles.codAmountLabel}>SỐ TIỀN CẦN THU TỪ KHÁCH:</Text>
              <Text style={styles.codAmountHero}>
                {formatVndNumber(expectedAmount)} ₫
              </Text>
            </View>

            {/* Input Collected Amount */}
            <Text style={styles.sectionLabel}>SỐ TIỀN THỰC TẾ ĐÃ CẦM TAY</Text>
            <View style={[styles.amountInputRow, isMismatched ? styles.amountInputMismatched : null]}>
              <TextInput
                accessibilityLabel="Số tiền thực tế đã thu"
                keyboardType="numeric"
                onChangeText={setInputAmountStr}
                style={styles.amountInput}
                testID="input-collected-amount"
                value={inputAmountStr}
              />
              <Text style={styles.currencySuffix}>VNĐ</Text>
            </View>

            {/* Quick Tap Zero-Typing Button */}
            <Pressable
              accessibilityRole="button"
              onPress={handleQuickTapExactAmount}
              style={({ pressed }) => [
                styles.quickAmountBtn,
                pressed ? styles.btnPressed : null,
              ]}
              testID="btn-quick-exact-amount"
            >
              <Text style={styles.quickAmountBtnText}>
                ⚡ Thu đủ số tiền {formatVndNumber(expectedAmount)}đ
              </Text>
            </Pressable>

            {isMismatched ? (
              <View style={styles.mismatchNotice} testID="mismatch-notice">
                <Text style={styles.mismatchText}>
                  ⚠ Số tiền nhập ({formatVndNumber(parsedAmount)}đ) lệch so với cước COD ({formatVndNumber(expectedAmount)}đ)!
                </Text>
              </View>
            ) : null}
          </>
        ) : null}

        {/* Photo Proof */}
        <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>
          BẰNG CHỨNG GIAO HÀNG (POD BẮT BUỘC)
        </Text>
        {hasPhoto ? (
          <View style={styles.capturedPhotoWrapper}>
            <Image source={{ uri: photos[0] }} style={styles.capturedImage} />
            <Pressable onPress={onCapturePhoto} style={styles.retakeBtn}>
              <Text style={styles.retakeBtnText}>🔄 Chụp lại</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={onCapturePhoto}
            style={styles.capturePlaceholder}
            testID="btn-capture-delivery-proof"
          >
            <IconCamera color="#0B2545" size={32} />
            <Text style={styles.capturePrompt}>+ Chụp ảnh hàng đã giao</Text>
            <Text style={styles.captureSubprompt}>
              Chụp rõ gói hàng trước cửa hoặc cùng người nhận
            </Text>
          </Pressable>
        )}

        {/* Discrete Failure Link */}
        {onSwitchToFailure ? (
          <Pressable
            accessibilityRole="link"
            onPress={onSwitchToFailure}
            style={styles.failureLink}
            testID="link-switch-failure"
          >
            <Text style={styles.failureLinkText}>Không giao được hàng?</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {/* Footer Button 56pt */}
      <View style={styles.footerContainer}>
        <Pressable
          accessibilityRole="button"
          disabled={!hasPhoto}
          onPress={handleComplete}
          style={({ pressed }) => [
            styles.primaryCta,
            hasPhoto ? styles.primaryCtaSuccess : styles.primaryCtaDisabled,
            pressed && hasPhoto ? styles.btnPressed : null,
          ]}
          testID="btn-confirm-delivery"
        >
          <Text style={styles.primaryCtaText}>
            {hasPhoto ? 'Xác nhận hoàn tất giao hàng' : 'Cần chụp ít nhất 1 ảnh'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  topBarTitle: {
    ...typeScale.headline,
    fontWeight: '700',
    color: '#0F172A',
  },
  topBarBadge: {
    ...typeScale.caption2,
    fontWeight: '800',
    color: '#D97706',
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 110,
  },
  codCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
    borderWidth: 1.5,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...iosContinuousCurve,
  },
  codBadgeText: {
    ...typeScale.caption1,
    fontWeight: '800',
    color: '#B45309',
    marginBottom: 4,
  },
  codAmountLabel: {
    ...typeScale.footnote,
    color: '#78350F',
  },
  codAmountHero: {
    fontSize: 34,
    fontWeight: '800',
    color: '#0B2545',
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
  sectionLabel: {
    ...typeScale.footnote,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: spacing.xs,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    height: 56,
  },
  amountInputMismatched: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  currencySuffix: {
    ...typeScale.headline,
    fontWeight: '700',
    color: '#64748B',
  },
  quickAmountBtn: {
    backgroundColor: '#0B2545',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: 14,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
    height: 50,
    ...iosContinuousCurve,
    shadowColor: '#0B2545',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  quickAmountBtnText: {
    ...typeScale.subheadline,
    fontWeight: '800',
    color: '#FBBF24',
    letterSpacing: 0.3,
  },
  mismatchNotice: {
    backgroundColor: '#FEE2E2',
    padding: spacing.xs,
    borderRadius: 8,
    marginTop: spacing.xs,
  },
  mismatchText: {
    ...typeScale.caption1,
    color: '#DC2626',
    fontWeight: '600',
  },
  capturePlaceholder: {
    minHeight: 180,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#0B2545',
    borderStyle: 'dashed',
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    ...iosContinuousCurve,
  },
  capturePrompt: {
    ...typeScale.headline,
    fontWeight: '700',
    color: '#0B2545',
    marginTop: spacing.xs,
  },
  captureSubprompt: {
    ...typeScale.caption2,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  capturedPhotoWrapper: {
    height: 180,
    borderRadius: radius.card,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  capturedImage: {
    width: '100%',
    height: '100%',
  },
  retakeBtn: {
    position: 'absolute',
    bottom: spacing.xs,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  retakeBtnText: {
    color: '#FFFFFF',
    ...typeScale.caption1,
    fontWeight: '700',
  },
  failureLink: {
    alignSelf: 'center',
    marginTop: spacing.md,
    padding: spacing.xs,
  },
  failureLinkText: {
    ...typeScale.subheadline,
    color: '#FF3B30',
    textDecorationLine: 'underline',
  },
  reasonsList: {
    gap: spacing.xs,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.card,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 52,
  },
  radioItemActive: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  radioOuterActive: {
    borderColor: '#FF3B30',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
  },
  radioText: {
    ...typeScale.subheadline,
    color: '#475569',
    flex: 1,
  },
  radioTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  warningText: {
    ...typeScale.caption1,
    color: '#92400E',
    flex: 1,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  primaryCta: {
    height: driverJourneyTokens.sizes.primaryCtaHeight,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...iosContinuousCurve,
  },
  primaryCtaSuccess: {
    backgroundColor: '#34C759',
  },
  primaryCtaDanger: {
    backgroundColor: '#FF3B30',
  },
  primaryCtaDisabled: {
    backgroundColor: '#E2E8F0',
  },
  primaryCtaText: {
    ...typeScale.headline,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
});
