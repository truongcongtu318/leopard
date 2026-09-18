import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { WebView } from 'react-native-webview';

import {
  Badge,
  Button,
  colors,
  customerPalette,
  haptic,
  HStack,
  IconFileText,
  IconSecurityShield,
  iosContinuousCurve,
  leopardPalette,
  radius,
  ScreenScaffold,
  sessionStore,
  spacing,
  typeScale,
  VStack,
} from '@leopard/mobile-core';
import { createCustomerHttpAdapter } from './adapter';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export interface InvoicePreviewScreenProps {
  readonly invoiceId: string;
  readonly onBack: () => void;
  /** Injectable for tests; defaults to the real adapter's resolver. */
  readonly resolveDownloadUrl?: (invoiceId: string) => Promise<string>;
  readonly customerTaxId?: string;
  readonly totalAmountVnd?: string;
}

export function InvoicePreviewScreen({
  customerTaxId = '0318999999',
  invoiceId,
  onBack,
  resolveDownloadUrl,
  totalAmountVnd = '850.000 ₫',
}: InvoicePreviewScreenProps) {
  const [openError, setOpenError] = useState<string | null>(null);
  const downloadPath = `${API_BASE}/invoices/${invoiceId}/download`;
  const token = sessionStore.getAccessToken();

  const handleOpenExternally = async () => {
    haptic.light();
    setOpenError(null);
    try {
      const resolver =
        resolveDownloadUrl ?? createCustomerHttpAdapter().getInvoiceDownloadUrl;
      if (!resolver) throw new Error('resolveDownloadUrl unavailable');
      const url = await resolver(invoiceId);
      await Linking.openURL(url);
    } catch {
      haptic.warning();
      setOpenError('Không thể mở hóa đơn trong trình duyệt. Vui lòng thử lại.');
    }
  };

  const qrLookupPayload = `https://hoadondientu.gdt.gov.vn/tra-cuu?id=${invoiceId}&tax=0383188888`;

  return (
    <ScreenScaffold title="Xem hóa đơn">
      {/* ── Apple HIG E-Ticket Invoice Card ────────────────────────── */}
      <View style={styles.ticketCard}>
        {/* Ticket Header */}
        <View style={styles.ticketHeader}>
          <HStack style={styles.ticketTopRow}>
            <HStack style={styles.ticketTitleWrap}>
              <View style={styles.shieldBox}>
                <IconSecurityShield color={leopardPalette.ecoGreen} size={18} strokeWidth={2} />
              </View>
              <VStack style={styles.ticketTitleCol}>
                <Text style={styles.ticketTitle}>Hóa đơn điện tử VAT (Thuế suất 8%)</Text>
                <Text style={styles.ticketSubtitle}>
                  Cục Thuế TP. Hồ Chí Minh · Tra cứu mã QR
                </Text>
              </VStack>
            </HStack>
            <Badge action="success" size="sm" style={styles.vatBadge}>
              <Badge.Text style={styles.vatBadgeText}>VAT 8%</Badge.Text>
            </Badge>
          </HStack>
        </View>

        {/* Perforated Dashed Hairline Divider with Notch Punch Cutouts */}
        <View style={styles.perforatedRow}>
          <View style={styles.leftNotch} />
          <View style={styles.dashedDivider} />
          <View style={styles.rightNotch} />
        </View>

        {/* Ticket Body: Metadata & QR Verification */}
        <View style={styles.ticketBody}>
          <View style={styles.ticketDetailsRow}>
            <View
              accessibilityLabel="Tra cứu mã QR hóa đơn"
              style={styles.qrBox}
            >
              <QRCode size={56} value={qrLookupPayload} />
            </View>
            <View style={styles.ticketMetaCol}>
              <Text style={styles.ticketMetaText}>
                Bên phát hành: <Text style={styles.boldText}>CÔNG TY CP LEOPARD LOGISTICS</Text>
              </Text>
              <Text style={styles.ticketMetaText}>
                MST: <Text style={styles.tabularBold}>0383188888</Text> · Số HĐ: <Text style={styles.tabularBold}>{invoiceId}</Text>
              </Text>
              <Text style={styles.ticketMetaText}>
                MST KH: <Text style={styles.tabularBold}>{customerTaxId}</Text> · Tổng: <Text style={styles.tabularBoldPrimary}>{totalAmountVnd}</Text>
              </Text>
              <Text style={styles.ticketMetaSub}>
                Hóa đơn hợp pháp theo NĐ 123/2020/NĐ-CP và TT 78/2021/TT-BTC
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── Action Toolbar (Touch targets >= 44x44pt) ───────────────── */}
      <View style={styles.toolbar}>
        <Button
          label="Quay lại"
          onPress={() => {
            haptic.light();
            onBack();
          }}
          variant="secondary"
        />
        <Pressable
          accessibilityLabel="Tải hóa đơn VAT PDF"
          accessibilityRole="button"
          onPress={() => void handleOpenExternally()}
          style={({ pressed }) => [styles.downloadPdfBtn, pressed ? styles.btnPressed : null]}
        >
          <IconFileText color={colors.neutral.surface} size={18} strokeWidth={2} />
          <Text style={styles.downloadPdfBtnText}>Tải hóa đơn VAT PDF</Text>
        </Pressable>
        <Button
          label="Mở trong trình duyệt"
          onPress={() => void handleOpenExternally()}
          variant="secondary"
        />
      </View>
      {openError ? <Text style={styles.errorText}>{openError}</Text> : null}

      {/* ── Document Viewer ────────────────────────────────────────── */}
      <WebView
        source={{
          uri: downloadPath,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }}
        style={styles.webview}
      />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  // ─── E-Ticket Card ────────────────────────────────
  ticketCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.neutral.border,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    boxShadow: '0 4px 16px rgba(11, 37, 69, 0.06)',
    elevation: 2,
    overflow: 'hidden',
  },
  ticketHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  ticketTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  ticketTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  shieldBox: {
    width: 32,
    height: 32,
    borderRadius: radius.cardSm,
    ...iosContinuousCurve,
    backgroundColor: colors.success.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketTitleCol: {
    flex: 1,
    gap: spacing.hairline,
  },
  ticketTitle: {
    color: colors.neutral.text,
    ...typeScale.subheadline,
    fontWeight: '600',
  },
  ticketSubtitle: {
    color: colors.neutral.subtleText,
    ...typeScale.caption1,
  },
  vatBadge: {
    backgroundColor: colors.success.background,
    borderColor: colors.success.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.hairline,
  },
  vatBadgeText: {
    color: colors.success.text,
    ...typeScale.caption2,
    fontWeight: '600',
  },

  // ─── Perforated Dashed Divider with Notches ───────
  perforatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 18,
    marginVertical: spacing.xxs,
  },
  leftNotch: {
    width: 10,
    height: 18,
    borderTopRightRadius: 9,
    borderBottomRightRadius: 9,
    backgroundColor: colors.neutral.canvas,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.neutral.border,
    borderLeftWidth: 0,
    marginLeft: -StyleSheet.hairlineWidth,
  },
  dashedDivider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.neutral.subtleBorder,
    marginHorizontal: spacing.xs,
  },
  rightNotch: {
    width: 10,
    height: 18,
    borderTopLeftRadius: 9,
    borderBottomLeftRadius: 9,
    backgroundColor: colors.neutral.canvas,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.neutral.border,
    borderRightWidth: 0,
    marginRight: -StyleSheet.hairlineWidth,
  },

  // ─── Ticket Body ──────────────────────────────────
  ticketBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.xxs,
  },
  ticketDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.neutral.canvas,
    borderRadius: radius.cardSm,
    ...iosContinuousCurve,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.neutral.border,
    padding: spacing.sm,
  },
  qrBox: {
    backgroundColor: colors.neutral.surface,
    padding: spacing.xxs,
    borderRadius: radius.cardSm,
    ...iosContinuousCurve,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.neutral.subtleBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketMetaCol: {
    flex: 1,
    gap: spacing.hairline + 1,
  },
  ticketMetaText: {
    color: colors.neutral.text,
    ...typeScale.caption1,
    lineHeight: 16,
  },
  ticketMetaSub: {
    color: colors.neutral.subtleText,
    ...typeScale.caption2,
    fontStyle: 'italic',
    marginTop: spacing.hairline,
  },
  boldText: {
    fontWeight: '700',
    color: colors.neutral.text,
  },
  tabularBold: {
    fontWeight: '700',
    color: colors.neutral.text,
    fontVariant: ['tabular-nums'],
  },
  tabularBoldPrimary: {
    fontWeight: '700',
    color: customerPalette.primary,
    fontVariant: ['tabular-nums'],
  },

  // ─── Toolbar ───────────────────────────────────────
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    backgroundColor: colors.neutral.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral.surfaceMuted,
  },
  downloadPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: customerPalette.primary,
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    boxShadow: '0 2px 6px rgba(11, 37, 69, 0.2)',
    elevation: 2,
  },
  downloadPdfBtnText: {
    color: colors.neutral.surface,
    ...typeScale.caption1,
    fontWeight: '600',
  },
  btnPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.9,
  },
  errorText: {
    color: colors.danger.text,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
    ...typeScale.caption1,
  },
  webview: {
    flex: 1,
  },
});
