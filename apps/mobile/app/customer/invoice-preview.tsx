import { useLocalSearchParams, useRouter } from 'expo-router';

import { InvoicePreviewScreen } from '../../src/features/customer/orders/InvoicePreviewScreen';
import { ScreenScaffold, ScreenState } from '@leopard/mobile-core';

export default function InvoicePreviewPage() {
  const { invoiceId } = useLocalSearchParams<{ invoiceId?: string }>();
  const router = useRouter();

  if (!invoiceId || Array.isArray(invoiceId)) {
    return (
      <ScreenScaffold title="Xem hóa đơn">
        <ScreenState
          message="Liên kết hóa đơn không đúng định dạng."
          state="error"
          title="Không tìm thấy hóa đơn"
        />
      </ScreenScaffold>
    );
  }

  return <InvoicePreviewScreen invoiceId={invoiceId} onBack={() => router.back()} />;
}
