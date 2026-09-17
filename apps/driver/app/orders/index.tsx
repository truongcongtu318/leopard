import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router/react-navigation';
import { useCallback, useState } from 'react';

import { DriverOrdersListRuntime } from '../../src/features/orders/DriverOrdersListRuntime';

export default function DriverOrdersPage() {
  const router = useRouter();
  const [focusKey, setFocusKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setFocusKey((prev) => prev + 1);
    }, []),
  );

  return (
    <DriverOrdersListRuntime
      focusKey={focusKey}
      onNavigate={(route) => router.push(route)}
      onOpenOrder={(orderId) => router.push(`/orders/${orderId}`)}
    />
  );
}
