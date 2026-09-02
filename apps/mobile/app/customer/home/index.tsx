import { useRouter } from 'expo-router';

import { sessionStore } from '../../../src/auth/session-store';
import { HomeDashboardScreen } from '../../../src/features/home/HomeDashboardScreen';

export default function CustomerHomePage() {
  const router = useRouter();

  const handleSwitchRole = async (targetRole: 'CUSTOMER' | 'DRIVER') => {
    await sessionStore.setSession('preview-acc-token', 'preview-ref-token', targetRole);
    if (targetRole === 'DRIVER') {
      router.replace('/driver/orders');
    } else {
      router.replace('/customer/home');
    }
  };

  return (
    <HomeDashboardScreen
      onNavigateTab={(tab) => {
        switch (tab) {
          case 'orders':
            router.push('/customer/orders');
            break;
          case 'tracking':
            router.push('/customer/deliveries');
            break;
          case 'account':
            router.push('/customer/profile');
            break;
          default:
            break;
        }
      }}
      onOpenActiveOrder={() => router.push('/customer/tracking')}
      onOpenNotifications={() => router.push('/customer/notifications')}
      onOpenProfile={() => router.push('/customer/profile')}
      onSelectVehicleAndBook={() => router.push('/customer/tracking')}
      onSwitchRole={handleSwitchRole}
      onTopUpWallet={() => router.push('/customer/wallet')}
    />
  );
}
