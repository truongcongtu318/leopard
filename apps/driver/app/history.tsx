import { useRouter } from 'expo-router';
import { DriverHistoryRuntime } from '../src/features/history/DriverHistoryRuntime';

export default function DriverHistoryRoute() {
  const router = useRouter();
  return <DriverHistoryRuntime onNavigate={(route) => router.push(route)} />;
}
