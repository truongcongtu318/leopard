import { useRouter } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import {
  colors,
  driverPrimitives,
  iosContinuousCurve,
  leopardPalette,
  radius,
  spacing,
  IconBank,
  IconSecurityShield,
  ScreenScaffold,
  typeScale,
} from '@leopard/mobile-core';

function BackArrowIcon({ size = 20, color = driverPrimitives.colors.gray900 }: { size?: number; color?: string }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
        fill={color}
      />
    </Svg>
  );
}

export type DriverBankAccountsScreenProps = Readonly<{
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
}>;

// Single linked bank account from GET /driver/wallet (bankName,
// bankAccountNumber, bankAccountName). No local multi-account management:
// the backend stores exactly one payout account per driver profile.
export function DriverBankAccountsScreen({
  bankAccountName,
  bankAccountNumber,
  bankName,
}: DriverBankAccountsScreenProps) {
  const router = useRouter();
  const hasLinkedAccount = Boolean(bankName && bankAccountNumber);

  return (
    <ScreenScaffold
      headerTone="plain"
      onBack={() => router.back()}
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

        {/* Linked Bank Account (BE) */}
        <View style={styles.accountSection}>
          <Text style={styles.sectionTitle}>
            Tài khoản đã liên kết ({hasLinkedAccount ? 1 : 0})
          </Text>

          {hasLinkedAccount ? (
            <View style={styles.bankCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.bankIconWrap, styles.bankIconWrapDefault]}>
                    <IconBank color="#10B981" size={22} />
                  </View>
                  <View>
                    <Text style={styles.bankName}>{bankName}</Text>
                    <Text style={styles.accountNumber}>{bankAccountNumber}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.holderLabel}>Chủ tài khoản</Text>
                  <Text style={styles.holderName}>{bankAccountName ?? '—'}</Text>
                </View>
                <View style={styles.napasBadge}>
                  <Text style={styles.napasBadgeText}>Napas247</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.bankCard}>
              <Text style={styles.emptyText}>Chưa liên kết tài khoản ngân hàng</Text>
              <Text style={styles.emptySub}>
                Tài khoản thụ hưởng được lưu trong hồ sơ ví của bạn. Liên hệ điều hành để cập nhật.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
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
