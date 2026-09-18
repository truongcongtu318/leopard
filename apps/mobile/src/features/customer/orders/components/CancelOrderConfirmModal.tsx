import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {
  AppText,
  IconSecurityShield,
  appleSpring,
  customerPalette,
  haptic,
  iosContinuousCurve,
  radius,
  spacing,
} from '@leopard/mobile-core';

export interface CancelOrderConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmCancel: () => void;
  isCancelling?: boolean;
  title?: string;
  refundPolicyText?: string;
  reassureText?: string;
  confirmLabel?: string;
  keepWaitingLabel?: string;
  testID?: string;
}

/**
 * CancelOrderConfirmModal
 *
 * Apple Human Interface Guidelines + Emil Kowalski Design Engineering:
 * - Fluid entrance spring physics (`scale: 0.94 -> 1.0`, `opacity: 0 -> 1`) via `appleSpring.snappy`
 * - Continuous squircle corner geometry (`iosContinuousCurve`, `radius.modal`)
 * - Deep Midnight Navy translucent backdrop scrim
 * - Concentric emerald shield badge with layered depth
 * - Apple Inset Guarantee Card with structured micro-copy
 * - Clear action weighting: Reassuring primary CTA ("Tiếp tục tìm xe") + Soft crimson destructive action ("Xác nhận hủy và hoàn tiền")
 * - Multimodal tactile haptics & press-down feedback
 */
export function CancelOrderConfirmModal({
  visible,
  onClose,
  onConfirmCancel,
  isCancelling = false,
  title = 'Xác nhận hủy tìm xe?',
  refundPolicyText = 'Hoàn cọc 100% tức thì về ví hoặc tài khoản ngân hàng của bạn theo chính sách bảo vệ quyền lợi khách hàng LEOPARD.',
  reassureText = 'Bạn có thể tạo lại cuốc xe mới bất kỳ lúc nào mà không phát sinh thêm phí.',
  confirmLabel = 'Xác nhận hủy và hoàn tiền',
  keepWaitingLabel = 'Tiếp tục tìm xe',
  testID = 'modal-cancel-order-confirm',
}: CancelOrderConfirmModalProps) {
  const scaleAnim = useRef(new Animated.Value(0.94)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.94);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: appleSpring.snappy.damping,
          stiffness: appleSpring.snappy.stiffness,
          mass: appleSpring.snappy.mass,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }
  }, [visible, scaleAnim, opacityAnim]);

  const handleClose = () => {
    haptic.light();
    onClose();
  };

  const handleConfirm = () => {
    if (isCancelling) return;
    haptic.medium();
    onConfirmCancel();
  };

  return (
    <Modal
      animationType="none"
      onRequestClose={handleClose}
      transparent
      visible={visible}
      testID={testID}
    >
      <View style={styles.overlayContainer}>
        {/* Translucent Backdrop Scrim */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.backdrop,
            { opacity: opacityAnim },
          ]}
        >
          <Pressable
            accessibilityLabel="Đóng xác nhận"
            accessibilityRole="button"
            onPress={handleClose}
            style={StyleSheet.absoluteFill}
            testID="backdrop-dismiss"
          />
        </Animated.View>

        {/* Modal Card with Apple Spring Entrance */}
        <Animated.View
          style={[
            styles.card,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Concentric Layered Security Badge */}
          <View style={styles.badgeOuterRing}>
            <View style={styles.badgeInnerCore}>
              <IconSecurityShield
                color="#16A34A"
                secondaryColor="#DCFCE7"
                size={28}
                testID="icon-security-shield"
              />
            </View>
          </View>

          {/* Title */}
          <AppText
            tone="primary"
            variant="headline"
            style={styles.title}
          >
            {title}
          </AppText>

          {/* Apple Inset Escrow Guarantee Card */}
          <View style={styles.escrowCard}>
            <View style={styles.escrowTagRow}>
              <View style={styles.escrowDot} />
              <AppText variant="caption2" style={styles.escrowTagText}>
                CHÍNH SÁCH BẢO VỆ ESCROW
              </AppText>
            </View>
            <AppText variant="footnote" style={styles.escrowBodyText}>
              {refundPolicyText}
            </AppText>
          </View>

          {/* Reassurance Subtext */}
          <AppText
            tone="secondary"
            variant="footnote"
            style={styles.reassureText}
          >
            {reassureText}
          </AppText>

          {/* Actions: Apple HIG Alert polarity */}
          <View style={styles.actionsGroup}>
            {/* Primary Action: Reassuring Safe CTA (Continue Searching) */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={keepWaitingLabel}
              disabled={isCancelling}
              onPress={handleClose}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed ? styles.btnPressed : null,
              ]}
              testID="btn-keep-searching"
            >
              <AppText variant="headline" style={styles.primaryBtnText}>
                {keepWaitingLabel}
              </AppText>
            </Pressable>

            {/* Secondary Action: Soft Destructive (Cancel & Refund) */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
              disabled={isCancelling}
              onPress={handleConfirm}
              style={({ pressed }) => [
                styles.destructiveBtn,
                pressed ? styles.btnPressed : null,
                isCancelling ? styles.btnDisabled : null,
              ]}
              testID="btn-confirm-cancel"
            >
              <AppText
                variant="subheadline"
                style={[
                  styles.destructiveBtnText,
                  isCancelling ? styles.destructiveBtnTextDisabled : null,
                ]}
              >
                {isCancelling ? 'Đang xử lý hủy...' : confirmLabel}
              </AppText>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  backdrop: {
    backgroundColor: 'rgba(11, 37, 69, 0.52)',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.modal,
    ...iosContinuousCurve,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 37, 69, 0.08)',
    shadowColor: '#0B2545',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 12,
  },
  badgeOuterRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  badgeInnerCore: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(52, 199, 89, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.24)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    color: customerPalette.primary,
    letterSpacing: -0.3,
    marginBottom: spacing.sm,
  },
  escrowCard: {
    width: '100%',
    backgroundColor: '#F0FDF4',
    borderRadius: radius.card,
    ...iosContinuousCurve,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.22)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  escrowTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    marginBottom: spacing.xxs,
  },
  escrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  escrowTagText: {
    fontWeight: '700',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  escrowBodyText: {
    color: '#166534',
    lineHeight: 19,
    textAlign: 'left',
  },
  reassureText: {
    textAlign: 'center',
    lineHeight: 18,
    marginTop: spacing.xxs,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xxs,
  },
  actionsGroup: {
    width: '100%',
    gap: spacing.xs,
  },
  primaryBtn: {
    width: '100%',
    minHeight: 52,
    borderRadius: 16,
    ...iosContinuousCurve,
    backgroundColor: customerPalette.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    shadowColor: customerPalette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  destructiveBtn: {
    width: '100%',
    minHeight: 48,
    borderRadius: 16,
    ...iosContinuousCurve,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  destructiveBtnText: {
    color: '#DC2626',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  destructiveBtnTextDisabled: {
    color: 'rgba(220, 38, 38, 0.5)',
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.982 }],
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
