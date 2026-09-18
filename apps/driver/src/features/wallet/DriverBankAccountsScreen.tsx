import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  Badge,
  Box,
  Button,
  Card,
  Divider,
  HStack,
  IconBank,
  IconClose,
  IconSecurityShield,
  ScreenScaffold,
  VStack,
  colors,
  driverPrimitives,
  haptic,
  iosContinuousCurve,
  leopardPalette,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';

const POPULAR_BANKS = [
  'Vietcombank',
  'MB Bank',
  'Techcombank',
  'ACB',
  'VPBank',
  'BIDV',
  'VietinBank',
  'TPBank',
];

export type DriverBankAccountsScreenProps = Readonly<{
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  onUpdateBankAccount?: (input: {
    bankName: string;
    bankAccountNumber: string;
    bankAccountName: string;
  }) => Promise<unknown> | void;
  isUpdating?: boolean;
}>;

// Single linked bank account from GET /driver/wallet (bankName,
// bankAccountNumber, bankAccountName). No local multi-account management:
// the backend stores exactly one payout account per driver profile.
export function DriverBankAccountsScreen({
  bankAccountName,
  bankAccountNumber,
  bankName,
  isUpdating = false,
  onUpdateBankAccount,
}: DriverBankAccountsScreenProps) {
  const router = useRouter();
  const hasLinkedAccount = Boolean(bankName && bankAccountNumber);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState(bankName || 'Vietcombank');
  const [accountNum, setAccountNum] = useState(bankAccountNumber || '');
  const [accName, setAccName] = useState(bankAccountName || '');
  const [formError, setFormError] = useState<string | null>(null);

  const handleOpenModal = useCallback(() => {
    setSelectedBank(bankName || 'Vietcombank');
    setAccountNum(bankAccountNumber || '');
    setAccName(bankAccountName || '');
    setFormError(null);
    setIsModalOpen(true);
  }, [bankAccountName, bankAccountNumber, bankName]);

  const handleCloseModal = useCallback(() => {
    if (isUpdating) return;
    setIsModalOpen(false);
    setFormError(null);
  }, [isUpdating]);

  const handleSubmit = useCallback(async () => {
    const trimmedNum = accountNum.trim();
    const trimmedName = accName.trim();

    if (!selectedBank) {
      setFormError('Vui lòng chọn ngân hàng');
      return;
    }
    if (!trimmedNum || trimmedNum.length < 6) {
      setFormError('Số tài khoản không hợp lệ (tối thiểu 6 chữ số)');
      return;
    }
    if (!trimmedName || trimmedName.length < 2) {
      setFormError('Tên chủ tài khoản không được để trống');
      return;
    }

    setFormError(null);
    if (!onUpdateBankAccount) {
      setIsModalOpen(false);
      return;
    }

    try {
      await onUpdateBankAccount({
        bankName: selectedBank,
        bankAccountNumber: trimmedNum,
        bankAccountName: trimmedName.toUpperCase(),
      });
      haptic.success();
      setIsModalOpen(false);
    } catch (err: any) {
      haptic.warning();
      setFormError(err?.message || 'Không thể cập nhật tài khoản ngân hàng. Vui lòng thử lại.');
    }
  }, [accName, accountNum, onUpdateBankAccount, selectedBank]);

  return (
    <ScreenScaffold
      headerTone="plain"
      onBack={() => {
        if (typeof router.canGoBack === 'function') {
          if (router.canGoBack()) {
            router.back();
          } else if (typeof router.push === 'function') {
            router.push('/wallet');
          }
        } else if (typeof router.back === 'function') {
          router.back();
        } else if (typeof router.push === 'function') {
          router.push('/wallet');
        }
      }}
      title="Tài khoản thụ hưởng"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.scrollWrap}
      >
        {/* Security Notice */}
        <Card style={styles.securityNoticeCard}>
          <HStack style={{ alignItems: 'flex-start', gap: spacing.xs }}>
            <Box style={styles.securityNoticeIconWrap}>
              <IconSecurityShield color={colors.brand.primary} size={18} />
            </Box>
            <VStack style={styles.securityNoticeTextCol}>
              <Text style={styles.securityNoticeTitle}>Rút tiền tức thì 24/7 qua Napas247</Text>
              <Text style={styles.securityNoticeSub}>
                Tài khoản liên kết phải trùng khớp họ tên với hồ sơ đối tác đã định danh KYC để
                đảm bảo an toàn tài chính.
              </Text>
            </VStack>
          </HStack>
        </Card>

        {/* Linked Bank Account (BE) */}
        <VStack style={styles.accountSection}>
          <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.sectionTitle}>
              Tài khoản đã liên kết ({hasLinkedAccount ? 1 : 0})
            </Text>
            {hasLinkedAccount && onUpdateBankAccount ? (
              <Pressable
                accessibilityLabel="Thay đổi tài khoản ngân hàng"
                accessibilityRole="button"
                onPress={handleOpenModal}
                style={({ pressed }) => [styles.setDefaultButton, pressed ? styles.pressed : null]}
                testID="btn-edit-bank-account"
              >
                <Text style={styles.setDefaultText}>Thay đổi</Text>
              </Pressable>
            ) : null}
          </HStack>

          {hasLinkedAccount ? (
            <Card style={styles.bankCard}>
              <HStack style={styles.cardHeader}>
                <HStack style={styles.cardHeaderLeft}>
                  <Box style={[styles.bankIconWrap, styles.bankIconWrapDefault]}>
                    <IconBank color={colors.brand.primary} size={22} />
                  </Box>
                  <VStack>
                    <Text style={styles.bankName}>{bankName}</Text>
                    <Text style={styles.accountNumber}>{bankAccountNumber}</Text>
                  </VStack>
                </HStack>
              </HStack>

              <Divider style={styles.cardDivider} />

              <HStack style={styles.cardFooter}>
                <VStack>
                  <Text style={styles.holderLabel}>Chủ tài khoản</Text>
                  <Text style={styles.holderName}>{bankAccountName ?? '—'}</Text>
                </VStack>
                <Badge action="info" size="sm" style={styles.napasBadge}>
                  <Badge.Text style={styles.napasBadgeText}>Napas247</Badge.Text>
                </Badge>
              </HStack>
            </Card>
          ) : (
            <Card style={styles.bankCard}>
              <Text style={styles.emptyText}>Chưa liên kết tài khoản ngân hàng</Text>
              <Text style={styles.emptySub}>
                Tài khoản thụ hưởng dùng để nhận tiền khi thực hiện rút tiền từ ví.
              </Text>
              {onUpdateBankAccount ? (
                <Pressable
                  accessibilityLabel="Liên kết tài khoản ngân hàng ngay"
                  accessibilityRole="button"
                  onPress={handleOpenModal}
                  style={({ pressed }) => [styles.addAccountBtn, pressed ? styles.pressed : null]}
                  testID="btn-add-bank-account"
                >
                  <Text style={styles.addAccountBtnText}>Liên kết tài khoản ngay</Text>
                </Pressable>
              ) : null}
            </Card>
          )}
        </VStack>
      </ScrollView>

      {/* Edit / Link Bank Account Modal */}
      <Modal
        animationType="slide"
        onRequestClose={handleCloseModal}
        transparent
        visible={isModalOpen}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityLabel="Đóng modal"
            accessibilityRole="button"
            onPress={handleCloseModal}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalDragHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <IconBank color={colors.brand.primary} size={20} />
                <Text style={styles.modalTitle}>
                  {hasLinkedAccount ? 'Cập nhật tài khoản' : 'Liên kết tài khoản'}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Đóng"
                accessibilityRole="button"
                onPress={handleCloseModal}
                style={styles.modalCloseBtn}
                testID="btn-close-bank-modal"
              >
                <IconClose color={colors.neutral.mutedText} size={18} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalFormContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.fieldLabel}>Chọn ngân hàng</Text>
              <View style={styles.bankGrid}>
                {POPULAR_BANKS.map((b) => {
                  const isSelected = selectedBank === b;
                  return (
                    <Pressable
                      accessibilityLabel={`Chọn ngân hàng ${b}`}
                      accessibilityRole="button"
                      key={b}
                      onPress={() => setSelectedBank(b)}
                      style={[
                        styles.bankSelectChip,
                        isSelected ? styles.bankSelectChipActive : null,
                      ]}
                      testID={`bank-chip-${b}`}
                    >
                      <Text
                        style={[
                          styles.bankSelectChipText,
                          isSelected ? styles.bankSelectChipTextActive : null,
                        ]}
                      >
                        {b}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Số tài khoản ngân hàng</Text>
              <TextInput
                accessibilityLabel="Số tài khoản"
                autoCapitalize="none"
                keyboardType="number-pad"
                onChangeText={setAccountNum}
                placeholder="Nhập số tài khoản"
                placeholderTextColor={colors.neutral.mutedText}
                style={styles.textInput}
                testID="input-bank-account-number"
                value={accountNum}
              />

              <Text style={styles.fieldLabel}>Tên chủ tài khoản</Text>
              <TextInput
                accessibilityLabel="Tên chủ tài khoản"
                autoCapitalize="characters"
                onChangeText={setAccName}
                placeholder="NGUYEN VAN A"
                placeholderTextColor={colors.neutral.mutedText}
                style={styles.textInput}
                testID="input-bank-account-name"
                value={accName}
              />

              {formError ? (
                <View style={styles.formErrorBox} testID="bank-form-error">
                  <Text style={styles.formErrorText}>{formError}</Text>
                </View>
              ) : null}

              <View style={styles.modalActions}>
                <Button
                  disabled={isUpdating}
                  isLoading={isUpdating}
                  label={hasLinkedAccount ? 'Cập nhật tài khoản' : 'Xác nhận liên kết'}
                  loadingLabel="Đang lưu..."
                  onPress={() => void handleSubmit()}
                  size="driver-primary"
                  testID="btn-submit-bank-account"
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    backgroundColor: driverPrimitives.colors.gray50,
    flex: 1,
  },
  headerBar: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.white,
    borderBottomColor: driverPrimitives.colors.gray200,
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 52,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  headerActionBtn: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerTitle: {
    color: driverPrimitives.colors.gray900,
    ...typeScale.headline,
  },
  bankCard: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: driverPrimitives.colors.gray200,
    borderRadius: 12,
    ...iosContinuousCurve,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    ...driverPrimitives.shadows.sm,
  },
  scrollWrap: {
    backgroundColor: driverPrimitives.colors.gray50,
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    gap: spacing.md,
    paddingHorizontal: 0,
    paddingVertical: 12,
    paddingBottom: 40,
  },
  backButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    minHeight: 44,
    minWidth: 44,
    paddingVertical: spacing.xxs,
  },
  backButtonText: {
    color: colors.brand.background,
    ...typeScale.footnote,
    fontWeight: '600',
  },
  securityNoticeCard: {
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: spacing.md,
  },
  securityNoticeIconWrap: {
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  securityNoticeTextCol: {
    flex: 1,
    gap: 2,
  },
  securityNoticeTitle: {
    color: '#065F46',
    ...typeScale.footnote,
    fontWeight: '600',
  },
  securityNoticeSub: {
    color: '#047857',
    ...typeScale.caption1,
    lineHeight: 16,
  },
  accountSection: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: leopardPalette.textMutedSlate,
    ...typeScale.footnote,
    fontWeight: '600',
  },
  /* Double-Bezel Card: 24px outer, 18px inner */
  doubleBezelOuter: {
    backgroundColor: leopardPalette.primary,
    borderRadius: radius.bezelOuter,
    elevation: 3,
    padding: 3,
    shadowColor: leopardPalette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  doubleBezelInner: {
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.border,
    borderRadius: radius.bezelInner,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  bankIconWrap: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: radius.card,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  bankIconWrapDefault: {
    backgroundColor: '#DCFCE7',
  },
  bankName: {
    color: leopardPalette.primary,
    ...typeScale.subheadline,
    fontWeight: '600',
  },
  accountNumber: {
    color: colors.neutral.mutedText,
    ...typeScale.footnote,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  defaultBadge: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  defaultBadgeText: {
    color: '#059669',
    ...typeScale.caption2,
    fontWeight: '600',
  },
  setDefaultButton: {
    backgroundColor: colors.neutral.surfaceMuted,
    borderColor: colors.neutral.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  setDefaultText: {
    color: leopardPalette.primary,
    ...typeScale.caption1,
    fontWeight: '600',
  },
  cardDivider: {
    backgroundColor: colors.neutral.surfaceMuted,
    height: 1,
    marginVertical: 2,
  },
  cardFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  holderLabel: {
    color: colors.neutral.mutedText,
    ...typeScale.caption2,
  },
  holderName: {
    color: colors.neutral.text,
    ...typeScale.footnote,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  napasBadge: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  napasBadgeText: {
    color: '#1D4ED8',
    ...typeScale.caption2,
    fontWeight: '600',
  },
  addAccountBtn: {
    alignItems: 'center',
    backgroundColor: colors.brand.background,
    borderRadius: radius.card,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  addAccountBtnText: {
    color: colors.neutral.surface,
    ...typeScale.subheadline,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },

  /* Modal Styles */
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.neutral.background,
    borderTopLeftRadius: radius.control,
    borderTopRightRadius: radius.control,
    gap: spacing.sm,
    maxHeight: '85%',
    maxWidth: 480,
    padding: spacing.lg,
    width: '100%',
  },
  modalDragHandle: {
    alignSelf: 'center',
    backgroundColor: colors.neutral.subtleBorder,
    borderRadius: 2,
    height: 4,
    marginBottom: spacing.xs,
    width: 40,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.xs,
  },
  modalHeaderLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  modalTitle: {
    color: colors.neutral.titleText,
    ...typeScale.callout,
    fontWeight: '600',
  },
  modalCloseBtn: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: 22,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  modalFormContent: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  fieldLabel: {
    color: colors.neutral.titleText,
    ...typeScale.caption1,
    fontWeight: '600',
    marginTop: spacing.xxs,
  },
  bankGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bankSelectChip: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surfaceMuted,
    borderColor: colors.neutral.border,
    borderRadius: radius.card,
    borderWidth: 1,
    minHeight: 44,
    minWidth: '47%',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bankSelectChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: colors.brand.background,
    borderWidth: 1.5,
  },
  bankSelectChipText: {
    color: colors.neutral.mutedText,
    ...typeScale.footnote,
    fontWeight: '600',
  },
  bankSelectChipTextActive: {
    color: colors.brand.background,
    fontWeight: '600',
  },
  textInput: {
    borderColor: colors.neutral.subtleBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    color: colors.neutral.titleText,
    ...typeScale.subheadline,
    fontVariant: ['tabular-nums'],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  formErrorBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.sm,
  },
  formErrorText: {
    color: colors.danger.text,
    ...typeScale.caption1,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  emptyText: {
    color: driverPrimitives.colors.gray900,
    ...typeScale.subheadline,
    fontWeight: '600',
  },
  emptySub: {
    color: colors.neutral.mutedText,
    ...typeScale.caption1,
    lineHeight: 17,
  },
});
