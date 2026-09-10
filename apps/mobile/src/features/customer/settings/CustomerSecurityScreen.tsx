import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Modal,
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
  layout,
  radius,
  sessionStore,
  spacing,
  typography,
  IconAlertTriangle,
  IconChevron,
  IconSecurityShield,
  IconShield,
} from '@leopard/mobile-core';

export function CustomerSecurityScreen() {
  const router = useRouter();

  // Biometric state
  const [biometricEnabled, setBiometricEnabled] = useState(true);

  // PIN state
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);

  // Account deletion modal state (Apple Guideline 5.1.1)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  function handleUpdatePin() {
    setPinError(null);
    setPinSuccess(null);

    if (!currentPin.trim() || !newPin.trim() || !confirmPin.trim()) {
      setPinError('Vui lòng điền đầy đủ thông tin mã PIN.');
      return;
    }

    if (newPin.length !== 6) {
      setPinError('Mã PIN mới phải bao gồm đúng 6 chữ số.');
      return;
    }

    if (newPin !== confirmPin) {
      setPinError('Mã PIN mới và xác nhận mã PIN không khớp.');
      return;
    }

    // Success
    setPinSuccess('Cập nhật mã PIN thanh toán thành công!');
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
  }

  async function handleConfirmDeleteAccount() {
    setIsDeleting(true);
    try {
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
          hitSlop={8}
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
        {/* SECTION 1: MÃ PIN THANH TOÁN (DOUBLE-BEZEL CARD) */}
        <Text style={styles.sectionLabel}>MÃ PIN THANH TOÁN</Text>
        <View style={styles.doubleBezelOuter}>
          <View style={styles.doubleBezelInner}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.iconBadge}>
                <IconShield color={colors.brand.background} size="md" />
              </View>
              <View style={styles.sectionTitleTextWrap}>
                <Text style={styles.cardHeading}>Đổi mã PIN thanh toán ví</Text>
                <Text style={styles.cardSubtext}>
                  Mã PIN 6 số dùng để xác thực các giao dịch nạp, rút và thanh toán cước vận chuyển.
                </Text>
              </View>
            </View>

            {pinError ? (
              <View style={styles.alertError}>
                <IconAlertTriangle color="#DC2626" size="sm" />
                <Text style={styles.alertErrorText}>{pinError}</Text>
              </View>
            ) : null}

            {pinSuccess ? (
              <View style={styles.alertSuccess}>
                <IconSecurityShield color="#16A34A" size={16} />
                <Text style={styles.alertSuccessText}>{pinSuccess}</Text>
              </View>
            ) : null}

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Mã PIN hiện tại</Text>
              <TextInput
                keyboardType="numeric"
                maxLength={6}
                onChangeText={setCurrentPin}
                placeholder="Nhập mã PIN hiện tại"
                placeholderTextColor={colors.neutral.subtleText}
                secureTextEntry
                style={styles.pinInput}
                value={currentPin}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Mã PIN mới (6 chữ số)</Text>
              <TextInput
                keyboardType="numeric"
                maxLength={6}
                onChangeText={setNewPin}
                placeholder="Nhập mã PIN mới (6 số)"
                placeholderTextColor={colors.neutral.subtleText}
                secureTextEntry
                style={styles.pinInput}
                value={newPin}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Xác nhận mã PIN mới</Text>
              <TextInput
                keyboardType="numeric"
                maxLength={6}
                onChangeText={setConfirmPin}
                placeholder="Xác nhận mã PIN mới"
                placeholderTextColor={colors.neutral.subtleText}
                secureTextEntry
                style={styles.pinInput}
                value={confirmPin}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={handleUpdatePin}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed ? styles.primaryButtonPressed : null,
              ]}
            >
              <Text style={styles.primaryButtonText}>Cập nhật mã PIN</Text>
            </Pressable>
          </View>
        </View>

        {/* SECTION 2: SINH TRẮC HỌC (DOUBLE-BEZEL CARD) */}
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
                onValueChange={setBiometricEnabled}
                testID="switch-biometric"
                thumbColor={biometricEnabled ? colors.brand.background : '#F4F3F4'}
                trackColor={{ false: '#CBD5E1', true: colors.brand.softBackground }}
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
                <IconAlertTriangle color="#DC2626" size="md" />
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
                <IconAlertTriangle color="#DC2626" size="xl" />
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
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
    fontWeight: '700',
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
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: spacing.xs,
  },
  sectionLabelDanger: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '800',
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
    backgroundColor: '#FFFFFF',
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
    fontWeight: '700',
  },
  cardSubtext: {
    color: colors.neutral.subtleText,
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 2,
  },
  formGroup: {
    gap: 4,
  },
  inputLabel: {
    color: colors.neutral.titleText,
    fontSize: 12.5,
    fontWeight: '600',
  },
  pinInput: {
    backgroundColor: '#F8FAFC',
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
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  alertError: {
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  alertErrorText: {
    color: '#DC2626',
    flex: 1,
    fontSize: 12.5,
    fontWeight: '500',
  },
  alertSuccess: {
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#6EE7B7',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  alertSuccessText: {
    color: '#059669',
    flex: 1,
    fontSize: 12.5,
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
    fontSize: 14.5,
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
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  dangerHeaderWrap: {
    flex: 1,
  },
  dangerHeading: {
    color: '#B91C1C',
    fontSize: 14.5,
    fontWeight: '700',
  },
  dangerLegalNotice: {
    color: '#64748B',
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
    backgroundColor: '#DC2626',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    minHeight: 48,
  },
  deleteAccountButtonPressed: {
    opacity: 0.85,
  },
  deleteAccountButtonText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    gap: spacing.sm,
    padding: spacing.md,
  },
  modalWarningIconBox: {
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  modalTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalDescription: {
    color: '#475569',
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
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    flex: 1,
    height: 44,
    justifyContent: 'center',
    minHeight: 44,
  },
  modalCancelButtonPressed: {
    backgroundColor: '#E2E8F0',
  },
  modalCancelButtonText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
  },
  modalConfirmButton: {
    alignItems: 'center',
    backgroundColor: '#DC2626',
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
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});
