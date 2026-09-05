import { useLocalSearchParams, useRouter } from 'expo-router';

import { CustomerCreateOrderRuntime } from '../../../src/features/customer/orders/CustomerCreateOrderRuntime';

export default function CustomerCreateOrderPage() {
  const router = useRouter();
  const { dropoff, pickup } = useLocalSearchParams<{
    dropoff?: string;
    pickup?: string;
  }>();

  return (
    <CustomerCreateOrderRuntime
      initialDropoff={typeof dropoff === 'string' ? dropoff : undefined}
      initialPickup={typeof pickup === 'string' ? pickup : undefined}
      onCreated={(orderId) => router.replace(`/customer/orders/${orderId}`)}
    />
  );
}

