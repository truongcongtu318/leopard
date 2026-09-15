import { useRouter } from 'expo-router';
import { DriverProfileRuntime } from '../src/features/profile/ProfileRuntime';

export default function DriverProfileRoute() {
  const router = useRouter();
  return <DriverProfileRuntime onNavigate={(route) => router.push(route)} />;
}
