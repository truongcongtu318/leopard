// Onboarding route disabled: app flow is splash -> login directly.
// Kept for reference in case onboarding is reintroduced later.
//
// import { useRouter } from 'expo-router';
// import { OnboardingScreen } from '../../src/features/onboarding/OnboardingScreen';
//
// export default function OnboardingRoute() {
//   const router = useRouter();
//
//   const handleGoToLogin = () => {
//     router.replace('/(public)/login');
//   };
//
//   return (
//     <OnboardingScreen
//       onDriverRegister={() => router.push('/(public)/driver-register')}
//       onExploreGuest={handleGoToLogin}
//       onGetStarted={handleGoToLogin}
//     />
//   );
// }

export default function OnboardingRoute() {
  return null;
}
