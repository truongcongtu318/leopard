import { useLocalSearchParams } from 'expo-router';

import { normalizeRouteParam } from '../../../src/features/customer/orders/adapter';
import { CustomerPreviewRoute } from '../../../src/features/customer/orders/preview/CustomerPreviewRoute';

export default function CustomerCreateOrderRoute() {
  const params = useLocalSearchParams<{
    preview?: string | string[];
    scenario?: string | string[];
  }>();
  return (
    <CustomerPreviewRoute
      localPreviewEnabled={normalizeRouteParam(params.preview) === 'enabled'}
      scenario={normalizeRouteParam(params.scenario)}
      screen="create"
    />
  );
}
