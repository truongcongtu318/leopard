import { useLocalSearchParams } from 'expo-router';

import { parseDriverOrderId } from '../../../src/features/driver/orders/adapter';
import { DriverOrderDetailRuntime } from '../../../src/features/driver/orders/DriverOrderDetailRuntime';
import { ScreenScaffold, ScreenState } from '@leopard/mobile-core';

export default function DriverOrderDetailPage() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const orderId = parseDriverOrderId(params.id);

  if (!orderId) {
    return (
      <ScreenScaffold title="Chi tiết đơn">
        <ScreenState
          message="Liên kết đơn hàng không đúng định dạng. Hãy quay lại danh sách đơn."
          state="error"
          title="Mã đơn không hợp lệ"
        />
      </ScreenScaffold>
    );
  }

  return <DriverOrderDetailRuntime orderId={orderId} />;
}

