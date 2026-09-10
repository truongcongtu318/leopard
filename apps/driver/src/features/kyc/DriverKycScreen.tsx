import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, leopardPalette, radius, spacing, Button, ScreenScaffold, IconIdCard, IconInsuranceDoc, IconLicense, IconSecurityShield, IconSpeedTruck } from '@leopard/mobile-core';

export type DriverKycScreenProps = Readonly<{
  documents: readonly { id: string; title: string; url: string; createdAt: string }[];
  isLoading: boolean;
  isError?: boolean;
  onBack?: () => void;
}>;

function getDocIcon(title: string) {
  if (title.includes('CCCD') || title.includes('Căn cước')) {
    return <IconIdCard color={colors.brand.softText} size={18} />;
  }
  if (title.includes('GPLX') || title.includes('Giấy phép lái xe')) {
    return <IconLicense color={colors.brand.softText} size={18} />;
  }
  if (title.includes('đăng ký xe') || title.includes('Cà vẹt')) {
    return <IconSpeedTruck color={colors.brand.softText} size={18} />;
  }
  if (title.includes('Bảo hiểm')) {
    return <IconInsuranceDoc color={colors.brand.softText} size={18} />;
  }
  return <IconSecurityShield color={colors.brand.softText} size={18} />;
}

export function DriverKycScreen({ documents, isLoading, isError, onBack }: DriverKycScreenProps) {
  return (
    <ScreenScaffold
      headerTone="plain"
      onBack={onBack}
      title="Hồ sơ KYC"
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.verifiedCard}>
          <View style={styles.verifiedLeft}>
            <View style={styles.shieldChip}>
              <IconSecurityShield color={colors.success.text} size={20} />
            </View>
            <View>
              <Text style={styles.verifiedTitle}>Hồ sơ đã nộp</Text>
              <Text style={styles.verifiedSub}>Đơn đăng ký tài xế đang được kiểm duyệt hoặc đã được duyệt.</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Giấy tờ đã nộp</Text>

        {isLoading ? (
          <Text style={styles.loadingText}>Đang tải danh sách giấy tờ…</Text>
        ) : isError ? (
          <Text style={styles.loadingText}>Không thể tải danh sách giấy tờ. Vui lòng thử lại sau.</Text>
        ) : documents.length === 0 ? (
          <Text style={styles.loadingText}>Chưa có giấy tờ nào được nộp.</Text>
        ) : (
          <View style={styles.docList}>
            {documents.map((doc) => (
              <View key={doc.id} style={styles.docCard}>
                <View style={styles.docHeader}>
                  <View style={styles.docTitleRow}>
                    <View style={styles.docIconChip}>{getDocIcon(doc.title)}</View>
                    <Text style={styles.docTitle}>{doc.title}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.updateCard}>
          <Text style={styles.updateTitle}>Cập nhật giấy tờ mới?</Text>
          <Text style={styles.updateDesc}>
            Khi giấy tờ sắp hết hạn hoặc bạn đổi xe mới, hãy gửi bản chụp tài liệu mới để kiểm duyệt.
          </Text>
          <Button label="Gửi giấy tờ bổ sung / cập nhật" variant="secondary" />
        </View>
      </ScrollView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  verifiedCard: {
    backgroundColor: colors.success.background,
    borderColor: colors.success.border,
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.md,
  },
  verifiedLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  shieldChip: {
    alignItems: 'center',
    backgroundColor: colors.success.border,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  verifiedTitle: {
    color: colors.success.text,
    fontSize: 13,
    fontWeight: '700',
  },
  verifiedSub: {
    color: colors.success.text,
    fontSize: 12,
    marginTop: 2,
  },
  sectionLabel: {
    color: leopardPalette.textMutedSlate,
    fontSize: 13,
    fontWeight: '700',
  },
  loadingText: {
    color: leopardPalette.textMutedSlate,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  docList: {
    gap: spacing.xs,
  },
  docCard: {
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.subtleBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 4,
    padding: spacing.md,
  },
  docHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  docTitleRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    marginRight: spacing.xs,
  },
  docIconChip: {
    alignItems: 'center',
    backgroundColor: colors.brand.softBackground,
    borderRadius: radius.card,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  docTitle: {
    color: colors.neutral.titleText,
    flex: 1,
    fontSize: 13.5,
    fontWeight: '700',
  },
  updateCard: {
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.subtleBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  updateTitle: {
    color: colors.neutral.titleText,
    fontSize: 14.5,
    fontWeight: '700',
  },
  updateDesc: {
    color: colors.neutral.mutedText,
    fontSize: 12.5,
    lineHeight: 17,
  },
});
