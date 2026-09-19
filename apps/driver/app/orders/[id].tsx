import { useLocalSearchParams, useRouter } from 'expo-router';

import { parseDriverOrderId } from '../../src/features/orders/adapter';
import { DriverOrderDetailRuntime } from '../../src/features/orders/DriverOrderDetailRuntime';
import { ScreenScaffold, ScreenState } from '@leopard/mobile-core';

export default function DriverOrderDetailPage() {
  const router = typeof useRouter === 'function' ? useRouter() : undefined;
  const params = useLocalSearchParams<{ id?: string | string[]; fromHistory?: string }>();
  const orderId = parseDriverOrderId(params?.id);
  const fromHistory = params?.fromHistory === '1';

  if (!orderId) {
    return (
      <ScreenScaffold title="Chi tiết đơn">
        <ScreenState
          actionLabel="Về danh sách đơn"
          message="Liên kết đơn hàng không đúng định dạng. Hãy quay lại danh sách đơn."
          onAction={() => {
            if (router?.replace) {
              router.replace('/orders');
            }
          }}
          state="error"
          title="Mã đơn không hợp lệ"
        />
      </ScreenScaffold>
    );
  }

  return (
    <DriverOrderDetailRuntime
      {...(fromHistory ? { fromHistory: true } : {})}
      orderId={orderId}
    />
  );
}
