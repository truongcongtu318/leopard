import { useRouter } from 'expo-router';

import { DriverOrderBoardRuntime } from '../src/features/orders/DriverOrderBoardRuntime';

export default function DriverBoardPage() {
  const router = useRouter();

  return (
    <DriverOrderBoardRuntime
      onNavigate={(route) => router.push(route)}
      onOpenOrder={(orderId) => router.push(`/orders/${orderId}`)}
    />
  );
}
