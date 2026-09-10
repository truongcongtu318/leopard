import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Role } from '@leopard/shared';
import { LoginScreen } from '@leopard/mobile-core/src/auth/LoginScreen';

export default function DriverLoginRoute() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ expired?: string }>();
  const isExpired = searchParams.expired === 'true';

  const handleLoginSuccess = (role: Role) => {
    if (role === 'DRIVER') {
      router.replace('/orders');
      return;
    }
    // Non-driver role handling will be refined in Task 12
    router.replace('/(public)/login');
  };

  return (
    <LoginScreen
      onLoginSuccess={handleLoginSuccess}
      onNavigateRegister={() => router.push('/(public)/driver-register')}
      sessionExpired={isExpired}
    />
  );
}
