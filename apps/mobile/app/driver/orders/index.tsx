import { useRouter } from 'expo-router';

import { DriverOrdersListRuntime } from '../../../src/features/driver/orders/DriverOrdersListRuntime';

export default function DriverOrdersPage() {
  const router = useRouter();

  return (
    <DriverOrdersListRuntime
      onNavigate={(route) => router.push(route)}
      onOpenOrder={(orderId) => router.push(`/driver/orders/${orderId}`)}
    />
  );
}

