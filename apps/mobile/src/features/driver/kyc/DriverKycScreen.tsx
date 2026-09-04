import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, leopardPalette, radius, spacing, typography } from '../../../theme/tokens';
import { Button } from '../../../ui/Button';
import { ScreenScaffold } from '../../../ui/ScreenScaffold';
import { StatusBadge } from '../../../ui/StatusBadge';
import {
  IconIdCard,
  IconInsuranceDoc,
  IconLicense,
  IconSecurityShield,
  IconSpeedTruck,
} from '../../../ui/icons/CoreIcons';

type DocumentItem = {
  id: string;
  title: string;
  number: string;
  status: 'VERIFIED' | 'PENDING' | 'EXPIRED';
  expiryDate?: string;
};

const mockDocuments: DocumentItem[] = [
  {
    id: 'doc-1',
    title: 'Căn cước công dân (CCCD)',
    number: '079090001234',
    status: 'VERIFIED',
  },
  {
    id: 'doc-2',
    title: 'Giấy phép lái xe (GPLX Hạng B2)',
    number: '790123456789',
    status: 'VERIFIED',
    expiryDate: '10/2030',
  },
  {
    id: 'doc-3',
    title: 'Giấy chứng nhận đăng ký xe (Cà vẹt)',
    number: '59D-123.45 (Xe Van Suzuki)',
    status: 'VERIFIED',
  },
  {
    id: 'doc-4',
    title: 'Bảo hiểm TNDS bắt buộc',
    number: 'BH-2026-987654',
    status: 'VERIFIED',
    expiryDate: '12/2026',
  },
  {
    id: 'doc-5',
    title: 'Phiếu lý lịch tư pháp (Số 2)',
    number: 'LLTP-79-2026-00123',
    status: 'VERIFIED',
  },
];

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

export function DriverKycScreen() {
  return (
    <ScreenScaffold
      eyebrow="DRIVER · IDENTITY & KYC"
      headerTone="ink"
      subtitle="Hồ sơ pháp lý, giấy phép hành nghề và thông tin xe đăng ký."
      title="Hồ sơ KYC"
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.verifiedCard}>
          <View style={styles.verifiedLeft}>
            <View style={styles.shieldChip}>
              <IconSecurityShield color={colors.success.text} size={20} />
            </View>
            <View>
              <Text style={styles.verifiedTitle}>Hồ sơ đã được xác thực</Text>
              <Text style={styles.verifiedSub}>Bạn đủ điều kiện nhận toàn bộ các chuyến hàng.</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Giấy tờ pháp lý đã nộp</Text>

        <View style={styles.docList}>
          {mockDocuments.map((doc, index) => {
            const docIcon = getDocIcon(doc.title);
            return (
              <View key={doc.id} style={styles.docCard}>
                <View style={styles.docHeader}>
                  <View style={styles.docTitleRow}>
                    <View style={styles.docIconChip}>
                      {docIcon}
                    </View>
                    <Text style={styles.docTitle}>{doc.title}</Text>
                  </View>
                  <StatusBadge domain="kyc" status={doc.status} />
                </View>
                <Text style={styles.docNumber}>{doc.number}</Text>
                {doc.expiryDate ? (
                  <Text style={styles.docExpiry}>Hết hạn: {doc.expiryDate}</Text>
                ) : null}
              </View>
            );
          })}
        </View>

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
  docNumber: {
    color: colors.neutral.text,
    fontSize: 13,
  },
  docExpiry: {
    color: colors.neutral.subtleText,
    fontSize: 11.5,
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
