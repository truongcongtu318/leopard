import { useLocalSearchParams, useRouter } from 'expo-router';

import { normalizeRouteParam } from '../../../src/features/customer/orders/adapter';
import { CustomerPreviewRoute } from '../../../src/features/customer/orders/preview/CustomerPreviewRoute';

export default function CustomerOrdersPage() {
  const params = useLocalSearchParams<{
    preview?: string | string[];
    scenario?: string | string[];
  }>();
  const router = useRouter();
  const preview = normalizeRouteParam(params.preview);

  return (
    <CustomerPreviewRoute
      localPreviewEnabled={preview === 'enabled'}
      onCreate={() => router.push('/customer/orders/new?preview=enabled')}
      onOpenOrder={(orderId) => router.push(`/customer/orders/${orderId}?preview=enabled`)}
      scenario={normalizeRouteParam(params.scenario)}
      screen="list"
    />
  );
}
