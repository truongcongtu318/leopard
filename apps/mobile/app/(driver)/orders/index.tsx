import { useLocalSearchParams, useRouter } from 'expo-router';

import { normalizeDriverRouteParam } from '../../../src/features/driver/orders/adapter';
import { DriverPreviewRoute } from '../../../src/features/driver/orders/preview/DriverPreviewRoute';

export default function DriverOrdersRoute() {
  const params = useLocalSearchParams<{
    preview?: string | string[];
    scenario?: string | string[];
  }>();
  const router = useRouter();
  return (
    <DriverPreviewRoute
      localPreviewEnabled={normalizeDriverRouteParam(params.preview) === 'enabled'}
      onOpenOrder={(orderId) => router.push(`/driver/orders/${orderId}?preview=enabled`)}
      scenario={normalizeDriverRouteParam(params.scenario)}
      screen="list"
    />
  );
}
