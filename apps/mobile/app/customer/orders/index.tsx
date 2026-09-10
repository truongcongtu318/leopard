import { useRouter } from 'expo-router';

import { CustomerOrdersListRuntime } from '../../../src/features/customer/orders/CustomerOrdersListRuntime';

export default function CustomerOrdersPage() {
  const router = useRouter();

  return (
    <CustomerOrdersListRuntime
      onCreate={() => router.push('/customer/orders/new')}
      onOpenOrder={(orderId) => router.push(`/customer/orders/${orderId}`)}
    />
  );
}
