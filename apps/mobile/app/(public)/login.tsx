import { useLocalSearchParams, useRouter } from 'expo-router';
import { LoginScreen } from '../../src/auth/LoginScreen';

export default function LoginRoute() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ expired?: string }>();
  const isExpired = searchParams.expired === 'true';

  const handleLoginSuccess = (role: string) => {
    switch (role) {
      case 'CUSTOMER':
        router.replace('/customer/orders');
        break;
      case 'DRIVER':
        router.replace('/driver/orders');
        break;
      case 'FLEET_OWNER':
        router.replace('/fleet');
        break;
      case 'ADMIN':
        router.replace('/admin');
        break;
      default:
        router.replace('/customer/orders');
        break;
    }
  };

  return <LoginScreen onLoginSuccess={handleLoginSuccess} sessionExpired={isExpired} />;
}
