import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router/react-navigation';
import { useCallback, useState } from 'react';

import { CustomerOrdersListRuntime } from '../../../src/features/customer/orders/CustomerOrdersListRuntime';

export default function CustomerOrdersPage() {
  const router = useRouter();
  const [focusKey, setFocusKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setFocusKey((prev) => prev + 1);
    }, []),
  );

  return (
    <CustomerOrdersListRuntime
      focusKey={focusKey}
      onCreate={() => router.replace('/customer/home')}
      onOpenOrder={(orderId) => router.push(`/customer/orders/${orderId}`)}
    />
  );
}
