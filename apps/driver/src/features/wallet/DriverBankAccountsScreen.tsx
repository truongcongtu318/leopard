import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  colors,
  leopardPalette,
  radius,
  spacing,
  Button,
  IconBank,
  IconCheck,
  IconChevron,
  IconClose,
  IconPlus,
  IconSecurityShield,
  ScreenScaffold,
} from '@leopard/mobile-core';

export type BankAccountItem = Readonly<{
  id: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  holderName: string;
  isDefault: boolean;
}>;

const INITIAL_ACCOUNTS: readonly BankAccountItem[] = [
  {
    id: 'bank-mb',
    bankName: 'MB Bank',
    bankCode: 'MB',
    accountNumber: '0987654321',
    holderName: 'NGUYEN VAN A',
    isDefault: true,
  },
  {
    id: 'bank-vcb',
    bankName: 'Vietcombank',
    bankCode: 'VCB',
    accountNumber: '1012345678',
    holderName: 'NGUYEN VAN A',
    isDefault: false,
  },
];

const SUPPORTED_BANKS = [
  { id: 'MB', name: 'MB Bank' },
  { id: 'VCB', name: 'Vietcombank' },
  { id: 'TCB', name: 'Techcombank' },
  { id: 'VPB', name: 'VPBank' },
] as const;

export function DriverBankAccountsScreen() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<BankAccountItem[]>([...INITIAL_ACCOUNTS]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedBank, setSelectedBank] = useState<(typeof SUPPORTED_BANKS)[number]>(
    SUPPORTED_BANKS[0],
  );
  const [accountNumber, setAccountNumber] = useState('');
  const [holderName, setHolderName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSetDefault = (id: string) => {
    setAccounts((prev) =>
      prev.map((acc) => ({
        ...acc,
        isDefault: acc.id === id,
      })),
    );
  };

  const handleAddAccount = () => {
    const trimmedNum = accountNumber.trim();
    const trimmedHolder = holderName.trim().toUpperCase();

    if (!trimmedNum) {
      setFormError('Vui lòng nhập số tài khoản');
      return;
    }
    if (!trimmedHolder) {
      setFormError('Vui lòng nhập tên chủ tài khoản');
      return;
    }

    const newAcc: BankAccountItem = {
      id: `bank-${Date.now()}`,
      bankName: selectedBank.name,
      bankCode: selectedBank.id,
      accountNumber: trimmedNum,
      holderName: trimmedHolder,
      isDefault: accounts.length === 0,
    };

    setAccounts((prev) => [...prev, newAcc]);
    setAccountNumber('');
    setHolderName('');
    setFormError(null);
    setShowAddModal(false);
  };

  return (
    <ScreenScaffold
      eyebrow="DRIVER · WALLET & PAYOUT"
      headerLeading={
        <Pressable
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <IconChevron color={colors.brand.background} direction="left" size={20} />
          <Text style={styles.backButtonText}>Quay lại</Text>
        </Pressable>
      }
      headerTone="plain"
      title="Tài khoản thụ hưởng"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.scrollWrap}
      >
        {/* Security Notice */}
        <View style={styles.securityNoticeCard}>
          <View style={styles.securityNoticeIconWrap}>
            <IconSecurityShield color="#059669" size={18} />
          </View>
          <View style={styles.securityNoticeTextCol}>
            <Text style={styles.securityNoticeTitle}>Rút tiền tức thì 24/7 qua Napas247</Text>
            <Text style={styles.securityNoticeSub}>
              Tài khoản liên kết phải trùng khớp họ tên với hồ sơ đối tác đã định danh KYC để
              đảm bảo an toàn tài chính.
            </Text>
          </View>
        </View>

        {/* Bank Account List */}
        <View style={styles.accountSection}>
          <Text style={styles.sectionTitle}>
            Tài khoản đã liên kết ({accounts.length})
          </Text>

          {accounts.map((item) => (
            <View key={item.id} style={styles.doubleBezelOuter}>
              <View style={styles.doubleBezelInner}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View
                      style={[
                        styles.bankIconWrap,
                        item.isDefault ? styles.bankIconWrapDefault : null,
                      ]}
                    >
                      <IconBank
                        color={item.isDefault ? '#10B981' : colors.brand.background}
                        size={22}
                      />
                    </View>
                    <View>
                      <Text style={styles.bankName}>{item.bankName}</Text>
                      <Text style={styles.accountNumber}>{item.accountNumber}</Text>
                    </View>
                  </View>

                  {item.isDefault ? (
                    <View style={styles.defaultBadge}>
                      <IconCheck color="#059669" size={12} />
                      <Text style={styles.defaultBadgeText}>Mặc định</Text>
                    </View>
                  ) : (
                    <Pressable
                      accessibilityLabel={`Đặt làm mặc định cho ${item.bankName}`}
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={() => handleSetDefault(item.id)}
                      style={styles.setDefaultButton}
                    >
                      <Text style={styles.setDefaultText}>Đặt mặc định</Text>
                    </Pressable>
                  )}
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.holderLabel}>Chủ tài khoản</Text>
                    <Text style={styles.holderName}>{item.holderName}</Text>
                  </View>
                  <View style={styles.napasBadge}>
                    <Text style={styles.napasBadgeText}>Napas247</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Add Bank Account CTA */}
        <Pressable
          accessibilityLabel="Thêm tài khoản ngân hàng"
          accessibilityRole="button"
          onPress={() => {
            setFormError(null);
            setShowAddModal(true);
          }}
          style={({ pressed }) => [
            styles.addAccountBtn,
            pressed ? styles.pressed : null,
          ]}
        >
          <IconPlus color="#FFFFFF" size={18} />
          <Text style={styles.addAccountBtnText}>Thêm tài khoản ngân hàng</Text>
        </Pressable>
      </ScrollView>

      {/* Modal Thêm Tài Khoản Ngân Hàng */}
      <Modal
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
        transparent
        visible={showAddModal}
      >
        <Pressable
          onPress={() => setShowAddModal(false)}
          style={styles.modalBackdrop}
        >
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.modalSheet}>
            <View style={styles.modalDragHandle} />

            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <IconBank color={colors.brand.background} size={20} />
                <Text style={styles.modalTitle}>Thêm tài khoản thụ hưởng mới</Text>
              </View>
              <Pressable
                accessibilityLabel="Đóng modal"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setShowAddModal(false)}
                style={styles.modalCloseBtn}
              >
                <IconClose color="#64748B" size={18} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalFormContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Select Bank */}
              <Text style={styles.fieldLabel}>Chọn ngân hàng thụ hưởng</Text>
              <View style={styles.bankGrid}>
                {SUPPORTED_BANKS.map((b) => {
                  const isSelected = selectedBank.id === b.id;
                  return (
                    <Pressable
                      accessibilityLabel={`Chọn ngân hàng ${b.name}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      key={b.id}
                      onPress={() => setSelectedBank(b)}
                      style={[
                        styles.bankSelectChip,
                        isSelected ? styles.bankSelectChipActive : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.bankSelectChipText,
                          isSelected ? styles.bankSelectChipTextActive : null,
                        ]}
                      >
                        {b.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Account Number */}
              <Text style={styles.fieldLabel}>Số tài khoản ngân hàng</Text>
              <TextInput
                accessibilityLabel="Nhập số tài khoản ngân hàng"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="numeric"
                onChangeText={setAccountNumber}
                placeholder="Nhập số tài khoản"
                placeholderTextColor={leopardPalette.textSubtle}
                style={styles.textInput}
                value={accountNumber}
              />

              {/* Account Holder Name */}
              <Text style={styles.fieldLabel}>Tên chủ tài khoản (In hoa, không dấu)</Text>
              <TextInput
                accessibilityLabel="Nhập tên chủ tài khoản"
                autoCapitalize="characters"
                autoCorrect={false}
                onChangeText={(val) => setHolderName(val.toUpperCase())}
                placeholder="Nhập tên chủ tài khoản (không dấu)"
                placeholderTextColor={leopardPalette.textSubtle}
                style={styles.textInput}
                value={holderName}
              />

              {formError ? (
                <View style={styles.formErrorBox}>
                  <Text style={styles.formErrorText}>{formError}</Text>
                </View>
              ) : null}

              <View style={styles.modalActions}>
                <Button
                  label="Hủy"
                  onPress={() => setShowAddModal(false)}
                  variant="secondary"
                />
                <Button
                  label="Xác nhận liên kết"
                  onPress={handleAddAccount}
                  variant="primary"
                />
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scrollWrap: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.xl + 20,
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
    fontSize: 13.5,
    fontWeight: '700',
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
    fontSize: 13,
    fontWeight: '700',
  },
  securityNoticeSub: {
    color: '#047857',
    fontSize: 11.5,
    lineHeight: 16,
  },
  accountSection: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: leopardPalette.textMutedSlate,
    fontSize: 13,
    fontWeight: '700',
  },
  /* Double-Bezel Card: 24px outer, 18px inner */
  doubleBezelOuter: {
    backgroundColor: '#0B1E42',
    borderRadius: radius.bezelOuter,
    elevation: 3,
    padding: 3,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  doubleBezelInner: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
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
    backgroundColor: '#F1F5F9',
    borderRadius: radius.card,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  bankIconWrapDefault: {
    backgroundColor: '#DCFCE7',
  },
  bankName: {
    color: '#0B1E42',
    fontSize: 15,
    fontWeight: '700',
  },
  accountNumber: {
    color: '#475569',
    fontSize: 13,
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
    fontSize: 11,
    fontWeight: '700',
  },
  setDefaultButton: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  setDefaultText: {
    color: '#0B1E42',
    fontSize: 11.5,
    fontWeight: '700',
  },
  cardDivider: {
    backgroundColor: '#F1F5F9',
    height: 1,
    marginVertical: 2,
  },
  cardFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  holderLabel: {
    color: colors.neutral.subtleText,
    fontSize: 10.5,
    fontWeight: '600',
  },
  holderName: {
    color: '#0F172A',
    fontSize: 12.5,
    fontWeight: '700',
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
    fontSize: 10.5,
    fontWeight: '700',
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
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
    fontSize: 16,
    fontWeight: '800',
  },
  modalCloseBtn: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
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
    fontSize: 12,
    fontWeight: '700',
    marginTop: spacing.xxs,
  },
  bankGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bankSelectChip: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
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
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  bankSelectChipTextActive: {
    color: colors.brand.background,
    fontWeight: '800',
  },
  textInput: {
    borderColor: colors.neutral.subtleBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    color: colors.neutral.titleText,
    fontSize: 15,
    fontWeight: '600',
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
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
