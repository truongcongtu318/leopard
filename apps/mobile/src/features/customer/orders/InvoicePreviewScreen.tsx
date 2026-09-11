import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { WebView } from 'react-native-webview';

import { sessionStore } from '@leopard/mobile-core';
import { Button, IconFileText, IconSecurityShield, ScreenScaffold } from '@leopard/mobile-core';
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
    setOpenError(null);
    try {
      const resolver =
        resolveDownloadUrl ?? createCustomerHttpAdapter().getInvoiceDownloadUrl;
      if (!resolver) throw new Error('resolveDownloadUrl unavailable');
      const url = await resolver(invoiceId);
      await Linking.openURL(url);
    } catch {
      setOpenError('Không thể mở hóa đơn trong trình duyệt. Vui lòng thử lại.');
    }
  };

  const qrLookupPayload = `https://hoadondientu.gdt.gov.vn/tra-cuu?id=${invoiceId}&tax=0383188888`;

  return (
    <ScreenScaffold title="Xem hóa đơn">
      {/* ── Tax Compliance Double-Bezel Card (24px outer, 18px inner) ── */}
      <View style={styles.complianceCardOuter}>
        <View style={styles.complianceCardInner}>
          <View style={styles.complianceTopRow}>
            <View style={styles.complianceTitleWrap}>
              <IconSecurityShield color="#16A34A" size={20} strokeWidth={2} />
              <View style={styles.complianceTitleCol}>
                <Text style={styles.complianceTitle}>Hóa đơn điện tử VAT (Thuế suất 8%)</Text>
                <Text style={styles.complianceSubtitle}>
                  Cục Thuế TP. Hồ Chí Minh · Tra cứu mã QR
                </Text>
              </View>
            </View>
            <View style={styles.complianceBadge}>
              <Text style={styles.complianceBadgeText}>VAT 8%</Text>
            </View>
          </View>

          <View style={styles.complianceDetailsRow}>
            <View
              accessibilityLabel="Tra cứu mã QR hóa đơn"
              style={styles.qrBox}
            >
              <QRCode size={56} value={qrLookupPayload} />
            </View>
            <View style={styles.complianceMetaCol}>
              <Text style={styles.complianceMetaText}>
                Bên phát hành: <Text style={styles.boldText}>CÔNG TY CP LEOPARD LOGISTICS</Text>
              </Text>
              <Text style={styles.complianceMetaText}>
                MST: <Text style={styles.tabularBold}>0383188888</Text> · Số HĐ: <Text style={styles.tabularBold}>{invoiceId}</Text>
              </Text>
              <Text style={styles.complianceMetaText}>
                MST KH: <Text style={styles.tabularBold}>{customerTaxId}</Text> · Tổng: <Text style={styles.tabularBold}>{totalAmountVnd}</Text>
              </Text>
              <Text style={styles.complianceMetaSub}>
                Hóa đơn hợp pháp theo NĐ 123/2020/NĐ-CP và TT 78/2021/TT-BTC
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── Action Toolbar (Touch targets >= 44x44px) ───────────────── */}
      <View style={styles.toolbar}>
        <Button label="Quay lại" onPress={onBack} variant="secondary" />
        <Pressable
          accessibilityLabel="Tải hóa đơn VAT PDF"
          accessibilityRole="button"
          onPress={() => void handleOpenExternally()}
          style={({ pressed }) => [styles.downloadPdfBtn, pressed ? styles.pressed : null]}
        >
          <IconFileText color="#FFFFFF" size={18} strokeWidth={2} />
          <Text style={styles.downloadPdfBtnText}>Tải hóa đơn VAT PDF</Text>
        </Pressable>
        <Button label="Mở trong trình duyệt" onPress={() => void handleOpenExternally()} variant="secondary" />
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
  // ── Double-Bezel Card ─────────────────────────────
  complianceCardOuter: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 12,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  complianceCardInner: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 12,
  },
  complianceTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  complianceTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  complianceTitleCol: {
    flex: 1,
  },
  complianceTitle: {
    color: '#0B1E42',
    fontSize: 14,
    fontWeight: '800',
  },
  complianceSubtitle: {
    color: '#64748B',
    fontSize: 11.5,
    marginTop: 1,
  },
  complianceBadge: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  complianceBadgeText: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: '800',
  },
  complianceDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
  },
  qrBox: {
    backgroundColor: '#FFFFFF',
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  complianceMetaCol: {
    flex: 1,
    gap: 3,
  },
  complianceMetaText: {
    color: '#334155',
    fontSize: 11.5,
  },
  complianceMetaSub: {
    color: '#64748B',
    fontSize: 10.5,
    fontStyle: 'italic',
    marginTop: 2,
  },
  boldText: {
    fontWeight: '700',
    color: '#0F172A',
  },
  tabularBold: {
    fontWeight: '700',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
  },

  // ── Toolbar ───────────────────────────────────────
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  downloadPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0B1E42',
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  downloadPdfBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
  errorText: {
    color: '#B91C1C',
    paddingHorizontal: 16,
    paddingBottom: 8,
    fontSize: 12,
  },
  webview: {
    flex: 1,
  },
});
