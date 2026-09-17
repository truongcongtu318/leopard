import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  colors,
  customerPalette,
  layout,
  radius,
  sessionStore,
  spacing,
  typography,
  IconAlertTriangle,
  IconChevron,
  IconSecurityShield,
  IconShield,
  typeScale,
} from '@leopard/mobile-core';
import { getDefaultHttpClient } from '../orders/adapter';

export function CustomerSecurityScreen() {
  const router = useRouter();

  // Biometric state
  const [biometricEnabled, setBiometricEnabled] = useState(true);

  // Account deletion modal state (Apple Guideline 5.1.1)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirmDeleteAccount() {
    setIsDeleting(true);
    try {
      try {
        await getDefaultHttpClient().delete('/users/me');
      } catch {
        // Continue clearing session even if API call fails (e.g. offline)
      }
      await sessionStore.clearSession();
      setDeleteModalVisible(false);
      router.replace('/(public)/login');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Top Header with Back button */}
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <IconChevron color={colors.neutral.titleText} direction="left" size="lg" />
        </Pressable>
        <Text style={styles.headerTitle}>Bảo mật tài khoản</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* SECTION 1: SINH TRẮC HỌC (DOUBLE-BEZEL CARD) */}
        <Text style={styles.sectionLabel}>SINH TRẮC HỌC</Text>
        <View style={styles.doubleBezelOuter}>
          <View style={styles.doubleBezelInner}>
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchTitle}>Đăng nhập bằng FaceID / Vân tay</Text>
                <Text style={styles.switchSubtext}>
                  Sử dụng cảm biến sinh trắc học thiết bị để mở khóa ứng dụng và duyệt lệnh nhanh.
                </Text>
              </View>
              <Switch
                accessibilityLabel="Bật hoặc tắt FaceID hoặc Vân tay"
                onValueChange={setBiometricEnabled}
                testID="switch-biometric"
                thumbColor={Platform.OS === 'android' ? (biometricEnabled ? customerPalette.primary : '#F4F3F4') : undefined}
                trackColor={{ false: colors.neutral.subtleBorder, true: customerPalette.primary }}
                value={biometricEnabled}
              />
            </View>
          </View>
        </View>

        {/* SECTION 3: APPLE GUIDELINE 5.1.1 ACCOUNT DELETION (DOUBLE-BEZEL DANGER CARD) */}
        <Text style={styles.sectionLabelDanger}>QUẢN LÝ DỮ LIỆU & TÀI KHOẢN</Text>
        <View style={[styles.doubleBezelOuter, styles.dangerOuter]}>
          <View style={styles.doubleBezelInner}>
            <View style={styles.dangerHeaderRow}>
              <View style={styles.dangerIconBadge}>
                <IconAlertTriangle color={colors.danger.text} size="md" />
              </View>
              <View style={styles.dangerHeaderWrap}>
                <Text style={styles.dangerHeading}>Quyền riêng tư & Xóa tài khoản</Text>
                <Text style={styles.dangerLegalNotice}>
                  Tuân thủ điều khoản Apple App Store Review Guideline 5.1.1 (Data Collection and
                  Storage). Người dùng có toàn quyền yêu cầu xóa vĩnh viễn tài khoản và mọi dữ liệu
                  liên quan khỏi máy chủ LEOPARD.
                </Text>
              </View>
            </View>

            <View style={styles.dangerDivider} />

            <Pressable
              accessibilityRole="button"
              onPress={() => setDeleteModalVisible(true)}
              style={({ pressed }) => [
                styles.deleteAccountButton,
                pressed ? styles.deleteAccountButtonPressed : null,
              ]}
            >
              <Text style={styles.deleteAccountButtonText}>Xóa tài khoản vĩnh viễn</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* CONFIRMATION MODAL (APPLE GUIDELINE 5.1.1) */}
      <Modal
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
        transparent
        visible={deleteModalVisible}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCardOuter}>
            <View style={styles.modalCardInner}>
              <View style={styles.modalWarningIconBox}>
                <IconAlertTriangle color={colors.danger.text} size="xl" />
              </View>

              <Text style={styles.modalTitle}>Xác nhận xóa tài khoản vĩnh viễn?</Text>

              <Text style={styles.modalDescription}>
                Hành động này không thể hoàn tác. Toàn bộ thông tin doanh nghiệp, lịch sử đơn hàng,
                hạn mức tín dụng công nợ và điểm thưởng sẽ bị xóa vĩnh viễn khỏi hệ thống LEOPARD
                theo quy định Apple 5.1.1.
              </Text>

              <View style={styles.modalActions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isDeleting}
                  onPress={() => setDeleteModalVisible(false)}
                  style={({ pressed }) => [
                    styles.modalCancelButton,
                    pressed ? styles.modalCancelButtonPressed : null,
                  ]}
                >
                  <Text style={styles.modalCancelButtonText}>Hủy bỏ</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  disabled={isDeleting}
                  onPress={() => void handleConfirmDeleteAccount()}
                  style={({ pressed }) => [
                    styles.modalConfirmButton,
                    pressed ? styles.modalConfirmButtonPressed : null,
                  ]}
                >
                  <Text style={styles.modalConfirmButtonText}>
                    {isDeleting ? 'Đang xóa...' : 'Tôi hiểu và xác nhận xóa'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ponytail: simplified in-memory PIN state, add backend API verification when auth microservice is wired.
const styles = StyleSheet.create({
  container: {
    backgroundColor: customerPalette.canvas,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surface,
    borderBottomColor: 'rgba(11, 30, 66, 0.08)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 56,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  backButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
    width: 44,
  },
  headerTitle: {
    color: colors.neutral.titleText,
    fontSize: 17,
    fontWeight: '600',
  },
  headerRightSpacer: {
    width: 44,
  },
  scrollContent: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: layout.bottomNavClearance + 20,
  },
  sectionLabel: {
    color: colors.brand.background,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: spacing.xs,
  },
  sectionLabelDanger: {
    color: colors.danger.text,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: spacing.xs,
  },
  /* Double-Bezel Card: 24px outer, 18px inner */
  doubleBezelOuter: {
    backgroundColor: 'rgba(11, 30, 66, 0.04)',
    borderColor: 'rgba(11, 30, 66, 0.08)',
    borderRadius: 24,
    borderWidth: 1,
    padding: 6,
  },
  doubleBezelInner: {
    backgroundColor: colors.neutral.surface,
    borderRadius: 18,
    gap: spacing.sm,
    padding: spacing.md,
  },
  sectionTitleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconBadge: {
    alignItems: 'center',
    backgroundColor: colors.brand.softBackground,
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  sectionTitleTextWrap: {
    flex: 1,
  },
  cardHeading: {
    color: colors.neutral.titleText,
    fontSize: 15,
    fontWeight: '600',
  },
  cardSubtext: {
    color: colors.neutral.subtleText,
    fontSize: typeScale.footnote.fontSize,
    lineHeight: 18,
    marginTop: 2,
  },
  formGroup: {
    gap: 4,
  },
  inputLabel: {
    color: colors.neutral.titleText,
    fontSize: typeScale.footnote.fontSize,
    fontWeight: '600',
  },
  pinInput: {
    backgroundColor: customerPalette.canvas,
    borderColor: 'rgba(11, 30, 66, 0.12)',
    borderRadius: radius.control,
    borderWidth: 1,
    color: colors.neutral.titleText,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    height: 44,
    letterSpacing: 2,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.brand.background,
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    minHeight: 44,
    marginTop: spacing.xs,
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonText: {
    color: colors.neutral.surface,
    fontSize: typeScale.subheadline.fontSize,
    fontWeight: '600',
  },
  alertError: {
    alignItems: 'center',
    backgroundColor: colors.danger.background,
    borderColor: colors.danger.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  alertErrorText: {
    color: colors.danger.text,
    flex: 1,
    fontSize: typeScale.footnote.fontSize,
  },
  alertSuccess: {
    alignItems: 'center',
    backgroundColor: colors.success.background,
    borderColor: colors.success.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  alertSuccessText: {
    color: colors.success.text,
    flex: 1,
    fontSize: typeScale.footnote.fontSize,
    fontWeight: '600',
  },
  /* Biometrics */
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  switchInfo: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  switchTitle: {
    color: colors.neutral.titleText,
    fontSize: typeScale.subheadline.fontSize,
    fontWeight: '600',
  },
  switchSubtext: {
    color: colors.neutral.subtleText,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  /* Danger zone */
  dangerOuter: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  dangerHeaderRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dangerIconBadge: {
    alignItems: 'center',
    backgroundColor: colors.danger.background,
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  dangerHeaderWrap: {
    flex: 1,
  },
  dangerHeading: {
    color: colors.danger.text,
    fontSize: typeScale.subheadline.fontSize,
    fontWeight: '600',
  },
  dangerLegalNotice: {
    color: customerPalette.textSubtle,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  dangerDivider: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    height: 1,
    marginVertical: spacing.xs,
  },
  deleteAccountButton: {
    alignItems: 'center',
    backgroundColor: colors.danger.text,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    minHeight: 48,
  },
  deleteAccountButtonPressed: {
    opacity: 0.85,
  },
  deleteAccountButtonText: {
    color: colors.neutral.surface,
    fontSize: typeScale.subheadline.fontSize,
    fontWeight: '600',
  },
  /* Confirmation Modal */
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalCardOuter: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 24,
    borderWidth: 1,
    maxWidth: 400,
    padding: 6,
    width: '100%',
  },
  modalCardInner: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surface,
    borderRadius: 18,
    gap: spacing.sm,
    padding: spacing.md,
  },
  modalWarningIconBox: {
    alignItems: 'center',
    backgroundColor: colors.danger.background,
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  modalTitle: {
    color: colors.neutral.text,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalDescription: {
    color: customerPalette.textMutedSlate,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    width: '100%',
  },
  modalCancelButton: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: 12,
    flex: 1,
    height: 44,
    justifyContent: 'center',
    minHeight: 44,
  },
  modalCancelButtonPressed: {
    backgroundColor: colors.neutral.border,
  },
  modalCancelButtonText: {
    color: colors.neutral.mutedText,
    fontSize: typeScale.subheadline.fontSize,
    fontWeight: '600',
  },
  modalConfirmButton: {
    alignItems: 'center',
    backgroundColor: colors.danger.text,
    borderRadius: 12,
    flex: 1,
    height: 44,
    justifyContent: 'center',
    minHeight: 44,
  },
  modalConfirmButtonPressed: {
    opacity: 0.85,
  },
  modalConfirmButtonText: {
    color: colors.neutral.surface,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
