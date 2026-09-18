import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router/react-navigation';
import { useCallback, useState } from 'react';

import { CustomerOrdersListRuntime } from '../../../src/features/customer/orders/CustomerOrdersListRuntime';

const ACTIVE_TRACKING_STATUSES = [
  'ACCEPTED',
  'PICKING_UP',
  'PICKED_UP',
  'IN_TRANSIT',
  'RETURNING',
] as const;

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
      onOpenOrder={(orderId, status) => {
        if (status && (ACTIVE_TRACKING_STATUSES as readonly string[]).includes(status)) {
          router.push(`/customer/tracking?orderId=${orderId}`);
        } else {
          router.push(`/customer/orders/${orderId}`);
        }
      }}
    />
  );
}
