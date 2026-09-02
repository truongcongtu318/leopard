import { useRouter } from 'expo-router';

import { DriverOrdersListRuntime } from '../../../src/features/driver/orders/DriverOrdersListRuntime';

export default function DriverOrdersPage() {
  const router = useRouter();

  return (
    <DriverOrdersListRuntime
      onOpenOrder={(orderId) => router.push(`/driver/orders/${orderId}`)}
    />
  );
}

