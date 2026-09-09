import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { sessionStore } from '../../../auth/session-store';
import { Button, ScreenScaffold } from '@leopard/mobile-core';
import { createCustomerHttpAdapter } from './adapter';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export interface InvoicePreviewScreenProps {
  readonly invoiceId: string;
  readonly onBack: () => void;
  /** Injectable for tests; defaults to the real adapter's resolver. */
  readonly resolveDownloadUrl?: (invoiceId: string) => Promise<string>;
}

export function InvoicePreviewScreen({
  invoiceId,
  onBack,
  resolveDownloadUrl,
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

  return (
    <ScreenScaffold title="Xem hóa đơn">
      <View style={styles.toolbar}>
        <Button label="Quay lại" onPress={onBack} variant="secondary" />
        <Button label="Mở trong trình duyệt" onPress={() => void handleOpenExternally()} variant="secondary" />
      </View>
      {openError ? <Text style={styles.errorText}>{openError}</Text> : null}
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
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  errorText: {
    color: '#B91C1C',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  webview: {
    flex: 1,
  },
});
