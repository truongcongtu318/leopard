import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';

import { sessionStore } from '../../../auth/session-store';
import { createDriverProfileHttpAdapter } from './adapter';
import type { DriverProfileView } from './model';
import { DriverProfileScreen } from './ProfileScreen';

export function DriverProfileRuntime() {
  const port = useMemo(() => createDriverProfileHttpAdapter(), []);
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const query = useQuery({
    queryKey: ['driver', 'profile'],
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
  let displayView: DriverProfileView;
  if (!view) {
    displayView = {
      scenarioId: 'DP-PROFILE-LOADING',
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
    <DriverProfileScreen
      onLogout={() => void handleLogout()}
      onRetry={() => query.refetch()}
      view={displayView}
    />
  );
}
