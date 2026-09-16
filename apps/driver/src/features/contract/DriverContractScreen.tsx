import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  IconCheck,
  IconExternalLink,
  IconFileText,
  ScreenScaffold,
  ScreenState,
  colors,
  leopardPalette,
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
      eyebrow="LEOPARD · B2B PARTNERSHIP"
      headerTone="ink"
      onBack={() => router.back()}
      title="Hợp đồng đối tác số hóa"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
          <View style={styles.cardOuter}>
            <View style={styles.cardInner}>
              <View style={styles.overviewHeader}>
                <View style={styles.overviewIconBadge}>
                  <IconFileText color="#1D4ED8" size={20} />
                </View>
                <View style={styles.overviewTextCol}>
                  <Text style={styles.contractCodeLabel}>PHIÊN BẢN HỢP ĐỒNG</Text>
                  <Text style={styles.contractCodeValue}>{status.version}</Text>
                </View>
                <View style={styles.statusPillActive} testID="contract-signed-badge">
                  <IconCheck color="#16A34A" size={12} strokeWidth={2.5} />
                  <Text style={styles.statusPillText}>ĐÃ KÝ</Text>
                </View>
              </View>
              <View style={styles.overviewDivider} />
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Người ký:</Text>
                  <Text style={styles.metaValue}>{status.signedByName}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Ngày ký:</Text>
                  <Text style={styles.metaValue}>{formatSignedAt(status.signedAt)}</Text>
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
                <IconFileText color="#1D4ED8" size={16} />
                <Text style={styles.downloadPdfText}>Tải tệp hợp đồng đã ký (PDF)</Text>
                <IconExternalLink color="#1D4ED8" size={14} />
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: 40,
  },
  pressed: {
    opacity: 0.8,
  },
  cardOuter: {
    backgroundColor: colors.neutral.surface,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    borderRadius: radius.bezelOuter,
    borderWidth: 1.5,
    padding: 4,
    shadowColor: colors.neutral.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardInner: {
    backgroundColor: '#FAFCFF',
    borderColor: colors.neutral.border,
    borderRadius: radius.bezelInner,
    borderWidth: 1,
    gap: 12,
    padding: spacing.md,
  },
  overviewHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  overviewIconBadge: {
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderRadius: 10,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  overviewTextCol: {
    flex: 1,
    gap: 2,
  },
  contractCodeLabel: {
    color: colors.neutral.subtleText,
    fontSize: typeScale.caption2.fontSize,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  contractCodeValue: {
    color: leopardPalette.primary,
    fontSize: typeScale.subheadline.fontSize,
    fontWeight: '900',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
  statusPillActive: {
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
  statusPillText: {
    color: '#15803D',
    fontSize: typeScale.caption2.fontSize,
    fontWeight: '800',
  },
  overviewDivider: {
    backgroundColor: colors.neutral.border,
    height: 1,
  },
  metaRow: {
    gap: 6,
  },
  metaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    color: colors.neutral.subtleText,
    fontSize: 11,
    fontWeight: '600',
  },
  metaValue: {
    color: colors.neutral.text,
    fontSize: 11,
    fontWeight: '800',
  },
  downloadPdfBtn: {
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  downloadPdfText: {
    color: '#1D4ED8',
    fontSize: typeScale.footnote.fontSize,
    fontWeight: '800',
  },
});
