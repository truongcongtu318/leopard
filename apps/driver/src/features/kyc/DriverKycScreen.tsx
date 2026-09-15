import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { typeScale, colors, leopardPalette, radius, spacing, Button, ScreenScaffold, IconCheck, IconClose, IconIdCard, IconInsuranceDoc, IconLicense, IconSecurityShield, IconSpeedTruck } from '@leopard/mobile-core';
import { DOCUMENT_TITLE, REQUIRED_DOCUMENT_TYPES, type DriverDocumentType } from './adapter';

export type DriverKycScreenProps = Readonly<{
  documents: readonly { id: string; type: DriverDocumentType; title: string; url: string; createdAt: string }[];
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
  const uploadedTypes = new Set(documents.map((doc) => doc.type));
  const missingRequiredTypes = REQUIRED_DOCUMENT_TYPES.filter((type) => !uploadedTypes.has(type));
  const isKycComplete = missingRequiredTypes.length === 0;

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

        {!isLoading && !isError ? (
          <View
            style={[styles.checklistCard, isKycComplete ? styles.checklistCardComplete : styles.checklistCardIncomplete]}
            testID="kyc-document-checklist"
          >
            <Text style={styles.sectionLabel}>Trạng thái giấy tờ bắt buộc</Text>
            {REQUIRED_DOCUMENT_TYPES.map((type) => {
              const hasType = uploadedTypes.has(type);
              return (
                <View key={type} style={styles.checklistRow}>
                  {hasType ? (
                    <IconCheck color={colors.success.text} size={16} strokeWidth={2.5} />
                  ) : (
                    <IconClose color={colors.danger.text} size={16} />
                  )}
                  <Text style={[styles.checklistLabel, hasType ? null : styles.checklistLabelMissing]}>
                    {DOCUMENT_TITLE[type]}
                  </Text>
                </View>
              );
            })}
            <Text style={isKycComplete ? styles.checklistSummaryOk : styles.checklistSummaryMissing}>
              {isKycComplete
                ? 'Đã nộp đủ giấy tờ bắt buộc.'
                : `Còn thiếu: ${missingRequiredTypes.map((t) => DOCUMENT_TITLE[t]).join(', ')}.`}
            </Text>
          </View>
        ) : null}

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
  checklistCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  checklistCardComplete: {
    backgroundColor: colors.success.background,
    borderColor: colors.success.border,
  },
  checklistCardIncomplete: {
    backgroundColor: colors.danger.background,
    borderColor: colors.danger.border,
  },
  checklistRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  checklistLabel: {
    color: colors.neutral.titleText,
    fontSize: 13,
    fontWeight: '600',
  },
  checklistLabelMissing: {
    color: colors.danger.text,
  },
  checklistSummaryOk: {
    color: colors.success.text,
    fontSize: typeScale.footnote.fontSize,
    fontWeight: '600',
    marginTop: 4,
  },
  checklistSummaryMissing: {
    color: colors.danger.text,
    fontSize: typeScale.footnote.fontSize,
    fontWeight: '600',
    marginTop: 4,
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
    fontSize: typeScale.footnote.fontSize,
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
    fontSize: typeScale.subheadline.fontSize,
    fontWeight: '700',
  },
  updateDesc: {
    color: colors.neutral.mutedText,
    fontSize: typeScale.footnote.fontSize,
    lineHeight: 17,
  },
});
