import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Role } from '@leopard/shared';
import { LoginScreen } from '../../src/auth/LoginScreen';

export default function LoginRoute() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ expired?: string }>();
  const isExpired = searchParams.expired === 'true';

  const handleLoginSuccess = (role: Role) => {
    switch (role) {
      case 'CUSTOMER':
        router.replace('/customer/orders');
        break;
      case 'DRIVER':
        router.replace('/driver/orders');
        break;
      case 'FLEET_OWNER':
      case 'ADMIN':
        router.replace('/(public)/login');
        break;
      default:
        router.replace('/(public)/login');
        break;
    }
  };

  return <LoginScreen onLoginSuccess={handleLoginSuccess} sessionExpired={isExpired} />;
}
