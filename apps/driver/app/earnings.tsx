import { useRouter } from 'expo-router';
import { DriverEarningsRuntime } from '../src/features/earnings/DriverEarningsRuntime';

export default function DriverEarningsRoute() {
  const router = useRouter();
  return <DriverEarningsRuntime onNavigate={(route) => router.push(route)} />;
}
