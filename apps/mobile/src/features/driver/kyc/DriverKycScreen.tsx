import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../../theme/tokens';
import { Button } from '../../../ui/Button';
import { ScreenScaffold } from '../../../ui/ScreenScaffold';

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
            <Text style={styles.verifiedIcon}>🛡️</Text>
            <View>
              <Text style={styles.verifiedTitle}>HỒ SƠ ĐÃ ĐƯỢC XÁC THỰC</Text>
              <Text style={styles.verifiedSub}>Bạn đủ điều kiện nhận toàn bộ các chuyến hàng.</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>GIẤY TỜ PHÁP LÝ ĐÃ NỘP</Text>

        <View style={styles.docList}>
          {mockDocuments.map((doc) => (
            <View key={doc.id} style={styles.docCard}>
              <View style={styles.docHeader}>
                <Text style={styles.docTitle}>{doc.title}</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>✓ Đã duyệt</Text>
                </View>
              </View>
              <Text style={styles.docNumber}>{doc.number}</Text>
              {doc.expiryDate ? (
                <Text style={styles.docExpiry}>Hết hạn: {doc.expiryDate}</Text>
              ) : null}
            </View>
          ))}
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
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.md,
  },
  verifiedLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  verifiedIcon: {
    fontSize: 24,
  },
  verifiedTitle: {
    color: '#065F46',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  verifiedSub: {
    color: '#047857',
    fontSize: 12,
    marginTop: 2,
  },
  sectionLabel: {
    color: colors.brand.background,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
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
  docTitle: {
    color: colors.neutral.titleText,
    fontSize: 13.5,
    fontWeight: '700',
  },
  statusBadge: {
    backgroundColor: '#ECFDF5',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeText: {
    color: '#065F46',
    fontSize: 11,
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
