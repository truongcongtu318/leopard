import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';

import { sessionStore } from '../../../auth/session-store';
import { createCustomerProfileHttpAdapter } from './adapter';
import type { CustomerProfileView } from './model';
import { CustomerProfileScreen } from './ProfileScreen';

export function CustomerProfileRuntime() {
  const port = useMemo(() => createCustomerProfileHttpAdapter(), []);
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const query = useQuery({
    queryKey: ['customer', 'profile'],
    queryFn: () => port.getProfileView(),
  });

  async function handleLogout() {
    setIsLoggingOut(true);
    await port.logout();
    await sessionStore.clearSession();
    setIsLoggingOut(false);
    router.replace('/(public)/login');
  }

  const view = query.data;
  let displayView: CustomerProfileView;
  if (!view) {
    displayView = {
      scenarioId: 'CP-PROFILE-LOADING',
      kind: 'loading',
      title: 'Đang tải hồ sơ',
      message: 'Vui lòng chờ trong giây lát.',
    };
  } else if (view.kind === 'content') {
    displayView = { ...view, isLoggingOut };
  } else {
    displayView = view;
  }

  return (
    <CustomerProfileScreen
      onLogout={() => void handleLogout()}
      onRetry={() => query.refetch()}
      view={displayView}
    />
  );
}
