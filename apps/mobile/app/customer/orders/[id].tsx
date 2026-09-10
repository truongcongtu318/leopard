import { useLocalSearchParams } from 'expo-router';

import { parseCustomerOrderId } from '../../../src/features/customer/orders/adapter';
import { CustomerOrderDetailRuntime } from '../../../src/features/customer/orders/CustomerOrderDetailRuntime';
import { ScreenScaffold, ScreenState } from '@leopard/mobile-core';

export default function CustomerOrderDetailPage() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const orderId = parseCustomerOrderId(params.id);

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

  return <CustomerOrderDetailRuntime orderId={orderId} />;
}

