import { useLocalSearchParams } from 'expo-router';

import {
  normalizeDriverRouteParam,
  parseDriverOrderId,
} from '../../../src/features/driver/orders/adapter';
import { DriverPreviewRoute } from '../../../src/features/driver/orders/preview/DriverPreviewRoute';
import { ScreenScaffold } from '../../../src/ui/ScreenScaffold';
import { ScreenState } from '../../../src/ui/ScreenState';

export default function DriverOrderDetailPage() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    preview?: string | string[];
    scenario?: string | string[];
  }>();
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
  return (
    <DriverPreviewRoute
      localPreviewEnabled={normalizeDriverRouteParam(params.preview) === 'enabled'}
      orderId={orderId}
      scenario={normalizeDriverRouteParam(params.scenario)}
      screen="detail"
    />
  );
}
