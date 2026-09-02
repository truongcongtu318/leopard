import { useRouter } from 'expo-router';

import { CustomerCreateOrderRuntime } from '../../../src/features/customer/orders/CustomerCreateOrderRuntime';

export default function CustomerCreateOrderPage() {
  const router = useRouter();

  return (
    <CustomerCreateOrderRuntime
      onCreated={(orderId) => router.replace(`/customer/orders/${orderId}`)}
    />
  );
}

