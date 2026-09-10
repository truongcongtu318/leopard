import { useLocalSearchParams } from 'expo-router';

import { CustomerTrackingRuntime } from '../../src/features/tracking/CustomerTrackingRuntime';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function CustomerTrackingPage() {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const validOrderId =
    typeof orderId === 'string' && UUID_PATTERN.test(orderId) ? orderId : undefined;

  return <CustomerTrackingRuntime initialOrderId={validOrderId} />;
}
