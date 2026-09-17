import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  IconCheck,
  IconExternalLink,
  IconFileText,
  IconSecurityShield,
  IconSpeedTruck,
  IconWallet,
  ScreenScaffold,
  ScreenState,
  colors,
  driverPrimitives,
  iosContinuousCurve,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';
import type { DriverContractStatusResponse } from './adapter';

export type DriverContractScreenProps = Readonly<{
  status: DriverContractStatusResponse | null;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}>;

function formatSignedAt(value: string | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DriverContractScreen({ isError, isLoading, onRetry, status }: DriverContractScreenProps) {
  const router = useRouter();

  const handleOpenPdf = async () => {
    if (!status?.pdfUrl) return;
    try {
      await Linking.openURL(status.pdfUrl);
    } catch {
      Alert.alert('Tải hợp đồng', 'Không thể mở tệp PDF trực tiếp. Vui lòng thử lại sau.');
    }
  };

  return (
    <ScreenScaffold
      headerTone="plain"
      onBack={() => router.back()}
      title="Hợp đồng đối tác"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.scrollWrap}
        testID="contract-screen-scroll"
      >
        {isLoading ? (
          <ScreenState state="loading" />
        ) : isError ? (
          <ScreenState actionLabel="Thử lại" onAction={onRetry} state="error" />
        ) : !status?.signed ? (
          <ScreenState
            message="Bạn chưa có hợp đồng nào được ký. Hợp đồng được ký một lần trong quá trình đăng ký làm đối tác."
            state="empty"
            title="Chưa có hợp đồng"
          />
        ) : (
          <>
            {/* ── 1. Hero Contract Status Card (Apple Inset Grouped) ── */}
            <View style={styles.heroCard}>
              <View style={styles.overviewHeader}>
                <View style={styles.overviewIconBadge}>
                  <IconFileText color={colors.brand.primary} size={22} />
                </View>
                <View style={styles.overviewTextCol}>
                  <Text style={styles.contractCodeLabel}>Phiên bản hợp đồng</Text>
                  <Text style={styles.contractCodeValue}>{status.version}</Text>
                </View>
                <View style={styles.statusPillActive} testID="contract-signed-badge">
                  <IconCheck color="#16A34A" size={12} strokeWidth={2.5} />
                  <Text style={styles.statusPillText}>Đã ký điện tử</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Người ký xác nhận</Text>
                  <Text style={styles.metaValue}>{status.signedByName}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Thời gian ký kết</Text>
                  <Text style={styles.metaValue}>{formatSignedAt(status.signedAt)}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Tính pháp lý</Text>
                  <Text style={styles.metaValueHighlight}>Chứng thực điện tử hợp lệ</Text>
                </View>
              </View>

              <Pressable
                accessibilityHint="Mở bản hợp đồng đã ký định dạng tệp PDF"
                accessibilityLabel="Tải tệp hợp đồng PDF"
                accessibilityRole="button"
                disabled={!status.pdfUrl}
                onPress={() => void handleOpenPdf()}
                style={({ pressed }) => [styles.downloadPdfBtn, pressed ? styles.pressed : null]}
                testID="btn-download-contract-pdf"
              >
                <IconFileText color={colors.brand.primary} size={18} />
                <Text style={styles.downloadPdfText}>Tải tệp hợp đồng đã ký (PDF)</Text>
                <IconExternalLink color={colors.brand.primary} size={15} />
              </Pressable>
            </View>

            {/* ── 2. Key Terms Summary (Apple Inset Grouped) ── */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Tóm tắt điều khoản chính</Text>

              <View style={styles.termsCard}>
                <View style={styles.termItem}>
                  <View style={styles.termIconBox}>
                    <IconSpeedTruck color={colors.brand.primary} size={18} />
                  </View>
                  <View style={styles.termContent}>
                    <Text style={styles.termTitle}>Tư cách & Phương tiện vận chuyển</Text>
                    <Text style={styles.termDesc}>
                      Tài xế là đối tác vận tải độc lập, chủ động phương tiện và thời gian hoạt động theo thỏa thuận dịch vụ.
                    </Text>
                  </View>
                </View>

                <View style={styles.termDivider} />

                <View style={styles.termItem}>
                  <View style={styles.termIconBox}>
                    <IconWallet color={colors.brand.primary} size={18} />
                  </View>
                  <View style={styles.termContent}>
                    <Text style={styles.termTitle}>Thu nhập & Phân chia cước phí</Text>
                    <Text style={styles.termDesc}>
                      Thu nhập được đối soát tự động theo từng cuốc xe hoàn tất và có thể rút về tài khoản ngân hàng bất kỳ lúc nào.
                    </Text>
                  </View>
                </View>

                <View style={styles.termDivider} />

                <View style={styles.termItem}>
                  <View style={styles.termIconBox}>
                    <IconSecurityShield color={colors.brand.primary} size={18} />
                  </View>
                  <View style={styles.termContent}>
                    <Text style={styles.termTitle}>Bảo vệ hàng hóa & Quy chuẩn e-POD</Text>
                    <Text style={styles.termDesc}>
                      Cam kết bảo quản nguyên vẹn hàng hóa, tuân thủ quy trình chụp ảnh xác nhận và lấy chữ ký người nhận.
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* ── 3. Parties Info (Apple Inset Grouped) ── */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Các bên tham gia ký kết</Text>

              <View style={styles.partiesCard}>
                <View style={styles.partyBox}>
                  <Text style={styles.partyRoleLabel}>Bên giao kết (Nền tảng)</Text>
                  <Text style={styles.partyName}>CÔNG TY CỔ PHẦN LEOPARD EXPRESS</Text>
                  <Text style={styles.partySub}>Đại diện: Ban Điều Hành Nền Tảng LEOPARD</Text>
                  <Text style={styles.partySub}>Tổng đài hỗ trợ đối tác: 1900 6868</Text>
                </View>

                <View style={styles.partyDivider} />

                <View style={styles.partyBox}>
                  <Text style={styles.partyRoleLabel}>Bên nhận giao kết (Đối tác tài xế)</Text>
                  <Text style={styles.partyName}>Tài xế đối tác ({status.signedByName})</Text>
                  <Text style={styles.partySub}>Tư cách: Tài xế đối tác vận tải công nghệ</Text>
                  <Text style={styles.partySub}>Trạng thái: Đã xác thực CCCD & GPLX chính chủ</Text>
                </View>
              </View>
            </View>

            {/* ── 4. Legal Security Note ── */}
            <View style={styles.securityNoteBox}>
              <IconSecurityShield color={driverPrimitives.colors.green700} size={18} />
              <Text style={styles.securityNoteText}>
                Bản hợp đồng điện tử được mã hóa và lưu trữ bảo mật trên hệ thống đám mây LEOPARD, có đầy đủ giá trị pháp lý theo Luật Giao dịch điện tử.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scrollWrap: {
    backgroundColor: colors.neutral.canvas,
    flex: 1,
  },
  scrollContent: {
    gap: spacing.md,
    paddingHorizontal: 0,
    paddingVertical: spacing.sm,
    paddingBottom: 48,
  },
  pressed: {
    opacity: 0.85,
  },

  /* 1. Hero Contract Card */
  heroCard: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    gap: spacing.sm + 2,
    padding: spacing.md,
    ...driverPrimitives.shadows.sm,
  },
  overviewHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  overviewIconBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(11, 37, 69, 0.08)',
    borderColor: 'rgba(11, 37, 69, 0.12)',
    borderRadius: radius.cardSm,
    ...iosContinuousCurve,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  overviewTextCol: {
    flex: 1,
    gap: 2,
  },
  contractCodeLabel: {
    color: colors.neutral.mutedText,
    ...typeScale.caption2,
  },
  contractCodeValue: {
    ...typeScale.subheadline,
    color: colors.brand.primary,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statusPillActive: {
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusPillText: {
    color: driverPrimitives.colors.green700,
    ...typeScale.caption2,
    fontWeight: '600',
  },
  divider: {
    backgroundColor: colors.neutral.border,
    height: 1,
  },
  metaRow: {
    gap: spacing.xs,
  },
  metaItem: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    color: colors.neutral.mutedText,
    ...typeScale.footnote,
  },
  metaValue: {
    color: driverPrimitives.colors.gray900,
    ...typeScale.footnote,
    fontWeight: '600',
  },
  metaValueHighlight: {
    color: driverPrimitives.colors.green700,
    ...typeScale.footnote,
    fontWeight: '600',
  },
  downloadPdfBtn: {
    alignItems: 'center',
    backgroundColor: colors.brand.softBackground,
    borderColor: 'rgba(11, 37, 69, 0.15)',
    borderRadius: radius.control,
    ...iosContinuousCurve,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  downloadPdfText: {
    color: colors.brand.primary,
    ...typeScale.subheadline,
    fontWeight: '600',
  },

  /* 2. Key Terms Section */
  sectionBlock: {
    gap: spacing.xs,
  },
  sectionTitle: {
    color: driverPrimitives.colors.gray900,
    ...typeScale.subheadline,
    fontWeight: '600',
    paddingHorizontal: spacing.xxs,
  },
  termsCard: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    overflow: 'hidden',
    ...driverPrimitives.shadows.sm,
  },
  termItem: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  termIconBox: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: 10,
    ...iosContinuousCurve,
    height: 36,
    justifyContent: 'center',
    marginTop: 2,
    width: 36,
  },
  termContent: {
    flex: 1,
    gap: 4,
  },
  termTitle: {
    color: driverPrimitives.colors.gray900,
    ...typeScale.subheadline,
    fontWeight: '600',
  },
  termDesc: {
    color: colors.neutral.mutedText,
    ...typeScale.caption1,
    lineHeight: 18,
  },
  termDivider: {
    backgroundColor: driverPrimitives.colors.gray100,
    height: 1,
    marginLeft: 60,
  },

  /* 3. Parties Section */
  partiesCard: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    ...driverPrimitives.shadows.sm,
  },
  partyBox: {
    gap: 4,
  },
  partyRoleLabel: {
    color: colors.brand.primary,
    ...typeScale.caption2,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  partyName: {
    color: driverPrimitives.colors.gray900,
    ...typeScale.subheadline,
    fontWeight: '700',
  },
  partySub: {
    color: colors.neutral.mutedText,
    ...typeScale.caption2,
  },
  partyDivider: {
    backgroundColor: colors.neutral.border,
    height: 1,
  },

  /* 4. Security Note */
  securityNoteBox: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
    borderRadius: radius.control,
    ...iosContinuousCurve,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  securityNoteText: {
    color: driverPrimitives.colors.green900,
    ...typeScale.caption1,
    flex: 1,
    lineHeight: 18,
  },
});
