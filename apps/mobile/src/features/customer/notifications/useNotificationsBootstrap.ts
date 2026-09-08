import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { createCustomerNotificationsHttpAdapter } from './adapter';
import { createNotificationSocketFactory } from './notification-socket-factory';
import { createNotificationsBootstrap } from './notifications-bootstrap';
import { createCustomerNotificationSocket } from './notification-socket';

/**
 * Mounted once from the authenticated customer layout (never from
 * public/auth routes). While `enabled`, connects the `/notifications`
 * socket and registers the push token; on becoming disabled (or on
 * unmount, e.g. after logout) it disconnects and removes the token.
 */
export function useNotificationsBootstrap(enabled: boolean): void {
  const queryClient = useQueryClient();
  const socketManager = useMemo(
    () => createCustomerNotificationSocket({ socketFactory: createNotificationSocketFactory }),
    [],
  );
  const port = useMemo(() => createCustomerNotificationsHttpAdapter(), []);

  useEffect(() => {
    if (!enabled) return undefined;

    const bootstrap = createNotificationsBootstrap({ queryClient, socketManager, port });
    bootstrap.start();

    return () => {
      void bootstrap.stop();
    };
  }, [enabled, queryClient, socketManager, port]);
}
