import { useLocalSearchParams } from 'expo-router';

import {
  normalizeRouteParam,
  parseCustomerOrderId,
} from '../../../src/features/customer/orders/adapter';
import { CustomerPreviewRoute } from '../../../src/features/customer/orders/preview/CustomerPreviewRoute';
import { ScreenScaffold } from '../../../src/ui/ScreenScaffold';
import { ScreenState } from '../../../src/ui/ScreenState';

export default function CustomerOrderDetailPage() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    preview?: string | string[];
    scenario?: string | string[];
  }>();
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
  return (
    <CustomerPreviewRoute
      localPreviewEnabled={normalizeRouteParam(params.preview) === 'enabled'}
      scenario={normalizeRouteParam(params.scenario)}
      screen="detail"
    />
  );
}
