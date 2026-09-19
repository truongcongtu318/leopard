import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Role } from '@leopard/shared';
import { LoginScreen } from '@leopard/mobile-core/src/auth/LoginScreen';

export default function LoginRoute() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ expired?: string }>();
  const isExpired = searchParams.expired === 'true';

  // Demo mode and real OTP are mutually exclusive, and this prop is the switch.
  // LoginScreen falls back to the Firebase flow (reCAPTCHA + SMS, verified by
  // the API at /auth/firebase) whenever `onNavigateOtp` is absent — so passing it
  // unconditionally, as this route used to, meant production would have kept
  // using the demo OTP screen even with Firebase fully configured.
  const allowDemo = process.env.EXPO_PUBLIC_ALLOW_DEMO_AUTH === 'true';
  // Ẩn khối tài khoản demo trên ứng dụng Customer
  const showCards = false;

  const handleLoginSuccess = (role: Role, profileComplete: boolean) => {
    if (role === 'CUSTOMER' && !profileComplete) {
      router.replace('/(public)/customer-register');
      return;
    }
    switch (role) {
      case 'CUSTOMER':
        router.replace('/customer/home');
        break;
      case 'DRIVER':
      case 'ADMIN':
        router.replace('/(public)/login');
        break;
      default:
        router.replace('/(public)/login');
        break;
    }
  };

  return (
    <LoginScreen
      allowDemo={showCards}
      onLoginSuccess={handleLoginSuccess}
      {...(allowDemo
        ? {
            onNavigateOtp: (phone: string) =>
              router.push({ pathname: '/(public)/verify-otp', params: { phone } }),
          }
        : {})}
      onNavigateRegister={() => router.push('/(public)/customer-register')}
      sessionExpired={isExpired}
    />
  );
}
